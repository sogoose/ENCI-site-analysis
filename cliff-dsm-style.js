import * as THREE from 'three';

// All rasters use the atlas local XY bounds. North is +Y in local coordinates, -Z in Three.
const BROWN=new THREE.Color('#a69a83');
function readRaster(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);resolve(ctx.getImageData(0,0,c.width,c.height))}catch(e){reject(e)}};im.onerror=()=>reject(Error('Raster unavailable: '+url));im.src=url})}
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
function matches(data,i,c){return data[i+3]>=128&&Math.max(Math.abs(data[i]-c[0]),Math.abs(data[i+1]-c[1]),Math.abs(data[i+2]-c[2]))<=3}
export function makeScreen(slope,cover,legend,bounds){
 const w=slope.width,h=slope.height,raw=new Uint8Array(w*h),out=new Uint8Array(w*h*4),inks=Object.entries(legend).filter(([k])=>Number(k)>=6).map(([,v])=>rgb(v.color));
 for(let i=0;i<raw.length;i++)raw[i]=inks.some(c=>matches(slope.data,i*4,c))?1:0;
 // 30 degree DTM core, approx. 10 m margin for raster registration and narrow cliff edges.
 const rx=Math.max(1,Math.ceil(10*w/(bounds[2]-bounds[0]))),ry=Math.max(1,Math.ceil(10*h/(bounds[3]-bounds[1])));
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){
  let steep=0;for(let dy=-ry;dy<=ry&&!steep;dy++)for(let dx=-rx;dx<=rx;dx++){if((dx/rx)**2+(dy/ry)**2>1.01)continue;const x=i+dx,y=j+dy;if(x>=0&&x<w&&y>=0&&y<h&&raw[y*w+x]){steep=1;break}}
  const u=Math.min(cover.width-1,Math.floor((i+.5)*cover.width/w)),v=Math.min(cover.height-1,Math.floor((j+.5)*cover.height/h)),p=(v*cover.width+u)*4,k=((h-1-j)*w+i)*4;
  out[k]=steep*255;out[k+1]=matches(cover.data,p,[0,100,200])?255:0;out[k+2]=matches(cover.data,p,[250,0,0])?255:0;out[k+3]=matches(cover.data,p,[0,100,0])?255:0;
 }
 return {out,w,h}
}
function capture(renderer,root,bounds,building=false){
 const scene=new THREE.Scene(),mats=new Map(),box=new THREE.Box3().setFromObject(root);
 if(box.isEmpty())throw Error('Empty projection source');
 root.updateMatrixWorld(true);let count=0;
 root.traverse(n=>{if(!n.isMesh||!n.geometry)return;const a=Array.isArray(n.material)?n.material:[n.material];if(!building&&!a.some(m=>m?.map&&n.geometry.attributes.uv))return;
 const arr=a.map(m=>{const key=building?'building':m;if(!mats.has(key))mats.set(key,new THREE.MeshBasicMaterial({color:building?0xffffff:m?.map?0xffffff:BROWN,map:building?null:m?.map||null,side:THREE.DoubleSide,toneMapped:false}));return mats.get(key)});
 const c=new THREE.Mesh(n.geometry,Array.isArray(n.material)?arr:arr[0]);c.matrixAutoUpdate=false;c.matrix.copy(n.matrixWorld);c.matrixWorldNeedsUpdate=true;scene.add(c);count++});
 if(!count){for(const m of mats.values())m.dispose();throw Error(building?'No building meshes':'No terrain diffuse textures')}
 const [x0,y0,x1,y1]=bounds,cx=(x0+x1)/2,cy=(y0+y1)/2,dx=x1-x0,dy=y1-y0;
 const cap=Math.min(3072,renderer.capabilities.maxTextureSize),scale=cap/Math.max(dx,dy);
 const rt=new THREE.WebGLRenderTarget(Math.max(1,Math.round(dx*scale)),Math.max(1,Math.round(dy*scale)),{minFilter:building?THREE.NearestFilter:THREE.LinearFilter,magFilter:building?THREE.NearestFilter:THREE.LinearFilter,depthBuffer:true,generateMipmaps:false});
 const cam=new THREE.OrthographicCamera(-dx/2,dx/2,dy/2,-dy/2,.1,Math.max(1000,box.max.y-box.min.y+1000));cam.up.set(0,0,-1);cam.position.set(cx,box.max.y+500,-cy);cam.lookAt(cx,box.min.y,-cy);cam.updateMatrixWorld(true);
 const old=renderer.getRenderTarget(),color=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha(),planes=renderer.clippingPlanes,auto=renderer.autoClear;
 try{renderer.clippingPlanes=[];renderer.autoClear=true;renderer.setRenderTarget(rt);renderer.setClearColor(building?0x000000:BROWN,1);renderer.clear();renderer.render(scene,cam)}
 catch(e){rt.dispose();throw e}
 finally{renderer.setRenderTarget(old);renderer.setClearColor(color,alpha);renderer.clippingPlanes=planes;renderer.autoClear=auto;for(const m of mats.values())m.dispose()}
 return rt
}
export function createDsmStyle({renderer,bounds,manifest,getBuildings,dispose,onChange}){
 let textureTarget=null,buildingTarget=null,screen=null,pending=null,model=null,epoch=0,status='';const flags={texture:true,focus:true,trees:false};let regionTexture=null;
 const zero=new THREE.DataTexture(new Uint8Array([0,0,0,0]),1,1);zero.needsUpdate=true;
 const u={photo:{value:zero},screen:{value:zero},buildings:{value:zero},region:{value:zero},hasRegion:{value:0},bounds:{value:new THREE.Vector4(...bounds)},base:{value:BROWN},hasPhoto:{value:0},hasScreen:{value:0},hasBuildings:{value:0},usePhoto:{value:1},focus:{value:1},hideTrees:{value:0},pointSize:{value:1.25*renderer.getPixelRatio()}};
 function change(){u.usePhoto.value=flags.texture?1:0;u.focus.value=flags.focus?1:0;u.hideTrees.value=flags.trees?1:0;onChange?.()}
 function reset(){epoch++;pending=null;model=null;for(const t of [textureTarget,buildingTarget,screen])t?.dispose();textureTarget=buildingTarget=screen=null;u.photo.value=u.screen.value=u.buildings.value=zero;u.hasPhoto.value=u.hasScreen.value=u.hasBuildings.value=0;status=''}
 async function prepare(root){
  if(root===model&&pending)return pending;if(root===model&&u.hasPhoto.value&&u.hasScreen.value)return;
  if(root!==model)reset();model=root;const run=epoch,errs=[];status='Preparing photo and cliff masks…';onChange?.();
  pending=(async()=>{
   try{if(!textureTarget){textureTarget=capture(renderer,root,bounds);u.photo.value=textureTarget.texture;u.hasPhoto.value=1}}catch(e){errs.push('Photo: '+e.message)}
   try{if(!screen){const [s,c]=await Promise.all([readRaster('assets/environment/Slope.png'),readRaster('assets/environment/Land_Cover_2020.png')]);if(run!==epoch)return;const d=makeScreen(s,c,manifest.layers.find(l=>l.layer==='Slope').legend,bounds);screen=new THREE.DataTexture(d.out,d.w,d.h);screen.minFilter=screen.magFilter=THREE.NearestFilter;screen.needsUpdate=true;u.screen.value=screen;u.hasScreen.value=1}}catch(e){errs.push('Slope/water filter: '+e.message)}
   try{if(!buildingTarget){const b=await getBuildings();try{if(run!==epoch)return;buildingTarget=capture(renderer,b,bounds,true);u.buildings.value=buildingTarget.texture;u.hasBuildings.value=1}finally{dispose(b)}}}catch(e){errs.push('Building mask: '+e.message)}
   if(run!==epoch)return;status=errs.length?errs.join(' · '):'';onChange?.()
  })().finally(()=>{if(run===epoch)pending=null});return pending
 }
 function setRegions(rings,strokes=[]){
  regionTexture?.dispose();regionTexture=null;u.region.value=zero;u.hasRegion.value=0;
  if(rings.length||strokes.length){
   const c=document.createElement('canvas'),dx=bounds[2]-bounds[0],dy=bounds[3]-bounds[1],scale=Math.min(4096,renderer.capabilities.maxTextureSize)/Math.max(dx,dy);
   c.width=Math.max(1,Math.round(dx*scale));c.height=Math.max(1,Math.round(dy*scale));
   const ctx=c.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,c.width,c.height);
   ctx.setTransform(c.width/dx,0,0,-c.height/dy,-bounds[0]*c.width/dx,bounds[3]*c.height/dy);
   ctx.fillStyle=ctx.strokeStyle='#fff';ctx.lineCap=ctx.lineJoin='round';
   for(const ring of rings){ctx.beginPath();ring.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill()}
   for(const {width,points} of strokes){if(!points.length)continue;ctx.beginPath();if(points.length===1){ctx.arc(points[0][0],points[0][1],width/2,0,Math.PI*2);ctx.fill()}else{ctx.lineWidth=width;points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke()}}
   regionTexture=new THREE.CanvasTexture(c);regionTexture.minFilter=regionTexture.magFilter=THREE.NearestFilter;regionTexture.generateMipmaps=false;u.region.value=regionTexture;u.hasRegion.value=1;
  }onChange?.()
 }
 function material(){return new THREE.ShaderMaterial({uniforms:u,depthTest:true,depthWrite:true,transparent:false,vertexShader:'uniform float pointSize;uniform vec4 bounds;varying vec2 uvMap;void main(){vec4 w=modelMatrix*vec4(position,1.);uvMap=(vec2(w.x,-w.z)-bounds.xy)/(bounds.zw-bounds.xy);gl_Position=projectionMatrix*viewMatrix*w;gl_PointSize=pointSize;}',fragmentShader:'uniform sampler2D photo,screen,buildings,region;uniform vec3 base;uniform float hasPhoto,hasScreen,hasBuildings,hasRegion,usePhoto,focus,hideTrees;varying vec2 uvMap;void main(){vec2 q=clamp(uvMap,0.,1.);if(hasRegion>.5&&texture2D(region,q).r<.5)discard;if(focus>.5){if(hasScreen>.5){vec4 m=texture2D(screen,q);if(m.r<.5||m.g>.5||m.b>.5||(hideTrees>.5&&m.a>.5))discard;}if(hasBuildings>.5&&texture2D(buildings,q).r>.5)discard;}vec3 ink=usePhoto>.5&&hasPhoto>.5?texture2D(photo,q).rgb:base;gl_FragColor=vec4(ink,1.);\n#include <colorspace_fragment>\n}'})}
 return {flags,prepare,reset,material,change,setRegions,get status(){return status},get ready(){return !!u.hasScreen.value},get photo(){return !!u.hasPhoto.value}}
}
