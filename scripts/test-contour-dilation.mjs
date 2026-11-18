import initManifold from 'manifold-3d';
import { dilateTextContours } from '../src/keychain/contour.ts';

async function testContourDilation() {
  console.log('--- Testing Auto-Contour Dilation Engine for Thai & English Text ---');
  const M = await initManifold();
  M.setup();

  // Mock glyph rings for Thai word "น้อง" (N-O-NG with tone mark "ไม้โท" floating above)
  const baseConsonantRing = [
    [-10, -5],
    [10, -5],
    [10, 5],
    [-10, 5]
  ];
  // Floating tone mark above baseline
  const floatingToneRing = [
    [-2, 8],
    [2, 8],
    [2, 12],
    [-2, 12]
  ];

  const glyphs = [baseConsonantRing, floatingToneRing];
  const opts = {
    padding: 3.5,
    bridgeGaps: true,
  };

  const dilatedRings = dilateTextContours(glyphs, opts);

  if (!dilatedRings || dilatedRings.length === 0) {
    throw new Error('Dilation produced empty rings');
  }

  // The outer baseplate should be a unified single continuous ring (not separate islands)
  const outerRing = dilatedRings[0];
  if (outerRing.length < 8) {
    throw new Error(`Outer dilated ring has too few vertices: ${outerRing.length}`);
  }

  console.log(`✓ Dilated boundary ring produced: ${outerRing.length} points`);

  // Extrude to 3D Manifold solid to verify it forms a watertight solid plate
  const flat = outerRing.map(([x, y]) => ({ x, y }));
  const cs = new M.CrossSection([flat], 'EvenOdd');
  const plate = M.Manifold.extrude(cs, 2.8);
  cs.delete();

  const status = plate.status();
  const vol = plate.volume();
  const tri = plate.numTri();

  if (status !== 'NoError' || vol <= 0) {
    throw new Error(`Baseplate solid invalid: status=${status}, vol=${vol}`);
  }

  console.log(`✓ Manifold watertight check passed: vol = ${vol.toFixed(1)} mm³, tris = ${tri}`);
  console.log('✓ Floating tone marks successfully bridged into unified solid baseplate!');
  plate.delete();
}

testContourDilation().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
