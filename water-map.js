// ENCI surface-water sample observations (not groundwater or bathing-water monitoring).
// De Mars et al., OBN-2021-132-HE, published Jan 2026, Appendix 6.2a, 15 ENCI rows.
// https://natuurkennis.nl/publicaties/kalkmoerassen-in-het-heuvellandschap/
import * as THREE from 'three';
import {makeIndex} from './cliff-sections.js?v=25';
import {rdToLocal,terrainGrid} from './quarry-analysis.js?v=35';
export const params=[
 ['ph','pH','',1],['no3','Nitrate (NO₃⁻)','µmol/L',0],['nh4','Ammonium (NH₄⁺)','µmol/L',0],['p','P','µmol/L',0],['cl','Chloride (Cl)','µmol/L',0],['ca','Calcium (Ca)','µmol/L',0],['s','Sulphur (S)','µmol/L',0],['hco3','Bicarbonate (HCO₃⁻)','µmol/L',0],['mg','Magnesium (Mg)','µmol/L',0],['mn','Manganese (Mn)','µmol/L',0]
];
const keys=['ph','hco3','no3','nh4','p','cl','ca','mg','mn','s'];
const sample=(date,values)=>({date,...Object.fromEntries(keys.map((k,i)=>[k,values[i]]))});
export const stations=[
 {id:'KM2_OW',rd:[175787,315292],rows:[sample('2022-06-14',[7.7,5229,3,3,1,99,3071,317,0,654]),sample('2022-10-04',[7.3,4846,1,1,0,113,3233,303,0,1096])]},
 {id:'KM3_OW',rd:[175783,315280],rows:[sample('2022-05-17',[7,4881,0,1,1,149,3147,313,1,823]),sample('2023-09-12',[7.4,4762,3,7,1,517,2830,287,2,580])]},
 {id:'KM4_OW',rd:[175773,315260],rows:[sample('2022-06-14',[7.2,5141,1,1,1,131,2698,261,1,194]),sample('2022-10-04',[7.2,4382,1,1,0,187,3173,266,0,1236]),sample('2023-04-18',[8,4636,1,3,1,75,2722,226,0,741]),sample('2024-09-11',[7.5,5537,6,12,1,195,2961,264,0,562])]},
 {id:'KM5_OW',rd:[175600,315011],rows:[sample('2022-05-17',[7.7,5236,0,1,0,675,2187,235,0,334]),sample('2022-06-14',[7.4,4998,3,1,0,662,2870,282,0,415]),sample('2022-10-04',[7.4,5266,1,1,0,712,2799,290,0,435]),sample('2023-04-18',[7.6,4037,1,2,1,1809,2826,293,0,397]),sample('2023-09-12',[7.5,5422,3,7,0,684,2889,324,0,390]),sample('2024-05-15',[7.7,4483,2,0,1,536,2200,289,0,383]),sample('2024-09-11',[7.9,3765,5,3,0,533,2044,213,0,324])]}
];
export const waterSource='https://natuurkennis.nl/publicaties/kalkmoerassen-in-het-heuvellandschap/';
export const waterLayer={id:'water-site',label:'Water · site measurements',generated:'site-water',note:''};
export function range(key){const v=stations.flatMap(s=>s.rows.map(r=>r[key]));return [Math.min(...v),Math.max(...v)]}
export function valueAt(s,key,period){const rows=period==='all'?s.rows:s.rows.filter(r=>r.date.startsWith(period));if(!rows.length)return null;return rows.at(-1)}
const palette=['#d1e6ef','#a4c8dd','#6b9fbf','#396f99','#203f65'];
export function colorFor(key,v){const [min,max]=range(key);return palette[Math.min(4,Math.max(0,Math.floor((v-min)/Math.max(max-min,1e-9)*5)))]}
const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value!=null)n.textContent=value;if(cls)n.className=cls;return n};
const ns='http://www.w3.org/2000/svg';
export function createWaterMap({camera,canvas,getState,dirty,redraw}){
 let parameter='ph',period='all',selected=null,points=[],stamp=0,visible=false,bodyAnchor=null;
 const host=el('div',null,'water-map-host');host.hidden=true;const lines=document.createElementNS(ns,'svg');lines.classList.add('water-map-lines');host.append(lines);document.body.append(host);
 const card=el('div',null,'water-map-card');card.hidden=true;host.append(card);
 function clear(){stamp++;host.hidden=true;visible=false;points=[];bodyAnchor=null;selected=null;host.querySelectorAll('.water-map-pin').forEach(n=>n.remove());lines.replaceChildren();card.hidden=true;}
 function active(){const s=getState();return s.mode==='environment'&&s.env?.generated==='site-water'&&s.year===2026&&!s.stack&&s.kind!=='local'}
 function param(){return params.find(p=>p[0]===parameter)}
 function select(r){selected=selected===r.id?null:r.id;renderCard();dirty()}
 function renderCard(){card.replaceChildren();const p=points.find(p=>p.record.id===selected);card.hidden=!p;if(!p)return;const r=p.record;if(r.bathing){card.append(el('strong','Quarry water'),el('div','Not approved for swimming'),el('div','No verified bathing-water test results'),el('small','2017 closure: safety / visitor management'));return}
 const head=el('div',null,'water-map-head');head.append(el('strong',r.id));const x=el('button','×');x.type='button';x.onclick=()=>{selected=null;renderCard();dirty()};head.append(x);card.append(head);
 const row=parameter==='bathing'?r.rows.at(-1):valueAt(r,parameter,period);if(!row){card.append(el('div','No sample in selected year'));return}
 card.append(el('small','Surface water · '+row.date));
 const table=el('div',null,'water-map-values');for(const [k,label,unit,dp] of params){table.append(el('span',label),el('b',row[k].toFixed(dp)+(unit?' '+unit:'')))}card.append(table,el('small','E. coli / enterococci: not measured here'),el('small','Not a bathing-water assessment'));
 }
 function paint(){for(const p of points){const r=p.record,b=p.button;if(r.bathing){b.hidden=parameter!=='bathing';b.textContent='SWIM · NOT APPROVED';b.style.background='#6a4945';b.style.color='#fff';continue}b.hidden=parameter==='bathing';if(parameter==='bathing')continue;const row=valueAt(r,parameter,period),[,label,unit,dp]=param();b.textContent=r.id.replace('_OW','')+'  '+(row?row[parameter].toFixed(dp):'—');b.style.background=row?colorFor(parameter,row[parameter]):'#e5e5e5';b.style.color=row&&['#396f99','#203f65'].includes(b.style.background)?'white':'#141414';// CSS color getter normalizes to rgb, use explicit source
 b.style.color=row&&palette.indexOf(colorFor(parameter,row[parameter]))>=3?'white':'#141414';b.title=label+(unit?' · '+unit:'')+(row?' · '+row.date:' · No sample');}renderCard();dirty()}
 function controls(parent){const lab=el('label',null,'dxf-datum');lab.append(el('span','Water parameter'));const sel=el('select');for(const [k,name,unit] of params)sel.append(new Option(name+(unit?' · '+unit:''),k));sel.append(new Option('Bathing status','bathing'));sel.value=parameter;sel.onchange=()=>{parameter=sel.value;selected=null;paint();redraw()};lab.append(sel);parent.append(lab);
 if(parameter!=='bathing'){const l=el('label',null,'dxf-datum'),s=el('select');l.append(el('span','Sampling year'));for(const [v,n] of [['all','Latest per point (2022–24)'],['2022','2022'],['2023','2023'],['2024','2024']])s.append(new Option(n,v));s.value=period;s.onchange=()=>{period=s.value;selected=null;paint();redraw()};l.append(s);parent.append(l)}}
 function legend(parent,legendRow){if(parameter==='bathing'){parent.append(legendRow('Not approved for swimming','#6a4945'));return}const [,name,unit,dp]=param(),[a,b]=range(parameter);parent.append(el('div',name+(unit?' · '+unit:''),'legend-unit'));const gradient=el('div',null,'water-map-gradient');gradient.style.background='linear-gradient(90deg,'+palette.join(',')+')';const ticks=el('div',null,'water-map-ticks');ticks.append(el('span',a.toFixed(dp)),el('span',b.toFixed(dp)));parent.append(gradient,ticks,legendRow('No sample in chosen year','#e5e5e5'),el('small','Measured range · not a safety scale','subnote'),el('small','OBN · 2022–24','subnote'))}
 async function load(model,manifest,bounds){clear();const token=stamp;const index=await makeIndex(model);if(token!==stamp||!active())return;for(const record of stations){const [x,y]=rdToLocal(record.rd,manifest),z=index.height(x,y);if(!Number.isFinite(z))continue;const b=el('button',null,'water-map-pin');b.type='button';b.onclick=()=>select(record);host.append(b);points.push({record,button:b,pos:new THREE.Vector3(x,z+1.2,-y)})}
 visible=true;host.hidden=false;paint();
 // Bathing status is attached to the mapped main lake only as a site-status annotation,
 // not a legal boundary or water-quality polygon.
 try{const grid=await terrainGrid(model,bounds,manifest);if(token!==stamp||!active())return;let n=0,x=0,y=0;for(let i=0;i<grid.observed.length;i++)if(grid.observed[i]){x+=grid.bounds[0]+(i%grid.w+.5)/grid.w*(grid.bounds[2]-grid.bounds[0]);y+=grid.bounds[3]-(Math.floor(i/grid.w)+.5)/grid.h*(grid.bounds[3]-grid.bounds[1]);n++}if(n){x/=n;y/=n;const z=index.height(x,y);if(Number.isFinite(z)){const record={id:'bathing',bathing:true},b=el('button',null,'water-map-pin');b.type='button';b.onclick=()=>select(record);host.append(b);points.push({record,button:b,pos:new THREE.Vector3(x,z+1.2,-y)});paint()}}}catch(e){console.warn('Bathing map anchor:',e)}}
 function project(){if(!visible||!active()){host.hidden=true;return}host.hidden=false;lines.replaceChildren();const rect=canvas.getBoundingClientRect(),used=[];let chosen=null;
 function line(x,y,u,v){for(const [stroke,width] of [['#fff',3],['#333',.9]]){const l=document.createElementNS(ns,'line');for(const [k,val] of Object.entries({x1:x,y1:y,x2:u,y2:v,stroke,'stroke-width':width}))l.setAttribute(k,val);lines.append(l)}}
 for(const p of points){const q=p.pos.clone().project(camera),show=(parameter==='bathing')===!!p.record.bathing&&q.z>=-1&&q.z<=1&&Math.abs(q.x)<1&&Math.abs(q.y)<1;p.button.hidden=!show;if(!show)continue;const x=rect.left+(q.x+1)*rect.width/2,y=rect.top+(1-q.y)*rect.height/2,w=p.button.offsetWidth||90,h=p.button.offsetHeight||22;let u=x+12,v=y-12;for(let i=0;i<20;i++){if(!used.some(r=>u<r.x+r.w+4&&u+w+4>r.x&&v<r.y+r.h+4&&v+h+4>r.y))break;v+=h+5}u=Math.max(3,Math.min(innerWidth-w-3,u));v=Math.max(3,Math.min(innerHeight-h-3,v));used.push({x:u,y:v,w,h});p.button.style.left=u+'px';p.button.style.top=v+'px';line(x,y,u,v+h/2);const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('r',3);dot.setAttribute('fill','#222');dot.setAttribute('stroke','#fff');dot.setAttribute('stroke-width',1);lines.append(dot);if(p.record.id===selected)chosen={x:u,y:v,w,h}}
 card.hidden=!chosen;if(chosen){const w=card.offsetWidth||235,h=card.offsetHeight||260;let x=chosen.x+chosen.w+8;if(x+w>innerWidth-270)x=chosen.x-w-8;card.style.left=Math.max(8,Math.min(innerWidth-w-8,x))+'px';card.style.top=Math.max(50,Math.min(innerHeight-h-90,chosen.y))+'px'}}
 return {clear,load,project,controls,legend};
}
