import initManifold from 'manifold-3d';
import { createKeycapProfileSolid, KEYCAP_PROFILES } from '../src/clicker/profiles.ts';

async function testProfiles() {
  console.log('--- Testing Keycap Profiles (XDA, DSA, MOA, Flat, Standard) ---');
  const M = await initManifold();
  M.setup();

  const profiles = ['standard', 'flat', 'dsa', 'xda', 'moa'];
  let passed = 0;

  for (const prof of profiles) {
    const config = KEYCAP_PROFILES[prof];
    if (!config) {
      throw new Error(`Profile config missing for: ${prof}`);
    }

    const solid = await createKeycapProfileSolid(M, prof, {
      size: 18.2,
      wallThickness: 1.4,
    });

    const status = solid.status();
    const vol = solid.volume();
    const tri = solid.numTri();

    if (status !== 'NoError' || vol <= 0 || tri === 0) {
      throw new Error(`Profile ${prof} failed manifold check! status: ${status}, vol: ${vol}, tri: ${tri}`);
    }

    console.log(`✓ Profile [${prof.padEnd(8)}] -> height: ${config.height}mm, dish: ${config.dishType.padEnd(10)}, vol: ${vol.toFixed(1)}mm³, tris: ${tri}`);
    solid.delete();
    passed++;
  }

  console.log(`\nALL ${passed} KEYCAP PROFILES PASSED WATERTIGHT MANIFOLD TESTS!`);
}

testProfiles().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
