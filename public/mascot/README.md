# Mascot GLB part pack

Bundled procedural parts (regenerate anytime):

```bash
pnpm gen:mascot
```

```
public/mascot/
  hair/   short.glb · spiky.glb · bob.glb
  face/   round.glb · happy.glb · dot.glb
  body/   default.glb · head.glb
  acc/    none.glb · badge.glb
  manifest.json
```

Avatar Studio loads these via `assembleMascotFromGlb` and falls back to primitives if a file is missing.
