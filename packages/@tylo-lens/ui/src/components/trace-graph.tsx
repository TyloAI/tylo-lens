'use client';

import type { LensSpan } from '@tylo-lens/core';
import * as dagre from 'dagre';
import type { PointerEvent, WheelEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

type TraceGraphProps = {
  spans: LensSpan[];
  selectedSpanId?: string | null;
  onSelectSpan?: (spanId: string) => void;
  isLive?: boolean;
};

type GraphNode = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  risk: 'low' | 'medium' | 'high' | 'unknown';
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

type GraphEdge = {
  id: string;
  from: string;
  to: string;
  path: string;
  active: boolean;
};

function toPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  const parts = [`M ${first.x} ${first.y}`];
  for (const p of rest) parts.push(`L ${p.x} ${p.y}`);
  return parts.join(' ');
}

function spanRisk(span: LensSpan): 'low' | 'medium' | 'high' | 'unknown' {
  return span.safety?.risk ?? 'unknown';
}

function nodeColors(risk: GraphNode['risk']) {
  if (risk === 'high') return { stroke: 'rgba(244, 63, 94, 0.55)', fill: 'rgba(244, 63, 94, 0.10)' };
  if (risk === 'medium') return { stroke: 'rgba(245, 158, 11, 0.55)', fill: 'rgba(245, 158, 11, 0.10)' };
  if (risk === 'low') return { stroke: 'rgba(16, 185, 129, 0.55)', fill: 'rgba(16, 185, 129, 0.10)' };
  return { stroke: 'rgba(148, 163, 184, 0.35)', fill: 'rgba(15, 23, 42, 0.35)' };
}

function edgeColor(active: boolean) {
  return active ? 'rgba(110, 231, 255, 0.75)' : 'rgba(148, 163, 184, 0.35)';
}

function buildLayout(spans: LensSpan[]) {
  const ROOT = '__root__';
  const NODE_W = 280;
  const NODE_H = 88;

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'LR',
    nodesep: 32,
    ranksep: 56,
    marginx: 24,
    marginy: 24,
  });
  g.setDefaultEdgeLabel(() => ({}));

  g.setNode(ROOT, { width: 180, height: 64, label: 'Trace' });

  for (const span of spans) {
    g.setNode(span.id, { width: NODE_W, height: NODE_H, label: span.name });
    const parent = span.parentId ?? ROOT;
    g.setEdge(parent, span.id);
  }

  dagre.layout(g);

  const activeSet = new Set(spans.filter((s) => !s.endTime).map((s) => s.id));

  const nodes: GraphNode[] = [];
  for (const id of g.nodes()) {
    const n = g.node(id);
    if (!n) continue;

    if (id === ROOT) {
      nodes.push({
        id,
        kind: 'trace',
        title: 'Trace',
        subtitle: `${spans.length} spans`,
        risk: 'unknown',
        active: activeSet.size > 0,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
      });
      continue;
    }

    const span = spans.find((s) => s.id === id);
    if (!span) continue;
    const tokens = span.usage?.totalTokens ?? 0;
    const ms = span.durationMs != null ? `${span.durationMs.toFixed(0)}ms` : 'live';
    const model = span.model ? ` · ${span.model}` : '';

    nodes.push({
      id,
      kind: span.kind,
      title: `${span.kind.toUpperCase()} · ${span.name}`,
      subtitle: `${ms} · ${tokens} tok${model}`,
      risk: spanRisk(span),
      active: !span.endTime,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
    });
  }

  const edges: GraphEdge[] = [];
  for (const e of g.edges()) {
    const edge = g.edge(e);
    if (!edge?.points) continue;
    const path = toPath(edge.points);
    const id = `${e.v}->${e.w}`;
    const active = activeSet.has(e.w);
    edges.push({ id, from: e.v, to: e.w, path, active });
  }

  // Compute viewbox from nodes and edge points.
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.width / 2);
    minY = Math.min(minY, n.y - n.height / 2);
    maxX = Math.max(maxX, n.x + n.width / 2);
    maxY = Math.max(maxY, n.y + n.height / 2);
  }
  for (const e of g.edges()) {
    const edge = g.edge(e);
    if (!edge?.points) continue;
    for (const p of edge.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 1;
    maxY = 1;
  }

  const pad = 24;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;

  const width = maxX - minX;
  const height = maxY - minY;
  const viewBox = `${minX} ${minY} ${width} ${height}`;

  return { nodes, edges, viewBox, bounds: { x: minX, y: minY, width, height } };
}

