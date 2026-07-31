import { mountShell, withBase } from '../shared/studio';

mountShell({
  title: '3D Creator Hub',
  active: 'hub',
  bodyHtml: `
    <main class="hub">
      <section class="hero">
        <h1>สร้างของ 3D พิมพ์ได้ในเบราว์เซอร์</h1>
        <p>
          แกน manifold · หน่วย mm จริง · ฟอนต์ไทย · export 3MF หลายสี (AMS)
          รวม Keycap / Clicker / Mascot (Relief + Avatar)
        </p>
      </section>
      <section class="cards">
        <a class="card" href="${withBase('keycap/')}">
          <div class="emoji">⌨️</div>
          <h2>Keycap Studio</h2>
          <p>1u · MX stem จริง · ตัวอักษรไทยนูน · icon/SVG · 3MF สองสี</p>
          <span class="pill">พิมพ์ได้ · 3MF</span>
        </a>
        <a class="card" href="${withBase('clicker/')}">
          <div class="emoji">🔘</div>
          <h2>Clicker Studio</h2>
          <p>ชื่อไทย / รูป / SVG · MX socket · พวงกุญแจ · หลายสี</p>
          <span class="pill">text · image · SVG</span>
        </a>
        <a class="card" href="${withBase('mascot/')}">
          <div class="emoji">🎭</div>
          <h2>Mascot Studio</h2>
          <p>แท็บ Relief พิมพ์นูนจากรูป · แท็บ Avatar แต่งตัวละคร export GLB</p>
          <span class="pill">Relief + Avatar</span>
        </a>
      </section>
    </main>
  `,
});
