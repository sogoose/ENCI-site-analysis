import * as THREE from 'three';

// Luikerweg viewing platform, Rademacher & de Vries / Castermans.
// Local Rhino XY metres, derived from stored OSM ways 860240119, 860240121,
// 860240123, 724705593, 389304946. OSM contributors / ODbL.
// 18 m exposed platform, 3 m width, ~40 m descent, 215 steps in published descriptions.
// Railings, landings and individual tread distribution are simplified, not surveyed.
export const viewingSpec={
 deckRoot:[-180.7,-202.3],deckDirection:[.2,-16.5],deckLength:18,deckWidth:3,
 approach:[[-180.7,-189.6],[-180.7,-202.3]],
 upper:[[-194.4,-186.3],[-207,-220.1]],
 lower:[[-207,-220.1],[-203.7,-221.6],[-204.8,-224.3],[-181.5,-236.6],[-182.2,-238.3],[-200.9,-230]],
 lowerReference:[-211.7,-232.7],stairWidth:2.1
};
export function stairLevels(spec,top,bottom){
 const total=top-bottom,upperDrop=total*.48;
 const first=top-upperDrop,pts=spec.lower;
 const lengths=pts.slice(1).map((p,i)=>Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1]));
 const sum=lengths.reduce((s,l)=>s+(l>5?l:0),0);let h=first;
 return {upper:[top,first],lower:[first,...lengths.map(l=>{if(l>5)h-= (total-upperDrop)*l/sum;return h})]};
}
export function buildViewingMeshes(terrain,spec=viewingSpec){
 const root=new THREE.Group();root.name='ENCI_Luikerweg_Viewing_Platform';root.userData.atlasViewing=true;root.userData.atlasBuildingContext=true;
 if(!terrain)return root;
 terrain.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(terrain),ray=new THREE.Raycaster();
 function ground(p){ray.set(new THREE.Vector3(p[0],box.max.y+100,-p[1]),new THREE.Vector3(0,-1,0));const h=ray.intersectObject(terrain,true).find(x=>x.object.isMesh);return h?h.point.y:null}
 const ref=ground(spec.approach[0]),atRoot=ground(spec.deckRoot),atStair=ground(spec.upper[0]);if(!Number.isFinite(ref)&&!Number.isFinite(atRoot)&&!Number.isFinite(atStair))return root;
 const top=(Number.isFinite(atStair)?atStair:Number.isFinite(ref)?ref:atRoot)+.2;
 const deckZ=(Number.isFinite(atRoot)?atRoot:top)+.2;
 const low=ground(spec.lowerReference),bottom=Number.isFinite(low)&&top-low>=32&&top-low<=48?low+.15:top-40;
 const levels=stairLevels(spec,top,bottom);
 const steel=new THREE.MeshStandardMaterial({color:0xd9dde0,roughness:.88,metalness:.12}),concrete=new THREE.MeshStandardMaterial({color:0xf0efeb,roughness:1}),grating=new THREE.MeshStandardMaterial({color:0xe1e3e2,roughness:.92});
 function P(p,h){return new THREE.Vector3(p[0],h,-p[1])}
 function group(name){const g=new THREE.Group();g.name=name;root.add(g);return g}
 function mesh(g,name,geo,mat){const m=new THREE.Mesh(geo,mat);m.name=name;g.add(m);return m}
 function beam(g,name,a,b,w,h,mat=steel){const d=b.clone().sub(a),L=d.length();if(L<.005)return;const m=mesh(g,name,new THREE.BoxGeometry(w,h,L),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),d.normalize());return m}
 function frame(a,b){const d=b.clone().sub(a);d.y=0;const len=d.length();d.normalize();return {len,d,n:new THREE.Vector3(-d.z,0,d.x)}}
 function at(a,b,t,n,side=0,dy=0){const p=a.clone().lerp(b,t).addScaledVector(n,side);p.y+=dy;return p}
 function flatBox(g,name,center,d,w,h,l,mat){const m=mesh(g,name,new THREE.BoxGeometry(w,h,l),mat);m.position.copy(center);m.rotation.y=Math.atan2(d.x,d.z);return m}
 function rails(g,a,b,w,end=false){const {len,n}=frame(a,b);if(len<.05)return;const count=Math.max(1,Math.ceil(len/1.7));
 for(const sign of [-1,1]){const s=sign*(w/2-.09);beam(g,'Handrail',at(a,b,0,n,s,1.08),at(a,b,1,n,s,1.08),.085,.085);beam(g,'Midrail',at(a,b,0,n,s,.54),at(a,b,1,n,s,.54),.045,.045);
 for(let i=0;i<=count;i++){const p=at(a,b,i/count,n,s);beam(g,'Baluster',p,p.clone().add(new THREE.Vector3(0,1.08,0)),.075,.075)}}
 if(end)for(const h of [.54,1.08])beam(g,'End_guardrail',at(a,b,1,n,-w/2+.09,h),at(a,b,1,n,w/2-.09,h),.075,.075);
 }
 function flight(g,a,b,w,mat,steps){const {len,d,n}=frame(a,b);if(len<.05)return;const dz=b.y-a.y;
 if(steps&&Math.abs(dz)>.3){const count=Math.max(1,Math.round(Math.abs(dz)/.185)),run=len/count,ris=Math.abs(dz)/count;
 for(let i=0;i<count;i++){const p=a.clone().lerp(b,(i+.5)/count);p.y=a.y+dz*(i+(dz<0?0:1))/count-Math.max(.1,ris+.045)/2;flatBox(g,'Tread',p,d,w,Math.max(.1,ris+.045),run+.018,mat)}
 for(const side of [-1,1])beam(g,'Stair_stringer',at(a,b,0,n,side*(w/2-.12),-.24),at(a,b,1,n,side*(w/2-.12),-.24),.16,.36,mat);
 }else{beam(g,'Landing_deck',a.clone().add(new THREE.Vector3(0,-.12,0)),b.clone().add(new THREE.Vector3(0,-.12,0)),w,.24,mat)}
 rails(g,a,b,w);
 }
 // Along the existing path: deck stays level, does not drape over the slope.
 const g=group('Cantilever_viewing_deck'),a=P(spec.deckRoot,deckZ),norm=Math.hypot(...spec.deckDirection);
 const end=[spec.deckRoot[0]+spec.deckDirection[0]/norm*spec.deckLength,spec.deckRoot[1]+spec.deckDirection[1]/norm*spec.deckLength],b=P(end,deckZ),{len,d,n}=frame(a,b);
 flatBox(g,'Platform_grating',a.clone().lerp(b,.5).add(new THREE.Vector3(0,-.08,0)),d,spec.deckWidth,.16,len,grating);
 // Tapered pair of box girders: 1.9 m at root, 0.5 m at tip.
 for(const sign of [-1,1]){
 const shift=sign*(spec.deckWidth/2-.25),v=[];
 for(const [t,h] of [[0,1.9],[1,.5]])for(const [s,dy] of [[-.25,-.13],[.25,-.13],[.25,-h],[-.25,-h]])v.push(...at(a,b,t,n,shift+s,dy).toArray());
 const idx=[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0];const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setIndex(idx);geo.computeVertexNormals();const m=mesh(g,'Tapered_box_girder',geo,steel);m.material.side=THREE.DoubleSide}
 rails(g,a,b,spec.deckWidth,true);
 const approach=group('Upper_approach');flight(approach,P(spec.approach[0],Number.isFinite(ref)?ref+.2:deckZ),a,3,concrete,false);
 const up=group('Concrete_upper_stair');flight(up,P(spec.upper[0],levels.upper[0]),P(spec.upper[1],levels.upper[1]),spec.stairWidth,concrete,true);
 // Upper access is explicitly linked at the same mapped footpath junction.
 const join=group('Upper_landing_link');flight(join,P(spec.approach[0],Number.isFinite(ref)?ref+.2:top),P(spec.upper[0],top),spec.stairWidth,concrete,false);
 const lower=group('Steel_cliff_stair');
 for(let i=1;i<spec.lower.length;i++){const x=P(spec.lower[i-1],levels.lower[i-1]),y=P(spec.lower[i],levels.lower[i]);flight(lower,x,y,spec.stairWidth,grating,true)}
 root.userData.dimensions={top,bottom,descent:top-bottom,deckLength:spec.deckLength,source:'Mapped OSM paths; geometry approximate'};root.updateMatrixWorld(true);return root;
}
