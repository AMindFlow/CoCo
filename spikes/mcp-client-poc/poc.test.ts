import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// 独立合同 T006-v1：仅 V1–V4。不得把本 SDK 测试当作真实 Desktop 验证。
// 测试只使用公开进程、MCP 工具及约定的离线 state 补充观测，不导入实现。
const root = resolve(process.env.COCO_POC_ROOT ?? dirname(fileURLToPath(import.meta.url)));
type Scope = { project_id: string; run_id: string };
type Event = Scope & { event_id: string; leader_id: string; nonce: string };
type Binding = Scope & { token: string; leader_id: string; thread_id: string };
type Peer = { client: Client; transport: StdioClientTransport; diagnostics: string[] };
type ToolResult = Awaited<ReturnType<Client['callTool']>>;

let directory: string;
let socket: string;
let statePath: string;
let backend: ChildProcessWithoutNullStreams;
let backendClosed: Promise<void>;
let ready: { ready: true; instance_id: string; pid: number };
let peers: Peer[];
let bindings: Binding[];
let events: Event[];
let operation: Event & { operation_id: string; delay_ms: number };

const scope = (binding: Scope): Scope => ({ project_id: binding.project_id, run_id: binding.run_id });

async function eventually(check: () => Promise<boolean> | boolean, label: string, timeout = 4000) {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) {
    if (await check()) return;
    await delay(25);
  }
  throw new Error(`Timed out: ${label}; fixture retained at ${directory}`);
}

async function bounded<T>(promise: Promise<T>, milliseconds: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(label)), milliseconds); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function connect(token: string): Promise<Peer> {
  const bindingPath = join(directory, `binding-${randomUUID()}.json`);
  await writeFile(bindingPath, JSON.stringify({ token }), { mode: 0o600 });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(root, 'stdio.ts'), '--socket', socket, '--binding', bindingPath],
    cwd: root,
    stderr: 'pipe',
  });
  const client = new Client({ name: 'coco-independent-t006', version: '1.0.0' });
  const peer: Peer = { client, transport, diagnostics: [] };
  // 从启动前持续消费 stderr，避免子进程因管道写满阻塞；不将其作为成功 Oracle。
  transport.stderr?.on('data', chunk => peer.diagnostics.push(String(chunk)));
  client.onerror = error => peer.diagnostics.push(String(error));
  peers.push(peer);
  await bounded(client.connect(transport), 4000, 'MCP connect timed out');
  return peer;
}

async function close(peer: Peer) {
  const pid = peer.transport.pid;
  await bounded(peer.client.close(), 5000, 'MCP close timed out');
  expect(peer.transport.pid).toBeNull();
  // SDK close 先清空 pid getter；额外确认实际入口进程已退出。
  if (pid !== null) await eventually(() => {
    try { process.kill(pid, 0); return false; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return true;
      throw error;
    }
  }, 'stdio process exited');
}

async function call(peer: Peer, name: string, args: Record<string, unknown>): Promise<ToolResult> {
  return peer.client.callTool({ name, arguments: args }, { timeout: 3500 });
}

function payload(result: ToolResult): Record<string, unknown> {
  expect(result.structuredContent).toBeDefined();
  expect(typeof result.structuredContent).toBe('object');
  expect(result.structuredContent).not.toBeNull();
  expect(Array.isArray(result.structuredContent)).toBe(false);
  const text = result.content.filter(item => item.type === 'text');
  expect(text).toHaveLength(1);
  expect(JSON.parse(text[0]!.text)).toEqual(result.structuredContent);
  return result.structuredContent as Record<string, unknown>;
}

async function success(peer: Peer, name: string, args: Record<string, unknown>) {
  const result = await call(peer, name, args);
  expect(result.isError).not.toBe(true);
  return payload(result);
}

async function failure(peer: Peer, name: string, args: Record<string, unknown>, error: string) {
  const result = await call(peer, name, args);
  expect(result.isError).toBe(true);
  expect(payload(result).error_code).toBe(error);
}

async function pending(peer: Peer, binding: Scope): Promise<Event[]> {
  const result = await success(peer, 'get_pending_events', scope(binding));
  expect(Array.isArray(result.events)).toBe(true);
  return result.events as Event[];
}

