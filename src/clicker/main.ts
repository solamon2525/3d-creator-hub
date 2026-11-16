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
import { MX, mxCrossRects, mxSocketRects } from '../shared/geometry/mxStem';
import { exportParts, buildStlZip, type ExportPart } from '../shared/export/parts';
import { createModularSolids, DEFAULT_MODULAR, normalizeModular, modularParts, groundPart, MODULAR_GUIDE, type ModularSettings } from './modular';
import { hexToRgb, filamentOptionsHtml, rgbToHex } from '../shared/units';
import {
  processImageWizard,
  svgTextToRegions,
  type ColorRegion,
} from '../shared/geometry/imageToRegions';
import { mountPrintChecklist, PRINT_TIPS_CLICKER } from '../shared/ui/presets';
import { createBaseOutline, SHAPE_LABELS, type BaseShape } from './shapes';
import { DEFAULT_FIT, normalizeFit, createFitTestStripSolids, type FitSettings } from './fit';
import { ICON_CATEGORIES, getIconSvg, searchIcons } from './iconCatalog';
import { BLOCK_PRESETS, buildBlockSolids, type BlockPreset } from './blocks';

type ImportMode = 'text' | 'icon' | 'image' | 'svg' | 'blocks';
type ColorMode = 'ams' | 'zband';
type LeftTab = 'shape' | 'body' | 'colors' | 'fit' | 'keychain' | 'modular';

type State = {
  productMode: 'classic' | 'modular';
  modular: ModularSettings;
  name: string;
  baseShape: BaseShape;
  lockBaseSize: boolean;
  baseWidth: number;
  baseHeight: number;
  turn: number;
  fit: FitSettings;
  selectedIcon: string;
  iconCategory: string;
  iconSearch: string;
  blockPreset: BlockPreset;
  blockBorders: boolean;
  blockSolidFloor: boolean;
  keycapProfile: 'standard' | 'flat';
  contrast: number;
  brightness: number;
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
  activeLeftTab: LeftTab;
  cutActive: boolean;
  cutAxis: 'x' | 'y' | 'z';
  cutPos: number;
};

const state: State = {
  productMode: 'classic',
  modular: { ...DEFAULT_MODULAR },
  name: 'คำไผ่',
  baseShape: 'circle',
  lockBaseSize: false,
  baseWidth: 32,
  baseHeight: 32,
  turn: 0,
  fit: { ...DEFAULT_FIT },
  selectedIcon: 'Heart',
  iconCategory: 'popular',
  iconSearch: '',
  blockPreset: 'row4',
  blockBorders: true,
  blockSolidFloor: true,
  keycapProfile: 'standard',
  contrast: 0,
  brightness: 0,
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
  activeLeftTab: 'shape',
  cutActive: false,
  cutAxis: 'x',
  cutPos: 0,
};

Object.assign(state, loadProject<Partial<State>>('clicker') ?? {});
state.productMode = state.productMode === 'modular' ? 'modular' : 'classic';
state.modular = normalizeModular(state.modular);
state.fit = normalizeFit(state.fit);
state.name = typeof state.name === 'string' ? state.name : 'คำไผ่';

let templatePromise: Promise<MeshArrays[]> | null = null;
function getTemplates(): Promise<MeshArrays[]> {
  return (templatePromise ??= getManifold()
    .then((m) => {
      const solids = createModularSolids(m);
      try {
        return solids.map(manifoldToMesh);
      } finally {
        disposeManifold(...solids);
      }
    })
    .catch((error) => {
      templatePromise = null;
      throw error;
    }));
}

let imageRegions: ColorRegion[] | null = null;
let lastParts: ExportPart[] = [];
let lastImageFile: File | null = null;
let palettePreview: string[] = [];
let wizardPreviewUrl: string | null = null;

