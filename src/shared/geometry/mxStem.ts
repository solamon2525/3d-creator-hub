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
