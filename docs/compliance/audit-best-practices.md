# AI ethics audit best practices

Tylo-Lens is built for transparency, but **transparency is a process**, not a feature.
This guide is a pragmatic checklist for teams running LLM/agent systems in production.

## 1) Decide what you are auditing

Examples:

- Prompt injection exposure
- PII/secret leakage
- Model/tool misuse (unsafe tools)
- Excessive token spend / runaway loops
- Latency regressions and timeouts

Write down:

- what “good” looks like
- what “unacceptable” looks like
- who owns the response when issues are found

## 2) Default to minimization

Unless you have explicit consent:

- do **not** store raw prompts/outputs
- store **hashes** or **redacted samples** only
- keep short retention windows (e.g., 7–30 days)

## 3) Separate “observability” from “content”

You can get a lot of value from:

- token counts
- latency distributions
- model/tool call topology
- error rates and retries

…without storing full content.

## 4) Treat PII scanners as signals

Regex PII detection (like Tylo-Lens) can produce false positives/negatives.
Recommended approach:

- use it as a trigger for review
- add allowlists/denylists for your org’s secrets
- validate with stronger detectors in sensitive environments

## 5) Make access auditable

If you store any content:

- require authentication for dashboards
- log access events (who viewed what, when)
- implement role-based access controls (RBAC)

## 6) Make failures visible

Audits need failure data:

- tool failures
- model errors
- timeouts
- partial outputs

Ensure spans record error status in a privacy-safe way.

## 7) Add a human-in-the-loop path

Define:

- how reviewers are notified
- what data they can see
- how redactions are handled

## 8) Publish your standards

If you want trust, publish:

- capture defaults
- retention policy
- redaction policy
- incident response workflow

This is the spirit of **Protoethik**.

