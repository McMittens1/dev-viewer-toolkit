# Lincoln/Lancaster Development Viewer Toolkit

A browser-side toolkit for the public [Lincoln/Lancaster County Development Viewer](https://gis.lincoln.ne.gov/apps/?app=86ccdaa0697c47dea035d3ec1258b778&viewer=Developmentviewer).

It runs entirely in your own browser. Nothing is installed on the server, no GIS portal account is required, and no other user of the viewer is affected. It stores a handful of keys in your own browser's local storage.

By default it talks only to `gis.lincoln.ne.gov`. Two things are the exception and both are **off until you switch them on** with one confirmation: ground elevations from the USGS 3D Elevation Program (the county publishes no elevation data at all), and FEMA letters of map change from the National Flood Hazard Layer. See [The two external services](#the-two-external-services).

## What it does

- **Redesigned parcel popup** — zoning, land use, floodplain, applications, staff and inspector contacts in one readable card, with a Street View link.
- **Repairs the `#INVALID` fields.** The mapping platform (VertiGIS/Geocortex) has a defect that makes popup fields fail at random. The toolkit detects those failures and re-fetches the real value straight from the county's map services, marking recovered values with a dotted underline. 20 of the 24 vulnerable fields are covered.
- **Quick Bar** — one-click layer toggles, two saveable view snapshots, Declutter, and a Find Parcel search that actually returns parcels.
- **Parcel results in the app's own search box** — type an address or a parcel ID and get the parcel, which is what the Help tab has always claimed the search box does.
- **Shareable deep links** — copy a link that reopens your exact view, layers and parcel. People without the toolkit still land in the right place.
- **Salt Creek fill capacity.** The "Site tools" chip: for a parcel inside one of the county's mapped Salt Creek flood storage areas, it clips the parcel to that area, samples bare-earth lidar on a 5 ft grid, interpolates a base flood elevation surface between the county's 1-ft BFE lines, and reports the storage volume below the BFE and the fill the area's `FILL_PRCNT` allows. Validated on 1015 W O St: **18,500 sq ft inside storage area #8, 624 CY of storage, 218 CY allowable at 35%** — within 0.3% of an independently built prototype.

  Every measurement is made in NAD83 Nebraska State Plane, US survey feet — not the Web Mercator the county serves by default, which stretches distance about 32% at Lincoln's latitude. Measured on parcel `1435300004000`: **338,050 sq ft raw against a true 195,121**; State Plane returned **195,023 — 0.05%**.

  **Preliminary, and the panel says so.** It ignores floodway no-fill rules, existing structures and permits, and compensatory-storage design, and the lidar predates recent grading. A parcel outside every storage area is told so explicitly rather than being handed a zero.
- **FEMA Zone A counted as floodplain.** Every flood test in the viewer asked only whether the FEMA zone was `AE`. The layer also carries 81 Zone A polygons — Zone A is a Special Flood Hazard Area too, the same 100-year floodplain, differing only in having no determined base flood elevation. Measured 2026-08-28: 1,506 parcels intersect Zone A, and 39 of a 40-parcel spread sample touch Zone A **only**, so roughly 1,460 parcels were being told "None mapped" while sitting in the regulatory floodplain. The toolkit now reports them, and Find Parcel adds how much of the parcel is in the floodplain, computed with the county's own public geometry service. The same assumption is present in the stock app configuration and has been flagged for the GIS team.
- **One-button flood review.** Fill capacity grew into a three-part review from a single parcel fetch: the FEMA zones, with a Zone A notice that reports both measurements (the parcel total and the acres inside Zone A) against the greater-than-five-acres-or-fifty-lots engineered-study rule (LMC 27.52.040(g)/27.53.040(g); the county code's Art. 11.007(h) uses the acreage test only) and leaves the measurement-basis call to staff; the Salt Creek fill capacity above, now with the ordinance caveats spelled out on the panel (development area vs single parcel, the 2007 storage baseline, buildings counting as fill); and any recorded building restriction agreements or watershed encumbrances mapped on the parcel; with the external services enabled it also lists **FEMA letters of map change** (LOMA/LOMR) on or near the parcel — case number, outcome, whether FEMA has marked the letter superseded, and a link to the letter PDF at FEMA's Map Service Center. Letter locations are approximate and the letter itself governs. The result panel is split into titled sections — floodplain and required floor elevation, Salt Creek flood storage and allowable fill, recorded documents, FEMA letters — so the storage numbers are never mistaken for the floodplain determination. A lookup that fails says so plainly instead of reading as an all-clear, and a value the county never published is reported as unknown rather than as zero.
- **Freeboard, including the flood prone areas.** Both city flood chapters set the lowest-floor height over "the floodplain **or floodprone area**", and the second half is on no FEMA map. The review now also checks the county's 86 mapped flood prone areas, reports the base flood elevations within 2,000 ft, and shows the required floor at **both** freeboard heights — 1 ft where the study is based on NOAA Atlas 14 rainfall, 2 ft otherwise (Ord. 21393; County Art. 11.017 is a flat 1 ft) — because no public layer records which basis applies. The Existing Urban / New Growth chapter call is decided per application, so the panel presents the 2004 map facts (city limits, zoning effective dates) as evidence and renders no verdict.

## The two external services

Two things need data the county does not publish, and both are behind the same single opt-in:

1. **USGS 3D Elevation Program** (`elevation.nationalmap.gov`) — the fill-capacity calculation needs ground heights, and the county has no elevation data to supply them: every one of its 26 public service folders was checked, and there is no contour, DEM, lidar, terrain or survey-control layer anywhere. 1 m lidar-derived bare earth.
2. **FEMA National Flood Hazard Layer** (`hazards.fema.gov`) — letters of map change (LOMA/LOMR): FEMA determinations that removed property from, or revised, the mapped floodplain. No county layer carries them.

Those are the only times this toolkit contacts anything other than `gis.lincoln.ne.gov`, so they are opt-in together:

- The flood review refuses to run until you have agreed.
- The first time it asks, one dialog names both services and explains what is sent (the lot outline — public parcel coordinates, nothing about you), and you have to confirm.
- The choice is remembered in `__claude_qb_ext_optin`. Remove that key to be asked again. (Before 1.13.0 the key was `__claude_qb_elev_optin` and covered USGS only; it is deliberately not honored for the wider consent, so earlier users are asked once more.)
- Never press Fill capacity and nothing leaves the county server.

**Bare earth is not a survey.** It predates recent grading, fill and retaining walls and does not include structures. Not for finished floor elevations, drainage design or floodplain compliance — the result panel says so every time.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey) in your browser.
2. Click **[DV_Toolkit.user.js](DV_Toolkit.user.js)** → **Raw**. Tampermonkey will offer to install it.
3. Open the Development Viewer. The Quick Bar appears near the bottom of the map once the map finishes loading (this can take 30–45 seconds on a slow connection).

If you install while the viewer is already open, **reload the page** — userscripts only inject at page load. To check it is running, press F12 and type `window.__dvToolkit`; you should get `{version: "1.14.0", ready: true}`.

Updates install themselves from then on — this script declares an `@updateURL`, so Tampermonkey checks this repository and upgrades in place.

### If your IT blocks userscript managers

The `extension/` folder in the release package is an unpacked Chrome/Edge extension that requests **no permissions at all**, only a host match for the viewer. Note that an unpacked extension does **not** auto-update — you replace the folder by hand for each release.

## Uninstall

Remove the script from Tampermonkey, then run this in the browser console on the viewer and reload:

```js
['__claude_popup_patch','__claude_quick_layers','__claude_qb_preset1','__claude_qb_preset2',
 '__claude_qb_hidden','__claude_qb_baseline','__claude_qb_nosearch','__claude_qb_nodats',
 '__claude_qb_elev_optin','__claude_qb_ext_optin']
  .forEach(function (k) { localStorage.removeItem(k); });
```

The browser is back to the stock viewer. Nothing server-side was ever changed, so there is nothing else to undo.

## Notes

- This is an unofficial, personal tool. It is not produced or endorsed by the City of Lincoln, Lancaster County, or their GIS department.
- **What it talks to.** Public ArcGIS REST services on `gis.lincoln.ne.gov`. Most are layers the viewer already loads; fill capacity additionally queries the public `Utilities/Geometry` service and the FEMA flood-detail storage areas and BFE lines, and the flood review also reads the FEMA flood zones, flood prone areas, historic city limits, zoning, building restriction agreements and watershed encumbrances layers — none of which the viewer loads on its own. All are anonymous, read-only, public endpoints. Ground elevations (USGS) and FEMA letters of map change are the only things that leave the county server, and only after you opt in — see above.
- **No authenticated requests, and no cookies sent anywhere.** Up to 1.8.0 the toolkit asked the portal whether your session could open the “DATS Report” workflow item, sending cookies with `credentials: 'include'`, and hid the menu item on a refusal. That was removed in 1.8.1 because it did the opposite of what it intended — see below.
- It contains no credentials, sends none, sets no cookies, and collects, stores and transmits nothing about you.
- **The “DATS Report” menu item is labelled, not hidden.** That workflow is not shared publicly, so for an anonymous visitor it loads and then does nothing at all — no message, no error. The toolkit appends “User Authentication Required.” to its description, matching the wording the app already uses on its own two secure items.

  Earlier versions tried to *detect* entitlement by probing the portal with cookies. This app authenticates with **OAuth** — the credential lives in `localStorage` under `esriJSAPIOAuth`, and the only cookies on the domain are Google Analytics — so that request carried no authentication and returned 403 for every session. It therefore hid the menu item from exactly the signed-in staff entitled to run it. Confirmed live while signed in as a real portal user before it was removed. Set `__claude_qb_nodats` to `1` to leave the item completely untouched.
- The parcel card includes ordinary outbound **links** to the Lancaster County Assessor and Google Maps/Street View. Those are links you click, not background requests — nothing is sent to either until you choose to open one.
- Two known problems belong to the vendor and the app configuration rather than to this toolkit, and are documented in the release package: the VertiGIS Arcade paging defect behind `#INVALID`, and a "DATS Report" menu item that is not shared publicly.