async function build(st: State) {
  if (st.productMode === 'modular') {
    const templates = await getTemplates();
    const settings = st.modular;
    const previewParts = modularParts(templates, settings, settings.count, settings.view);
    const parts = modularParts(
      templates,
      settings,
      settings.exportSet === 'prototype' ? 1 : settings.count,
      'print',
    );
    const group = new THREE.Group();
    for (const p of previewParts) {
      const c = p.colorRgb;
      const object = meshArraysToThree(p.mesh, new THREE.Color(c[0] / 255, c[1] / 255, c[2] / 255));
      object.rotation.x = -Math.PI / 2;
      group.add(object);
    }
    return { group, parts, warnings: [] as string[] };
  }

  // Multi-key Fidget Blocks Mode (Row 1x2, 1x3, 1x4, WASD, Grid 2x2)
  if (st.importMode === 'blocks') {
    const warns: string[] = [];
    const layout = BLOCK_PRESETS[st.blockPreset]?.layout() ?? BLOCK_PRESETS.row4.layout();
    warns.push(`โหมด Fidget Blocks: ${layout.name} (${layout.keys.length} ปุ่ม)`);
    const m = await getManifold();
    const { body: blockBody, caps: blockCaps } = buildBlockSolids(m, layout, {
      bodyH: st.thick,
      floor: 2.0,
      solidFloor: st.blockSolidFloor ?? true,
      borders: st.blockBorders ?? true,
      keycapProfile: st.keycapProfile ?? 'standard',
      stemFit: st.fit.stemFit,
      pocketFit: st.fit.pocketFit,
    });

    const bodyMesh = manifoldToMesh(blockBody);
    disposeManifold(blockBody);

    const parts: ExportPart[] = [
      { name: 'body', mesh: bodyMesh, colorRgb: hexToRgb(st.bodyColor), extruder: 1 },
    ];

    const group = new THREE.Group();
    const bodyThree = meshArraysToThree(
      bodyMesh,
      new THREE.Color(
        hexToRgb(st.bodyColor)[0] / 255,
        hexToRgb(st.bodyColor)[1] / 255,
        hexToRgb(st.bodyColor)[2] / 255,
      ),
    );
    bodyThree.rotation.x = -Math.PI / 2;
    bodyThree.userData.explodeGroup = 0;
    group.add(bodyThree);

    // Keycaps
    for (let i = 0; i < blockCaps.length; i++) {
      const c = blockCaps[i]!;
      const capMesh = manifoldToMesh(c.solid);
      disposeManifold(c.solid);
      const name = `cap-${i + 1}`;
      parts.push({
        name,
        mesh: capMesh,
        colorRgb: hexToRgb(st.capColor),
        extruder: 2,
      });

      const capThree = meshArraysToThree(
        capMesh,
        new THREE.Color(
          hexToRgb(st.capColor)[0] / 255,
          hexToRgb(st.capColor)[1] / 255,
          hexToRgb(st.capColor)[2] / 255,
        ),
      );
      capThree.rotation.x = -Math.PI / 2;
      capThree.userData.explodeGroup = 1;
      group.add(capThree);
    }

    // Characters distribution (1 character per keycap)
    const textChars = Array.from(st.name.trim() || 'Name');
    const { font } = await loadFontForText(st.fontId, st.name || '1');

    for (let i = 0; i < blockCaps.length; i++) {
      const c = blockCaps[i]!;
      const char = textChars[i] || c.key.label || String(i + 1);
      try {
        const contours = textToContours(font, char, Math.min(st.letterSize, 9.5));
        if (contours.rings.length) {
          const placedRings: Ring[] = contours.rings.map((ring) =>
            ring.map(([x, y]) => [x + c.center[0], y + c.center[1]] as [number, number]),
          );
          const bandDepth = Math.max(0.6, st.letterDepth);
          const z0 = c.topZ + 0.15;
          const solid = await extrudeRings(placedRings, bandDepth, false);
          const placed = solid.translate([0, 0, z0]);
          const mesh = manifoldToMesh(placed);
          disposeManifold(solid, placed);
          const name = `decor-${i + 1}`;
          parts.push({
            name,
            mesh,
            colorRgb: hexToRgb(st.textColor),
            extruder: 3,
          });

          const decThree = meshArraysToThree(
            mesh,
            new THREE.Color(
              hexToRgb(st.textColor)[0] / 255,
              hexToRgb(st.textColor)[1] / 255,
              hexToRgb(st.textColor)[2] / 255,
            ),
            { raised: true },
          );
          decThree.rotation.x = -Math.PI / 2;
          decThree.userData.explodeGroup = 1;
          group.add(decThree);
        }
      } catch (err) {
        // Glyph fallback ignore
      }
    }

    return { group, parts, warnings: warns };
  }

  const warns: string[] = [];
  const s = st.size;
  const bodyH = st.thick;
  const border = 2.4;
  const floor = 2.2;
  const gap = st.fit.topBaseGap || 0.6;

  // 1. Base Housing Solid (Using 14 Base Shapes + Lock Size + Turn)
  const outerOutline = createBaseOutline(st.baseShape, {
    size: s,
    lockBaseSize: st.lockBaseSize,
    baseWidth: st.baseWidth,
    baseHeight: st.baseHeight,
    turn: st.turn,
  });
  const bodyOuter = await extrudeRings([outerOutline], bodyH, false);

  const innerOutline = createBaseOutline(st.baseShape, {
    size: Math.max(16, s - border * 2),
    lockBaseSize: st.lockBaseSize,
    baseWidth: st.lockBaseSize ? Math.max(16, st.baseWidth - border * 2) : undefined,
    baseHeight: st.lockBaseSize ? Math.max(16, st.baseHeight - border * 2) : undefined,
    turn: st.turn,
  });
  const well = await extrudeRings([innerOutline], bodyH - floor + 0.2, false);
  const wellUp = well.translate([0, 0, floor]);
  let body = await difference(bodyOuter, wellUp);
  disposeManifold(bodyOuter, well, wellUp);

  // 2. MX Switch Socket with Pocket Fit calibration
  const sockTol = 0.05 + (st.fit.pocketFit || 0);
  const sock = mxSocketRects(sockTol);
  const socket = await mxCrossSolid(sock.length, sock.thickness, floor + 0.4);
  const socketPlaced = socket.translate([0, 0, floor / 2]);
  const bodyCut = await difference(body, socketPlaced);
  disposeManifold(body, socket, socketPlaced);
  body = bodyCut;

  // 3. Keychain Attachment
  if (st.keychain) {
    const lugDist = (st.lockBaseSize ? st.baseWidth : s) / 2 + 3;
    const lugOuter = await extrudeRings(
      [
        Array.from({ length: 32 }, (_, i) => {
          const a = (i / 32) * Math.PI * 2;
          return [lugDist + Math.cos(a) * 4, Math.sin(a) * 4] as [number, number];
        }),
      ],
      bodyH * 0.7,
      false,
    );
    if (st.keychainStyle === 'loop') {
      const hole = await extrudeRings(
        [
          Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return [lugDist + Math.cos(a) * 2.2, Math.sin(a) * 2.2] as [number, number];
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
            return [lugDist - 6 + Math.cos(a) * 2.6, Math.sin(a) * 2.6] as [number, number];
          }),
        ],
        bodyH + 1,
        false,
      );
      const bodyHoled = await difference(body, hole);
      disposeManifold(body, lugOuter, hole);
      body = bodyHoled;
      warns.push('โหมด hole: เจาะห่วงในขอบตัวเครื่อง');
    }
  }

  const bodyMesh = manifoldToMesh(body);
  disposeManifold(body);

  // 4. Keycap Button Solid (Nested inside bezel with Top/Base Gap clearance)
  const capThick = 3.2;
  const capTop = bodyH + 0.8;
  const capBottom = capTop - capThick;

  const capOutline = createBaseOutline(st.baseShape, {
    size: Math.max(14, s - border * 2 - gap),
    lockBaseSize: st.lockBaseSize,
    baseWidth: st.lockBaseSize ? Math.max(14, st.baseWidth - border * 2 - gap) : undefined,
    baseHeight: st.lockBaseSize ? Math.max(14, st.baseHeight - border * 2 - gap) : undefined,
    turn: st.turn,
  });

  const cap = await extrudeRings([capOutline], capThick, false);

  // Stem cross with Stem Fit calibration
  const stemTol = MX.defaultStemTolerance + (st.fit.stemFit || 0);
  const stemRect = mxCrossRects(stemTol);
  const stem = await mxCrossSolid(stemRect.length, stemRect.thickness, 4.5);
  const stemPlaced = stem.translate([0, 0, -2]);
  const capJoined = await union(cap, stemPlaced);
  disposeManifold(cap, stem, stemPlaced);
  const capLifted = capJoined.translate([0, 0, capBottom]);
  const capMesh = manifoldToMesh(capLifted);
  disposeManifold(capJoined, capLifted);

  const parts: ExportPart[] = [
    { name: 'body', mesh: bodyMesh, colorRgb: hexToRgb(st.bodyColor), extruder: 1 },
    { name: 'cap', mesh: capMesh, colorRgb: hexToRgb(st.capColor), extruder: 2 },
  ];

  // 5. Contextual Decoration (Text, Icon, Image, SVG, Blocks)
  const decorNames: string[] = [];
  try {
    let regions: ColorRegion[] = [];
    if (st.importMode === 'text') {
      const { font, fontId, warned } = await loadFontForText(st.fontId, st.name || 'คำไผ่');
      if (warned) warns.push(warned);
      if (fontId !== st.fontId) st.fontId = fontId;
      const contours = textToContours(font, st.name || 'คำไผ่', st.letterSize);
      if (!contours.rings.length) throw new Error('วาดตัวอักษรไม่ได้ — กรุณาเลือกฟอนต์ไทย (Sarabun/Kanit)');
      regions = [{ rgb: hexToRgb(st.textColor), rings: contours.rings, coverage: 1 }];
    } else if (st.importMode === 'icon') {
      const svg = getIconSvg(st.selectedIcon || 'Heart', st.textColor);
      if (svg) {
        regions = await svgTextToRegions(svg, st.letterSize * 1.5, st.maxColors);
      }
    } else if (imageRegions?.length) {
      regions = imageRegions;
    } else if (st.importMode === 'image' || st.importMode === 'svg') {
      warns.push('ยังไม่ได้อัปโหลดไฟล์ — เลือกไฟล์รูปหรือ SVG ที่แถบขวา');
    }

    let zi = 0;
    for (const region of regions) {
      const bandDepth =
        st.colorMode === 'zband'
          ? Math.max(0.45, st.letterDepth * 0.55)
          : Math.max(0.8, st.letterDepth);
      const z0 = capTop + 0.25 + (st.colorMode === 'zband' ? zi * bandDepth : zi * 0.02);
      const solid = await extrudeRings(region.rings, bandDepth, false);
      const placed = solid.translate([0, 0, z0]);
      const name = st.colorMode === 'zband' ? `zband-${zi}` : `decor-${zi}`;
      const mesh = manifoldToMesh(placed);
      parts.push({
        name,
        mesh,
        colorRgb: region.rgb,
        extruder: (zi % 2) + 3,
      });
      decorNames.push(name);
      disposeManifold(solid, placed);
      zi++;
    }
    if (!regions.length && st.importMode === 'text') {
      warns.push('ไม่มี mesh ตัวอักษร');
    }
  } catch (e) {
    warns.push(e instanceof Error ? e.message : String(e));
  }

  // 6. Build Three.js Assembly Group
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
    mesh.userData.explodeGroup = p.name === 'body' ? 0 : 1;
    group.add(mesh);
  }
  return { group, parts, warnings: warns };
}

