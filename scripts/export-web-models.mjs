import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1440,height:900}});page.on('pageerror',e=>console.error(e.message));page.on('console',m=>{if(m.type()==='error')console.error(m.text())});
 await page.route('https://cdn.jsdelivr.net/npm/**',async route=>{const url=route.request().url(),p=url.replace('https://cdn.jsdelivr.net/npm/','').replace(/^three@0\.170\.0\//,'three/').replace(/^rhino3dm@8\.9\.0\//,'rhino3dm/');if(!/^(three|rhino3dm)\//.test(p)||p.includes('..'))return route.continue();try{const type=p.endsWith('.wasm')?'application/wasm':p.endsWith('.js')?'application/javascript':'application/octet-stream';await route.fulfill({path:'node_modules/'+p,contentType:type,headers:{'access-control-allow-origin':'*'}})}catch{await route.continue()}});
 await page.goto('http://127.0.0.1:8000/?prepare=1',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>typeof window.enciPrepare==='function',{},{timeout:240000});
 await fs.mkdir('build-cache',{recursive:true});const downloads=[];
 page.on('download',d=>{downloads.push(d.saveAs('build-cache/'+d.suggestedFilename()))});
 await page.evaluate(()=>window.enciPrepare());
 await page.waitForFunction(()=>true);
 for(let i=0;i<100&&downloads.length<2;i++)await new Promise(r=>setTimeout(r,200));
 if(downloads.length!==2)throw Error('Expected two GLB downloads, got '+downloads.length);
 await Promise.all(downloads);
 for(const name of ['present-source.glb','buildings-source.glb']){const b=await fs.readFile('build-cache/'+name);if(b.subarray(0,4).toString()!=='glTF'||b.length<1000)throw Error('Invalid GLB: '+name);console.log(name,b.length)}
}finally{await browser.close()}
