import { createFitTestStripSolids, normalizeFit, DEFAULT_FIT } from '../src/clicker/fit.ts';
import initManifold from 'manifold-3d';

async function testFitStrip() {
  console.log('Testing Fit & Tolerance Calibration Engine...');
  const M = await initManifold();
  M.setup();

  const fit = normalizeFit({ stemFit: 0.05, pocketFit: -0.05, topBaseGap: 0.8 });
  if (fit.stemFit !== 0.05 || fit.pocketFit !== -0.05 || fit.topBaseGap !== 0.8) {
    throw new Error('normalizeFit failed to preserve valid parameters');
  }

  const parts = await createFitTestStripSolids(M);
  if (!parts || parts.length === 0) {
    throw new Error('createFitTestStripSolids returned empty array');
  }

  const part = parts[0];
  const triCount = part.mesh.triVerts.length / 3;
  console.log(`✓ Fit test strip generated: ${part.name}, triangles: ${triCount}, plate: ${part.plateNumber}`);

  if (triCount < 50) {
    throw new Error(`Fit test strip triangle count too low: ${triCount}`);
  }

  console.log('\nFIT & TOLERANCE TEST STRIP PASSED MANIFOLD VERIFICATION!');
}

testFitStrip().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
