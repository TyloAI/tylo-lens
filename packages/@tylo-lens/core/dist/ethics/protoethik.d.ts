import type { LensTrace, ProtoethikTransparency, ProtoethikWeights } from '../types.js';
export declare function computeClarityScore(text: string): number;
export declare function computeProtoethikTransparency(trace: LensTrace, options?: {
    weights?: Partial<ProtoethikWeights>;
}): ProtoethikTransparency;
export declare function annotateProtoethikAnalysis(trace: LensTrace, options?: {
    weights?: Partial<ProtoethikWeights>;
}): LensTrace;
//# sourceMappingURL=protoethik.d.ts.map