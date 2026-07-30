# 3D Creator Hub

เว็บแอปสร้างของ 3D ในเบราว์เซอร์ รวมหลายระบบในที่เดียว

**Live:** https://solamon2525.github.io/3d-creator-hub/

## ระบบที่มี

| Studio | URL | ทำอะไร |
|--------|-----|--------|
| Hub | `/` | หน้าเลือกเครื่องมือ |
| Keycap | `/keycap/` | คีย์แคป + ตัวอักษร + สี → STL |
| Clicker | `/clicker/` | คลิกเกอร์ชื่อ (สไตล์ fidget) → STL |
| Mascot | `/mascot/` | ตัวการ์ตูน chibi ปรับแต่งได้ → STL |

## รันในเครื่อง

```bash
pnpm install
pnpm dev
```

เปิด http://localhost:5173

## Build

```bash
pnpm build
pnpm preview
```

## เทคโนโลยี

- Vite + TypeScript
- Three.js (preview + OrbitControls + STLExporter)
- GitHub Pages (Actions)

## แผนถัดไป

- [ ] manifold-3d สำหรับ geometry พิมพ์จริง (MX socket)
- [ ] ฟอนต์ไทย (opentype.js + Kanit/Sarabun)
- [ ] export 3MF หลายสี
- [ ] Mascot จาก GLB parts (Blender)

แรงบันดาลใจจาก [VostokLabs Clicker-Generator](https://vostoklabs.github.io/Clicker-Generator/)
