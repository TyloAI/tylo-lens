'use client';

import type { LensTrace } from '@protoethik-ai/core/browser';
import { computeProtoethikTransparency } from '@protoethik-ai/core/browser';
import { MetricCard, TraceGraph, TraceTable, useTraceStream } from '@protoethik-ai/ui';
import { useEffect, useMemo, useState } from 'react';

export default function DemoPage() {
  const { events, status, clear } = useTraceStream({ url: '/api/demo-stream' });
  const [trace, setTrace] = useState<LensTrace | null>(null);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  useEffect(() => {
    const last = events[events.length - 1]?.payload as LensTrace | undefined;
    if (!last?.traceId) return;
    setTrace(last);
  }, [events]);

  useEffect(() => {
    setSelectedSpanId(trace?.spans[0]?.id ?? null);
  }, [trace?.traceId]);

  const stats = useMemo(() => {
    const spans = trace?.spans ?? [];
    const tokens = spans.reduce((sum, s) => sum + (s.usage?.totalTokens ?? 0), 0);
    const avgLatency = spans.length ? spans.reduce((sum, s) => sum + (s.durationMs ?? 0), 0) / spans.length : 0;
    return { spans: spans.length, tokens, avgLatency };
  }, [trace]);

  const transparency = useMemo(() => (trace ? computeProtoethikTransparency(trace) : null), [trace]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="text-sm text-slate-400">Demo stream status: {status}</div>
          <div className="text-2xl font-semibold text-slate-50">Live Demo (Read-only)</div>
          <div className="mt-1 text-sm text-slate-400">
            This page streams synthetic traces to showcase the TraceGraph layout + flow effects.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 hover:border-slate-700"
            onClick={() => {
              clear();
              setTrace(null);
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard title="Trace" value={trace ? trace.traceId.slice(-8) : '—'} hint="Synthetic trace id" />
        <MetricCard title="Spans" value={`${stats.spans}`} hint="In this trace" />
        <MetricCard title="Tokens" value={`${stats.tokens}`} hint="Estimated/declared" />
        <MetricCard
          title="T-score"
          value={transparency ? `${transparency.scoreScaled.toFixed(0)}` : '—'}
          hint="Protoethik (0–100)"
        />
      </div>

      {trace ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TraceGraph
            spans={trace.spans}
            selectedSpanId={selectedSpanId}
            onSelectSpan={(id) => setSelectedSpanId(id)}
            isLive={!trace.endedAt}
          />
          <div className="space-y-6">
            <TraceTable
              spans={trace.spans}
              selectedSpanId={selectedSpanId}
              onSelectSpan={(id) => setSelectedSpanId(id)}
            />
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm text-slate-200">Note</div>
              <div className="mt-2 text-sm text-slate-300">
                This is a demo-only stream. For real data, deploy your own dashboard and ingest traces via{' '}
                <span className="rounded bg-slate-900/60 px-2 py-1">POST /api/ingest</span>.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-400">
          Waiting for demo trace…
        </div>
      )}
    </div>
  );
}

