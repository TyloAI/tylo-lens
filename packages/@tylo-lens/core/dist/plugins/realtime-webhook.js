export function realtimeWebhookPlugin(options) {
    const debounceMs = options.debounceMs ?? 250;
    const includeFinal = options.includeFinal ?? true;
    return {
        name: 'realtime:webhook',
        setup(ctx) {
            let timer = null;
            let inflight = false;
            let pending = false;
            const post = async () => {
                if (inflight) {
                    pending = true;
                    return;
                }
                inflight = true;
                pending = false;
                try {
                    const trace = ctx.getTrace();
                    await fetch(options.url, {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                            ...(options.headers ?? {}),
                        },
                        body: JSON.stringify(trace),
                    });
                }
                catch (err) {
                    // Best-effort: never crash the host app.
                    // eslint-disable-next-line no-console
                    console.warn('[tylo-lens] realtimeWebhookPlugin failed:', err);
                }
                finally {
                    inflight = false;
                    if (pending)
                        schedule();
                }
            };
            const schedule = () => {
                if (timer)
                    return;
                timer = setTimeout(async () => {
                    timer = null;
                    await post();
                }, debounceMs);
            };
            const offUpdate = ctx.on('span.update', schedule);
            const offEnd = ctx.on('span.end', schedule);
            const offTraceEnd = includeFinal ? ctx.on('trace.end', schedule) : () => { };
            const offExport = includeFinal ? ctx.on('export', schedule) : () => { };
            return () => {
                offUpdate();
                offEnd();
                offTraceEnd();
                offExport();
                if (timer)
                    clearTimeout(timer);
                timer = null;
            };
        },
    };
}
//# sourceMappingURL=realtime-webhook.js.map