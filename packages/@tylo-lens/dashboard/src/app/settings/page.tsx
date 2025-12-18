export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-slate-50">Settings</div>
        <div className="text-sm text-slate-400">Project configuration and SDK integration notes.</div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="text-sm font-medium text-slate-200">Ingestion</div>
        <p className="mt-2 text-sm text-slate-300">
          Send traces to <span className="rounded bg-slate-900/60 px-2 py-1">POST /api/ingest</span>.
        </p>
        <pre className="mt-3 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-slate-200">{`curl -X POST http://localhost:3000/api/ingest \\
  -H 'content-type: application/json' \\
  -d '{"traceId":"demo","app":{"name":"demo"},"startedAt":"...","spans":[]}'`}</pre>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="text-sm font-medium text-slate-200">Security & privacy</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>Do not capture prompts/outputs in production unless you have user consent.</li>
          <li>Enable PII redaction and add org-specific secret patterns.</li>
          <li>Prefer server-side ingestion (avoid exposing raw traces in browsers).</li>
        </ul>
      </div>
    </div>
  );
}

