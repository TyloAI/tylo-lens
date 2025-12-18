'use client';

import type { LensTrace } from '@tylo-lens/core';
import { create } from 'zustand';
import { getTraceDB } from '../lib/trace-db.js';

type TracesState = {
  traces: LensTrace[];
  selectedTraceId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  upsertTrace: (trace: LensTrace) => void;
  selectTrace: (traceId: string) => void;
  clear: () => Promise<void>;
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

let hydrationPromise: Promise<void> | null = null;

export const useTracesStore = create<TracesState>((set, get) => ({
  traces: [],
  selectedTraceId: null,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    if (hydrationPromise) return hydrationPromise;

    hydrationPromise = (async () => {
      const db = getTraceDB();
      if (!db) {
        set({ hydrated: true });
        return;
      }
      try {
        const rows = await db.traces.orderBy('updatedAt').reverse().limit(50).toArray();
        const traces = rows.map((r) => r.trace);
        set({ traces, selectedTraceId: traces[0]?.traceId ?? null, hydrated: true });
      } catch {
        set({ hydrated: true });
      }
    })();

    return hydrationPromise;
  },
  upsertTrace: (trace) => {
    const existing = get().traces;
    const prev = existing.find((t) => t.traceId === trace.traceId);
    const merged = prev ? mergeTrace(prev, trace) : trace;
    const next = [merged, ...existing.filter((t) => t.traceId !== trace.traceId)].slice(0, 50);
    set({ traces: next, selectedTraceId: get().selectedTraceId ?? merged.traceId });

    const db = getTraceDB();
    if (db) {
      void db.traces
        .put({ traceId: merged.traceId, updatedAt: new Date().toISOString(), trace: merged })
        .catch(() => {});
    }
  },
  selectTrace: (traceId) => set({ selectedTraceId: traceId }),
  clear: async () => {
    set({ traces: [], selectedTraceId: null });
    const db = getTraceDB();
    if (db) await db.traces.clear();
  },
}));