async function ack(peer: Peer, binding: Scope, ids: string[]) {
  const result = await success(peer, 'acknowledge_events', { ...scope(binding), event_ids: ids });
  expect(result.acknowledged).toEqual(ids);
}

async function persistedEvents(): Promise<Array<Event & { acknowledged: boolean }>> {
  try {
    const state = JSON.parse(await readFile(statePath, 'utf8')) as { events?: unknown };
    expect(Array.isArray(state.events)).toBe(true);
    return state.events as Array<Event & { acknowledged: boolean }>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return [];
    throw error;
  }
}

async function stopBackend() {
  if (backend.exitCode === null && backend.signalCode === null) backend.kill('SIGTERM');
  try {
    await bounded(backendClosed, 1500, 'backend did not terminate');
  } catch {
    if (backend.exitCode === null && backend.signalCode === null) backend.kill('SIGKILL');
    await bounded(backendClosed, 1500, 'backend did not exit after SIGKILL');
  }
}

beforeEach(async () => {
  peers = [];
  directory = await mkdtemp(join(process.env.COCO_POC_TMPDIR ?? tmpdir(), 'coco-t006-'));
  socket = join(directory, 'ipc.sock');
  // macOS sockaddr_un 的 sun_path 为 104 bytes，保留结尾 NUL 的位置。
  if (Buffer.byteLength(socket) > 103) {
    throw new Error('Unix socket path exceeds 103 bytes; set COCO_POC_TMPDIR to a shorter temporary directory');
  }
  statePath = join(directory, 'state.json');
  // 原生 Thread 字符串故意相同，归属必须由可信 binding 的完整上下文决定。
  bindings = [
    { token: randomUUID(), project_id: 'P-A', run_id: 'R-A1', leader_id: 'L-A', thread_id: 'same-native-thread' },
    { token: randomUUID(), project_id: 'P-B', run_id: 'R-B1', leader_id: 'L-B', thread_id: 'same-native-thread' },
    { token: randomUUID(), project_id: 'P-A', run_id: 'R-A2', leader_id: 'L-A2', thread_id: 'same-native-thread' },
  ];
  events = bindings.map((binding, index) => ({
    ...scope(binding), event_id: `event-${index}-${randomUUID()}`, leader_id: binding.leader_id, nonce: randomUUID(),
  }));
  operation = {
    ...scope(bindings[0]!), leader_id: bindings[0]!.leader_id,
    operation_id: `operation-${randomUUID()}`, event_id: `offline-${randomUUID()}`, nonce: randomUUID(), delay_ms: 1800,
  };
  const fixturePath = join(directory, 'fixture.json');
  await writeFile(fixturePath, JSON.stringify({ bindings, events, operations: [operation] }), { mode: 0o600 });
  backend = spawn(process.execPath, [join(root, 'backend.ts'), '--socket', socket, '--fixture', fixturePath, '--state', statePath], {
    cwd: root, stdio: ['pipe', 'pipe', 'pipe'], env: { PATH: process.env.PATH ?? '', TMPDIR: directory },
  });
  backendClosed = new Promise(resolveClosed => backend.once('close', () => resolveClosed()));
  let output = '';
  let stderr = '';
  let spawnError: Error | undefined;
  backend.on('error', error => { spawnError = error; });
  backend.stdout.setEncoding('utf8').on('data', chunk => { output += chunk; });
  backend.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
  await eventually(() => {
    if (spawnError) throw spawnError;
    if (backend.exitCode !== null || backend.signalCode !== null) {
      throw new Error(`backend exited before ready: ${stderr}`);
    }
    return output.includes('\n');
  }, 'backend ready line');
  ready = JSON.parse(output.slice(0, output.indexOf('\n')));
  expect(ready.ready).toBe(true);
  expect(typeof ready.instance_id).toBe('string');
  expect(ready.instance_id.length).toBeGreaterThan(0);
  expect(ready.pid).toBe(backend.pid);
}, 8000);

afterEach(async () => {
  // 只关闭本测试创建的 SDK transport/ChildProcess；保留 fixture，不调用 rm。
  const closed = await Promise.allSettled(peers.map(peer => peer.client.close()));
  for (let index = 0; index < closed.length; index++) {
    const pid = peers[index]!.transport.pid;
    if (pid !== null) {
      try { process.kill(pid, 'SIGKILL'); } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
      }
      await peers[index]!.transport.close();
    }
  }
  if (backend) await stopBackend();
}, 10000);