// 7. Mount 3-Zone Shell
mountShell({
  title: 'Clicker Studio (MakerWorld Parity)',
  active: 'clicker',
  bodyHtml: `
    <div class="studio studio-3zone">
      <!-- 1. LEFT SIDEBAR: CONFIG PANEL -->
      <aside class="panel">
        <h2 style="font-size:1.1rem;margin:0 0 0.6rem;font-weight:700">🕹️ Clicker Studio</h2>
        <div class="subtabs" id="leftSubtabs">
          <button type="button" class="subtab-btn active" data-tab="shape">Shape</button>
          <button type="button" class="subtab-btn" data-tab="body">Body</button>
          <button type="button" class="subtab-btn" data-tab="colors">Colors</button>
          <button type="button" class="subtab-btn" data-tab="fit">Fit</button>
          <button type="button" class="subtab-btn" data-tab="keychain">Loop</button>
          <button type="button" class="subtab-btn" data-tab="modular">Tri</button>
        </div>

        <!-- TAB: SHAPE & SIZE -->
        <section id="tab-shape">
          <div class="field">
            <label for="baseShape">รูปทรงฐาน (14 รูปทรง)</label>
            <select id="baseShape">
              ${Object.entries(SHAPE_LABELS)
                .map(([id, label]) => `<option value="${id}">${label}</option>`)
                .join('')}
            </select>
          </div>
          <div class="field">
            <label for="size">ขนาดฐานรวม (mm): <span id="sizeVal">${state.size}</span></label>
            <input id="size" type="range" min="24" max="50" step="1" value="${state.size}"/>
          </div>
          <div class="field">
            <label><input id="lockBaseSize" type="checkbox" ${state.lockBaseSize ? 'checked' : ''}/> ปรับ กว้าง × ยาว แยกอิสระ</label>
          </div>
          <div id="lockSizeControls" class="${state.lockBaseSize ? '' : 'hidden'}">
            <div class="field">
              <label for="baseWidth">ความกว้าง W (mm): <span id="widthVal">${state.baseWidth}</span></label>
              <input id="baseWidth" type="range" min="20" max="60" step="1" value="${state.baseWidth}"/>
            </div>
            <div class="field">
              <label for="baseHeight">ความยาว L (mm): <span id="heightVal">${state.baseHeight}</span></label>
              <input id="baseHeight" type="range" min="20" max="60" step="1" value="${state.baseHeight}"/>
            </div>
          </div>
          <div class="field">
            <label for="turn">หมุนองศาฐาน (Turn): <span id="turnVal">${state.turn}</span>°</label>
            <input id="turn" type="range" min="0" max="360" step="5" value="${state.turn}"/>
          </div>
        </section>

        <!-- TAB: BODY & THICKNESS -->
        <section id="tab-body" class="hidden">
          <div class="field">
            <label for="thick">ความสูงฐาน (mm): <span id="thickVal">${state.thick}</span></label>
            <input id="thick" type="range" min="8" max="16" step="0.5" value="${state.thick}"/>
          </div>
          <div class="hint">เบ้าสวิตช์ MX 14×14 mm ล็อกแน่นตามมาตรฐานคีย์บอร์ดกลไก</div>
        </section>

        <!-- TAB: COLORS & FILAMENT -->
        <section id="tab-colors" class="hidden">
          <div class="row">
            <div class="field"><label for="bodyColor">สีตัวเรือน</label><input id="bodyColor" type="color" value="${state.bodyColor}"/></div>
            <div class="field"><label for="capColor">สีปุ่มกด</label><input id="capColor" type="color" value="${state.capColor}"/></div>
          </div>
          <div class="field"><label for="textColor">สีลายประทับ</label><input id="textColor" type="color" value="${state.textColor}"/></div>
          <div class="field"><label for="bodyPreset">พรีเซ็ตสี Bambu</label><select id="bodyPreset">${filamentOptionsHtml(state.bodyColor)}</select></div>
          <div class="field"><label for="colorMode">ระบบสี</label>
            <select id="colorMode"><option value="ams">AMS (Bambu 4-Color)</option><option value="zband">No-AMS (Z-band pause)</option></select>
          </div>
        </section>

        <!-- TAB: FIT & TOLERANCE CALIBRATION -->
        <section id="tab-fit" class="hidden">
          <p class="desc" style="font-size:0.78rem;color:var(--muted)">ปรับความแน่นของก้านและเบ้าสวิตช์ MX</p>
          <div class="field">
            <label for="stemFit">ความแน่นก้านสวิตช์: <span id="stemFitVal">${state.fit.stemFit.toFixed(2)}</span> mm</label>
            <input id="stemFit" type="range" min="-0.15" max="0.15" step="0.01" value="${state.fit.stemFit}"/>
          </div>
          <div class="field">
            <label for="pocketFit">ความแน่นเบ้า 14mm: <span id="pocketFitVal">${state.fit.pocketFit.toFixed(2)}</span> mm</label>
            <input id="pocketFit" type="range" min="-0.20" max="0.20" step="0.01" value="${state.fit.pocketFit}"/>
          </div>
          <div class="field">
            <label for="topBaseGap">ช่องว่างปุ่มกับเบ้า: <span id="gapVal">${state.fit.topBaseGap.toFixed(2)}</span> mm</label>
            <input id="topBaseGap" type="range" min="0.30" max="1.50" step="0.05" value="${state.fit.topBaseGap}"/>
          </div>
          <div style="margin-top:0.8rem">
            <button type="button" class="btn" id="btnFitTestStrip" style="width:100%;background:rgba(56,189,248,0.15);border-color:var(--accent-2)">
              🖨️ สร้างแผ่นทดสอบ Fit Strip (3MF)
            </button>
            <p class="hint" style="margin-top:0.4rem">พิมพ์แผ่นทดสอบ 5 สเต็ป (-0.10 ถึง +0.10) ใน 8 นาทีเพื่อเลือกระดับที่เสียบแน่นพอดี</p>
          </div>
        </section>

        <!-- TAB: KEYCHAIN -->
        <section id="tab-keychain" class="hidden">
          <div class="field"><label><input id="keychain" type="checkbox" ${state.keychain ? 'checked' : ''}/> ติดห่วงพวงกุญแจ</label></div>
          <div class="field"><label for="keychainStyle">แบบห่วง</label>
            <select id="keychainStyle"><option value="loop">Loop (หูยื่นนอกตัว)</option><option value="hole">Hole (เจาะรูในตัว)</option></select>
          </div>
        </section>

        <!-- TAB: MODULAR BASE -->
        <section id="tab-modular" class="hidden">
          <div class="field"><label for="productMode">โหมดงาน</label>
            <select id="productMode"><option value="classic">Clicker เดี่ยว</option><option value="modular">ฐานต่อสามเหลี่ยม</option></select>
          </div>
          <div id="modularSubControls" class="${state.productMode === 'modular' ? '' : 'hidden'}">
            <div class="field"><label for="moduleCount">จำนวนฐานกลาง: <span id="moduleCountVal">1</span></label><input id="moduleCount" type="range" min="1" max="8" step="1" value="1"/></div>
            <div class="row">
              <div class="field"><label for="moduleBaseColor">สีฐาน</label><input id="moduleBaseColor" type="color"/></div>
              <div class="field"><label for="moduleHeadColor">สีหัว</label><input id="moduleHeadColor" type="color"/></div>
            </div>
            <div class="field"><label for="moduleView">มุมมอง</label><select id="moduleView"><option value="assembled">ประกอบแล้ว</option><option value="exploded">แยกชิ้น</option><option value="print">จัดวางสำหรับพิมพ์</option></select></div>
            <div class="field"><label for="moduleExportSet">ชุดส่งออก</label><select id="moduleExportSet"><option value="prototype">ต้นแบบ 3 ชิ้น</option><option value="quantity">ชุดตามจำนวนฐาน</option></select></div>
            <p id="moduleSummary" class="hint" aria-live="polite"></p>
          </div>
        </section>
      </aside>

      <!-- 2. CENTER VIEWPORT: 3D STAGE & TOOLBAR -->
      <div class="stage-wrap">
        <div class="viewport-toolbar">
          <div class="toolbar-group">
            <button type="button" class="tool-btn ${state.exploded ? '' : 'active'}" id="btnViewAssembled">Assembled</button>
            <button type="button" class="tool-btn ${state.exploded ? 'active' : ''}" id="btnViewExploded">Exploded</button>
          </div>
          <div class="toolbar-sep"></div>
          <div class="toolbar-group">
            <button type="button" class="tool-btn ${state.cutActive ? 'active' : ''}" id="btnToggleCut">✂️ Cut it open</button>
            <div id="cutControls" class="cut-controls ${state.cutActive ? '' : 'hidden'}">
              <button type="button" class="axis-btn ${state.cutAxis === 'x' ? 'active' : ''}" data-axis="x">X</button>
              <button type="button" class="axis-btn ${state.cutAxis === 'y' ? 'active' : ''}" data-axis="y">Y</button>
              <button type="button" class="axis-btn ${state.cutAxis === 'z' ? 'active' : ''}" data-axis="z">Z</button>
              <input type="range" id="cutSlider" min="-25" max="25" step="0.5" value="${state.cutPos}"/>
            </div>
          </div>
          <div class="toolbar-sep"></div>
          <button type="button" class="tool-btn" id="btnFitView">🎯 Fit</button>
        </div>

        <div id="stage" style="width:100%;height:100%"></div>
        <div class="stage-label">1 unit = 1 mm · Manifold Watertight CSG</div>
      </div>

      <!-- 3. RIGHT SIDEBAR: CONTEXTUAL IMPORT SOURCE & EXPORT -->
      <aside class="panel-right">
        <h2 style="font-size:1.1rem;margin:0 0 0.4rem;font-weight:700">🎨 Decoration</h2>
        <div class="tabs" id="importTabs" style="margin-bottom:0.6rem">
          <button type="button" class="subtab-btn ${state.importMode === 'text' ? 'active' : ''}" data-mode="text">Text</button>
          <button type="button" class="subtab-btn ${state.importMode === 'icon' ? 'active' : ''}" data-mode="icon">Icon</button>
          <button type="button" class="subtab-btn ${state.importMode === 'image' ? 'active' : ''}" data-mode="image">Image</button>
          <button type="button" class="subtab-btn ${state.importMode === 'svg' ? 'active' : ''}" data-mode="svg">SVG</button>
          <button type="button" class="subtab-btn ${state.importMode === 'blocks' ? 'active' : ''}" data-mode="blocks">Blocks</button>
        </div>

        <!-- IMPORT: TEXT -->
        <section id="panel-text" class="${state.importMode === 'text' ? '' : 'hidden'}">
          <div class="field">
            <label for="name">ข้อความปุ่ม (รองรับหลายบรรทัด)</label>
            <textarea id="name" rows="2" style="width:100%;padding:0.4rem;border-radius:8px;border:1px solid var(--border);background:var(--bg-soft);color:var(--text);font-family:inherit">${state.name}</textarea>
          </div>
          <div class="field">
            <label for="fontId">ฟอนต์ (รองรับภาษาไทย)</label>
            <select id="fontId">${fontSelectHtml(state.fontId)}</select>
          </div>
        </section>

        <!-- IMPORT: ICON -->
        <section id="panel-icon" class="${state.importMode === 'icon' ? '' : 'hidden'}">
          <div class="category-pills" id="iconCategoryPills">
            ${ICON_CATEGORIES.map(
              (cat) =>
                `<button type="button" class="cat-pill ${cat.id === state.iconCategory ? 'active' : ''}" data-cat="${cat.id}">${cat.label.split(' ')[0]}</button>`,
            ).join('')}
          </div>
          <input type="text" id="iconSearchInput" class="icon-search-input" placeholder="🔍 ค้นหาไอคอน (e.g. cat, star, flame)..." value="${state.iconSearch}"/>
          <div class="icon-grid" id="iconGrid"></div>
        </section>

        <!-- IMPORT: IMAGE -->
        <section id="panel-image" class="${state.importMode === 'image' ? '' : 'hidden'}">
          <div class="field">
            <label for="file">เลือกไฟล์รูปภาพ (PNG / JPG / WebP)</label>
            <input id="file" type="file" accept="image/*,.svg"/>
          </div>
          <div class="row">
            <div class="field">
              <label for="contrast">Contrast: <span id="contrastVal">${state.contrast}</span></label>
              <input id="contrast" type="range" min="-50" max="50" step="5" value="${state.contrast}"/>
            </div>
            <div class="field">
              <label for="brightness">Bright: <span id="brightVal">${state.brightness}</span></label>
              <input id="brightness" type="range" min="-50" max="50" step="5" value="${state.brightness}"/>
            </div>
          </div>
          <div class="field"><label><input id="knockOutWhite" type="checkbox" ${state.knockOutWhite ? 'checked' : ''}/> ลบพื้นหลังสีขาว</label></div>
          <div class="field">
            <label for="maxColors">จำนวนสี AMS: <span id="maxColorsVal">${state.maxColors}</span></label>
            <input id="maxColors" type="range" min="2" max="6" step="1" value="${state.maxColors}"/>
          </div>
          <img id="wizardPreview" class="wizard-preview hidden" alt="Preview"/>
          <div id="paletteSwatches" style="display:flex;gap:4px;margin-top:4px"></div>
        </section>

        <!-- IMPORT: SVG -->
        <section id="panel-svg" class="${state.importMode === 'svg' ? '' : 'hidden'}">
          <div class="field">
            <label for="svgFile">เลือกไฟล์ SVG เวกเตอร์</label>
            <input id="svgFile" type="file" accept=".svg,image/svg+xml"/>
          </div>
          <p class="hint">SVG จะถูกแปลงเป็น Rings อัตโนมัติและหล่อเป็น Solid นูนต่ำบนปุ่ม</p>
        </section>

        <!-- IMPORT: BLOCKS -->
        <section id="panel-blocks" class="${state.importMode === 'blocks' ? '' : 'hidden'}">
          <div class="field">
            <label for="blockPreset">รูปแบบ Fidget Blocks</label>
            <select id="blockPreset">
              ${Object.entries(BLOCK_PRESETS)
                .map(([id, p]) => `<option value="${id}" ${state.blockPreset === id ? 'selected' : ''}>${p.name}</option>`)
                .join('')}
            </select>
          </div>
          <div class="field" style="display:flex;align-items:center;gap:0.5rem;margin-top:0.4rem">
            <input type="checkbox" id="blockBorders" ${state.blockBorders ? 'checked' : ''} style="width:16px;height:16px;accent-color:#f97316"/>
            <label for="blockBorders" style="margin:0;cursor:pointer">เส้นขอบแบ่งปุ่ม (Borders)</label>
          </div>
          <div class="field" style="display:flex;align-items:center;gap:0.5rem;margin-top:0.2rem">
            <input type="checkbox" id="blockSolidFloor" ${state.blockSolidFloor ? 'checked' : ''} style="width:16px;height:16px;accent-color:#f97316"/>
            <label for="blockSolidFloor" style="margin:0;cursor:pointer">พื้นล่างตันเรียบ 100% (Solid Bottom)</label>
          </div>
          <div class="field" style="margin-top:0.4rem">
            <label for="keycapProfile">ทรงคีย์แคป (Keycap Profile)</label>
            <select id="keycapProfile">
              <option value="standard" ${state.keycapProfile === 'standard' ? 'selected' : ''}>Standard (OEM Tapered สโลปสอบ)</option>
              <option value="flat" ${state.keycapProfile === 'flat' ? 'selected' : ''}>Flat (ขอบตรงระนาบเดียว)</option>
            </select>
          </div>
          <div class="field">
            <label for="blockName">ข้อความบนปุ่ม (กระจาย 1 ตัวต่อ 1 ปุ่ม)</label>
            <input type="text" id="blockName" value="${state.name}" placeholder="เช่น Name, WASD, 1234, คำไผ่" style="width:100%;box-sizing:border-box;padding:0.4rem;border-radius:8px;border:1px solid var(--border);background:var(--bg-soft);color:var(--text);font-family:inherit"/>
            <span class="hint" id="blockHint" style="display:block;margin-top:0.35rem">ตัวอย่าง: "Name" ➔ ปุ่ม 1: N, ปุ่ม 2: a, ปุ่ม 3: m, ปุ่ม 4: e</span>
          </div>
        </section>

        <!-- COMMON SIZING SLIDERS -->
        <div style="border-top:1px solid var(--border);padding-top:0.6rem">
          <div class="field">
            <label for="letterSize">ขนาดลวดลาย (mm): <span id="letterSizeVal">${state.letterSize}</span></label>
            <input id="letterSize" type="range" min="6" max="22" step="0.5" value="${state.letterSize}"/>
          </div>
          <div class="field">
            <label for="letterDepth">ความนูนลาย (mm): <span id="letterDepthVal">${state.letterDepth}</span></label>
            <input id="letterDepth" type="range" min="0.4" max="2.5" step="0.1" value="${state.letterDepth}"/>
          </div>
        </div>

        <!-- PRIMARY EXPORT ACTIONS -->
        <div style="margin-top:auto;display:flex;flex-direction:column;gap:0.45rem">
          <button class="btn primary" id="export3mf" style="padding:0.75rem 1rem;font-size:0.95rem">
            📥 ดาวน์โหลด 3MF (Bambu Studio)
          </button>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem">
            <button class="btn" id="exportStl">STL + Cover</button>
            <button class="btn" id="saveProj">บันทึก JSON</button>
          </div>
          <label class="btn" style="text-align:center;cursor:pointer">
            โหลด JSON <input id="loadProj" type="file" accept="application/json,.json" hidden/>
          </label>
        </div>

        <div class="status" id="status" style="margin-top:0.4rem">โหลด…</div>
        ${PRINT_TIPS_CLICKER}
      </aside>
    </div>`,
});

