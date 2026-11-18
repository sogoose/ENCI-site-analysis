
const names={HL:'Holocene deposits',BX:'Boxtel Formation',BE:'Beegden Formation',TO:'Tongeren Formation',MT:'Maastricht Formation',GU:'Gulpen Formation',VA:'Vaals Formation'};
const colors={HL:'#97b6a3',BX:'#dfcfab',BE:'#c6a383',TO:'#c5a5c5',MT:'#dca46e',GU:'#eddbab',VA:'#75918b'};
export function validateDgm(d){
 const g=d?.grid;if(d?.crs!=='EPSG:28992'||d.verticalDatum!=='m NAP'||!g||g.cellsize!==100||g.rowOrder!=='north-to-south'||!Array.isArray(d.originRD)||d.originRD.length!==2||!d.originRD.every(Number.isFinite)||!Array.isArray(d.units)||!d.units.length||!Number.isInteger(g.cols)||!Number.isInteger(g.rows)||g.cols<1||g.rows<1||g.cols*g.rows>100000||![g.xmin,g.xmax,g.ymin,g.ymax].every(Number.isFinite)||Math.abs(g.xmax-g.xmin-g.cols*g.cellsize)>0.01||Math.abs(g.ymax-g.ymin-g.rows*g.cellsize)>0.01)throw Error('Unexpected DGM grid format');
 const n=g.cols*g.rows;for(const u of d.units){if(!Array.isArray(u.top)||!Array.isArray(u.base)||u.top.length!==n||u.base.length!==n)throw Error('Invalid DGM unit grid');}
 return d;
}
export async function loadDgm(url='./assets/environment/enci-dgm-69w.json'){const r=await fetch(url);if(!r.ok)throw Error('DGM snapshot not uploaded');return validateDgm(await r.json())}
export function dgmSpans(data,section){
 const g=data.grid,o=data.originRD,a=section.a.map((v,i)=>v+o[i]),b=section.b.map((v,i)=>v+o[i]),delta=b.map((v,i)=>v-a[i]),len=Math.hypot(...delta),ts=[0,1];if(!len)return [];
 for(const [axis,lo,hi] of [[0,g.xmin,g.xmax],[1,g.ymin,g.ymax]]){if(Math.abs(delta[axis])<1e-9)continue;for(let p=lo;p<=hi;p+=g.cellsize){const t=(p-a[axis])/delta[axis];if(t>0&&t<1)ts.push(t)}}
 ts.sort((a,b)=>a-b);const spans=[];
 for(let i=1;i<ts.length;i++){const t0=ts[i-1],t1=ts[i];if(t1-t0<1e-9)continue;const t=(t0+t1)/2,col=Math.floor((a[0]+t*delta[0]-g.xmin)/g.cellsize),row=Math.floor((g.ymax-a[1]-t*delta[1])/g.cellsize);if(col<0||row<0||col>=g.cols||row>=g.rows)continue;const k=row*g.cols+col;for(const u of data.units){const top=u.top[k],base=u.base[k];if(typeof top!=='number'||typeof base!=='number'||!Number.isFinite(top)||!Number.isFinite(base)||top<=base)continue;spans.push({start:t0*len,end:t1*len,top,base,id:u.id,name:names[u.id]||u.name,color:colors[u.id]||'#aaa'});}}
 return spans;
}
export function dgmLegend(spans){return [...new Map(spans.map(s=>[s.id,{id:s.id,name:s.name,color:s.color}])).values()]}
