import * as THREE from 'three';
import {Rhino3dmLoader} from 'three/addons/loaders/3DMLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';

const years=[1950,1960,1970,1975,1980,1990,2000,2010];
const matches=s=>[...new Set((String(s||'').match(/(?<!\d)(?:1950|1960|1970|1975|1980|1990|2000|2010)(?!\d)/g)||[]).map(Number))];
function layersFor(root){
  const list=root.userData.layers||[], byId=new Map(list.map(l=>[String(l.id).toLowerCase(),l]));
  const byIndex=new Map(list.map((l,i)=>[Number(l.index??l.layerIndex??i),l]));
  function path(i){let l=byIndex.get(Number(i))||list[i],names=[],seen=new Set();while(l&&!seen.has(l)){seen.add(l);names.unshift(l.name||'');if(l.fullPath)names.unshift(l.fullPath);l=byId.get(String(l.parentLayerId).toLowerCase())}return [...new Set(names.filter(Boolean))].join('::')}
  return {list,path};
}
function geometryBox(mesh){mesh.geometry.computeBoundingBox();return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld)}
function getMaterial(mesh){return (Array.isArray(mesh.material)?mesh.material:[mesh.material]).find(m=>m?.map&&mesh.geometry.getAttribute('uv'))}
function hasRelief(mesh){const b=geometryBox(mesh),s=b.getSize(new THREE.Vector3());return s.z>1&&s.x>100&&s.y>100}
function sharedGroup(meshes,note){const group=new THREE.Group();group.rotation.x=-Math.PI/2;group.userData.atlasShared=true;group.userData.atlasNote=note;
 for(const m of meshes){const c=new THREE.Mesh(m.geometry,m.material);c.matrixAutoUpdate=false;c.matrix.copy(m.matrixWorld);c.frustumCulled=true;c.name=m.name;group.add(c)}
 return group;
}
function setPhotoMaterial(mesh){for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(m){if(m.map){m.map.colorSpace=THREE.SRGBColorSpace;m.map.needsUpdate=true;m.color?.set(0xffffff);m.metalness=0;m.roughness=1} else if(m.isMeshStandardMaterial||m.isMeshPhysicalMaterial){m.metalness=0;m.roughness=1}}}
function attachMap(preview,source){
 const mat=getMaterial(source);if(!mat)return false;
 const p=source.geometry.getAttribute('position'),uv=source.geometry.getAttribute('uv');if(!p||!uv||p.count!==uv.count||p.count<3)return false;
 const a=new THREE.Vector3().fromBufferAttribute(p,0).applyMatrix4(source.matrixWorld);
 let ib=-1,ic=-1,best=0,det=0;
 for(let i=1;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(source.matrixWorld),d=(v.x-a.x)**2+(v.y-a.y)**2;if(d>best){best=d;ib=i}}
 if(ib<0)return false;
 const b=new THREE.Vector3().fromBufferAttribute(p,ib).applyMatrix4(source.matrixWorld);
 for(let i=1;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(source.matrixWorld),d=(b.x-a.x)*(v.y-a.y)-(b.y-a.y)*(v.x-a.x);if(Math.abs(d)>Math.abs(det)){det=d;ic=i}}
 if(ic<0||Math.abs(det)<1e-6)return false;
 const c=new THREE.Vector3().fromBufferAttribute(p,ic).applyMatrix4(source.matrixWorld);
 const coords=(x,y)=>{const dx=x-a.x,dy=y-a.y,u=(dx*(c.y-a.y)-dy*(c.x-a.x))/det,v=((b.x-a.x)*dy-(b.y-a.y)*dx)/det;return [uv.getX(0)+u*(uv.getX(ib)-uv.getX(0))+v*(uv.getX(ic)-uv.getX(0)),uv.getY(0)+u*(uv.getY(ib)-uv.getY(0))+v*(uv.getY(ic)-uv.getY(0))]};
 for(let i=0;i<p.count;i+=Math.max(1,Math.floor(p.count/100))){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(source.matrixWorld),t=coords(v.x,v.y);if(Math.hypot(t[0]-uv.getX(i),t[1]-uv.getY(i))>.035)return false}
 const positions=preview.geometry.getAttribute('position'),out=[];for(let i=0;i<positions.count;i++)out.push(...coords(positions.getX(i),-positions.getZ(i)));
 preview.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(out,2));preview.material.dispose();
 preview.material=new THREE.MeshStandardMaterial({map:mat.map.clone(),color:0xffffff,roughness:1,metalness:0,side:THREE.DoubleSide});preview.material.map.needsUpdate=true;
 return true;
}
export function createRhinoAssets(config,onChange,onProgress){
 const manager=new THREE.LoadingManager();manager.onLoad=()=>onChange?.();
 const loader=new Rhino3dmLoader(manager).setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@8.9.0/').setWorkerLimit(1);
 const cache=new Map();
 async function load(url){
   if(!cache.has(url))cache.set(url,loader.loadAsync(url,e=>{if(e.total)onProgress?.(Math.round(e.loaded/e.total*100))}).then(root=>{
     root.updateMatrixWorld(true);const {list,path}=layersFor(root),meshRows=[];
     root.traverse(obj=>{if(!obj.isMesh||!obj.geometry?.getAttribute('position'))return;const names=path(obj.userData?.attributes?.layerIndex),ys=matches(names);const fallback=matches(obj.name);setPhotoMaterial(obj);meshRows.push({obj,layer:names,year:ys.length===1?ys[0]:ys.length===0&&fallback.length===1?fallback[0]:null,visible:obj.visible,height:geometryBox(obj).getSize(new THREE.Vector3()).z})});
     const report={url,layers:list.map(l=>l.name),meshes:meshRows.map(r=>({name:r.obj.name,layer:r.layer,year:r.year,visible:r.visible,height:r.height,vertices:r.obj.geometry.getAttribute('position').count,textured:!!getMaterial(r.obj)})),warnings:root.userData.warnings||[]};
     console.info('ENCI Rhino inspection',report);onChange?.();return {root,meshRows,report};
   }).catch(e=>{cache.delete(url);throw e}));
   return cache.get(url);
 }
 async function history(year,previewFactory){
   const data=await load(config.history);let rows=data.meshRows.filter(r=>r.year===year),used=year;
   if(!rows.length&&year===1975){rows=data.meshRows.filter(r=>r.year===1970);used=1970}
   if(!rows.length)throw Error('No mesh layer identified for '+year+' — inspect Rhino layer names');
   const relief=rows.filter(r=>hasRelief(r.obj));
   if(relief.length){const g=sharedGroup(relief.map(r=>r.obj),'Rhino layer '+used+' · map-derived terrain');if(!relief.some(r=>getMaterial(r.obj))){const plane=rows.find(r=>getMaterial(r.obj));if(plane)g.userData.atlasNote+=' · separate map plane not applied';else g.userData.atlasNote+=' · no embedded diffuse map'}return g}
   const mapRow=rows.find(r=>getMaterial(r.obj));
   if(mapRow){const g=previewFactory(year);if(attachMap(g,mapRow.obj)){g.userData.atlasNote='Rhino map '+used+' · projected on coarse reconstructed terrain';onChange?.();return g}g.geometry.dispose();g.material.dispose()}
   throw Error('Year '+used+' contains no relief mesh or usable embedded map');
 }
 async function present(){
   const data=await load(config.present);const visible=data.meshRows.filter(r=>r.visible);
   const rows=visible.length?visible:data.meshRows;
   if(!rows.length)throw Error('Current 3DM has no displayable meshes');
   const relief=rows.filter(r=>hasRelief(r.obj));
   // Preserve visible meshes including separately modelled buildings, but not flat map planes covering the site.
   const filtered=relief.length?rows.filter(r=>{const size=geometryBox(r.obj).getSize(new THREE.Vector3());return !(size.z<.1&&size.x>100&&size.y>100)}):rows;
   const g=sharedGroup(filtered.map(r=>r.obj),'Uploaded Rhino terrain · source date unverified');
   if(!filtered.some(r=>getMaterial(r.obj)))g.userData.atlasNote+=' · no embedded diffuse map';
   return g;
 }
 async function exportGLB(model,filename){await new Promise(r=>requestAnimationFrame(r));const result=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:false,maxTextureSize:4096});const url=URL.createObjectURL(new Blob([result],{type:'model/gltf-binary'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
 return {history,present,exportGLB,reports:async()=>Promise.all([...cache.values()].map(p=>p.then(d=>d.report)))};
}
