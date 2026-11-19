/* Source-constrained axonometric READING, not a survey or an as-built reconstruction.
  Podok: AKS E0070871/E0023245. Xuankong: Hengshan official byhs.net.cn/news_detial/9.html,
  and Heritage Science (2025) s40494-025-01608-y. Numbers and geometry of individual
  sockets, braces, timber members and footings are NOT verified. */
const ink="#292b2a",blue="#0033ff",wood="#ae9372",woodD="#866847",rock="#e8e8e2",slate="#7f8683";
const F=v=>Number(v).toFixed(1);
const xyz=(x,y,z)=>[125+x*.97+y*.67,625-x*.20+y*.28-z*.79];
const p=v=>xyz(...v).map(F).join(",");
const poly=(points,fill,stroke=ink,width=1)=>'<polygon points="'+points.map(p).join(" ")+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+width+'" stroke-linejoin="round"/>';
const line=(a,b,c=ink,w=1.5,style="")=>{const aa=xyz(...a),bb=xyz(...b);return '<line x1="'+F(aa[0])+'" y1="'+F(aa[1])+'" x2="'+F(bb[0])+'" y2="'+F(bb[1])+'" stroke="'+c+'" stroke-width="'+w+'" '+style+'/>'};
function block(x,y,z,dx,dy,dz,top=wood,side=woodD){
 const a=[x,y,z],b=[x+dx,y,z],d=[x,y+dy,z],e=[x+dx,y+dy,z],a1=[x,y,z+dz],b1=[x+dx,y,z+dz],d1=[x,y+dy,z+dz],e1=[x+dx,y+dy,z+dz];
 return poly([a,b,b1,a1],side,ink,.85)+poly([b,e,e1,b1],side,ink,.85)+poly([d,e,e1,d1],side,ink,.85)+poly([a1,b1,e1,d1],top,ink,.85);
}
const beamY=(x,y,z,len,w=9)=>block(x-w/2,y,z-w/2,w,len,w);
const beamX=(x,y,z,len,w=9)=>block(x,y-w/2,z-w/2,len,w,w);
const post=(x,y,base,top,w=9,fill=woodD)=>block(x-w/2,y-w/2,base,w,w,top-base,fill,fill);
const writing=(x,y,t,size=11,color=ink,weight=400)=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="Inter,Arial,sans-serif" font-size="'+size+'" font-weight="'+weight+'">'+String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;")+'</text>';
const focus=(point,x,y,a,b)=>{
 const q=xyz(...point);return '<circle cx="'+F(q[0])+'" cy="'+F(q[1])+'" r="3.2" fill="'+blue+'"/>'+
 '<path d="M'+F(q[0])+' '+F(q[1])+'L'+(x-15)+' '+(y-5)+'L'+x+' '+(y-5)+'" stroke="'+blue+'" stroke-width="1" fill="none"/>'+
 writing(x,y,a,12,ink,600)+writing(x,y+19,b,11,slate);
};
const definitions='<defs><pattern id="rocks" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-33)"><path d="M0 0V12" stroke="#bfc0bb" stroke-width="1"/></pattern></defs>';
function rockface(xmin,xmax,high){
 const first=[[xmin,-100,0],[xmax,-100,0],[xmax,-100,high],[xmin,-100,high]];
 const back=[[xmin,-167,0],[xmin,-100,0],[xmin,-100,high],[xmin,-167,high]];
 return poly(back,"#dadbd5",slate,1)+poly(first,rock,slate,1.3)+poly(first,"url(#rocks)",slate,.3)+
 poly([[xmin,-167,high],[xmax,-167,high],[xmax,-100,high],[xmin,-100,high]],"#eeeee8",slate,.8);
}