// 8. Studio Viewer & Core Instances
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
  const snapshot: State = { ...state, modular: { ...state.modular }, fit: { ...state.fit } };
  lockExport();
  setStatus(statusEl, 'กำลังสร้างโมเดล 3D…', 'warn');
  try {
    const { group, parts, warnings } = await build(snapshot);
    if (currentRevision !== revision) {
      disposeObject3D(group);
      return;
    }
    lastParts = parts;
    viewer.setRoot(group);
    viewer.setExplodedZ(snapshot.exploded ? 14 : 0);
    viewer.fitToObject(2.0);
    writeHashParams({
      name: state.name,
      size: state.size,
      mode: state.importMode,
      product: state.productMode,
    });
    q<HTMLSelectElement>('fontId').value = state.fontId;
    checklist?.refresh({
      studio: 'clicker',
      clickerKind: state.productMode,
      colorMode: state.colorMode,
      keychain: state.keychain,
      partCount: parts.length,
    });
    setStatus(
      statusEl,
      warnings.length ? warnings.join(' · ') : `พร้อมพิมพ์ · ${parts.length} ชิ้นส่วนสมบูรณ์`,
      warnings.length ? 'warn' : 'ok',
    );
    readyRevision = currentRevision;
    q<HTMLButtonElement>('export3mf').disabled = false;
    q<HTMLButtonElement>('exportStl').disabled = false;
    try {
      saveProject('clicker', state);
    } catch {
      /* storage quota ignore */
    }
  } catch (e) {
    if (currentRevision !== revision) return;
    lastParts = [];
    setStatus(statusEl, e instanceof Error ? e.message : String(e), 'err');
  }
}

