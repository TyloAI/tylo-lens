import type { LensSpan, LensTrace } from '../types.js';
import { randomId } from '../utils/id.js';
import { durationMs, nowIso } from '../utils/time.js';

export type XHRInterceptorOptions = {
  trace: LensTrace;
  parentId?: string;
  getParentId?: () => string | undefined;
  onSpanStart?: (span: LensSpan) => void;
  onSpanEnd?: (span: LensSpan) => void;
  captureBody?: boolean;
  captureResponse?: boolean;
  redactHeaders?: boolean;
  shouldTrace?: (url: string) => boolean;
};

const XHR_META = Symbol.for('tylo_lens_xhr_meta');

type XhrMeta = {
  method?: string;
  url?: string;
  headers: Record<string, string>;
};

export function installXHRInterceptor(options: XHRInterceptorOptions) {
  if (typeof XMLHttpRequest === 'undefined') {
    throw new Error('XMLHttpRequest is not available in this environment.');
  }

  const {
    trace,
    captureBody = false,
    captureResponse = false,
    redactHeaders = true,
    shouldTrace,
    onSpanStart,
    onSpanEnd,
  } = options;

  const proto = XMLHttpRequest.prototype as any;
  const originalOpen = proto.open;
  const originalSend = proto.send;
  const originalSetRequestHeader = proto.setRequestHeader;

  proto.open = function (method: string, url: string, ...rest: any[]) {
    const meta: XhrMeta = { method, url, headers: {} };
    this[XHR_META] = meta;
    return originalOpen.call(this, method, url, ...rest);
  };

  proto.setRequestHeader = function (name: string, value: string) {
    const meta: XhrMeta | undefined = this[XHR_META];
    if (meta) meta.headers[name] = value;
    return originalSetRequestHeader.call(this, name, value);
  };

  proto.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const meta: XhrMeta | undefined = this[XHR_META];
    const url = meta?.url ?? '(unknown)';
    if (shouldTrace && !shouldTrace(url)) return originalSend.call(this, body);

    const start = Date.now();
    const span: LensSpan = {
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
