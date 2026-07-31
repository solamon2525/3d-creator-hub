import * as THREE from 'three';
import { contours } from 'd3-contour';
import {
  createStudioViewer,
  debounce,
  meshArraysToThree,
  mountShell,
  readHashParams,
  saveProject,
  loadProject,
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
import { MX, mxCrossRects } from '../shared/geometry/mxStem';
import { exportParts, type ExportPart } from '../shared/export/parts';
import { hexToRgb, filamentOptionsHtml } from '../shared/units';
import { svgTextToRegions } from '../shared/geometry/imageToRegions';
import { PRINT_TIPS_KEYCAP } from '../shared/ui/presets';

type Shape = 'rounded' | 'square' | 'circle';
type LegendMode = 'text' | 'icon' | 'svg';
type UnitSize = 1 | 1.25 | 1.5 | 2;

type State = {
  label: string;
  shape: Shape;
  bodyColor: string;
  legendColor: string;
  unit: UnitSize;
  size: number;
  height: number;
  letterSize: number;
  letterDepth: number;
  fontId: string;
  stemTolerance: number;
  legendMode: LegendMode;
  iconName: string;
  exploded: boolean;
  shineThrough: boolean;
};

const UNIT_WIDTH: Record<UnitSize, number> = {
  1: MX.unit1Outer,
  1.25: MX.unit1Outer * 1.25,
  1.5: MX.unit1Outer * 1.5,
  2: MX.unit1Outer * 2,
};

const state: State = {
  label: 'ก',
  shape: 'rounded',
  bodyColor: '#f7f7f5',
  legendColor: '#0f172a',
  unit: 1,
  size: MX.unit1Outer,
  height: 8,
  letterSize: 8,
  letterDepth: 1.2,
  fontId: 'sarabun',
  stemTolerance: MX.defaultStemTolerance,
  legendMode: 'text',
  iconName: 'star',
  exploded: false,
  shineThrough: false,
};

Object.assign(state, loadProject<Partial<State>>('keycap') ?? {});
{
  const h = readHashParams();
  if (h.label) state.label = h.label;
  if (h.fontId) state.fontId = h.fontId;
  if (h.size) state.size = Number(h.size);
}

let svgRings: Ring[] | null = null;
let lastParts: ExportPart[] = [];

function roundedRectOutline(width: number, depth: number): Ring {
  const hx = width / 2;
  const hy = depth / 2;
  const r = Math.min(width, depth) * 0.12;
  const steps = 8;
  const ring: Ring = [];
  const arcs: Array<[number, number, number, number]> = [
    [hx - r, -hy + r, -Math.PI / 2, 0],
    [hx - r, hy - r, 0, Math.PI / 2],
    [-hx + r, hy - r, Math.PI / 2, Math.PI],
    [-hx + r, -hy + r, Math.PI, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0, a1] of arcs) {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * (i / steps);
      ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return ring;
}

function shapeOutline(shape: Shape, width: number, depth: number): Ring {
  if (shape === 'circle') {
    const ring: Ring = [];
    const rx = width / 2;
    const ry = depth / 2;
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      ring.push([rx * Math.cos(a), ry * Math.sin(a)]);
    }
    return ring;
  }
  if (shape === 'square') {
    const hx = width / 2;
    const hy = depth / 2;
    return [
      [-hx, -hy],
      [hx, -hy],
      [hx, hy],
      [-hx, hy],
    ];
  }
  return roundedRectOutline(width, depth);
}

function iconToRings(name: string, sizeMm: number): Ring[] {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#000';
  ctx.font = 'bold 96px Segoe UI Symbol, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyphs: Record<string, string> = {
    star: '★',
    heart: '♥',
    sun: '☀',
    moon: '☾',
    home: '⌂',
    music: '♪',
    zap: '⚡',
  };
  ctx.fillText(glyphs[name] ?? '★', 64, 70);
  const data = ctx.getImageData(0, 0, 128, 128);
  const values = new Float64Array(128 * 128);
  for (let i = 0; i < values.length; i++) values[i] = data.data[i * 4 + 3]! > 40 ? 1 : 0;
  const polys = contours().size([128, 128]).thresholds([0.5])(values as unknown as number[]);
  const scale = sizeMm / 128;
  const rings: Ring[] = [];
  for (const multi of polys) {
    for (const poly of multi.coordinates) {
      for (const ring of poly) {
        if (ring.length < 3) continue;
        rings.push(ring.map(([x, y]) => [(x - 64) * scale, -(y - 64) * scale]));
      }
    }
  }
  if (!rings.length) throw new Error('ไอคอนว่าง');
  return rings;
}

