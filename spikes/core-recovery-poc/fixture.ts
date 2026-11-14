// 独立 Tester 的外部副作用 Oracle；不导入 Core 实现或其协议类型。
import { createServer, request, type ServerResponse } from 'node:http';
import { appendFileSync, closeSync, fsyncSync, mkdtempSync, openSync, readFileSync, writeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

type Identity = { operation_id: string; project_id: string; run_id: string; attempt_id: string; object_version: number };
type StartMode = 'running' | 'drop_before' | 'drop_after' | 'hold_after';
type StartResponseMode = 'old_attempt' | 'old_version' | 'wrong_scope';
type InspectMode = 'natural' | 'hold' | 'unknown' | 'unavailable' | 'not_found' | 'not_started' | 'not_started_untrusted' | 'old_attempt' | 'old_version' | 'wrong_scope';
type Rule = { match: Partial<Identity>; start?: StartMode; start_response?: StartResponseMode; inspect?: InspectMode; auto_complete?: boolean };
type Operation = { identity: Identity; start_requests: number; actual_starts: number; effect_count: number; effect_marker: string; completed: boolean };
type Held = { identity: Identity; response: ServerResponse };
type RecordEntry = { sequence: number; kind: string; [key: string]: unknown };

export function post(socket: string, path: string, body: unknown, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const bytes = JSON.stringify(body);
    const req = request({ socketPath: socket, path, method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(bytes) } }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (part) => { text += part; });
      res.on('end', () => {
        try { resolve({ http_status: res.statusCode, body: JSON.parse(text) }); }
        catch (error) { reject(error); }
      });
    });
    req.setTimeout(timeout, () => req.destroy(new Error(`fixture request timeout: ${path}`)));
    req.on('error', reject);
    req.end(bytes);
  });
}

