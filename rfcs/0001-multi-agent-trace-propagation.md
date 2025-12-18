# RFC 0001: Standardizing Multi-Agent Trace Propagation

Status: **draft**

## Summary

This RFC proposes a standard way to propagate **trace context** across:

- agent ↔ agent boundaries (multi-agent orchestration)
- tool calls and MCP requests
- HTTP calls between services

The goal is to make traces **composable** across distributed systems while keeping Tylo-Lens vendor-agnostic and privacy-safe.

## Motivation

Agentic systems are inherently distributed:

- one “agent run” may call multiple tools
- tools may call remote MCP servers
- MCP servers may call models
- models may call tools again (recursive)

Without a standard propagation mechanism, traces fragment into disconnected local graphs, and transparency becomes a UI illusion.

## Goals

- Standardize how a caller passes `(traceId, parentSpanId)` to the callee.
- Work for HTTP, MCP, and “in-process” tool calls.
- Align with existing tracing standards where possible.
- Keep propagation payloads small, stable, and safe (no user content).

## Non-goals

- Defining a full OpenTelemetry exporter format (may be a future RFC).
- Defining a security/authentication protocol for trace context.
- Guaranteeing global uniqueness across all systems (best-effort).

## Detailed design

### Data model

Tylo-Lens already models:

- `LensTrace.traceId`
- `LensSpan.id` (span id)
- `LensSpan.parentId`

This RFC defines a portable “trace context” object:

```ts
export type TyloTraceContext = {
  traceId: string;
  parentSpanId: string;
  // optional, for cross-system debugging
  source?: string; // e.g. "agent-a", "mcp-server-1"
};
```

### Transport format

#### HTTP

We recommend supporting **W3C Trace Context**:

- `traceparent` (primary)
- `tracestate` (optional)

Tylo-Lens-specific fallback headers (when W3C is not feasible):

- `x-tylo-trace-id`
- `x-tylo-parent-span-id`

Rules:

- If `traceparent` exists, it is the source of truth.
- Otherwise, use `x-tylo-*` headers.

#### MCP

MCP methods typically accept a `params` object. This RFC proposes a reserved field:

```json
{
  "tylo": {
    "trace": {
      "traceId": "trace_...",
      "parentSpanId": "llm_..."
    }
  }
}
```

Rules:

- The `tylo.trace` field must be optional.
- MCP servers/tools should treat unknown `tylo.*` fields as opaque and safe to ignore.
- The field must never contain prompts, outputs, or secrets.

### Propagation semantics

When **Caller** invokes **Callee**:

1. Caller creates a span `S_call` representing the outbound action.
2. Caller propagates `{ traceId: currentTraceId, parentSpanId: S_call.id }` to Callee.
3. Callee starts a new span `S_child` with:
   - `traceId = propagated.traceId`
   - `parentId = propagated.parentSpanId`

This creates a single distributed DAG even when spans are produced by multiple processes.

### Sampling and privacy

- Trace context contains only opaque identifiers.
- Do not encode user identifiers, prompts, outputs, or PII in `traceId` or `spanId`.
- If an org requires stricter privacy, they may rotate IDs per request or add server-side access control.

### Backwards compatibility

- Systems not using this RFC will continue to work (local traces remain valid).
- Propagation is purely additive: callers can start adopting it without waiting for every tool/server.

## Example

**Agent A** calls MCP tool `search` on a remote MCP server:

1. Agent A starts a span: `kind="mcp" name="mcp.request"`
2. Agent A sends:

```json
{
  "name": "search",
  "arguments": { "q": "tylo-lens" },
  "tylo": { "trace": { "traceId": "trace_123", "parentSpanId": "mcp_abc" } }
}
```

3. The MCP server starts its span with `parentId="mcp_abc"` and exports to the same collector.

## Drawbacks

- Introduces a reserved namespace (`tylo.*`) in MCP payloads.
- Requires adapters/middleware for some clients and servers.

## Alternatives

- Always rely on W3C Trace Context even for MCP (less ergonomic for JSON-RPC payloads).
- Use OpenTelemetry semantic conventions directly (heavier for early-stage OSS).

## Rollout plan

1. Ship utilities to encode/decode W3C `traceparent`.
2. Update built-in interceptors/plugins to propagate context when possible.
3. Provide documentation and examples for MCP servers and providers.

## Open questions

- Should Tylo-Lens define an official `traceId` format compatible with W3C trace-id constraints?
- Should we add a `span.kind = "agent"` for first-class agent runs?
- How should we handle fan-out/fan-in patterns across agents (multiple parents)?