const scheduleBuild = debounce(() => void rebuild(), 220);
const rebuildDebounced = () => {
  revision++;
  readyRevision = -1;
  lockExport();
  scheduleBuild();
};

// 9. Render Icon Catalog Grid
function renderIcons() {
  const grid = document.querySelector('#iconGrid');
  if (!grid) return;
  const list = state.iconSearch
    ? searchIcons(state.iconSearch)
    : ICON_CATEGORIES.find((c) => c.id === state.iconCategory)?.iconNames ||
      ICON_CATEGORIES[0]!.iconNames;

  grid.innerHTML = list
    .map((name) => {
      const svg = getIconSvg(name, '#38bdf8');
      const active = state.selectedIcon === name ? 'active' : '';
      return `<button type="button" class="icon-card ${active}" data-name="${name}">
        ${svg || ''}
        <span>${name}</span>
      </button>`;
    })
    .join('');

  grid.querySelectorAll('.icon-card').forEach((card) => {
    card.addEventListener('click', () => {
      state.selectedIcon = (card as HTMLElement).getAttribute('data-name') || 'Heart';
      grid.querySelectorAll('.icon-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      rebuildDebounced();
    });
  });
}

// 10. Left Panel Tabs Switching
document.querySelectorAll('#leftSubtabs .subtab-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const tab = (e.currentTarget as HTMLElement).getAttribute('data-tab') as LeftTab;
    state.activeLeftTab = tab;
    document.querySelectorAll('#leftSubtabs .subtab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    ['shape', 'body', 'colors', 'fit', 'keychain', 'modular'].forEach((t) => {
      document.querySelector(`#tab-${t}`)?.classList.toggle('hidden', t !== tab);
    });
  });
});

