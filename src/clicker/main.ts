import * as THREE from 'three';
import {
  createStudioViewer,
  exportStl,
  hexToColor,
  mountShell,
} from '../shared/studio';

type BaseShape = 'circle' | 'square' | 'hexagon' | 'heart';

const state = {
  name: 'KAMPAI',
  baseShape: 'circle' as BaseShape,
  bodyColor: '#0f172a',
  capColor: '#f8fafc',
  textColor: '#f59e0b',
  size: 28,
  thick: 10,
};

function heartShape(scale: number): THREE.Shape {
  const s = new THREE.Shape();
  const k = scale;
  s.moveTo(0, -0.35 * k);
  s.bezierCurveTo(0, -0.55 * k, -0.5 * k, -0.8 * k, -0.8 * k, -0.35 * k);
  s.bezierCurveTo(-1.1 * k, 0.15 * k, -0.4 * k, 0.55 * k, 0, 0.9 * k);
  s.bezierCurveTo(0.4 * k, 0.55 * k, 1.1 * k, 0.15 * k, 0.8 * k, -0.35 * k);
  s.bezierCurveTo(0.5 * k, -0.8 * k, 0, -0.55 * k, 0, -0.35 * k);
  return s;
}

function makeBaseGeom(size: number, height: number): THREE.BufferGeometry {
  const r = size / 2;
  if (state.baseShape === 'square') {
    const g = new THREE.BoxGeometry(size, height, size);
    g.translate(0, height / 2, 0);
    return g;
  }
  if (state.baseShape === 'hexagon') {
    const g = new THREE.CylinderGeometry(r, r, height, 6);
    g.translate(0, height / 2, 0);
    return g;
  }
  if (state.baseShape === 'heart') {
    const shape = heartShape(r);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 2,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }
  const g = new THREE.CylinderGeometry(r, r * 1.02, height, 48);
  g.translate(0, height / 2, 0);
  return g;
}

function buildClicker(): THREE.Group {
  const group = new THREE.Group();
  const size = state.size / 10;
  const bodyH = state.thick / 10;
  const capH = 0.35;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: hexToColor(state.bodyColor),
    roughness: 0.4,
    metalness: 0.1,
  });
  const body = new THREE.Mesh(makeBaseGeom(size, bodyH), bodyMat);
  group.add(body);

  // recessed well + raised cap
  const well = new THREE.Mesh(
    new THREE.CylinderGeometry(size * 0.38, size * 0.38, 0.18, 40),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 }),
  );
  well.position.y = bodyH + 0.01;
  group.add(well);

  const capMat = new THREE.MeshStandardMaterial({
    color: hexToColor(state.capColor),
    roughness: 0.35,
    metalness: 0.05,
  });
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(size * 0.34, size * 0.36, capH, 40),
    capMat,
  );
  cap.position.y = bodyH + capH * 0.55;
  group.add(cap);

  // stem hint under cap
  const stem = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.4, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1 }),
  );
  stem.position.y = bodyH - 0.05;
  group.add(stem);

  // name on cap via canvas texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = state.textColor;
  ctx.font = 'bold 90px Segoe UI, Sarabun, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = state.name.trim().split(/\s+/).slice(0, 2);
  if (lines.length === 1) {
    ctx.fillText(lines[0]!.slice(0, 10), 256, 270);
  } else {
    ctx.font = 'bold 70px Segoe UI, Sarabun, sans-serif';
    ctx.fillText(lines[0]!.slice(0, 10), 256, 230);
    ctx.fillText(lines[1]!.slice(0, 10), 256, 310);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.CircleGeometry(size * 0.28, 40),
    new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.55,
    }),
  );
  label.rotation.x = -Math.PI / 2;
  label.position.y = bodyH + capH + 0.03;
  group.add(label);

  return group;
}