async function legendRings(): Promise<Ring[]> {
  if (state.legendMode === 'svg' && svgRings?.length) return svgRings;
  if (state.legendMode === 'icon') return iconToRings(state.iconName, state.letterSize);
  const font = await loadFont(state.fontId);
  return textToContours(font, state.label || 'A', state.letterSize).rings;
}

async function build(): Promise<{ group: THREE.Group; parts: ExportPart[]; warnings: string[] }> {
  const warns: string[] = [];
  const width = UNIT_WIDTH[state.unit];
  const depth = MX.unit1Outer;
  state.size = width;
  const h = state.height;

  const outer = await extrudeRings([shapeOutline(state.shape, width, depth)], h, false);
  const cavityHalfX = Math.max(5.5, width / 2 - 1.4);
  const cavityHalfY = Math.max(5.5, depth / 2 - 1.4);
  const cavityDepth = Math.min(h - 1.4, MX.socketDepth);
  const cavity = await extrudeRings(
    [
      [
        [-cavityHalfX, -cavityHalfY],
        [cavityHalfX, -cavityHalfY],
        [cavityHalfX, cavityHalfY],
        [-cavityHalfX, cavityHalfY],
      ],
    ],
    cavityDepth + 0.2,
    false,
  );
  let body = await difference(outer, cavity);

  // Stem under center; multi-unit still one MX stem (simple mode)
  const cross = mxCrossRects(state.stemTolerance);
  const stem = await mxCrossSolid(cross.length, cross.thickness, MX.stemHeight);
  const stemPlaced = stem.translate([0, 0, h - 0.35 - MX.stemHeight / 2]);
  body = await union(body, stemPlaced);
  if (state.unit > 1) warns.push(`${state.unit}u · stem เดียวตรงกลาง (ยังไม่ multi-stem)`);

  const bodyMesh = manifoldToMesh(body);
  disposeManifold(outer, cavity, stem, stemPlaced, body);

  let legendMesh: ReturnType<typeof manifoldToMesh> | null = null;
  try {
    const rings = await legendRings();
    const depthLeg = state.shineThrough ? Math.max(state.letterDepth, h * 0.9) : state.letterDepth;
    const legend = await extrudeRings(rings, depthLeg, false);
    const legendPlaced = legend.translate([0, 0, state.shineThrough ? h - depthLeg : h]);
    legendMesh = manifoldToMesh(legendPlaced);
    disposeManifold(legend, legendPlaced);
    if (state.letterSize > Math.min(width, depth) * 0.9) warns.push('ตัวอักษรใหญ่เกินพื้นคีย์');
  } catch (e) {
    warns.push(e instanceof Error ? e.message : String(e));
  }

  const parts: ExportPart[] = [{ name: 'body', mesh: bodyMesh, colorRgb: hexToRgb(state.bodyColor) }];
  if (legendMesh) parts.push({ name: 'legend', mesh: legendMesh, colorRgb: hexToRgb(state.legendColor) });

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
  title: 'Keycap Studio',
  active: 'keycap',
  bodyHtml: `
    <div class="studio">
      <aside class="panel">
        <h1>Keycap Studio</h1>
        <p class="desc">1u · MX stem · ฟอนต์ไทย · 3MF หลายสี · หน่วย mm</p>
        <div class="field"><label for="legendMode">โหมด legend</label>
          <select id="legendMode"><option value="text">ตัวอักษร</option><option value="icon">ไอคอน</option><option value="svg">SVG</option></select></div>
        <div class="field" id="textFields"><label for="label">ข้อความ</label><input id="label" maxlength="8" value="${state.label}"/></div>
        <div class="field" id="fontField"><label for="fontId">ฟอนต์</label><select id="fontId">${fontSelectHtml(state.fontId)}</select></div>
        <div class="field hidden" id="iconField"><label for="iconName">ไอคอน</label>
          <select id="iconName"><option>star</option><option>heart</option><option>sun</option><option>moon</option><option>home</option><option>music</option><option>zap</option></select></div>
        <div class="field hidden" id="svgField"><label for="svgFile">SVG</label><input id="svgFile" type="file" accept=".svg,image/svg+xml"/></div>
        <div class="field"><label for="shape">รูปทรง</label>
          <select id="shape"><option value="rounded">Rounded</option><option value="square">Square</option><option value="circle">Circle</option></select></div>
        <div class="field"><label for="unit">ขนาดคีย์</label>
          <select id="unit">
            <option value="1">1u (~18mm)</option>
            <option value="1.25">1.25u</option>
            <option value="1.5">1.5u</option>
            <option value="2">2u</option>
          </select></div>
        <div class="row">
          <div class="field"><label for="bodyColor">สีคีย์</label><input id="bodyColor" type="color" value="${state.bodyColor}"/></div>
          <div class="field"><label for="legendColor">สีตัวอักษร</label><input id="legendColor" type="color" value="${state.legendColor}"/></div>
        </div>
        <div class="field"><label for="bodyPreset">พรีเซ็ตเส้นคีย์</label><select id="bodyPreset">${filamentOptionsHtml(state.bodyColor)}</select></div>
        <div class="field"><label for="legendPreset">พรีเซ็ตเส้นตัวอักษร</label><select id="legendPreset">${filamentOptionsHtml(state.legendColor)}</select></div>
        <div class="field"><label for="height">ความสูง (mm): <span id="heightVal">${state.height}</span></label><input id="height" type="range" min="5" max="12" step="0.5" value="${state.height}"/></div>
        <div class="field"><label for="letterSize">ขนาดตัวอักษร (mm): <span id="letterSizeVal">${state.letterSize}</span></label><input id="letterSize" type="range" min="3" max="16" step="0.5" value="${state.letterSize}"/></div>
        <div class="field"><label for="letterDepth">ความนูน (mm): <span id="letterDepthVal">${state.letterDepth}</span></label><input id="letterDepth" type="range" min="0.4" max="3" step="0.1" value="${state.letterDepth}"/></div>
        <div class="field"><label for="stemTolerance">Stem tol (mm): <span id="stemTolVal">${state.stemTolerance}</span></label><input id="stemTolerance" type="range" min="-0.05" max="0.2" step="0.01" value="${state.stemTolerance}"/></div>
        <div class="field"><label><input id="shineThrough" type="checkbox"/> Shine-through</label></div>
        <div class="field"><label><input id="exploded" type="checkbox"/> Exploded</label></div>
        <div class="actions">
          <button class="btn primary" id="export3mf">3MF</button>
          <button class="btn" id="exportStl">STL</button>
          <button class="btn" id="saveProj">บันทึก</button>
        </div>
        <div class="hint">พิมพ์คว่ำหน้า · 1 unit = 1 mm · MX stem · OFL fonts</div>
        ${PRINT_TIPS_KEYCAP}
        <div class="status" id="status">โหลด…</div>
      </aside>
      <div class="stage-wrap"><div id="stage" style="width:100%;height:100%"></div><div class="stage-label">1 unit = 1 mm</div></div>
    </div>`,
});

