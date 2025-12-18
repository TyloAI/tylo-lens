import type { LensSpan, LensTrace } from '../types.js';
import { randomId } from '../utils/id.js';
import { durationMs, nowIso } from '../utils/time.js';

export type FetchInterceptorOptions = {
  trace: LensTrace;
  parentId?: string;
  getParentId?: () => string | undefined;
  onSpanStart?: (span: LensSpan) => void;
  onSpanUpdate?: (span: LensSpan) => void;
  onSpanEnd?: (span: LensSpan) => void;
  captureBody?: boolean;
  redactHeaders?: boolean;
  shouldTrace?: (url: string) => boolean;
  captureSSE?: boolean;
  sse?: {
    maxBytes?: number;
    maxEvents?: number;
  };
};

export function createFetchInterceptor(fetchImpl: typeof fetch, options: FetchInterceptorOptions): typeof fetch {
  const {
    trace,
    parentId,
    getParentId,
    onSpanStart,
    onSpanUpdate,
    onSpanEnd,
    captureBody = false,
    redactHeaders = true,
    shouldTrace,
    captureSSE = false,
    sse,
  } = options;

  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (shouldTrace && !shouldTrace(url)) return fetchImpl(input as any, init);

    const start = Date.now();
    const span: LensSpan = {
      id: randomId('http'),
      traceId: trace.traceId,
      parentId: getParentId ? getParentId() : parentId,
      kind: 'http',
      name: 'http.fetch',
      startTime: nowIso(),
      input: {
        request: {
          url,
          method: init?.method ?? 'GET',
          headers: redactHeaders ? undefined : (init?.headers as any),
          body: captureBody ? (typeof init?.body === 'string' ? init.body : undefined) : undefined,
        },
      },
    };

    trace.spans.push(span);
    onSpanStart?.(span);

    try {
      const res = await fetchImpl(input as any, init);
      span.output = {
        response: {
          status: res.status,
        },
      };

      const contentType = res.headers.get('content-type') ?? '';
      const isSSE = captureSSE && contentType.toLowerCase().includes('text/event-stream');

      if (!isSSE || !res.body || typeof (res.body as any).tee !== 'function') {
        const end = Date.now();
        span.endTime = nowIso();
        span.durationMs = durationMs(start, end);
        onSpanEnd?.(span);
        return res;
      }

      const [tap, passthrough] = res.body.tee();
      const maxBytes = sse?.maxBytes ?? 256_000;
      const maxEvents = sse?.maxEvents ?? 2000;

      void (async () => {
        let buffered = '';
        let eventCount = 0;
        let totalBytes = 0;
        let outputText = '';
        let truncated = false;

        const decoder = new TextDecoder();
        const reader = tap.getReader();

        const flushLine = (line: string, dataLines: string[]) => {
          if (line === '') {
            if (dataLines.length === 0) return { dataLines, dispatched: false };
            const data = dataLines.join('\n');
            dataLines.length = 0;
            return { dataLines, dispatched: true, data };
          }
          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
          }
          return { dataLines, dispatched: false };
        };

        const extractDeltaText = (data: string): string => {
          const trimmed = data.trim();
          if (!trimmed || trimmed === '[DONE]') return '';
          try {
            const json = JSON.parse(trimmed) as any;
            const choice = json?.choices?.[0];
            const oaiDelta = choice?.delta?.content;
            if (typeof oaiDelta === 'string') return oaiDelta;
            const oaiText = choice?.text;
            if (typeof oaiText === 'string') return oaiText;

            const anthropicDelta = json?.delta?.text;
            if (typeof anthropicDelta === 'string') return anthropicDelta;

            const cbDelta = json?.content_block_delta?.delta?.text;
            if (typeof cbDelta === 'string') return cbDelta;
          } catch {
            // Non-JSON SSE payloads: treat as text.
            return trimmed;
          }
          return '';
        };

        const dataLines: string[] = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            buffered += chunk.replace(/\r\n/g, '\n');

            let idx: number;
            while ((idx = buffered.indexOf('\n')) !== -1) {
              const line = buffered.slice(0, idx);
              buffered = buffered.slice(idx + 1);
              const res = flushLine(line, dataLines) as any;
              if (res.dispatched && typeof res.data === 'string') {
                eventCount += 1;
                if (eventCount > maxEvents) {
                  truncated = true;
                  break;
                }

                const delta = extractDeltaText(res.data);
                if (delta) {
                  const nextBytes = totalBytes + delta.length;
                  if (nextBytes <= maxBytes) {
                    totalBytes = nextBytes;
                    outputText += delta;
                    span.output = { ...(span.output ?? {}), text: outputText };
                    onSpanUpdate?.(span);
                  } else {
                    truncated = true;
                  }
                }
              }
            }

            if (truncated) break;
          }
        } catch (err) {
          span.meta = { ...(span.meta ?? {}), sseError: err instanceof Error ? err.message : String(err) };
        } finally {
          const end = Date.now();
          span.endTime = nowIso();
          span.durationMs = durationMs(start, end);
          if (truncated) span.meta = { ...(span.meta ?? {}), sseTruncated: true };
          onSpanEnd?.(span);
          try {
            reader.releaseLock();
          } catch {
            // ignore
          }
        }
      })();

      return new Response(passthrough, {
        status: res.status,
        statusText: res.statusText,
        headers: new Headers(res.headers),
      });
    } catch (err) {
      const end = Date.now();
      span.endTime = nowIso();
      span.durationMs = durationMs(start, end);
      span.meta = { error: err instanceof Error ? err.message : String(err) };
      onSpanEnd?.(span);
      throw err;
    }
  }) as typeof fetch;
}
