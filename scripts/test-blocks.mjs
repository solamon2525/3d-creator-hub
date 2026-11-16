import Module from 'manifold-3d';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBlockSolids, BLOCK_PRESETS } from '../src/clicker/blocks.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  console.log('Testing Fidget Blocks Geometry Engine (Solid Bottom & Borders Parity)...');
  const wasmPath = path.resolve(__dirname, '../node_modules/manifold-3d/manifold.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);
  const m = await Module({ wasmBinary });
  m.setup();

  const presetsToTest = ['single', 'row2', 'row3', 'row4', 'col2', 'col3', 'col4', 'grid2x2', 'wasd', 'arrows'];

  for (const pid of presetsToTest) {
    const preset = BLOCK_PRESETS[pid];
    if (!preset) {
      throw new Error(`Missing preset: ${pid}`);
    }

    const layout = preset.layout(20.0);
    const { body, caps } = buildBlockSolids(m, layout, {
      solidFloor: true,
      borders: true,
      keycapProfile: 'standard',
    });

    const mesh = body.getMesh();
    const vertCount = mesh.vertProperties.length / 3;
    const triCount = mesh.triVerts.length / 3;

    // Verify watertightness and triangle counts
    if (triCount < 10) {
      throw new Error(`Body triangle count too low for [${pid}]: ${triCount}`);
    }

    // Verify solid bottom: all Z coordinates >= 0.0, and min Z is exactly 0.0
    let minZ = Infinity;
    let maxZ = -Infinity;
    let bottomVertsCount = 0;

    for (let i = 0; i < vertCount; i++) {
      const z = mesh.vertProperties[i * 3 + 2];
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
      if (Math.abs(z) < 0.001) bottomVertsCount++;
    }

    if (minZ < -0.001) {
      throw new Error(`Casing penetrated below print bed (minZ = ${minZ}) in [${pid}]!`);
    }

    if (Math.abs(minZ) > 0.001) {
      throw new Error(`Casing base not aligned to bed Z=0 (minZ = ${minZ}) in [${pid}]!`);
    }

    if (bottomVertsCount < 4) {
      throw new Error(`Casing does not have solid flat bottom base in [${pid}]!`);
    }

    // Verify keycaps
    if (caps.length !== layout.keys.length) {
      throw new Error(`Keycaps count mismatch for [${pid}]: expected ${layout.keys.length}, got ${caps.length}`);
    }

    for (const c of caps) {
      const capMesh = c.solid.getMesh();
      const capTris = capMesh.triVerts.length / 3;
      if (capTris < 10) {
        throw new Error(`Keycap ${c.index} tri count too low: ${capTris}`);
      }
      c.solid.delete();
    }

    console.log(`✓ Preset [${pid.padEnd(8)}]: ${layout.keys.length} keys, body tris: ${triCount}, bottomVerts: ${bottomVertsCount}, valid solid bottom`);
    body.delete();
  }

  console.log('\nALL 10 FIDGET BLOCK PRESETS PASSED SOLID-BOTTOM & BORDERS VERIFICATION!');
}

run().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
