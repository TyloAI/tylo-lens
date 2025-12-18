# Next.js + AI SDK example (concept)

This folder contains a **conceptual** integration guide for the Vercel AI SDK (or similar toolkits).

The idea:

1. Create a `TyloLens` instance per request (or per session).
2. Wrap your model call (or your AI SDK call) using `lens.wrapLLM(model, fn)`.
3. Export the trace and POST it to your dashboard ingestion endpoint.

## Example snippet

```ts
import { TyloLens } from '@tylo-lens/core';

export async function POST(req: Request) {
  const lens = new TyloLens({ app: { name: 'my-nextjs-app', environment: 'dev' } });

  const run = lens.wrapLLM('provider:model', async ({ prompt }) => {
    // call your AI SDK here
    return { outputText: '...', usage: { inputTokens: 1, outputTokens: 1 } };
  });

  await run({ prompt: 'hello' });
  await fetch('http://localhost:3000/api/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(lens.exportTrace())
  });

  return Response.json({ ok: true });
}
```

