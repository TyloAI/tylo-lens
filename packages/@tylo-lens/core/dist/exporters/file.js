export function fileExporter(options) {
    return {
        name: 'file',
        export: async (trace) => {
            const fs = await import('node:fs/promises');
            const data = options.pretty ? JSON.stringify(trace, null, 2) : JSON.stringify(trace);
            await fs.writeFile(options.path, data, 'utf8');
        },
    };
}
//# sourceMappingURL=file.js.map