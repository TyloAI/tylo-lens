# Dashboard guide (`@protoethik-ai/dashboard`)

The dashboard is a minimal Next.js app that:

- Accepts traces via `POST /api/ingest`
- Streams traces via Server-Sent Events `GET /api/stream`
- Renders trace graphs and tables using `@protoethik-ai/ui`

## Production notes

- Persist traces to a real database (Postgres, ClickHouse, etc).
- Add authentication (JWT / OAuth / SSO).
- Store prompts/outputs only with explicit consent and retention policies.

