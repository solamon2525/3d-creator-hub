import { createBaseOutline } from '../src/clicker/shapes.ts';
import initManifold from 'manifold-3d';

async function testAllShapes() {
  console.log('Testing 14 Base Shapes with Manifold WASM...');
  const M = await initManifold();
  M.setup();

  const shapes = [
    'circle',
    'square',
    'rectangle',
    'squircle',
    'capsule',
    'polygon',
    'star',
    'heart',
    'egg',
    'cross',
    'shield',
    'tag',
    'arch',
    'hexagon'
  ];

  let passed = 0;
  for (const s of shapes) {
    const ring = createBaseOutline(s, {
      size: 32,
      lockBaseSize: s === 'rectangle',
      baseWidth: 36,
      baseHeight: 28,
      turn: s === 'star' ? 18 : 0
    });

    if (!ring || ring.length < 3) {
      throw new Error(`Shape ${s} produced invalid ring: ${ring?.length} points`);
    }

    // Convert ring to Manifold CrossSection
    const flatRings = ring.map(([x, y]) => ({ x, y }));
    const crossSection = new M.CrossSection([flatRings], 'EvenOdd');
    const extruded = M.Manifold.extrude(crossSection, 10.0);

    const numTri = extruded.numTri();
    const vol = extruded.volume();

    if (numTri === 0 || vol <= 0) {
      throw new Error(`Shape ${s} produced collapsed solid! tri: ${numTri}, vol: ${vol}`);
    }

    console.log(`✓ Shape: ${s.padEnd(12)} -> points: ${ring.length.toString().padStart(3)}, tris: ${numTri.toString().padStart(4)}, vol: ${vol.toFixed(1)} mm³`);
    extruded.delete();
    crossSection.delete();
    passed++;
  }

  console.log(`\nALL ${passed} BASE SHAPES PASSED WATERTIGHT MANIFOLD TESTS!`);
}

testAllShapes().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
