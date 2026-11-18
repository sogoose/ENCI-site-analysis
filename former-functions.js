import * as THREE from 'three';
export const heritageSource='https://www.gemeentemaastricht.nl/stad/monumentenstatus-23-gebouwen-enci-fabriek';
export const formerPalette={
 processing:{label:'Raw material preparation / grinding',color:'#d8a36e'},
 firing:{label:'Clinker production / kilns',color:'#be6659'},
 storage:{label:'Storage / packaging / loading',color:'#c8b88c'},
 transport:{label:'Conveyors / distribution',color:'#8b939f'},
 utilities:{label:'Utilities / maintenance',color:'#81a5a3'},
 administration:{label:'Office / laboratory',color:'#aab8d6'},
 residential:{label:'Former residence',color:'#b4a3bd'},
 other:{label:'Archive / other heritage',color:'#b8c6a1'},
 unknown:{label:'Former function not matched',color:'#e5e5e5'}
};
// Original names, chronology and functions from the municipal 23-item inventory.
// Polygons manually traced from its overview map (607 x 699 image); not legal boundaries.
// Only surface structures with recognisable plan extents are matched automatically.
const row=(id,name,category,year,description,poly=[],current='Current use not verified')=>({id,name,category,year,description,poly,current,status:id<=5?'National monument':'Municipal monument'});
export const heritageRecords=[
 row(1,'Verpakkingsgebouw', 'storage','1927–28','Cement packing and dispatch.',[[458,69],[482,70],[479,126],[455,126]],'AINSI theatre, offices and studios (municipal description).'),
 row(2,'Cementmolengebouw','processing','1927–28','Clinker was ground into cement.',[[446,127],[480,127],[476,171],[443,170]],'Storage (municipal description).'),
 row(3,'Hoofdkantoor met laboratorium','administration','1964','Head office and laboratory.',[[455,174],[474,173],[474,218],[455,217]]),
 row(4,'Grondstoffenhal','storage','1950–63','Raw material storage; connected to quay handling equipment.',[[436,319],[462,326],[413,556],[384,549]]),
 row(5,'Oven 8','firing','1968','Integrated marl-to-clinker production line.',[[210,294],[231,302],[203,388],[185,449],[174,490],[141,500],[129,481],[152,448],[169,395],[188,331]],'Production ended in 2020; subsequent use not verified.'),
 row(6,'Ovengebouwen 5, 6 en 7','firing','1950–61','Former kiln hall; the kilns are no longer present.',[[242,371],[378,399],[371,436],[237,403]]),
 row(7,'Hoogovencementmolens','processing','1960','Grinding slag, clinker and gypsum.',[[415,338],[437,345],[429,384],[406,374]]),
 row(8,'Loods voor onderhoudswerken','utilities','1954','Maintenance workshop.',[[312,316],[333,320],[330,335],[308,331]]),
 row(9,'Verdeelstation','utilities','1950','Electrical distribution.',[[329,457],[360,464],[353,484],[324,476]]),
 row(10,'Waterpomp- en filterstation','utilities','1955','Water pumping, filtration and storage.',[[326,481],[356,482],[352,503],[322,496]]),
 row(11,'Centrale werkplaats','utilities','1957','Fabrication and repair of machine parts.',[[342,309],[402,321],[390,372],[331,359]]),
 row(12,'Papvoorbereidingsgebouw','processing','1957','Marl slurry preparation.',[[263,466],[300,473],[289,520],[254,511]]),
 row(13,'Slakdrogerij en opslag hoogovenslak','processing','1960','Blast-furnace slag drying and storage.',[[370,272],[400,278],[406,255],[422,259],[412,298],[365,289]]),
 row(14,'Silo’s, pakkerij en laadinstallatie hoogovencement','storage','1960','Slag cement storage, bagging and loading.',[[442,221],[466,229],[457,300],[430,293]]),
 row(15,'Compressorgebouw','utilities','1926','Production support / compressed air.',[[443,172],[455,174],[455,213],[443,210]]),
 row(16,'Directeurswoning','residential','1937','Former director’s residence.',[[448,13],[462,15],[460,34],[447,31]]),
 row(17,'Garagegebouw','utilities','1950','Former metalwork store, later garage.',[[271,326],[323,339],[320,354],[267,343]]),
 row(18,'Kantoren','administration','1954','Supervisors’ offices and electricians’ workshop.',[[246,341],[309,355],[305,370],[242,355]]),
 row(19,'Munitiedepot','other','Unknown','Former explosives store in existing quarry rooms.'),
 row(20,'Archief','other','Unknown','Former archive in quarry passages.'),
 row(21,'Transporteurs / masten','transport','1950s','Supports for industrial pipes.'),
 row(22,'Architecture Organique','other','2001','Artwork by Egbertje Kiewiet.'),
 row(23,'Na gedane arbeid','other','1974','Artwork by Jef Courtens.')
];
// Two approximate roof centres from the present model; image y points downward.
// This is a similarity registration, not cadastral georeferencing.
export function mapToLocal([x,y]){
 const p=[99,568],q=[-62.8,-1191.3],dx=136,dy=290,X=206.1,Y=420.3,D=dx*dx+dy*dy,a=(X*dx+Y*dy)/D,b=(Y*dx-X*dy)/D;
 return [q[0]+a*(x-p[0])+b*(y-p[1]),q[1]+b*(x-p[0])-a*(y-p[1])];
}
const zones=heritageRecords.filter(r=>r.poly.length).map(r=>({...r,ring:r.poly.map(mapToLocal)}));
function inRing(x,y,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
export function classifyFormer(x,y){const matches=zones.filter(r=>inRing(x,y,r.ring));return matches.length===1?matches[0]:null}
const byId=id=>heritageRecords.find(r=>r.id===id);
export function applyFormerFunctions(group){
 group.updateMatrixWorld(true);const originals=new Map(),materials=new Map(),counts={};let total=0,matched=0;
 group.traverse(m=>{if(!m.isMesh||!m.geometry)return;total++;let parent=m,tag=null,record=null;while(parent){if(parent.userData?.formerCategory){tag=parent.userData;break}parent=parent.parent}
  if(tag){record=byId(tag.heritageId)}else{m.geometry.computeBoundingBox();const b=m.geometry.boundingBox?.clone().applyMatrix4(m.matrixWorld);if(b&&!b.isEmpty()){const c=b.getCenter(new THREE.Vector3());const dx=b.max.x-b.min.x,dy=b.max.z-b.min.z;
   // Large merged meshes and ambiguous footprint positions are left unclassified.
   if(dx<440&&dy<440){const hits=[classifyFormer(c.x,-c.z)];for(const u of [-.25,.25])for(const v of [-.25,.25])hits.push(classifyFormer(c.x+dx*u,-c.z+dy*v));
    const freq=new Map();for(const h of hits)if(h)freq.set(h.id,(freq.get(h.id)||0)+1);const best=[...freq].sort((a,b)=>b[1]-a[1]);if(best[0]?.[1]>=3&&(!best[1]||best[0][1]>best[1][1]))record=byId(best[0][0]);else if(dx<16&&dy<16&&hits[0]&&!best[1])record=hits[0];
   }
  }}
 const cat=tag?.formerCategory||record?.category||'unknown';if(cat!=='unknown')matched++;counts[cat]=(counts[cat]||0)+1;
 m.userData.formerInfo=record?{...record,part:tag?.formerName||null,match:tag?'Reconstructed component':'Approximate map match'}:null;
 originals.set(m,m.material);if(!materials.has(cat))materials.set(cat,new THREE.MeshStandardMaterial({color:formerPalette[cat].color,roughness:.9,side:THREE.DoubleSide}));m.material=materials.get(cat);
 });
 const prev=group.userData.atlasDispose;const shared=group.userData.atlasShared;
 group.userData.atlasShared=true;group.userData.atlasDispose=()=>{for(const [m,mat] of originals){m.material=mat;delete m.userData.formerInfo}for(const mat of materials.values())mat.dispose();if(prev)prev();else if(!shared){const geos=new Set(),mats=new Set();for(const [m,mat] of originals){geos.add(m.geometry);for(const x of Array.isArray(mat)?mat:[mat])if(x)mats.add(x)}geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose())}};
 return {total,matched,counts};
}
