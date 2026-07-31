import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { MeshArrays } from './geometry/manifoldOps';
import { downloadBlob } from './export/download';

export { downloadBlob } from './export/download';

export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  if (path.startsWith('/')) path = path.slice(1);
  return `${base}${path}`;
}

export function mountShell(options: {
  title: string;
  active: 'hub' | 'keycap' | 'clicker' | 'mascot' | 'features';
  bodyHtml: string;
}): HTMLElement {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('#app missing');
  document.title = `${options.title} — 3D Creator Hub`;

  const links = [
    { id: 'hub', href: withBase(''), label: 'Hub' },
    { id: 'keycap', href: withBase('keycap/'), label: 'Keycap' },
    { id: 'clicker', href: withBase('clicker/'), label: 'Clicker' },
    { id: 'mascot', href: withBase('mascot/'), label: 'Mascot' },
    { id: 'features', href: withBase('features/'), label: 'ฟีเจอร์' },
  ] as const;

  root.innerHTML = `
    <header class="topbar">
      <a class="brand" href="${withBase('')}">
        <span class="brand-mark">3D</span>
        <span>Creator Hub</span>
      </a>
      <nav class="nav-links">
        ${links
          .map(
            (l) =>
              `<a href="${l.href}" class="${l.id === options.active ? 'active' : ''}">${l.label}</a>`,
          )
          .join('')}
      </nav>
    </header>
    ${options.bodyHtml}
  `;
  return root;
}

export function disposeObject3D(object: THREE.Object3D) {
  object.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!m) continue;
        const std = m as THREE.MeshStandardMaterial;
        std.map?.dispose();
        m.dispose();
      }
    }
  });
}

export interface StudioViewer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  root: THREE.Group;
  setRoot(object: THREE.Object3D): void;
  setExploded(gapMm: number): void;
  fitToObject(padding?: number): void;
  dispose(): void;
}

export function createStudioViewer(container: HTMLElement): StudioViewer {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1224);

  // Camera framed for mm-scale objects (~20–40 mm)
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
  camera.position.set(45, 35, 55);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 8, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 1.15));
  const dir = new THREE.DirectionalLight(0xffffff, 1.15);
  dir.position.set(40, 80, 50);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0x38bdf8, 0.35);
  fill.position.set(-40, 20, -30);
  scene.add(fill);

  const grid = new THREE.GridHelper(80, 16, 0x334155, 0x1e293b);
  scene.add(grid);

  const root = new THREE.Group();
  scene.add(root);
  let current: THREE.Object3D | null = null;
  const basePositions = new Map<THREE.Object3D, THREE.Vector3>();

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  let frame = 0;
  const tick = () => {
    frame = requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  };
  tick();

  return {
    scene,
    camera,
    renderer,
    controls,
    root,
    setRoot(object) {
      if (current) {
        root.remove(current);
        disposeObject3D(current);
      }
      current = object;
      root.add(object);
      basePositions.clear();
      object.children.forEach((c) => basePositions.set(c, c.position.clone()));
    },
    setExploded(gapMm) {
      if (!current) return;
      current.children.forEach((c, i) => {
        const base = basePositions.get(c) ?? c.position;
        c.position.set(base.x + i * gapMm, base.y, base.z);
      });
    },
    fitToObject(padding = 1.6) {
      if (!current) return;
      const box = new THREE.Box3().setFromObject(current);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1);
      const dist = maxDim * padding;
      controls.target.copy(center);
      camera.position.set(center.x + dist, center.y + dist * 0.7, center.z + dist);
      camera.near = Math.max(0.01, maxDim / 200);
      camera.far = maxDim * 50;
      camera.updateProjectionMatrix();
      controls.update();
    },
    dispose() {
      cancelAnimationFrame(frame);
      ro.disconnect();
      if (current) disposeObject3D(current);
      controls.dispose();
      renderer.dispose();
      container.innerHTML = '';
    },
  };
}

