# Fidget Blocks Solid Base & Socket Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul Fidget Blocks geometry in 3D Creator Hub to achieve 100% parity with MakerWorld Clicker Generator: solid closed bottom (no bottom through-holes), individual switch sockets with stepped blind pin relief, cell border grooves (Borders toggle), Column layout presets, and sculpted OEM tapered keycaps.

**Architecture:** Update `src/clicker/blocks.ts` with solid floor logic, cell divider walls, V-groove borders CSG, and tapered keycap lofting; expose Borders toggle, Column layouts, and Keycap profile in `src/clicker/main.ts` and UI controls; update unit and verification tests in `scripts/test-blocks.mjs`.

**Tech Stack:** TypeScript, Manifold WASM CSG, Three.js preview, Vite, pnpm.

**Spec:** MakerWorld Clicker Generator reference screenshots (`media_1794826527667_686644ce.jpg`, `media_1794826575260_8be0f8e8.jpg`).

---

## Global Constraints

- **1 Scene Unit = 1.0 Millimeter (mm) Always.**
- **Solid Bottom Guarantee:** The underside face of the casing at $z = 0$ must be a contiguous, 100% solid flat surface with zero holes penetrating through to the bed.
- **Solid Floor Thickness:** Minimum floor thickness between the internal cavity floor and the bottom of the base is $\ge 1.8\text{ mm}$ (default $2.0\text{ mm}$).
- **Switch Socket Dimensions:** Stepped cavity:
  - Upper switch collar: $16.0 \times 16.0\text{ mm}$, depth $4.5\text{ mm}$ from top rim.
  - Switch body latch pocket: $14.2 \times 14.2\text{ mm}$, depth $4.5\text{ mm}$.
  - Blind center-post & pin relief: $10.0 \times 10.0\text{ mm}$ (or $\varnothing 6.0\text{ mm}$), depth $2.0\text{ mm}$, terminating strictly above the solid floor ($z \ge 1.8\text{ mm}$).
- **Multi-Key Pitch:** Firmly locked at $20.0\text{ mm}$ center-to-center.
- **Memory Management:** Call `.delete()` on every intermediate Manifold CSG object to avoid WebAssembly memory leaks.

---

## Review Focus

1. **Bottom Planar Integrity:** Slicers must slice the base flat against the bed with zero bridges, holes, or perimeter rings on the bottom layer.
2. **Switch Seat Depth:** Total cavity depth from casing top to the switch seat ledge must be $\ge 8.5\text{ mm}$ so the switch collar rests flush with the upper rim.
3. **Borders Groove Depth:** V-grooves between cells must be strictly aesthetic ($\le 0.8\text{ mm}$ deep, $\le 1.0\text{ mm}$ wide) without puncturing into the switch cavity.
4. **Sculpted Keycap Ergonomics:** Tapered keycap must have $17.5 \times 17.5\text{ mm}$ base, sloping to $13.5 \times 13.5\text{ mm}$ top with a comfortable dish, leaving ample surface area for embossed/debossed text legends.
5. **Multi-Part Export Integrity:** Body, individual keycaps, and legends must remain correctly partitioned into distinct meshes with separate extruder IDs in the 3MF archive.

---

## Task Decomposition

### Task 1: Redesign `buildBlockSolids` for Solid Bottom & Stepped Switch Sockets

**Files:**
- Modify: `src/clicker/blocks.ts:194-292`
- Test: `scripts/test-blocks.mjs`

**Interfaces:**
- Consumes: `BlockLayout`, `m: ManifoldModule`
- Produces: `buildBlockSolids(m, layout, opts)` where `opts.solidFloor = true` guarantees zero penetrations at $z \le 0$.

- [ ] **Step 1: Write test in `scripts/test-blocks.mjs` asserting solid bottom**
  Verify that for all block presets, the bounding box Z min is $0.0$, and sampling the bottom face area equals the outer bounding outline without inner hole loops.
