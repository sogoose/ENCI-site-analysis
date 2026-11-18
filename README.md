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

## Uploaded Rhino source and environmental manifest
The atlas now reads assets/terrain/reduced_site.3dm first when no present.glb exists, and reads ENCI_Historical_Maps.3dm once, assigning meshes to years by their layer names or unique object names. Hidden historical layers are included. Actual relief meshes are preferred; a flat image plane with valid embedded UVs can instead supply texture to the coarse historical preview. Files are grouped at runtime, not physically split on GitHub; the ↓ control exports the selected terrain as a separate GLB, and Layers ↓ downloads an inspection report for loaded Rhino files. Original local XYZ is preserved and transformed to (X,Z,-Y). Missing textures must be embedded in the source Rhino file; missing UVs, Rhino-specific procedural materials or external files cannot be recovered automatically. No independent Z relocation is performed. The uploaded 3DMs have not been parsed server-side.

Environmental legend colours, units, resolution, notes and source URLs come directly from assets/environment/manifest.json. WFD statuses are reporting-body classifications, not concentrations. 2025 regional GCN files are visible but disabled pending unit/file QA; 2024 25 m ALO maps are enabled. Flood risk has no supplied legend. Transparent coverage is not a zero or a clean result. The 3DM environment file is not loaded because its rasters already exist individually. Current 3DM and historical 3DM are loaded on demand (55 MB and 41 MB); export per-year GLB for smaller future requests.
## Rhino navigation and native CAD context
Right mouse drag rotates; Shift + right drag or middle drag pans; wheel zooms toward cursor. The two arrow tools step the camera 15°. Stack loads all eight historical dates through their real GLB/Rhino source where available, with adjustable vertical spacing and labeled coarse fallbacks (*). Display offsets are illustrative; stacking does not modify the source files. Access on Present finds building meshes and road/water curves or mesh surfaces by Rhino layer/object names (including BGT wegdeel, pand, 3DBAG), with a layer selector to override detection. Road/water XY is projected onto the current terrain, ignoring the CAD drawing's display Z. If no CAD road source is found, the browser attempts PDOK BGT Wegdeel via OGC API, Netherlands only, aligned using the uploaded manifest's geographic/local bounds. The fallback is not a historical road network or a Belgian road survey. Browser requests, native geometry and exact layer names have not been verified with the binary 3DM files. Original files are unchanged.

## Site outline, walking and attribution
The study perimeter in assets/context/walking.json is an approximate trace of the supplied annotated screenshot (not ownership or cadastral data). Replace its local-XY paths with a surveyed outline to improve accuracy. Access toggles it and mapped walking paths; live OSM hiking/foot relations and path segments are fetched on request, projected using the manifest's approximate bounds mapping and clipped to the terrain. Official Natuurmonumenten route links are provided separately. Local GPX import does not republish the tracks. The full credits are at sources.html; the embedded current aerial image's source and redistribution terms remain unverified.
