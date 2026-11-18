export type KeycapProfile = 'standard' | 'flat' | 'dsa' | 'xda' | 'moa';

export type ProfileConfig = {
  id: KeycapProfile;
  name: string;
  nameTh: string;
  height: number;
  topWidth: number;
  topDepth: number;
  dishType: 'cylindrical' | 'spherical' | 'flat';
  dishDepth: number;
  dishRadius: number;
  cornerRBottom: number;
  cornerRTop: number;
};

export const KEYCAP_PROFILES: Record<KeycapProfile, ProfileConfig> = {
  standard: {
    id: 'standard',
    name: 'Standard (OEM)',
    nameTh: 'ทรงมาตรฐาน (OEM สโลป)',
    height: 10.5,
    topWidth: 12.8,
    topDepth: 14.2,
    dishType: 'cylindrical',
    dishDepth: 0.6,
    dishRadius: 36,
    cornerRBottom: 1.2,
    cornerRTop: 1.0,
  },
  flat: {
    id: 'flat',
    name: 'Flat (Chiclet)',
    nameTh: 'ทรงแบนต่ำ (Flat)',
    height: 6.5,
    topWidth: 16.2,
    topDepth: 16.2,
    dishType: 'flat',
    dishDepth: 0.0,
    dishRadius: 0,
    cornerRBottom: 1.2,
    cornerRTop: 0.8,
  },
  dsa: {
    id: 'dsa',
    name: 'DSA (Medium Spherical)',
    nameTh: 'ทรง DSA (เว้ากลมกลาง)',
    height: 7.6,
    topWidth: 12.7,
    topDepth: 12.7,
    dishType: 'spherical',
    dishDepth: 0.8,
    dishRadius: 28,
    cornerRBottom: 1.2,
    cornerRTop: 1.4,
  },
  xda: {
    id: 'xda',
    name: 'XDA (Wide Spherical)',
    nameTh: 'ทรง XDA (หน้ากว้างเว้ากลม)',
    height: 9.2,
    topWidth: 13.8,
    topDepth: 13.8,
    dishType: 'spherical',
    dishDepth: 0.6,
    dishRadius: 38,
    cornerRBottom: 1.2,
    cornerRTop: 1.6,
  },
  moa: {
    id: 'moa',
    name: 'MOA (Pillowed Round)',
    nameTh: 'ทรง MOA (ขอบมนฟูโมเดิร์น)',
    height: 9.8,
    topWidth: 14.5,
    topDepth: 14.5,
    dishType: 'spherical',
    dishDepth: 0.5,
    dishRadius: 42,
    cornerRBottom: 1.4,
    cornerRTop: 2.2,
  },
};

type Point2D = [number, number];

function createRoundedRectPoints(width: number, depth: number, radius: number, steps = 8): Point2D[] {
  const hx = width / 2;
  const hy = depth / 2;
  const r = Math.min(radius, Math.min(hx, hy) * 0.8);
  const points: Point2D[] = [];

  const corners: Array<[number, number, number, number]> = [
    [hx - r, hy - r, 0, Math.PI / 2],
    [-hx + r, hy - r, Math.PI / 2, Math.PI],
    [-hx + r, -hy + r, Math.PI, (3 * Math.PI) / 2],
    [hx - r, -hy + r, (3 * Math.PI) / 2, Math.PI * 2],
  ];

  for (const [cx, cy, a0, a1] of corners) {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * (i / steps);
      points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }

  return points;
}

export async function createKeycapProfileSolid(
  M: any,
  profile: KeycapProfile,
  options: {
    size?: number;
    wallThickness?: number;
  } = {}
) {
  const cfg = KEYCAP_PROFILES[profile] ?? KEYCAP_PROFILES.standard;
  const bottomSize = options.size ?? 18.2;
  const sliceH = 0.2;

  // 1. Bottom slice
  const bPts = createRoundedRectPoints(bottomSize, bottomSize, cfg.cornerRBottom);
  const bFlat = bPts.map(([x, y]) => ({ x, y }));
  const bCross = new M.CrossSection([bFlat], 'EvenOdd');
  const bSolid = M.Manifold.extrude(bCross, sliceH);
  bCross.delete();

  // 2. Top slice
  const tPts = createRoundedRectPoints(cfg.topWidth, cfg.topDepth, cfg.cornerRTop);
  const tFlat = tPts.map(([x, y]) => ({ x, y }));
  const tCross = new M.CrossSection([tFlat], 'EvenOdd');
  const tRaw = M.Manifold.extrude(tCross, sliceH);
  tCross.delete();
  const tSolid = tRaw.translate([0, 0, cfg.height - sliceH]);
  tRaw.delete();

  // 3. Hull into tapered keycap solid
  let cap = M.Manifold.hull([bSolid, tSolid]);
  bSolid.delete();
  tSolid.delete();

  // 4. Apply dish curvature
  if (cfg.dishType === 'cylindrical') {
    // Cylindrical dish cutter along X axis
    const cylR = cfg.dishRadius;
    const cylLen = cfg.topWidth * 2;
    const cyl = M.Manifold.cylinder(cylLen, cylR, cylR, 36, true);
    // Rotate cylinder so its axis lies along X
    const rotated = cyl.rotate([0, 90, 0]);
    cyl.delete();
    const placed = rotated.translate([0, 0, cfg.height + cylR - cfg.dishDepth]);
    rotated.delete();
    const dished = M.Manifold.difference(cap, placed);
    cap.delete();
    placed.delete();
    cap = dished;
  } else if (cfg.dishType === 'spherical') {
    // Spherical concave dish cutter
    const sphR = cfg.dishRadius;
    const sph = M.Manifold.sphere(sphR, 36);
    const placed = sph.translate([0, 0, cfg.height + sphR - cfg.dishDepth]);
    sph.delete();
    const dished = M.Manifold.difference(cap, placed);
    cap.delete();
    placed.delete();
    cap = dished;
  }

  return cap;
}
