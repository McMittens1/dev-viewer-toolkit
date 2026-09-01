# Changelog

## 1.12.0 — freeboard

The flood review gained a fourth check, run from the same single parcel fetch:

- **Flood prone areas counted at last.** Freeboard applies over "the floodplain or floodprone area" (LMC 27.52/27.53), and the second half appears on no FEMA map. The review now checks the county's 86 mapped flood prone areas alongside the FEMA zones.
- **Both freeboard heights, always.** 1 ft where the flood study is based on NOAA Atlas 14 rainfall, 2 ft otherwise (Ord. 21393), a flat 1 ft under County Art. 11.017. No public layer records the Atlas 14 basis, so the panel computes the required lowest floor at both heights against the highest base flood elevation mapped within 2,000 ft and never picks one.
- **Chapter facts, no chapter verdict.** Whether Existing Urban (27.52), New Growth (27.53), or the county article applies is decided per application. The panel shows the map evidence — inside or outside the 2004 city limits, current zoning and whether its effective date precedes the 2004-05-10 freeze — and leaves the call to staff.
- Same fail-shut rules as the rest of the review: a blank elevation is dropped rather than read as sea level, an undated zoning polygon is "not knowable" rather than presumed pre-2004, and every failed lookup says "not an all-clear".

## 1.11.0 — flood review

The "Site tools" fill-capacity button now runs a three-part flood review from one parcel fetch:

- **FEMA zones and the Zone A study rule.** A parcel touching Zone A gets a notice showing both measurements — the parcel total and the acres inside Zone A, clipped with the county's own geometry service — against the greater-than-either-five-acres-or-fifty-lots engineered base flood elevation study rule (LMC 27.52.040(g)/27.53.040(g); County Art. 11.007(h) uses the acreage test only). Which figure the five acres is measured against is a staff determination made case by case, so the panel shows both and renders no verdict.
- **Recorded flood documents.** Building restriction agreements and watershed encumbrances mapped on the parcel, with EO/instrument numbers, parties and dates. An outage reports itself as unchecked, never as "none recorded".
- **Fill capacity caveats.** The result panel now states the ordinance limits of the number: LMC 27.52.035 assesses the whole development area, the storage baseline is 2007-03-05 (Ord. 18893) while lidar shows current ground, and "fill" includes buildings (27.52.020) — so the figure is a floor, not a ceiling.

Also hardened against the county's blank-data shapes: a null, empty or single-space `FILL_PRCNT`, `GIS_AREA`, `ELEV`, `V_DATUM` or date now reports "not recorded" instead of a confident 0, NaN, or 1970-01-01.

## 1.6.1

- Userscript now declares `@updateURL` / `@downloadURL`, so Tampermonkey updates itself from this repository. This is the last version that has to be installed by hand.

## 1.6.0 — the `#INVALID` repair, extended from 5 rows to 19

An audit found that **24 of the 33** values the popup renders use the `FeatureSetByName` + `Intersects` pattern that triggers the VertiGIS paging defect, but only **5** had a repair. The unprotected rows included the ones people actually read: Applications, Area planner, Case planner, and all five Inspector rows.

- Fourteen rows added to the repair table, each reproducing its own Arcade expression rather than a house style — four different empty-case strings (`None`, empty, `N/A`, em-dash) and two different orderings, because Arcade's `Distinct()` preserves order while `Sort(Distinct())` does not.
- Phone numbers normalised on display. The source data carries three formats and one malformed value.
- Startup self-check warns when a hidden lookup layer is missing, instead of letting the popup fall back to a silent em-dash.

## 1.5.0 — Inspector rows fixed (a regression live since 1.1)

The five Inspector rows resolve hidden lookup layers by name, and those layers live in the map object rather than local storage — so they do not survive a page reload. The seed script added all six; the Quick Bar re-added only one. Result: Area planner worked forever, Inspector assignments worked until the next refresh and then quietly showed an em-dash.

- All six lookup layers now come from **one table**, which also feeds the deep-link index space. The bug was a duplication bug; the fix is that there is only one list.
- DATS Report menu item hidden for sessions that cannot run it (checked against the portal, so a signed-in user keeps it).

## 1.4.0 — parcels in the app's own search box

A "Development Information" group of real parcel hits is injected at the top of the native search dropdown, above the geocoder's. Typing an address or a bare parcel ID now returns the parcel — which is what the Help tab has always claimed the search box does.

## 1.3.0 — shareable deep links

A Link chip copies a URL that reopens the current view, layers and parcel. Recipients without the toolkit still land in the right place.

## 1.2.0 — `#INVALID` fields, and auto-run

- Popup v7 makes the display gates fail **closed**, fixing empty amber warning banners that appeared on ordinary parcels.
- The Quick Bar re-fetches broken values over REST and marks them with a dotted underline.
- Userscript and unpacked MV3 extension replace the console paste and the per-page-load bookmark click.

## 1.1.0

Inspector-area assignments, blank row hiding, map-anchored Quick Bar, oblique-aerials fix.

## 1.0.0

Redesigned parcel popup, Quick Bar, Find Parcel.

---

### Known issues that are not ours to fix

- **VertiGIS/Geocortex Arcade FeatureSet paging defect.** `FeatureSetByName()` + `Intersects()` can intermittently throw inside the vendor's own compiled bundle, which is what produces `#INVALID`. Reproducible on the untouched stock viewer. The underlying county services are healthy. This toolkit suppresses the symptoms; only the vendor can fix the cause.
- **The search configuration has no Development Information source**, so a stock browser still gets geocoder-only results.
- **The DATS Report workflow item is not shared publicly**, so it silently does nothing for anonymous visitors.
