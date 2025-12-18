import type {
  LensEthicsConfig,
  LensEvent,
  LensEventHandler,
  LensEventType,
  LensExporter,
  LensPlugin,
  LensPluginContext,
  LensPricingTable,
  LensRedactionMode,
  LensSafety,
  LensSpan,
  LensSpanEnd,
  LensSpanHandle,
  LensSpanStart,
  LensSpanUpdate,
  LensTrace,
  LensUsage,
  TyloLensOptions,
  WrapLLMResult,
} from './types.js';
import { computeCost } from './collectors/pricing.js';
import { estimateTokens } from './collectors/token-estimator.js';
import { collectPIIEvidence, redactPII, riskFromFindings, scanForPII } from './ethics/pii.js';
import type { FetchInterceptorOptions } from './interceptors/fetch.js';
import { createFetchInterceptor } from './interceptors/fetch.js';
import type { MCPClientLike, MCPInterceptorOptions } from './interceptors/mcp.js';
import { wrapMCPClient } from './interceptors/mcp.js';
import type { XHRInterceptorOptions } from './interceptors/xhr.js';
import { installXHRInterceptor } from './interceptors/xhr.js';
import { randomId } from './utils/id.js';
import { durationMs, nowIso } from './utils/time.js';

type WrapLLMInput = {
  prompt?: string;
  messages?: unknown;
  [key: string]: unknown;
};

type WrapLLMOptions = {
  name?: string;
  capture?: Partial<{ prompts: boolean; outputs: boolean }>;
  meta?: Record<string, unknown>;
};

function normalizeUsage(
  declared: any,
  promptText: string,
  outputText: string,
  tokenEstimator: (text: string) => number,
): LensUsage {
  const inputTokens = Number(declared?.inputTokens ?? declared?.promptTokens ?? declared?.input ?? NaN);
  const outputTokens = Number(declared?.outputTokens ?? declared?.completionTokens ?? declared?.output ?? NaN);
  const totalTokens = Number(declared?.totalTokens ?? declared?.total ?? NaN);

  const estInput = tokenEstimator(promptText);
  const estOutput = tokenEstimator(outputText);

  const normalizedInput = Number.isFinite(inputTokens) ? inputTokens : estInput;
  const normalizedOutput = Number.isFinite(outputTokens) ? outputTokens : estOutput;
  const normalizedTotal = Number.isFinite(totalTokens) ? totalTokens : normalizedInput + normalizedOutput;

  return {
    inputTokens: Math.max(0, normalizedInput),
    outputTokens: Math.max(0, normalizedOutput),
    totalTokens: Math.max(0, normalizedTotal),
  };
}

function safetyForText(
  prompt: string,
  output: string,
  options: {
    redactionMode: LensRedactionMode;
    piiEvidence: { enabled: boolean; includeRawMatch: boolean; contextChars: number };
  },
): LensSafety {
  const merged = scanForPII([prompt, output].filter(Boolean).join('\n'));
  const risk = riskFromFindings(merged);

  const evidence = options.piiEvidence.enabled
    ? [
        ...collectPIIEvidence(prompt, 'prompt', {
          mode: options.redactionMode,
          includeRawMatch: options.piiEvidence.includeRawMatch,
          contextChars: options.piiEvidence.contextChars,
        }),
        ...collectPIIEvidence(output, 'output', {
          mode: options.redactionMode,
          includeRawMatch: options.piiEvidence.includeRawMatch,
          contextChars: options.piiEvidence.contextChars,
        }),
      ]
    : undefined;

  return {
    pii: { findings: merged, hasFindings: merged.length > 0, evidence },
    risk,
  };
}

export class TyloLens {
  private readonly app: TyloLensOptions['app'];
  private readonly ethics: {
    redactPII: boolean;
    redactionMode: LensRedactionMode;
    capture: { prompts: boolean; outputs: boolean };
    piiEvidence: { enabled: boolean; includeRawMatch: boolean; contextChars: number };
  };
  private readonly pricing?: LensPricingTable;
  private tokenEstimator: (text: string) => number;
  private readonly autoStartTrace: boolean;
  private readonly autoFlushOnExport: boolean;
  private trace: LensTrace | null = null;
  private readonly spanStack: string[] = [];

