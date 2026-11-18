// Decode one published DSM collection off the viewer's main thread.
// LAS 1.2 coordinate doubles are converted to local metres before Float32 storage.
let decoder;
async function loadDecoder(){
 if(!decoder)decoder=import('https://esm.sh/@loaders.gl/las@3.4.1?bundle').then(m=>m.LASLoader);
 return decoder;
}
async function readFile(url){const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw Error('HTTP '+r.status+' · '+url);return r.arrayBuffer()}
self.onmessage=async ({data})=>{
 try{
  const url=new URL(data.manifest,self.location.href),r=await fetch(url);
  if(!r.ok)throw Error('Manifest HTTP '+r.status);
  const m=await r.json(),origin=m.origin_rd_for_local_xy;
  if(!Array.isArray(origin)||origin.length!==2||!origin.every(Number.isFinite)||!Array.isArray(m.files)||!m.files.length)throw Error('Invalid DSM manifest');
  if(m.total_points>12000000)throw Error('Collection exceeds 12 million point preview limit');
  self.postMessage({type:'manifest',count:m.total_points,files:m.files.length});
  const loader=await loadDecoder();
  const options={...loader.options,worker:false,las:{...loader.options?.las,shape:'mesh',fp64:true,skip:1,colorDepth:'auto'}};
  let total=0;
  for(let i=0;i<m.files.length;i++){
   const f=m.files[i];if(!/^[\w.-]+\.la[sz]$/i.test(f.file))throw Error('Unexpected point cloud filename');
   self.postMessage({type:'progress',file:i+1,files:m.files.length,total});
   const raw=await readFile(new URL(f.file,url));
   const h=new DataView(raw);
   if(raw.byteLength<227||h.getUint32(0,false)!==0x4c415346)throw Error('Invalid LAS header');
   if(h.getUint8(24)!==1||h.getUint8(25)>3)throw Error('Unsupported LAS version');
   const parsed=await loader.parse(raw,options),p=parsed?.attributes?.POSITION?.value;
   if(!p||p.length!==3*f.points)throw Error('Decoded point count differs from manifest: '+f.file);
   if(!(p instanceof Float64Array))throw Error('Decoder did not preserve double coordinates');
   const positions=new Float32Array(p.length);
   const b=f.rd_bounds,z=f.z_nap_range;
   for(let j=0;j<p.length;j+=3){
    const e=p[j],n=p[j+1],height=p[j+2];
    if(!Number.isFinite(e+n+height)||e<b[0]-.1||e>b[2]+.1||n<b[1]-.1||n>b[3]+.1||height<z[0]-.1||height>z[1]+.1)throw Error('Point outside manifest bounds: '+f.file);
    positions[j]=e-origin[0];positions[j+1]=height;positions[j+2]=-(n-origin[1]);
   }
   total+=f.points;
   self.postMessage({type:'chunk',positions,count:f.points,total},[positions.buffer]);
  }
  if(total!==m.total_points)throw Error('Total point count differs from manifest');
  self.postMessage({type:'done',total,tiles:new Set(m.files.map(f=>f.source||f.file)).size});
 }catch(e){self.postMessage({type:'error',message:e?.message||String(e)})}
};
