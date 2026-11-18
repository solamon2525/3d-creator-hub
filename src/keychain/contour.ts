import { contours } from 'd3-contour';

export type Ring = Array<[number, number]>;

export interface DilationOptions {
  padding?: number;       // Outward dilation in mm (default: 3.5mm)
  resolution?: number;    // Grid step in mm (default: 0.3mm)
  bridgeGaps?: boolean;   // Bridge floating Thai tone marks (default: true)
  minHoleArea?: number;   // Automatically fill tiny interior holes (default: 12mm²)
}

function distSqToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const dpx = px - x1;
    const dpy = py - y1;
    return dpx * dpx + dpy * dpy;
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const ex = px - projX;
  const ey = py - projY;
  return ex * ex + ey * ey;
}

function pointInPolygon(px: number, py: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0];
    const yi = ring[i]![1];
    const xj = ring[j]![0];
    const yj = ring[j]![1];

    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function computeRingBounds(ring: Ring) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export function dilateTextContours(rings: Ring[], options: DilationOptions = {}): Ring[] {
  if (!rings.length) return [];

  const padding = options.padding ?? 3.5;
  const res = options.resolution ?? 0.35;
  const padSq = padding * padding;
  const bridgeGaps = options.bridgeGaps ?? true;

  // 1. Calculate overall bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const ringBounds = rings.map((r) => {
    const b = computeRingBounds(r);
    if (b.minX < minX) minX = b.minX;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxY > maxY) maxY = b.maxY;
    return b;
  });

  // 2. Identify vertical bridges for floating Thai tone marks/vowels
  const bridgeSegments: Array<[number, number, number, number]> = [];
  if (bridgeGaps && rings.length > 1) {
    for (let i = 0; i < rings.length; i++) {
      const bi = ringBounds[i]!;
      for (let j = 0; j < rings.length; j++) {
        if (i === j) continue;
        const bj = ringBounds[j]!;
        // If ring i is above ring j with X overlap
        const xOverlap = Math.min(bi.maxX, bj.maxX) - Math.max(bi.minX, bj.minX);
        if (xOverlap > -2.0) {
          const vGap = bi.minY - bj.maxY;
          if (vGap > 0 && vGap <= 10.0) {
            // Add bridge segment
            const bridgeX = (Math.max(bi.minX, bj.minX) + Math.min(bi.maxX, bj.maxX)) / 2;
            bridgeSegments.push([bridgeX, bj.maxY, bridgeX, bi.minY]);
          }
        }
      }
    }
  }

  // 3. Setup distance grid
  const margin = padding + res * 2;
  const startX = minX - margin;
  const startY = minY - margin;
  const endX = maxX + margin;
  const endY = maxY + margin;

  const w = Math.ceil((endX - startX) / res);
  const h = Math.ceil((endY - startY) / res);

  // Pre-collect all segments
  const segments: Array<[number, number, number, number]> = [...bridgeSegments];
  for (const ring of rings) {
    for (let k = 0; k < ring.length; k++) {
      const p1 = ring[k]!;
      const p2 = ring[(k + 1) % ring.length]!;
      segments.push([p1[0], p1[1], p2[0], p2[1]]);
    }
  }

  // Evaluate grid
  const grid = new Float32Array(w * h);

  for (let row = 0; row < h; row++) {
    const y = startY + row * res;
    for (let col = 0; col < w; col++) {
      const x = startX + col * res;

      // Fast check: point in any ring
      let isInside = false;
      for (let r = 0; r < rings.length; r++) {
        const b = ringBounds[r]!;
        if (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY) {
          if (pointInPolygon(x, y, rings[r]!)) {
            isInside = true;
            break;
          }
        }
      }

      if (isInside) {
        grid[row * w + col] = 1;
        continue;
      }

      // Check distance to segments
      let near = false;
      for (let s = 0; s < segments.length; s++) {
        const seg = segments[s]!;
        if (distSqToSegment(x, y, seg[0], seg[1], seg[2], seg[3]) <= padSq) {
          near = true;
          break;
        }
      }

      if (near) {
        grid[row * w + col] = 1;
      }
    }
  }

  // 4. Extract contours with d3-contour
  const generator = contours().size([w, h]).thresholds([0.5]);
  const contourData = generator(grid as unknown as number[]);

  const outRings: Ring[] = [];

  for (const poly of contourData) {
    if (!poly.coordinates) continue;
    for (const loop of poly.coordinates) {
      for (const pts of loop) {
        if (pts.length < 4) continue;
        const ring: Ring = pts.map(([col, row]) => [
          startX + col * res,
          startY + row * res,
        ]);
        outRings.push(ring);
      }
    }
  }

  // Sort by perimeter length descending (largest outer boundary first)
  outRings.sort((a, b) => b.length - a.length);
  return outRings;
}
