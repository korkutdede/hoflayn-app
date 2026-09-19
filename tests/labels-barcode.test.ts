import assert from "node:assert/strict";
import test from "node:test";
import { CREDIT_COSTS } from "../src/lib/credits/costs";
import { ESTIMATED_COST_USD } from "../src/lib/ai/cost-model";
import {
  encodeBarcodePng,
  resolveBarcodePayload,
} from "../src/lib/labels/encode";
import {
  renderLabelPdf,
  truncateLabelText,
} from "../src/lib/labels/pdf";
import { createLabelExportSchema } from "../src/lib/labels/schemas";
import { LABEL_SIZES } from "../src/lib/labels/constants";

test("generate_labels credit and estimate are wired", () => {
  assert.equal(CREDIT_COSTS.generate_labels, 1);
  assert.equal(ESTIMATED_COST_USD.generate_labels, 0.0008);
  assert.ok(LABEL_SIZES["50x30"].widthMm === 50);
});

test("internal SKU accepts alphanumeric code128 payload", () => {
  assert.equal(
    resolveBarcodePayload({
      format: "code128",
      sku: "ATOLYE-KUPA-01",
      barcodeValue: null,
    }),
    "ATOLYE-KUPA-01",
  );
});

test("GS1-128 rejects non-numeric and short values", () => {
  assert.throws(() =>
    resolveBarcodePayload({
      format: "gs1_128",
      sku: "ABC",
      barcodeValue: null,
    }),
  );
  assert.equal(
    resolveBarcodePayload({
      format: "gs1_128",
      sku: null,
      barcodeValue: "01234567890128",
    }),
    "01234567890128",
  );
});

test("code128 and qr encoders return PNG buffers", async () => {
  for (const format of ["code128", "qr"] as const) {
    const png = await encodeBarcodePng({
      format,
      text: "HOFLAYN-TEST-01",
    });
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  }
});

test("truncateLabelText prevents layout overflow", () => {
  const long = "El yapımı seramik kupa ".repeat(8);
  assert.ok([...truncateLabelText(long, 28)].length <= 28);
});

test("label PDF renders for all sizes without overflow crash", async () => {
  for (const size of ["50x30", "62x29", "100x50"] as const) {
    const bytes = await renderLabelPdf({
      size,
      format: "code128",
      copies: 2,
      showPrice: true,
      showName: true,
      items: [
        {
          name: "Çok uzun ürün adı ile taşma kontrolü seramik kupa",
          price: "680.00",
          sku: "SKU-001",
          barcodeValue: "SKU-001",
        },
      ],
    });
    assert.equal(bytes.subarray(0, 4).toString("utf8"), "%PDF");
    assert.ok(bytes.byteLength > 400);
  }
});

test("create label export schema bounds", () => {
  assert.throws(() =>
    createLabelExportSchema.parse({
      productIds: [],
      idempotencyKey: "labels-key-001",
    }),
  );
  const ok = createLabelExportSchema.parse({
    productIds: ["550e8400-e29b-41d4-a716-446655440000"],
    idempotencyKey: "labels-key-001",
  });
  assert.equal(ok.size, "50x30");
  assert.equal(ok.format, "code128");
  assert.equal(ok.copies, 1);
});
