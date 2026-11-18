"""Prepare a static, site-wide OSM mobility snapshot, not a timetable."""
import json, math, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from collections import Counter
root=Path(".")
m=json.loads((root/"assets/environment/manifest.json").read_text())
lon0,lat0,lon1,lat1=m["wgs84_bounds"]
x0,y0,x1,y1=m["model_bounds"]
bbox=[lon0,lat0,lon1,lat1]
def xy(lon,lat):
    return [round(x0+(lon-lon0)/(lon1-lon0)*(x1-x0),1),round(y0+(lat-lat0)/(lat1-lat0)*(y1-y0),1)]
def within(p):return x0<=p[0]<=x1 and y0<=p[1]<=y1
def tags(e):return {t.attrib["k"]:t.attrib["v"] for t in e.findall("tag")}
def kind(t):
    if t.get("highway")=="bus_stop" or (t.get("public_transport") in ("platform","stop_position","station") and t.get("bus")=="yes"):return "bus"
    if t.get("amenity")=="bicycle_parking":return "bikeParking"
    if t.get("amenity")=="bicycle_rental":return "bikeRental"
def req(url):
    r=urllib.request.Request(url,headers={"User-Agent":"ENCI academic atlas (https://github.com/sogoose/ENCI-site-analysis)","Accept":"application/xml"})
    with urllib.request.urlopen(r,timeout=60) as f:return ET.fromstring(f.read())
# Same small-area OSM editing API used by the successful access snapshot fallback.
# A bounded one-off extraction; no use of API from visitors' browsers.
doc=req("https://api.openstreetmap.org/api/0.6/map?bbox="+",".join(map(str,bbox)))
nodes={e.attrib["id"]:(xy(float(e.attrib["lon"]),float(e.attrib["lat"])),tags(e)) for e in doc.findall("node")}
ways={e.attrib["id"]:([nodes[n.attrib["ref"]][0] if n.attrib["ref"] in nodes else None for n in e.findall("nd")],tags(e)) for e in doc.findall("way")}
points=[]; paths=[]
def addpoint(id,t,p):
    k=kind(t)
    if k and within(p):points.append({"id":id,"type":k,"xy":p,"name":t.get("name",""),"capacity":t.get("capacity","")})
for id,(p,t) in nodes.items():addpoint("node/"+id,t,p)
for id,(ps,t) in ways.items():
    valid=[p for p in ps if p]
    if valid:addpoint("way/"+id,t,[sum(p[0] for p in valid)/len(valid),sum(p[1] for p in valid)/len(valid)])
def segments(ps):
    run=[]
    for p in ps:
        if p is None:
            if len(run)>1:yield run
            run=[]
        else:run.append(p)
    if len(run)>1:yield run
for id,(ps,t) in ways.items():
    if t.get("highway")=="cycleway" or (t.get("highway") in ("path","footway","track") and t.get("bicycle") in ("designated","yes")) or any(k.startswith("cycleway") and v in ("lane","track","shared_lane","opposite_lane","opposite_track") for k,v in t.items()):
        for s in segments(ps):paths.append({"id":"way/"+id,"type":"cycle","points":s})
# Relations from the bounded map response can be incomplete. Only plot actual returned member way geometry.
seen=set()
for r in doc.findall("relation"):
    t=tags(r)
    if t.get("route")!="bus":continue
    for mem in r.findall("member"):
        id=mem.attrib.get("ref")
        if mem.attrib.get("type")!="way" or id not in ways or id in seen:continue
        ps,wt=ways[id]
        if not wt.get("highway"):continue
        seen.add(id)
        for s in segments(ps):paths.append({"id":"way/"+id,"type":"busRoute","points":s})
counts=dict(Counter(v["type"] for v in points+paths))
if not points and not paths:raise RuntimeError("No actual mobility data returned")
result={"schema":1,"date":datetime.now(timezone.utc).isoformat(),"source":"OpenStreetMap contributors / ODbL","counts":counts,"points":points,"paths":paths,"note":"Mapped facilities and partial route member geometry. No timetable, frequency, accessibility or current operation guarantee."}
(root/"assets/context/mobility.json").write_text(json.dumps(result,separators=(",",":"),ensure_ascii=False),encoding="utf-8")
print(counts)
