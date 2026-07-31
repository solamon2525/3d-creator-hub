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

/** Each ring becomes its own polygon (no holes). Union them afterward. */
export async function extrudeRings(
  rings: Ring[],
  height: number,
  center = false,
): Promise<Solid> {
  const { Manifold } = await getManifold();
  const usable = rings.filter((r) => r.length >= 3);
  if (!usable.length) throw new Error('ไม่มี contour สำหรับ extrude');
  let solid: Solid | null = null;
  for (const ring of usable) {
    const poly = ring.map(([x, y]) => [x, y] as [number, number]);
    const piece = Manifold.extrude([poly], height, 0, 0, [1, 1], center);
    solid = solid ? Manifold.union(solid, piece) : piece;
  }
  return solid!;
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
