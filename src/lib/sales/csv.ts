/**
 * CSV sales import adapter skeleton (Loop 22).
 * Hoflayn Web import stays a separate adapter later — not implemented here.
 *
 * Expected header (flexible order):
 * sku,quantity,unit_price[,sold_at][,note]
 */
import type { MessageKey, MessageVars } from "@hoflayn/i18n";

export type SalesCsvRow = {
  line: number;
  sku: string;
  quantity: number;
  unitPrice: string;
  soldAt?: string;
  note?: string;
};

/** A rejection reason as a dictionary key, so callers pick the language. */
export type SalesCsvError = {
  messageKey: MessageKey;
  vars?: MessageVars;
};

export type SalesCsvParseResult = {
  rows: SalesCsvRow[];
  errors: SalesCsvError[];
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

export function parseSalesCsv(text: string): SalesCsvParseResult {
  const errors: SalesCsvError[] = [];
  const rows: SalesCsvRow[] = [];
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ messageKey: "sales.csv.error.tooFewLines" }],
    };
  }

  const header = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const idx = {
    sku: header.indexOf("sku"),
    quantity: header.indexOf("quantity"),
    unitPrice: header.findIndex((h) => h === "unit_price" || h === "price"),
    soldAt: header.indexOf("sold_at"),
    note: header.indexOf("note"),
  };

  if (idx.sku < 0 || idx.quantity < 0 || idx.unitPrice < 0) {
    return {
      rows: [],
      errors: [{ messageKey: "sales.csv.error.header" }],
    };
  }

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]!);
    const sku = cells[idx.sku] ?? "";
    const quantityRaw = cells[idx.quantity] ?? "";
    const unitPrice = cells[idx.unitPrice] ?? "";
    const quantity = Number(quantityRaw);
    if (!sku) {
      errors.push({
        messageKey: "sales.csv.error.skuEmpty",
        vars: { line: i + 1 },
      });
      continue;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      errors.push({
        messageKey: "sales.csv.error.quantityInvalid",
        vars: { line: i + 1 },
      });
      continue;
    }
    if (!unitPrice) {
      errors.push({
        messageKey: "sales.csv.error.unitPriceEmpty",
        vars: { line: i + 1 },
      });
      continue;
    }
    rows.push({
      line: i + 1,
      sku,
      quantity,
      unitPrice,
      soldAt:
        idx.soldAt >= 0 && cells[idx.soldAt] ? cells[idx.soldAt] : undefined,
      note: idx.note >= 0 && cells[idx.note] ? cells[idx.note] : undefined,
    });
  }

  return { rows, errors };
}
