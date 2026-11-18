import type { Ring } from './contour';

export type BadgeShape = 'auto' | 'capsule' | 'rounded' | 'cloud' | 'heart' | 'paw' | 'bone';
export type AccentIcon = 'none' | 'heart' | 'star' | 'crown' | 'paw' | 'gamepad' | 'ghost' | 'sparkles' | 'flame';
export type IconPosition = 'none' | 'trailing' | 'leading' | 'both';
export type KeychainPos = 'left' | 'right' | 'top' | 'bottom';

export interface ColorTheme {
  id: string;
  name: string;
  baseColor: string;
  borderColor: string;
  textColor: string;
}

export const COLOR_THEMES: ColorTheme[] = [
  { id: 'bambu-gold', name: 'Gold & Navy (คลาสสิก)', baseColor: '#0f172a', borderColor: '#334155', textColor: '#f59e0b' },
  { id: 'pastel-pink', name: 'Pastel Dream (พาสเทล)', baseColor: '#fce7f3', borderColor: '#f472b6', textColor: '#be185d' },
  { id: 'neon-cyber', name: 'Cyberpunk (นีออน)', baseColor: '#09090b', borderColor: '#06b6d4', textColor: '#f43f5e' },
  { id: 'mint-matcha', name: 'Matcha Green (มัทฉะ)', baseColor: '#f0fdf4', borderColor: '#86efac', textColor: '#15803d' },
  { id: 'cotton-candy', name: 'Cotton Candy (ขนมหวาน)', baseColor: '#e0f2fe', borderColor: '#fbcfe8', textColor: '#6366f1' },
];

export const BADGE_SHAPES: Array<{ id: BadgeShape; label: string }> = [
  { id: 'auto', label: 'ตามรูปทรงตัวอักษร (Auto-Contour)' },
  { id: 'capsule', label: 'Capsule (แคปซูลมน)' },
  { id: 'rounded', label: 'Rounded Rect (สี่เหลี่ยมมน)' },
  { id: 'cloud', label: 'Cloud (ก้อนเมฆ)' },
  { id: 'heart', label: 'Heart (หัวใจกว้าง)' },
  { id: 'paw', label: 'Cat Paw (อุ้งเท้าแมว)' },
  { id: 'bone', label: 'Dog Bone (กระดูกสัตว์เลี้ยง)' },
];

export const ACCENT_ICONS: Array<{ id: AccentIcon; label: string; glyph: string }> = [
  { id: 'none', label: 'ไม่มีไอคอน', glyph: '' },
  { id: 'heart', label: 'หัวใจ (Heart)', glyph: '❤️' },
  { id: 'star', label: 'ดาว (Star)', glyph: '⭐' },
  { id: 'crown', label: 'มงกุฎ (Crown)', glyph: '👑' },
  { id: 'paw', label: 'อุ้งเท้าแมว (Cat Paw)', glyph: '🐾' },
  { id: 'gamepad', label: 'จอยเกม (Gamepad)', glyph: '🎮' },
  { id: 'ghost', label: 'ผีน้อย (Ghost)', glyph: '👻' },
  { id: 'sparkles', label: 'วิบวับ (Sparkles)', glyph: '✨' },
  { id: 'flame', label: 'เปลวไฟ (Flame)', glyph: '🔥' },
];

/**
 * Returns a 2D ring representing the chosen accent icon normalized to sizeMm.
 */
export function getAccentIconRing(icon: AccentIcon, sizeMm = 12): Ring {
  const r = sizeMm / 2;
  const ring: Ring = [];

  switch (icon) {
    case 'star': {
      const pts = 5;
      for (let i = 0; i < pts * 2; i++) {
        const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.45;
        ring.push([Math.cos(a) * rad, Math.sin(a) * rad]);
      }
      break;
    }
    case 'heart': {
      const steps = 36;
      for (let i = 0; i < steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        const s = (r * 1.8) / 32;
        ring.push([x * s, y * s]);
      }
      break;
    }
    case 'paw': {
      // Main pad of paw (oval with flat bottom)
      const steps = 32;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const rx = r * 0.9;
        const ry = r * 0.75;
        ring.push([Math.cos(a) * rx, Math.sin(a) * ry]);
      }
      break;
    }
    case 'crown': {
      // 5-point crown contour
      ring.push(
        [-r * 0.9, -r * 0.6],
        [-r * 0.9, r * 0.5],
        [-r * 0.45, 0],
        [0, r * 0.7],
        [r * 0.45, 0],
        [r * 0.9, r * 0.5],
        [r * 0.9, -r * 0.6],
      );
      break;
    }
    default: {
      // Circle fallback
      const steps = 32;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        ring.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      break;
    }
  }

  return ring;
}

