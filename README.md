# Lincoln/Lancaster Development Viewer Toolkit

A browser-side toolkit for the public [Lincoln/Lancaster County Development Viewer](https://gis.lincoln.ne.gov/apps/?app=86ccdaa0697c47dea035d3ec1258b778&viewer=Developmentviewer).

It runs entirely in your own browser. Nothing is installed on the server, no GIS portal account is required, and no other user of the viewer is affected. It stores a handful of keys in your own browser's local storage.

By default it talks only to `gis.lincoln.ne.gov`. There are **two exceptions, both off until you switch them on**: ground elevations from the USGS 3D Elevation Program, and FEMA letters of map change from FEMA's National Flood Hazard Layer. See [The two external services](#the-two-external-services).

## What it does

- **Redesigned parcel popup** — zoning, land use, floodplain, applications, staff and inspector contacts in one readable card, with a Street View link.
- **Repairs the `#INVALID` fields.** The mapping platform (VertiGIS/Geocortex) has a defect that makes popup fields fail at random. The toolkit detects those failures and re-fetches the real value straight from the county's map services, marking recovered values with a dotted underline. 20 of the 24 vulnerable fields are covered.
- **Quick Bar** — one-click layer toggles, two saveable view snapshots, Declutter, and a Find Parcel search that actually returns parcels.
- **Parcel results in the app's own search box** — type an address or a parcel ID and get the parcel, which is what the Help tab has always claimed the search box does.
- **Shareable deep links** — copy a link that reopens your exact view, layers and parcel. People without the toolkit still land in the right place.
- **Flood review.** The "Site tools" chip, first button. For one parcel it reports the mapped FEMA zones and the county's flood prone areas, the required lowest floor at both freeboard heights, recorded flood documents against the property, FEMA letters of map change, and whether the parcel is in a Salt Creek storage area. It runs on county data alone, so it needs no opt-in — only the FEMA letters reach outside, and they are skipped, and said to be skipped, unless you have agreed.
- **Salt Creek fill capacity.** The second button, and a separate question. For a parcel inside one of the county's mapped Salt Creek flood storage areas, it clips the parcel to that area, samples bare-earth lidar on a 5 ft grid, interpolates a base flood elevation surface between the county's 1-ft BFE lines, and reports the storage volume below the BFE and the fill the area's `FILL_PRCNT` allows. Validated on 1015 W O St: **18,500 sq ft inside storage area #8, 624 CY of storage, 218 CY allowable at 35%** — within 0.3% of an independently built prototype.

  Every measurement is made in NAD83 Nebraska State Plane, US survey feet — not the Web Mercator the county serves by default, which stretches distance about 32% at Lincoln's latitude. Measured on parcel `1435300004000`: **338,050 sq ft raw against a true 195,121**; State Plane returned **195,023 — 0.05%**.

  **Preliminary, and the panel says so.** It ignores floodway no-fill rules, existing structures and permits, and compensatory-storage design, and the lidar predates recent grading. A parcel outside every storage area is told so explicitly rather than being handed a zero.
- **Freeboard, both heights, never one verdict.** Freeboard applies over "the floodplain or floodprone area" (LMC 27.52/27.53), and the second half appears on no FEMA map, so the review checks the county's 86 mapped flood prone areas alongside the FEMA zones. It computes the required lowest floor at 1 ft (NOAA Atlas 14 basis) and at 2 ft (Ord. 21393), and under the flat 1 ft of County Art. 11.017, against the highest base flood elevation mapped within 2,000 ft. No public layer records which basis applies, so the panel shows both and leaves the call to staff — as it does for whether Existing Urban (27.52), New Growth (27.53) or the county article governs, showing the map evidence instead of a verdict.
- **FEMA letters of map change.** LOMAs and LOMR-F determinations on or within 500 ft of the parcel, and LOMR revision areas overlapping it — case number, outcome, date, distance, and a direct link to the letter PDF at FEMA's Map Service Center. Letters FEMA has marked **superseded** are flagged as no longer in effect, which the letter PDFs alone cannot tell you. A FEMA outage renders as "could not check — not an all-clear", never as "no letters".
- **FEMA Zone A counted as floodplain.** Every flood test in the viewer asked only whether the FEMA zone was `AE`. The layer also carries 81 Zone A polygons — Zone A is a Special Flood Hazard Area too, the same 100-year floodplain, differing only in having no determined base flood elevation. Measured 2026-08-28: 1,506 parcels intersect Zone A, and 39 of a 40-parcel spread sample touch Zone A **only**, so roughly 1,460 parcels were being told "None mapped" while sitting in the regulatory floodplain. The toolkit now reports them, and Find Parcel adds how much of the parcel is in the floodplain, computed with the county's own public geometry service. The same assumption is present in the stock app configuration and has been flagged for the GIS team.
- **Mobile homes and other improvements on leased land.** These carry alphanumeric parcel IDs (`MH00002090000`) and are mapped as points in a separate assessor layer — 2,375 records countywide, 2,080 of them mobile homes. Every parcel-ID field in the toolkit used to be digits-only, so a correct ID came back "not found". Search and Site tools now accept them, resolve the point to the tax parcel it stands on, and review that parcel while saying plainly that the answer describes the land underneath and not the home. The unit's space, size, year, make and serial are read out of the assessor's legal description.

## The two external services

Both are off until you tick one box in the Site tools dialog, and the dialog names both and shows what is sent (the lot outline — public parcel coordinates, nothing about you).

**1. USGS 3D Elevation Program** (`elevation.nationalmap.gov`) — 1 m lidar-derived bare earth, for the fill-capacity number. The county has no elevation data to supply it: every one of its 26 public service folders was checked, and there is no contour, DEM, lidar, terrain or survey-control layer anywhere. Fill capacity refuses to run until you have agreed.

**2. FEMA National Flood Hazard Layer** (`hazards.fema.gov`) — letters of map change on or near the parcel. Flood review runs without this; the letters section says it was not checked rather than implying there are none.

The choice is remembered in `__claude_qb_ext_optin`. Remove that key to be asked again. Tick nothing and nothing leaves the county server.

**Bare earth is not a survey.** It predates recent grading, fill and retaining walls and does not include structures. Not for finished floor elevations, drainage design or floodplain compliance — the result panel says so every time. Letter locations are likewise approximate; the letter itself governs.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey) in your browser.
2. Click **[DV_Toolkit.user.js](DV_Toolkit.user.js)** → **Raw**. Tampermonkey will offer to install it.
3. Open the Development Viewer. The Quick Bar appears near the bottom of the map once the map finishes loading (this can take 30–45 seconds on a slow connection).

