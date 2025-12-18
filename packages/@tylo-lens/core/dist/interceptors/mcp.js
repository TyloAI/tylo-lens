import { randomId } from '../utils/id.js';
import { durationMs, nowIso } from '../utils/time.js';
export function wrapMCPClient(client, options) {
    const { trace, parentId, getParentId, onSpanStart, onSpanEnd, clientName = 'mcp', captureParams = false, } = options;
    const wrapped = {
        ...client,
        request: async (method, params) => {
            const start = Date.now();
            const span = {
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
            }
            catch (err) {
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
//# sourceMappingURL=mcp.js.map