/**
 * Creates geometric badge baseplate outlines (for non-auto shapes).
 */
export function createBadgeOutline(shape: BadgeShape, width: number, height: number, radius = 5): Ring {
  const hx = width / 2;
  const hy = height / 2;
  const ring: Ring = [];

  switch (shape) {
    case 'capsule': {
      const r = hy;
      const steps = 16;
      // Right semi-circle
      for (let i = 0; i <= steps; i++) {
        const a = -Math.PI / 2 + (i / steps) * Math.PI;
        ring.push([hx - r + Math.cos(a) * r, Math.sin(a) * r]);
      }
      // Left semi-circle
      for (let i = 0; i <= steps; i++) {
        const a = Math.PI / 2 + (i / steps) * Math.PI;
        ring.push([-hx + r + Math.cos(a) * r, Math.sin(a) * r]);
      }
      break;
    }
    case 'bone': {
      // Dog bone: rectangle with 4 circular lobes at corners
      const lobeR = hy * 0.55;
      const steps = 8;
      const corners: Array<[number, number]> = [
        [hx - lobeR, hy - lobeR],
        [-hx + lobeR, hy - lobeR],
        [-hx + lobeR, -hy + lobeR],
        [hx - lobeR, -hy + lobeR],
      ];
      for (const [cx, cy] of corners) {
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * (Math.PI / 2);
          ring.push([cx + Math.cos(a) * lobeR, cy + Math.sin(a) * lobeR]);
        }
      }
      break;
    }
    case 'rounded':
    default: {
      const r = Math.min(radius, Math.min(hx, hy) * 0.5);
      const steps = 8;
      const corners: Array<[number, number, number, number]> = [
        [hx - r, hy - r, 0, Math.PI / 2],
        [-hx + r, hy - r, Math.PI / 2, Math.PI],
        [-hx + r, -hy + r, Math.PI, (3 * Math.PI) / 2],
        [hx - r, -hy + r, (3 * Math.PI) / 2, Math.PI * 2],
      ];
      for (const [cx, cy, a0, a1] of corners) {
        for (let i = 0; i <= steps; i++) {
          const a = a0 + (a1 - a0) * (i / steps);
          ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
      }
      break;
    }
  }

  return ring;
}

/**
 * Creates keychain ring attachment geometry (Lug outer, hole).
 */
export function createKeychainLugRings(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  position: KeychainPos = 'left',
  holeDiameter = 4.5,
  lugRadius?: number
): { lugRing: Ring; holeRing: Ring } {
  const holeR = Math.max(1.5, holeDiameter / 2);
  // Guarantee outer wall thickness >= 2.0mm around the hole
  const minLugR = holeR + 2.0;
  const actualLugR = Math.max(minLugR, lugRadius ?? (holeR + 2.2));
  let cx = 0;
  let cy = (bounds.minY + bounds.maxY) / 2;

  switch (position) {
    case 'right':
      cx = bounds.maxX + actualLugR * 0.7;
      break;
    case 'top':
      cx = (bounds.minX + bounds.maxX) / 2;
      cy = bounds.maxY + actualLugR * 0.7;
      break;
    case 'bottom':
      cx = (bounds.minX + bounds.maxX) / 2;
      cy = bounds.minY - actualLugR * 0.7;
      break;
    case 'left':
    default:
      cx = bounds.minX - actualLugR * 0.7;
      break;
  }

  const steps = 32;
  const lugRing: Ring = [];
  const holeRing: Ring = [];

  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    lugRing.push([cx + Math.cos(a) * actualLugR, cy + Math.sin(a) * actualLugR]);
    holeRing.push([cx + Math.cos(a) * holeR, cy + Math.sin(a) * holeR]);
  }

  return { lugRing, holeRing };
}
