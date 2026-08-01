---
name: 3dch-print
description: >-
  Guides printable geometry and export workflows for 3D Creator Hub (keycap,
  clicker, mascot): mm units, manifold solids, Thai raised text, 3MF AMS /
  Z-band pause, print checklist, cover PNG. Use when editing 3d-creator-hub
  studios, extrude/text/mesh, 3MF/STL export, slicer tips, or ROADMAP print
  features; also when the user says 3dch, 3MF, AMS, Z-band, or print checklist.
---

# 3D Creator Hub — Print

Repo: `3d-creator-hub` · Live: https://solamon2525.github.io/3d-creator-hub/  
Package manager: **pnpm only** · Deploy: push `main` → GitHub Pages

## Hard rules

1. **Three.js = preview only** · **Manifold = real geometry** · **3MF = primary product** (STL = single-color fallback)
2. **1 scene unit = 1 mm** always — sizes in preview must match slicer
3. Do not invent a parallel mesh pipeline (no Three ExtrudeGeometry as source of truth)
4. After feature/design change in the same commit when possible: `ROADMAP.md` + `public/roadmap.md` + `src/features/main.ts`
5. Before push: `pnpm build` must pass

## Geometry

| Task | Where |
|------|--------|
| Extrude / boolean / box / cylinder | `src/shared/geometry/manifoldOps.ts` |
| Thai/Latin text → rings | `src/shared/geometry/textToContours.ts` (`loadFontForText` for Thai fallback) |
| MX stem / socket / stab | `src/shared/geometry/mxStem.ts` |
| Image/SVG → color regions | `src/shared/geometry/imageToRegions.ts` |
| Export 3MF/STL + parts | `src/shared/export/parts.ts` |
| Viewer / cover PNG / project JSON | `src/shared/studio.ts` |

### Text / rings (critical)

- Glyph contours often have **holes**. Do **not** `Manifold.extrude` each ring then `union` — that can collapse to an **empty solid** (`triCount: 0`).
- Use **`CrossSection(rings, 'EvenOdd')` → `Manifold.extrude(section, height)`** (see `extrudeRings`). Close rings before fill.
- Prefer Thai-capable fonts (Sarabun / Kanit / Prompt). Non-Thai font + Thai text → `loadFontForText` fallback.

### Studios

| Studio | Print notes |
|--------|-------------|
| Keycap | Orient **face-down** (legend on bed); 1u~18 mm; AMS body+legend; 2u dual stem + stab ±11.9 mm |
| Clicker | Orient **upright** (cap up); AMS multi-part **or** No-AMS **Z-band + slicer pause**; MX socket on body bottom |
| Mascot Relief | Flat base on bed; multi-color 3MF |
| Mascot Avatar | Digital GLB; STL only if user wants physical parts |

## Print checklist UI

- Source: `src/shared/ui/printChecklist.ts` · re-export via `src/shared/ui/presets.ts`
- Mount with `mountPrintChecklist(() => ctx)` after `mountShell`; call `refresh(ctx)` on rebuild
- Items can use `when(ctx)` for AMS vs zband, stab, keychain, avatar tab
- Checks persist: `localStorage` key `3dch-print-checklist-<studio>`
- New print-relevant options → add checklist item(s) in the same change

## Export

- Prefer **3MF multi-part** for AMS colors; emit **cover PNG** with model export (`captureCoverPng`)
- Warn in UI when `colorMode === 'zband'` (pause at layer color changes)
- Project save/load: `3dch-<studio>.json` + localStorage helpers in `studio.ts`

## Workflow checklist

```
- [ ] Geometry via manifold (mm)
- [ ] Text/holes via CrossSection EvenOdd
- [ ] Studio UI + print checklist updated if needed
- [ ] ROADMAP + features page if user-facing
- [ ] pnpm build
- [ ] Commit conventional: feat|fix(scope): ...
```

## Out of scope

- Forking other brands’ UI
- Monetize / MakerWorld until ROADMAP phase L is explicitly requested
- Stem/socket **print-tolerance tuning** without real filament feedback from the user

## Read when needed

- Product plan: `ROADMAP.md` (repo root)
- In-app summary page: `src/features/main.ts`
