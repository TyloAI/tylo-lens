import type { LensSpan, LensTrace } from '../types.js';
export type XHRInterceptorOptions = {
    trace: LensTrace;
    parentId?: string;
    getParentId?: () => string | undefined;
    onSpanStart?: (span: LensSpan) => void;
    onSpanEnd?: (span: LensSpan) => void;
    captureBody?: boolean;
    captureResponse?: boolean;
    redactHeaders?: boolean;
    shouldTrace?: (url: string) => boolean;
};
export declare function installXHRInterceptor(options: XHRInterceptorOptions): () => void;
//# sourceMappingURL=xhr.d.ts.map