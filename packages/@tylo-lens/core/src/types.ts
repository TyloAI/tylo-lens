export type LensEnvironment = 'dev' | 'staging' | 'prod' | (string & {});

export type LensAppInfo = {
  name: string;
  environment?: LensEnvironment;
  version?: string;
};

export type LensSpanKind = 'llm' | 'http' | 'mcp' | 'tool';

export type LensUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type LensCost = {
  currency: 'USD' | (string & {});
  total: number;
  input: number;
  output: number;
  pricePer1KInput?: number;
  pricePer1KOutput?: number;
};

export type LensPiiFindingType =
  | 'email'
  | 'phone'
  | 'credit_card'
  | 'ssn'
  | 'ip_address'
  | 'api_key';

export type LensPiiFinding = {
  type: LensPiiFindingType;
  count: number;
};

export type LensPiiEvidenceField = 'prompt' | 'output';

export type LensPiiEvidence = {
  field: LensPiiEvidenceField;
  type: LensPiiFindingType;
  start: number;
  end: number;
  before: string;
  after: string;
  contextBefore: string;
  contextAfter: string;
};

export type LensSafety = {
  pii: {
    findings: LensPiiFinding[];
    hasFindings: boolean;
    evidence?: LensPiiEvidence[];
  };
  risk: 'low' | 'medium' | 'high';
};

export type LensSpanInput = {
  prompt?: string;
  messages?: unknown;
  request?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
  };
};

export type LensSpanOutput = {
  text?: string;
  response?: {
    status: number;
    headers?: Record<string, string>;
    body?: string;
  };
};

export type LensSpan = {
  id: string;
  traceId: string;
  parentId?: string;
  kind: LensSpanKind;
  name: string;
  model?: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  input?: LensSpanInput;
  output?: LensSpanOutput;
  usage?: LensUsage;
  cost?: LensCost;
  safety?: LensSafety;
  analysis?: LensSpanAnalysis;
  meta?: Record<string, unknown>;
};

export type LensTrace = {
  traceId: string;
  app: LensAppInfo;
  startedAt: string;
  endedAt?: string;
  spans: LensSpan[];
  analysis?: LensTraceAnalysis;
};

export type LensSpanAnalysis = {
  clarity?: number; // 0..1
  piiCount?: number;
  piiDensity?: number; // findings per token
  tokens?: number;
  tscoreContribution?: number;
};

export type ProtoethikWeights = {
  clarity: number;
  pii: number;
};

export type ProtoethikTransparency = {
  score: number;
  scoreScaled: number; // 0..100 (derived)
  tokens: number;
  claritySum: number;
  piiPenaltySum: number;
  weights: ProtoethikWeights;
  formula: string;
};

export type LensTraceAnalysis = {
  transparency?: ProtoethikTransparency;
};

export type LensRedactionMode = 'none' | 'mask' | 'hash';

export type LensCaptureConfig = {
  prompts: boolean;
  outputs: boolean;
};

export type LensEthicsConfig = {
  redactPII?: boolean;
  redactionMode?: LensRedactionMode;
  capture?: Partial<LensCaptureConfig>;
  piiEvidence?: {
    enabled?: boolean;
    includeRawMatch?: boolean;
    contextChars?: number;
  };
};

export type LensPricingTable = Record<
  string,
  {
    currency?: 'USD' | (string & {});
    pricePer1KInput: number;
    pricePer1KOutput: number;
  }
>;

export type LensEvent =
  | { type: 'trace.start'; trace: LensTrace }
  | { type: 'trace.end'; trace: LensTrace }
  | { type: 'span.start'; trace: LensTrace; span: LensSpan }
  | { type: 'span.update'; trace: LensTrace; span: LensSpan; update?: LensSpanUpdate }
  | { type: 'span.end'; trace: LensTrace; span: LensSpan }
  | { type: 'export'; trace: LensTrace };

export type LensEventType = LensEvent['type'];

export type LensEventHandler<T extends LensEventType> = (event: Extract<LensEvent, { type: T }>) => void;

export type LensExporter = {
  name: string;
  export: (trace: LensTrace) => void | Promise<void>;
};

export type LensPluginContext = {
  on: <T extends LensEventType>(type: T, handler: LensEventHandler<T>) => () => void;
  addExporter: (exporter: LensExporter) => void;
  startTrace: () => LensTrace;
  getTrace: () => LensTrace;
  endTrace: () => LensTrace;
  exportTrace: () => LensTrace;
  flush: (trace?: LensTrace) => Promise<void>;
  exportAndFlush: () => Promise<LensTrace>;
  setTokenEstimator: (estimator: (text: string) => number) => void;
  startSpan: (start: LensSpanStart) => LensSpanHandle;
};

export type LensPlugin = {
  name: string;
  setup: (ctx: LensPluginContext) => void | (() => void);
};

export type LensSpanStart = {
  kind: LensSpanKind;
  name: string;
  model?: string;
  parentId?: string;
  input?: LensSpanInput;
  meta?: Record<string, unknown>;
};

export type LensSpanEnd = {
  output?: LensSpanOutput;
  usage?: LensUsage;
  cost?: LensCost;
  safety?: LensSafety;
  analysis?: LensSpanAnalysis;
  meta?: Record<string, unknown>;
  error?: unknown;
};

export type LensSpanUpdate = {
  output?: Partial<LensSpanOutput>;
  usage?: Partial<LensUsage>;
  meta?: Record<string, unknown>;
  analysis?: Partial<LensSpanAnalysis>;
};

export type LensSpanHandle = {
  span: LensSpan;
  update: (update: LensSpanUpdate) => void;
  end: (end?: LensSpanEnd) => void;
};

export type TyloLensOptions = {
  app: LensAppInfo;
  ethics?: LensEthicsConfig;
  pricing?: LensPricingTable;
  tokenEstimator?: (text: string) => number;
  plugins?: LensPlugin[];
  exporters?: LensExporter[];
  autoStartTrace?: boolean;
  autoFlushOnExport?: boolean;
};

export type WrapLLMResult =
  | {
      outputText?: string;
      usage?: Partial<LensUsage> & { inputTokens?: number; outputTokens?: number; totalTokens?: number };
      [key: string]: unknown;
    }
  | unknown;
