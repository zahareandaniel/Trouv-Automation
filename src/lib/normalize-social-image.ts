import sharp from "sharp";

/**
 * Instagram automatic publishing (via Buffer) requires feed images in a narrow
 * aspect ratio (portrait ~4:5: width/height between 0.8 and 0.99). Gemini often
 * returns slightly wrong dimensions; Meta rejects those at publish time even
 * though Buffer accepts the queue entry.
 */
const FEED_WIDTH = 1080;
const FEED_HEIGHT = 1350;

/** Resize/crop to exact 4:5 and JPEG for reliable Buffer → Instagram delivery. */
export async function normalizeSocialCardImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(FEED_WIDTH, FEED_HEIGHT, {
      fit: "cover",
      position: "centre",
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
