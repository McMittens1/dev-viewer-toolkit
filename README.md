# Lincoln/Lancaster Development Viewer Toolkit

A browser-side toolkit for the public [Lincoln/Lancaster County Development Viewer](https://gis.lincoln.ne.gov/apps/?app=86ccdaa0697c47dea035d3ec1258b778&viewer=Developmentviewer).

It runs entirely in your own browser. Nothing is installed on the server, no GIS portal account is required, and no other user of the viewer is affected. It talks only to `gis.lincoln.ne.gov` and stores a handful of keys in your own browser's local storage.

## What it does

- **Redesigned parcel popup** — zoning, land use, floodplain, applications, staff and inspector contacts in one readable card, with a Street View link.
- **Repairs the `#INVALID` fields.** The mapping platform (VertiGIS/Geocortex) has a defect that makes popup fields fail at random. The toolkit detects those failures and re-fetches the real value straight from the county's map services, marking recovered values with a dotted underline. 19 of the 24 vulnerable fields are covered.
- **Quick Bar** — one-click layer toggles, two saveable view snapshots, Declutter, and a Find Parcel search that actually returns parcels.
- **Parcel results in the app's own search box** — type an address or a parcel ID and get the parcel, which is what the Help tab has always claimed the search box does.
- **Shareable deep links** — copy a link that reopens your exact view, layers and parcel. People without the toolkit still land in the right place.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey) in your browser.
2. Open **[DV_Toolkit.user.js](DV_Toolkit.user.js)** and click **Raw**. Tampermonkey will offer to install it.
3. Open the Development Viewer. The Quick Bar appears near the bottom of the map once the map finishes loading (this can take 30–45 seconds on a slow connection).

Updates install themselves from then on — this script declares an `@updateURL`, so Tampermonkey checks this repository and upgrades in place.

### If your IT blocks userscript managers

The release package also contains an unpacked Chrome/Edge extension that requests **no permissions at all**, only a host match for the viewer. Note that an unpacked extension does **not** auto-update — you replace the folder by hand for each release.

## Uninstall

Remove the script from Tampermonkey, then run this in the browser console on the viewer and reload:

```js
['__claude_popup_patch','__claude_quick_layers','__claude_qb_preset1','__claude_qb_preset2',
 '__claude_qb_hidden','__claude_qb_baseline','__claude_qb_nosearch','__claude_qb_nodats']
  .forEach(function (k) { localStorage.removeItem(k); });
```

The browser is back to the stock viewer. Nothing server-side was ever changed, so there is nothing else to undo.

## Notes

- This is an unofficial, personal tool. It is not produced or endorsed by the City of Lincoln, Lancaster County, or their GIS department.
- It reads only public REST endpoints that the viewer itself already uses. It contains no credentials and collects nothing.
- Two known problems belong to the vendor and the app configuration rather than to this toolkit: the VertiGIS Arcade paging defect behind `#INVALID`, and a "DATS Report" menu item that is not shared publicly.
