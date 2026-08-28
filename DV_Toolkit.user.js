// ==UserScript==
// @name         Lincoln/Lancaster Development Viewer Toolkit
// @namespace    https://gis.lincoln.ne.gov/
// @version      1.8.0
// @description  Auto-applies the redesigned parcel popup (v8) and the Quick Bar (v3.9) to the public Development Viewer: a CAD site-plan export (DXF) for Home Designer/Chief Architect/AutoCAD with optional USGS contours, building line and soils, FEMA Zone A, floodplain share of parcel, the #INVALID repair extended to 20 rows, shareable deep links, parcel results in the search box, and the Inspector-rows fix.
// @match        https://gis.lincoln.ne.gov/apps/*
// @homepageURL  https://github.com/McMittens1/dev-viewer-toolkit
// @updateURL    https://raw.githubusercontent.com/McMittens1/dev-viewer-toolkit/main/DV_Toolkit.user.js
// @downloadURL  https://raw.githubusercontent.com/McMittens1/dev-viewer-toolkit/main/DV_Toolkit.user.js
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==
//
// @grant none is deliberate: it runs the script in the PAGE's JS context, which is
// the only place window.$arcgis (the map) exists. Under any other @grant the script
// is sandboxed and would see nothing.
//
// NETWORK. By default this script talks only to gis.lincoln.ne.gov, and stores
// nothing beyond a few localStorage keys in your own browser.
//
// There is exactly one exception, and it is off until you turn it on. The Site
// DXF export can add ground contours, and the county publishes no elevation
// data anywhere in its public GIS -- all 26 service folders were checked. Those
// contours come from the USGS 3D Elevation Program at elevation.nationalmap.gov.
// If you enable them, your browser sends that parcel's outline (public parcel
// coordinates, nothing identifying you) to that federal service and receives
// ground heights back. The export dialog says so and makes you confirm before
// the first request; clear the localStorage key __claude_qb_elev_optin to be
// asked again. Leave contours off and nothing but gis.lincoln.ne.gov is
// contacted.

