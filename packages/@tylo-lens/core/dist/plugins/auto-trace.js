export function autoTracePlugin(options) {
    const idleMs = options?.idleMs ?? 1500;
    const flushOnExport = options?.flushOnExport ?? false;
    return {
        name: 'auto-trace',
        setup(ctx) {
            let timer = null;
            const schedule = () => {
                if (timer)
                    clearTimeout(timer);
                timer = setTimeout(() => {
                    try {
                        if (flushOnExport)
                            void ctx.exportAndFlush();
                        else
                            ctx.exportTrace();
                    }
                    catch {
                        // ignore
                    }
                }, idleMs);
            };
            const unsubEnd = ctx.on('span.end', () => schedule());
            const unsubStart = ctx.on('trace.start', () => {
                if (timer)
                    clearTimeout(timer);
                timer = null;
            });
            return () => {
                unsubEnd();
                unsubStart();
                if (timer)
                    clearTimeout(timer);
                timer = null;
            };
        },
    };
}
//# sourceMappingURL=auto-trace.js.map