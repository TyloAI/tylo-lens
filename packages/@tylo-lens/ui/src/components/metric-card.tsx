import type { ReactNode } from 'react';

type MetricCardProps = {
  title: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
};

export function MetricCard(props: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-300">{props.title}</div>
        {props.icon ? <div className="text-slate-400">{props.icon}</div> : null}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-50">{props.value}</div>
      {props.hint ? <div className="mt-1 text-xs text-slate-400">{props.hint}</div> : null}
    </div>
  );
}

