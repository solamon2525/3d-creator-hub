import type { Ring } from '../shared/geometry/textToContours';

export type BlockPreset = 'single' | 'row2' | 'row3' | 'row4' | 'grid2x2' | 'wasd' | 'arrows';

export interface KeySlot {
  x: number; // mm offset from center
  y: number; // mm offset from center
  label: string;
}

export interface BlockLayout {
  id: BlockPreset;
  name: string;
  keys: KeySlot[];
  width: number;
  height: number;
  cornerRadius: number;
}

export const BLOCK_PRESETS: Record<BlockPreset, { name: string; layout: (pitch?: number) => BlockLayout }> = {
  single: {
    name: '1 ปุ่ม (Single 1x1)',
    layout: () => ({
      id: 'single',
      name: 'Single 1x1',
      keys: [{ x: 0, y: 0, label: '1' }],
      width: 28,
      height: 28,
      cornerRadius: 6,
    }),
  },
  row2: {
    name: 'แถวยาว 2 ปุ่ม (Row 1x2)',
    layout: (pitch = 20.0) => ({
      id: 'row2',
      name: 'Row 1x2',
      keys: [
        { x: -pitch / 2, y: 0, label: '1' },
        { x: pitch / 2, y: 0, label: '2' },
      ],
      width: pitch + 16,
      height: 28,
      cornerRadius: 6,
    }),
  },
  row3: {
    name: 'แถวยาว 3 ปุ่ม (Row 1x3)',
    layout: (pitch = 20.0) => ({
      id: 'row3',
      name: 'Row 1x3',
      keys: [
        { x: -pitch, y: 0, label: '1' },
        { x: 0, y: 0, label: '2' },
        { x: pitch, y: 0, label: '3' },
      ],
      width: pitch * 2 + 16,
      height: 28,
      cornerRadius: 6,
    }),
  },
  row4: {
    name: 'แถวยาว 4 ปุ่ม (Row 1x4)',
    layout: (pitch = 20.0) => ({
      id: 'row4',
      name: 'Row 1x4',
      keys: [
        { x: -pitch * 1.5, y: 0, label: '1' },
        { x: -pitch * 0.5, y: 0, label: '2' },
        { x: pitch * 0.5, y: 0, label: '3' },
        { x: pitch * 1.5, y: 0, label: '4' },
      ],
      width: pitch * 3 + 16,
      height: 28,
      cornerRadius: 6,
    }),
  },
  grid2x2: {
    name: 'ตาราง 4 ปุ่ม (Grid 2x2)',
    layout: (pitch = 20.0) => ({
      id: 'grid2x2',
      name: 'Grid 2x2',
      keys: [
        { x: -pitch / 2, y: pitch / 2, label: '1' },
        { x: pitch / 2, y: pitch / 2, label: '2' },
        { x: -pitch / 2, y: -pitch / 2, label: '3' },
        { x: pitch / 2, y: -pitch / 2, label: '4' },
      ],
      width: pitch + 16,
      height: pitch + 16,
      cornerRadius: 6,
    }),
  },
  wasd: {
    name: 'คลัสเตอร์เกมมิ่ง (WASD)',
    layout: (pitch = 20.0) => ({
      id: 'wasd',
      name: 'WASD Cluster',
      keys: [
        { x: 0, y: pitch / 2, label: 'W' },
        { x: -pitch, y: -pitch / 2, label: 'A' },
        { x: 0, y: -pitch / 2, label: 'S' },
        { x: pitch, y: -pitch / 2, label: 'D' },
      ],
      width: pitch * 2 + 16,
      height: pitch + 16,
      cornerRadius: 6,
    }),
  },
  arrows: {
    name: 'ปุ่มลูกศร (Arrow Keys)',
    layout: (pitch = 20.0) => ({
      id: 'arrows',
      name: 'Arrow Keys',
      keys: [
        { x: 0, y: pitch / 2, label: '▲' },
        { x: -pitch, y: -pitch / 2, label: '◄' },
        { x: 0, y: -pitch / 2, label: '▼' },
        { x: pitch, y: -pitch / 2, label: '►' },
      ],
      width: pitch * 2 + 16,
      height: pitch + 16,
      cornerRadius: 6,
    }),
  },
};

/**
 * Creates a smooth 2D rounded rectangle contour.
 */
export function createRoundedRect(
  w: number,
  d: number,
  cornerR: number,
  cx = 0,
  cy = 0,
  segments = 16,
): Ring {
  const rw = w / 2;
  const rd = d / 2;
  const r = Math.min(cornerR, rw, rd);
  const pts: [number, number][] = [];

  // Top right
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * (Math.PI / 2);
    pts.push([cx + (rw - r + Math.cos(a) * r), cy + (rd - r + Math.sin(a) * r)]);
  }
  // Top left
  for (let i = 0; i <= segments; i++) {
    const a = Math.PI / 2 + (i / segments) * (Math.PI / 2);
    pts.push([cx + (-rw + r + Math.cos(a) * r), cy + (rd - r + Math.sin(a) * r)]);
  }
  // Bottom left
  for (let i = 0; i <= segments; i++) {
    const a = Math.PI + (i / segments) * (Math.PI / 2);
    pts.push([cx + (-rw + r + Math.cos(a) * r), cy + (-rd + r + Math.sin(a) * r)]);
  }
  // Bottom right
  for (let i = 0; i <= segments; i++) {
    const a = (Math.PI * 3) / 2 + (i / segments) * (Math.PI / 2);
    pts.push([cx + (rw - r + Math.cos(a) * r), cy + (-rd + r + Math.sin(a) * r)]);
  }
  return pts;
}

