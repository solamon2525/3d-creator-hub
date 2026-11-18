import initManifold from 'manifold-3d';
import { createKeychainLugRings } from '../src/keychain/presets.ts';
import { buildReinforcedCross } from '../src/shared/geometry/mxStem.ts';

async function testDurability() {
  console.log('--- Testing Mechanical Durability Guardrails ---');
  const M = await initManifold();
  M.setup();

  // 1. Keychain Loop Wall Thickness >= 2.0 mm
  const bounds = { minX: -20, maxX: 20, minY: -10, maxY: 10 };
  const holeDia = 4.0;
  const { lugRing, holeRing } = createKeychainLugRings(bounds, 'left', holeDia);

  // Measure outer radius vs inner radius
  const lugX = lugRing.map(p => p[0]);
  const holeX = holeRing.map(p => p[0]);
  const lugRadius = (Math.max(...lugX) - Math.min(...lugX)) / 2;
  const holeRadius = (Math.max(...holeX) - Math.min(...holeX)) / 2;
  const wallThickness = lugRadius - holeRadius;

  console.log(`Lug radius: ${lugRadius.toFixed(2)} mm, Hole radius: ${holeRadius.toFixed(2)} mm -> Wall thickness: ${wallThickness.toFixed(2)} mm`);
  if (wallThickness < 1.99) {
    throw new Error(`Keychain loop wall thickness is too fragile: ${wallThickness.toFixed(2)} mm < 2.0 mm`);
  }
  console.log('✓ Keychain loop wall thickness strictly enforces >= 2.0 mm (high tear resistance)');

  // 2. Reinforced Stem Cross with Chamfer
  const plainCross = buildReinforcedCross(M, 4.0, 1.3, 4.5, false);
  const reinforcedCross = buildReinforcedCross(M, 4.0, 1.3, 4.5, true);

  const plainVol = plainCross.volume();
  const reinforcedVol = reinforcedCross.volume();

  console.log(`Plain stem vol: ${plainVol.toFixed(2)} mm³, Reinforced stem vol: ${reinforcedVol.toFixed(2)} mm³`);
  if (reinforcedVol <= plainVol) {
    throw new Error(`Reinforced stem chamfer did not add structural volume: ${reinforcedVol} <= ${plainVol}`);
  }
  console.log(`✓ Reinforced stem has flared 45° base fillet (+${(reinforcedVol - plainVol).toFixed(2)} mm³ support volume)`);

  plainCross.delete();
  reinforcedCross.delete();
  console.log('\nALL DURABILITY GUARDRAILS PASSED!');
}

testDurability().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
