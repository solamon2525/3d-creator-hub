import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  if (path.startsWith('/')) path = path.slice(1);
  return `${base}${path}`;
}

export function mountShell(options: {
  title: string;
  active: 'hub' | 'keycap' | 'clicker' | 'mascot';
  bodyHtml: string;
}): HTMLElement {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('#app missing');

  const links = [
    { id: 'hub', href: withBase(''), label: 'Hub' },
    { id: 'keycap', href: withBase('keycap/'), label: 'Keycap' },
    { id: 'clicker', href: withBase('clicker/'), label: 'Clicker' },
    { id: 'mascot', href: withBase('mascot/'), label: 'Mascot' },
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

export interface StudioViewer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  root: THREE.Group;
  setRoot(object: THREE.Object3D): void;
  dispose(): void;
}

export function createStudioViewer(container: HTMLElement): StudioViewer {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1224);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(4.5, 3.5, 6);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0.6, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 1.1);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(4, 8, 5);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0x38bdf8, 0.35);
  fill.position.set(-4, 2, -3);
  scene.add(fill);

  const grid = new THREE.GridHelper(10, 20, 0x334155, 0x1e293b);
  scene.add(grid);

  const root = new THREE.Group();
  scene.add(root);

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
      while (root.children.length) root.remove(root.children[0]!);
      root.add(object);
    },
    dispose() {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      container.innerHTML = '';
    },
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportStl(object: THREE.Object3D, filename: string) {
  const exporter = new STLExporter();
  const result = exporter.parse(object, { binary: false });
  downloadBlob(new Blob([result], { type: 'model/stl' }), filename);
}

export function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}
