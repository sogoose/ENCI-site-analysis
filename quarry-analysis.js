// Independent analysis from existing viewer terrain, with report-derived thresholds.
// Witteveen+Bos/RWS 140081/24-010.204 (12 July 2024), figs 2.5, 5.1, 5.2, 7.1.
import {makeIndex,inside} from './cliff-sections.js?v=25';
const colors=['#24568f','#4388ac','#70b6bc','#b5d9b2','#e2df9a','#dbb66d','#c58b60','#ac6c57','#89594f','#624b50'];
const limits=[14.5,18,25,36,44,60,80,100,130];
const makeLegend=(items)=>Object.fromEntries(items.map(([label,color],i)=>[i,{label,color}]));
export const levels=[14.5,18,36,44];
export const ecologyNotes=[
 'Fig. 5.1: management objectives (received 25 March 2024), not observed vegetation.',
 'Fig. 5.2: intended nature types after restoration; overlaps but differs from Fig. 5.1 (e.g. units 33, 39, 40, 52, 53, 70).',
 'Potential calcareous marsh around +16–17 and +39–44 m; moist calcareous grassland around +38 m; pioneer vegetation on low quarry slopes.',
 'Original spatial boundaries require the underlying Natuurmonumenten GIS file. Elevation screening is not a habitat map.'
];
export const wells=[
 {id:'B61F2506',rd:[175481,315223],ground:96.4,high:52.5,low:49.8,period:'2010–2020'},
 {id:'B61F1381',rd:[175790,315440],ground:51.6,high:49.4,low:47.0,period:'2000–2020'},
 {id:'B61F1383',rd:[176720,314450],ground:48.1,high:45.6,low:43.8,period:'2000–2020'},
 {id:'B61F1410',rd:[175584,314601],ground:95.5,high:49.6,low:47.8,period:'2009–2020'}
];
export const reportLayers=[
 {id:'report-elevation',label:'Elevation · m NAP',generated:'elevation',unit:'m NAP',resolution_m:[10,10],legend:makeLegend(colors.map((c,i)=>[i===0?'≤ 14.5':i===9?'> 130':limits[i-1]+' – '+limits[i],c])),note:'Fig. 2.5 reference; regenerated from the present terrain mesh, not the report raster. Source terrain date / submerged floor unresolved.'},
 {id:'report-ecology',label:'Ecological elevation potential',generated:'ecology',unit:'screening only',resolution_m:[10,10],legend:makeLegend([['+16–17 m / +39–44 m · marsh potential','#aa84bd'],['+37–39 m · moist grassland screening','#43b786'],['Other elevation / unclassified','#e7e3d8']]),note:'Figs. 5.1–5.2 / §5.2. Elevation screening only, not the original management or nature-type map. The ±1 m grassland band is an analytical choice.'},
 {id:'report-water',label:'Water level scenarios',generated:'water',unit:'m NAP',resolution_m:[10,10],legend:makeLegend([['Connected low ground at baseline +14.5 m','#367ead'],['Additional connected low ground at selected level','#79c6e0']]),note:'Fig. 7.1 reference levels. Terrain-only connected low-ground screening within approximate quarry basin; not hydraulic simulation, inundation forecast or water depth.'},
 {id:'report-wells',label:'Groundwater observation points',generated:'wells',unit:'GHG / GLG · m NAP',legend:makeLegend([['Observation point','#393b75']]),note:'Fig. 2.8–2.10 and Table 2.3. RD coordinates from report plots; approximate local registration. Historical levels, not present measurements.'}
];
const cache=new WeakMap();
const quarry=[[-830,-1120],[-680,-1240],[-120,-1190],[155,-900],[105,-570],[-95,-210],[-240,90],[-425,210],[-690,-85],[-870,-450],[-910,-780]];
function insideQuarry(x,y){return inside(x,y,quarry)}
export function basinFlood(grid,level){
 const {w,h,z,mask,bounds}=grid,N=w*h,wet=new Uint8Array(N),queue=new Int32Array(N);let seed=-1,best=Infinity;
 // Locate a low point in the primary quarry lake vicinity, not the Maas or other disconnected basins.
 for(let i=0;i<N;i++){if(!mask[i]||!Number.isFinite(z[i])||z[i]>level+.15)continue;const x=bounds[0]+(i%w+.5)/w*(bounds[2]-bounds[0]),y=bounds[3]-(Math.floor(i/w)+.5)/h*(bounds[3]-bounds[1]);if(Math.hypot(x+315,y+690)>320)continue;if(z[i]<best){best=z[i];seed=i}}
 if(seed<0)return {wet,count:0};
 let a=0,b=0;queue[b++]=seed;wet[seed]=1;
 while(a<b){const i=queue[a++],x=i%w,y=Math.floor(i/w);for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!wet[j]&&mask[j]&&Number.isFinite(z[j])&&z[j]<=level+.15){wet[j]=1;queue[b++]=j}}
 return {wet,count:b};
}
export async function terrainGrid(model,bounds){
 if(cache.has(model))return cache.get(model);
 const task=(async()=>{const index=await makeIndex(model),w=Math.ceil((bounds[2]-bounds[0])/10),h=Math.ceil((bounds[3]-bounds[1])/10),z=new Float32Array(w*h),mask=new Uint8Array(w*h);
 for(let j=0;j<h;j++){for(let i=0;i<w;i++){const x=bounds[0]+(i+.5)/w*(bounds[2]-bounds[0]),y=bounds[3]-(j+.5)/h*(bounds[3]-bounds[1]),v=index.height(x,y),k=j*w+i;z[k]=Number.isFinite(v)?v:NaN;mask[k]=insideQuarry(x,y)?1:0}if(j%12===0)await new Promise(r=>setTimeout(r,0))}
 return {bounds,w,h,z,mask,flood:new Map()}})().catch(e=>{cache.delete(model);throw e});cache.set(model,task);return task;
}
export function floodAt(grid,level){if(!grid.flood.has(level))grid.flood.set(level,basinFlood(grid,level));return grid.flood.get(level)}
export function floodIntervals(grid,cut,len,level){const wet=floodAt(grid,level).wet,{bounds:b,w,h}=grid,n=Math.max(1,Math.ceil(len/5)),out=[];let run=null;for(let i=0;i<n;i++){const t=(i+.5)/n,x=cut.a[0]+(cut.b[0]-cut.a[0])*t,y=cut.a[1]+(cut.b[1]-cut.a[1])*t,u=Math.floor((x-b[0])/(b[2]-b[0])*w),v=Math.floor((b[3]-y)/(b[3]-b[1])*h),hit=u>=0&&u<w&&v>=0&&v<h&&wet[v*w+u];if(hit){if(!run)run=[i/n*len,(i+1)/n*len];else run[1]=(i+1)/n*len}else if(run){out.push(run);run=null}}if(run)out.push(run);return out}
export function rdToLocal(rd,manifest){const b=manifest.rd_bounds,m=manifest.model_bounds;return [m[0]+(rd[0]-b[0])/(b[2]-b[0])*(m[2]-m[0]),m[1]+(rd[1]-b[1])/(b[3]-b[1])*(m[3]-m[1])]}
export async function reportCanvas(layer,model,bounds,manifest,level){
 const c=document.createElement('canvas');let g;
 if(layer.generated==='wells'){c.width=1400;c.height=Math.round(c.width*(bounds[3]-bounds[1])/(bounds[2]-bounds[0]));g=c.getContext('2d');for(const p of wells){const [x,y]=rdToLocal(p.rd,manifest),u=(x-bounds[0])/(bounds[2]-bounds[0])*c.width,v=(bounds[3]-y)/(bounds[3]-bounds[1])*c.height;g.beginPath();g.arc(u,v,9,0,Math.PI*2);g.fillStyle='#393b75';g.fill();g.lineWidth=3;g.strokeStyle='white';g.stroke();g.font='20px Arial';g.strokeStyle='white';g.lineWidth=5;g.strokeText(p.id,u+13,v-6);g.fillStyle='#393b75';g.fillText(p.id,u+13,v-6)}return {canvas:c}}
 const grid=await terrainGrid(model,bounds),{w,h,z,mask}=grid;c.width=w;c.height=h;g=c.getContext('2d');const img=g.createImageData(w,h),hex=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));let base=null,scenario=null;
 if(layer.generated==='water'){base=floodAt(grid,14.5);scenario=floodAt(grid,level);if(!scenario.count)throw Error('No connected low terrain found at selected level. Model water surface may obscure the basin.')}
 for(let i=0;i<z.length;i++){if(!Number.isFinite(z[i]))continue;let color=null,alpha=255;const v=z[i];
 if(layer.generated==='elevation'){let k=limits.findIndex(x=>v<=x);color=colors[k<0?9:k]}
 if(layer.generated==='ecology'&&mask[i]){if(v>=16&&v<=17||v>=39&&v<=44)color='#aa84bd';else if(v>=37&&v<39)color='#43b786';else{color='#e7e3d8';alpha=65}}
 if(layer.generated==='water'&&scenario.wet[i])color=base.wet[i]?'#367ead':'#79c6e0';
 if(color){img.data.set([...hex(color),alpha],i*4)}}
 g.putImageData(img,0,0);const area=(bounds[2]-bounds[0])*(bounds[3]-bounds[1])/(w*h);return {canvas:c,grid,area:scenario?scenario.count*area:null,baseline:base?base.count*area:null};
}
