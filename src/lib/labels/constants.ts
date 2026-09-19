export const MAX_LABEL_PRODUCTS = 50;
export const MAX_LABEL_COPIES = 50;
export const LABEL_EXPORT_TTL_DAYS = 14;

/** Label sizes in millimeters (width x height). */
export const LABEL_SIZES = {
  "50x30": { widthMm: 50, heightMm: 30, label: "50×30 mm" },
  "62x29": { widthMm: 62, heightMm: 29, label: "62×29 mm (DK)" },
  "100x50": { widthMm: 100, heightMm: 50, label: "100×50 mm" },
} as const;

export type LabelSizeId = keyof typeof LABEL_SIZES;
export type LabelBarcodeFormat = "code128" | "qr" | "gs1_128";
