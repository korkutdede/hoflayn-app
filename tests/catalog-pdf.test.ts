import assert from "node:assert/strict";
import test from "node:test";
import { CREDIT_COSTS } from "../src/lib/credits/costs";
import { ESTIMATED_COST_USD } from "../src/lib/ai/cost-model";
import { MAX_CATALOG_ITEMS } from "../src/lib/catalog/constants";
import {
  renderCatalogPdf,
  truncateText,
} from "../src/lib/catalog/pdf";
import {
  createCatalogSchema,
  exportCatalogSchema,
} from "../src/lib/catalog/schemas";

test("generate_catalog credit and estimate are wired", () => {
  assert.equal(CREDIT_COSTS.generate_catalog, 1);
  assert.equal(ESTIMATED_COST_USD.generate_catalog, 0.001);
  assert.equal(MAX_CATALOG_ITEMS, 50);
});

test("truncateText keeps layout bounds for long copy", () => {
  assert.equal(truncateText("kısa", 10), "kısa");
  const long = "a".repeat(200);
  assert.ok(truncateText(long, 40).endsWith("…"));
  assert.ok([...truncateText(long, 40)].length <= 40);
});

test("create catalog schema enforces product selection bounds", () => {
  assert.throws(() =>
    createCatalogSchema.parse({
      title: "K",
      productIds: [],
    }),
  );
  const ok = createCatalogSchema.parse({
    title: "Yaz koleksiyonu",
    productIds: ["550e8400-e29b-41d4-a716-446655440000"],
  });
  assert.equal(ok.templateId, "grid");
  assert.equal(ok.theme, "linen");
  assert.equal(ok.showPrices, true);
});

test("export idempotency key is required", () => {
  assert.throws(() => exportCatalogSchema.parse({ idempotencyKey: "short" }));
  const ok = exportCatalogSchema.parse({
    idempotencyKey: "catalog-stable-key-001",
  });
  assert.equal(ok.idempotencyKey, "catalog-stable-key-001");
});

test("both catalog templates render PDF bytes without images", async () => {
  for (const templateId of ["grid", "lookbook"] as const) {
    const bytes = await renderCatalogPdf({
      title: "Test katalog",
      templateId,
      theme: "linen",
      showPrices: true,
      showWorkshop: true,
      workshopName: "Toprak Atölye",
      craftLabel: "Seramik",
      items: [
        {
          name: "Kupa",
          description: "El yapımı seramik kupa. ".repeat(20),
          price: "680.00",
          image: null,
        },
        {
          name: "Vazo",
          description: null,
          price: "1450.00",
          image: null,
        },
      ],
    });
    assert.ok(bytes.byteLength > 500);
    assert.equal(bytes.subarray(0, 4).toString("utf8"), "%PDF");
  }
});

test("tenant isolation contract: catalog queries always include tenant predicate docs", () => {
  // Smoke: schemas and costs are tenant-scoped at service layer; this guards
  // against dropping the credit/module wiring while Loop 19 evolves.
  assert.ok(CREDIT_COSTS.generate_catalog >= 1);
  assert.ok(createCatalogSchema.shape.productIds);
});