- [ ] **Step 2: Run test to observe baseline failure**
  Run: `node scripts/test-blocks.mjs`
  Expected: Current code has through-holes at $z \le 0$ which fails the solid-bottom invariant.
- [ ] **Step 3: Implement stepped blind switch sockets in `src/clicker/blocks.ts`**
  - Set `solidFloor = opts.floor ?? 2.0` (mm above $z = 0$).
  - For each key $(kx, ky)$:
    - Cut collar pocket: $16.0 \times 16.0\text{ mm}$ from $z = \text{bodyH} - 4.5$ to $z = \text{bodyH} + 0.1$.
    - Cut body pocket: $14.2 \times 14.2\text{ mm}$ from $z = \text{solidFloor} + 2.0$ to $z = \text{bodyH} - 4.5$.
    - Cut pin/boss blind relief: $10.0 \times 10.0\text{ mm}$ from $z = \text{solidFloor}$ to $z = \text{solidFloor} + 2.0$.
  - Remove the old `socketHole` that penetrated $z = -0.3$.
- [ ] **Step 4: Run test to verify solid bottom passes**
  Run: `node scripts/test-blocks.mjs`
  Expected: PASS — bottom face is 100% solid and watertight.
- [ ] **Step 5: Commit changes**
  ```bash
  git add src/clicker/blocks.ts scripts/test-blocks.mjs
  git commit -m "feat(clicker): implement 100% solid bottom and stepped blind switch sockets for fidget blocks"
  ```

---

### Task 2: Implement Cell Border Grooves ("Borders" Feature) & Column Presets

**Files:**
- Modify: `src/clicker/blocks.ts:20-125, 208-292`
- Test: `scripts/test-blocks.mjs`

**Interfaces:**
- Consumes: `opts.borders?: boolean` in `BlockBuildOptions`
- Produces: `col2`, `col3`, `col4` presets in `BLOCK_PRESETS`; V-groove bevels between adjacent key cells when `borders === true`.

- [ ] **Step 1: Add Column presets (`col2`, `col3`, `col4`) to `BLOCK_PRESETS`**
  Add vertical column arrangements matching MakerWorld's Column layout:
  - `col2`: keys at $x=0, y = \pm 10.0\text{ mm}$
  - `col3`: keys at $x=0, y = 0, \pm 20.0\text{ mm}$
  - `col4`: keys at $x=0, y = \pm 10.0, \pm 30.0\text{ mm}$
- [ ] **Step 2: Implement V-groove border cuts between adjacent cells**
  When `opts.borders !== false`:
  - Calculate boundary planes between adjacent keys along X and Y axes.
  - Subtract an inverted triangular prism (V-groove: width $1.2\text{ mm}$, depth $0.8\text{ mm}$) along the top face and outer vertical side walls.
- [ ] **Step 3: Update `scripts/test-blocks.mjs` to verify Column presets and borders**
  Run: `node scripts/test-blocks.mjs`
  Expected: PASS — all 8 presets (`single`, `row2`, `row3`, `row4`, `col2`, `col3`, `col4`, `grid2x2`, `wasd`, `arrows`) generate watertight solids with borders.
- [ ] **Step 4: Commit changes**
  ```bash
  git add src/clicker/blocks.ts scripts/test-blocks.mjs
  git commit -m "feat(clicker): add column layout presets and cell border V-grooves to fidget blocks"
  ```

---

### Task 3: Implement Sculpted Ergonomic Tapered Keycaps (OEM Profile)

**Files:**
- Modify: `src/clicker/blocks.ts:248-290`
- Test: `scripts/test-blocks.mjs`

**Interfaces:**
- Consumes: `opts.keycapProfile?: 'standard' | 'flat' | 'low'`
- Produces: Tapered keycap solids with drafted walls ($17.5\text{ mm} \to 13.5\text{ mm}$) and top finger dish.