  private readonly listeners = new Map<LensEventType, Set<(event: LensEvent) => void>>();
  private readonly exporters: LensExporter[] = [];
  private readonly pluginDisposers: Array<() => void> = [];

  constructor(options: TyloLensOptions) {
    this.app = options.app;
    this.pricing = options.pricing;
    this.tokenEstimator = options.tokenEstimator ?? estimateTokens;
    this.autoStartTrace = options.autoStartTrace ?? true;
    this.autoFlushOnExport = options.autoFlushOnExport ?? false;
    this.ethics = {
      redactPII: options.ethics?.redactPII ?? true,
      redactionMode: options.ethics?.redactionMode ?? 'mask',
      capture: {
        prompts: options.ethics?.capture?.prompts ?? true,
        outputs: options.ethics?.capture?.outputs ?? true,
      },
      piiEvidence: {
        enabled: options.ethics?.piiEvidence?.enabled ?? true,
        includeRawMatch: options.ethics?.piiEvidence?.includeRawMatch ?? false,
        contextChars: options.ethics?.piiEvidence?.contextChars ?? 24,
      },
    };

    for (const exporter of options.exporters ?? []) this.addExporter(exporter);
    for (const plugin of options.plugins ?? []) this.use(plugin);
  }

  setTokenEstimator(estimator: (text: string) => number): void {
    this.tokenEstimator = estimator;
  }

  startTrace(): LensTrace {
    const trace: LensTrace = {
      traceId: randomId('trace'),
      app: this.app,
      startedAt: nowIso(),
      spans: [],
    };
    this.trace = trace;
    this.emit({ type: 'trace.start', trace });
    return trace;
  }

  private getActiveTrace(): LensTrace {
    if (!this.trace || this.trace.endedAt) {
      if (!this.autoStartTrace) {
        throw new Error('Trace not started. Call lens.startTrace() or enable autoStartTrace.');
      }
      return this.startTrace();
    }
    return this.trace;
  }

  getTrace(): LensTrace {
    if (!this.trace) {
      if (!this.autoStartTrace) {
        throw new Error('Trace not started. Call lens.startTrace() or enable autoStartTrace.');
      }
      return this.startTrace();
    }
    return this.trace;
  }

  endTrace(): LensTrace {
    const trace = this.getTrace();
    if (!trace.endedAt) trace.endedAt = nowIso();
    this.emit({ type: 'trace.end', trace });
    return trace;
  }

  exportTrace(): LensTrace {
    const trace = this.endTrace();
    this.emit({ type: 'export', trace });
    if (this.autoFlushOnExport) void this.flush(trace);
    return trace;
  }

  async exportAndFlush(): Promise<LensTrace> {
    const trace = this.exportTrace();
    await this.flush(trace);
    return trace;
  }

  async flush(trace?: LensTrace): Promise<void> {
    const t = trace ?? this.getTrace();
    for (const exporter of this.exporters) {
      try {
        await exporter.export(t);
      } catch (err) {
        // Best-effort: exporters should never crash the host app.
        // eslint-disable-next-line no-console
        console.warn(`[tylo-lens] exporter "${exporter.name}" failed:`, err);
      }
    }
  }

  addExporter(exporter: LensExporter): void {
    this.exporters.push(exporter);
  }

  use(plugin: LensPlugin): void {
    const ctx: LensPluginContext = {
      on: this.on.bind(this),
      addExporter: this.addExporter.bind(this),
      startTrace: this.startTrace.bind(this),
      getTrace: this.getTrace.bind(this),
      endTrace: this.endTrace.bind(this),
      exportTrace: this.exportTrace.bind(this),
      flush: this.flush.bind(this),
      exportAndFlush: this.exportAndFlush.bind(this),
      setTokenEstimator: this.setTokenEstimator.bind(this),
      startSpan: this.startSpan.bind(this),
    };

    const dispose = plugin.setup(ctx);
    if (typeof dispose === 'function') this.pluginDisposers.push(dispose);
  }