describe('T006-v1 independent MCP isolation PoC (V1–V4 only)', () => {
  it('V1/V3: two real stdio clients share one backend and receive only their Project/Run events', async () => {
    const [a, b] = await Promise.all([connect(bindings[0]!.token), connect(bindings[1]!.token)]);
    expect(a.transport.pid).not.toBe(b.transport.pid);
    const [pa, pb] = await Promise.all([
      success(a, 'get_probe_status', scope(bindings[0]!)),
      success(b, 'get_probe_status', scope(bindings[1]!)),
    ]);
    expect(pa).toMatchObject({ instance_id: ready.instance_id, pid: ready.pid });
    expect(pb).toMatchObject({ instance_id: ready.instance_id, pid: ready.pid });
    expect(await pending(a, bindings[0]!)).toEqual([events[0]]);
    expect(await pending(b, bindings[1]!)).toEqual([events[1]]);
    // 非破坏读取：再读得到同一事件 ID 与 nonce，不制造新事件。
    expect(await pending(a, bindings[0]!)).toEqual([events[0]]);
  });

  it('V3: unknown token, wrong Run and inconsistent Project/Run are rejected without changing events', async () => {
    const a = await connect(bindings[0]!.token);
    const unknown = await connect(`unknown-${randomUUID()}`);
    await failure(unknown, 'get_pending_events', scope(bindings[0]!), 'SCOPE_DENIED');
    await failure(a, 'get_pending_events', scope(bindings[2]!), 'SCOPE_DENIED');
    await failure(a, 'get_pending_events', scope(bindings[1]!), 'SCOPE_DENIED');
    await failure(a, 'get_pending_events', { project_id: 'P-A', run_id: 'R-B1' }, 'SCOPE_DENIED');
    await failure(a, 'acknowledge_events', { ...scope(bindings[1]!), event_ids: [events[1]!.event_id] }, 'SCOPE_DENIED');
    const b = await connect(bindings[1]!.token);
    expect(await pending(a, bindings[0]!)).toEqual([events[0]]);
    expect(await pending(b, bindings[1]!)).toEqual([events[1]]);
  });

  it('V3: crossing event IDs and mixed batches are atomic; authorized acknowledgement is idempotent', async () => {
    const a = await connect(bindings[0]!.token);
    const b = await connect(bindings[1]!.token);
    await failure(a, 'acknowledge_events', { ...scope(bindings[0]!), event_ids: [events[1]!.event_id] }, 'SCOPE_DENIED');
    await failure(a, 'acknowledge_events', {
      ...scope(bindings[0]!), event_ids: [events[0]!.event_id, events[1]!.event_id],
    }, 'SCOPE_DENIED');
    expect(await pending(a, bindings[0]!)).toEqual([events[0]]);
    expect(await pending(b, bindings[1]!)).toEqual([events[1]]);
    await ack(a, bindings[0]!, [events[0]!.event_id]);
    await ack(a, bindings[0]!, [events[0]!.event_id]);
    expect(await pending(a, bindings[0]!)).toEqual([]);
    expect(await pending(b, bindings[1]!)).toEqual([events[1]]);
  });

  it('V3: request fields cannot override the trusted leader/token binding', async () => {
    const a = await connect(bindings[0]!.token);
    for (const extra of [{ leader_id: bindings[1]!.leader_id }, { token: bindings[1]!.token }]) {
      let result: ToolResult | undefined;
      try {
        result = await call(a, 'get_pending_events', { ...scope(bindings[0]!), ...extra });
      } catch (error) {
        // strict schema 可由 MCP 层返回 InvalidParams；传输/超时错误不算正确拒绝。
        expect((error as { code?: number }).code).toBe(-32602);
      }
      if (result) expect(result.isError).toBe(true);
    }
    expect(await pending(a, bindings[0]!)).toEqual([events[0]]);
  });

  it('V4: normal EOF leaves an unacknowledged event available to a fresh connection', async () => {
    const a = await connect(bindings[0]!.token);
    expect(await pending(a, bindings[0]!)).toEqual([events[0]]);
    await close(a);
    expect(backend.exitCode).toBeNull();
    expect(backend.signalCode).toBeNull();
    const reconnected = await connect(bindings[0]!.token);
    expect(await success(reconnected, 'get_probe_status', scope(bindings[0]!)))
      .toMatchObject({ instance_id: ready.instance_id, pid: ready.pid });
    expect(await pending(reconnected, bindings[0]!)).toEqual([events[0]]);
    await ack(reconnected, bindings[0]!, [events[0]!.event_id]);
    await close(reconnected);
    const again = await connect(bindings[0]!.token);
    expect(await pending(again, bindings[0]!)).toEqual([]);
  });

  it('V2/V4: backend completes accepted work while all clients are offline, then serves the original event', async () => {
    const a = await connect(bindings[0]!.token);
    const b = await connect(bindings[1]!.token);
    const args = { ...scope(bindings[0]!), operation_id: operation.operation_id };
    expect(await success(a, 'start_fixture_operation', args))
      .toMatchObject({ accepted: true, operation_id: operation.operation_id });
    expect((await success(a, 'get_operation_status', args)).status).not.toBe('completed');
    await close(a);
    // 退出一个入口不影响另一个入口和同一后台。
    expect(await success(b, 'get_probe_status', scope(bindings[1]!)))
      .toMatchObject({ instance_id: ready.instance_id, pid: ready.pid });
    const pid = b.transport.pid;
    expect(typeof pid).toBe('number');
    // 仅杀当前 SDK transport 自己创建的入口进程。
    process.kill(pid!, 'SIGKILL');
    await eventually(() => b.transport.pid === null, 'abnormally killed stdio reaped');
    expect(peers.every(peer => peer.transport.pid === null)).toBe(true);
    expect((await persistedEvents()).some(event => event.event_id === operation.event_id)).toBe(false);
    // 全部 Client 离线后、重连之前，后台必须已经持久化目标事件。
    await eventually(async () => {
      expect(backend.exitCode).toBeNull();
      expect(backend.signalCode).toBeNull();
      return (await persistedEvents()).some(event => event.event_id === operation.event_id);
    }, 'operation event persisted while no MCP clients exist');
    expect((await persistedEvents()).find(event => event.event_id === operation.event_id)).toMatchObject({
      ...scope(operation), event_id: operation.event_id, leader_id: operation.leader_id,
      nonce: operation.nonce, acknowledged: false,
    });
    const reconnected = await connect(bindings[0]!.token);
    expect(await success(reconnected, 'get_probe_status', scope(bindings[0]!)))
      .toMatchObject({ instance_id: ready.instance_id, pid: ready.pid });
    expect(await success(reconnected, 'get_operation_status', args))
      .toMatchObject({ operation_id: operation.operation_id, status: 'completed' });
    const expected: Event = {
      ...scope(operation), event_id: operation.event_id, leader_id: operation.leader_id, nonce: operation.nonce,
    };
    expect(await pending(reconnected, bindings[0]!)).toEqual(expect.arrayContaining([events[0], expected]));
    expect((await pending(reconnected, bindings[0]!)).filter(event => event.event_id === expected.event_id)).toHaveLength(1);
    await ack(reconnected, bindings[0]!, [expected.event_id]);
    expect(await pending(reconnected, bindings[0]!)).toEqual([events[0]]);
    const rb = await connect(bindings[1]!.token);
    expect(await pending(rb, bindings[1]!)).toEqual([events[1]]);
  }, 12000);

  it('V3: a missing own operation is reported distinctly from unauthorized scope', async () => {
    const a = await connect(bindings[0]!.token);
    await failure(a, 'get_operation_status', {
      ...scope(bindings[0]!), operation_id: `missing-${randomUUID()}`,
    }, 'RESOURCE_NOT_FOUND');
    await failure(a, 'start_fixture_operation', {
      ...scope(bindings[1]!), operation_id: operation.operation_id,
    }, 'SCOPE_DENIED');
  });

  it('V4: an unavailable backend returns an explicit error within three seconds and is not replaced', async () => {
    const a = await connect(bindings[0]!.token);
    await stopBackend();
    const started = performance.now();
    await failure(a, 'get_pending_events', scope(bindings[0]!), 'BACKEND_UNAVAILABLE');
    expect(performance.now() - started).toBeLessThanOrEqual(3000);
    // 再次请求仍失败，不能隐式新建后台或从入口内存返回成功。
    await failure(a, 'get_probe_status', scope(bindings[0]!), 'BACKEND_UNAVAILABLE');
  });
});
