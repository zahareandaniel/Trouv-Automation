import { readFile } from "fs/promises";
import { join } from "path";
import satori from "satori";
import sharp from "sharp";

const CARD_W = 1080;
const CARD_H = 1350;
const PHOTO_H = 620;
const TOP_H = 280;

let fontCache: { regular: Buffer; bold: Buffer } | null = null;

async function tryReadFile(...paths: string[]): Promise<Buffer> {
  for (const p of paths) {
    try {
      return await readFile(p);
    } catch {
      continue;
    }
  }
  throw new Error(`Font not found in any of: ${paths.join(", ")}`);
}

async function loadFonts() {
  if (fontCache) return fontCache;
  const cwd = process.cwd();
  const regularPaths = [
    join(cwd, "public/fonts/inter-regular.woff2"),
    join(cwd, "src/assets/fonts/inter-regular.woff2"),
    join(cwd, ".next/server/public/fonts/inter-regular.woff2"),
  ];
  const boldPaths = [
    join(cwd, "public/fonts/inter-bold.woff2"),
    join(cwd, "src/assets/fonts/inter-bold.woff2"),
    join(cwd, ".next/server/public/fonts/inter-bold.woff2"),
  ];
  const [regular, bold] = await Promise.all([
    tryReadFile(...regularPaths),
    tryReadFile(...boldPaths),
  ]);
  fontCache = { regular, bold };
  return fontCache;
}

/**
 * Branded card (1080x1350):
 *   Top:    TROUV CHAUFFEURS + topic headline + content type  (satori → sharp)
 *   Middle: AI photo                                          (sharp composite)
 *   Bottom: bullet points + www.trouv.co.uk                   (satori → sharp)
 *
 * Renders text panels with satori → sharp (no resvg native binary needed).
 * Composites photo with sharp.
 */
export async function composeCardImage(
  photoBuffer: Buffer,
  opts: {
    contentType: string;
    topic: string;
    hookLine: string;
  },
): Promise<Buffer> {
  const fonts = await loadFonts();
  const fontOpts = [
    { name: "Inter", data: fonts.regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: fonts.bold, weight: 700 as const, style: "normal" as const },
  ];

  const contentType = opts.contentType.toUpperCase();
  const topic = opts.topic;
  const hook =
    opts.hookLine.length > 200
      ? opts.hookLine.slice(0, 197) + "…"
      : opts.hookLine;
  const bullets = splitIntoBullets(hook);

  const BOTTOM_H = CARD_H - TOP_H - PHOTO_H;

  // ── Render top panel (brand + headline) ──
  const topSvg = await satori(
    buildTopPanel(contentType, topic),
    { width: CARD_W, height: TOP_H, fonts: fontOpts },
  );
  const topPng = await sharp(Buffer.from(topSvg)).png().toBuffer();

  // ── Resize photo ──
  const photoPng = await sharp(photoBuffer)
    .resize(CARD_W, PHOTO_H, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  // ── Render bottom panel (bullets + website) ──
  const bottomSvg = await satori(
    buildBottomPanel(bullets, BOTTOM_H),
    { width: CARD_W, height: BOTTOM_H, fonts: fontOpts },
  );
  const bottomPng = await sharp(Buffer.from(bottomSvg)).png().toBuffer();

  // ── Composite all three bands ──
  const card = await sharp({
    create: {
      width: CARD_W,
      height: CARD_H,
      channels: 4,
      background: { r: 17, g: 17, b: 17, alpha: 1 },
    },
  })
    .composite([
      { input: topPng, top: 0, left: 0 },
      { input: photoPng, top: TOP_H, left: 0 },
      { input: bottomPng, top: TOP_H + PHOTO_H, left: 0 },
    ])
    .png()
    .toBuffer();

  return card;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTopPanel(contentType: string, topic: string): any {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: CARD_W,
        height: TOP_H,
        backgroundColor: "#111111",
        padding: "44px 56px 0 56px",
        fontFamily: "Inter",
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", marginBottom: 20 },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    color: "#ffffff",
                  },
                  children: "TROUV",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 14,
                    fontWeight: 400,
                    color: "#888888",
                    marginLeft: 16,
                    letterSpacing: "0.08em",
                  },
                  children: "CHAUFFEURS",
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: 42,
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#ffffff",
              marginBottom: 10,
            },
            children: topic,
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: 16,
              fontWeight: 400,
              color: "#999999",
              letterSpacing: "0.15em",
            },
            children: contentType,
          },
        },
      ],
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildBottomPanel(bullets: string[], height: number): any {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: CARD_W,
        height,
        backgroundColor: "#111111",
        padding: "28px 56px 0 56px",
        fontFamily: "Inter",
        justifyContent: "space-between",
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column" },
            children: bullets.map((b) => ({
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "flex-start",
                  marginBottom: 10,
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: 20,
                        color: "#ffffff",
                        marginRight: 14,
                        marginTop: 2,
                      },
                      children: "•",
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: 20,
                        fontWeight: 400,
                        color: "#cccccc",
                        lineHeight: 1.4,
                        flex: 1,
                      },
                      children: b,
                    },
                  },
                ],
              },
            })),
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "center",
              paddingBottom: 32,
            },
            children: {
              type: "div",
              props: {
                style: {
                  fontSize: 15,
                  fontWeight: 400,
                  color: "#666666",
                  letterSpacing: "0.1em",
                },
                children: "www.trouv.co.uk",
              },
            },
          },
        },
      ],
    },
  };
}

function splitIntoBullets(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length >= 2) return sentences.slice(0, 4);

  const chunks = text
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (chunks.length >= 2) return chunks.slice(0, 4);

  return [text];
}
