import * as THREE from 'three';
import {
  captureCoverPng,
  createStudioViewer,
  debounce,
  downloadProjectFile,
  exportGlb,
  loadProject,
  meshArraysToThree,
  mountShell,
  readProjectFile,
  saveProject,
  setStatus,
} from '../shared/studio';
import {
  disposeManifold,
  extrudeRings,
  manifoldToMesh,
  union,
} from '../shared/geometry/manifoldOps';
import { exportParts, type ExportPart } from '../shared/export/parts';
import { hexToRgb, rgbToHex } from '../shared/units';
import {
  processImageWizard,
  svgTextToRegions,
  type ColorRegion,
} from '../shared/geometry/imageToRegions';
import type { Ring } from '../shared/geometry/textToContours';
import { PRINT_TIPS_MASCOT } from '../shared/ui/presets';
import { assembleMascotFromGlb, MASCOT_PARTS } from '../shared/mascot/parts';

type Tab = 'relief' | 'avatar';
type Hair = 'short' | 'spiky' | 'bob' | 'none';
type Eyes = 'round' | 'happy' | 'dot';
type Acc = 'none' | 'badge';

export const MASCOT_LIBRARY: Record<
  string,
  {
    name: string;
    skin: string;
    hairColor: string;
    shirt: string;
    pants: string;
    hair: Hair;
    eyes: Eyes;
    acc: Acc;
  }
> = {
  kampai: {
    name: 'คำไผ่',
    skin: '#ffd7b5',
    hairColor: '#1e293b',
    shirt: '#f59e0b',
    pants: '#0f172a',
    hair: 'short',
    eyes: 'round',
    acc: 'badge',
  },
  sky: {
    name: 'Sky',
    skin: '#ffe4c9',
    hairColor: '#0ea5e9',
    shirt: '#38bdf8',
    pants: '#1e3a5f',
    hair: 'spiky',
    eyes: 'happy',
    acc: 'none',
  },
  berry: {
    name: 'Berry',
    skin: '#ffd7b5',
    hairColor: '#9d174d',
    shirt: '#fb7185',
    pants: '#4c0519',
    hair: 'bob',
    eyes: 'dot',
    acc: 'badge',
  },
};

type State = {
  tab: Tab;
  name: string;
  size: number;
  reliefDepth: number;
  maxColors: number;
  baseColor: string;
  keychain: boolean;
  skin: string;
  hairColor: string;
  shirt: string;
  pants: string;
  hair: Hair;
  eyes: Eyes;
  acc: Acc;
  blush: boolean;
  useGlb: boolean;
  cropMargin: number;
  knockOutWhite: boolean;
};

const state: State = {
  tab: 'relief',
  name: 'Chibi',
  size: 40,
  reliefDepth: 1.4,
  maxColors: 5,
  baseColor: '#f7f7f5',
  keychain: true,
  skin: '#ffd7b5',
  hairColor: '#1e293b',
  shirt: '#38bdf8',
  pants: '#0f172a',
  hair: 'short',
  eyes: 'round',
  acc: 'badge',
  blush: true,
  useGlb: true,
  cropMargin: 0.05,
  knockOutWhite: true,
};
Object.assign(state, loadProject<Partial<State>>('mascot') ?? {});

let regions: ColorRegion[] | null = null;
let lastParts: ExportPart[] = [];
let avatarRoot: THREE.Group | null = null;
let lastImageFile: File | null = null;

function renderPalette(palette: [number, number, number][], previewUrl: string | null) {
  const host = document.querySelector('#paletteSwatches');
  const img = document.querySelector<HTMLImageElement>('#wizardPreview');
  if (host) {
    host.innerHTML = palette
      .map((rgb) => {
        const hex = rgbToHex(rgb);
        return `<button type="button" class="swatch" style="background:${hex}" title="${hex}"></button>`;
      })
      .join('');
  }
  if (img) {
    if (previewUrl) {
      img.src = previewUrl;
      img.classList.remove('hidden');
    } else img.classList.add('hidden');
  }
}

