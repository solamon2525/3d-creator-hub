# 3D Creator Hub — Roadmap

Live: https://solamon2525.github.io/3d-creator-hub/  
ดูสรุปในแอป: [ฟีเจอร์](https://solamon2525.github.io/3d-creator-hub/features/)

สถานะฐาน (เสร็จแล้ว): mm จริง · manifold · ไทยนูน · 3MF · Keycap / Clicker / Mascot · multi-stem 2u · GLB pack · cover PNG

---

## เฟส N — ใกล้ (กำลังทำ / ทำถัดไป)

### ฐานต่อสามเหลี่ยม

- ✅ โหมดฐาน 1–8 ตัว หัวมีรูห่วง และท้ายแยกชิ้น สีสามส่วน และสามมุมมอง
- ✅ 3MF หน่วย mm แยกวัตถุบนเตียง / STL ZIP + Cover + คู่มือ: ต้นแบบ 3 ชิ้น หรือชุด N+2 ชิ้น
- ✅ JSON/localStorage รองรับชนิดงานใหม่และไฟล์ Clicker เดิม
- ✅ ตรวจผิวปิด ทิศผิว ปริมาตร การเลื่อน/บ่าหยุด ฐานซ้ำ 1/2/4/8 ตัว และเปิด 3MF กลับด้วย `pnpm test:modular`
- ⏳ ทดลองพิมพ์วัดความฝืดและแรงยึดจริง: รางไม่มีล็อกกันเลื่อนย้อนขึ้น ขนาดเป็นแบบออกแบบ ไม่ใช่มิติที่วัดจากวิดีโอ
- ระบบ 3MF ร่วมใช้รหัสวัตถุ/วัสดุไม่ซ้ำและสีมาตรฐาน ไม่มี metadata เฉพาะ slicer; เลือกเครื่อง วัสดุ และจับคู่สีใน slicer เอง

เป้าหมาย: พิมพ์ใช้งานจริงได้ลื่นขึ้น + เวิร์กโฟลว์ออกแบบครบ

| รายการ | สถานะ | หมายเหตุ |
|--------|--------|----------|
| MakerWorld Parity Clicker Studio (3-Zone Layout) | ✅ | โครงสร้าง 3 โซนเทียบเท่า MakerWorld v1.0.8 (Vostok Labs) |
| คลังรูปทรงฐาน 14 รูปทรง + Lock Base Size | ✅ | Squircle, Capsule, Shield, Arch, Egg, Tag, ฯลฯ พร้อม Turn หมุนองศา |
| Fit & Tolerance Calibration + Fit Test Strip (3MF) | ✅ | ปรับระยะก้าน/เบ้าสวิตช์ พร้อมปุ่ม 1-คลิกสร้างแผ่นทดสอบ 5 สเต็ป |
| Three.js Section View ("Cut it open") | ✅ | ผ่าตรวจโมเดลแกน X/Y/Z ด้วย Clipping Planes + สลับ Assembled / Exploded |
| Lucide Icons Library (2,000+ ไอคอน) | ✅ | หมวด Gaming, Popular, Nature, Tech, Tools พร้อมระบบค้นหา |
| Multi-line Text & Fidget Blocks (WASD/Row/Grid) | ✅ | ตัวเรือนฐานมัลติช่อง พร้อมเบ้า MX และคีย์แคปแยกชิ้น 1 ตัวอักษรต่อ 1 ปุ่ม |
| Fidget Blocks Solid Base & Borders Parity | ✅ | พื้นล่างตันเรียบ 100% (Solid Bottom) + เบ้าสวิตช์ขั้นบันได (Stepped) + ร่อง Borders V-groove + คีย์แคป OEM Tapered + Column 1x2–1x4 |
| Keycap stabilizer 2u+ | ✅ | ช่อง stab ระยะ Cherry ~±11.9 mm (เปิด/ปิดได้) |
| Image wizard (contrast / brightness / knockout) | ✅ | Clicker + Mascot relief |
| บันทึก/โหลดโปรเจกต์เป็นไฟล์ JSON | ✅ | `3dch-<studio>.json` + localStorage |
| Checklist พิมพ์ในแผง (ทิศ / AMS / pause) | ✅ | ติ๊กได้ · จำใน localStorage · สลับ AMS/Z-band ตาม state |

---

## เฟส M — กลาง (3–6 เดือน)

| รายการ | สถานะ |
|--------|--------|
| คลังมาสคอต/พาร์ทจาก Blender จริง | ⏳ |
| AMS palette ↔ Bambu model_settings ละเอียดขึ้น | ⏳ |
| แชร์ลิงก์ดีไซน์ (hash ครบ / short link) | ⏳ |
| โหมดชุดพิมพ์ (หลายชิ้น + cover + checklist) | ⏳ |
| Keycap shine-through + legend pocket แม่นยำขึ้น | ⏳ |

---

## เฟส L — ยาว (ผลิตภัณฑ์)

| รายการ | สถานะ |
|--------|--------|
| MakerWorld / Printables pack + คู่มือไทย | ⏳ |
| บัญชีผู้ใช้ / แกลเลอรีดีไซน์ | ⏳ |
| AI รูป → relief (เริ่มจากคัดลอก prompt) | ⏳ |
| ร้านค้า / ชำระเงิน | ⏳ — ทำเมื่อมีเป้า monetize ชัด |

---

## นอกขอบเขต

- Fork ทั้ง monorepo VostokLabs
- คัดลอก UI/แบรนด์ของเครื่องมืออื่น

---

## หลักการพัฒนา

1. **Three.js = พรีวิว** · **Manifold = ความจริงของ geometry** · **3MF = ผลิตภัณฑ์หลัก**
2. 1 scene unit = 1 mm เสมอ
3. ฟีเจอร์ใหม่ต้องอัปเดตหน้า [สรุปฟีเจอร์](./features/) + แถวสถานะในไฟล์นี้ใน commit เดียวกันเมื่อเป็นไปได้
4. ทดสอบ `pnpm build` ก่อน push · Pages deploy จาก `main`

## ประวัติสั้น

- **2026-08** — Checklist พิมพ์แบบติ๊กได้ (ทิศ / AMS / Z-band pause) ทั้ง 3 studio
- **2026-07** — Full upgrade kernel + 3 studios + multi-stem + GLB pack + cover PNG + หน้าฟีเจอร์
- **2026-07** — เริ่มเฟส N (roadmap นี้)
