import type { LensExporter, LensPlugin } from '../types.js';

export function exporterPlugin(exporter: LensExporter): LensPlugin {
  return {
    name: `exporter:${exporter.name}`,
    setup(ctx) {
      ctx.addExporter(exporter);
    },
  };
}

