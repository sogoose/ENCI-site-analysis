import {references} from './data.js?v=3';
import {diagramFor} from './diagrams.js?v=3';
const $=selector=>document.querySelector(selector);
const grid=$('#archive-grid'),filters=$('#filters'),search=$('#search');
const dialog=$('#detail'),detail=$('#detail-content');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const families=['All','Korea','Anchored','Cantilevered','Inserted','Stilted'];
let family='All',query='',shown=[...references],opened=null,returnFocus=null;
function field(label,value){return '<div class="field"><span class="field-label">'+esc(label)+'</span><span class="field-value">'+esc(value)+'</span></div>'}
function photo(r,large){
 return '<div class="photo-frame'+(large?' detailed-photo-frame':'')+'"><img src="'+esc(r.photo)+'" alt="'+esc(r.name+' built architecture photograph')+'" loading="'+(large?'eager':'lazy')+'" decoding="async" referrerpolicy="no-referrer">'+
 '<div class="photo-unavailable"><span>EXTERNAL PHOTO UNAVAILABLE</span><span>OPEN SOURCE LINK BELOW ↗</span></div>'+
 (large?'':'<span class="photo-source">'+esc(r.photoFrom)+'</span>')+'</div>';
}
function fallback(root){
 for(const img of root.querySelectorAll('.photo-frame img')){
  img.addEventListener('error',()=>img.closest('.photo-frame')?.classList.add('missing'),{once:true});
  if(img.complete&&img.naturalWidth===0)img.closest('.photo-frame')?.classList.add('missing')
 }
}
function renderTabs(){
 filters.replaceChildren();
 for(const f of families){
  const n=f==='All'?references.length:references.filter(x=>f==='Korea'?x.place.includes('South Korea'):x.family===f).length;
  const b=document.createElement('button');b.type='button';
  b.className='filter'+(f===family?' active':'');b.setAttribute('aria-pressed',String(f===family));
  b.innerHTML=esc(f)+' <span class="count">'+n+'</span>';
  b.addEventListener('click',()=>{family=f;render()});filters.append(b);
 }
}
function createCard(r){
 const index=references.indexOf(r),el=document.createElement('button');
 el.type='button';el.className='case';el.dataset.id=r.id;
 el.setAttribute('aria-label','Open '+r.name+' structural reference');el.setAttribute('aria-haspopup','dialog');
 el.innerHTML=
 '<div class="case-top"><span class="case-number">'+String(index+1).padStart(2,'0')+' / '+references.length+'</span><span class="case-system">'+esc(r.family)+'</span></div>'+
 photo(r,false)+
 '<div class="case-diagram"><span class="diag-label">STRUCTURAL PRINCIPLE / N.T.S.</span>'+diagramFor(r.scheme,r.principle)+'</div>'+
 '<div class="case-name-row"><span class="case-title">'+esc(r.name)+'</span><span class="case-year">'+esc(r.year)+'</span></div>'+
 '<div class="case-place">'+esc(r.place)+'</div>'+
 '<div class="case-fields">'+field('SCALE',r.scale)+field('TERRAIN / GROUND',r.ground)+field('ROCK INTERFACE',r.principle)+field('MATERIAL',r.materials)+'</div>'+
 '<div class="case-open"><span>'+esc(r.designer)+'</span><span>OPEN ↗</span></div>';
 el.addEventListener('click',()=>openReference(r.id));return el;
}
function render(){
 renderTabs();
 const q=query.trim().toLowerCase();
 shown=references.filter(r=>(family==='All'||(family==='Korea'?r.place.includes('South Korea'):r.family===family))&&(!q||
 [r.name,r.year,r.place,r.designer,r.family,r.scale,r.connection,r.principle,r.materials,r.ground].some(v=>String(v).toLowerCase().includes(q))));
 grid.replaceChildren();
 if(!shown.length){const p=document.createElement('p');p.className='empty';p.textContent='No built references match this query.';grid.append(p)}
 else{for(const r of shown)grid.append(createCard(r));fallback(grid)}
 $('#result-count').textContent=shown.length+' / '+references.length+' built references';
}
function openReference(id,keepFocus=false){
 const r=references.find(x=>x.id===id);if(!r)return;
 if(!keepFocus)returnFocus=document.activeElement;
 opened=id;const n=references.indexOf(r);
 $('#detail-index').textContent=String(n+1).padStart(2,'0')+' / '+String(references.length).padStart(2,'0')+' — '+r.family.toUpperCase();
 const sources=r.sources.map(pair=>'<a class="source-link" href="'+esc(pair[1])+'" target="_blank" rel="noopener noreferrer"><span>'+esc(pair[0])+'</span><span>↗</span></a>').join('');
 detail.innerHTML=
 '<h2 class="detail-title" id="detail-title">'+esc(r.name)+'</h2>'+
 '<div class="detail-subtitle"><span>'+esc(r.place)+' · '+esc(r.year)+'</span><span>'+esc(r.designer)+'</span></div>'+
 '<div class="detail-photo-wrap">'+photo(r,true)+'</div>'+
 '<div class="detail-photo-caption">Image hosted by <a href="'+esc(r.photoLink)+'" target="_blank" rel="noopener noreferrer"><u>'+esc(r.photoFrom)+' ↗</u></a>. Photo rights remain with their respective publishers and photographers.</div>'+
 '<div class="detail-two"><div><span class="kicker">STRUCTURAL SECTION / INTERPRETIVE</span><div class="detail-diagram">'+diagramFor(r.scheme,r.principle)+'</div>'+
 '<p class="detail-diagram-label">Conceptual load-path diagram, not an as-built engineering section or to scale. Blue indicates rock attachment.</p></div>'+
 '<div class="detail-data">'+field('YEAR / STATUS',r.year+' · Built')+field('SCALE',r.scale)+field('GROUND TYPE',r.ground)+field('ROCK INTERFACE',r.principle)+field('MATERIALS',r.materials)+'</div></div>'+
 '<div class="detail-summary"><div><span class="kicker">STRUCTURAL LOGIC / 01</span><h3>'+esc(r.connection)+'</h3></div><div><p>'+esc(r.description)+'</p></div></div>'+
 '<div class="detail-warning"><strong>Evidence / limitation.</strong> '+esc(r.evidence)+'</div>'+
 '<div class="source-title">TECHNICAL SOURCES & ORIGINAL DRAWINGS / WHERE AVAILABLE</div>'+
 sources+
 '<a class="source-link" href="'+esc(r.photoLink)+'" target="_blank" rel="noopener noreferrer"><span>Photographic project source</span><span>↗</span></a>';
 fallback(detail);
 if(!dialog.open)dialog.showModal();
 $('.detail-shell').scrollTop=0;
 const i=shown.findIndex(x=>x.id===id);
 $('#previous').disabled=i<=0;$('#next').disabled=i<0||i>=shown.length-1;
}
function step(dir){const i=shown.findIndex(r=>r.id===opened),target=i+dir;if(target>=0&&target<shown.length)openReference(shown[target].id,true)}
$('#previous').addEventListener('click',()=>step(-1));
$('#next').addEventListener('click',()=>step(1));
$('#detail-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
dialog.addEventListener('close',()=>{opened=null;if(returnFocus?.isConnected)returnFocus.focus()});
document.addEventListener('keydown',event=>{if(!dialog.open)return;if(event.key==='ArrowLeft'){event.preventDefault();step(-1)}if(event.key==='ArrowRight'){event.preventDefault();step(1)}});
search.addEventListener('input',()=>{query=search.value;render()});
render();