// 11. Right Panel Import Tabs Switching
document.querySelectorAll('#importTabs .subtab-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const mode = (e.currentTarget as HTMLElement).getAttribute('data-mode') as ImportMode;
    state.importMode = mode;
    document.querySelectorAll('#importTabs .subtab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    ['text', 'icon', 'image', 'svg', 'blocks'].forEach((m) => {
      document.querySelector(`#panel-${m}`)?.classList.toggle('hidden', m !== mode);
    });
    if (mode === 'icon') renderIcons();
    rebuildDebounced();
  });
});

// 12. Icon Categories & Search
document.querySelectorAll('#iconCategoryPills .cat-pill').forEach((pill) => {
  pill.addEventListener('click', (e) => {
    state.iconCategory = (e.currentTarget as HTMLElement).getAttribute('data-cat') || 'popular';
    document.querySelectorAll('#iconCategoryPills .cat-pill').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    state.iconSearch = '';
    q<HTMLInputElement>('iconSearchInput').value = '';
    renderIcons();
  });
});
q<HTMLInputElement>('iconSearchInput').oninput = (e) => {
  state.iconSearch = (e.target as HTMLInputElement).value;
  renderIcons();
};

// 13. Viewport Toolbar Event Bindings
q<HTMLButtonElement>('btnViewAssembled').onclick = () => {
  state.exploded = false;
  q('btnViewAssembled').classList.add('active');
  q('btnViewExploded').classList.remove('active');
  viewer.setExplodedZ(0);
};
q<HTMLButtonElement>('btnViewExploded').onclick = () => {
  state.exploded = true;
  q('btnViewExploded').classList.add('active');
  q('btnViewAssembled').classList.remove('active');
  viewer.setExplodedZ(14);
};
q<HTMLButtonElement>('btnToggleCut').onclick = () => {
  state.cutActive = !state.cutActive;
  q('btnToggleCut').classList.toggle('active', state.cutActive);
  q('cutControls').classList.toggle('hidden', !state.cutActive);
  if (state.cutActive) {
    viewer.setClipping(state.cutAxis, state.cutPos);
  } else {
    viewer.setClipping(null, 0);
  }
};
document.querySelectorAll('.axis-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const axis = (e.currentTarget as HTMLElement).getAttribute('data-axis') as 'x' | 'y' | 'z';
    state.cutAxis = axis;
    document.querySelectorAll('.axis-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if (state.cutActive) viewer.setClipping(axis, state.cutPos);
  });
});
q<HTMLInputElement>('cutSlider').oninput = (e) => {
  state.cutPos = Number((e.target as HTMLInputElement).value);
  if (state.cutActive) viewer.setClipping(state.cutAxis, state.cutPos);
};
q<HTMLButtonElement>('btnFitView').onclick = () => {
  viewer.fitToObject(2.0);
};

