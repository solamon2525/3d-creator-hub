# 3D Creator Hub — Roadmap

Live: https://solamon2525.github.io/3d-creator-hub/  
ดูสรุปในแอป: [ฟีเจอร์](https://solamon2525.github.io/3d-creator-hub/features/)

สถานะฐาน (เสร็จแล้ว): mm จริง · manifold · ไทยนูน · 3MF · Keycap / Clicker / Mascot · multi-stem 2u · GLB pack · cover PNG

---

## เฟส N — ใกล้ (กำลังทำ / ทำถัดไป)

เป้าหมาย: พิมพ์ใช้งานจริงได้ลื่นขึ้น + เวิร์กโฟลว์ออกแบบครบ

| รายการ | สถานะ | หมายเหตุ |
|--------|--------|----------|
| Keycap stabilizer 2u+ | ✅ | ช่อง stab ระยะ Cherry ~±11.9 mm (เปิด/ปิดได้) |
| Image wizard (crop / ลบพื้น / preview สี) | ✅ | Clicker + Mascot relief |
| บันทึก/โหลดโปรเจกต์เป็นไฟล์ JSON | ✅ | `3dch-<studio>.json` + localStorage |
| ปรับ stem/socket tolerance จากผลพิมพ์จริง | ⏳ | ต้องการ feedback จาก filament จริง |
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
