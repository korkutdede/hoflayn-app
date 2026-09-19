# Hoflayn Web Bridge Contract

Minimal integration between **hoflayn.app** (Next.js workbench) and
**[hoflayn.com](https://hoflayn.com)** (PHP marketplace / academy).

Identity is **email**, not a shared database. See
[`ADR-016-marketplace-identity.md`](ADR-016-marketplace-identity.md).

Principles (P6 / ADR-006):

- PHP is not migrated.
- App → marketplace is the primary write path.
- First-request identity link by **exact seller email**, persisted on PHP.
- Images are passed as **signed URLs** (PHP should pull once into its own storage).

## App → PHP: create / upsert product

### Endpoint (PHP)

```
POST /integrations/hoflayn-bridge/product-create.php
```

Or any single URL pointed to by `HOFLAYN_WEB_BRIDGE_URL`.

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | yes | `application/json` |
| `X-API-Key` | yes | Shared secret (`HOFLAYN_WEB_BRIDGE_API_KEY`) |
| `X-Idempotency-Key` | yes | `{tenantId}:{productId}` |
| `X-Request-Id` | yes | Unique network attempt UUID |
| `X-Bridge-Payload-Hash` | yes | Stable SHA-256 for change tracking |
| `X-Bridge-Timestamp` | optional | Unix timestamp when HMAC is enabled |
| `X-Bridge-Signature` | optional | `sha256=HMAC-SHA256(timestamp + "." + rawBody)` |

### Request body

```json
{
  "contractVersion": "1",
  "source": "hoflayn.app",
  "operation": "upsert",
  "idempotencyKey": "11111111-1111-1111-1111-111111111111:22222222-2222-2222-2222-222222222222",
  "requestId": "44444444-4444-4444-4444-444444444444",
  "sentAt": "2026-08-29T09:00:00.000Z",
  "tenant": {
    "id": "11111111-1111-1111-1111-111111111111",
    "slug": "kil-form-a1b2c3",
    "name": "Kil & Form",
    "email": "producer@example.com",
    "craftCategory": "ceramics"
  },
  "product": {
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "Mat glaze kase",
    "description": "El şekillendirme…",
    "price": "450.00",
    "stockQuantity": 3,
    "category": "ceramics",
    "tags": ["seramik", "kase"],
    "sku": "KASE-001",
    "barcodeValue": "KASE-001",
    "barcodeFormat": "code128",
    "dimensions": {
      "lengthCm": "20.00",
      "widthCm": "20.00",
      "heightCm": "10.00",
      "weightKg": "0.800"
    },
    "updatedAt": "2026-08-29T08:59:00.000Z",
    "images": [
      {
        "mediaAssetId": "33333333-3333-3333-3333-333333333333",
        "url": "https://….supabase.co/storage/v1/object/sign/…",
        "isCover": true
      }
    ]
  }
}
```

### Success response (2xx)

```json
{
  "ok": true,
  "externalId": 98765,
  "status": "pending",
  "message": "Queued for admin review"
}
```

- `status`: `pending` (admin queue), `published`, `rejected`, or `archived`.
- `externalId`: PHP product / external_products row id (string or number).

### Error response (non-2xx)

```json
{
  "ok": false,
  "message": "Unknown seller email"
}
```

### PHP implementation

This repository has a production-oriented implementation at
`integrations/hoflayn-bridge/product-create.php`. It:

- authenticates the API key and optional HMAC signature;
- links the source tenant to an existing seller by exact email on first use;
- persists the source tenant/product mapping in
  `hoflayn_bridge_links`;
- creates or updates the existing `products` / `product_details` /
  `product_images` records through the marketplace services;
- downloads signed media before returning success;
- sends every imported product to the existing moderation queue; and
- handles `operation: "archive"` idempotently.

Deploy that file under the web root and set the matching secrets from
`admin/includes/secrets.local.example.php`.

## PHP → App: status webhook

### Endpoint (Next.js)

```
POST https://hoflayn.app/api/bridge/webhook/hoflayn-web
```

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | yes | `application/json` |
| `X-Bridge-Secret` | if configured | `HOFLAYN_WEB_BRIDGE_WEBHOOK_SECRET` |
| `X-Bridge-Timestamp` | if HMAC configured | Unix timestamp |
| `X-Bridge-Signature` | if HMAC configured | Signed raw request body |

### Body

```json
{
  "productId": "22222222-2222-2222-2222-222222222222",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "externalId": "98765",
  "status": "published",
  "message": null
}
```

`status` ∈ `pending` | `published` | `rejected` | `failed` | `archived`.

### Response

```json
{
  "ok": true,
  "syncLinkId": "…",
  "status": "published",
  "externalId": "98765"
}
```

## Env (hoflayn.app)

```env
HOFLAYN_WEB_BRIDGE_URL="https://hoflayn.com/integrations/hoflayn-bridge/product-create.php"
HOFLAYN_WEB_BRIDGE_API_KEY="shared-secret"
HOFLAYN_WEB_BRIDGE_SIGNING_SECRET="shared-secret"
HOFLAYN_WEB_BRIDGE_WEBHOOK_SECRET="shared-secret"
# PHP: WEBHOOK_URL=https://hoflayn.app/api/bridge/webhook/hoflayn-web
# PHP: DEFAULT_CATEGORY_ID=2
```

Without these, the product UI still renders; export returns a clear configuration error.

## Product lifecycle

The first integration is intentionally one-way:

```
Hoflayn draft
  -> POST upsert
  -> Hoflayn Web pending moderation
  -> webhook published | rejected
  -> optional POST archive
```

Hoflayn remains the source of truth for product content. Hoflayn Web stores a
published projection and must never call the Hoflayn database directly.

The mobile and web clients call only:

```
POST   /api/v1/products/{productId}/bridge       # upsert / publish
GET    /api/v1/products/{productId}/bridge       # current state
DELETE /api/v1/products/{productId}/bridge       # archive the listing
```

All three routes require an authenticated Hoflayn session and an owner/admin
membership. A member can view product data but cannot publish or archive it.

## Current payload additions

The payload remains JSON and is backward-compatible at the field level. New
bridge-aware PHP implementations should read:

```json
{
  "contractVersion": "1",
  "operation": "upsert",
  "requestId": "uuid-for-this-attempt",
  "sentAt": "2026-08-29T09:00:00.000Z",
  "product": {
    "sku": "KUPA-001",
    "barcodeValue": "KUPA-001",
    "barcodeFormat": "code128",
    "dimensions": {
      "lengthCm": "12.00",
      "widthCm": "9.00",
      "heightCm": "10.00",
      "weightKg": "0.350"
    },
    "updatedAt": "2026-08-29T08:59:00.000Z"
  }
}
```

`operation` is `upsert` for both the first publish and an explicit update.
The stable `idempotencyKey` identifies the Hoflayn product; `requestId`
identifies one network attempt. PHP must upsert by source + tenant + product,
not insert a new row for every retry.

The payload hash stored in `sync_links` deliberately excludes signed image URL
tokens, `requestId`, and `sentAt`. It is therefore safe to use for “local
changes need an update” detection.

## Image handling requirement

The image URL is private and signed. Hoflayn Web must download every image during
the request and store it in its own storage. It must not save the URL for a
later moderation job because signed URLs expire.

If the PHP endpoint queues the product before downloading the image, change the
integration to use a server-to-server media pull endpoint or guarantee that the
download happens before returning the 2xx response.

## Request signing

`X-API-Key` is always sent. When `HOFLAYN_WEB_BRIDGE_SIGNING_SECRET` is set,
Hoflayn additionally sends:

```
X-Bridge-Timestamp: 1787994000
X-Bridge-Signature: sha256=<HMAC-SHA256(timestamp + "." + rawBody)>
X-Request-Id: <uuid>
```

The PHP endpoint should reject timestamps older than five minutes and calculate
the HMAC over the exact raw request body. The webhook endpoint accepts the same
signature format. The legacy `X-Bridge-Secret` webhook header remains accepted
for staged rollout.

## Response contract

For a successful upsert, return:

```json
{
  "ok": true,
  "externalId": 98765,
  "externalUrl": "https://hoflayn.com/urun/98765",
  "status": "pending",
  "message": "Queued for admin review"
}
```

For an archive:

```json
{
  "ok": true,
  "externalId": 98765,
  "status": "archived"
}
```

`status` must be one of `pending`, `published`, `rejected`, `failed`, or
`archived`. Non-2xx responses must include a short JSON `message`; Hoflayn
stores it as the last error and exposes a retry action.

## Webhook examples

Published:

```json
{
  "productId": "22222222-2222-2222-2222-222222222222",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "externalId": "98765",
  "externalUrl": "https://hoflayn.com/urun/98765",
  "status": "published",
  "message": null
}
```

Rejected:

```json
{
  "productId": "22222222-2222-2222-2222-222222222222",
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "externalId": "98765",
  "status": "rejected",
  "message": "Görsel arka planı ve ürün açıklaması yetersiz."
}
```

Webhook delivery must be idempotent. Sending the same status more than once
must update the same `sync_links` row and must not create a new product.

## PHP implementation checklist

1. Verify `X-API-Key`; in the signed rollout also verify timestamp and HMAC.
2. Parse and validate `contractVersion`, tenant ID, product ID, name, price,
   category, and at least one image.
3. Resolve the seller using the approved tenant mapping. Email can be used as
   a migration fallback, but should not be the only permanent identity link.
4. Upsert the external product using `source`, `tenant.id`, and `product.id`.
5. Download signed images before returning 2xx.
6. Put the row in the admin moderation queue with `pending` status.
7. Return the same `externalId` for every retry.
8. On moderation, POST the status webhook to
   `/api/bridge/webhook/hoflayn-web`.
9. Keep the webhook retry-safe and send `externalUrl` when available.

The PHP marketplace code is not present in this repository, so step 4 and the
seller mapping must be implemented on `hoflayn.com` before a production
end-to-end test. The Hoflayn side is intentionally configured to fail clearly
when the endpoint or shared secrets are missing.
