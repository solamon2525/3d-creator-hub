import * as THREE from 'three';
import {
  captureCoverPng,
  createStudioViewer,
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
import { fontSelectHtml, loadFontForText, textToContours, type Ring } from '../shared/geometry/textToContours';
import {
  difference,
  disposeManifold,
  extrudeRings,
  manifoldToMesh,
  union,
} from '../shared/geometry/manifoldOps';
import { exportParts, type ExportPart } from '../shared/export/parts';
import { hexToRgb } from '../shared/units';
import { dilateTextContours } from './contour';
import {
  BADGE_SHAPES,
  ACCENT_ICONS,
  COLOR_THEMES,
  getAccentIconRing,
  createBadgeOutline,
  createKeychainLugRings,
  type BadgeShape,
  type AccentIcon,
  type IconPosition,
  type KeychainPos,
} from './presets';

interface KeychainState {
  text: string;
  fontId: string;
  letterSize: number;
  letterDepth: number;
  badgeShape: BadgeShape;
  padding: number;
  baseThick: number;
  borderMode: 'none' | 'outer';
  accentIcon: AccentIcon;
  iconPosition: IconPosition;
  keychainPos: KeychainPos;
  keychainStyle: 'lug' | 'hole';
  holeDiameter: number;
  baseColor: string;
  borderColor: string;
  textColor: string;
  mirrorMode: boolean;
  explodePercent: number;
}

const state: KeychainState = {
  text: 'น้องขวัญ',
  fontId: 'sarabun',
  letterSize: 14,
  letterDepth: 1.4,
  badgeShape: 'auto',
  padding: 3.5,
  baseThick: 2.8,
  borderMode: 'outer',
  accentIcon: 'heart',
  iconPosition: 'trailing',
  keychainPos: 'left',
  keychainStyle: 'lug',
  holeDiameter: 4.5,
  baseColor: '#0f172a',
  borderColor: '#334155',
  textColor: '#f59e0b',
  mirrorMode: false,
  explodePercent: 0,
};

Object.assign(state, loadProject<Partial<KeychainState>>('keychain') ?? {});

function q<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing in DOM`);
  return el as T;
}

function computeBounds(rings: Ring[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

async function buildKeychain(st: KeychainState) {
  const warns: string[] = [];
  const textStr = st.text.trim() || 'Name';

  // 1. Text Contours
  const { font, fontId, warned } = await loadFontForText(st.fontId, textStr);
  if (warned) warns.push(warned);
  if (fontId !== st.fontId) st.fontId = fontId;

  const textRes = textToContours(font, textStr, st.letterSize);
  const textRings = textRes.rings;
  if (!textRings.length) throw new Error('ไม่สามารถแปลงตัวอักษรเป็นเส้นขอบได้');

  const textBounds = computeBounds(textRings);
  const combinedGlyphs: Ring[] = [...textRings];

  // 2. Accent Icons Attachment
  if (st.accentIcon !== 'none' && st.iconPosition !== 'none') {
    const iconBaseRing = getAccentIconRing(st.accentIcon, st.letterSize * 0.95);
    const iconGap = 3.0;

    if (st.iconPosition === 'trailing' || st.iconPosition === 'both') {
      const offsetX = textBounds.maxX + iconGap + st.letterSize * 0.45;
      const offsetY = (textBounds.minY + textBounds.maxY) / 2;
      const placed: Ring = iconBaseRing.map(([x, y]) => [x + offsetX, y + offsetY]);
      combinedGlyphs.push(placed);
    }

    if (st.iconPosition === 'leading' || st.iconPosition === 'both') {
      const offsetX = textBounds.minX - iconGap - st.letterSize * 0.45;
      const offsetY = (textBounds.minY + textBounds.maxY) / 2;
      const placed: Ring = iconBaseRing.map(([x, y]) => [x + offsetX, y + offsetY]);
      combinedGlyphs.push(placed);
    }
  }

  const glyphBounds = computeBounds(combinedGlyphs);

  // 3. Baseplate Outline Generation
  let baseOutline: Ring = [];
  if (st.badgeShape === 'auto') {
    const dilated = dilateTextContours(combinedGlyphs, {
      padding: st.padding,
      bridgeGaps: true,
    });
    if (!dilated.length) throw new Error('สร้างเส้นขอบตามรูปอักษรล้มเหลว');
    baseOutline = dilated[0]!;
  } else {
    const w = glyphBounds.w + st.padding * 2;
    const h = glyphBounds.h + st.padding * 2;
    const cx = (glyphBounds.minX + glyphBounds.maxX) / 2;
    const cy = (glyphBounds.minY + glyphBounds.maxY) / 2;
    const outlineRaw = createBadgeOutline(st.badgeShape, w, h);
    baseOutline = outlineRaw.map(([x, y]) => [x + cx, y + cy]);
  }

  // 4. Keychain Hardware Attachment
  const baseBounds = computeBounds([baseOutline]);
  const { lugRing, holeRing } = createKeychainLugRings(
    baseBounds,
    st.keychainPos,
    st.holeDiameter,
    st.holeDiameter + 2.8
  );

  let baseSolid = await extrudeRings([baseOutline], st.baseThick, false);

  if (st.keychainStyle === 'lug') {
    const lugSolid = await extrudeRings([lugRing], st.baseThick, false);
    const holeSolid = await extrudeRings([holeRing], st.baseThick + 1.0, false);
    const holePlaced = holeSolid.translate([0, 0, -0.5]);
    const lugWithHole = await difference(lugSolid, holePlaced);
    const joined = await union(baseSolid, lugWithHole);
    disposeManifold(baseSolid, lugSolid, holeSolid, holePlaced, lugWithHole);
    baseSolid = joined;
  } else {
    const holeSolid = await extrudeRings([holeRing], st.baseThick + 1.0, false);
    const holePlaced = holeSolid.translate([0, 0, -0.5]);
    const cut = await difference(baseSolid, holePlaced);
    disposeManifold(baseSolid, holeSolid, holePlaced);
    baseSolid = cut;
  }

  // 5. Text & Icon 3D Extrusion
  const textSolid = await extrudeRings(combinedGlyphs, st.letterDepth, false);
  const textPlaced = textSolid.translate([0, 0, st.baseThick]);
  disposeManifold(textSolid);

  const parts: ExportPart[] = [
    {
      name: 'base',
      mesh: manifoldToMesh(baseSolid),
      colorRgb: hexToRgb(st.baseColor),
      extruder: 1,
    },
    {
      name: 'text',
      mesh: manifoldToMesh(textPlaced),
      colorRgb: hexToRgb(st.textColor),
      extruder: 3,
    },
  ];

  // Optional Inner Border
  if (st.borderMode === 'outer') {
    const borderOutline = dilateTextContours([baseOutline], { padding: -1.2 });
    if (borderOutline.length) {
      const outerRim = await extrudeRings([baseOutline], 0.6, false);
      const innerCut = await extrudeRings([borderOutline[0]!], 1.0, false);
      const innerCutPlaced = innerCut.translate([0, 0, -0.2]);
      const rim = await difference(outerRim, innerCutPlaced);
      const rimPlaced = rim.translate([0, 0, st.baseThick]);
      disposeManifold(outerRim, innerCut, innerCutPlaced, rim);
      parts.push({
        name: 'border',
        mesh: manifoldToMesh(rimPlaced),
        colorRgb: hexToRgb(st.borderColor),
        extruder: 2,
      });
      disposeManifold(rimPlaced);
    }
  }

  disposeManifold(baseSolid, textPlaced);

  // 6. Build Three.js Assembly Group
  const group = new THREE.Group();
  for (const p of parts) {
    const c = p.colorRgb;
    const isText = p.name === 'text';
    const mesh = meshArraysToThree(
      p.mesh,
      new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255),
      { raised: isText },
    );
    mesh.rotation.x = -Math.PI / 2;
    if (st.mirrorMode) {
      mesh.scale.x = -1;
    }
    // Explode offsets: base=0, border=1, text=2
    const groupIdx = p.name === 'base' ? 0 : (p.name === 'border' ? 1 : 2);
    mesh.userData.explodeGroup = groupIdx;
    group.add(mesh);
  }

  return { group, parts, warnings: warns };
}

// 7. Mount 3-Zone Shell UI
mountShell({
  title: '3D Name Keychain Studio',
  active: 'keychain',
  bodyHtml: `
    <div class="studio studio-3zone">
      <!-- 1. LEFT SIDEBAR: CONFIG PANEL -->
      <aside class="panel">
        <h2 style="font-size:1.1rem;margin:0 0 0.6rem;font-weight:700">🏷️ พวงกุญแจป้ายชื่อ 3D</h2>

        <div class="field">
          <label for="themeSelect">ชุดสีแนะนำ (Color Themes)</label>
          <select id="themeSelect">
            ${COLOR_THEMES.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label for="badgeShape">รูปทรงแผ่นฐาน (Base Shape)</label>
          <select id="badgeShape">
            ${BADGE_SHAPES.map((b) => `<option value="${b.id}" ${b.id === state.badgeShape ? 'selected' : ''}>${b.label}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label for="padding">ความกว้างขอบฐาน (mm): <span id="paddingVal">${state.padding}</span></label>
          <input id="padding" type="range" min="2.0" max="6.0" step="0.5" value="${state.padding}"/>
        </div>

        <div class="field">
          <label for="baseThick">ความหนาแผ่นฐาน (mm): <span id="thickVal">${state.baseThick}</span></label>
          <input id="baseThick" type="range" min="2.0" max="4.5" step="0.2" value="${state.baseThick}"/>
        </div>

        <div class="field">
          <label for="borderMode">เส้นขอบประดับ</label>
          <select id="borderMode">
            <option value="outer" ${state.borderMode === 'outer' ? 'selected' : ''}>เปิดเส้นขอบสีชั้นใน (3 สี)</option>
            <option value="none" ${state.borderMode === 'none' ? 'selected' : ''}>ไม่ใส่เส้นขอบ (2 สีคลาสสิก)</option>
          </select>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:0.6rem;margin-top:0.6rem">
          <h3 style="font-size:0.9rem;margin:0 0 0.4rem;font-weight:600">🔑 ห่วงคล้องพวงกุญแจ</h3>
          <div class="field">
            <label for="keychainPos">ตำแหน่งห่วง</label>
            <select id="keychainPos">
              <option value="left" ${state.keychainPos === 'left' ? 'selected' : ''}>ซ้าย (Left)</option>
              <option value="right" ${state.keychainPos === 'right' ? 'selected' : ''}>ขวา (Right)</option>
              <option value="top" ${state.keychainPos === 'top' ? 'selected' : ''}>บน (Top)</option>
              <option value="bottom" ${state.keychainPos === 'bottom' ? 'selected' : ''}>ล่าง (Bottom)</option>
            </select>
          </div>
          <div class="row">
            <div class="field">
              <label for="keychainStyle">แบบห่วง</label>
              <select id="keychainStyle">
                <option value="lug" ${state.keychainStyle === 'lug' ? 'selected' : ''}>Lug (หูยื่นนอกตัว)</option>
                <option value="hole" ${state.keychainStyle === 'hole' ? 'selected' : ''}>Hole (เจาะรูในตัว)</option>
              </select>
            </div>
            <div class="field">
              <label for="holeDiameter">ขนาดรูห่วง: <span id="holeVal">${state.holeDiameter}</span>mm</label>
              <input id="holeDiameter" type="range" min="3.0" max="6.0" step="0.5" value="${state.holeDiameter}"/>
            </div>
          </div>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:0.6rem;margin-top:0.6rem">
          <h3 style="font-size:0.9rem;margin:0 0 0.4rem;font-weight:600">🎨 กำหนดสีแยกชิ้น (AMS)</h3>
          <div class="row">
            <div class="field"><label for="baseColor">สีฐาน</label><input id="baseColor" type="color" value="${state.baseColor}"/></div>
            <div class="field"><label for="borderColor">สีขอบ</label><input id="borderColor" type="color" value="${state.borderColor}"/></div>
            <div class="field"><label for="textColor">สีข้อความ</label><input id="textColor" type="color" value="${state.textColor}"/></div>
          </div>
        </div>

        <div class="field" style="display:flex;align-items:center;gap:0.5rem;margin-top:0.6rem">
          <input type="checkbox" id="mirrorMode" ${state.mirrorMode ? 'checked' : ''} style="width:16px;height:16px;accent-color:#f97316"/>
          <label for="mirrorMode" style="margin:0;cursor:pointer">โหมดพิมพ์คว่ำหน้า PEI (Mirror Mode)</label>
        </div>
      </aside>

      <!-- 2. CENTER VIEWPORT: 3D STAGE & TOOLBAR -->
      <div class="stage-wrap">
        <div class="viewport-toolbar">
          <div class="toolbar-group" style="display:flex;align-items:center;gap:0.4rem">
            <button type="button" class="tool-btn ${state.explodePercent === 0 ? 'active' : ''}" id="btnViewAssembled">Assembled</button>
            <div style="display:inline-flex;align-items:center;gap:0.3rem">
              <label for="explodeSlider" style="font-size:0.75rem;color:var(--text-muted)">แยกชิ้น:</label>
              <input id="explodeSlider" type="range" min="0" max="100" step="5" value="${state.explodePercent}" style="width:75px"/>
              <span id="explodeVal" style="font-size:0.75rem;min-width:32px">${state.explodePercent}%</span>
            </div>
          </div>
          <div class="toolbar-sep"></div>
          <button type="button" class="tool-btn" id="btnFitView">🎯 Fit</button>
        </div>

        <div id="stage" style="width:100%;height:100%"></div>
        <div class="stage-label">Aksorn3D Parity · 1 unit = 1 mm · Manifold Watertight CSG</div>
      </div>

      <!-- 3. RIGHT SIDEBAR: TEXT & ACCENT ICONS -->
      <aside class="panel-right">
        <h2 style="font-size:1.1rem;margin:0 0 0.6rem;font-weight:700">✍️ ข้อความ & ไอคอน</h2>

        <div class="field">
          <label for="nameInput">ชื่อ / ข้อความบนพวงกุญแจ</label>
          <input type="text" id="nameInput" value="${state.text}" placeholder="พิมพ์ข้อความ เช่น น้องขวัญ, Alice, Kampai" style="width:100%;padding:0.45rem;border-radius:8px;border:1px solid var(--border);background:var(--bg-soft);color:var(--text);font-family:inherit;font-size:1rem"/>
        </div>

        <div class="field">
          <label for="fontSelect">ฟอนต์ตัวอักษร</label>
          <select id="fontSelect">${fontSelectHtml(state.fontId)}</select>
        </div>

        <div class="field">
          <label for="letterSize">ขนาดตัวอักษร (mm): <span id="sizeVal">${state.letterSize}</span></label>
          <input id="letterSize" type="range" min="9" max="24" step="1" value="${state.letterSize}"/>
        </div>

        <div class="field">
          <label for="letterDepth">ความสูงลายนูน (mm): <span id="depthVal">${state.letterDepth}</span></label>
          <input id="letterDepth" type="range" min="0.8" max="2.4" step="0.2" value="${state.letterDepth}"/>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:0.6rem;margin-top:0.6rem">
          <h3 style="font-size:0.9rem;margin:0 0 0.4rem;font-weight:600">✨ ไอคอนประดับ (Accent Icon)</h3>
          <div class="field">
            <label for="accentIcon">เลือกไอคอน</label>
            <select id="accentIcon">
              ${ACCENT_ICONS.map((ic) => `<option value="${ic.id}" ${ic.id === state.accentIcon ? 'selected' : ''}>${ic.label}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="iconPosition">ตำแหน่งไอคอน</label>
            <select id="iconPosition">
              <option value="trailing" ${state.iconPosition === 'trailing' ? 'selected' : ''}>ต่อท้ายชื่อ (ขวา)</option>
              <option value="leading" ${state.iconPosition === 'leading' ? 'selected' : ''}>นำหน้าชื่อ (ซ้าย)</option>
              <option value="both" ${state.iconPosition === 'both' ? 'selected' : ''}>ประกบสองข้าง (ซ้ายและขวา)</option>
              <option value="none" ${state.iconPosition === 'none' ? 'selected' : ''}>ไม่ใส่ไอคอน</option>
            </select>
          </div>
        </div>

        <!-- PRIMARY EXPORT ACTIONS -->
        <div style="margin-top:auto;display:flex;flex-direction:column;gap:0.45rem">
          <button type="button" class="btn btn-primary" id="export3mf" style="padding:0.75rem;font-weight:700">
            📥 ดาวน์โหลด 3MF (Bambu Studio / AMS)
          </button>
          <div class="row">
            <button type="button" class="btn" id="exportStl" style="flex:1">STL (ZIP)</button>
            <button type="button" class="btn" id="saveJson" style="flex:1">บันทึก JSON</button>
          </div>
          <button type="button" class="btn" id="loadJson" style="font-size:0.78rem">โหลด JSON</button>
          <input id="jsonFileInput" type="file" accept=".json,application/json" class="hidden"/>
          <p id="buildStatus" class="hint" aria-live="polite" style="margin-top:0.3rem">พร้อมทำงาน</p>
        </div>
      </aside>
    </div>
  `,
});

// 8. Viewer & App Lifecycle
const stageEl = q<HTMLDivElement>('stage');
const statusEl = q<HTMLParagraphElement>('buildStatus');
const viewer = createStudioViewer(stageEl);

let lastParts: ExportPart[] = [];
let revision = 0;

function lockExport() {
  q<HTMLButtonElement>('export3mf').disabled = true;
  q<HTMLButtonElement>('exportStl').disabled = true;
}

function unlockExport() {
  q<HTMLButtonElement>('export3mf').disabled = false;
  q<HTMLButtonElement>('exportStl').disabled = false;
}

async function rebuild() {
  const currentRevision = ++revision;
  const snapshot: KeychainState = { ...state };
  lockExport();
  setStatus(statusEl, 'กำลังคำนวณเส้นขอบตามรูปอักษร 3D…', 'warn');

  try {
    const { group, parts, warnings } = await buildKeychain(snapshot);
    if (currentRevision !== revision) {
      disposeObject3D(group);
      return;
    }
    lastParts = parts;
    viewer.setRoot(group);
    viewer.setExplodedZ((snapshot.explodePercent / 100) * 16);
    viewer.fitToObject(1.8);

    writeHashParams({
      text: state.text,
      font: state.fontId,
      shape: state.badgeShape,
    });

    saveProject('keychain', state);
    unlockExport();
    setStatus(statusEl, warnings.join(' · ') || 'สร้างโมเดล 3D สมบูรณ์ พร้อมพิมพ์', 'ok');
  } catch (err) {
    if (currentRevision !== revision) return;
    setStatus(statusEl, err instanceof Error ? err.message : String(err), 'err');
    unlockExport();
  }
}

const rebuildDebounced = debounce(() => void rebuild(), 250);

// 9. Bind Events
q<HTMLInputElement>('nameInput').oninput = (e) => {
  state.text = (e.target as HTMLInputElement).value;
  rebuildDebounced();
};
q<HTMLSelectElement>('fontSelect').onchange = (e) => {
  state.fontId = (e.target as HTMLSelectElement).value;
  rebuildDebounced();
};
q<HTMLInputElement>('letterSize').oninput = (e) => {
  state.letterSize = Number((e.target as HTMLInputElement).value);
  q('sizeVal').textContent = String(state.letterSize);
  rebuildDebounced();
};
q<HTMLInputElement>('letterDepth').oninput = (e) => {
  state.letterDepth = Number((e.target as HTMLInputElement).value);
  q('depthVal').textContent = String(state.letterDepth);
  rebuildDebounced();
};
q<HTMLSelectElement>('badgeShape').onchange = (e) => {
  state.badgeShape = (e.target as HTMLSelectElement).value as BadgeShape;
  rebuildDebounced();
};
q<HTMLInputElement>('padding').oninput = (e) => {
  state.padding = Number((e.target as HTMLInputElement).value);
  q('paddingVal').textContent = String(state.padding);
  rebuildDebounced();
};
q<HTMLInputElement>('baseThick').oninput = (e) => {
  state.baseThick = Number((e.target as HTMLInputElement).value);
  q('thickVal').textContent = String(state.baseThick);
  rebuildDebounced();
};
q<HTMLSelectElement>('borderMode').onchange = (e) => {
  state.borderMode = (e.target as HTMLSelectElement).value as 'none' | 'outer';
  rebuildDebounced();
};
q<HTMLSelectElement>('accentIcon').onchange = (e) => {
  state.accentIcon = (e.target as HTMLSelectElement).value as AccentIcon;
  rebuildDebounced();
};
q<HTMLSelectElement>('iconPosition').onchange = (e) => {
  state.iconPosition = (e.target as HTMLSelectElement).value as IconPosition;
  rebuildDebounced();
};
q<HTMLSelectElement>('keychainPos').onchange = (e) => {
  state.keychainPos = (e.target as HTMLSelectElement).value as KeychainPos;
  rebuildDebounced();
};
q<HTMLSelectElement>('keychainStyle').onchange = (e) => {
  state.keychainStyle = (e.target as HTMLSelectElement).value as 'lug' | 'hole';
  rebuildDebounced();
};
q<HTMLInputElement>('holeDiameter').oninput = (e) => {
  state.holeDiameter = Number((e.target as HTMLInputElement).value);
  q('holeVal').textContent = String(state.holeDiameter);
  rebuildDebounced();
};
q<HTMLInputElement>('mirrorMode').onchange = (e) => {
  state.mirrorMode = (e.target as HTMLInputElement).checked;
  rebuildDebounced();
};

for (const id of ['baseColor', 'borderColor', 'textColor'] as const) {
  q<HTMLInputElement>(id).oninput = (e) => {
    state[id] = (e.target as HTMLInputElement).value;
    rebuildDebounced();
  };
}

q<HTMLSelectElement>('themeSelect').onchange = (e) => {
  const theme = COLOR_THEMES.find((t) => t.id === (e.target as HTMLSelectElement).value);
  if (!theme) return;
  state.baseColor = theme.baseColor;
  state.borderColor = theme.borderColor;
  state.textColor = theme.textColor;
  q<HTMLInputElement>('baseColor').value = theme.baseColor;
  q<HTMLInputElement>('borderColor').value = theme.borderColor;
  q<HTMLInputElement>('textColor').value = theme.textColor;
  rebuildDebounced();
};

// Toolbar bindings
q<HTMLButtonElement>('btnViewAssembled').onclick = () => {
  state.explodePercent = 0;
  q<HTMLInputElement>('explodeSlider').value = '0';
  q('explodeVal').textContent = '0%';
  q('btnViewAssembled').classList.add('active');
  viewer.setExplodedZ(0);
};
q<HTMLInputElement>('explodeSlider').oninput = (e) => {
  state.explodePercent = Number((e.target as HTMLInputElement).value);
  q('explodeVal').textContent = `${state.explodePercent}%`;
  q('btnViewAssembled').classList.toggle('active', state.explodePercent === 0);
  viewer.setExplodedZ((state.explodePercent / 100) * 16);
};
q<HTMLButtonElement>('btnFitView').onclick = () => {
  viewer.fitToObject(1.8);
};

// Export Handlers
q<HTMLButtonElement>('export3mf').onclick = () => {
  if (!lastParts.length) return;
  const safeName = (state.text.trim() || 'keychain').replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
  const base = `keychain-${safeName}`;
  exportParts(lastParts, base, '3mf');
  captureCoverPng(viewer, base);
  setStatus(statusEl, 'ดาวน์โหลดไฟล์ 3MF สำเร็จ!', 'ok');
};

q<HTMLButtonElement>('exportStl').onclick = () => {
  if (!lastParts.length) return;
  const safeName = (state.text.trim() || 'keychain').replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
  const base = `keychain-${safeName}`;
  exportParts(lastParts, base, 'stl');
  captureCoverPng(viewer, base);
  setStatus(statusEl, 'ดาวน์โหลดไฟล์ STL ZIP สำเร็จ!', 'ok');
};

q<HTMLButtonElement>('saveJson').onclick = () => {
  downloadProjectFile('keychain', state);
  setStatus(statusEl, 'บันทึก JSON สำเร็จ', 'ok');
};

q<HTMLButtonElement>('loadJson').onclick = () => {
  q<HTMLInputElement>('jsonFileInput').click();
};

q<HTMLInputElement>('jsonFileInput').onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const proj = await readProjectFile(file);
    if (proj.data) {
      Object.assign(state, proj.data);
      q<HTMLInputElement>('nameInput').value = state.text;
      q<HTMLSelectElement>('fontSelect').value = state.fontId;
      q<HTMLSelectElement>('badgeShape').value = state.badgeShape;
      q<HTMLInputElement>('padding').value = String(state.padding);
      q<HTMLInputElement>('baseThick').value = String(state.baseThick);
      q<HTMLInputElement>('baseColor').value = state.baseColor;
      q<HTMLInputElement>('borderColor').value = state.borderColor;
      q<HTMLInputElement>('textColor').value = state.textColor;
      rebuildDebounced();
    }
  } catch (err) {
    alert('ไม่สามารถอ่านไฟล์ JSON ได้');
  }
};

// Initial rebuild
void rebuild();
