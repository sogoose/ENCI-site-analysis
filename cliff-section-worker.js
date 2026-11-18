// Sample a narrow corridor around one section; never construct a site-wide cloud.
let load;
const decoder=()=>load??=import('https://esm.sh/@loaders.gl/las@3.4.1?bundle').then(m=>m.LASLoader);
const openDB=()=>new Promise(resolve=>{try{const r=indexedDB.open('enci-section-samples-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('profiles');r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null)}catch{resolve(null)}});
const get=(db,key)=>new Promise(resolve=>{if(!db)return resolve(null);try{const r=db.transaction('profiles','readonly').objectStore('profiles').get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>resolve(null)}catch{resolve(null)}});
const put=(db,key,value)=>new Promise(resolve=>{if(!db)return resolve(false);try{const t=db.transaction('profiles','readwrite');t.objectStore('profiles').put(value,key);t.oncomplete=()=>resolve(true);t.onerror=()=>resolve(false);t.onabort=()=>resolve(false)}catch{resolve(false)}});
self.onmessage=async({data})=>{
 let db=null;try{
  const s=data.line,w=Number(data.halfWidth)||2,a=s.a,b=s.b,dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
  if(!len)throw Error('Invalid section line');
  const u=dx/len,v=dy/len,nx=-v,ny=u;
  const url=new URL(data.manifest,self.location.href),r=await fetch(url);
  if(!r.ok)throw Error('DSM manifest HTTP '+r.status);
  const m=await r.json(),origin=m.origin_rd_for_local_xy;
  if(!Array.isArray(origin)||!Array.isArray(m.files))throw Error('Invalid DSM manifest');
  const key=JSON.stringify([a,b,w,m.total_points,'section-v2']);
  db=await openDB();const cache=await get(db,key);
  if(cache?.samples){const samples=new Float32Array(cache.samples);self.postMessage({type:'done',samples,tiles:cache.tiles,fromCache:true},[samples.buffer]);return}
  const bbox=[Math.min(a[0],b[0])-w,Math.min(a[1],b[1])-w,Math.max(a[0],b[0])+w,Math.max(a[1],b[1])+w];
  const files=m.files.filter(f=>{const q=f.rd_bounds;return bbox[0]<=q[2]-origin[0]&&bbox[2]>=q[0]-origin[0]&&bbox[1]<=q[3]-origin[1]&&bbox[3]>=q[1]-origin[1]});
  self.postMessage({type:'progress',files:files.length,done:0});
  const las=files.length?await decoder():null,opts=las?{...las.options,worker:false,las:{...las.options?.las,shape:'mesh',fp64:true,skip:1,colorDepth:'auto'}}:null,points=[];
  for(let i=0;i<files.length;i++){
   const f=files[i];if(!/^[A-Za-z0-9_.-]+[.]la[sz]$/i.test(f.file))throw Error('Invalid LAZ filename');
   const fr=await fetch(new URL(f.file,url));if(!fr.ok)throw Error('DSM HTTP '+fr.status);
   const raw=await fr.arrayBuffer(),head=new DataView(raw);
   if(raw.byteLength<227||head.getUint32(0,false)!==0x4c415346)throw Error('Invalid LAS header');
   const decoded=await las.parse(raw,opts),p=decoded?.attributes?.POSITION?.value;
   if(!(p instanceof Float64Array)||p.length!==f.points*3)throw Error('Unexpected decoded points');
   const z=f.z_nap_range,q=f.rd_bounds;
   for(let j=0;j<p.length;j+=3){
    const east=p[j],north=p[j+1],h=p[j+2];
    if(!Number.isFinite(east+north+h)||east<q[0]-.1||east>q[2]+.1||north<q[1]-.1||north>q[3]+.1||h<z[0]-.1||h>z[1]+.1)throw Error('Invalid source sample');
    const x=east-origin[0]-a[0],y=north-origin[1]-a[1],d=x*u+y*v,offset=x*nx+y*ny;
    if(d>=0&&d<=len&&Math.abs(offset)<=w)points.push(d,h);
   }
   self.postMessage({type:'progress',files:files.length,done:i+1});
  }
  const samples=new Float32Array(points);const cached=await put(db,key,{samples:samples.slice().buffer,tiles:files.length});
  self.postMessage({type:'done',samples,tiles:files.length,cached},[samples.buffer]);
 }catch(e){self.postMessage({type:'error',message:e?.message||String(e)})}
 finally{db?.close()}
};