/**
 * Computes the outer casing boundary contour surrounding all keys.
 */
export function getBlockCasingOutline(layout: BlockLayout, padding = 2.5, cornerR = 5.0): Ring {
  const minX = Math.min(...layout.keys.map((k) => k.x)) - 10.0 - padding;
  const maxX = Math.max(...layout.keys.map((k) => k.x)) + 10.0 + padding;
  const minY = Math.min(...layout.keys.map((k) => k.y)) - 10.0 - padding;
  const maxY = Math.max(...layout.keys.map((k) => k.y)) + 10.0 + padding;

  const w = maxX - minX;
  const d = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return createRoundedRect(w, d, cornerR, cx, cy, 16);
}

export interface BlockSolidsResult {
  body: any; // Manifold Solid
  caps: {
    index: number;
    key: KeySlot;
    solid: any; // Manifold Solid
    topZ: number;
    center: [number, number];
  }[];
}

export interface BlockBuildOptions {
  bodyH?: number;
  floor?: number;
  wellSize?: number;
  stemFit?: number;
  pocketFit?: number;
  capH?: number;
}

/**
 * Generates the complete watertight geometry for a multi-key Fidget Block:
 * 1. Multi-key casing with individual wells and MX sockets for each key
 * 2. N individual keycaps with MX cross stems on the bottom
 */
export function buildBlockSolids(
  m: any,
  layout: BlockLayout,
  opts: BlockBuildOptions = {},
): BlockSolidsResult {
  const bodyH = opts.bodyH ?? 11.0;
  const floor = opts.floor ?? 2.4;
  const wellSize = (opts.wellSize ?? 16.2) + (opts.pocketFit ?? 0);
  const capH = opts.capH ?? 6.5;
  const capW = 17.5;
  const capD = 17.5;

  // 1. Base Casing Extrusion
  const outline = getBlockCasingOutline(layout, 2.5, 5.0);
  const casingCS = new m.CrossSection([outline], 'EvenOdd');
  let body = m.Manifold.extrude(casingCS, bodyH);
  casingCS.delete();

  // 2. Cut wells & MX sockets for each key
  for (const k of layout.keys) {
    // Switch well cavity
    const wellCube = m.Manifold.cube([wellSize, wellSize, bodyH - floor + 0.5], false);
    const placedWell = wellCube.translate([k.x - wellSize / 2, k.y - wellSize / 2, floor]);
    const cutBody = body.subtract(placedWell);
    body.delete();
    wellCube.delete();
    placedWell.delete();
    body = cutBody;

    // MX Socket hole through the floor (14x14 mm standard)
    const socketSize = 14.2 + (opts.pocketFit ?? 0);
    const socketHole = m.Manifold.cube([socketSize, socketSize, floor + 0.6], false);
    const placedSocket = socketHole.translate([k.x - socketSize / 2, k.y - socketSize / 2, -0.3]);
    const cutSocket = body.subtract(placedSocket);
    body.delete();
    socketHole.delete();
    placedSocket.delete();
    body = cutSocket;
  }

  // 3. Create N individual keycaps with MX cross stem
  const stemL = 4.0;
  const stemT = 1.15 + (opts.stemFit ?? 0);
  const stemH = 4.5;

  const caps: BlockSolidsResult['caps'] = [];

  for (let i = 0; i < layout.keys.length; i++) {
    const k = layout.keys[i]!;

    // Rounded keycap body
    const capOutline = createRoundedRect(capW, capD, 2.5, 0, 0, 12);
    const capCS = new m.CrossSection([capOutline], 'EvenOdd');
    const capBlock = m.Manifold.extrude(capCS, capH);
    capCS.delete();

    // MX Cross Stem
    const barV = m.Manifold.cube([stemT, stemL, stemH], true);
    const barH = m.Manifold.cube([stemL, stemT, stemH], true);
    const stemCross = barV.add(barH);
    barV.delete();
    barH.delete();

    // Stem sticks out from bottom of keycap
    const placedStem = stemCross.translate([0, 0, -capH / 2 + stemH / 2]);
    stemCross.delete();
    const joinedCap = capBlock.add(placedStem);
    capBlock.delete();
    placedStem.delete();

    // Position keycap centered at its key slot (k.x, k.y)
    const finalCap = joinedCap.translate([k.x, k.y, bodyH + 0.8]);
    joinedCap.delete();

    caps.push({
      index: i,
      key: k,
      solid: finalCap,
      topZ: bodyH + 0.8 + capH,
      center: [k.x, k.y],
    });
  }

  return { body, caps };
}
