/* Independently drafted interpretive architectural plates.
 * NOT measured drawings. All dimensions in notes are textually sourced.
 * The contact position, post spacing and joinery geometry are intentionally schematic.
 * Original sources: UTokyo drawings 00562/00567/00568; Chiba repair / Keiyo report;
 * AKS Encyclopedia Hyeonam E0070854.
 */
const ink="#202426", timber="#795d43", timberLight="#b49a77", blue="#0033ff", grey="#707b80", gold="#b17d37";
const line=(x1,y1,x2,y2,c=ink,w=1.6,other="")=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+w+'" '+other+'/>';
const path=(d,c=ink,w=1.5,other="")=>'<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round" '+other+'/>';
const rect=(x,y,w,h,fill="none",stroke="none",sw=1,other="")=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'" '+other+'/>';
const poly=(p,fill="none",stroke=ink,sw=1.4)=>'<polygon points="'+p.map(x=>x.join(",")).join(" ")+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
const text=(x,y,s,size=12,color=ink,other="")=>'<text x="'+x+'" y="'+y+'" fill="'+color+'" font-family="Inter,Arial,sans-serif" font-size="'+size+'" '+other+'>'+s+'</text>';
const dot=(x,y,r=4,c=blue)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+c+'" stroke="#fff" stroke-width="1"/>';
const tag=(x,y,index,title,description)=>text(x,y,index+"  /  "+title,14,ink,'font-weight="600"')+text(x,y+22,description,11,grey);
const num=(x,y,n)=>'<circle cx="'+x+'" cy="'+y+'" r="13" fill="#fff" stroke="'+blue+'" stroke-width="1.5"/>'+text(x,y+4,n,12,blue,'text-anchor="middle" font-weight="600"');
const arrow=(x,y,angle=0,size=10,c=blue)=>'<g transform="translate('+x+' '+y+') rotate('+angle+')">'+poly([[0,0],[-size*.55,-size],[size*.55,-size]],c,c,.4)+'</g>';
const dimH=(a,b,y,name)=>line(a,y,b,y,grey,1.1,'stroke-dasharray="3 4"')+line(a,y-9,a,y+9,grey,1)+line(b,y-9,b,y+9,grey,1)+text((a+b)/2,y-11,name,11,grey,'text-anchor="middle"');
const materialKey=(x,y,c,s)=>rect(x,y-10,14,14,c,"none")+text(x+23,y+1,s,11,grey);
const rockPattern='<defs><pattern id="rock-hatch" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(-42)"><rect width="13" height="13" fill="#e9e7e1"/><path d="M0 0V13" stroke="#c9c9c3" stroke-width=".7"/></pattern><pattern id="grain" width="22" height="19" patternUnits="userSpaceOnUse"><path d="M4 0V19M10 0V19M20 0V19" stroke="#997954" stroke-width=".8" opacity=".65"/></pattern><marker id="flow" markerWidth="7" markerHeight="7" refX="3" refY="5" orient="auto" markerUnits="strokeWidth"><path d="M0 0L6 0L3 6Z" fill="#0033ff"/></marker></defs>';
const heading=(caseName,subtitle,mode,number)=>'<rect width="1400" height="800" fill="#fff"/>'+
 '<g opacity=".23">'+Array.from({length:14},(_,i)=>line(50+i*100,126,50+i*100,722,"#dadada",.5)).join("")+
 Array.from({length:6},(_,i)=>line(44,172+i*105,1350,172+i*105,"#dadada",.5)).join("")+'</g>'+
 line(48,52,1350,52,ink,1.7)+
 text(49,34,"CLIFF CONSTRUCTION ATLAS     /     CONSTRUCTION LOGIC ARCHIVE",12,ink,'letter-spacing="1.4" font-weight="500"')+
 text(50,95,caseName,26,ink,'font-weight="500" letter-spacing="-.7"')+
 text(50,116,subtitle,11,grey)+
 text(1347,95,number+"   /   "+mode,11,blue,'text-anchor="end" font-weight="600"')+
 line(982,140,982,717,"#d1d1d1",1)+line(48,722,1350,722,ink,1.1);
