# Lincoln/Lancaster Development Viewer Toolkit

A browser-side toolkit for the public [Lincoln/Lancaster County Development Viewer](https://gis.lincoln.ne.gov/apps/?app=86ccdaa0697c47dea035d3ec1258b778&viewer=Developmentviewer).

It runs entirely in your own browser. Nothing is installed on the server, no GIS portal account is required, and no other user of the viewer is affected. It stores a handful of keys in your own browser's local storage.

By default it talks only to `gis.lincoln.ne.gov`. One optional feature is the exception and it is **off until you switch it on**: contours in the Site DXF export come from the USGS 3D Elevation Program, because the county publishes no elevation data at all. See [Contours and the one external call](#contours-and-the-one-external-call).

## What it does

- **Redesigned parcel popup** — zoning, land use, floodplain, applications, staff and inspector contacts in one readable card, with a Street View link.
- **Repairs the `#INVALID` fields.** The mapping platform (VertiGIS/Geocortex) has a defect that makes popup fields fail at random. The toolkit detects those failures and re-fetches the real value straight from the county's map services, marking recovered values with a dotted underline. 20 of the 24 vulnerable fields are covered.
- **Quick Bar** — one-click layer toggles, two saveable view snapshots, Declutter, and a Find Parcel search that actually returns parcels.
- **Parcel results in the app's own search box** — type an address or a parcel ID and get the parcel, which is what the Help tab has always claimed the search box does.
- **Shareable deep links** — copy a link that reopens your exact view, layers and parcel. People without the toolkit still land in the right place.
- **Site plan export to CAD.** A "Site DXF" chip exports the parcel as a DXF site plan for Home Designer, Chief Architect, AutoCAD, Civil 3D, SketchUp and Vectorworks, plus a comma-delimited XYZ elevation file for Home Designer's `File > Import > Terrain Data`. Lot boundary with grid bearings and distances, existing buildings, easements, curb lines and street centerlines, the FEMA boundary, the Building Line District setback, soils with real clipped percentages, and — if you switch it on — contours and corner spot elevations.

  Everything the county serves is Web Mercator, which is not a survey projection: at Lincoln's latitude it stretches distance by about 32%, so a lot taken straight from those coordinates is a third too big. Measured on parcel `1435300004000`: **338,050 sq ft raw against a true 195,121**. Every request here asks for NAD83 Nebraska State Plane in US survey feet instead, which returned **195,023 against the Assessor's own 195,121 — 0.05%**.
- **FEMA Zone A counted as floodplain.** Every flood test in the viewer asked only whether the FEMA zone was `AE`. The layer also carries 81 Zone A polygons — Zone A is a Special Flood Hazard Area too, the same 100-year floodplain, differing only in having no determined base flood elevation. Measured 2026-08-28: 1,506 parcels intersect Zone A, and 39 of a 40-parcel spread sample touch Zone A **only**, so roughly 1,460 parcels were being told "None mapped" while sitting in the regulatory floodplain. The toolkit now reports them, and Find Parcel adds how much of the parcel is in the floodplain, computed with the county's own public geometry service. The same assumption is present in the stock app configuration and has been flagged for the GIS team.

## Contours and the one external call

The Site DXF export can drape ground contours over a lot. The county has no elevation data to draw them from — every one of its 26 public service folders was checked, and there is no contour, DEM, lidar, terrain or survey-control layer anywhere. So contours come from the **USGS 3D Elevation Program** (`elevation.nationalmap.gov`), 1 m lidar-derived bare earth.

That is the only time this toolkit contacts anything other than `gis.lincoln.ne.gov`, so it is opt-in:

- The contour checkbox is off by default.
- The first time you tick it, the dialog explains what is sent (the lot outline — public parcel coordinates, nothing about you) and where, and you have to confirm.
- The choice is remembered in `__claude_qb_elev_optin`. Remove that key to be asked again.
- Leave contours off and the export never leaves the county server.

**Bare earth is not a survey.** It predates recent grading, fill and retaining walls and does not include structures. Fine for siting and massing; not for finished floor elevations, drainage design or floodplain compliance. That warning is written into the DXF itself, not just shown in the dialog, because the drawing is what gets emailed onward.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey) in your browser. Chrome and Edge also require **Developer mode** on at `chrome://extensions` / `edge://extensions` before a userscript manager will run scripts.
2. Click **[DV_Toolkit.user.js](DV_Toolkit.user.js)** → **Raw**. Tampermonkey will offer to install it.
3. Open the Development Viewer. The Quick Bar appears near the bottom of the map once the map finishes loading (this can take 30–45 seconds on a slow connection).

If you install while the viewer is already open, **reload the page** — userscripts only inject at page load. To check it is running, press F12 and type `window.__dvToolkit`; you should get `{version: "1.8.0", ready: true}`.

Updates install themselves from then on — this script declares an `@updateURL`, so Tampermonkey checks this repository and upgrades in place.

### If your IT blocks userscript managers

The `extension/` folder in the release package is an unpacked Chrome/Edge extension that requests **no permissions at all**, only a host match for the viewer. Note that an unpacked extension does **not** auto-update — you replace the folder by hand for each release.

## Uninstall

Remove the script from Tampermonkey, then run this in the browser console on the viewer and reload:

```js
['__claude_popup_patch','__claude_quick_layers','__claude_qb_preset1','__claude_qb_preset2',
 '__claude_qb_hidden','__claude_qb_baseline','__claude_qb_nosearch','__claude_qb_nodats',
 '__claude_qb_elev_optin']
  .forEach(function (k) { localStorage.removeItem(k); });
```

The browser is back to the stock viewer. Nothing server-side was ever changed, so there is nothing else to undo.

## Notes

- This is an unofficial, personal tool. It is not produced or endorsed by the City of Lincoln, Lancaster County, or their GIS department.
- It reads only public REST endpoints that the viewer itself already uses. It contains no credentials and collects nothing.
- The file is readable, unminified source — no build step, no minification, no code fetched at runtime. Everything it executes is in the file you are reading.
- Two known problems belong to the vendor and the app configuration rather than to this toolkit, and are documented in the release package: the VertiGIS Arcade paging defect behind `#INVALID`, and a "DATS Report" menu item that is not shared publicly.
