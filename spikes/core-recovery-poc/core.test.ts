// T008-core-fixture-v1：只从公开进程/MCP/fixture合同导出预期，不导入生产实现。
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { spawn, type ChildProcess } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { post } from './fixture.ts';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(process.env.COCO_CORE_POC_DIR ?? here);
const TICK = 25;
const DEADLINE = 1200;
const WAIT = 10000;
type Json = Record<string, any>;
type Scope = { project_id: string; run_id: string };
const A: Scope = { project_id: 'project-A', run_id: 'run-A1' };
const B: Scope = { project_id: 'project-B', run_id: 'run-B1' };
const C: Scope = { project_id: 'project-A', run_id: 'run-A2' };
const scopes = { A, B, C };
const active: Harness[] = [];

async function until<T>(label: string, observe: () => Promise<T> | T, accept: (value: T) => boolean, timeout = WAIT): Promise<T> {
  const end = Date.now() + timeout;
  let value: T;
  do {
    value = await observe();
    if (accept(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  } while (Date.now() < end);
  throw new Error(`Observation deadline: ${label}; last=${JSON.stringify(value!)}`);
}

class ProcessHandle {
  process: ChildProcess;
  lines: Json[] = [];
  stderr = '';
  exit: { code: number | null; signal: string | null } | undefined;
  constructor(script: string, args: string[], directory: string, name: string) {
    this.process = spawn(process.execPath, [script, ...args], {
      cwd: directory, stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: process.env.PATH ?? '', HOME: directory, TMPDIR: directory, NODE_NO_WARNINGS: '1' },
    });
    let text = '';
    this.process.stdout!.on('data', (chunk) => {
      appendFileSync(join(directory, `${name}.stdout`), chunk);
      text += chunk.toString();
      let index: number;
      while ((index = text.indexOf('\n')) >= 0) {
        const line = text.slice(0, index); text = text.slice(index + 1);
        try { this.lines.push(JSON.parse(line)); } catch { this.lines.push({ non_json: line }); }
      }
    });
    this.process.stderr!.on('data', (chunk) => { this.stderr += chunk.toString(); appendFileSync(join(directory, `${name}.stderr`), chunk); });
    this.process.once('error', (error) => { this.stderr += String(error); });
    this.process.once('exit', (code, signal) => { this.exit = { code, signal }; });
  }
  async message(predicate: (line: Json) => boolean, label: string) {
    return until(label, () => {
      const found = this.lines.find(predicate);
      if (!found && this.exit) throw new Error(`${label}: child exited ${JSON.stringify(this.exit)}; ${this.stderr}`);
      return found;
    }, (value) => value !== undefined);
  }
  async kill() {
    if (!this.exit) this.process.kill('SIGKILL');
    await until('own child reaped', () => this.exit, Boolean);
  }
}

type Connection = { client: Client; transport: StdioClientTransport; scope: Scope; token: string; closed: boolean };
class Harness {
  directory: string;
  socket: string;
  db: string;
  fixtureSocket: string;
  controlSocket: string;
  bindings: string;
  tokens = { A: 'fixture-token-A', B: 'fixture-token-B', C: 'fixture-token-C', U: 'unknown-token' };
  fixture!: ProcessHandle;
  core?: ProcessHandle;
  children: ProcessHandle[] = [];
  connections: Connection[] = [];
  generation = 0;
  startLimit: number;
  constructor(label: string, startLimit = 2) {
    this.directory = mkdtempSync(join(tmpdir(), `coco-t008-${label}-`));
    this.socket = join(this.directory, 'core.sock');
    this.db = join(this.directory, 'state.sqlite');
    this.fixtureSocket = join(this.directory, 'fx.sock');
    this.controlSocket = join(this.directory, 'ctl.sock');
    this.bindings = join(this.directory, 'bindings.json');
    this.startLimit = startLimit;
    writeFileSync(this.bindings, JSON.stringify({ bindings: Object.entries(scopes).map(([name, scope]) => ({ token: this.tokens[name as 'A' | 'B' | 'C'], ...scope, leader_id: `leader-${name}`, native_session_id: 'deliberately-identical-native-session' })) }), { mode: 0o600 });
    active.push(this);
    console.log(`T008 fixture evidence retained: ${this.directory}`);
  }
  async init(pause?: string) {
    this.fixture = new ProcessHandle(join(here, 'fixture.ts'), ['--socket', this.fixtureSocket, '--control-socket', this.controlSocket, '--log', join(this.directory, 'fixture.jsonl')], this.directory, 'fixture');
    this.children.push(this.fixture);
    try { await this.fixture.message((line) => line.ready === true, 'fixture ready'); }
    catch (error) { throw new Error(`[INCONCLUSIVE_ENV_OR_FIXTURE] ${String(error)}`); }
    await this.start(pause);
    return this;
  }
  coreArgs(pause?: string) {
    return ['--socket', this.socket, '--db', this.db, '--bindings', this.bindings, '--fixture-socket', this.fixtureSocket, '--tick-ms', String(TICK), '--deadline-ms', String(DEADLINE), '--start-limit', String(this.startLimit), ...(pause ? ['--pause-at', pause] : [])];
  }
  async start(pause?: string) {
    this.core = new ProcessHandle(join(source, 'core.ts'), this.coreArgs(pause), this.directory, `core-${++this.generation}`);
    this.children.push(this.core);
    return await this.core.message((line) => line.ready === true, 'Core ready');
  }
  async crash() {
    await this.core!.kill();
    await Promise.all(this.connections.filter((connection) => !connection.closed).map((connection) => this.close(connection)));
  }
  async connect(name: 'A' | 'B' | 'C' | 'U' = 'A') {
    const binding = join(this.directory, `${name}-${this.connections.length}.json`);
    const token = this.tokens[name];
    writeFileSync(binding, JSON.stringify({ token }), { mode: 0o600 });
    const transport = new StdioClientTransport({ command: process.execPath, args: [join(source, 'stdio.ts'), '--socket', this.socket, '--binding', binding, '--deadline-ms', String(DEADLINE * 2)], cwd: this.directory, env: { PATH: process.env.PATH ?? '', HOME: this.directory, TMPDIR: this.directory, NODE_NO_WARNINGS: '1' }, stderr: 'pipe' });
    transport.stderr?.on('data', (chunk) => appendFileSync(join(this.directory, `stdio-${name}.stderr`), chunk));
    const client = new Client({ name: 'independent-t008-tester', version: '1.0.0' });
    await client.connect(transport);
    const connection = { client, transport, scope: name === 'U' ? A : scopes[name], token, closed: false };
    this.connections.push(connection);
    return connection;
  }
  async close(connection: Connection) { connection.closed = true; await connection.client.close(); }
  async raw(connection: Connection, name: string, params: Json = {}) {
    const response: any = await connection.client.callTool({ name, arguments: { ...connection.scope, ...params } });
    expect(response.structuredContent, `${name}: structuredContent`).toBeDefined();
    const texts = response.content.filter((item: Json) => item.type === 'text');
    expect(texts).toHaveLength(1);
    expect(JSON.parse(texts[0].text)).toEqual(response.structuredContent);
    for (const token of Object.values(this.tokens)) expect(JSON.stringify(response)).not.toContain(token);
    return response;
  }
  async call(connection: Connection, name: string, params: Json = {}) {
    const response = await this.raw(connection, name, params);
    expect(response.isError, `${name}: ${JSON.stringify(response.structuredContent)}`).not.toBe(true);
    return response.structuredContent as Json;
  }
  async denied(connection: Connection, name: string, params: Json, code: string) {
    const response = await this.raw(connection, name, params);
    expect(response.isError).toBe(true);
    expect(response.structuredContent).toEqual({ error_code: code });
  }
  async submit(connection: Connection, params: Json = {}) {
    const result = await this.call(connection, 'submit_operation', { key: 'same-key', object_version: 1, resource_key: 'same-resource', ...params });
    expect(result.operation_id).toEqual(expect.any(String)); expect(result.operation_id.length).toBeGreaterThan(0);
    expect(result.attempt_id).toEqual(expect.any(String)); expect(result.attempt_id.length).toBeGreaterThan(0);
    expect(result.object_version).toBe(params.object_version ?? 1);
    return result;
  }
  async control(path: string, data: Json = {}) {
    const response = await post(this.controlSocket, path, data);
    expect(response.http_status).toBe(200);
    return response.body as Json;
  }
  async set(match: Json, rule: Json) { await this.control('/set', { match, ...rule }); }
  async snapshot() { return this.control('/snapshot'); }
  async fixtureOperation(id: string, predicate: (operation: Json) => boolean) {
    return until('fixture operation', async () => (await this.snapshot()).operations.find((operation: Json) => operation.identity.operation_id === id), (operation) => operation && predicate(operation));
  }
  async state(connection: Connection, id: string, status: string) {
    return until(`Operation ${status}`, () => this.call(connection, 'get_operation_status', { operation_id: id }), (operation) => operation.status === status);
  }
  async diagnostic(connection: Connection) {
    const status = await this.call(connection, 'get_probe_status');
    expect(status).toMatchObject({ journal_mode: 'wal', synchronous: 2, foreign_keys: 1, sqlite_version: expect.any(String) });
    for (const name of ['operations', 'events', 'deliveries']) expect(Array.isArray(status[name])).toBe(true);
    for (const event of status.events) expect(event).toMatchObject({ ...connection.scope, event_id: expect.any(String), leader_id: expect.any(String), operation_id: expect.any(String), type: expect.any(String) });
    for (const delivery of status.deliveries) {
      expect(delivery).toMatchObject({ delivery_id: expect.any(String), event_id: expect.any(String), target: expect.stringMatching(/^(fixture|leader)$/), status: expect.any(String) });
      expect(status.events.some((event: Json) => event.event_id === delivery.event_id)).toBe(true);
    }
    return status;
  }
  async counts(id: string, expected: { requests: number; starts: number; effects: number }) {
    const snapshot = await this.snapshot();
    const operation = snapshot.operations.find((op: Json) => op.identity.operation_id === id);
    expect(operation).toBeDefined();
    expect(operation).toMatchObject({ start_requests: expected.requests, actual_starts: expected.starts, effect_count: expected.effects });
    expect(snapshot.records.filter((entry: Json) => entry.kind === 'protocol_error')).toEqual([]);
  }
  async cleanup() {
    try { if (this.fixture && !this.fixture.exit) writeFileSync(join(this.directory, 'final-fixture-snapshot.json'), JSON.stringify(await this.snapshot(), null, 2)); } catch { /* 原始追加日志仍保留；不伪造快照 */ }
    for (const connection of this.connections) if (!connection.closed) await this.close(connection).catch(() => {});
    for (const child of [...this.children].reverse()) if (!child.exit) await child.kill();
  }
}

beforeAll(() => {
  const missing = ['core.ts', 'stdio.ts', 'protocol.ts'].filter((file) => !existsSync(join(source, file)));
  if (missing.length) throw new Error(`[EXPECTED_RED: implementation entry absent] ${missing.join(', ')}; COCO_CORE_POC_DIR=${source}`);
});
afterEach(async () => { for (const harness of active.splice(0)) await harness.cleanup(); });

describe('C1 单Core与后台生命周期', () => {
  it('双真实SDK Client同实例，竞争Core失败不扰动原socket；断开全部Client后仍继续', async () => {
    const h = await new Harness('c1').init();
    const a = await h.connect('A'); const b = await h.connect('B');
    const first = await h.diagnostic(a); const second = await h.diagnostic(b);
    expect(first.instance_id).toBe(second.instance_id); expect(first.pid).toBe(second.pid);
    const competitor = new ProcessHandle(join(source, 'core.ts'), h.coreArgs(), h.directory, 'competitor');
    h.children.push(competitor);
    await until('second Core refused', () => competitor.exit, Boolean);
    expect(competitor.exit?.code).toBe(1); expect(competitor.stderr).toContain('CORE_ALREADY_RUNNING');
    expect(competitor.lines.some((line) => line.ready)).toBe(false);
    expect((await h.diagnostic(a)).instance_id).toBe(first.instance_id);
    await h.set({}, { auto_complete: true });
    const op = await h.submit(a);
    await Promise.all([h.close(a), h.close(b)]);
    await h.fixtureOperation(op.operation_id, (operation) => operation.effect_count === 1);
    await until('background Core observed completion', () => h.snapshot(), (snapshot) => snapshot.records.some((entry: Json) => entry.kind === 'inspect_response' && entry.identity.operation_id === op.operation_id && entry.body.status === 'completed'));
    const again = await h.connect('A');
    await h.state(again, op.operation_id, 'completed');
    const pending = await h.call(again, 'get_pending_events');
    expect(pending.events).toHaveLength(1);
    expect((await h.call(again, 'acknowledge_events', { event_ids: [pending.events[0].event_id] })).acknowledged).toEqual([pending.events[0].event_id]);
    expect((await h.call(again, 'get_pending_events')).events).toEqual([]);
    await h.counts(op.operation_id, { requests: 1, starts: 1, effects: 1 });
    await h.crash();
    const disconnected = await h.connect('B');
    await h.denied(disconnected, 'get_probe_status', {}, 'BACKEND_UNAVAILABLE');
    expect(h.core!.exit).toBeDefined(); // stdio没有启动第二Core。
  }, 30000);
});

describe('C2 归属、幂等及外部结果身份', () => {
  it('双Project/同Project不同Run共享原生Session与键仍隔离；错误输入及混合ack原子拒绝', async () => {
    const h = await new Harness('c2').init();
    await h.set({}, { auto_complete: true });
    const a = await h.connect('A'); const b = await h.connect('B'); const c = await h.connect('C');
    const pairs = await Promise.all([a, b, c].map(async (connection) => ({ connection, op: await h.submit(connection) })));
    expect(new Set(pairs.map(({ op }) => op.operation_id)).size).toBe(3);
    for (const { connection, op } of pairs) await h.state(connection, op.operation_id, 'completed');
    const [oa, ob] = pairs.map(({ op }) => op);
    expect((await h.submit(a)).operation_id).toBe(oa.operation_id);
    await h.denied(a, 'submit_operation', { key: 'same-key', object_version: 1, resource_key: 'changed' }, 'IDEMPOTENCY_CONFLICT');
    await h.denied(a, 'get_probe_status', B, 'SCOPE_DENIED');
    await h.denied(a, 'get_probe_status', C, 'SCOPE_DENIED');
    await h.denied(a, 'get_probe_status', { token: h.tokens.B }, 'BAD_REQUEST');
    await h.denied(a, 'submit_operation', { key: '', object_version: 0, resource_key: 'x' }, 'BAD_REQUEST');
    await h.denied(a, 'get_operation_status', { operation_id: ob.operation_id }, 'SCOPE_DENIED');
    await h.denied(a, 'get_operation_status', { operation_id: 'missing-current-scope' }, 'RESOURCE_NOT_FOUND');
    const unknown = await h.connect('U'); await h.denied(unknown, 'get_probe_status', {}, 'SCOPE_DENIED');
    const ea = (await h.call(a, 'get_pending_events')).events[0];
    const eb = (await h.call(b, 'get_pending_events')).events[0];
    await h.denied(a, 'acknowledge_events', { event_ids: [ea.event_id, eb.event_id] }, 'SCOPE_DENIED');
    await h.denied(a, 'acknowledge_events', { event_ids: [ea.event_id, 'unknown-event'] }, 'RESOURCE_NOT_FOUND');
    expect((await h.call(a, 'get_pending_events')).events.map((event: Json) => event.event_id)).toEqual([ea.event_id]);
    expect((await h.call(b, 'get_pending_events')).events.map((event: Json) => event.event_id)).toEqual([eb.event_id]);
    expect((await h.call(a, 'acknowledge_events', { event_ids: [] })).acknowledged).toEqual([]);
    for (const { connection, op } of pairs) {
      const diag = await h.diagnostic(connection);
      expect(diag.operations).toHaveLength(1);
      expect(diag.operations[0].operation_id).toBe(op.operation_id);
      expect(diag.events).toHaveLength(2);
      expect(diag.deliveries).toHaveLength(2);
      await h.counts(op.operation_id, { requests: 1, starts: 1, effects: 1 });
    }
  }, 30000);

  it.each(['old_attempt', 'old_version', 'wrong_scope'])('外部completed %s不能污染完成结果或释放资源', async (mode) => {
    const h = await new Harness(`c2-${mode}`).init();
    await h.set({}, { inspect: mode, auto_complete: true });
    const a = await h.connect(); const op = await h.submit(a);
    await h.state(a, op.operation_id, 'needs_attention');
    expect((await h.call(a, 'get_pending_events')).events).toEqual([]);
    const diag = await h.diagnostic(a);
    expect(diag.events.map((event: Json) => event.type)).toEqual(['operation_requested']);
    await h.denied(a, 'submit_operation', { key: 'conflict', object_version: 1, resource_key: 'same-resource' }, 'RESOURCE_BUSY');
    await h.counts(op.operation_id, { requests: 1, starts: 1, effects: 1 });
  }, 20000);

  it.each(['old_attempt', 'old_version', 'wrong_scope'])('start正向身份 %s必须停在needs_attention且不得自动inspect', async (mode) => {
    const h = await new Harness(`c2-start-${mode}`).init();
    await h.set(A, { start_response: mode, inspect: 'hold' });
    await h.set(B, { auto_complete: true });
    const a = await h.connect(); const b = await h.connect('B');
    const op = await h.submit(a);
    await until('fixture sent mismatching start identity', () => h.snapshot(), (snapshot) => snapshot.records.some((entry: Json) => entry.kind === 'start_response' && entry.identity.operation_id === op.operation_id));
    const observed = await until('Core classified start response', () => h.call(a, 'get_operation_status', { operation_id: op.operation_id }), (state) => !['queued', 'dispatched'].includes(state.status));
    expect(observed.status).toBe('needs_attention');
    await h.denied(a, 'submit_operation', { key: 'conflict-after-start', object_version: 1, resource_key: 'same-resource' }, 'RESOURCE_BUSY');
    const independent = await h.submit(b); await h.state(b, independent.operation_id, 'completed');
    const snapshot = await h.snapshot();
    expect(snapshot.records.filter((entry: Json) => entry.kind === 'inspect_received' && entry.operation_id === op.operation_id)).toEqual([]);
    expect((await h.call(a, 'get_operation_status', { operation_id: op.operation_id })).status).toBe('needs_attention');
    expect((await h.call(a, 'get_pending_events')).events).toEqual([]);
    const diag = await h.diagnostic(a);
    expect(diag.events.map((event: Json) => event.type)).toEqual(['operation_requested']);
    expect(diag.operations[0]).toMatchObject({ operation_id: op.operation_id, attempt_id: op.attempt_id, object_version: 1, start_count: 1 });
    await h.counts(op.operation_id, { requests: 1, starts: 1, effects: 0 });
  }, 20000);
});

describe('C3 WAL与状态/Event/Outbox原子意图', () => {
  it.each(['before_commit', 'after_commit'])('%s屏障崩溃后同路径重启，未提交全无/已提交完整', async (point) => {
    const h = await new Harness(`c3-${point}`).init(point);
    const a = await h.connect(); await h.diagnostic(a);
    await h.set({}, { auto_complete: true });
    const pending = h.submit(a).then((result) => ({ result }), (error) => ({ error }));
    const barrier = await h.core!.message((line) => line.barrier === point, `${point} hit`);
    expect((await h.snapshot()).records.filter((entry: Json) => entry.kind === 'start_received')).toEqual([]);
    await h.crash(); await pending;
    await h.start(); const again = await h.connect();
    if (point === 'before_commit') {
      const diag = await h.diagnostic(again);
      expect(diag.operations).toEqual([]); expect(diag.events).toEqual([]); expect(diag.deliveries).toEqual([]);
      expect((await h.snapshot()).operations).toEqual([]);
      await h.denied(again, 'get_operation_status', { operation_id: barrier!.operation_id }, 'RESOURCE_NOT_FOUND');
    } else {
      await h.state(again, barrier!.operation_id, 'completed');
      const diag = await h.diagnostic(again);
      expect(diag.operations).toHaveLength(1);
      expect(diag.operations[0]).toMatchObject({ operation_id: barrier!.operation_id, start_count: 1, status: 'completed' });
      expect(diag.events.map((event: Json) => event.type).sort()).toEqual(['operation_completed', 'operation_requested']);
      expect(diag.deliveries.filter((delivery: Json) => delivery.target === 'fixture')).toHaveLength(1);
      expect(diag.deliveries.find((delivery: Json) => delivery.target === 'fixture').status).toBe('completed');
      await h.counts(barrier!.operation_id, { requests: 1, starts: 1, effects: 1 });
    }
  }, 30000);
});

describe('C4 超时已启动不能重复派发', () => {
  it('丢start应答，观察unknown；重复提交/显式并发reconcile/跨重启仍只一次start', async () => {
    const h = await new Harness('c4', 1).init();
    await h.set(A, { start: 'hold_after', inspect: 'hold' });
    const a = await h.connect(); const op = await h.submit(a);
    await until('held inspect following lost start response', () => h.snapshot(), (snapshot) => snapshot.held.some((id: Json) => id.operation_id === op.operation_id));
    await h.state(a, op.operation_id, 'unknown');
    expect((await h.snapshot()).records.some((entry: Json) => entry.kind === 'start_response_held' && entry.operation_id === op.operation_id)).toBe(true);
    expect((await h.submit(a)).operation_id).toBe(op.operation_id);
    const before = (await h.snapshot()).records.filter((entry: Json) => entry.kind === 'inspect_received').length;
    const reconciles = Array.from({ length: 3 }, () => h.call(a, 'reconcile_operation', { operation_id: op.operation_id }).catch((error) => ({ pending_error: String(error) })));
    // 用一个独立MCP请求证明请求已可处理，不靠长sleep等待竞争。
    await h.diagnostic(a);
    expect((await h.snapshot()).records.filter((entry: Json) => entry.kind === 'inspect_received').length).toBe(before);
    await h.crash(); await Promise.all(reconciles);
    await h.set({ operation_id: op.operation_id }, { inspect: 'natural' });
    await h.start(); const again = await h.connect();
    await h.state(again, op.operation_id, 'running');
    let diag = await h.diagnostic(again);
    expect(diag.operations[0]).toMatchObject({ attempt_id: op.attempt_id, start_count: 1 });
    expect(diag.deliveries.find((delivery: Json) => delivery.target === 'fixture').status).toBe('accepted');
    await h.control('/complete', { operation_id: op.operation_id });
    await h.state(again, op.operation_id, 'completed');
    diag = await h.diagnostic(again);
    expect(diag.events.filter((event: Json) => event.type === 'operation_completed')).toHaveLength(1);
    await h.counts(op.operation_id, { requests: 1, starts: 1, effects: 1 });
  }, 30000);
});

describe('C5 未知结果停派与有限安全继续', () => {
  it.each(['unknown', 'unavailable', 'not_found', 'not_started_untrusted'])('%s停派/冻结，但另一项目继续；needs_attention无后台循环', async (mode) => {
    const h = await new Harness(`c5-${mode}`, 2).init();
    await h.set(A, { start: 'drop_after', inspect: mode });
    await h.set(B, { auto_complete: true });
    const a = await h.connect(); const b = await h.connect('B');
    const op = await h.submit(a); await h.state(a, op.operation_id, 'needs_attention');
    await h.denied(a, 'submit_operation', { key: 'blocked', object_version: 1, resource_key: 'same-resource' }, 'RESOURCE_BUSY');
    const before = (await h.snapshot()).records.filter((entry: Json) => entry.kind === 'inspect_received' && entry.operation_id === op.operation_id).length;
    const independent = await h.submit(b); await h.state(b, independent.operation_id, 'completed');
    // B的完整派发/inspect提供真实调度进展屏障；A不能借后台tick再次inspect/start。
    expect((await h.snapshot()).records.filter((entry: Json) => entry.kind === 'inspect_received' && entry.operation_id === op.operation_id)).toHaveLength(before);
    const reconciled = await h.call(a, 'reconcile_operation', { operation_id: op.operation_id });
    expect(reconciled.status).toBe('needs_attention');
    expect((await h.snapshot()).records.filter((entry: Json) => entry.kind === 'inspect_received' && entry.operation_id === op.operation_id)).toHaveLength(before + 1);
    await h.counts(op.operation_id, { requests: 1, starts: 1, effects: 0 });
    await h.counts(independent.operation_id, { requests: 1, starts: 1, effects: 1 });
  }, 20000);

  it('start前丢应答，权威未启动才用同Operation/Attempt再派；预算跨重启保留', async () => {
    const h = await new Harness('c5-authoritative', 2).init();
    await h.set(A, { start: 'drop_before', inspect: 'unknown' });
    const a = await h.connect(); const op = await h.submit(a); await h.state(a, op.operation_id, 'needs_attention');
    await h.counts(op.operation_id, { requests: 1, starts: 0, effects: 0 });
    await h.crash(); await h.start(); const again = await h.connect();
    expect((await h.diagnostic(again)).operations[0]).toMatchObject({ operation_id: op.operation_id, attempt_id: op.attempt_id, start_count: 1, status: 'needs_attention' });
    await h.set({ operation_id: op.operation_id }, { start: 'drop_before', inspect: 'not_started' });
    const reconciled = await h.call(again, 'reconcile_operation', { operation_id: op.operation_id });
    expect(reconciled).toMatchObject({ operation_id: op.operation_id, attempt_id: op.attempt_id, status: 'queued' });
    await h.fixtureOperation(op.operation_id, (operation) => operation.start_requests === 2);
    await h.state(again, op.operation_id, 'needs_attention');
    expect((await h.diagnostic(again)).operations[0].start_count).toBe(2);
    // 再一次权威not_started也不得获得第三次预算；跨重启和重复请求不清零。
    await h.call(again, 'reconcile_operation', { operation_id: op.operation_id });
    await h.state(again, op.operation_id, 'needs_attention');
    await h.crash(); await h.start(); const final = await h.connect();
    expect((await h.submit(final)).operation_id).toBe(op.operation_id);
    const diag = await h.diagnostic(final);
    expect(diag.operations[0]).toMatchObject({ start_count: 2, attempt_id: op.attempt_id, status: 'needs_attention' });
    await h.counts(op.operation_id, { requests: 2, starts: 0, effects: 0 });
  }, 30000);
});

describe('C6 完成观察崩溃与事件确认恢复', () => {
  it('完成事务前杀Core；重启只补一次结果，未确认重投同ID，确认跨重启不复活', async () => {
    const h = await new Harness('c6').init('after_completion_observed');
    await h.set({}, { auto_complete: true });
    const a = await h.connect(); const op = await h.submit(a);
    await h.core!.message((line) => line.barrier === 'after_completion_observed' && line.operation_id === op.operation_id, 'completion observed before commit');
    await h.counts(op.operation_id, { requests: 1, starts: 1, effects: 1 });
    await h.crash(); await h.start(); const again = await h.connect();
    await h.state(again, op.operation_id, 'completed');
    const first = (await h.call(again, 'get_pending_events')).events;
    expect(first).toHaveLength(1);
    const fx = await h.fixtureOperation(op.operation_id, (operation) => operation.completed);
    expect(first[0]).toMatchObject({ ...A, operation_id: op.operation_id, type: 'operation_completed', effect_marker: fx.effect_marker });
    await h.close(again); const reconnect = await h.connect();
    expect((await h.call(reconnect, 'get_pending_events')).events).toEqual(first);
    await h.crash(); await h.start(); const third = await h.connect();
    expect((await h.call(third, 'get_pending_events')).events).toEqual(first);
    for (let repeat = 0; repeat < 2; repeat++) expect((await h.call(third, 'acknowledge_events', { event_ids: [first[0].event_id] })).acknowledged).toEqual([first[0].event_id]);
    expect((await h.call(third, 'get_pending_events')).events).toEqual([]);
    await h.crash(); await h.start(); const final = await h.connect();
    expect((await h.call(final, 'get_pending_events')).events).toEqual([]);
    const diag = await h.diagnostic(final);
    expect(diag.events.filter((event: Json) => event.type === 'operation_completed')).toHaveLength(1);
    expect(diag.deliveries.filter((delivery: Json) => delivery.target === 'leader')).toEqual([expect.objectContaining({ event_id: first[0].event_id, status: 'acknowledged' })]);
    expect(diag.operations[0]).toMatchObject({ start_count: 1, status: 'completed' });
    await h.counts(op.operation_id, { requests: 1, starts: 1, effects: 1 });
  }, 40000);
});
