import type { LensSpan, LensTrace } from '../types.js';
export type MCPClientLike = {
    request: (method: string, params?: unknown) => Promise<unknown>;
};
export type MCPInterceptorOptions = {
    trace: LensTrace;
    parentId?: string;
    getParentId?: () => string | undefined;
    onSpanStart?: (span: LensSpan) => void;
    onSpanEnd?: (span: LensSpan) => void;
    clientName?: string;
    captureParams?: boolean;
};
export declare function wrapMCPClient<T extends MCPClientLike>(client: T, options: MCPInterceptorOptions): T;
//# sourceMappingURL=mcp.d.ts.map