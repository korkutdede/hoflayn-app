# ADR-016 — Workbench ↔ marketplace identity (no shared database)

## Status

Accepted — 19 September 2026 (Play launch).

## Context

[hoflayn.com](https://hoflayn.com) is the existing PHP marketplace, academy and
community. It stores buyers, sellers and listings in **four MySQL schemas**
(`hoflaync_main`, `hoflaync_akademi`, `hoflaync_custom-order`,
`hoflaync_topluluk`). `hoflaync_main.users` is a bigint + password_hash world;
`companies.id` is what `products.seller_id` points at.

hoflayn.app is a separate **workshop workbench** (Supabase Auth UUID + tenant).
The Android listing will look like “another Hoflayn” unless we explain the
relationship. Long-term we want more makers, then a shared login and a storefront
surface in the app.

Merging those MySQL databases into Supabase (or the reverse) would couple
orders, Iyzico, GİB, academy and community to the workbench launch.

## Decision

### D1. Two bounded contexts stay two databases

Workbench data lives in Supabase. Marketplace data stays in PHP/MySQL. Neither
side queries the other database. This restates ADR-006 / P6.

### D2. The durable identity key is **normalized email**

First product export (already implemented) looks up
`hoflaync_main.users.email` where `user_role = seller`, then uses that user's
`companies.id` as `products.seller_id`. The mapping is persisted in
`hoflayn_bridge_links` (`source_tenant_id` → `seller_id`).

Workbench signup (password or Google) does **not** insert a PHP user. A maker
who only uses the app has no marketplace shop until they register as a seller
on hoflayn.com **with the same email**.

The workbench may reuse the **same Google Cloud web OAuth client** as
hoflayn.com, via Supabase Auth. That is not SSO: Google → Supabase session on
the app, Google → PHP session on the marketplace. Callbacks stay separate
(`…supabase.co/auth/v1/callback` vs
`https://hoflayn.com/functions/core/auth/endpoints/google-callback.php`).

### D3. What ships with Android v1

- Copy that says this app is the **atelier workbench**, not the public shop.
- Deep links to hoflayn.com (browse) and `user-register-seller.php` (become a
  seller with the same email).
- One-way product bridge when env is configured.
- No marketplace product feed inside the app.

### D4. What we explicitly do later (not this release)

| Later | Trigger |
|-------|---------|
| OIDC / magic-link SSO so one Google account opens both | Bridge used by real sellers |
| App home shows *that seller's* published hoflayn.com listings (read API) | Identity link exists for N sellers |
| App chrome that looks like hoflayn.com | After SSO, not before |
| Shared password hashes | Never. PHP bcrypt and Supabase Auth stay separate |

### D5. Academic / community / custom-order schemas are out of the workbench

Those modules keep their own MySQL. The workbench does not join them.

## Consequences

- Play listing and onboarding must not promise “your hoflayn.com shop inside
  this app” today.
- Operators must keep `HOFLAYN_WEB_BRIDGE_*` pointed at
  `https://hoflayn.com/integrations/hoflayn-bridge/product-create.php`.
- A seller who signs up in the app with a *different* email than their shop
  will fail export until they align emails or we add an explicit link UI.
