# MCP instrumentation

Tylo-Lens can wrap MCP-like clients using a minimal interface:

```ts
type MCPClientLike = { request(method: string, params?: unknown): Promise<unknown> };
```

## What we capture

- method name (`tools/list`, `tools/call`, etc)
- request latency
- optional params payload (disabled by default in production)

## What we avoid by default

- storing sensitive tool arguments
- storing tool outputs (unless you opt in)

