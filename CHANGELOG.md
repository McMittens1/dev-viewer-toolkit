# Changelog

## 1.16.0 — reliability repairs (release candidate, under review)

**Status: not released yet.** Everything below is checked by automated tests, many of them against deliberately broken replies. Checks in a real browser with only this version installed are still to come, so read these descriptions as provisional until then.

Five defects found in an independent review, each now covered by a regression test. A second review found four gaps in those fixes; they are corrected too, and marked *Corrected after review* below. None of this changes a result on good data.

- **Shared links keep their layers after you click a parcel.** Clicking a parcel on the map makes the app add temporary highlight graphics to the map's layer list. The Link chip counted them. A link made after a click therefore carried a layer description that a freshly opened viewer could not match, and the recipient got the right place and parcel but their own default layers — Flood on for you, off for them. The chip now describes only the map's own layers. It ignores the app's temporary graphics and any layer another script adds, such as an overlay. The app's own `layers-default` numbering is unchanged. A link that an earlier version made on a map you had not clicked still opens. A link whose layer list really does not match this map — including an older link made after a parcel click — is refused rather than guessed at. *Corrected after review:* the Quick Bar now records the map's start-up layers with these rules already in force. Before, an optional layer that was there at start-up, or a layer added before the Quick Bar restarted, got into that record, and later links quietly lost their `layers-default` part.
- **Snapshots have a new format, and older snapshots are not applied.** *Corrected after review.* Snap 1, Snap 2 and Declutter now save the same layer description that links use, marked with a version, and check it in full before any layer changes. Snapshots saved by 1.15 or earlier recorded only positions in the layer list, not which layers they meant. When an optional layer sat in front of the real ones, the first 1.16.0 fix counted those positions differently and switched the wrong layers. Nothing in an old snapshot says which way it was counted, so an older snapshot is now refused: the chip says so, nothing changes, and the old snapshot is kept exactly as it was. Set up your layers and Shift+click the chip to save it again. Declutter now leaves other scripts' overlays alone, so Restore brings back exactly what it turned off. Going back to 1.15 after saving with 1.16: the new snapshots do nothing there.
- **The leased-land warning stays on the Find Parcel card.** Searching `MH00002090000` showed the warning while the card loaded, then the finished card replaced it. What remained was the 74-acre land parcel's record with nothing to say it was not the home's. The finished card now keeps the warning: the MH id, the park, and that PID `1115200001000` / 101 Gaslight Circle describes the land underneath, not the unit. A slow search can no longer overwrite a newer one, and a link made from that card reopens the MH record. *Corrected after review:* that now holds across a Quick Bar restart too, and closing a card while it is still loading stops that search, so it no longer comes back, moves the map or changes the selected parcel. A parcel record with no mapped boundary gets a clear message instead of a card stuck on "Searching…".
- **A failed lookup is no longer shown as "None mapped".** Find Parcel and the popup repair did not check the county's replies for errors. An ArcGIS error reply, or a reply with no feature list, came out as an empty result — "Floodplain: None mapped" — and the popup repair kept that answer for the rest of the session. Other failures blanked the whole card, and a reply that never came left it loading. Now each row stands alone. A failed row says "could not be checked" and offers Retry. A failed popup value stays `#INVALID`, underlined in amber, and a click retries it. Nothing that failed is cached, and a genuinely empty result still reads "None mapped". The Site tools reader now also treats an HTTP error status as a failure. *Corrected after review:* mobile-home lookups follow the same rule. When the lookup for the home, or for the land parcel under it, fails or comes back unreadable, Find Parcel and Site tools now say it could not be completed and offer a retry. Before, that could read "not found" or "outside every mapped tax parcel". This was found with deliberately broken replies; it is not a report of a county outage.
- **A blank base flood elevation is no longer read as 0 ft.** A BFE line whose elevation was a single space would have become a sea-level line and pulled the Salt Creek storage figure toward zero. Blank, non-numeric and zero-or-negative elevations are now left out, and the result panel says when a line was skipped. On the validation parcel, 1015 W O St, the figures are unchanged: 18,500 sq ft, 624 CY of storage, 218 CY allowable at 35%.
- **Closing a card or Site tools no longer leaves a keyboard handler behind.** Only Escape removed them. The close button, a backdrop click, Settings actions and replacing a card each left one more. Every way of closing now removes its own handler, opening Site tools again replaces any open copy, and a restarted Quick Bar cleans up after the one it replaces — including searches still loading. The app's own keyboard handling is never touched.

Also in this release:

