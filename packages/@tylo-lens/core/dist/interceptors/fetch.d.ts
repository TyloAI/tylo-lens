import type { LensSpan, LensTrace } from '../types.js';
export type FetchInterceptorOptions = {
    trace: LensTrace;
    parentId?: string;
    getParentId?: () => string | undefined;
    onSpanStart?: (span: LensSpan) => void;
    onSpanUpdate?: (span: LensSpan) => void;
    onSpanEnd?: (span: LensSpan) => void;
    captureBody?: boolean;
    redactHeaders?: boolean;
    shouldTrace?: (url: string) => boolean;
    captureSSE?: boolean;
    sse?: {
        maxBytes?: number;
        maxEvents?: number;
    };
};
export declare function createFetchInterceptor(fetchImpl: typeof fetch, options: FetchInterceptorOptions): typeof fetch;
//# sourceMappingURL=fetch.d.ts.map