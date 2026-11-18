import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createRhinoAssets} from './rhino-assets.js?v=4';

const $=s=>document.querySelector(s);
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const say=s=>$('#status').textContent=s;
const json=async path=>{const r=await fetch(path);if(!r.ok)throw new Error('Unavailable: '+path);return r.json()};
const cfg=await json('./atlas.json');
const walking=await json('./assets/context/walking.json').catch(()=>({official:[],boundary:null}));
const envManifest=await json('./assets/environment/manifest.json').catch(()=>null);
const envLabels={Slope:'Slope',Aspect:'Aspect',Land_Cover_2020:'Land cover · 2020',Forest_Cover_2020_V4:'Forest cover · 2020',Surface_Water_Occurrence_1984_2021:'Water occurrence · 1984–2021',Water_Recurrence_1984_2021:'Water recurrence · 1984–2021',Flood_Risk_WMS_01:'Flood risk areas',Air_NO2_2024_25m:'NO₂ · 2024 / 25 m',Air_PM10_2024_25m:'PM10 · 2024 / 25 m',Air_PM25_2024_25m:'PM2.5 · 2024 / 25 m',Air_NO2_2025:'NO₂ · 2025 / 1 km',Air_PM10_2025:'PM10 · 2025 / 1 km',Air_PM25_2025:'PM2.5 · 2025 / 1 km',Air_NOx_2025:'NOx · 2025 / 1 km',Air_SO2_2025:'SO₂ · 2025 / 1 km',Water_Chemical_Status_2022:'Surface water · chemical',Water_Ecological_Status_2022:'Surface water · ecological',Groundwater_Chemical_Status_2022:'Groundwater · chemical',Groundwater_Quantitative_Status_2022:'Groundwater · quantitative',Water_Monitoring_Sites_2022:'Water monitoring sites'};
if(envManifest){const priority=['Slope','Aspect','Land_Cover_2020','Forest_Cover_2020_V4','Surface_Water_Occurrence_1984_2021','Water_Recurrence_1984_2021','Flood_Risk_WMS_01','Air_NO2_2024_25m','Air_PM10_2024_25m','Air_PM25_2024_25m','Water_Chemical_Status_2022','Water_Ecological_Status_2022','Groundwater_Chemical_Status_2022','Groundwater_Quantitative_Status_2022','Water_Monitoring_Sites_2022','Air_NO2_2025','Air_PM10_2025','Air_PM25_2025','Air_NOx_2025','Air_SO2_2025'];cfg.environment=envManifest.layers.filter(l=>['ok','map_only'].includes(l.status)).sort((a,b)=>priority.indexOf(a.layer)-priority.indexOf(b.layer)).map(l=>({...l,label:envLabels[l.layer]||l.layer,url:'assets/environment/'+l.layer+'.png',bounds:envManifest.model_bounds,qa:/^Air_.*_2025$/.test(l.layer)}))}

