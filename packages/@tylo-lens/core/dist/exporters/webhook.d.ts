import type { LensExporter } from '../types.js';
export type WebhookExporterOptions = {
    url: string;
    headers?: Record<string, string>;
    transform?: (trace: unknown) => unknown;
};
export declare function webhookExporter(options: WebhookExporterOptions): LensExporter;
//# sourceMappingURL=webhook.d.ts.map