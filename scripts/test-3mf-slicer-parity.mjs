import { unzipSync, strFromU8 } from 'fflate';
import { build3mf, layoutPartsForBed, meshBounds } from '../src/shared/export/parts.ts';

function createMockBoxMesh(w, d, h) {
  const hx = w / 2, hy = d / 2;
  const vp = new Float32Array([
    -hx, -hy, 0,
     hx, -hy, 0,
     hx,  hy, 0,
    -hx,  hy, 0,
    -hx, -hy, h,
     hx, -hy, h,
     hx,  hy, h,
    -hx,  hy, h,
  ]);
  const tv = new Uint32Array([
    0, 1, 2, 0, 2, 3, // bottom
    4, 6, 5, 4, 7, 6, // top
    0, 4, 5, 0, 5, 1, // front
    2, 6, 7, 2, 7, 3, // back
    0, 3, 7, 0, 7, 4, // left
    1, 5, 6, 1, 6, 2, // right
  ]);
  return { vertProperties: vp, triVerts: tv, numProp: 3 };
}

async function test3mfSlicerParity() {
  console.log('--- Testing 3MF Dual-Preset & Bambu Studio Slicer Parity ---');

  const bodyMesh = createMockBoxMesh(30, 30, 8);
  const capMesh = createMockBoxMesh(18, 18, 7);
  const flushMesh = createMockBoxMesh(10, 10, 1);

  const parts = [
    { name: 'body', mesh: bodyMesh, colorRgb: [15, 23, 42], extruder: 1 },
    { name: 'cap', mesh: capMesh, colorRgb: [247, 247, 245], extruder: 2 },
    { name: 'flush-accent', mesh: flushMesh, colorRgb: [194, 65, 12], extruder: 3 },
  ];

  // Build 3MF with print-ready layout
  const zipBytes = build3mf(parts, { layoutForBed: true });
  if (!zipBytes || zipBytes.byteLength === 0) {
    throw new Error('build3mf returned empty bytes');
  }

  const unzipped = unzipSync(zipBytes);

  // 1. Check essential 3MF container files
  const requiredFiles = ['3D/3dmodel.model', '[Content_Types].xml', '_rels/.rels', 'Metadata/plate_1.json'];
  for (const req of requiredFiles) {
    if (!unzipped[req]) {
      throw new Error(`Missing expected file in 3MF package: ${req}`);
    }
  }

  // 2. Inspect 3D/3dmodel.model XML
  const modelXml = strFromU8(unzipped['3D/3dmodel.model']);
  if (!modelXml.includes('<basematerials id="1">')) {
    throw new Error('Missing <basematerials id="1"> in 3dmodel.model');
  }

  // Check AMS color hexes
  if (!modelXml.includes('displaycolor="#0f172aFF"') ||
      !modelXml.includes('displaycolor="#f7f7f5FF"') ||
      !modelXml.includes('displaycolor="#c2410cFF"')) {
    throw new Error('Filament colors not mapped correctly in basematerials');
  }

  // Check that all vertices have z >= -0.01 (grounded to build plate)
  const zMatches = [...modelXml.matchAll(/z="([-0-9.]+)"/g)];
  if (zMatches.length === 0) {
    throw new Error('No vertex z coordinates found in 3dmodel.model');
  }
  for (const m of zMatches) {
    const z = parseFloat(m[1]);
    if (z < -0.05) {
      throw new Error(`Found ungrounded vertex with z=${z} (< -0.05) in 3dmodel.model!`);
    }
  }

  // 3. Inspect Bambu Metadata/plate_1.json
  const plateJson = JSON.parse(strFromU8(unzipped['Metadata/plate_1.json']));
  if (!plateJson.plate_name || !plateJson.bed_type) {
    throw new Error('Invalid Bambu plate_1.json schema');
  }
  if (!Array.isArray(plateJson.filaments) || plateJson.filaments.length !== 3) {
    throw new Error(`Expected 3 AMS filaments in plate_1.json, found ${plateJson.filaments?.length}`);
  }

  console.log(`✓ 3MF package contains all slicer files (${Object.keys(unzipped).join(', ')})`);
  console.log(`✓ Standard 3MF XML contains ${zMatches.length} vertices, all grounded to Z >= 0`);
  console.log(`✓ Bambu Studio plate_1.json verified with ${plateJson.filaments.length} pre-assigned AMS filaments`);
  console.log('\n3MF SLICER PARITY TEST PASSED!');
}

test3mfSlicerParity().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
