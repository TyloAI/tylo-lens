import { subscribe } from '../../../lib/trace-store.js';

export const runtime = 'nodejs';

export async function GET() {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      unsubscribe = subscribe((trace) => send(trace));
      send({ hello: 'tylo-lens' });
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
