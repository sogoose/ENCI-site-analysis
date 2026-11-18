import * as THREE from 'three';
export function insideRing(x,y,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
export function sliceSpans(ring,y){const xs=[];for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[j],b=ring[i];if((a[1]>y)!==(b[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]))}xs.sort((a,b)=>a-b);const spans=[];for(let i=0;i+1<xs.length;i+=2)if(xs[i+1]-xs[i]>1)spans.push([xs[i],xs[i+1]]);return spans}
function geometry(pos){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g}
export function createGeologicalSection(root,ring,y,data){
 root.updateMatrixWorld(true);const bbox=new THREE.Box3().setFromObject(root);
 if(bbox.isEmpty()||bbox.min.y< -150||bbox.max.y>350)throw Error('Terrain elevations do not appear to be in metres NAP');
 const spans=sliceSpans(ring,y),ray=new THREE.Raycaster(),group=new THREE.Group(),z=-y-0.3,buffers=data.layers.map(()=>[]),topLine=[],contacts=[[],[]];let samples=0;
 const meshes=[];root.traverse(o=>{if(o.isMesh&&o.geometry){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);if(b.min.z<=-y&&b.max.z>=-y)meshes.push({o,b})}});
 const H=x=>{ray.set(new THREE.Vector3(x,bbox.max.y+100,-y),new THREE.Vector3(0,-1,0));const hits=ray.intersectObjects(meshes.filter(m=>m.b.min.x<=x&&m.b.max.x>=x).map(m=>m.o),false);return hits.length?hits[0].point.y:null};
 function tri(arr,a,b,c){arr.push(...a,...b,...c)}
 for(const [a,b] of spans){const n=Math.max(1,Math.ceil((b-a)/10));let prev=null;for(let i=0;i<=n;i++){const x=a+(b-a)*i/n,h=H(x);if(h===null||!Number.isFinite(h)){prev=null;continue}samples++;
 if(prev){const [px,ph]=prev;topLine.push(px,ph+.2,z,x,h+.2,z);
 for(let k=0;k<data.layers.length;k++){const l=data.layers[k],lo=l.min,max=l.max??Infinity;let x0=px,x1=x,h0=ph,h1=h;if(h0<=lo&&h1<=lo)continue;
 if(h0<lo){x0=px+(x-px)*(lo-h0)/(h1-h0);h0=lo}if(h1<lo){x1=px+(x-px)*(lo-ph)/(h-ph);h1=lo}
 const cuts=[{x:x0,h:h0}];if(Number.isFinite(max)&&(h0-max)*(h1-max)<0){const t=(max-h0)/(h1-h0);cuts.push({x:x0+(x1-x0)*t,h:max})}cuts.push({x:x1,h:h1});
 for(let j=1;j<cuts.length;j++){const u=cuts[j-1],v=cuts[j],A=[u.x,lo,z],B=[v.x,lo,z],C=[v.x,Math.min(v.h,max),z],D=[u.x,Math.min(u.h,max),z];tri(buffers[k],A,B,C);tri(buffers[k],A,C,D)}
 }
 for(const [idx,level] of [45,90].entries()){if(ph>=level&&h>=level)contacts[idx].push(px,level,z+.1,x,level,z+.1);else if((ph-level)*(h-level)<0){const cross=px+(x-px)*(level-ph)/(h-ph);if(ph>level)contacts[idx].push(px,level,z+.1,cross,level,z+.1);else contacts[idx].push(cross,level,z+.1,x,level,z+.1)}}
 }prev=[x,h]}}
 for(let i=0;i<buffers.length;i++)if(buffers[i].length){const m=new THREE.Mesh(geometry(buffers[i]),new THREE.MeshBasicMaterial({color:data.layers[i].color,side:THREE.DoubleSide}));m.name=data.layers[i].name;group.add(m)}
 function line(pos,color){if(!pos.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));group.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color})))}
 line(topLine,'#625e55');for(const q of contacts)line(q,'#77736b');
 if(!samples||!group.children.length)throw Error('No terrain intersection at this section');
 return {group,samples,spans,plane:new THREE.Plane(new THREE.Vector3(0,0,-1),-y+.45)};
}
