import * as THREE from 'three';
import {
  captureCoverPng,
  createStudioViewer,
  debounce,
  loadProject,
  meshArraysToThree,
  mountShell,
  saveProject,
  setStatus,
  writeHashParams,
} from '../shared/studio';
import { fontSelectHtml, loadFont, textToContours, warmFonts, type Ring } from '../shared/geometry/textToContours';
import {
  difference,
  disposeManifold,
  extrudeRings,
  manifoldToMesh,
  mxCrossSolid,
  union,
} from '../shared/geometry/manifoldOps';
import { MX, mxSocketRects } from '../shared/geometry/mxStem';
import { exportParts, type ExportPart } from '../shared/export/parts';
import { hexToRgb, filamentOptionsHtml } from '../shared/units';
import { imageFileToRegions, svgTextToRegions, type ColorRegion } from '../shared/geometry/imageToRegions';
import { IMAGE_WIZARD_HINT, PRINT_TIPS_CLICKER } from '../shared/ui/presets';

type BaseShape = 'circle' | 'square' | 'hexagon' | 'heart' | 'star';
type ImportMode = 'text' | 'image' | 'svg' | 'icon';
type ColorMode = 'ams' | 'zband';

type State = {
  name: string;
  baseShape: BaseShape;
  bodyColor: string;
  capColor: string;
  textColor: string;
  size: number;
  thick: number;
  fontId: string;
  letterSize: number;
  letterDepth: number;
  importMode: ImportMode;
  colorMode: ColorMode;
  keychain: boolean;
  keychainStyle: 'loop' | 'hole';
  maxColors: number;
  exploded: boolean;
};

const state: State = {
  name: 'คำไผ่',
  baseShape: 'circle',
  bodyColor: '#0f172a',
  capColor: '#f7f7f5',
  textColor: '#f59e0b',
  size: 32,
  thick: 10,
  fontId: 'sarabun',
  letterSize: 8,
  letterDepth: 1.2,
  importMode: 'text',
  colorMode: 'ams',
  keychain: true,
  keychainStyle: 'loop',
  maxColors: 4,
  exploded: false,
};
Object.assign(state, loadProject<Partial<State>>('clicker') ?? {});

let imageRegions: ColorRegion[] | null = null;
let lastParts: ExportPart[] = [];

function shapeOutline(kind: BaseShape, size: number): Ring {
  const r = size / 2;
  if (kind === 'circle') {
    const ring: Ring = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      ring.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return ring;
  }
  if (kind === 'square') {
    return [
      [-r, -r],
      [r, -r],
      [r, r],
      [-r, r],
    ];
  }
  if (kind === 'hexagon') {
    const ring: Ring = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      ring.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return ring;
  }
  if (kind === 'star') {
    const ring: Ring = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      ring.push([rr * Math.cos(a), rr * Math.sin(a)]);
    }
    return ring;
  }
  // heart
  const ring: Ring = [];
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y =
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    ring.push([(x / 18) * r, (y / 18) * r]);
  }
  return ring;
}

function iconRings(sizeMm: number): Ring[] {
  const scale = sizeMm / 128;
  return [
    Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return [Math.cos(a) * 40 * scale, Math.sin(a) * 40 * scale] as [number, number];
    }),
  ];
}

