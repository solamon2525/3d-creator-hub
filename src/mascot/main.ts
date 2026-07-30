import * as THREE from 'three';
import {
  createStudioViewer,
  exportStl,
  hexToColor,
  mountShell,
} from '../shared/studio';

type Hair = 'short' | 'spiky' | 'bob' | 'none';
type Eye = 'round' | 'happy' | 'dot';

const state = {
  name: 'Chibi',
  skin: '#ffd7b5',
  hairColor: '#1e293b',
  shirt: '#38bdf8',
  pants: '#0f172a',
  hair: 'short' as Hair,
  eyes: 'round' as Eye,
  blush: true,
};

function mat(color: string | number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color: typeof color === 'string' ? hexToColor(color) : color,
    roughness: 0.55,
    metalness: 0.05,
    ...opts,
  });
}

function buildMascot(): THREE.Group {
  const g = new THREE.Group();

  // legs
  const legMat = mat(state.pants);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.7, 16), legMat);
  legL.position.set(-0.22, 0.35, 0);
  const legR = legL.clone();
  legR.position.x = 0.22;
  g.add(legL, legR);

  // feet
  const shoe = mat('#111827');
  const footL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), shoe);
  footL.scale.set(1, 0.55, 1.35);
  footL.position.set(-0.22, 0.08, 0.08);
  const footR = footL.clone();
  footR.position.x = 0.22;
  g.add(footL, footR);

  // body
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 28, 20),
    mat(state.shirt),
  );
  body.scale.set(1, 1.15, 0.9);
  body.position.y = 1.05;
  g.add(body);

  // arms
  const armMat = mat(state.skin);
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.45, 6, 10), armMat);
  armL.position.set(-0.7, 1.05, 0);
  armL.rotation.z = 0.35;
  const armR = armL.clone();
  armR.position.x = 0.7;
  armR.rotation.z = -0.35;
  g.add(armL, armR);

  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 32, 24), mat(state.skin));
  head.position.y = 1.95;
  g.add(head);

  // ears
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat(state.skin));
  earL.position.set(-0.45, 1.95, 0);
  const earR = earL.clone();
  earR.position.x = 0.45;
  g.add(earL, earR);

  // hair
  if (state.hair !== 'none') {
    const hairMat = mat(state.hairColor);
    if (state.hair === 'short') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      hair.position.set(0, 2.05, 0);
      g.add(hair);
    } else if (state.hair === 'bob') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), hairMat);
      hair.scale.set(1.05, 0.9, 1.05);
      hair.position.set(0, 1.95, -0.02);
      g.add(hair);
      const bang = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.2), hairMat);
      bang.position.set(0, 2.15, 0.35);
      bang.rotation.x = -0.25;
      g.add(bang);
    } else {
      for (const [x, z, rot] of [
        [0, 0.15, 0],
        [-0.22, 0.05, 0.3],
        [0.22, 0.05, -0.3],
        [0, -0.05, 0.15],
      ] as const) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 8), hairMat);
        spike.position.set(x, 2.35, z);
        spike.rotation.z = rot;
        g.add(spike);
      }
      const base = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat);
      base.position.set(0, 2.0, 0);
      g.add(base);
    }
  }

  // eyes
  const eyeMat = mat('#0f172a');
  const eyeY = 1.98;
  if (state.eyes === 'dot') {
    for (const x of [-0.16, 0.16]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), eyeMat);
      e.position.set(x, eyeY, 0.42);
      g.add(e);
    }
  } else if (state.eyes === 'happy') {
    for (const x of [-0.16, 0.16]) {
      const e = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 16, Math.PI), eyeMat);
      e.position.set(x, eyeY, 0.42);
      e.rotation.x = Math.PI;
      g.add(e);
    }
  } else {
    for (const x of [-0.16, 0.16]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), eyeMat);
      e.scale.set(1, 1.15, 0.7);
      e.position.set(x, eyeY, 0.42);
      g.add(e);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), mat('#ffffff'));
      shine.position.set(x - 0.03, eyeY + 0.03, 0.48);
      g.add(shine);
    }
  }

  // blush
  if (state.blush) {
    const blushMat = mat('#fb7185', { transparent: true, opacity: 0.55 });
    for (const x of [-0.28, 0.28]) {
      const b = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), blushMat);
      b.position.set(x, 1.86, 0.43);
      g.add(b);
    }
  }

  // mouth
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.018, 8, 16, Math.PI),
    mat('#be123c'),
  );
  mouth.position.set(0, 1.78, 0.44);
  mouth.rotation.x = Math.PI;
  g.add(mouth);

  // name plate
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(15,23,42,0.85)';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 28px Segoe UI, Sarabun, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.name.slice(0, 12), 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.35),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true }),
  );
  plate.position.set(0, 0.05, 1.1);
  g.add(plate);

  return g;
}

