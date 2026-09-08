import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import Module from 'manifold-3d';
import { unzipSync, strFromU8 } from 'fflate';

// Load the actual TypeScript modules; use the same WASM kernel as the browser.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { createModularSolids, modularParts, meshBounds, DEFAULT_MODULAR, normalizeModular, groundPart, MODULAR_GUIDE } = await server.ssrLoadModule('/src/clicker/modular.ts');
  const { build3mf, buildStlZip, writeBinaryStl } = await server.ssrLoadModule('/src/shared/export/parts.ts');
  const kernel = await Module(); kernel.setup();
  const { Manifold, Mesh } = kernel;
  const solids = createModularSolids(kernel);
  const templates = solids.map(s => { const m=s.getMesh(); return {numProp:m.numProp,vertProperties:new Float32Array(m.vertProperties),triVerts:new Uint32Array(m.triVerts)}; });
  const solidFrom = mesh => new Manifold(new Mesh(mesh));
  const check = s => {
    assert.equal(s.status(), 'NoError'); assert(s.volume()>0);
    const components=s.decompose(); assert.equal(components.length,1); components.forEach(c=>c.delete());
  };
  solids.forEach(check);
  // Every oriented edge must have exactly one opposite edge.
  function closed(mesh) {
    const edges=new Map();
    for(let t=0;t<mesh.triVerts.length;t+=3) for(let j=0;j<3;j++) {
      const a=mesh.triVerts[t+j], b=mesh.triVerts[t+(j+1)%3];
      const k=`${Math.min(a,b)},${Math.max(a,b)}`;
      const e=edges.get(k)||[0,0]; e[0]++; e[1]+=a<b?1:-1; edges.set(k,e);
    }
    for(const e of edges.values()) assert.deepEqual(e,[2,0]);
  }
  templates.forEach(closed);
  const intersectionVolume=(a,b)=>{const c=Manifold.intersection(a,b);const v=c.volume();c.delete();return v;};
  const [base,head,tail]=solids;
  // Incoming male rails travel down into a top-open groove. Check the entire path.
  for(let z=0;z<=13;z+=.25) {
    const incoming=base.translate([-24,0,z]); const h=head.translate([0,0,z]); const b=base.translate([0,0,z]);
    assert(intersectionVolume(base,incoming)<1e-6,`base slide ${z}`);
    assert(intersectionVolume(base,h)<1e-6,`head slide ${z}`);
    assert(intersectionVolume(tail,b)<1e-6,`tail slide ${z}`);
    incoming.delete();h.delete();b.delete();
  }
  for(const [fixed,moving,dx] of [[base,base,-24],[base,head,0],[tail,base,0]]) {
    const over=moving.translate([dx,0,-.3]); assert(intersectionVolume(fixed,over)>0,'bottom shoulder must stop rail');over.delete();
  }
  await mkdir('.test-output',{recursive:true});
  for(const n of [1,2,4,8]) {
    const assembled=modularParts(templates,DEFAULT_MODULAR,n,'assembled').map(p=>solidFrom(p.mesh));
    for(let i=0;i<assembled.length;i++) for(let j=i+1;j<assembled.length;j++) assert(intersectionVolume(assembled[i],assembled[j])<1e-5,`assembly ${n}:${i},${j}`);
    assembled.forEach(s=>s.delete());
    for(const mode of ['prototype','quantity']) {
      const count=mode==='prototype'?1:n;
      const parts=modularParts(templates,DEFAULT_MODULAR,count,'print');
      assert.equal(parts.length,mode==='prototype'?3:n+2);
      const bounds=parts.map(p=>meshBounds(p.mesh));
      bounds.forEach(b=>assert.equal(b.min[2],0));
      for(let i=0;i<bounds.length;i++) for(let j=i+1;j<bounds.length;j++) {
        const a=bounds[i],b=bounds[j]; assert(a.max[0]<b.min[0]||b.max[0]<a.min[0]||a.max[1]<b.min[1]||b.max[1]<a.min[1]);
      }
      const bytes=build3mf(parts); const files=unzipSync(bytes); const xml=strFromU8(files['3D/3dmodel.model']);
      assert(xml.includes('unit="millimeter"'));assert(!files['Metadata/model_settings.config']);
      const ids=[...xml.matchAll(/<(?:object|basematerials) id="(\d+)"/g)].map(m=>m[1]); assert.equal(new Set(ids).size,ids.length);
      const objects=[...xml.matchAll(/<object id="(\d+)"[^>]*>([\s\S]*?)<\/object>/g)];assert.equal(objects.length,parts.length);
      assert.equal([...xml.matchAll(/<item objectid=/g)].length,parts.length);
      for(const [i,obj] of objects.entries()) {
        assert(xml.includes(`<item objectid="${obj[1]}"`));
        const vertices=[...obj[2].matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)].flatMap(m=>m.slice(1).map(Number));
        const faces=[...obj[2].matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)" pid="1" p1="(\d+)" p2="(\d+)" p3="(\d+)"/g)];
        assert(faces.length>0);faces.forEach(f=>assert.deepEqual(f.slice(4).map(Number),[i,i,i]));
        const mesh={numProp:3,vertProperties:new Float32Array(vertices),triVerts:new Uint32Array(faces.flatMap(f=>f.slice(1,4).map(Number)))};
        closed(mesh);const s=solidFrom(mesh);check(s);s.delete();
        assert.equal(meshBounds(mesh).min[2],0);
      }
      for(const part of parts) {
        const color='#'+part.colorRgb.map(v=>v.toString(16).padStart(2,'0')).join('')+'FF';assert(xml.includes(`displaycolor="${color}"`));
      }
      const stls=unzipSync(buildStlZip(parts.map(groundPart),new Uint8Array([137,80,78,71]),MODULAR_GUIDE));
      assert.equal(Object.keys(stls).filter(p=>p.endsWith('.stl')).length,parts.length);assert(stls['cover.png']);assert(strFromU8(stls['README.txt']).includes('0.20'));
      for(const part of parts) {const stl=writeBinaryStl(part.mesh);assert.equal(stl.byteLength,84+50*new DataView(stl).getUint32(80,true));}
      await writeFile(`.test-output/modular-${n}-${mode}.3mf`,bytes);
    }
  }
  // Shared exporter names must not corrupt XML (Thai and imported SVG labels included).
  const escaped=strFromU8(unzipSync(build3mf([{name:'ไทย <SVG> & "Keycap"',mesh:templates[0],colorRgb:[255,0,0]}]))['3D/3dmodel.model']);
  assert(escaped.includes('ไทย &lt;SVG&gt; &amp; &quot;Keycap&quot;'));
  assert.equal(normalizeModular({count:99}).count,8);assert.equal(normalizeModular({count:NaN}).count,1);
  assert.equal(normalizeModular({baseColor:'invalid'}).baseColor,DEFAULT_MODULAR.baseColor);
  console.log('PASS: three closed oriented single solids; rail insertion and stops; 1/2/4/8 assemblies; prototype/quantity 3MF round trips, colors, IDs, bed placement; STL ZIP; XML escaping.');
  console.log('Volumes mm³:',solids.map(s=>s.volume()));
  solids.forEach(s=>s.delete());
} finally { await server.close(); }
