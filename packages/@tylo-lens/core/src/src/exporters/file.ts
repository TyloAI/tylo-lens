import type { LensExporter } from '../types.js';

export type FileExporterOptions = {
  path: string;
  pretty?: boolean;
};

export function fileExporter(options: FileExporterOptions): LensExporter {
  return {
    name: 'file',
    export: async (trace) => {
      const fs = await import('node:fs/promises');
      const data = options.pretty ? JSON.stringify(trace, null, 2) : JSON.stringify(trace);
      await fs.writeFile(options.path, data, 'utf8');
    },
  };
}

