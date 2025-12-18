'use client';

import { useEffect, useMemo, useState } from 'react';

export type TraceStreamOptions = {
  url?: string;
};

type TraceStreamEvent = {
  type: 'trace';
  payload: unknown;
};

export function useTraceStream(options?: TraceStreamOptions) {
  const url = options?.url ?? '/api/stream';
  const [events, setEvents] = useState<TraceStreamEvent[]>([]);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed' | 'error'>('connecting');

  const api = useMemo(
    () => ({
      events,
      status,
      clear: () => setEvents([]),
    }),
    [events, status],
  );

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      setStatus('connecting');
      es = new EventSource(url);
      es.onopen = () => setStatus('open');
      es.onerror = () => setStatus('error');
      es.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          setEvents((prev) => [...prev, { type: 'trace', payload: parsed }]);
        } catch {
          // ignore
        }
      };
    } catch {
      setStatus('error');
    }
    return () => {
      if (es) es.close();
      setStatus('closed');
    };
  }, [url]);

  return api;
}

