import type { LensSpan, LensTrace } from '../types.js';
import { randomId } from '../utils/id.js';
import { durationMs, nowIso } from '../utils/time.js';

export type MCPClientLike = {
  request: (method: string, params?: unknown) => Promise<unknown>;
};

export type MCPInterceptorOptions = {
  trace: LensTrace;
  parentId?: string;
  getParentId?: () => string | undefined;
  onSpanStart?: (span: LensSpan) => void;
  onSpanEnd?: (span: LensSpan) => void;
  clientName?: string;
  captureParams?: boolean;
};

export function wrapMCPClient<T extends MCPClientLike>(client: T, options: MCPInterceptorOptions): T {
  const {
    trace,
    parentId,
    getParentId,
    onSpanStart,
    onSpanEnd,
    clientName = 'mcp',
    captureParams = false,
  } = options;

  const wrapped: T = {
    ...client,
    request: async (method: string, params?: unknown) => {
      const start = Date.now();
      const span: LensSpan = {
        id: randomId('mcp'),
        traceId: trace.traceId,
        parentId: getParentId ? getParentId() : parentId,
        kind: 'mcp',
        name: `${clientName}.request`,
        startTime: nowIso(),
        meta: { method },
        input: captureParams ? { messages: params } : undefined,
      };
      trace.spans.push(span);
      onSpanStart?.(span);
      try {
        const result = await client.request(method, params);
        const end = Date.now();
        span.endTime = nowIso();
        span.durationMs = durationMs(start, end);
        onSpanEnd?.(span);
        return result;
      } catch (err) {
        const end = Date.now();
        span.endTime = nowIso();
        span.durationMs = durationMs(start, end);
        span.meta = { ...span.meta, error: err instanceof Error ? err.message : String(err) };
        onSpanEnd?.(span);
        throw err;
      }
    },
  };
  return wrapped;
}
