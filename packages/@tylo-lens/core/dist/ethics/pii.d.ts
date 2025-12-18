import type { LensPiiEvidence, LensPiiEvidenceField, LensPiiFinding, LensRedactionMode } from '../types.js';
export declare function scanForPII(text: string): LensPiiFinding[];
export declare function collectPIIEvidence(text: string, field: LensPiiEvidenceField, options?: {
    mode?: LensRedactionMode;
    includeRawMatch?: boolean;
    contextChars?: number;
    maxItems?: number;
}): LensPiiEvidence[];
export declare function redactPII(text: string, mode?: LensRedactionMode): string;
export declare function riskFromFindings(findings: LensPiiFinding[]): 'low' | 'medium' | 'high';
//# sourceMappingURL=pii.d.ts.map