const footer=(source,kind)=>text(50,750,"ANALYTICAL RE-DRAWING   ·   NOT TO SCALE   ·   NOT AN AS-BUILT DETAIL",12,blue,'font-weight="600"')+
 text(50,774,source,10,grey)+text(1350,752,kind,11,grey,'text-anchor="end"');
const timberPost=(x,top,rockY,width=10,lean=0)=>{
 const a=x+lean,bot=rockY-6;
 let s=poly([[x-width/2,top],[x+width/2,top],[a+width/2,bot],[a-width/2,bot]],timber,"#4d3a2d",.9);
 s+=line(x,top+12,a,bot-3,"#d7c1a5",1.1);
 return s;
};
const rockFill=d=>'<path d="'+d+'" fill="url(#rock-hatch)" stroke="#7d7f79" stroke-width="2.5" stroke-linejoin="round"/>';
const anchor=(x,y,labelText)=>dot(x,y,5)+path('M'+x+' '+(y+5)+'L'+(x+13)+' '+(y+18),blue,1.1)+text(x+19,y+25,labelText,10,blue);

function kasamoriSection(){
 let s=heading("笠森寺 観音堂   /   KASAMORI KANNON","CHONAN, CHIBA   ·   1597   /   RESEARCH-BASED TRANSVERSE SECTION","A—A", "01");
 // Roof profile and timber-framed hall in the approximate silhouette of the surviving structure
 s+=rect(245,257,572,99,"#faf9f5",ink,1.3);
 s+=poly([[210,259],[529,163],[854,259],[844,274],[527,184],[219,274]],"#b9aea0",ink,2.1);
 s+=path("M222 277L527 194L843 277",timber,2);
 s+=line(280,276,280,352,timber,7)+line(398,242,398,355,timber,6)+line(525,201,525,355,timber,6)+line(656,242,656,355,timber,6)+line(782,277,782,355,timber,7);
 s+=rect(253,279,555,65,"#fff", "#7d6b5b",1.25);
 for(const x of [285,395,510,625,735,790]){
  s+=line(x,282,x,342,"#8a7665",3);
  s+=line(x+15,285,x+15,340,"#e2ddd6",1);
 }
 // Balcony floor & longitudinal carrying girders
 s+=rect(205,349,660,10,"#a38965","#544432",1.2);
 s+=line(207,345,866,345,"#41392f",2.6);
 s+=line(221,365,850,365,timber,5);
 // Foundation profile rises into the hall in middle, dips around perimeter
 const rockPath="M60 662 L60 607 L110 586 L149 565 L196 548 L231 521 L270 498 L316 475 L349 456 L385 428 L419 418 L451 397 L493 401 L521 389 L549 397 L570 414 L601 422 L640 431 L670 450 L703 455 L738 485 L766 516 L809 532 L844 564 L879 580 L913 616 L962 640 L962 663 Z";
 // Tie grid BEFORE rock fill; any concealed timber disappears under rock.
 for(const y of [396,440,484]){
  s+=line(222,y,852,y,timberLight,5,'opacity=".75"');
 }
 const contact=[
  [229,521],[316,475],[389,426],[519,391],[638,431],[738,485],[849,568]
 ];
 // historic timber posts of varying length
 for(const [x,rY] of contact)s+=timberPost(x,361,rY,11,0);
 // Nuki penetrates column axes (conceptual joinery, not surveyed)
 for(const y of [385,428,473]){
  s+=line(228,y,850,y,"#725b44",3,'stroke-dasharray="9 4" opacity=".42"');
 }
 s+=rockFill(rockPath);
 // Drawing blue rock contact marks distinct from timber
 for(const [x,y] of contact)s+=dot(x,y,4.1);
 // Roof rafter linework
 for(let i=0;i<9;i++){
  const xl=254+i*29;
  s+=line(xl,258,xl+33,201+i*-.5,"#8e8173",1.2,'opacity=".7"');
 }
 // Exterior historic access stairs on southern edge, illustrative only
 s+=path("M867 359 L938 590",timber,6)+path("M851 358L917 590",timber,4);
 for(let i=0;i<10;i++){const t=i/10;s+=line(854+66*t,365+224*t,877+66*t,365+224*t,"#74583d",3)}
 s+=path("M854 349L944 574",grey,1.5);
 // Published scale references, explicit not measured from illustration
 s+=dimH(245,817,144,"PUBLISHED BUILDING WIDTH  ≈ 13.3 m  /  NOT SCALED HERE");
 s+=num(229,511,"1")+num(316,465,"2")+num(638,421,"3")+num(861,348,"4");
 s+=path("M229 500 L163 474",blue,1.2)+path("M315 451 L262 401",blue,1.2);
 s+=text(88,455,"VARIABLE ROCK LEVEL",10,blue);
 s+=text(72,472,"POST BEARINGS",10,grey);
 s+=tag(1009,170,"01","ROCK AS PRIMARY GROUND","Isolated rock prominence rises");
 s+=text(1009,205,"directly under the timber hall.",11,grey);
 s+=line(1009,226,1320,226,"#dedede",1);
 s+=tag(1009,257,"02","NON-UNIFORM POSTS","61 in total; only a section subset");
 s+=text(1009,292,"is drawn. Max post ~9 m.",11,grey);
 s+=line(1009,316,1320,316,"#dedede",1);
 s+=tag(1009,347,"03","NUKI / TIMBER TIES","Horizontal through-members link");
 s+=text(1009,382,"the standing post network.",11,grey);
 s+=line(1009,406,1320,406,"#dedede",1);
 s+=tag(1009,437,"04","HISTORIC ROCK CONTACT","Timber once directly met rock.");
 s+=text(1009,472,"No original rock bolts evidenced.",11,grey);
 s+=line(1009,493,1320,493,"#dedede",1);
 s+=tag(1009,522,"05","LATER REPAIR ≠ ORIGINAL","1960 concrete foundations.");
 s+=text(1009,557,"2012–13 stabilization separate.",11,grey);
 s+=line(1009,578,1320,578,"#dedede",1);
 s+=text(1009,604,"SOURCE READING",10,blue,'font-weight="600"');
 s+=text(1009,625,"UTokyo 00562 / 00567, 1931",11,grey);
 s+=text(1009,641,"registered sectional sheets",11,grey);
 s+=text(1009,658,"Chiba / 1960 repair accounts",11,grey);
 s+=materialKey(75,687,"#795d43","TIMBER")+
     materialKey(208,687,"#e9e7e1","ROCK")+
     materialKey(336,687,blue,"CONTACT / INTERPRETED")+
     text(630,687,"ROCK PROFILE & SUPPORT POSITIONS ARE SCHEMATIC",10,"#9b9b9b");
 s+=footer("Basis: UTokyo sections 00562 & 00567; Keiyo/Chiba preservation records.","RECONSTRUCTED RELATIONSHIP / NOT A SURVEY");
 return s;
}
function hyeonamSection(){
 let s=heading("妙陰寺 懸庵   /   MYOEUMSA HYEONAM","JANGSU MT., HWANGHAENAM-DO   ·   JOSEON SURVIVING HALL  /  CONCEPTUAL STRUCTURAL ELEVATION","A—A","02");
 // Six front bays; bay lengths not individually measured.
 const xs=[192,301,410,519,628,737,846];
 // Ground steps and fractured protruding rock
 const d="M55 660 L55 597 L95 560 L140 545 L184 514 L211 521 L243 483 L291 475 L320 493 L357 462 L399 470 L435 446 L476 461 L526 432 L552 460 L586 468 L626 455 L674 479 L712 464 L752 484 L781 519 L824 544 L858 553 L915 589 L962 621 L962 663 Z";
 // Eaves / tiled roof, make a gabled-hip roof of two levels (interpretive, not measured)
 s+=poly([[149,295],[221,283],[519,203],[822,283],[897,300],[858,314],[519,232],[191,314]],"#d3d1ca","#363737",2.1);
 for(let i=0;i<14;i++){
  const x=212+i*45;
  s+=path("M"+x+" "+(284-Math.max(0,(x-228))*0.06)+"L"+(x+20)+" "+(282-Math.max(0,(x-228))*0.04),"#8b8a85",.8);
 }
 s+=rect(185,317,674,82,"#faf9f6",ink,1.4);
 s+=rect(181,397,680,11,"#95755b","#524535",1.4);
 // a framing sequence with six bays and generic door divisions
 for(let i=0;i<6;i++){
  const x=196+i*109;
  s+=rect(x+7,326,92,68,"#fff","#9a7d63",1.3);
  s+=line(x+38,326,x+38,394,"#aa9684",1.1)+line(x+68,326,x+68,394,"#aa9684",1.1);
  s+=line(x+7,351,x+99,351,"#c5b7a7",1);
 }
 // Brackets below eaves, incipient Ik-gong typology but do not fabricate exact joinery
 for(const x of xs){
  s+=poly([[x-26,315],[x+26,315],[x+23,329],[x+14,329],[x+11,338],[x-12,338],[x-16,329],[x-23,329]],"#aa8864","#756148",1);
  s+=rect(x-16,338,32,8,"#8d7558", "#705841",.6);
 }
 const pads=[514,482,472,441,462,477,543];
 for(let i=0;i<xs.length;i++){
  const x=xs[i],lean=x<519?5:x>519?-5:0,y=pads[i];
  s+=timberPost(x+lean,404,y-11,13,-lean);
  // Local stone pads follow the naturally occurring rock and are not surveyed.
  s+=poly([[x-20,y-13],[x+19,y-13],[x+24,y-3],[x-26,y-3]],"#bbb7af","#666663",1);
  s+=dot(x,y-2,4.4);
 }
 s+=rockFill(d);
 for(let i=0;i<xs.length;i++)s+=dot(xs[i],pads[i],4.2);
 // Axes and structural bay information
 s+=dimH(191,848,164,"DOCUMENTED FRONT: 6 BAYS / 11.2 m TOTAL  ·  INDIVIDUAL BAYS UNMEASURED");
 for(let i=0;i<xs.length;i++){
  s+=text(xs[i],188,String(i+1),11,grey,'text-anchor="middle"');
  s+=line(xs[i],195,xs[i],305,"#a2abb0",.7,'stroke-dasharray="3 5"');
 }
 s+=num(185,516,"1")+num(519,433,"2")+num(854,550,"3");
 s+=text(66,499,"STONES ON NATURAL",11,blue)+text(66,514,"ROCK OUTCROPS",11,blue);
 s+=path("M160 519 L183 517",blue,1.3);
 s+=text(676,564,"LOWER ROCK EDGE",11,grey);
 s+=tag(1008,170,"01","HALL CONFIGURATION","6 × 3 bays; 11.2 × 6.35 m");
 s+=text(1008,205,"(published overall dimensions).",11,grey);
 s+=line(1009,226,1320,226,"#dedede",1);
 s+=tag(1008,257,"02","ROCK OUTCROPS","Natural raised rock is the base,");
 s+=text(1008,292,"not a leveled concrete plinth.",11,grey);
 s+=line(1009,316,1320,316,"#dedede",1);
 s+=tag(1008,347,"03","STONE FOUNDATION PADS","Each timber post begins on a");
 s+=text(1008,382,"stone pad atop local bedrock.",11,grey);
 s+=line(1009,406,1320,406,"#dedede",1);
 s+=tag(1008,437,"04","INWARD-LEANING POSTS","A small inward inclination is");
 s+=text(1008,472,"described; angle NOT measured.",11,grey);
 s+=line(1009,493,1320,493,"#dedede",1);
 s+=tag(1008,522,"05","SOURCE LIMITATION","2007 measured report catalogued;");
 s+=text(1008,557,"its detailed sheets unavailable.",11,grey);
 s+=line(1009,580,1320,580,"#dedede",1);
 s+=text(1008,610,"DO NOT INFER:",10,blue,'font-weight="600"');
 s+=text(1008,633,"rock anchor depth / bay module /",11,grey);
 s+=text(1008,650,"post length / precise roof frame",11,grey);
 s+=materialKey(72,691,"#795d43","TIMBER")+
 materialKey(204,691,"#bbb7af","STONE PAD")+
 materialKey(372,691,blue,"BEARING / SCHEMATIC")+
 text(641,691,"OUTCROP PROFILE AND PAD SPACING NOT SURVEYED",10,"#999");
 s+=footer("Basis: AKS E0070854 & 2007 NRICH government survey catalogue.","INTERPRETATIVE / NO MEASURED SHEET AVAILABLE");
 return s;
}
function kasamoriContact(){
 let s=heading("KASAMORI   /   ROCK–COLUMN INTERFACE","TWO PROVEN CONDITIONS AT DIFFERENT TIMES   ·   DIFFERENT FOOTING DETAILS / SIZES NOT VERIFIED","B—B","01");
 // two explanatory spatial zones
 s+=line(700,145,700,670,"#bcbcbc",1);
 s+=text(80,181,"A / ORIGINAL 1597",19,ink,'font-weight="500"');
 s+=text(746,181,"B / AFTER CONSERVATION WORK",19,ink,'font-weight="500"');
 s+=text(80,208,"TIMBER FOOT RESTED DIRECTLY ON ROCK",12,blue);
 s+=text(746,208,"1960 CONCRETE FOUNDATION + LATER RESTRAINT",12,blue);
 const leftRock="M70 554 L115 540 L160 536 L210 532 L257 539 L302 531 L350 545 L398 554 L458 548 L517 560 L610 567 L652 590 V654 H70 Z";
 s+=rockFill(leftRock);
 s+=poly([[217,254],[287,254],[287,528],[217,528]],timber,"#4a4038",2);
 s+=rect(228,257,48,269,"url(#grain)", "none");
 s+=line(215,360,291,360,"#5a4939",8)+line(215,382,291,382,"#5a4939",8);
 s+=dot(252,534,7);
 s+=path("M252 538 L360 469",blue,1.2);
 s+=text(364,453,"DIRECT ROCK BEARING",14,blue,'font-weight="500"');
 s+=text(364,473,"No individual stone pad in historic",11,grey);
 s+=text(364,492,"footing account.",11,grey);
 s+=path("M218 520 L192 520",blue,1);
 s+=text(99,506,"WOOD",12,timber);
 s+=text(99,522,"END GRAIN",10,grey);
 // Right: present foundations are approximate based on qualitative reports.
 const rightRock="M735 567 L785 558 L827 558 L872 562 L915 563 L952 566 L1024 548 L1074 544 L1134 553 L1230 564 L1304 576 V652 H735 Z";
 s+=rockFill(rightRock);
 s+=rect(937,271,60,228,timber,"#4a4038",1.8);
 s+=rect(949,278,35,217,"url(#grain)");
 s+=rect(898,494,146,65,"#d5d6d2","#71756f",2);
 s+=line(913,532,1029,532,"#b2b4b0",1);
 for(let i=0;i<5;i++)s+=line(898+i*33,494,914+i*33,559,"#c1c2bf",.7);
 // Restrained post foot shown as generic metal restraint, not claim precise actual shape.
 s+=path("M911 490 L911 469 L924 469 M1025 491 L1025 469 L1012 469",blue,3.2);
 s+=dot(967,555,7);
 s+=text(1035,357,"POST-SLIP",12,blue,'font-weight="600"');
 s+=text(1035,375,"RESTRAINT",12,blue,'font-weight="600"');
 s+=path("M1029 392 L1014 470",blue,1.4);
 s+=text(1035,475,"CONCRETE",12,grey);
 s+=text(1035,493,"(1960 REPAIR)",12,grey);
 s+=path("M1036 500 L1016 518",grey,1);
 // Retrofit stabilization shown separate and dashed beyond pad; not coupled to invented foot detail
 s+=path("M1153 552 L1242 641",gold,5,'stroke-dasharray="12 7"');
 s+=arrow(1242,641,135,10,gold);
 s+=text(1120,549,"LATER ROCK",11,gold);
 s+=text(1120,564,"STABILIZATION",11,gold);
 s+=text(1120,579,"SCHEMATIC AREA",10,grey);
 s+=line(70,679,1310,679,"#ddd",1);
 s+=materialKey(88,705,timber,"TIMBER")+
 materialKey(252,705,"#d5d6d2","CONCRETE AFTER REPAIR")+
 materialKey(546,705,blue,"BEARING / RESTRAINT")+
 materialKey(830,705,gold,"LATER STABILIZATION");
 s+=footer("Historic direct-to-rock: Keiyo/Chiba report. 1960 repair and 2012–13 seismic works: Japan ACA.","CONCEPTUAL JOINT STUDY / NO FIXING DIMENSIONS");
 return s;
}
function hyeonamContact(){
 let s=heading("HYEONAM   /   ROCK + STONE + TIMBER","LOCAL BEARING SYSTEM   ·   VERIFIED TYPE, UNVERIFIED INDIVIDUAL DIMENSIONS","B—B","02");
 s+=text(90,180,"COMPRESSION CHAIN",20,ink,'font-weight="500"');
 s+=text(90,206,"FRAME → TIMBER COLUMN → STONE PAD → NATURAL ROCK",12,blue);
 // Detailed lower post, slightly tapered
 s+=rect(195,265,240,14,timber,ink,1.4);
 s+=rect(225,279,180,15,"#997956","#5d4d3c",1.3);
 s+=poly([[284,294],[350,294],[340,512],[292,512]],timber,"#563f30",2);
 s+=rect(302,298,25,202,"url(#grain)","none");
 s+=poly([[264,514],[368,514],[385,547],[250,547]],"#bcb7ae","#615e58",2);
 s+=rockFill("M110 622 L110 580 L169 564 L223 548 L263 550 L288 545 L354 548 L395 565 L473 580 L530 599 L577 631 V661 H110 Z");
 s+=dot(316,548,6.2);
 s+=path("M318 556 L432 592",blue,1.3);
 s+=text(425,613,"NATURAL BEDROCK",12,blue,'font-weight="600"');
 s+=path("M350 312 L470 290",blue,1.3);
 s+=text(480,291,"Slight inward lean",12,ink);
 s+=text(480,311,"(reported, angle unknown)",11,grey);
 s+=path("M365 529 L456 477",blue,1.3);
 s+=text(468,473,"Stone foundation pad",12,ink);
 s+=text(468,493,"(shape / size unknown)",11,grey);
 for(let i=0;i<3;i++)s+=path("M"+(304+i*9)+" "+(319+i*56)+" V"+(357+i*56),blue,2,'marker-end="url(#flow)"');
 s+=line(724,167,724,656,"#dadada",1);
 s+=text(769,191,"CONFIRMED",14,blue,'font-weight="600"');
 s+=tag(769,225,"01","NATURAL ROCK OUTCROP","Site itself used as raised base.");
 s+=tag(769,317,"02","STONE PAD","Local bearing under timber post.");
 s+=tag(769,412,"03","TIMBER POST","Tapered / slightly inward-leaning.");
 s+=line(769,452,1300,452,"#d2d2d2",1);
 s+=text(769,482,"NOT DOCUMENTED",14,ink,'font-weight="600"');
 s+=text(769,512,"No verified rock bolt or post dowel.",12,grey);
 s+=text(769,536,"No individual pad area or soil bearing.",12,grey);
 s+=text(769,560,"No measured fixing or post diameter.",12,grey);
 s+=text(769,614,"Requested 2007 survey sheets remain",11,grey);
 s+=text(769,634,"uninspected at the archival viewer.",11,grey);
 s+=footer("Basis: AKS architectural text E0070854; national archival survey catalogue (2007).","TYPOLOGICAL CONNECTION / NOT DETAIL 1:5");
 return s;
}
export function hasStructuralPlate(id){return id==="kasamori"||id==="hyeonam"}
export function structuralPlate(id,mode="section"){
 const content=id==="kasamori"?(mode==="joint"?kasamoriContact():kasamoriSection()):(mode==="joint"?hyeonamContact():hyeonamSection());
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 800" role="img" aria-label="'+(id==="kasamori"?"Kasamori Kannon":"Myoeumsa Hyeonam")+' interpretive '+mode+' analytical drawing" style="width:100%;height:auto;display:block;background:#fff">'+rockPattern+content+'</svg>';
}
