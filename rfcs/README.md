# Tylo-Lens RFCs

This folder documents **Request for Comments (RFCs)** for changes that impact:

- the trace schema (events, span structure, compatibility)
- the plugin API (breaking changes, new lifecycle hooks)
- MCP-related semantics (new event types, tool/agent modeling)
- privacy/security defaults (redaction rules, storage guidance)

## Why RFCs?

Tylo-Lens is a free, open-source project. Our biggest moat is **trust** and **standards**.
RFCs keep the core stable, while letting the ecosystem evolve.

## Process (lightweight)

1. Copy `0000-template.md` → `NNNN-short-title.md`
2. Open a PR labeled `rfc`
3. Discuss in PR comments (and link related issues)
4. Merge when there is consensus; reject with rationale if not

## Status tags

- **draft**: under discussion
- **accepted**: approved, ready to implement
- **implemented**: shipped in main
- **rejected**: not moving forward (keep the record!)

