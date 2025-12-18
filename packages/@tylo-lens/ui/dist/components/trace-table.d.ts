import type { LensSpan } from '@protoethik-ai/core';
type TraceTableProps = {
    spans: LensSpan[];
    selectedSpanId?: string | null;
    onSelectSpan?: (spanId: string) => void;
    onFlagSpan?: (spanId: string) => void;
};
export declare function TraceTable(props: TraceTableProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=trace-table.d.ts.map