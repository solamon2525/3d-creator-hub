---
name: clicker-maker
description: Use when designing, building, modifying, or testing mechanical switch clickers, fidget toys, multi-key fidget blocks (Row, WASD, Grid), custom keycap buttons, or MakerWorld-parity 3D print assets. Covers exact Cherry MX switch & socket dimensions (mm), 14 base housing shapes, multi-key layout pitch (20.0 mm), watertight Manifold CSG booleans, fit & tolerance calibration (-0.15 to +0.15 mm), Bambu AMS 3MF multi-part packaging, and physical print verification.
---

# Clicker Maker — Mechanical Switch & Fidget Generator Skill

Comprehensive engineering guide for generating 3D printable mechanical switch clickers, fidget toys, multi-key fidget blocks, and customizable keycaps.

Package manager: **pnpm only** · CSG Engine: **Manifold WASM** · Slicer Target: **Bambu Studio / OrcaSlicer / PrusaSlicer**

---

## 1. The Three Iron Laws of Clicker Geometry

1. **1 Scene Unit = 1.0 Millimeter (mm) Always**  
   Three.js is strictly for viewport rendering. **Manifold WASM is the single source of truth** for export geometry. Never use Three.js `ExtrudeGeometry` or mesh approximations for physical 3D print exports.
2. **Mechanical Tolerances are Physical, Not Visual**  
   A deviation of $\pm 0.1\text{ mm}$ determines whether a Cherry MX switch snaps firmly, wobbles loose, or cracks the stem. Always enforce standard dimensions with configurable fit offsets.
3. **Watertight 2-Manifolds with EvenOdd CrossSections**  
   Every exported solid must be completely manifold (closed shell, no self-intersections, no zero-thickness walls). Glyph outlines and hollow shapes MUST be converted using `new m.CrossSection([outerRing, ...innerRings], 'EvenOdd')` before extrusion to prevent zero-volume mesh collapses.

---

## 2. Hardware Dimensions & Calibration Standards

Every Cherry MX mechanical switch (and compatible clones like Gateron, Outemu, Kailh) conforms to strict physical dimensions:

| Component / Feature | Nominal Dimension | Toleranced Range | Critical Function / Note |
|---|---|---|---|
| **MX Cross Stem Length** | `4.00 mm` | `3.95 – 4.05 mm` | Fits into keycap cross receptacle |
| **MX Cross Stem Thickness** | `1.15 mm` | `1.10 – 1.25 mm` | Primary friction fit; adjust via `stemFit` |
| **MX Stem Total Height** | `4.50 – 5.00 mm` | `4.50 mm` | Extends from bottom of keycap into switch |
| **Switch Latch Floor Hole** | `14.20 × 14.20 mm` | `14.10 – 14.30 mm` | Square cutout for switch retention clips |
| **Latching Floor Thickness** | `2.20 – 2.40 mm` | `2.10 – 2.50 mm` | **CRITICAL:** $>2.5\text{ mm}$ prevents tabs snapping; $<2.0\text{ mm}$ flexes |
| **Upper Switch Well Cavity** | `16.20 × 16.20 mm` | `16.00 – 16.50 mm` | Recessed pocket housing upper switch body |
| **Switch Well Depth** | `8.50 – 9.00 mm` | `8.00 – 9.50 mm` | Deep enough for switch collar to rest flush |
| **Multi-Key Pitch ($P$)** | `20.00 mm` | `19.80 – 20.20 mm` | Center-to-center spacing for multi-key blocks |
| **Keycap Top Button Size** | `17.50 × 17.50 mm` | `17.00 – 18.00 mm` | Leaves `2.5 mm` clearance between adjacent keys |
| **Keycap Height ($H_{\text{cap}}$)**| `6.50 mm` | `5.50 – 7.50 mm` | Height of the printed button |
| **Top-to-Base Travel Gap** | `0.60 mm` | `0.30 – 1.50 mm` | Clearance preventing cap from rubbing casing |
| **Single Base Diameter** | `32.00 mm` | `24.00 – 50.00 mm` | Outer body size for single-key clickers |
| **Keychain Loop Outer Radius**| `3.50 mm` | `3.00 – 4.00 mm` | Protrudes `3.5 mm` with `1.8 mm` hole radius |

