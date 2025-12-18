export function nowIso(): string {
  return new Date().toISOString();
}

export function durationMs(startMs: number, endMs: number): number {
  return Math.max(0, endMs - startMs);
}

