// Original interpretive section sketches. Not to scale, not construction documents.
const rock=(d)=>`<path d="${d}" fill="url(#rock)" stroke="#858780" stroke-width="1.4"/>`;
const str=(d,w=2,color="#1f2527")=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const blue=(d,w=2.8)=>str(d,w,"#0033ff");
const node=(x,y)=>`<circle cx="${x}" cy="${y}" r="3" fill="#0033ff"/>`;
const label=(x,y,t)=>`<text x="${x}" y="${y}" font-size="7.7" font-weight="500" fill="#696c6e" letter-spacing=".08em">${t}</text>`;
const types={
rods:()=>[
 rock("M0 120 L65 119 100 126 140 137 184 141 235 158 320 164 380 167 V180 H0 Z"),
 `<rect x="89" y="38" width="231" height="67" fill="#fcfcfa" stroke="#202020" stroke-width="2.4"/>`,
 `<path d="M90 93H320M198 38V104M95 45H314" stroke="#3f4343" stroke-width="1.4"/>`,
 ...[116,206,287].map((x,i)=>blue(`M${x} 106 L${x} ${[130,151,167][i]}`,3)),
 ...[116,206,287].map((x,i)=>node(x,[127,147,162][i])),
 label(94,24,"TIMBER ROOM"),label(209,122,"ROCK-DRILLED RODS")
].join(""),
rockwalk:()=>[
 rock("M0 0 H124 L138 38 127 68 140 102 128 131 138 160 128 180 H0 Z"),
 `<rect x="136" y="78" width="220" height="10" fill="#e1dfd8" stroke="#232424" stroke-width="1.7"/>`,
 str("M145 78 V53 H355",1.25),str("M176 54V78 M216 54V78 M256 54V78 M296 54V78 M338 54V78",1),
 blue("M84 86 L148 86 L236 131",2.9),blue("M86 112 L150 88 L260 147",2.1),
 str("M140 88 L247 137 M140 88 L264 154",1.6),node(84,86),node(86,112),
 label(169,48,"WALKWAY"),label(148,166,"STEEL BRACKET + ANCHOR")
].join(""),
micropile:()=>[
 rock("M0 109 L68 107 107 112 140 118 170 141 185 156 213 170 H0 Z"),
 `<path d="M84 83 L185 83 198 90 351 90" stroke="#303338" fill="none" stroke-width="9" stroke-linejoin="round"/>`,
 str("M196 90 V63 H353",1.7),str("M196 66 V94 M260 66V90 M335 66V90",1.25),
 blue("M108 97 L74 165 M146 96 L167 173",3.2),
 str("M92 98 H166 V112 H92 Z",2),node(105,111),node(153,113),
 `<path d="M103 126 L81 160 M148 127 L162 163" stroke="#0033ff" stroke-width="1.4" stroke-dasharray="3 4"/>`,
 label(206,54,"CANTILEVER"),label(20,79,"ROCK ANCHORS"),label(26,174,"MICROPILES")
].join(""),
glulam:()=>[
 rock("M0 118 L60 125 119 141 170 152 211 165 380 169 V180 H0 Z"),
 `<path d="M92 74 L314 75 Q337 75 343 96" stroke="#a49376" fill="none" stroke-width="15" stroke-linecap="round"/>`,
 str("M91 66H308 Q340 66 345 93",2),str("M92 81 H310",1.6),str("M98 75V105 M135 74V128",3),
 blue("M106 94 L108 133 M147 92 L163 146",2.6),node(108,132),node(163,146),
 str("M336 66 L337 92",2),label(171,49,"GLULAM + STEEL"),label(21,165,"SLOPE SUPPORT")
].join(""),
stepped:()=>[
 rock("M0 134 L79 118 131 112 176 133 230 128 270 148 328 165 380 164 V180 H0 Z"),
 `<path d="M78 101 L155 93 190 107 255 103 307 120 353 116" fill="none" stroke="#c1b8a9" stroke-width="14" stroke-linecap="butt"/>`,
 str("M78 94 L155 86 190 100 255 96 307 113 353 109",3),
 str("M155 86 L155 121 M255 96 L255 136 M307 113 L307 157",1.8),
 blue("M148 113 L147 130 M258 120 L270 157",2.4),node(147,127),node(270,151),
 str("M78 67 L155 59 190 73 255 69 307 86 353 82",1.5),
 str("M78 67V94 M155 59V86 M190 73V100 M255 69V96 M307 86V113 M353 82V109",1.2),
 label(162,42,"CONCRETE + CORTEN")
].join(""),
shore:()=>[
 rock("M0 121 L60 108 116 116 162 128 217 147 253 166 H0 Z"),
 `<path d="M238 160 Q280 154 316 158 T380 159 M254 169 Q307 162 380 168" fill="none" stroke="#b4c2c7" stroke-width="1.2"/>`,
 `<rect x="98" y="42" width="231" height="64" fill="#fff" stroke="#222" stroke-width="2"/>`,
 str("M100 92 H330 M140 42 V106 M285 42 V106",1),
 str("M98 108 H345",5,"#656b6c"),blue("M129 107 V128 M186 107 V139",3.2),node(129,123),node(186,135),
 label(114,26,"TIMBER / STEEL CABIN"),label(240,132,"OVER WATER")
].join(""),
sockets:()=>[
 // The rock-inserted beams carry cantilevered floor framing; visible lower
 // timber posts also reach intermittent rock ledges below the pavilions.
 rock("M0 0 H112 L138 18 115 44 132 78 120 109 141 141 159 161 191 166 210 180 H0 Z"),
 rock("M215 180 L233 155 250 152 276 173 290 180 Z"),
 '<path d="M91 70 H326 M93 110 H325" stroke="#88694a" stroke-width="8.5" stroke-linecap="square"/>',
 blue("M46 69 H151 M50 109 H150",3.5),node(72,70),node(74,110),
 str("M147 44 H318 L336 69 M150 46 V111 M249 46 V111 M320 46V110",2.7),
 str("M144 42 L238 22 338 42",2.3),
 ...[164,214,264,310].map(x=>str("M"+x+" 112 V"+(x===164?160:x===214?163:x===264?158:174),x===164||x===214?3.2:2.2,"#856a4e")),
 str("M164 160 L137 125 M214 163 L178 118 M264 158 L240 116",1.9,"#856a4e"),
 blue("M165 152 V162 M213 156 V166 M264 150 V157",2.1),
 label(185,14,"TIMBER HALL"),
 label(175,127,"VERTICAL SUPPORT POSTS"),
 label(173,171,"ROCK LEDGES"),
 label(7,49,"SOCKETS")
].join(""),
vierendeel:()=>[
 rock("M0 142 L58 142 105 155 148 154 174 169 205 175 H0 Z"),
 '<path d="M65 65 H358 V118 H65 Z" fill="#e6d1b2" fill-opacity=".2" stroke="#393632" stroke-width="3"/>',
 str("M65 72 H358 M65 114 H358",3,"#7b614b"),
 ...[82,118,154,190,226,262,298,334].map(x=>str("M"+x+" 74 V114",2.2,"#8d7356")),
 str("M109 116 V158 M157 116 V164",5,"#3d4d57"),
 ...[109,157].map(x=>blue("M"+(x-12)+" 121 L"+(x+12)+" 157 M"+(x+12)+" 121 L"+(x-12)+" 157",2)),
 node(109,156),node(157,163),
 label(177,51,"TIMBER VIERENDEEL"),
 label(251,141,"12 M CANTILEVER"),
 label(13,175,"STEEL LATTICE BASES")
].join(""),
galleries:()=>[
 rock("M0 0 H119 L131 28 117 61 129 93 121 132 136 168 128 180 H0 Z"),
 ...[65,125].map(y=>'<rect x="125" y="'+y+'" width="214" height="7" fill="#d1c7b8" stroke="#242424" stroke-width="1.5"/>'),
 ...[65,125].map(y=>[173,229,285,333].map(x=>str("M"+x+" "+(y-19)+"V"+y,1)).join("")),
 ...[65,125].map(y=>blue("M60 "+(y+1)+" H145 M65 "+(y+21)+" L145 "+(y+8),3)),
 str("M137 71 L203 113 M136 132 L202 171",2.4),
 node(67,66),node(66,125),
 label(175,29,"STEEL GALLERY"),
 label(178,157,"ROCK ANCHOR / BRACKET")
].join(""),
stilts:()=>[
 rock("M0 99 H96 L120 105 133 134 145 171 180 177 H0 Z"),
 '<path d="M55 38 H321 V105 H55 Z" fill="#e6d3bc" fill-opacity=".35" stroke="#4c4038" stroke-width="2.3"/>',
 str("M45 35 L185 21 330 34",2.2),str("M55 65 H322 M115 38 V105 M193 38 V105 M265 38V105",2.0),
 str("M63 106 V111 H315",4,"#745b44"),
 ...[155,235,309].map((x,i)=>str("M"+x+" 110 V"+[173,167,157][i],3,"#85654e")),
 str("M155 148 L206 111 M235 141 L273 111",2.1,"#85654e"),
 node(156,172),node(235,165),node(307,155),
 str("M185 173 Q270 166 380 169",1.3,"#93b6c5"),
 label(184,151,"LONG TIMBER STILTS"),
 label(24,130,"ROAD / SLOPE")
].join(""),
ancientroad:()=>[
 rock("M0 0 H117 L132 34 117 72 129 118 117 158 129 180 H0 Z"),
 '<rect x="124" y="68" width="234" height="9" fill="#ab8b65" stroke="#5a4d40" stroke-width="1.4"/>',
 str("M137 67 H355 M169 43 V67 M205 43 V67 M241 43 V67 M277 43 V67 M315 43 V67",1.4,"#69563f"),
 blue("M56 72 H156 M61 118 H142",3.6),
 ...[166,228,289].map(x=>str("M139 75 L"+x+" 126",2.6,"#7e6446")),
 ...[166,228,289].map((x,i)=>str("M"+x+" 126 L"+(x+10)+" "+(i===0?144:i===1?151:162),2.1,"#7e6446")),
 node(59,72),node(61,118),
 label(157,32,"TIMBER PLANK ROAD"),
 label(170,173,"BRACES FROM ROCK SOCKETS")
].join(""),
alcove:()=>[
 rock("M0 0H380V22Q330 17 285 35T195 56Q133 74 103 95L90 137L380 137V180H0Z"),
 `<path d="M100 135H349 M129 135V94 H178V135 M185 135V85 H246V135 M256 135V96 H304V135" stroke="#927d66" stroke-width="7" fill="none"/>`,
 str("M125 90 H185 M182 80 H253 M253 91 H310",2),str("M151 94V134 M222 85V135 M281 96V135",1),
 label(24,37,"SANDSTONE ALCOVE"),label(213,163,"MASONRY ON ROCK SHELF")
].join(""),
cliffmasonry:()=>[
 rock("M0 0 H106 L127 32 111 70 132 102 137 136 180 149 209 180 H0 Z"),
 `<path d="M99 65 H252 V145 H170 L134 135 V95 H99Z" fill="#e5d8cb" stroke="#685b4f" stroke-width="2.2"/>`,
 ...[110,141,171].map(y=>str(`M136 ${y} H251`,1,"#a08d79")),
 ...[160,197,231].map(x=>`<rect x="${x}" y="79" width="15" height="19" fill="#fff" stroke="#99826e"/>`),
 blue("M116 132 L139 154 M140 131 L160 154",2.4),node(138,149),node(161,154),
 label(173,42,"CLIFF-EDGE MASONRY"),label(179,169,"ROCK LEDGE")
].join(""),
rc:()=>[
 rock("M0 149 L55 145 82 130 122 122 165 142 222 169 H0 Z"),
 `<rect x="99" y="39" width="34" height="108" fill="#d0c3af" stroke="#655b50" stroke-width="2"/>`,
 `<path d="M129 65H338V76H130 M132 99H293V110H132" fill="#dbd9d2" stroke="#242626" stroke-width="2.2"/>`,
 str("M147 78 H316 M147 112 H276",1.2),
 blue("M106 80 L155 81 M106 116 L150 115",2.6),node(107,80),node(107,116),
 `<path d="M0 163 Q40 157 70 162 T141 163" fill="none" stroke="#aac8cf" stroke-width="2"/>`,
 label(174,49,"RC CANTILEVER"),label(5,38,"SANDSTONE CORE")
].join("")
};
export function diagramFor(scheme,alt="Structural principle"){
 const art=(types[scheme]||types.rods)();
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 180" role="img" aria-label="${alt.replaceAll('"','&quot;')}">
 <defs><pattern id="rock" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)"><rect width="11" height="11" fill="#e9e8e3"/><path d="M0 0 V11" stroke="#c9cbc6" stroke-width=".9"/></pattern></defs>
 <rect width="380" height="180" fill="#fafaf9"/>
 <path d="M0 165H380" stroke="#e4e4e2" stroke-width=".8" stroke-dasharray="2 5"/>
 ${art}
 </svg>`;
}
