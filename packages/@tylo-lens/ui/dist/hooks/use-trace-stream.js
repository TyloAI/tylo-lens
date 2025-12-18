'use client';
import { useEffect, useMemo, useState } from 'react';
export function useTraceStream(options) {
    const url = options?.url ?? '/api/stream';
    const [events, setEvents] = useState([]);
    const [status, setStatus] = useState('connecting');
    const api = useMemo(() => ({
        events,
        status,
        clear: () => setEvents([]),
    }), [events, status]);
    useEffect(() => {
        let es = null;
        try {
            setStatus('connecting');
            es = new EventSource(url);
            es.onopen = () => setStatus('open');
            es.onerror = () => setStatus('error');
            es.onmessage = (msg) => {
                try {
                    const parsed = JSON.parse(msg.data);
                    setEvents((prev) => [...prev, { type: 'trace', payload: parsed }]);
                }
                catch {
                    // ignore
                }
            };
        }
        catch {
            setStatus('error');
        }
        return () => {
            if (es)
                es.close();
            setStatus('closed');
        };
    }, [url]);
    return api;
}
//# sourceMappingURL=use-trace-stream.js.map