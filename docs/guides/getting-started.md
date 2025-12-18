# Getting Started

Tylo-Lens is a monorepo with a core SDK + a Next.js dashboard.

## Prerequisites

- Node.js 18+ (Node.js 20 recommended)
- pnpm 9+

## Install

```bash
pnpm install
```

## Run the dashboard

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Deploy (Vercel)

This repo is a monorepo. On Vercel:

1. Import the Git repository
2. Set **Root Directory** to `@protoethik-ai/protoethik-ai/dashboard`
3. Deploy

## Send a trace

The dashboard exposes an ingestion endpoint:

- `POST /api/ingest`

Send any `LensTrace` JSON produced by `@protoethik-ai/core`.
