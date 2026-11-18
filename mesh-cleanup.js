import * as THREE from 'three';
import {mergeVertices,toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
// Non-destructive mesh repair. No remeshing of registered footprints or sawtooth roofs.
export function cleanFactoryMeshes(root){
 root.updateMatrixWorld(true);const replaced=new Set(),oldSet=new Set();let meshes=0,removed=0;
 root.traverse(m=>{if(!m.isMesh||!m.geometry?.attributes.position)return;
  const b=new THREE.Box3().setFromObject(m);const c=b.getCenter(new THREE.Vector3());
  // Factory area only, local XY metres; exclude quarry and surrounding buildings.
  if(c.x< -250||c.x>570||-c.z< -1350||-c.z> -480||b.max.x-b.min.x>850||b.max.z-b.min.z>850)return;
  if(m.isSkinnedMesh||m.geometry.morphAttributes?.position?.length||Array.isArray(m.material))return;
  const old=m.geometry,g=old.clone();
  // Weld coincident positions where the attributes agree; keep UV and colour seams.
  const textured=!!m.material?.map;
  if(!textured)g.deleteAttribute('normal');
  const scale=new THREE.Vector3().setFromMatrixScale(m.matrixWorld);const tol=.015/Math.max(scale.x,scale.y,scale.z,1e-8);
  const w=mergeVertices(g,tol);g.dispose();const p=w.attributes.position,idx=w.index,ids=[],seen=new Set(),A=new THREE.Vector3(),B=new THREE.Vector3(),C=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3();
  const n=idx?.count||p.count;
  for(let i=0;i+2<n;i+=3){const a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,c=idx?idx.getX(i+2):i+2;const key=[a,b,c].sort((a,b)=>a-b).join(',');A.fromBufferAttribute(p,a);B.fromBufferAttribute(p,b);C.fromBufferAttribute(p,c);ab.subVectors(B,A);ac.subVectors(C,A);if(a===b||b===c||a===c||!Number.isFinite(ab.cross(ac).lengthSq())||ab.lengthSq()<1e-14||seen.has(key)){removed++;continue}seen.add(key);ids.push(a,b,c)}
  if(!ids.length){w.dispose();return}
  w.clearGroups();w.setIndex(ids);let repaired=w;if(!textured){repaired=toCreasedNormals(w,Math.PI/5);if(repaired!==w)w.dispose()}repaired.computeBoundingBox();repaired.computeBoundingSphere();m.geometry=repaired;oldSet.add(old);replaced.add(repaired);meshes++;
 });
 // Keep geometries used by other scene objects or by shared Rhino cache untouched.
 if(!root.userData.atlasShared){const live=new Set();root.traverse(m=>{if(m.geometry)live.add(m.geometry)});for(const g of oldSet)if(!live.has(g))g.dispose()}
 else {const prev=root.userData.atlasDispose;root.userData.atlasDispose=()=>{for(const g of replaced)g.dispose();prev?.()}}
 return {meshes,removed};
}