(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * Development Viewer Toolkit 1.8.0 -- auto-run wrapper.
   *
   * Runs the SAME two payloads as the manual install, at the right moment:
   *   applyPopup()   = seed_apply_popup_v8.js  (popup v8, fail-safe gates + FEMA Zone A)
   *   runQuickBar()  = quickbar_v3.8_src.js    (Quick Bar v3.8, + FEMA Zone A + floodplain share)
   *
   * Replaces both manual steps: the once-per-browser console paste and the
   * once-per-page-load bookmark click. Nothing server-side, no portal rights,
   * no change to what the payloads actually do.
   *
   * Uninstall: remove this script/extension, then in the console run
   *   ['__claude_popup_patch','__claude_quick_layers','__claude_qb_preset1',
   *    '__claude_qb_preset2','__claude_qb_hidden','__claude_qb_baseline','__claude_qb_nosearch','__claude_qb_nodats','__claude_qb_nodats','__claude_qb_baseline'].forEach(function(k){
   *      localStorage.removeItem(k); });
   * and reload. The browser is back to the stock viewer.
   * ------------------------------------------------------------------- */

  if (window.__dvToolkit) return;              /* never install twice */
  window.__dvToolkit = { version: '1.8.0', ready: false };

  /* The payloads alert() on "map not ready" / "layer not found". That is right
   * for a bookmarklet someone just clicked, and wrong for something that runs on
   * every page load -- a real alert() would also block the page. Shadowed here,
   * lexically, so the host app's own alerts are untouched. */
  function alert(msg) { console.warn('[DV Toolkit] ' + msg); }

  function mapReady() {
    try {
      var vs = window.$arcgis && window.$arcgis.views;
      if (!vs || !vs.length) return false;
      var v = vs.getItemAt ? vs.getItemAt(0) : vs.items[0];
      return !!(v && v.map && v.map.allLayers && v.map.allLayers.length);
    } catch (e) { return false; }
  }

  function start() {
    try { applyPopup(); }
    catch (e) { console.error('[DV Toolkit] popup patch failed', e); }
    try { runQuickBar(); }
    catch (e) { console.error('[DV Toolkit] Quick Bar failed', e); }
    window.__dvToolkit.ready = true;

    /* If the app ever tears the bar out from under us (SPA re-render), put it
     * back -- unless the user deliberately hid it, which the bar remembers. */
    setInterval(function () {
      try {
        if (document.getElementById('cqb') || document.getElementById('cqb-handle')) return;
        if (localStorage.getItem('__claude_qb_hidden') === '1') return;
        if (!mapReady()) return;
        runQuickBar();
      } catch (e) { /* a watchdog must never throw */ }
    }, 5000);
  }

  var tries = 0;
  var timer = setInterval(function () {
    if (++tries > 480) {                        /* 480 x 250ms = 2 minutes, then stop */
      clearInterval(timer);
      console.warn('[DV Toolkit] map never became ready; nothing applied');
      return;
    }
    if (!mapReady()) return;
    clearInterval(timer);
    setTimeout(start, 400);                     /* one beat for layers to settle */
  }, 250);

  /* ===================== payload 1: popup v7 seed ===================== */
function applyPopup() {
  // seed_apply_popup_v8.js -- per-browser popup patch, Option C (no portal rights needed).
  // v8: everything from v7, plus the Floodplain row and FEMA banner now recognise Zone A
  //     as well as Zone AE. See V1_CHANGES.md "FINDING".
  // See APPLY_INSTRUCTIONS.md. Run this once per browser (bookmarklet or console paste)
  // after the Development Viewer has finished loading.
  var popupInfo = {"popupElements":[{"type":"text","text":"<div style='font-family:\"Segoe UI\", Arial, sans-serif;background-color:#141a22;border:1px solid #2c3a4d;border-radius:8px;padding:10px;color:#e8eef5;font-size:9.5pt;line-height:1.4;'><div style='margin-bottom:2px;'><span style='color:#8fa3ba;font-size:8pt;'>PID</span> <strong style='color:#ffffff;font-size:9.5pt;'>{PARCELID}</strong></div><div style='color:#c9d6e4;font-size:8.5pt;margin-bottom:2px;'>{OWNERNME1}</div><div style='color:#8fa3ba;font-size:8pt;margin-bottom:4px;'>{expression/expr38}</div><div style='display:none;display:{expression/expr31};background-color:#5b1111;border:1px solid #b04444;border-radius:6px;padding:6px 8px;margin:6px 0;color:#ffd9d9;font-size:9pt;'><strong>&#9888; FEMA: {expression/expr16}</strong></div><div style='display:none;display:{expression/expr30};background-color:#4d3305;border:1px solid #90661a;border-radius:6px;padding:6px 8px;margin:6px 0;color:#ffe3ad;font-size:8.5pt;'><strong>&#9888; Overlay districts:</strong> {expression/expr29}</div><div style='color:#6f8bb0;font-size:7.5pt;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #2c3a4d;padding-bottom:2px;margin:8px 0 4px 0;'>ZONING &amp; LAND USE</div><table style='width:100%;border-collapse:collapse;'><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Zoning</td><td style='padding:2px 0;vertical-align:top;'><a href='{expression/expr0}' target='_blank' rel='noopener noreferrer' style='color:#7cc4ff;text-decoration:none;'><strong>{expression/expr1}</strong></a></td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Floodplain</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr16}</td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Existing use</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr3}</td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Future use</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr17}</td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Growth tier</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr18}</td></tr><tr style='display:{expression/expr33};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Subdivision</td><td style='padding:2px 0;vertical-align:top;'><a href='https://app.lincoln.ne.gov/aspx/cnty/survey/default.aspx?cmd=Final%20Plats&amp;SubDiv={CNVYNAME}' target='_blank' rel='noopener noreferrer' title='Open final plats for this subdivision' style='color:#7cc4ff;text-decoration:none;font-size:9pt;'><strong>{CNVYNAME}</strong></a></td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Area</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr2} ac &#183; {expression/expr41} ft&#178; &#177;</td></tr></table><div><div style='color:#6f8bb0;font-size:7.5pt;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #2c3a4d;padding-bottom:2px;margin:8px 0 4px 0;'>DEVELOPMENT ACTIVITY</div><div style='display:none;display:{expression/expr56};color:#8fa3ba;font-size:8.5pt;padding:2px 0;'>No active applications on file</div><table style='display:{expression/expr32};width:100%;border-collapse:collapse;'><tr style='display:{expression/expr54};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Project</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr8}</td></tr><tr style='display:{expression/expr54};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Approved plan</td><td style='padding:2px 0;vertical-align:top;'><a href='https://app.lincoln.ne.gov/aspx/city/pats/default.aspx?AppNum={expression/expr5}' target='_blank' rel='noopener noreferrer' style='color:#7cc4ff;text-decoration:none;font-size:9pt;'><strong>{expression/expr5}</strong></a></td></tr><tr style='display:{expression/expr54};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Amendment</td><td style='padding:2px 0;vertical-align:top;'><a href='https://app.lincoln.ne.gov/aspx/city/pats/default.aspx?AppNum={expression/expr7}' target='_blank' rel='noopener noreferrer' style='color:#7cc4ff;text-decoration:none;font-size:9pt;'><strong>{expression/expr7}</strong></a></td></tr><tr style='display:{expression/expr54};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Parent app</td><td style='padding:2px 0;vertical-align:top;'><a href='https://app.lincoln.ne.gov/aspx/city/pats/default.aspx?AppNum={expression/expr6}' target='_blank' rel='noopener noreferrer' style='color:#7cc4ff;text-decoration:none;font-size:9pt;'><strong>{expression/expr6}</strong></a></td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Applications</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr4}</td></tr><tr style='display:{expression/expr55};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Subdiv. permit</td><td style='padding:2px 0;vertical-align:top;'><a href='https://app.lincoln.ne.gov/aspx/docview.aspx?path=//CitySubs//&amp;project=plangis&amp;ext=pdf&amp;cmd=View&amp;filename={expression/expr15}' target='_blank' rel='noopener noreferrer' style='color:#7cc4ff;text-decoration:none;font-size:9pt;'><strong>{expression/expr15}</strong></a></td></tr><tr style='display:{expression/expr39};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Annex. agmt.</td><td style='padding:2px 0;vertical-align:top;'><a href='https://www.lincoln.ne.gov/City/Departments/Planning-Department/Development-Review/Annexations/Annexation-Agreements' target='_blank' rel='noopener noreferrer' style='color:#7cc4ff;text-decoration:none;font-size:9pt;'><strong>Resolution {expression/expr14}</strong></a></td></tr></table></div><div style='color:#6f8bb0;font-size:7.5pt;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #2c3a4d;padding-bottom:2px;margin:8px 0 4px 0;'>PROPERTY</div><div style='color:#c9d6e4;font-size:8pt;margin-bottom:4px;'>{PRPRTYDSCRP}</div><table style='width:100%;border-collapse:collapse;margin-bottom:4px;'><tr style='display:{expression/expr42};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Class</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{CLASSDSCRP}</td></tr><tr style='display:{expression/expr44};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Built</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr43}</td></tr><tr style='display:{expression/expr46};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Floor area</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr45} ft&#178;</td></tr><tr style='display:{expression/expr48};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Assessed</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr47}</td></tr></table><div style='display:{expression/expr34};margin:4px 0;'><a href='https://orion.lancaster.ne.gov/appraisal/publicaccess/PropertyDetail.aspx?PropertyNumber={PARCELID}' target='_blank' rel='noopener noreferrer' title='Open Assessor property record'><img src='{PHOTOPATH}' alt='Property photo' style='width:100%;border-radius:5px;border:1px solid #2c3a4d;' /></a></div><div style='color:#6f8bb0;font-size:7.5pt;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #2c3a4d;padding-bottom:2px;margin:8px 0 4px 0;'>SERVICES</div><div style='color:#c9d6e4;font-size:8.5pt;'>School: <strong style='color:#ffffff;'>{expression/expr40}</strong><br />Fire: <strong style='color:#ffffff;'>{expression/expr26}</strong> &#183; Police: <strong style='color:#ffffff;'>{expression/expr27}</strong></div><div style='color:#6f8bb0;font-size:7.5pt;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #2c3a4d;padding-bottom:2px;margin:8px 0 4px 0;'>STAFF &amp; CONTACTS</div><div style='color:#c9d6e4;font-size:8.5pt;'>Area planner: <strong style='color:#ffffff;'>{expression/expr50}</strong><div style='display:{expression/expr53};margin-top:2px;'>Case planner: <strong style='color:#ffffff;'>{expression/expr52}</strong></div><details style='margin-top:6px;'><summary style='cursor:pointer;color:#8fa3ba;font-size:8pt;letter-spacing:.03em;'>Inspector assignments (Building Safety)</summary><table style='width:100%;border-collapse:collapse;margin-top:4px;'><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Building</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr57}</td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Electrical</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr58}</td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Housing</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr59}</td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Mechanical</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr60}</td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Plumbing</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr61}</td></tr></table><div style='margin-top:4px;font-size:7.5pt;color:#ffe3ad;background-color:#4d3305;border-radius:4px;padding:4px 6px;'>Assignment dates for these areas range from roughly two years old to a few weeks old &mdash; confirm before relying on this for anything more than a starting point.</div></details></div><div style='margin-top:8px;border-top:1px solid #2c3a4d;padding-top:7px;'><a href='https://orion.lancaster.ne.gov/appraisal/publicaccess/PropertyDetail.aspx?PropertyNumber={PARCELID}' target='_blank' rel='noopener noreferrer' style='display:inline-block;background-color:#24354d;color:#cfe8ff;text-decoration:none;font-size:8pt;font-weight:bold;padding:4px 8px;border-radius:4px;margin:0 4px 4px 0;'>Assessor Record</a><a href='{expression/expr35}' target='_blank' rel='noopener noreferrer' style='display:{expression/expr36};background-color:#24354d;color:#cfe8ff;text-decoration:none;font-size:8pt;font-weight:bold;padding:4px 8px;border-radius:4px;margin:0 4px 4px 0;'>Google Maps</a><a href='{expression/expr49}' target='_blank' rel='noopener noreferrer' title='Nearest street-level panorama to the parcel (may be unavailable on new or rural streets - use Google Maps if black screen)' style='display:{expression/expr36};background-color:#24354d;color:#cfe8ff;text-decoration:none;font-size:8pt;font-weight:bold;padding:4px 8px;border-radius:4px;margin:0 4px 4px 0;'>Street View</a><a href='{expression/expr10}' target='_blank' rel='noopener noreferrer' style='display:inline-block;background-color:#24354d;color:#cfe8ff;text-decoration:none;font-size:8pt;font-weight:bold;padding:4px 8px;border-radius:4px;margin:0 4px 4px 0;'>Sectional Map</a></div></div>"}],"description":"<div style='font-family:\"Segoe UI\", Arial, sans-serif;background-color:#141a22;border:1px solid #2c3a4d;border-radius:8px;padding:10px;color:#e8eef5;font-size:9.5pt;line-height:1.4;'><div style='margin-bottom:2px;'><span style='color:#8fa3ba;font-size:8pt;'>PID</span> <strong style='color:#ffffff;font-size:9.5pt;'>{PARCELID}</strong></div><div style='color:#c9d6e4;font-size:8.5pt;margin-bottom:2px;'>{OWNERNME1}</div><div style='color:#8fa3ba;font-size:8pt;margin-bottom:4px;'>{expression/expr38}</div><div style='display:{expression/expr31};background-color:#5b1111;border:1px solid #b04444;border-radius:6px;padding:6px 8px;margin:6px 0;color:#ffd9d9;font-size:9pt;'><strong>&#9888; FEMA: {expression/expr16}</strong></div><div style='display:{expression/expr30};background-color:#4d3305;border:1px solid #90661a;border-radius:6px;padding:6px 8px;margin:6px 0;color:#ffe3ad;font-size:8.5pt;'><strong>&#9888; Overlay districts:</strong> {expression/expr29}</div><div style='color:#6f8bb0;font-size:7.5pt;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #2c3a4d;padding-bottom:2px;margin:8px 0 4px 0;'>ZONING &amp; LAND USE</div><table style='width:100%;border-collapse:collapse;'><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Zoning</td><td style='padding:2px 0;vertical-align:top;'><a href='{expression/expr0}' target='_blank' rel='noopener noreferrer' style='color:#7cc4ff;text-decoration:none;'><strong>{expression/expr1}</strong></a></td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Floodplain</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr16}</td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Existing use</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr3}</td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Future use</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr17}</td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Growth tier</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr18}</td></tr><tr style='display:{expression/expr33};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Subdivision</td><td style='padding:2px 0;vertical-align:top;'><a href='https://app.lincoln.ne.gov/aspx/cnty/survey/default.aspx?cmd=Final%20Plats&amp;SubDiv={CNVYNAME}' target='_blank' rel='noopener noreferrer' title='Open final plats for this subdivision' style='color:#7cc4ff;text-decoration:none;font-size:9pt;'><strong>{CNVYNAME}</strong></a></td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Area</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr2} ac &#183; {expression/expr41} ft&#178; &#177;</td></tr></table><div style='display:{expression/expr32};'><div style='color:#6f8bb0;font-size:7.5pt;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #2c3a4d;padding-bottom:2px;margin:8px 0 4px 0;'>DEVELOPMENT ACTIVITY</div><table style='width:100%;border-collapse:collapse;'><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Project</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr8}</td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Approved plan</td><td style='padding:2px 0;vertical-align:top;'><a href='https://app.lincoln.ne.gov/aspx/city/pats/default.aspx?AppNum={expression/expr5}' target='_blank' rel='noopener noreferrer' style='color:#7cc4ff;text-decoration:none;font-size:9pt;'><strong>{expression/expr5}</strong></a></td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Amendment</td><td style='padding:2px 0;vertical-align:top;'><a href='https://app.lincoln.ne.gov/aspx/city/pats/default.aspx?AppNum={expression/expr7}' target='_blank' rel='noopener noreferrer' style='color:#7cc4ff;text-decoration:none;font-size:9pt;'><strong>{expression/expr7}</strong></a></td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Parent app</td><td style='padding:2px 0;vertical-align:top;'><a href='https://app.lincoln.ne.gov/aspx/city/pats/default.aspx?AppNum={expression/expr6}' target='_blank' rel='noopener noreferrer' style='color:#7cc4ff;text-decoration:none;font-size:9pt;'><strong>{expression/expr6}</strong></a></td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Applications</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr4}</td></tr><tr><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Subdiv. permit</td><td style='padding:2px 0;vertical-align:top;'><a href='https://app.lincoln.ne.gov/aspx/docview.aspx?path=//CitySubs//&amp;project=plangis&amp;ext=pdf&amp;cmd=View&amp;filename={expression/expr15}' target='_blank' rel='noopener noreferrer' style='color:#7cc4ff;text-decoration:none;font-size:9pt;'><strong>{expression/expr15}</strong></a></td></tr><tr style='display:{expression/expr53};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Planner</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr52}</td></tr><tr style='display:{expression/expr39};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Annex. agmt.</td><td style='padding:2px 0;vertical-align:top;'><a href='https://www.lincoln.ne.gov/City/Departments/Planning-Department/Development-Review/Annexations/Annexation-Agreements' target='_blank' rel='noopener noreferrer' style='color:#7cc4ff;text-decoration:none;font-size:9pt;'><strong>Resolution {expression/expr14}</strong></a></td></tr></table></div><div style='color:#6f8bb0;font-size:7.5pt;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #2c3a4d;padding-bottom:2px;margin:8px 0 4px 0;'>PROPERTY</div><div style='color:#c9d6e4;font-size:8pt;margin-bottom:4px;'>{PRPRTYDSCRP}</div><table style='width:100%;border-collapse:collapse;margin-bottom:4px;'><tr style='display:{expression/expr42};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Class</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{CLASSDSCRP}</td></tr><tr style='display:{expression/expr44};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Built</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr43}</td></tr><tr style='display:{expression/expr46};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Floor area</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr45} ft&#178;</td></tr><tr style='display:{expression/expr48};'><td style='color:#8fa3ba;font-size:8pt;padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap;'>Assessed</td><td style='color:#ffffff;font-weight:bold;padding:2px 0;vertical-align:top;font-size:9pt;'>{expression/expr47}</td></tr></table><div style='display:{expression/expr34};margin:4px 0;'><a href='https://orion.lancaster.ne.gov/appraisal/publicaccess/PropertyDetail.aspx?PropertyNumber={PARCELID}' target='_blank' rel='noopener noreferrer' title='Open Assessor property record'><img src='{PHOTOPATH}' alt='Property photo' style='width:100%;border-radius:5px;border:1px solid #2c3a4d;' /></a></div><div style='color:#6f8bb0;font-size:7.5pt;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #2c3a4d;padding-bottom:2px;margin:8px 0 4px 0;'>SERVICES</div><div style='color:#c9d6e4;font-size:8.5pt;'>School: <strong style='color:#ffffff;'>{expression/expr40}</strong><br />Fire: <strong style='color:#ffffff;'>{expression/expr26}</strong> &#183; Police: <strong style='color:#ffffff;'>{expression/expr27}</strong><br />Area planner: <strong style='color:#ffffff;'>{expression/expr50}</strong></div><div style='margin-top:8px;border-top:1px solid #2c3a4d;padding-top:7px;'><a href='https://orion.lancaster.ne.gov/appraisal/publicaccess/PropertyDetail.aspx?PropertyNumber={PARCELID}' target='_blank' rel='noopener noreferrer' style='display:inline-block;background-color:#24354d;color:#cfe8ff;text-decoration:none;font-size:8pt;font-weight:bold;padding:4px 8px;border-radius:4px;margin:0 4px 4px 0;'>Assessor Record</a><a href='{expression/expr35}' target='_blank' rel='noopener noreferrer' style='display:{expression/expr36};background-color:#24354d;color:#cfe8ff;text-decoration:none;font-size:8pt;font-weight:bold;padding:4px 8px;border-radius:4px;margin:0 4px 4px 0;'>Google Maps</a><a href='{expression/expr49}' target='_blank' rel='noopener noreferrer' title='Nearest street-level panorama to the parcel (may be unavailable on new or rural streets - use Google Maps if black screen)' style='display:{expression/expr36};background-color:#24354d;color:#cfe8ff;text-decoration:none;font-size:8pt;font-weight:bold;padding:4px 8px;border-radius:4px;margin:0 4px 4px 0;'>Street View</a><a href='{expression/expr10}' target='_blank' rel='noopener noreferrer' style='display:inline-block;background-color:#24354d;color:#cfe8ff;text-decoration:none;font-size:8pt;font-weight:bold;padding:4px 8px;border-radius:4px;margin:0 4px 4px 0;'>Sectional Map</a></div></div>","expressionInfos":[{"name":"expr0","title":"zoningLink","expression":"var zoningLyr = FeatureSetByName($map, \"Zoning\")\r\nvar parFeature = (Buffer($feature, -10, 'feet'))\r\nvar intersectLayer = Intersects(zoningLyr, parFeature)\r\nvar zoningLink = \"\"\r\nvar intLayCnt = Count(intersectLayer)\r\nfor (var f in intersectLayer){\r\n if (f.JURISDICTION == \"Lincoln\"){\r\n zoningLink = Decode(f.ZONE,\r\n 'AG','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11521',\r\n 'AGR','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11531',\r\n 'B-1','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11678',\r\n 'B-2','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11689',\r\n 'B-3','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11703',\r\n 'B-4','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11714',\r\n 'B-5','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11725',\r\n 'H-1','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11738',\r\n 'H-2','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11749',\r\n 'H-3','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11760',\r\n 'H-4','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11771',\r\n 'I-1','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11783',\r\n 'I-2','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11794',\r\n 'I-3','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11806',\r\n 'O-1','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11630',\r\n 'O-2','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-12525',\r\n 'O-3','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11652',\r\n 'P','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11922',\r\n 'R-1','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11541',\r\n 'R-2','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11552',\r\n 'R-3','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11563',\r\n 'R-4','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11574',\r\n 'R-5','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11585',\r\n 'R-6','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11596',\r\n 'R-7','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11607',\r\n 'R-8','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11618',\r\n 'R-T','https://online.encodeplus.com/regs/lincoln-ne/doc-viewer.aspx#secid-11665',\r\n 'Other')\r\n }\r\n else if (f.JURISDICTION == \"County\"){\r\n zoningLink = Decode(f.ZONE,\r\n 'AG','http://online.encodeplus.com/regs/lincoln-ne-lcz/doc-viewer.aspx#secid-156',\r\n 'AGR','http://online.encodeplus.com/regs/lincoln-ne-lcz/doc-viewer.aspx#secid-165',\r\n 'B','http://online.encodeplus.com/regs/lincoln-ne-lcz/doc-viewer.aspx#secid-183',\r\n 'I','http://online.encodeplus.com/regs/lincoln-ne-lcz/doc-viewer.aspx#secid-192',\r\n 'R','http://online.encodeplus.com/regs/lincoln-ne-lcz/doc-viewer.aspx#secid-174',\r\n 'Other')\r\n }\r\n else if (f.JURISDICTION == \"Hickman\"){\r\n zoningLink = 'https://lancaster.ne.gov/hickman/default.aspx'\r\n }\r\n else if (f.JURISDICTION == \"Bennett\"){\r\n zoningLink = 'https://lancaster.ne.gov/bennett/default.aspx'\r\n }\r\n else if (f.JURISDICTION == \"Ceresco\"){\r\n zoningLink = 'https://www.cerescone.com/'\r\n }\r\n else if (f.JURISDICTION == \"Cortland\"){\r\n zoningLink = 'https://lancaster.ne.gov/cortland/default.aspx'\r\n }\r\n else if (f.JURISDICTION == \"Crete\"){\r\n zoningLink = 'https://www.crete.ne.gov/'\r\n }\r\n else if (f.JURISDICTION == \"Davey\"){\r\n zoningLink = 'https://lancaster.ne.gov/davey/default.aspx'\r\n }\r\n else if (f.JURISDICTION == \"Denton\"){\r\n zoningLink = 'https://lancaster.ne.gov/denton/default.aspx'\r\n }\r\n else if (f.JURISDICTION == \"Firth\"){\r\n zoningLink = 'https://lancaster.ne.gov/firth/default.aspx'\r\n }\r\n else if (f.JURISDICTION == \"Hallam\"){\r\n zoningLink = 'https://lancaster.ne.gov/hallam/default.aspx'\r\n }\r\n else if (f.JURISDICTION == \"Malcolm\"){\r\n zoningLink = 'https://lancaster.ne.gov/malcolm/default.aspx'\r\n }\r\n else if (f.JURISDICTION == \"Hickman\"){\r\n zoningLink = 'https://lancaster.ne.gov/hickman/default.aspx'\r\n }\r\n else if (f.JURISDICTION == \"Panama\"){\r\n zoningLink = 'https://lancaster.ne.gov/panama/default.aspx'\r\n }\r\n else if (f.JURISDICTION == \"Raymond\"){\r\n zoningLink = 'https://lancaster.ne.gov/raymond/default.aspx'\r\n }\r\n else if (f.JURISDICTION == \"Roca\"){\r\n zoningLink = 'https://lancaster.ne.gov/roca/default.aspx'\r\n }\r\n else if (f.JURISDICTION == \"Sprague\"){\r\n zoningLink = 'https://lancaster.ne.gov/sprague/default.aspx'\r\n }\r\n else if (f.JURISDICTION == \"Pleasant Dale\"){\r\n zoningLink = 'https://pdale-ne.us/'\r\n }\r\n else if (f.JURISDICTION == \"Waverly\"){\r\n zoningLink = 'https://citywaverly.com'\r\n }\r\n}\r\nreturn zoningLink;","returnType":"string"},{"name":"expr1","title":"zoning","expression":"// Improved: collects ALL distinct zoning districts (original kept only the last one)\nvar zoningLyr = FeatureSetByName($map, \"Zoning\")\nvar parFeature = Buffer($feature, -10, 'feet')\nvar zones = []\nfor (var f in Intersects(zoningLyr, parFeature)) {\n    Push(zones, f.ZONE)\n}\nif (Count(zones) == 0) { return \"Unknown\" }\nreturn Concatenate(Sort(Distinct(zones)), ', ')","returnType":"string"},{"name":"expr2","title":"parAcres","expression":"// Write a script to return a value to show in the pop-up. \r\n// For example, get the average of 4 fields:\r\n// Average($feature.SalesQ1, $feature.SalesQ2, $feature.SalesQ3, $feature.SalesQ4)\r\nvar sqft = $feature[\"GIS_AREA\"]\r\nvar acres1 = (sqft/43560)\r\nvar acres2 = Round(acres1,2)\r\nreturn acres2","returnType":"number"},{"name":"expr3","title":"elu","expression":"var attributeLyr = FeatureSetByName($map, \"Existing Land Use (Planning)\")\r\nvar parFeature = (Buffer($feature, -10, 'feet'))\r\nvar intersectLayer = Intersects(attributeLyr, parFeature)\r\nvar attribute = []\r\nvar intLyrCt = Count(intersectLayer)\r\n//Console(\"count=\" + intLyrCt)\r\nif (intLyrCt > 0){\r\n for (var f in intersectLayer){\r\n Push(attribute, Decode(f.LUCODE,\r\n 11, \"Single Family Detached\",\r\n 12, \"Duplex\",\r\n 13, \"Single Family Attached\",\r\n 14, \"Apartments\", \r\n 15, \"Group Quarters\",\r\n 16, \"Special Housing\",\r\n 17, \"Mobile Homes, Parks and Courts\",\r\n 21, \"Commercial - NEC\",\r\n 22, \"Commercial w/Residential Units Above\",\r\n 23, \"Parking Lot\",\r\n 24, \"Parking Garage\",\r\n 31, \"Light Industrial\",\r\n 32, \"Heavy Industrial\",\r\n 33, \"Utility Facility\",\r\n 34, \"Railroad\",\r\n 35, \"Airports\",\r\n 41, \"Public & Semi-Public NEC\",\r\n 42, \"Educational Institutions\",\r\n 43, \"Churches, Synagogues and Temples\",\r\n 44, \"Hospitals\",\r\n 51, \"Park Land\",\r\n 52, \"Open Space\",\r\n 53, \"Golf Courses\",\r\n 61, \"Lakes\",\r\n 62, \"Streams and Creeks\",\r\n 63, \"Wetlands\",\r\n 64, \"Environmental Preserve\",\r\n 65, \"Forest/Woodlands\",\r\n 71, \"Public Right of Way\",\r\n 72, \"Vacated ROW\",\r\n 81, \"Agricultural Production:Crops/Tree Farms\",\r\n 82, \"Agricultural Production: Livestock & Animal/Feed Lots\",\r\n 83, \"Mining and Extraction\",\r\n 84, \"Pasture/Grassland\",\r\n 90, \"Vacant\", \"Other\")\r\n )}\r\n }\r\n else{\r\n attribute = \"No Existing Landuse Values Determined\"\r\n }\r\nreturn Concatenate(Sort(Distinct(attribute)), ', ');","returnType":"string"},{"name":"expr4","title":"applications","expression":"// Improved: returns \"None\" instead of \"No Applications returned\"\nvar attributeLyr = FeatureSetByName($map, \"Applications\")\nvar parFeature = Buffer($feature, -10, 'feet')\nvar intersectLayer = Intersects(attributeLyr, parFeature)\nvar attribute = []\nif (Count(intersectLayer) > 0) {\n    for (var f in intersectLayer) {\n        Push(attribute, f.APPNUM)\n    }\n} else {\n    Push(attribute, \"None\")\n}\nreturn Concatenate(Sort(Distinct(attribute)), ', ')","returnType":"string"},{"name":"expr5","title":"fap","expression":"var attributeLyr = FeatureSetByName($map, \"Final Approved Plans\")\r\nvar parFeature = (Buffer($feature, -10, 'feet'))\r\nvar intersectLayer = Intersects(attributeLyr, parFeature)\r\nvar attribute = []\r\nvar intLyrCt = Count(intersectLayer)\r\n//Console(\"count=\" + intLyrCt)\r\nif (intLyrCt > 0){\r\n for (var f in intersectLayer){\r\n Push(attribute, f.APPNUM)\r\n }\r\n }\r\nelse{\r\n Push(attribute, \"\")\r\n }\r\nreturn Concatenate(Sort(Distinct(attribute)), ', ');","returnType":"string"},{"name":"expr6","title":"parentApp","expression":"var attributeLyr = FeatureSetByName($map, \"Final Approved Plans\")\r\nvar parFeature = (Buffer($feature, -10, 'feet'))\r\nvar intersectLayer = Intersects(attributeLyr, parFeature)\r\nvar attribute = []\r\nvar intLyrCt = Count(intersectLayer)\r\n//Console(\"count=\" + intLyrCt)\r\nif (intLyrCt > 0){\r\n for (var f in intersectLayer){\r\n Push(attribute, f.ParentApp)\r\n }\r\n }\r\nelse{\r\n Push(attribute, \"\")\r\n }\r\nreturn Concatenate(Sort(Distinct(attribute)), ', ');","returnType":"string"},{"name":"expr7","title":"AmmendApp","expression":"var attributeLyr = FeatureSetByName($map, \"Final Approved Plans\")\r\nvar parFeature = (Buffer($feature, -10, 'feet'))\r\nvar intersectLayer = Intersects(attributeLyr, parFeature)\r\nvar attribute = []\r\nvar intLyrCt = Count(intersectLayer)\r\n//Console(\"count=\" + intLyrCt)\r\nif (intLyrCt > 0){\r\n for (var f in intersectLayer){\r\n Push(attribute, f.ApproveApp)\r\n }\r\n }\r\nelse{\r\n Push(attribute, \"\")\r\n }\r\nreturn Concatenate(Sort(Distinct(attribute)), ', ');","returnType":"string"},{"name":"expr8","title":"fapName","expression":"var attributeLyr = FeatureSetByName($map, \"Final Approved Plans\")\r\nvar parFeature = (Buffer($feature, -10, 'feet'))\r\nvar intersectLayer = Intersects(attributeLyr, parFeature)\r\nvar attribute = []\r\nvar intLyrCt = Count(intersectLayer)\r\n//Console(\"count=\" + intLyrCt)\r\nif (intLyrCt > 0){\r\n for (var f in intersectLayer){\r\n Push(attribute, f.Title)\r\n }\r\n }\r\nelse{\r\n Push(attribute, \"\")\r\n }\r\nreturn Concatenate(Sort(Distinct(attribute)), ', ');","returnType":"string"},{"name":"expr10","title":"str","expression":"var attributeLyr = FeatureSetByName($map, \"PLSS - Sections\")\r\nvar parFeature = (Buffer($feature, -10, 'feet'))\r\nvar intersectLayer = Intersects(attributeLyr, parFeature)\r\nvar attribute = \"\"\r\nvar intLyrCt = Count(intersectLayer)\r\n//Console(\"count=\" + intLyrCt)\r\nif (intLyrCt > 0){\r\n for (var f in intersectLayer){\r\n attribute = \"https://app.lincoln.ne.gov/aspx/docview.aspx?path=&#92;sectionals&#92;&project=plangis&ext=pdf&cmd=View&filename=l\" + Replace(f.FRSTDIVID, \"-\", \"\")\r\n }\r\n }\r\nelse{\r\n Push(attribute, \"\")\r\n }\r\n//return Concatenate(Sort(Distinct(attribute)), ', ');\r\nreturn attribute","returnType":"string"},{"name":"expr14","title":"annexAgr","expression":"var attributeLyr = FeatureSetByName($map, \"Annexation Agreements\")\r\nvar parFeature = (Buffer($feature, -10, 'feet'))\r\nvar intersectLayer = Intersects(attributeLyr, parFeature)\r\nvar attribute = []\r\nvar intLyrCt = Count(intersectLayer)\r\n//Console(\"count=\" + intLyrCt)\r\nif (intLyrCt > 0){\r\n for (var f in intersectLayer){\r\n Push(attribute, f.RESNO) //or AXNUM\r\n }\r\n }\r\nelse{\r\n Push(attribute, \"\")\r\n }\r\nreturn Concatenate(Sort(Distinct(attribute)), ', ');","returnType":"string"},{"name":"expr15","title":"citySubdv","expression":"var attributeLyr = FeatureSetByName($map, \"City Subdivision Permits\")\r\nvar parFeature = (Buffer($feature, -10, 'feet'))\r\nvar intersectLayer = Intersects(attributeLyr, parFeature)\r\nvar attribute = []\r\nvar intLyrCt = Count(intersectLayer)\r\n//Console(\"count=\" + intLyrCt)\r\nif (intLyrCt > 0){\r\n for (var f in intersectLayer){\r\n Push(attribute, f.PermitNo) \r\n }\r\n }\r\nelse{\r\n Push(attribute, \"\")\r\n }\r\nreturn Concatenate(Sort(Distinct(attribute)), ', ');","returnType":"string"},{"name":"expr16","title":"flood","expression":"// v8: Zone A is a Special Flood Hazard Area too. Testing only for 'AE' reported roughly 1,460\n// parcels as \"None mapped\" while they sit in the regulatory 100-year floodplain -- Zone A differs\n// from AE only in having no determined base flood elevation, and is used over rural/unstudied\n// reaches. Measured 2026-08-28: 1,506 parcels intersect Zone A; 39 of a 40-parcel sample touch\n// Zone A only. FLOODWAY is checked outside the zone branch because it is a separate designation.\nvar attributeLyr = FeatureSetByName($map, \"FEMA Floodplain\")\nvar parFeature = Buffer($feature, -10, 'feet')\nvar intersectLayer = Intersects(attributeLyr, parFeature)\nvar parts = []\nfor (var f in intersectLayer) {\n    var z = f.FLD_ZONE\n    if (z == 'AE') {\n        Push(parts, '100-Year Floodplain (Zone AE)')\n    } else if (z == 'A') {\n        Push(parts, '100-Year Floodplain (Zone A - no base flood elevation determined)')\n    }\n    if (f.FLOODWAY == 'FLOODWAY') {\n        Push(parts, 'FLOODWAY')\n    }\n}\nif (Count(parts) == 0) { return 'None mapped' }\nreturn Concatenate(Sort(Distinct(parts)), ' + ')","returnType":"string"},{"name":"expr17","title":"flu","expression":"var attributeLyr = FeatureSetByName($map, \"Future Land Use (2050 Comp Plan)\")\r\nvar parFeature = (Buffer($feature, -10, 'feet'))\r\nvar intersectLayer = Intersects(attributeLyr, parFeature)\r\nvar attribute = []\r\nvar intLyrCt = Count(intersectLayer)\r\n//Console(\"count=\" + intLyrCt)\r\nif (intLyrCt > 0){\r\n for (var f in intersectLayer){\r\n Push(attribute, f.CAT) //or \r\n }\r\n }\r\nelse{\r\n Push(attribute, \"\")\r\n }\r\nreturn Concatenate(Sort(Distinct(attribute)), ', ');","returnType":"string"},{"name":"expr18","title":"gt2050","expression":"// Improved: em-dash instead of blank when parcel is outside all growth tiers\nvar attributeLyr = FeatureSetByName($map, \"Growth Tiers (2050 Comp Plan)\")\nvar parFeature = Buffer($feature, -10, 'feet')\nvar intersectLayer = Intersects(attributeLyr, parFeature)\nvar attribute = []\nfor (var f in intersectLayer) {\n    Push(attribute, f.Tier)\n}\nif (Count(attribute) == 0) { return '\u2014' }\nreturn Concatenate(Sort(Distinct(attribute)), ', ')","returnType":"string"},{"name":"expr26","title":"Fire","expression":"var attributeLyr = FeatureSetByName($map, \"Fire Districts\")\nif (attributeLyr == null) { return '\u2014' }\nvar parFeature = Buffer($feature, -10, 'feet')\nif (parFeature == null) { parFeature = $feature }\nvar intersectLayer = Intersects(attributeLyr, parFeature)\nvar attribute = []\nvar intLyrCt = Count(intersectLayer)\nif (intLyrCt > 0){\n for (var f in intersectLayer){\n Push(attribute, f.Dist_Name)\n }\n }\nelse{\n Push(attribute, \"N/A\")\n }\nreturn Concatenate(Sort(Distinct(attribute)), ', ');","returnType":"string"},{"name":"expr27","title":"LPDLSO","expression":"// Write a script to return a value to show in the pop-up. \n// For example, get the average of 4 fields:\n// Average($feature.SalesQ1, $feature.SalesQ2, $feature.SalesQ3, $feature.SalesQ4)\nvar attributeLyr1 = FeatureSetById($map, \"18df1907f67-layer-10\")\nvar attributeLyr2 = FeatureSetById($map, \"18df190b139-layer-11\")\nvar attributeLyr3 = FeatureSetById($map, \"18df18f78c7-layer-7\")\n//Console(\"one\")\nvar parFeature = (Buffer($feature, -10, 'feet'))\nvar intersectLayer1 = Intersects(attributeLyr1, parFeature)\nvar intersectLayer2 = Intersects(attributeLyr2, parFeature)\nvar intersectLayer3 = Intersects(attributeLyr3, parFeature)\n//Console(\"two\")\nvar intLyrCt1 = Count(intersectLayer1)\n//Console(Text(intLyrCt1))\nvar intLyrCt2 = Count(intersectLayer2)\n//Console(Text(intLyrCt2))\nvar intLyrCt3 = Count(intersectLayer3)\n//Console(Text(intLyrCt3))\nvar attribute = []\n//Console(\"three\")\nWhen(\n intLyrCt1 == 1, Push(attribute, \"Lincoln Police Department\"),\n intLyrCt2 == 1, Push(attribute, \"Lancaster Co. Sheriff\"),\n intLyrCt3 == 1, Push(attribute, \"Lancaster Co. Sheriff\"),\n Push(attribute, \"Lancaster Co. Sheriff\")\n )\nreturn Concatenate(Sort(Distinct(attribute)), ', ');","returnType":"string"},{"name":"expr29","title":"ovlText","expression":"// NEW: one combined line of overlay/constraint findings (empty string when none)\nvar pf = Buffer($feature, -10, 'feet')\nvar parts = []\nfor (var f in Intersects(FeatureSetByName($map, \"Historic Preservation Districts\"), pf)) {\n    Push(parts, \"Historic District: \" + f.NAME)\n}\nfor (var f in Intersects(FeatureSetByName($map, \"Historic Preservation Sites\"), pf)) {\n    Push(parts, \"Historic Site: \" + f.Name)\n}\nfor (var f in Intersects(FeatureSetByName($map, \"Building Design Standard Boundaries\"), pf)) {\n    Push(parts, \"Design Review: \" + f.ReviewType)\n}\nfor (var f in Intersects(FeatureSetByName($map, \"Airport Authority Boundary - Avigation Zone\"), pf)) {\n    Push(parts, \"Airport Zoning: \" + f.DESCRIP)\n}\nfor (var f in Intersects(FeatureSetByName($map, \"Capitol Environs District Height Restrictions\"), pf)) {\n    Push(parts, \"Capitol Environs: \" + Decode(f.POLY_CODE, 1, \"57 ft height limit\", 2, \"45 ft height limit\", \"height restriction\"))\n}\nfor (var f in Intersects(FeatureSetByName($map, \"Capitol View Overlay Districts\"), pf)) {\n    Push(parts, \"Capitol View Overlay: \" + f.DISTRICT)\n}\nif (Count(Intersects(FeatureSetByName($map, \"Capitol View Corridors\"), pf)) > 0) {\n    Push(parts, \"Capitol View Corridor\")\n}\nreturn Concatenate(Distinct(parts), '   |   ')","returnType":"string"},{"name":"expr30","title":"ovlShow","expression":"// NEW: 'block' when any overlay constraint applies, else 'none' (drives flag visibility)\nvar pf = Buffer($feature, -10, 'feet')\nif (Count(Intersects(FeatureSetByName($map, \"Historic Preservation Districts\"), pf)) > 0) { return 'block' }\nif (Count(Intersects(FeatureSetByName($map, \"Historic Preservation Sites\"), pf)) > 0) { return 'block' }\nif (Count(Intersects(FeatureSetByName($map, \"Building Design Standard Boundaries\"), pf)) > 0) { return 'block' }\nif (Count(Intersects(FeatureSetByName($map, \"Airport Authority Boundary - Avigation Zone\"), pf)) > 0) { return 'block' }\nif (Count(Intersects(FeatureSetByName($map, \"Capitol Environs District Height Restrictions\"), pf)) > 0) { return 'block' }\nif (Count(Intersects(FeatureSetByName($map, \"Capitol View Overlay Districts\"), pf)) > 0) { return 'block' }\nif (Count(Intersects(FeatureSetByName($map, \"Capitol View Corridors\"), pf)) > 0) { return 'block' }\nreturn 'none'","returnType":"string"},{"name":"expr31","title":"floodShow","expression":"// v8: 'block' when the parcel touches ANY Special Flood Hazard Area, Zone A as well as Zone AE.\n// Previously AE-only, which silently withheld the flood warning banner from Zone A parcels.\nvar pf = Buffer($feature, -10, 'feet')\nfor (var f in Intersects(FeatureSetByName($map, \"FEMA Floodplain\"), pf)) {\n    if (f.FLD_ZONE == 'AE' || f.FLD_ZONE == 'A') { return 'block' }\n}\nreturn 'none'","returnType":"string"},{"name":"expr32","title":"devShow","expression":"// NEW: 'block' when any development-review record touches the parcel, else 'none'\nvar pf = Buffer($feature, -10, 'feet')\nif (Count(Intersects(FeatureSetByName($map, \"Final Approved Plans\"), pf)) > 0) { return 'block' }\nif (Count(Intersects(FeatureSetByName($map, \"Applications\"), pf)) > 0) { return 'block' }\nif (Count(Intersects(FeatureSetByName($map, \"City Subdivision Permits\"), pf)) > 0) { return 'block' }\nif (Count(Intersects(FeatureSetByName($map, \"Annexation Agreements\"), pf)) > 0) { return 'block' }\nreturn 'none'","returnType":"string"},{"name":"expr33","title":"subdivShow","expression":"// NEW (no query): hide Subdivision row when parcel has no subdivision name\nreturn IIf(IsEmpty($feature.CNVYNAME), 'none', 'table-row')","returnType":"string"},{"name":"expr34","title":"photoShow","expression":"// NEW (no query): hide photo block when no real photo (empty or county no-photo placeholder)\nvar p = $feature.PHOTOPATH\nreturn IIf(IsEmpty(p) || Find('NoPropPhoto', p) > -1, 'none', 'block')","returnType":"string"},{"name":"expr35","title":"gmap","expression":"// NEW (no query): Google Maps search URL from the site address\nvar addr = DefaultValue($feature.SITEADDRESS, '')\nreturn 'https://www.google.com/maps/search/?api=1&query=' + UrlEncode(addr + ', Lancaster County, NE')","returnType":"string"},{"name":"expr36","title":"gmapShow","expression":"// NEW (no query): hide Google Maps action when parcel has no site address\nreturn IIf(IsEmpty($feature.SITEADDRESS), 'none', 'inline-block')","returnType":"string"},{"name":"expr37","title":"title","expression":"// NEW (no query): popup title = site address, falling back to parcel PID\nvar addr = $feature.SITEADDRESS\nreturn IIf(IsEmpty(addr), 'Parcel ' + $feature.PARCELID, addr)","returnType":"string"},{"name":"expr38","title":"jurisAnnex","expression":"// NEW: jurisdiction line with annexation year folded in (replaces expr28 + expr11 rows)\nvar pf = Buffer($feature, -10, 'feet')\nvar cityLimits = FeatureSetById($map, \"18df1907f67-layer-10\")\nvar threeMile = FeatureSetById($map, \"18df190b139-layer-11\")\nif (Count(Intersects(cityLimits, pf)) > 0) {\n    var yrs = []\n    for (var f in Intersects(FeatureSetByName($map, \"Annexations\"), pf)) {\n        Push(yrs, f.ANNEXYR)\n    }\n    var y = Concatenate(Sort(Distinct(yrs)), ', ')\n    return IIf(IsEmpty(y) || y == '', 'Lincoln City Limits', 'Lincoln City Limits (annexed ' + y + ')')\n}\nif (Count(Intersects(threeMile, pf)) > 0) {\n    return 'Lincoln 3-Mile ETJ'\n}\nreturn 'Lancaster County / Village'","returnType":"string"},{"name":"expr39","title":"annexAgrShow","expression":"// NEW: show annexation-agreement row only when an agreement touches the parcel\nvar pf = Buffer($feature, -10, 'feet')\nreturn IIf(Count(Intersects(FeatureSetByName($map, \"Annexation Agreements\"), pf)) > 0, 'table-row', 'none')","returnType":"string"},{"name":"expr40","title":"school","expression":"// NEW (no query): school district with em-dash fallback\nreturn DefaultValue($feature.SCHLDSCRP, '\u2014')","returnType":"string"},{"name":"expr41","title":"sqft","expression":"// NEW (no query): thousands-separated square footage (consistent across renderers)\nreturn Text(Round($feature.GIS_AREA, 0), '#,###')","returnType":"string"},{"name":"expr42","title":"classShow","expression":"// NEW v3 (no query): hide Class row when property class is empty\nreturn IIf(IsEmpty($feature.CLASSDSCRP), 'none', 'table-row')","returnType":"string"},{"name":"expr43","title":"builtText","expression":"// NEW v3 (no query): year built plus structure type, e.g. '2004 \u00b7 1 Story'\nvar s = Text($feature.RESYRBLT, '####')\nif (!IsEmpty($feature.RESSTRTYP)) { s = s + ' \u00b7 ' + $feature.RESSTRTYP }\nreturn s","returnType":"string"},{"name":"expr44","title":"builtShow","expression":"// NEW v3 (no query): hide Built row when no residential year built\nreturn IIf($feature.RESYRBLT > 0, 'table-row', 'none')","returnType":"string"},{"name":"expr45","title":"flrareaText","expression":"// NEW v3 (no query): thousands-separated residential floor area\nreturn Text(Round($feature.RESFLRAREA, 0), '#,###')","returnType":"string"},{"name":"expr46","title":"flrareaShow","expression":"// NEW v3 (no query): hide Floor area row when zero/empty\nreturn IIf($feature.RESFLRAREA > 0, 'table-row', 'none')","returnType":"string"},{"name":"expr47","title":"assessedText","expression":"// NEW v3 (no query): current assessed value as dollars\nreturn Text(Round($feature.CNTASSDVAL, 0), '$#,###')","returnType":"string"},{"name":"expr48","title":"assessedShow","expression":"// NEW v3 (no query): hide Assessed row when zero/empty\nreturn IIf($feature.CNTASSDVAL > 0, 'table-row', 'none')","returnType":"string"},{"name":"expr49","title":"svLink","returnType":"string","expression":"// NEW v4 (no query): Google Street View at parcel centroid (documented Maps URLs API)\nvar g = Centroid(Geometry($feature))\nif (IsEmpty(g)) { return '' }\nvar lon = g.x * 180.0 / 20037508.342787\nvar lat = (Atan(Exp(g.y / 6378137.0)) * 2 - PI / 2) * 180.0 / PI\nreturn 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + Text(lat, '#.000000') + ',' + Text(lon, '#.000000')"},{"name":"expr50","title":"areaPlanner","returnType":"string","expression":"// NEW v5: geographic duty planner from Development Review Areas (runtime-added layer)\nvar fs = FeatureSetByName($map, \"Development Review Areas\")\nif (fs == null) { return '\u2014' }\nvar pf = Buffer($feature, -10, 'feet')\nvar parts = []\nfor (var f in Intersects(fs, pf)) {\n    var n = IIf(f.Region == 'Village', 'Village of ' + f.Planner, f.Planner)\n    if (!IsEmpty(f.Phone)) { n = n + ' \u00b7 ' + f.Phone }\n    Push(parts, n)\n}\nif (Count(parts) == 0) { return '\u2014' }\nreturn Concatenate(Distinct(parts), ', ')"},{"name":"expr52","title":"casePlanner","returnType":"string","expression":"// NEW v5: case planner(s) of applications touching this parcel (PATS PLANNER_ASSIGNED)\nvar pf = Buffer($feature, -10, 'feet')\nvar parts = []\nfor (var f in Intersects(FeatureSetByName($map, \"Applications View\"), pf)) {\n    if (!IsEmpty(f.PLANNER_ASSIGNED)) { Push(parts, f.PLANNER_ASSIGNED) }\n}\nreturn Concatenate(Sort(Distinct(parts)), ', ')"},{"name":"expr53","title":"casePlannerShow","returnType":"string","expression":"// NEW v5: show the case-planner row only when an application with a planner touches the parcel\nvar pf = Buffer($feature, -10, 'feet')\nfor (var f in Intersects(FeatureSetByName($map, \"Applications View\"), pf)) {\n    if (!IsEmpty(f.PLANNER_ASSIGNED)) { return 'table-row' }\n}\nreturn 'none'"},{"name":"expr54","title":"finalApprovedPlansShow","returnType":"string","expression":"// NEW v6: show Project / Approved plan / Amendment / Parent app rows only when\n// a Final Approved Plans record touches the parcel -- all four read fields off\n// the same intersecting record(s) (see expr8/expr5/expr7/expr6), so one shared gate.\nvar pf = Buffer($feature, -10, 'feet')\nif (pf == null) { pf = $feature }\nreturn IIf(Count(Intersects(FeatureSetByName($map, \"Final Approved Plans\"), pf)) > 0, 'table-row', 'none')"},{"name":"expr55","title":"citySubdivShow","returnType":"string","expression":"// NEW v6: show Subdiv. permit row only when a City Subdivision Permits record touches the parcel\nvar pf = Buffer($feature, -10, 'feet')\nif (pf == null) { pf = $feature }\nreturn IIf(Count(Intersects(FeatureSetByName($map, \"City Subdivision Permits\"), pf)) > 0, 'table-row', 'none')"},{"name":"expr56","title":"devActivityEmptyShow","returnType":"string","expression":"// NEW v6: inverse of expr32 -- 'block' (show the empty-state line) only when NONE of the\n// four development-review record types touch the parcel\nvar pf = Buffer($feature, -10, 'feet')\nif (Count(Intersects(FeatureSetByName($map, \"Final Approved Plans\"), pf)) > 0) { return 'none' }\nif (Count(Intersects(FeatureSetByName($map, \"Applications\"), pf)) > 0) { return 'none' }\nif (Count(Intersects(FeatureSetByName($map, \"City Subdivision Permits\"), pf)) > 0) { return 'none' }\nif (Count(Intersects(FeatureSetByName($map, \"Annexation Agreements\"), pf)) > 0) { return 'none' }\nreturn 'block'"},{"name":"expr57","title":"inspectorBuilding","returnType":"string","expression":"// NEW v6: inspector(s)/phone assigned to this discipline's area, from BuildingSafety/InspectorAreas\nvar fs = FeatureSetByName($map, \"Inspector Areas - Building\")\nif (fs == null) { return '\u2014' }\nvar pf = Buffer($feature, -10, 'feet')\nif (pf == null) { pf = $feature }\nvar parts = []\nfor (var f in Intersects(fs, pf)) {\n    if (!IsEmpty(f.InspectorName)) {\n        var n = f.InspectorName\n        if (!IsEmpty(f.PhoneNumber)) { n = n + ' \u00b7 ' + f.PhoneNumber }\n        Push(parts, n)\n    }\n}\nif (Count(parts) == 0) { return '\u2014' }\nreturn Concatenate(Distinct(parts), ', ')"},{"name":"expr58","title":"inspectorElectrical","returnType":"string","expression":"// NEW v6: inspector(s)/phone assigned to this discipline's area, from BuildingSafety/InspectorAreas\nvar fs = FeatureSetByName($map, \"Inspector Areas - Electrical\")\nif (fs == null) { return '\u2014' }\nvar pf = Buffer($feature, -10, 'feet')\nif (pf == null) { pf = $feature }\nvar parts = []\nfor (var f in Intersects(fs, pf)) {\n    if (!IsEmpty(f.InspectorName)) {\n        var n = f.InspectorName\n        if (!IsEmpty(f.PhoneNumber)) { n = n + ' \u00b7 ' + f.PhoneNumber }\n        Push(parts, n)\n    }\n}\nif (Count(parts) == 0) { return '\u2014' }\nreturn Concatenate(Distinct(parts), ', ')"},{"name":"expr59","title":"inspectorHousing","returnType":"string","expression":"// NEW v6: inspector(s)/phone assigned to this discipline's area, from BuildingSafety/InspectorAreas\nvar fs = FeatureSetByName($map, \"Inspector Areas - Housing\")\nif (fs == null) { return '\u2014' }\nvar pf = Buffer($feature, -10, 'feet')\nif (pf == null) { pf = $feature }\nvar parts = []\nfor (var f in Intersects(fs, pf)) {\n    if (!IsEmpty(f.InspectorName)) {\n        var n = f.InspectorName\n        if (!IsEmpty(f.PhoneNumber)) { n = n + ' \u00b7 ' + f.PhoneNumber }\n        Push(parts, n)\n    }\n}\nif (Count(parts) == 0) { return '\u2014' }\nreturn Concatenate(Distinct(parts), ', ')"},{"name":"expr60","title":"inspectorMechanical","returnType":"string","expression":"// NEW v6: inspector(s)/phone assigned to this discipline's area, from BuildingSafety/InspectorAreas\nvar fs = FeatureSetByName($map, \"Inspector Areas - Mechanical\")\nif (fs == null) { return '\u2014' }\nvar pf = Buffer($feature, -10, 'feet')\nif (pf == null) { pf = $feature }\nvar parts = []\nfor (var f in Intersects(fs, pf)) {\n    if (!IsEmpty(f.InspectorName)) {\n        var n = f.InspectorName\n        if (!IsEmpty(f.PhoneNumber)) { n = n + ' \u00b7 ' + f.PhoneNumber }\n        Push(parts, n)\n    }\n}\nif (Count(parts) == 0) { return '\u2014' }\nreturn Concatenate(Distinct(parts), ', ')"},{"name":"expr61","title":"inspectorPlumbing","returnType":"string","expression":"// NEW v6: inspector(s)/phone assigned to this discipline's area, from BuildingSafety/InspectorAreas\nvar fs = FeatureSetByName($map, \"Inspector Areas - Plumbing\")\nif (fs == null) { return '\u2014' }\nvar pf = Buffer($feature, -10, 'feet')\nif (pf == null) { pf = $feature }\nvar parts = []\nfor (var f in Intersects(fs, pf)) {\n    if (!IsEmpty(f.InspectorName)) {\n        var n = f.InspectorName\n        if (!IsEmpty(f.PhoneNumber)) { n = n + ' \u00b7 ' + f.PhoneNumber }\n        Push(parts, n)\n    }\n}\nif (Count(parts) == 0) { return '\u2014' }\nreturn Concatenate(Distinct(parts), ', ')"}],"fieldInfos":[{"fieldName":"OBJECTID","isEditable":true,"label":"OBJECTID","visible":false},{"fieldName":"ASSDPCNTCG","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Assessed Value % Change","visible":true},{"fieldName":"ASSDVALYRCG","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Assessed Value Year Over Year Change","visible":true},{"fieldName":"NGHBRHDCD","isEditable":true,"label":"Assessing Neighbornood Code","visible":true},{"fieldName":"USECD","isEditable":true,"label":"Assessing Use Code","visible":true},{"fieldName":"USEDSCRP","isEditable":true,"label":"Assessing Use Description","visible":true},{"fieldName":"BLDGAREA","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Building Area","visible":true},{"fieldName":"CNTASSDVAL","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Current Assessed Value","visible":true},{"fieldName":"CNTSMRTXOD","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Current Summer Taxes Owed","visible":true},{"fieldName":"CNTTXBLVAL","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Current Taxable Value","visible":true},{"fieldName":"CNTWNTTXOD","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Current Winter Taxes Owed","visible":true},{"fieldName":"OWNERNME1","isEditable":true,"label":"First Owner Name","visible":true},{"fieldName":"GIS_AREA","isEditable":true,"label":"GIS Area","visible":true,"format":{"digitSeparator":true,"places":0}},{"fieldName":"LNDVALUE","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Land Value","visible":true},{"fieldName":"LGLSTARTDT","format":{"dateFormat":"longMonthDayYear","digitSeparator":false},"isEditable":true,"label":"Legal Start Date","visible":true},{"fieldName":"LOWPARCELID","isEditable":true,"label":"Lowest Parcel Identification Number","visible":true},{"fieldName":"FLOORCOUNT","format":{"digitSeparator":true,"places":0},"isEditable":true,"label":"Number of Floors","visible":true},{"fieldName":"PARCELID","isEditable":true,"label":"Parcel Identification Number","visible":true},{"fieldName":"PSTLADDRESS","isEditable":true,"label":"Postal Address","visible":true},{"fieldName":"PSTLCITY","isEditable":true,"label":"Postal City","visible":true},{"fieldName":"PSTLSTATE","isEditable":true,"label":"Postal State","visible":true},{"fieldName":"PSTLZIP4","isEditable":true,"label":"Postal Zip +4","visible":true},{"fieldName":"PSTLZIP5","isEditable":true,"label":"Postal Zip 5","visible":true},{"fieldName":"PRVASSDVAL","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Previous Assessed Value","visible":true},{"fieldName":"PRVSMRTXOD","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Previous Summer Taxes Owed","visible":true},{"fieldName":"PRVTXBLVAL","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Previous Taxable Value","visible":true},{"fieldName":"PRVWNTTXOD","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Previous Winter Taxes Owed","visible":true},{"fieldName":"CLASSDSCRP","isEditable":true,"label":"Property Class","visible":true},{"fieldName":"CLASSCD","isEditable":true,"label":"Property Class Code","visible":true},{"fieldName":"GREENBELT","isEditable":true,"label":"Property Greenbelt Status","visible":true},{"fieldName":"PRPRTYDSCRP","isEditable":true,"label":"Property Legal Description","visible":true},{"fieldName":"PHOTOPATH","isEditable":true,"label":"Property Photo","visible":true},{"fieldName":"PRIMEUSE","isEditable":true,"label":"Property Primary Use Code","visible":true},{"fieldName":"VALMETHOD","isEditable":true,"label":"Property Valuation Method","visible":true},{"fieldName":"RESFLRAREA","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Residential Floor Area","visible":true},{"fieldName":"RESSTRTYP","isEditable":true,"label":"Residential Structure Type","visible":true},{"fieldName":"RESYRBLT","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Residential Year Built","visible":true},{"fieldName":"SCHLTXCD","isEditable":true,"label":"School District Code","visible":true},{"fieldName":"SCHLDSCRP","isEditable":true,"label":"School District Description","visible":true},{"fieldName":"OWNERNME2","isEditable":true,"label":"Second Owner Name","visible":true},{"fieldName":"SEWERSERV","isEditable":true,"label":"Sewer Service Provider","visible":true},{"fieldName":"Shape.STArea()","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"SHAPE.STArea()","visible":false},{"fieldName":"Shape.STLength()","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"SHAPE.STLength()","visible":false},{"fieldName":"SITEADDRESS","isEditable":true,"label":"Site Address","visible":true},{"fieldName":"STRCLASS","isEditable":true,"label":"Structure Class","visible":true},{"fieldName":"CLASSMOD","isEditable":true,"label":"Structure Class Modifier","visible":true},{"fieldName":"CNVYNAME","isEditable":true,"label":"Sub or Condo Name","visible":true},{"fieldName":"CVTTXCD","isEditable":true,"label":"Tax District Code","visible":true},{"fieldName":"CVTTXDSCRP","isEditable":true,"label":"Tax District Description","visible":true},{"fieldName":"TXBLPCNTCHG","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Taxable Value % Change","visible":true},{"fieldName":"TXBLVALYRCHG","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Taxable Value Year Over Year Change","visible":true},{"fieldName":"TXODPCNTCHG","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Taxes Owed % Change","visible":true},{"fieldName":"TXODYRCHG","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Taxes Owed Year Over Year Change","visible":true},{"fieldName":"TOTCNTTXOD","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Total Current Taxes Owed","visible":true},{"fieldName":"TOTPRVTXTOD","format":{"digitSeparator":true,"places":2},"isEditable":true,"label":"Total Previous Taxes Owed","visible":true},{"fieldName":"WATERSERV","isEditable":true,"label":"Water Service Provider","visible":true},{"fieldName":"OBJECTID_1","isEditable":true,"label":"OBJECTID_1","visible":false},{"fieldName":"GlobalID","isEditable":true,"label":"GlobalID","visible":false},{"fieldName":"OriginalObjectID","isEditable":true,"label":"Original ObjectID","visible":false},{"fieldName":"OriginalGlobalID","isEditable":true,"label":"Original GlobalID","visible":false},{"fieldName":"CreatedByRecord","isEditable":true,"label":"Created By Record","visible":false},{"fieldName":"RetiredByRecord","isEditable":true,"label":"Retired By Record","visible":false},{"fieldName":"last_edited_date","isEditable":true,"label":"Modified Date","visible":false},{"fieldName":"LegalEndDate","isEditable":true,"label":"Legal End Date","visible":false},{"fieldName":"StatedArea","isEditable":true,"label":"Stated Area","visible":false},{"fieldName":"StatedAreaUnit","isEditable":true,"label":"Stated Area Unit","visible":false},{"fieldName":"NetArea","isEditable":true,"label":"Net Area","visible":false},{"fieldName":"CalculatedArea","isEditable":true,"label":"Calculated Area","visible":false},{"fieldName":"HighRise","isEditable":true,"label":"Condo High Rise","visible":false},{"fieldName":"FloorOrder","isEditable":true,"label":"Condo Floor Number ","visible":false},{"fieldName":"UnitNumber","isEditable":true,"label":"Condo Unit Number","visible":false},{"fieldName":"expression/expr0","isEditable":true,"visible":false},{"fieldName":"expression/expr1","isEditable":true,"visible":false},{"fieldName":"expression/expr2","isEditable":true,"visible":false},{"fieldName":"expression/expr3","isEditable":true,"visible":false},{"fieldName":"expression/expr4","isEditable":true,"visible":false},{"fieldName":"expression/expr5","isEditable":true,"visible":false},{"fieldName":"expression/expr6","isEditable":true,"visible":false},{"fieldName":"expression/expr7","isEditable":true,"visible":false},{"fieldName":"expression/expr8","isEditable":true,"visible":false},{"fieldName":"expression/expr10","isEditable":true,"visible":false},{"fieldName":"expression/expr14","isEditable":true,"visible":false},{"fieldName":"expression/expr15","isEditable":true,"visible":false},{"fieldName":"expression/expr16","isEditable":true,"visible":false},{"fieldName":"expression/expr17","isEditable":true,"visible":false},{"fieldName":"expression/expr18","isEditable":true,"visible":false},{"fieldName":"expression/expr26","isEditable":true,"visible":false},{"fieldName":"expression/expr27","isEditable":true,"visible":false},{"fieldName":"expression/expr29","isEditable":true,"visible":false},{"fieldName":"expression/expr30","isEditable":true,"visible":false},{"fieldName":"expression/expr31","isEditable":true,"visible":false},{"fieldName":"expression/expr32","isEditable":true,"visible":false},{"fieldName":"expression/expr33","isEditable":true,"visible":false},{"fieldName":"expression/expr34","isEditable":true,"visible":false},{"fieldName":"expression/expr35","isEditable":true,"visible":false},{"fieldName":"expression/expr36","isEditable":true,"visible":false},{"fieldName":"expression/expr37","isEditable":true,"visible":false},{"fieldName":"expression/expr38","isEditable":true,"visible":false},{"fieldName":"expression/expr39","isEditable":true,"visible":false},{"fieldName":"expression/expr40","isEditable":true,"visible":false},{"fieldName":"expression/expr41","isEditable":true,"visible":false},{"fieldName":"expression/expr42","isEditable":true,"visible":false},{"fieldName":"expression/expr43","isEditable":true,"visible":false},{"fieldName":"expression/expr44","isEditable":true,"visible":false},{"fieldName":"expression/expr45","isEditable":true,"visible":false},{"fieldName":"expression/expr46","isEditable":true,"visible":false},{"fieldName":"expression/expr47","isEditable":true,"visible":false},{"fieldName":"expression/expr48","isEditable":true,"visible":false},{"fieldName":"expression/expr49","isEditable":true,"visible":false},{"fieldName":"expression/expr50","isEditable":true,"visible":false},{"fieldName":"expression/expr52","isEditable":true,"visible":false},{"fieldName":"expression/expr53","isEditable":true,"visible":false}],"title":"{expression/expr37}"};
  localStorage.setItem('__claude_popup_patch', JSON.stringify(popupInfo));

  var v = window.$arcgis && window.$arcgis.views;
  if (!v || !v.length) { alert('Map not ready yet -- open the Development Viewer, wait for it to finish loading, then run this again.'); return; }
  var view = v.getItemAt ? v.getItemAt(0) : v.items[0];

  var FL = null;
  function featureLayerCtor() {
    if (FL) return FL;
    var sample = view.map.allLayers.find(function(l){ return l.type === 'feature'; });
    if (!sample) return null;
    FL = sample.constructor;
    return FL;
  }

  function ensureHiddenLayer(title, url) {
    if (view.map.allLayers.some(function(l){ return l.title === title; })) return;
    var ctor = featureLayerCtor();
    if (!ctor) { console.warn('[seed v8] could not find a FeatureLayer constructor to add "' + title + '"'); return; }
    view.map.add(new ctor({
      url: url,
      title: title,
      visible: false,
      listMode: 'hide',
      legendEnabled: false,
      popupEnabled: false
    }), 0);
  }

  // Carried over from v5 -- expr50 (Area planner) / expr52 / expr53 (Case planner) still need this.
  ensureHiddenLayer('Development Review Areas', 'https://gis.lincoln.ne.gov/public/rest/services/Planning/DevReviewAreas/MapServer/0');

  // NEW in v6 -- expr57-61 (Inspector assignments, Staff & Contacts section) need these.
  var inspectorLayers = [{"title": "Inspector Areas - Building", "url": "https://gis.lincoln.ne.gov/public/rest/services/BuildingSafety/InspectorAreas/MapServer/0"}, {"title": "Inspector Areas - Electrical", "url": "https://gis.lincoln.ne.gov/public/rest/services/BuildingSafety/InspectorAreas/MapServer/1"}, {"title": "Inspector Areas - Housing", "url": "https://gis.lincoln.ne.gov/public/rest/services/BuildingSafety/InspectorAreas/MapServer/2"}, {"title": "Inspector Areas - Mechanical", "url": "https://gis.lincoln.ne.gov/public/rest/services/BuildingSafety/InspectorAreas/MapServer/3"}, {"title": "Inspector Areas - Plumbing", "url": "https://gis.lincoln.ne.gov/public/rest/services/BuildingSafety/InspectorAreas/MapServer/4"}];
  inspectorLayers.forEach(function(spec){ ensureHiddenLayer(spec.title, spec.url); });

  var d = null;
  view.map.allLayers.forEach(function(l){ if (l.title === 'Development Information') d = l; });
  if (!d) { alert('Development Information layer not found -- check that it has not been renamed.'); return; }

  if (!window.__origDevTemplate) window.__origDevTemplate = d.popupTemplate;
  d.popupTemplate = d.popupTemplate.constructor.fromJSON(popupInfo);

  console.log('[seed v8] Development Information popup patched (v8): everything from v6, plus the FEMA banner, Overlay-districts banner and "No active applications on file" line now fail CLOSED instead of open when the VertiGIS Arcade paging bug hits their gate expression. ' + inspectorLayers.length + ' Inspector Areas layers + Development Review Areas ensured. Reload clears this -- run again after a refresh.');
}

  /* ===================== payload 2: Quick Bar v3.8 ===================== */
/* Development Viewer Quick Bar v3.8 -- injected control strip.
 * Layer toggles (configurable via a Settings popover), 2 named+saveable snap slots (Snap 1/Snap 2),
 * Declutter, Find Parcel card (multi-match picker + HOA/NA row), popup re-apply, locator pause,
 * blank-export fix, hidden planner-areas layer, remembered show/hide state.
 * v3.2 additions (see plan.html Section 03/04 "Proposed V1 Changes"):
 *   - bar re-anchors to the map container (.gcx-map-container) so it stays centered over the
 *     map and does not drift under the sidebar when it opens/closes; falls back to the old
 *     viewport-centered fixed position if that container can't be found.
 *   - P1/P2 renamed Snap 1/Snap 2 (the old labels read as version numbers, not view snapshots).
 *   - aria-label added to the sidebar Minimize/Maximize buttons (mirrors their existing title).
 *   - a one-line hint is added under the native Legend panel's empty-state message.
 *   - "View Oblique Aerials" is hidden from the per-result action row for every result EXCEPT
 *     the Development Information (parcel) popup, where it's still useful. Detected by content,
 *     not a DOM marker attribute or data-* attribute -- both get stripped by the popup's HTML
 *     sanitizer (confirmed live 2026-08-27); "STAFF & CONTACTS"/"DEVELOPMENT ACTIVITY" are plain
 *     text in the v6 popup template and always visible, so they survive and are unique to it.
 * v3.3 addition:
 *   - repairs "#INVALID" values in the parcel popup. Those come from a bug inside
 *     VertiGIS's own bundle (their paged Arcade FeatureSet query throws), so no Arcade
 *     change can fix them -- but the map services are healthy, so the real value is
 *     fetched over REST and written back into the panel. Layer URLs are resolved from
 *     the live map by the same titles the Arcade uses, so they track app config.
 *     Repaired values get a dotted underline + tooltip so they read as recovered,
 *     not native. Covers Zoning, Floodplain (and the FEMA banner), Existing use,
 *     Future use, Growth tier.
 * v3.4 addition:
 *   - shareable deep links. A "Link" chip copies a URL that reopens the current view for
 *     anybody, and additionally reopens the current parcel's record card for anybody who
 *     also has this toolkit. Uses VertiGIS's own documented center-/scale-/layers- URL
 *     parameters for the parts a stock browser can honour, plus two of our own (pid, qbl)
 *     that a stock browser simply ignores. See section 4b for what had to be measured
 *     rather than read out of the documentation.
 * v3.5 addition:
 *   - the app's own search box finally returns parcels. A "Development Information" group of
 *     real parcel hits is injected at the top of the native suggestion dropdown, above the
 *     geocoder's group, which is what the Help tab has always claimed the search box does.
 *     See section 4c for why this is done in the rendered dropdown rather than in config.
 * v3.6 fixes and additions:
 *   - THE INSPECTOR ROWS BUG. The popup's Arcade looks up five "Inspector Areas - *" layers by
 *     name. Those layers live in the map object, not localStorage, so they do not survive a page
 *     reload -- the seed adds them once, for that page load only. This bar re-added exactly one
 *     of the six hidden lookup layers on every run (Development Review Areas), because that was
 *     the only one when the code was written; V1.1 added the five Inspector layers to the seed
 *     and nobody mirrored them here. Result: Area planner worked forever, Inspector assignments
 *     worked until the next refresh and then silently showed an em-dash. All six are now driven
 *     from ONE table, so the two lists cannot drift apart again.
 *   - The DATS Report menu item is hidden when it genuinely cannot work (it runs a workflow item
 *     that is not shared publicly), and left alone for anyone who can actually run it.
 * v3.7:
 *   - the #INVALID repair now covers 19 of the 24 popup values that can hit the VertiGIS
 *     paging bug, up from 5. An audit of popupInfo_v7 found that 24 of the 33 rendered values
 *     use the FeatureSetByName + Intersects pattern that triggers it; V1.2 had repaired only
 *     the five that had been seen failing. Added: Applications, Project, Approved plan,
 *     Amendment, Parent app, Subdiv. permit, Annex. agmt., Fire district, Area planner,
 *     Case planner and all five Inspector rows.
 *   - phone numbers are normalised on display (the source data carries three different
 *     formats and one malformed value).
 *   - a startup self-check reports missing hidden lookup layers instead of letting the
 *     popup quietly fall back to an em-dash, which is how the V1.1 Inspector regression
 *     stayed invisible for a week.
 * v3.8:
 *   - FEMA Zone A is recognised as a floodplain. Every flood test in this project (and in the
 *     popup's own Arcade) previously asked only whether FLD_ZONE == 'AE'. The layer also carries
 *     81 Zone A polygons, and Zone A is a Special Flood Hazard Area -- the 100-year floodplain,
 *     differing only in having no determined base flood elevation. Measured 2026-08-28: 1,506
 *     parcels intersect Zone A, and 39 of a 40-parcel spread sample touch Zone A ONLY, so about
 *     1,460 parcels were being told "None mapped" while sitting in the regulatory floodplain.
 *   - Find Parcel now reports how much of the parcel is in the floodplain, computed with the
 *     county's own public geometry service.
 * Accessibility: chips are keyboard buttons (Tab/Enter/Space), aria-pressed states.
 * Config: localStorage __claude_quick_layers = JSON [{"k":"flood","t":"Layer Title","l":"Chip"}, ...]
 * Snap slots: localStorage __claude_qb_preset1/2 = JSON {"name":"...", "snap":[[path,bool],...]} (legacy raw array still read)
 * Bar visibility: localStorage __claude_qb_hidden = "1" when last hidden by the user
 * Search group: localStorage __claude_qb_nosearch = "1" to switch the parcel results in the
 *   native search box back off (Settings has a toggle for it).
 * DATS item: localStorage __claude_qb_nodats = "1" to leave the DATS Report menu item alone
 *   even when it is not accessible to this user.
 * Layer baseline: localStorage __claude_qb_baseline = JSON {"sig":"<hash>.<count>","bits":"0101..."}
 *   -- the app's own startup layer visibility, needed to express layer state as the *difference*
 *   the native layers- parameter actually applies (it toggles; it cannot set). See section 4b.
 */
function runQuickBar() {
  var v = window.$arcgis && window.$arcgis.views && window.$arcgis.views.getItemAt(0);
  if (!v) { alert('Map not ready yet - let the map finish loading, then click the bookmark again.'); return; }

  /* ---- 0. deep-link constants + baseline capture (v3.4) ----
   * This has to happen before anything below changes a layer's visibility: step 2 pauses the
   * locator layers, and a "baseline" recorded after that would no longer describe what this
   * app shows on a normal load. Full rationale in section 4b. */
  /* The hidden lookup layers the popup's Arcade expressions resolve BY NAME with
   * FeatureSetByName(). Two things about them matter and were learned the hard way:
   *
   *   1. They live in the map object, NOT in localStorage, so they do not survive a page reload.
   *      The seed script adds them, but the seed is a once-per-browser paste, so its copies last
   *      exactly one page load. Re-adding them here, on every run, is what keeps them alive --
   *      and until v3.6 only the first entry was re-added, which is why the Inspector rows went
   *      quietly back to '--' after any refresh (expr57-61 return '--' when the layer is missing,
   *      by design, so nothing ever surfaced an error).
   *   2. They are prepended at index 0, so a browser running this toolkit has six operational
   *      layers a stock browser does not. The deep-link index space has to exclude them.
   *
   * Both needs read from THIS one table. Keeping two hand-maintained lists in step is precisely
   * what failed before, so there is now only one list to maintain. */
  var CQB_LOOKUP_LAYERS = [
    { title: 'Development Review Areas',       url: 'https://gis.lincoln.ne.gov/public/rest/services/Planning/DevReviewAreas/MapServer/0' },        /* expr50 area planner, expr52 case planner */
    { title: 'Inspector Areas - Building',     url: 'https://gis.lincoln.ne.gov/public/rest/services/BuildingSafety/InspectorAreas/MapServer/0' },  /* expr57 */
    { title: 'Inspector Areas - Electrical',   url: 'https://gis.lincoln.ne.gov/public/rest/services/BuildingSafety/InspectorAreas/MapServer/1' },  /* expr58 */
    { title: 'Inspector Areas - Housing',      url: 'https://gis.lincoln.ne.gov/public/rest/services/BuildingSafety/InspectorAreas/MapServer/2' },  /* expr59 */
    { title: 'Inspector Areas - Mechanical',   url: 'https://gis.lincoln.ne.gov/public/rest/services/BuildingSafety/InspectorAreas/MapServer/3' },  /* expr60 */
    { title: 'Inspector Areas - Plumbing',     url: 'https://gis.lincoln.ne.gov/public/rest/services/BuildingSafety/InspectorAreas/MapServer/4' }   /* expr61 */
  ];
  var CQB_TOOLKIT_TITLES = {};
  CQB_LOOKUP_LAYERS.forEach(function (spec) { CQB_TOOLKIT_TITLES[spec.title] = 1; });
  var CQB_BASE_KEY = '__claude_qb_baseline';
  var CQB_MAP_EXT = 'default';
  try { cqbCaptureBaseline(false); } catch (e) { /* a link feature must never block the bar */ }

  /* ---- 1. re-apply improved popup from localStorage ---- */
  var raw = localStorage.getItem('__claude_popup_patch');
  if (raw) {
    var dl = null;
    v.map.allLayers.forEach(function (l) { if (l.title === 'Development Information') dl = l; });
    if (dl) {
      if (!window.__origDevTemplate) window.__origDevTemplate = dl.popupTemplate;
      dl.popupTemplate = dl.popupTemplate.constructor.fromJSON(JSON.parse(raw));
    }
  }
  /* ---- 2. pause the five invisible locator layers (query traffic) ---- */
  v.map.allLayers.forEach(function (l) {
    if (l.opacity === 0 && /-Locator$/.test(l.title || '')) { try { l.visible = false; } catch (e) {} }
  });
  /* ---- 2b. stop blank out-of-scale exports ---- */
  v.map.allLayers.forEach(function (l) {
    if (l.type === 'map-image' && l.title === 'Building Footprints' && !l.minScale) l.minScale = 10000;
  });
  /* ---- 2c. re-add every hidden lookup layer the popup's Arcade needs ----
   * Not just the first one. See the note on CQB_LOOKUP_LAYERS above: these do not survive a page
   * reload, and the popup's Inspector rows silently read '--' whenever their layer is absent. */
  (function () {
    var sample = v.map.allLayers.find(function (l) { return l.type === 'feature'; });
    if (!sample) return;                       /* no FeatureLayer to borrow a constructor from */
    var FL0 = sample.constructor;
    CQB_LOOKUP_LAYERS.forEach(function (spec) {
      if (v.map.allLayers.some(function (l) { return l.title === spec.title; })) return;
      try {
        v.map.add(new FL0({ url: spec.url, title: spec.title, visible: false,
          listMode: 'hide', legendEnabled: false, popupEnabled: false }), 0);
      } catch (e) { /* one unreachable lookup layer must not stop the rest */ }
    });
  })();

  /* ---- 3. quick layer config ---- */
  var DEFAULTS = [
    { k: 'flood', t: 'Floodplain and Natural Resources', l: 'Flood' },
    { k: 'transp', t: 'Transportation', l: 'Transp' },
    { k: 'contour', t: 'Contours', l: 'Contours' },
    { k: 'lots', t: 'Legal Lots', l: 'Lots' },
    { k: 'bldg', t: 'Building Footprints', l: 'Bldgs', sub: 7 },
    { k: 'landuse', t: 'Land Use and Growth', l: 'LandUse' },
    { k: 'zoning', t: 'Zoning And Regulations', l: 'Zoning' }
  ];
  var cfg;
  try {
    var storedCfg = JSON.parse(localStorage.getItem('__claude_quick_layers'));
    /* always an independent copy - cfg is mutated in place (Settings add/remove), and must never alias DEFAULTS */
    cfg = (Array.isArray(storedCfg) && storedCfg.length ? storedCfg : DEFAULTS).slice();
  } catch (e) { cfg = DEFAULTS.slice(); }
  function saveCfg() { localStorage.setItem('__claude_quick_layers', JSON.stringify(cfg)); }
  function layerOf(title) {
    var found = null;
    v.map.layers.forEach(function (l) { if (l.title === title) found = l; });
    if (!found) v.map.allLayers.forEach(function (l) { if (!found && l.title === title) found = l; });
    return found;
  }
  function ensureSub(lyr, q) {
    if (lyr.visible && lyr.type === 'map-image' && lyr.allSublayers) {
      var anyOn = false;
      lyr.allSublayers.forEach(function (s) { if (s.visible) anyOn = true; });
      if (!anyOn) lyr.allSublayers.forEach(function (s) { if (s.id === (q.sub === undefined ? -1 : q.sub)) s.visible = true; });
    }
  }

  /* ---- 4. snap slots: full-tree visibility snapshots ---- */
  function snapshot() {
    var s = [];
    (function walk(ls, path) {
      ls.forEach(function (l, i) {
        var p = path + '/' + i;
        s.push([p, !!l.visible]);
        if (l.layers) walk(l.layers, p);
      });
    })(v.map.layers, '');
    return s;
  }
  function applySnap(s) {
    var byPath = {};
    s.forEach(function (e) { byPath[e[0]] = e[1]; });
    (function walk(ls, path) {
      ls.forEach(function (l, i) {
        var p = path + '/' + i;
        if (p in byPath && l.visible !== byPath[p]) l.visible = byPath[p];
        if (l.layers) walk(l.layers, p);
      });
    })(v.map.layers, '');
    refresh();
  }


  /* ---- 4b. shareable deep links (v3.4) --------------------------------------------------
   * Produces a URL that reopens what is on screen right now:
   *
   *   center-default=<x>,<y>   VertiGIS, documented   exact view centre (Web Mercator)
   *   scale-default=<n>        VertiGIS, documented   exact scale
   *   layers-default=<i,j,k>   VertiGIS, documented   best effort -- see the note below
   *   pid=<PARCELID>           ours                   reopens the record card; the app ignores it
   *   qbl=<sig>~<hex>          ours                   exact layer state; the app ignores it
   *
   * On the native layers- parameter. VertiGIS documents its value only as a "zero based index
   * value of a particular layer ... toggles the visibility". Both halves of that sentence matter
   * and neither is spelled out, so both were established by experiment against this app
   * (2026-08-28), not assumed:
   *
   *   - The index counts the map's *operational* layers, flattened, with the basemap excluded --
   *     that is, allLayers minus its leading basemap entries. Verified at indices 7, 10, 16, 31,
   *     54 and 99: each one moved allLayers[i+1] and nothing else, allLayers[0] being the
   *     LancoBasemap vector-tile layer.
   *   - It genuinely TOGGLES rather than sets. layers-default=5 turned OFF a layer that is on by
   *     default. So a link cannot state an absolute layer state natively; it can only state a
   *     difference from whatever this app happens to show on a normal load.
   *
   * That difference has to be measured, because it cannot be looked up. The web map item's own
   * operationalLayers[].visibility does NOT describe what the app actually shows: checked directly
   * against the running app, 28 of its 121 layers disagree with the value stored in the web map,
   * because the VertiGIS app configuration overrides them. So the baseline is captured instead --
   * the first time the bar runs on a page whose URL carries no layer parameters, it records every
   * operational layer's visibility before touching anything, and later links are diffed against
   * that recording. "Recalibrate" in the Settings popover re-takes it on demand.
   *
   * Where that leaves each recipient:
   *   - with the toolkit:    qbl restores the exact layer state, and is authoritative.
   *   - without the toolkit: layers- replays the sharer's deliberate layer changes on top of that
   *                          recipient's own app defaults. With no baseline captured yet, the
   *                          parameter is omitted entirely rather than emitted wrong.
   *
   * The hidden lookup layers this toolkit adds itself are excluded from the index space. They are
   * prepended at index 0 and a stock browser does not have them, so leaving them in would shift
   * every index by six for the recipient. */

  /* operational layers in the order VertiGIS's layers- parameter counts them, as a browser
   * without this toolkit would see them */
  function cqbStockOps() {
    var tree = [];
    (function walk(col) { col.forEach(function (l) { tree.push(l); if (l.layers) walk(l.layers); }); })(v.map.layers);
    var out = [];
    v.map.allLayers.forEach(function (l) {
      if (tree.indexOf(l) < 0) return;                 /* basemap / reference layers */
      if (CQB_TOOLKIT_TITLES[l.title || '']) return;   /* added by this toolkit, absent for a recipient */
      out.push(l);
    });
    return out;
  }
  /* identity of the layer list itself, so a stale baseline or a link made against a different
   * version of this map is detected instead of applied to the wrong layers */
  function cqbOpsSig(ops) {
    var str = ops.map(function (l) { return l.title || '?'; }).join('|'), h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 131 + str.charCodeAt(i)) % 4294967291;
    return h + '.' + ops.length;
  }
  function cqbBitsOf(ops) { return ops.map(function (l) { return l.visible ? '1' : '0'; }).join(''); }
  function cqbBitsToHex(bits) {
    var out = '';
    for (var i = 0; i < bits.length; i += 4) out += parseInt((bits.substr(i, 4) + '0000').substr(0, 4), 2).toString(16);
    return out;
  }
  function cqbHexToBits(hex, len) {
    var out = '';
    for (var i = 0; i < hex.length; i++) {
      var nib = parseInt(hex.charAt(i), 16);
      if (isNaN(nib)) return null;
      out += ('000' + nib.toString(2)).slice(-4);
    }
    return out.length < len ? null : out.substr(0, len);
  }
  function cqbUrlHasLayerState() {
    var qs = (location.search || '');
    return /[?&]layers-/.test(qs) || /[?&]qbl=/.test(qs);
  }
  function cqbReadBaseline(sig) {
    try {
      var b = JSON.parse(localStorage.getItem(CQB_BASE_KEY) || 'null');
      if (!b || b.sig !== sig || typeof b.bits !== 'string') return null;
      return b.bits.length === +String(sig).split('.')[1] ? b : null;
    } catch (e) { return null; }
  }
  /* Records the app's normal startup layer visibility. Refuses to record it from a page that was
   * itself opened from a shared link (its layers are already someone else's), and never silently
   * replaces a baseline that is still valid for this map -- force=true is the Settings button. */
  function cqbCaptureBaseline(force) {
    var ops = cqbStockOps(), sig = cqbOpsSig(ops);
    if (!force) {
      if (cqbUrlHasLayerState()) return null;
      var have = cqbReadBaseline(sig);
      if (have) return have;
    }
    var b = { sig: sig, bits: cqbBitsOf(ops) };
    try { localStorage.setItem(CQB_BASE_KEY, JSON.stringify(b)); } catch (e) {}
    return b;
  }

  /* the parcel whose record is on screen: the app's own popup first, then the last Find Parcel */
  function cqbVisiblePid() {
    var found = null;
    document.querySelectorAll('.gcx-feature-details').forEach(function (p) {
      if (found || !isDevInfoPanel(p)) return;
      var pid = cqbPidOf(p);
      if (pid) found = pid;
    });
    return found || window.__cqbLastPid || null;
  }

  function cqbBuildLink() {
    var ops = cqbStockOps(), sig = cqbOpsSig(ops), bits = cqbBitsOf(ops);
    var qs = new URLSearchParams(location.search || '');
    var parts = [];
    if (qs.get('app')) parts.push('app=' + encodeURIComponent(qs.get('app')));
    if (qs.get('viewer')) parts.push('viewer=' + encodeURIComponent(qs.get('viewer')));
    var meta = { view: false, native: 0, baseline: false, pid: null };

    var c = v.center, sc = v.scale;
    if (c && sc) {
      parts.push('center-' + CQB_MAP_EXT + '=' + Math.round(c.x) + ',' + Math.round(c.y));
      parts.push('scale-' + CQB_MAP_EXT + '=' + Math.round(sc));
      meta.view = true;
    }

    var base = cqbReadBaseline(sig);
    if (base) {
      meta.baseline = true;
      var toggles = [];
      for (var i = 0; i < bits.length; i++) {
        if (bits.charAt(i) === base.bits.charAt(i)) continue;
        var l = ops[i];
        /* the bar pauses these on every load and a recipient's own bar will pause them again;
         * they are invisible either way, so shipping them would be noise in the URL */
        if (l && l.opacity === 0 && /-Locator$/.test(l.title || '')) continue;
        toggles.push(i);
      }
      if (toggles.length) {
        parts.push('layers-' + CQB_MAP_EXT + '=' + toggles.join(','));
        meta.native = toggles.length;
      }
    }
    parts.push('qbl=' + encodeURIComponent(sig + '~' + cqbBitsToHex(bits)));

    var pid = cqbVisiblePid();
    if (pid) { parts.push('pid=' + encodeURIComponent(pid)); meta.pid = pid; }

    return { url: location.origin + location.pathname + '?' + parts.join('&'), meta: meta };
  }

  function cqbCopy(text, okMsg) {
    function fallback() {
      var d = card('<b>Copy link</b>' +
        "<div style='color:#8fa3ba;margin:4px 0 6px 0;'>Clipboard access was refused - select this and copy it:</div>" +
        "<textarea readonly style='width:100%;height:78px;background:#0d1319;color:#cfe8ff;border:1px solid #2c3a4d;border-radius:4px;font:11px monospace;padding:5px;box-sizing:border-box;'>" + esc(text) + '</textarea>');
      var ta = d.querySelector('textarea');
      if (ta) { try { ta.focus(); ta.select(); } catch (e) {} }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
        return;
      }
    } catch (e) {}
    fallback();
  }

  /* Applies the our-own half of an incoming link. The native center-/scale-/layers- parameters
   * are the app's job and have already been applied by the time this runs. */
  function cqbApplyIncomingLink() {
    if (window.__cqbLinkApplied) return;
    window.__cqbLinkApplied = true;
    var qs;
    try { qs = new URLSearchParams(location.search || ''); } catch (e) { return; }
    var qbl = qs.get('qbl'), pid = qs.get('pid');

    if (qbl) {
      var ops = cqbStockOps(), sig = cqbOpsSig(ops);
      var split = qbl.split('~');
      var incoming = split.length === 2 ? cqbHexToBits(split[1], ops.length) : null;
      if (split[0] === sig && incoming) {
        /* parents before children, or a child set visible under a still-hidden group stays hidden */
        var order = [];
        (function walk(col, depth) {
          col.forEach(function (l) { order.push({ l: l, d: depth }); if (l.layers) walk(l.layers, depth + 1); });
        })(v.map.layers, 0);
        order.sort(function (a, b) { return a.d - b.d; });
        order.forEach(function (e) {
          var i = ops.indexOf(e.l);
          if (i < 0) return;
          var want = incoming.charAt(i) === '1';
          if (e.l.visible !== want) { try { e.l.visible = want; } catch (err) {} }
        });
        try { refresh(); } catch (e) {}
      } else {
        toast('Shared link: layer state skipped - this map is not the one the link was made from');
      }
    }

    if (pid && /^\d{10,14}$/.test(pid)) {
      /* if the link also carried a view, keep the sharer's view and just highlight the parcel;
       * with no view in the link, zoom to the parcel as Find Parcel normally would */
      findParcel(pid, { noZoom: qs.has('center-' + CQB_MAP_EXT) && qs.has('scale-' + CQB_MAP_EXT) });
    }
  }


  /* ---- 4c. parcel results in the native search box (v3.5) --------------------------------
   * The Help tab states that "Results beginning with Development Information provide the most
   * common development-related details." They never do: every search source in the app config is
   * a geocoder locator, so the box returns places, and the result table shows locator internals
   * (Loc_name, Score, Rank) instead of parcel data. Find Parcel was V1's answer to that -- a
   * second search box on our own bar. This closes the gap in the box people actually reach for.
   *
   * Why the rendered dropdown and not the config. Adding a real search source is config-side and
   * unreachable: the search widget reads its configuration before any point at which injected
   * code can run, so there is no moment at which a source can be added. What IS reachable is the
   * dropdown the widget renders. Measured live (2026-08-28):
   *
   *   - The dropdown is a [role="listbox"] with id "gcx-search-listbox-...", holding one
   *     DIV[role="group"] per configured source -- currently just the Lincoln-Lancaster geocoder.
   *   - Each group is a header (h3.gcx-search-suggestion-group-title) followed by LI[role=option]
   *     rows. The markup this builds mirrors that, so the injected group is styled by the app's
   *     own CSS rather than by anything hard-coded here.
   *   - Typing updates the listbox's children IN PLACE: across keystrokes the listbox node and
   *     the geocoder's group node keep their identity. A foreign group prepended to the listbox
   *     therefore survives React's re-renders -- verified by typing, deleting and retyping with a
   *     probe group in place: it stayed, stayed first, and the native options kept updating
   *     correctly, with no React error.
   *   - Closing the dropdown UNMOUNTS the listbox; reopening builds a new node with the same id.
   *     So injection cannot be a one-shot -- it rides the same debounced sweep that already
   *     maintains the oblique-aerials button and the #INVALID repair.
   *
   * What this deliberately does not do: take over the arrow keys. Which option is highlighted is
   * React state the widget owns, and it has no idea these rows exist. Rows are clickable and
   * individually focusable (Tab, then Enter or Space) instead of being spliced into the native
   * keyboard sequence, because quietly breaking arrow-key navigation of the real search results
   * would cost more than it gained. */

  var CQB_SUG_MAX = 6;              /* rows shown; the geocoder's own group shows about five */
  var CQB_SUG_MINLEN = 3;
  var cqbSugCache = {};             /* upper-cased term -> array of {pid, addr, owner} */
  var cqbSugPending = null;
  var cqbSugSeq = 0;

  function cqbSearchInput() { return document.querySelector('input[aria-label="Type your search terms"]'); }
  function cqbSearchListbox() {
    var found = null;
    document.querySelectorAll('[role="listbox"]').forEach(function (L) {
      if (!found && /^gcx-search-listbox/.test(L.id || '')) found = L;
    });
    return found;
  }
  function cqbSugRemove(lb) {
    var g = (lb || document).querySelector('#cqb-sug-group');
    if (g && g.parentNode) g.parentNode.removeChild(g);
  }

  /* address or PID, the same two shapes Find Parcel accepts, so the two behave alike */
  function cqbSugWhere(term) {
    var clean = term.replace(/'/g, "''").toUpperCase();
    if (/^\d{10,14}$/.test(clean)) return "PARCELID = '" + clean + "'";
    /* strip LIKE wildcards so a typed % or _ searches for itself rather than matching everything */
    var like = clean.split(',')[0].replace(/[%_]/g, ' ').trim();
    if (like.length < CQB_SUG_MINLEN) return null;
    return "UPPER(SITEADDRESS) LIKE '" + like + "%'";
  }

  function cqbSugRender(lb, term, rows) {
    var existing = lb.querySelector('#cqb-sug-group');
    if (existing && existing.getAttribute('data-term') === term && lb.firstChild === existing) return;
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    if (!rows || !rows.length) return;

    var g = document.createElement('div');
    g.id = 'cqb-sug-group';
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', 'Development Information');
    g.setAttribute('data-term', term);
    g.className = 'MuiBox-root';

    var head = document.createElement('div');
    head.className = 'MuiStack-root';
    var h = document.createElement('h3');
    h.setAttribute('role', 'presentation');
    h.className = 'MuiTypography-root MuiTypography-h4 gcx-search-suggestion-group-title';
    h.textContent = 'Development Information';
    head.appendChild(h);
    g.appendChild(head);

    rows.forEach(function (r, i) {
      var li = document.createElement('li');
      li.id = 'cqb-sug-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('tabindex', '0');
      li.className = 'MuiButtonBase-root MuiMenuItem-root MuiMenuItem-dense';
      var wrap = document.createElement('div');
      wrap.className = 'MuiListItemText-root MuiListItemText-dense';
      var primary = document.createElement('span');
      primary.className = 'MuiTypography-root MuiTypography-body2 MuiListItemText-primary';
      primary.textContent = r.addr || ('Parcel ' + r.pid);
      var secondary = document.createElement('span');
      secondary.className = 'MuiTypography-root MuiTypography-body2';
      secondary.style.cssText = 'display:block;opacity:.7;font-size:11px;';
      secondary.textContent = 'PID ' + r.pid + (r.owner ? ' \u00b7 ' + r.owner : '');
      wrap.appendChild(primary); wrap.appendChild(secondary);
      li.appendChild(wrap);
      var chosen = false;
      function choose(ev) {
        if (ev) { ev.preventDefault(); ev.stopPropagation(); }
        if (chosen) return;                 /* mousedown and click both bind to this */
        chosen = true;
        cqbSugRemove(lb);
        var inp = cqbSearchInput();
        if (inp) { try { inp.blur(); } catch (e) {} }
        findParcel(r.pid);
      }
      /* mousedown, not click. Pressing the mouse blurs the input, which unmounts the entire
       * dropdown -- so by the time a click event would be dispatched the row no longer exists.
       * Measured live: the row receives pointerdown and mousedown and never a click.
       * preventDefault on mousedown also stops the focus loss that causes it. */
      li.addEventListener('mousedown', choose);
      li.addEventListener('click', choose);   /* fallback for anything that gets this far */
      li.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') choose(ev);
      });
      g.appendChild(li);
    });

    lb.insertBefore(g, lb.firstChild);
  }

  function cqbSugLookup(term) {
    var where = cqbSugWhere(term);
    if (!where) return Promise.resolve([]);
    return q('/Assessor/TaxParcels/MapServer/0', {
      where: where, returnGeometry: 'false', outFields: 'PARCELID,SITEADDRESS,OWNERNME1',
      orderByFields: 'SITEADDRESS', resultRecordCount: String(CQB_SUG_MAX)
    }).then(function (j) {
      return (j.features || []).map(function (f) {
        return { pid: String(f.attributes.PARCELID || ''), addr: f.attributes.SITEADDRESS || '', owner: f.attributes.OWNERNME1 || '' };
      }).filter(function (r) { return r.pid; });
    });
  }

  /* Called from the periodic sweep. Everything here is best-effort: on any failure the native
   * dropdown is simply left exactly as the app rendered it. */
  function maintainSearchGroup() {
    if (localStorage.getItem('__claude_qb_nosearch') === '1') { cqbSugRemove(null); return; }
    var lb = cqbSearchListbox();
    if (!lb) return;                                     /* dropdown closed; nothing to do */
    var inp = cqbSearchInput();
    var term = ((inp && inp.value) || '').trim().toUpperCase();
    if (term.length < CQB_SUG_MINLEN || term.length > 60) { cqbSugRemove(lb); return; }
    if (cqbSugCache[term]) { cqbSugRender(lb, term, cqbSugCache[term]); return; }
    if (cqbSugPending === term) return;                  /* already in flight for this term */
    cqbSugPending = term;
    var seq = ++cqbSugSeq;
    cqbSugLookup(term).then(function (rows) {
      cqbSugCache[term] = rows;
      if (seq !== cqbSugSeq) return;                     /* a later keystroke superseded this */
      var lb2 = cqbSearchListbox();
      if (lb2) cqbSugRender(lb2, term, rows);
    }).catch(function () {
      cqbSugCache[term] = [];                            /* remember the miss; do not retry in a loop */
    }).then(function () {
      if (cqbSugPending === term) cqbSugPending = null;
    });
  }

  /* ---- 5. the bar ---- */
  var old = document.getElementById('cqb'); if (old) old.remove();
  var oldHandle = document.getElementById('cqb-handle'); if (oldHandle) oldHandle.remove();
  if (window.__cqbRefreshTimer) { clearInterval(window.__cqbRefreshTimer); } /* a prior click's chip-repaint loop would otherwise run forever */
  if (window.__cqbResizeObserver) { try { window.__cqbResizeObserver.disconnect(); } catch (e) {} }
  if (window.__cqbFeatureObserver) { try { window.__cqbFeatureObserver.disconnect(); } catch (e) {} }
  var bar = document.createElement('div');
  bar.id = 'cqb';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Quick layer controls');
  bar.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);width:max-content;z-index:9999;display:flex;gap:4px;align-items:center;background:rgba(15,20,28,.94);border:1px solid #2c3a4d;border-radius:16px;padding:4px 8px;font:11px "Segoe UI",sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.5);flex-wrap:wrap;justify-content:center;max-width:min(680px,86vw);';

  /* ===================== section 4d: site export (DXF) =====================
   * Everything below is the only part of this toolkit that can contact a server
   * other than gis.lincoln.ne.gov, and only when the user switches contours on.
   * See cqbSiteExportDialog for the opt-in gate.
   */
