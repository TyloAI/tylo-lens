import type { LensPlugin, ProtoethikWeights } from '../types.js';
import { annotateProtoethikAnalysis } from '../ethics/protoethik.js';

export type ProtoethikPluginOptions = {
  weights?: Partial<ProtoethikWeights>;
};

export function protoethikPlugin(options?: ProtoethikPluginOptions): LensPlugin {
  return {
    name: 'protoethik',
    setup(ctx) {
      const weights = options?.weights;
      const unsub = ctx.on('export', ({ trace }) => {
        annotateProtoethikAnalysis(trace, { weights });
      });
      return () => unsub();
    },
  };
}