async function build() {
  const warns: string[] = [];
  const s = state.size;
  const bodyH = state.thick;
  const border = 2.2;
  const wellR = s / 2 - border;
  const capR = wellR - 0.35;
  const travel = 3.8;
  const floor = 2.2;

  const bodyOuter = await extrudeRings([shapeOutline(state.baseShape, s)], bodyH, false);
  const well = await extrudeRings(
    [
      Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return [Math.cos(a) * wellR, Math.sin(a) * wellR] as [number, number];
      }),
    ],
    bodyH - floor + 0.2,
    false,
  );
  const wellUp = well.translate([0, 0, floor]);
  let body = await difference(bodyOuter, wellUp);
  disposeManifold(bodyOuter, well, wellUp);

  const sock = mxSocketRects(0.05);
  const socket = await mxCrossSolid(sock.length, sock.thickness, floor + 0.4);
  const socketPlaced = socket.translate([0, 0, floor / 2]);
  const bodyCut = await difference(body, socketPlaced);
  disposeManifold(body, socket, socketPlaced);
  body = bodyCut;

  if (state.keychain) {
    const lugOuter = await extrudeRings(
      [
        Array.from({ length: 32 }, (_, i) => {
          const a = (i / 32) * Math.PI * 2;
          return [s / 2 + 3 + Math.cos(a) * 4, Math.sin(a) * 4] as [number, number];
        }),
      ],
      bodyH * 0.7,
      false,
    );
    if (state.keychainStyle === 'loop') {
      const hole = await extrudeRings(
        [
          Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return [s / 2 + 3 + Math.cos(a) * 2.2, Math.sin(a) * 2.2] as [number, number];
          }),
        ],
        bodyH,
        false,
      );
      const lug = await difference(lugOuter, hole);
      const bodyWithLug = await union(body, lug);
      disposeManifold(body, lugOuter, hole, lug);
      body = bodyWithLug;
    } else {
      const hole = await extrudeRings(
        [
          Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return [s / 2 - 3 + Math.cos(a) * 2.6, Math.sin(a) * 2.6] as [number, number];
          }),
        ],
        bodyH + 1,
        false,
      );
      const bodyHoled = await difference(body, hole);
      disposeManifold(body, lugOuter, hole);
      body = bodyHoled;
      warns.push('โหมด hole: เจาะห่วงในตัวเครื่อง');
    }
  }

  const bodyMesh = manifoldToMesh(body);
  disposeManifold(body);

  let cap = await extrudeRings(
    [
      Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return [Math.cos(a) * capR, Math.sin(a) * capR] as [number, number];
      }),
    ],
    3.2,
    false,
  );
  const stem = await mxCrossSolid(MX.stemCrossLength, MX.stemCrossThickness, 4.5);
  const stemPlaced = stem.translate([0, 0, -2]);
  const capJoined = await union(cap, stemPlaced);
  disposeManifold(cap, stem, stemPlaced);
  const capLifted = capJoined.translate([0, 0, bodyH - travel + 0.4]);
  const capMesh = manifoldToMesh(capLifted);
  disposeManifold(capJoined, capLifted);

  const parts: ExportPart[] = [
    { name: 'body', mesh: bodyMesh, colorRgb: hexToRgb(state.bodyColor) },
    { name: 'cap', mesh: capMesh, colorRgb: hexToRgb(state.capColor) },
  ];

  try {
    let regions: ColorRegion[] = [];
    if (state.importMode === 'text') {
      const font = await loadFont(state.fontId);
      const contours = textToContours(font, state.name || 'NAME', state.letterSize);
      regions = [{ rgb: hexToRgb(state.textColor), rings: contours.rings, coverage: 1 }];
    } else if (state.importMode === 'icon') {
      regions = [{ rgb: hexToRgb(state.textColor), rings: iconRings(state.letterSize), coverage: 1 }];
    } else if (imageRegions?.length) {
      regions = imageRegions;
    }
    let zi = 0;
    for (const region of regions) {
      const bandDepth =
        state.colorMode === 'zband'
          ? Math.max(0.35, state.letterDepth * 0.55)
          : state.letterDepth;
      const z0 =
        bodyH - travel + 0.4 + 3.2 + (state.colorMode === 'zband' ? zi * bandDepth : zi * 0.01);
      const solid = await extrudeRings(region.rings, bandDepth, false);
      const placed = solid.translate([0, 0, z0]);
      parts.push({
        name: state.colorMode === 'zband' ? `zband-${zi}` : `decor-${zi}`,
        mesh: manifoldToMesh(placed),
        colorRgb: region.rgb,
      });
      disposeManifold(solid, placed);
      zi++;
    }
    if (state.colorMode === 'zband' && regions.length > 1) {
      warns.push('No-AMS: ชั้น Z แยกสี — ใส่ pause ใน slicer ตอนเปลี่ยนเส้น');
    }
  } catch (e) {
    warns.push(e instanceof Error ? e.message : String(e));
  }

  const group = new THREE.Group();
  for (const p of parts) {
    const c = p.colorRgb;
    const mesh = meshArraysToThree(p.mesh, new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255));
    mesh.rotation.x = -Math.PI / 2;
    group.add(mesh);
  }
  return { group, parts, warnings: warns };
}

