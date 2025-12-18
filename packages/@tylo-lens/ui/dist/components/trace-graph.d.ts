import type { LensSpan } from '@protoethik-ai/core';
type TraceGraphProps = {
    spans: LensSpan[];
    selectedSpanId?: string | null;
    onSelectSpan?: (spanId: string) => void;
    isLive?: boolean;
};
export declare function TraceGraph(props: TraceGraphProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=trace-graph.d.ts.map