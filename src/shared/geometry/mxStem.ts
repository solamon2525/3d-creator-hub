/**
 * Cherry MX stem / socket dimensions (mm).
 * Sources: community MX keycap specs (approximate, print-tolerant).
 */
export const MX = {
  /** Outer cross arm length (X and Y of +). */
  stemCrossLength: 4.0,
  /** Cross arm thickness. */
  stemCrossThickness: 1.3,
  /** Stem shaft that engages the switch. */
  stemHeight: 5.0,
  /** Slightly larger for keycap female socket. */
  socketCrossLength: 4.15,
  socketCrossThickness: 1.4,
  socketDepth: 5.2,
  /** Switch body footprint under keycap (for clearance). */
  switchBodyXY: 14.0,
  switchBodyZ: 11.6,
  /** Typical 1u keycap outer size. */
  unit1Outer: 18.1,
  /** Switch center-to-center pitch on a plate. */
  unitPitch: 19.05,
  /** Stem XY looseness (+ easier to mount). */
  defaultStemTolerance: 0.05,
} as const;

export type MxStemOptions = {
  tolerance?: number;
  height?: number;
};

/** Build a + cross footprint as rectangle rings (outer only, solid cross). */
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

/**
 * Stem X offsets (mm) for multi-unit keycaps.
 * 1–1.5u → one center stem; 2u+ → two stems on MX pitch (±9.525).
 */
export function stemOffsetsX(unit: number): number[] {
  if (unit >= 2) {
    const half = MX.unitPitch / 2;
    return [-half, half];
  }
  return [0];
}