If you install while the viewer is already open, **reload the page** — userscripts only inject at page load. To check it is running, press F12 and type `window.__dvToolkit`; you should get `{version: "1.15.0", ready: true}`. That check is worth making before reporting a bug: the script auto-updates from this repository, so a fix that is not pushed yet is not in your browser.

Updates install themselves from then on — this script declares an `@updateURL`, so Tampermonkey checks this repository and upgrades in place.

### If your IT blocks userscript managers

The `extension/` folder in the release package is an unpacked Chrome/Edge extension that requests **no permissions at all**, only a host match for the viewer. Note that an unpacked extension does **not** auto-update — you replace the folder by hand for each release.

## Uninstall

Remove the script from Tampermonkey, then run this in the browser console on the viewer and reload:

```js
['__claude_popup_patch','__claude_quick_layers','__claude_qb_preset1','__claude_qb_preset2',
 '__claude_qb_hidden','__claude_qb_baseline','__claude_qb_nosearch','__claude_qb_nodats',
 '__claude_qb_ext_optin','__claude_qb_elev_optin']
  .forEach(function (k) { localStorage.removeItem(k); });
```

The browser is back to the stock viewer. Nothing server-side was ever changed, so there is nothing else to undo.

## Notes

- This is an unofficial, personal tool. It is not produced or endorsed by the City of Lincoln, Lancaster County, or their GIS department.
- **What it talks to.** Public ArcGIS REST services on `gis.lincoln.ne.gov`. Most are layers the viewer already loads; the flood review and fill capacity additionally query the public `Utilities/Geometry` service, the FEMA flood-detail storage areas and BFE lines, the flood prone areas, the recorded-document layers and the assessor's leased-land parcels, which the viewer does not load on its own. All are anonymous, read-only, public endpoints. The two federal services above are the only things that leave the county server, and only after you opt in.
- **No authenticated requests, and no cookies sent anywhere.** Up to 1.8.0 the toolkit asked the portal whether your session could open the "DATS Report" workflow item, sending cookies with `credentials: 'include'`, and hid the menu item on a refusal. That was removed in 1.8.1 because it did the opposite of what it intended — see below.
- It contains no credentials, sends none, sets no cookies, and collects, stores and transmits nothing about you.
- **The "DATS Report" menu item is labelled, not hidden.** That workflow is not shared publicly, so for an anonymous visitor it loads and then does nothing at all — no message, no error. The toolkit appends "User Authentication Required." to its description, matching the wording the app already uses on its own two secure items.

  Earlier versions tried to *detect* entitlement by probing the portal with cookies. This app authenticates with **OAuth** — the credential lives in `localStorage` under `esriJSAPIOAuth`, and the only cookies on the domain are Google Analytics — so that request carried no authentication and returned 403 for every session. It therefore hid the menu item from exactly the signed-in staff entitled to run it. Confirmed live while signed in as a real portal user before it was removed. Set `__claude_qb_nodats` to `1` to leave the item completely untouched.
- The parcel card includes ordinary outbound **links** to the Lancaster County Assessor and Google Maps/Street View. Those are links you click, not background requests — nothing is sent to either until you choose to open one.
- Two known problems belong to the vendor and the app configuration rather than to this toolkit, and are documented in the release package: the VertiGIS Arcade paging defect behind `#INVALID`, and a "DATS Report" menu item that is not shared publicly.
