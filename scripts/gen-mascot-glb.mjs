/**
 * Generate procedural mascot GLB parts into public/mascot/.
 * Run: node scripts/gen-mascot-glb.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// GLTFExporter expects browser FileReader
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    result = null;
    onloadend = null;
    onerror = null;
    readAsArrayBuffer(blob) {
      Promise.resolve(blob.arrayBuffer())
        .then((buf) => {
          this.result = buf;
          this.onloadend?.({ target: this });
        })
        .catch((err) => this.onerror?.(err));
    }
  };
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = path.join(root, 'public', 'mascot');

function mat(hex) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55, metalness: 0.05 });
}

function saveGlb(object, filePath) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      object,
      (result) => {
        if (!(result instanceof ArrayBuffer)) {
          reject(new Error('expected binary glb'));
          return;
        }
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, Buffer.from(result));
        console.log('wrote', path.relative(root, filePath));
        resolve();
      },
      reject,
      { binary: true },
    );
  });
}

async function main() {
  // hair/short
  {
    const g = new THREE.Group();
    g.name = 'hair_short';
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      mat('#1e293b'),
    );
    m.position.set(0, 1, 0);
    g.add(m);
    await saveGlb(g, path.join(outRoot, 'hair', 'short.glb'));
  }
  // hair/bob
  {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.SphereGeometry(5.5, 24, 16), mat('#1e293b'));
    m.scale.set(1.05, 0.9, 1.05);
    g.add(m);
    await saveGlb(g, path.join(outRoot, 'hair', 'bob.glb'));
  }
  // hair/spiky
  {
    const g = new THREE.Group();
    for (const [x, z] of [
      [0, 1.5],
      [-2.2, 0.5],
      [2.2, 0.5],
    ]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4.5, 8), mat('#1e293b'));
      spike.position.set(x, 4, z);
      g.add(spike);
    }
    await saveGlb(g, path.join(outRoot, 'hair', 'spiky.glb'));
  }
  // face/round
  {
    const g = new THREE.Group();
    for (const x of [-1.6, 1.6]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 12), mat('#0f172a'));
      e.position.set(x, 0.3, 4.2);
      g.add(e);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.18, 8, 16, Math.PI), mat('#be123c'));
    mouth.position.set(0, -1.7, 4.4);
    mouth.rotation.x = Math.PI;
    g.add(mouth);
    await saveGlb(g, path.join(outRoot, 'face', 'round.glb'));
  }
  // face/happy
  {
    const g = new THREE.Group();
    for (const x of [-1.6, 1.6]) {
      const e = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.25, 8, 16, Math.PI), mat('#0f172a'));
      e.position.set(x, 0.3, 4.2);
      e.rotation.x = Math.PI;
      g.add(e);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.18, 8, 16, Math.PI), mat('#be123c'));
    mouth.position.set(0, -1.7, 4.4);
    mouth.rotation.x = Math.PI;
    g.add(mouth);
    await saveGlb(g, path.join(outRoot, 'face', 'happy.glb'));
  }
  // face/dot
  {
    const g = new THREE.Group();
    for (const x of [-1.6, 1.6]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 12), mat('#0f172a'));
      e.position.set(x, 0.3, 4.2);
      g.add(e);
    }
    await saveGlb(g, path.join(outRoot, 'face', 'dot.glb'));
  }
  // body/default — torso + limbs (no head)
  {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(5.5, 28, 20), mat('#38bdf8'));
    body.scale.set(1, 1.15, 0.9);
    body.position.y = 10.5;
    body.name = 'shirt';
    g.add(body);
    for (const x of [-2.2, 2.2]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 7, 16), mat('#0f172a'));
      leg.position.set(x, 3.5, 0);
      leg.name = 'pants';
      g.add(leg);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), mat('#111827'));
      shoe.scale.set(1, 0.55, 1.35);
      shoe.position.set(x, 0.8, 0.8);
      g.add(shoe);
    }
    for (const [x, rot] of [
      [-7, 0.35],
      [7, -0.35],
    ]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 4.5, 6, 10), mat('#ffd7b5'));
      arm.position.set(x, 10.5, 0);
      arm.rotation.z = rot;
      arm.name = 'skin';
      g.add(arm);
    }
    await saveGlb(g, path.join(outRoot, 'body', 'default.glb'));
  }
  // body/head
  {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(4.8, 32, 24), mat('#ffd7b5'));
    head.position.y = 19.5;
    head.name = 'skin';
    g.add(head);
    for (const x of [-4.5, 4.5]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 10), mat('#ffd7b5'));
      ear.position.set(x, 19.5, 0);
      ear.name = 'skin';
      g.add(ear);
    }
    await saveGlb(g, path.join(outRoot, 'body', 'head.glb'));
  }
  // acc/badge
  {
    const g = new THREE.Group();
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.35, 24), mat('#f59e0b'));
    badge.rotation.x = Math.PI / 2;
    badge.position.set(3.2, 12.5, 4.2);
    g.add(badge);
    await saveGlb(g, path.join(outRoot, 'acc', 'badge.glb'));
  }
  // acc/none — empty group marker
  {
    const g = new THREE.Group();
    g.name = 'none';
    await saveGlb(g, path.join(outRoot, 'acc', 'none.glb'));
  }

  fs.writeFileSync(
    path.join(outRoot, 'manifest.json'),
    JSON.stringify(
      {
        hair: ['short', 'spiky', 'bob'],
        face: ['round', 'happy', 'dot'],
        body: ['default', 'head'],
        acc: ['none', 'badge'],
      },
      null,
      2,
    ),
  );
  console.log('manifest ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
