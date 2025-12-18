import type { LensTrace } from '@protoethik-ai/core/browser';

type Subscriber = (trace: LensTrace) => void;

const state: {
  traces: LensTrace[];
  subscribers: Set<Subscriber>;
} = {
  traces: [],
  subscribers: new Set(),
};

function mergeDeep<T extends Record<string, any>>(a: T | undefined, b: T | undefined): T | undefined {
  if (!a) return b;
  if (!b) return a;
  return { ...a, ...b };
}

function mergeTrace(prev: LensTrace, next: LensTrace): LensTrace {
  const prevById = new Map(prev.spans.map((s) => [s.id, s]));
  const spans = next.spans.map((s) => {
    const existing = prevById.get(s.id);
    if (!existing) return s;
    return {
      ...existing,
      ...s,
      input: mergeDeep(existing.input as any, s.input as any),
      output: mergeDeep(existing.output as any, s.output as any),
      usage: mergeDeep(existing.usage as any, s.usage as any),
      cost: mergeDeep(existing.cost as any, s.cost as any),
      safety: mergeDeep(existing.safety as any, s.safety as any),
      analysis: mergeDeep(existing.analysis as any, s.analysis as any),
      meta: mergeDeep(existing.meta as any, s.meta as any),
    };
  });

  // Keep any spans not present in `next` (for partial updates).
  for (const s of prev.spans) {
    if (!next.spans.some((n) => n.id === s.id)) spans.push(s);
  }

  spans.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return {
    ...prev,
    ...next,
    app: mergeDeep(prev.app as any, next.app as any) as any,
    startedAt: prev.startedAt < next.startedAt ? prev.startedAt : next.startedAt,
    endedAt: next.endedAt ?? prev.endedAt,
    spans,
    analysis: mergeDeep(prev.analysis as any, next.analysis as any),
  };
}

export function addTrace(trace: LensTrace) {
  const idx = state.traces.findIndex((t) => t.traceId === trace.traceId);
  const merged = idx >= 0 ? mergeTrace(state.traces[idx]!, trace) : trace;

  // Keep newest first (move updated trace to front).
  state.traces = [merged, ...state.traces.filter((t) => t.traceId !== trace.traceId)].slice(0, 50);
  for (const sub of state.subscribers) sub(merged);
}

export function listTraces(): LensTrace[] {
  return state.traces;
}

export function subscribe(fn: Subscriber): () => void {
  state.subscribers.add(fn);
  return () => state.subscribers.delete(fn);
}