- **Site tools fills in the parcel ID from your last Find Parcel card.** A `pid=` link or the app's own open parcel record still comes first.
- **The mobile-home dimension parser, re-measured against real data.** This was prepared as 1.15.1 and never published on its own. The 1.15.0 parser was written from one example legal description and did not survive the other 1,778. Dimensions written length-first are no longer reported reversed (13 records read `80 X 16`, not `16 X 80`). Implausible pairs, such as a two-foot-long home, are dropped rather than displayed. Feet marks (`14' X 56'`) and a length run into the colour (`16 X 80GRY/WHT`) now parse. A serial number containing its own `X` pair can no longer win. Result: 1,769 of 1,779 records parse, and the widths land where they should — 14 ft and 16 ft single-wides most common, 24–32 ft double-wides next.

## 1.15.0 — two buttons, and parcels that were unfindable

**Flood review and Salt Creek fill capacity are now separate button presses.** They were one, and that was wrong in two ways. A parcel can sit in the floodplain and in no Salt Creek storage area at all — most do — and its user still paid for the elevation sampling to be told the fill number did not apply. Worse, the consent gate for the external services sat in front of both, so declining it meant getting no flood review either, when the flood review needs nothing but county data.

- **Flood review** runs on county data alone and needs no opt-in: FEMA zones and the county's flood prone areas, the Zone A study notice, required lowest floor at both freeboard heights, recorded flood documents, and — if you have agreed to the external services — FEMA letters of map change. Without that agreement the letters section says it was not checked, rather than implying there are none.
- It also reports **whether the parcel is in a mapped Salt Creek storage area**, in one cheap query with no elevation sampling, so you know whether the second button has anything to compute before pressing it. A storage layer that fails to answer reads as "not checked", never as "outside".
- **Fill capacity** keeps the opt-in, because it is the half that samples ground elevations, and is unchanged otherwise.

**Mobile homes and other improvements on leased land can be found at all.** These are taxed separately from the ground they stand on, carry alphanumeric parcel IDs like `MH00002090000`, and live in their own assessor layer as points — 2,375 records countywide, 2,080 of them mobile homes. Every parcel-ID pattern in the toolkit was digits-only, and the Site tools dialog stripped non-digits from whatever you typed, so a correctly copied ID became a number matching nothing and came back "not found".

- Search and Site tools now accept them, resolve the point to the tax parcel containing it, and review that parcel.
- Both the card and the review panel say so: the improvement is mapped as a **point, not a boundary**, and the flood answer describes the land parcel underneath — for a mobile home, the whole park. A reviewer reading a 74-acre park's flood record as if it were one home's lot has been told something misleading, so the toolkit says which it is, and adds that lot-specific answers still need the site plan.
- The unit's space number, dimensions, year, make and serial are read out of the assessor's legal description.

## 1.14.0 — review-panel and map-behaviour fixes

- **The parcel highlight actually draws.** It was built with the spatial reference taken from the individual feature, but ArcGIS REST puts that on the response root, not on each feature — so it was undefined, defaulted to WGS84 lat/long, and the Web Mercator rings were reprojected off the map. The graphic existed and reported itself visible the whole time. It now uses the view's own spatial reference.
- **The result panel is split into titled sections:** floodplain and required floor elevation, Salt Creek flood storage and allowable fill, recorded flood documents, FEMA letters. The storage table's BFE row is relabelled "BFE used for this calculation" — it is the calculation's input; the regulatory BFE and the required floor height belong to the floodplain section. A section with nothing to say renders no heading.
- **Find Parcel frames the lot properly.** The old zoom was a guess that ignored the viewport and left a city lot at about a fifth of the map width. It now fits the parcel to the actual map area with a margin and will not zoom out past 1:600. Large parcels still fit — 600 is a floor, not a target.
- **The parcel card no longer covers the search box.** Its position is measured from the app's search bar when the card opens rather than assumed, so a different window size, browser zoom, or app update cannot put it back on top.
- **Parcel rows in the search dropdown show the arrow cursor**, not the text caret.

Not included: opening the app's Development Information panel automatically from a search result. The mapping library ignores clicks that a script generates, and the app exposes no command interface, so the panel still needs a click on the parcel.

## 1.13.0 — FEMA letters of map change

The flood review now asks FEMA's National Flood Hazard Layer, live, for letters of map change on or within 500 ft of the parcel:

- **LOMAs and LOMR-F determinations** as points — case number, project, outcome, determination date, whether the point falls on the parcel or how far away (letter locations are approximate; the letter itself governs), and a direct link to the letter PDF at FEMA's Map Service Center. Letters FEMA has marked **superseded** are flagged as no longer in effect — something the letter PDFs alone cannot tell you.
- **LOMR revision areas** as polygons where one overlaps the parcel, with effective date and status.
- A FEMA outage renders as "could not check — not an all-clear", per source, never as "no letters".

**The consent changed shape.** External calls are now two federal services behind one opt-in: USGS ground elevations and the FEMA letters lookup. The dialog names both and shows what is sent (the lot outline, nothing about you). Because the old consent covered one service, it does not carry over — the choice now lives in `__claude_qb_ext_optin`, and everyone is asked once more the first time they run Fill capacity.

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
