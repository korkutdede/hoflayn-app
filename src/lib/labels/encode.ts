import bwipjs from "bwip-js";
import { LocalizedError } from "@/lib/i18n/error";
import type { LabelBarcodeFormat } from "./constants";

/**
 * Internal SKU vs GS1:
 * - code128 / qr: free-form workshop SKU or custom payload (letters OK).
 * - gs1_128: digits-only payload intended for GS1 Application Identifier
 *   streams (e.g. 01 + GTIN-14). We do not invent check digits; invalid
 *   payloads fail encode instead of silently falling back.
 */
export function resolveBarcodePayload(opts: {
  format: LabelBarcodeFormat;
  sku?: string | null;
  barcodeValue?: string | null;
}): string {
  const raw = (opts.barcodeValue?.trim() || opts.sku?.trim() || "").trim();
  if (!raw) {
    throw new LocalizedError("labels.error.payloadRequired");
  }
  if (opts.format === "gs1_128") {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 48) {
      throw new LocalizedError("labels.error.gs1Digits");
    }
    return digits;
  }
  if (raw.length > 64) {
    throw new LocalizedError("labels.error.payloadTooLong");
  }
  return raw;
}

export function bwipBcid(format: LabelBarcodeFormat): string {
  if (format === "qr") return "qrcode";
  if (format === "gs1_128") return "gs1-128";
  return "code128";
}

export async function encodeBarcodePng(opts: {
  format: LabelBarcodeFormat;
  text: string;
}): Promise<Buffer> {
  const bcid = bwipBcid(opts.format);
  if (opts.format === "qr") {
    return bwipjs.toBuffer({
      bcid,
      text: opts.text,
      scale: 3,
      includetext: false,
    });
  }
  return bwipjs.toBuffer({
    bcid,
    text: opts.text,
    scale: 2,
    height: 12,
    includetext: false,
    textxalign: "center",
  });
}
