import { Resvg } from "@resvg/resvg-js";
import { readFile } from "fs/promises";
import { join } from "path";
import satori from "satori";
import sharp from "sharp";

const CARD_W = 1080;
const CARD_H = 1350;

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
 * Composites an AI photo into a branded card (1080×1350):
 *   - Top panel:  brand name + content type + topic headline
 *   - Middle:     AI-generated monochrome photo
 *   - Bottom:     hook / key message + bullet points + website
 *
 * Uses satori + resvg (works on Vercel serverless).
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

  const contentType = opts.contentType.toUpperCase();
  const topic = opts.topic;
  const hook =
    opts.hookLine.length > 200
      ? opts.hookLine.slice(0, 197) + "…"
      : opts.hookLine;

  // Split hook into bullet points if it contains sentences
  const bullets = splitIntoBullets(hook);

  const PHOTO_H = 620;

  const resizedPhoto = await sharp(photoBuffer)
    .resize(CARD_W, PHOTO_H, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const photoDataUri = `data:image/png;base64,${resizedPhoto.toString("base64")}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element: any = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: CARD_W,
        height: CARD_H,
        backgroundColor: "#111111",
        color: "#ffffff",
        fontFamily: "Inter",
      },
      children: [
        // ── Top panel: brand + headline ──────────────────────────
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              padding: "44px 56px 32px 56px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 20,
                  },
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
                    fontSize: 44,
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
        },

        // ── Photo ────────────────────────────────────────────────
        {
          type: "img",
          props: {
            src: photoDataUri,
            width: CARD_W,
            height: PHOTO_H,
            style: { objectFit: "cover" },
          },
        },

        // ── Bottom panel: bullets + website ──────────────────────
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              padding: "28px 56px 0 56px",
              flex: 1,
              justifyContent: "flex-start",
            },
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

        // ── Footer: website ──────────────────────────────────────
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "center",
              padding: "0 0 32px 0",
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

  const svg = await satori(element, {
    width: CARD_W,
    height: CARD_H,
    fonts: [
      { name: "Inter", data: fonts.regular, weight: 400, style: "normal" },
      { name: "Inter", data: fonts.bold, weight: 700, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: CARD_W },
  });
  const pngData = resvg.render();

  return Buffer.from(pngData.asPng());
}

function splitIntoBullets(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length >= 2) return sentences.slice(0, 4);

  const chunks = text.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  if (chunks.length >= 2) return chunks.slice(0, 4);

  return [text];
}
