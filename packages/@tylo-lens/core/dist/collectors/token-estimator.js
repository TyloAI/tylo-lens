// A conservative, dependency-free estimator.
// If you need accuracy, plug a tokenizer (tiktoken, etc) via config in your app.
export const estimateTokens = (text) => {
    if (!text)
        return 0;
    // Heuristic: ~4 chars per token in English, ~1.5 in CJK; take a blended approach.
    const trimmed = text.trim();
    if (!trimmed)
        return 0;
    const cjk = trimmed.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g)?.length ?? 0;
    const nonCjkChars = trimmed.length - cjk;
    const estCjk = Math.ceil(cjk / 1.5);
    const estNon = Math.ceil(nonCjkChars / 4);
    return Math.max(1, estCjk + estNon);
};
//# sourceMappingURL=token-estimator.js.map