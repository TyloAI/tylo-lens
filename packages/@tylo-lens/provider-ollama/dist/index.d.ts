import type { TyloLens } from '@protoethik-ai/core';
export type OllamaMessage = {
    role: 'system' | 'user' | 'assistant' | (string & {});
    content: string;
};
export type OllamaClientOptions = {
    lens: TyloLens;
    baseUrl?: string;
    defaultModel: string;
    headers?: Record<string, string>;
};
export type OllamaChatOptions = {
    model?: string;
    messages: OllamaMessage[];
};
type OllamaChatResponse = {
    message?: {
        role?: string;
        content?: string;
    };
    prompt_eval_count?: number;
    eval_count?: number;
    [key: string]: unknown;
};
export declare function createOllamaClient(options: OllamaClientOptions): {
    chat(input: OllamaChatOptions): Promise<OllamaChatResponse>;
};
export {};
//# sourceMappingURL=index.d.ts.map