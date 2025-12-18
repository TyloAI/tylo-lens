import type { LensTrace } from '../types.js';

export function generateComplianceReport(trace: LensTrace): string {
  const spans = trace.spans;
  const totalTokens = spans.reduce((sum, s) => sum + (s.usage?.totalTokens ?? 0), 0);
  const totalCost = spans.reduce((sum, s) => sum + (s.cost?.total ?? 0), 0);
  const pii = spans.flatMap((s) => s.safety?.pii.findings ?? []);
  const piiByType = pii.reduce<Record<string, number>>((acc, f) => {
    acc[f.type] = (acc[f.type] ?? 0) + f.count;
    return acc;
  }, {});

  const hasAnyPII = Object.keys(piiByType).length > 0;

  const lines: string[] = [];
  lines.push(`# Tylo-Lens Compliance Report`);
  lines.push('');
  lines.push(`- Trace ID: \`${trace.traceId}\``);
  lines.push(`- App: **${trace.app.name}**`);
  if (trace.app.environment) lines.push(`- Environment: \`${trace.app.environment}\``);
  lines.push(`- Started: \`${trace.startedAt}\``);
  if (trace.endedAt) lines.push(`- Ended: \`${trace.endedAt}\``);
  lines.push('');
  lines.push(`## Summary`);
  lines.push(`- Spans: **${spans.length}**`);
  lines.push(`- Total tokens (estimated/declared): **${totalTokens}**`);
  lines.push(`- Total cost (estimated): **${totalCost.toFixed(6)}**`);
  lines.push('');
  lines.push(`## PII Findings`);
  if (!hasAnyPII) {
    lines.push(`No PII patterns detected.`);
  } else {
    for (const [type, count] of Object.entries(piiByType)) {
      lines.push(`- ${type}: **${count}**`);
    }
    lines.push('');
    lines.push(`> Note: Regex-based detection can generate false positives. Treat this as a signal, not a verdict.`);
  }
  lines.push('');
  lines.push(`## Recommendations`);
  lines.push(`- Default to redaction in production environments.`);
  lines.push(`- Avoid storing raw prompts/outputs unless users explicitly consent.`);
  lines.push(`- Add allowlists/denylists for org-specific secrets (API keys, internal IDs).`);
  return lines.join('\n');
}

