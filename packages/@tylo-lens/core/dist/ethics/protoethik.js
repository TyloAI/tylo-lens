import { estimateTokens } from '../collectors/token-estimator.js';
import { scanForPII } from './pii.js';
const DEFAULT_WEIGHTS = {
    clarity: 1,
    pii: 1,
};
export function computeClarityScore(text) {
    const t = (text ?? '').trim();
    if (!t)
        return 0;
    // Heuristic signals (0..1 each)
    const len = t.length;
    const hasStructure = /(\n- |\n\d+\. |\n\* )/.test(`\n${t}`);
    const hasPunctuation = /[.!?。！？]/.test(t);
    const hasCodeBlock = /```/.test(t);
    const hasRefusal = /\b(can't|cannot|won't|unable to)\b/i.test(t);
    // Penalize obvious low-signal noise
    const nonWord = (t.match(/[^A-Za-z0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\s]/g) ?? []).length;
    const noiseRatio = nonWord / Math.max(1, len);
    let score = 0.35;
    if (hasStructure)
        score += 0.25;
    if (hasPunctuation)
        score += 0.15;
    if (hasCodeBlock)
        score += 0.1;
    if (len >= 120)
        score += 0.15;
    if (hasRefusal)
        score -= 0.2;
    score -= Math.min(0.25, noiseRatio);
    return Math.max(0, Math.min(1, score));
}
function safeNumber(n) {
    const v = typeof n === 'number' ? n : Number(n);
    return Number.isFinite(v) ? v : 0;
}
function getSpanTokens(span) {
    if (span.usage?.totalTokens != null)
        return safeNumber(span.usage.totalTokens);
    const prompt = span.input?.prompt ?? '';
    const output = span.output?.text ?? '';
    const merged = [prompt, output].filter(Boolean).join('\n');
    return estimateTokens(merged);
}
function getSpanOutputTokens(span) {
    if (span.usage?.outputTokens != null)
        return safeNumber(span.usage.outputTokens);
    const output = span.output?.text ?? '';
    return estimateTokens(output);
}
function getSpanPiiCount(span) {
    if (span.safety?.pii.findings?.length) {
        return span.safety.pii.findings.reduce((sum, f) => sum + safeNumber(f.count), 0);
    }
    const prompt = span.input?.prompt ?? '';
    const output = span.output?.text ?? '';
    const findings = scanForPII([prompt, output].filter(Boolean).join('\n'));
    return findings.reduce((sum, f) => sum + safeNumber(f.count), 0);
}
export function computeProtoethikTransparency(trace, options) {
    const weights = { ...DEFAULT_WEIGHTS, ...(options?.weights ?? {}) };
    const spans = trace.spans;
    const tokens = spans.reduce((sum, s) => sum + getSpanTokens(s), 0);
    let claritySum = 0;
    let piiPenaltySum = 0;
    for (const span of spans) {
        const outputText = span.output?.text ?? '';
        const clarity = computeClarityScore(outputText);
        const outputTokens = getSpanOutputTokens(span);
        const piiCount = getSpanPiiCount(span);
        // C_clarity: clarity * outputTokens
        claritySum += clarity * outputTokens * weights.clarity;
        // P_pii: piiCount * 1000 (density-like); larger penalty with more PII.
        piiPenaltySum += piiCount * 1000 * weights.pii;
    }
    const denom = Math.max(1, tokens);
    const score = (claritySum - piiPenaltySum) / denom;
    // A UI-friendly 0..100 representation. (Clamped; raw score is still provided.)
    const scoreScaled = Math.max(0, Math.min(100, (score + 1) * 50));
    return {
        score,
        scoreScaled,
        tokens,
        claritySum,
        piiPenaltySum,
        weights,
        formula: 'T_score = (Σ(C_clarity · W_c) − Σ(P_pii · W_p)) / T_tokens, where C_clarity = clarity(output) · output_tokens and P_pii = pii_count · 1000',
    };
}
export function annotateProtoethikAnalysis(trace, options) {
    const weights = { ...DEFAULT_WEIGHTS, ...(options?.weights ?? {}) };
    // Per-span analysis
    for (const span of trace.spans) {
        const tokens = getSpanTokens(span);
        const outputTokens = getSpanOutputTokens(span);
        const outputText = span.output?.text ?? '';
        const clarity = computeClarityScore(outputText);
        const piiCount = getSpanPiiCount(span);
        const piiDensity = piiCount / Math.max(1, tokens);
        const contribution = (clarity * outputTokens * weights.clarity - piiCount * 1000 * weights.pii) / Math.max(1, tokens);
        span.analysis = {
            ...(span.analysis ?? {}),
            tokens,
            clarity,
            piiCount,
            piiDensity,
            tscoreContribution: contribution,
        };
    }
    const transparency = computeProtoethikTransparency(trace, { weights });
    trace.analysis = {
        ...(trace.analysis ?? {}),
        transparency,
    };
    return trace;
}
//# sourceMappingURL=protoethik.js.map