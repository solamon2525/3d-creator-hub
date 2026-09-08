import * as THREE from 'three';
import {
  captureCoverPng,
  createStudioViewer,
  createCoverPng,
  downloadBlob,
  disposeObject3D,
  debounce,
  downloadProjectFile,
  loadProject,
  meshArraysToThree,
  mountShell,
  readProjectFile,
  saveProject,
  setStatus,
  writeHashParams,
} from '../shared/studio';
import { fontSelectHtml, loadFontForText, textToContours, warmFonts, type Ring } from '../shared/geometry/textToContours';
import {
  difference,
  disposeManifold,
  extrudeRings,
  manifoldToMesh,
  mxCrossSolid,
  union,
  getManifold,
  type MeshArrays,
} from '../shared/geometry/manifoldOps';
import { MX, mxSocketRects } from '../shared/geometry/mxStem';
import { exportParts, buildStlZip, type ExportPart } from '../shared/export/parts';
import { createModularSolids, DEFAULT_MODULAR, normalizeModular, modularParts, groundPart, MODULAR_GUIDE, type ModularSettings } from './modular';
import { hexToRgb, filamentOptionsHtml, rgbToHex } from '../shared/units';
import {
  processImageWizard,
  svgTextToRegions,
  type ColorRegion,
} from '../shared/geometry/imageToRegions';
import { IMAGE_WIZARD_HINT, mountPrintChecklist, PRINT_TIPS_CLICKER } from '../shared/ui/presets';

type BaseShape = 'circle' | 'square' | 'hexagon' | 'heart' | 'star';
type ImportMode = 'text' | 'image' | 'svg' | 'icon';
type ColorMode = 'ams' | 'zband';

type State = {
  productMode: 'classic' | 'modular';
  modular: ModularSettings;
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
  cropMargin: number;
  knockOutWhite: boolean;
  exploded: boolean;
};

const state: State = {
  productMode: 'classic',
  modular: {...DEFAULT_MODULAR},
  name: 'คำไผ่',
  baseShape: 'circle',
  bodyColor: '#0f172a',
  capColor: '#f7f7f5',
  textColor: '#c2410c',
  size: 32,
  thick: 10,
  fontId: 'sarabun',
  letterSize: 10,
  letterDepth: 1.6,
  importMode: 'text',
  colorMode: 'ams',
  keychain: true,
  keychainStyle: 'loop',
  maxColors: 4,
  cropMargin: 0.05,
  knockOutWhite: true,
  exploded: false,
};
Object.assign(state, loadProject<Partial<State>>('clicker') ?? {});
state.productMode = state.productMode === 'modular' ? 'modular' : 'classic';
state.modular = normalizeModular(state.modular);
state.name = typeof state.name === 'string' ? state.name : 'NAME';

let templatePromise: Promise<MeshArrays[]> | null = null;
function getTemplates(): Promise<MeshArrays[]> {
  return templatePromise ??= getManifold().then(m => {
    const solids = createModularSolids(m);
    try { return solids.map(manifoldToMesh); }
    finally { disposeManifold(...solids); }
  }).catch(error => { templatePromise = null; throw error; });
}

let imageRegions: ColorRegion[] | null = null;
let lastParts: ExportPart[] = [];
let lastImageFile: File | null = null;
let palettePreview: string[] = [];
let wizardPreviewUrl: string | null = null;

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

