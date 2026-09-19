import { DEFAULT_CURRENCY } from "@hoflayn/calc";
import {
  createPluralTranslator,
  createTranslator,
  DEFAULT_LOCALE,
  formatMoneyDecimal,
  type Locale,
  type PluralTranslator,
  type Translator,
} from "@hoflayn/i18n";
import PDFDocument from "pdfkit";

export type CatalogTemplateId = "grid" | "lookbook";
export type CatalogThemeId = "linen" | "ink";

export type CatalogPdfItem = {
  name: string;
  description?: string | null;
  price?: string | null;
  image?: Buffer | null;
};

export type CatalogPdfInput = {
  title: string;
  /** Language of the catalog's own copy; defaults to the workshop's. */
  locale?: Locale;
  /** ISO 4217 code the prices are in. */
  currency?: string;
  templateId: CatalogTemplateId;
  theme: CatalogThemeId;
  showPrices: boolean;
  showWorkshop: boolean;
  workshopName?: string | null;
  craftLabel?: string | null;
  items: CatalogPdfItem[];
};

const THEMES: Record<
  CatalogThemeId,
  { bg: string; ink: string; muted: string; accent: string }
> = {
  linen: {
    bg: "#F7F2EA",
    ink: "#2C241B",
    muted: "#7A6F63",
    accent: "#8B5E3C",
  },
  ink: {
    bg: "#F4F6F8",
    ink: "#142033",
    muted: "#5B6B7C",
    accent: "#1F4E79",
  },
};

/** Theme plus the copy locale, threaded together through every draw call. */
type RenderContext = {
  colors: (typeof THEMES)[CatalogThemeId];
  locale: Locale;
  currency: string;
  t: Translator;
  tPlural: PluralTranslator;
};

export function truncateText(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if ([...trimmed].length <= max) return trimmed;
  return `${[...trimmed].slice(0, Math.max(0, max - 1)).join("")}…`;
}


function drawCover(
  doc: PDFKit.PDFDocument,
  input: CatalogPdfInput,
  { colors, tPlural }: RenderContext,
) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.bg);
  doc
    .fillColor(colors.accent)
    .fontSize(12)
    .text("HOFLAYN", 48, 56, { characterSpacing: 2 });
  doc
    .fillColor(colors.ink)
    .fontSize(28)
    .text(truncateText(input.title, 80), 48, 120, {
      width: doc.page.width - 96,
    });
  if (input.showWorkshop && input.workshopName) {
    doc
      .fillColor(colors.muted)
      .fontSize(14)
      .text(truncateText(input.workshopName, 60), 48, 180);
    if (input.craftLabel) {
      doc.text(truncateText(input.craftLabel, 40), 48, 202);
    }
  }
  doc
    .fillColor(colors.muted)
    .fontSize(11)
    .text(
      tPlural("catalog.pdf.itemCount", input.items.length),
      48,
      doc.page.height - 72,
    );
}

function drawPlaceholder(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  { colors, t }: RenderContext,
) {
  doc.save();
  doc.rect(x, y, w, h).fill("#E8E2D8");
  doc
    .fillColor(colors.muted)
    .fontSize(10)
    .text(t("catalog.pdf.noImage"), x, y + h / 2 - 6, {
      width: w,
      align: "center",
    });
  doc.restore();
}

function drawImageSafe(
  doc: PDFKit.PDFDocument,
  image: Buffer | null | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
  ctx: RenderContext,
) {
  if (!image || image.length === 0) {
    drawPlaceholder(doc, x, y, w, h, ctx);
    return;
  }
  try {
    doc.image(image, x, y, {
      fit: [w, h],
      align: "center",
      valign: "center",
    });
  } catch {
    drawPlaceholder(doc, x, y, w, h, ctx);
  }
}

function renderGrid(
  doc: PDFKit.PDFDocument,
  input: CatalogPdfInput,
  ctx: RenderContext,
) {
  const { colors, currency, locale } = ctx;
  const margin = 40;
  const gap = 16;
  const colW = (doc.page.width - margin * 2 - gap) / 2;
  const cardH = 250;
  let col = 0;
  let y = margin;

  for (const item of input.items) {
    if (y + cardH > doc.page.height - margin) {
      doc.addPage();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.bg);
      y = margin;
      col = 0;
    }
    const x = margin + col * (colW + gap);
    drawImageSafe(doc, item.image, x, y, colW, 150, ctx);
    doc
      .fillColor(colors.ink)
      .fontSize(12)
      .text(truncateText(item.name, 60), x, y + 160, { width: colW });
    doc
      .fillColor(colors.muted)
      .fontSize(9)
      .text(truncateText(item.description ?? "", 120), x, y + 180, {
        width: colW,
        height: 36,
      });
    if (input.showPrices && item.price) {
      doc
        .fillColor(colors.accent)
        .fontSize(11)
        .text(formatMoneyDecimal(item.price, currency, locale), x, y + 222, { width: colW });
    }
    col += 1;
    if (col > 1) {
      col = 0;
      y += cardH + gap;
    }
  }
}

function renderLookbook(
  doc: PDFKit.PDFDocument,
  input: CatalogPdfInput,
  ctx: RenderContext,
) {
  const { colors, currency, locale } = ctx;

  for (const item of input.items) {
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.bg);
    const margin = 48;
    const imgH = 360;
    drawImageSafe(
      doc,
      item.image,
      margin,
      margin,
      doc.page.width - margin * 2,
      imgH,
      ctx,
    );
    doc
      .fillColor(colors.ink)
      .fontSize(18)
      .text(truncateText(item.name, 80), margin, margin + imgH + 24, {
        width: doc.page.width - margin * 2,
      });
    doc
      .fillColor(colors.muted)
      .fontSize(11)
      .text(truncateText(item.description ?? "", 280), margin, margin + imgH + 56, {
        width: doc.page.width - margin * 2,
        height: 80,
      });
    if (input.showPrices && item.price) {
      doc
        .fillColor(colors.accent)
        .fontSize(14)
        .text(formatMoneyDecimal(item.price, currency, locale), margin, doc.page.height - 72);
    }
  }
}

export async function renderCatalogPdf(input: CatalogPdfInput): Promise<Buffer> {
  const locale = input.locale ?? DEFAULT_LOCALE;
  const ctx: RenderContext = {
    colors: THEMES[input.theme],
    locale,
    currency: input.currency ?? DEFAULT_CURRENCY,
    t: createTranslator(locale),
    tPlural: createPluralTranslator(locale),
  };
  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    info: {
      Title: truncateText(input.title, 120),
      Author: input.workshopName ?? "Hoflayn",
      Creator: "Hoflayn Catalog",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawCover(doc, input, ctx);
  if (input.templateId === "lookbook") {
    renderLookbook(doc, input, ctx);
  } else {
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(ctx.colors.bg);
    renderGrid(doc, input, ctx);
  }

  doc.end();
  return done;
}