mountShell({
  title: 'Clicker Studio',
  active: 'clicker',
  bodyHtml: `
    <div class="studio">
      <aside class="panel">
        <h1>Clicker Studio</h1>
        <p class="desc">คลิกเกอร์ชื่อ — พิมพ์ชื่อบนปุ่มกด แล้ว export STL</p>

        <div class="field">
          <label for="name">ชื่อ / ข้อความ</label>
          <input id="name" type="text" maxlength="20" value="${state.name}" />
        </div>
        <div class="field">
          <label for="baseShape">รูปทรงฐาน</label>
          <select id="baseShape">
            <option value="circle">Circle</option>
            <option value="square">Square</option>
            <option value="hexagon">Hexagon</option>
            <option value="heart">Heart</option>
          </select>
        </div>
        <div class="row">
          <div class="field">
            <label for="bodyColor">สีตัวเครื่อง</label>
            <input id="bodyColor" type="color" value="${state.bodyColor}" />
          </div>
          <div class="field">
            <label for="capColor">สีฝา</label>
            <input id="capColor" type="color" value="${state.capColor}" />
          </div>
        </div>
        <div class="field">
          <label for="textColor">สีตัวอักษร</label>
          <input id="textColor" type="color" value="${state.textColor}" />
        </div>
        <div class="field">
          <label for="size">ขนาด (~mm): <span id="sizeVal">${state.size}</span></label>
          <input id="size" type="range" min="20" max="40" step="1" value="${state.size}" />
        </div>
        <div class="field">
          <label for="thick">ความหนา (~mm): <span id="thickVal">${state.thick}</span></label>
          <input id="thick" type="range" min="6" max="16" step="0.5" value="${state.thick}" />
        </div>

        <div class="actions">
          <button class="btn primary" id="export">ดาวน์โหลด STL</button>
        </div>
        <div class="hint">
          แรงบันดาลใจจาก VostokLabs Clicker-Generator
          รุ่นถัดไป: MX switch socket จริง + manifold 3MF หลายสี + ฟอนต์ไทย
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
viewer.camera.position.set(5, 4, 6);
let model = buildClicker();
viewer.setRoot(model);

function rebuild() {
  model = buildClicker();
  viewer.setRoot(model);
}

const nameEl = document.querySelector<HTMLInputElement>('#name')!;
const baseShapeEl = document.querySelector<HTMLSelectElement>('#baseShape')!;
const bodyColorEl = document.querySelector<HTMLInputElement>('#bodyColor')!;
const capColorEl = document.querySelector<HTMLInputElement>('#capColor')!;
const textColorEl = document.querySelector<HTMLInputElement>('#textColor')!;
const sizeEl = document.querySelector<HTMLInputElement>('#size')!;
const thickEl = document.querySelector<HTMLInputElement>('#thick')!;

nameEl.addEventListener('input', () => {
  state.name = nameEl.value || 'NAME';
  rebuild();
});
baseShapeEl.addEventListener('change', () => {
  state.baseShape = baseShapeEl.value as BaseShape;
  rebuild();
});
bodyColorEl.addEventListener('input', () => {
  state.bodyColor = bodyColorEl.value;
  rebuild();
});
capColorEl.addEventListener('input', () => {
  state.capColor = capColorEl.value;
  rebuild();
});
textColorEl.addEventListener('input', () => {
  state.textColor = textColorEl.value;
  rebuild();
});
sizeEl.addEventListener('input', () => {
  state.size = Number(sizeEl.value);
  document.querySelector('#sizeVal')!.textContent = String(state.size);
  rebuild();
});
thickEl.addEventListener('input', () => {
  state.thick = Number(thickEl.value);
  document.querySelector('#thickVal')!.textContent = String(state.thick);
  rebuild();
});

document.querySelector('#export')!.addEventListener('click', () => {
  const safe = state.name.replace(/[^\wก-๙-]+/g, '-').slice(0, 24) || 'clicker';
  exportStl(model, `clicker-${safe}.stl`);
});
