export type TraceStreamOptions = {
    url?: string;
};
type TraceStreamEvent = {
    type: 'trace';
    payload: unknown;
};
export declare function useTraceStream(options?: TraceStreamOptions): {
    events: TraceStreamEvent[];
    status: "connecting" | "open" | "closed" | "error";
    clear: () => void;
};
export {};
//# sourceMappingURL=use-trace-stream.d.ts.map