import * as THREE from 'three';
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json';
import {
  createStudioViewer,
  exportStl,
  hexToColor,
  mountShell,
} from '../shared/studio';

type Shape = 'rounded' | 'square' | 'circle';

const state = {
  label: 'A',
  shape: 'rounded' as Shape,
  bodyColor: '#f8fafc',
  legendColor: '#0f172a',
  size: 18,
  height: 8,
  /** Letter height on the key top, in mm. */
  letterSize: 8,
  /** How much the letter sticks up, in mm. */
  letterDepth: 1.2,
};

const fontLoader = new FontLoader();
const legendFont: Font = fontLoader.parse(helvetikerBold);

function buildKeycap(): THREE.Group {
  const group = new THREE.Group();
  const s = state.size / 10;
  const h = state.height / 10;

  let top: THREE.BufferGeometry;
  if (state.shape === 'circle') {
    top = new THREE.CylinderGeometry(s * 0.55, s * 0.6, h, 48);
  } else if (state.shape === 'square') {
    top = new THREE.BoxGeometry(s, h, s);
  } else {
    const shape = new THREE.Shape();
    const r = s * 0.18;
    const half = s / 2;
    shape.moveTo(-half + r, -half);
    shape.lineTo(half - r, -half);
    shape.quadraticCurveTo(half, -half, half, -half + r);
    shape.lineTo(half, half - r);
    shape.quadraticCurveTo(half, half, half - r, half);
    shape.lineTo(-half + r, half);
    shape.quadraticCurveTo(-half, half, -half, half - r);
    shape.lineTo(-half, -half + r);
    shape.quadraticCurveTo(-half, -half, -half + r, -half);
    // Extrude along +Y so the top face sits at y = h (no buried legend).
    top = new THREE.ExtrudeGeometry(shape, {
      depth: h,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 2,
    });
    top.rotateX(-Math.PI / 2);
  }

  const bodyMat = new THREE.MeshStandardMaterial({
    color: hexToColor(state.bodyColor),
    roughness: 0.45,
    metalness: 0.05,
  });
  const body = new THREE.Mesh(top, bodyMat);
  // Keep every shape's bottom near y = 0 and top near y = h.
  if (state.shape !== 'rounded') {
    body.position.y = h / 2;
  }
  group.add(body);

  const bodyTopY =
    state.shape === 'rounded' ? h + 0.06 : h;

  // stem (MX-ish cross simplified)
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.5,
  });
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.35), stemMat);
  stem.position.y = -0.05;
  group.add(stem);
  const crossA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.55), stemMat);
  crossA.position.y = 0.05;
  group.add(crossA);
  const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.12), stemMat);
  crossB.position.y = 0.05;
  group.add(crossB);

  // Raised 3D legend — size controlled separately from the keycap base.
  const text = (state.label || 'A').slice(0, 3);
  const maxLetter = s * 0.85;
  const textSize = Math.min(maxLetter, Math.max(0.2, state.letterSize / 10));
  const textDepth = Math.max(0.05, state.letterDepth / 10);
  const textGeo = new TextGeometry(text, {
    font: legendFont,
    size: textSize,
    depth: textDepth,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  textGeo.computeBoundingBox();
  const bb = textGeo.boundingBox!;
  const tw = bb.max.x - bb.min.x;
  const th = bb.max.y - bb.min.y;
  textGeo.translate(-bb.min.x - tw / 2, -bb.min.y - th / 2, 0);

  const legend = new THREE.Mesh(
    textGeo,
    new THREE.MeshStandardMaterial({
      color: hexToColor(state.legendColor),
      roughness: 0.4,
      metalness: 0.05,
      emissive: hexToColor(state.legendColor),
      emissiveIntensity: 0.15,
    }),
  );
  legend.rotation.x = -Math.PI / 2;
  legend.position.y = bodyTopY + 0.01;
  group.add(legend);

  group.position.y = 0.3;
  return group;
}

mountShell({
  title: 'Keycap Studio',
  active: 'keycap',
  bodyHtml: `
    <div class="studio">
      <aside class="panel">
        <h1>Keycap Studio</h1>
        <p class="desc">ปรับรูปทรง สี และตัวอักษร แล้วดาวน์โหลด STL</p>

        <div class="field">
          <label for="label">ตัวอักษร / สัญลักษณ์</label>
          <input id="label" type="text" maxlength="3" value="${state.label}" />
        </div>
        <div class="field">
          <label for="shape">รูปทรง</label>
          <select id="shape">
            <option value="rounded">Rounded</option>
            <option value="square">Square</option>
            <option value="circle">Circle</option>
          </select>
        </div>
        <div class="row">
          <div class="field">
            <label for="bodyColor">สีตัวคีย์</label>
            <input id="bodyColor" type="color" value="${state.bodyColor}" />
          </div>
          <div class="field">
            <label for="legendColor">สีตัวอักษร</label>
            <input id="legendColor" type="color" value="${state.legendColor}" />
          </div>
        </div>
        <div class="field">
          <label for="size">ขนาดพื้นคีย์ (~mm): <span id="sizeVal">${state.size}</span></label>
          <input id="size" type="range" min="14" max="24" step="0.5" value="${state.size}" />
        </div>
        <div class="field">
          <label for="height">ความสูงคีย์ (~mm): <span id="heightVal">${state.height}</span></label>
          <input id="height" type="range" min="5" max="12" step="0.5" value="${state.height}" />
        </div>
        <div class="field">
          <label for="letterSize">ขนาดตัวอักษร (~mm): <span id="letterSizeVal">${state.letterSize}</span></label>
          <input id="letterSize" type="range" min="3" max="16" step="0.5" value="${state.letterSize}" />
        </div>
        <div class="field">
          <label for="letterDepth">ความนูนตัวอักษร (~mm): <span id="letterDepthVal">${state.letterDepth}</span></label>
          <input id="letterDepth" type="range" min="0.4" max="3" step="0.1" value="${state.letterDepth}" />
        </div>

        <div class="actions">
          <button class="btn primary" id="export">ดาวน์โหลด STL</button>
        </div>
        <div class="hint">
          เวอร์ชันนี้เป็นต้นแบบ preview + STL
          รุ่นถัดไปจะเพิ่ม stem MX จริงและ export 3MF หลายสี
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
let model = buildKeycap();
viewer.setRoot(model);

function rebuild() {
  model = buildKeycap();
  viewer.setRoot(model);
}

const labelEl = document.querySelector<HTMLInputElement>('#label')!;
const shapeEl = document.querySelector<HTMLSelectElement>('#shape')!;
const bodyColorEl = document.querySelector<HTMLInputElement>('#bodyColor')!;
const legendColorEl = document.querySelector<HTMLInputElement>('#legendColor')!;
const sizeEl = document.querySelector<HTMLInputElement>('#size')!;
const heightEl = document.querySelector<HTMLInputElement>('#height')!;
const letterSizeEl = document.querySelector<HTMLInputElement>('#letterSize')!;
const letterDepthEl = document.querySelector<HTMLInputElement>('#letterDepth')!;
const sizeVal = document.querySelector('#sizeVal')!;
const heightVal = document.querySelector('#heightVal')!;
const letterSizeVal = document.querySelector('#letterSizeVal')!;
const letterDepthVal = document.querySelector('#letterDepthVal')!;

labelEl.addEventListener('input', () => {
  state.label = labelEl.value || 'A';
  rebuild();
});
shapeEl.addEventListener('change', () => {
  state.shape = shapeEl.value as Shape;
  rebuild();
});
bodyColorEl.addEventListener('input', () => {
  state.bodyColor = bodyColorEl.value;
  rebuild();
});
legendColorEl.addEventListener('input', () => {
  state.legendColor = legendColorEl.value;
  rebuild();
});
sizeEl.addEventListener('input', () => {
  state.size = Number(sizeEl.value);
  sizeVal.textContent = String(state.size);
  rebuild();
});
heightEl.addEventListener('input', () => {
  state.height = Number(heightEl.value);
  heightVal.textContent = String(state.height);
  rebuild();
});
letterSizeEl.addEventListener('input', () => {
  state.letterSize = Number(letterSizeEl.value);
  letterSizeVal.textContent = String(state.letterSize);
  rebuild();
});
letterDepthEl.addEventListener('input', () => {
  state.letterDepth = Number(letterDepthEl.value);
  letterDepthVal.textContent = String(state.letterDepth);
  rebuild();
});

document.querySelector('#export')!.addEventListener('click', () => {
  exportStl(model, `keycap-${state.label || 'A'}.stl`);
});
