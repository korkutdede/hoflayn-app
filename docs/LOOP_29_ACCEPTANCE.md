# Loop 29 acceptance — Beta Invite Gate Polish

## Invite flow (email allowlist — not invite codes)

Hoflayn kapalı beta **davetli e-posta** ile çalışır (`ALLOWLIST_EMAILS`).

| Step | Behavior |
|------|----------|
| Welcome | Demo = “Uygulamayı keşfet”; kayıt = “Davetli hesap oluştur” |
| `GET /api/v1/invite/check` | `{ gate: open\|allowlist\|closed, remaining? }` |
| Signup | “Daveti kontrol et” → `POST` email; sonra hesap oluştur |
| Demo | Invite gerekmez; kayıt ile ayrılır |

### Error codes (TR)

| Code | When |
|------|------|
| `invalid_email` | Format geçersiz |
| `invite_required` | Allowlist açık, e-posta listede değil |
| `invite_closed` | `BETA_SIGNUPS_CLOSED=true` |
| `invite_exhausted` | `BETA_MAX_TENANTS` dolu |

## What shipped

- Pure gate: `checkInviteEmail` + capacity/closed flags
- Service: `verifyInviteEmail`, `getInviteGateStatus`
- API GET+POST `/api/v1/invite/check`
- Mobile signup polish + welcome CTA copy
- Web `signUpAction` uses async verify
- Tests: `tests/invite-gate.test.ts`
- `.env.example`: `BETA_SIGNUPS_CLOSED`, `BETA_MAX_TENANTS`

## Automated acceptance

```text
npm test
npm run typecheck
npm run lint
npm run build
npm run mobile:typecheck
npm run mobile:lint
npm exec --workspace mobile -- expo export --platform web
```

## Manual mobile acceptance

1. Welcome → Davetli hesap oluştur vs Uygulamayı keşfet ayrımı net.
2. Listede olmayan e-posta → invite_required mesajı.
3. Daveti kontrol et → başarı / hata.
4. Demo ile kayıt gerekmeden gezin.

## Out of scope

Referral program, email campaigns, new growth loops.

## Loop 30 prompt (do not run until Loop 29 accepted)

Accepted → see `docs/LOOP_30_ACCEPTANCE.md`.
