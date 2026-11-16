import type { Ring } from '../shared/geometry/textToContours.ts';

export type BlockPreset =
  | 'single'
  | 'row2'
  | 'row3'
  | 'row4'
  | 'col2'
  | 'col3'
  | 'col4'
  | 'grid2x2'
  | 'wasd'
  | 'arrows';

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
  col2: {
    name: 'แถวตั้ง 2 ปุ่ม (Column 1x2)',
    layout: (pitch = 20.0) => ({
      id: 'col2',
      name: 'Column 1x2',
      keys: [
        { x: 0, y: pitch / 2, label: '1' },
        { x: 0, y: -pitch / 2, label: '2' },
      ],
      width: 28,
      height: pitch + 16,
      cornerRadius: 6,
    }),
  },
  col3: {
    name: 'แถวตั้ง 3 ปุ่ม (Column 1x3)',
    layout: (pitch = 20.0) => ({
      id: 'col3',
      name: 'Column 1x3',
      keys: [
        { x: 0, y: pitch, label: '1' },
        { x: 0, y: 0, label: '2' },
        { x: 0, y: -pitch, label: '3' },
      ],
      width: 28,
      height: pitch * 2 + 16,
      cornerRadius: 6,
    }),
  },
  col4: {
    name: 'แถวตั้ง 4 ปุ่ม (Column 1x4)',
    layout: (pitch = 20.0) => ({
      id: 'col4',
      name: 'Column 1x4',
      keys: [
        { x: 0, y: pitch * 1.5, label: '1' },
        { x: 0, y: pitch * 0.5, label: '2' },
        { x: 0, y: -pitch * 0.5, label: '3' },
        { x: 0, y: -pitch * 1.5, label: '4' },
      ],
      width: 28,
      height: pitch * 3 + 16,
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
  solidFloor?: boolean; // 100% solid bottom on bed (default: true)
  borders?: boolean;    // V-groove borders dividing key cells (default: true)
  keycapProfile?: 'standard' | 'flat'; // default: 'standard' (OEM sculpted taper)
}

/**
 * Generates the complete watertight geometry for a multi-key Fidget Block:
 * 1. Multi-key casing with 100% SOLID BOTTOM (พื้นตัน) and stepped blind switch sockets
 * 2. Aesthetic V-groove Borders dividing cells (เมื่อเปิด Borders)
 * 3. N individual sculpted OEM keycaps with MX cross stems on the bottom
 */
export function buildBlockSolids(
  m: any,
  layout: BlockLayout,
  opts: BlockBuildOptions = {},
): BlockSolidsResult {
  const bodyH = opts.bodyH ?? 11.0;
  const solidFloor = opts.solidFloor !== false ? (opts.floor ?? 2.0) : 0;
  const collarSize = (opts.wellSize ?? 16.0) + (opts.pocketFit ?? 0);
  const socketSize = 14.2 + (opts.pocketFit ?? 0);
  const reliefSize = 10.0;
  const capH = opts.capH ?? 6.5;
  const capW = 17.5;
  const capD = 17.5;
  const hasBorders = opts.borders !== false && layout.keys.length > 1;

  // 1. Base Casing Extrusion
  const outline = getBlockCasingOutline(layout, 2.5, 5.0);
  const casingCS = new m.CrossSection([outline], 'EvenOdd');
  let body = m.Manifold.extrude(casingCS, bodyH);
  casingCS.delete();

  // 2. Cut V-groove Borders between adjacent key cells
  if (hasBorders) {
    const minX = Math.min(...layout.keys.map((k) => k.x)) - 14.0;
    const maxX = Math.max(...layout.keys.map((k) => k.x)) + 14.0;
    const minY = Math.min(...layout.keys.map((k) => k.y)) - 14.0;
    const maxY = Math.max(...layout.keys.map((k) => k.y)) + 14.0;
    const spanX = maxX - minX + 4.0;
    const spanY = maxY - minY + 4.0;

    // A. Vertical division boundaries along X (dividing columns/keys side-by-side)
    const uniqueXs = Array.from(new Set(layout.keys.map((k) => k.x))).sort((a, b) => a - b);
    for (let i = 0; i < uniqueXs.length - 1; i++) {
      const midX = (uniqueXs[i] + uniqueXs[i + 1]) / 2;
      // Top V-groove cutter along Y
      const vGrooveCS = new m.CrossSection([[[-0.6, 0], [0.6, 0], [0, -0.8]]], 'EvenOdd');
      const topGroove = m.Manifold.extrude(vGrooveCS, spanY)
        .rotate([90, 0, 0])
        .translate([midX, spanY / 2, bodyH]);
      vGrooveCS.delete();

      const cutBody = body.subtract(topGroove);
      body.delete();
      topGroove.delete();
      body = cutBody;
    }

    // B. Horizontal division boundaries along Y (dividing rows/keys stacked vertically)
    const uniqueYs = Array.from(new Set(layout.keys.map((k) => k.y))).sort((a, b) => a - b);
    for (let i = 0; i < uniqueYs.length - 1; i++) {
      const midY = (uniqueYs[i] + uniqueYs[i + 1]) / 2;
      // Top V-groove cutter along X
      const vGrooveCS = new m.CrossSection([[[-0.6, 0], [0.6, 0], [0, -0.8]]], 'EvenOdd');
      const topGroove = m.Manifold.extrude(vGrooveCS, spanX)
        .rotate([0, 90, 0])
        .translate([-spanX / 2, midY, bodyH]);
      vGrooveCS.delete();

      const cutBody = body.subtract(topGroove);
      body.delete();
      topGroove.delete();
      body = cutBody;
    }
  }

  // 3. Cut Stepped Blind Switch Sockets for each key (100% SOLID BOTTOM)
  for (const k of layout.keys) {
    // A. Upper switch collar shelf: 16.0 x 16.0 mm from (bodyH - 4.5) to (bodyH + 0.1)
    const collarCube = m.Manifold.cube([collarSize, collarSize, 4.6], false);
    const placedCollar = collarCube.translate([k.x - collarSize / 2, k.y - collarSize / 2, bodyH - 4.5]);
    const cutCollar = body.subtract(placedCollar);
    body.delete();
    collarCube.delete();
    placedCollar.delete();
    body = cutCollar;

    // B. Switch body latch pocket: 14.2 x 14.2 mm from (solidFloor + 2.0) to (bodyH - 4.5 + 0.1)
    const pocketH = Math.max(1.0, bodyH - 4.5 - (solidFloor + 2.0) + 0.1);
    const socketCube = m.Manifold.cube([socketSize, socketSize, pocketH], false);
    const placedSocket = socketCube.translate([k.x - socketSize / 2, k.y - socketSize / 2, solidFloor + 2.0]);
    const cutSocket = body.subtract(placedSocket);
    body.delete();
    socketCube.delete();
    placedSocket.delete();
    body = cutSocket;

    // C. Center post & switch pin blind relief: 10.0 x 10.0 mm from solidFloor to (solidFloor + 2.1)
    if (solidFloor > 0) {
      const pinCube = m.Manifold.cube([reliefSize, reliefSize, 2.1], false);
      const placedPin = pinCube.translate([k.x - reliefSize / 2, k.y - reliefSize / 2, solidFloor]);
      const cutPin = body.subtract(placedPin);
      body.delete();
      pinCube.delete();
      placedPin.delete();
      body = cutPin;
    } else {
      // Legacy open-bottom cutout if explicitly requested
      const openHole = m.Manifold.cube([socketSize, socketSize, 3.0], false);
      const placedHole = openHole.translate([k.x - socketSize / 2, k.y - socketSize / 2, -0.3]);
      const cutHole = body.subtract(placedHole);
      body.delete();
      openHole.delete();
      placedHole.delete();
      body = cutHole;
    }
  }

  // 4. Create N individual sculpted keycaps with MX cross stem
  const stemL = 4.0;
  const stemT = 1.15 + (opts.stemFit ?? 0);
  const stemH = 4.5;
  const isStandard = opts.keycapProfile !== 'flat';

  const caps: BlockSolidsResult['caps'] = [];

  for (let i = 0; i < layout.keys.length; i++) {
    const k = layout.keys[i]!;

    // Rounded keycap base outline
    const capOutline = createRoundedRect(capW, capD, 2.5, 0, 0, 16);
    const capCS = new m.CrossSection([capOutline], 'EvenOdd');

    // Sculpted OEM taper: bottom 17.5mm -> top ~13.6mm (scale 0.78)
    let capBlock: any;
    if (isStandard) {
      capBlock = m.Manifold.extrude(capCS, capH, 0, 0, [0.78, 0.78]);
    } else {
      capBlock = m.Manifold.extrude(capCS, capH);
    }
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
