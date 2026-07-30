import { mountShell, withBase } from '../shared/studio';

mountShell({
  title: '3D Creator Hub',
  active: 'hub',
  bodyHtml: `
    <main class="hub">
      <section class="hero">
        <h1>สร้างของ 3D ในเบราว์เซอร์</h1>
        <p>
          Hub รวมหลายระบบ: คีย์แคป, คลิกเกอร์ชื่อ, และตัวการ์ตูน 3D
          ปรับแต่งแล้วดาวน์โหลด STL ไปพิมพ์ได้ทันที — ไม่ต้องติดตั้งโปรแกรม
        </p>
      </section>
      <section class="cards">
        <a class="card" href="${withBase('keycap/')}">
          <div class="emoji">⌨️</div>
          <h2>Keycap Studio</h2>
          <p>สร้างคีย์แคปทรงกลม/สี่เหลี่ยม พร้อมตัวอักษรและสี filament</p>
          <span class="pill">พิมพ์ได้ · STL</span>
        </a>
        <a class="card" href="${withBase('clicker/')}">
          <div class="emoji">🔘</div>
          <h2>Clicker Studio</h2>
          <p>คลิกเกอร์ชื่อ — พิมพ์ชื่อบนปุ่มกด สไตล์ fidget พร้อม preview 3D</p>
          <span class="pill">ชื่อ / ตัวอักษร</span>
        </a>
        <a class="card" href="${withBase('mascot/')}">
          <div class="emoji">🎭</div>
          <h2>Mascot Studio</h2>
          <p>ตัวการ์ตูน chibi ปรับหน้า ผม สีเสื้อ — export STL หรือใช้เป็น mascot</p>
          <span class="pill">ตัวการ์ตูน 3D</span>
        </a>
      </section>
    </main>
  `,
});
