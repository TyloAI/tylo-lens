const RULES = [
    { type: 'email', regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
    // Basic international-ish phone number, intentionally permissive.
    { type: 'phone', regex: /(\+?\d{1,3}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}/g },
    // Credit card (very loose) — use Luhn validation in production.
    { type: 'credit_card', regex: /\b(?:\d[ -]*?){13,19}\b/g },
    { type: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
    { type: 'ip_address', regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
    // Common API key prefixes; add more for your org.
    { type: 'api_key', regex: /\b(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16})\b/g },
];
export function scanForPII(text) {
    if (!text)
        return [];
    const findings = {
        email: 0,
        phone: 0,
        credit_card: 0,
        ssn: 0,
        ip_address: 0,
        api_key: 0,
    };
    for (const rule of RULES) {
        const matches = text.match(rule.regex);
        if (matches?.length)
            findings[rule.type] += matches.length;
    }
    return Object.entries(findings)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => ({ type, count }));
}
function hashString(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++)
        hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    return hash.toString(16);
}
function maskPreview(input, maxVisible = 2) {
    const s = input ?? '';
    if (s.length <= maxVisible * 2)
        return '*'.repeat(Math.min(12, s.length));
    const head = s.slice(0, maxVisible);
    const tail = s.slice(-maxVisible);
    const stars = '*'.repeat(Math.min(12, s.length - maxVisible * 2));
    return `${head}${stars}${tail}`;
}
function redactedMarker(type, match, mode) {
    if (mode === 'hash')
        return `[REDACTED:${type}:${hashString(match)}]`;
    return `[REDACTED:${type}]`;
}
function maskPIIInText(text) {
    let out = text;
    for (const rule of RULES) {
        out = out.replace(rule.regex, (m) => maskPreview(m));
    }
    return out;
}
export function collectPIIEvidence(text, field, options) {
    if (!text)
        return [];
    const mode = options?.mode ?? 'mask';
    const includeRawMatch = options?.includeRawMatch ?? false;
    const contextChars = options?.contextChars ?? 24;
    const maxItems = options?.maxItems ?? 50;
    const out = [];
    for (const rule of RULES) {
        if (out.length >= maxItems)
            break;
        for (const m of text.matchAll(rule.regex)) {
            if (out.length >= maxItems)
                break;
            const start = m.index ?? -1;
            const raw = m[0] ?? '';
            if (start < 0 || !raw)
                continue;
            const end = start + raw.length;
            const before = includeRawMatch ? raw : maskPreview(raw);
            const after = redactedMarker(rule.type, raw, mode);
            const leftIdx = Math.max(0, start - contextChars);
            const rightIdx = Math.min(text.length, end + contextChars);
            const snippet = text.slice(leftIdx, rightIdx);
            const contextBefore = includeRawMatch ? snippet : maskPIIInText(snippet);
            const contextAfter = redactPII(snippet, mode);
            out.push({
                field,
                type: rule.type,
                start,
                end,
                before,
                after,
                contextBefore,
                contextAfter,
            });
        }
    }
    return out;
}
export function redactPII(text, mode = 'mask') {
    if (!text)
        return text;
    if (mode === 'none')
        return text;
    const replacer = (type, match) => {
        if (mode === 'hash') {
            return `[REDACTED:${type}:${hashString(match)}]`;
        }
        return `[REDACTED:${type}]`;
    };
    let redacted = text;
    for (const rule of RULES) {
        redacted = redacted.replace(rule.regex, (m) => replacer(rule.type, m));
    }
    return redacted;
}
export function riskFromFindings(findings) {
    const total = findings.reduce((sum, f) => sum + f.count, 0);
    if (total === 0)
        return 'low';
    // Credit card / SSN / API keys are treated as high risk.
    const hasHigh = findings.some((f) => f.type === 'credit_card' || f.type === 'ssn' || f.type === 'api_key') ||
        total >= 5;
    if (hasHigh)
        return 'high';
    return 'medium';
}
//# sourceMappingURL=pii.js.map