mountShell({
  title: 'Mascot Studio',
  active: 'mascot',
  bodyHtml: `
    <div class="studio">
      <aside class="panel">
        <h1>Mascot Studio</h1>
        <p class="desc">ตัวการ์ตูน chibi — ปรับทรงผม ตา สีเสื้อ แล้ว export STL</p>

        <div class="field">
          <label for="name">ชื่อตัวละคร</label>
          <input id="name" type="text" maxlength="12" value="${state.name}" />
        </div>
        <div class="field">
          <label for="hair">ทรงผม</label>
          <select id="hair">
            <option value="short">Short</option>
            <option value="spiky">Spiky</option>
            <option value="bob">Bob</option>
            <option value="none">Bald</option>
          </select>
        </div>
        <div class="field">
          <label for="eyes">ดวงตา</label>
          <select id="eyes">
            <option value="round">Round</option>
            <option value="happy">Happy</option>
            <option value="dot">Dot</option>
          </select>
        </div>
        <div class="row">
          <div class="field">
            <label for="skin">สีผิว</label>
            <input id="skin" type="color" value="${state.skin}" />
          </div>
          <div class="field">
            <label for="hairColor">สีผม</label>
            <input id="hairColor" type="color" value="${state.hairColor}" />
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label for="shirt">สีเสื้อ</label>
            <input id="shirt" type="color" value="${state.shirt}" />
          </div>
          <div class="field">
            <label for="pants">สีกางเกง</label>
            <input id="pants" type="color" value="${state.pants}" />
          </div>
        </div>
        <div class="field">
          <label>
            <input id="blush" type="checkbox" ${state.blush ? 'checked' : ''} />
            มี blush แก้ม
          </label>
        </div>

        <div class="actions">
          <button class="btn primary" id="export">ดาวน์โหลด STL</button>
        </div>
        <div class="hint">
          รุ่นนี้ประกอบจาก primitives ใน Three.js
          รุ่นถัดไปจะรองรับ GLB parts (หน้า/ผม/เสื้อ) จาก Blender
        </div>
      </aside>
      <div class="stage-wrap">
        <div id="stage" style="width:100%;height:100%"></div>
        <div class="stage-label">ลากหมุน · สกอลล์ซูม</div>
      </div>
    </div>
  `,
});

const stage = document.querySelector<HTMLElement>('#stage')!;
const viewer = createStudioViewer(stage);
viewer.camera.position.set(3.2, 2.8, 4.5);
viewer.controls.target.set(0, 1.2, 0);
let model = buildMascot();
viewer.setRoot(model);

function rebuild() {
  model = buildMascot();
  viewer.setRoot(model);
}

const bind = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;

bind<HTMLInputElement>('name').addEventListener('input', (e) => {
  state.name = (e.target as HTMLInputElement).value || 'Chibi';
  rebuild();
});
bind<HTMLSelectElement>('hair').addEventListener('change', (e) => {
  state.hair = (e.target as HTMLSelectElement).value as Hair;
  rebuild();
});
bind<HTMLSelectElement>('eyes').addEventListener('change', (e) => {
  state.eyes = (e.target as HTMLSelectElement).value as Eye;
  rebuild();
});
for (const key of ['skin', 'hairColor', 'shirt', 'pants'] as const) {
  bind<HTMLInputElement>(key).addEventListener('input', (e) => {
    state[key] = (e.target as HTMLInputElement).value;
    rebuild();
  });
}
bind<HTMLInputElement>('blush').addEventListener('change', (e) => {
  state.blush = (e.target as HTMLInputElement).checked;
  rebuild();
});

document.querySelector('#export')!.addEventListener('click', () => {
  const safe = state.name.replace(/[^\wก-๙-]+/g, '-').slice(0, 20) || 'mascot';
  exportStl(model, `mascot-${safe}.stl`);
});
