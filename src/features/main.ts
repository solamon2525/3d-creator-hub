import { mountShell, withBase } from '../shared/studio';

mountShell({
  title: 'สรุปฟีเจอร์',
  active: 'features',
  bodyHtml: `
    <main class="hub features-page">
      <section class="hero">
        <h1>สรุปฟีเจอร์ในโปรแกรม</h1>
        <p>
          อ้างอิงด่วนว่าแต่ละ Studio ทำอะไรได้บ้าง · หน่วย mm จริง · export 3MF เป็นหลัก
          · อัปเดตตามเวอร์ชันปัจจุบัน
        </p>
        <p class="hero-actions">
          <a class="btn primary" href="${withBase('')}">← กลับ Hub</a>
          <a class="btn" href="${withBase('keycap/')}">Keycap</a>
          <a class="btn" href="${withBase('clicker/')}">Clicker</a>
          <a class="btn" href="${withBase('keychain/')}">Keychain</a>
          <a class="btn" href="${withBase('mascot/')}">Mascot</a>
          <a class="btn" href="${withBase('roadmap.md')}" target="_blank" rel="noopener">ROADMAP.md</a>
        </p>
      </section>

      <section class="feat-block">
        <h2>แผนพัฒนาระยะยาว</h2>
        <ul class="feat-list">
          <li><strong>เฟส N (ใกล้)</strong> — stabilizer · image wizard · JSON · checklist พิมพ์ ✅ · ค้าง: tolerance จากพิมพ์จริง</li>
          <li><strong>เฟส M (กลาง)</strong> — Blender pack · AMS ละเอียด · แชร์ลิงก์ · ชุดพิมพ์</li>
          <li><strong>เฟส L (ยาว)</strong> — MakerWorld · แกลเลอรี · AI relief · ร้านค้า</li>
        </ul>
        <p class="feat-lead">รายละเอียดเต็ม: ไฟล์ <code>ROADMAP.md</code> ใน repo / ลิงก์ด้านบน</p>
      </section>

      <section class="feat-block">
        <h2>แกนกลาง (ทุก Studio)</h2>
        <ul class="feat-list">
          <li><strong>1 unit = 1 mm</strong> — ขนาดในพรีวิวตรงกับ slicer</li>
          <li><strong>manifold-3d</strong> — geometry กันน้ำ (watertight) สำหรับพิมพ์</li>
          <li><strong>Export 3MF</strong> หลายชิ้น/หลายสี (AMS) · <strong>STL</strong> สำรอง (รวมสีเดียว) · cover PNG</li>
          <li><strong>ฟอนต์ OFL</strong> ไทย+ละติน: Sarabun, Kanit, Prompt (+ Oswald, Bebas)</li>
          <li>ตัวอักษรเป็น <strong>mesh นูนจริง</strong> ไม่ใช่แค่ texture บนหน้าจอ</li>
          <li>บันทึก/โหลดโปรเจกต์เป็นไฟล์ <strong>JSON</strong> + localStorage · URL hash</li>
          <li>พรีเซ็ตสีเส้นใย · <strong>Checklist พิมพ์</strong> (ทิศ / AMS / pause · ติ๊กได้ · จำในเบราว์เซอร์)</li>
        </ul>
      </section>

      <section class="feat-block">
        <h2>⌨️ Keycap Studio</h2>
        <p class="feat-lead">สร้างคีย์แคปพิมพ์ได้ กดกับสวิตช์ Cherry MX ได้</p>
        <ul class="feat-list">
          <li>MX stem ขนาดมาตรฐาน + ปรับ stem tolerance</li>
          <li>ขนาดคีย์ <strong>1u / 1.25u / 1.5u / 2u</strong> · 2u มี <strong>2 MX stems</strong> + <strong>stabilizer holes</strong> (±11.9 mm)</li>
          <li>รูปทรง: rounded · square · circle</li>
          <li>Legend: ข้อความไทย/อังกฤษ · ไอคอน · อัปโหลด SVG</li>
          <li>ปรับขนาดตัวอักษร / ความนูนแยกจากขนาดพื้น</li>
          <li>โหมด shine-through · มุมมอง exploded</li>
          <li>3MF สองส่วน: body + legend (สีแยก)</li>
        </ul>
        <a class="btn" href="${withBase('keycap/')}">เปิด Keycap →</a>
      </section>

      <section class="feat-block">
        <h2>🔘 Clicker Studio</h2>
        <h3>ฐานต่อสามเหลี่ยม</h3>
        <ul class="feat-list">
          <li>ฐานกลาง 1–8 ตัว + แผ่นปิดหัวมีรูห่วง + แผ่นปิดท้าย ไม่มีคีย์แคปหรือฝาใต้ฐาน</li>
          <li>ฐาน 24 × 24 × 12.5 mm · ช่อง MX 14.1 mm · รูห่วง 3.4 mm · เผื่อราง 0.20 mm ต่อผิว</li>
          <li>เลือกสีสามส่วน · พรีวิวประกอบ / แยก / จัดพิมพ์ · บันทึก JSON และจำค่าในเครื่อง</li>
          <li>ส่งออกต้นแบบ 3 ชิ้น หรือชุด N+2 ชิ้น: 3MF แยกวัตถุบนเตียง หรือ ZIP ที่มี STL แยกชิ้น + Cover + คู่มือ</li>
          <li>เลื่อนลิ้นลงตามรางจนสุดบ่า รางไม่มีล็อกกันย้อนขึ้น ผ่านการตรวจดิจิทัล แต่ต้องทดลองพิมพ์เพื่อยืนยันความฝืดและแรงยึด</li>
        </ul>
        <h3>Clicker Generator (MakerWorld Parity v1.0.8)</h3>
        <p class="feat-lead">คลิกเกอร์ชื่อ / โลโก้ / สวิตช์กลไก MX สไตล์ MakerWorld แบบ 3-Zone Layout</p>
        <ul class="feat-list">
          <li><strong>โครงสร้าง 3-Zone Layout:</strong> แถบควบคุมซ้าย (Shape/Body/Colors/Fit/Loop) · กลาง (3D Viewport) · แถบควบคุมขวา (Decoration & Export)</li>
          <li><strong>14 รูปทรงฐานขั้นสูง:</strong> Circle, Square, Rectangle, Squircle, Capsule, Polygon, Star, Heart, Egg, Cross, Shield, Tag, Arch, Outline พร้อม Turn หมุนองศา 0–360° และ Lock Base Size (ปรับ W × H แยกอิสระ)</li>
          <li><strong>ระบบ Fit & Tolerance Calibration:</strong> ปรับระยะก้านสวิตช์ MX (Stem Fit ±0.15mm), เบ้าสวิตช์ 14mm (Pocket Fit ±0.20mm), และช่องว่างขอบปุ่ม (Top/Base Gap 0.3–1.5mm)</li>
          <li><strong>1-คลิกสร้างแผ่นทดสอบ Fit Test Strip (3MF):</strong> พิมพ์แผ่นก้านทดสอบ 5 สเต็ป (-0.10 ถึง +0.10 mm) ใน 8 นาทีเพื่อเลือกระดับที่เสียบสวิตช์แน่นพอดี</li>
          <li><strong>เครื่องมือผ่าตรวจโมเดล "Cut it open":</strong> ผ่าตรวจโครงสร้างสลักล็อกภายในด้วย Clipping Planes (แกน X, Y, Z พร้อม Slider) และมุมมอง Assembled vs Exploded</li>
          <li><strong>คลังไอคอน Lucide (2,000+ ไอคอน):</strong> ประทับลายนูนบนปุ่มในคลิกเดียว จัดหมวดหมู่ Gaming, Popular, Nature, Tech, Tools พร้อมช่องค้นหา</li>
          <li><strong>ข้อความหลายบรรทัด & Fidget Blocks:</strong> รองรับภาษาไทย/อังกฤษหลายบรรทัด และรูปแบบคลัสเตอร์ปุ่มเกมมิ่ง WASD, แถวยาว 1x2–1x4, ตาราง 2x2</li>
          <li><strong>Image Wizard:</strong> อัปโหลดรูปภาพ ปรับ Contrast, Brightness, ลบพื้นหลังสีขาว และตั้งจำนวนสี AMS</li>
          <li><strong>ระบบส่งออก 3MF:</strong> รองรับ Bambu Studio / OrcaSlicer จัดวางบนเพลตพร้อมระบุ Extruder slot ตามสี</li>
        </ul>
        <a class="btn" href="${withBase('clicker/')}">เปิด Clicker →</a>
      </section>

      <section class="feat-block">
        <h2>🎭 Mascot Studio</h2>
        <p class="feat-lead">สองแท็บ: พิมพ์นูนจากรูป + แต่งตัวละครดิจิทัล</p>
        <h3>แท็บ Relief (พิมพ์ได้)</h3>
        <ul class="feat-list">
          <li>อัปโหลดรูปการ์ตูน / SVG → regions → นูนบนฐาน</li>
          <li>ปรับขนาดฐาน · ความนูน · จำนวนสี · สีฐาน</li>
          <li>พวงกุญแจติดฐาน · export 3MF / STL</li>
        </ul>
        <h3>แท็บ Avatar (แต่งตัวละคร)</h3>
        <ul class="feat-list">
          <li>ตัว chibi: ผม / ตา / ผิว / เสื้อ / กางเกง / blush</li>
          <li>Library พร้อมใช้: คำไผ่ · Sky · Berry</li>
          <li>Export <strong>GLB</strong> / <strong>STL</strong> + รูป cover PNG</li>
          <li>โหลดชิ้นส่วนจาก <code>public/mascot/{hair,face,body,acc}/*.glb</code> (มี pack พื้นฐานใน repo)</li>
        </ul>
        <a class="btn" href="${withBase('mascot/')}">เปิด Mascot →</a>
      </section>

      <section class="feat-block">
        <h2>พิมพ์ / ไฟล์</h2>
        <ul class="feat-list">
          <li>ในแผงสตูดิโอมี <strong>Checklist พิมพ์</strong> — ทิศวาง · AMS · pause Z-band · ติ๊กแล้วจำในเครื่อง</li>
          <li>แนะนำเปิด 3MF ใน Bambu Studio / Orca / PrusaSlicer แล้วเช็กขนาด mm</li>
          <li>ทุกครั้งที่ export จะได้ <strong>cover PNG 1280×720</strong> คู่ไฟล์โมเดล</li>
          <li>Keycap: พิมพ์คว่ำหน้า (legend ลง bed) มักไม่ต้อง support</li>
          <li>Clicker: พิมพ์ตั้ง · โหมด Z-band ให้ใส่ pause ตอนเปลี่ยนเส้นใน slicer</li>
          <li>ฟอนต์เป็น OFL — ใช้พิมพ์/แจกจ่ายโมเดลได้ตามสัญญาอนุญาตฟอนต์</li>
        </ul>
      </section>

      <section class="feat-block muted-block">
        <h2>ยังไม่อยู่ในรอบนี้</h2>
        <ul class="feat-list">
          <li>ร้านค้า / ชำระเงิน / MakerWorld pack</li>
          <li>AI สร้างรูปในแอป</li>
        </ul>
      </section>
    </main>
  `,
});
