import { zipSync, strToU8 } from 'fflate';
import type { RGB } from '../units';
import { downloadBlob } from './download';
import type { MeshArrays } from '../geometry/manifoldOps';

export type ExportPart = {
  name: string;
  mesh: MeshArrays;
  colorRgb: RGB;
  /** 1-based extruder slot */
  extruder?: number;
};

function writeBinaryStl(mesh: MeshArrays): ArrayBuffer {
  const { vertProperties: vp, triVerts: tv, numProp } = mesh;
  const triCount = tv.length / 3;
  const buf = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buf);
  view.setUint32(80, triCount, true);
  let o = 84;
  for (let t = 0; t < triCount; t++) {
    const i0 = tv[t * 3]!;
    const i1 = tv[t * 3 + 1]!;
    const i2 = tv[t * 3 + 2]!;
    const ax = vp[i0 * numProp]!;
    const ay = vp[i0 * numProp + 1]!;
    const az = vp[i0 * numProp + 2]!;
    const bx = vp[i1 * numProp]!;
    const by = vp[i1 * numProp + 1]!;
    const bz = vp[i1 * numProp + 2]!;
    const cx = vp[i2 * numProp]!;
    const cy = vp[i2 * numProp + 1]!;
    const cz = vp[i2 * numProp + 2]!;
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const inv = 1 / (Math.hypot(nx, ny, nz) || 1);
    view.setFloat32(o, nx * inv, true);
    view.setFloat32(o + 4, ny * inv, true);
    view.setFloat32(o + 8, nz * inv, true);
    o += 12;
    for (const [x, y, z] of [
      [ax, ay, az],
      [bx, by, bz],
      [cx, cy, cz],
    ] as const) {
      view.setFloat32(o, x, true);
      view.setFloat32(o + 4, y, true);
      view.setFloat32(o + 8, z, true);
      o += 12;
    }
    view.setUint16(o, 0, true);
    o += 2;
  }
  return buf;
}

function meshTo3mfObjectXml(part: ExportPart, id: number): { vertices: string; triangles: string } {
  const { vertProperties: vp, triVerts: tv, numProp } = part.mesh;
  const vertCount = vp.length / numProp;
  const verts: string[] = [];
  for (let i = 0; i < vertCount; i++) {
    const x = vp[i * numProp]!;
    const y = vp[i * numProp + 1]!;
    const z = vp[i * numProp + 2]!;
    verts.push(`<vertex x="${x.toFixed(4)}" y="${y.toFixed(4)}" z="${z.toFixed(4)}" />`);
  }
  const tris: string[] = [];
  for (let t = 0; t < tv.length; t += 3) {
    tris.push(
      `<triangle v1="${tv[t]}" v2="${tv[t + 1]}" v3="${tv[t + 2]}" pid="1" p1="${id - 1}" />`,
    );
  }
  return { vertices: verts.join(''), triangles: tris.join('') };
}

export function assignExtruders(parts: ExportPart[]): ExportPart[] {
  const map = new Map<string, number>();
  let next = 1;
  return parts.map((p) => {
    const key = p.colorRgb.join(',');
    let slot = map.get(key);
    if (!slot) {
      slot = next++;
      map.set(key, slot);
    }
    return { ...p, extruder: slot };
  });
}

export function build3mf(partsIn: ExportPart[]): Uint8Array {
  const parts = assignExtruders(partsIn);
  const basematerials = parts
    .map((p) => {
      const [r, g, b] = p.colorRgb;
      const hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      return `<base name="${p.name}" displaycolor="#${hex}FF" />`;
    })
    .join('');

  const resourcesObjects: string[] = [];
  const buildItems: string[] = [];
  parts.forEach((p, i) => {
    const id = i + 1;
    const { vertices, triangles } = meshTo3mfObjectXml(p, id);
    resourcesObjects.push(`
      <object id="${id}" type="model" name="${p.name}">
        <mesh>
          <vertices>${vertices}</vertices>
          <triangles>${triangles}</triangles>
        </mesh>
      </object>`);
    buildItems.push(`<item objectid="${id}" />`);
  });

  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US"
  xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
  xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <metadata name="Application">3D Creator Hub</metadata>
  <resources>
    <basematerials id="1">${basematerials}</basematerials>
    ${resourcesObjects.join('\n')}
  </resources>
  <build>
    ${buildItems.join('\n')}
  </build>
</model>`;

  // Bambu-style extruder hints
  const colorMap = parts
    .map((p) => `    <part id="${p.name}" extruder="${p.extruder ?? 1}" />`)
    .join('\n');
  const bambuConfig = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="1">
${colorMap}
  </object>
</config>`;

  const files: Record<string, Uint8Array> = {
    '3D/3dmodel.model': strToU8(model),
    'Metadata/model_settings.config': strToU8(bambuConfig),
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
  <Default Extension="config" ContentType="application/octet-stream"/>
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0"
    Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`),
  };

  return zipSync(files);
}

export function exportParts(
  parts: ExportPart[],
  basename: string,
  format: '3mf' | 'stl' = '3mf',
) {
  if (!parts.length) throw new Error('ไม่มีชิ้นส่วนสำหรับ export');
  if (format === 'stl') {
    // Merge all into one binary STL (loses color)
    const merged = mergeMeshes(parts.map((p) => p.mesh));
    downloadBlob(new Blob([writeBinaryStl(merged)], { type: 'model/stl' }), `${basename}.stl`);
    return;
  }
  const bytes = build3mf(parts);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  downloadBlob(new Blob([copy], { type: 'model/3mf' }), `${basename}.3mf`);
}

function mergeMeshes(meshes: MeshArrays[]): MeshArrays {
  let vCount = 0;
  let tCount = 0;
  for (const m of meshes) {
    vCount += m.vertProperties.length / m.numProp;
    tCount += m.triVerts.length;
  }
  const numProp = meshes[0]?.numProp ?? 3;
  const vertProperties = new Float32Array(vCount * numProp);
  const triVerts = new Uint32Array(tCount);
  let vo = 0;
  let to = 0;
  let vBase = 0;
  for (const m of meshes) {
    vertProperties.set(m.vertProperties, vo);
    vo += m.vertProperties.length;
    for (let i = 0; i < m.triVerts.length; i++) {
      triVerts[to++] = m.triVerts[i]! + vBase;
    }
    vBase += m.vertProperties.length / m.numProp;
  }
  return { vertProperties, triVerts, numProp };
}
