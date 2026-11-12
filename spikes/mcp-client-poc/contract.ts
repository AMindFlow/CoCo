import { parseArgs } from 'node:util';
import { z } from 'zod';

export const scope = z.object({ project_id: z.string(), run_id: z.string() }).strict();
export const schemas = {
  get_probe_status: scope,
  get_pending_events: scope,
  acknowledge_events: scope.extend({ event_ids: z.array(z.string()).max(100) }),
  start_fixture_operation: scope.extend({ operation_id: z.string() }),
  get_operation_status: scope.extend({ operation_id: z.string() }),
};

const target = z.object({ project_id: z.string(), run_id: z.string(), leader_id: z.string() });
export const eventSchema = target.extend({ event_id: z.string(), nonce: z.string() }).strict();
export const fixtureSchema = z.object({
  bindings: z.array(target.extend({ token: z.string().min(1), thread_id: z.string() }).strict()),
  events: z.array(eventSchema),
  operations: z.array(eventSchema.extend({
    operation_id: z.string(), delay_ms: z.number().int().min(1).max(10_000),
  }).strict()),
}).strict();

export function options(names: string[]) {
  const { values } = parseArgs({
    options: Object.fromEntries(names.map(name => [name, { type: 'string' as const }])),
    allowPositionals: false,
  });
  for (const name of names) if (!values[name]) throw new Error('MISSING_ARGUMENT');
  return values as Record<string, string>;
}

export type Event = z.infer<typeof eventSchema>;
export type Fixture = z.infer<typeof fixtureSchema>;
export type Method = keyof typeof schemas;