// 14. 1-Click Fit Test Strip 3MF Generator
q<HTMLButtonElement>('btnFitTestStrip').onclick = async () => {
  try {
    setStatus(statusEl, 'กำลังสร้างแผ่นทดสอบความฟิต Fit Strip…', 'warn');
    const m = await getManifold();
    const parts = await createFitTestStripSolids(m);
    await exportParts(parts, 'clicker-fit-test-strip', '3mf');
    setStatus(statusEl, 'ดาวน์โหลดไฟล์ Fit Test Strip 3MF แล้ว!', 'ok');
  } catch (err) {
    setStatus(statusEl, err instanceof Error ? err.message : String(err), 'err');
  }
};

// 15. Form Inputs Event Handlers
q<HTMLSelectElement>('baseShape').value = state.baseShape;
q<HTMLSelectElement>('baseShape').onchange = (e) => {
  state.baseShape = (e.target as HTMLSelectElement).value as BaseShape;
  rebuildDebounced();
};
q<HTMLInputElement>('lockBaseSize').onchange = (e) => {
  state.lockBaseSize = (e.target as HTMLInputElement).checked;
  q('lockSizeControls').classList.toggle('hidden', !state.lockBaseSize);
  rebuildDebounced();
};
q<HTMLInputElement>('baseWidth').oninput = (e) => {
  state.baseWidth = Number((e.target as HTMLInputElement).value);
  q('widthVal').textContent = String(state.baseWidth);
  rebuildDebounced();
};
q<HTMLInputElement>('baseHeight').oninput = (e) => {
  state.baseHeight = Number((e.target as HTMLInputElement).value);
  q('heightVal').textContent = String(state.baseHeight);
  rebuildDebounced();
};
q<HTMLInputElement>('turn').oninput = (e) => {
  state.turn = Number((e.target as HTMLInputElement).value);
  q('turnVal').textContent = String(state.turn);
  rebuildDebounced();
};
q<HTMLInputElement>('stemFit').oninput = (e) => {
  state.fit.stemFit = Number((e.target as HTMLInputElement).value);
  q('stemFitVal').textContent = state.fit.stemFit.toFixed(2);
  rebuildDebounced();
};
q<HTMLInputElement>('pocketFit').oninput = (e) => {
  state.fit.pocketFit = Number((e.target as HTMLInputElement).value);
  q('pocketFitVal').textContent = state.fit.pocketFit.toFixed(2);
  rebuildDebounced();
};
q<HTMLInputElement>('topBaseGap').oninput = (e) => {
  state.fit.topBaseGap = Number((e.target as HTMLInputElement).value);
  q('gapVal').textContent = state.fit.topBaseGap.toFixed(2);
  rebuildDebounced();
};
q<HTMLInputElement>('size').oninput = (e) => {
  state.size = Number((e.target as HTMLInputElement).value);
  q('sizeVal').textContent = String(state.size);
  rebuildDebounced();
};
q<HTMLInputElement>('thick').oninput = (e) => {
  state.thick = Number((e.target as HTMLInputElement).value);
  q('thickVal').textContent = String(state.thick);
  rebuildDebounced();
};
q<HTMLInputElement>('letterSize').oninput = (e) => {
  state.letterSize = Number((e.target as HTMLInputElement).value);
  q('letterSizeVal').textContent = String(state.letterSize);
  rebuildDebounced();
};
q<HTMLInputElement>('letterDepth').oninput = (e) => {
  state.letterDepth = Number((e.target as HTMLInputElement).value);
  q('letterDepthVal').textContent = String(state.letterDepth);
  rebuildDebounced();
};
for (const id of ['bodyColor', 'capColor', 'textColor'] as const) {
  q<HTMLInputElement>(id).oninput = (e) => {
    state[id] = (e.target as HTMLInputElement).value;
    rebuildDebounced();
  };
}
q<HTMLSelectElement>('bodyPreset').onchange = (e) => {
  state.bodyColor = (e.target as HTMLSelectElement).value;
  q<HTMLInputElement>('bodyColor').value = state.bodyColor;
  rebuildDebounced();
};
q<HTMLSelectElement>('colorMode').value = state.colorMode;
q<HTMLSelectElement>('colorMode').onchange = (e) => {
  state.colorMode = (e.target as HTMLSelectElement).value as ColorMode;
  rebuildDebounced();
};
q<HTMLTextAreaElement>('name').oninput = (e) => {
  state.name = (e.target as HTMLTextAreaElement).value || 'คำไผ่';
  q<HTMLInputElement>('blockName').value = state.name;
  rebuildDebounced();
};
q<HTMLInputElement>('blockName').oninput = (e) => {
  state.name = (e.target as HTMLInputElement).value || 'Name';
  q<HTMLTextAreaElement>('name').value = state.name;
  rebuildDebounced();
};
q<HTMLSelectElement>('fontId').onchange = (e) => {
  state.fontId = (e.target as HTMLSelectElement).value;
  rebuildDebounced();
};
q<HTMLSelectElement>('blockPreset').onchange = (e) => {
  state.blockPreset = (e.target as HTMLSelectElement).value as BlockPreset;
  rebuildDebounced();
};
q<HTMLInputElement>('blockBorders').onchange = (e) => {
  state.blockBorders = (e.target as HTMLInputElement).checked;
  rebuildDebounced();
};
q<HTMLInputElement>('blockSolidFloor').onchange = (e) => {
  state.blockSolidFloor = (e.target as HTMLInputElement).checked;
  rebuildDebounced();
};
q<HTMLSelectElement>('keycapProfile').onchange = (e) => {
  state.keycapProfile = (e.target as HTMLSelectElement).value as 'standard' | 'flat';
  rebuildDebounced();
};
q<HTMLInputElement>('keychain').onchange = (e) => {
  state.keychain = (e.target as HTMLInputElement).checked;
  rebuildDebounced();
};
q<HTMLSelectElement>('keychainStyle').value = state.keychainStyle;
q<HTMLSelectElement>('keychainStyle').onchange = (e) => {
  state.keychainStyle = (e.target as HTMLSelectElement).value as 'loop' | 'hole';
  rebuildDebounced();
};

