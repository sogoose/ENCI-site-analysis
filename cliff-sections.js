import * as THREE from 'three';
export function inside(x,y,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
const indexes=new WeakMap();
export function makeIndex(root){if(indexes.has(root))return indexes.get(root);const p=build(root).catch(e=>{indexes.delete(root);throw e});indexes.set(root,p);return p}
async function build(root){
 root.updateMatrixWorld(true);const buckets=new Map(),large=[],cell=35,meshes=[];root.traverse(o=>{if(o.isMesh&&o.geometry?.attributes.position)meshes.push(o)});
 const key=(x,y)=>x+','+y;let count=0;const q=new THREE.Vector3();
 for(const o of meshes){const pos=o.geometry.attributes.position,idx=o.geometry.index,n=idx?idx.count:pos.count,v=new Float64Array(pos.count*3);
 for(let i=0;i<pos.count;i++){q.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);v[i*3]=q.x;v[i*3+1]=-q.z;v[i*3+2]=q.y;if(i&&i%50000===0)await new Promise(r=>setTimeout(r,0))}
 for(let i=0;i+2<n;i+=3){if(i&&i%30000===0)await new Promise(r=>setTimeout(r,0));const a=(idx?idx.getX(i):i)*3,b=(idx?idx.getX(i+1):i+1)*3,c=(idx?idx.getX(i+2):i+2)*3;const ax=v[a],ay=v[a+1],az=v[a+2],bx=v[b]-ax,by=v[b+1]-ay,cx=v[c]-ax,cy=v[c+1]-ay,det=bx*cy-by*cx;if(Math.abs(det)<1e-8)continue;
 const x0=Math.min(ax,v[b],v[c]),x1=Math.max(ax,v[b],v[c]),y0=Math.min(ay,v[b+1],v[c+1]),y1=Math.max(ay,v[b+1],v[c+1]),t=[ax,ay,az,bx,by,v[b+2]-az,cx,cy,v[c+2]-az,1/det,x0,y0,x1,y1];const u0=Math.floor(x0/cell),u1=Math.floor(x1/cell),w0=Math.floor(y0/cell),w1=Math.floor(y1/cell);
 if((u1-u0+1)*(w1-w0+1)>100){large.push(t)}else for(let u=u0;u<=u1;u++)for(let w=w0;w<=w1;w++){const k=key(u,w);let list=buckets.get(k);if(!list)buckets.set(k,list=[]);list.push(t)}count++}
 }
 if(!count)throw Error('No terrain triangles found');
 function height(x,y){let best=null;const lists=[buckets.get(key(Math.floor(x/cell),Math.floor(y/cell)))||[],large];for(const list of lists)for(const t of list){if(x<t[10]-1e-6||x>t[12]+1e-6||y<t[11]-1e-6||y>t[13]+1e-6)continue;const dx=x-t[0],dy=y-t[1],u=(dx*t[7]-dy*t[6])*t[9],w=(t[3]*dy-t[4]*dx)*t[9];if(u>=-1e-6&&w>=-1e-6&&u+w<=1.000001){const h=t[2]+u*t[5]+w*t[8];if(best===null||h>best)best=h}}return best}
 return {height,count}
}
export function profile(index,s,step=2){const len=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]),n=Math.max(1,Math.ceil(len/step));return Array.from({length:n+1},(_,i)=>{const t=i/n;return [t*len,index.height(s.a[0]+t*(s.b[0]-s.a[0]),s.a[1]+t*(s.b[1]-s.a[1]))]})}
function raster(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);resolve(g.getImageData(0,0,c.width,c.height))}catch(e){reject(e)}};im.onerror=()=>reject(Error('Raster unavailable: '+url));im.src=url})}
const hex=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
function pixel(im,b,x,y){const u=Math.floor((x-b[0])/(b[2]-b[0])*im.width),v=Math.floor((b[3]-y)/(b[3]-b[1])*im.height);if(u<0||v<0||u>=im.width||v>=im.height)return null;const i=(v*im.width+u)*4;return im.data[i+3]>=128?[im.data[i],im.data[i+1],im.data[i+2]]:null}
function delta(a,b){return a?Math.max(...a.map((v,i)=>Math.abs(v-b[i]))):Infinity}
export async function cliffCandidates(manifest,ring){const b=manifest.model_bounds,sl=manifest.layers.find(l=>l.layer==='Slope'),as=manifest.layers.find(l=>l.layer==='Aspect');if(!sl||!as)throw Error('Slope/aspect manifest missing');const [s,a]=await Promise.all([raster('assets/environment/Slope.png'),raster('assets/environment/Aspect.png')]);const threshold=hex(sl.legend['9'].color),dirs=Object.entries(as.legend).map(([k,v])=>({angle:Number(k)*Math.PI/4,color:hex(v.color)}));const step=10,cells=[],set=new Set(),key=(i,j)=>i+','+j;
 for(let j=0;b[1]+(j+.5)*step<b[3];j++)for(let i=0;b[0]+(i+.5)*step<b[2];i++){const x=b[0]+(i+.5)*step,y=b[1]+(j+.5)*step;if(!inside(x,y,ring)||delta(pixel(s,b,x,y),threshold)>3)continue;set.add(key(i,j));const p=pixel(a,b,x,y),d=dirs.find(d=>delta(p,d.color)<=3);if(d)cells.push({i,j,x,y,angle:d.angle})}
 for(const c of cells){let score=0;for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)if(set.has(key(c.i+i,c.j+j)))score++;c.score=score}
 cells.sort((a,b)=>b.score-a.score||a.y-b.y||a.x-b.x);const chosen=[];for(const c of cells){if(chosen.some(p=>Math.hypot(p.x-c.x,p.y-c.y)<120))continue;chosen.push(c);if(chosen.length>=24)break}
 if(!chosen.length)throw Error('No matching slope/aspect pixels within study perimeter');
 const canvas=document.createElement('canvas');canvas.width=s.width;canvas.height=s.height;const ctx=canvas.getContext('2d'),img=ctx.createImageData(s.width,s.height);for(let i=0;i<s.data.length;i+=4){if(s.data[i+3]>=128&&Math.abs(s.data[i]-threshold[0])<=3&&Math.abs(s.data[i+1]-threshold[1])<=3&&Math.abs(s.data[i+2]-threshold[2])<=3){const p=i/4,x=b[0]+(p%s.width+.5)/s.width*(b[2]-b[0]),y=b[3]-(Math.floor(p/s.width)+.5)/s.height*(b[3]-b[1]);if(inside(x,y,ring)){img.data[i]=211;img.data[i+1]=60;img.data[i+2]=33;img.data[i+3]=225}}}ctx.putImageData(img,0,0);
 // Preserve the selected steep-slope candidates; renumber along the route annotated in the atlas overview (November 18).
 const route=[4,1,9,7,21,14,22,15,16,6,17,2,8,10,19,23,5,3,13,12,18,20,24,11];
 const ranked=chosen.map((c,i)=>({...c,rank:i+1}));const order=new Map(route.map((r,i)=>[r,i]));
 ranked.sort((a,b)=>(order.get(a.rank)??100+a.rank)-(order.get(b.rank)??100+b.rank));
 return {candidates:ranked.map((c,i)=>({...c,id:'S'+String(i+1).padStart(2,'0')})),cellCount:set.size,canvas}
}
export function lineFor(c,len,b){const dx=Math.sin(c.angle),dy=Math.cos(c.angle);const limit=(x,y,sign)=>{let t=len/2;for(const [p,d,lo,hi] of [[x,dx*sign,b[0],b[2]],[y,dy*sign,b[1],b[3]]])if(Math.abs(d)>1e-8)t=Math.min(t,((d>0?hi:lo)-p)/d);return Math.max(0,t)};const a=limit(c.x,c.y,-1),z=limit(c.x,c.y,1);return {id:c.id,label:c.id+'—'+c.id+'′',a:[c.x-dx*a,c.y-dy*a],b:[c.x+dx*z,c.y+dy*z],center:[c.x,c.y],angle:c.angle}}