/* Development Viewer -- Site Export (DXF). Section 4d of the Quick Bar.
 *
 * Produces an ASCII DXF R12 site plan for one parcel, for use in Chief Architect,
 * AutoCAD, Civil 3D, SketchUp, Vectorworks and anything else that reads DXF.
 *
 * Why R12 ASCII and not DWG: DWG is a closed binary format with no practical
 * browser-side writer. DXF is plain text, and R12 is the dialect every reader
 * still accepts -- no handles, no OBJECTS section, no class table to get wrong.
 * Chief Architect imports it directly (File > Import > Import Drawing (DWG, DXF)).
 *
 * COORDINATES. Everything the county serves is Web Mercator (EPSG:3857). Web
 * Mercator is not a survey projection: at Lincoln's latitude its scale factor is
 * about 1/cos(40.8deg) = 1.32, so a lot drawn straight from those numbers comes
 * out ~32% too long on each side. Measured live on parcel 1435300004000: raw Web
 * Mercator shoelace gave 31,406 m2 (338,050 sq ft) against a true 195,121 sq ft.
 * So every geometry request asks for outSR=102704 -- NAD83 State Plane Nebraska,
 * US survey feet -- which returned 195,023 sq ft for the same parcel against the
 * Assessor's own GIS_AREA of 195,121, a 0.05% agreement.
 *
 * State Plane coordinates near Lincoln are ~2,584,000 ft east and ~271,000 ft
 * north. Handing a CAD package numbers that large costs single-precision display
 * accuracy and makes some site tools misbehave, so the drawing is translated to a
 * local origin at the parcel's southwest corner. The offset is written into the
 * drawing (header comment + a text entity) so the drawing can be put back on the
 * grid exactly.
 *
 * BEARINGS are computed from State Plane grid north, so they are GRID bearings.
 * They are not record bearings off a plat and not geodetic bearings; the grid
 * convergence at Lincoln is under a degree but it is real. Every bearing label
 * says GRID for that reason.
 */

