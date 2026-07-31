import { parse, type Font } from 'opentype.js';

export type Ring = [number, number][];
export type ContourSet = { rings: Ring[]; width: number; height: number };

const fontCache = new Map<string, Font>();

export const FONT_CATALOG: {
  id: string;
  label: string;
  labelTh: string;
  /** Path under public/fonts or remote URL */
  url: string;
  scripts: Array<'latin' | 'thai'>;
}[] = [
  {
    id: 'sarabun',
    label: 'Sarabun',
    labelTh: 'สารบรรณ',
    url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Bold.ttf',
    scripts: ['latin', 'thai'],
  },
  {
    id: 'kanit',
    label: 'Kanit',
    labelTh: 'คณิต',
    url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/kanit/Kanit-Bold.ttf',
    scripts: ['latin', 'thai'],
  },
  {
    id: 'prompt',
    label: 'Prompt',
    labelTh: 'พร้อมท์',
    url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/prompt/Prompt-Bold.ttf',
    scripts: ['latin', 'thai'],
  },
  {
    id: 'oswald',
    label: 'Oswald',
    labelTh: 'Oswald',
    url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/oswald/Oswald%5Bwght%5D.ttf',
    scripts: ['latin'],
  },
  {
    id: 'bebas',
    label: 'Bebas Neue',
    labelTh: 'Bebas Neue',
    url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bebasneue/BebasNeue-Regular.ttf',
    scripts: ['latin'],
  },
];

export async function loadFont(id: string): Promise<Font> {
  const hit = fontCache.get(id);
  if (hit) return hit;
  const entry = FONT_CATALOG.find((f) => f.id === id) ?? FONT_CATALOG[0]!;
  const buf = await fetch(entry.url).then((r) => {
    if (!r.ok) throw new Error(`Font load failed: ${entry.label}`);
    return r.arrayBuffer();
  });
  const font = parse(buf);
  fontCache.set(id, font);
  return font;
}

type PathCommand = {
  type: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
};

function pathToRings(commands: PathCommand[], scaleY = -1): Ring[] {
  const rings: Ring[] = [];
  let cur: Ring = [];
  const pushCurve = (
    p0: [number, number],
    c1: [number, number],
    c2: [number, number] | null,
    p1: [number, number],
    segments: number,
  ) => {
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const u = 1 - t;
      let x: number;
      let y: number;
      if (c2) {
        x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0];
        y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1];
      } else {
        x = u * u * p0[0] + 2 * u * t * c1[0] + t * t * p1[0];
        y = u * u * p0[1] + 2 * u * t * c1[1] + t * t * p1[1];
      }
      cur.push([x, y]);
    }
  };

  for (const cmd of commands) {
    const x = cmd.x ?? 0;
    const y = (cmd.y ?? 0) * scaleY;
    const x1 = cmd.x1 ?? 0;
    const y1 = (cmd.y1 ?? 0) * scaleY;
    const x2 = cmd.x2 ?? 0;
    const y2 = (cmd.y2 ?? 0) * scaleY;
    if (cmd.type === 'M') {
      if (cur.length > 2) rings.push(cur);
      cur = [[x, y]];
    } else if (cmd.type === 'L') {
      cur.push([x, y]);
    } else if (cmd.type === 'Q') {
      const p0 = cur[cur.length - 1]!;
      pushCurve(p0, [x1, y1], null, [x, y], 8);
    } else if (cmd.type === 'C') {
      const p0 = cur[cur.length - 1]!;
      pushCurve(p0, [x1, y1], [x2, y2], [x, y], 8);
    } else if (cmd.type === 'Z') {
      if (cur.length > 2) rings.push(cur);
      cur = [];
    }
  }
  if (cur.length > 2) rings.push(cur);
  return rings;
}

export function textToContours(
  font: Font,
  text: string,
  sizeMm: number,
  letterSpacing = 0,
): ContourSet {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) throw new Error('ไม่มีข้อความ');

  const all: Ring[] = [];
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  const lineGap = sizeMm * 1.25;
  let y = 0;

  for (const line of lines) {
    const path = font.getPath(line, 0, 0, sizeMm);
    // Apply tracking by laying glyphs manually when letterSpacing != 0
    let rings: Ring[];
    if (Math.abs(letterSpacing) < 1e-6) {
      rings = pathToRings(path.commands);
    } else {
      rings = [];
      let x = 0;
      const chars = Array.from(line);
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i]!;
        const g = font.charToGlyph(ch);
        const gp = g.getPath(x, 0, sizeMm);
        rings.push(...pathToRings(gp.commands));
        const adv = ((g.advanceWidth || 0) / font.unitsPerEm) * sizeMm;
        x += adv + letterSpacing * sizeMm;
      }
    }

    for (const ring of rings) {
      const shifted: Ring = ring.map(([x, yy]) => [x, yy - y]);
      for (const [x, yy] of shifted) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (yy < minY) minY = yy;
        if (yy > maxY) maxY = yy;
      }
      all.push(shifted);
    }
    y += lineGap;
  }

  if (!Number.isFinite(minX) || !all.length) throw new Error('ฟอนต์นี้วาดข้อความนี้ไม่ได้');

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const centered = all.map((ring) => ring.map(([x, yy]) => [x - cx, yy - cy] as [number, number]));

  return {
    rings: centered,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** Prefetch common fonts so studios feel instant. */
export async function warmFonts(ids: string[] = ['sarabun', 'kanit']): Promise<void> {
  await Promise.all(
    ids.map(async (id) => {
      try {
        await loadFont(id);
      } catch (e) {
        console.warn('font warm failed', id, e);
      }
    }),
  );
}

export function fontSelectHtml(selected = 'sarabun'): string {
  return FONT_CATALOG.map(
    (f) =>
      `<option value="${f.id}" ${f.id === selected ? 'selected' : ''}>${f.labelTh} (${f.label})</option>`,
  ).join('');
}

const THAI_RE = /[\u0E00-\u0E7F]/;

export function textNeedsThai(text: string): boolean {
  return THAI_RE.test(text);
}

/** Load font, auto-fallback to Sarabun if text has Thai but font is Latin-only. */
export async function loadFontForText(
  id: string,
  text: string,
): Promise<{ font: Font; fontId: string; warned?: string }> {
  const entry = FONT_CATALOG.find((f) => f.id === id) ?? FONT_CATALOG[0]!;
  if (textNeedsThai(text) && !entry.scripts.includes('thai')) {
    const font = await loadFont('sarabun');
    return {
      font,
      fontId: 'sarabun',
      warned: `ฟอนต์ ${entry.label} ไม่รองรับไทย — ใช้ Sarabun แทน`,
    };
  }
  return { font: await loadFont(id), fontId: id };
}
