import Module from 'manifold-3d';
import type { Manifold as ManifoldClass, ManifoldToplevel, Mesh } from 'manifold-3d';
import manifoldWasmUrl from 'manifold-3d/manifold.wasm?url';
import type { Ring } from './textToContours';

export type MeshArrays = {
  vertProperties: Float32Array;
  triVerts: Uint32Array;
  numProp: number;
};

export type Solid = ManifoldClass;

let modPromise: Promise<ManifoldToplevel> | null = null;

export async function getManifold(): Promise<ManifoldToplevel> {
  if (!modPromise) {
    modPromise = Module({ locateFile: () => manifoldWasmUrl }).then((m) => {
      m.setup();
      return m;
    });
  }
  return modPromise;
}

/** Close ring if first != last vertex. */
function closeRing(ring: Ring): Array<[number, number]> {
  const poly = ring.map(([x, y]) => [x, y] as [number, number]);
  const a = poly[0];
  const b = poly[poly.length - 1];
  if (a && b && (a[0] !== b[0] || a[1] !== b[1])) poly.push([a[0], a[1]]);
  return poly;
}

/**
 * Extrude closed rings into a solid.
 * Uses CrossSection + EvenOdd so Thai glyphs with holes stay correct.
 */
export async function extrudeRings(
  rings: Ring[],
  height: number,
  center = false,
): Promise<Solid> {
  const { Manifold, CrossSection } = await getManifold();
  const usable = rings.filter((r) => r.length >= 3).map(closeRing);
  if (!usable.length) throw new Error('ไม่มี contour สำหรับ extrude');

  // Prefer one CrossSection so holes punch correctly (EvenOdd).
  try {
    const section = new CrossSection(usable, 'EvenOdd');
    const area = section.area();
    if (Math.abs(area) > 1e-8) {
      const solid = Manifold.extrude(section, height, 0, 0, [1, 1], center);
      const mesh = solid.getMesh();
      if (mesh.triVerts.length > 0) return solid;
      solid.delete();
    } else {
      section.delete();
    }
  } catch {
    /* fall through to per-ring union */
  }

  let solid: Solid | null = null;
  for (const poly of usable) {
    try {
      const piece = Manifold.extrude([poly], height, 0, 0, [1, 1], center);
      const m = piece.getMesh();
      if (m.triVerts.length === 0) {
        piece.delete();
        continue;
      }
      if (!solid) solid = piece;
      else {
        const next: Solid = Manifold.union(solid, piece);
        solid.delete();
        piece.delete();
        solid = next;
      }
    } catch {
      /* skip bad ring */
    }
  }
  if (!solid) throw new Error('extrude ได้ mesh ว่าง — contour ไม่ถูกต้อง');
  return solid;
}

export async function box(
  sx: number,
  sy: number,
  sz: number,
  center = true,
): Promise<Solid> {
  const { Manifold } = await getManifold();
  return Manifold.cube([sx, sy, sz], center);
}

export async function cylinder(
  height: number,
  rBottom: number,
  rTop = rBottom,
  segments = 48,
  center = true,
): Promise<Solid> {
  const { Manifold } = await getManifold();
  return Manifold.cylinder(height, rBottom, rTop, segments, center);
}

export async function union(a: Solid, b: Solid): Promise<Solid> {
  const { Manifold } = await getManifold();
  return Manifold.union(a, b);
}

export async function difference(a: Solid, b: Solid): Promise<Solid> {
  const { Manifold } = await getManifold();
  return Manifold.difference(a, b);
}

export async function intersection(a: Solid, b: Solid): Promise<Solid> {
  const { Manifold } = await getManifold();
  return Manifold.intersection(a, b);
}

export async function mxCrossSolid(
  length: number,
  thickness: number,
  height: number,
): Promise<Solid> {
  const barX = await box(length, thickness, height, true);
  const barY = await box(thickness, length, height, true);
  return union(barX, barY);
}

export function manifoldToMesh(solid: Solid): MeshArrays {
  const mesh: Mesh = solid.getMesh();
  return {
    vertProperties: new Float32Array(mesh.vertProperties),
    triVerts: new Uint32Array(mesh.triVerts),
    numProp: mesh.numProp,
  };
}

export function disposeManifold(...solids: Array<Solid | null | undefined>) {
  for (const s of solids) {
    try {
      s?.delete();
    } catch {
      /* ignore */
    }
  }
}
