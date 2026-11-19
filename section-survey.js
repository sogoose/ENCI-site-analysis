import * as THREE from 'three';

// Exact vertical-plane intersections of building and industrial meshes.
// 2D coordinates are along-section distance and m NAP elevation.
export function sliceBuildings(roots,s){
 const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1],L=Math.hypot(dx,dy);
 if(L<=0)return {polygons:[],lines:[],count:0};
 const ux=dx/L,uy=dy/L,nx=-uy,ny=ux,eps=1e-5,step=.035;
 const signed=(x,z)=>(x-s.a[0])*nx+(-z-s.a[1])*ny;
 const dist=(x,z)=>(x-s.a[0])*ux+(-z-s.a[1])*uy;
 const key=p=>Math.round(p[0]/step)+','+Math.round(p[1]/step);
 const polygons=[],lines=[];let count=0;
 for(const root of roots){
  if(!root)continue;root.updateMatrixWorld(true);
  const kind=root.userData?.atlasIndustrial||root.userData?.atlasViewing?'approximate':'modelled';
  root.traverse(mesh=>{
   if(!mesh.isMesh||!mesh.geometry?.attributes?.position||count>40000)return;
   const box=new THREE.Box3().setFromObject(mesh);
   if(box.isEmpty())return;
   const corners=[[box.min.x,box.min.z],[box.min.x,box.max.z],[box.max.x,box.min.z],[box.max.x,box.max.z]];
   const signedCorners=corners.map(p=>signed(...p)),distCorners=corners.map(p=>dist(...p));
   if(Math.min(...signedCorners)>eps||Math.max(...signedCorners)<-eps||Math.min(...distCorners)>L||Math.max(...distCorners)<0)return;
   const geo=mesh.geometry,attr=geo.attributes.position,index=geo.index,N=index?index.count:attr.count;
   const xyz=new Float32Array(attr.count*3),v=new THREE.Vector3();
   for(let i=0;i<attr.count;i++){v.fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld);xyz.set([v.x,v.y,v.z],i*3)}
   const edge=(i,j,hits)=>{
    const a=i*3,b=j*3,da=signed(xyz[a],xyz[a+2]),db=signed(xyz[b],xyz[b+2]);
    if(Math.abs(da)<eps&&Math.abs(db)<eps||da>eps&&db>eps||da< -eps&&db< -eps)return;
    const t=Math.abs(da)<eps?0:Math.abs(db)<eps?1:da/(da-db);
    if(t<0||t>1)return;
    const x=xyz[a]+t*(xyz[b]-xyz[a]),y=xyz[a+1]+t*(xyz[b+1]-xyz[a+1]),z=xyz[a+2]+t*(xyz[b+2]-xyz[a+2]);
    const p=[dist(x,z),y];if(!hits.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<.008))hits.push(p);
   };
   const segments=[];
   for(let i=0;i+2<N&&count<40000;i+=3){
    const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2,hits=[];
    edge(a,b,hits);edge(b,c,hits);edge(c,a,hits);
    if(hits.length<2)continue;
    let [p,q]=hits;if(Math.max(p[0],q[0])<0||Math.min(p[0],q[0])>L)continue;
    if(p[0]<0||q[0]<0||p[0]>L||q[0]>L){
     const lo=Math.max(0,Math.min(p[0],q[0])),hi=Math.min(L,Math.max(p[0],q[0]));
     if(hi-lo<.001)continue;
     const at=d=>[d,p[1]+(q[1]-p[1])*(d-p[0])/(q[0]-p[0]||1)];
     p=at(lo);q=at(hi);
    }
    if(Math.hypot(p[0]-q[0],p[1]-q[1])<.01)continue;segments.push([p,q]);count++;
   }
   const adjacency=new Map(),used=new Set();
   segments.forEach(([p,q],i)=>{for(const [side,v] of [[0,p],[1,q]]){const k=key(v);if(!adjacency.has(k))adjacency.set(k,[]);adjacency.get(k).push([i,side])}});
   segments.forEach(([p,q],i)=>{
    if(used.has(i))return;used.add(i);const pts=[p,q],first=key(p);let cur=key(q);
    for(let j=0;j<segments.length&&cur!==first;j++){
     const next=(adjacency.get(cur)||[]).find(([n])=>!used.has(n));if(!next)break;
     const [n,side]=next;used.add(n);const v=segments[n][1-side];pts.push(v);cur=key(v);
    }
    if(cur===first&&pts.length>=4){
     pts.pop();const area=pts.reduce((t,p,j)=>{const q=pts[(j+1)%pts.length];return t+p[0]*q[1]-q[0]*p[1]},0)/2;
     if(Math.abs(area)>.03)polygons.push({points:pts,kind});
    }else if(pts.length>1)lines.push({points:pts,kind});
   });
  });
 }
 return {polygons,lines,count};
}
export function dsmEnvelope(samples,len,bin=1){
 const cells=Array.from({length:Math.ceil(len/bin)},()=>[]);
 for(let j=0;j+1<samples.length;j+=2){const d=samples[j],h=samples[j+1];if(d>=0&&d<len&&Number.isFinite(h))cells[Math.min(cells.length-1,Math.floor(d/bin))].push(h)}
 return cells.map((c,i)=>{if(c.length<3)return null;c.sort((a,b)=>a-b);return [(i+.5)*bin,c[Math.floor(.85*(c.length-1))]]});
}

