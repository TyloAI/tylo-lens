<div align="center">

# 🛡️ Tylo-Lens: The LLM Transparency Standard


**A high-fidelity, privacy-first observability dashboard for the MCP & Agentic AI era.**

[Quick Start](https://www.google.com/search?q=%23-quick-start) • [Architecture](https://www.google.com/search?q=%23-architecture) • [Packages](https://www.google.com/search?q=%23-monorepo-structure) • [Compliance](https://www.google.com/search?q=%23-protoethik-transparency-score)

</div>

---

## 🚀 The Why (2025)

In the era of **Agentic AI**, LLM applications are no longer simple prompt-response loops. They are complex ecosystems where models call tools, tools call models, and workflows branch dynamically.

Without transparency, you are shipping **black boxes**:

* **Prompt/Tool Misuse**: Hard to audit in multi-step chains.
* **PII Leakage**: Sensitive data easily slips into logs.
* **Token Spend**: Costs explode silently in runaway loops.
* **Latency Debts**: Regressions hide behind "it just feels slow".

**Tylo-Lens** makes LLM systems **observable, explainable, and auditable** by default.

---

## ✨ Key Features

* **🌐 Call-Chain Visualization**: Interactive TraceGraphs showing model/tool topology.
* **📊 Token & Cost Analytics**: Real-time breakdown of per-model usage and costs.
* **⏱️ Latency Monitoring**: p95/p99 tracking and response time histograms.
* **🛡️ Protoethik Safety**: Built-in PII signals and automated transparency scoring.
* **🔌 MCP-Ready**: Native support for the **Model Context Protocol**.

---

## 🏗️ Monorepo Structure

Tylo-Lens is built as a modular monorepo for maximum flexibility:

```text
tylo-lens/
├── packages/
│   ├── @tylo-lens/core        # The "Inspector": Interceptors & Collectors
│   ├── @tylo-lens/ui          # "Glass" Design System: Shared React primitives
│   ├── @tylo-lens/dashboard   # Next.js Trace Explorer & Analytics
│   └── @tylo-lens/provider-* # Community adapters (Ollama, DeepSeek, etc.)
├── examples/                  # Integration recipes (Vanilla, Next.js, MCP)
├── docs/                      # Technical & Compliance documentation
├── rfcs/                      # Protocol & Schema evolution proposals
└── scripts/                   # CLI & Validation utilities

```

---

## 🔌 Architecture

Tylo-Lens uses a **thin SDK + rich dashboard** approach to minimize performance overhead.

```mermaid
flowchart LR
  A[Your App / Agent] --> B[@tylo-lens/core\nInspector]
  B --> C[Trace JSON\n(LensTrace)]
  C --> D[Dashboard API\nPOST /api/ingest]
  D --> E[@tylo-lens/dashboard\nNext.js]
  E --> F[@tylo-lens/ui\nGlass components]

```

---

## ⚡ Quick Start

### 1. Deploy the Dashboard

Deploy your own instance in seconds via Vercel:

*Set the **Root Directory** to `packages/@tylo-lens/dashboard`.*

### 2. Install the SDK

```bash
pnpm add @tylo-lens/core

```

### 3. Initialize the Inspector

"Drop-in" setup for automatic network and agent tracing:

```ts
import { 
  TyloLens, 
  networkInstrumentationPlugin, 
  autoTracePlugin 
} from '@tylo-lens/core';

const lens = new TyloLens({
  app: { name: 'my-agent', environment: 'prod' },
  plugins: [
    networkInstrumentationPlugin({ fetch: true, xhr: true }), //
    autoTracePlugin({ idleMs: 1500 }) // Auto-close traces on idle
  ],
});

```

---

## ⚖️ Protoethik Transparency Score

Tylo-Lens includes a standardized score derived from the **Protoethik** rules to measure application clarity and risk.

The score (0–100) helps human auditors quickly identify high-risk traces.

---

## 🧪 Examples

* **[Vanilla JS](https://www.google.com/search?q=./examples/vanilla-js)**: Pure Node.js/Browser usage.
* **[Basic MCP](https://www.google.com/search?q=./examples/basic-mcp)**: Wrapping MCP-style `request` calls.
* **[Next.js + AI SDK](https://www.google.com/search?q=./examples/nextjs-ai-sdk)**: Integration with modern AI toolkits.

---

## 🤝 Governance & Security

* **RFC Process**: All breaking changes to `LensTrace` schema go through `rfcs/`.
* **PII Safety**: Built-in redaction (mask/hash) before data leaves the SDK.
* **Auditing**: Audit-friendly reports generated per-trace.

---

## 📜 License

MIT © 2025 Tylo-Lens

---

**Built with ❤️ by the Protoethik Community.**

---