---

## 3. Base Shapes & Contour Mathematics

Single-key clickers support **14 distinct base housing contours**. Each contour is generated as an array of 2D points (`[x, y][]` in mm) before extrusion:

```
                  ┌───────────────┐
                  │ 14 Base Shapes│
                  └───────┬───────┘
       ┌──────────────────┼──────────────────┐
   Geometric           Organic             Utility
   • Circle            • Heart             • Tag (Chamfer top)
   • Squircle (n=4)    • Egg (Tapered)     • Shield
   • Square/Rect       • Star (5-Point)    • Arch (Vaulted top)
   • Capsule / Pill    • Cross             • Keychain Ring Loop
   • Polygon (N-gon)   • Hexagon
```

### Key Mathematical Formulations:

1. **Squircle (Superellipse, $n = 4$):**
   $$x(\theta) = r_x \cdot \operatorname{sgn}(\cos \theta) \cdot |\cos \theta|^{2/n}$$
   $$y(\theta) = r_y \cdot \operatorname{sgn}(\sin \theta) \cdot |\sin \theta|^{2/n}$$
   Provides soft, comfortable tactile ergonomics without sharp corner stress risers.

2. **Capsule / Stadium:**
   Two parallel horizontal segments connected by semi-circular caps with radius $r = d / 2$ at both ends.

3. **Egg Profile:**
   $$x(\theta) = r_x \cdot \cos \theta, \quad y(\theta) = r_y \cdot \sin \theta \cdot (1 + 0.18 \cdot \sin \theta)$$
   Tapers gracefully at the apex while maintaining a wide, stable base on the print bed.

---

## 4. Multi-Key Fidget Blocks Architecture

Multi-key fidget blocks (Row 1x2–1x4, Grid 2x2, WASD, Arrow Keys) arrange $N$ switches and $N$ keycaps in a unified solid casing.

### 4.1 Preset Layout Matrix (Pitch $P = 20.0\text{ mm}$)

```
Row 1x4:    [ 1 ]───[ 2 ]───[ 3 ]───[ 4 ]    (X: -30, -10, +10, +30; Y: 0)
WASD:               [ W ]                    (X:   0, Y: +10)
            [ A ]───[ S ]───[ D ]            (X: -20, 0, +20; Y: -10)
Grid 2x2:   [ 1 ]───[ 2 ]                    (X: -10, +10; Y: +10)
            [ 3 ]───[ 4 ]                    (X: -10, +10; Y: -10)
```

```typescript
export const BLOCK_PRESETS: Record<BlockPreset, (pitch?: number) => BlockLayout> = {
  single:  () => ({ keys: [{ x: 0, y: 0, label: '1' }] }),
  row2:    (p = 20) => ({ keys: [{ x: -p/2, y: 0, label: '1' }, { x: p/2, y: 0, label: '2' }] }),
  row3:    (p = 20) => ({ keys: [{ x: -p, y: 0, label: '1' }, { x: 0, y: 0, label: '2' }, { x: p, y: 0, label: '3' }] }),
  row4:    (p = 20) => ({ keys: [{ x: -p*1.5, y: 0, label: '1' }, { x: -p*0.5, y: 0, label: '2' }, { x: p*0.5, y: 0, label: '3' }, { x: p*1.5, y: 0, label: '4' }] }),
  grid2x2: (p = 20) => ({ keys: [{ x: -p/2, y: p/2, label: '1' }, { x: p/2, y: p/2, label: '2' }, { x: -p/2, y: -p/2, label: '3' }, { x: p/2, y: -p/2, label: '4' }] }),
  wasd:    (p = 20) => ({ keys: [{ x: 0, y: p/2, label: 'W' }, { x: -p, y: -p/2, label: 'A' }, { x: 0, y: -p/2, label: 'S' }, { x: p, y: -p/2, label: 'D' }] }),
  arrows:  (p = 20) => ({ keys: [{ x: 0, y: p/2, label: '▲' }, { x: -p, y: -p/2, label: '◄' }, { x: 0, y: -p/2, label: '▼' }, { x: p, y: -p/2, label: '►' }] }),
};
```

