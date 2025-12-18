'use client';

import { computeProtoethikTransparency } from '@protoethik-ai/core/browser';
import { MetricCard } from '@protoethik-ai/ui';
import { useEffect, useMemo } from 'react';
import { useTracesStore } from '../../store/traces';

export default function AnalyticsPage() {
  const traces = useTracesStore((s) => s.traces);
  const hydrate = useTracesStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const byModel = useMemo(() => {
    const map = new Map<string, { tokens: number; cost: number; spans: number }>();
    for (const t of traces) {
      for (const s of t.spans) {
        const key = s.model ?? '(unknown)';
        const prev = map.get(key) ?? { tokens: 0, cost: 0, spans: 0 };
        prev.tokens += s.usage?.totalTokens ?? 0;
        prev.cost += s.cost?.total ?? 0;
        prev.spans += 1;
        map.set(key, prev);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1].tokens - a[1].tokens);
  }, [traces]);

  const totalCost = traces.flatMap((t) => t.spans).reduce((sum, s) => sum + (s.cost?.total ?? 0), 0);
  const avgTScore = useMemo(() => {
    if (traces.length === 0) return 0;
    const scores = traces.map((t) => computeProtoethikTransparency(t).scoreScaled);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [traces]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-slate-50">Analytics</div>
        <div className="text-sm text-slate-400">Token & cost breakdown by model.</div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard title="Models" value={`${byModel.length}`} hint="Seen in traces" />
        <MetricCard title="Total cost" value={`${totalCost.toFixed(6)} USD`} hint="Estimated" />
        <MetricCard title="Avg T-score" value={`${avgTScore.toFixed(0)}`} hint="Protoethik (0–100)" />
        <MetricCard title="Traces" value={`${traces.length}`} hint="In memory" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
        <div className="border-b border-slate-800 px-4 py-3 text-sm text-slate-200">By model</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/40 text-slate-300">
              <tr>
                <th className="px-4 py-2 font-medium">Model</th>
                <th className="px-4 py-2 font-medium">Spans</th>
                <th className="px-4 py-2 font-medium">Tokens</th>
                <th className="px-4 py-2 font-medium">Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="text-slate-100">
              {byModel.map(([model, v]) => (
                <tr key={model} className="border-t border-slate-900/60">
                  <td className="px-4 py-2">{model}</td>
                  <td className="px-4 py-2 text-slate-300">{v.spans}</td>
                  <td className="px-4 py-2 text-slate-300">{v.tokens}</td>
                  <td className="px-4 py-2 text-slate-300">{v.cost.toFixed(6)}</td>
                </tr>
              ))}
              {byModel.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={4}>
                    No data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
