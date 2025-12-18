'use client';

import type { LensSpan } from '@tylo-lens/core';

type TraceTableProps = {
  spans: LensSpan[];
  selectedSpanId?: string | null;
  onSelectSpan?: (spanId: string) => void;
  onFlagSpan?: (spanId: string) => void;
};

export function TraceTable(props: TraceTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
      <div className="border-b border-slate-800 px-4 py-3 text-sm text-slate-200">Spans</div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/40 text-slate-300">
            <tr>
              <th className="px-4 py-2 font-medium">Kind</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Model</th>
              <th className="px-4 py-2 font-medium">Latency</th>
              <th className="px-4 py-2 font-medium">Tokens</th>
              <th className="px-4 py-2 font-medium">Cost</th>
              <th className="px-4 py-2 font-medium">Risk</th>
              <th className="px-4 py-2 font-medium">Flag</th>
            </tr>
          </thead>
          <tbody className="text-slate-100">
            {props.spans.map((s) => (
              <tr
                key={s.id}
                className={[
                  'cursor-pointer border-t border-slate-900/60',
                  s.id === props.selectedSpanId ? 'bg-slate-900/40' : 'hover:bg-slate-900/30',
                ].join(' ')}
                onClick={() => props.onSelectSpan?.(s.id)}
              >
                <td className="px-4 py-2 text-slate-300">{s.kind}</td>
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2 text-slate-300">{s.model ?? '—'}</td>
                <td className="px-4 py-2 text-slate-300">
                  {s.durationMs != null ? `${s.durationMs.toFixed(0)}ms` : '—'}
                </td>
                <td className="px-4 py-2 text-slate-300">{s.usage?.totalTokens ?? '—'}</td>
                <td className="px-4 py-2 text-slate-300">
                  {s.cost?.total != null ? `${s.cost.total.toFixed(6)} ${s.cost.currency}` : '—'}
                </td>
                <td className="px-4 py-2">
                  {s.safety?.risk ? (
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-200">
                      {s.safety.risk}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-2">
                  {s.safety?.pii.hasFindings ? (
                    <button
                      type="button"
                      title="PII evidence"
                      className="inline-flex items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/15"
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onFlagSpan?.(s.id);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M6 3v18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M6 4h11l-1.5 4L18 12H6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
            {props.spans.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={8}>
                  No spans yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