  dispose(): void {
    for (const fn of this.pluginDisposers.splice(0)) {
      try {
        fn();
      } catch {
        // ignore
      }
    }
    this.listeners.clear();
    this.exporters.length = 0;
  }

  on<T extends LensEventType>(type: T, handler: LensEventHandler<T>): () => void {
    const set = this.listeners.get(type) ?? new Set<(event: LensEvent) => void>();
    set.add(handler as any);
    this.listeners.set(type, set);
    return () => {
      const current = this.listeners.get(type);
      if (!current) return;
      current.delete(handler as any);
      if (current.size === 0) this.listeners.delete(type);
    };
  }

  private emit(event: LensEvent): void {
    const set = this.listeners.get(event.type);
    if (!set || set.size === 0) return;
    for (const handler of set) {
      try {
        handler(event);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[tylo-lens] listener for "${event.type}" failed:`, err);
      }
    }
  }

  startSpan(start: LensSpanStart): LensSpanHandle {
    const trace = this.getActiveTrace();
    const startMs = Date.now();
    const parentId = start.parentId ?? (this.spanStack.length ? this.spanStack[this.spanStack.length - 1] : undefined);

    const span: LensSpan = {
      id: randomId(start.kind),
      traceId: trace.traceId,
      parentId,
      kind: start.kind,
      name: start.name,
      model: start.model,
      startTime: nowIso(),
      input: start.input,
      meta: start.meta,
    };

    trace.spans.push(span);
    this.emit({ type: 'span.start', trace, span });
    this.spanStack.push(span.id);

    const update = (updateData: LensSpanUpdate) => {
      if (!updateData) return;

      if (updateData.output) {
        const prev = span.output ?? {};
        const next: any = { ...prev, ...updateData.output };
        if (updateData.output.response) {
          next.response = { ...(prev as any).response, ...(updateData.output.response as any) };
        }
        span.output = next;
      }

      if (updateData.usage) {
        const base = span.usage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
        const next = { ...base, ...updateData.usage };
        if (updateData.usage.totalTokens == null) next.totalTokens = next.inputTokens + next.outputTokens;
        span.usage = next;
      }

      if (updateData.analysis) span.analysis = { ...(span.analysis ?? {}), ...updateData.analysis };
      if (updateData.meta) span.meta = { ...(span.meta ?? {}), ...updateData.meta };

      this.emit({ type: 'span.update', trace, span, update: updateData });
    };

    const end = (endData?: LensSpanEnd) => {
      const endMs = Date.now();
      span.endTime = nowIso();
      span.durationMs = durationMs(startMs, endMs);
      if (endData?.output) span.output = endData.output;
      if (endData?.usage) span.usage = endData.usage;
      if (endData?.cost) span.cost = endData.cost;
      if (endData?.safety) span.safety = endData.safety;
      if (endData?.analysis) span.analysis = endData.analysis;
      if (endData?.meta) span.meta = { ...(span.meta ?? {}), ...endData.meta };
      if (endData?.error) {
        span.meta = { ...(span.meta ?? {}), error: endData.error instanceof Error ? endData.error.message : String(endData.error) };
      }
      const last = this.spanStack[this.spanStack.length - 1];
      if (last === span.id) this.spanStack.pop();
      else {
        const idx = this.spanStack.lastIndexOf(span.id);
        if (idx >= 0) this.spanStack.splice(idx, 1);
      }
      this.emit({ type: 'span.end', trace, span });
    };

    return { span, update, end };
  }

  async withSpan<T>(start: LensSpanStart, fn: () => Promise<T> | T): Promise<T> {
    const handle = this.startSpan(start);
    try {
      const out = await fn();
      handle.end();
      return out;
    } catch (err) {
      handle.end({ error: err });
      throw err;
    }
  }

  wrapFetch(fetchImpl: typeof fetch, options?: Omit<FetchInterceptorOptions, 'trace' | 'getParentId' | 'parentId'>) {
    const trace = this.getActiveTrace();
    return createFetchInterceptor(fetchImpl, {
      trace,
      ...options,
      getParentId: () => (this.spanStack.length ? this.spanStack[this.spanStack.length - 1] : undefined),
      onSpanStart: (span) => this.emit({ type: 'span.start', trace, span }),
      onSpanUpdate: (span) => this.emit({ type: 'span.update', trace, span, update: { output: span.output } }),
      onSpanEnd: (span) => this.emit({ type: 'span.end', trace, span }),
    });
  }

  wrapMCP<T extends MCPClientLike>(
    client: T,
    options?: Omit<MCPInterceptorOptions, 'trace' | 'getParentId' | 'parentId'>,
  ) {
    const trace = this.getActiveTrace();
    return wrapMCPClient(client, {
      trace,
      ...options,
      getParentId: () => (this.spanStack.length ? this.spanStack[this.spanStack.length - 1] : undefined),
      onSpanStart: (span) => this.emit({ type: 'span.start', trace, span }),
      onSpanEnd: (span) => this.emit({ type: 'span.end', trace, span }),
    });
  }

  installXHR(options?: Omit<XHRInterceptorOptions, 'trace' | 'getParentId' | 'parentId'>) {
    const trace = this.getActiveTrace();
    return installXHRInterceptor({
      trace,
      ...options,
      getParentId: () => (this.spanStack.length ? this.spanStack[this.spanStack.length - 1] : undefined),
      onSpanStart: (span) => this.emit({ type: 'span.start', trace, span }),
      onSpanEnd: (span) => this.emit({ type: 'span.end', trace, span }),
    });
  }

  wrapLLM<TInput extends WrapLLMInput, TResult extends WrapLLMResult>(
    model: string,
    fn: (input: TInput) => Promise<TResult> | TResult,
    options?: WrapLLMOptions,
  ) {
    const name = options?.name ?? 'llm.call';
    return async (input: TInput): Promise<TResult> => {
      const capture = {
        prompts: options?.capture?.prompts ?? this.ethics.capture.prompts,
        outputs: options?.capture?.outputs ?? this.ethics.capture.outputs,
      };

      const rawPrompt = typeof input?.prompt === 'string' ? input.prompt : '';
      const promptText =
        capture.prompts && rawPrompt
          ? this.ethics.redactPII
            ? redactPII(rawPrompt, this.ethics.redactionMode)
            : rawPrompt
          : capture.prompts
            ? rawPrompt
            : undefined;

      const handle = this.startSpan({
        kind: 'llm',
        name,
        model,
        input: {
          prompt: promptText,
          messages: input?.messages,
        },
        meta: options?.meta,
      });
      const span = handle.span;
      try {
        const result = await fn(input);

        const outputTextCandidate =
          typeof (result as any)?.outputText === 'string'
            ? ((result as any).outputText as string)
            : typeof (result as any)?.text === 'string'
              ? ((result as any).text as string)
              : '';

        const outputText =
          capture.outputs && outputTextCandidate
            ? this.ethics.redactPII
              ? redactPII(outputTextCandidate, this.ethics.redactionMode)
              : outputTextCandidate
            : capture.outputs
              ? outputTextCandidate
              : undefined;

        const usage = normalizeUsage((result as any)?.usage, rawPrompt ?? '', outputTextCandidate ?? '', this.tokenEstimator);
        const cost = computeCost(model, usage, this.pricing);
        const safety = safetyForText(rawPrompt ?? '', outputTextCandidate ?? '', {
          redactionMode: this.ethics.redactionMode,
          piiEvidence: this.ethics.piiEvidence,
        });
        handle.end({ output: { text: outputText }, usage, cost, safety });

        return result;
      } catch (err) {
        handle.end({ error: err });
        throw err;
      }
    };
  }
}
