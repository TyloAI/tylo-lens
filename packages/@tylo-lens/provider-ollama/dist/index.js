function normalizeBaseUrl(url) {
    return url.replace(/\/+$/, '');
}
function messagesToPrompt(messages) {
    return messages.map((m) => `${m.role}: ${m.content}`).join('\n');
}
export function createOllamaClient(options) {
    const baseUrl = normalizeBaseUrl(options.baseUrl ?? 'http://localhost:11434');
    return {
        async chat(input) {
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
                const json = (await res.json());
                const outputText = json.message?.content ?? '';
                const usage = {
                    inputTokens: json.prompt_eval_count ?? 0,
                    outputTokens: json.eval_count ?? 0,
                    totalTokens: (json.prompt_eval_count ?? 0) + (json.eval_count ?? 0),
                };
                return { outputText, usage, raw: json };
            });
            const out = await run({ prompt, messages: input.messages });
            return out.raw ?? out;
        },
    };
}
//# sourceMappingURL=index.js.map