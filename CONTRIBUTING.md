# Contributing to Tylo-Lens

Thanks for your interest in contributing!

## Development setup

1. Install Node.js (>= 18) and pnpm.
2. Install deps: `pnpm install`
3. Run dashboard: `pnpm dev`

## Repo structure

- `packages/@tylo-lens/core` — SDK for intercepting calls + collecting metrics
- `packages/@tylo-lens/ui` — shared UI components/design tokens
- `packages/@tylo-lens/dashboard` — Next.js dashboard application
- `packages/@tylo-lens/provider-*` — provider wrappers (community-friendly)
- `examples/*` — integration examples
- `docs/*` — documentation sources
- `rfcs/*` — Request for Comments (protocol / schema changes)

## Guidelines

- Prefer small, focused PRs.
- Add tests for changes in `@tylo-lens/core`.
- Keep public APIs documented in README and package docs.
- Avoid logging prompts/outputs in production without user consent.

## RFCs (breaking changes)

If you propose a breaking change to:

- trace schema (`LensTrace`, `LensSpan`)
- plugin lifecycle events
- MCP semantics

Please write an RFC first: `rfcs/README.md`.

## Code of Conduct

Be respectful and inclusive. Harassment and abusive behavior are not tolerated.
