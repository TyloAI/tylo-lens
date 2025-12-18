# Tylo-Lens

**Tylo-Lens** is a free, open-source **LLM transparency dashboard** for tracing call chains, token/cost usage, latency, and ethics signals — built for the MCP era.

[![CI](https://github.com/tylo-lens/tylo-lens/actions/workflows/ci.yml/badge.svg)](https://github.com/tylo-lens/tylo-lens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## The Why (2025)

LLM applications are becoming **agentic**: models call tools, tools call models, workflows branch and retry, and costs explode silently.

Without transparency, teams ship **black boxes**:

- Prompt / tool misuse is hard to audit
- PII leaks are easy to miss
- Token spend becomes unbounded
- Latency regressions hide behind “it feels slow”

Tylo-Lens makes LLM systems **observable, explainable, and auditable**.

Two open-source AI trends make this inevitable:

1. **Ecosystem standardization** — common interfaces, portable tooling.
2. **Agent collaboration** — multi-agent orchestration across models/tools.

The **MCP (Model Context Protocol)** pushes agent↔tool↔model integration toward standard interfaces. Tylo-Lens is **MCP-ready** and **vendor-agnostic**.

## What you get

- **Call-chain visualization**: who called which model, with which prompt, and what came back.
- **Token + cost analytics**: token usage, cost estimates, per-model breakdown.
- **Latency monitoring**: response time histograms and p95/p99 tracking.
- **Safety & compliance reporting**: lightweight PII signals + audit-friendly reports.

## One-click experience

Deploy your own dashboard in ~1 minute.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/<YOUR_GITHUB_ORG>/tylo-lens/tree/main/packages/@tylo-lens/dashboard)

> If Vercel asks: set the **Root Directory** to `packages/@tylo-lens/dashboard`.

## Live demo (read-only)

We maintain a **read-only** demo that streams synthetic traces so you can see the TraceGraph flow effects before downloading anything:

- Demo: `https://demo.tylo-lens.dev` (placeholder)

The demo is protected via an optional token gate (middleware). To self-host the same experience:

- set `TYLO_LENS_READ_ONLY=1` to disable ingestion
- set `TYLO_LENS_DEMO_TOKEN=...` to require `?token=...` once (stored in a cookie)

## Architecture (high-level)

```mermaid
flowchart LR
  A[Your App / Agent] --> B[@tylo-lens/core\nInspector]
  B --> C[Trace JSON\n(LensTrace)]
  C --> D[Dashboard API\nPOST /api/ingest]
  D --> E[@tylo-lens/dashboard\nNext.js]
  E --> F[@tylo-lens/ui\nGlass components]
```

## Plugin-first engine

Tylo-Lens core is designed around plugins:

- **Providers**: Ollama, OpenAI-compatible gateways (DeepSeek, etc), local Llama stacks…
- **Exporters**: Slack/Discord webhooks, files, custom storage, CI artifacts…

### Minimal “drop-in” setup

This gives you a **low-friction** starting point: patch `fetch` (and optionally XHR), auto-create traces, and export them to the dashboard.

```ts
import {
  TyloLens,
  autoTracePlugin,
  exporterPlugin,
  networkInstrumentationPlugin,
  protoethikPlugin,
  webhookExporter,
} from '@tylo-lens/core';

const lens = new TyloLens({
  app: { name: 'my-app', environment: 'dev' },
  plugins: [
    networkInstrumentationPlugin({
      fetch: true,
      xhr: true,
      // avoid tracing the exporter itself
      shouldTraceUrl: (url) => !url.includes('/api/ingest'),
    }),
    autoTracePlugin({ idleMs: 1500, flushOnExport: true }),
    protoethikPlugin(),
    exporterPlugin(webhookExporter({ url: 'http://localhost:3000/api/ingest' })),
  ],
});
```

## Packages

- `@tylo-lens/core` — The Inspector (interceptors + collectors + ethics checks)
- `@tylo-lens/ui` — Shared UI components (Glass design system)
- `@tylo-lens/dashboard` — Next.js dashboard (App Router)
- `@tylo-lens/provider-openai-compatible` — Provider wrapper for OpenAI-compatible APIs
- `@tylo-lens/provider-ollama` — Provider wrapper for local Ollama

## Quick start (local)

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

## Ingestion

The dashboard exposes:

- `POST /api/ingest` — ingest a `LensTrace`
- `GET /api/stream` — SSE stream of ingested traces

Example:

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H 'content-type: application/json' \
  -d '{"traceId":"demo","app":{"name":"demo"},"startedAt":"2025-01-01T00:00:00.000Z","spans":[]}'
```

## SDK usage (example)

```ts
import { TyloLens } from '@tylo-lens/core';

const lens = new TyloLens({
  app: { name: 'my-app', environment: 'dev' },
});

// Wrap a model call (works with any LLM client)
const run = lens.wrapLLM('openai:gpt-4.1', async () => {
  return { outputText: 'hello', usage: { inputTokens: 10, outputTokens: 12 } };
});

await run({ prompt: 'Say hello' });
console.log(lens.exportTrace());
```

## Protoethik transparency score

Tylo-Lens includes a lightweight transparency score inspired by the **Protoethik** rules:

```
T_score = (Σ(C_clarity · W_c) − Σ(P_pii · W_p)) / T_tokens
```

The dashboard shows:

- `T-score (0–100)` for human-friendly scanning
- the raw score + breakdown for auditing

## CLI (trace validation)

Tylo-Lens ships a small CLI to validate trace payloads:

```bash
node packages/@tylo-lens/cli/bin/tylo-lens.js validate ./my-trace.json
```

## Examples

- `examples/vanilla-js` — no framework
- `examples/basic-mcp` — wrap MCP-style `request(method, params)`
- `examples/nextjs-ai-sdk` — conceptual Next.js + AI SDK integration

## Hall of Fame (coming soon)

Community-made plugins will live here:

- Provider plugins (Ollama, DeepSeek, local inference)
- Exporters (Slack/Discord, files, databases)
- Visualization extensions (custom node types, layouts)

Want to be listed? Ship a plugin and open a PR.

## Security & privacy

Tylo-Lens can capture prompts/outputs, which may contain sensitive data.

- Use PII redaction and retention controls in production.
- Add auth to ingestion endpoints.
- Prefer server-side ingestion (avoid exposing raw traces to browsers).

## Governance

- RFCs: `rfcs/README.md`
- Issue templates: `.github/ISSUE_TEMPLATE`
- Protoethik draft rules: `.github/linters/protoethik.rules.md`

## License

MIT
