# Changelog

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
