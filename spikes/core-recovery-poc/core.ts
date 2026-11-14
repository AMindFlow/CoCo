// Isolated recovery experiment. No DSH/GitHub, production approvals or business effects.
import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { chmodSync, lstatSync, readFileSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import { bindingSchema, id, options, positive, post, ProbeError, schemas } from './protocol.ts';
import type { Binding, Json, Method } from './protocol.ts';

type Status = 'queued' | 'dispatched' | 'running' | 'unknown' | 'needs_attention' | 'completed';
type Operation = { operation_id: string; project_id: string; run_id: string; leader_id: string; attempt_id: string; object_version: number; key: string; resource_key: string; status: Status; start_count: number };
const args = options(['socket', 'db', 'bindings', 'fixture-socket', 'tick-ms', 'deadline-ms', 'start-limit'], ['pause-at']);
const tickMs = positive(args['tick-ms']);
const deadline = positive(args['deadline-ms']);
const startLimit = positive(args['start-limit']);
const bindings = z.object({ bindings: z.array(bindingSchema) }).strict().parse(JSON.parse(readFileSync(args.bindings, 'utf8'))).bindings;
if (new Set(bindings.map(b => b.token)).size !== bindings.length) throw new Error('DUPLICATE_BINDING');
const pauseAt = args['pause-at'];
if (pauseAt && !['before_commit', 'after_commit', 'after_completion_observed'].includes(pauseAt)) throw new Error('BAD_BARRIER');
const instance_id = randomUUID();
let db: DatabaseSync;
try {
  db = new DatabaseSync(args.db, { timeout: 100 });
  db.exec(`PRAGMA locking_mode=EXCLUSIVE; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS operations (
      operation_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, run_id TEXT NOT NULL, leader_id TEXT NOT NULL,
      attempt_id TEXT NOT NULL, object_version INTEGER NOT NULL, key TEXT NOT NULL, resource_key TEXT NOT NULL,
      status TEXT NOT NULL, start_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(project_id,run_id,key,object_version));
    CREATE TABLE IF NOT EXISTS events (
      event_id TEXT PRIMARY KEY, project_id TEXT NOT NULL, run_id TEXT NOT NULL, leader_id TEXT NOT NULL,
      operation_id TEXT NOT NULL REFERENCES operations(operation_id), type TEXT NOT NULL, effect_marker TEXT,
      UNIQUE(operation_id,type));
    CREATE TABLE IF NOT EXISTS deliveries (
      delivery_id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(event_id), target TEXT NOT NULL,
      status TEXT NOT NULL, UNIQUE(event_id,target));`);
} catch (error) {
  process.stderr.write(String(error).includes('locked') ? 'CORE_ALREADY_RUNNING\n' : `CORE_START_FAILED:${String(error)}\n`);
  process.exit(1);
}

function transaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try { const result = fn(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
const load = (op: string) => db.prepare('SELECT * FROM operations WHERE operation_id=?').get(op) as Operation | undefined;
function owned(op: string, b: Binding) {
  const found = load(op);
  if (!found) throw new ProbeError('RESOURCE_NOT_FOUND');
  if (found.project_id !== b.project_id || found.run_id !== b.run_id || found.leader_id !== b.leader_id) throw new ProbeError('SCOPE_DENIED');
  return found;
}
function view(op: Operation): Json {
  return { operation_id: op.operation_id, attempt_id: op.attempt_id, object_version: op.object_version, status: op.status };
}
function addEvent(op: Operation, type: string, target: string, marker: string | null = null) {
  const event_id = randomUUID();
  db.prepare('INSERT INTO events VALUES (?,?,?,?,?,?,?)').run(event_id, op.project_id, op.run_id, op.leader_id, op.operation_id, type, marker);
  db.prepare('INSERT INTO deliveries VALUES (?,?,?,?)').run(randomUUID(), event_id, target, 'pending');
}
function eventView(row: Json): Json {
  const { effect_marker, ...fields } = row;
  return effect_marker === null ? fields : { ...fields, effect_marker };
}
function setStatus(op: Operation, status: Status, deliveryStatus: string) {
  transaction(() => {
    db.prepare('UPDATE operations SET status=? WHERE operation_id=?').run(status, op.operation_id);
    db.prepare("UPDATE deliveries SET status=? WHERE target='fixture' AND event_id IN (SELECT event_id FROM events WHERE operation_id=? AND type='operation_requested')").run(deliveryStatus, op.operation_id);
  });
}
let paused = false;
function barrier(point: string, operation_id: string): Promise<never> | undefined {
  if (pauseAt !== point || paused) return;
  paused = true;
  process.stdout.write(`${JSON.stringify({ barrier: point, operation_id })}\n`);
  return new Promise<never>(() => {});
}
const identitySchema = z.object({ operation_id: id, project_id: id, run_id: id, attempt_id: id, object_version: z.number().int().positive(), status: id, authoritative: z.boolean().optional(), effect_marker: id.optional() }).strict();
function observation(raw: unknown, op: Operation) {
  const result = identitySchema.safeParse(raw);
  if (!result.success) return;
  const r = result.data;
  if (r.operation_id !== op.operation_id || r.project_id !== op.project_id || r.run_id !== op.run_id || r.attempt_id !== op.attempt_id || r.object_version !== op.object_version) return;
  return r;
}
function identity(op: Operation) {
  return { operation_id: op.operation_id, project_id: op.project_id, run_id: op.run_id, attempt_id: op.attempt_id, object_version: op.object_version };
}
async function perform(operation_id: string) {
  if (paused) return;
  let op = load(operation_id)!;
  if (op.status === 'completed') return;
  if (op.status === 'queued') {
    if (op.start_count >= startLimit) { setStatus(op, 'needs_attention', 'needs_attention'); return; }
    transaction(() => {
      db.prepare("UPDATE operations SET status='dispatched',start_count=start_count+1 WHERE operation_id=?").run(op.operation_id);
      db.prepare("UPDATE deliveries SET status='dispatched' WHERE target='fixture' AND event_id IN (SELECT event_id FROM events WHERE operation_id=?)").run(op.operation_id);
    });
    op = load(operation_id)!;
    try {
      const raw = await post(args['fixture-socket'], '/start', identity(op), deadline);
      const r = observation(raw, op);
      const positive = raw !== null && typeof raw === 'object'
        && ['running', 'completed', 'not_started'].includes((raw as Json).status as string);
      if (positive && !r) setStatus(op, 'needs_attention', 'needs_attention');
      else if (r?.status === 'running') setStatus(op, 'running', 'accepted');
      else setStatus(op, 'unknown', 'unknown');
    } catch { setStatus(op, 'unknown', 'unknown'); }
    return;
  }
  try {
    const r = observation(await post(args['fixture-socket'], '/inspect', identity(op), deadline), op);
    if (r?.status === 'running') setStatus(op, 'running', 'accepted');
    else if (r?.status === 'not_started' && r.authoritative === true) {
      setStatus(op, op.start_count < startLimit ? 'queued' : 'needs_attention', op.start_count < startLimit ? 'pending' : 'needs_attention');
    } else if (r?.status === 'completed' && r.effect_marker) {
      const wait = barrier('after_completion_observed', op.operation_id);
      if (wait) await wait;
      transaction(() => {
        if (load(op.operation_id)!.status === 'completed') return;
        db.prepare("UPDATE operations SET status='completed' WHERE operation_id=?").run(op.operation_id);
        db.prepare("UPDATE deliveries SET status='completed' WHERE target='fixture' AND event_id IN (SELECT event_id FROM events WHERE operation_id=?)").run(op.operation_id);
        addEvent(op, 'operation_completed', 'leader', r.effect_marker!);
      });
    } else setStatus(op, 'needs_attention', 'needs_attention');
  } catch { setStatus(op, 'needs_attention', 'needs_attention'); }
}
const inFlight = new Map<string, Promise<void>>();
function drive(operation_id: string) {
  let pending = inFlight.get(operation_id);
  if (!pending) {
    pending = Promise.resolve().then(() => perform(operation_id)).finally(() => inFlight.delete(operation_id));
    inFlight.set(operation_id, pending);
  }
  return pending;
}
async function submit(b: Binding, params: z.infer<typeof schemas.submit_operation>) {
  const existing = db.prepare('SELECT * FROM operations WHERE project_id=? AND run_id=? AND key=? AND object_version=?').get(b.project_id, b.run_id, params.key, params.object_version) as Operation | undefined;
  if (existing) {
    owned(existing.operation_id, b);
    if (existing.resource_key !== params.resource_key) throw new ProbeError('IDEMPOTENCY_CONFLICT');
    return view(existing);
  }
  if (db.prepare("SELECT operation_id FROM operations WHERE project_id=? AND run_id=? AND resource_key=? AND status<>'completed'").get(b.project_id, b.run_id, params.resource_key)) throw new ProbeError('RESOURCE_BUSY');
  const op: Operation = { operation_id: randomUUID(), project_id: b.project_id, run_id: b.run_id, leader_id: b.leader_id, attempt_id: randomUUID(), key: params.key, object_version: params.object_version, resource_key: params.resource_key, status: 'queued', start_count: 0 };
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO operations VALUES (?,?,?,?,?,?,?,?,?,?)').run(op.operation_id, op.project_id, op.run_id, op.leader_id, op.attempt_id, op.object_version, op.key, op.resource_key, op.status, op.start_count);
    addEvent(op, 'operation_requested', 'fixture');
    const wait = barrier('before_commit', op.operation_id);
    if (wait) await wait;
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  const wait = barrier('after_commit', op.operation_id);
  if (wait) await wait;
  return view(op);
}
const requestSchema = z.object({ token: id, method: z.enum(Object.keys(schemas) as [Method, ...Method[]]), params: z.unknown() }).strict();
async function execute(raw: unknown): Promise<Json> {
  const req = requestSchema.parse(raw);
  const params = schemas[req.method].parse(req.params);
  const b = bindings.find(b => b.token === req.token);
  if (!b || b.project_id !== params.project_id || b.run_id !== params.run_id) throw new ProbeError('SCOPE_DENIED');
  const scopeValues = [b.project_id, b.run_id, b.leader_id];
  switch (req.method) {
    case 'get_probe_status': return {
      instance_id, pid: process.pid,
      journal_mode: db.prepare('PRAGMA journal_mode').get()!.journal_mode,
      synchronous: db.prepare('PRAGMA synchronous').get()!.synchronous,
      foreign_keys: db.prepare('PRAGMA foreign_keys').get()!.foreign_keys,
      sqlite_version: db.prepare('SELECT sqlite_version() AS version').get()!.version,
      operations: db.prepare('SELECT operation_id,attempt_id,object_version,key,resource_key,status,start_count FROM operations WHERE project_id=? AND run_id=? AND leader_id=? ORDER BY rowid').all(...scopeValues),
      events: db.prepare('SELECT * FROM events WHERE project_id=? AND run_id=? AND leader_id=? ORDER BY rowid').all(...scopeValues).map(eventView),
      deliveries: db.prepare('SELECT d.* FROM deliveries d JOIN events e USING(event_id) WHERE e.project_id=? AND e.run_id=? AND e.leader_id=? ORDER BY d.rowid').all(...scopeValues),
    };
    case 'submit_operation': return submit(b, schemas.submit_operation.parse(params));
    case 'get_operation_status': return view(owned(schemas.get_operation_status.parse(params).operation_id, b));
    case 'reconcile_operation': {
      const op = owned(schemas.reconcile_operation.parse(params).operation_id, b);
      if (!['queued', 'completed'].includes(op.status)) await drive(op.operation_id);
      return view(load(op.operation_id)!);
    }
    case 'get_pending_events': return { events: db.prepare("SELECT e.* FROM events e JOIN deliveries d USING(event_id) WHERE e.project_id=? AND e.run_id=? AND e.leader_id=? AND d.target='leader' AND d.status='pending' ORDER BY e.rowid").all(...scopeValues).map(eventView) };
    case 'acknowledge_events': {
      const { event_ids } = schemas.acknowledge_events.parse(params);
      for (const event_id of event_ids) {
        const event = db.prepare("SELECT e.* FROM events e JOIN deliveries d USING(event_id) WHERE event_id=? AND d.target='leader'").get(event_id);
        if (!event) throw new ProbeError('RESOURCE_NOT_FOUND');
        if (event.project_id !== b.project_id || event.run_id !== b.run_id || event.leader_id !== b.leader_id) throw new ProbeError('SCOPE_DENIED');
      }
      transaction(() => { for (const event_id of event_ids) db.prepare("UPDATE deliveries SET status='acknowledged' WHERE event_id=? AND target='leader'").run(event_id); });
      return { acknowledged: event_ids };
    }
  }
}
async function prepareSocket() {
  let before;
  try { before = lstatSync(args.socket); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return; throw e; }
  if (!before.isSocket()) throw new Error('SOCKET_PATH_NOT_SOCKET');
  const refused = await new Promise<boolean>(resolve => {
    const client = createConnection(args.socket);
    client.once('connect', () => { client.destroy(); resolve(false); });
    client.once('error', (e: NodeJS.ErrnoException) => resolve(e.code === 'ECONNREFUSED'));
    client.setTimeout(deadline, () => { client.destroy(); resolve(false); });
  });
  if (!refused) throw new Error('SOCKET_NOT_STALE');
  const after = lstatSync(args.socket);
  if (before.ino !== after.ino || before.dev !== after.dev) throw new Error('SOCKET_CHANGED');
  renameSync(args.socket, `${args.socket}.stale-${randomUUID()}`);
}
await prepareSocket();
const server = createServer(async (req, res) => {
  let reply;
  try {
    if (req.method !== 'POST' || req.url !== '/') throw new ProbeError('BAD_REQUEST');
    let body = '';
    for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 65536) throw new ProbeError('BAD_REQUEST'); }
    reply = { ok: true, result: await execute(JSON.parse(body)) };
  } catch (error) {
    reply = { ok: false, error_code: error instanceof ProbeError ? error.message : error instanceof z.ZodError || error instanceof SyntaxError ? 'BAD_REQUEST' : 'BACKEND_UNAVAILABLE' };
  }
  res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(reply));
});
server.on('error', () => { db.close(); process.stderr.write('CORE_LISTEN_FAILED\n'); process.exit(1); });
const timer = setInterval(() => {
  if (paused) return;
  const rows = db.prepare("SELECT operation_id FROM operations WHERE status IN ('queued','dispatched','unknown','running')").all();
  for (const row of rows) void drive(row.operation_id as string).catch(() => process.stderr.write('CORE_OPERATION_FAILED\n'));
}, tickMs);
server.listen(args.socket, () => {
  chmodSync(args.socket, 0o600);
  process.stdout.write(`${JSON.stringify({ ready: true, instance_id, pid: process.pid })}\n`);
});
function stop() {
  clearInterval(timer); server.closeAllConnections();
  server.close(() => { db.close(); process.exit(0); });
}
process.on('SIGTERM', stop); process.on('SIGINT', stop);
