import type { TyloLens } from '@protoethik-ai/core';
export type OpenAICompatibleChatMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool' | (string & {});
    content: string;
};
export type OpenAICompatibleClientOptions = {
    lens: TyloLens;
    baseUrl: string;
    apiKey?: string;
    defaultModel: string;
    headers?: Record<string, string>;
};
export type ChatOptions = {
    model?: string;
    messages: OpenAICompatibleChatMessage[];
    temperature?: number;
    maxTokens?: number;
};
type ChatCompletionResponse = {
    id?: string;
    choices?: Array<{
        message?: {
            role?: string;
            content?: string;
        };
    }>;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
    [key: string]: unknown;
};
export declare function createOpenAICompatibleClient(options: OpenAICompatibleClientOptions): {
    chat(input: ChatOptions): Promise<ChatCompletionResponse>;
};
export {};
//# sourceMappingURL=index.d.ts.map