const [xmin,ymin,xmax,ymax]=cfg.bounds, cx=(xmin+xmax)/2, cz=-(ymin+ymax)/2;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xffffff);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.domElement.setAttribute('aria-label','3D terrain: drag to rotate, scroll to zoom');
$('#viewport').append(renderer.domElement);
const camera=new THREE.OrthographicCamera(-1800,1800,1800,-1800,.1,50000);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=false;controls.rotateSpeed=.8;controls.panSpeed=1;controls.zoomSpeed=1;controls.zoomToCursor=true;controls.mouseButtons={LEFT:null,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.ROTATE};controls.minZoom=.08;controls.maxZoom=30;
controls.maxPolarAngle=Math.PI/2-.003;
scene.add(new THREE.HemisphereLight(0xffffff,0xaaa79f,2.0));
const sun=new THREE.DirectionalLight(0xffffff,2.5);sun.position.set(-3000,4500,2600);scene.add(sun);
const terrain=new THREE.Group(),context=new THREE.Group(),overlay=new THREE.Group(),sectionMark=new THREE.Group();
scene.add(terrain,context,overlay,sectionMark);
const cache=new Map();
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const draco=new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/');
loader.setDRACOLoader(draco);
const ktx=new KTX2Loader().setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/basis/').detectSupport(renderer);
loader.setKTX2Loader(ktx);
let year=2010,mode='terrain',stack=false,detail=false,active=null,kind='',localFile=null,serial=0,contextSerial=0,envSerial=0,env=null,opacity=.8,section='A',compare=true,selectedView=null,dirty=true,profiles={},presentProfiles={};
const enabled=new Set(['buildings']), grids=new Map();
let studyBoundary=true,walkingNetwork=false,walkBusy=false,walkMessage='',walkData=null,selectedWalks=new Set(),importedWalks=new Map();
let stackGap=650,stackEntries=[],stackLoading=false,nativeLayers=[],layerOverrides={},contextInfo={},roadCache=null;
const preview=await json('./assets/terrain/preview-grid.json');
const compressed=Uint8Array.from(atob(preview.data),v=>v.charCodeAt(0));
const bytes=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
const nx=preview.width,ny=preview.height,nn=nx*ny;
if(bytes.length!==nn*preview.years.length)throw Error('Preview grid size mismatch');
let previous=new Uint8Array(nn);
for(let i=0;i<preview.years.length;i++){const z=new Uint8Array(nn);for(let j=0;j<nn;j++)z[j]=(previous[j]+bytes[i*nn+j])&255;grids.set(preview.years[i],z);previous=z}
grids.set(1975,grids.get(1970));
const makeDirty=()=>{dirty=true};
const rhino=createRhinoAssets(cfg.rhino||{},makeDirty,p=>say('Reading Rhino file · '+p+'%'));
controls.addEventListener('change',makeDirty);
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);const aspect=w/h;camera.left=-1800*aspect;camera.right=1800*aspect;camera.top=1800;camera.bottom=-1800;camera.updateProjectionMatrix();makeDirty()}
addEventListener('resize',resize);resize();
function dispose(o){if(o.userData?.atlasShared){o.userData.atlasDispose?.();return;}const g=new Set(),m=new Set(),t=new Set();o.traverse(n=>{if(n.geometry)g.add(n.geometry);for(const a of Array.isArray(n.material)?n.material:[n.material])if(a){m.add(a);for(const v of Object.values(a))if(v?.isTexture)t.add(v)}});g.forEach(v=>v.dispose());m.forEach(v=>v.dispose());t.forEach(v=>v.dispose())}
function clear(group){for(const o of [...group.children]){group.remove(o);dispose(o)}makeDirty()}
let overlayMaterial=null;
function clearEnv(){envSerial++;overlay.clear();if(overlayMaterial){overlayMaterial.uniforms.map.value.dispose();overlayMaterial.dispose();overlayMaterial=null}makeDirty()}
function gridMesh(y){const z=grids.get(y);if(!z)throw Error('No historical preview');const p=[],idx=[],uv=[];
for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){let u=i/(nx-1),v=j/(ny-1);p.push(xmin+u*(xmax-xmin),z[j*nx+i],-(ymin+v*(ymax-ymin)));uv.push(u,v)}
for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){let a=j*nx+i,b=a+1,c=a+nx,d=c+1;idx.push(a,b,c,b,d,c)}
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
return new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xbebcb2,roughness:.98,metalness:0,side:THREE.DoubleSide,flatShading:false}))}
function fit(plan=false){const box=new THREE.Box3().setFromObject(terrain);const c=box.isEmpty()?new THREE.Vector3(cx,65,cz):box.getCenter(new THREE.Vector3());controls.target.copy(c);const d=7000;camera.position.copy(c).add(plan?new THREE.Vector3(0,d,.01):stack?new THREE.Vector3(d*.8,d*.19,d*.85):new THREE.Vector3(d*.63,d*.66,d*.83));camera.lookAt(c);camera.updateMatrixWorld(true);
if(!box.isEmpty()){let mx=0,my=0;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const v=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);mx=Math.max(mx,Math.abs(v.x));my=Math.max(my,Math.abs(v.y))}camera.zoom=Math.min((camera.right-camera.left)*.45/Math.max(mx,1),(camera.top-camera.bottom)*(stack?.41:.4)/Math.max(my,1));camera.updateProjectionMatrix()}
controls.update();makeDirty()}
async function exists(url){try{const r=await fetch(url,{method:'HEAD',cache:'no-cache'});return r.ok&&!/text\/html/i.test(r.headers.get('content-type')||'')}catch{return false}}
async function getGLB(url){const o=(await loader.loadAsync(url)).scene;if(new THREE.Box3().setFromObject(o).isEmpty()){dispose(o);throw Error('Empty model')}return o}
const yearRow=y=>cfg.years.find(r=>r.year===y);
function updateUI(){const date=$('#date');date.textContent=stack?'1950—2010':year===2026?'Present':String(year);
$('#source').textContent=stack?('Exploded comparison · '+stackEntries.filter(e=>e.kind==='preview').length+' preview layers · spacing illustrative'):year===2026?(kind==='local'?'Local preview · source date unverified':kind==='detail'?'Current detail · source date unverified':'Current terrain · source date unverified'):(year===1975?'1970 map reused for 1975 · inferred elevations':'Historical reconstruction · inferred elevations')+(kind==='preview'?' · low-resolution preview':'');
if(!stack&&active?.userData?.atlasNote)$('#source').textContent=active.userData.atlasNote;
$('#detail').hidden=stack||year!==2026||kind==='local';$('#detail').classList.toggle('active',detail);$('#detail').textContent=detail?'Overview':'Detail';
$('#stack').classList.toggle('active',stack);$('#stack-spacing').hidden=!stack;$('#stack-labels').hidden=!stack;$('#stack').textContent=stack?'Single':'Stack';
$('#timeline').replaceChildren();for(const r of cfg.years){const b=el('button',r.year===2026?'Now':String(r.year),!stack&&year===r.year?'active':'');b.setAttribute('aria-pressed',String(!stack&&year===r.year));b.onclick=()=>selectYear(r.year,false);$('#timeline').append(b)}
document.querySelectorAll('#modes button').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode))})}
async function selectYear(y,wantDetail=false,file=null){const token=++serial;const row=yearRow(y);say('Loading '+(y===2026?'current terrain':y)+'…');let model=null,nextKind='glb';
try{if(file){const url=URL.createObjectURL(file);try{model=await getGLB(url);nextKind='local'}finally{URL.revokeObjectURL(url)}}else{const url=wantDetail?row.detail:row.url;if(url&&await exists(url)){try{model=await getGLB(url);nextKind=wantDetail?'detail':'glb'}catch(e){if(y===2026)throw e}}
if(!model&&!wantDetail&&cfg.rhino){try{model=y===2026?await rhino.present():await rhino.history(y,gridMesh);nextKind='rhino'}catch(e){console.warn('Rhino source:',e);if(y===2026)throw e}}
if(!model&&y===1975){const u=yearRow(1970).url;if(await exists(u)){try{model=await getGLB(u);nextKind='glb'}catch(e){console.warn(e)}}}
if(!model&&y!==2026){model=gridMesh(y);nextKind='preview'}
if(!model)throw Error('Asset not uploaded: '+url)}
if(token!==serial){dispose(model);return}
clearEnv();contextSerial++;clear(context);clear(sectionMark);clear(terrain);
const needsFit=stack||kind==='preview'&&nextKind==='rhino'&&y===2026;year=y;detail=wantDetail;stack=false;stackEntries=[];$('#stack-labels').replaceChildren();kind=nextKind;active=model;terrain.add(model);if(file)localFile=file;
updateUI();renderDrawer();if(mode==='sections')drawSection();if(mode==='environment'&&env)applyEnv();renderContext();
if(!selectYear.fitted||needsFit){fit();selectYear.fitted=true}
else makeDirty();say('');
const b=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());if(b.x<100||b.z<100||b.x>12000||b.z>12000)say('Check model units and orientation — expected local metres, Y up.');
if(selectedView!==null&&mode==='views')moveView(selectedView,false);
}catch(e){if(token===serial)say(e.message+' · previous terrain retained.');if(model&&model!==active)dispose(model)}}
function placeStack(){for(const [i,e] of stackEntries.entries()){e.group.position.y=i*stackGap-e.base;e.group.updateMatrixWorld(true)}makeDirty()}
function projectStackLabels(){const host=$('#stack-labels');if(!stack)return;for(const e of stackEntries){const box=e.box,point=new THREE.Vector3(box.max.x,box.min.y+e.group.position.y+20,box.max.z).project(camera);e.label.style.left=((point.x+1)*innerWidth/2+7)+'px';e.label.style.top=((1-point.y)*innerHeight/2)+'px';e.label.hidden=point.z<-1||point.z>1}}
async function stackModel(y){const row=yearRow(y);try{if(await exists(row.url))return {model:await getGLB(row.url),kind:'glb'}}catch(e){console.warn(e)}
try{return {model:await rhino.history(y,gridMesh),kind:'rhino'}}catch(e){console.warn('Stack '+y,e)}
if(y===1975){try{if(await exists(yearRow(1970).url))return {model:await getGLB(yearRow(1970).url),kind:'glb'}}catch(e){console.warn(e)}}
return {model:gridMesh(y),kind:'preview'}}
async function showStack(){const token=++serial;stackLoading=true;$('#stack').disabled=true;say('Loading historical Rhino layers…');const entries=[];
try{for(const row of cfg.years.filter(r=>r.year!==2026)){const {model,kind}=await stackModel(row.year);if(token!==serial){dispose(model);return}model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model);const group=new THREE.Group();group.userData.atlasShared=true;group.userData.atlasDispose=()=>dispose(model);group.add(model);
const label=el('span',String(row.year)+(kind==='preview'?' *':''),'stack-label');entries.push({group,base:box.min.y,box,label,year:row.year,kind});say('Loading historical layers · '+entries.length+'/8')}
if(token!==serial)return;contextSerial++;clearEnv();clear(context);clear(sectionMark);clear(terrain);stack=true;detail=false;active=null;kind='stack';stackEntries=entries;$('#stack-labels').replaceChildren(...entries.map(e=>e.label));for(const e of entries)terrain.add(e.group);placeStack();setMode('terrain');updateUI();fit();say(entries.some(e=>e.kind==='preview')?'* Source layer unavailable — coarse fallback':'');
}catch(e){if(token===serial)say('Stack: '+e.message)}finally{if(!stack||stackEntries!==entries)for(const e of entries)dispose(e.group);stackLoading=false;$('#stack').disabled=false}}


