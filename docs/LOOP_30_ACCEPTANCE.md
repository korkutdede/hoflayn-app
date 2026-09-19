# Loop 30 acceptance — Closed Beta Smoke Checklist

## Smoke surfaces

| Kind | What |
|------|------|
| Docs | `docs/BETA_SMOKE.md` — auth, invite, studio, products, stock, sales, billing, usage, home |
| Script | `npm run beta:smoke` → env/DB/health GO/NO-GO + manual checklist print |
| Gates | `npm run beta:smoke -- --gates` → typecheck, lint, build, mobile, expo export |
| Dry-run | `npm run beta:smoke -- --dry-run` → checklist only |

## Commands

```text
npm run beta:smoke -- --dry-run
npm run beta:smoke
npm run beta:smoke -- --gates
npm test
npm run typecheck
npm run lint
npm run build
npm run mobile:typecheck
npm run mobile:lint
npm exec --workspace mobile -- expo export --platform web
```

## Out of scope

New product features, device-farm E2E.

## Loop 31 prompt (do not run until Loop 30 accepted)

Accepted → see `docs/LOOP_31_ACCEPTANCE.md`.
