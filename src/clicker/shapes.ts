import type { Ring } from '../shared/geometry/textToContours';

export type BaseShape =
  | 'circle'
  | 'square'
  | 'rectangle'
  | 'squircle'
  | 'capsule'
  | 'polygon'
  | 'star'
  | 'heart'
  | 'egg'
  | 'cross'
  | 'shield'
  | 'tag'
  | 'arch'
  | 'hexagon'
  | 'outline';

export interface ShapeOptions {
  size: number;
  lockBaseSize?: boolean;
  baseWidth?: number;
  baseHeight?: number;
  turn?: number; // degrees
  polygonSides?: number;
}

export const SHAPE_LABELS: Record<BaseShape, string> = {
  circle: 'Circle (วงกลม)',
  squircle: 'Squircle (สี่เหลี่ยมขอบมนโค้ง)',
  square: 'Square (สี่เหลี่ยม)',
  rectangle: 'Rectangle (ผืนผ้า)',
  capsule: 'Capsule (แคปซูล)',
  shield: 'Shield (โล่)',
  arch: 'Arch (ซุ้มโค้ง)',
  tag: 'Tag (ป้ายห้อย)',
  egg: 'Egg (ทรงไข่)',
  cross: 'Cross (กากบาท)',
  star: 'Star (ดาว)',
  heart: 'Heart (หัวใจ)',
  polygon: 'Polygon (หลายเหลี่ยม)',
  hexagon: 'Hexagon (6 เหลี่ยม)',
  outline: 'Outline (ตามรูปทรง)',
};

export function createBaseOutline(kind: BaseShape, options: ShapeOptions): Ring {
  const size = options.size || 32;
  const defaultW = kind === 'rectangle' ? Math.round(size * 1.35) : size;
  const defaultH = size;
  const w = options.lockBaseSize && options.baseWidth ? options.baseWidth : defaultW;
  const h = options.lockBaseSize && options.baseHeight ? options.baseHeight : defaultH;
  const rx = w / 2;
  const ry = h / 2;

  let ring: Ring = [];

  switch (kind) {
    case 'circle': {
      const segments = 64;
      for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        ring.push([rx * Math.cos(a), ry * Math.sin(a)]);
      }
      break;
    }

    case 'square':
    case 'rectangle': {
      ring = [
        [-rx, -ry],
        [rx, -ry],
        [rx, ry],
        [-rx, ry],
      ];
      break;
    }

    case 'squircle': {
      // Superellipse formula with n = 4 for ultra-smooth rounded square (Apple squircle)
      const segments = 64;
      for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        const x = rx * Math.sign(cosT) * Math.pow(Math.abs(cosT), 0.5);
        const y = ry * Math.sign(sinT) * Math.pow(Math.abs(sinT), 0.5);
        ring.push([x, y]);
      }
      break;
    }

    case 'capsule': {
      // Stadium / Pill shape
      const segments = 32;
      const capR = Math.min(rx, ry);
      const isHorizontal = rx >= ry;
      if (isHorizontal) {
        const straight = rx - capR;
        // Right semi-circle
        for (let i = 0; i <= segments / 2; i++) {
          const a = -Math.PI / 2 + (i / (segments / 2)) * Math.PI;
          ring.push([straight + capR * Math.cos(a), capR * Math.sin(a)]);
        }
        // Left semi-circle
        for (let i = 0; i <= segments / 2; i++) {
          const a = Math.PI / 2 + (i / (segments / 2)) * Math.PI;
          ring.push([-straight + capR * Math.cos(a), capR * Math.sin(a)]);
        }
      } else {
        const straight = ry - capR;
        // Top semi-circle
        for (let i = 0; i <= segments / 2; i++) {
          const a = 0 + (i / (segments / 2)) * Math.PI;
          ring.push([capR * Math.cos(a), straight + capR * Math.sin(a)]);
        }
        // Bottom semi-circle
        for (let i = 0; i <= segments / 2; i++) {
          const a = Math.PI + (i / (segments / 2)) * Math.PI;
          ring.push([capR * Math.cos(a), -straight + capR * Math.sin(a)]);
        }
      }
      break;
    }

    case 'polygon': {
      const sides = options.polygonSides || 6;
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
        ring.push([rx * Math.cos(a), ry * Math.sin(a)]);
      }
      break;
    }

    case 'hexagon': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        ring.push([rx * Math.cos(a), ry * Math.sin(a)]);
      }
      break;
    }

    case 'star': {
      const points = 10;
      for (let i = 0; i < points; i++) {
        const a = (i / points) * Math.PI * 2 - Math.PI / 2;
        const factor = i % 2 === 0 ? 1 : 0.45;
        ring.push([rx * factor * Math.cos(a), ry * factor * Math.sin(a)]);
      }
      break;
    }

    case 'heart': {
      const segments = 64;
      for (let i = 0; i < segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        ring.push([(x / 18) * rx, (y / 18) * ry]);
      }
      break;
    }

    case 'egg': {
      const segments = 64;
      const k = 0.22; // egg elongation factor
      for (let i = 0; i < segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = rx * Math.cos(t);
        const y = ry * (1 + k * Math.sin(t)) * Math.sin(t);
        ring.push([x, y]);
      }
      break;
    }

    case 'cross': {
      // Symmetrical Plus Cross
      const armW = rx * 0.38;
      const armH = ry * 0.38;
      ring = [
        [-armW, -ry],
        [armW, -ry],
        [armW, -armH],
        [rx, -armH],
        [rx, armH],
        [armW, armH],
        [armW, ry],
        [-armW, ry],
        [-armW, armH],
        [-rx, armH],
        [-rx, -armH],
        [-armW, -armH],
      ];
      break;
    }

    case 'shield': {
      // Medieval / Coat of Arms shield: flat top, vertical upper body, tapered curved bottom
      const segments = 24;
      ring.push([-rx, ry]); // top-left
      ring.push([rx, ry]); // top-right
      ring.push([rx, 0]); // mid-right
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * (Math.PI / 2);
        // Bottom curve tapering to (0, -ry)
        const x = rx * Math.cos(t);
        const y = -ry * Math.sin(t);
        ring.push([x, y]);
      }
      for (let i = segments; i >= 0; i--) {
        const t = (i / segments) * (Math.PI / 2);
        const x = -rx * Math.cos(t);
        const y = -ry * Math.sin(t);
        ring.push([x, y]);
      }
      ring.push([-rx, 0]); // mid-left
      break;
    }

    case 'tag': {
      // Price tag / Keychain tag with chamfered top corners
      const chamfer = rx * 0.35;
      ring = [
        [-rx + chamfer, ry],
        [rx - chamfer, ry],
        [rx, ry - chamfer],
        [rx, -ry],
        [-rx, -ry],
        [-rx, ry - chamfer],
      ];
      break;
    }

    case 'arch': {
      // Rounded arch top with flat bottom
      const segments = 32;
      ring.push([-rx, -ry]);
      ring.push([rx, -ry]);
      ring.push([rx, 0]);
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI;
        ring.push([rx * Math.cos(a), ry * Math.sin(a)]);
      }
      ring.push([-rx, 0]);
      break;
    }

    case 'outline':
    default: {
      // Circle fallback if outline not supplied directly
      const segments = 64;
      for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        ring.push([rx * Math.cos(a), ry * Math.sin(a)]);
      }
      break;
    }
  }

  // Apply rotation angle (turn in degrees)
  if (options.turn && options.turn !== 0) {
    const rad = (options.turn * Math.PI) / 180;
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);
    ring = ring.map(([x, y]) => [x * cosR - y * sinR, x * sinR + y * cosR]);
  }

  return ring;
}
