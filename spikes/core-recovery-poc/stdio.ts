import { readFileSync } from 'node:fs';
import { Server, type Tool } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { id, options, positive, post, schemas } from './protocol.ts';
import type { Json, Method, Reply } from './protocol.ts';

const args = options(['socket', 'binding', 'deadline-ms']);
const deadline = positive(args['deadline-ms']);
const { token } = z.object({ token: id }).strict().parse(JSON.parse(readFileSync(args.binding, 'utf8')));
const methods = Object.keys(schemas) as Method[];
const server = new Server({ name: 'coco-t008-fixture', version: '0.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler('tools/list', () => ({
  tools: methods.map(name => ({
    name, description: `Isolated T008 fixture only: ${name}`,
    // Zod's recursive JSON schema typing is broader than the SDK's bounded JSON type.
    inputSchema: { ...z.toJSONSchema(schemas[name]), type: 'object' as const } as unknown as Tool['inputSchema'],
  })),
}));
// The public low-level handler keeps validation failures machine-readable too.
server.setRequestHandler('tools/call', async request => {
  const method = request.params.name as Method;
  let reply: Reply;
  const parsed = methods.includes(method) ? schemas[method].safeParse(request.params.arguments ?? {}) : undefined;
  if (!parsed?.success) reply = { ok: false, error_code: 'BAD_REQUEST' };
  else {
    try { reply = await post(args.socket, '/', { token, method, params: parsed.data }, deadline) as Reply; }
    catch { reply = { ok: false, error_code: 'BACKEND_UNAVAILABLE' }; }
  }
  const result: Json = reply.ok ? reply.result : { error_code: reply.error_code };
  return server.projectCallToolResult({
    content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result,
    ...(reply.ok ? {} : { isError: true }),
  }, undefined);
});
await serveStdio(() => server);
