
// DXF uses Rhino Z-up local metres; section distances and heights are the viewer's sampled data.
// Source terrain reduced_site.3dm has a documented -995.425 m vertical displacement.
const ACI={black:7,green:3,blue:5,earth:32,gray:8};
const safe=s=>String(s).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,100);
const clean=s=>String(s).replace(/[^\x20-\x7e]/g,c=>c==='′'?"'":c==='—'?'-':'?').replace(/[\r\n]/g,' ');
const rgb=s=>typeof s==='string'&&/^#[0-9a-f]{6}$/i.test(s)?parseInt(s.slice(1),16):null;
export function sectionPoint(s,d,h,zOffset=0){const len=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]);if(!len)throw Error('Zero section length');return [s.a[0]+(s.b[0]-s.a[0])*d/len,s.a[1]+(s.b[1]-s.a[1])*d/len,h-zOffset]}
function writer(){
 const entities=[],layers=new Map([['0',{aci:7}]]);let handle=0x100;
 const id=()=> (++handle).toString(16).toUpperCase();
 const push=(out,...pairs)=>{for(let i=0;i<pairs.length;i+=2){const v=pairs[i+1];if(typeof v==='number'&&!Number.isFinite(v))throw Error('Non-finite DXF number');out.push(String(pairs[i]),typeof v==='number'?String(Math.round(v*1e6)/1e6):String(v))}};
 const coord=(out,k,p)=>push(out,k,p[0],k+10,p[1],k+20,p[2]);
 function layer(name,aci=7,color=null){name=safe(name);if(!layers.has(name))layers.set(name,{aci,color:rgb(color)});return name}
 function start(type,name){push(entities,0,type,5,id(),100,'AcDbEntity',8,name)}
 function poly(name,pts,closed=false){if(pts.length<(closed?3:2))return;name=layer(name);start('POLYLINE',name);push(entities,100,'AcDb3dPolyline',66,1,10,0,20,0,30,0,70,closed?9:8);for(const p of pts){start('VERTEX',name);push(entities,100,'AcDbVertex',100,'AcDb3dPolylineVertex');coord(entities,10,p);push(entities,70,32)}start('SEQEND',name)}
 function face(name,pts){if(pts.length<3)return;name=layer(name);start('3DFACE',name);push(entities,100,'AcDbFace');for(let i=0;i<4;i++)coord(entities,10+i,pts[Math.min(i,pts.length-1)])}
 // Text in the vertical section plane: arbitrary-axis basis for a horizontal extrusion normal.
 function text(name,p,value,height,dir=null){name=layer(name);start('TEXT',name);push(entities,100,'AcDbText');let q=p;if(dir){const [x,y]=dir;q=[p[0]*x+p[1]*y,p[2],p[0]*y-p[1]*x]}coord(entities,10,q);push(entities,40,height,1,clean(value),50,0,7,'STANDARD');if(dir)coord(entities,210,[dir[1],-dir[0],0]);push(entities,100,'AcDbText',73,0)}
 function finish(note){const out=[];push(out,999,clean(note),0,'SECTION',2,'HEADER',9,'$ACADVER',1,'AC1018',9,'$INSUNITS',70,6,9,'$MEASUREMENT',70,1,9,'$LUNITS',70,2,9,'$LUPREC',70,3,0,'ENDSEC',0,'SECTION',2,'TABLES',0,'TABLE',2,'LTYPE',5,'A',100,'AcDbSymbolTable',70,1,0,'LTYPE',5,'B',100,'AcDbSymbolTableRecord',100,'AcDbLinetypeTableRecord',2,'CONTINUOUS',70,0,3,'Solid line',72,65,73,0,40,0,0,'ENDTAB',0,'TABLE',2,'LAYER',5,'C',100,'AcDbSymbolTable',70,layers.size);
 for(const [name,v] of layers){push(out,0,'LAYER',5,id(),100,'AcDbSymbolTableRecord',100,'AcDbLayerTableRecord',2,name,70,0,62,v.aci,6,'CONTINUOUS');if(v.color!=null)push(out,420,v.color)}
 push(out,0,'ENDTAB',0,'TABLE',2,'STYLE',5,'D',100,'AcDbSymbolTable',70,1,0,'STYLE',5,'E',100,'AcDbSymbolTableRecord',100,'AcDbTextStyleTableRecord',2,'STANDARD',70,0,40,0,41,1,50,0,71,0,42,2.5,3,'txt',4,'',0,'ENDTAB',0,'ENDSEC',0,'SECTION',2,'ENTITIES');out.push(...entities);push(out,0,'ENDSEC',0,'EOF');return out.join('\r\n')+'\r\n'}
 return {layer,poly,face,text,finish};
}
function runs(points,fn){let r=[];const flush=()=>{if(r.length>1)fn(r);r=[]};for(const p of points){if(Number.isFinite(p[0])&&Number.isFinite(p[1]))r.push(p);else flush()}flush()}
function heights(points,d){let lo=0,hi=points.length-1;while(hi-lo>1){const i=(lo+hi)>>1;if(points[i][0]<=d)lo=i;else hi=i}const [a,h]=points[lo],[b,j]=points[hi];if(!Number.isFinite(h)||!Number.isFinite(j))return null;return a===b?h:h+(j-h)*(d-a)/(b-a)}
export function buildSectionDxf({s,points,spans=[],floor,landscape=null,history=[],zOffset=0,year=2026,flip=false}){
 const w=writer(),len=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1]),p=(d,h)=>sectionPoint(s,d,h,zOffset),vals=points.map(x=>x[1]).filter(Number.isFinite);if(!len||!vals.length||!Number.isFinite(floor))throw Error('No section data');
 const top=Math.max(...vals),unit=Math.max(len,top-floor,45),id=s.id.replace(/^S0*/,'');
 const direction=[(s.b[0]-s.a[0])/len,(s.b[1]-s.a[1])/len],dir=flip?direction.map(v=>-v):direction;
 const path=(name,pts,closed=false)=>w.poly(name,pts.map(([d,h])=>p(d,h)),closed);
 const text=(name,d,h,t,size=unit*.012)=>w.text(name,p(d,h),t,size,dir);
 const layer=(name,aci,color)=>w.layer(name,aci,color);
 layer('SECTION_PROFILE',7);runs(points,r=>path('SECTION_PROFILE',r));
 layer('SECTION_GUIDE',8);path('SECTION_GUIDE',[[0,0],[len,0]]);
 layer('SECTION_CUT_LIMIT',8);runs(points,r=>path('SECTION_CUT_LIMIT',[...r,[r.at(-1)[0],floor],[r[0][0],floor]],true));
 // Each native geological cell is kept distinct; no extrapolation or smoothing.
 for(const l of spans){
  const name=layer('GEOLOGY_'+l.id,ACI.earth,l.color);
  const a=Math.max(0,l.start),b=Math.min(len,l.end);if(!(b>a))continue;
  let ring=[];
  function flush(){if(ring.length>1){const outline=[...ring,[ring.at(-1)[0],l.base],[ring[0][0],l.base]];path(name,outline,true)}ring=[]}
  for(let i=1;i<points.length;i++){const [d0,h0]=points[i-1],[d1,h1]=points[i];let x=Math.max(a,d0),y=Math.min(b,d1);if(y<=x)continue;if(!Number.isFinite(h0)||!Number.isFinite(h1)){flush();continue}let u=Math.min(l.top,h0+(h1-h0)*(x-d0)/(d1-d0)),v=Math.min(l.top,h0+(h1-h0)*(y-d0)/(d1-d0));if(u<=l.base&&v<=l.base){flush();continue}if(u<l.base){x+=(y-x)*(l.base-u)/(v-u);u=l.base}if(v<l.base){y=x+(y-x)*(l.base-u)/(v-u);v=l.base}if(!ring.length)ring.push([x,u]);else if(Math.abs(ring.at(-1)[0]-x)>1e-5){flush();ring.push([x,u])}ring.push([y,v]);if(v<=l.base)flush()}
  flush();
 }
 if(landscape){layer('SECTION_NATURA2000',3,'#24734c');layer('SECTION_WATER',5,'#3485ad');layer('SECTION_FOREST',3,'#386949');const band=top+unit*.085;
 for(const r of landscape.reserve){path('SECTION_NATURA2000',[[r.a,band],[r.z,band]]);for(const d of [r.a,r.z])path('SECTION_NATURA2000',[[d,band-unit*.01],[d,band+unit*.01]]);text('SECTION_NATURA2000',(r.a+r.z)/2,band+unit*.025,'Natura 2000')}
 for(const r of landscape.water){const n=Math.max(1,Math.ceil((r.z-r.a)/2));const pts=Array.from({length:n+1},(_,i)=>{const d=r.a+(r.z-r.a)*i/n;return [d,heights(points,d)]});runs(pts,r=>path('SECTION_WATER',r))}
 for(const r of landscape.forest){const n=Math.max(1,Math.floor((r.z-r.a)/Math.max(15,unit*.045)));for(let i=0;i<n;i++){const d=r.a+(i+.5)*(r.z-r.a)/n,h=heights(points,d);if(!Number.isFinite(h))continue;const base=h+unit*.023,rad=unit*.009;path('SECTION_FOREST',[[d,h],[d,base]]);path('SECTION_FOREST',Array.from({length:24},(_,j)=>[d+rad*Math.cos(j*Math.PI/12),base+rad*Math.sin(j*Math.PI/12)]),true)}}
 }
 for(const row of history){const name=layer('HISTORICAL_'+row.y,8);runs(row.points,r=>path(name,r))}
 layer('SECTION_DIMENSIONS',7);layer('SECTION_LABELS',7);const dim=floor-unit*.035;path('SECTION_DIMENSIONS',[[0,dim],[len,dim]]);for(const d of [0,len])path('SECTION_DIMENSIONS',[[d-unit*.006,dim-unit*.009],[d+unit*.006,dim+unit*.009]]);text('SECTION_DIMENSIONS',len/2,dim-unit*.025,Math.round(len)+' m');
 text('SECTION_LABELS',0,top+unit*.14,id,unit*.018);text('SECTION_LABELS',len,top+unit*.14,id+"'",unit*.018);
 const side=flip?len+unit*.028:-unit*.028,tick=top-floor>160?50:top-floor>75?25:10;for(let h=Math.ceil(floor/tick)*tick;h<=top;h+=tick){path('SECTION_DIMENSIONS',[[flip?len:0,h],[side,h]]);text('SECTION_DIMENSIONS',side+(flip?1:-1)*unit*.035,h,(h>0?'+':'')+h,unit*.009)}
 text('SECTION_LABELS',side,top+unit*.045,'m NAP',unit*.009);
 return w.finish('ENCI '+year+' / '+s.id+' / local Rhino XYZ metres / Z = NAP - '+zOffset+' m / modelled geology and schematic landscape; water depth unknown');
}
export function buildGuidesDxf({cuts,zOffset=0,year=2026}){const w=writer();w.layer('SECTION_GUIDES',7);w.layer('SECTION_LABELS',7);for(const {s,points} of cuts){runs(points,r=>w.poly('SECTION_GUIDES',r.map(([d,h])=>sectionPoint(s,d,h,zOffset))));const middle=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1])/2,h=heights(points,middle);if(Number.isFinite(h))w.text('SECTION_LABELS',sectionPoint(s,middle,h,zOffset),s.id.replace(/^S0*/,''),7)}return w.finish('ENCI '+year+' / local Rhino XYZ metres / Z = NAP - '+zOffset+' m')}
