import { TyloLens, consoleExporter, exporterPlugin, protoethikPlugin } from '@protoethik-ai/core';

const lens = new TyloLens({
  app: { name: 'basic-mcp', environment: 'dev' },
  plugins: [protoethikPlugin(), exporterPlugin(consoleExporter())],
  autoFlushOnExport: true,
});

// Explicit trace boundary (recommended in real apps: per request / per agent run)
lens.startTrace();

const client = {
  async request(method, params) {
    await new Promise((r) => setTimeout(r, 30));
    return { ok: true, method, params };
  },
};

const wrapped = lens.wrapMCP(client, { clientName: 'demo-mcp', captureParams: true });
await wrapped.request('tools/list', {});
await wrapped.request('tools/call', { name: 'search', arguments: { q: 'tylo-lens' } });

await lens.exportAndFlush();
