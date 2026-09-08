# Modular clicker validation — 2026-09-08

Run `pnpm test:modular` for the actual TypeScript geometry and shared export modules against Manifold WASM. Run `pnpm build` before publication.

## Automated checks passed

- Three closed meshes with consistent oriented edges, positive volume, and one connected solid each.
- Volumes: base 4101.736532, head 1653.987730, tail 1196.185103 mm³.
- Rail insertion sampled every 0.25 mm through 13 mm travel: no interference. Moving 0.3 mm past the seated position intersects the bottom shoulder.
- Assemblies of 1, 2, 4, and 8 bases: no intersecting solids.
- Prototype and quantity exports: 3 and N+2 objects respectively; millimeters, unique resource IDs, correct material/color references, ground at Z=0, separated bed footprints.
- Reconstructed 3MF meshes remain closed single solids; STL ZIP file counts and binary STL lengths; XML escaping including Thai, ampersands and quotes.
- Production TypeScript/Vite build.
- Bambu Studio CLI `--info .test-output/modular-1-prototype.3mf` produced `result.json` with `return_code: 0` and `error_string: "Success."`. This checks CLI acceptance, not sliced layers or physical printing.

## Browser checks

- Desktop Chrome: classic/modular switching, quick count changes, three preview layouts, color changes, rotation, controls hidden appropriately, exports disabled during pending rebuild.
- State survives page reload, including mode, count, three colors, export set and preview view.
- Responsive 390 × 844 viewport: canvas above controls, no horizontal document overflow (375 px content width).
- Classic Thai text renders; Keycap default model builds; Mascot Relief page opens. Shared export actions create downloadable blob links and covers. Explicit ZIP link download action completes without a reported tool error.
- Generated 3MF, ZIP, Cover and JSON are exposed as explicit links if automatic multiple downloads are blocked.

## Not yet verified

- Browser JSON and image/SVG upload tests: Chrome extension refused file access. Requires its “Allow access to file URLs” option. No browser security settings were changed.
- Downloaded files on the user's disk were not independently located/reopened; binary exports were validated through the automated harness instead.
- Slicer visual inspection and slicing were not performed.
- Physical prints, switch retention, friction and pull-out force remain untested. The rail has no anti-lift latch. Dimensions are designed values, not measurements from the referenced video.

## Printing

Use scale 100%, millimeters, floor on bed. Check overhangs beneath the rail and MX opening. Start with a 0.4 mm nozzle, 0.16 mm layers, four walls and 20–30% infill; select the actual printer/material profile in the slicer. Print the three-piece prototype before a long chain. Slide male rails downward to the shoulder; slide upward to remove, without prying sideways.

## Deployment verification

GitHub Pages run 34173275578 succeeded for feature commit a0be522. The live Clicker page opens and builds its default classic model. Deployed JavaScript and Manifold WASM return HTTP 200 (WASM 541470 bytes). Live modular interaction verification was interrupted when Chrome reported another extension UI blocking automation; local modular interaction checks above passed.
