import sharp from "sharp";

/**
 * Takes a square AI-generated photo and composites it into a portrait card
 * (1080×1350) with the photo on top and a text panel below, similar to a
 * blog article card.
 */
export async function composeCardImage(
  photoBuffer: Buffer,
  opts: {
    contentType: string;
    topic: string;
    hookLine: string;
  },
): Promise<Buffer> {
  const CARD_W = 1080;
  const CARD_H = 1350;
  const PHOTO_H = 810; // 60% for photo
  const TEXT_H = CARD_H - PHOTO_H; // 40% for text panel

  const contentType = opts.contentType.toUpperCase();
  const topic = opts.topic;
  const hook = opts.hookLine.length > 140 ? opts.hookLine.slice(0, 137) + "…" : opts.hookLine;

  // Resize the AI photo to fit the top portion
  const resizedPhoto = await sharp(photoBuffer)
    .resize(CARD_W, PHOTO_H, { fit: "cover", position: "centre" })
    .toBuffer();

  // Build the text panel as SVG for sharp to render
  const escapeSvg = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const wrappedTopic = wrapText(topic, 32);
  const wrappedHook = wrapText(hook, 52);

  const topicLines = wrappedTopic
    .map(
      (line, i) =>
        `<text x="60" y="${190 + i * 52}" font-family="Georgia, 'Times New Roman', serif" font-size="42" font-weight="bold" fill="#1a1a1a">${escapeSvg(line)}</text>`,
    )
    .join("\n");

  const hookStartY = 190 + wrappedTopic.length * 52 + 30;
  const hookLines = wrappedHook
    .map(
      (line, i) =>
        `<text x="60" y="${hookStartY + i * 30}" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#666666">${escapeSvg(line)}</text>`,
    )
    .join("\n");

  const textSvg = `<svg width="${CARD_W}" height="${TEXT_H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${CARD_W}" height="${TEXT_H}" fill="#ffffff"/>
    <text x="60" y="60" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="bold" letter-spacing="3" fill="#999999">${escapeSvg(contentType)}</text>
    <line x1="60" y1="80" x2="${60 + contentType.length * 11}" y2="80" stroke="#999999" stroke-width="1"/>
    ${topicLines}
    ${hookLines}
    <text x="60" y="${TEXT_H - 40}" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="#bbbbbb">trouv.co.uk</text>
  </svg>`;

  const textPanel = await sharp(Buffer.from(textSvg))
    .resize(CARD_W, TEXT_H)
    .png()
    .toBuffer();

  // Compose: photo on top, text panel below
  const card = await sharp({
    create: {
      width: CARD_W,
      height: CARD_H,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: resizedPhoto, top: 0, left: 0 },
      { input: textPanel, top: PHOTO_H, left: 0 },
    ])
    .png()
    .toBuffer();

  return card;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length + word.length + 1 > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
