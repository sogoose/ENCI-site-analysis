import * as THREE from 'three';
export const buildingPalette={
 residential:{label:'Residential',color:'#f4d573'},
 industrial:{label:'Industrial',color:'#ac9bc6'},
 office:{label:'Office',color:'#9bdee4'},
 commercial:{label:'Retail / commercial',color:'#ed95bc'},
 public:{label:'Education / civic / assembly',color:'#75c9e8'},
 healthcare:{label:'Healthcare',color:'#f4b49e'},
 recreation:{label:'Sport / accommodation',color:'#d4df8b'},
 mixed:{label:'Mixed use',color:'#d49a64'},
 other:{label:'Other registered use',color:'#b4bfc7'},
 unknown:{label:'Unknown / not matched',color:'#e5e5e5'}
};
export function classifyUse(raw){
 const s=Array.isArray(raw)?raw.join(' '):String(raw??'');const cats=new Set();
 for(const [rx,id] of [[/woonfunctie/i,'residential'],[/industriefunctie/i,'industrial'],[/kantoorfunctie/i,'office'],[/winkelfunctie/i,'commercial'],[/onderwijsfunctie|bijeenkomstfunctie|celfunctie/i,'public'],[/gezondheidszorgfunctie/i,'healthcare'],[/sportfunctie|logiesfunctie/i,'recreation'],[/overige gebruiksfunctie|overigefunctie/i,'other']])if(rx.test(s))cats.add(id);
 return cats.size>1?'mixed':cats.size===1?[...cats][0]:'unknown';
}
let cache=null;
function insideRing(x,y,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
function inside(x,y,p){return insideRing(x,y,p[0])&&!p.slice(1).some(h=>insideRing(x,y,h))}
export async function loadBuildingUses(manifest,toLocal){
 if(cache)return cache;
 if(!manifest?.wgs84_bounds)throw Error('Missing site georeference');
 cache=(async()=>{const u=new URL('https://api.pdok.nl/kadaster/bag/ogc/v2/collections/pand/items');u.searchParams.set('bbox',manifest.wgs84_bounds.join(','));u.searchParams.set('limit','1000');u.searchParams.set('f','json');
 let next=u.href,pages=0;const data=[],seen=new Set();while(next&&pages++<40){const r=await fetch(next,{headers:{Accept:'application/geo+json'},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();
 if(!Array.isArray(j.features))throw Error('Unexpected BAG response');
 for(const f of j.features){const p=f.properties||{},g=f.geometry,id=String(p.identificatie||f.id||'');if(seen.has(id)||/gesloopt|niet gerealiseerd/i.test(String(p.status||''))||!g)continue;seen.add(id);const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];const polygons=polys.map(poly=>poly.map(ring=>ring.map(q=>toLocal(q[0],q[1])))).filter(poly=>poly[0]?.length>=4);
 if(!polygons.length)continue;const b=[Infinity,Infinity,-Infinity,-Infinity];for(const poly of polygons)for(const q of poly[0]){b[0]=Math.min(b[0],q[0]);b[1]=Math.min(b[1],q[1]);b[2]=Math.max(b[2],q[0]);b[3]=Math.max(b[3],q[1])}
 data.push({id,category:classifyUse(p.gebruiksdoel),use:p.gebruiksdoel||'',polygons,b})}
 const link=j.links?.find(l=>l.rel==='next');next=link?new URL(link.href,next).href:null;if(next&&!next.startsWith('https://api.pdok.nl/'))throw Error('Unexpected pagination host')}
 if(next)throw Error('BAG page limit exceeded');if(!data.length)throw Error('No BAG footprints returned');return data
 })().catch(e=>{cache=null;throw e});return cache;
}
export function applyBuildingUses(group,data){
 group.updateMatrixWorld(true);const ids=new Map(data.map(r=>[r.id,r])),cells=new Map(),size=60;
 const key=(x,y)=>Math.floor(x/size)+','+Math.floor(y/size);
 for(const r of data)for(let i=Math.floor(r.b[0]/size);i<=Math.floor(r.b[2]/size);i++)for(let j=Math.floor(r.b[1]/size);j<=Math.floor(r.b[3]/size);j++){const k=i+','+j;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(r)}
 const materials=new Map(),originals=new Map(),counts={};let total=0,matched=0;
 group.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry)return;total++;mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld),c=b.getCenter(new THREE.Vector3());
 let r=null;const source=mesh.userData.sourceAttributes||{};const text=mesh.name+' '+String(source.name||'')+' '+JSON.stringify(source.userStrings||source.userText||{});const candidates=text.match(/(?<!\d)\d{16}(?!\d)/g)||[];const direct=[...new Set(candidates)].map(id=>ids.get(id)).filter(Boolean);if(direct.length===1)r=direct[0];
 if(!r){const x=c.x,y=-c.z;const hits=(cells.get(key(x,y))||[]).filter(a=>x>=a.b[0]&&x<=a.b[2]&&y>=a.b[1]&&y<=a.b[3]&&a.polygons.some(poly=>inside(x,y,poly)));if(hits.length===1)r=hits[0]}
 if(r)matched++;const type=r?.category||'unknown';counts[type]=(counts[type]||0)+1;mesh.userData.bagUse=r?{id:r.id,use:r.use,category:type}:null;originals.set(mesh,mesh.material);
 if(!materials.has(type))materials.set(type,new THREE.MeshStandardMaterial({color:buildingPalette[type].color,roughness:.88,metalness:0,flatShading:true,side:THREE.DoubleSide}));mesh.material=materials.get(type);
 });
 const previous=group.userData.atlasDispose;group.userData.atlasDispose=()=>{for(const [mesh,mat] of originals)mesh.material=mat;for(const mat of materials.values())mat.dispose();previous?.()};
 if(!group.userData.atlasShared){group.userData.atlasShared=true;const geos=new Set(),mats=new Set();group.traverse(m=>{if(m.geometry)geos.add(m.geometry);const orig=originals.get(m);for(const a of Array.isArray(orig)?orig:[orig])if(a)mats.add(a)});const prev=group.userData.atlasDispose;group.userData.atlasDispose=()=>{prev();geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose())}}
 return {total,matched,counts};
}