/* ------------------------------------------------------------------ *
 * 1. DXF R12 emitter
 * ------------------------------------------------------------------ */

/* A DXF file is a flat sequence of (group code, value) pairs, one per line.
 * Nearly every malformed DXF in the wild is an odd number of lines -- a code
 * without its value -- so all writing goes through pair() and nothing else
 * touches the output array. */
function cqbDxfDoc() {
  var out = [];
  var layers = {};
  var ext = { minx: Infinity, miny: Infinity, minz: Infinity,
              maxx: -Infinity, maxy: -Infinity, maxz: -Infinity };

  function pair(code, value) {
    out.push(String(code));
    out.push(String(value));
  }

  /* DXF reals: fixed notation only. Exponential notation ("1e-7") is legal in
   * some readers and rejected by others, and toString() will produce it for
   * small numbers. Six decimals is ~1/1000 inch at these magnitudes. */
  function real(n) {
    if (!isFinite(n)) n = 0;
    var s = n.toFixed(6);
    if (s === '-0.000000') s = '0.000000';
    return s;
  }

  function grow(x, y, z) {
    if (x < ext.minx) ext.minx = x;
    if (y < ext.miny) ext.miny = y;
    if (z < ext.minz) ext.minz = z;
    if (x > ext.maxx) ext.maxx = x;
    if (y > ext.maxy) ext.maxy = y;
    if (z > ext.maxz) ext.maxz = z;
  }

  /* DXF text is single-byte; anything outside ASCII is unreliable across
   * readers. Degree signs and primes in bearing labels are spelled out. */
  function clean(s) {
    return String(s == null ? '' : s).replace(/[^\x20-\x7E]/g, '?');
  }

  var api = {
    /* Home Designer discards layer identity on import -- the 2026 Reference
     * Manual (p.862) states that "all drawing file layers are mapped to the
     * 'CAD, Default' layer. Original layer attributes are lost, but line color,
     * styles, and weight are preserved on a per-object basis." So layer names
     * only survive long enough to be picked in the import wizard, and COLOUR
     * and LINETYPE are the only things that distinguish content afterwards.
     * They are chosen deliberately for that reason, not decoratively. */
    layer: function (name, color, ltype) {
      if (!layers[name]) {
        layers[name] = { name: name, color: color || 7, ltype: ltype || 'CONTINUOUS' };
      }
      return api;
    },

    /* closed=true emits flag 1; a closed polyline is what Chief Architect
     * requires before it will convert a boundary into a Terrain Perimeter. */
    polyline: function (layer, pts, closed) {
      if (!pts || pts.length < 2) return api;
      api.layer(layer);
      pair(0, 'POLYLINE'); pair(8, layer); pair(6, (layers[layer] || {}).ltype || 'CONTINUOUS');
      pair(66, 1); pair(70, closed ? 1 : 0);
      pair(10, real(0)); pair(20, real(0)); pair(30, real(0));
      pts.forEach(function (p) {
        grow(p[0], p[1], 0);
        pair(0, 'VERTEX'); pair(8, layer);
        pair(10, real(p[0])); pair(20, real(p[1])); pair(30, real(0));
      });
      pair(0, 'SEQEND'); pair(8, layer);
      return api;
    },

    /* Flag 8 marks the polyline itself as 3D; flag 32 marks each vertex as a
     * 3D polyline vertex. Both are required -- a 3D polyline whose vertices
     * are not flagged 32 reads back as a flat polyline at Z=0, which is
     * exactly the failure mode where contours import but carry no elevation. */
    polyline3d: function (layer, pts, closed) {
      if (!pts || pts.length < 2) return api;
      api.layer(layer);
      pair(0, 'POLYLINE'); pair(8, layer); pair(6, (layers[layer] || {}).ltype || 'CONTINUOUS');
      pair(66, 1); pair(70, 8 | (closed ? 1 : 0));
      pair(10, real(0)); pair(20, real(0)); pair(30, real(0));
      pts.forEach(function (p) {
        var z = p[2] || 0;
        grow(p[0], p[1], z);
        pair(0, 'VERTEX'); pair(8, layer);
        pair(10, real(p[0])); pair(20, real(p[1])); pair(30, real(z));
        pair(70, 32);
      });
      pair(0, 'SEQEND'); pair(8, layer);
      return api;
    },

    text: function (layer, x, y, height, str, rotation) {
      api.layer(layer);
      grow(x, y, 0);
      pair(0, 'TEXT'); pair(8, layer);
      pair(10, real(x)); pair(20, real(y)); pair(30, real(0));
      pair(40, real(height));
      pair(1, clean(str));
      if (rotation) pair(50, real(rotation));
      return api;
    },

    point: function (layer, x, y, z) {
      api.layer(layer);
      grow(x, y, z || 0);
      pair(0, 'POINT'); pair(8, layer);
      pair(10, real(x)); pair(20, real(y)); pair(30, real(z || 0));
      return api;
    },

    build: function () {
      if (!isFinite(ext.minx)) {
        ext = { minx: 0, miny: 0, minz: 0, maxx: 0, maxy: 0, maxz: 0 };
      }
      var head = [];
      var body = out;
      out = head;

      pair(0, 'SECTION'); pair(2, 'HEADER');
      pair(9, '$ACADVER');  pair(1, 'AC1009');
      pair(9, '$INSBASE');  pair(10, real(0)); pair(20, real(0)); pair(30, real(0));
      pair(9, '$EXTMIN');   pair(10, real(ext.minx)); pair(20, real(ext.miny)); pair(30, real(ext.minz));
      pair(9, '$EXTMAX');   pair(10, real(ext.maxx)); pair(20, real(ext.maxy)); pair(30, real(ext.maxz));
      /* 1 = scientific? no: 1 = inches, 2 = feet. The drawing is in US survey
       * feet, so 2. Readers that predate INSUNITS ignore it harmlessly. */
      pair(9, '$INSUNITS'); pair(70, 2);
      pair(9, '$MEASUREMENT'); pair(70, 0);
      pair(0, 'ENDSEC');

      pair(0, 'SECTION'); pair(2, 'TABLES');
      pair(0, 'TABLE'); pair(2, 'LTYPE'); pair(70, 2);
      pair(0, 'LTYPE'); pair(2, 'CONTINUOUS'); pair(70, 0);
      pair(3, 'Solid line'); pair(72, 65); pair(73, 0); pair(40, real(0));
      /* Dashed, for easements and the flood boundary -- both are conventionally
       * dashed on a site plan, and linetype is one of the three attributes that
       * survives Home Designer's import. */
      pair(0, 'LTYPE'); pair(2, 'DASHED'); pair(70, 0);
      pair(3, 'Dashed __ __ __'); pair(72, 65); pair(73, 2);
      pair(40, real(3)); pair(49, real(2)); pair(49, real(-1));
      pair(0, 'ENDTAB');

      var names = Object.keys(layers);
      pair(0, 'TABLE'); pair(2, 'LAYER'); pair(70, names.length);
      names.forEach(function (n) {
        pair(0, 'LAYER'); pair(2, n); pair(70, 0);
        pair(62, layers[n].color); pair(6, layers[n].ltype || 'CONTINUOUS');
      });
      pair(0, 'ENDTAB');
      pair(0, 'ENDSEC');

      pair(0, 'SECTION'); pair(2, 'BLOCKS'); pair(0, 'ENDSEC');
      pair(0, 'SECTION'); pair(2, 'ENTITIES');

      var text = head.concat(body);
      text.push('0'); text.push('ENDSEC');
      text.push('0'); text.push('EOF');
      out = body;
      return text.join('\r\n') + '\r\n';
    },

    _extent: function () { return ext; },
    _layers: function () { return layers; }
  };
  return api;
}

/* ------------------------------------------------------------------ *
 * 2. Geometry: area, local origin, quadrant bearings
 * ------------------------------------------------------------------ */

