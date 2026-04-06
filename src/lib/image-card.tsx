/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import sharp from "sharp";

const CARD_W = 1080;
const CARD_H = 1350;
const PHOTO_H = 620;

let fontCache: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;

  // Fetch Inter Latin subset from Google Fonts CDN (always available, no filesystem needed)
  const [regularRes, boldRes] = await Promise.all([
    fetch("https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2"),
    fetch("https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2"),
  ]);

  if (!regularRes.ok || !boldRes.ok) {
    throw new Error("Failed to fetch Inter fonts from Google CDN");
  }

  fontCache = {
    regular: await regularRes.arrayBuffer(),
    bold: await boldRes.arrayBuffer(),
  };
  return fontCache;
}

/**
 * Branded card image (1080x1350) using next/og ImageResponse:
 *   Top:    TROUV CHAUFFEURS + topic headline + content type
 *   Middle: AI photo
 *   Bottom: bullet points + www.trouv.co.uk
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
  const bullets = splitIntoBullets(hook);

  const resizedPhoto = await sharp(photoBuffer)
    .resize(CARD_W, PHOTO_H, { fit: "cover", position: "centre" })
    .jpeg({ quality: 80 })
    .toBuffer();

  const photoSrc = `data:image/jpeg;base64,${resizedPhoto.toString("base64")}`;

  const response = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: CARD_W,
          height: CARD_H,
          backgroundColor: "#111111",
          color: "#ffffff",
          fontFamily: "Inter",
        }}
      >
        {/* Top panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "44px 56px 28px 56px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "#ffffff",
              }}
            >
              TROUV
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: "#888888",
                marginLeft: 16,
                letterSpacing: "0.08em",
              }}
            >
              CHAUFFEURS
            </div>
          </div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#ffffff",
              marginBottom: 10,
            }}
          >
            {topic}
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 400,
              color: "#999999",
              letterSpacing: "0.15em",
            }}
          >
            {contentType}
          </div>
        </div>

        {/* Photo */}
        <img
          src={photoSrc}
          width={CARD_W}
          height={PHOTO_H}
          style={{ objectFit: "cover" }}
          alt=""
        />

        {/* Bottom panel */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "24px 56px 0 56px",
            flex: 1,
          }}
        >
          {bullets.map((b, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  color: "#ffffff",
                  marginRight: 14,
                  marginTop: 2,
                }}
              >
                •
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 400,
                  color: "#cccccc",
                  lineHeight: 1.4,
                  flex: 1,
                }}
              >
                {b}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingBottom: 28,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 400,
              color: "#666666",
              letterSpacing: "0.1em",
            }}
          >
            www.trouv.co.uk
          </div>
        </div>
      </div>
    ),
    {
      width: CARD_W,
      height: CARD_H,
      fonts: [
        { name: "Inter", data: fonts.regular, weight: 400, style: "normal" },
        { name: "Inter", data: fonts.bold, weight: 700, style: "normal" },
      ],
    },
  );

  const arrayBuf = await response.arrayBuffer();
  return Buffer.from(arrayBuf);
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
