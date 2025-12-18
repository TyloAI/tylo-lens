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
export declare function autoTracePlugin(options?: AutoTracePluginOptions): LensPlugin;
//# sourceMappingURL=auto-trace.d.ts.map