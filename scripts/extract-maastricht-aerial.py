"""Crop an authorized historical WMS GetMap image to the ENCI model rectangle.
Usage: python scripts/extract-maastricht-aerial.py --year 1981 --url "PUBLIC_GETMAP_URL"
Requires: requests, Pillow. Local download only; confirm publication rights separately.
"""
import argparse
import io
import json
import math
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl
import requests
from PIL import Image

ORIGIN = (176269.00991889625, 315430.72517179325)
LOCAL = (-1202.08142, -2178.89478, 961.90356, 840.35016)
BOUNDS = (ORIGIN[0] + LOCAL[0], ORIGIN[1] + LOCAL[1],
          ORIGIN[0] + LOCAL[2], ORIGIN[1] + LOCAL[3])

def request_params(url, resolution):
    u = urlsplit(url)
    if u.scheme != "https" or not u.hostname:
        raise ValueError("Provide the public HTTPS map request URL.")
    params = dict(parse_qsl(u.query, keep_blank_values=True))
    keys = {k.lower(): k for k in params}
    if any(k in keys for k in ("token", "access_token", "apikey", "api_key", "key", "signature", "sig")):
        raise ValueError("Do not pass private or credential-bearing URLs.")
    if "layers" not in keys or not params[keys["layers"]]:
        raise ValueError("This is not a WMS GetMap URL (LAYERS missing). If the viewer uses tiles, retain the public service URL for separate handling.")
    version = params.get(keys.get("version", ""), "1.3.0")
    if version not in ("1.1.1", "1.3.0"):
        raise ValueError("Supported WMS versions: 1.1.1 and 1.3.0.")
    width = math.ceil((BOUNDS[2]-BOUNDS[0])/resolution)
    height = math.ceil((BOUNDS[3]-BOUNDS[1])/resolution)
    if max(width,height) > 4096:
        raise ValueError("Use a coarser resolution (maximum 4096 pixels per side).")
    drop = {"service","request","version","bbox","srs","crs","width","height","format","transparent","exceptions","bgcolor"}
    p = {k:v for k,v in params.items() if k.lower() not in drop}
    p.update(SERVICE="WMS", REQUEST="GetMap", VERSION=version,
             BBOX=",".join(f"{v:.6f}" for v in BOUNDS),
             WIDTH=width, HEIGHT=height, FORMAT="image/png", TRANSPARENT="TRUE")
    p["CRS" if version == "1.3.0" else "SRS"] = "EPSG:28992"
    if "styles" not in keys:
        p["STYLES"] = ""
    return urlunsplit((u.scheme,u.netloc,u.path,"","")),p,width,height

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--year",type=int,choices=[1981,1989],required=True)
    ap.add_argument("--url",required=True,help="Public WMS GetMap request for the historical aerial layer")
    ap.add_argument("--resolution",type=float,default=2.0,help="Output metre/pixel; default 2")
    ap.add_argument("--out",type=Path,default=Path("maastricht-aerial-local"))
    args=ap.parse_args()
    if not math.isfinite(args.resolution) or args.resolution<=0:
        ap.error("Resolution must be positive.")
    base,p,w,h=request_params(args.url,args.resolution)
    response=requests.get(base,params=p,timeout=90)
    response.raise_for_status()
    if not response.headers.get("Content-Type","").lower().startswith("image/"):
        raise RuntimeError("WMS did not return an image: "+response.text[:600])
    im=Image.open(io.BytesIO(response.content)).convert("RGBA")
    if im.size!=(w,h):
        raise RuntimeError(f"Unexpected size {im.size}; requested {(w,h)}")
    coverage=im.getchannel("A").histogram()
    visible=1-coverage[0]/(w*h)
    if visible==0 or all(lo==hi for lo,hi in im.getextrema()[:3]):
        raise RuntimeError("Empty or uniform image; verify layer and municipal coverage.")
    args.out.mkdir(parents=True,exist_ok=True)
    path=args.out/f"maastricht-{args.year}.png"
    im.save(path)
    dx=(BOUNDS[2]-BOUNDS[0])/w
    dy=(BOUNDS[3]-BOUNDS[1])/h
    world=(dx,0,0,-dy,BOUNDS[0]+dx/2,BOUNDS[3]-dy/2)
    path.with_suffix(".pgw").write_text("\n".join(f"{v:.12f}" for v in world)+"\n")
    meta={"timelineYear":1980 if args.year==1981 else 1990,
          "captureYear":args.year,"source":"Gemeente Maastricht, Historische Luchtfoto's",
          "request":response.url,"crs":"EPSG:28992","boundsRD":BOUNDS,"boundsLocal":LOCAL,
          "width":w,"height":h,"pixelSize":[dx,dy],"nonTransparentFraction":visible,
          "status":"local research extract; verify imagery, coverage and reuse rights before publishing"}
    path.with_suffix(".json").write_text(json.dumps(meta,indent=2)+"\n",encoding="utf-8")
    print(path,im.size,"nontransparent fraction",round(visible,3))
    print("RD bounds:",BOUNDS)
    print("Check actual image coverage; transparent fraction alone does not establish coverage.")
if __name__=="__main__":
    main()