function cqbRingArea(ring) {
  var a = 0;
  for (var i = 0, n = ring.length; i < n - 1; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(a / 2);
}

/* Esri polygons put the outer ring clockwise and holes counter-clockwise, so a
 * signed sum over all rings nets the holes out. */
function cqbPolyArea(rings) {
  var total = 0;
  rings.forEach(function (ring) {
    var a = 0;
    for (var i = 0, n = ring.length; i < n - 1; i++) {
      a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    }
    total += a / 2;
  });
  return Math.abs(total);
}

function cqbBounds(rings) {
  var b = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
  rings.forEach(function (r) {
    r.forEach(function (p) {
      if (p[0] < b.minx) b.minx = p[0];
      if (p[1] < b.miny) b.miny = p[1];
      if (p[0] > b.maxx) b.maxx = p[0];
      if (p[1] > b.maxy) b.maxy = p[1];
    });
  });
  return b;
}

/* Round the origin down to a whole foot so the offset written into the drawing
 * is exact and a user can type it back in without transcribing decimals. */
function cqbLocalOrigin(rings) {
  var b = cqbBounds(rings);
  return [Math.floor(b.minx), Math.floor(b.miny)];
}

function cqbShift(rings, origin) {
  return rings.map(function (r) {
    return r.map(function (p) { return [p[0] - origin[0], p[1] - origin[1]]; });
  });
}

/* Quadrant bearing, the form used on plats and site plans: N 45d30'12" E.
 * Grid north is +Y. Due north/south/east/west are spelled out rather than
 * emitted as "N 0d00'00" E", which reads as an error to a surveyor. */
function cqbBearing(dx, dy) {
  var EPS = 1e-9;
  if (Math.abs(dx) < EPS && Math.abs(dy) < EPS) return null;
  if (Math.abs(dx) < EPS) return dy > 0 ? 'NORTH' : 'SOUTH';
  if (Math.abs(dy) < EPS) return dx > 0 ? 'EAST' : 'WEST';

  var ns = dy > 0 ? 'N' : 'S';
  var ew = dx > 0 ? 'E' : 'W';
  var deg = Math.atan2(Math.abs(dx), Math.abs(dy)) * 180 / Math.PI;

  var d = Math.floor(deg);
  var mFloat = (deg - d) * 60;
  var m = Math.floor(mFloat);
  var s = Math.round((mFloat - m) * 60);
  /* Carry seconds and minutes rather than emitting 60. */
  if (s === 60) { s = 0; m += 1; }
  if (m === 60) { m = 0; d += 1; }
  /* 90 degrees in a quadrant bearing is a cardinal direction. */
  if (d === 90 && m === 0 && s === 0) return dx > 0 ? 'EAST' : 'WEST';

  return ns + ' ' + d + 'd' + (m < 10 ? '0' : '') + m + "'" +
         (s < 10 ? '0' : '') + s + '" ' + ew;
}

function cqbDist(a, b) {
  var dx = b[0] - a[0], dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/* ------------------------------------------------------------------ *
 * 3. Contours: marching squares over a regular grid
 * ------------------------------------------------------------------ */

/* Grid is row-major, grid[r][c], with r increasing northward. Cells whose
 * corners are all null (outside the parcel, or a failed sample) are skipped
 * entirely rather than treated as zero -- treating a gap as elevation 0 draws
 * a cliff around every hole. */
function cqbMarchingSquares(grid, x0, y0, step, level) {
  var segs = [];
  var rows = grid.length;
  if (!rows) return segs;
  var cols = grid[0].length;

  /* A sample sitting exactly on the contour level makes that cell's case index
   * ambiguous, so the level has to be nudged off it. The nudge MUST be decided
   * once for the whole grid, not per cell: two neighbouring cells interpolating
   * their shared edge at levels differing by 1e-6 land on points that differ in
   * the last bits, the chainer sees two distinct keys, and one closed contour
   * comes back as several fragments. That is what a ring broken into four
   * pieces looks like. */
  var lv = level;
  for (var sr = 0; sr < rows && lv === level; sr++) {
    var row = grid[sr];
    for (var sc = 0; sc < row.length; sc++) {
      if (row[sc] === level) { lv = level + 1e-6; break; }
    }
  }

  function interp(pa, va, pb, vb) {
    var t = (lv - va) / (vb - va);
    if (!isFinite(t)) t = 0.5;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t];
  }

  for (var r = 0; r < rows - 1; r++) {
    for (var c = 0; c < cols - 1; c++) {
      var v = [grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]];
      if (v[0] == null || v[1] == null || v[2] == null || v[3] == null) continue;

      var p = [
        [x0 + c * step,       y0 + r * step],
        [x0 + (c + 1) * step, y0 + r * step],
        [x0 + (c + 1) * step, y0 + (r + 1) * step],
        [x0 + c * step,       y0 + (r + 1) * step]
      ];

      var idx = (v[0] > lv ? 8 : 0) | (v[1] > lv ? 4 : 0) |
                (v[2] > lv ? 2 : 0) | (v[3] > lv ? 1 : 0);
      if (idx === 0 || idx === 15) continue;

      /* Edge midpoints, in the order top, right, bottom, left. */
      var e = [
        interp(p[0], v[0], p[1], v[1]),
        interp(p[1], v[1], p[2], v[2]),
        interp(p[3], v[3], p[2], v[2]),
        interp(p[0], v[0], p[3], v[3])
      ];

      /* Saddles (5 and 10) are genuinely ambiguous: the cell centre decides
       * which way the two branches connect. Averaging the four corners is the
       * standard resolution and keeps contours from crossing each other. */
      var mid = (v[0] + v[1] + v[2] + v[3]) / 4;
      switch (idx) {
        case 1:  case 14: segs.push([e[3], e[2]]); break;
        case 2:  case 13: segs.push([e[2], e[1]]); break;
        case 3:  case 12: segs.push([e[3], e[1]]); break;
        case 4:  case 11: segs.push([e[0], e[1]]); break;
        case 6:  case 9:  segs.push([e[0], e[2]]); break;
        case 7:  case 8:  segs.push([e[3], e[0]]); break;
        case 5:
          if (mid > lv) { segs.push([e[3], e[0]]); segs.push([e[2], e[1]]); }
          else          { segs.push([e[3], e[2]]); segs.push([e[0], e[1]]); }
          break;
        case 10:
          if (mid > lv) { segs.push([e[3], e[2]]); segs.push([e[0], e[1]]); }
          else          { segs.push([e[3], e[0]]); segs.push([e[2], e[1]]); }
          break;
      }
    }
  }
  return segs;
}

/* Marching squares emits unordered segments; CAD wants polylines. Segments are
 * chained end-to-end on a quantised key so floating point noise does not break
 * a run into fragments. */
function cqbChain(segs, tol) {
  tol = tol || 1e-6;
  var key = function (p) {
    return Math.round(p[0] / tol) + ',' + Math.round(p[1] / tol);
  };
  var ends = {};
  segs.forEach(function (s, i) {
    [key(s[0]), key(s[1])].forEach(function (k) {
      (ends[k] || (ends[k] = [])).push(i);
    });
  });

  var used = new Array(segs.length);
  var lines = [];

  /* Extend a run of points from its tail, consuming unused segments. Returns
   * the same array, grown in place. */
  function extend(pts) {
    for (;;) {
      var tail = pts[pts.length - 1];
      var cand = ends[key(tail)] || [];
      var nxt = -1;
      for (var i = 0; i < cand.length; i++) {
        if (!used[cand[i]]) { nxt = cand[i]; break; }
      }
      if (nxt < 0) return pts;
      used[nxt] = true;
      var s = segs[nxt];
      pts.push(key(s[0]) === key(tail) ? s[1] : s[0]);
    }
  }

  for (var i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    /* Grow forward from the seed's end, then reverse and grow again so a run
     * seeded in its middle still comes out as one polyline rather than two. */
    var pts = extend([segs[i][0], segs[i][1]]);
    pts.reverse();
    pts = extend(pts);
    if (pts.length >= 2) lines.push(pts);
  }
  return lines;
}

/* Contour levels on whole multiples of the interval, which is what a reader
 * expects: 1102, 1104, 1106 -- not 1101.7, 1103.7. */
function cqbLevels(min, max, interval) {
  var out = [];
  if (!(interval > 0) || !isFinite(min) || !isFinite(max) || max < min) return out;
  var first = Math.ceil(min / interval) * interval;
  for (var v = first; v <= max; v += interval) {
    out.push(Math.round(v / interval) * interval);
    if (out.length > 5000) break;
  }
  return out;
}


/* ------------------------------------------------------------------ *
 * 4. Data sources
 * ------------------------------------------------------------------ */

/* NAD83 State Plane Nebraska, US survey feet. Every county query asks for this
 * so nothing downstream ever handles Web Mercator. */
var CQB_SP_FT = 102704;
var CQB_PUB = 'https://gis.lincoln.ne.gov/public/rest/services/';

/* Layer ids verified against the service directories 2026-08-28.
 *
 * Deliberately NOT included: LTUTraffic/RightOfWayDistricts. The name reads as
 * a right-of-way line, but its fields (MntDist, Custodian, InspectorArea,
 * Phone_Num) show it is a maintenance-district polygon, not a surveyed ROW
 * boundary. Drawing it on a site plan labelled "ROW" would be worse than
 * drawing nothing. The parcel boundary already ends at the right of way, and
 * curb lines plus centerlines carry the street context. */
var CQB_SITE_SOURCES = [
  { key: 'lot',   layer: 'LOT-BOUNDARY',      color: 7, poly: true,
    url: CQB_PUB + 'Assessor/TaxParcels/MapServer/0' },
  { key: 'bldg',  layer: 'BLDG-EXISTING',     color: 8, poly: true,
    url: CQB_PUB + 'BuildingSafety/BuildingFootprints/MapServer/7',
    note: '2024 footprint vintage' },
  { key: 'esmt',  layer: 'EASEMENT',          color: 6, poly: true, ltype: 'DASHED',
    url: CQB_PUB + 'Assessor/Encumbrances/MapServer/0' },
  { key: 'flood', layer: 'FLOOD-FEMA-100YR',  color: 1, poly: true, ltype: 'DASHED',
    url: CQB_PUB + 'LTUWatershed/FEMAFlood/MapServer/1' },
  { key: 'curb',  layer: 'STREET-CURB',       color: 4, poly: false,
    url: CQB_PUB + 'LTUStreetMaintenance/PavementCurblines/MapServer/0' },
  { key: 'cl',    layer: 'STREET-CENTERLINE', color: 3, poly: false,
    url: CQB_PUB + 'Planning/Streets/MapServer/0' }
];

/* Queried per parcel but not drawn like the others: the building line needs an
 * offset computed from it, and soils need clipped areas. */
var CQB_BUILDING_LINE_URL = CQB_PUB + 'Planning/DevRevZoningandRegulations/MapServer/22';
var CQB_SOILS_URL = CQB_PUB + 'CityCounty/Soils/MapServer/1';
var CQB_GEOM_URL = CQB_PUB + 'Utilities/Geometry/GeometryServer';

/* Clip a set of polygons to the parcel and measure the result, using the
 * county's own public geometry service. Planar rather than geodesic because
 * State Plane is a projected system built for exactly this -- the parcel area
 * it returns already agrees with the Assessor to 0.05%. Returns null rather
 * than a guess if any step fails, so a percentage is never invented. */
function cqbClipArea(parcelGeom, geoms, poster) {
  var post = poster || cqbGeoPost;
  var usable = (geoms || []).filter(function (g) { return g && g.rings && g.rings.length; });
  if (!usable.length) return Promise.resolve(0);
  return post('union', {
    sr: CQB_SP_FT,
    geometries: JSON.stringify({ geometryType: 'esriGeometryPolygon', geometries: usable })
  }).then(function (u) {
    if (!u || u.error) return null;
    return post('intersect', {
      sr: CQB_SP_FT,
      geometries: JSON.stringify({ geometryType: 'esriGeometryPolygon', geometries: [parcelGeom] }),
      geometry: JSON.stringify({ geometryType: 'esriGeometryPolygon', geometry: u.geometry || u })
    });
  }).then(function (ix) {
    if (!ix || ix.error) return null;
    var pieces = (ix.geometries || []).filter(function (g) { return g && g.rings && g.rings.length; });
    if (!pieces.length) return 0;
    return post('areasAndLengths', {
      sr: CQB_SP_FT, polygons: JSON.stringify(pieces),
      areaUnit: JSON.stringify({ areaUnit: 'esriSquareFeet' }),
      calculationType: 'planar'
    });
  }).then(function (al) {
    if (al === 0) return 0;
    if (!al || al.error || !al.areas) return null;
    return al.areas.reduce(function (x, y) { return x + Math.abs(y); }, 0);
  }).catch(function () { return null; });
}

function cqbGeoPost(op, params) {
  var body = Object.keys(params).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&') + '&f=json';
  return fetch(CQB_GEOM_URL + '/' + op, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body
  }).then(function (r) { return r.json(); });
}

var CQB_3DEP = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer';

function cqbQs(o) {
  return Object.keys(o).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]);
  }).join('&');
}

function cqbGetJson(url, timeoutMs) {
  return new Promise(function (resolve, reject) {
    var done = false;
    var t = setTimeout(function () {
      if (!done) { done = true; reject(new Error('timeout')); }
    }, timeoutMs || 30000);
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (done) return;
        done = true; clearTimeout(t);
        /* ArcGIS reports failures as {"error":{...}} inside an HTTP 200, so the
         * response status is not a reliable success test. */
        if (j && j.error) reject(new Error(j.error.message || ('code ' + j.error.code)));
        else resolve(j);
      })
      .catch(function (e) { if (!done) { done = true; clearTimeout(t); reject(e); } });
  });
}

/* Query one layer for whatever intersects the site envelope, in State Plane feet. */
function cqbQuerySite(spec, env) {
  var url = spec.url + '/query?' + cqbQs({
    geometry: JSON.stringify({
      xmin: env.minx, ymin: env.miny, xmax: env.maxx, ymax: env.maxy,
      spatialReference: { wkid: CQB_SP_FT }
    }),
    geometryType: 'esriGeometryEnvelope',
    inSR: CQB_SP_FT,
    outSR: CQB_SP_FT,
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    returnGeometry: 'true',
    f: 'json'
  });
  return cqbGetJson(url).then(function (j) {
    return (j.features || []).map(function (f) {
      return {
        attributes: f.attributes || {},
        parts: spec.poly ? (f.geometry && f.geometry.rings) || []
                         : (f.geometry && f.geometry.paths) || []
      };
    });
  });
}

/* ------------------------------------------------------------------ *
 * 5. Elevation
 * ------------------------------------------------------------------ */

/* Choose a sampling step that keeps the request count sane on a large parcel.
 * Doubling rather than solving keeps the step on a round number of feet, which
 * makes the grid legible if anyone inspects it. */
function cqbGridSpec(bounds, maxPoints, minStep) {
  var step = minStep || 5;
  var w = bounds.maxx - bounds.minx;
  var h = bounds.maxy - bounds.miny;
  var cols, rows;
  for (;;) {
    cols = Math.floor(w / step) + 1;
    rows = Math.floor(h / step) + 1;
    if (cols * rows <= (maxPoints || 6000) || step > 500) break;
    step *= 2;
  }
  return { step: step, cols: cols, rows: rows, x0: bounds.minx, y0: bounds.miny };
}

function cqbGridPoints(spec) {
  var pts = [];
  for (var r = 0; r < spec.rows; r++) {
    for (var c = 0; c < spec.cols; c++) {
      pts.push([spec.x0 + c * spec.step, spec.y0 + r * spec.step]);
    }
  }
  return pts;
}

/* 3DEP returns metres; a US site plan wants feet. 3DEP's vertical datum is
 * NAVD88, which is also what FEMA base flood elevations use, so the two are
 * comparable -- but see the disclaimer: this is bare-earth lidar, not a survey. */
var CQB_M_TO_FT = 3.280839895013123;

/* Batched because getSamples caps how many locations one request will accept.
 * Passing a polygon with sampleDistance instead looks simpler but silently
 * truncates: measured live on one parcel it returned 326 samples whether the
 * requested spacing was 2 m or 3 m. An explicit multipoint keeps the grid
 * exactly as asked for. */
function cqbSampleElevation(points, onProgress, batchSize) {
  var BATCH = batchSize || 400;
  var results = new Array(points.length);
  var batches = [];
  for (var i = 0; i < points.length; i += BATCH) {
    batches.push({ start: i, pts: points.slice(i, i + BATCH) });
  }
  var doneCount = 0;

  function runBatch(b) {
    /* Sent in Web Mercator, which is the only input SR verified against this
     * service. The conversion is local (section 8) and agrees with the county's
     * own reprojection to 4 mm, so it costs nothing and removes a dependency. */
    var wm = b.pts.map(function (p) { return cqbSpFtToWm(p[0], p[1]); });
    var url = CQB_3DEP + '/getSamples?' + cqbQs({
      geometry: JSON.stringify({
        points: wm, spatialReference: { wkid: 102100 }
      }),
      geometryType: 'esriGeometryMultipoint',
      returnFirstValueOnly: 'true',
      f: 'json'
    });
    return cqbGetJson(url, 45000).then(function (j) {
      (j.samples || []).forEach(function (s) {
        var idx = b.start + (s.locationId || 0);
        var v = parseFloat(s.value);
        results[idx] = isFinite(v) ? v * CQB_M_TO_FT : null;
      });
      doneCount++;
      if (onProgress) onProgress(doneCount, batches.length);
    });
  }

  /* Sequential with a small look-ahead: a federal service is a shared resource
   * and this is a background convenience, not a race. */
  var chain = Promise.resolve();
  batches.forEach(function (b) {
    chain = chain.then(function () { return runBatch(b); });
  });
  return chain.then(function () { return results; });
}

function cqbToGrid(values, spec) {
  var grid = [];
  for (var r = 0; r < spec.rows; r++) {
    var row = [];
    for (var c = 0; c < spec.cols; c++) {
      var v = values[r * spec.cols + c];
      row.push(v == null || !isFinite(v) ? null : v);
    }
    grid.push(row);
  }
  return grid;
}

/* ------------------------------------------------------------------ *
 * 6. Assembly
 * ------------------------------------------------------------------ */

function cqbPointInRings(x, y, rings) {
  var inside = false;
  rings.forEach(function (ring) {
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
  });
  return inside;
}

function cqbExpand(b, margin) {
  return { minx: b.minx - margin, miny: b.miny - margin,
           maxx: b.maxx + margin, maxy: b.maxy + margin };
}

/* Draw the lot with a bearing/distance label on each segment. Labels are placed
 * at the segment midpoint, rotated to the segment, and flipped when the segment
 * runs right-to-left so no label reads upside down. */
function cqbDrawLot(doc, ring, opts) {
  doc.layer('LOT-BOUNDARY', 7);
  doc.polyline('LOT-BOUNDARY', ring, true);
  if (!opts || !opts.bearings) return;

  doc.layer('LOT-ANNOTATION', 2);
  var h = opts.textHeight || 2.5;
  for (var i = 0; i < ring.length; i++) {
    var a = ring[i], b = ring[(i + 1) % ring.length];
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < (opts.minSegment || 1)) continue;
    var bearing = cqbBearing(dx, dy);
    if (!bearing) continue;

    var rot = Math.atan2(dy, dx) * 180 / Math.PI;
    if (rot > 90 || rot < -90) rot += 180;
    /* Offset the label off the line, on the outside of the segment. */
    var nx = -dy / len, ny = dx / len;
    var off = h * 0.6;
    doc.text('LOT-ANNOTATION',
      (a[0] + b[0]) / 2 + nx * off, (a[1] + b[1]) / 2 + ny * off,
      h, bearing + '  ' + len.toFixed(2) + "'", rot);
  }
}


/* ------------------------------------------------------------------ *
 * 7. The export itself
 * ------------------------------------------------------------------ */

/* opts:
 *   contours   false by default -- see cqbSiteExport's caller. Turning this on
 *              is the ONLY thing that causes a request to leave gis.lincoln.ne.gov.
 *   interval   contour interval in feet (1 or 2)
 *   margin     feet of context to pull around the lot
 *   bearings   label each lot line with a grid bearing and distance
 *   onStatus   fn(text) for progress
 */
