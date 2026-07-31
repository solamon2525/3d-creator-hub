# 3D Creator Hub

Browser tools that generate **printable** 3D models (mm-true geometry) for keycaps, MX clickers, and mascot reliefs/avatars.

**Live:** https://solamon2525.github.io/3d-creator-hub/  
**Roadmap:** [ROADMAP.md](./ROADMAP.md) · in-app [ฟีเจอร์](https://solamon2525.github.io/3d-creator-hub/features/)

## Studios

| Studio | Path | Output |
|--------|------|--------|
| Hub | `/` | Overview |
| Keycap | `/keycap/` | MX stem · Thai/Latin extruded legend · icon/SVG · **3MF** (body+legend) / STL |
| Clicker | `/clicker/` | Nesting cap · MX socket · text/image/SVG · keychain · AMS or Z-band · **3MF** / STL |
| Mascot | `/mascot/` | **Relief** printable multi-color · **Avatar** chibi slots → GLB/STL |

## Units & print

- **1 Three.js / manifold unit = 1 mm**
- Prefer **3MF** (multi-part colors for AMS). STL merges to one solid (no color).
- Keycap: print legend-down; usually no supports.
- Clicker: print upright; No-AMS mode stacks Z-bands — add pause layers in the slicer when changing filament.
- Open exports in Bambu Studio / Orca / PrusaSlicer and verify bounding box in mm.

## Fonts (OFL)

Bundled via jsDelivr Google Fonts OFL:

- Thai+Latin: Sarabun, Kanit, Prompt  
- Latin display: Oswald, Bebas Neue  

Glyphs are converted with **opentype.js → closed rings → manifold extrude** (not canvas textures).

## Architecture

- **Three.js** = preview only  
- **manifold-3d** = watertight solids / boolean  
- **fflate** = multi-part 3MF zip  
- **d3-contour** = image/SVG → color regions → relief  

Shared code lives under `src/shared/` (`units`, `geometry`, `export`, `studio`).

## Develop

```bash
pnpm install
pnpm dev
```

```bash
pnpm build
pnpm preview
```

GitHub Pages builds with `GITHUB_ACTIONS=true` so Vite `base` is `/3d-creator-hub/`.

## Mascot GLB parts

Optional pack path: `public/mascot/{hair,face,body,acc}/*.glb` — see `public/mascot/README.md`. UI works with primitives until files are added.

Inspired by [VostokLabs Clicker-Generator](https://vostoklabs.github.io/Clicker-Generator/) (architecture ideas only).
