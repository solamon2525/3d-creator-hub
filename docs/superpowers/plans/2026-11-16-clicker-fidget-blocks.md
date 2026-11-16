# แผนการแก้ไขและพัฒนา Fidget Blocks (ฐานมัลติคีย์สไตล์ MakerWorld)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปรับปรุงโหมด Fidget Blocks ใน `3d-creator-hub/clicker` ให้สร้าง **ฐานตัวเรือนแบบมัลติคีย์จริง** (แถวยาว Row 1×2, 1×3, 1×4, คลัสเตอร์ WASD, ตาราง Grid 2×2) พร้อมเบ้าสวิตช์ MX แยกอิสระทุกช่อง, คีย์แคป $N$ ชิ้นแยกอิสระพร้อมก้าน MX Stem, และตัวอักษรประทับนูน 1 ตัวต่อ 1 ปุ่ม (เช่น "N-a-m-e" หรือ "W-A-S-D") ตรงตามภาพเรฟเฟอเรนซ์ MakerWorld 100%

**Architecture:** 
- ใน `src/clicker/blocks.ts`: สร้าง Geometry Engine สำหรับคำนวณ Outer Housing Outline รอบทุกปุ่ม, ขุด Switch Wells และ MX Socket Cuts แยกทีละช่องตามพิกัดของเลย์เอาต์ (Pitch 20.0 mm)
- สร้าง Keycap Solid แยก $N$ ชิ้นตามจำนวนปุ่ม โดยแต่ละปุ่มมีก้าน MX Cross Stem ด้านล่างตรงกับตำแหน่งสวิตช์
- กระจายตัวอักษรจากข้อความที่ผู้ใช้กรอก (เช่น "Name" หรือ "1234") ลงบนกึ่งกลางของแต่ละปุ่มอย่างแม่นยำ
- ในมุมมอง `Exploded`: ยกลอยปุ่มทั้ง $N$ ชิ้นขึ้นในแนวแกน Z (+14 mm) เหนือฐานตัวเรือนเหมือนในภาพเรฟเฟอเรนซ์
- ส่งออกไฟล์ 3MF สำหรับ Bambu Studio แยก Part ID และ Extruder AMS สีตัวเรือน, สีปุ่ม, และสีตัวอักษร

**Tech Stack:** TypeScript 5.7, Manifold-3D WASM (Watertight CSG), Three.js r171, opentype.js, fflate (3MF Packaging)

