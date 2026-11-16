import type { ExportPart } from '../shared/export/parts';
import type { MeshArrays } from '../shared/geometry/manifoldOps';
import { MX, mxCrossRects } from '../shared/geometry/mxStem';

export interface FitSettings {
  stemFit: number;     // Cross stem tolerance offset (-0.15 to +0.15 mm)
  pocketFit: number;   // 14x14mm Switch body cavity tolerance offset (-0.20 to +0.20 mm)
  topBaseGap: number;  // Clearance between keycap and base housing (0.3 to 1.5 mm)
}

export const DEFAULT_FIT: FitSettings = {
  stemFit: 0.00,
  pocketFit: 0.00,
  topBaseGap: 0.60,
};

export function normalizeFit(fit?: Partial<FitSettings>): FitSettings {
  return {
    stemFit: typeof fit?.stemFit === 'number' ? Math.max(-0.25, Math.min(0.25, fit.stemFit)) : DEFAULT_FIT.stemFit,
    pocketFit: typeof fit?.pocketFit === 'number' ? Math.max(-0.30, Math.min(0.30, fit.pocketFit)) : DEFAULT_FIT.pocketFit,
    topBaseGap: typeof fit?.topBaseGap === 'number' ? Math.max(0.2, Math.min(2.0, fit.topBaseGap)) : DEFAULT_FIT.topBaseGap,
  };
}

/**
 * Generates an ultra-fast calibration test strip containing 5 stems
 * with varying tolerances (-0.10, -0.05, 0.00, +0.05, +0.10 mm).
 * Users can print this small strip (~2g filament, 8 minutes) to test on their mechanical switch.
 */
export async function createFitTestStripSolids(m: any): Promise<ExportPart[]> {
  const steps = [-0.10, -0.05, 0.00, 0.05, 0.10];
  const stepPitch = 12.0; // mm center-to-center
  const stripWidth = steps.length * stepPitch + 6.0; // ~66 mm
  const stripDepth = 14.0; // mm
  const baseHeight = 3.0;  // mm
  const stemHeight = MX.stemHeight; // 5.0 mm

  // Base bar
  const baseBox = m.Manifold.cube([stripWidth, stripDepth, baseHeight], true);
  let combined = baseBox;

  // Add 5 test stems with varying tolerances
  const startX = -((steps.length - 1) * stepPitch) / 2;

  for (let i = 0; i < steps.length; i++) {
    const tol = steps[i];
    const x = startX + i * stepPitch;
    const rect = mxCrossRects(MX.defaultStemTolerance + tol);

    // Vertical bar of cross
    const barV = m.Manifold.cube([rect.thickness, rect.length, stemHeight], true);
    // Horizontal bar of cross
    const barH = m.Manifold.cube([rect.length, rect.thickness, stemHeight], true);
    const stemCross = barV.add(barH);
    barV.delete();
    barH.delete();

    // Position stem on top of base
    const placedStem = stemCross.translate([x, 0, (baseHeight + stemHeight) / 2]);
    stemCross.delete();

    const merged = combined.add(placedStem);
    combined.delete();
    placedStem.delete();
    combined = merged;
  }

  const raw = combined.getMesh();
  const mesh: MeshArrays = {
    vertProperties: new Float32Array(raw.vertProperties),
    triVerts: new Uint32Array(raw.triVerts),
    numProp: raw.numProp || 3,
  };
  combined.delete();

  const part: ExportPart = {
    name: 'fit-test-strip',
    mesh,
    colorRgb: [56, 189, 248], // Sky cyan
    extruder: 1,
  };

  return [part];
}