async function runReliefWizard(file: File) {
  lastImageFile = file;
  const result = await processImageWizard(file, state.size * 0.85, {
    maxColors: state.maxColors,
    cropMargin: state.cropMargin,
    knockOutWhite: state.knockOutWhite,
    maxSide: 200,
  });
  regions = result.regions;
  renderPalette(result.palette, result.previewUrl);
}

function baseOutline(size: number): Ring {
  const r = size / 2;
  return Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
  });
}

function mat(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...opts });
}

/** Primitive fallback if GLB pack missing. */
function buildAvatarPrimitive(): THREE.Group {
  const g = new THREE.Group();
  const legMat = mat(state.pants);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 7, 16), legMat);
  legL.position.set(-2.2, 3.5, 0);
  const legR = legL.clone();
  legR.position.x = 2.2;
  g.add(legL, legR);
  const shoe = mat('#111827');
  for (const x of [-2.2, 2.2]) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), shoe);
    f.scale.set(1, 0.55, 1.35);
    f.position.set(x, 0.8, 0.8);
    g.add(f);
  }
  const body = new THREE.Mesh(new THREE.SphereGeometry(5.5, 28, 20), mat(state.shirt));
  body.scale.set(1, 1.15, 0.9);
  body.position.y = 10.5;
  g.add(body);
  const armMat = mat(state.skin);
  for (const [x, rot] of [
    [-7, 0.35],
    [7, -0.35],
  ] as const) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 4.5, 6, 10), armMat);
    arm.position.set(x, 10.5, 0);
    arm.rotation.z = rot;
    g.add(arm);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(4.8, 32, 24), mat(state.skin));
  head.position.y = 19.5;
  g.add(head);
  for (const x of [-4.5, 4.5]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 10), mat(state.skin));
    ear.position.set(x, 19.5, 0);
    g.add(ear);
  }
  const hairMat = mat(state.hairColor);
  if (state.hair === 'short') {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hairMat,
    );
    hair.position.set(0, 20.5, 0);
    g.add(hair);
  } else if (state.hair === 'bob') {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(5.5, 24, 16), hairMat);
    hair.scale.set(1.05, 0.9, 1.05);
    hair.position.set(0, 19.5, -0.2);
    g.add(hair);
  } else if (state.hair === 'spiky') {
    for (const [x, z] of [
      [0, 1.5],
      [-2.2, 0.5],
      [2.2, 0.5],
    ] as const) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4.5, 8), hairMat);
      spike.position.set(x, 23.5, z);
      g.add(spike);
    }
  }
  const eyeMat = mat('#0f172a');
  for (const x of [-1.6, 1.6]) {
    if (state.eyes === 'happy') {
      const e = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.25, 8, 16, Math.PI), eyeMat);
      e.position.set(x, 19.8, 4.2);
      e.rotation.x = Math.PI;
      g.add(e);
    } else {
      const e = new THREE.Mesh(
        new THREE.SphereGeometry(state.eyes === 'dot' ? 0.7 : 0.9, 14, 12),
        eyeMat,
      );
      e.position.set(x, 19.8, 4.2);
      g.add(e);
    }
  }
  if (state.blush) {
    const blushMat = mat('#fb7185', { transparent: true, opacity: 0.55 });
    for (const x of [-2.8, 2.8]) {
      const b = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12), blushMat);
      b.position.set(x, 18.6, 4.3);
      g.add(b);
    }
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.18, 8, 16, Math.PI), mat('#be123c'));
  mouth.position.set(0, 17.8, 4.4);
  mouth.rotation.x = Math.PI;
  g.add(mouth);
  return g;
}

