'use client';

import type { LensTrace } from '@protoethik-ai/core/browser';
import { computeClarityScore, computeProtoethikTransparency, generateComplianceReport } from '@protoethik-ai/core/browser';
import { MetricCard, TraceGraph, TraceTable, useTraceStream } from '@protoethik-ai/ui';
import { useEffect, useMemo, useState } from 'react';
import { useTracesStore } from '../store/traces';

function summarize(traces: LensTrace[]) {
  const allSpans = traces.flatMap((t) => t.spans);
  const totalTokens = allSpans.reduce((sum, s) => sum + (s.usage?.totalTokens ?? 0), 0);
  const totalCost = allSpans.reduce((sum, s) => sum + (s.cost?.total ?? 0), 0);
  const avgLatency =
    allSpans.length === 0
      ? 0
      : allSpans.reduce((sum, s) => sum + (s.durationMs ?? 0), 0) / allSpans.length;
  return {
    traces: traces.length,
    spans: allSpans.length,
    totalTokens,
    totalCost,
    avgLatency,
  };
}

export default function Page() {
  const { events, status } = useTraceStream({ url: '/api/stream' });
  const traces = useTracesStore((s) => s.traces);
  const hydrate = useTracesStore((s) => s.hydrate);
  const upsertTrace = useTracesStore((s) => s.upsertTrace);
  const selectedTraceId = useTracesStore((s) => s.selectedTraceId);
  const selectTrace = useTracesStore((s) => s.selectTrace);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/traces')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        for (const t of (data?.traces ?? []) as LensTrace[]) upsertTrace(t);
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, [upsertTrace]);

  useEffect(() => {
    for (const ev of events) {
      const trace = ev.payload as LensTrace;
      if (trace?.traceId) upsertTrace(trace);
    }
  }, [events, upsertTrace]);

  const selected = traces.find((t) => t.traceId === selectedTraceId) ?? traces[0];
  const stats = summarize(traces);
  const report = useMemo(() => (selected ? generateComplianceReport(selected) : ''), [selected]);
  const transparency = useMemo(
    () => (selected ? computeProtoethikTransparency(selected) : null),
    [selected],
  );
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [piiOpen, setPiiOpen] = useState(false);

  useEffect(() => {
    setSelectedSpanId(selected?.spans[0]?.id ?? null);
  }, [selected?.traceId]);

  const selectedSpan = useMemo(() => {
    if (!selected) return null;
    return selected.spans.find((s) => s.id === selectedSpanId) ?? selected.spans[0] ?? null;
  }, [selected, selectedSpanId]);

  const selectedSpanProto = useMemo(() => {
    if (!selectedSpan) return null;
    const tokens = selectedSpan.usage?.totalTokens ?? 0;
    const piiCount = selectedSpan.safety?.pii.findings.reduce((sum, f) => sum + f.count, 0) ?? 0;
    const piiDensity = tokens > 0 ? piiCount / tokens : 0;
    const clarity = computeClarityScore(selectedSpan.output?.text ?? '');
    return { tokens, piiCount, piiDensity, clarity };
  }, [selectedSpan]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="text-sm text-slate-400">Stream status: {status}</div>
          <div className="text-2xl font-semibold text-slate-50">Live Trace Explorer</div>
        </div>
        <div className="text-sm text-slate-400">
          Ingest endpoint: <span className="rounded bg-slate-900/60 px-2 py-1">POST /api/ingest</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <MetricCard title="Traces" value={`${stats.traces}`} hint="In memory" />
        <MetricCard title="Spans" value={`${stats.spans}`} hint="Across traces" />
        <MetricCard title="Tokens" value={`${stats.totalTokens}`} hint="Estimated/declared" />
        <MetricCard title="Avg latency" value={`${stats.avgLatency.toFixed(0)}ms`} hint="Across spans" />
        <MetricCard
          title="T-score"
          value={transparency ? `${transparency.scoreScaled.toFixed(0)}` : '—'}
          hint="Protoethik transparency score (0–100)"
        />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40">
        <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-200">Traces</div>
          <div className="flex flex-wrap gap-2">
            {traces.length === 0 ? (
              <div className="text-sm text-slate-400">No traces yet. Send one to /api/ingest.</div>
            ) : (
              traces.slice(0, 8).map((t) => (
                <button
                  key={t.traceId}
                  onClick={() => selectTrace(t.traceId)}
                  className={[
                    'rounded-lg border px-3 py-1 text-xs',
                    t.traceId === selected?.traceId
                      ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-200'
                      : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700',
                  ].join(' ')}
                >
                  {t.traceId.slice(-8)}
                </button>
              ))
            )}
          </div>
        </div>
        <div className="px-4 py-4 text-xs text-slate-400">
          {selected ? (
            <>
              Selected: <span className="text-slate-200">{selected.traceId}</span> · {selected.spans.length} spans
            </>
          ) : (
            'Waiting for traces…'
          )}
        </div>
      </div>

      {selected ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TraceGraph
            spans={selected.spans}
            selectedSpanId={selectedSpanId}
            onSelectSpan={(id) => setSelectedSpanId(id)}
            isLive={!selected.endedAt}
          />
          <div className="space-y-6">
            <TraceTable
              spans={selected.spans}
              selectedSpanId={selectedSpanId}
              onSelectSpan={(id) => setSelectedSpanId(id)}
              onFlagSpan={(id) => {
                setSelectedSpanId(id);
                setPiiOpen(true);
              }}
            />
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-slate-200">Span details</div>
                <div className="text-xs text-slate-400">{selectedSpan ? selectedSpan.id : '—'}</div>
              </div>
              {selectedSpan ? (
                <div className="mt-3 space-y-3 text-sm text-slate-200">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-900/60 bg-black/20 p-3">
                      <div className="text-xs text-slate-400">Kind</div>
                      <div className="mt-1">{selectedSpan.kind}</div>
                    </div>
                    <div className="rounded-lg border border-slate-900/60 bg-black/20 p-3">
                      <div className="text-xs text-slate-400">Latency</div>
                      <div className="mt-1">
                        {selectedSpan.durationMs != null ? `${selectedSpan.durationMs.toFixed(0)}ms` : '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-900/60 bg-black/20 p-3">
                      <div className="text-xs text-slate-400">Tokens / Cost</div>
                      <div className="mt-1">
                        {selectedSpan.usage?.totalTokens ?? '—'} tok ·{' '}
                        {selectedSpan.cost?.total != null
                          ? `${selectedSpan.cost.total.toFixed(6)} ${selectedSpan.cost.currency}`
                          : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-900/60 bg-black/20 p-3">
                    <div className="text-xs text-slate-400">Name / Model</div>
                    <div className="mt-1">
                      {selectedSpan.name} {selectedSpan.model ? `(${selectedSpan.model})` : ''}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-900/60 bg-black/20 p-3">
                      <div className="text-xs text-slate-400">Prompt</div>
                      <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-2 text-xs text-slate-200">
                        {selectedSpan.input?.prompt ?? '—'}
                      </pre>
                    </div>
                    <div className="rounded-lg border border-slate-900/60 bg-black/20 p-3">
                      <div className="text-xs text-slate-400">Output</div>
                      <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-2 text-xs text-slate-200">
                        {selectedSpan.output?.text ?? '—'}
                      </pre>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-900/60 bg-black/20 p-3">
                    <div className="text-xs text-slate-400">Safety</div>
                    <div className="mt-1 text-sm text-slate-200">
                      Risk: {selectedSpan.safety?.risk ?? '—'} · PII:{' '}
                      {selectedSpan.safety?.pii.hasFindings ? 'detected' : 'none'}
                    </div>
                    {selectedSpan.safety?.pii.hasFindings ? (
                      <button
                        type="button"
                        className="mt-2 inline-flex items-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/15"
                        onClick={() => setPiiOpen(true)}
                      >
                        View PII evidence
                      </button>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-slate-900/60 bg-black/20 p-3">
                    <div className="text-xs text-slate-400">Protoethik</div>
                    <div className="mt-1 text-sm text-slate-200">
                      Clarity: {selectedSpanProto ? selectedSpanProto.clarity.toFixed(2) : '—'} · PII density:{' '}
                      {selectedSpanProto ? selectedSpanProto.piiDensity.toFixed(4) : '—'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-400">No span selected.</div>
              )}
            </div>

            {piiOpen ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-200">PII evidence chain</div>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-1 text-xs text-slate-200 hover:border-slate-700"
                    onClick={() => setPiiOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <div className="mt-2 text-xs text-slate-400">
                  Evidence is shown using masked previews by default. To include raw matches (not recommended), enable{' '}
                  <span className="rounded bg-slate-900/60 px-2 py-1">ethics.piiEvidence.includeRawMatch</span>.
                </div>

                {selectedSpan?.safety?.pii.evidence?.length ? (
                  <div className="mt-3 space-y-3">
                    {selectedSpan.safety.pii.evidence.slice(0, 20).map((e, idx) => (
                      <div key={`${e.field}-${e.type}-${e.start}-${idx}`} className="rounded-lg border border-slate-900/60 bg-black/20 p-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                          <span className="rounded bg-slate-900/60 px-2 py-1">{e.field}</span>
                          <span className="rounded bg-slate-900/60 px-2 py-1">{e.type}</span>
                          <span className="text-slate-400">
                            pos {e.start}–{e.end}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <div className="text-xs text-slate-400">Before (masked preview)</div>
                            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-2 text-xs text-slate-200">
                              {e.contextBefore}
                            </pre>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">After (redacted)</div>
                            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-2 text-xs text-slate-200">
                              {e.contextAfter}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                    {selectedSpan.safety.pii.evidence.length > 20 ? (
                      <div className="text-xs text-slate-400">Showing first 20 items.</div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-400">No evidence entries found.</div>
                )}
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm text-slate-200">Compliance report</div>
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-slate-200">
                {report}
              </pre>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm text-slate-200">Transparency score</div>
              {transparency ? (
                <div className="mt-3 space-y-2 text-xs text-slate-300">
                  <div>
                    Score (raw): <span className="text-slate-100">{transparency.score.toFixed(4)}</span> · Score
                    (0–100): <span className="text-slate-100">{transparency.scoreScaled.toFixed(0)}</span>
                  </div>
                  <div>
                    Tokens: <span className="text-slate-100">{transparency.tokens}</span> · ΣClarity:{' '}
                    <span className="text-slate-100">{transparency.claritySum.toFixed(2)}</span> · ΣPII penalty:{' '}
                    <span className="text-slate-100">{transparency.piiPenaltySum.toFixed(2)}</span>
                  </div>
                  <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs text-slate-200">
                    {transparency.formula}
                  </pre>
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-400">No trace selected.</div>
              )}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm text-slate-200">Raw trace JSON</div>
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-slate-200">
                {JSON.stringify(selected, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