### 4.2 Casing Bounding Box Algorithm

To generate a smooth rounded outer wall with uniform thickness around all keys:
1. Find $\min(X), \max(X), \min(Y), \max(Y)$ across all key coordinates.
2. Add half-well clearance ($10.0\text{ mm}$) and wall padding ($2.5\text{ mm}$).
3. Extrude the 2D rounded rectangle with fillet radius $R = 5.0\text{ mm}$ to total casing height ($11.0\text{ mm}$).
4. Subdivide cavities by performing Manifold boolean subtractions for each key slot:
   - Well pocket: `[16.2, 16.2, height - floor + 0.5]` translated to `[kx - 8.1, ky - 8.1, floor]`
   - Latch socket: `[14.2, 14.2, floor + 0.6]` translated to `[kx - 7.1, ky - 7.1, -0.3]`

---

## 5. Watertight Manifold CSG Implementation Pattern

Follow this exact pattern when generating CSG solids in TypeScript/JavaScript:

```typescript
import Module from 'manifold-3d';

export async function buildWatertightClicker(m: any, options: ClickerBuildOptions) {
  // 1. Base Casing via 2D CrossSection
  const casingOutline = createRoundedRect(width, depth, cornerRadius);
  const casingCS = new m.CrossSection([casingOutline], 'EvenOdd');
  let body = m.Manifold.extrude(casingCS, bodyHeight);
  casingCS.delete();

  // 2. Cut Switch Well & Latch Socket
  const well = m.Manifold.cube([16.2, 16.2, bodyHeight - 2.4 + 0.5], false)
                        .translate([-8.1, -8.1, 2.4]);
  const socket = m.Manifold.cube([14.2, 14.2, 2.4 + 0.6], false)
                          .translate([-7.1, -7.1, -0.3]);
  
  let cutBody = body.subtract(well);
  body.delete(); well.delete();
  
  let finalBody = cutBody.subtract(socket);
  cutBody.delete(); socket.delete();

  // 3. Keycap Solid with MX Cross Stem
  const capOutline = createRoundedRect(17.5, 17.5, 2.5);
  const capCS = new m.CrossSection([capOutline], 'EvenOdd');
  const capBlock = m.Manifold.extrude(capCS, capHeight);
  capCS.delete();

  // Cross Stem (V-bar + H-bar)
  const stemT = 1.15 + (options.stemFit ?? 0);
  const barV = m.Manifold.cube([stemT, 4.0, 4.5], true);
  const barH = m.Manifold.cube([4.0, stemT, 4.5], true);
  const stem = barV.add(barH);
  barV.delete(); barH.delete();

  const positionedStem = stem.translate([0, 0, -capHeight / 2 + 4.5 / 2]);
  stem.delete();
  
  const finalCap = capBlock.add(positionedStem);
  capBlock.delete(); positionedStem.delete();

  return { body: finalBody, cap: finalCap };
}
```

---

## 6. Fit & Tolerance Calibration (The 5-Step Fit Strip)

Different 3D printers, filament brands (e.g. PLA vs PETG vs ABS), and nozzle wear cause dimensional variations between $0.05\text{ mm}$ and $0.15\text{ mm}$.

### 6.1 Calibration Decision Matrix

| Symptom Observed | Root Cause | Action in Fit Settings |
|---|---|---|
| Keycap falls off or wobbles when clicked | Cross stem too thin | Increase `stemFit` by `+0.05 mm` |
| Keycap cracks the switch stem or won't press down | Cross stem too thick | Decrease `stemFit` by `-0.05 mm` |
| Switch drops freely through the bottom hole | Socket cutout too large | Decrease `pocketFit` by `-0.05 mm` |
| Switch latch clips cannot squeeze into socket | Socket cutout too small | Increase `pocketFit` by `+0.05 mm` |
| Keycap rubs against base during actuation | Insufficient clearance | Increase `topBaseGap` (e.g. `0.80 mm`) |

### 6.2 Instant 8-Minute Fit Test Strip

