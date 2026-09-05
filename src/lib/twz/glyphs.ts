/** Rasterizes the 8x8 CGA glyphs from the Web437 IBM EGA 8x8 web font. */
import type { GlyphSource } from "./renderer";

export const FONT_FAMILY = "Web437 IBM EGA 8x8";
const SCALE = 4;

/** Characters the program prints: printable ASCII plus box drawing and arrows. */
const EXTRA = "\u2554\u2550\u2557\u2551\u255a\u255d\u2191\u2193\u2192\u2588\u00b7";

export async function loadGlyphs(): Promise<GlyphSource> {
  const size = 8 * SCALE;
  try {
    await document.fonts.load(`${size}px "${FONT_FAMILY}"`);
  } catch {
    // Fall through: the canvas still draws with a fallback font.
  }
  const canvas = document.createElement("canvas");
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no 2d context");
  ctx.font = `${size}px "${FONT_FAMILY}", monospace`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#fff";

  const cache = new Map<string, Uint8Array>();
  const rasterize = (ch: string): Uint8Array => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText(ch, 0, 0);
    const data = ctx.getImageData(0, 0, size, size).data;
    const rows = new Uint8Array(8);
    for (let r = 0; r < 8; r++) {
      let b = 0;
      for (let c = 0; c < 8; c++) {
        const px = c * SCALE + SCALE / 2;
        const py = r * SCALE + SCALE / 2;
        if (data[(py * size + px) * 4 + 3] > 127) b |= 0x80 >> c;
      }
      rows[r] = b;
    }
    return rows;
  };
  for (let code = 32; code < 127; code++) cache.set(String.fromCharCode(code), rasterize(String.fromCharCode(code)));
  for (const ch of EXTRA) cache.set(ch, rasterize(ch));
  const blank = new Uint8Array(8);
  return (ch) => {
    let g = cache.get(ch);
    if (!g) {
      g = rasterize(ch);
      cache.set(ch, g);
    }
    return g ?? blank;
  };
}
