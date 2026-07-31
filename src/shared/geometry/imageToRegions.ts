import { contours } from 'd3-contour';
import type { RGB } from '../units';
import type { Ring } from './textToContours';

export type ColorRegion = {
  rgb: RGB;
  rings: Ring[];
  coverage: number;
};

function dist2(a: RGB, b: RGB): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/** Simple median-cut-ish quantize to k colors (foreground only). */
export function quantizeImageData(
  data: ImageData,
  maxColors = 4,
  alphaCut = 32,
): { indexed: Uint8Array; palette: RGB[]; w: number; h: number } {
  const { width: w, height: h, data: px } = data;
  const samples: RGB[] = [];
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3]! < alphaCut) continue;
    samples.push([px[i]!, px[i + 1]!, px[i + 2]!]);
  }
  if (!samples.length) throw new Error('ไม่มีพิกเซลทึบในรูป');

  // k-means lite
  const k = Math.min(maxColors, samples.length);
  let centers: RGB[] = samples.slice(0, k).map((c) => [...c] as RGB);
  for (let iter = 0; iter < 8; iter++) {
    const buckets: RGB[][] = Array.from({ length: k }, () => []);
    for (const s of samples) {
      let bi = 0;
      let bd = Infinity;
      for (let c = 0; c < k; c++) {
        const d = dist2(s, centers[c]!);
        if (d < bd) {
          bd = d;
          bi = c;
        }
      }
      buckets[bi]!.push(s);
    }
    centers = buckets.map((bucket, i) => {
      if (!bucket.length) return centers[i]!;
      let r = 0,
        g = 0,
        b = 0;
      for (const p of bucket) {
        r += p[0];
        g += p[1];
        b += p[2];
      }
      const n = bucket.length;
      return [Math.round(r / n), Math.round(g / n), Math.round(b / n)] as RGB;
    });
  }

  const indexed = new Uint8Array(w * h);
  indexed.fill(255);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (px[i + 3]! < alphaCut) continue;
      const rgb: RGB = [px[i]!, px[i + 1]!, px[i + 2]!];
      let bi = 0;
      let bd = Infinity;
      for (let c = 0; c < k; c++) {
        const d = dist2(rgb, centers[c]!);
        if (d < bd) {
          bd = d;
          bi = c;
        }
      }
      indexed[y * w + x] = bi;
    }
  }
  return { indexed, palette: centers, w, h };
}

export function regionsFromIndexed(
  indexed: Uint8Array,
  palette: RGB[],
  w: number,
  h: number,
  sizeMm: number,
): ColorRegion[] {
  const scale = sizeMm / Math.max(w, h);
  const out: ColorRegion[] = [];
  const totalFg = indexed.reduce((n, v) => n + (v === 255 ? 0 : 1), 0) || 1;

  for (let ci = 0; ci < palette.length; ci++) {
    const values = new Float64Array(w * h);
    let count = 0;
    for (let i = 0; i < indexed.length; i++) {
      if (indexed[i] === ci) {
        values[i] = 1;
        count++;
      }
    }
    if (count < 8) continue;

    const gen = contours().size([w, h]).thresholds([0.5]);
    const polys = gen(values as unknown as number[]);
    const rings: Ring[] = [];
    for (const multi of polys) {
      for (const poly of multi.coordinates) {
        for (const ring of poly) {
          if (ring.length < 3) continue;
          const mapped: Ring = ring.map(([x, y]) => [
            (x - w / 2) * scale,
            -(y - h / 2) * scale,
          ]);
          rings.push(mapped);
        }
      }
    }
    if (!rings.length) continue;
    out.push({
      rgb: palette[ci]!,
      rings,
      coverage: count / totalFg,
    });
  }

  out.sort((a, b) => a.coverage - b.coverage);
  return out;
}

export async function imageFileToRegions(
  file: File,
  sizeMm: number,
  maxColorsOrOpts: number | ImageProcessOpts = 4,
  maxSideLegacy = 160,
): Promise<ColorRegion[]> {
  const opts: ImageProcessOpts =
    typeof maxColorsOrOpts === 'number'
      ? { maxColors: maxColorsOrOpts, maxSide: maxSideLegacy }
      : maxColorsOrOpts;
  const { imageData } = await rasterizeImageFile(file, opts);
  const q = quantizeImageData(imageData, opts.maxColors ?? 4);
  return regionsFromIndexed(q.indexed, q.palette, q.w, q.h, sizeMm);
}

export type ImageProcessOpts = {
  maxColors?: number;
  maxSide?: number;
  /** Trim this fraction from each edge (0–0.35). */
  cropMargin?: number;
  /** Knock out near-white background to alpha. */
  knockOutWhite?: boolean;
  /** RGB channel must all be ≥ this to knock out (default 235). */
  whiteThreshold?: number;
};

export type ImageProcessResult = {
  regions: ColorRegion[];
  palette: RGB[];
  previewUrl: string;
};

async function rasterizeImageFile(
  file: File,
  opts: ImageProcessOpts,
): Promise<{ imageData: ImageData; w: number; h: number; previewUrl: string }> {
  const bmp = await createImageBitmap(file);
  const maxSide = opts.maxSide ?? 160;
  const crop = Math.min(0.35, Math.max(0, opts.cropMargin ?? 0));
  const sx = bmp.width * crop;
  const sy = bmp.height * crop;
  const sw = bmp.width * (1 - crop * 2);
  const sh = bmp.height * (1 - crop * 2);
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(8, Math.round(sw * scale));
  const h = Math.max(8, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
  bmp.close();
  const imageData = ctx.getImageData(0, 0, w, h);
  if (opts.knockOutWhite) {
    const thr = opts.whiteThreshold ?? 235;
    const px = imageData.data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i]! >= thr && px[i + 1]! >= thr && px[i + 2]! >= thr) {
        px[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }
  return { imageData, w, h, previewUrl: canvas.toDataURL('image/png') };
}

/** Full wizard path: preprocess → quantize → regions + palette preview. */
export async function processImageWizard(
  file: File,
  sizeMm: number,
  opts: ImageProcessOpts = {},
): Promise<ImageProcessResult> {
  const { imageData, previewUrl } = await rasterizeImageFile(file, opts);
  const q = quantizeImageData(imageData, opts.maxColors ?? 4);
  // paint indexed preview
  const canvas = document.createElement('canvas');
  canvas.width = q.w;
  canvas.height = q.h;
  const ctx = canvas.getContext('2d')!;
  const out = ctx.createImageData(q.w, q.h);
  for (let i = 0; i < q.indexed.length; i++) {
    const ci = q.indexed[i]!;
    const o = i * 4;
    if (ci === 255) {
      out.data[o + 3] = 0;
      continue;
    }
    const [r, g, b] = q.palette[ci]!;
    out.data[o] = r;
    out.data[o + 1] = g;
    out.data[o + 2] = b;
    out.data[o + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return {
    regions: regionsFromIndexed(q.indexed, q.palette, q.w, q.h, sizeMm),
    palette: q.palette,
    previewUrl: canvas.toDataURL('image/png') || previewUrl,
  };
}

export async function svgTextToRegions(
  svgText: string,
  sizeMm: number,
  maxColors = 4,
): Promise<ColorRegion[]> {
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const file = new File([blob], 'logo.svg', { type: 'image/svg+xml' });
  return imageFileToRegions(file, sizeMm, { maxColors, maxSide: 200 });
}
