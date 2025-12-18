function normalizeBaseUrl(url) {
    return url.replace(/\/+$/, '');
}
function messagesToPrompt(messages) {
    return messages.map((m) => `${m.role}: ${m.content}`).join('\n');
}
export function createOpenAICompatibleClient(options) {
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    return {
        async chat(input) {
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
                const json = (await res.json());
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
            return out.raw ?? out;
        },
    };
}
//# sourceMappingURL=index.js.map