function cqbSiteExport(pid, opts, deps) {
  opts = opts || {};
  deps = deps || {};
  var queryFn  = deps.query   || cqbQuerySite;
  var sampleFn = deps.sample  || cqbSampleElevation;
  var say = opts.onStatus || function () {};
  var margin = opts.margin == null ? 100 : opts.margin;

  var lotSpec = CQB_SITE_SOURCES[0];
  var url = lotSpec.url + '/query?' + cqbQs({
    where: "PARCELID='" + String(pid).replace(/'/g, "''") + "'",
    outFields: 'PARCELID,SITEADDRESS,OWNERNME1,GIS_AREA',
    returnGeometry: 'true', outSR: CQB_SP_FT, f: 'json'
  });

  var lot, origin, env, doc, report = { warnings: [], layers: {} };

  return cqbGetJson(url).then(function (j) {
    var f = (j.features || [])[0];
    if (!f || !f.geometry || !f.geometry.rings) throw new Error('Parcel ' + pid + ' not found, or it has no mapped boundary.');
    lot = f;
    origin = cqbLocalOrigin(f.geometry.rings);
    var b = cqbBounds(f.geometry.rings);
    env = cqbExpand(b, margin);

    report.pid = f.attributes.PARCELID;
    report.address = f.attributes.SITEADDRESS || '';
    report.owner = f.attributes.OWNERNME1 || '';
    report.statedArea = f.attributes.GIS_AREA;
    report.computedArea = cqbPolyArea(f.geometry.rings);
    report.origin = origin;

    /* A disagreement here means the projection went wrong and every dimension
     * in the drawing is suspect, so it is surfaced rather than swallowed. */
    if (report.statedArea > 0) {
      var diff = Math.abs(report.computedArea - report.statedArea) / report.statedArea;
      report.areaAgreement = diff;
      if (diff > 0.02) {
        report.warnings.push('Computed area (' + Math.round(report.computedArea) +
          ' sq ft) disagrees with the Assessor value (' + Math.round(report.statedArea) +
          ' sq ft) by ' + (diff * 100).toFixed(1) + '%. Check the drawing before using it.');
      }
    }

    doc = cqbDxfDoc();
    var rings = cqbShift(lot.geometry.rings, origin);
    /* Esri repeats the first vertex to close a ring; DXF closes with a flag, so
     * the duplicate is dropped or the boundary gets a zero-length segment. */
    rings.forEach(function (r, i) {
      var pts = r.slice();
      if (pts.length > 1) {
        var a = pts[0], z = pts[pts.length - 1];
        if (a[0] === z[0] && a[1] === z[1]) pts.pop();
      }
      if (i === 0) cqbDrawLot(doc, pts, opts);
      else doc.polyline('LOT-BOUNDARY', pts, true);
    });
    report.layers['LOT-BOUNDARY'] = rings.length;

    say('Pulling site context...');
    var others = CQB_SITE_SOURCES.slice(1);
    return Promise.all(others.map(function (spec) {
      return queryFn(spec, env).then(function (rows) { return { spec: spec, rows: rows }; })
        .catch(function (e) {
          report.warnings.push(spec.layer + ' could not be read (' + e.message + '); it is missing from the drawing.');
          return { spec: spec, rows: [] };
        });
    }));
  }).then(function (sets) {
    sets.forEach(function (s) {
      var n = 0;
      /* Kept in state plane so frontage detection can measure against them. */
      if (s.spec.key === 'cl') {
        report._streetPaths = [];
        s.rows.forEach(function (row) {
          row.parts.forEach(function (p) { report._streetPaths.push(p); });
        });
      }
      s.rows.forEach(function (row) {
        cqbShift(row.parts, origin).forEach(function (part) {
          var pts = part.slice();
          if (s.spec.poly && pts.length > 1) {
            var a = pts[0], z = pts[pts.length - 1];
            if (a[0] === z[0] && a[1] === z[1]) pts.pop();
          }
          doc.layer(s.spec.layer, s.spec.color, s.spec.ltype);
          doc.polyline(s.spec.layer, pts, !!s.spec.poly);
          n++;
        });
      });
      report.layers[s.spec.layer] = n;
    });

    say('Checking building line and soils...');
    var extras = [];

    /* Building line district: a mapped DISTANCE in feet, offset inward from the
     * frontage. Not the zoning setback envelope -- a different thing entirely. */
    extras.push(
      cqbGetJson(CQB_BUILDING_LINE_URL + '/query?' + cqbQs({
        geometry: JSON.stringify({ rings: lot.geometry.rings, spatialReference: { wkid: CQB_SP_FT } }),
        geometryType: 'esriGeometryPolygon', inSR: CQB_SP_FT, outSR: CQB_SP_FT,
        spatialRel: 'esriSpatialRelIntersects', outFields: 'DISTANCE', returnGeometry: 'false', f: 'json'
      })).then(function (j) {
        var fs = j.features || [];
        if (!fs.length) return;
        var dists = fs.map(function (f) { return Number(f.attributes.DISTANCE); })
                      .filter(function (d) { return isFinite(d) && d > 0; });
        if (!dists.length) return;
        /* Overlapping districts: the largest setback governs. */
        var d = Math.max.apply(null, dists);
        report.buildingLineFt = d;

        var ring = lot.geometry.rings[0];
        var interior = cqbCentroid(ring);
        var paths = [];
        (report._streetPaths || []).forEach(function (p) { paths.push(p); });
        var edges = cqbFrontageEdges(ring, paths, opts.frontageSearch || 60, 10);
        report.frontageEdges = edges.length;
        if (!edges.length) {
          report.warnings.push('This parcel is in a Building Line District requiring ' + d +
            ' ft, but no street centerline was found near any lot line, so the building line ' +
            'could not be placed. The distance is noted in the drawing.');
          return;
        }
        doc.layer('BUILDING-LINE', 2, 'DASHED');
        doc.layer('BUILDING-LINE-TEXT', 2);
        edges.forEach(function (i) {
          var seg = cqbOffsetEdge(ring[i], ring[i + 1], interior, d);
          if (!seg) return;
          doc.polyline('BUILDING-LINE',
            [[seg[0][0] - origin[0], seg[0][1] - origin[1]],
             [seg[1][0] - origin[0], seg[1][1] - origin[1]]], false);
          doc.text('BUILDING-LINE-TEXT',
            (seg[0][0] + seg[1][0]) / 2 - origin[0], (seg[0][1] + seg[1][1]) / 2 - origin[1] + 3,
            2.5, 'BUILDING LINE ' + d + " ft (DERIVED)");
        });
      }).catch(function (e) {
        report.warnings.push('Building Line Districts could not be read (' + e.message + ').');
      })
    );

    /* Soils, with real clipped areas per class. */
    extras.push(
      cqbGetJson(CQB_SOILS_URL + '/query?' + cqbQs({
        geometry: JSON.stringify({ rings: lot.geometry.rings, spatialReference: { wkid: CQB_SP_FT } }),
        geometryType: 'esriGeometryPolygon', inSR: CQB_SP_FT, outSR: CQB_SP_FT,
        spatialRel: 'esriSpatialRelIntersects', outFields: CQB_SOIL_FIELDS.join(','),
        returnGeometry: 'true', f: 'json'
      })).then(function (j) {
        var fs = j.features || [];
        if (!fs.length) return;
        doc.layer('SOILS', 52, 'DASHED');
        fs.forEach(function (f) {
          cqbShift((f.geometry && f.geometry.rings) || [], origin).forEach(function (r) {
            var pts = r.slice();
            if (pts.length > 1) {
              var a = pts[0], z = pts[pts.length - 1];
              if (a[0] === z[0] && a[1] === z[1]) pts.pop();
            }
            doc.polyline('SOILS', pts, true);
          });
        });
        var clip = function (geoms) {
          return cqbClipArea(lot.geometry, geoms, deps.geoPost);
        };
        return Promise.all(['HYDROGROUP', 'DRAINCLASS', 'HYDRICRATE'].map(function (fld) {
          return cqbSoilSummary(fs, fld, report.computedArea, clip)
            .then(function (rows) { return { field: fld, rows: rows }; });
        })).then(function (sets) {
          report.soils = {};
          sets.forEach(function (s2) {
            var txt = cqbSoilText(s2.rows);
            if (txt) report.soils[s2.field] = txt;
          });
          /* If the clip failed everywhere, say which soils are present rather
           * than inventing shares. */
          if (!Object.keys(report.soils).length) {
            var names = {};
            fs.forEach(function (f) {
              var t = f.attributes && (f.attributes.SOILTYPE || f.attributes.SOILDESC);
              if (t) names[String(t).trim()] = 1;
            });
            var list = Object.keys(names);
            if (list.length) {
              report.soilsUnmeasured = list.slice(0, 6).join('; ');
              report.warnings.push('Soil areas could not be measured, so no percentages are given. ' +
                'Units present: ' + report.soilsUnmeasured + '.');
            }
          }
        });
      }).catch(function (e) {
        report.warnings.push('Soils could not be read (' + e.message + ').');
      })
    );

    return Promise.all(extras).then(function () {
      if (!opts.contours) return null;

      say('Sampling elevations...');
      var gspec = cqbGridSpec(env, opts.maxPoints || 6000, opts.gridStep || 5);
      report.gridStep = gspec.step;
      report.gridPoints = gspec.cols * gspec.rows;
      return sampleFn(cqbGridPoints(gspec), function (i, n) {
        say('Sampling elevations... ' + i + '/' + n);
      }).then(function (vals) { return { gspec: gspec, vals: vals }; })
        .catch(function (e) {
          report.warnings.push('Elevation data could not be retrieved (' + e.message +
            '). The drawing has no contours.');
          return null;
        });
    });
  }).then(function (elev) {
    if (elev) {
      var grid = cqbToGrid(elev.vals, elev.gspec);
      var csv = cqbElevationCsv(grid, elev.gspec, origin, { maxPoints: opts.csvMaxPoints });
      if (csv.count) { report.csv = csv.text; report.csvPoints = csv.count; }
      var flat = [];
      grid.forEach(function (r) { r.forEach(function (v) { if (v != null) flat.push(v); }); });
      if (!flat.length) {
        report.warnings.push('No elevation values were returned for this area; the drawing has no contours.');
      } else {
        var lo = Math.min.apply(null, flat), hi = Math.max.apply(null, flat);
        report.reliefFt = hi - lo;
        report.minElevFt = lo;
        report.maxElevFt = hi;
        var interval = opts.interval || 2;
        var levels = cqbLevels(lo, hi, interval);
        if (!levels.length) {
          report.warnings.push('The site rises only ' + (hi - lo).toFixed(1) +
            ' ft, less than one ' + interval + ' ft contour interval. No contours were drawn.');
        }
        var nLines = 0;
        levels.forEach(function (lv) {
          /* Index contours every fifth interval, the usual convention, so the
           * reader can label them separately. */
          var major = Math.abs(lv / (interval * 5) - Math.round(lv / (interval * 5))) < 1e-9;
          var layer = major ? 'CONTOUR-INDEX' : 'CONTOUR-INTERMEDIATE';
          doc.layer(layer, major ? 30 : 33);
          cqbChain(cqbMarchingSquares(grid, 0, 0, elev.gspec.step, lv)).forEach(function (line) {
            if (line.length < 2) return;
            var shifted = line.map(function (p) {
              return [p[0] + elev.gspec.x0 - origin[0], p[1] + elev.gspec.y0 - origin[1], lv];
            });
            doc.polyline3d(layer, shifted, false);
            nLines++;
          });
        });
        report.contourLines = nLines;
        report.contourInterval = interval;

        /* Corner spot elevations. The manual (p.905) says "Imported points are
         * converted to Elevation Points", so these can be brought in as terrain
         * data too -- but they are mainly here because "what is the grade at
         * each corner of my lot" is the question a designer actually asks, and
         * a contour map answers it only by eye. The label text is on its own
         * layer so converting the points to Elevation Data does not drag text
         * along with it. */
        doc.layer('SPOT-ELEVATION', 5);
        doc.layer('SPOT-ELEVATION-TEXT', 5);
        var spots = 0;
        lot.geometry.rings[0].forEach(function (p, i, arr) {
          if (i === arr.length - 1) return;
          var z = cqbSampleAt(grid, elev.gspec, p[0], p[1]);
          if (z == null) return;
          var lx = p[0] - origin[0], ly = p[1] - origin[1];
          doc.point('SPOT-ELEVATION', lx, ly, z);
          doc.text('SPOT-ELEVATION-TEXT', lx + 2, ly + 2, 2.5, z.toFixed(1));
          spots++;
        });
        report.spotElevations = spots;
      }
    }

    /* The provenance block goes in the drawing, not just in a dialog, because
     * the drawing is what gets emailed on. */
    doc.layer('_SOURCE-NOTES', 9);
    var b = cqbBounds([[[0, 0]]]);
    var ex = doc._extent();
    var ty = (isFinite(ex.miny) ? ex.miny : 0) - 30;
    var tx = isFinite(ex.minx) ? ex.minx : 0;
    var h = 3;
    var notes = [
      'PARCEL ' + report.pid + (report.address ? '   ' + report.address : ''),
      'NOT A SURVEY. Boundary is county GIS parcel mapping, not a boundary survey.',
      'Coordinates: NAD83 Nebraska State Plane, US survey feet, translated to a local origin.',
      'To restore state plane coordinates add E ' + origin[0] + '  N ' + origin[1] + '.',
      'Bearings are GRID bearings from state plane north, not record or geodetic bearings.'
    ];
    if (report.contourLines) {
      notes.push('Contours: USGS 3DEP bare-earth lidar, ' + report.contourInterval +
                 ' ft interval, NAVD88, sampled on a ' + report.gridStep + ' ft grid.');
      notes.push('Bare earth predates recent grading, fill and retaining walls, and does not');
      notes.push('include structures. Do NOT use for finished floor elevations, drainage design,');
      notes.push('or floodplain compliance. Those require a licensed survey.');
    }
    notes.push('Generated ' + new Date().toISOString().slice(0, 10) + ' by the Development Viewer Toolkit.');
    notes.forEach(function (line, i) {
      doc.text('_SOURCE-NOTES', tx, ty - i * h * 1.6, h, line);
    });

    report.dxf = doc.build();
    report.bytes = report.dxf.length;
    delete report._streetPaths;
    return report;
  });
}


/* Bilinear lookup into the sampled grid, in grid coordinates (state plane feet).
 * Returns null if any of the four surrounding nodes failed, rather than
 * quietly interpolating across a hole. */
function cqbSampleAt(grid, gspec, x, y) {
  var fc = (x - gspec.x0) / gspec.step;
  var fr = (y - gspec.y0) / gspec.step;
  var c0 = Math.floor(fc), r0 = Math.floor(fr);
  if (c0 < 0 || r0 < 0 || c0 + 1 >= gspec.cols || r0 + 1 >= gspec.rows) return null;
  var q11 = grid[r0][c0], q21 = grid[r0][c0 + 1];
  var q12 = grid[r0 + 1][c0], q22 = grid[r0 + 1][c0 + 1];
  if (q11 == null || q21 == null || q12 == null || q22 == null) return null;
  var tx = fc - c0, ty = fr - r0;
  return q11 * (1 - tx) * (1 - ty) + q21 * tx * (1 - ty) +
         q12 * (1 - tx) * ty + q22 * tx * ty;
}

/* ------------------------------------------------------------------ *
 * 7b. Elevation points as comma-delimited XYZ
 * ------------------------------------------------------------------ *
 *
 * Home Designer has a second, more direct route for terrain than DXF:
 *   File > Import > Terrain Data
 * which takes a comma-delimited X,Y,Z text file. Confirmed by Chief Architect
 * staff on their own Home Designer forum, and it avoids a documented defect in
 * the DXF route where imported elevation lines land on the "CAD, Default" layer
 * instead of "Terrain, Elevation Data" -- which Chief support acknowledged as
 * "not really a bug, but an oversight".
 *
 * The coordinates here MUST share the DXF's local origin, or the terrain and
 * the lot boundary will not line up. They are also plain feet near zero, which
 * is what stops the failure reported repeatedly on Chief's forums where people
 * feed in latitude and longitude and every point stacks up in one spot because
 * the values differ only in their decimals.
 */
function cqbElevationCsv(grid, gspec, origin, opts) {
  opts = opts || {};
  var maxPoints = opts.maxPoints || 2500;
  var rows = grid.length;
  var cols = rows ? grid[0].length : 0;

  /* Thin evenly rather than truncating, so a large lot keeps coverage over the
   * whole site instead of a dense patch in one corner. */
  var stride = 1;
  while (Math.ceil(rows / stride) * Math.ceil(cols / stride) > maxPoints) stride++;

  var out = [];
  for (var r = 0; r < rows; r += stride) {
    for (var c = 0; c < cols; c += stride) {
      var z = grid[r][c];
      if (z == null || !isFinite(z)) continue;
      var x = gspec.x0 + c * gspec.step - origin[0];
      var y = gspec.y0 + r * gspec.step - origin[1];
      out.push(x.toFixed(2) + ',' + y.toFixed(2) + ',' + z.toFixed(2));
    }
  }
  return { text: out.join('\r\n') + '\r\n', count: out.length, stride: stride };
}


/* ------------------------------------------------------------------ *
 * 8. Projection: NAD83 Nebraska State Plane <-> Web Mercator
 * ------------------------------------------------------------------ *
 *
 * The county serves geometry in whatever outSR is asked for, so the drawing
 * itself never needs this. The elevation service does: 3DEP is a federal
 * service and only Web Mercator input is verified against it, so the sample
 * grid -- which is generated in State Plane feet, because that is what the
 * drawing is in -- has to be converted before it is sent.
 *
 * Doing the conversion here rather than asking a projection service keeps the
 * export to one external dependency instead of two, and makes the maths
 * testable offline. It is checked against a control point measured live from
 * the county's own service on 2026-08-28, where one parcel corner came back as
 * both (-10753777.97, 4943045.94) Web Mercator and (2584370.09, 271786.10)
 * State Plane feet.
 *
 * Nebraska is a single-zone Lambert Conformal Conic (2SP) on GRS80:
 *   standard parallels 40 N and 43 N, false origin 39 50' N / 100 W,
 *   false easting 500000 m, false northing 0.
 * NAD83 and WGS84 differ by about a metre here, which is well inside the
 * accuracy of both the parcel mapping and the lidar, and is noted in the
 * drawing rather than corrected for.
 */

var CQB_LCC = (function () {
  var a = 6378137.0;                  /* GRS80 semi-major axis, metres */
  var f = 1 / 298.257222101;
  var e = Math.sqrt(2 * f - f * f);
  var US_FT = 1200 / 3937;            /* US survey foot, exactly */

  var p1 = 40 * Math.PI / 180;
  var p2 = 43 * Math.PI / 180;
  var p0 = (39 + 50 / 60) * Math.PI / 180;
  var l0 = -100 * Math.PI / 180;
  var FE = 500000, FN = 0;            /* metres */

  function m(p) { var s = Math.sin(p); return Math.cos(p) / Math.sqrt(1 - e * e * s * s); }
  function t(p) {
    var s = Math.sin(p);
    return Math.tan(Math.PI / 4 - p / 2) / Math.pow((1 - e * s) / (1 + e * s), e / 2);
  }

  var m1 = m(p1), m2 = m(p2), t1 = t(p1), t2 = t(p2), t0 = t(p0);
  var n = (Math.log(m1) - Math.log(m2)) / (Math.log(t1) - Math.log(t2));
  var F = m1 / (n * Math.pow(t1, n));
  var r0 = a * F * Math.pow(t0, n);

  return {
    /* State Plane feet -> WGS84 lon/lat degrees */
    toLonLat: function (xft, yft) {
      var x = xft * US_FT - FE;
      var y = r0 - (yft * US_FT - FN);
      var r = Math.sqrt(x * x + y * y);
      if (n < 0) r = -r;
      var tt = Math.pow(r / (a * F), 1 / n);
      var phi = Math.PI / 2 - 2 * Math.atan(tt);
      for (var i = 0; i < 12; i++) {
        var s = Math.sin(phi);
        var next = Math.PI / 2 - 2 * Math.atan(tt * Math.pow((1 - e * s) / (1 + e * s), e / 2));
        if (Math.abs(next - phi) < 1e-13) { phi = next; break; }
        phi = next;
      }
      var lam = Math.atan2(x, y) / n + l0;
      return [lam * 180 / Math.PI, phi * 180 / Math.PI];
    },

    /* WGS84 lon/lat degrees -> State Plane feet */
    fromLonLat: function (lon, lat) {
      var phi = lat * Math.PI / 180, lam = lon * Math.PI / 180;
      var r = a * F * Math.pow(t(phi), n);
      var g = n * (lam - l0);
      return [(FE + r * Math.sin(g)) / US_FT, (FN + r0 - r * Math.cos(g)) / US_FT];
    }
  };
})();

var CQB_WM_R = 6378137.0;

function cqbLonLatToWm(lon, lat) {
  var x = CQB_WM_R * lon * Math.PI / 180;
  var y = CQB_WM_R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
  return [x, y];
}

function cqbWmToLonLat(x, y) {
  return [x / CQB_WM_R * 180 / Math.PI,
          (2 * Math.atan(Math.exp(y / CQB_WM_R)) - Math.PI / 2) * 180 / Math.PI];
}

function cqbSpFtToWm(xft, yft) {
  var ll = CQB_LCC.toLonLat(xft, yft);
  return cqbLonLatToWm(ll[0], ll[1]);
}

function cqbWmToSpFt(x, y) {
  var ll = cqbWmToLonLat(x, y);
  return CQB_LCC.fromLonLat(ll[0], ll[1]);
}


/* ------------------------------------------------------------------ *
 * 10. Building line setback
 * ------------------------------------------------------------------ *
 *
 * Lincoln's Building Line Districts carry a literal DISTANCE in feet. That is
 * NOT the zoning setback envelope -- it is one specific mapped overlay -- and
 * the drawing says so, because conflating the two would be a permitting error
 * rather than a cosmetic one.
 *
 * A building line runs parallel to the street right of way, so it only applies
 * to the frontage edges of a lot. The parcel boundary IS the right of way line
 * (parcels end where the ROW begins), so frontage is found by asking which lot
 * edges run near a street centerline, then offsetting those inward.
 *
 * This is a heuristic. It is right for ordinary lots and can be wrong on flag
 * lots, corner lots with an ambiguous front, and parcels fronting an unmapped
 * private drive. The line is drawn dashed, on its own layer, labelled with the
 * district distance and marked derived, so it reads as a guide and not as a
 * surveyed control line.
 */

function cqbCentroid(ring) {
  var a = 0, cx = 0, cy = 0;
  for (var i = 0, n = ring.length; i < n - 1; i++) {
    var cross = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    a += cross;
    cx += (ring[i][0] + ring[i + 1][0]) * cross;
    cy += (ring[i][1] + ring[i + 1][1]) * cross;
  }
  a = a / 2;
  /* A degenerate or zero-area ring falls back to the average vertex rather than
   * dividing by zero and returning NaN, which would silently poison the offset
   * direction downstream. */
  if (Math.abs(a) < 1e-9) {
    var sx = 0, sy = 0, m = ring.length - 1;
    for (var j = 0; j < m; j++) { sx += ring[j][0]; sy += ring[j][1]; }
    return m ? [sx / m, sy / m] : [0, 0];
  }
  return [cx / (6 * a), cy / (6 * a)];
}

function cqbPtSegDist(p, a, b) {
  var dx = b[0] - a[0], dy = b[1] - a[1];
  var len2 = dx * dx + dy * dy;
  var t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0;
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  var qx = a[0] + t * dx, qy = a[1] + t * dy;
  return Math.sqrt((p[0] - qx) * (p[0] - qx) + (p[1] - qy) * (p[1] - qy));
}

/* Distance from a point to the nearest vertex-to-vertex segment of any path. */
function cqbDistToPaths(p, paths) {
  var best = Infinity;
  (paths || []).forEach(function (path) {
    for (var i = 0; i < path.length - 1; i++) {
      var d = cqbPtSegDist(p, path[i], path[i + 1]);
      if (d < best) best = d;
    }
  });
  return best;
}

/* Which edges of the lot front a street. maxDist is generous because the
 * centerline sits half a right of way away from the lot line -- typically
 * 25 to 40 ft on a residential street. */
function cqbFrontageEdges(ring, paths, maxDist, minLen) {
  maxDist = maxDist == null ? 60 : maxDist;
  minLen = minLen == null ? 10 : minLen;
  var out = [];
  for (var i = 0; i < ring.length - 1; i++) {
    var a = ring[i], b = ring[i + 1];
    if (cqbDist(a, b) < minLen) continue;
    var mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (cqbDistToPaths(mid, paths) <= maxDist) out.push(i);
  }
  return out;
}

/* Offset a segment perpendicular, toward whichever side the interior point is
 * on. Returns null for a degenerate segment rather than dividing by zero. */
function cqbOffsetEdge(a, b, interior, dist) {
  var dx = b[0] - a[0], dy = b[1] - a[1];
  var len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-9) return null;
  var nx = -dy / len, ny = dx / len;
  var mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  var side = (interior[0] - mid[0]) * nx + (interior[1] - mid[1]) * ny;
  var s = side < 0 ? -1 : 1;
  return [[a[0] + nx * dist * s, a[1] + ny * dist * s],
          [b[0] + nx * dist * s, b[1] + ny * dist * s]];
}

/* ------------------------------------------------------------------ *
 * 11. Soils, aggregated over the parcel
 * ------------------------------------------------------------------ *
 *
 * Percentages come from real clipped areas computed by the county's own public
 * geometry service, not from counting polygons or from bounding boxes. A soil
 * unit that clips a corner of the lot must not read the same as one covering
 * half of it.
 */

var CQB_SOIL_FIELDS = ['HYDROGROUP', 'DRAINCLASS', 'HYDRICRATE', 'SOILTYPE', 'SOILDESC', 'FARMCLASS'];

/* Group features by the value of one field, then measure each group's real
 * overlap with the parcel. clipFn is injected so this is testable without a
 * network. */
function cqbSoilSummary(features, field, parcelArea, clipFn) {
  var groups = {};
  features.forEach(function (f) {
    var v = f.attributes && f.attributes[field];
    var key = (v == null || String(v).trim() === '') ? 'Not rated' : String(v).trim();
    (groups[key] || (groups[key] = [])).push(f.geometry);
  });
  var keys = Object.keys(groups);
  if (!keys.length) return Promise.resolve([]);

  return Promise.all(keys.map(function (k) {
    return clipFn(groups[k]).then(function (area) { return { value: k, area: area || 0 }; });
  })).then(function (rows) {
    var total = rows.reduce(function (s, r) { return s + r.area; }, 0);
    /* Percentages are reported against the parcel, not against the measured
     * total, so a gap in soil coverage shows up as a shortfall instead of being
     * silently normalised away. */
    var basis = parcelArea > 0 ? parcelArea : total;
    return rows.filter(function (r) { return r.area > 0; })
      .sort(function (x, y) { return y.area - x.area; })
      .map(function (r) {
        return { value: r.value, area: r.area, pct: basis > 0 ? (r.area / basis) * 100 : 0 };
      });
  });
}

/* "B (62%), C (31%), D (7%)" -- whole percents, because the soil survey's own
 * mapping is nowhere near precise enough to justify decimals. */
function cqbSoilText(rows, maxParts) {
  if (!rows || !rows.length) return null;
  return rows.slice(0, maxParts || 4).map(function (r) {
    var p = r.pct < 1 ? '<1' : String(Math.round(r.pct));
    return r.value + ' (' + p + '%)';
  }).join(', ');
}



/* ------------------------------------------------------------------ *
 * 9. UI shim -- standalone bookmarklet entry point
 * ------------------------------------------------------------------ */

var CQB_SE_OPTIN = '__claude_qb_elev_optin';

function cqbSeCss() {
  if (document.getElementById('cqb-se-css')) return;
  var s = document.createElement('style');
  s.id = 'cqb-se-css';
  s.textContent =
    '.cqb-se-back{position:fixed;inset:0;background:rgba(10,16,24,.55);z-index:2147483600;' +
      'display:flex;align-items:center;justify-content:center;font:13px/1.45 system-ui,Segoe UI,Arial,sans-serif}' +
    '.cqb-se{background:#12202e;color:#dbe7f3;border:1px solid #2b4257;border-radius:10px;' +
      'width:460px;max-width:94vw;max-height:88vh;overflow:auto;box-shadow:0 18px 50px rgba(0,0,0,.5)}' +
    '.cqb-se h2{margin:0;padding:14px 18px;font-size:15px;border-bottom:1px solid #2b4257;font-weight:600}' +
    '.cqb-se .bd{padding:16px 18px}' +
    '.cqb-se label{display:block;margin:10px 0 4px;color:#9fb4c8;font-size:12px}' +
    '.cqb-se input[type=text],.cqb-se select{width:100%;box-sizing:border-box;background:#0b1622;' +
      'color:#dbe7f3;border:1px solid #2b4257;border-radius:5px;padding:7px 9px;font:inherit}' +
    '.cqb-se .row{display:flex;gap:9px;align-items:flex-start;margin:9px 0}' +
    '.cqb-se .row input{margin-top:2px;flex:none}' +
    '.cqb-se .row span{font-size:12px;color:#c2d4e6}' +
    '.cqb-se .warn{background:#2a2113;border:1px solid #6b5320;border-radius:6px;padding:9px 11px;' +
      'margin:10px 0;font-size:12px;color:#e8d5a8}' +
    '.cqb-se .ft{padding:13px 18px;border-top:1px solid #2b4257;display:flex;gap:9px;justify-content:flex-end}' +
    '.cqb-se button{background:#1d3346;border:1px solid #34506b;color:#dbe7f3;border-radius:6px;' +
      'padding:7px 15px;font:inherit;cursor:pointer}' +
    '.cqb-se button.go{background:#1e5b8a;border-color:#2b7cb8}' +
    '.cqb-se button:disabled{opacity:.5;cursor:default}' +
    '.cqb-se .st{padding:0 18px 14px;color:#9fb4c8;font-size:12px;min-height:16px}' +
    '.cqb-se .res{padding:0 18px 14px;font-size:12px}' +
    '.cqb-se .res b{color:#fff}' +
    '.cqb-se table{width:100%;border-collapse:collapse;margin-top:6px}' +
    '.cqb-se td{padding:2px 0;color:#c2d4e6}' +
    '.cqb-se td.n{text-align:right;color:#9fb4c8}';
  document.head.appendChild(s);
}