export async function serveFixture(socket: string, controlSocket: string, log: string) {
  // 新文件只创建一次；从不删除/清空证据。每条日志独立 fsync。
  const fd = openSync(log, 'ax', 0o600);
  const records: RecordEntry[] = [];
  const operations = new Map<string, Operation>();
  const rules: Rule[] = [];
  const held: Held[] = [];
  let sequence = 0;
  function record(kind: string, fields: Record<string, unknown> = {}) {
    const entry = { sequence: ++sequence, kind, ...fields };
    writeSync(fd, `${JSON.stringify(entry)}\n`);
    fsyncSync(fd);
    records.push(entry);
  }
  function send(res: ServerResponse, body: unknown, status = 200) {
    if (res.destroyed || res.writableEnded) return;
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  }
  function identity(input: any): Identity {
    assert.equal(typeof input, 'object');
    assert.deepEqual(Object.keys(input).sort(), ['operation_id', 'project_id', 'run_id', 'attempt_id', 'object_version'].sort());
    for (const field of ['operation_id', 'project_id', 'run_id', 'attempt_id']) assert.ok(typeof input[field] === 'string' && input[field].length > 0);
    assert.ok(Number.isSafeInteger(input.object_version) && input.object_version > 0);
    return input;
  }
  function matching(id: Identity): Omit<Rule, 'match'> {
    let result: Omit<Rule, 'match'> = { start: 'running', inspect: 'natural', auto_complete: false };
    for (const rule of rules) if (Object.entries(rule.match).every(([key, value]) => id[key as keyof Identity] === value)) result = { ...result, ...rule };
    return result;
  }
  function operation(id: Identity) {
    let op = operations.get(id.operation_id);
    if (!op) {
      op = { identity: id, start_requests: 0, actual_starts: 0, effect_count: 0, effect_marker: `effect-${randomUUID()}`, completed: false };
      operations.set(id.operation_id, op);
    } else assert.deepEqual(op.identity, id, 'same Operation must retain its complete identity');
    return op;
  }
  function complete(op: Operation) {
    assert.ok(op.actual_starts > 0, 'cannot complete an operation never started');
    if (!op.completed) {
      op.completed = true;
      // 每次真实启动都表示可能的独立副作用；重复 start 不被 fixture 去重。
      op.effect_count = op.actual_starts;
      record('effects_completed', { ...op.identity, effect_count: op.effect_count, effect_marker: op.effect_marker });
    }
  }
  function observation(id: Identity, mode: InspectMode) {
    const op = operations.get(id.operation_id);
    if (mode === 'unknown' || mode === 'unavailable' || mode === 'not_found') return { ...id, status: mode };
    if (mode === 'not_started' || mode === 'not_started_untrusted') return { ...id, status: 'not_started', authoritative: mode === 'not_started' };
    const status = op?.completed ? 'completed' : op?.actual_starts ? 'running' : 'not_found';
    const body: any = { ...id, status, ...(status === 'completed' ? { effect_marker: op!.effect_marker } : {}) };
    if (mode === 'old_attempt') body.attempt_id = `stale-${id.attempt_id}`;
    if (mode === 'old_version') body.object_version = id.object_version - 1;
    if (mode === 'wrong_scope') body.project_id = `wrong-${id.project_id}`;
    return body;
  }
  function inspectResponse(id: Identity, res: ServerResponse, mode: InspectMode) {
    const body = observation(id, mode);
    record('inspect_response', { identity: id, body });
    send(res, body, mode === 'unavailable' ? 503 : 200);
  }
  async function body(req: import('node:http').IncomingMessage) {
    let data = '';
    for await (const chunk of req) {
      data += chunk.toString();
      assert.ok(data.length <= 128 * 1024, 'bounded fixture request');
    }
    return JSON.parse(data);
  }
  const external = createServer(async (req, res) => {
    try {
      assert.equal(req.method, 'POST');
      assert.ok(req.url === '/start' || req.url === '/inspect');
      const id = identity(await body(req));
      record(req.url === '/start' ? 'start_received' : 'inspect_received', id);
      const rule = matching(id);
      if (req.url === '/start') {
        const op = operation(id);
        op.start_requests++;
        if (rule.start === 'drop_before') { record('start_dropped_before', id); res.destroy(); return; }
        op.actual_starts++;
        record('start_accepted', { ...id, actual_starts: op.actual_starts });
        if (op.completed) { op.effect_count++; record('duplicate_start_effect', { ...id, effect_count: op.effect_count }); }
        if (rule.auto_complete) complete(op);
        if (rule.start === 'drop_after') { record('start_dropped_after', id); res.destroy(); return; }
        if (rule.start === 'hold_after') {
          record('start_response_held', id);
          res.on('close', () => record('start_connection_closed', id));
          return;
        }
        const reply = { ...id, status: 'running' };
        // 只污染返回的正向身份；真实接受记录、Operation身份和效果Oracle保持原样。
        if (rule.start_response === 'old_attempt') reply.attempt_id = `stale-${id.attempt_id}`;
        if (rule.start_response === 'old_version') reply.object_version = id.object_version - 1;
        if (rule.start_response === 'wrong_scope') reply.project_id = `wrong-${id.project_id}`;
        record('start_response', { identity: id, body: reply });
        send(res, reply);
      } else if (rule.inspect === 'hold') {
        const item = { identity: id, response: res };
        held.push(item);
        record('inspect_held', id);
        res.on('close', () => { const index = held.indexOf(item); if (index >= 0) held.splice(index, 1); });
      } else inspectResponse(id, res, rule.inspect!);
    } catch (error) {
      record('protocol_error', { message: String(error) });
      send(res, { error: String(error) }, 400);
    }
  });
  const control = createServer(async (req, res) => {
    try {
      assert.equal(req.method, 'POST');
      const input = await body(req);
      if (req.url === '/set') {
        assert.ok(input.match && typeof input.match === 'object');
        rules.push(input);
        record('control_rule', { rule: input });
        send(res, { ok: true });
      } else if (req.url === '/complete') {
        const op = operations.get(input.operation_id);
        assert.ok(op, 'known operation');
        complete(op);
        send(res, { ok: true, effect_marker: op.effect_marker });
      } else if (req.url === '/release') {
        const mode: InspectMode = input.mode ?? 'natural';
        rules.push({ match: { operation_id: input.operation_id }, inspect: mode });
        for (const item of [...held]) if (item.identity.operation_id === input.operation_id) {
          held.splice(held.indexOf(item), 1);
          inspectResponse(item.identity, item.response, mode);
        }
        send(res, { ok: true });
      } else if (req.url === '/snapshot') {
        send(res, { records, operations: [...operations.values()], held: held.map((item) => item.identity) });
      } else throw new Error('unknown control endpoint');
    } catch (error) { record('control_error', { message: String(error) }); send(res, { error: String(error) }, 400); }
  });
  await Promise.all([new Promise<void>((resolve, reject) => { external.once('error', reject); external.listen(socket, resolve); }), new Promise<void>((resolve, reject) => { control.once('error', reject); control.listen(controlSocket, resolve); })]);
  record('fixture_ready');
  return {
    async close() {
      for (const item of held) item.response.destroy();
      external.closeAllConnections(); control.closeAllConnections();
      await Promise.all([new Promise<void>((resolve) => external.close(() => resolve())), new Promise<void>((resolve) => control.close(() => resolve()))]);
      record('fixture_closed'); closeSync(fd);
    },
  };
}

