import fs from 'node:fs/promises';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const [manifest,walking,config]=await Promise.all(['assets/environment/manifest.json','assets/context/walking.json','atlas.json'].map(read));
const code=await fs.readFile('site-access.js','utf8');
const {loadSiteNetwork}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const b=manifest.wgs84_bounds,m=manifest.model_bounds,toLocal=(lon,lat)=>[m[0]+(lon-b[0])/(b[2]-b[0])*(m[2]-m[0]),m[1]+(lat-b[1])/(b[3]-b[1])*(m[3]-m[1])];
const mapFallback=async bbox=>{
 const {execFileSync}=await import('node:child_process');
 const py="import json,sys,urllib.request,xml.etree.ElementTree as E\nu='https://api.openstreetmap.org/api/0.6/map?bbox='+sys.argv[1]\nreq=urllib.request.Request(u,headers={'User-Agent':'ENCI-site-analysis academic map preparation (https://github.com/sogoose/ENCI-site-analysis)','Accept':'application/xml'})\nwith urllib.request.urlopen(req,timeout=35) as r: root=E.fromstring(r.read())\nnodes={n.attrib['id']:{'lat':float(n.attrib['lat']),'lon':float(n.attrib['lon'])} for n in root.findall('node')}\nways=[]\nfor w in root.findall('way'):\n tags={t.attrib['k']:t.attrib['v'] for t in w.findall('tag')}\n if 'highway' in tags: ways.append({'type':'way','id':int(w.attrib['id']),'tags':tags,'geometry':[nodes.get(n.attrib['ref']) for n in w.findall('nd')]})\nprint(json.dumps({'elements':ways}))";
 return JSON.parse(execFileSync('python',['-c',py,bbox.join(',')],{encoding:'utf8',maxBuffer:30*1024*1024,timeout:45000}));
};
const result=await loadSiteNetwork(manifest,walking.boundary.paths[0],{...config.accessNetwork,mapFallback},toLocal);
if(!result.paths?.length)throw Error('No network data');
await fs.writeFile('assets/context/site-access.json',JSON.stringify(result));
console.log('Stored network:',result.counts, 'bytes:',JSON.stringify(result).length);
