import type { LensPlugin } from '../types.js';
export type RealtimeWebhookPluginOptions = {
    url: string;
    headers?: Record<string, string>;
    debounceMs?: number;
    /**
     * When true, also pushes on `trace.end` and `export`.
     * Default: true.
     */
    includeFinal?: boolean;
};
export declare function realtimeWebhookPlugin(options: RealtimeWebhookPluginOptions): LensPlugin;
//# sourceMappingURL=realtime-webhook.d.ts.map