export function TraceGraph(props: TraceGraphProps) {
  const live = props.isLive ?? props.spans.some((s) => !s.endTime);

  const { nodes, edges, bounds } = useMemo(() => buildLayout(props.spans), [props.spans]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; viewX: number; viewY: number } | null>(null);
  const viewRef = useRef(bounds);
  const [view, setView] = useState(bounds);

  useEffect(() => {
    setView(bounds);
  }, [bounds.x, bounds.y, bounds.width, bounds.height]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const viewBox = `${view.x} ${view.y} ${view.width} ${view.height}`;

  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    const el = svgRef.current;
    if (!el) return;
    e.preventDefault();

    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / Math.max(1, rect.width);
    const py = (e.clientY - rect.top) / Math.max(1, rect.height);

    const zoomIn = e.deltaY < 0;
    const factor = zoomIn ? 0.9 : 1.1;

    const current = viewRef.current;
    const nextW = current.width * factor;
    const nextH = current.height * factor;

    const minW = bounds.width * 0.55;
    const maxW = bounds.width * 5;
    const clampedW = Math.max(minW, Math.min(maxW, nextW));
    const clampedH = Math.max(bounds.height * 0.55, Math.min(bounds.height * 5, nextH));

    const scaleX = clampedW / current.width;
    const scaleY = clampedH / current.height;

    const newX = current.x + (current.width * px) - (current.width * px * scaleX);
    const newY = current.y + (current.height * py) - (current.height * py * scaleY);

    setView({ x: newX, y: newY, width: clampedW, height: clampedH });
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const el = svgRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const current = viewRef.current;
    dragRef.current = { x: e.clientX, y: e.clientY, viewX: current.x, viewY: current.y };
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const el = svgRef.current;
    const drag = dragRef.current;
    if (!el || !drag) return;
    const rect = el.getBoundingClientRect();
    const current = viewRef.current;
    const dx = (e.clientX - drag.x) * (current.width / Math.max(1, rect.width));
    const dy = (e.clientY - drag.y) * (current.height / Math.max(1, rect.height));
    setView({ x: drag.viewX - dx, y: drag.viewY - dy, width: current.width, height: current.height });
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const el = svgRef.current;
    if (!el) return;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    dragRef.current = null;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="text-sm text-slate-200">Trace Graph</div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className={live ? 'text-cyan-200' : 'text-slate-400'}>{live ? 'LIVE' : 'IDLE'}</span>
          <span>·</span>
          <span>{props.spans.length} spans</span>
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          className="h-[520px] w-full"
          role="img"
          aria-label="Tylo-Lens trace graph"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <defs>
            <pattern id="tyloGrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(148, 163, 184, 0.16)" />
            </pattern>

            <linearGradient id="tyloEdge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(110, 231, 255, 0.55)" />
              <stop offset="50%" stopColor="rgba(167, 139, 250, 0.55)" />
              <stop offset="100%" stopColor="rgba(110, 231, 255, 0.55)" />
            </linearGradient>

            <filter id="tyloGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 12 -4"
                result="glow"
              />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <marker id="tyloArrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="8" markerHeight="8" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(148, 163, 184, 0.45)" />
            </marker>
          </defs>

          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            fill="url(#tyloGrid)"
          />

          {/* Edges */}
          {edges.map((e) => (
            <g key={e.id}>
              <path
                d={e.path}
                fill="none"
                stroke={live ? 'url(#tyloEdge)' : edgeColor(e.active)}
                strokeWidth={2}
                opacity={0.75}
                markerEnd="url(#tyloArrow)"
              />
              {live ? (
                <>
                  <path
                    d={e.path}
                    fill="none"
                    stroke={edgeColor(e.active)}
                    strokeWidth={2}
                    className="tylo-edge-flow"
                    opacity={e.active ? 0.75 : 0.3}
                  />
                  {e.active ? (
                    <>
                      <circle r="2.2" fill="rgba(110, 231, 255, 0.95)" filter="url(#tyloGlow)">
                        <animateMotion dur="1.2s" repeatCount="indefinite" path={e.path} />
                      </circle>
                      <circle r="1.8" fill="rgba(167, 139, 250, 0.95)" filter="url(#tyloGlow)">
                        <animateMotion dur="1.6s" repeatCount="indefinite" path={e.path} begin="0.4s" />
                      </circle>
                    </>
                  ) : null}
                </>
              ) : null}
            </g>
          ))}

          {/* Nodes */}
          {nodes.map((n) => {
            const selected = n.id === props.selectedSpanId;
            const c = nodeColors(n.risk);
            const x = n.x - n.width / 2;
            const y = n.y - n.height / 2;

            return (
              <g
                key={n.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => (n.id === '__root__' ? null : props.onSelectSpan?.(n.id))}
                style={{ cursor: n.id === '__root__' ? 'default' : 'pointer' }}
              >
                <rect
                  width={n.width}
                  height={n.height}
                  rx={14}
                  fill={c.fill}
                  stroke={selected ? 'rgba(110, 231, 255, 0.9)' : c.stroke}
                  strokeWidth={selected ? 2.4 : 1.4}
                  filter={n.active && live ? 'url(#tyloGlow)' : undefined}
                  className={n.active && live ? 'tylo-live-node' : undefined}
                />

                <text x={14} y={26} fontSize={12} fill="rgba(226, 232, 240, 0.92)">
                  {n.title}
                </text>
                <text x={14} y={48} fontSize={11} fill="rgba(148, 163, 184, 0.92)">
                  {n.subtitle}
                </text>

                {n.risk !== 'unknown' ? (
                  <g transform={`translate(${n.width - 88}, ${14})`}>
                    <rect
                      width={72}
                      height={20}
                      rx={999}
                      fill={n.risk === 'high' ? 'rgba(244, 63, 94, 0.20)' : n.risk === 'medium' ? 'rgba(245, 158, 11, 0.20)' : 'rgba(16, 185, 129, 0.16)'}
                      stroke={n.risk === 'high' ? 'rgba(244, 63, 94, 0.35)' : n.risk === 'medium' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.30)'}
                    />
                    <text x={36} y={14} textAnchor="middle" fontSize={10} fill="rgba(226, 232, 240, 0.92)">
                      {n.risk.toUpperCase()}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </svg>

        <style>{`
          @keyframes tyloDash {
            to {
              stroke-dashoffset: -140;
            }
          }
          .tylo-edge-flow {
            stroke-dasharray: 6 12;
            stroke-dashoffset: 0;
            animation: tyloDash 2.4s linear infinite;
          }
          @keyframes tyloPulse {
            0% { opacity: 0.78; }
            50% { opacity: 1; }
            100% { opacity: 0.78; }
          }
          .tylo-live-node {
            animation: tyloPulse 1.8s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
