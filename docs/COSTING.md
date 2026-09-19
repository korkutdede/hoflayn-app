# AI Costing & Credit Margin

Last calibrated: 2026-07-26 · Currency: USD · Target gross margin: **≥ 50%**

## Revenue per credit (reference)

| Source | Price | Credits | Revenue / credit |
|--------|------:|--------:|-----------------:|
| Pro subscription | $24.99/mo | 900 | **$0.0278** |
| Pack 50 | $4.99 | 50 | $0.0998 |
| Pack 200 | $14.99 | 200 | $0.07495 |

**Conservative basis for margin:** Pro blended **$0.0278 / credit**  
(Free tier is CAC — not used for margin math. Free gets welcome credits only;
no automatic monthly free renewal — see `docs/ROADMAP.md` §A1.)

## Operation table

| Operation | Est. provider USD | Credits (code) | Revenue @ Pro | Gross margin | Decision |
|-----------|------------------:|---------------:|--------------:|-------------:|----------|
| `remove_bg` | $0.0036 (Replicate rembg) | **1** | $0.0278 | **~87%** | Keep 1 |
| `white_bg` | $0.0036 (rembg + Sharp $0) | **1** | $0.0278 | **~87%** | Keep 1 |
| `analyze_product_image` | $0.0010 (gpt-4o-mini low-detail vision) | **1** | $0.0278 | **~96%** | Start at 1 |
| `generate_description` | $0.0025 (gpt-4o-mini JSON) | **2** | $0.0556 | **~95%** | Keep 2 |
| `generate_caption` | $0.0015 (gpt-4o-mini JSON) | **2** | $0.0556 | **~97%** | Start at 2 |
| `analyze_seo` | $0.0020 (gpt-4o-mini JSON) | **2** | $0.0556 | **~96%** | Start at 2 |
| `generate_catalog` | $0.0010 (pdfkit + storage) | **1** | $0.0278 | **~96%** | Start at 1 |
| `generate_labels` | $0.0008 (bwip-js + pdfkit) | **1** | $0.0278 | **~97%** | Start at 1 |

All operations clear the 50% floor by a wide margin on Pro pricing.  
On pack pricing, margins are even higher.

### Recommendations (not applied — margin already OK)

| If… | Then consider |
|-----|----------------|
| rembg rises above **$0.014** | Raise `remove_bg` / `white_bg` to **2** credits |
| Lifestyle/SDXL (~$0.03–0.08) ships | Start at **5–8** credits |
| Free abuse (welcome 3 credits) burns cash | Soft watermark / lower res on free (product, not credit table) |

## Soft / hard USD caps (tenant)

| Env | Default | Behavior |
|-----|--------:|----------|
| `HOURLY_TENANT_USD_CAP` | `5` | Hard reject new AI jobs when rolling 1h `ai_usage_logs` ≥ cap |
| `DAILY_TENANT_USD_CAP` | `20` | Hard reject when rolling 24h ≥ cap |
| `SOFT_HOURLY_TENANT_USD_CAP` | `80%` of hourly | Log warning only |
| `SOFT_DAILY_TENANT_USD_CAP` | `80%` of daily | Log warning only |

Caps are **provider USD** (from usage logs), not credit face value.

## Variance monitoring

`processAiJob` compares `estimatedCostUsd` vs logged `costUsd`.  
Warn when `actual/estimate` ∉ `[0.25, 2.0]` (model drift / mispricing signal).