// Tile geometry is schematic, based on recorded roof typologies and photos.
// Courses are *graphic notation*, not a claim about tile sizes or count.
// Roofs are a separate visible layer and can be hidden to inspect the frame.
const interpolate=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const tileStroke=(a,b,w=0.8,c="#707871")=>line(a,b,c,w,'opacity=".62"');
function tiledRoof({x0,x1,y0,y1,eave,rise,hip=0,tone="#abb0aa",outline="#4b5755",corner=0,tiles=10}){
 const ym=(y0+y1)/2,ridge=eave+rise;
 const bl=[x0,y0,eave+corner],br=[x1,y0,eave+corner],
       fl=[x0,y1,eave+corner],fr=[x1,y1,eave+corner],
       rl=[x0+hip,ym,ridge],rr=[x1-hip,ym,ridge];
 const near0=[x0,ym,eave],near1=[x1,ym,eave];
 // Far slope and hipped end faces first. Front tiled slope last.
 let out=poly([bl,br,rr,rl],tone,outline,1.05)+
  poly([bl,rl,fl],"#c4c5bd",outline,1)+
  poly([br,fr,rr],"#959e97",outline,1)+
  poly([rl,rr,fr,fl],tone,outline,1.2);
 const n=Math.max(4,tiles);
 for(let i=1;i<n;i++){
  const t=i/n;
  const root=interpolate(rl,rr,t);
  const foot=interpolate(fl,fr,t);
  out+=tileStroke(root,foot,0.8,outline);
 }
 // Roofing courses/ridges follow the sloping surface as architectural notation.
 for(const t of [.27,.53,.78]){
  const a=interpolate(rl,fl,t),b=interpolate(rr,fr,t);
  out+=tileStroke(a,b,.55,"#e4e3dc");
 }
 out+=line(rl,rr,outline,2.4);
 out+=line(fl,fr,outline,2.1);
 // Hip edges are outlined; no fabricated dragon figurines or sized tile details.
 out+=line(rl,fl,outline,1.25)+line(rr,fr,outline,1.25);
 return out;
}
function podiumEave(x0,x1,y0,y1,z){
 let a=block(x0,y0,z,x1-x0,y1-y0,5,"#9b8470","#665543");
 for(let x=x0+12;x<x1-3;x+=19){
  a+=beamY(x,y0+4,z-5,y1-y0-8,2);
 }
 return a;
}

