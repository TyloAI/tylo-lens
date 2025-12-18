import type { LensExporter, LensTrace } from '../types.js';

export type ConsoleExporterOptions = {
  verbose?: boolean;
};

function summarize(trace: LensTrace) {
  const spans = trace.spans;
  const totalTokens = spans.reduce((sum, s) => sum + (s.usage?.totalTokens ?? 0), 0);
  const totalCost = spans.reduce((sum, s) => sum + (s.cost?.total ?? 0), 0);
  const hasPII = spans.some((s) => s.safety?.pii.hasFindings);
  return { spans: spans.length, totalTokens, totalCost, hasPII };
}

export function consoleExporter(options?: ConsoleExporterOptions): LensExporter {
  const verbose = options?.verbose ?? false;
  return {
    name: 'console',
    export: (trace) => {
      const s = summarize(trace);
      // eslint-disable-next-line no-console
      console.log(
        `[tylo-lens] trace=${trace.traceId} spans=${s.spans} tokens=${s.totalTokens} cost=${s.totalCost.toFixed(6)} pii=${
          s.hasPII ? 'yes' : 'no'
        }`,
      );
      if (verbose) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(trace, null, 2));
      }
    },
  };
}

