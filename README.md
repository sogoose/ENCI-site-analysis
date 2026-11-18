# ENCI / Site analysis

Full-viewport Three.js atlas. All controls sit over the model; no dashboard or persistent sidebar. Static GitHub Pages site, no server or database.

## Enable Pages
Settings → Pages → Build and deployment → Source: Deploy from a branch → main / (root) → Save.
Then visit https://sogoose.github.io/ENCI-site-analysis/ . If Pages is not enabled, the URL will not work yet.

## Upload models
Keep the original 250–300 MB Rhino files offline. Export a web copy via Rhino 8 ReduceMesh and Export Selected → GLB. Use metres, preserve the local origin and absolute NAP height, and enable Map Rhino Z to glTF Y, materials and texture coordinates. Rhino XYZ metres → web (X,Z,-Y). Do NOT independently center models. Target 5–20 MB for overview. Detail is optional and only loaded when requested. Try the local preview button (↥) before uploading: it keeps bytes on your device.

Upload the contents of the earlier starter archive's assets folder into this repository, or upload replacement GLBs directly. The included coarse heightfield is a 31×43 grid sampled from the seven earlier historical reconstructions (approximately 72 m grid spacing, heights rounded to metres); 1975 repeats 1970 because the maps are identical. The preview is replaced by the full GLB automatically if present. No current model is bundled. The site initially loads current terrain if present, otherwise 2010.

| Asset | Repository path |
| --- | --- |
| Current terrain | assets/terrain/present.glb |
| Current higher detail, whole site | assets/terrain/present-detail.glb |
| Historical terrain | assets/terrain/1950.glb, 1960.glb, 1970.glb, 1980.glb, 1990.glb, 2000.glb, 2010.glb |
| Buildings | assets/context/buildings.glb |
| Roads | assets/context/roads.json |
| Water | assets/context/water.json / water-2010.json |
| Environment | assets/environment/*.png (names in atlas.json) |
| Section profiles | assets/sections/profiles.json / present.json |
| View photos | assets/views/01.jpg … 04.jpg |

Context lines JSON: {"lines":[[[x,y,z],[x,y,z],...]]} in local Rhino metres. Environment image must align to local bounds [-1202.08142,-2178.89478,961.90356,840.35016] or supply bounds on the layer in atlas.json. Present profiles: {"A":[[distance_m,elevation_NAP],...],"B":[...],"C":[...]}; historical profiles use section IDs then year keys. Section alignments and camera presets can be edited in atlas.json. The view photos are optional; camera presets work without photos. Stack mode intentionally uses coarse previews to keep memory use low. Environment rasters load on selection; context assets load when checked. A current detail model substitutes for the overview, not an automatic LOD tile system.

Files larger than 25 MiB need Git command-line upload (up to 100 MiB per file) or separate HTTPS object storage with suitable CORS. If externally hosted, replace atlas.json URLs. Do not upload confidential files to a public repository. Only redistribute imagery with permission and attribution; retain actual GIS sources and legends. Historical surfaces are approximate map-derived reconstructions, not surveyed DEMs. Environmental rasters are not historical observations nor verified on-site measurements. Current terrain and imagery dates must be confirmed on upload.

For local testing: python -m http.server 8000 then http://localhost:8000 . Requires internet access for the pinned Three.js CDN modules, a modern browser with WebGL2 and DecompressionStream.