mountShell({
  title: 'Clicker Studio',
  active: 'clicker',
  bodyHtml: `
    <div class="studio">
      <aside class="panel">
        <h1>Clicker Studio</h1>
        <p class="desc">คลิกเกอร์ชื่อ · MX socket · รูป/SVG · 3MF · mm</p>
        <div class="field"><label for="importMode">โหมด</label>
          <select id="importMode"><option value="text">ข้อความ</option><option value="image">รูปภาพ</option><option value="svg">SVG</option><option value="icon">ไอคอน</option></select></div>
        <div class="field" id="nameField"><label for="name">ชื่อ</label><input id="name" maxlength="24" value="${state.name}"/></div>
        <div class="field" id="fontField"><label for="fontId">ฟอนต์</label><select id="fontId">${fontSelectHtml(state.fontId)}</select></div>
        <div class="field hidden" id="fileField"><label for="file">ไฟล์</label><input id="file" type="file" accept="image/*,.svg"/></div>
        <div class="field"><label for="baseShape">รูปทรงฐาน</label>
          <select id="baseShape"><option value="circle">Circle</option><option value="square">Square</option><option value="hexagon">Hex</option><option value="heart">Heart</option><option value="star">Star</option></select></div>
        <div class="row">
          <div class="field"><label for="bodyColor">สีตัว</label><input id="bodyColor" type="color" value="${state.bodyColor}"/></div>
          <div class="field"><label for="capColor">สีฝา</label><input id="capColor" type="color" value="${state.capColor}"/></div>
        </div>
        <div class="field"><label for="textColor">สีลาย</label><input id="textColor" type="color" value="${state.textColor}"/></div>
        <div class="field"><label for="bodyPreset">พรีเซ็ตสีตัว</label><select id="bodyPreset">${filamentOptionsHtml(state.bodyColor)}</select></div>
        <div class="field"><label for="colorMode">สีหลายชั้น</label>
          <select id="colorMode"><option value="ams">AMS (หลายเส้น)</option><option value="zband">No-AMS (Z-band + pause)</option></select></div>
        <div class="field"><label for="size">ขนาด (mm): <span id="sizeVal">${state.size}</span></label><input id="size" type="range" min="24" max="48" step="1" value="${state.size}"/></div>
        <div class="field"><label for="thick">ความหนา (mm): <span id="thickVal">${state.thick}</span></label><input id="thick" type="range" min="8" max="16" step="0.5" value="${state.thick}"/></div>
        <div class="field"><label for="letterSize">ขนาดลาย (mm): <span id="letterSizeVal">${state.letterSize}</span></label><input id="letterSize" type="range" min="4" max="18" step="0.5" value="${state.letterSize}"/></div>
        <div class="field"><label for="letterDepth">ความนูน (mm): <span id="letterDepthVal">${state.letterDepth}</span></label><input id="letterDepth" type="range" min="0.4" max="2.5" step="0.1" value="${state.letterDepth}"/></div>
        <div class="field"><label for="maxColors">จำนวนสีรูป: <span id="maxColorsVal">${state.maxColors}</span></label><input id="maxColors" type="range" min="2" max="6" step="1" value="${state.maxColors}"/></div>
        <div class="field"><label><input id="keychain" type="checkbox" ${state.keychain ? 'checked' : ''}/> พวงกุญแจ</label></div>
        <div class="field"><label for="keychainStyle">แบบห่วง</label><select id="keychainStyle"><option value="loop">Loop</option><option value="hole">Hole</option></select></div>
        <div class="field"><label><input id="exploded" type="checkbox"/> Exploded</label></div>
        <div class="actions">
          <button class="btn primary" id="export3mf">3MF + Cover</button>
          <button class="btn" id="exportStl">STL + Cover</button>
          <button class="btn" id="saveProj">บันทึก</button>
        </div>
        <div class="hint">ฝา nest ใน bezel · MX socket จริง · ลายเป็น mesh พิมพ์ได้</div>
        ${IMAGE_WIZARD_HINT}
        ${PRINT_TIPS_CLICKER}
        <div class="status" id="status">โหลด…</div>
      </aside>
      <div class="stage-wrap"><div id="stage" style="width:100%;height:100%"></div><div class="stage-label">1 unit = 1 mm</div></div>
    </div>`,
});

const viewer = createStudioViewer(document.querySelector('#stage')!);
const statusEl = document.querySelector<HTMLElement>('#status')!;
const q = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;

async function rebuild() {
  setStatus(statusEl, 'กำลังสร้าง…', 'warn');
  try {
    const { group, parts, warnings } = await build();
    lastParts = parts;
    viewer.setRoot(group);
    viewer.setExploded(state.exploded ? 12 : 0);
    viewer.fitToObject(2.0);
    writeHashParams({ name: state.name, size: state.size, mode: state.importMode });
    setStatus(statusEl, warnings.length ? warnings.join(' · ') : `พร้อม · ${parts.length} ส่วน`, warnings.length ? 'warn' : 'ok');
  } catch (e) {
    setStatus(statusEl, e instanceof Error ? e.message : String(e), 'err');
  }
}
const rebuildDebounced = debounce(() => void rebuild(), 220);

