export function nowIso() {
    return new Date().toISOString();
}
export function durationMs(startMs, endMs) {
    return Math.max(0, endMs - startMs);
}
//# sourceMappingURL=time.js.map