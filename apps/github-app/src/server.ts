import Fastify, { type FastifyInstance } from 'fastify';
import { handleWebhook, type WebhookDeps, type WebhookResult } from './webhook.js';

/**
 * HTTP adapter for the webhook handler. It keeps the raw body intact for the
 * signature check and returns only the outcome code to the sender. Tenant IDs
 * and internal details are not included in responses.
 */
export function buildServer(deps: WebhookDeps): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: 1024 * 1024 });

  // Keep the body as raw bytes for every content type. The signature covers exact bytes.
  // Remove Fastify's built-in JSON parser, which would otherwise parse the body before we see it.
  app.removeAllContentTypeParsers();
  app.addContentTypeParser('*', { parseAs: 'buffer' }, (_req, body, done) => done(null, body));

  app.post('/webhooks/github', async (req, reply) => {
    const body = req.body as Buffer;
    const result = await handleWebhook(
      {
        rawBody: new Uint8Array(body),
        headers: {
          signature256: header(req.headers['x-hub-signature-256']),
          event: header(req.headers['x-github-event']),
          deliveryId: header(req.headers['x-github-delivery']),
        },
      },
      deps,
    );
    return reply.code(result.status).send(publicBody(result));
  });

  app.get('/healthz', async () => ({ status: 'ok' }));

  app.setErrorHandler(async (_err, _req, reply) => {
    // Never expose internals. The sender only learns that processing failed,
    // so GitHub redelivers the event.
    return reply.code(500).send({ outcome: 'error' });
  });

  return app;
}

function header(v: string | string[] | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function publicBody(r: WebhookResult): Record<string, string> {
  if (r.status === 202) return { outcome: r.outcome };
  if (r.status === 200) return { outcome: r.outcome };
  return { outcome: r.reason };
}
