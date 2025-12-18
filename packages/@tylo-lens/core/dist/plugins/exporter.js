export function exporterPlugin(exporter) {
    return {
        name: `exporter:${exporter.name}`,
        setup(ctx) {
            ctx.addExporter(exporter);
        },
    };
}
//# sourceMappingURL=exporter.js.map