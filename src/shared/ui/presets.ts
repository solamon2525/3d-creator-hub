/** Shared UI snippets for studios. */

export const PRINT_TIPS_KEYCAP = `
  <details class="tips"><summary>เคล็ดลับพิมพ์</summary>
    <ul>
      <li>หน่วย 1 scene = 1 mm — เปิดใน slicer แล้วเช็กขนาด ~18 mm</li>
      <li>พิมพ์คว่ำหน้า (legend ลง bed) มักไม่ต้อง support</li>
      <li>3MF สองสี = body + legend (AMS) · STL รวมสีเดียว</li>
      <li>Stem tol บวกเล็กน้อยถ้าใส่สวิตช์ฝืด</li>
    </ul>
  </details>`;

export const PRINT_TIPS_CLICKER = `
  <details class="tips"><summary>เคล็ดลับพิมพ์</summary>
    <ul>
      <li>พิมพ์ตั้ง (ฝาขึ้น) · bezel ไม่ต้อง support ทั่วไป</li>
      <li>AMS = หลายสีในไฟล์เดียว · No-AMS = ชั้น Z + pause เปลี่ยนเส้น</li>
      <li>รูป: ใช้คอนทราสต์สูง · จำนวนสี 2–4 ก่อน</li>
      <li>MX socket อยู่ก้น body — ทดสอบกับสวิตช์จริง</li>
    </ul>
  </details>`;

export const PRINT_TIPS_MASCOT = `
  <details class="tips"><summary>เคล็ดลับพิมพ์ / Avatar</summary>
    <ul>
      <li>Relief: ฐานกลม + นูนหลายสี 3MF · ห่วงพวงกุญแจติดฐาน</li>
      <li>Avatar: export GLB สำหรับดิจิทัล · STL สำหรับพิมพ์แยกชิ้น</li>
      <li>ใส่ GLB ใน public/mascot/{hair,face,body,acc}/ ได้ภายหลัง</li>
    </ul>
  </details>`;

export const IMAGE_WIZARD_HINT = `
  <div class="wizard" id="imageWizard">
    <strong>Image wizard</strong>
    <ol>
      <li>เลือกรูปคอนทราสต์สูง / พื้นหลังเรียบ</li>
      <li>ตั้งจำนวนสี 2–4 แล้วอัปโหลด</li>
      <li>ดู regions ในพรีวิว · ลดสีถ้าแตกเป็นจุด</li>
      <li>Export 3MF (AMS) หรือ No-AMS Z-band</li>
    </ol>
  </div>`;
