import type { TyloLens } from '@tylo-lens/core';

export type OpenAICompatibleChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool' | (string & {});
  content: string;
};

export type OpenAICompatibleClientOptions = {
  lens: TyloLens;
  baseUrl: string; // e.g. https://api.openai.com (or any compatible gateway)
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
  choices?: Array<{ message?: { role?: string; content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  [key: string]: unknown;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function messagesToPrompt(messages: OpenAICompatibleChatMessage[]): string {
  return messages.map((m) => `${m.role}: ${m.content}`).join('\n');
}

export function createOpenAICompatibleClient(options: OpenAICompatibleClientOptions) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  return {
    async chat(input: ChatOptions): Promise<ChatCompletionResponse> {
      const model = input.model ?? options.defaultModel;
      const prompt = messagesToPrompt(input.messages);

      const run = options.lens.wrapLLM(`openai-compatible:${model}`, async () => {
        const res = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
            ...(options.headers ?? {}),
          },
          body: JSON.stringify({
            model,
            messages: input.messages,
            temperature: input.temperature,
            max_tokens: input.maxTokens,
          }),
        });

        const json = (await res.json()) as ChatCompletionResponse;
        const outputText = json.choices?.[0]?.message?.content ?? '';
        const usage = json.usage
          ? {
              inputTokens: json.usage.prompt_tokens ?? 0,
              outputTokens: json.usage.completion_tokens ?? 0,
              totalTokens: json.usage.total_tokens ?? 0,
            }
          : undefined;

        return { outputText, usage, raw: json };
      });

      // One-line-ish integration: pass prompt+messages; lens handles redaction/PII signals if enabled.
      const out = await run({ prompt, messages: input.messages });
      return (out as any).raw ?? (out as any);
    },
  };
}