**Spec:** ภาพเรฟเฟอเรนซ์ของผู้ใช้ (`media_1794825319337_4f187b44.jpg`), MakerWorld Clicker Generator Blocks Mode, และมาตรฐาน [3dch-print SKILL.md](file:///d:/3d-creator-hub/.cursor/skills/3dch-print/SKILL.md)

---

## การวิเคราะห์ข้อผิดพลาดเดิม (Before vs After)

| จุดเปรียบเทียบ | ปัญหาในรูปปัจจุบัน (รูปที่ 1) | สิ่งที่ถูกต้องตามเรฟเฟอเรนซ์ (รูปที่ 2) |
|---|---|---|
| **ตัวเรือนฐาน (Housing)** | เป็นวงกลมปุ่มเดี่ยวปุ่มเดิม (ไม่เปลี่ยนเป็นแถวยาว) | ตัวเรือนสี่เหลี่ยมขอบมนยาว 4 ช่อง มีผนังกั้นระหว่างสวิตช์ |
| **เบ้าสวิตช์ (MX Sockets)** | มีเพียง 1 เบ้าตรงกลาง | มี 4 เบ้าสวิตช์ MX แยกอิสระตามระยะพิตช์ 20 mm |
| **ปุ่มกด (Keycaps)** | มีปุ่มกลมเดี่ยวเพียงปุ่มเดียว | มีปุ่มคีย์แคปสี่เหลี่ยม **4 ชิ้นแยกกัน** (ชิ้นละ 1 ช่อง) |
| **ตำแหน่งตัวเลข/ตัวอักษร** | เลข 1 และ 4 ลอยเคว้งอยู่นอกปุ่มบนเตียงพิมพ์ | ตัวอักษร "N", "a", "m", "e" (หรือ 1, 2, 3, 4) วางอยู่ **กึ่งกลางบนหน้าปุ่มของตัวเองแต่ละปุ่ม** |
| **มุมมอง Exploded** | แยกไม่ออกเพราะมีปุ่มเดียว | ปุ่มทั้ง 4 ชิ้นยกลอยขึ้นพร้อมกันในระนาบเดียวกับฐาน |

---

## Global Constraints

- **Three.js = Preview only · Manifold = Source of Truth Geometry · 3MF = Primary Product**
- **1 Scene Unit = 1 mm เสมอ**
- **Package Manager:** `pnpm` เท่านั้น
- **ต้องผ่านการทดสอบ:** `pnpm build` และ `pnpm test:modular` ผ่าน 100% ไม่มีข้อผิดพลาด
- **ห้ามกระทบโหมดอื่น:** Classic Clicker 1 ปุ่ม (14 รูปทรง), ฐานต่อสามเหลี่ยม Modular, และ Keycap/Mascot Studio ต้องยังใช้งานได้สมบูรณ์

## Review Focus

1. **ความสมบูรณ์ของโซลิด (Watertight Manifold):** ตัวเรือนฐานมัลติคีย์ที่มี 4 ช่องและผนังกั้น ต้องเป็น Solid ผิวปิดสนิท 100% ไม่มีช่องโหว่
2. **ความพอดีของสวิตช์ (Switch Well Clearance):** แต่ละช่องต้องกว้าง $16 \times 16$ mm ลึก $\ge 8$ mm และมีเบ้าเสียบสวิตช์ Cherry MX 14×14 mm ล็อกแน่น
3. **การแมปตัวอักษร (Character Distribution):** หากผู้ใช้พิมพ์ "Name" ต้องแบ่งเป็น N บนปุ่ม 1, a บนปุ่ม 2, m บนปุ่ม 3, e บนปุ่ม 4 โดยอัตโนมัติ
4. **ความถูกต้องของไฟล์ 3MF:** ไฟล์ 3MF ต้องมีชิ้นส่วนครบทั้ง Base, Caps 1..N, Decors 1..N พร้อมตำแหน่งจัดวางสำหรับพิมพ์
5. **มุมมอง Exploded & Cut it open:** สวิตช์ยกลอย Z และการผ่าตัดตรวจภายในต้องทำงานกับฐานมัลติคีย์ได้ลื่นไหล

---

## Proposed Changes & Tasks

### Task 1: พัฒนา Multi-Key Fidget Geometry Engine ใน `src/clicker/blocks.ts`

**Files:**
- Modify: `d:/3d-creator-hub/src/clicker/blocks.ts`
- Create: `d:/3d-creator-hub/scripts/test-blocks.mjs`

- [ ] **Step 1:** เพิ่มฟังก์ชันสร้างเรขาคณิตตัวเรือนและคีย์แคปมัลติคีย์ใน `blocks.ts`:
  - `generateBlockBody(m, layout, options)`: สร้างกล่องตัวเรือนรอบทุกปุ่มตามพิกัด `layout.keys` ลบด้วยช่องสวิตช์ $16 \times 16$ mm แต่ละช่อง พร้อมเจาะเบ้าสวิตช์ MX 14×14 mm และ Cross Cut บนพื้น 2.2 mm
  - `generateBlockKeycaps(m, layout, options)`: สร้างคีย์แคปสี่เหลี่ยมขอบมน $17.5 \times 17.5$ mm สำหรับแต่ละปุ่ม พร้อมก้าน MX Cross Stem ยื่นลงด้านล่าง
- [ ] **Step 2:** เขียนสคริปต์ทดสอบ `scripts/test-blocks.mjs` รัน Manifold WASM ตรวจสอบ:
  - ทดสอบสร้าง Row 1x4, Row 1x2, Row 1x3, WASD, Grid 2x2
  - ตรวจสอบว่า `body` เป็น Closed Manifold Solid ที่มีปริมาตร $> 0$
  - ตรวจสอบว่าคีย์แคปทั้ง $N$ ชิ้นถูกสร้างขึ้นครบตามจำนวนปุ่มและเป็น Closed Solid
- [ ] **Step 3:** รัน `node scripts/test-blocks.mjs` และยืนยันผลผ่าน 100%
- [ ] **Step 4:** Commit: `feat(clicker): implement multi-key block geometry engine for fidget casing and individual keycaps`

---

### Task 2: เชื่อมต่อ Block Engine เข้ากับ `src/clicker/main.ts` & 3D Viewport

**Files:**
- Modify: `d:/3d-creator-hub/src/clicker/main.ts`

- [ ] **Step 1:** ปรับปรุงฟังก์ชัน `build(st: State)` ใน `main.ts`:
  - เมื่อ `st.importMode === 'blocks'`: สลับไปใช้ `generateBlockBody` และ `generateBlockKeycaps` แทนการสร้างฐานปุ่มเดี่ยว
  - กระจายตัวอักษรจาก `st.name` (เช่น "Name" -> ['N', 'a', 'm', 'e']) ลงบนกึ่งกลางของคีย์แคปแต่ละชิ้น
  - หาก `st.name` สั้นกว่าจำนวนปุ่ม ให้ใช้ตัวอักษรตั้งต้นของเลย์เอาต์ (เช่น 1, 2, 3, 4 หรือ W, A, S, D)
- [ ] **Step 2:** ปรับแต่งการแสดงผลใน Three.js:
  - วางคีย์แคปทั้ง $N$ ชิ้นในตำแหน่ง $X, Y$ ของตัวเอง
  - ในโหมด `Exploded`: ยกลอยคีย์แคปทั้ง $N$ ชิ้นขึ้นในแนวแกน Z (+14 mm) พร้อมตัวอักษร
  - ในโหมด `Assembled`: ปุ่มทั้ง $N$ ชิ้นลดระดับลงมาประกบพอดีกับตัวเรือน
- [ ] **Step 3:** ปรับปรุง UI แผงควบคุม Blocks (Right Panel):
  - เพิ่มช่องกรอกข้อความสำหรับปุ่มบล็อก (Label per key หรือ String เช่น "Name" / "WASD")
  - แสดงผลลัพธ์ว่าแต่ละปุ่มได้รับตัวอักษรใด
- [ ] **Step 4:** Commit: `feat(clicker): connect multi-key block engine to 3d viewport with per-key letter stamping and exploded view`

---

### Task 3: ระบบส่งออก 3MF และจัดวางบนเตียงพิมพ์สำหรับฐานมัลติคีย์

**Files:**
- Modify: `d:/3d-creator-hub/src/clicker/main.ts`

- [ ] **Step 1:** ตรวจสอบโครงสร้าง `lastParts` ในโหมดบล็อก:
  - `body`: ตัวเรือนฐานมัลติคีย์ (Extruder 1)
  - `cap-0` .. `cap-(N-1)`: คีย์แคป $N$ ชิ้น (Extruder 2)
  - `decor-0` .. `decor-(N-1)`: ลวดลายตัวอักษร $N$ ตัว (Extruder 3)
- [ ] **Step 2:** ทดสอบการ Export เป็นไฟล์ 3MF และตรวจสอบว่า Bambu Studio / OrcaSlicer สามารถเปิดและแยกสี AMS ได้สมบูรณ์
- [ ] **Step 3:** Commit: `feat(clicker): enable multi-key fidget 3mf export with full ams separation`

---

### Task 4: การตรวจสอบระบบ Build, Test และ Deploy

**Files:**
- Test: `pnpm --dir d:/3d-creator-hub build`
- Test: `pnpm --dir d:/3d-creator-hub test:modular`
- Test: `node d:/3d-creator-hub/scripts/test-blocks.mjs`
- Modify: `d:/3d-creator-hub/ROADMAP.md`

- [ ] **Step 1:** รันคำสั่ง `pnpm --dir d:/3d-creator-hub build` ยืนยันว่าการคอมไพล์ผ่าน 100% ไม่มีข้อผิดพลาด
- [ ] **Step 2:** รันคำสั่ง `pnpm --dir d:/3d-creator-hub test:modular` ยืนยันว่าการทดสอบเดิมยังผ่าน 100%
- [ ] **Step 3:** รัน `node scripts/test-blocks.mjs` ยืนยันผลการทดสอบบล็อก
- [ ] **Step 4:** Push โค้ดไปยัง `solamon2525/3d-creator-hub` บน GitHub เพื่อให้อัปเดตขึ้น [https://solamon2525.github.io/3d-creator-hub/](https://solamon2525.github.io/3d-creator-hub/) อัตโนมัติ
- [ ] **Step 5:** Commit: `docs(clicker): verify multi-key block fidget generator and deploy to production`