function cqbSeDownload(name, text) {
  var blob = new Blob([text], { type: 'application/dxf' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
}

/* Best effort at the parcel the user is already looking at, so the common case
 * is one click. Falls back to asking. */
function cqbSeGuessPid() {
  try {
    var m = (location.search + location.hash).match(/[?&#]pid=(\d{8,16})/);
    if (m) return m[1];
  } catch (e) {}
  try {
    var els = document.querySelectorAll('.gcx-feature-details, .gcx-feature-details *');
    for (var i = 0; i < els.length; i++) {
      var t = (els[i].textContent || '');
      var mm = t.match(/\bPID\s*(\d{10,14})\b/);
      if (mm) return mm[1];
    }
  } catch (e) {}
  return '';
}

function cqbSiteExportDialog() {
  cqbSeCss();
  var back = document.createElement('div');
  back.className = 'cqb-se-back';
  var optedIn = false;
  try { optedIn = localStorage.getItem(CQB_SE_OPTIN) === '1'; } catch (e) {}

  back.innerHTML =
    '<div class="cqb-se" role="dialog" aria-modal="true" aria-label="Export site plan">' +
      '<h2>Export site plan (DXF)</h2>' +
      '<div class="bd">' +
        '<label for="cqb-se-pid">Parcel ID</label>' +
        '<input type="text" id="cqb-se-pid" placeholder="10 to 14 digits">' +
        '<label for="cqb-se-margin">Context around the lot</label>' +
        '<select id="cqb-se-margin">' +
          '<option value="50">50 ft</option>' +
          '<option value="100" selected>100 ft</option>' +
          '<option value="250">250 ft</option>' +
        '</select>' +
        '<div class="row"><input type="checkbox" id="cqb-se-bear" checked>' +
          '<span>Label each lot line with a grid bearing and distance</span></div>' +
        '<div class="row"><input type="checkbox" id="cqb-se-cont"' + (optedIn ? '' : '') + '>' +
          '<span>Include contours and spot elevations</span></div>' +
        '<div id="cqb-se-elev" style="display:none">' +
          '<label for="cqb-se-int">Contour interval</label>' +
          '<select id="cqb-se-int"><option value="1">1 ft</option>' +
            '<option value="2" selected>2 ft</option></select>' +
          '<div class="warn" id="cqb-se-optin">' +
            '<b>This is the one thing that leaves the county server.</b><br>' +
            'The county publishes no elevation data, so contours come from the USGS 3D ' +
            'Elevation Program. Your browser sends the lot outline (public parcel ' +
            'coordinates, nothing about you) to elevation.nationalmap.gov and gets ground ' +
            'heights back.<br><br>' +
            'It is bare-earth lidar, <b>not a survey</b>: it predates recent grading and fill, ' +
            'omits structures, and must not be used for finished floor elevations, drainage ' +
            'design, or floodplain compliance.' +
            '<div class="row" style="margin-top:9px"><input type="checkbox" id="cqb-se-ok">' +
              '<span>Understood, fetch elevations</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="st" id="cqb-se-st"></div>' +
      '<div class="res" id="cqb-se-res"></div>' +
      '<div class="ft">' +
        '<button id="cqb-se-x">Close</button>' +
        '<button class="go" id="cqb-se-run">Export</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(back);

  var $ = function (id) { return back.querySelector('#' + id); };
  $('cqb-se-pid').value = cqbSeGuessPid();
  if (optedIn) { $('cqb-se-ok').checked = true; $('cqb-se-optin').style.display = 'none'; }

  $('cqb-se-cont').addEventListener('change', function () {
    $('cqb-se-elev').style.display = this.checked ? 'block' : 'none';
  });

  function close() { back.remove(); }
  $('cqb-se-x').addEventListener('click', close);
  back.addEventListener('click', function (e) { if (e.target === back) close(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });

  $('cqb-se-run').addEventListener('click', function () {
    var pid = ($('cqb-se-pid').value || '').replace(/\D/g, '');
    var st = $('cqb-se-st'), res = $('cqb-se-res');
    res.innerHTML = '';
    if (!/^\d{8,16}$/.test(pid)) { st.textContent = 'Enter a parcel ID first.'; return; }

    var wantContours = $('cqb-se-cont').checked;
    if (wantContours && !$('cqb-se-ok').checked) {
      st.textContent = 'Tick the elevation box to confirm, or switch contours off.';
      return;
    }
    if (wantContours) { try { localStorage.setItem(CQB_SE_OPTIN, '1'); } catch (e) {} }

    var btn = this;
    btn.disabled = true;
    st.textContent = 'Reading the parcel...';

    cqbSiteExport(pid, {
      contours: wantContours,
      interval: parseInt($('cqb-se-int').value, 10) || 2,
      margin: parseInt($('cqb-se-margin').value, 10) || 100,
      bearings: $('cqb-se-bear').checked,
      onStatus: function (t) { st.textContent = t; }
    }).then(function (r) {
      btn.disabled = false;
      st.textContent = 'Done.';
      cqbSeDownload('parcel_' + r.pid + '_site.dxf', r.dxf);
      /* Home Designer's File > Import > Terrain Data takes a comma delimited
       * XYZ file and puts the points straight onto the terrain layer, which is
       * more reliable than the DXF route. Both are offered; they share one
       * origin so they line up. */
      if (r.csv) {
        setTimeout(function () {
          cqbSeDownload('parcel_' + r.pid + '_elevations.txt', r.csv);
        }, 700);
      }

      var rows = Object.keys(r.layers).map(function (k) {
        return '<tr><td>' + k + '</td><td class="n">' + r.layers[k] + '</td></tr>';
      }).join('');
      if (r.contourLines) {
        rows += '<tr><td>contour lines</td><td class="n">' + r.contourLines + '</td></tr>';
      }
      if (r.csvPoints) {
        rows += '<tr><td>elevation points (.txt)</td><td class="n">' + r.csvPoints + '</td></tr>';
      }
      var extra = '';
      if (r.buildingLineFt) {
        extra += '<br>Building Line District: <b>' + r.buildingLineFt + ' ft</b>' +
          (r.frontageEdges ? ' (drawn on ' + r.frontageEdges +
            ' frontage edge' + (r.frontageEdges > 1 ? 's' : '') + ')' : '') +
          ' &mdash; this is the mapped building line, not the zoning setback envelope';
      }
      if (r.soils) {
        if (r.soils.HYDROGROUP) extra += '<br>Soils, hydrologic group: ' + r.soils.HYDROGROUP;
        if (r.soils.DRAINCLASS) extra += '<br>Drainage: ' + r.soils.DRAINCLASS;
        if (r.soils.HYDRICRATE) extra += '<br>Hydric: ' + r.soils.HYDRICRATE;
      }
      var html = '<b>parcel_' + r.pid + '_site.dxf</b> (' + Math.round(r.bytes / 1024) + ' KB)' +
        '<table>' + rows + '</table>' +
        '<div style="margin-top:8px;color:#9fb4c8">Lot area ' +
        Math.round(r.computedArea).toLocaleString() + ' sq ft' +
        (r.statedArea ? ' (Assessor: ' + Math.round(r.statedArea).toLocaleString() + ')' : '') +
        (r.reliefFt != null ? '<br>Relief ' + r.reliefFt.toFixed(1) + ' ft over the sampled area' : '') +
        extra + '</div>';
      if (r.warnings.length) {
        html += '<div class="warn">' + r.warnings.map(function (w) {
          return w.replace(/</g, '&lt;');
        }).join('<br><br>') + '</div>';
      }
      res.innerHTML = html;
    }).catch(function (e) {
      btn.disabled = false;
      st.textContent = '';
      res.innerHTML = '<div class="warn">' + String(e.message || e).replace(/</g, '&lt;') + '</div>';
    });
  });
}

  function chip(label, title) {
    var c = document.createElement('span');
    c.textContent = label;
    c.title = title;
    c.setAttribute('role', 'button');
    c.setAttribute('tabindex', '0');
    c.setAttribute('aria-label', title);
    c.style.cssText = 'cursor:pointer;padding:4px 10px;border-radius:12px;user-select:none;white-space:nowrap;outline-offset:2px;';
    c.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); c.click(); }
    });
    c.addEventListener('focus', function () { c.style.outline = '2px solid #7cc4ff'; });
    c.addEventListener('blur', function () { c.style.outline = 'none'; });
    return c;
  }
  function paint(c, on) {
    c.style.background = on ? '#1b5e20' : '#232b36';
    c.style.color = on ? '#d7ffd9' : '#a9bccf';
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  var sep = document.createElement('span');
  sep.setAttribute('aria-hidden', 'true');
  sep.style.cssText = 'width:1px;height:16px;background:#2c3a4d;margin:0 2px;';
  bar.appendChild(sep);

  /* chip row is rebuildable so the Settings popover can add/remove/relabel without a page reload */
  var chips = [];
  function renderChips() {
    chips.forEach(function (x) { x.c.remove(); });
    chips = [];
    cfg.forEach(function (q) {
      var lyr = layerOf(q.t);
      if (!lyr) return;
      var c = chip(q.l, 'Toggle layer: ' + q.t);
      paint(c, lyr.visible);
      c.onclick = function () { lyr.visible = !lyr.visible; ensureSub(lyr, q); paint(c, lyr.visible); };
      chips.push({ c: c, lyr: lyr });
      bar.insertBefore(c, sep);
    });
  }
  renderChips();
  function refresh() { chips.forEach(function (x) { paint(x.c, x.lyr.visible); }); }

  /* snap slots (named) */
  [1, 2].forEach(function (n) {
    var key = '__claude_qb_preset' + n;
    function readPreset() {
      var rawp = localStorage.getItem(key);
      if (!rawp) return null;
      try {
        var parsed = JSON.parse(rawp);
        return Array.isArray(parsed) ? { name: '', snap: parsed } : parsed; /* legacy raw-array snapshots still load */
      } catch (e) { return null; }
    }
    var c = chip('Snap ' + n, '');
    function retitle() {
      var p = readPreset();
      c.title = p
        ? 'Snap ' + n + (p.name ? ' ("' + p.name + '")' : '') + ': click applies; Shift+click re-saves'
        : 'Snap ' + n + ' is empty: Shift+click to save the current layers';
      c.setAttribute('aria-label', c.title);
      c.style.color = p ? '#7cc4ff' : '#7a8ba0';
    }
    c.style.background = '#232b36';
    retitle();
    c.onclick = function (ev) {
      if (ev.shiftKey) {
        var existing = readPreset();
        var nm = prompt('Name this snapshot (optional, Cancel keeps the current name):', existing && existing.name || '');
        if (nm === null) nm = (existing && existing.name) || '';
        localStorage.setItem(key, JSON.stringify({ name: nm, snap: snapshot() }));
        retitle();
        toast('Saved to Snap ' + n + (nm ? ' ("' + nm + '")' : ''));
      } else {
        var p = readPreset();
        if (!p) { toast('Snap ' + n + ' is empty - Shift+click to save the current layers'); return; }
        applySnap(p.snap);
        toast('Snap ' + n + (p.name ? ' ("' + p.name + '")' : '') + ' applied');
      }
    };
    bar.appendChild(c);
  });

  /* Declutter / Restore */
  var dc = chip('Declutter', 'Turn everything off except parcels and development; click again to restore');
  dc.style.background = '#232b36'; dc.style.color = '#ffcf87';
  dc.onclick = function () {
    if (window.__qbDeclutterSnap) {
      applySnap(window.__qbDeclutterSnap);
      window.__qbDeclutterSnap = null;
      dc.textContent = 'Declutter';
      toast('Layers restored');
    } else {
      window.__qbDeclutterSnap = snapshot();
      var keep = { 'Development': 1, 'Parcel Information': 1, 'City and Village Limits': 1, 'GWV Special Layer': 1 };
      v.map.layers.forEach(function (l) {
        if (l.opacity === 0) return;
        l.visible = !!keep[l.title];
      });
      refresh();
      dc.textContent = 'Restore';
      toast('Decluttered - click Restore to bring layers back');
    }
  };
  bar.appendChild(dc);

  /* Find Parcel accelerator */
  var fp = chip('\u2315 Parcel', 'Find a parcel by address or PID and show its record card (uses the search box text if present)');
  fp.style.background = '#24354d'; fp.style.color = '#cfe8ff';
  fp.onclick = function () { findParcel(); };
  bar.appendChild(fp);

  /* Copy a shareable deep link to the current view (and parcel) */
  var lk = chip('\ud83d\udd17 Link', 'Copy a link that reopens this view - and this parcel record, for anyone who also has the toolkit');
  lk.style.background = '#24354d'; lk.style.color = '#cfe8ff';
  lk.onclick = function () {
    var r = cqbBuildLink();
    var said = [r.meta.view ? 'view' : 'view unavailable'];
    if (r.meta.pid) said.push('parcel ' + r.meta.pid);
    said.push(r.meta.baseline
      ? (r.meta.native ? r.meta.native + ' layer change' + (r.meta.native === 1 ? '' : 's') : 'default layers')
      : 'layers for toolkit users only');
    cqbCopy(r.url, 'Link copied - ' + said.join(' \u00b7 '));
  };
  bar.appendChild(lk);

  /* Settings: reconfigure which layers appear as chips */
  var se = chip('Site DXF', 'Export this parcel as a CAD site plan (DXF) for Home Designer, Chief Architect, AutoCAD and similar');
  se.addEventListener('click', function () { try { cqbSiteExportDialog(); } catch (e) { toast('Site export failed to open: ' + (e && e.message ? e.message : e)); } });
  bar.appendChild(se);

  var gear = chip('\u2699', 'Configure which layers appear as chips on this bar');
  gear.style.color = '#a9bccf';
  gear.onclick = function () { openSettings(); };
  bar.appendChild(gear);

  var x = chip('\u00d7', 'Hide this bar (remembered on this browser - click the small tab to bring it back)');
  x.style.color = '#a9bccf'; x.style.padding = '4px 7px';
  x.onclick = function () { hideBar(); };
  bar.appendChild(x);
  document.body.appendChild(bar);

  /* ---- 5a. re-anchor the bar to the map container, not the viewport ----
   * The sidebar (Home/Layers/Results/etc.) changes the map's on-screen width and left edge
   * when it opens, closes, or gets resized. A bar centered on the *viewport* drifts off-center
   * over the map whenever that happens. .gcx-map-container is VertiGIS's own wrapper around the
   * map view and tracks that area exactly; anchor to it and fall back to the old viewport-centered
   * behavior if it's ever missing (a VertiGIS markup change, or a differently-configured app). */
  function positionBar() {
    var mc = document.querySelector('.gcx-map-container');
    if (mc && mc.offsetWidth > 0) {
      var r = mc.getBoundingClientRect();
      bar.style.left = Math.round(r.left + r.width / 2) + 'px';
      bar.style.transform = 'translateX(-50%)';
      bar.style.maxWidth = 'min(680px,' + Math.max(200, Math.round(r.width * 0.86)) + 'px)';
    } else {
      bar.style.left = '50%';
      bar.style.transform = 'translateX(-50%)';
      bar.style.maxWidth = 'min(680px,86vw)';
    }
  }
  positionBar();
  var mapContainerEl = document.querySelector('.gcx-map-container');
  if (window.ResizeObserver && mapContainerEl) {
    var ro = new ResizeObserver(positionBar);
    ro.observe(mapContainerEl);
    window.__cqbResizeObserver = ro;
  }
  window.addEventListener('resize', positionBar);

  /* ---- 5b. remembered show/hide state ---- */
  function hideBar() {
    localStorage.setItem('__claude_qb_hidden', '1');
    bar.style.display = 'none';
    showHandle();
  }
  function showHandle() {
    if (document.getElementById('cqb-handle')) return;
    var h = document.createElement('span');
    h.id = 'cqb-handle';
    h.textContent = '\u25b2 Quick Bar';
    h.setAttribute('role', 'button'); h.setAttribute('tabindex', '0');
    h.setAttribute('aria-label', 'Show the Quick Bar');
    h.style.cssText = 'position:fixed;bottom:8px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(15,20,28,.9);color:#7a8ba0;border:1px solid #2c3a4d;border-radius:10px;padding:2px 10px;font:10px "Segoe UI",sans-serif;cursor:pointer;user-select:none;';
    function show() {
      localStorage.setItem('__claude_qb_hidden', '0');
      h.remove();
      bar.style.display = 'flex';
    }
    h.onclick = show;
    h.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); show(); } });
    document.body.appendChild(h);
  }
  if (localStorage.getItem('__claude_qb_hidden') === '1') { bar.style.display = 'none'; showHandle(); }

  /* ---- 5c. small accessibility/UX patches on existing chrome (self-healing, re-applied on a timer
   * since the SPA re-renders this chrome independently of anything the bar does) ---- */
  function fixAriaLabels() {
    ['minimize', 'maximize'].forEach(function (key) {
      var el = document.querySelector('[data-test="' + key + '"]');
      if (el && !el.getAttribute('aria-label') && el.title) el.setAttribute('aria-label', el.title);
    });
  }
  function annotateEmptyLegend() {
    document.querySelectorAll('.esri-legend__message').forEach(function (el) {
      if (el.__cqbAnnotated) return;
      el.__cqbAnnotated = true;
      var hint = document.createElement('div');
      hint.className = 'cqb-legend-hint';
      hint.textContent = 'Turn on a layer to see its legend.';
      hint.style.cssText = 'color:#6f8bb0;font-size:11px;margin-top:4px;';
      el.insertAdjacentElement('afterend', hint);
    });
  }

  /* ---- 5d. hide "View Oblique Aerials" on every result except the Development Information popup ----
   * The per-result action row (role="menubar" inside .gcx-feature-details) is the same six buttons
   * for every layer's result; "View Oblique Aerials" is only meaningful for a parcel. There's no
   * reliable DOM marker to test for "this is our popup" -- the sanitizer strips id / class / data-* / title
   * attributes from plain tags (live-confirmed 2026-08-27), so this keys off plain visible text instead: the v6
   * popup always renders a "DEVELOPMENT ACTIVITY" and "STAFF & CONTACTS" section header, in that exact
   * text, which is not something the sanitizer can strip. */
  function isDevInfoPanel(panel) {
    var desc = panel.querySelector('[data-test="description-value"]');
    var t = (desc && desc.textContent) || '';
    return t.indexOf('STAFF & CONTACTS') !== -1 || t.indexOf('DEVELOPMENT ACTIVITY') !== -1;
  }
  function fixObliqueButton(panel) {
    var btn = panel.querySelector('[role="menubar"] [aria-label="View Oblique Aerials"]');
    if (!btn) return;
    var item = btn.closest('li') || btn;
    item.style.display = isDevInfoPanel(panel) ? '' : 'none';
  }

  /* ---- 5e. repair "#INVALID" values left by the VertiGIS Arcade paging bug ----
   * The bug lives inside VertiGIS's own bundle (their paged FeatureSet query throws
   * "Cannot read properties of undefined (reading 'featureResult')"), so no Arcade-level
   * change can catch it -- the popup just renders the literal text "#INVALID".
   * The map services themselves are fine, so we re-run the equivalent query over REST
   * and write the real value back into the DOM. Live-proven on PID 1616406005000:
   * popup said "#INVALID" for Zoning, REST said "AGR".
   * Self-contained on purpose (own service root + fetch helper) so it has no ordering
   * dependency on the Find Parcel section defined further down this file. */
  var CQB_SVC = 'https://gis.lincoln.ne.gov/public/rest/services';
  var cqbLayerUrl = {};      /* layer title -> ".../MapServer/<n>", resolved from the live map */
  var cqbGeomCache = {};     /* pid -> parcel geometry (one fetch per parcel, not per field) */
  var cqbValueCache = {};    /* pid + "|" + label -> repaired string */
  var cqbInFlight = {};

  function cqbQuery(url, params) {
    return fetch(url + '/query', {
      method: 'POST',
      body: new URLSearchParams(Object.assign({ f: 'json' }, params))
    }).then(function (r) { return r.json(); });
  }

  /* Resolve by the same title the Arcade passes to FeatureSetByName. Prefer a real
   * feature layer: several titles in this web map are shared with group layers. */
  function cqbResolveLayer(title) {
    if (cqbLayerUrl[title] !== undefined) return cqbLayerUrl[title];
    var hit = null;
    v.map.allLayers.forEach(function (l) {
      if (hit) return;
      if (l.title === title && l.type === 'feature' && l.url && l.layerId !== null && l.layerId !== undefined) hit = l;
    });
    cqbLayerUrl[title] = hit ? (hit.url + '/' + hit.layerId) : null;
    return cqbLayerUrl[title];
  }

  /* The inspector/planner phone fields carry three different formats and at least one
   * malformed value ("(402 580-8117", missing its closing bracket) -- counted live across all
   * 22 inspector records. Normalise for display only; the underlying data is the county's. */
  /* Arcade's Distinct() preserves order; Sort(Distinct()) does not. Some rows use one and
   * some the other, so both are needed to reproduce them faithfully. */
  /* FEMA zone handling lives here once. There were previously two independent AE-only tests --
   * this repair table and the Find Parcel card -- plus a third in the popup's Arcade, and all
   * three were wrong in the same way. One function now, used by both JS call sites.
   *
   * Facts this is built on, counted live on 2026-08-28 against FEMAFlood/1 (1,593 polygons):
   *   FLD_ZONE is 'AE' (1,512) or 'A' (81) and nothing else.
   *   FLOODWAY is the string 'FLOODWAY' (66) or a SINGLE SPACE ' ' (1,527) -- never empty, never
   *   null, which is why every comparison here trims first. */
  function cqbFloodParts(rows) {
    var parts = [];
    rows.forEach(function (a) {
      var z = String(a.FLD_ZONE === null || a.FLD_ZONE === undefined ? '' : a.FLD_ZONE).trim();
      if (z === 'AE') parts.push('100-Year Floodplain (Zone AE)');
      else if (z === 'A') parts.push('100-Year Floodplain (Zone A - no base flood elevation determined)');
      var w = String(a.FLOODWAY === null || a.FLOODWAY === undefined ? '' : a.FLOODWAY).trim();
      if (w === 'FLOODWAY') parts.push('FLOODWAY');
    });
    return parts;
  }
  /* the short form the Find Parcel card uses, same classification, less room */
  function cqbFloodShort(rows) {
    var zones = {}, way = false;
    rows.forEach(function (a) {
      var z = String(a.FLD_ZONE === null || a.FLD_ZONE === undefined ? '' : a.FLD_ZONE).trim();
      if (z === 'AE' || z === 'A') zones[z] = 1;
      if (String(a.FLOODWAY === null || a.FLOODWAY === undefined ? '' : a.FLOODWAY).trim() === 'FLOODWAY') way = true;
    });
    var names = Object.keys(zones).sort();
    if (!names.length) return 'None mapped';
    return '100-yr (' + names.join(' + ') + ')' + (way ? ' + FLOODWAY' : '');
  }

  var CQB_GEOM_SVC = 'https://gis.lincoln.ne.gov/public/rest/services/Utilities/Geometry/GeometryServer';
  function cqbGeoPost(op, params) {
    return fetch(CQB_GEOM_SVC + '/' + op, { method: 'POST', body: new URLSearchParams(Object.assign({ f: 'json' }, params)) })
      .then(function (r) { return r.json(); });
  }

  /* How much of the parcel is actually in the floodplain. "Floodplain: 100-yr (AE)" is true of a
   * parcel with one corner clipped and of one wholly under water, and those are not the same
   * conversation. Computed with the county's own public geometry service: union the flood polygons
   * touching the parcel, intersect with the parcel, measure geodesically.
   *
   * Validated 2026-08-28 before being trusted: the same call measured parcel 1435300004000 at
   * 195,101 sq ft against the Assessor's own GIS_AREA of 195,121 -- 0.01% apart -- so the areas
   * this returns agree with the county's own numbers. Percentages are taken against GIS_AREA for
   * that reason. Returns null on any failure, and the row simply keeps the plain zone text. */
  function cqbFloodPercent(parcelGeom, declaredArea) {
    if (!parcelGeom || !parcelGeom.rings || !declaredArea || declaredArea <= 0) return Promise.resolve(null);
    return q('/LTUWatershed/FEMAFlood/MapServer/1', {
      geometry: JSON.stringify(parcelGeom), geometryType: 'esriGeometryPolygon', inSR: '3857', outSR: '3857',
      spatialRel: 'esriSpatialRelIntersects', outFields: 'FLD_ZONE', returnGeometry: 'true', resultRecordCount: '50'
    }).then(function (r) {
      var geoms = ((r && r.features) || []).map(function (f) { return f.geometry; })
        .filter(function (g) { return g && g.rings && g.rings.length; });
      if (!geoms.length) return null;
      return cqbGeoPost('union', { sr: '3857', geometries: JSON.stringify({ geometryType: 'esriGeometryPolygon', geometries: geoms }) })
        .then(function (u) {
          if (!u || u.error) return null;
          return cqbGeoPost('intersect', {
            sr: '3857',
            geometries: JSON.stringify({ geometryType: 'esriGeometryPolygon', geometries: [parcelGeom] }),
            geometry: JSON.stringify({ geometryType: 'esriGeometryPolygon', geometry: u.geometry || u })
          });
        })
        .then(function (ix) {
          if (!ix || ix.error) return null;
          var pieces = (ix.geometries || []).filter(function (g) { return g && g.rings && g.rings.length; });
          if (!pieces.length) return null;
          return cqbGeoPost('areasAndLengths', {
            sr: '3857', polygons: JSON.stringify(pieces),
            areaUnit: JSON.stringify({ areaUnit: 'esriSquareFeet' }), lengthUnit: '9002', calculationType: 'geodesic'
          });
        })
        .then(function (al) {
          if (!al || al.error || !al.areas || !al.areas.length) return null;
          return cqbFloodPctText(al.areas.reduce(function (x, y) { return x + Math.abs(y); }, 0), declaredArea);
        });
    }).catch(function () { return null; });
  }

  /* Kept separate so it can be tested without the network. Deliberately coarse: the flood mapping
   * and the parcel boundary are not survey-accurate, so a figure like "37.2%" would imply a
   * precision that is not there. */
  function cqbFloodPctText(floodArea, parcelArea) {
    if (!(floodArea > 0) || !(parcelArea > 0)) return null;
    var pct = floodArea / parcelArea * 100;
    if (pct < 0.5) return 'under 1% of parcel';
    if (pct >= 99.5) return 'entire parcel';
    return Math.round(pct) + '% of parcel';
  }

  function cqbUniq(arr) {
    var seen = {}, out = [];
    arr.forEach(function (x) {
      if (x === null || x === undefined) return;
      var s = String(x).trim();
      if (!s || seen[s]) return;
      seen[s] = 1; out.push(s);
    });
    return out;
  }

  function cqbPhone(raw) {
    if (raw === null || raw === undefined) return '';
    var digits = String(raw).replace(/[^0-9]/g, '');
    if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
    if (digits.length !== 10) return String(raw).trim();      /* not a NANP number: leave as-is */
    return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
  }

  function cqbUniqSort(arr) {
    var seen = {}, out = [];
    arr.forEach(function (x) {
      if (x === null || x === undefined) return;
      var s = String(x).trim();
      if (!s || seen[s]) return;
      seen[s] = 1; out.push(s);
    });
    return out.sort();
  }

  /* expr3's decode table, reproduced exactly. */
  var CQB_LUCODE = {
    11: 'Single Family Detached', 12: 'Duplex', 13: 'Single Family Attached', 14: 'Apartments',
    15: 'Group Quarters', 16: 'Special Housing', 17: 'Mobile Homes, Parks and Courts',
    21: 'Commercial - NEC', 22: 'Commercial w/Residential Units Above', 23: 'Parking Lot',
    24: 'Parking Garage', 31: 'Light Industrial', 32: 'Heavy Industrial', 33: 'Utility Facility',
    34: 'Railroad', 35: 'Airports', 41: 'Public & Semi-Public NEC', 42: 'Educational Institutions',
    43: 'Churches, Synagogues and Temples', 44: 'Hospitals', 51: 'Park Land', 52: 'Open Space',
    53: 'Golf Courses', 61: 'Lakes', 62: 'Streams and Creeks', 63: 'Wetlands',
    64: 'Environmental Preserve', 65: 'Forest/Woodlands', 71: 'Public Right of Way',
    72: 'Vacated ROW', 81: 'Agricultural Production:Crops/Tree Farms',
    82: 'Agricultural Production: Livestock & Animal/Feed Lots', 83: 'Mining and Extraction',
    84: 'Pasture/Grassland', 90: 'Vacant'
  };

  /* One entry per repairable row. `fields` is what we ask the service for; `format`
   * turns the returned features into the exact string the Arcade would have produced,
   * including its empty-case fallback. */
  var CQB_REPAIRS = {
    'Zoning': {
      layer: 'Zoning', fields: 'ZONE',
      format: function (fs) {
        var vals = cqbUniqSort(fs.map(function (f) { return f.attributes.ZONE; }));
        return vals.length ? vals.join(', ') : 'Unknown';           /* expr1 */
      }
    },
    'Floodplain': {
      layer: 'FEMA Floodplain', fields: 'FLD_ZONE,FLOODWAY',
      format: function (fs) {
        var parts = cqbFloodParts(fs.map(function (f) { return f.attributes; }));
        return parts.length ? cqbUniqSort(parts).join(' + ') : 'None mapped';   /* expr16, v8 */
      }
    },
    'Existing use': {
      layer: 'Existing Land Use (Planning)', fields: 'LUCODE',
      format: function (fs) {
        var vals = cqbUniqSort(fs.map(function (f) {
          var c = f.attributes.LUCODE;
          return CQB_LUCODE[c] || (c === null || c === undefined ? null : 'Other');
        }));
        return vals.length ? vals.join(', ') : 'No Existing Landuse Values Determined';  /* expr3 */
      }
    },
    'Future use': {
      layer: 'Future Land Use (2050 Comp Plan)', fields: 'CAT',
      format: function (fs) {
        return cqbUniqSort(fs.map(function (f) { return f.attributes.CAT; })).join(', ');  /* expr17 */
      }
    },
    'Growth tier': {
      layer: 'Growth Tiers (2050 Comp Plan)', fields: 'Tier',
      format: function (fs) {
        var vals = cqbUniqSort(fs.map(function (f) { return f.attributes.Tier; }));
        return vals.length ? vals.join(', ') : '\u2014';             /* expr18 */
      }    },
    /* ---- v3.7: the rest of the rows that can hit the same platform bug ----
     * Each reproduces its Arcade expression exactly, including which ones Sort and which
     * only Distinct, and each expression's own empty-case string -- those differ per row
     * ('None', '', 'N/A', an em-dash) and getting them wrong would be a silent rewrite of
     * what the popup says. */
    'Applications': {
      layer: 'Applications', fields: 'APPNUM',
      format: function (fs) {
        var vals = cqbUniqSort(fs.map(function (f) { return f.attributes.APPNUM; }));
        return vals.length ? vals.join(', ') : 'None';                       /* expr4 */
      }
    },
    'Project': {
      layer: 'Final Approved Plans', fields: 'Title',
      format: function (fs) { return cqbUniqSort(fs.map(function (f) { return f.attributes.Title; })).join(', '); }   /* expr8 */
    },
    'Approved plan': {
      layer: 'Final Approved Plans', fields: 'APPNUM',
      format: function (fs) { return cqbUniqSort(fs.map(function (f) { return f.attributes.APPNUM; })).join(', '); }  /* expr5 */
    },
    'Amendment': {
      layer: 'Final Approved Plans', fields: 'ApproveApp',
      format: function (fs) { return cqbUniqSort(fs.map(function (f) { return f.attributes.ApproveApp; })).join(', '); } /* expr7 */
    },
    'Parent app': {
      layer: 'Final Approved Plans', fields: 'ParentApp',
      format: function (fs) { return cqbUniqSort(fs.map(function (f) { return f.attributes.ParentApp; })).join(', '); } /* expr6 */
    },
    'Subdiv. permit': {
      layer: 'City Subdivision Permits', fields: 'PermitNo',
      format: function (fs) { return cqbUniqSort(fs.map(function (f) { return f.attributes.PermitNo; })).join(', '); } /* expr15 */
    },
    'Annex. agmt.': {
      layer: 'Annexation Agreements', fields: 'RESNO',
      format: function (fs) { return cqbUniqSort(fs.map(function (f) { return f.attributes.RESNO; })).join(', '); }   /* expr14 */
    },
    'Fire': {
      layer: 'Fire Districts', fields: 'Dist_Name',
      format: function (fs) {
        var vals = cqbUniqSort(fs.map(function (f) { return f.attributes.Dist_Name; }));
        return vals.length ? vals.join(', ') : 'N/A';                        /* expr26 */
      }
    },
    'Area planner': {
      layer: 'Development Review Areas', fields: 'Region,Planner,Phone',
      format: function (fs) {
        var parts = [];
        fs.forEach(function (f) {
          var a = f.attributes;
          var n = a.Region === 'Village' ? 'Village of ' + a.Planner : a.Planner;
          if (a.Phone !== null && a.Phone !== undefined && String(a.Phone).trim() !== '') n = n + ' \u00b7 ' + cqbPhone(a.Phone);
          if (n) parts.push(n);
        });
        return parts.length ? cqbUniq(parts).join(', ') : '\u2014';          /* expr50: Distinct, not Sort */
      }
    },
    'Case planner': {
      layer: 'Applications View', fields: 'PLANNER_ASSIGNED',
      format: function (fs) {
        var vals = [];
        fs.forEach(function (f) {
          var p = f.attributes.PLANNER_ASSIGNED;
          if (p !== null && p !== undefined && String(p).trim() !== '') vals.push(p);
        });
        return cqbUniqSort(vals).join(', ');                                 /* expr52 */
      }
    }
  };

  /* the five Inspector rows are one shape; generated so a discipline cannot be half-wired */
  ['Building', 'Electrical', 'Housing', 'Mechanical', 'Plumbing'].forEach(function (disc) {
    CQB_REPAIRS[disc] = {
      layer: 'Inspector Areas - ' + disc, fields: 'InspectorName,PhoneNumber',
      format: function (fs) {
        var parts = [];
        fs.forEach(function (f) {
          var a = f.attributes;
          if (a.InspectorName === null || a.InspectorName === undefined || String(a.InspectorName).trim() === '') return;
          var n = String(a.InspectorName).trim();
          if (a.PhoneNumber !== null && a.PhoneNumber !== undefined && String(a.PhoneNumber).trim() !== '') n = n + ' \u00b7 ' + cqbPhone(a.PhoneNumber);
          parts.push(n);
        });
        return parts.length ? cqbUniq(parts).join(', ') : '\u2014';        /* expr57-61: Distinct, not Sort */
      }
    };
  });

  /* The Arcade shrinks the parcel 10 ft inward before intersecting so a boundary that
   * coincides with a zoning line doesn't drag in the neighbour. No geometryEngine is
   * reachable from the page, so approximate it by pulling every vertex toward the ring
   * centroid. Web Mercator exaggerates distance by 1/cos(latitude), so convert first.
   * Only used to disambiguate a multi-value result -- see cqbLookup. */
  function cqbShrink(geom, feet) {
    if (!geom || !geom.rings || !geom.rings.length) return geom;
    var lat = 2 * Math.atan(Math.exp(geom.rings[0][0][1] / 6378137)) - Math.PI / 2;
    var d = (feet * 0.3048) / Math.max(0.2, Math.cos(lat));
    var rings = geom.rings.map(function (ring) {
      var cx = 0, cy = 0;
      ring.forEach(function (p) { cx += p[0]; cy += p[1]; });
      cx /= ring.length; cy /= ring.length;
      return ring.map(function (p) {
        var dx = p[0] - cx, dy = p[1] - cy, len = Math.sqrt(dx * dx + dy * dy);
        if (len <= d * 1.5) return [p[0], p[1]];   /* too small to shrink safely */
        var k = (len - d) / len;
        return [cx + dx * k, cy + dy * k];
      });
    });
    return { rings: rings, spatialReference: geom.spatialReference };
  }

  function cqbParcelGeom(pid) {
    if (cqbGeomCache[pid]) return Promise.resolve(cqbGeomCache[pid]);
    return cqbQuery(CQB_SVC + '/Assessor/TaxParcels/MapServer/0', {
      where: "PARCELID='" + String(pid).replace(/'/g, "''") + "'",
      outSR: '3857', returnGeometry: 'true', outFields: 'PARCELID', resultRecordCount: '1'
    }).then(function (r) {
      var g = r.features && r.features[0] && r.features[0].geometry;
      if (g) cqbGeomCache[pid] = g;
      return g;
    });
  }

  function cqbLookup(pid, label) {
    var key = pid + '|' + label;
    if (cqbValueCache[key] !== undefined) return Promise.resolve(cqbValueCache[key]);
    if (cqbInFlight[key]) return cqbInFlight[key];
    var spec = CQB_REPAIRS[label];
    var url = spec && cqbResolveLayer(spec.layer);
    if (!url) return Promise.resolve(null);

    var p = cqbParcelGeom(pid).then(function (geom) {
      if (!geom) return null;
      function run(g) {
        return cqbQuery(url, {
          geometry: JSON.stringify(g), geometryType: 'esriGeometryPolygon', inSR: '3857',
          spatialRel: 'esriSpatialRelIntersects', returnGeometry: 'false',
          outFields: spec.fields, resultRecordCount: '50'
        }).then(function (r) { return (r && r.features) || []; });
      }
      return run(geom).then(function (feats) {
        /* Exactly one distinct answer means the -10 ft buffer could not have changed it,
         * so skip the approximation entirely. Only disambiguate when it actually matters. */
        var distinct = cqbUniqSort(feats.map(function (f) {
          return spec.fields.split(',').map(function (k) { return f.attributes[k]; }).join('');
        }));
        if (distinct.length <= 1) return spec.format(feats);
        return run(cqbShrink(geom, 10)).then(function (inner) {
          return spec.format(inner.length ? inner : feats);
        });
      });
    }).then(function (val) {
      cqbValueCache[key] = val;
      delete cqbInFlight[key];
      return val;
    }).catch(function () { delete cqbInFlight[key]; return null; });

    cqbInFlight[key] = p;
    return p;
  }

  function cqbPidOf(panel) {
    var desc = panel.querySelector('[data-test="description-value"]');
    var m = desc && (desc.textContent || '').match(/PID\s*([0-9]{8,16})/);
    return m ? m[1] : null;
  }

  /* Which repair applies to the element holding this "#INVALID"? Row values are in a
   * <tr> whose first <td> is the label; the FEMA banner is a <div> with its own text. */
  function cqbLabelFor(el) {
    var row = el.closest && el.closest('tr');
    if (row) {
      var td = row.querySelector('td');
      if (td) {
        var l = (td.textContent || '').trim();
        if (CQB_REPAIRS[l]) return l;
      }
    }
    /* Some values are not table rows at all but inline "Label: <strong>value</strong>"
     * (Fire, Area planner, Case planner). Key off the text immediately before the <strong>. */
    if (el && el.tagName === 'STRONG') {
      var prev = el.previousSibling, txt = '';
      while (prev && txt.length < 40) {
        if (prev.nodeType === 3) txt = prev.nodeValue + txt;
        else if (prev.nodeType === 1) txt = (prev.textContent || '') + txt;
        prev = prev.previousSibling;
      }
      var m2 = txt.replace(/\s+/g, ' ').match(/([A-Za-z][A-Za-z .]{1,18}):\s*$/);
      if (m2) {
        var inline = m2[1].trim();
        if (CQB_REPAIRS[inline]) return inline;
      }
    }
    var node = el;
    for (var i = 0; i < 4 && node; i++) {
      var t = (node.textContent || '').trim();
      if (t.indexOf('\u26a0 FEMA:') === 0) return 'Floodplain';
      node = node.parentElement;
    }
    return null;
  }

  function repairInvalidValues(panel) {
    if (!isDevInfoPanel(panel)) return;
    var pid = cqbPidOf(panel);
    if (!pid) return;
    var desc = panel.querySelector('[data-test="description-value"]');
    if (!desc) return;
    var walker = document.createTreeWalker(desc, NodeFilter.SHOW_TEXT, null);
    var targets = [], n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue.indexOf('#INVALID') !== -1 && !n.__cqbRepairing) targets.push(n);
    }
    targets.forEach(function (node) {
      var el = node.parentElement;
      if (!el) return;
      var label = cqbLabelFor(el);
      if (!label) return;
      node.__cqbRepairing = true;
      cqbLookup(pid, label).then(function (val) {
        if (val === null || val === undefined) { node.__cqbRepairing = false; return; }
        if (!node.parentElement || !document.contains(node)) return;  /* panel re-rendered under us */
        node.nodeValue = node.nodeValue.replace(/#INVALID/g, val);
        var mark = node.parentElement;
        mark.style.borderBottom = '1px dotted #7cc4ff';
        mark.title = 'Recovered by Quick Bar: the app\'s own lookup for this field failed '
          + '(a known VertiGIS bug), so this value was read straight from the '
          + 'map service instead.';
      });
    });
  }


  /* ---- 5d. the DATS Report menu item (v3.6) ----------------------------------------------
   * "I want to... > DATS Report" runs VertiGIS workflow item e40e25c0d0d74553b81c041160672b58,
   * which is not shared publicly. For an anonymous visitor the workflow runtime loads and then
   * nothing happens at all -- no message, no error, just a menu item that does nothing.
   *
   * This does NOT blanket-hide it. It asks the portal whether this session can actually reach
   * the item, and hides it only when the answer is no, so anyone signed in keeps the feature.
   * Note the check: ArcGIS reports the refusal as {"error":{"code":403}} in the BODY of an
   * HTTP 200 response, so testing response.ok would report success -- verified live. */
  var CQB_DATS_ITEM = 'e40e25c0d0d74553b81c041160672b58';
  var cqbDatsBlocked = null;            /* null = not known yet; true = unusable; false = fine */
  function cqbProbeDats() {
    if (window.__cqbDatsProbed) return;
    window.__cqbDatsProbed = true;
    fetch('https://gis.lincoln.ne.gov/portal/sharing/rest/content/items/' + CQB_DATS_ITEM + '?f=json',
      { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (j) { cqbDatsBlocked = !!(j && j.error); })
      .catch(function () { cqbDatsBlocked = null; });   /* unknown -> leave the menu alone */
  }
  function gateDatsMenuItem() {
    if (localStorage.getItem('__claude_qb_nodats') === '1') return;
    cqbProbeDats();
    if (cqbDatsBlocked !== true) return;                /* usable, or not yet known: never hide */
    document.querySelectorAll('[role="menuitem"]').forEach(function (mi) {
      if ((mi.textContent || '').indexOf('DATS Report') !== 0) return;
      if (mi.style.display !== 'none') mi.style.display = 'none';
    });
  }

  function fixAllFeatureDetailPanels() {
    document.querySelectorAll('.gcx-feature-details').forEach(function (p) {
      fixObliqueButton(p);
      try { repairInvalidValues(p); } catch (e) { /* never let a repair break the bar */ }
    });
    try { maintainSearchGroup(); } catch (e) { /* the search box must survive our mistakes */ }
    try { gateDatsMenuItem(); } catch (e) { /* nor must the "I want to..." menu */ }
  }
  var featureObsTimer = null;
  if (window.MutationObserver) {
    var fo = new MutationObserver(function () {
      /* debounce: a result render touches the DOM many times in quick succession */
      if (featureObsTimer) clearTimeout(featureObsTimer);
      featureObsTimer = setTimeout(fixAllFeatureDetailPanels, 150);
    });
    fo.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.__cqbFeatureObserver = fo;
  }
  fixAllFeatureDetailPanels();

  function periodicMaintenance() {
    refresh();
    fixAriaLabels();
    annotateEmptyLegend();
  }
  periodicMaintenance();
  window.__cqbRefreshTimer = setInterval(periodicMaintenance, 1500);

  /* ---- 6. Find Parcel card + Settings popover ---- */
  var SVC = 'https://gis.lincoln.ne.gov/public/rest/services';
  function q(path, params) {
    return fetch(SVC + path + '/query', { method: 'POST', body: new URLSearchParams(Object.assign({ f: 'json' }, params)) })
      .then(function (r) { return r.json(); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&#39;'); }
  function card(html) {
    var oldc = document.getElementById('cqb-card'); if (oldc) oldc.remove();
    var d = document.createElement('div');
    d.id = 'cqb-card';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', 'Parcel record card');
    d.style.cssText = 'position:fixed;top:56px;right:12px;z-index:99998;width:min(330px,92vw);max-height:calc(100vh - 140px);overflow-y:auto;background:#141a22;border:1px solid #2c3a4d;border-radius:8px;padding:12px;color:#e8eef5;font:12px "Segoe UI",sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.6);line-height:1.45;';
    d.innerHTML = html;
    var close = document.createElement('div');
    close.style.cssText = 'text-align:right;margin-top:8px;';
    close.innerHTML = "<span role='button' tabindex='0' id='cqb-card-x' style='cursor:pointer;color:#a9bccf;padding:2px 10px;border:1px solid #2c3a4d;border-radius:4px;'>close</span>";
    d.appendChild(close);
    document.body.appendChild(d);
    var cx = document.getElementById('cqb-card-x');
    cx.onclick = function () { d.remove(); };
    cx.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); d.remove(); } });
    document.addEventListener('keydown', function esck(ev) { if (ev.key === 'Escape') { d.remove(); document.removeEventListener('keydown', esck); } });
    return d;
  }
  function row(label, val) {
    if (!val) return '';
    return "<tr><td style='color:#8fa3ba;padding:1px 6px 1px 0;vertical-align:top;white-space:nowrap;'>" + label + "</td><td style='color:#fff;font-weight:bold;'>" + val + "</td></tr>";
  }

  /* Settings popover */
  function openSettings() {
    var avail = [];
    v.map.allLayers.forEach(function (l) {
      if (!l.title) return;
      if (l.opacity === 0) return; /* helper/locator layers */
      if (l.listMode === 'hide') return; /* internal helper layers (e.g. Development Review Areas) */
      if (l.title === 'Development Information') return;
      if (cfg.some(function (qc) { return qc.t === l.title; })) return;
      if (avail.indexOf(l.title) < 0) avail.push(l.title);
    });
    avail.sort();
    var rows = cfg.map(function (qc, i) {
      return "<tr data-i='" + i + "'><td style='padding:3px 4px;'><input data-f='l' value=\"" + esc(qc.l) + "\" style='width:70px;background:#0e131a;color:#fff;border:1px solid #2c3a4d;border-radius:4px;padding:2px 4px;'/></td>" +
        "<td style='padding:3px 4px;color:#8fa3ba;font-size:11px;'>" + esc(qc.t) + "</td>" +
        "<td style='padding:3px 4px;'><span role='button' tabindex='0' class='cqb-rm' data-i='" + i + "' style='cursor:pointer;color:#ff9a9a;padding:1px 6px;'>remove</span></td></tr>";
    }).join('');
    var options = avail.map(function (t) { return "<option value=\"" + esc(t) + "\">" + esc(t) + '</option>'; }).join('');
    var d = card(
      "<b>Configure Quick Bar layers</b>" +
      "<table style='width:100%;border-collapse:collapse;margin:8px 0;' id='cqb-cfg-rows'>" + rows + '</table>' +
      (avail.length
        ? "<div style='margin-top:6px;padding-top:6px;border-top:1px solid #2c3a4d;'>" +
          "<select id='cqb-add-sel' style='background:#0e131a;color:#fff;border:1px solid #2c3a4d;border-radius:4px;padding:2px 4px;max-width:55%;'>" + options + '</select> ' +
          "<input id='cqb-add-label' placeholder='chip label' style='width:70px;background:#0e131a;color:#fff;border:1px solid #2c3a4d;border-radius:4px;padding:2px 4px;'/> " +
          "<span role='button' tabindex='0' id='cqb-add-btn' style='cursor:pointer;color:#7cc4ff;padding:1px 8px;border:1px solid #2c3a4d;border-radius:4px;'>add</span>" +
          '</div>'
        : "<div style='color:#6f8bb0;font-size:11px;'>No more un-configured layers found.</div>") +
      "<div style='margin-top:8px;'><span role='button' tabindex='0' id='cqb-save-btn' style='cursor:pointer;background:#1b5e20;color:#d7ffd9;padding:3px 10px;border-radius:4px;margin-right:6px;'>Save</span>" +
      "<span role='button' tabindex='0' id='cqb-reset-btn' style='cursor:pointer;color:#ffcf87;padding:3px 10px;'>Reset to defaults</span></div>" +
      "<div style='margin-top:10px;padding-top:8px;border-top:1px solid #2c3a4d;color:#6f8bb0;font-size:11px;line-height:1.5;'>" +
      "<b style='color:#a9bccf;'>Shared links</b><br/>The Link chip needs to know this app's normal startup layers so it can " +
      "describe your changes to someone who does not have the toolkit. It records that the first time the bar runs on a " +
      "freshly-opened viewer. If you first ran it after already changing layers, reload the viewer and recalibrate.<br/>" +
      "<span role='button' tabindex='0' id='cqb-recal-btn' style='display:inline-block;margin-top:6px;cursor:pointer;color:#7cc4ff;padding:2px 8px;border:1px solid #2c3a4d;border-radius:4px;'>Recalibrate from the current layers</span></div>" +
      "<div style='margin-top:10px;padding-top:8px;border-top:1px solid #2c3a4d;color:#6f8bb0;font-size:11px;line-height:1.5;'>" +
      "<b style='color:#a9bccf;'>Parcels in the search box</b><br/>Adds a &ldquo;Development Information&rdquo; group of real parcel matches to the top of the app&rsquo;s own search dropdown.<br/>" +
      "<span role='button' tabindex='0' id='cqb-sug-toggle' style='display:inline-block;margin-top:6px;cursor:pointer;color:#7cc4ff;padding:2px 8px;border:1px solid #2c3a4d;border-radius:4px;'>" +
      (localStorage.getItem('__claude_qb_nosearch') === '1' ? 'Currently OFF &mdash; turn on' : 'Currently ON &mdash; turn off') + '</span></div>'
    );
    var sugBtn = d.querySelector('#cqb-sug-toggle');
    if (sugBtn) sugBtn.onclick = function () {
      var off = localStorage.getItem('__claude_qb_nosearch') === '1';
      if (off) localStorage.removeItem('__claude_qb_nosearch'); else localStorage.setItem('__claude_qb_nosearch', '1');
      try { cqbSugRemove(null); } catch (e) {}
      d.remove();
      toast('Parcel results in the search box: ' + (off ? 'on' : 'off'));
    };
    var recal = d.querySelector('#cqb-recal-btn');
    if (recal) recal.onclick = function () {
      if (!confirm('Record the layers that are on right now as this app\u2019s normal startup state?\n\nDo this on a freshly-loaded viewer you have not changed yet.')) return;
      cqbCaptureBaseline(true); d.remove();
      toast('Layer baseline recorded');
    };
    d.querySelectorAll('.cqb-rm').forEach(function (r) {
      r.onclick = function () { cfg.splice(+r.getAttribute('data-i'), 1); saveCfg(); renderChips(); d.remove(); openSettings(); };
    });
    var addBtn = d.querySelector('#cqb-add-btn');
    if (addBtn) addBtn.onclick = function () {
      var sel = d.querySelector('#cqb-add-sel'), lab = d.querySelector('#cqb-add-label');
      var t = sel.value, l = (lab.value || t.slice(0, 8)).trim();
      if (!t) return;
      cfg.push({ k: 'c' + Date.now(), t: t, l: l });
      saveCfg(); renderChips(); d.remove(); openSettings();
    };
    var saveBtn = d.querySelector('#cqb-save-btn');
    saveBtn.onclick = function () {
      d.querySelectorAll('#cqb-cfg-rows tr').forEach(function (tr) {
        var i = +tr.getAttribute('data-i');
        var inp = tr.querySelector('input[data-f="l"]');
        if (inp && cfg[i]) cfg[i].l = inp.value.trim() || cfg[i].l;
      });
      saveCfg(); renderChips(); d.remove();
      toast('Chip labels saved');
    };
    d.querySelector('#cqb-reset-btn').onclick = function () {
      if (!confirm('Reset to the default 7 layers? This clears your custom chip configuration.')) return;
      cfg = DEFAULTS.slice(); saveCfg(); renderChips(); d.remove();
      toast('Reset to default layers');
    };
  }

  /* Find Parcel: search -> (single result | picker) -> record card */
  function findParcel(text, opts) {
    var inp = document.querySelector('input[placeholder*="Search" i], .gcx-search input');
    var term = (text || (inp && inp.value) || '').trim();
    if (!term) term = prompt('Address or parcel ID:') || '';
    term = term.trim();
    if (!term) return;
    var clean = term.replace(/'/g, "''").toUpperCase();
    var where = /^\d{10,14}$/.test(clean)
      ? "PARCELID = '" + clean + "'"
      : "UPPER(SITEADDRESS) LIKE '" + clean.split(',')[0] + "%'";
    card('<b>Find Parcel</b><br/>Searching for &ldquo;' + esc(term) + '&rdquo; &hellip;');
    q('/Assessor/TaxParcels/MapServer/0', { where: where, outSR: '3857', returnGeometry: 'true',
      outFields: 'PARCELID,SITEADDRESS,OWNERNME1,GIS_AREA,PRPRTYDSCRP,CLASSDSCRP,RESYRBLT,RESSTRTYP,RESFLRAREA,CNTASSDVAL,CNVYNAME', resultRecordCount: '8' })
    .then(function (pj) {
      if (!pj.features || !pj.features.length) { card('<b>Find Parcel</b><br/>No parcel found for &ldquo;' + esc(term) + '&rdquo;. Try the street number + name only, or a 13-digit PID.'); return; }
      if (pj.features.length === 1) { showParcel(pj.features[0], 1, opts); return; }
      showPicker(pj.features, term);
    }).catch(function (e) { card('<b>Find Parcel</b><br/>Lookup failed: ' + esc(e && e.message ? e.message : e)); });
  }

  /* multiple address/PID matches: let the user pick which parcel before loading the full card */
  function showPicker(feats, term) {
    var rows = feats.map(function (f, i) {
      var a = f.attributes;
      return "<tr data-i='" + i + "' class='cqb-pick' role='button' tabindex='0' style='cursor:pointer;border-bottom:1px solid #232b36;'>" +
        "<td style='padding:5px 4px;color:#fff;'>" + esc(a.SITEADDRESS || 'PID ' + a.PARCELID) + '</td>' +
        "<td style='padding:5px 4px;color:#8fa3ba;font-size:11px;text-align:right;'>" + esc(a.PARCELID) + '</td></tr>';
    }).join('');
    var d = card('<b>Find Parcel</b><br/>' + feats.length + ' matches for &ldquo;' + esc(term) + '&rdquo; &mdash; pick one:' +
      "<table style='width:100%;border-collapse:collapse;margin-top:6px;'>" + rows + '</table>');
    function pick(i) { showParcel(feats[i], feats.length); }
    d.querySelectorAll('.cqb-pick').forEach(function (tr) {
      tr.onclick = function () { pick(+tr.getAttribute('data-i')); };
      tr.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(+tr.getAttribute('data-i')); } });
    });
  }

  /* full record card for one chosen parcel feature */
  function showParcel(f, matchCount, opts) {
    var at = f.attributes;
    window.__cqbLastPid = at.PARCELID || window.__cqbLastPid;
    var g = f.geometry;
    var ring = g.rings[0];
    var xs = ring.map(function (p) { return p[0]; }), ys = ring.map(function (p) { return p[1]; });
    var ext = { xmin: Math.min.apply(0, xs), ymin: Math.min.apply(0, ys), xmax: Math.max.apply(0, xs), ymax: Math.max.apply(0, ys) };
    var cx0 = (ext.xmin + ext.xmax) / 2, cy0 = (ext.ymin + ext.ymax) / 2;
    var pad = Math.max(ext.xmax - ext.xmin, ext.ymax - ext.ymin) * 0.8 + 30;
    if (!(opts && opts.noZoom)) {
      v.center = { x: cx0, y: cy0, spatialReference: v.spatialReference };
      v.scale = Math.max(1000, pad * 8);
    }
    try {
      v.graphics.removeAll();
      v.graphics.add({ geometry: { type: 'polygon', rings: g.rings, spatialReference: g.spatialReference },
        symbol: { type: 'simple-fill', color: [124, 196, 255, 0.12], outline: { color: [124, 196, 255, 1], width: 2.5 } } });
    } catch (e) {}
    var gp = JSON.stringify(g);
    var lat = (Math.atan(Math.exp(cy0 / 6378137)) * 2 - Math.PI / 2) * 180 / Math.PI;
    var lon = cx0 * 180 / 20037508.342787;
    var geomP = { geometry: gp, geometryType: 'esriGeometryPolygon', spatialRel: 'esriSpatialRelIntersects', where: '1=1', returnGeometry: 'false' };
    card('<b>Find Parcel</b><br/>Loading record for ' + esc(at.SITEADDRESS || at.PARCELID) + '&hellip;');
    Promise.all([
      q('/Planning/DevRevZoningandRegulations/MapServer/1', Object.assign({ outFields: 'ZONE' }, geomP)),
      q('/LTUWatershed/FEMAFlood/MapServer/1', Object.assign({ outFields: 'FLD_ZONE,FLOODWAY' }, geomP)),
      q('/Planning/DevRevLanduseAndGrowth/MapServer/12', Object.assign({ outFields: 'CAT' }, geomP)),
      q('/Planning/DevRevLanduseAndGrowth/MapServer/13', Object.assign({ outFields: 'Tier' }, geomP)),
      q('/Planning/DevReviewAreas/MapServer/0', Object.assign({ outFields: 'Region,Planner,Phone' }, geomP)),
      q('/Planning/DevRevAPPLICATIONS/MapServer/1', Object.assign({ outFields: 'APPNUM,STATUS,PLANNER_ASSIGNED,HYPERLINK', resultRecordCount: '8' }, geomP)),
      q('/Planning/HOANA2/MapServer/0', Object.assign({ outFields: 'na_name,first_name,last_name,phone,email', resultRecordCount: '10' }, geomP)).catch(function () { return { features: [] }; }),
      q('/Planning/HOANA2/MapServer/1', Object.assign({ outFields: 'ASSOCNAME,SHORTNAME,first_name,last_name,phone,email', resultRecordCount: '10' }, geomP)).catch(function () { return { features: [] }; })
    ]).then(function (rs) {
      function vals(j, fld) {
        var s = [];
        (j.features || []).forEach(function (ff) { var vv = ff.attributes[fld]; if (vv != null && String(vv).trim() !== '' && s.indexOf(vv) < 0) s.push(vv); });
        return s;
      }
      var zoning = vals(rs[0], 'ZONE').sort().join(', ');
      var floodRows = (rs[1].features || []).map(function (ff) { return ff.attributes; });
      var flood = cqbFloodShort(floodRows) !== 'None mapped'
        ? cqbFloodShort(floodRows)
        : 'None mapped';
      var flu = vals(rs[2], 'CAT').join(', ');
      var tier = vals(rs[3], 'Tier').join(', ');
      var planner = (rs[4].features || []).map(function (ff) {
        var a = ff.attributes;
        var n = a.Region === 'Village' ? 'Village of ' + a.Planner : a.Planner;
        return a.Phone ? n + ' \u00b7 ' + a.Phone : n;
      }).filter(function (xv, i, arr) { return arr.indexOf(xv) === i; }).join(', ');
      var apps = (rs[5].features || []).map(function (ff) {
        var a = ff.attributes;
        var lab = esc(a.APPNUM) + (a.STATUS ? ' \u00b7 ' + esc(a.STATUS) : '') + (a.PLANNER_ASSIGNED ? ' \u00b7 ' + esc(a.PLANNER_ASSIGNED) : '');
        return a.HYPERLINK ? "<a href='" + esc(a.HYPERLINK) + "' target='_blank' rel='noopener noreferrer' style='color:#7cc4ff;text-decoration:none;'>" + lab + '</a>' : lab;
      });
      /* HOA/NA: field names confirmed live 2026-08-27 against Planning/HOANA2/0 ("Neighborhood
         Association Contacts": na_name) and /1 ("Homeowner Association Contacts": ASSOCNAME/SHORTNAME);
         both share first_name/last_name/phone/email for the contact person. */
      var hoaFeats = (rs[6].features || []).concat(rs[7].features || []);
      /* HOANA2 stores one feature per board contact, all sharing the same association name/boundary
         (live-confirmed: Country Meadows HOA returned 3 features -- Jeff Woita, Christine Kiewra, Steve
         Lovell -- for one parcel). Group by association name so multi-contact HOAs render as one line
         with every distinct contact, instead of the same association name repeated per contact. */
      var hoaGroups = {}, hoaOrder = [];
      hoaFeats.forEach(function (ff) {
        var a = ff.attributes;
        var assoc = a.na_name || a.ASSOCNAME || a.SHORTNAME || '';
        var key = assoc || ' ';
        if (!hoaGroups[key]) { hoaGroups[key] = { assoc: assoc, contacts: [] }; hoaOrder.push(key); }
        var contact = [a.first_name, a.last_name].filter(Boolean).join(' ');
        var bits = [];
        if (contact) bits.push(contact);
        if (a.phone) bits.push(a.phone);
        if (a.email) bits.push(a.email);
        var line = bits.join(' \u00b7 ');
        if (line && hoaGroups[key].contacts.indexOf(line) < 0) hoaGroups[key].contacts.push(line);
      });
      var hoa = hoaOrder.map(function (key) {
        var grp = hoaGroups[key];
        if (!grp.assoc && !grp.contacts.length) return '';
        return esc(grp.assoc || 'Association') + (grp.contacts.length ? ' \u2014 ' + esc(grp.contacts.join('; ')) : '');
      }).filter(Boolean);
      var ac = Math.round(at.GIS_AREA / 43560 * 100) / 100;
      var built = at.RESYRBLT ? Math.round(at.RESYRBLT) + (at.RESSTRTYP ? ' \u00b7 ' + esc(at.RESSTRTYP) : '') : '';
      var money = at.CNTASSDVAL ? '$' + Math.round(at.CNTASSDVAL).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
      var flr = at.RESFLRAREA ? Math.round(at.RESFLRAREA).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ft\u00b2' : '';
      var B = "display:inline-block;background:#24354d;color:#cfe8ff;text-decoration:none;font-size:11px;font-weight:bold;padding:4px 8px;border-radius:4px;margin:0 4px 4px 0;";
      card(
        "<div style='font-size:13px;font-weight:bold;color:#fff;'>" + esc(at.SITEADDRESS || 'Parcel ' + at.PARCELID) + '</div>' +
        "<div style='color:#8fa3ba;margin:1px 0 6px 0;'>PID " + esc(at.PARCELID) + ' \u00b7 ' + esc(at.OWNERNME1 || '') + '</div>' +
        "<table style='width:100%;border-collapse:collapse;'>" +
        row('Zoning', esc(zoning)) + row('Floodplain', esc(flood) + "<span id='cqb-flood-pct' style='color:#8fa3ba;'></span>") + row('Future use', esc(flu)) + row('Growth tier', esc(tier)) +
        row('Area', ac + ' ac') + row('Class', esc(at.CLASSDSCRP)) + row('Built', built) + row('Floor area', flr) + row('Assessed', money) +
        row('Area planner', esc(planner)) +
        '</table>' +
        (apps.length ? "<div style='color:#6f8bb0;font-size:10px;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #2c3a4d;margin:7px 0 3px 0;'>APPLICATIONS</div><div style='line-height:1.7;'>" + apps.join('<br/>') + '</div>' : '') +
        (hoa.length ? "<div style='color:#6f8bb0;font-size:10px;font-weight:bold;letter-spacing:1px;border-bottom:1px solid #2c3a4d;margin:7px 0 3px 0;'>HOA / NEIGHBORHOOD ASSOC.</div><div style='line-height:1.6;font-size:11px;'>" + hoa.join('<br/>') + '</div>' : '') +
        "<div style='margin-top:8px;border-top:1px solid #2c3a4d;padding-top:7px;'>" +
        "<a style='" + B + "' target='_blank' rel='noopener noreferrer' href='https://orion.lancaster.ne.gov/appraisal/publicaccess/PropertyDetail.aspx?PropertyNumber=" + esc(at.PARCELID) + "'>Assessor</a>" +
        "<a style='" + B + "' target='_blank' rel='noopener noreferrer' href='https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((at.SITEADDRESS || '') + ', Lancaster County, NE') + "'>Google Maps</a>" +
        "<a style='" + B + "' target='_blank' rel='noopener noreferrer' href='https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" + lat.toFixed(6) + ',' + lon.toFixed(6) + "'>Street View</a>" +
        '</div>' +
        "<div style='color:#6f8bb0;font-size:10px;margin-top:6px;'>Parcel is highlighted on the map - click it for the full Development Information popup." + (matchCount > 1 ? ' (' + matchCount + ' parcels matched this search.)' : '') + '</div>'
      );
      /* the share of the parcel in the floodplain arrives after the card, so the card is never
       * held up waiting on the geometry service */
      if (flood !== 'None mapped') {
        cqbFloodPercent(g, at.GIS_AREA).then(function (txt) {
          var el = document.getElementById('cqb-flood-pct');
          if (el && txt) el.textContent = ' \u00b7 ' + txt;
        });
      }
    }).catch(function (e) { card('<b>Find Parcel</b><br/>Lookup failed: ' + esc(e && e.message ? e.message : e)); });
  }
  window.__qbFindParcel = findParcel;

  function toast(msg) {
    var e = document.createElement('div');
    e.setAttribute('role', 'status');
    e.textContent = msg;
    e.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;background:#1b5e20;color:#fff;padding:8px 14px;border-radius:6px;font:13px sans-serif';
    document.body.appendChild(e);
    setTimeout(function () { e.remove(); }, 2200);
  }
  toast('Quick Bar ready - popup applied, locators paused');
  try { cqbApplyIncomingLink(); } catch (e) { /* a malformed shared link must never break the bar */ }

  /* ---- 7. startup self-check (v3.7) ----
   * The popup's Arcade returns a bare em-dash when a lookup layer is absent, which is how the
   * V1.1 Inspector regression hid for a week: no error, no console message, just five rows that
   * quietly said nothing. If a layer this toolkit is responsible for is missing after startup,
   * say so out loud rather than letting the popup shrug. */
  setTimeout(function () {
    try {
      var missing = CQB_LOOKUP_LAYERS.filter(function (spec) {
        return !v.map.allLayers.some(function (l) { return l.title === spec.title; });
      }).map(function (spec) { return spec.title; });
      if (!missing.length) return;
      console.warn('[Quick Bar] ' + missing.length + ' hidden lookup layer(s) missing - the popup rows that need them will show an em-dash: ' + missing.join(', '));
      toast('Quick Bar: ' + missing.length + ' lookup layer(s) unavailable - some popup rows will be blank');
    } catch (e) { /* a self-check must never be the thing that breaks */ }
  }, 4000);
}
})();
