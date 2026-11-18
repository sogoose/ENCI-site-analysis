// Decode only the brush-intersecting PDOK tiles. Keep a locally cached cropped
// result; source LAZ files remain as recoverable input until a verified export exists.
let decoder;
async function lasLoader(){return decoder??=import('https://esm.sh/@loaders.gl/las@3.4.1?bundle').then(m=>m.LASLoader)}
async function fetchBuffer(url){const r=await fetch(url);if(!r.ok)throw Error('HTTP '+r.status+' · '+url);return r.arrayBuffer()}
function openDatabase(){return new Promise(resolve=>{try{const q=indexedDB.open('enci-brush-cloud-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('cropped');q.onsuccess=()=>resolve(q.result);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
function readSaved(db,key){return new Promise(resolve=>{if(!db)return resolve(null);try{const q=db.transaction('cropped','readonly').objectStore('cropped').get(key);q.onsuccess=()=>resolve(q.result??null);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
function saveCrop(db,key,entry){return new Promise(resolve=>{if(!db)return resolve(false);try{const tx=db.transaction('cropped','readwrite'),store=tx.objectStore('cropped');store.clear();store.put(entry,key);tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false)}catch{resolve(false)}})}
async function selectionKey(strokes,m){const bytes=new TextEncoder().encode(JSON.stringify(['brush-crop-v1',strokes,m.total_points,m.files.map(f=>[f.file,f.points])]));
 if(self.crypto?.subtle){const d=await self.crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(d)).map(n=>n.toString(16).padStart(2,'0')).join('')}
 let h=2166136261;for(const n of bytes){h=Math.imul(h^n,16777619)}return String(h>>>0)
}
function buildSelection(strokes,m,origin){
 const bounds=m.region_rd_bounds.map((v,i)=>v-origin[i%2]),dx=bounds[2]-bounds[0],dy=bounds[3]-bounds[1];
 const groups=strokes.filter(s=>Array.isArray(s.points)&&s.points.length&&Number.isFinite(s.width)&&s.width>0).map(s=>{
  const x=s.points.map(p=>p[0]),y=s.points.map(p=>p[1]),r=s.width/2;
  return {s,box:[Math.min(...x)-r,Math.min(...y)-r,Math.max(...x)+r,Math.max(...y)+r]};
 });
 const overlap=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
 const tile=f=>{const b=f.rd_bounds;return groups.some(g=>overlap(g.box,[b[0]-origin[0],b[1]-origin[1],b[2]-origin[0],b[3]-origin[1]]))};
 let pix=null,w=0,h=0;
 if(typeof OffscreenCanvas!=='undefined'){
  const scale=Math.min(4096/Math.max(dx,dy),3);w=Math.max(1,Math.ceil(dx*scale));h=Math.max(1,Math.ceil(dy*scale));
  const ctx=new OffscreenCanvas(w,h).getContext('2d',{willReadFrequently:true});
  if(ctx){ctx.setTransform(w/dx,0,0,-h/dy,-bounds[0]*w/dx,bounds[3]*h/dy);
   ctx.fillStyle=ctx.strokeStyle='#fff';ctx.lineCap=ctx.lineJoin='round';
   for(const {s} of groups){ctx.beginPath();if(s.points.length===1){ctx.arc(s.points[0][0],s.points[0][1],s.width/2,0,Math.PI*2);ctx.fill()}
    else{ctx.lineWidth=s.width;s.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke()}}
   pix=ctx.getImageData(0,0,w,h).data
  }
 }
 const segments=[];if(!pix)for(const {s,box} of groups)for(let i=0;i<Math.max(1,s.points.length-1);i++){
  segments.push({a:s.points[i],b:s.points[Math.min(i+1,s.points.length-1)],r2:(s.width/2)**2,box})
 }
 const contains=(x,y)=>{if(pix){const u=Math.floor((x-bounds[0])/dx*w),v=Math.floor((bounds[3]-y)/dy*h);return u>=0&&u<w&&v>=0&&v<h&&pix[(v*w+u)*4+3]>=80}
  for(const {a,b,r2,box} of segments){if(x<box[0]||x>box[2]||y<box[1]||y>box[3])continue;const vx=b[0]-a[0],vy=b[1]-a[1];
   const t=Math.max(0,Math.min(1,((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy||1)));
   if((x-a[0]-t*vx)**2+(y-a[1]-t*vy)**2<=r2)return true}return false};
 return {tile,contains};
}
self.onmessage=async ({data})=>{
 let db=null;
 try{
  const strokes=(data.strokes||[]).filter(s=>s?.points?.length&&s.width>0);
  if(!strokes.length)throw Error('Paint a region before loading point cloud');
  const url=new URL(data.manifest,self.location.href),response=await fetch(url);
  if(!response.ok)throw Error('Manifest HTTP '+response.status);
  const m=await response.json(),origin=m.origin_rd_for_local_xy;
  if(!Array.isArray(origin)||origin.length!==2||!origin.every(Number.isFinite)||!Array.isArray(m.files)||!m.files.length)throw Error('Invalid DSM manifest');
  if(m.total_points>12000000)throw Error('Source cloud exceeds preview limit');
  const key=await selectionKey(strokes,m);db=await openDatabase();
  const saved=await readSaved(db,key);
  if(saved?.complete&&Array.isArray(saved.chunks)){
   self.postMessage({type:'manifest',count:saved.total,files:saved.tiles,sourceTiles:m.files.length,fromCache:true});
   let count=0;for(const item of saved.chunks){const positions=new Float32Array(item.buffer);count+=item.count;self.postMessage({type:'chunk',positions,count:item.count,total:count},[positions.buffer])}
   self.postMessage({type:'done',total:saved.total,tiles:saved.tiles,sourceTiles:m.files.length,fromCache:true});return
  }
  const filter=buildSelection(strokes,m,origin),files=m.files.filter(filter.tile);
  self.postMessage({type:'manifest',count:0,files:files.length,sourceTiles:m.files.length});
  const loader=files.length?await lasLoader():null;
  const opts=loader?{...loader.options,worker:false,las:{...loader.options?.las,shape:'mesh',fp64:true,skip:1,colorDepth:'auto'}}:null;
  let total=0;const chunks=[];
  for(let i=0;i<files.length;i++){
   const f=files[i];if(!/^[\\w.-]+\\.la[sz]$/i.test(f.file))throw Error('Unexpected point filename');
   self.postMessage({type:'progress',file:i+1,files:files.length,total});
   const raw=await fetchBuffer(new URL(f.file,url)),head=new DataView(raw);
   if(raw.byteLength<227||head.getUint32(0,false)!==0x4c415346)throw Error('Invalid LAS header');
   if(head.getUint8(24)!==1||head.getUint8(25)>3)throw Error('Unsupported LAS version');
   const parsed=await loader.parse(raw,opts),p=parsed?.attributes?.POSITION?.value;
   if(!p||p.length!==3*f.points||!(p instanceof Float64Array))throw Error('Unexpected LAS decode for '+f.file);
   const b=f.rd_bounds,z=f.z_nap_range,selected=[];
   for(let j=0;j<p.length;j+=3){const e=p[j],n=p[j+1],height=p[j+2];
    if(!Number.isFinite(e+n+height)||e<b[0]-.1||e>b[2]+.1||n<b[1]-.1||n>b[3]+.1||height<z[0]-.1||height>z[1]+.1)throw Error('Out-of-bounds point in '+f.file);
    const x=e-origin[0],y=n-origin[1];if(filter.contains(x,y))selected.push(x,height,-y)
   }
   if(selected.length){const positions=new Float32Array(selected),count=positions.length/3;total+=count;chunks.push({buffer:positions.buffer,count});
    const preview=positions.slice();self.postMessage({type:'chunk',positions:preview,count,total},[preview.buffer])}
  }
  const stored=await saveCrop(db,key,{complete:true,total,tiles:files.length,chunks});
  self.postMessage({type:'done',total,tiles:files.length,sourceTiles:m.files.length,cacheStored:stored})
 }catch(e){self.postMessage({type:'error',message:e?.message||String(e)})}
 finally{db?.close()}
};