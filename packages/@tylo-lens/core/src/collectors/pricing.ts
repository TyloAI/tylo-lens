import type { LensCost, LensPricingTable, LensUsage } from '../types.js';

export function computeCost(model: string | undefined, usage: LensUsage, table?: LensPricingTable): LensCost {
  const fallback: LensCost = {
    currency: 'USD',
    total: 0,
    input: 0,
    output: 0,
  };
  if (!model) return fallback;
  const pricing = table?.[model];
  if (!pricing) return fallback;

  const currency = pricing.currency ?? 'USD';
  const input = (usage.inputTokens / 1000) * pricing.pricePer1KInput;
  const output = (usage.outputTokens / 1000) * pricing.pricePer1KOutput;
  const total = input + output;

  return {
    currency,
    input,
    output,
    total,
    pricePer1KInput: pricing.pricePer1KInput,
    pricePer1KOutput: pricing.pricePer1KOutput,
  };
}

