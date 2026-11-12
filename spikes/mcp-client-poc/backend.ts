// Disposable fixture backend. This is not the production Coordinator or an OS security boundary.
import { createServer } from 'node:http';
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { eventSchema, fixtureSchema, options, schemas } from './contract.ts';
import type { Event, Method } from './contract.ts';

const args = options(['socket', 'fixture', 'state']);
const fixture = fixtureSchema.parse(JSON.parse(readFileSync(args.fixture, 'utf8')));
if (new Set(fixture.bindings.map(b => b.token)).size !== fixture.bindings.length) {
  throw new Error('DUPLICATE_FIXTURE_BINDING');
}
const instance_id = randomUUID();
const events: (Event & { acknowledged: boolean })[] = fixture.events.map(e => ({ ...e, acknowledged: false }));
const operations = fixture.operations.map(o => ({ ...o, status: 'pending' as 'pending' | 'running' | 'completed' }));
const timers = new Set<ReturnType<typeof setTimeout>>();
const requestSchema = z.object({
  token: z.string(), method: z.enum(Object.keys(schemas) as [Method, ...Method[]]), params: z.unknown(),
}).strict();

function snapshot(first = false) {
  // Evidence fixture only: no credentials or caller tokens in the state file.
  writeFileSync(args.state, JSON.stringify({ instance_id, events, operations }), {
    mode: 0o600, flag: first ? 'wx' : 'w',
  });
}
snapshot(true);

class ProbeError extends Error {}
function execute(input: unknown) {
  const request = requestSchema.parse(input);
  const params = schemas[request.method].parse(request.params);
  const binding = fixture.bindings.find(b => b.token === request.token);
  if (!binding || binding.project_id !== params.project_id || binding.run_id !== params.run_id) {
    throw new ProbeError('SCOPE_DENIED');
  }
  const owns = (target: Event) => target.project_id === binding.project_id
    && target.run_id === binding.run_id && target.leader_id === binding.leader_id;

  switch (request.method) {
    case 'get_probe_status': return { instance_id, pid: process.pid };
    case 'get_pending_events':
      return { events: events.filter(e => owns(e) && !e.acknowledged).map(e => eventSchema.strip().parse(e)) };
    case 'acknowledge_events': {
      const { event_ids } = schemas.acknowledge_events.parse(params);
      const batch = event_ids.map(id => {
        const event = events.find(e => e.event_id === id);
        if (!event) throw new ProbeError('RESOURCE_NOT_FOUND');
        if (!owns(event)) throw new ProbeError('SCOPE_DENIED');
        return event;
      });
      for (const event of batch) event.acknowledged = true;
      snapshot();
      return { acknowledged: event_ids };
    }
    case 'start_fixture_operation':
    case 'get_operation_status': {
      const { operation_id } = schemas.get_operation_status.parse(params);
      const operation = operations.find(o => o.operation_id === operation_id);
      if (!operation) throw new ProbeError('RESOURCE_NOT_FOUND');
      if (!owns(operation)) throw new ProbeError('SCOPE_DENIED');
      if (request.method === 'get_operation_status') return { operation_id, status: operation.status };
      if (operation.status === 'pending') {
        operation.status = 'running';
        snapshot();
        const timer = setTimeout(() => {
          operation.status = 'completed';
          events.push({ ...eventSchema.strip().parse(operation), acknowledged: false });
          snapshot();
          timers.delete(timer);
        }, operation.delay_ms);
        timers.add(timer);
      }
      return { accepted: true, operation_id };
    }
  }
}

const server = createServer(async (req, res) => {
  let result: unknown;
  try {
    if (req.method !== 'POST' || req.url !== '/') throw new ProbeError('BAD_REQUEST');
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 65_536) throw new ProbeError('BAD_REQUEST');
    }
    result = { ok: true, result: execute(JSON.parse(body)) };
  } catch (error) {
    result = { ok: false, error_code: error instanceof ProbeError ? error.message : 'BAD_REQUEST' };
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
});
server.on('error', (error: NodeJS.ErrnoException) => {
  process.stderr.write(`BACKEND_LISTEN_FAILED:${error.code ?? 'UNKNOWN'}\n`);
  process.exit(1);
});
server.listen(args.socket, () => {
  chmodSync(args.socket, 0o600);
  process.stdout.write(`${JSON.stringify({ ready: true, instance_id, pid: process.pid })}\n`);
});
function stop() {
  for (const timer of timers) clearTimeout(timer);
  server.close(() => process.exit(0));
  server.closeAllConnections();
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
