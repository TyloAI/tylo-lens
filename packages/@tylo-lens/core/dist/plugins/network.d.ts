import type { LensPlugin } from '../types.js';
export type NetworkInstrumentationOptions = {
    fetch?: boolean;
    xhr?: boolean;
    captureRequestBody?: boolean;
    captureResponseBody?: boolean;
    captureSSE?: boolean;
    sse?: {
        maxBytes?: number;
        maxEvents?: number;
    };
    redactHeaders?: boolean;
    shouldTraceUrl?: (url: string) => boolean;
};
export declare function networkInstrumentationPlugin(options?: NetworkInstrumentationOptions): LensPlugin;
//# sourceMappingURL=network.d.ts.map