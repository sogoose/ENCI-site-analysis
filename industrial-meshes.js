import * as THREE from 'three';

// Approximate heritage massing registered from the 2023 RCE concept plan,
// using chimney and office reference coordinates. Rhino local XY metres.
// Heights other than chimney / kiln length are visual estimates.
// Do not use these meshes as surveyed geometry or a current-condition inventory.
export const industrialSpec={
  mengbed:{xy:[-12.5,-1180.8],radius:28.5,wall:5.5,roof:14,segments:32},
  klinkerhal:{xy:[176.6,-846.7],radius:28,wall:8,roof:15,segments:16},
  chimney:{xy:[7.452,-1135.051],height:150,radiusBase:4.5,radiusTop:2.5},
  kiln:{a:[73.8,-1062.1],b:[135.5,-893.0],length:180,radius:2.8,axisHeightA:12,axisHeightB:5.5}
};
export function buildIndustrialMeshes(terrain,spec=industrialSpec){
 const group=new THREE.Group();group.name='ENCI_Industrial_Approximate';group.userData.atlasIndustrial=true;group.userData.atlasBuildingContext=true;
 if(!terrain)return group;
 terrain.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(terrain),ray=new THREE.Raycaster();
 const material=new THREE.MeshStandardMaterial({color:0xf0efeb,roughness:1,metalness:0});
 // Sample terrain only, deliberately excluding building context and other overlays.
 function z(xy){ray.set(new THREE.Vector3(xy[0],bb.max.y+200,-xy[1]),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(terrain,true).find(h=>h.object.isMesh);return hit?hit.point.y:null}
 function mesh(parent,name,geo,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.name=name;m.position.set(x,y,z);parent.add(m);return m}
 function cylinder(parent,name,rTop,rBottom,h,y,n=24){return mesh(parent,name,new THREE.CylinderGeometry(rTop,rBottom,h,n,1,false),0,y,0)}
 function assembly(name,xy){const h=z(xy);if(!Number.isFinite(h))return null;const g=new THREE.Group();g.name=name;g.position.set(xy[0],h-.35,-xy[1]);group.add(g);return g}
 function dome(name,p,lantern){const g=assembly(name,p.xy);if(!g)return;
  cylinder(g,name+'_base',p.radius,p.radius,p.wall,p.wall/2,p.segments);
  cylinder(g,name+'_faceted_conical_roof',lantern?3.5:.75,p.radius+0.35,p.roof,p.wall+p.roof/2,p.segments);
  if(lantern){cylinder(g,name+'_central_drum',3.5,3.5,5,p.wall+p.roof+2.5,16);cylinder(g,name+'_cap',.2,3.6,1.6,p.wall+p.roof+5.8,16)}
  else cylinder(g,name+'_ridge_cap',.65,.9,1,p.wall+p.roof+.5,12);
 }
 dome('Mengbed',spec.mengbed,false);dome('Klinkerhal',spec.klinkerhal,true);
 const c=spec.chimney,g=assembly('Oven_8_chimney',c.xy);if(g){
  cylinder(g,'Chimney_base_plinth',c.radiusBase+.7,c.radiusBase+.9,2,1,24);
  cylinder(g,'Chimney_tapered_shaft',c.radiusTop,c.radiusBase,c.height-2,(c.height+2)/2,24);
  cylinder(g,'Chimney_crown',c.radiusTop+.25,c.radiusTop+.25,.65,c.height-.325,24);
 }
 const k=spec.kiln,ha=z(k.a),hb=z(k.b);
 if(Number.isFinite(ha)&&Number.isFinite(hb)){
  const kg=new THREE.Group();kg.name='Oven_8_rotary_kiln';group.add(kg);
  const a=new THREE.Vector3(k.a[0],ha+k.axisHeightA,-k.a[1]),b=new THREE.Vector3(k.b[0],hb+k.axisHeightB,-k.b[1]);
  const axis=b.clone().sub(a).normalize();
  function tube(name,p,q,r){const d=q.clone().sub(p),h=d.length();if(h<.01)return;const m=mesh(kg,name,new THREE.CylinderGeometry(r,r,h,24,1,false));m.position.copy(p.clone().add(q).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m}
  tube('Kiln_shell',a,b,k.radius);
  for(const t of [.2,.5,.8]){const p=a.clone().lerp(b,t);tube('Kiln_tyre',p.clone().addScaledVector(axis,-.65),p.clone().addScaledVector(axis,.65),k.radius+.45);const ground=z([p.x,-p.z]),h=p.y-k.radius-ground;if(Number.isFinite(ground)&&h>0.5)mesh(kg,'Kiln_support',new THREE.BoxGeometry(5,h,5),p.x,ground+h/2,-(-p.z))}
 }
 if(!group.children.length)material.dispose();
 group.updateMatrixWorld(true);
 return group;
}
// Vertices are exported in Rhino's Z-up local metre system.
// Original 2026 source uses the inverse of the viewer's vertical correction.
export function industrialOBJ(group,zOffset=0){
 if(!group)return null;group.updateMatrixWorld(true);
 const lines=['# ENCI industrial massing (estimated, not surveyed)','# Rhino local XYZ metres; Z = NAP - '+zOffset];let index=1;
 group.traverse(m=>{if(!m.isMesh)return;const g=m.geometry,p=g.getAttribute('position');if(!p)return;lines.push('o '+m.name.replace(/[^a-zA-Z0-9_-]/g,'_'));const v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);lines.push('v '+[v.x,-v.z,v.y-zOffset].map(n=>n.toFixed(5)).join(' '))}const count=g.index?g.index.count:p.count;for(let i=0;i+2<count;i+=3){const ids=[0,1,2].map(j=>index+(g.index?g.index.getX(i+j):i+j));lines.push('f '+ids.join(' '))}index+=p.count});return index>1?lines.join('\n')+'\n':null;
}
