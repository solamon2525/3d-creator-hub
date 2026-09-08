import type { ManifoldToplevel, Manifold, CrossSection } from 'manifold-3d';
import type { MeshArrays } from '../shared/geometry/manifoldOps';
import type { ExportPart } from '../shared/export/parts';
import { hexToRgb } from '../shared/units';

export type ModularSettings = {
  count: number;
  baseColor: string;
  headColor: string;
  tailColor: string;
  exportSet: 'prototype' | 'quantity';
  view: 'assembled' | 'exploded' | 'print';
};
export const DEFAULT_MODULAR: ModularSettings = {
  count: 1, baseColor: '#f2914c', headColor: '#6e9fc2', tailColor: '#a1aebb',
  exportSet: 'prototype', view: 'assembled',
};
export function normalizeModular(value: unknown): ModularSettings {
  const v = value && typeof value === 'object' ? value as Partial<ModularSettings> : {};
  const color = (c: unknown, fallback: string) => typeof c === 'string' && /^#[\da-f]{6}$/i.test(c) ? c : fallback;
  return {
    count: typeof v.count === 'number' && Number.isFinite(v.count) ? Math.min(8, Math.max(1, Math.round(v.count))) : 1,
    baseColor: color(v.baseColor, DEFAULT_MODULAR.baseColor), headColor: color(v.headColor, DEFAULT_MODULAR.headColor),
    tailColor: color(v.tailColor, DEFAULT_MODULAR.tailColor), exportSet: v.exportSet === 'quantity' ? 'quantity' : 'prototype',
    view: v.view === 'print' || v.view === 'exploded' ? v.view : 'assembled',
  };
}

/** Same three solids as the accepted Python CAD, Z-up in millimeters. */
export function createModularSolids({ Manifold: M, CrossSection: C }: ManifoldToplevel): Manifold[] {
  const owned: Array<Manifold | CrossSection> = [];
  const keep = <T extends Manifold | CrossSection>(o: T): T => { owned.push(o); return o; };
  let result: Manifold[] = [];
  try {
    const move = (s: Manifold, x = 0, y = 0, z = 0) => keep(s.translate([x, y, z]));
    const box = (x: number, y: number, z: number, cx = 0, cy = 0, cz = 0) => move(keep(M.cube([x, y, z])), cx-x/2, cy-y/2, cz);
    const round = (x: number, y: number, r: number, z: number) => keep(keep(keep(C.square([x-2*r, y-2*r], true)).offset(r, 'Round', 2, 32)).extrude(z));
    const sub = (a: Manifold, b: Manifold) => keep(M.difference(a, b));
    const add = (a: Manifold, b: Manifold) => keep(M.union(a, b));
    const profile = keep(new C([[[11.6,-1.5],[12,-1.5],[14.4,-3],[14.4,3],[12,1.5],[11.6,1.5]]]));
    const rail = move(keep(profile.extrude(10.2)),0,0,1.2);
    const wedge = keep(M.hull([-10,10].flatMap(y => [
      [12.6,y,-3.8], [15.4,y,-3.8], [15.4,y,4], [12.6,y,1.2],
    ] as [number,number,number][])));
    const male = sub(rail, wedge);
    const female = move(keep(keep(profile.offset(.2, 'Miter')).extrude(13.5)), -24,0,1.2);
    let base = sub(round(24,24,.8,12.5), box(17,17,9.5,0,0,1.5));
    base = sub(base, box(14.1,14.1,2.5,0,0,11));
    base = sub(add(base,male),female);
    let head = add(move(round(4.5,24,.65,12.5),-14.25),move(male,-24));
    const eye = move(round(9,10,2,3),-20);
    const hole = move(keep(M.cylinder(5,1.7,1.7,64)), -20.5,0,-1);
    head = add(head,sub(eye,hole));
    const tail = sub(move(round(4.5,24,.65,12.5),14.25),move(female,24));
    const candidates = [base,head,tail];
    for (const s of candidates) if (s.isEmpty() || s.volume() <= 0 || s.status() !== 'NoError') throw new Error('โมเดลฐานต่อไม่สมบูรณ์');
    result = candidates;
    return result;
  } finally {
    for (const o of owned) if (!result.includes(o as Manifold)) o.delete();
  }
}

export function meshBounds(mesh: MeshArrays): { min: number[]; max: number[] } {
  const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<mesh.vertProperties.length;i+=mesh.numProp) for(let j=0;j<3;j++) {
    min[j]=Math.min(min[j]!,mesh.vertProperties[i+j]!); max[j]=Math.max(max[j]!,mesh.vertProperties[i+j]!);
  }
  return {min,max};
}
export function translateMesh(mesh: MeshArrays, x: number, y=0, z=0): MeshArrays {
  const vertices = new Float32Array(mesh.vertProperties), delta=[x,y,z];
  for(let i=0;i<vertices.length;i+=mesh.numProp) for(let j=0;j<3;j++) vertices[i+j]+=delta[j]!;
  return {...mesh, vertProperties:vertices};
}
export function groundPart(part: ExportPart): ExportPart {
  const {min}=meshBounds(part.mesh);
  return {...part,mesh:translateMesh(part.mesh,-min[0]!,-min[1]!,-min[2]!)};
}
export function modularParts(templates: MeshArrays[], settings: ModularSettings, count: number, view: ModularSettings['view']): ExportPart[] {
  const parts: ExportPart[]=[{name:'head_with_eyelet',mesh:templates[1]!,colorRgb:hexToRgb(settings.headColor)}];
  for(let i=0;i<count;i++) parts.push({name:`middle_base_${i+1}`,mesh:translateMesh(templates[0]!,i*24),colorRgb:hexToRgb(settings.baseColor)});
  parts.push({name:'tail_end',mesh:translateMesh(templates[2]!, (count-1)*24),colorRgb:hexToRgb(settings.tailColor)});
  if(view==='print') return parts.map((p,i)=> {
    const g=groundPart(p);
    return {...g,mesh:translateMesh(g.mesh,10+(i%4)*38,10+Math.floor(i/4)*32)};
  });
  if(view==='exploded') return parts.map((p,i)=>({...p,mesh:translateMesh(p.mesh,i*8)}));
  return parts;
}
export const MODULAR_GUIDE = `ฐานต่อสามเหลี่ยม — หน่วย mm / Scale 100%
ฐาน 24 x 24 x 12.5 mm, ช่อง MX 14.1 mm, รูห่วง 3.4 mm, เผื่อร่อง 0.20 mm ต่อผิว
ฐานกลางมีพื้นในตัว หัวมีห่วง ท้ายเป็นแผ่นปิด ไม่มีปุ่ม ฝาใต้ฐาน หรือสลักแยก
จัดลิ้นให้อยู่สูงกว่าราง แล้วเลื่อนลงจนสุดบ่า ถอดโดยเลื่อนย้อนขึ้น ไม่งัดด้านข้าง
รางไม่มีล็อกกันย้อนขึ้น ต้องทดลองความฝืดก่อนใช้ห้อยของ
พิมพ์พื้นลงตามไฟล์ ตรวจ overhang ใต้ลิ้นและขอบช่อง MX ใน slicer
จุดตั้งต้น: nozzle 0.4 mm, layer 0.16 mm, 4 walls, infill 20–30%
ตรวจด้วยโมเดลดิจิทัลแล้ว ยังไม่ได้พิมพ์ทดลองหรือวัดแรงยึดจริง
ต้องเลือกโปรไฟล์เครื่องและวัสดุใน slicer เอง ไฟล์นี้ไม่ใช่ G-code
`;
