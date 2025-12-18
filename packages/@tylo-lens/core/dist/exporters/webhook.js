export function webhookExporter(options) {
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
//# sourceMappingURL=webhook.js.map