- [ ] **Step 1: Write helper function `createTaperedKeycapSolid` in `src/clicker/blocks.ts`**
  - Base footprint: $17.5 \times 17.5\text{ mm}$ with $2.5\text{ mm}$ corner radius.
  - Top face: $13.5 \times 13.5\text{ mm}$ with $2.0\text{ mm}$ corner radius at $z = \text{capH}$.
  - Loft or multi-slice convex hull / smooth extrude connecting base to top.
  - Dish cut: subtract a subtle cylinder/sphere ($R = 30\text{ mm}$) from the top surface for ergonomic tactile feedback.
- [ ] **Step 2: Integrate sculpted keycap in `buildBlockSolids`**
  Replace flat extrusion with `createTaperedKeycapSolid`, joining the MX cross stem ($4.0 \times 1.15 \times 4.5\text{ mm}$) on the underside.
- [ ] **Step 3: Run test script to verify watertight tapered keycaps**
  Run: `node scripts/test-blocks.mjs`
  Expected: PASS — keycaps have authentic OEM mechanical keyboard aesthetic with watertight manifold geometry.
- [ ] **Step 4: Commit changes**
  ```bash
  git add src/clicker/blocks.ts scripts/test-blocks.mjs
  git commit -m "feat(clicker): add sculpted OEM tapered keycaps with ergonomic finger dishes"
  ```

---

### Task 4: Connect UI Controls in `src/clicker/main.ts` & Checklist Updates

**Files:**
- Modify: `src/clicker/main.ts:120-450`
- Modify: `src/shared/ui/printChecklist.ts`

**Interfaces:**
- Consumes: `BlockPreset`, `borders`, `keycapProfile`
- Produces: Interactive controls in Clicker Studio (Borders toggle, Column layout buttons, Exploded view render, Slicer tips).

- [ ] **Step 1: Add "Borders" toggle & Column options to UI in `src/clicker/main.ts`**
  - Add `<label><input type="checkbox" id="block-borders" checked> เส้นขอบแบ่งปุ่ม (Borders)</label>`.
  - Add Column options to the Layout select dropdown (`col2`, `col3`, `col4`).
- [ ] **Step 2: Update state handling and re-render triggers**
  Hook `block-borders` change event to `st.blockBorders` and call `rebuildClicker()`.
- [ ] **Step 3: Update `printChecklist.ts` for solid bottom blocks**
  Add checklist item: "ฐานบล็อก: พื้นตัน 100% วางระนาบเตาพิมพ์ได้ทันที ไม่ต้องเปิด Support ใต้ฐาน".
- [ ] **Step 4: Build and test application**
  Run: `pnpm build`
  Expected: Build completes in $<5\text{s}$ with zero TypeScript errors.
- [ ] **Step 5: Commit changes**
  ```bash
  git add src/clicker/main.ts src/shared/ui/printChecklist.ts
  git commit -m "feat(clicker): wire up borders toggle and column layout UI in clicker studio"
  ```

---

### Task 5: End-to-End Verification & Documentation Update

**Files:**
- Modify: `ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-11-16-clicker-blocks-solid-base-parity.md`
- Test: All scripts (`test-shapes.mjs`, `test-fit-strip.mjs`, `test-blocks.mjs`, `test-modular.mjs`)

- [ ] **Step 1: Run full automated verification suite**
  ```bash
  cd d:\3d-creator-hub
  node scripts/test-shapes.mjs
  node scripts/test-fit-strip.mjs
  node scripts/test-blocks.mjs
  node scripts/test-modular.mjs
  pnpm build
  ```
  Expected: All 4 test scripts pass and Vite build passes.
- [ ] **Step 2: Visual inspection via browser preview**
  Inspect `http://localhost:5173/clicker/` (or built dist):
  - View under-bed angle in Exploded view: bottom must be completely flat and solid.
  - View top angle: stepped socket with border dividers and sculpted keycaps.
- [ ] **Step 3: Update `ROADMAP.md` and commit**
  ```bash
  git add ROADMAP.md
  git commit -m "docs: record fidget blocks solid bottom and borders parity completion in roadmap"
  git push origin main
  ```
