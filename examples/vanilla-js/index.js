import { TyloLens, consoleExporter, exporterPlugin, protoethikPlugin } from '@tylo-lens/core';

const lens = new TyloLens({
  app: { name: 'vanilla-js', environment: 'dev' },
  pricing: {
    'demo:model': { pricePer1KInput: 0.1, pricePer1KOutput: 0.2 },
  },
  plugins: [protoethikPlugin(), exporterPlugin(consoleExporter())],
  autoFlushOnExport: true,
});

const callModel = lens.wrapLLM('demo:model', async ({ prompt }) => {
  // Replace this with your real LLM client call.
  return { outputText: `Echo: ${prompt}`, usage: { inputTokens: 12, outputTokens: 7 } };
});

await callModel({ prompt: 'Hello Tylo-Lens' });

await lens.exportAndFlush();
