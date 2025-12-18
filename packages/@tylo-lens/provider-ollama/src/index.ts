import type { TyloLens } from '@protoethik-ai/core';

export type OllamaMessage = {
  role: 'system' | 'user' | 'assistant' | (string & {});
  content: string;
};

export type OllamaClientOptions = {
  lens: TyloLens;
  baseUrl?: string; // default: http://localhost:11434
  defaultModel: string;
  headers?: Record<string, string>;
};

export type OllamaChatOptions = {
  model?: string;
  messages: OllamaMessage[];
};

type OllamaChatResponse = {
  message?: { role?: string; content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
  [key: string]: unknown;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function messagesToPrompt(messages: OllamaMessage[]): string {
  return messages.map((m) => `${m.role}: ${m.content}`).join('\n');
}

export function createOllamaClient(options: OllamaClientOptions) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? 'http://localhost:11434');

  return {
    async chat(input: OllamaChatOptions): Promise<OllamaChatResponse> {
      const model = input.model ?? options.defaultModel;
      const prompt = messagesToPrompt(input.messages);

      const run = options.lens.wrapLLM(`ollama:${model}`, async () => {
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(options.headers ?? {}),
          },
          body: JSON.stringify({
            model,
            messages: input.messages,
            stream: false,
          }),
        });

        const json = (await res.json()) as OllamaChatResponse;
        const outputText = json.message?.content ?? '';
        const usage = {
          inputTokens: json.prompt_eval_count ?? 0,
          outputTokens: json.eval_count ?? 0,
          totalTokens: (json.prompt_eval_count ?? 0) + (json.eval_count ?? 0),
        };

        return { outputText, usage, raw: json };
      });

      const out = await run({ prompt, messages: input.messages });
      return (out as any).raw ?? (out as any);
    },
  };
}

