<div align="center">

# 🛡️ Tylo-Lens: The LLM Observability Platform

**Enterprise-Grade Monitoring & Explainability for the Agentic AI Stack**

[![NPM Version](https://img.shields.io/npm/v/@protoethik-ai/core?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@protoethik-ai/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Documentation](https://img.shields.io/badge/Docs-Read%20Now-orange?style=for-the-badge)](docs)

</div>

  <div align="center">
  
  ## 📊 Visualize Every Interaction • 🛡️ Protect Every Token • ⚡ Audit Every Decision
  
  **The Complete Observability Stack for LLM Applications — From Prompt to Production**
  
  </div>

  <br>
  
  <div align="center">
  
  ### **✨ Why Developers Choose Tylo-Lens**
  
  [🚀 **One-Line Integration**](#-install-in-seconds) • [📈 **Real-Time Analytics**](#-why-tylo-lens) • 
  [🔍 **Trace Any LLM Call**](#-project-structure) • [💰 **Cost Intelligence**](#-protoethik-transparency-score)
  
  </div>
  
  ---

  <div align="center">
  
  ### **⚡ Get Started in 30 Seconds**
  
  ```bash
  npm install @protoethik-ai/core
  # or
  pnpm add @protoethik-ai/core
  # or
  yarn add @protoethik-ai/core
  ```
  </div>

  <br>
  
  ---
  
  ### **📦 What's Inside the Platform?**
  
  | Component | Purpose | Status |
  |-----------|---------|--------|
  | **@protoethik-ai/core** | Core SDK for intercepting LLM calls | ✅ Production Ready |
  | **@protoethik-ai/dashboard** | Real-time monitoring dashboard | 🚀 Beta |
  | **@protoethik-ai/ui** | React components for embedding | ✅ Stable |
  | **Providers (OpenAI, Claude, etc.)** | Native integrations | ✅ Complete |
  
  ---
  
  <div align="center">
  
  ### **🚀 Join the Protoethik ecosystem**
  
  [**TyloAI**](https://tyloai.com) • [**View Docs**](https://docs.tyloai.com) • [**API - Beta**](https://platform.tyloai.com) • [**Star on GitHub**](https://github.com/TyloAI) • [**ode-code CLI**](https://docs.tyloai.com/ode-code.html)
  
  </div>

</div>

---

## 🚀 Why Tylo-Lens? (2025)

In the era of **Agentic AI**, LLM applications have evolved beyond simple input-output models. The dynamic interactions—models invoking tools, tools feeding back to models, and workflows branching in real-time—have rendered systems into opaque "black boxes."

**Tylo-Lens** provides **Observability, Explainability, and Auditability** for LLM systems:

*   **Invocation Chain Visualization**: Tracks the interaction topology across multi-level Agents and Tools.
*   **Token & Cost Analysis**: Real-time computation of consumption per model and per process stage.
*   **Compliance & Privacy Auditing**: Built-in PII (Personally Identifiable Information) scanning and audit report generation.
*   **MCP Protocol Ready**: Native support for the Model Context Protocol introduced by Anthropic.

---

## 🏗️ Project Structure (Monorepo)

Tylo-Lens adopts a modular monorepo architecture, ensuring you can integrate only the components you require.

```text
tylo-lens/
├── .github/                   # GitHub Actions, Issue Templates, PR Templates
│   ├── workflows/             # CI/CD pipelines (Test, Build, Release)
│   └── linters/               # Custom linting rules for Protoethik standards
├── packages/                  # Monorepo workspaces
│   ├── @protoethik-ai/core/       # The "Inspector" - Pure JS logic to intercept MCP/LLM calls
│   │   ├── src/
│   │   │   ├── interceptors/  # Logic for wrapping fetch/XHR/MCP-protocol
│   │   │   ├── collectors/    # Logic for gathering tokens, latency, and costs
│   │   │   ├── ethics/        # PII detection & compliance checking algorithms
│   │   │   └── index.ts       # Main entry point for the SDK
│   │   ├── tests/             # Unit tests for the core engine
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── @protoethik-ai/ui/         # Shared UI components (The "Glass" design system)
│   │   ├── src/
│   │   │   ├── components/    # Atomic components (Nodes, Charts, Traces)
│   │   │   ├── hooks/         # React hooks for real-time data streaming
│   │   │   ├── styles/        # Tailwind config & global CSS (The "Cyber" look)
│   │   │   └── theme/         # Design tokens (Colors, Spacing, Typography)
│   │   └── package.json
│   └── @protoethik-ai/dashboard/  # The main Next.js application
│       ├── src/
│       │   ├── app/           # App Router (Dashboard, Settings, Analytics)
│       │   ├── lib/           # Dashboard-specific logic (Data persistence)
│       │   └── store/         # State management (Zustand/Signals)
│       ├── public/            # High-res assets, Logos, Icons
│       └── package.json
├── examples/                  # Integration examples for developers
│   ├── basic-mcp/             # How to use Tylo-Lens with a standard MCP server
│   ├── nextjs-ai-sdk/         # Integration with Vercel AI SDK
│   └── vanilla-js/            # Integration without any framework
├── docs/                      # Documentation (Docusaurus or Mintlify source)
│   ├── architecture/          # Deep dive into how Tylo-Lens works
│   ├── compliance/            # Ethics and Transparency standards documentation
│   └── guides/                # Getting started and advanced usage
├── scripts/                   # Internal build and maintenance scripts
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── lerna.json / pnpm-workspace.yaml
├── CHANGELOG.md               # Auto-generated by Changesets
├── CONTRIBUTING.md            # Guidelines for community
├── LICENSE                    # Open-source license (e.g., MIT or Apache 2.0)
├── README.md                  # The masterpiece landing page
└── package.json               # Root scripts (build, lint, test-all)

```

---

## ⚡ Quick Start

### 1. Install the Core SDK

You can install the production-optimized package directly from NPM:

```bash
pnpm add @protoethik-ai/core
```

### 2. Initialize the Inspector

Configure the interceptor at your application's entry point to enable automatic data collection:

```typescript
import {
  TyloLens,
  networkInstrumentationPlugin,
  autoTracePlugin
} from '@protoethik-ai/core';

const lens = new TyloLens({
  app: { name: 'my-agent-service', environment: 'production' },
  plugins: [
    // Automatically intercepts fetch and XHR requests.
    networkInstrumentationPlugin({ fetch: true, xhr: true }),
    // Manages Trace lifecycle automatically.
    autoTracePlugin({ idleMs: 1500 })
  ],
});

// Your application logic here.
```

### 3. Deploy the Visualization Dashboard

To privately deploy the monitoring dashboard, clone the repository and execute the following commands:

```bash
# When deploying to Vercel, set the root directory to `packages/@protoethik-ai/dashboard`.
pnpm install
pnpm build
pnpm start
```

---

## ⚖️ Protoethik Transparency Score

Tylo-Lens introduces a pioneering, quantifiable transparency scoring system based on the **Protoethik** framework, assessing key dimensions:

*   **Clarity**: The explicitness of prompts and context.
*   **PII Risk**: The weighted risk of sensitive data exposure.
*   **Token Efficiency**: The resource cost of system operation.

---

## 🤝 Contribution & Governance

*   **RFC Process**: Any modifications to core data structures must follow the process outlined in the `rfcs/` directory.
*   **Security First**: The SDK incorporates built-in data sanitization mechanisms, with PII masking enabled by default in production environments.

---

## 📜 License

MIT © 2025 [Protoethik](https://protoethik.com)

---
<div align="center">

<div align="center" style="padding: 2rem 0; color: #666; font-size: 0.9rem;">

**Made with ❤️ by [TyloAI](https://tyloai.com)**  
**Part of the [Protoethik](https://protoethik.com) ecosystem**
"Building AI that thinks deeply and acts responsibly."

[GitHub](https://github.com/TyloAI) • [TyloAI](https://tyloai.com) • [Protoethik](https://protoethik.com)
</div>

</div>
