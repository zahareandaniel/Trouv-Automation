import sharp from "sharp";

const CARD_W = 1080;
const CARD_H = 1350;
const PHOTO_H = 810;
const TEXT_H = CARD_H - PHOTO_H;
const PAD = 60;
const TEXT_AREA_W = CARD_W - PAD * 2;

/**
 * Takes a square AI-generated photo and composites it into a portrait card
 * (1080×1350) with the photo on top and a text panel below.
 * Uses sharp's Pango text input (works on Vercel/serverless — no system fonts needed).
 */
export async function composeCardImage(
  photoBuffer: Buffer,
  opts: {
    contentType: string;
    topic: string;
    hookLine: string;
  },
): Promise<Buffer> {
  const contentType = opts.contentType.toUpperCase();
  const topic = opts.topic;
  const hook =
    opts.hookLine.length > 160
      ? opts.hookLine.slice(0, 157) + "…"
      : opts.hookLine;

  const resizedPhoto = await sharp(photoBuffer)
    .resize(CARD_W, PHOTO_H, { fit: "cover", position: "centre" })
    .toBuffer();

  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // Render each text block with sharp's built-in Pango text engine
  const labelImg = await renderPangoText(
    `<span letter_spacing="4000" weight="bold" foreground="#999999">${esc(contentType)}</span>`,
    { width: TEXT_AREA_W, dpi: 150, fontSize: 16 },
  );

  const topicImg = await renderPangoText(
    `<span weight="bold" foreground="#1a1a1a">${esc(topic)}</span>`,
    { width: TEXT_AREA_W, dpi: 150, fontSize: 40 },
  );

  const hookImg = hook
    ? await renderPangoText(
        `<span foreground="#666666">${esc(hook)}</span>`,
        { width: TEXT_AREA_W, dpi: 150, fontSize: 22 },
      )
    : null;

  const brandImg = await renderPangoText(
    `<span foreground="#bbbbbb">trouv.co.uk</span>`,
    { width: TEXT_AREA_W, dpi: 150, fontSize: 14 },
  );

  // Stack text elements vertically with spacing
  const layers: sharp.OverlayOptions[] = [
    { input: resizedPhoto, top: 0, left: 0 },
  ];

  let curY = PHOTO_H + 40;

  const labelMeta = await sharp(labelImg).metadata();
  layers.push({ input: labelImg, top: curY, left: PAD });
  curY += (labelMeta.height ?? 20) + 24;

  const topicMeta = await sharp(topicImg).metadata();
  layers.push({ input: topicImg, top: curY, left: PAD });
  curY += (topicMeta.height ?? 40) + 20;

  if (hookImg) {
    layers.push({ input: hookImg, top: curY, left: PAD });
  }

  // Brand at bottom-left
  layers.push({ input: brandImg, top: CARD_H - 50, left: PAD });

  const card = await sharp({
    create: {
      width: CARD_W,
      height: CARD_H,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(layers)
    .png()
    .toBuffer();

  return card;
}

async function renderPangoText(
  markup: string,
  opts: { width: number; dpi: number; fontSize: number },
): Promise<Buffer> {
  return sharp({
    text: {
      text: `<span size="${opts.fontSize * 1024}">${markup}</span>`,
      font: "sans",
      rgba: true,
      width: opts.width,
      dpi: opts.dpi,
    },
  })
    .png()
    .toBuffer();
}
