/**
 * Cherry MX stem / socket dimensions (mm).
 * Sources: community MX keycap specs (approximate, print-tolerant).
 */
export const MX = {
  stemCrossLength: 4.0,
  stemCrossThickness: 1.3,
  stemHeight: 5.0,
  socketCrossLength: 4.15,
  socketCrossThickness: 1.4,
  socketDepth: 5.2,
  switchBodyXY: 14.0,
  switchBodyZ: 11.6,
  unit1Outer: 18.1,
  /** Switch center-to-center pitch on a plate. */
  unitPitch: 19.05,
  /** Cherry-style 2u stab stem offset from center (span ≈ 23.8 mm). */
  stabOffset2u: 11.9,
  stabHoleDiameter: 4.1,
  stabHoleDepth: 5.0,
  defaultStemTolerance: 0.05,
} as const;

export type MxStemOptions = {
  tolerance?: number;
  height?: number;
};

export function mxCrossRects(tolerance: number = MX.defaultStemTolerance): {
  length: number;
  thickness: number;
} {
  return {
    length: MX.stemCrossLength + tolerance,
    thickness: MX.stemCrossThickness + tolerance,
  };
}

export function mxSocketRects(tolerance: number = MX.defaultStemTolerance): {
  length: number;
  thickness: number;
} {
  return {
    length: MX.socketCrossLength + tolerance,
    thickness: MX.socketCrossThickness + tolerance,
  };
}

/** 1–1.5u → center stem; 2u+ → two stems on MX pitch. */
export function stemOffsetsX(unit: number): number[] {
  if (unit >= 2) {
    const half = MX.unitPitch / 2;
    return [-half, half];
  }
  return [0];
}

/** Stabilizer receptacle X offsets for 2u+ (empty otherwise). */
export function stabOffsetsX(unit: number): number[] {
  if (unit >= 2) return [-MX.stabOffset2u, MX.stabOffset2u];
  return [];
}

/**
 * Builds a watertight MX cross solid with an optional 45° flared root fillet (chamferBase)
 * to reinforce the stem against layer-shear snapping during repeated mechanical switch clicks.
 */
export function buildReinforcedCross(
  M: any,
  length: number,
  thickness: number,
  height: number,
  chamferBase = true,
) {
  const barX = M.Manifold.cube([length, thickness, height], true);
  const barY = M.Manifold.cube([thickness, length, height], true);
  let cross = M.Manifold.union(barX, barY);
  barX.delete();
  barY.delete();

  if (chamferBase) {
    // 45-degree flared root base chamfer (height 1.2mm, flare +0.75mm on each side)
    const rootH = Math.min(1.2, height * 0.3);
    const flare = 0.75;
    const baseBarX = M.Manifold.cube([length + flare * 2, thickness + flare * 2, rootH], true);
    const baseBarY = M.Manifold.cube([thickness + flare * 2, length + flare * 2, rootH], true);
    const flared = M.Manifold.union(baseBarX, baseBarY);
    baseBarX.delete();
    baseBarY.delete();
    const flaredPlaced = flared.translate([0, 0, -height / 2 + rootH / 2]);
    flared.delete();
    const joined = M.Manifold.union(cross, flaredPlaced);
    cross.delete();
    flaredPlaced.delete();
    cross = joined;
  }
  return cross;
}