function option(label,fn,on=false,end=''){const b=el('button',undefined,'option'+(on?' active':''));b.append(el('span',label),el('i',end||(on?'●':'')));b.onclick=fn;return b}
function sub(s){return el('p',s,'subnote')}
function legend(l){
const box=el('div',undefined,'legend');const unit=(l.unit||'').replace('ug/m3','µg/m³');const head=el('div',[unit,l.resolution_m?l.resolution_m.join(' × ')+' m':null].filter(Boolean).join(' · '),'legend-unit');if(head.textContent)box.append(head);
if(l.legend){for(const [key,item] of Object.entries(l.legend)){const row=el('div',undefined,'legend-row'),sw=el('span',undefined,'legend-swatch'),obj=Array.isArray(item)?{color:'rgba('+item.slice(0,3).join(',')+','+(item[3]??255)/255+')',label:key}:item;sw.style.background=obj.color;row.append(sw,el('span',String(obj.label??key).replaceAll('ug/m3','µg/m³')));box.append(row)}
const no=el('div',undefined,'legend-row');no.append(el('span',undefined,'legend-swatch nodata'),el('span','No data / outside coverage'));box.append(no)
}else box.append(sub('Source map only · legend not supplied; blank does not mean no hazard.'));
if(Number.isFinite(l.min)&&Number.isFinite(l.max)&&l.unit!=='class'){const f=n=>Number(n.toFixed(2));box.append(sub('Site range: '+f(l.min)+' – '+f(l.max)+' '+unit))}
if(l.source){const link=el('a','Data source ↗','legend-source');link.href=l.source;link.target='_blank';link.rel='noopener';box.append(link)}
return box
}
function renderDrawer(){const drawer=$('#drawer'),p=$('#options'),key=$('#map-legend');drawer.hidden=mode==='terrain';p.replaceChildren();key.replaceChildren();key.hidden=mode!=='environment'||!env;if(!key.hidden){key.append(el('div',env.label,'legend-title'),legend(env),sub(env.note||''));if(year!==2026)key.append(sub('Overlay dates do not match historical terrain.'));}if(mode==='terrain')return;
if(mode==='environment'){p.append(option('Original material',()=>{env=null;clearEnv();renderDrawer();say('')},!env));for(const l of cfg.environment){const b=option(l.label,()=>{env=l;renderDrawer();applyEnv()},env===l,l.qa?'QA pending':'');if(l.qa){b.disabled=true;b.title='2025 source units/values require verification before use'}p.append(b)}if(env){const s=el('input');s.type='range';s.min=0;s.max=100;s.value=opacity*100;s.setAttribute('aria-label','Map opacity');s.oninput=()=>{opacity=+s.value/100;if(overlayMaterial)overlayMaterial.uniforms.alpha.value=opacity;makeDirty()};p.prepend(s)}}
if(mode==='access'){
if(year!==2026)p.append(option('Current terrain',()=>selectYear(2026,false),false,'↗'));
for(const l of cfg.context){const lab=el('label',undefined,'option');const cb=el('input');cb.type='checkbox';cb.checked=enabled.has(l.id);cb.disabled=l.year!==year;cb.onchange=()=>{cb.checked?enabled.add(l.id):enabled.delete(l.id);renderContext()};lab.append(el('span',l.label),cb);p.append(lab);
if(l.year===2026&&year===2026&&l.id!=='water-2010'){const sources=nativeLayers.filter(v=>l.id==='buildings'?v.meshes>0:v.curves>0||v.category===l.id);if(sources.length){const sel=el('select');sel.className='layer-select';sel.setAttribute('aria-label',l.label+' Rhino source layer');sel.append(new Option('Auto · Rhino / GIS',''));for(const v of sources)sel.append(new Option(v.layer+' ('+(l.id==='buildings'?v.meshes:v.curves||v.meshes)+')',v.layer));sel.value=layerOverrides[l.id]||'';sel.onchange=()=>{layerOverrides[l.id]=sel.value;enabled.add(l.id);renderDrawer();renderContext()};p.append(sel)}if(contextInfo[l.id])p.append(sub(contextInfo[l.id]))}}
p.append(sub('Present-day infrastructure only. CAD layers take priority.'));renderWalking(p);}
if(mode==='sections'){for(const s of cfg.sections)p.append(option(s.label,()=>{section=s.id;renderDrawer();drawSection()},section===s.id));p.append(option('Compare years',()=>{compare=!compare;renderDrawer();drawSection()},compare));p.append(sub('Elevation profiles · inferred history, not surveyed sections.'))}
if(mode==='views'){cfg.views.forEach((v,i)=>p.append(option(v.label,()=>moveView(i,true),selectedView===i,'↗')));p.append(sub('Camera presets; upload site photographs to attach them.'))}}
function setMode(m){if(m==='access'&&year===2026&&!nativeLayers.length)rhino.sourceLayers().then(l=>{nativeLayers=l;if(mode==='access')renderDrawer()}).catch(e=>console.warn(e));if(stack&&m!=='terrain'){mode=m;selectYear(year,false);return}mode=m;updateUI();renderDrawer();if(m==='environment'&&env)applyEnv();else clearEnv();$('#profile').hidden=m!=='sections';if(m==='sections')drawSection();else clear(sectionMark);if(m!=='views')$('#photo').hidden=true;else if(selectedView!==null)moveView(selectedView,false);makeDirty()}
async function applyEnv(){clearEnv();const token=envSerial,model=active;if(!env||!model||stack)return;const l=env;say('Loading '+l.label+'…');try{if(!await exists(l.url))throw Error('Upload '+l.url);const tx=await new THREE.TextureLoader().loadAsync(l.url);if(token!==envSerial||active!==model){tx.dispose();return}tx.colorSpace=THREE.SRGBColorSpace;
overlayMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4,side:THREE.DoubleSide,uniforms:{map:{value:tx},alpha:{value:opacity},bounds:{value:new THREE.Vector4(...(l.bounds||cfg.bounds))}},vertexShader:'varying vec3 w;void main(){w=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}',fragmentShader:'uniform sampler2D map;uniform float alpha;uniform vec4 bounds;varying vec3 w;void main(){vec2 uv=(vec2(w.x,-w.z)-bounds.xy)/(bounds.zw-bounds.xy);if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))discard;vec4 c=texture2D(map,uv);gl_FragColor=vec4(c.rgb,c.a*alpha);\n#include <colorspace_fragment>\n}'});
model.updateMatrixWorld(true);model.traverse(n=>{if(n.isMesh){const mesh=new THREE.Mesh(n.geometry,overlayMaterial);mesh.matrixAutoUpdate=false;mesh.matrix.copy(n.matrixWorld);mesh.renderOrder=3;overlay.add(mesh)}});say('');makeDirty()}catch(e){if(token===envSerial)say(e.message)}}
async function pdokRoads(){if(roadCache)return roadCache;const bounds=envManifest?.wgs84_bounds,local=envManifest?.model_bounds;if(!bounds||!local)throw Error('Site georeference not available');
const url=new URL('https://api.pdok.nl/kadaster/bgt/ogc/v1/collections/wegdeel/items');url.searchParams.set('bbox',bounds.join(','));url.searchParams.set('limit','1000');url.searchParams.set('f','json');let next=url.href,features=[],pages=0;
while(next&&pages++<30){const response=await fetch(next,{headers:{Accept:'application/geo+json'}});if(!response.ok)throw Error('PDOK roads HTTP '+response.status);const d=await response.json();features.push(...(d.features||[]));const link=d.links?.find(l=>l.rel==='next');next=link?new URL(link.href,next).href:null;if(next&&!next.startsWith('https://api.pdok.nl/'))throw Error('Unexpected road pagination URL')}
if(next)throw Error('PDOK road request exceeded page limit');
const xy=p=>[local[0]+(p[0]-bounds[0])/(bounds[2]-bounds[0])*(local[2]-local[0]),local[1]+(p[1]-bounds[1])/(bounds[3]-bounds[1])*(local[3]-local[1])];
const polygons=[];for(const f of features){const g=f.geometry;if(!g)continue;if(g.type==='Polygon')polygons.push(g.coordinates.map(r=>r.map(xy)));if(g.type==='MultiPolygon')for(const p of g.coordinates)polygons.push(p.map(r=>r.map(xy)))}
if(!polygons.length)throw Error('No road polygons returned by PDOK');roadCache={polygons,count:features.length};return roadCache}

