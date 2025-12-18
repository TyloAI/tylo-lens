import { listTraces } from '../../../lib/trace-store';

export const runtime = 'nodejs';

export async function GET() {
  return Response.json({ traces: listTraces() });
}
