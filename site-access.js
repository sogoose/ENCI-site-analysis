// Site-scale geometry only: no regional route relations.
export const categories={road:{label:'Road / service access',color:'#ed008c',width:4.4},path:{label:'Walking / cycling path',color:'#00c7e5',width:3.2},steps:{label:'Steps',color:'#ffae00',width:4.4}};
function d2(p,a,b){const x=b[0]-a[0],y=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/(x*x+y*y||1)));return (p[0]-a[0]-t*x)**2+(p[1]-a[1]-t*y)**2}
function inside(p,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
export function clipPaths(points,ring,buffer){const keep=p=>inside(p,ring)||ring.some((a,i)=>d2(p,a,ring[(i+1)%ring.length])<=buffer*buffer);const out=[];let run=[];const finish=()=>{if(run.length>1)out.push(run);run=[]};
for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/8));for(let j=i===1?0:1;j<=n;j++){const t=j/n,p=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];if(keep(p))run.push(p);else finish()}}finish();return out}
function simplify(points,tol=1.2){if(points.length<=2)return points;let max=tol*tol,idx=-1;for(let i=1;i<points.length-1;i++){const d=d2(points[i],points[0],points.at(-1));if(d>max){max=d;idx=i}}return idx<0?[points[0],points.at(-1)]:[...simplify(points.slice(0,idx+1),tol).slice(0,-1),...simplify(points.slice(idx),tol)]}
export function classify(tags){const h=tags.highway||'';if(tags.area==='yes'||tags.construction||tags.access==='private'||tags.access==='no')return null;if(h==='steps')return tags.foot==='no'||tags.foot==='private'?null:'steps';if(/^(path|footway|pedestrian|cycleway|track)$/.test(h))return tags.foot==='no'||tags.foot==='private'?null:'path';if(/^(primary|secondary|tertiary|unclassified|residential|living_street|service)$/.test(h)){if(/^(parking_aisle|driveway|drive-through|emergency_access)$/.test(tags.service||''))return null;return 'road'}return null}
let pending=null;
export function loadSiteNetwork(manifest,ring,options={},toLocal){if(pending)return pending;pending=run(manifest,ring,options,toLocal).catch(e=>{pending=null;throw e});return pending}
async function run(m,ring,opts,toLocal){
 if(!ring?.length||!m?.model_bounds||!m?.wgs84_bounds)throw Error('Site boundary or georeference missing');
 const buffer=opts.bufferM??150,days=opts.cacheDays??7,key='enci-site-access-v2:'+JSON.stringify([m.wgs84_bounds,ring,buffer]);
 const valid=d=>d?.schema===2&&Array.isArray(d.paths)&&d.paths.length>0;
 const staticResponse=await fetch('./assets/context/site-access.json',{cache:'default'}).catch(()=>null);if(staticResponse?.ok){try{const d=await staticResponse.json();if(valid(d))return {...d,cached:true,stored:true}}catch{}}
 let old=null;try{old=JSON.parse(localStorage.getItem(key)||'null');if(valid(old)&&Date.now()-old.timestamp<days*86400000)return {...old,cached:true}}catch{}
 const [x0,y0,x1,y1]=m.model_bounds,[lon0,lat0,lon1,lat1]=m.wgs84_bounds;
 const minX=Math.max(x0,Math.min(...ring.map(p=>p[0]))-buffer),maxX=Math.min(x1,Math.max(...ring.map(p=>p[0]))+buffer),minY=Math.max(y0,Math.min(...ring.map(p=>p[1]))-buffer),maxY=Math.min(y1,Math.max(...ring.map(p=>p[1]))+buffer);
 const lon=x=>lon0+(x-x0)/(x1-x0)*(lon1-lon0),lat=y=>lat0+(y-y0)/(y1-y0)*(lat1-lat0);
 const bbox=[lat(minY),lon(minX),lat(maxY),lon(maxX)].map(x=>x.toFixed(6)).join(',');
 const q='[out:json][timeout:12];way["highway"~"^(primary|secondary|tertiary|unclassified|residential|living_street|service|path|footway|pedestrian|cycleway|track|steps)$"]["access"!~"^(private|no)$"]["service"!~"^(parking_aisle|driveway|drive-through|emergency_access)$"]('+bbox+');out geom('+bbox+');';
 try{const response=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(q),{signal:AbortSignal.timeout(18000)});if(!response.ok)throw Error('OSM HTTP '+response.status);const raw=await response.json();if(raw.remark)throw Error('OSM query did not complete');if(!Array.isArray(raw.elements))throw Error('Invalid OSM response');const paths=[],counts={road:0,path:0,steps:0};
 for(const e of raw.elements){if(e.type!=='way'||!e.geometry)continue;const type=classify(e.tags||{});if(!type)continue;let runs=[],run=[];for(const point of e.geometry){if(Number.isFinite(point?.lon)&&Number.isFinite(point?.lat))run.push(toLocal(point.lon,point.lat));else{if(run.length>1)runs.push(run);run=[]}}if(run.length>1)runs.push(run);
 let used=false;for(const r of runs)for(const part of clipPaths(r,ring,buffer)){const coords=simplify(part).map(p=>p.map(x=>Math.round(x*10)/10));if(coords.length<2)continue;paths.push({type,id:e.id,points:coords});used=true}if(used)counts[type]++}
 if(!paths.length)throw Error('No relevant ways returned');const result={schema:2,timestamp:Date.now(),source:'OpenStreetMap contributors / ODbL',bufferM:buffer,counts,paths};try{localStorage.setItem(key,JSON.stringify(result))}catch{}return result;
 }catch(e){if(valid(old))return {...old,cached:true,stale:true};throw e}
}
