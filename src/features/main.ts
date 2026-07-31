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
          <a class="btn" href="${withBase('mascot/')}">Mascot</a>
          <a class="btn" href="${withBase('roadmap.md')}" target="_blank" rel="noopener">ROADMAP.md</a>
        </p>
      </section>

      <section class="feat-block">
        <h2>แผนพัฒนาระยะยาว</h2>
        <ul class="feat-list">
          <li><strong>เฟส N (ใกล้)</strong> — stabilizer 2u · image wizard · ไฟล์โปรเจกต์ JSON ✅ เริ่มแล้ว</li>
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
          <li>พรีเซ็ตสีเส้นใย · เคล็ดลับพิมพ์ในแผงควบคุม</li>
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
        <p class="feat-lead">คลิกเกอร์ชื่อ / โลโก้ แบบ fidget ใส่ MX switch</p>
        <ul class="feat-list">
          <li>ตัวเครื่อง + ฝา nest · <strong>MX socket จริง</strong></li>
          <li>โหมดลาย: ข้อความ · รูปภาพ · SVG · ไอคอน</li>
          <li>ชื่อไทยนูนเป็น mesh (opentype)</li>
          <li>ฐาน: วงกลม · สี่เหลี่ยม · หกเหลี่ยม · หัวใจ · ดาว</li>
          <li>รูป → quantize สี → regions นูนหลายสี</li>
          <li>พวงกุญแจแบบ loop / เจาะ hole</li>
          <li>สีหลายชั้น: <strong>AMS</strong> หรือ <strong>No-AMS Z-band + pause</strong></li>
          <li>Image wizard + เคล็ดลับพิมพ์ในแผง</li>
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
