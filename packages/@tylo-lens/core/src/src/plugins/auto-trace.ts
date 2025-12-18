import type { LensPlugin } from '../types.js';

export type AutoTracePluginOptions = {
  /**
   * End + export the trace after no spans end for this amount of time.
   */
  idleMs?: number;
  /**
   * If true, calls `exportAndFlush()` (awaited best-effort).
   * If false, calls `exportTrace()` only.
   */
  flushOnExport?: boolean;
};

export function autoTracePlugin(options?: AutoTracePluginOptions): LensPlugin {
  const idleMs = options?.idleMs ?? 1500;
  const flushOnExport = options?.flushOnExport ?? false;

  return {
    name: 'auto-trace',
    setup(ctx) {
      let timer: ReturnType<typeof setTimeout> | null = null;

      const schedule = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            if (flushOnExport) void ctx.exportAndFlush();
            else ctx.exportTrace();
          } catch {
            // ignore
          }
        }, idleMs);
      };

      const unsubEnd = ctx.on('span.end', () => schedule());
      const unsubStart = ctx.on('trace.start', () => {
        if (timer) clearTimeout(timer);
        timer = null;
      });

      return () => {
        unsubEnd();
        unsubStart();
        if (timer) clearTimeout(timer);
        timer = null;
      };
    },
  };
}

