import { DEFAULT_CURRENCY } from "@hoflayn/calc";
import {
  createTranslator,
  DEFAULT_LOCALE,
  formatMoneyDecimal,
  type Locale,
} from "@hoflayn/i18n";
import PDFDocument from "pdfkit";
import {
  LABEL_SIZES,
  type LabelBarcodeFormat,
  type LabelSizeId,
} from "./constants";
import { encodeBarcodePng, resolveBarcodePayload } from "./encode";

export type LabelPdfItem = {
  name: string;
  price?: string | null;
  sku?: string | null;
  barcodeValue?: string | null;
};

export type LabelPdfInput = {
  /** Language of the label's own copy; defaults to the workshop's. */
  locale?: Locale;
  /** ISO 4217 code the prices are in. */
  currency?: string;
  size: LabelSizeId;
  format: LabelBarcodeFormat;
  copies: number;
  showPrice: boolean;
  showName: boolean;
  items: LabelPdfItem[];
};

function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}

export function truncateLabelText(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if ([...trimmed].length <= max) return trimmed;
  return `${[...trimmed].slice(0, Math.max(0, max - 1)).join("")}…`;
}

export async function renderLabelPdf(input: LabelPdfInput): Promise<Buffer> {
  const locale = input.locale ?? DEFAULT_LOCALE;
  const currency = input.currency ?? DEFAULT_CURRENCY;
  const t = createTranslator(locale);
  const size = LABEL_SIZES[input.size];
  const width = mmToPt(size.widthMm);
  const height = mmToPt(size.heightMm);
  const doc = new PDFDocument({
    size: [width, height],
    margin: 0,
    autoFirstPage: false,
    info: {
      Title: "Hoflayn Labels",
      Creator: "Hoflayn Label Builder",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pad = Math.max(4, Math.min(width, height) * 0.06);

  for (const item of input.items) {
    const payload = resolveBarcodePayload({
      format: input.format,
      sku: item.sku,
      barcodeValue: item.barcodeValue,
    });
    const png = await encodeBarcodePng({
      format: input.format,
      text: payload,
    });

    for (let copy = 0; copy < input.copies; copy += 1) {
      doc.addPage({ size: [width, height], margin: 0 });
      doc.rect(0, 0, width, height).fill("#FFFFFF");

      const nameMax = input.size === "100x50" ? 42 : 28;
      const textBlock = input.showName || input.showPrice ? 18 : 0;
      const codeH = Math.max(24, height - pad * 2 - textBlock - 12);
      const codeW = width - pad * 2;

      try {
        doc.image(png, pad, pad, {
          fit: [codeW, codeH],
          align: "center",
          valign: "center",
        });
      } catch {
        doc
          .fillColor("#666666")
          .fontSize(8)
          .text(t("labels.pdf.barcodeFailed"), pad, pad + codeH / 2, {
            width: codeW,
            align: "center",
          });
      }

      const y = height - pad - (input.showPrice && input.showName ? 16 : 10);
      if (input.showName) {
        doc
          .fillColor("#111111")
          .fontSize(input.size === "100x50" ? 9 : 7)
          .text(truncateLabelText(item.name, nameMax), pad, y - 10, {
            width: codeW,
            align: "left",
            lineBreak: false,
          });
      }
      if (input.showPrice && item.price) {
        doc
          .fillColor("#111111")
          .fontSize(input.size === "100x50" ? 9 : 7)
          .text(
            formatMoneyDecimal(item.price, currency, locale),
            pad,
            height - pad - 8,
            {
              width: codeW,
              align: "right",
              lineBreak: false,
            },
          );
      }
      doc
        .fillColor("#444444")
        .fontSize(6)
        .text(truncateLabelText(payload, 36), pad, height - pad - 8, {
          width: codeW * 0.55,
          align: "left",
          lineBreak: false,
        });
    }
  }

  doc.end();
  return done;
}
