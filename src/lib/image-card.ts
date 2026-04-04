import { Resvg } from "@resvg/resvg-js";
import { readFile } from "fs/promises";
import { join } from "path";
import satori from "satori";
import sharp from "sharp";

const CARD_W = 1080;
const CARD_H = 1350;
const PHOTO_H = 810;

let fontCache: { regular: Buffer; bold: Buffer } | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  const dir = join(process.cwd(), "src/assets/fonts");
  const [regular, bold] = await Promise.all([
    readFile(join(dir, "inter-regular.woff2")),
    readFile(join(dir, "inter-bold.woff2")),
  ]);
  fontCache = { regular, bold };
  return fontCache;
}

/**
 * Composites an AI photo into a portrait card (1080×1350)
 * with the photo on top and a text panel below.
 * Uses satori + resvg for font rendering (works on Vercel).
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
    opts.hookLine.length > 180
      ? opts.hookLine.slice(0, 177) + "…"
      : opts.hookLine;

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
        backgroundColor: "#ffffff",
      },
      children: [
        {
          type: "img",
          props: {
            src: photoDataUri,
            width: CARD_W,
            height: PHOTO_H,
            style: { objectFit: "cover" },
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              padding: "40px 60px",
              flex: 1,
              justifyContent: "flex-start",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#999999",
                    letterSpacing: "0.2em",
                    marginBottom: 24,
                  },
                  children: contentType,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 42,
                    fontWeight: 700,
                    color: "#1a1a1a",
                    lineHeight: 1.2,
                    marginBottom: 20,
                  },
                  children: topic,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 22,
                    fontWeight: 400,
                    color: "#666666",
                    lineHeight: 1.5,
                  },
                  children: hook,
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 30,
              left: 60,
              fontSize: 14,
              color: "#bbbbbb",
            },
            children: "trouv.co.uk",
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
