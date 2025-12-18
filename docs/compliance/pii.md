# PII detection & compliance

Tylo-Lens includes a lightweight, dependency-free PII scanner:

- email
- phone
- credit card (pattern-only)
- SSN
- IP address
- API key-like tokens

## Important

- Regex detection can produce false positives.
- For credit cards, add Luhn validation for higher accuracy.
- Treat this as a **signal** for audits, not an authoritative classifier.

## Recommended defaults

- enable redaction in production
- avoid storing raw prompts/outputs
- apply retention policies and access controls

