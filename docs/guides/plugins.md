# Plugins & ecosystem

Tylo-Lens is designed as a **plugin-first** engine.

The core goal is simple:

- keep `@protoethik-ai/core` stable and minimal
- let the community ship **providers** (Ollama / DeepSeek / local inference / gateways)
- let the community ship **exporters** (Slack / Discord / files / databases / CI artifacts)

If you want Tylo-Lens to “go viral” in the best way, plugins are the path.

---

## Mental model

- A **Trace** is a single unit of work: one request, one agent run, one job.
- A **Span** is one step in that work: an LLM call, an MCP request, a tool call, an HTTP fetch.
- A **Plugin** subscribes to lifecycle events and can add exporters/instrumentation.
- An **Exporter** ships the trace somewhere.

The plugin API is intentionally lightweight: it’s “just JavaScript” with a clear event model.

---

## Plugin API (deep dive)

```ts
import type { LensPlugin } from '@protoethik-ai/core';

export const myPlugin: LensPlugin = {
  name: 'my-plugin',
  setup(ctx) {
    // Subscribe to events
    const off = ctx.on('span.end', ({ span }) => {
      span.meta = { ...(span.meta ?? {}), analyzedBy: 'my-plugin' };
    });

    // Return a disposer (optional)
    return () => off();
  },
};
```

### `ctx` capabilities

Inside `setup(ctx)` you can:

- `ctx.on(type, handler)` — observe lifecycle events
- `ctx.addExporter(exporter)` — register an exporter
- `ctx.startTrace()` / `ctx.endTrace()` / `ctx.exportTrace()` — control boundaries
- `ctx.flush(trace?)` / `ctx.exportAndFlush()` — ship traces via exporters
- `ctx.startSpan({ ... })` — create spans directly (for custom providers/tools)

### Event types

Tylo-Lens emits:

- `trace.start`
- `trace.end`
- `span.start`
- `span.end`
- `export`

Each event includes the active `trace`, and span events include `span`.

---

## Writing an exporter (recommended first plugin)

Exporters are the simplest way to contribute. An exporter is:

```ts
import type { LensExporter } from '@protoethik-ai/core';

export const myExporter: LensExporter = {
  name: 'my-exporter',
  export: async (trace) => {
    // send trace somewhere (HTTP / file / queue / DB)
  },
};
```

### Option A: install exporter directly

```ts
import { TyloLens } from '@protoethik-ai/core';
import { myExporter } from './my-exporter';

const lens = new TyloLens({
  app: { name: 'my-app' },
  exporters: [myExporter],
});
```

### Option B: register exporter via plugin

```ts
import { TyloLens, exporterPlugin } from '@protoethik-ai/core';
import { myExporter } from './my-exporter';

const lens = new TyloLens({
  app: { name: 'my-app' },
  plugins: [exporterPlugin(myExporter)],
});
```

### Example: exporting to the Tylo-Lens dashboard

```ts
import { TyloLens, exporterPlugin, webhookExporter } from '@protoethik-ai/core';

const lens = new TyloLens({
  app: { name: 'my-app' },
  plugins: [exporterPlugin(webhookExporter({ url: 'http://localhost:3000/api/ingest' }))],
  autoFlushOnExport: true,
});
```

### Exporter best practices

- Exporters must be **best-effort** (don’t crash the host app).
- Do not export raw prompts/outputs in production without consent.
- Consider batching / debouncing if you export frequently.

---

## Writing a provider wrapper (how the ecosystem scales)

Providers should be thin wrappers around an API client. The pattern:

1. Accept a `TyloLens` instance in options
2. Wrap each call using `lens.wrapLLM(model, fn)`
3. Return raw provider results to the app (Tylo-Lens should not “own” the provider response type)

### Provider skeleton

```ts
import type { TyloLens } from '@protoethik-ai/core';

export type MyProviderOptions = {
  lens: TyloLens;
  defaultModel: string;
};

export function createMyProvider(opts: MyProviderOptions) {
  return {
    async chat({ prompt }: { prompt: string }) {
      const run = opts.lens.wrapLLM(`my-provider:${opts.defaultModel}`, async () => {
        // call your provider here
        return { outputText: '...', usage: { inputTokens: 1, outputTokens: 1 } };
      });

      return run({ prompt });
    },
  };
}
```

### Provider packaging guideline

Create a new workspace package:

- `@protoethik-ai/protoethik-ai/provider-<name>/package.json`
- `@protoethik-ai/protoethik-ai/provider-<name>/src/index.ts`

Naming:

- npm package: `@protoethik-ai/provider-ollama`
- model strings: `ollama:<model>` or `openai-compatible:<model>`

---

## Instrumentation plugins (zero-intrusion DX)

Instrumentation plugins patch global interfaces so apps can integrate with minimal changes.

Example: patch `fetch` / XHR in one line:

```ts
import { TyloLens, networkInstrumentationPlugin } from '@protoethik-ai/core';

const lens = new TyloLens({
  app: { name: 'my-app' },
  plugins: [
    networkInstrumentationPlugin({
      fetch: true,
      xhr: true,
      captureSSE: true,
      shouldTraceUrl: (url) => !url.includes('/api/ingest'),
    }),
  ],
});
```

### Real-time streaming to the dashboard

If you want the dashboard UI (`useTraceStream`) to update while a stream is still in-flight, use the realtime webhook plugin:

```ts
import { TyloLens, networkInstrumentationPlugin, realtimeWebhookPlugin } from '@protoethik-ai/core';

const lens = new TyloLens({
  app: { name: 'my-app' },
  plugins: [
    networkInstrumentationPlugin({ fetch: true, captureSSE: true }),
    realtimeWebhookPlugin({ url: 'http://localhost:3000/api/ingest', debounceMs: 250 }),
  ],
});
```

> Important: exclude your ingestion URL from instrumentation to avoid export loops.

## Accurate tokenization (optional heavy plugin)

By default, Tylo-Lens uses a dependency-free heuristic (`estimateTokens()`).

If you need accurate counts, enable the optional tiktoken plugin:

```ts
import { TyloLens, tiktokenTokenizerPlugin } from '@protoethik-ai/core';

const lens = new TyloLens({
  app: { name: 'my-app' },
  plugins: [tiktokenTokenizerPlugin({ model: 'gpt-4o-mini' })],
});
```

Install the optional dependency:

```bash
pnpm add -D @dqbd/tiktoken
```

---

## Privacy, safety, and “Protoethik”

Tylo-Lens is an observability tool. Observability can become surveillance if you’re careless.

Minimum standards for community plugins:

- Avoid exporting raw prompts/outputs by default.
- Redact known PII patterns; allow org-specific secret patterns.
- Provide configuration switches and document them.
- Clearly state retention guidance for any storage exporters.