async function selfCheck() {
  const dir = mkdtempSync(join(tmpdir(), 'coco-t008-fixture-self-'));
  const socket = join(dir, 'external.sock');
  const control = join(dir, 'control.sock');
  const log = join(dir, 'fixture.jsonl');
  const server = await serveFixture(socket, control, log);
  const id: Identity = { operation_id: 'self-op', project_id: 'p', run_id: 'r', attempt_id: 'a', object_version: 1 };
  try {
    assert.equal((await post(socket, '/start', id)).body.status, 'running');
    await post(socket, '/start', id);
    await post(control, '/complete', { operation_id: id.operation_id });
    const done = (await post(socket, '/inspect', id)).body;
    assert.equal(done.status, 'completed'); assert.ok(done.effect_marker);
    let snapshot = (await post(control, '/snapshot', {})).body;
    assert.equal(snapshot.operations[0].start_requests, 2);
    assert.equal(snapshot.operations[0].actual_starts, 2);
    assert.equal(snapshot.operations[0].effect_count, 2);
    await post(control, '/set', { match: { operation_id: id.operation_id }, inspect: 'hold' });
    const pending = post(socket, '/inspect', id);
    for (let tries = 0; tries < 200; tries++) {
      snapshot = (await post(control, '/snapshot', {})).body;
      if (snapshot.held.length) break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(snapshot.held.length, 1);
    await post(control, '/release', { operation_id: id.operation_id, mode: 'old_attempt' });
    assert.equal((await pending).body.attempt_id, 'stale-a');
    assert.equal((await post(socket, '/start', { ...id, extra: true })).http_status, 400);
    const absent = { ...id, operation_id: 'self-not-started' };
    await post(control, '/set', { match: { operation_id: absent.operation_id }, start: 'drop_before', inspect: 'not_started' });
    await assert.rejects(post(socket, '/start', absent));
    assert.equal((await post(socket, '/inspect', absent)).body.authoritative, true);
    const hanging = { ...id, operation_id: 'self-timeout' };
    await post(control, '/set', { match: { operation_id: hanging.operation_id }, start: 'hold_after', inspect: 'unavailable' });
    await assert.rejects(post(socket, '/start', hanging, 40), /timeout/);
    assert.equal((await post(socket, '/inspect', hanging)).http_status, 503);
    snapshot = (await post(control, '/snapshot', {})).body;
    assert.equal(snapshot.operations.find((op: Operation) => op.identity.operation_id === absent.operation_id).actual_starts, 0);
    assert.equal(snapshot.operations.find((op: Operation) => op.identity.operation_id === hanging.operation_id).actual_starts, 1);
    for (const mode of ['old_attempt', 'old_version', 'wrong_scope'] as const) {
      const original = { ...id, operation_id: `self-start-${mode}` };
      await post(control, '/set', { match: { operation_id: original.operation_id }, start_response: mode, auto_complete: true });
      const response = (await post(socket, '/start', original)).body;
      const expected = { ...original, status: 'running' };
      if (mode === 'old_attempt') expected.attempt_id = `stale-${original.attempt_id}`;
      if (mode === 'old_version') expected.object_version = original.object_version - 1;
      if (mode === 'wrong_scope') expected.project_id = `wrong-${original.project_id}`;
      assert.deepEqual(response, expected);
      snapshot = (await post(control, '/snapshot', {})).body;
      const accepted = snapshot.operations.find((op: Operation) => op.identity.operation_id === original.operation_id);
      assert.deepEqual(accepted.identity, original);
      assert.equal(accepted.start_requests, 1);
      assert.equal(accepted.actual_starts, 1);
      assert.equal(accepted.effect_count, 1);
    }
  } finally { await server.close(); }
  const records = readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(records.at(-1).kind, 'fixture_closed');
  console.log(JSON.stringify({ fixture_self_check: 'PASS', directory: dir, records: records.length, core_tested: false }));
}

if (process.argv.includes('--self-check')) await selfCheck();
else if (process.argv[1]?.endsWith('fixture.ts')) {
  const value = (flag: string) => { const index = process.argv.indexOf(flag); assert.ok(index >= 0 && process.argv[index + 1], flag); return process.argv[index + 1]!; };
  await serveFixture(value('--socket'), value('--control-socket'), value('--log'));
  console.log(JSON.stringify({ ready: true, pid: process.pid }));
}
