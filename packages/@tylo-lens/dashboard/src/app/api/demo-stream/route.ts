import type { LensSpan, LensTrace } from '@tylo-lens/core';

export const runtime = 'nodejs';

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function makeSpan(traceId: string, span: Partial<LensSpan> & Pick<LensSpan, 'kind' | 'name'>): LensSpan {
  return {
    id: span.id ?? randomId(span.kind),
    traceId,
    parentId: span.parentId,
    kind: span.kind,
    name: span.name,
    model: span.model,
    startTime: span.startTime ?? nowIso(),
    endTime: span.endTime,
    durationMs: span.durationMs,
    input: span.input,
    output: span.output,
    usage: span.usage,
    cost: span.cost,
    safety: span.safety,
    meta: span.meta,
    analysis: span.analysis,
  };
}

function buildDemoFrames(): LensTrace[] {
  const traceId = `demo_${Date.now().toString(16)}`;
  const startedAt = nowIso();

  const base: LensTrace = {
    traceId,
    app: { name: 'tylo-lens-demo', environment: 'demo' },
    startedAt,
    spans: [],
  };

  const frames: LensTrace[] = [];
  const clone = (t: LensTrace): LensTrace => JSON.parse(JSON.stringify(t));

  const agent = makeSpan(traceId, {
    kind: 'llm',
    name: 'agent.plan',
    model: 'ollama:llama3',
    input: { prompt: 'Plan tool calls and write a safe answer.' },
    output: { text: '' },
    usage: { inputTokens: 18, outputTokens: 0, totalTokens: 18 },
    safety: { pii: { findings: [], hasFindings: false }, risk: 'low' },
  });

  const mcp = makeSpan(traceId, {
    kind: 'mcp',
    name: 'demo-mcp.request',
    parentId: agent.id,
    meta: { method: 'tools/list' },
  });

  const tool = makeSpan(traceId, {
    kind: 'tool',
    name: 'tool.search',
    parentId: mcp.id,
    input: { messages: { q: 'Tylo-Lens streaming trace demo' } },
  });

  const model = makeSpan(traceId, {
    kind: 'llm',
    name: 'llm.call',
    model: 'openai-compatible:deepseek-chat',
    parentId: agent.id,
    input: { prompt: 'Write a clear answer and include a contact: demo@example.com' },
    output: { text: '' },
    usage: { inputTokens: 24, outputTokens: 0, totalTokens: 24 },
    safety: { pii: { findings: [{ type: 'email', count: 1 }], hasFindings: true }, risk: 'medium' },
  });

  const chunksA = ['Thinking…', '\n- list tools', '\n- call search', '\n- synthesize answer\n'];
  const chunksB = [
    'Here is the result:\n',
    '- Transparent call chain\n',
    '- Token + latency stats\n',
    '- Compliance report\n',
    '\nContact: demo@example.com\n',
  ];

  // Frame 0: empty trace
  frames.push(clone(base));

  // Frames: agent streams
  base.spans.push(agent);
  for (let i = 0; i < chunksA.length; i++) {
    agent.output = { text: (agent.output?.text ?? '') + chunksA[i] };
    agent.usage = {
      inputTokens: agent.usage?.inputTokens ?? 18,
      outputTokens: (agent.usage?.outputTokens ?? 0) + 8,
      totalTokens: (agent.usage?.totalTokens ?? 18) + 8,
    };
    frames.push(clone(base));
  }
  agent.endTime = nowIso();
  agent.durationMs = 420;
  frames.push(clone(base));

  // MCP + tool
  mcp.startTime = nowIso();
  base.spans.push(mcp);
  frames.push(clone(base));
  mcp.endTime = nowIso();
  mcp.durationMs = 32;
  frames.push(clone(base));

  tool.startTime = nowIso();
  base.spans.push(tool);
  frames.push(clone(base));
  tool.endTime = nowIso();
  tool.durationMs = 64;
  tool.output = { text: 'Found 3 documents.' };
  frames.push(clone(base));

  // Model streams with PII finding
  model.startTime = nowIso();
  base.spans.push(model);
  for (let i = 0; i < chunksB.length; i++) {
    model.output = { text: (model.output?.text ?? '') + chunksB[i] };
    model.usage = {
      inputTokens: model.usage?.inputTokens ?? 24,
      outputTokens: (model.usage?.outputTokens ?? 0) + 12,
      totalTokens: (model.usage?.totalTokens ?? 24) + 12,
    };
    frames.push(clone(base));
  }
  model.endTime = nowIso();
  model.durationMs = 860;
  frames.push(clone(base));

  base.endedAt = nowIso();
  frames.push(clone(base));

  return frames;
}

export async function GET() {
  const encoder = new TextEncoder();
  const frames = buildDemoFrames();

  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let i = 0;

      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ hello: 'tylo-lens-demo' });

      const interval = setInterval(() => {
        const frame = frames[i % frames.length];
        send(frame);
        i++;
        if (i % frames.length === 0) {
          // Small pause between runs by sending a final frame again.
          send(frame);
        }
      }, 240);

      unsubscribe = () => clearInterval(interval);
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