function syncMode() {
  const texty = state.importMode === 'text';
  const filey = state.importMode === 'image' || state.importMode === 'svg';
  q('nameField').classList.toggle('hidden', !texty);
  q('fontField').classList.toggle('hidden', !texty);
  q('fileField').classList.toggle('hidden', !filey);
  const wiz = document.querySelector('#imageWizard');
  wiz?.classList.toggle('hidden', !filey);
}

q<HTMLSelectElement>('importMode').onchange = (e) => {
  state.importMode = (e.target as HTMLSelectElement).value as ImportMode;
  syncMode();
  rebuildDebounced();
};
q<HTMLSelectElement>('colorMode').value = state.colorMode;
q<HTMLSelectElement>('colorMode').onchange = (e) => {
  state.colorMode = (e.target as HTMLSelectElement).value as ColorMode;
  rebuildDebounced();
};
q<HTMLSelectElement>('bodyPreset').onchange = (e) => {
  state.bodyColor = (e.target as HTMLSelectElement).value;
  q<HTMLInputElement>('bodyColor').value = state.bodyColor;
  rebuildDebounced();
};
q<HTMLInputElement>('name').oninput = (e) => {
  state.name = (e.target as HTMLInputElement).value || 'NAME';
  rebuildDebounced();
};
q<HTMLSelectElement>('fontId').onchange = (e) => {
  state.fontId = (e.target as HTMLSelectElement).value;
  rebuildDebounced();
};
q<HTMLSelectElement>('baseShape').value = state.baseShape;
q<HTMLSelectElement>('baseShape').onchange = (e) => {
  state.baseShape = (e.target as HTMLSelectElement).value as BaseShape;
  rebuildDebounced();
};
for (const id of ['bodyColor', 'capColor', 'textColor'] as const) {
  q<HTMLInputElement>(id).oninput = (e) => {
    state[id] = (e.target as HTMLInputElement).value;
    rebuildDebounced();
  };
}
for (const [id, key, val] of [
  ['size', 'size', 'sizeVal'],
  ['thick', 'thick', 'thickVal'],
  ['letterSize', 'letterSize', 'letterSizeVal'],
  ['letterDepth', 'letterDepth', 'letterDepthVal'],
  ['maxColors', 'maxColors', 'maxColorsVal'],
] as const) {
  q<HTMLInputElement>(id).oninput = (e) => {
    const num = Number((e.target as HTMLInputElement).value);
    (state as unknown as Record<string, number>)[key] = num;
    document.querySelector(`#${val}`)!.textContent = String(num);
    rebuildDebounced();
  };
}
q<HTMLInputElement>('keychain').onchange = (e) => {
  state.keychain = (e.target as HTMLInputElement).checked;
  rebuildDebounced();
};
q<HTMLSelectElement>('keychainStyle').onchange = (e) => {
  state.keychainStyle = (e.target as HTMLSelectElement).value as 'loop' | 'hole';
  rebuildDebounced();
};
q<HTMLInputElement>('exploded').onchange = (e) => {
  state.exploded = (e.target as HTMLInputElement).checked;
  viewer.setExploded(state.exploded ? 12 : 0);
};
q<HTMLInputElement>('file').onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.name.toLowerCase().endsWith('.svg') || file.type.includes('svg')) {
    imageRegions = await svgTextToRegions(await file.text(), state.letterSize * 1.6, state.maxColors);
    state.importMode = 'svg';
  } else {
    imageRegions = await imageFileToRegions(file, state.letterSize * 1.8, state.maxColors);
    state.importMode = 'image';
  }
  q<HTMLSelectElement>('importMode').value = state.importMode;
  syncMode();
  rebuildDebounced();
};
q<HTMLButtonElement>('export3mf').onclick = () => {
  const base = `clicker-${state.name}`;
  exportParts(lastParts, base, '3mf');
  captureCoverPng(viewer, base);
};
q<HTMLButtonElement>('exportStl').onclick = () => {
  const base = `clicker-${state.name}`;
  exportParts(lastParts, base, 'stl');
  captureCoverPng(viewer, base);
};
q<HTMLButtonElement>('saveProj').onclick = () => {
  saveProject('clicker', state);
  setStatus(statusEl, 'บันทึกแล้ว', 'ok');
};
syncMode();
void warmFonts().then(() => rebuild());
