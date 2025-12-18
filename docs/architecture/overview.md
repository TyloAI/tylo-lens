# Architecture overview

Tylo-Lens follows a **thin SDK + dashboard** approach:

- `@tylo-lens/core` collects telemetry (traces/spans, tokens, cost, latency).
- `@tylo-lens/dashboard` visualizes and stores telemetry.
- `@tylo-lens/ui` provides shared UI primitives for trace exploration.

## Why MCP matters

In agentic systems, calls are no longer a single “model completion”.
Agents call tools, tools call models, models call tools again.

The Model Context Protocol (MCP) pushes the ecosystem toward standard interfaces.
Tylo-Lens is designed to intercept and analyze these call chains.

