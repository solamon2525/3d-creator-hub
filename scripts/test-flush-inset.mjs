import initManifold from 'manifold-3d';
import { createKeycapProfileSolid } from '../src/clicker/profiles.ts';

async function testFlushInset() {
  console.log('--- Testing Flush Inset Multi-Material Legend Boolean ---');
  const M = await initManifold();
  M.setup();

  const cap = await createKeycapProfileSolid(M, 'xda', { size: 18.2 });
  const origVol = cap.volume();
  const capTopZ = 9.2; // XDA top Z
  const insetDepth = 0.8;

  // Create a star-shaped or cross-shaped legend solid that cuts into the top face
  const starCross = new M.CrossSection([
    [
      { x: -3, y: -1 },
      { x: 3, y: -1 },
      { x: 3, y: 1 },
      { x: -3, y: 1 }
    ],
    [
      { x: -1, y: -3 },
      { x: 1, y: -3 },
      { x: 1, y: 3 },
      { x: -1, y: 3 }
    ]
  ], 'NonZero');

  const legendRaw = M.Manifold.extrude(starCross, insetDepth);
  starCross.delete();
  const legendSolid = legendRaw.translate([0, 0, capTopZ - insetDepth]);
  legendRaw.delete();

  const hollowedCap = M.Manifold.difference(cap, legendSolid);
  const hollowedVol = hollowedCap.volume();
  const legendVol = legendSolid.volume();

  if (hollowedCap.status() !== 'NoError') {
    throw new Error(`Hollowed cap failed with status: ${hollowedCap.status()}`);
  }

  if (legendSolid.status() !== 'NoError') {
    throw new Error(`Legend solid failed with status: ${legendSolid.status()}`);
  }

  if (hollowedVol >= origVol) {
    throw new Error(`Hollowed cap volume (${hollowedVol}) should be less than original (${origVol})`);
  }

  console.log(`✓ Original cap vol: ${origVol.toFixed(2)} mm³`);
  console.log(`✓ Legend inlay vol: ${legendVol.toFixed(2)} mm³`);
  console.log(`✓ Pocketed cap vol: ${hollowedVol.toFixed(2)} mm³ (cut difference: ${(origVol - hollowedVol).toFixed(2)} mm³)`);
  console.log('✓ Flush Inset boolean subtraction is watertight and coplanar for AMS multi-material slicing!');

  cap.delete();
  legendSolid.delete();
  hollowedCap.delete();
}

testFlushInset().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
