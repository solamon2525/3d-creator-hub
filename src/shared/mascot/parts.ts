import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { withBase } from '../studio';

export type MascotSlot = 'hair' | 'face' | 'body' | 'acc';

export type MascotPartDef = { id: string; label: string };

export const MASCOT_PARTS: Record<MascotSlot, MascotPartDef[]> = {
  hair: [
    { id: 'short', label: 'Short' },
    { id: 'spiky', label: 'Spiky' },
    { id: 'bob', label: 'Bob' },
    { id: 'none', label: 'Bald' },
  ],
  face: [
    { id: 'round', label: 'Round' },
    { id: 'happy', label: 'Happy' },
    { id: 'dot', label: 'Dot' },
  ],
  body: [{ id: 'default', label: 'Default' }],
  acc: [
    { id: 'none', label: 'ไม่มี' },
    { id: 'badge', label: 'Badge' },
  ],
};

export function mascotPartUrl(slot: MascotSlot, id: string): string {
  return withBase(`mascot/${slot}/${id}.glb`);
}

const cache = new Map<string, THREE.Group>();
const loader = new GLTFLoader();

function tint(root: THREE.Object3D, colors: { skin?: string; hair?: string; shirt?: string; pants?: string }) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial;
      if (!std?.color) continue;
      const n = (mesh.name || '').toLowerCase();
      if (n.includes('skin') && colors.skin) std.color.set(colors.skin);
      else if (n.includes('shirt') && colors.shirt) std.color.set(colors.shirt);
      else if (n.includes('pants') && colors.pants) std.color.set(colors.pants);
      else if (colors.hair && (n.includes('hair') || !n)) {
        // hair parts often unnamed — tint whole hair glb
        if (!n.includes('skin') && !n.includes('shirt') && !n.includes('pants')) {
          if (colors.hair && !colors.skin) std.color.set(colors.hair);
        }
      }
    }
  });
}

export async function loadMascotPart(
  slot: MascotSlot,
  id: string,
  tintColors?: { skin?: string; hair?: string; shirt?: string; pants?: string },
): Promise<THREE.Group | null> {
  if (id === 'none') return new THREE.Group();
  const url = mascotPartUrl(slot, id);
  let proto = cache.get(url);
  if (!proto) {
    try {
      const gltf = await loader.loadAsync(url);
      proto = gltf.scene as THREE.Group;
      cache.set(url, proto);
    } catch {
      return null;
    }
  }
  const clone = proto.clone(true);
  clone.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => m.clone());
    } else if (mesh.material) {
      mesh.material = mesh.material.clone();
    }
  });
  if (slot === 'hair' && tintColors?.hair) {
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        if (std?.color) std.color.set(tintColors.hair!);
      }
    });
  } else if (tintColors) {
    tint(clone, tintColors);
  }
  if (slot === 'hair') clone.position.set(0, 20.5, 0);
  if (slot === 'face') clone.position.set(0, 19.5, 0);
  return clone;
}

export async function assembleMascotFromGlb(opts: {
  hair: string;
  face: string;
  acc: string;
  skin: string;
  hairColor: string;
  shirt: string;
  pants: string;
  blush: boolean;
  name: string;
}): Promise<{ group: THREE.Group; usedGlb: boolean; missing: string[] }> {
  const missing: string[] = [];
  const g = new THREE.Group();
  const colors = {
    skin: opts.skin,
    hair: opts.hairColor,
    shirt: opts.shirt,
    pants: opts.pants,
  };

  const body = await loadMascotPart('body', 'default', colors);
  const head = await loadMascotPart('body', 'head', colors);
  if (!body || !head) {
    return { group: g, usedGlb: false, missing: ['body'] };
  }
  g.add(body, head);

  if (opts.hair !== 'none') {
    const hair = await loadMascotPart('hair', opts.hair, { hair: opts.hairColor });
    if (hair) g.add(hair);
    else missing.push(`hair/${opts.hair}`);
  }

  const face = await loadMascotPart('face', opts.face);
  if (face) g.add(face);
  else missing.push(`face/${opts.face}`);

  if (opts.acc !== 'none') {
    const acc = await loadMascotPart('acc', opts.acc);
    if (acc) g.add(acc);
    else missing.push(`acc/${opts.acc}`);
  }

  if (opts.blush) {
    const blushMat = new THREE.MeshStandardMaterial({
      color: '#fb7185',
      transparent: true,
      opacity: 0.55,
    });
    for (const x of [-2.8, 2.8]) {
      const b = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12), blushMat);
      b.position.set(x, 18.6, 4.3);
      g.add(b);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(15,23,42,0.9)';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 28px Sarabun, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.name.slice(0, 12), 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 3.5),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true }),
  );
  plate.position.set(0, 0.5, 11);
  g.add(plate);

  return { group: g, usedGlb: true, missing };
}
