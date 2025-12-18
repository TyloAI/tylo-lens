export function randomId(prefix = 'span') {
    const globalCrypto = globalThis.crypto;
    if (globalCrypto?.randomUUID)
        return `${prefix}_${globalCrypto.randomUUID()}`;
    const rand = Math.random().toString(16).slice(2);
    const ts = Date.now().toString(16);
    return `${prefix}_${ts}_${rand}`;
}
//# sourceMappingURL=id.js.map