// 16. Image Wizard Handlers
async function runImageWizard(file: File) {
  lastImageFile = file;
  const result = await processImageWizard(file, state.letterSize * 1.8, {
    maxColors: state.maxColors,
    cropMargin: state.cropMargin,
    knockOutWhite: state.knockOutWhite,
    contrast: state.contrast,
    brightness: state.brightness,
    maxSide: 180,
  });
  imageRegions = result.regions;
  palettePreview = result.palette.map((rgb) => rgbToHex(rgb));
  wizardPreviewUrl = result.previewUrl;
  const host = document.querySelector('#paletteSwatches');
  const img = document.querySelector<HTMLImageElement>('#wizardPreview');
  if (host) {
    host.innerHTML = palettePreview
      .map((hex) => `<button type="button" class="swatch" style="background:${hex}"></button>`)
      .join('');
  }
  if (img && wizardPreviewUrl) {
    img.src = wizardPreviewUrl;
    img.classList.remove('hidden');
  }
}

q<HTMLInputElement>('file').onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  state.importMode = 'image';
  await runImageWizard(file);
  rebuildDebounced();
};
q<HTMLInputElement>('svgFile').onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  state.importMode = 'svg';
  imageRegions = await svgTextToRegions(await file.text(), state.letterSize * 1.6, state.maxColors);
  rebuildDebounced();
};
q<HTMLInputElement>('contrast').oninput = (e) => {
  state.contrast = Number((e.target as HTMLInputElement).value);
  q('contrastVal').textContent = String(state.contrast);
  if (lastImageFile) void runImageWizard(lastImageFile).then(() => rebuildDebounced());
};
q<HTMLInputElement>('brightness').oninput = (e) => {
  state.brightness = Number((e.target as HTMLInputElement).value);
  q('brightVal').textContent = String(state.brightness);
  if (lastImageFile) void runImageWizard(lastImageFile).then(() => rebuildDebounced());
};
q<HTMLInputElement>('knockOutWhite').onchange = (e) => {
  state.knockOutWhite = (e.target as HTMLInputElement).checked;
  if (lastImageFile) void runImageWizard(lastImageFile).then(() => rebuildDebounced());
};
q<HTMLInputElement>('maxColors').oninput = (e) => {
  state.maxColors = Number((e.target as HTMLInputElement).value);
  q('maxColorsVal').textContent = String(state.maxColors);
  if (lastImageFile) void runImageWizard(lastImageFile).then(() => rebuildDebounced());
};

// 17. Modular Settings Handlers
q<HTMLSelectElement>('productMode').onchange = (e) => {
  state.productMode = (e.target as HTMLSelectElement).value === 'modular' ? 'modular' : 'classic';
  q('modularSubControls').classList.toggle('hidden', state.productMode !== 'modular');
  rebuildDebounced();
};
q<HTMLInputElement>('moduleCount').value = String(state.modular.count);
q<HTMLInputElement>('moduleCount').oninput = (e) => {
  state.modular.count = Number((e.target as HTMLInputElement).value);
  q('moduleCountVal').textContent = String(state.modular.count);
  rebuildDebounced();
};
for (const [id, key] of [
  ['moduleBaseColor', 'baseColor'],
  ['moduleHeadColor', 'headColor'],
] as const) {
  q<HTMLInputElement>(id).value = state.modular[key];
  q<HTMLInputElement>(id).oninput = (e) => {
    state.modular[key] = (e.target as HTMLInputElement).value;
    rebuildDebounced();
  };
}
q<HTMLSelectElement>('moduleView').value = state.modular.view;
q<HTMLSelectElement>('moduleView').onchange = (e) => {
  state.modular.view = (e.target as HTMLSelectElement).value as ModularSettings['view'];
  rebuildDebounced();
};
q<HTMLSelectElement>('moduleExportSet').value = state.modular.exportSet;
q<HTMLSelectElement>('moduleExportSet').onchange = (e) => {
  state.modular.exportSet = (e.target as HTMLSelectElement).value as ModularSettings['exportSet'];
  rebuildDebounced();
};

// 18. Export & Save Actions
q<HTMLButtonElement>('export3mf').onclick = () => {
  if (readyRevision !== revision || !lastParts.length) return;
  try {
    const base =
      state.productMode === 'modular'
        ? `modular-${state.modular.exportSet}-${lastParts.length}-parts`
        : state.importMode === 'blocks'
        ? `fidget-block-${state.blockPreset}-${state.name.replace(/\s+/g, '_')}`
        : `clicker-${state.baseShape}-${state.name.replace(/\s+/g, '_')}`;
    exportParts(lastParts, base, '3mf');
    captureCoverPng(viewer, base);
  } catch (e) {
    setStatus(statusEl, e instanceof Error ? e.message : String(e), 'err');
  }
};
q<HTMLButtonElement>('exportStl').onclick = () => {
  if (readyRevision !== revision || !lastParts.length) return;
  if (state.productMode === 'modular') {
    try {
      const bytes = buildStlZip(lastParts.map(groundPart), createCoverPng(viewer), MODULAR_GUIDE);
      downloadBlob(
        new Blob([new Uint8Array(bytes)], { type: 'application/zip' }),
        `modular-${state.modular.exportSet}-${lastParts.length}-parts.zip`,
      );
    } catch (e) {
      setStatus(statusEl, e instanceof Error ? e.message : String(e), 'err');
    }
    return;
  }
  const base =
    state.importMode === 'blocks'
      ? `fidget-block-${state.blockPreset}-${state.name.replace(/\s+/g, '_')}`
      : `clicker-${state.baseShape}-${state.name.replace(/\s+/g, '_')}`;
  exportParts(lastParts, base, 'stl');
  captureCoverPng(viewer, base);
};
q<HTMLButtonElement>('saveProj').onclick = () => {
  downloadProjectFile('clicker', state);
  setStatus(statusEl, 'บันทึก JSON สำเร็จ', 'ok');
};
q<HTMLInputElement>('loadProj').onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const proj = await readProjectFile(file);
    if (proj.studio !== 'clicker') throw new Error(`ไฟล์นี้เป็น studio "${proj.studio}"`);
    Object.assign(state, proj.data as Partial<State>);
    saveProject('clicker', state);
    location.reload();
  } catch (err) {
    setStatus(statusEl, err instanceof Error ? err.message : String(err), 'err');
  }
};

// 19. Initial Boot
renderIcons();
lockExport();
void rebuild();
void warmFonts().catch(() => {});
