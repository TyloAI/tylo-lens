# SDK guide (`@protoethik-ai/core`)

The SDK is designed for **transparent, vendor-agnostic** instrumentation.

## Core concepts

- **Trace**: a collection of spans for a single unit of work (request / job / agent run).
- **Span**: one instrumented operation (LLM call, MCP request, HTTP fetch, tool call).

## Plugin-first usage

Tylo-Lens supports a plugin system so the community can add providers/exporters without modifying the core engine.

```ts
import { TyloLens, consoleExporter, exporterPlugin, protoethikPlugin } from '@protoethik-ai/core';

const lens = new TyloLens({
  app: { name: 'my-app', environment: 'dev' },
  plugins: [protoethikPlugin(), exporterPlugin(consoleExporter())],
});
```

## Wrap an LLM call

```ts
import { TyloLens } from '@protoethik-ai/core';

const lens = new TyloLens({ app: { name: 'my-app', environment: 'dev' } });

const run = lens.wrapLLM('provider:model', async ({ prompt }) => {
  // call your LLM client here
  return { outputText: '...', usage: { inputTokens: 10, outputTokens: 20 } };
});

await run({ prompt: 'Hello' });
console.log(lens.exportTrace());
```

## Zero-intrusion (best-effort)

If you want a “one line” demo integration, you can patch `fetch` and auto-close traces by idle timeout:

```ts
import { TyloLens, autoTracePlugin, networkInstrumentationPlugin } from '@protoethik-ai/core';

const lens = new TyloLens({
  app: { name: 'demo' },
  plugins: [networkInstrumentationPlugin({ fetch: true }), autoTracePlugin({ idleMs: 1500 })],
});
```

## Wrap MCP requests

Tylo-Lens does not depend on a specific MCP client implementation.
It supports a simple interface: `request(method, params)`.

```ts
import { TyloLens, wrapMCPClient } from '@protoethik-ai/core';

const lens = new TyloLens({ app: { name: 'my-agent' } });
const trace = lens.startTrace();

const client = { request: async (method: string, params?: unknown) => ({ ok: true }) };
const wrapped = wrapMCPClient(client, { trace, clientName: 'mcp', captureParams: false });

await wrapped.request('tools/list', {});
```
