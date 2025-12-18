import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function MetricCard(props) {
    return (_jsxs("div", { className: "rounded-xl border border-slate-800 bg-slate-950/60 p-4 backdrop-blur", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("div", { className: "text-sm text-slate-300", children: props.title }), props.icon ? _jsx("div", { className: "text-slate-400", children: props.icon }) : null] }), _jsx("div", { className: "mt-2 text-2xl font-semibold text-slate-50", children: props.value }), props.hint ? _jsx("div", { className: "mt-1 text-xs text-slate-400", children: props.hint }) : null] }));
}
//# sourceMappingURL=metric-card.js.map