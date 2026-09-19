# Loop 16 acceptance

## Production configuration

Required:

- `OPENAI_API_KEY`
- `REPLICATE_API_TOKEN`
- `CRON_SECRET` (random, at least 32 characters)

Optional:

- `OPENAI_TEXT_MODEL` (default `gpt-4o-mini`)
- `OPENAI_TIMEOUT_MS` (default `45000`)
- `REPLICATE_REMBG_VERSION`
- `AI_WORKER_BATCH_SIZE` (default `3`, maximum `10`)
- `AI_WORKER_SECRET` when a non-Vercel scheduler invokes the worker

Do not set `AI_JOBS_INLINE=true` or `ALLOW_MOCK_AI=true` in normal production.

## Automated acceptance

```text
npm run db:migrate
npm test
npm run typecheck
npm run lint
npm run build
npm run mobile:typecheck
npm run mobile:lint
npm exec --workspace mobile -- expo-doctor
npm exec --workspace mobile -- expo export --platform web
npm run ai:providers:check -- --live
```

The final provider command authenticates without running a paid generation.

## Manual mobile acceptance

1. Create a product from a gallery image. Confirm the API can return `pending`
   and the form fills only after the job succeeds.
2. Generate a description. Confirm it is not saved until **Öneriyi ürüne
   uygula** is pressed.
3. Generate each Instagram tone and confirm sharing works.
4. Run both Studio modes. Confirm the result survives as a processed media
   asset, can be shared as a file and can be assigned to an existing product.
5. Temporarily use an invalid provider token in an isolated environment.
   Confirm retries are scheduled and credits stay reserved, then the third
   transient failure becomes `dead_letter` and refunds once.

## Operations

`vercel.json` invokes `GET /api/internal/ai-worker` every minute. Vercel sends
`CRON_SECRET` as a bearer token. A plan limited to daily cron is not sufficient;
use a one-minute external scheduler against the same route or adopt Trigger.dev.
