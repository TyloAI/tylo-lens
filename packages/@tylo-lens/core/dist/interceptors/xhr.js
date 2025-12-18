import { randomId } from '../utils/id.js';
import { durationMs, nowIso } from '../utils/time.js';
const XHR_META = Symbol.for('tylo_lens_xhr_meta');
export function installXHRInterceptor(options) {
    if (typeof XMLHttpRequest === 'undefined') {
        throw new Error('XMLHttpRequest is not available in this environment.');
    }
    const { trace, captureBody = false, captureResponse = false, redactHeaders = true, shouldTrace, onSpanStart, onSpanEnd, } = options;
    const proto = XMLHttpRequest.prototype;
    const originalOpen = proto.open;
    const originalSend = proto.send;
    const originalSetRequestHeader = proto.setRequestHeader;
    proto.open = function (method, url, ...rest) {
        const meta = { method, url, headers: {} };
        this[XHR_META] = meta;
        return originalOpen.call(this, method, url, ...rest);
    };
    proto.setRequestHeader = function (name, value) {
        const meta = this[XHR_META];
        if (meta)
            meta.headers[name] = value;
        return originalSetRequestHeader.call(this, name, value);
    };
    proto.send = function (body) {
        const meta = this[XHR_META];
        const url = meta?.url ?? '(unknown)';
        if (shouldTrace && !shouldTrace(url))
            return originalSend.call(this, body);
        const start = Date.now();
        const span = {
            id: randomId('http'),
            traceId: trace.traceId,
            parentId: options.getParentId ? options.getParentId() : options.parentId,
            kind: 'http',
            name: 'http.xhr',
            startTime: nowIso(),
            input: {
                request: {
                    url,
                    method: meta?.method ?? 'GET',
                    headers: redactHeaders ? undefined : meta?.headers,
                    body: captureBody && typeof body === 'string' ? body : undefined,
                },
            },
        };
        trace.spans.push(span);
        onSpanStart?.(span);
        const onDone = () => {
            const end = Date.now();
            span.endTime = nowIso();
            span.durationMs = durationMs(start, end);
            span.output = {
                response: {
                    status: this.status,
                    body: captureResponse ? String(this.responseText ?? '') : undefined,
                },
            };
            onSpanEnd?.(span);
            cleanup();
        };
        const onError = () => {
            const end = Date.now();
            span.endTime = nowIso();
            span.durationMs = durationMs(start, end);
            span.meta = { ...(span.meta ?? {}), error: 'XMLHttpRequest error' };
            onSpanEnd?.(span);
            cleanup();
        };
        const cleanup = () => {
            this.removeEventListener('loadend', onDone);
            this.removeEventListener('error', onError);
            this.removeEventListener('abort', onError);
        };
        this.addEventListener('loadend', onDone);
        this.addEventListener('error', onError);
        this.addEventListener('abort', onError);
        return originalSend.call(this, body);
    };
    return function uninstall() {
        proto.open = originalOpen;
        proto.send = originalSend;
        proto.setRequestHeader = originalSetRequestHeader;
    };
}
//# sourceMappingURL=xhr.js.map