async function buildAvatar(): Promise<{ group: THREE.Group; note: string }> {
  if (state.useGlb) {
    const { group, usedGlb, missing } = await assembleMascotFromGlb({
      hair: state.hair,
      face: state.eyes,
      acc: state.acc,
      skin: state.skin,
      hairColor: state.hairColor,
      shirt: state.shirt,
      pants: state.pants,
      blush: state.blush,
      name: state.name,
    });
    if (usedGlb || group.children.length > 2) {
      return {
        group,
        note: missing.length
          ? `GLB pack · ขาด ${missing.join(', ')}`
          : 'GLB pack · hair/face/body/acc',
      };
    }
  }
  return { group: buildAvatarPrimitive(), note: 'primitives (fallback)' };
}

async function buildRelief() {
  const warns: string[] = [];
  const s = state.size;
  const baseH = 2.4;
  let base = await extrudeRings([baseOutline(s)], baseH, false);
  if (state.keychain) {
    const lug = await extrudeRings(
      [
        Array.from({ length: 28 }, (_, i) => {
          const a = (i / 28) * Math.PI * 2;
          return [s / 2 + 2.5 + Math.cos(a) * 3.8, Math.sin(a) * 3.8] as [number, number];
        }),
      ],
      baseH * 0.85,
      false,
    );
    const hole = await extrudeRings(
      [
        Array.from({ length: 20 }, (_, i) => {
          const a = (i / 20) * Math.PI * 2;
          return [s / 2 + 2.5 + Math.cos(a) * 2.1, Math.sin(a) * 2.1] as [number, number];
        }),
      ],
      baseH + 1,
      false,
    );
    const { difference } = await import('../shared/geometry/manifoldOps');
    const loop = await difference(lug, hole);
    base = await union(base, loop);
    disposeManifold(lug, hole, loop);
  }
  const parts: ExportPart[] = [
    { name: 'base', mesh: manifoldToMesh(base), colorRgb: hexToRgb(state.baseColor) },
  ];
  disposeManifold(base);

  const regs = regions ?? [];
  if (!regs.length) warns.push('อัปโหลดรูปหรือ SVG เพื่อสร้างนูน');
  let i = 0;
  for (const r of regs) {
    const solid = await extrudeRings(r.rings, state.reliefDepth, false);
    const placed = solid.translate([0, 0, baseH]);
    parts.push({ name: `relief-${i}`, mesh: manifoldToMesh(placed), colorRgb: r.rgb });
    disposeManifold(solid, placed);
    i++;
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

const hairOpts = MASCOT_PARTS.hair
  .map((p) => `<option value="${p.id}">${p.label}</option>`)
  .join('');
const faceOpts = MASCOT_PARTS.face
  .map((p) => `<option value="${p.id}">${p.label}</option>`)
  .join('');
const accOpts = MASCOT_PARTS.acc
  .map((p) => `<option value="${p.id}">${p.label}</option>`)
  .join('');

mountShell({
  title: 'Mascot Studio',
  active: 'mascot',
  bodyHtml: `
    <div class="studio">
      <aside class="panel">
        <h1>Mascot Studio</h1>
        <p class="desc">แท็บ Relief พิมพ์ได้ · แท็บ Avatar โหลด GLB pack</p>
        <div class="tabs">
          <button type="button" id="tabRelief" class="active">Relief พิมพ์</button>
          <button type="button" id="tabAvatar">Avatar</button>
        </div>
        <div id="reliefPanel">
          <div class="field"><label for="file">รูป / SVG การ์ตูน</label><input id="file" type="file" accept="image/*,.svg"/></div>
          <div class="field"><label for="cropMargin">Crop ขอบ: <span id="cropVal">${Math.round(state.cropMargin * 100)}</span>%</label><input id="cropMargin" type="range" min="0" max="30" step="1" value="${Math.round(state.cropMargin * 100)}"/></div>
          <div class="field"><label><input id="knockOutWhite" type="checkbox" ${state.knockOutWhite ? 'checked' : ''}/> ลบพื้นขาว</label></div>
          <div id="paletteSwatches" class="preset-row"></div>
          <img id="wizardPreview" alt="" class="wizard-preview hidden"/>
          <div class="field"><label for="size">ขนาดฐาน (mm): <span id="sizeVal">${state.size}</span></label><input id="size" type="range" min="28" max="60" step="1" value="${state.size}"/></div>
          <div class="field"><label for="reliefDepth">ความนูน (mm): <span id="reliefDepthVal">${state.reliefDepth}</span></label><input id="reliefDepth" type="range" min="0.6" max="3" step="0.1" value="${state.reliefDepth}"/></div>
          <div class="field"><label for="maxColors">จำนวนสี: <span id="maxColorsVal">${state.maxColors}</span></label><input id="maxColors" type="range" min="2" max="8" step="1" value="${state.maxColors}"/></div>
          <div class="field"><label for="baseColor">สีฐาน</label><input id="baseColor" type="color" value="${state.baseColor}"/></div>
          <div class="field"><label><input id="keychain" type="checkbox" ${state.keychain ? 'checked' : ''}/> พวงกุญแจ</label></div>
          <div class="actions">
            <button class="btn primary" id="export3mf">3MF + Cover</button>
            <button class="btn" id="exportStl">STL + Cover</button>
          </div>
        </div>
        <div id="avatarPanel" class="hidden">
          <div class="section-title">Library</div>
          <div class="preset-row" id="libPresets">
            <button type="button" data-lib="kampai">คำไผ่</button>
            <button type="button" data-lib="sky">Sky</button>
            <button type="button" data-lib="berry">Berry</button>
          </div>
          <div class="field"><label for="name">ชื่อ</label><input id="name" maxlength="12" value="${state.name}"/></div>
          <div class="field"><label for="hair">ทรงผม (GLB)</label><select id="hair">${hairOpts}</select></div>
          <div class="field"><label for="eyes">หน้า (GLB)</label><select id="eyes">${faceOpts}</select></div>
          <div class="field"><label for="acc">เครื่องประดับ</label><select id="acc">${accOpts}</select></div>
          <div class="row">
            <div class="field"><label for="skin">ผิว</label><input id="skin" type="color" value="${state.skin}"/></div>
            <div class="field"><label for="hairColor">ผม</label><input id="hairColor" type="color" value="${state.hairColor}"/></div>
          </div>
          <div class="row">
            <div class="field"><label for="shirt">เสื้อ</label><input id="shirt" type="color" value="${state.shirt}"/></div>
            <div class="field"><label for="pants">กางเกง</label><input id="pants" type="color" value="${state.pants}"/></div>
          </div>
          <div class="field"><label><input id="blush" type="checkbox" ${state.blush ? 'checked' : ''}/> Blush</label></div>
          <div class="field"><label><input id="useGlb" type="checkbox" ${state.useGlb ? 'checked' : ''}/> ใช้ GLB pack</label></div>
          <div class="hint">ไฟล์ใน public/mascot/{hair,face,body,acc}/ · regenerate: node scripts/gen-mascot-glb.mjs</div>
          <div class="actions">
            <button class="btn primary" id="exportGlb">GLB + Cover</button>
            <button class="btn" id="exportAvatarStl">STL + Cover</button>
          </div>
        </div>
        <div class="actions" style="margin-top:0.5rem">
          <button class="btn" id="saveProj">บันทึก JSON</button>
          <label class="btn" style="display:inline-block;cursor:pointer">โหลด JSON<input id="loadProj" type="file" accept="application/json,.json" hidden/></label>
        </div>
        ${PRINT_TIPS_MASCOT}
        <div class="status" id="status">โหลด…</div>
      </aside>
      <div class="stage-wrap"><div id="stage" style="width:100%;height:100%"></div><div class="stage-label">Relief = mm · Avatar = GLB/display</div></div>
    </div>`,
});

const viewer = createStudioViewer(document.querySelector('#stage')!);
const statusEl = document.querySelector<HTMLElement>('#status')!;
const q = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;

function setTab(tab: Tab) {
  state.tab = tab;
  q('tabRelief').classList.toggle('active', tab === 'relief');
  q('tabAvatar').classList.toggle('active', tab === 'avatar');
  q('reliefPanel').classList.toggle('hidden', tab !== 'relief');
  q('avatarPanel').classList.toggle('hidden', tab !== 'avatar');
  void rebuild();
}

async function rebuild() {
  setStatus(statusEl, 'กำลังสร้าง…', 'warn');
  try {
    if (state.tab === 'avatar') {
      const { group, note } = await buildAvatar();
      avatarRoot = group;
      lastParts = [];
      viewer.setRoot(avatarRoot);
      viewer.camera.position.set(35, 30, 45);
      viewer.controls.target.set(0, 12, 0);
      viewer.fitToObject(2.4);
      setStatus(statusEl, `Avatar พร้อม · ${note}`, 'ok');
      return;
    }
    const { group, parts, warnings } = await buildRelief();
    lastParts = parts;
    avatarRoot = null;
    viewer.setRoot(group);
    viewer.fitToObject(2.0);
    setStatus(
      statusEl,
      warnings.length ? warnings.join(' · ') : `Relief พร้อม · ${parts.length} ส่วน`,
      warnings.length ? 'warn' : 'ok',
    );
  } catch (e) {
    setStatus(statusEl, e instanceof Error ? e.message : String(e), 'err');
  }
}
const rebuildDebounced = debounce(() => void rebuild(), 200);

q('tabRelief').onclick = () => setTab('relief');
q('tabAvatar').onclick = () => setTab('avatar');
document.querySelectorAll<HTMLButtonElement>('#libPresets button').forEach((btn) => {
  btn.onclick = () => {
    const id = btn.dataset.lib!;
    const lib = MASCOT_LIBRARY[id];
    if (!lib) return;
    Object.assign(state, lib);
    q<HTMLInputElement>('name').value = state.name;
    q<HTMLSelectElement>('hair').value = state.hair;
    q<HTMLSelectElement>('eyes').value = state.eyes;
    q<HTMLSelectElement>('acc').value = state.acc;
    for (const idc of ['skin', 'hairColor', 'shirt', 'pants'] as const) {
      q<HTMLInputElement>(idc).value = state[idc];
    }
    setTab('avatar');
  };
});
q<HTMLInputElement>('file').onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (file.name.toLowerCase().endsWith('.svg') || file.type.includes('svg')) {
    regions = await svgTextToRegions(await file.text(), state.size * 0.85, state.maxColors);
    lastImageFile = null;
    renderPalette(
      regions.map((r) => r.rgb),
      null,
    );
  } else {
    await runReliefWizard(file);
  }
  setTab('relief');
};
q<HTMLInputElement>('cropMargin').oninput = (e) => {
  state.cropMargin = Number((e.target as HTMLInputElement).value) / 100;
  document.querySelector('#cropVal')!.textContent = String(Math.round(state.cropMargin * 100));
  if (lastImageFile) void runReliefWizard(lastImageFile).then(() => rebuildDebounced());
};
q<HTMLInputElement>('knockOutWhite').onchange = (e) => {
  state.knockOutWhite = (e.target as HTMLInputElement).checked;
  if (lastImageFile) void runReliefWizard(lastImageFile).then(() => rebuildDebounced());
};
for (const [id, key, val] of [
  ['size', 'size', 'sizeVal'],
  ['reliefDepth', 'reliefDepth', 'reliefDepthVal'],
  ['maxColors', 'maxColors', 'maxColorsVal'],
] as const) {
  q<HTMLInputElement>(id).oninput = (e) => {
    const num = Number((e.target as HTMLInputElement).value);
    (state as unknown as Record<string, number>)[key] = num;
    document.querySelector(`#${val}`)!.textContent = String(num);
    if (key === 'maxColors' && lastImageFile) {
      void runReliefWizard(lastImageFile).then(() => rebuildDebounced());
    } else if (key === 'size' && lastImageFile) {
      void runReliefWizard(lastImageFile).then(() => rebuildDebounced());
    } else rebuildDebounced();
  };
}
q<HTMLInputElement>('baseColor').oninput = (e) => {
  state.baseColor = (e.target as HTMLInputElement).value;
  rebuildDebounced();
};
q<HTMLInputElement>('keychain').onchange = (e) => {
  state.keychain = (e.target as HTMLInputElement).checked;
  rebuildDebounced();
};
q<HTMLInputElement>('name').oninput = (e) => {
  state.name = (e.target as HTMLInputElement).value || 'Chibi';
  rebuildDebounced();
};
q<HTMLSelectElement>('hair').value = state.hair;
q<HTMLSelectElement>('hair').onchange = (e) => {
  state.hair = (e.target as HTMLSelectElement).value as Hair;
  rebuildDebounced();
};
q<HTMLSelectElement>('eyes').value = state.eyes;
q<HTMLSelectElement>('eyes').onchange = (e) => {
  state.eyes = (e.target as HTMLSelectElement).value as Eyes;
  rebuildDebounced();
};
q<HTMLSelectElement>('acc').value = state.acc;
q<HTMLSelectElement>('acc').onchange = (e) => {
  state.acc = (e.target as HTMLSelectElement).value as Acc;
  rebuildDebounced();
};
for (const id of ['skin', 'hairColor', 'shirt', 'pants'] as const) {
  q<HTMLInputElement>(id).oninput = (e) => {
    state[id] = (e.target as HTMLInputElement).value;
    rebuildDebounced();
  };
}
q<HTMLInputElement>('blush').onchange = (e) => {
  state.blush = (e.target as HTMLInputElement).checked;
  rebuildDebounced();
};
q<HTMLInputElement>('useGlb').onchange = (e) => {
  state.useGlb = (e.target as HTMLInputElement).checked;
  rebuildDebounced();
};

function doExportParts(format: '3mf' | 'stl') {
  const base = `mascot-relief-${state.name}`;
  exportParts(lastParts, base, format);
  captureCoverPng(viewer, base);
}

q<HTMLButtonElement>('export3mf').onclick = () => doExportParts('3mf');
q<HTMLButtonElement>('exportStl').onclick = () => doExportParts('stl');
q<HTMLButtonElement>('exportGlb').onclick = () => {
  if (!avatarRoot) return;
  const base = `mascot-${state.name}`;
  exportGlb(avatarRoot, `${base}.glb`);
  captureCoverPng(viewer, base);
};
q<HTMLButtonElement>('exportAvatarStl').onclick = () => {
  if (!avatarRoot) return;
  import('three/examples/jsm/exporters/STLExporter.js').then(({ STLExporter }) => {
    const exp = new STLExporter();
    const data = exp.parse(avatarRoot!, { binary: true }) as DataView;
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'model/stl' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mascot-${state.name}.stl`;
    a.click();
    captureCoverPng(viewer, `mascot-${state.name}`);
  });
};
q<HTMLButtonElement>('saveProj').onclick = () => {
  downloadProjectFile('mascot', state);
  setStatus(statusEl, 'บันทึก JSON แล้ว', 'ok');
};
q<HTMLInputElement>('loadProj').onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const proj = await readProjectFile(file);
    if (proj.studio !== 'mascot') throw new Error(`ไฟล์นี้เป็น studio "${proj.studio}"`);
    Object.assign(state, proj.data as Partial<State>);
    saveProject('mascot', state);
    location.reload();
  } catch (err) {
    setStatus(statusEl, err instanceof Error ? err.message : String(err), 'err');
  }
};

void rebuild();
