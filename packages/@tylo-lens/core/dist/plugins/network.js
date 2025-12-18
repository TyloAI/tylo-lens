function extractUrl(input) {
    if (typeof input === 'string')
        return input;
    if (input instanceof URL)
        return input.toString();
    return input.url;
}
export function networkInstrumentationPlugin(options) {
    const enabledFetch = options?.fetch ?? true;
    const enabledXhr = options?.xhr ?? false;
    return {
        name: 'instrumentation:network',
        setup(ctx) {
            const disposers = [];
            if (enabledFetch && typeof globalThis.fetch === 'function') {
                const originalFetch = globalThis.fetch.bind(globalThis);
                const captureRequestBody = options?.captureRequestBody ?? false;
                const captureResponseBody = options?.captureResponseBody ?? false;
                const captureSSE = options?.captureSSE ?? false;
                const sse = options?.sse;
                const redactHeaders = options?.redactHeaders ?? true;
                const shouldTraceUrl = options?.shouldTraceUrl;
                globalThis.fetch = (async (input, init) => {
                    const url = extractUrl(input);
                    if (shouldTraceUrl && !shouldTraceUrl(url))
                        return originalFetch(input, init);
                    const handle = ctx.startSpan({
                        kind: 'http',
                        name: 'http.fetch',
                        input: {
                            request: {
                                url,
                                method: init?.method ?? 'GET',
                                headers: redactHeaders ? undefined : init?.headers,
                                body: captureRequestBody ? (typeof init?.body === 'string' ? init.body : undefined) : undefined,
                            },
                        },
                    });
                    try {
                        const res = await originalFetch(input, init);
                        handle.update({ output: { response: { status: res.status } } });
                        const contentType = res.headers.get('content-type') ?? '';
                        const isSSE = captureSSE && contentType.toLowerCase().includes('text/event-stream');
                        if (isSSE && res.body && typeof res.body.tee === 'function') {
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
                                const dataLines = [];
                                const maybeDispatch = (line) => {
                                    if (line === '') {
                                        if (dataLines.length === 0)
                                            return;
                                        const data = dataLines.join('\n');
                                        dataLines.length = 0;
                                        eventCount += 1;
                                        if (eventCount > maxEvents) {
                                            truncated = true;
                                            return;
                                        }
                                        const trimmed = data.trim();
                                        if (!trimmed || trimmed === '[DONE]')
                                            return;
                                        let delta = '';
                                        try {
                                            const json = JSON.parse(trimmed);
                                            const choice = json?.choices?.[0];
                                            delta =
                                                (typeof choice?.delta?.content === 'string' && choice.delta.content) ||
                                                    (typeof choice?.text === 'string' && choice.text) ||
                                                    (typeof json?.delta?.text === 'string' && json.delta.text) ||
                                                    (typeof json?.content_block_delta?.delta?.text === 'string' && json.content_block_delta.delta.text) ||
                                                    '';
                                        }
                                        catch {
                                            delta = trimmed;
                                        }
                                        if (!delta)
                                            return;
                                        const nextBytes = totalBytes + delta.length;
                                        if (nextBytes > maxBytes) {
                                            truncated = true;
                                            return;
                                        }
                                        totalBytes = nextBytes;
                                        outputText += delta;
                                        handle.update({ output: { text: outputText } });
                                    }
                                    else if (line.startsWith('data:')) {
                                        dataLines.push(line.slice(5).trimStart());
                                    }
                                };
                                try {
                                    while (true) {
                                        const { done, value } = await reader.read();
                                        if (done)
                                            break;
                                        buffered += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
                                        let idx;
                                        while ((idx = buffered.indexOf('\n')) !== -1) {
                                            const line = buffered.slice(0, idx);
                                            buffered = buffered.slice(idx + 1);
                                            maybeDispatch(line);
                                            if (truncated)
                                                break;
                                        }
                                        if (truncated)
                                            break;
                                    }
                                }
                                catch (err) {
                                    handle.update({ meta: { sseError: err instanceof Error ? err.message : String(err) } });
                                }
                                finally {
                                    if (truncated)
                                        handle.update({ meta: { sseTruncated: true } });
                                    handle.end();
                                    try {
                                        reader.releaseLock();
                                    }
                                    catch {
                                        // ignore
                                    }
                                }
                            })();
                            return new Response(passthrough, {
                                status: res.status,
                                statusText: res.statusText,
                                headers: new Headers(res.headers),
                            });
                        }
                        let body;
                        if (captureResponseBody) {
                            try {
                                body = await res.clone().text();
                            }
                            catch {
                                // ignore body capture failures
                            }
                        }
                        handle.end({ output: { response: { status: res.status, body } } });
                        return res;
                    }
                    catch (err) {
                        handle.end({ error: err });
                        throw err;
                    }
                });
                disposers.push(() => {
                    globalThis.fetch = originalFetch;
                });
            }
            if (enabledXhr && typeof XMLHttpRequest !== 'undefined') {
                const captureRequestBody = options?.captureRequestBody ?? false;
                const captureResponseBody = options?.captureResponseBody ?? false;
                const redactHeaders = options?.redactHeaders ?? true;
                const shouldTraceUrl = options?.shouldTraceUrl;
                const proto = XMLHttpRequest.prototype;
                const originalOpen = proto.open;
                const originalSend = proto.send;
                const originalSetRequestHeader = proto.setRequestHeader;
                const META = Symbol.for('tylo_lens_xhr_meta_v2');
                proto.open = function (method, url, ...rest) {
                    this[META] = { method, url, headers: {} };
                    return originalOpen.call(this, method, url, ...rest);
                };
                proto.setRequestHeader = function (name, value) {
                    const meta = this[META];
                    if (meta)
                        meta.headers[name] = value;
                    return originalSetRequestHeader.call(this, name, value);
                };
                proto.send = function (body) {
                    const meta = this[META];
                    const url = meta?.url ?? '(unknown)';
                    if (shouldTraceUrl && !shouldTraceUrl(url))
                        return originalSend.call(this, body);
                    const handle = ctx.startSpan({
                        kind: 'http',
                        name: 'http.xhr',
                        input: {
                            request: {
                                url,
                                method: meta?.method ?? 'GET',
                                headers: redactHeaders ? undefined : meta?.headers,
                                body: captureRequestBody && typeof body === 'string' ? body : undefined,
                            },
                        },
                    });
                    const onDone = () => {
                        const outputBody = captureResponseBody ? String(this.responseText ?? '') : undefined;
                        handle.end({ output: { response: { status: this.status, body: outputBody } } });
                        cleanup();
                    };
                    const onError = () => {
                        handle.end({ error: new Error('XMLHttpRequest error') });
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
                disposers.push(() => {
                    proto.open = originalOpen;
                    proto.send = originalSend;
                    proto.setRequestHeader = originalSetRequestHeader;
                });
            }
            return () => {
                for (const d of disposers.splice(0))
                    d();
            };
        },
    };
}
//# sourceMappingURL=network.js.map