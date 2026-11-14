// Disposable T008 protocol, not the production API or an authorization boundary.
import { parseArgs } from 'node:util';
import { request } from 'node:http';
import { z } from 'zod';

export const id = z.string().min(1);
export const scope = z.object({ project_id: id, run_id: id }).strict();
export const schemas = {
  get_probe_status: scope,
  submit_operation: scope.extend({ key: id, object_version: z.number().int().positive(), resource_key: id }),
  get_operation_status: scope.extend({ operation_id: id }),
  reconcile_operation: scope.extend({ operation_id: id }),
  get_pending_events: scope,
  acknowledge_events: scope.extend({ event_ids: z.array(id).max(100) }),
};
export type Method = keyof typeof schemas;
export const bindingSchema = z.object({ token: id, project_id: id, run_id: id, leader_id: id, native_session_id: id }).strict();
export type Binding = z.infer<typeof bindingSchema>;
export type Json = Record<string, unknown>;
export type Reply = { ok: true; result: Json } | { ok: false; error_code: string };
export class ProbeError extends Error {}

export function options(required: string[], optional: string[] = []) {
  const { values } = parseArgs({ options: Object.fromEntries([...required, ...optional].map(k => [k, { type: 'string' as const }])), allowPositionals: false });
  for (const key of required) if (!values[key]) throw new Error('MISSING_ARGUMENT');
  return values as Record<string, string>;
}
export function positive(value: string) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 2 ** 31 - 1) throw new Error('INVALID_NUMBER');
  return n;
}
export function post(socket: string, path: string, payload: unknown, deadline: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = request({ socketPath: socket, path, method: 'POST', signal: AbortSignal.timeout(deadline), headers: { 'content-type': 'application/json' } }, res => {
      let body = '';
      res.on('data', chunk => {
        body += chunk;
        if (Buffer.byteLength(body) > 131072) req.destroy(new Error('RESPONSE_TOO_LARGE'));
      });
      res.on('error', reject);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) throw new Error('REMOTE_UNAVAILABLE');
          resolve(JSON.parse(body));
        } catch (error) { reject(error); }
      });
    });
    req.on('error', reject);
    req.end(JSON.stringify(payload));
  });
}
