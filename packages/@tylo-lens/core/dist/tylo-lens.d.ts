import type { LensEventHandler, LensEventType, LensExporter, LensPlugin, LensSpanHandle, LensSpanStart, LensTrace, TyloLensOptions, WrapLLMResult } from './types.js';
import type { FetchInterceptorOptions } from './interceptors/fetch.js';
import type { MCPClientLike, MCPInterceptorOptions } from './interceptors/mcp.js';
import type { XHRInterceptorOptions } from './interceptors/xhr.js';
type WrapLLMInput = {
    prompt?: string;
    messages?: unknown;
    [key: string]: unknown;
};
type WrapLLMOptions = {
    name?: string;
    capture?: Partial<{
        prompts: boolean;
        outputs: boolean;
    }>;
    meta?: Record<string, unknown>;
};
export declare class TyloLens {
    private readonly app;
    private readonly ethics;
    private readonly pricing?;
    private tokenEstimator;
    private readonly autoStartTrace;
    private readonly autoFlushOnExport;
    private trace;
    private readonly spanStack;
    private readonly listeners;
    private readonly exporters;
    private readonly pluginDisposers;
    constructor(options: TyloLensOptions);
    setTokenEstimator(estimator: (text: string) => number): void;
    startTrace(): LensTrace;
    private getActiveTrace;
    getTrace(): LensTrace;
    endTrace(): LensTrace;
    exportTrace(): LensTrace;
    exportAndFlush(): Promise<LensTrace>;
    flush(trace?: LensTrace): Promise<void>;
    addExporter(exporter: LensExporter): void;
    use(plugin: LensPlugin): void;
    dispose(): void;
    on<T extends LensEventType>(type: T, handler: LensEventHandler<T>): () => void;
    private emit;
    startSpan(start: LensSpanStart): LensSpanHandle;
    withSpan<T>(start: LensSpanStart, fn: () => Promise<T> | T): Promise<T>;
    wrapFetch(fetchImpl: typeof fetch, options?: Omit<FetchInterceptorOptions, 'trace' | 'getParentId' | 'parentId'>): typeof fetch;
    wrapMCP<T extends MCPClientLike>(client: T, options?: Omit<MCPInterceptorOptions, 'trace' | 'getParentId' | 'parentId'>): T;
    installXHR(options?: Omit<XHRInterceptorOptions, 'trace' | 'getParentId' | 'parentId'>): () => void;
    wrapLLM<TInput extends WrapLLMInput, TResult extends WrapLLMResult>(model: string, fn: (input: TInput) => Promise<TResult> | TResult, options?: WrapLLMOptions): (input: TInput) => Promise<TResult>;
}
export {};
//# sourceMappingURL=tylo-lens.d.ts.map