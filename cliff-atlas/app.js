import {references} from './data.js?v=8';
import {diagramFor} from './diagrams.js?v=9';
import {hasStructuralPlate,structuralPlate} from './structural-plates.js?v=9';
import {hasAxon,axonPlate,axonThumb} from './axon-plates.js?v=13';
const $=selector=>document.querySelector(selector);
const grid=$('#archive-grid'),filters=$('#filters'),search=$('#search');
const dialog=$('#detail'),detail=$('#detail-content');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const families=['Historic','Archives','All','Korea','Anchored','Cantilevered','Inserted','Stilted','Founded'];
let family='Historic',query='',shown=[...references],opened=null,returnFocus=null;
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
  const n=f==='All'?references.length:references.filter(x=>f==='Korea'?x.place.includes('Korea'):f==='Historic'?!!x.historic:f==='Archives'?!!x.measuredDrawings?.length:x.family===f).length;
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
 '<div class="case-diagram'+(hasAxon(r.id)?' axon-mini':'')+'"><span class="diag-label">'+(hasAxon(r.id)?'3D STRUCTURAL AXON / N.T.S.':'STRUCTURAL PRINCIPLE / N.T.S.')+'</span>'+(hasAxon(r.id)?axonThumb(r.id):diagramFor(r.scheme,r.principle))+'</div>'+
 '<div class="case-name-row"><span class="case-title">'+esc(r.name)+'</span><span class="case-year">'+esc(r.year)+'</span></div>'+
 '<div class="case-place">'+esc(r.place)+'</div>'+
 '<div class="case-fields">'+field('SCALE',r.scale)+field('TERRAIN / GROUND',r.ground)+field('ROCK INTERFACE',r.principle)+field('MATERIAL',r.materials)+'</div>'+
 '<div class="case-open"><span>'+esc(r.measuredDrawings?.length?'ARCHIVE / '+r.measuredDrawings.length+' SOURCE RECORDS':r.designer)+'</span><span>OPEN ↗</span></div>';
 el.addEventListener('click',()=>openReference(r.id));return el;
}
function render(){
 renderTabs();
 const q=query.trim().toLowerCase();
 shown=references.filter(r=>(family==='All'||(family==='Korea'?r.place.includes('Korea'):family==='Historic'?!!r.historic:family==='Archives'?!!r.measuredDrawings?.length:r.family===family))&&(!q||
 [r.name,r.year,r.place,r.designer,r.family,r.scale,r.connection,r.principle,r.materials,r.ground].some(v=>String(v).toLowerCase().includes(q))));
 grid.replaceChildren();
 if(!shown.length){const p=document.createElement('p');p.className='empty';p.textContent='No built references match this query.';grid.append(p)}
 else{for(const r of shown)grid.append(createCard(r));fallback(grid)}
 $('#result-count').textContent=shown.length+' / '+references.length+' built references'+(family==='Historic'?' · surviving or rebuilt historic fabric':'');
}
function openReference(id,keepFocus=false){
 const r=references.find(x=>x.id===id);if(!r)return;
 if(!keepFocus)returnFocus=document.activeElement;
 opened=id;const n=references.indexOf(r);if(location.hash.slice(1)!==encodeURIComponent(id)){const u=new URL(location.href);u.hash=id;history.replaceState(null,'',u.href)}
 $('#detail-index').textContent=String(n+1).padStart(2,'0')+' / '+String(references.length).padStart(2,'0')+' — '+r.family.toUpperCase();
 const structuralEvidence=r.technicalEvidence?.length?
 '<section class="technical-block"><div class="source-title">STRUCTURAL DIMENSIONS / EVIDENCE STATUS</div>'+
 r.technicalEvidence.map(item=>
 '<div class="technical-row"><div class="technical-row-label">'+esc(item.label)+'</div><div class="technical-row-value">'+esc(item.value)+'</div>'+
 '<div class="technical-row-status"><span>'+esc(item.status)+'</span> <a href="'+esc(item.source)+'" target="_blank" rel="noopener noreferrer">SOURCE ↗</a></div></div>'
 ).join('')+
 (r.technicalUnknowns?'<div class="technical-unknown"><b>NOT VERIFIED / </b>'+esc(r.technicalUnknowns)+'</div>':'')+
 (r.researchNote?'<p class="technical-note">'+esc(r.researchNote)+'</p>':'')+'</section>':'';

 const axonModule=hasAxon(r.id)?
 '<section class="plate-module axon-module" aria-label="Verified-principle structural axonometric">'+
 '<div class="archive-section-top"><span class="kicker">STRUCTURAL AXONOMETRIC / SOURCE-BASED</span><span class="archive-status">GEOMETRY / DIAGRAMMATIC — NOT A MEASURED RECONSTRUCTION</span></div>'+
 '<h3 class="archive-section-title">Timber × cliff / structural reading in three dimensions</h3>'+
 '<div class="plate-controls" role="group" aria-label="Axonometric view">'+
 '<button type="button" data-axon="assembly" aria-pressed="true" class="active">01 / ROOF + STRUCTURE</button>'+
 '<button type="button" data-axon="frame" aria-pressed="false">02 / TIMBER FRAME</button>'+
 '<button type="button" data-axon="contact" aria-pressed="false">03 / SUPPORTS ONLY</button>'+
 '<span class="plate-grow"></span>'+
 '<button type="button" id="axon-expand">OPEN FULL SIZE ↗</button>'+
 '<button type="button" id="axon-save">SVG ↓</button></div>'+
 '<div class="plate-window" tabindex="0" aria-label="Axonometric diagram scroll region"><div id="axon-sheet" class="plate-sheet">'+axonPlate(r.id,'assembly')+'</div></div>'+
 '<div class="plate-meta"><span>GREY / ROCK</span><span>CLAY / SCHEMATIC ROOF TILES</span><span>BROWN / TIMBER</span><span>BLUE / GROUND CONNECTION</span></div>'+
 '<p class="plate-warning">Roof typologies are based on published architectural descriptions and photographs: Podok has layered Korean tiled roof forms, and Xuankong has tiled pavilions with projecting eaves. Tile courses, roof slope, roof framing and bay placement are schematic, NOT traced from as-built drawings. Switch to TIMBER FRAME or SUPPORTS ONLY to inspect rock attachment without the roof. See primary sources below.</p>'+
 '</section>':'';
 const detailedPlate=hasStructuralPlate(r.id)?
  '<section class="plate-module" aria-label="Refined analytical drawings">'+
  '<div class="archive-section-top"><span class="kicker">ARCHITECTURAL ANALYSIS / VECTOR DRAWINGS</span><span class="archive-status">ORIGINAL INTERPRETATION · NOT MEASURED</span></div>'+
  '<h3 class="archive-section-title">Rock × timber / reconstructed structural reading</h3>'+
  '<div class="plate-controls" role="group" aria-label="Choose drawing view">'+
  '<button type="button" data-plate="section" class="active" aria-pressed="true">01 / STRUCTURAL SECTION</button>'+
  '<button type="button" data-plate="joint" aria-pressed="false">02 / ROCK CONTACT</button>'+
  '<span class="plate-grow"></span>'+
  '<button type="button" id="plate-expand">OPEN FULL SIZE ↗</button>'+
  '<button type="button" id="plate-save">SVG ↓</button></div>'+
  '<div class="plate-window" tabindex="0" aria-label="Scrollable technical section drawing"><div id="plate-sheet" class="plate-sheet">'+structuralPlate(r.id,"section")+'</div></div>'+
  '<div class="plate-meta"><span>HATCH / NATURAL ROCK</span><span>BLUE / LOAD PATH &amp; ROCK CONTACT</span><span>TIMBER / SCHEMATIC FRAME</span></div>'+
  '<p class="plate-warning">The analytical redrawings distinguish documented construction principles from unknown dimensions. They are neither tracings of the original survey plates nor 1:5 construction drawings. For original dimensioned materials, open the linked archival sheets below.</p>'+
  '</section>':'';
 const originalArchive=r.measuredDrawings?.length?
  '<section class="primary-archive"><div class="archive-section-top"><span class="kicker">PRIMARY MATERIAL / 02</span><span class="archive-status">'+esc(r.researchStatus||'ARCHIVAL MATERIAL')+'</span></div>'+
  '<h3 class="archive-section-title">Measured drawings & original survey records</h3>'+
  (r.sourceUsage?'<p class="archive-usage">'+esc(r.sourceUsage)+'</p>':'')+
  r.measuredDrawings.map(item=>
    '<a class="archive-drawing-link" href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">'+
    '<span class="drawing-number">'+esc(item.ref)+'</span>'+
    '<span class="drawing-desc">'+esc(item.label)+'<small>'+esc(item.drawing)+'</small></span>'+
    '<span class="drawing-tag">'+esc(item.status)+'</span><span class="drawing-open">↗</span></a>'
  ).join('')+'</section>':'';
 const timelineUI=r.constructionTimeline?.length?
  '<section class="primary-archive"><div class="archive-section-top"><span class="kicker">CONSTRUCTION TIMELINE / 03</span></div>'+
  '<h3 class="archive-section-title">Original fabric vs. later restoration</h3>'+
  r.constructionTimeline.map(item=>
   '<div class="archive-timeline"><div class="archive-timeline-date">'+esc(item.phase)+'</div>'+
   '<div class="archive-timeline-copy"><strong>'+esc(item.headline)+'</strong><p>'+esc(item.detail)+'</p>'+
   '<a href="'+esc(item.source)+'" target="_blank" rel="noopener noreferrer">'+esc(item.status)+' ↗</a></div></div>'
  ).join('')+'</section>':'';
 const analysisUI=r.loadPathNotes?.length?
  '<section class="primary-archive"><div class="archive-section-top"><span class="kicker">GEOMETRY × GROUND / 04</span></div>'+
  '<h3 class="archive-section-title">How the rock becomes structure</h3>'+
  r.loadPathNotes.map((item,i)=>
   '<div class="archive-analysis"><div class="archive-analysis-num">'+String(i+1).padStart(2,'0')+'</div><div>'+
   '<h4>'+esc(item.name)+'</h4><p>'+esc(item.detail)+'</p>'+
   '<a href="'+esc(item.source)+'" target="_blank" rel="noopener noreferrer">'+esc(item.status)+' ↗</a></div></div>'
  ).join('')+'</section>':'';
 const sources=r.sources.map(pair=>'<a class="source-link" href="'+esc(pair[1])+'" target="_blank" rel="noopener noreferrer"><span>'+esc(pair[0])+'</span><span>↗</span></a>').join('');
 detail.innerHTML=
 '<h2 class="detail-title" id="detail-title">'+esc(r.name)+'</h2>'+
 '<div class="detail-subtitle"><span>'+esc(r.place)+' · '+esc(r.year)+'</span><span>'+esc(r.designer)+'</span></div>'+
 '<div class="detail-photo-wrap">'+photo(r,true)+'</div>'+
 '<div class="detail-photo-caption">Image hosted by <a href="'+esc(r.photoLink)+'" target="_blank" rel="noopener noreferrer"><u>'+esc(r.photoFrom)+' ↗</u></a>. Photo rights remain with their respective publishers and photographers.</div>'+
 '<div class="detail-two"><div><span class="kicker">STRUCTURAL SECTION / INTERPRETIVE</span><div class="detail-diagram">'+diagramFor(r.scheme,r.principle)+'</div>'+
 '<p class="detail-diagram-label">Conceptual load-path diagram, not an as-built engineering section or to scale. Blue indicates rock attachment.</p></div>'+
 '<div class="detail-data">'+field('YEAR / STATUS',r.year+' · Built')+field('SCALE',r.scale)+(r.dimensionNote?field('DIMENSION STATUS',r.dimensionNote):'')+field('GROUND TYPE',r.ground)+field('ROCK INTERFACE',r.principle)+field('MATERIALS',r.materials)+'</div></div>'+
 '<div class="detail-summary"><div><span class="kicker">STRUCTURAL LOGIC / 01</span><h3>'+esc(r.connection)+'</h3></div><div><p>'+esc(r.description)+'</p></div></div>'+
 axonModule+structuralEvidence+
 detailedPlate+originalArchive+timelineUI+analysisUI+
 '<div class="detail-warning"><strong>Evidence / limitation.</strong> '+esc(r.evidence)+'</div>'+
 '<div class="source-title">TECHNICAL SOURCES & ORIGINAL DRAWINGS / WHERE AVAILABLE</div>'+
 sources+
 '<a class="source-link" href="'+esc(r.photoLink)+'" target="_blank" rel="noopener noreferrer"><span>Photographic project source</span><span>↗</span></a>';

 const axonNode=detail.querySelector('.axon-module');
 if(axonNode){
  let axMode='assembly';
  const axSheet=axonNode.querySelector('#axon-sheet');
  const axFile=()=>{
   const blob=new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n',axonPlate(r.id,axMode)],{type:'image/svg+xml'});
   return URL.createObjectURL(blob);
  };
  axonNode.querySelectorAll('[data-axon]').forEach(b=>b.addEventListener('click',()=>{
   axMode=b.dataset.axon;axSheet.innerHTML=axonPlate(r.id,axMode);
   axonNode.querySelectorAll('[data-axon]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});
  }));
  axonNode.querySelector('#axon-save').addEventListener('click',()=>{
   const url=axFile(),anchor=document.createElement('a');anchor.href=url;
   anchor.download='CliffAtlas_'+r.id+'_'+axMode+'_structural_axon.svg';anchor.click();
   setTimeout(()=>URL.revokeObjectURL(url),30000);
  });
  axonNode.querySelector('#axon-expand').addEventListener('click',()=>{
   const url=axFile(),anchor=document.createElement('a');anchor.href=url;
   anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.click();
   setTimeout(()=>URL.revokeObjectURL(url),180000);
  });
 }
 const plateNode=detail.querySelector('.plate-module:not(.axon-module)');
 if(plateNode){
  let mode='section';
  const sheet=plateNode.querySelector('#plate-sheet');
  const svgContent=()=>structuralPlate(r.id,mode);
  const outputFile=()=>{
   const drawing=svgContent();
   const blob=new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n',drawing],{type:'image/svg+xml'});
   return {blob,url:URL.createObjectURL(blob)}
  };
  plateNode.querySelectorAll('[data-plate]').forEach(button=>button.addEventListener('click',()=>{
   mode=button.dataset.plate;
   sheet.innerHTML=svgContent();
   plateNode.querySelectorAll('[data-plate]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
  }));
  plateNode.querySelector('#plate-save').addEventListener('click',()=>{
   const f=outputFile(),a=document.createElement('a');
   a.href=f.url;a.download='CliffAtlas_'+r.id+'_'+mode+'_interpretive.svg';a.click();
   setTimeout(()=>URL.revokeObjectURL(f.url),30000)
  });
  plateNode.querySelector('#plate-expand').addEventListener('click',()=>{
   const f=outputFile();const a=document.createElement('a');a.href=f.url;a.target='_blank';a.rel='noopener noreferrer';a.click();
   setTimeout(()=>URL.revokeObjectURL(f.url),180000)
  });
 }
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
dialog.addEventListener('close',()=>{opened=null;if(location.hash){const u=new URL(location.href);u.hash='';history.replaceState(null,'',u.href)}if(returnFocus?.isConnected)returnFocus.focus()});
document.addEventListener('keydown',event=>{if(!dialog.open)return;if(event.key==='ArrowLeft'){event.preventDefault();step(-1)}if(event.key==='ArrowRight'){event.preventDefault();step(1)}});
search.addEventListener('input',()=>{query=search.value;render()});
render();
const deepCase=decodeURIComponent(location.hash.slice(1));if(deepCase&&references.some(r=>r.id===deepCase))openReference(deepCase);