/**
 * Project buildings located BEHIND the vertical cut plane into section
 * coordinates. Used as a light grey architectural backdrop in SVG/DXF.
 * 3D presentation separately uses the real clipped meshes (not hulls).
 * The outline is intentionally a silhouette approximation, not a
 * fabricated façade with invented openings.
 */
function silhouetteHull(points){
 if(points.length<3)return [];
 const pts=[...new Map(points.map(p=>[Math.round(p[0]*8)+','+Math.round(p[1]*8),p])).values()];
 pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 if(pts.length<3)return [];
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const lower=[],upper=[];
 for(const p of pts){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p)}
 for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p)}
 lower.pop();upper.pop();
 return lower.concat(upper);
}
export function projectBuildingBackdrop(roots,s,{flip=false,maxDepth=220}={}){
 const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1],len=Math.hypot(dx,dy);
 if(len<=0)return [];
 const ux=dx/len,uy=dy/len,normalX=uy,normalZ=ux,viewSign=flip?-1:1;
 const result=[];
 for(const root of roots){
  if(!root)continue;root.updateMatrixWorld(true);
  const kind=root.userData?.atlasIndustrial||root.userData?.atlasViewing?'approximate':'modelled';
  root.traverse(mesh=>{
   if(!mesh.isMesh||!mesh.geometry?.attributes?.position)return;
   const attr=mesh.geometry.attributes.position,box=new THREE.Box3().setFromObject(mesh);
   if(box.isEmpty())return;
   // A world AABB lets us reject faraway / wrong-side meshes cheaply.
   const corners=[[box.min.x,box.min.z],[box.min.x,box.max.z],[box.max.x,box.min.z],[box.max.x,box.max.z]];
   const bounds=corners.map(([x,z])=>({
    d:(x-s.a[0])*ux+(-z-s.a[1])*uy,
    depth:-((x-s.a[0])*normalX+(z+s.a[1])*normalZ)*viewSign
   }));
   if(Math.max(...bounds.map(v=>v.d))<0||Math.min(...bounds.map(v=>v.d))>len||
      Math.max(...bounds.map(v=>v.depth))<0||Math.min(...bounds.map(v=>v.depth))>maxDepth)return;
   const points=[],depths=[],v=new THREE.Vector3();
   // Small, measured geometric projection, without fictitious façade details.
   const step=Math.max(1,Math.floor(attr.count/12000));
   for(let i=0;i<attr.count;i+=step){
    v.fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld);
    const d=(v.x-s.a[0])*ux+(-v.z-s.a[1])*uy;
    const depth=-((v.x-s.a[0])*normalX+(v.z+s.a[1])*normalZ)*viewSign;
    if(d>=0&&d<=len&&depth>=.05&&depth<=maxDepth&&Number.isFinite(v.y)){
     points.push([d,v.y]);depths.push(depth)
    }
   }
   const hull=silhouetteHull(points);
   if(hull.length<3) return;
   const area=Math.abs(hull.reduce((sum,p,i)=>{
     const q=hull[(i+1)%hull.length];return sum+p[0]*q[1]-q[0]*p[1]
   },0))*.5;
   if(area<.5)return;
   const depth=depths.reduce((a,b)=>a+b,0)/depths.length;
   result.push({points:hull,depth,kind,name:mesh.name||root.name||'Building'})
  })
 }
 // Background silhouettes are painted back-to-front, distinct from the cut.
 result.sort((a,b)=>b.depth-a.depth);
 return result.slice(0,450)
}
