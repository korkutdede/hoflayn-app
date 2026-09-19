import "server-only";
import sharp from "sharp";

/**
 * Composite a (possibly transparent) cutout onto a solid white background.
 * Returns JPEG bytes — marketplace-friendly, smaller than PNG.
 */
export async function compositeOnWhite(
  input: Buffer,
): Promise<{ bytes: Buffer; width: number; height: number; mimeType: string }> {
  const image = sharp(input).ensureAlpha();
  const meta = await image.metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;

  const bytes = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([{ input: await image.png().toBuffer(), blend: "over" }])
    .jpeg({ quality: 92 })
    .toBuffer();

  return { bytes, width, height, mimeType: "image/jpeg" };
}

export async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1];
    if (!base64) throw new Error("Invalid data URL");
    return Buffer.from(base64, "base64");
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}