const viewer = createStudioViewer(document.querySelector('#stage')!);
const statusEl = document.querySelector<HTMLElement>('#status')!;

async function rebuild() {
  setStatus(statusEl, 'กำลังสร้าง…', 'warn');
  try {
    const { group, parts, warnings } = await build();
    lastParts = parts;
    viewer.setRoot(group);
    viewer.setExploded(state.exploded ? 8 : 0);
    viewer.fitToObject(2.2);
    writeHashParams({ label: state.label, size: state.size, fontId: state.fontId });
    setStatus(statusEl, warnings.length ? warnings.join(' · ') : `พร้อม · ${parts.length} ส่วน`, warnings.length ? 'warn' : 'ok');
  } catch (e) {
    setStatus(statusEl, e instanceof Error ? e.message : String(e), 'err');
  }
}
const rebuildDebounced = debounce(() => void rebuild(), 200);

function syncMode() {
  document.querySelector('#textFields')!.classList.toggle('hidden', state.legendMode !== 'text');
  document.querySelector('#fontField')!.classList.toggle('hidden', state.legendMode !== 'text');
  document.querySelector('#iconField')!.classList.toggle('hidden', state.legendMode !== 'icon');
  document.querySelector('#svgField')!.classList.toggle('hidden', state.legendMode !== 'svg');
}

