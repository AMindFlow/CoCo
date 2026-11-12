import { readFileSync } from 'node:fs';
import { request } from 'node:http';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { options, schemas } from './contract.ts';
import type { Method } from './contract.ts';

const args = options(['socket', 'binding']);
const { token } = z.object({ token: z.string().min(1) }).strict()
  .parse(JSON.parse(readFileSync(args.binding, 'utf8')));

function forward(method: Method, params: unknown): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const unavailable = () => resolve({ ok: false, error_code: 'BACKEND_UNAVAILABLE' });
    const req = request({ socketPath: args.socket, path: '/', method: 'POST',
      headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(1500),
    }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('error', unavailable);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { unavailable(); }
      });
    });
    req.on('error', unavailable);
    req.end(JSON.stringify({ token, method, params }));
  });
}

const server = new McpServer({ name: 'coco-t006-fixture', version: '0.0.0' });
for (const method of Object.keys(schemas) as Method[]) {
  server.registerTool(method, {
    description: `Isolated T006 fixture only: ${method}`,
    inputSchema: schemas[method],
  }, async (params: Record<string, unknown>) => {
    const response = await forward(method, params);
    const result = response.ok ? response.result as Record<string, unknown>
      : { error_code: response.error_code };
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      structuredContent: result, ...(response.ok ? {} : { isError: true }) };
  });
}
await serveStdio(() => server);