function walkingLink(text,url){const a=el('a',text,'walk-link');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a}
function checkOption(name,on,fn,color){const label=el('label',undefined,'option');if(color){const sw=el('span',undefined,'walk-swatch');sw.style.background=color;label.append(sw)}label.append(el('span',name));const cb=el('input');cb.type='checkbox';cb.checked=on;cb.onchange=()=>fn(cb.checked);label.append(cb);return label}
function renderWalking(p){
 const sep=el('div','SITE / WALKING','walk-section');p.append(sep);
 p.append(checkOption('ENCI study boundary',studyBoundary,v=>{studyBoundary=v;renderContext()},'#d72632'));
 p.append(sub('Approximate research perimeter · traced from your annotated view, not legal ownership.'));
 if(year!==2026)return;
 p.append(checkOption('Mapped walking paths',walkingNetwork,v=>{walkingNetwork=v;if(v)loadWalking();else renderContext()},'#b48731'));
 const button=option(walkBusy?'Loading mapped routes…':walkData?'Refresh mapped routes':'Load mapped hiking routes',()=>loadWalking(true),false,'↗');button.disabled=walkBusy;p.append(button);
 if(walkMessage)p.append(sub(walkMessage));
 if(walkData){for(const route of walkData.routes){p.append(checkOption(route.name,selectedWalks.has(route.id),v=>{v?selectedWalks.add(route.id):selectedWalks.delete(route.id);renderContext()},route.color));p.append(walkingLink('OSM relation '+route.id,'https://www.openstreetmap.org/relation/'+route.id));}}
 for(const [id,track] of importedWalks){if(!id.startsWith('local:'))continue;p.append(checkOption(track.name,selectedWalks.has(id),v=>{v?selectedWalks.add(id):selectedWalks.delete(id);renderContext()},track.color))}
 p.append(el('div','NATUURMONUMENTEN','walk-section'));
 for(const route of walking.official){const row=el('div',undefined,'walk-official');const label=walkingLink(route.name+' · '+route.km+' km ↗',route.url);row.append(label);const track=importedWalks.get(route.id);
 if(track){const cb=el('input');cb.type='checkbox';cb.checked=selectedWalks.has(route.id);cb.title='Display imported GPX';cb.onchange=()=>{cb.checked?selectedWalks.add(route.id):selectedWalks.delete(route.id);renderContext()};row.append(cb)}
 else {const b=el('button','GPX +');b.title='Choose a GPX downloaded from the official route page';b.onclick=()=>pickGPX(route);row.append(b)}p.append(row)}
 p.append(option('Import another GPX',()=>pickGPX(null),false,'+'));
 p.append(sub('Official links are independent of OSM geometry. GPX stays local to this browser session; check reuse permission before publishing a track. Route display is for research, not navigation. Access can change.'));
 p.append(walkingLink('© OpenStreetMap contributors · ODbL','https://www.openstreetmap.org/copyright'));
}
function localXY(lon,lat){const b=envManifest?.wgs84_bounds,m=envManifest?.model_bounds;if(!b||!m)throw Error('Missing site georeference');return [m[0]+(lon-b[0])/(b[2]-b[0])*(m[2]-m[0]),m[1]+(lat-b[1])/(b[3]-b[1])*(m[3]-m[1])]}
const routeColors=['#dfaa00','#206b4e','#2266be','#b44c99','#d36a35','#745caa','#147e85'];
function routeColor(tags,i){const s=(tags.colour||tags.color||tags['osmc:symbol']||'').toLowerCase().split(':')[0];return ({yellow:'#dfaa00',green:'#206b4e',blue:'#2266be',red:'#c83a3a',orange:'#d36a35',purple:'#745caa',black:'#333'})[s]||routeColors[i%routeColors.length]}
async function loadWalking(force=false){
 if(walkBusy)return;if(walkData&&!force){renderContext();return}
 walkBusy=true;walkMessage='Requesting OSM walking paths and route relations…';if(mode==='access')renderDrawer();
 try{
 const b=envManifest?.wgs84_bounds;if(!b)throw Error('Missing site georeference');
 const bbox=[b[1]-.002,b[0]-.002,b[3]+.002,b[2]+.002].join(',');
 const q='[out:json][timeout:25];(relation["type"="route"]["route"~"^(hiking|foot|walking)$"]('+bbox+');way["highway"~"^(footway|path|steps|pedestrian|track)$"]('+bbox+'););out geom;';
 let data=null,last;for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']){try{const res=await fetch(endpoint+'?data='+encodeURIComponent(q),{signal:AbortSignal.timeout(35000)});if(!res.ok)throw Error('HTTP '+res.status);data=await res.json();break}catch(e){last=e}}
 if(!data)throw Error('OSM service unavailable: '+last?.message);
 const convert=g=>g.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).map(p=>localXY(p.lon,p.lat));
 const routes=[],paths=[];
 for(const e of data.elements||[]){if(e.type==='way'&&e.geometry){const t=e.tags||{};if(['private','no'].includes(t.access)||['private','no'].includes(t.foot))continue;const path=convert(e.geometry);if(path.length>1)paths.push(path)}
 if(e.type==='relation'){const t=e.tags||{},segments=(e.members||[]).filter(m=>m.type==='way'&&m.geometry).map(m=>convert(m.geometry)).filter(p=>p.length>1);if(!segments.length)continue;const name=t.name||t.ref||('Walking relation '+e.id);routes.push({id:String(e.id),name,paths:segments,color:routeColor(t,routes.length)})}}
 routes.sort((a,b)=>a.name.localeCompare(b.name));walkData={paths,routes};walkMessage=routes.length+' route relations · '+paths.length+' path segments · clipped to terrain. OSM is not an official access guarantee.';
 // Select a route only if its published OSM name explicitly identifies the quarry.
 for(const rt of routes)if(/groeve|enci/i.test(rt.name))selectedWalks.add(rt.id);
 await renderContext();
 }catch(e){walkMessage=e.message+' · official links / GPX import remain available.'}finally{walkBusy=false;if(mode==='access')renderDrawer()}
}
function pickGPX(route){const input=el('input');input.type='file';input.accept='.gpx,application/gpx+xml';input.onchange=async()=>{const f=input.files?.[0];if(!f)return;try{const doc=new DOMParser().parseFromString(await f.text(),'application/xml');if(doc.querySelector('parsererror'))throw Error('Invalid GPX');
 const segments=[...doc.getElementsByTagNameNS('*','trkseg'),...doc.getElementsByTagNameNS('*','rte')];
 const paths=segments.map(seg=>[...seg.children].filter(n=>['trkpt','rtept'].includes(n.localName)).map(n=>localXY(Number(n.getAttribute('lon')),Number(n.getAttribute('lat')))).filter(p=>p.every(Number.isFinite))).filter(p=>p.length>1);
 if(!paths.length)throw Error('No track or route points in GPX');const id=route?.id||'local:'+Date.now();importedWalks.set(id,{name:route?.name||f.name,color:route?.color||'#dd9700',paths});selectedWalks.add(id);await renderContext();renderDrawer()
 }catch(e){walkMessage=e.message;renderDrawer()}};input.click()}
