import type { LensExporter } from '../types.js';

export type WebhookExporterOptions = {
  url: string;
  headers?: Record<string, string>;
  transform?: (trace: unknown) => unknown;
};

export function webhookExporter(options: WebhookExporterOptions): LensExporter {
  return {
    name: 'webhook',
    export: async (trace) => {
      const payload = options.transform ? options.transform(trace) : trace;
      const res = await fetch(options.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(options.headers ?? {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Webhook export failed: ${res.status} ${res.statusText}`);
      }
    },
  };
}