const q = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;
q<HTMLSelectElement>('legendMode').onchange = (e) => {
  state.legendMode = (e.target as HTMLSelectElement).value as LegendMode;
  syncMode();
  rebuildDebounced();
};
q<HTMLInputElement>('label').oninput = (e) => {
  state.label = (e.target as HTMLInputElement).value || 'A';
  rebuildDebounced();
};
q<HTMLSelectElement>('fontId').onchange = (e) => {
  state.fontId = (e.target as HTMLSelectElement).value;
  rebuildDebounced();
};
q<HTMLSelectElement>('iconName').onchange = (e) => {
  state.iconName = (e.target as HTMLSelectElement).value;
  rebuildDebounced();
};
q<HTMLSelectElement>('shape').value = state.shape;
q<HTMLSelectElement>('shape').onchange = (e) => {
  state.shape = (e.target as HTMLSelectElement).value as Shape;
  rebuildDebounced();
};
q<HTMLSelectElement>('unit').value = String(state.unit);
q<HTMLSelectElement>('unit').onchange = (e) => {
  state.unit = Number((e.target as HTMLSelectElement).value) as UnitSize;
  state.size = UNIT_WIDTH[state.unit];
  rebuildDebounced();
};
q<HTMLInputElement>('bodyColor').oninput = (e) => {
  state.bodyColor = (e.target as HTMLInputElement).value;
  q<HTMLSelectElement>('bodyPreset').value = state.bodyColor;
  rebuildDebounced();
};
q<HTMLInputElement>('legendColor').oninput = (e) => {
  state.legendColor = (e.target as HTMLInputElement).value;
  q<HTMLSelectElement>('legendPreset').value = state.legendColor;
  rebuildDebounced();
};
q<HTMLSelectElement>('bodyPreset').onchange = (e) => {
  state.bodyColor = (e.target as HTMLSelectElement).value;
  q<HTMLInputElement>('bodyColor').value = state.bodyColor;
  rebuildDebounced();
};
q<HTMLSelectElement>('legendPreset').onchange = (e) => {
  state.legendColor = (e.target as HTMLSelectElement).value;
  q<HTMLInputElement>('legendColor').value = state.legendColor;
  rebuildDebounced();
};
for (const [id, key, val] of [
  ['height', 'height', 'heightVal'],
  ['letterSize', 'letterSize', 'letterSizeVal'],
  ['letterDepth', 'letterDepth', 'letterDepthVal'],
  ['stemTolerance', 'stemTolerance', 'stemTolVal'],
] as const) {
  q<HTMLInputElement>(id).oninput = (e) => {
    const num = Number((e.target as HTMLInputElement).value);
    (state as unknown as Record<string, number>)[key] = num;
    document.querySelector(`#${val}`)!.textContent = String(num);
    rebuildDebounced();
  };
}
q<HTMLInputElement>('shineThrough').onchange = (e) => {
  state.shineThrough = (e.target as HTMLInputElement).checked;
  rebuildDebounced();
};
q<HTMLInputElement>('exploded').onchange = (e) => {
  state.exploded = (e.target as HTMLInputElement).checked;
  viewer.setExploded(state.exploded ? 8 : 0);
};
q<HTMLInputElement>('svgFile').onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const regions = await svgTextToRegions(await file.text(), state.letterSize, 2);
  svgRings = regions.flatMap((r) => r.rings);
  state.legendMode = 'svg';
  q<HTMLSelectElement>('legendMode').value = 'svg';
  syncMode();
  rebuildDebounced();
};
q<HTMLButtonElement>('export3mf').onclick = () => exportParts(lastParts, `keycap-${state.label || 'A'}`, '3mf');
q<HTMLButtonElement>('exportStl').onclick = () => exportParts(lastParts, `keycap-${state.label || 'A'}`, 'stl');
q<HTMLButtonElement>('saveProj').onclick = () => {
  saveProject('keycap', state);
  setStatus(statusEl, 'บันทึกแล้ว', 'ok');
};
syncMode();
void warmFonts().then(() => rebuild());