export function meshArraysToThree(
  mesh: MeshArrays,
  color: THREE.ColorRepresentation,
  opts: { raised?: boolean } = {},
): THREE.Mesh {
  const geo = new THREE.BufferGeometry();
  const { vertProperties: vp, triVerts: tv, numProp } = mesh;
  const vCount = vp.length / numProp;
  const positions = new Float32Array(vCount * 3);
  for (let i = 0; i < vCount; i++) {
    positions[i * 3] = vp[i * numProp]!;
    positions[i * 3 + 1] = vp[i * numProp + 1]!;
    positions[i * 3 + 2] = vp[i * numProp + 2]!;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(tv, 1));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.raised ? 0.35 : 0.45,
    metalness: opts.raised ? 0.12 : 0.05,
    emissive: opts.raised ? new THREE.Color(color).multiplyScalar(0.12) : 0x000000,
    polygonOffset: !!opts.raised,
    polygonOffsetFactor: opts.raised ? -2 : 0,
    polygonOffsetUnits: opts.raised ? -2 : 0,
  });
  return new THREE.Mesh(geo, mat);
}

export function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms = 180): T {
  let t = 0;
  return ((...args: Parameters<T>) => {
    window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  }) as T;
}

export function setStatus(el: HTMLElement | null, msg: string, kind: 'ok' | 'warn' | 'err' = 'ok') {
  if (!el) return;
  el.textContent = msg;
  el.dataset.kind = kind;
}

export function saveProject(key: string, data: unknown) {
  localStorage.setItem(`3dch:${key}`, JSON.stringify(data));
}

export function loadProject<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`3dch:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export type ProjectFileV1 = {
  version: 1;
  studio: string;
  savedAt: string;
  data: unknown;
};

export function downloadProjectFile(studio: string, data: unknown) {
  const payload: ProjectFileV1 = {
    version: 1,
    studio,
    savedAt: new Date().toISOString(),
    data,
  };
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    `3dch-${studio}.json`,
  );
  saveProject(studio, data);
}

export async function readProjectFile(file: File): Promise<ProjectFileV1> {
  const text = await file.text();
  const parsed = JSON.parse(text) as ProjectFileV1;
  if (parsed?.version !== 1 || typeof parsed.studio !== 'string' || parsed.data == null) {
    throw new Error('ไฟล์โปรเจกต์ไม่ถูกต้อง (ต้องการ version:1)');
  }
  return parsed;
}


export function writeHashParams(params: Record<string, string | number | boolean>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) sp.set(k, String(v));
  history.replaceState(null, '', `#${sp.toString()}`);
}

export function readHashParams(): Record<string, string> {
  const raw = location.hash.replace(/^#/, '');
  if (!raw) return {};
  const sp = new URLSearchParams(raw);
  const out: Record<string, string> = {};
  sp.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

export function exportGlb(object: THREE.Object3D, filename: string) {
  const exporter = new GLTFExporter();
  exporter.parse(
    object,
    (result) => {
      if (result instanceof ArrayBuffer) {
        downloadBlob(new Blob([result], { type: 'model/gltf-binary' }), filename);
      } else {
        downloadBlob(
          new Blob([JSON.stringify(result)], { type: 'model/gltf+json' }),
          filename.replace(/\.glb$/, '.gltf'),
        );
      }
    },
    (err) => console.error(err),
    { binary: true },
  );
}

export function captureCoverPng(
  viewer: StudioViewer,
  basename: string,
  opts: { width?: number; height?: number } = {},
) {
  const width = opts.width ?? 1280;
  const height = opts.height ?? 720;
  const { renderer, scene, camera, controls } = viewer;
  const prevW = renderer.domElement.width;
  const prevH = renderer.domElement.height;
  const prevAspect = camera.aspect;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  controls.update();
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  renderer.setSize(prevW, prevH, false);
  camera.aspect = prevAspect;
  camera.updateProjectionMatrix();
  const a = document.createElement('a');
  a.href = url;
  a.download = `${basename}-cover.png`;
  a.click();
}