Generate and print `createFitTestStripSolids(m)` before large production batches:
- **Footprint:** $66 \times 14 \times 8\text{ mm}$, uses $\sim 2\text{ g}$ filament, prints in $\approx 8\text{ minutes}$.
- **Features:** 5 test cross-stems ranging from $-0.10\text{ mm}$ to $+0.10\text{ mm}$ in $0.05\text{ mm}$ increments.
- Directly plug your mechanical switch onto each step to immediately identify the ideal filament offset.

---

## 7. Bambu AMS 3MF Packaging & Multi-Material Pipeline

For Bambu Studio and OrcaSlicer, export files as a valid multi-part `.3mf` package containing `3D/3dmodel.model` wrapped in a ZIP archive (using `fflate`):

```
project.3mf
├── [Content_Types].xml
├── _rels/.rels
└── 3D/
    ├── 3dmodel.model       <-- Multi-part XML with color IDs and transform
    └── Metadata/
        └── plate_1.json    <-- Bambu Studio auto-plate assignment
```

### 7.1 Part Segregation by Extruder

1. **`clicker-body`** $\to$ Plate 1, Extruder 1 (Base Housing color)
2. **`cap-0` .. `cap-(N-1)`** $\to$ Plate 1, Extruder 2 (Keycap button color)
3. **`decor-0` .. `decor-(N-1)`** $\to$ Plate 1, Extruder 3 (Embossed text / Icon legends)

### 7.2 Slicer Print Orientation Rules

- **Casing Body:** Orient **upright** (flat bottom on print bed). The $14.2\text{ mm}$ switch bridge bridges cleanly across standard slicer bridging paths without support.
- **Keycaps:** Orient **upright** (stem down) if printing with multi-color AMS, or **inverted** (face down on textured PEI bed) if aiming for a textured matte legend surface.
- **Walls & Infill:** Set $\ge 3$ perimeters and $100\%$ infill for the keycap cross stem to prevent layer shearing under repeated clicks.

---

## 8. Verification & Test Workflow

Always run the full suite of verification scripts before committing changes or releasing models:

```bash
# Navigate to workspace
cd d:\3d-creator-hub

# 1. Verify 14 Base Shapes watertight CSG
node scripts/test-shapes.mjs

# 2. Verify Fit Test Strip calibration generator
node scripts/test-fit-strip.mjs

# 3. Verify Multi-key Fidget Blocks geometry & presets
node scripts/test-blocks.mjs

# 4. Verify Modular Clicker assembly & 3MF structure
node scripts/test-modular.mjs

# 5. TypeScript compile & production bundle build
pnpm build
```

---

## 9. Common Mistakes & Rationalizations Table

| Anti-Pattern / Rationalization | Why It Fails in Production | Correct Engineering Practice |
|---|---|---|
| *"Three.js looks fine so it will print fine."* | Three.js meshes can have inverted normals, self-intersections, and open edges that cause slicer slicing errors. | Always execute CSG operations via **Manifold WASM**. Check watertight status via volume and triangle count. |
| *"Standard keyboard pitch is 19.05 mm, let's use that."* | $19.05\text{ mm}$ pitch leaves only $1.55\text{ mm}$ between $17.5\text{ mm}$ keycaps; user fingers collide and bind during fidgeting. | Enforce **$20.00\text{ mm}$ pitch** for fidget blocks to ensure a clean $2.50\text{ mm}$ inter-key clearance. |
| *"Extrude each glyph ring and union them together."* | Characters with counters ('O', 'A', '8', 'ห', 'อ') collapse into hollow or empty solids (`triCount: 0`). | Use `new m.CrossSection([outerRing, ...innerRings], 'EvenOdd')` before calling `extrude()`. |
| *"Floor thickness of 1.5 mm is enough to save filament."* | Switch latch retention clips require a $2.20 – 2.40\text{ mm}$ ledge. Thinner floors cause the switch to rock and pop out during pressing. | Lock floor thickness strictly to **$2.20 – 2.40\text{ mm}$**. |
| *"Omit intermediate `.delete()` calls to keep code short."* | Manifold WASM runs in WebAssembly memory with a fixed heap. Unfreed intermediate meshes trigger Out-Of-Memory aborts. | Call `.delete()` on every intermediate solid and `CrossSection` immediately after booleans. |