function podok(mode){
 const front=96;let s=rockface(-65,397,492),marks="";
 // Floor, one-bay timber hall, one documented external support post.
 // The multiple roof silhouettes are documented; layer heights and tile spacing aren't.
 s+=block(42,-13,295,300,109,13);
 if(mode!=="contact"){
  for(const x of [49,334])for(const y of [-8,88])s+=post(x,y,308,399,9);
  for(const y of [-8,88])s+=beamX(48,y,400,287,9);
  for(const x of [48,334])s+=beamY(x,-9,400,103,9);
  // Paljak / matbae / ujin-gak roof sequence is documented for the
  // cave-front elevation; geometry here depicts TYPES only, not a survey.
  if(mode==="assembly"){
   s+=podiumEave(26,355,-25,118,406);
   s+=tiledRoof({x0:19,x1:365,y0:-29,y1:124,eave:415,rise:29,hip:34,tone:"#a7aea9",tiles:16});
   // A narrower upper gable roof and a small hipped uppermost cap make
   // the documented layered silhouette legible; exact heights unknown.
   s+=tiledRoof({x0:76,x1:310,y0:-22,y1:108,eave:453,rise:22,hip:0,tone:"#b9bcb3",tiles:12});
   s+=tiledRoof({x0:147,x1:255,y0:-17,y1:94,eave:483,rise:18,hip:39,tone:"#acb4ae",tiles:7});
  }
 }
 for(const x of [73,135,196,257,322])s+=beamY(x,-10,294,111,5);
 s+=post(193,front,16,296,14,"#967857");
 for(const z of [45,94,143,192,241])s+=line([185,front,z],[201,front,z],wood,1.7);
 // Only a symbolic iron restraint; no invented bolt size or historical geometry.
 marks+=line([15,-100,458],[315,90,360],ink,2.5,'stroke-dasharray="7 5"');
 marks+=line([193,front,290],[193,front,100],blue,2,'stroke-dasharray="5 6"');
 return {s,marks,notes:[
 [[150,-100,476],"01  NATURAL ROCK","Rear of a small cave-side hall"],
 [[185,25,307],"02  FLOOR FRAME","1 × 1-bay timber structure"],
 [[193,96,128],"03  EXTERNAL POST","7.3 m / copper-clad timber"],
 [[200,0,421],"04  IRON RESTRAINT","Historical chain; anchor unknown"]],
 facts:["HALL  /  3.35 × 0.85 m","ONE EXTERNAL PROP  /  7.3 m","CHAIN / COLUMN BASE  /  UNMEASURED"]};
}
function xuankong(mode){
 let s=rockface(-73,602,530),marks="";
 // Two independent symbolic structural units. Not as-built locations,
 // number of cantilever beams or overall temple plan geometry.
 const bays=[{x:51,z:289},{x:341,z:370}];
 for(const a of bays){
  // The substrate back section is a symbolic rock socket; do not infer
  // buried length from schematic blue dotted lines.
  for(const x of [a.x+20,a.x+147]){
   marks+=line([x,-100,a.z],[x,4,a.z],blue,2.5,'stroke-dasharray="5 5"');
   s+=beamY(x,-7,a.z,122,10);
  }
  s+=block(a.x+4,5,a.z,a.x+160-(a.x+4),107,10);
  if(mode!=="contact"){
   for(const x of [a.x+19,a.x+147])for(const y of [15,105])s+=post(x,y,a.z+10,a.z+104,9);
   for(const y of [15,105])s+=beamX(a.x+15,y,a.z+103,138,9);
   for(const x of [a.x+19,a.x+147])s+=beamY(x,15,a.z+103,92,8);
   if(mode==="assembly"){
    // Photo-based Chinese-tile silhouette: low hipped roof, upturned
    // ends, overlapping tile rows. The two bays remain representative.
    s+=podiumEave(a.x-9,a.x+175,0,118,a.z+109);
    s+=tiledRoof({x0:a.x-17,x1:a.x+181,y0:-12,y1:123,eave:a.z+119,rise:38,hip:29,corner:8,tone:"#c8ad78",outline:"#5b7770",tiles:11});
   }
  }
 }
 if(mode!=="contact"){
  s+=block(214,18,305,147,69,10);
  // Documented open galleries use timber guardrails; frequency is schematic.
  for(const x of [223,260,298,336])s+=post(x,83,315,342,3);
  s+=beamX(223,83,341,114,3);
 }
 // Supplementary props shown dashed: observed category, not placement/height.
 for(const [x,low,high] of [[215,135,289],[508,205,370]]){
  s+=post(x,107,low,high,8,"#8e7659");marks+=line([x,107,high-8],[x,107,high-69],blue,1.8,'stroke-dasharray="5 6"');
 }
 return {s,marks,notes:[
 [[105,-100,340],"01  CLIFF ROCK","Main rear bearing condition"],
 [[197,25,292],"02  ROCK SOCKETS","Timber crossbeams inserted"],
 [[308,70,321],"03  TIMBER FLOORS","Framed pavilions and galleries"],
 [[506,107,291],"04  VERTICAL PROPS","Supplementary; exact sites unknown"]],
 facts:["TWO UNMEASURED REPRESENTATIVE UNITS","ACTUAL BUILDING PLACEMENT NOT RECREATED","SOCKET DEPTH & POST LOCATIONS UNKNOWN"]};
}
export const hasAxon=id=>id==="podokam"||id==="hanging-temple";
export function axonPlate(id,mode="assembly",mini=false){
 if(!hasAxon(id))return "";
 const isPodok=id==="podokam",o=isPodok?podok(mode):xuankong(mode);
 let content=o.s+o.marks;
 if(mini)return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="50 80 840 635" role="img" aria-label="3D axonometric structural principle"><rect width="1280" height="800" fill="#fff"/>'+definitions+content+'</svg>';
 let svg='<rect width="1280" height="800" fill="#fff"/>'+definitions;
 svg+='<path d="M30 45H1250M30 740H1250" stroke="'+ink+'" stroke-width="1"/>';
 svg+=writing(33,29,"CLIFF CONSTRUCTION ATLAS  /  MATERIAL AND STRUCTURE",11,slate);
 svg+=writing(33,92,isPodok?"PODOK HERMITAGE / 보덕암":"XUANKONG SI / 悬空寺",27,ink,500);
 svg+=writing(34,117,isPodok?"SINGLE PROP / ROCK + TIE":"ROCK-SOCKETED TIMBER / GALLERIES",11,slate);
 svg+=writing(34,144,mode==="contact"?"02 / SUPPORT INTERFACE":"01 / STRUCTURAL AXONOMETRIC",11,blue,600);
 svg+=content;
 svg+='<path d="M944 168V694" stroke="#ddd" stroke-width="1"/>';
 const points=o.notes;
 points.forEach((a,i)=>{
  const y=198+i*111;
  // In this axon the leader target is a known *category* of joint.
  svg+=focus(a[0],969,y,a[1],a[2]);
 });
 svg+=writing(965,625,"ROOF / RECORDED TYPE, SCHEMATIC SHAPE",9.5,slate);
 svg+=writing(965,645,"EVIDENCE / DOCUMENTED FACTS",10,blue,600);
 o.facts.forEach((v,i)=>svg+=writing(965,670+i*18,v,9.7,slate));
 svg+=writing(35,763,"ROOF TILE LAYOUT SCHEMATIC · NO VERIFIED GEOMETRY OR MEMBER SPACING",11,blue,600);
 svg+=writing(1250,763,"NOT TO SCALE",11,slate);
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 790" role="img" aria-label="Source-constrained '+(isPodok?'Podok':'Xuankong')+' structural axonometric">'+svg+'</svg>';
}
export function axonThumb(id){return axonPlate(id,"assembly",true)}
