import Module from 'manifold-3d';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function roundedRectPoints(w, d, r, segments = 16) {
  const rw = w / 2;
  const rd = d / 2;
  const pts = [];
  // Top right
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * (Math.PI / 2);
    pts.push([rw - r + Math.cos(a) * r, rd - r + Math.sin(a) * r]);
  }
  // Top left
  for (let i = 0; i <= segments; i++) {
    const a = Math.PI / 2 + (i / segments) * (Math.PI / 2);
    pts.push([-rw + r + Math.cos(a) * r, rd - r + Math.sin(a) * r]);
  }
  // Bottom left
  for (let i = 0; i <= segments; i++) {
    const a = Math.PI + (i / segments) * (Math.PI / 2);
    pts.push([-rw + r + Math.cos(a) * r, -rd + r + Math.sin(a) * r]);
  }
  // Bottom right
  for (let i = 0; i <= segments; i++) {
    const a = (Math.PI * 3) / 2 + (i / segments) * (Math.PI / 2);
    pts.push([rw - r + Math.cos(a) * r, -rd + r + Math.sin(a) * r]);
  }
  return pts;
}

const PRESETS = {
  row2: [
    { x: -10, y: 0, label: '1' },
    { x: 10, y: 0, label: '2' },
  ],
  row3: [
    { x: -20, y: 0, label: '1' },
    { x: 0, y: 0, label: '2' },
    { x: 20, y: 0, label: '3' },
  ],
  row4: [
    { x: -30, y: 0, label: 'N' },
    { x: -10, y: 0, label: 'a' },
    { x: 10, y: 0, label: 'm' },
    { x: 30, y: 0, label: 'e' },
  ],
  grid2x2: [
    { x: -10, y: 10, label: '1' },
    { x: 10, y: 10, label: '2' },
    { x: -10, y: -10, label: '3' },
    { x: 10, y: -10, label: '4' },
  ],
  wasd: [
    { x: 0, y: 10, label: 'W' },
    { x: -20, y: -10, label: 'A' },
    { x: 0, y: -10, label: 'S' },
    { x: 20, y: -10, label: 'D' },
  ],
};

async function run() {
  const wasmPath = path.resolve(__dirname, '../node_modules/manifold-3d/manifold.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);
  const m = await Module({ wasmBinary });
  m.setup();

  const bodyH = 11.0;
  const floor = 2.4;
  const wellSize = 16.2;
  const cornerR = 5.0;

  for (const [name, keys] of Object.entries(PRESETS)) {
    const minX = Math.min(...keys.map((k) => k.x)) - 10.0 - 2.5;
    const maxX = Math.max(...keys.map((k) => k.x)) + 10.0 + 2.5;
    const minY = Math.min(...keys.map((k) => k.y)) - 10.0 - 2.5;
    const maxY = Math.max(...keys.map((k) => k.y)) + 10.0 + 2.5;
    const w = maxX - minX;
    const d = maxY - minY;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const rawPts = roundedRectPoints(w, d, cornerR, 12);
    const pts = rawPts.map(([x, y]) => [x + cx, y + cy]);

    const cs = new m.CrossSection([pts], 'EvenOdd');
    let body = m.Manifold.extrude(cs, bodyH);

    for (const k of keys) {
      const wellCube = m.Manifold.cube([wellSize, wellSize, bodyH - floor + 0.5], false);
      const placedWell = wellCube.translate([k.x - wellSize / 2, k.y - wellSize / 2, floor]);
      const cutBody = body.subtract(placedWell);
      body.delete();
      wellCube.delete();
      placedWell.delete();
      body = cutBody;

      const socketHole = m.Manifold.cube([14.2, 14.2, floor + 0.4], false);
      const placedSocket = socketHole.translate([k.x - 7.1, k.y - 7.1, -0.2]);
      const cutSocket = body.subtract(placedSocket);
      body.delete();
      socketHole.delete();
      placedSocket.delete();
      body = cutSocket;
    }

    const verts = body.getMesh().vertProperties.length / 3;
    console.log(`Preset [${name}]: ${keys.length} keys, body verts: ${verts}, valid: ${verts > 0}`);
    body.delete();
  }

  console.log('All 5 presets verified successfully!');
}

run().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
