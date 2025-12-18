import type { LensTrace } from '@tylo-lens/core';
import { addTrace } from '../../../lib/trace-store.js';

export async function POST(req: Request) {
  if (process.env.TYLO_LENS_READ_ONLY === '1' || process.env.TYLO_LENS_READ_ONLY === 'true') {
    return Response.json({ ok: false, error: 'Read-only mode' }, { status: 403 });
  }

  try {
    const trace = (await req.json()) as LensTrace;
    if (!trace?.traceId || !trace?.app?.name) {
      return Response.json({ ok: false, error: 'Invalid trace payload' }, { status: 400 });
    }
    addTrace(trace);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