function walkingOverlays(){if(studyBoundary&&walking.boundary?.paths)context.add(textureProjection({paths:walking.boundary.paths},'#d72632',5.0,8));
 if(year!==2026)return;
 if(walkingNetwork&&walkData?.paths.length)context.add(textureProjection({paths:walkData.paths},'#b48731',1.35,6));
 for(const route of [...(walkData?.routes||[]),...[...importedWalks].map(([id,r])=>({...r,id}))])if(selectedWalks.has(route.id))context.add(textureProjection({paths:route.paths},route.color,4.5,7));
 makeDirty();
}

function textureProjection(data,color,width=2.1,order=5){const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=Math.round(2048*(ymax-ymin)/(xmax-xmin));const c=canvas.getContext('2d');const point=p=>[(p[0]-xmin)/(xmax-xmin)*canvas.width,(ymax-p[1])/(ymax-ymin)*canvas.height];c.strokeStyle=color;c.fillStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';
function path(points,close=false){if(!points.length)return;const a=point(points[0]);c.moveTo(...a);for(let i=1;i<points.length;i++)c.lineTo(...point(points[i]));if(close)c.closePath()}
for(const line of data.paths||[]){c.beginPath();path(line);c.stroke()}for(const tri of data.triangles||[]){c.beginPath();path(tri,true);c.fill()}for(const poly of data.polygons||[]){c.beginPath();for(const ring of poly)path(ring,true);c.fill('evenodd')}
const tx=new THREE.CanvasTexture(canvas);tx.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-6,side:THREE.DoubleSide,uniforms:{map:{value:tx},bounds:{value:new THREE.Vector4(xmin,ymin,xmax,ymax)}},vertexShader:'varying vec3 w;void main(){w=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}',fragmentShader:'uniform sampler2D map;uniform vec4 bounds;varying vec3 w;void main(){vec2 uv=(vec2(w.x,-w.z)-bounds.xy)/(bounds.zw-bounds.xy);if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))discard;vec4 c=texture2D(map,uv);if(c.a<.03)discard;gl_FragColor=vec4(c.rgb,c.a*.92);\n#include <colorspace_fragment>\n}'});
const group=new THREE.Group();group.userData.atlasShared=true;group.userData.atlasDispose=()=>{tx.dispose();mat.dispose()};active.updateMatrixWorld(true);active.traverse(n=>{if(n.isMesh){const m=new THREE.Mesh(n.geometry,mat);m.matrixAutoUpdate=false;m.matrix.copy(n.matrixWorld);m.renderOrder=order;group.add(m)}});return group}
async function renderContext(){const token=++contextSerial;clear(context);if(!active||stack)return;walkingOverlays();contextInfo={};const current=year===2026;
if(current&&!nativeLayers.length&&kind==='rhino'){rhino.sourceLayers().then(rows=>{nativeLayers=rows;if(mode==='access')renderDrawer()}).catch(console.warn)}
for(const l of cfg.context.filter(x=>x.year===year&&enabled.has(x.id))){let o=null;try{
let native=null;if(current&&cfg.rhino?.present){try{native=await rhino.nativeContext(l.id,layerOverrides[l.id]||null)}catch(e){console.warn('Native layer:',e)}}
if(token!==contextSerial)return;
if(native){o=l.id==='buildings'?native:textureProjection(native,l.color);contextInfo[l.id]='Rhino · '+(native.userData?.atlasCount||native.count)+' objects'}
else if(await exists(l.url)){if(l.type==='glb')o=await getGLB(l.url);else{const d=await json(l.url);if(token!==contextSerial)return;o=textureProjection({paths:(d.lines||[]).map(line=>line.map(p=>[p[0],p[1]]))},l.color)}contextInfo[l.id]='Uploaded GIS layer'}
else if(current&&l.id==='roads'&&!layerOverrides.roads){say('Loading Dutch BGT roads…');const d=await pdokRoads();if(token!==contextSerial)return;o=textureProjection(d,l.color||'#333');contextInfo[l.id]='PDOK BGT · '+d.count+' features · Netherlands only · site georeference';}
else {contextInfo[l.id]=layerOverrides[l.id]?'No compatible geometry in selected layer':l.id==='buildings'?'No named building mesh layer found; existing unclassified geometry stays in terrain.':'Source layer not found';}
if(token!==contextSerial){if(o)dispose(o);return}if(o)context.add(o);makeDirty();
}catch(e){if(token!==contextSerial){if(o)dispose(o);return}contextInfo[l.id]=e.message;console.warn(e)}}
if(token===contextSerial){if(mode==='access')renderDrawer();const errors=Object.values(contextInfo).filter(s=>/HTTP|error|failed|not found|not available/i.test(s));if(errors.length)say(errors[0]);else if($('#status').textContent.startsWith('Loading Dutch'))say('')}}
function gridHeight(y,x,v){const g=grids.get(y);if(!g)return null;let u=(x-xmin)/(xmax-xmin)*(nx-1),w=(v-ymin)/(ymax-ymin)*(ny-1);if(u<0||w<0||u>nx-1||w>ny-1)return null;const i=Math.min(nx-2,Math.floor(u)),j=Math.min(ny-2,Math.floor(w)),a=u-i,b=w-j;
return (1-a)*(1-b)*g[j*nx+i]+a*(1-b)*g[j*nx+i+1]+(1-a)*b*g[(j+1)*nx+i]+a*b*g[(j+1)*nx+i+1]}
function sampled(s,y){const len=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]);return Array.from({length:121},(_,i)=>{const t=i/120,x=s.a[0]+t*(s.b[0]-s.a[0]),v=s.a[1]+t*(s.b[1]-s.a[1]);return [t*len,gridHeight(y,x,v)]})}
function drawSection(){if(mode!=='sections')return;const s=cfg.sections.find(x=>x.id===section),panel=$('#profile');panel.hidden=false;clear(sectionMark);
const rows=(compare?cfg.years.map(x=>x.year):[year]).filter(y=>y!==2026||presentProfiles[section]).map(y=>({y,points:y===2026?presentProfiles[section]:(profiles[section]?.[y]||sampled(s,y))}));const chosen=rows.find(r=>r.y===year);
if(chosen){let pts=[];const len=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]);const flush=()=>{if(pts.length>1){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x0033ff,depthTest:false}));line.renderOrder=5;sectionMark.add(line)}pts=[]};
for(const [d,h] of chosen.points){if(h===null){flush();continue}const t=d/len;pts.push(new THREE.Vector3(s.a[0]+t*(s.b[0]-s.a[0]),h+2,-(s.a[1]+t*(s.b[1]-s.a[1]))))}flush()}
panel.replaceChildren();if(!rows.length){panel.append(sub('Upload assets/sections/present.json to display current profiles.'));makeDirty();return}
const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),W=900,H=184,ml=40,mr=14,mt=13,mb=24,len=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]);svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('aria-label','Elevation section '+s.label);
const max=Math.max(200,Math.ceil(Math.max(...rows.flatMap(r=>r.points.map(p=>p[1]??0)))/50)*50),min=Math.min(0,Math.floor(Math.min(...rows.flatMap(r=>r.points.map(p=>p[1]??0)))/50)*50),X=d=>ml+d/len*(W-ml-mr),Y=h=>H-mb-(h-min)/(max-min)*(H-mt-mb);
function node(tag,attrs,t){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(t!==undefined)e.textContent=t;svg.append(e)}
for(let z=min;z<=max;z+=50){node('line',{x1:ml,x2:W-mr,y1:Y(z),y2:Y(z),stroke:'#ddd','stroke-dasharray':'3 4'});node('text',{x:ml-6,y:Y(z)+3,'text-anchor':'end','font-size':10,fill:'#777'},z)}
for(const r of rows){let d='',pen=false;for(const [x,z] of r.points){if(z===null){pen=false;continue}d+=(pen?'L':'M')+X(x).toFixed(2)+' '+Y(z).toFixed(2)+' ';pen=true}node('path',{d,fill:'none',stroke:r.y===year?'#0033ff':'#777','stroke-width':r.y===year?2.3:1.1,opacity:r.y===year?1:.43})}
node('text',{x:ml,y:H-5,'font-size':10},'0 m');node('text',{x:W-mr,y:H-5,'font-size':10,'text-anchor':'end'},Math.round(len)+' m');
panel.append(svg,sub(s.label+' · m NAP · '+(profiles[section]?'historical reconstructed mesh profiles':'coarse historical preview profiles')+(year===2026&&!presentProfiles[section]?' · current profile not uploaded':'')));makeDirty()}
async function moveView(i,move=true){const v=cfg.views[i];if(!v)return;selectedView=i;if(move){controls.target.fromArray(v.target);camera.position.fromArray(v.position);camera.zoom=i===0?1:3.6;camera.updateProjectionMatrix();controls.update();makeDirty()}renderDrawer();const box=$('#photo');box.hidden=true;box.replaceChildren();if(await exists(v.photo)&&mode==='views'&&selectedView===i){const img=el('img');img.src=v.photo;img.alt=v.label;img.onerror=()=>box.hidden=true;box.append(img,sub(v.label));box.hidden=false}}
json('./assets/sections/profiles.json').then(d=>{profiles=d;drawSection()}).catch(()=>{});
json('./assets/sections/present.json').then(d=>{presentProfiles=d;drawSection()}).catch(()=>{});
$('#modes').onclick=e=>{const b=e.target.closest('[data-mode]');if(b)setMode(b.dataset.mode)};
$('#close').onclick=()=>setMode('terrain');
$('#axo').onclick=()=>fit(false);$('#fit').onclick=()=>fit(false);$('#plan').onclick=()=>fit(true);
$('#stack').onclick=()=>{if(stackLoading)return;return stack?selectYear(year,false).then(()=>fit()):showStack()};
$('#spacing').oninput=e=>{stackGap=+e.target.value;placeStack();fit()};
function turn(a){const offset=camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),a);camera.position.copy(controls.target).add(offset);controls.update();makeDirty()}
$('#rotate-left').onclick=()=>turn(Math.PI/12);$('#rotate-right').onclick=()=>turn(-Math.PI/12);
$('#detail').onclick=()=>selectYear(2026,!detail);$('#local').onclick=()=>$('#file').click();
$('#file').onchange=e=>{const f=e.target.files[0];if(f)selectYear(2026,false,f).then(()=>fit());e.target.value=''};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch(e){say('Fullscreen not available.')}};
addEventListener('keydown',e=>{if(e.key==='Escape'&&mode!=='terrain')setMode('terrain')});
renderer.setAnimationLoop(()=>{controls.update();if(dirty){renderer.render(scene,camera);projectStackLabels();dirty=false}});
$('#export-layer').onclick=async()=>{if(!active||stack)return;say('Exporting selected terrain…');try{await rhino.exportGLB(active,(year===2026?'present':year)+'.glb');say('')}catch(e){say('GLB export failed: '+e.message)}};
$('#inspect-layers').onclick=async()=>{const report=await rhino.reports();const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=el('a');a.href=u;a.download='ENCI_rhino_layers.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),30000)};
updateUI();renderDrawer();fit();
// Show a lightweight terrain immediately, then load the uploaded present-day model.
const initial=serial;const fallback=gridMesh(2010);terrain.add(fallback);active=fallback;kind='preview';updateUI();fit();selectYear.fitted=true;makeDirty();renderContext();
if(serial===initial){const ready=await exists(yearRow(2026).url)||await exists(cfg.rhino.present);if(serial===initial&&ready)await selectYear(2026,false);else if(serial===initial)await selectYear(2010,false)}

