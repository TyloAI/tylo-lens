import { describe, expect, it } from 'vitest';
import { TyloLens } from '../src/tylo-lens.js';
import { generateComplianceReport } from '../src/ethics/report.js';

describe('TyloLens', () => {
  it('records an LLM span with usage + cost', async () => {
    const lens = new TyloLens({
      app: { name: 'test-app', environment: 'dev' },
      pricing: {
        'openai:gpt-x': { pricePer1KInput: 1, pricePer1KOutput: 2 },
      },
    });

    const call = lens.wrapLLM('openai:gpt-x', async (input: { prompt: string }) => {
      return { outputText: `Echo: ${input.prompt}`, usage: { inputTokens: 1000, outputTokens: 500 } };
    });

    const result = await call({ prompt: 'hello' });
    expect((result as any).outputText).toContain('hello');

    const trace = lens.exportTrace();
    expect(trace.spans.length).toBe(1);
    const span = trace.spans[0]!;
    expect(span.kind).toBe('llm');
    expect(span.model).toBe('openai:gpt-x');
    expect(span.usage?.totalTokens).toBe(1500);
    expect(span.cost?.total).toBeCloseTo(2, 6); // 1*1k + 2*0.5k
  });

  it('generates a compliance report', async () => {
    const lens = new TyloLens({
      app: { name: 'test-app', environment: 'dev' },
    });

    const call = lens.wrapLLM('demo:model', async () => {
      return { outputText: 'Contact me at demo@example.com', usage: { inputTokens: 10, outputTokens: 10 } };
    });

    await call({ prompt: 'hi' });
    const trace = lens.exportTrace();
    const report = generateComplianceReport(trace);
    expect(report).toContain('Compliance Report');
    expect(report).toContain('PII Findings');
  });
});

