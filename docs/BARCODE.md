# Barcode encoding notes

## Internal SKU

`code128` and `qr` encode `barcode_value` if set, otherwise `sku`.
Alphanumeric workshop codes are allowed (e.g. `ATOLYE-KUPA-01`).

## GS1-128

`gs1_128` accepts digits only (8–48). Callers are responsible for valid
Application Identifier composition and check digits. Hoflayn does **not**
auto-correct GTIN check digits in Loop 20.

Example GTIN-14 style payload: `01234567890128` (illustrative).