async function build(state: State) {
  if (state.productMode === 'modular') {
    const templates = await getTemplates();
    const settings = state.modular;
    const previewParts = modularParts(templates, settings, settings.count, settings.view);
    const parts = modularParts(templates, settings, settings.exportSet === 'prototype' ? 1 : settings.count, 'print');
    const group = new THREE.Group();
    for (const p of previewParts) {
      const c = p.colorRgb;
      const object = meshArraysToThree(p.mesh, new THREE.Color(c[0]/255,c[1]/255,c[2]/255));
      object.rotation.x = -Math.PI/2;
      group.add(object);
    }
    return {group, parts, warnings: [] as string[]};
  }
  const warns: string[] = [];
  const s = state.size;
  const bodyH = state.thick;
  const border = 2.2;
  const wellR = s / 2 - border;
  const capR = wellR - 0.35;
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

  const capThick = 3.2;
  // Face sits slightly above body rim so Thai/Latin legend is easy to see
  const capTop = bodyH + 0.7;
  const capBottom = capTop - capThick;

  let cap = await extrudeRings(
    [
      Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return [Math.cos(a) * capR, Math.sin(a) * capR] as [number, number];
      }),
    ],
    capThick,
    false,
  );
  const stem = await mxCrossSolid(MX.stemCrossLength, MX.stemCrossThickness, 4.5);
  const stemPlaced = stem.translate([0, 0, -2]);
  const capJoined = await union(cap, stemPlaced);
  disposeManifold(cap, stem, stemPlaced);
  const capLifted = capJoined.translate([0, 0, capBottom]);
  const capMesh = manifoldToMesh(capLifted);
  disposeManifold(capJoined, capLifted);

  const parts: ExportPart[] = [
    { name: 'body', mesh: bodyMesh, colorRgb: hexToRgb(state.bodyColor) },
    { name: 'cap', mesh: capMesh, colorRgb: hexToRgb(state.capColor) },
  ];

  const decorNames: string[] = [];
  try {
    let regions: ColorRegion[] = [];
    if (state.importMode === 'text') {
      const { font, fontId, warned } = await loadFontForText(state.fontId, state.name || 'NAME');
      if (warned) warns.push(warned);
      if (fontId !== state.fontId) state.fontId = fontId;
      const contours = textToContours(font, state.name || 'NAME', state.letterSize);
      if (!contours.rings.length) throw new Error('วาดตัวอักษรไม่ได้ — ลองฟอนต์ไทย (Sarabun/Kanit)');
      regions = [{ rgb: hexToRgb(state.textColor), rings: contours.rings, coverage: 1 }];
    } else if (state.importMode === 'icon') {
      regions = [{ rgb: hexToRgb(state.textColor), rings: iconRings(state.letterSize), coverage: 1 }];
    } else if (imageRegions?.length) {
      regions = imageRegions;
    } else if (state.importMode === 'image' || state.importMode === 'svg') {
      warns.push('ยังไม่มีรูป — อัปโหลดไฟล์ก่อน');
    }
    let zi = 0;
    for (const region of regions) {
      const bandDepth =
        state.colorMode === 'zband'
          ? Math.max(0.45, state.letterDepth * 0.55)
          : Math.max(0.8, state.letterDepth);
      // Lift above cap face so letters are not coplanar / sunk in the well
      const z0 =
        capTop +
        0.25 +
        (state.colorMode === 'zband' ? zi * bandDepth : zi * 0.02);
      const solid = await extrudeRings(region.rings, bandDepth, false);
      const placed = solid.translate([0, 0, z0]);
      const name = state.colorMode === 'zband' ? `zband-${zi}` : `decor-${zi}`;
      const mesh = manifoldToMesh(placed);
      parts.push({
        name,
        mesh,
        colorRgb: region.rgb,
      });
      decorNames.push(name);
      disposeManifold(solid, placed);
      zi++;
    }
    if (!regions.length && state.importMode === 'text') {
      warns.push('ไม่มี mesh ตัวอักษร');
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
    const raised = decorNames.includes(p.name);
    const mesh = meshArraysToThree(
      p.mesh,
      new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255),
      { raised },
    );
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
        <div class="field"><label for="productMode">ชนิดงาน</label><select id="productMode"><option value="classic">Clicker เดิม</option><option value="modular">ฐานต่อสามเหลี่ยม</option></select></div>
        <section id="modularControls" class="hidden">
          <p class="desc">ฐานกลาง + หัวมีรูห่วง + ตัวปิดท้าย</p>
          <div class="field"><label for="moduleCount">จำนวนฐานกลาง: <span id="moduleCountVal">1</span></label><input id="moduleCount" type="range" min="1" max="8" step="1" value="1"/></div>
          <div class="row"><div class="field"><label for="moduleBaseColor">สีฐาน</label><input id="moduleBaseColor" type="color"/></div><div class="field"><label for="moduleHeadColor">สีหัว</label><input id="moduleHeadColor" type="color"/></div><div class="field"><label for="moduleTailColor">สีท้าย</label><input id="moduleTailColor" type="color"/></div></div>
          <div class="field"><label for="moduleView">มุมมอง</label><select id="moduleView"><option value="assembled">ประกอบแล้ว</option><option value="exploded">แยกชิ้น</option><option value="print">จัดวางสำหรับพิมพ์</option></select></div>
          <div class="field"><label for="moduleExportSet">ชุดส่งออก</label><select id="moduleExportSet"><option value="prototype">ต้นแบบ 3 ชิ้น</option><option value="quantity">ชุดตามจำนวนฐาน</option></select></div>
          <p id="moduleSummary" class="hint" aria-live="polite"></p>
          <details class="tips"><summary>ขนาดและวิธีประกอบ</summary><p>ฐาน 24 × 24 × 12.5 mm · ช่อง MX 14.1 mm · พื้นและแผ่นจับสวิตช์ 1.5 mm · รูห่วง 3.4 mm · เผื่อร่อง 0.20 mm ต่อผิว</p><p>ยกลิ้นให้สูงกว่าราง แล้วเลื่อนลงจนสุดบ่า ถอดโดยเลื่อนย้อนขึ้น</p><p>รางไม่มีตัวล็อกกันย้อนขึ้น ต้องลองพิมพ์เช็กความฝืดและแรงยึดก่อนใช้ห้อยของ</p><p>ไฟล์ส่งออกวางพื้นลงเตียงเสมอ เลือกเครื่องและวัสดุใน slicer ก่อนพิมพ์</p></details>
        </section>
        <section id="classicControls">
        <p class="desc">คลิกเกอร์ชื่อ · MX socket · รูป/SVG · 3MF · mm</p>
        <div class="field"><label for="importMode">โหมด</label>
          <select id="importMode"><option value="text">ข้อความ</option><option value="image">รูปภาพ</option><option value="svg">SVG</option><option value="icon">ไอคอน</option></select></div>
        <div class="field" id="nameField"><label for="name">ชื่อ</label><input id="name" maxlength="24"/></div>
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
        <div class="field hidden" id="cropField"><label for="cropMargin">Crop ขอบ: <span id="cropVal">${Math.round(state.cropMargin * 100)}</span>%</label><input id="cropMargin" type="range" min="0" max="30" step="1" value="${Math.round(state.cropMargin * 100)}"/></div>
        <div class="field hidden" id="knockField"><label><input id="knockOutWhite" type="checkbox" ${state.knockOutWhite ? 'checked' : ''}/> ลบพื้นขาว (knock-out)</label></div>
        <div class="field"><label><input id="keychain" type="checkbox" ${state.keychain ? 'checked' : ''}/> พวงกุญแจ</label></div>
        <div class="field"><label for="keychainStyle">แบบห่วง</label><select id="keychainStyle"><option value="loop">Loop</option><option value="hole">Hole</option></select></div>
        <div class="field"><label><input id="exploded" type="checkbox"/> Exploded</label></div>
        <div class="hint">ฝา nest ใน bezel · ลายเป็น mesh พิมพ์ได้</div>
        ${IMAGE_WIZARD_HINT}
        </section>
        <div class="actions">
          <button class="btn primary" id="export3mf">3MF + Cover</button>
          <button class="btn" id="exportStl">STL + Cover</button>
          <button class="btn" id="saveProj">บันทึก JSON</button>
          <label class="btn" style="display:inline-block;cursor:pointer">โหลด JSON<input id="loadProj" type="file" accept="application/json,.json" hidden/></label>
        </div>
        ${PRINT_TIPS_CLICKER}
        <div class="status" id="status">โหลด…</div>
      </aside>
      <div class="stage-wrap"><div id="stage" style="width:100%;height:100%"></div><div class="stage-label">1 unit = 1 mm</div></div>
    </div>`,
});

const viewer = createStudioViewer(document.querySelector('#stage')!);
const statusEl = document.querySelector<HTMLElement>('#status')!;
const q = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;
const checklist = mountPrintChecklist(() => ({
  studio: 'clicker',
  clickerKind: state.productMode,
  colorMode: state.colorMode,
  keychain: state.keychain,
  partCount: lastParts.length,
}));

let revision = 0;
let readyRevision = -1;
function lockExport() {
  q<HTMLButtonElement>('export3mf').disabled = true;
  q<HTMLButtonElement>('exportStl').disabled = true;
}
async function rebuild() {
  const currentRevision = revision;
  const snapshot: State = {...state, modular: {...state.modular}};
  lockExport();
  setStatus(statusEl, 'กำลังสร้าง…', 'warn');
  try {
    const { group, parts, warnings } = await build(snapshot);
    if (currentRevision !== revision) { disposeObject3D(group); return; }
    lastParts = parts;
    viewer.setRoot(group);
    viewer.setExploded(snapshot.productMode === 'classic' && snapshot.exploded ? 12 : 0);
    viewer.fitToObject(2.0);
    writeHashParams({ name: state.name, size: state.size, mode: state.importMode, product: state.productMode });
    q<HTMLSelectElement>('fontId').value = state.fontId;
    checklist?.refresh({
      studio: 'clicker',
      clickerKind: state.productMode,
      colorMode: state.colorMode,
      keychain: state.keychain,
      partCount: parts.length,
    });
    setStatus(statusEl, warnings.length ? warnings.join(' · ') : `พร้อม · ${parts.length} ส่วน`, warnings.length ? 'warn' : 'ok');
    readyRevision = currentRevision;
    q<HTMLButtonElement>('export3mf').disabled = false;
    q<HTMLButtonElement>('exportStl').disabled = false;
    try { saveProject('clicker', state); } catch { /* Private browsing can disable storage. */ }
  } catch (e) {
    if (currentRevision !== revision) return;
    lastParts = [];
    setStatus(statusEl, e instanceof Error ? e.message : String(e), 'err');
  }
}
const scheduleBuild = debounce(() => void rebuild(), 220);
const rebuildDebounced = () => { revision++; readyRevision=-1; lockExport(); scheduleBuild(); };

function syncMode() {
  const modular = state.productMode === 'modular';
  q('modularControls').classList.toggle('hidden', !modular);
  q('classicControls').classList.toggle('hidden', modular);
  q<HTMLSelectElement>('productMode').value = state.productMode;
  q<HTMLButtonElement>('exportStl').textContent = modular ? 'STL แยกชิ้น + Cover (ZIP)' : 'STL + Cover';
  const n=state.modular.count;
  q('moduleCountVal').textContent=String(n);
  q('moduleSummary').textContent=`พรีวิว ${n+2} ชิ้น · ส่งออก ${state.modular.exportSet==='prototype' ? 3 : n+2} ชิ้น · ฐานแต่ละชิ้น 24 × 24 × 12.5 mm`;
  const texty = state.importMode === 'text';
  const filey = state.importMode === 'image' || state.importMode === 'svg';
  q('nameField').classList.toggle('hidden', !texty);
  q('fontField').classList.toggle('hidden', !texty);
  q('fileField').classList.toggle('hidden', !filey);
  q('cropField').classList.toggle('hidden', !filey);
  q('knockField').classList.toggle('hidden', !filey);
  const wiz = document.querySelector('#imageWizard');
  wiz?.classList.toggle('hidden', !filey);
}

q<HTMLSelectElement>('productMode').onchange=e=>{
  state.productMode=(e.target as HTMLSelectElement).value==='modular'?'modular':'classic';
  syncMode(); rebuildDebounced();
};
q<HTMLInputElement>('moduleCount').value=String(state.modular.count);
q<HTMLInputElement>('moduleCount').oninput=e=>{
  state.modular.count=Number((e.target as HTMLInputElement).value); syncMode(); rebuildDebounced();
};
for(const [id,key] of [['moduleBaseColor','baseColor'],['moduleHeadColor','headColor'],['moduleTailColor','tailColor']] as const) {
  q<HTMLInputElement>(id).value=state.modular[key];
  q<HTMLInputElement>(id).oninput=e=>{state.modular[key]=(e.target as HTMLInputElement).value;rebuildDebounced();};
}
q<HTMLSelectElement>('moduleView').value=state.modular.view;
q<HTMLSelectElement>('moduleView').onchange=e=>{state.modular.view=(e.target as HTMLSelectElement).value as ModularSettings['view'];rebuildDebounced();};
q<HTMLSelectElement>('moduleExportSet').value=state.modular.exportSet;
q<HTMLSelectElement>('moduleExportSet').onchange=e=>{state.modular.exportSet=(e.target as HTMLSelectElement).value as ModularSettings['exportSet'];syncMode();rebuildDebounced();};

function renderPaletteSwatches() {
  const host = document.querySelector('#paletteSwatches');
  const img = document.querySelector<HTMLImageElement>('#wizardPreview');
  if (!host) return;
  host.innerHTML = palettePreview
    .map((hex) => `<button type="button" class="swatch" style="background:${hex}" title="${hex}"></button>`)
    .join('');
  if (img) {
    if (wizardPreviewUrl) {
      img.src = wizardPreviewUrl;
      img.classList.remove('hidden');
    } else {
      img.classList.add('hidden');
    }
  }
}

async function runImageWizard(file: File) {
  lastImageFile = file;
  const result = await processImageWizard(file, state.letterSize * 1.8, {
    maxColors: state.maxColors,
    cropMargin: state.cropMargin,
    knockOutWhite: state.knockOutWhite,
    maxSide: 180,
  });
  imageRegions = result.regions;
  palettePreview = result.palette.map((rgb) => rgbToHex(rgb));
  wizardPreviewUrl = result.previewUrl;
  renderPaletteSwatches();
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
    lastImageFile = null;
    palettePreview = imageRegions.map((r) => rgbToHex(r.rgb));
    wizardPreviewUrl = null;
    renderPaletteSwatches();
  } else {
    state.importMode = 'image';
    await runImageWizard(file);
  }
  q<HTMLSelectElement>('importMode').value = state.importMode;
  syncMode();
  rebuildDebounced();
};
q<HTMLInputElement>('cropMargin').oninput = (e) => {
  state.cropMargin = Number((e.target as HTMLInputElement).value) / 100;
  document.querySelector('#cropVal')!.textContent = String(Math.round(state.cropMargin * 100));
  if (lastImageFile) void runImageWizard(lastImageFile).then(() => rebuildDebounced());
};
q<HTMLInputElement>('knockOutWhite').onchange = (e) => {
  state.knockOutWhite = (e.target as HTMLInputElement).checked;
  if (lastImageFile) void runImageWizard(lastImageFile).then(() => rebuildDebounced());
};
q<HTMLInputElement>('maxColors').oninput = (e) => {
  state.maxColors = Number((e.target as HTMLInputElement).value);
  document.querySelector('#maxColorsVal')!.textContent = String(state.maxColors);
  if (lastImageFile) void runImageWizard(lastImageFile).then(() => rebuildDebounced());
  else rebuildDebounced();
};
q<HTMLButtonElement>('export3mf').onclick = () => {
  if (readyRevision !== revision || !lastParts.length) return;
  try {
    const base = state.productMode === 'modular' ? `modular-${state.modular.exportSet}-${lastParts.length}-parts` : `clicker-${state.name}`;
    exportParts(lastParts, base, '3mf');
    captureCoverPng(viewer, base);
  } catch(e) { setStatus(statusEl,e instanceof Error?e.message:String(e),'err'); }
};
q<HTMLButtonElement>('exportStl').onclick = () => {
  if (readyRevision !== revision || !lastParts.length) return;
  if (state.productMode === 'modular') {
    try {
      const bytes=buildStlZip(lastParts.map(groundPart),createCoverPng(viewer),MODULAR_GUIDE);
      downloadBlob(new Blob([new Uint8Array(bytes)],{type:'application/zip'}),`modular-${state.modular.exportSet}-${lastParts.length}-parts.zip`);
    } catch(e) { setStatus(statusEl,e instanceof Error?e.message:String(e),'err'); }
    return;
  }
  const base = `clicker-${state.name}`;
  exportParts(lastParts, base, 'stl');
  captureCoverPng(viewer, base);
};
q<HTMLButtonElement>('saveProj').onclick = () => {
  downloadProjectFile('clicker', state);
  setStatus(statusEl, 'บันทึก JSON แล้ว', 'ok');
};
q<HTMLInputElement>('loadProj').onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const proj = await readProjectFile(file);
    if (proj.studio !== 'clicker') throw new Error(`ไฟล์นี้เป็น studio "${proj.studio}"`);
    if (typeof proj.data !== 'object' || !proj.data || Array.isArray(proj.data)) throw new Error('ข้อมูลโปรเจกต์ไม่ถูกต้อง');
    Object.assign(state, proj.data as Partial<State>);
    const imported=proj.data as Partial<State>;
    state.productMode=imported.productMode==='modular'?'modular':'classic';
    state.modular=normalizeModular(imported.modular);
    saveProject('clicker', state);
    location.reload();
  } catch (err) {
    setStatus(statusEl, err instanceof Error ? err.message : String(err), 'err');
  }
};
q<HTMLInputElement>('name').value=state.name;
q<HTMLSelectElement>('importMode').value=state.importMode;
q<HTMLSelectElement>('keychainStyle').value=state.keychainStyle;
q<HTMLInputElement>('exploded').checked=state.exploded;
syncMode();
lockExport();
void rebuild();
void warmFonts().catch(()=>{});
