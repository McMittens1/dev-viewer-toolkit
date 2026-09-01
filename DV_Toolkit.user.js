// ==UserScript==
// @name         Lincoln/Lancaster Development Viewer Toolkit
// @namespace    https://gis.lincoln.ne.gov/
// @version      1.11.0
// @description  Auto-applies the redesigned parcel popup (v8) and the Quick Bar to the public Development Viewer: Site tools (Salt Creek flood-storage and allowable-fill calculator, behind a USGS ground-elevation opt-in), FEMA Zone A, floodplain share of parcel, the #INVALID repair extended to 20 rows, shareable deep links, parcel results in the search box, and the Inspector-rows fix.
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
// There is exactly one exception, and it is off until you turn it on. The Salt
// Creek fill-capacity calculation needs ground elevations, and the county
// publishes no elevation data anywhere in its public GIS -- all 26 service
// folders were checked. Ground heights come from the USGS 3D Elevation Program
// at elevation.nationalmap.gov. If you agree, your browser sends that parcel's
// outline (public parcel coordinates, nothing identifying you) to that federal
// service and receives ground heights back. The Site tools dialog says so and
// makes you confirm before the first request; clear the localStorage key
// __claude_qb_elev_optin to be asked again. Never agree and nothing but
// gis.lincoln.ne.gov is contacted.

(function () {
  'use strict';

  /* ---------------------------------------------------------------------
   * Development Viewer Toolkit 1.11.0 -- auto-run wrapper.
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
  window.__dvToolkit = { version: '1.11.0', ready: false };

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

  /* ====================== site modules (build-time) =======================
   * The site analysis modules from src/ are spliced in here by build.py --
   * always site_core + site_ui_core; plus the private export modules in the
   * Pro build only. They are the only part of this toolkit that can contact a
   * server other than gis.lincoln.ne.gov, and only behind the opt-in gate in
   * cqbSiteToolsDialog.
   */
/* Development Viewer -- site analysis core (shared).
 *
 * Everything here ships to every user: county REST access in NAD83 State Plane
 * Nebraska feet (wkid 102704), the local Lambert projection, grid sampling of
 * USGS 3DEP ground elevations (behind the user opt-in), soils aggregation,
 * frontage detection, and the Salt Creek flood-storage calculation.
 *
 * This file must stand alone: it may not reference anything defined in
 * site_export.js. The build fails if it does. */

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

/* Flood-review layers (verified live 2026-08-29; see 2_REFERENCE/DATA_CATALOG.md).
 * FEMAFlood/1: FLD_ZONE is 'AE' or 'A' and nothing else in this county;
 * FLOODWAY is the string 'FLOODWAY' or a single space, never null. */
var CQB_FEMA_URL = CQB_PUB + 'LTUWatershed/FEMAFlood/MapServer/1';
var CQB_BRA_URL  = CQB_PUB + 'LTUWatershed/BuildRestrictionAgreement/MapServer/0';
var CQB_WSE_URL  = CQB_PUB + 'LTUWatershed/WatershedEncumbrances/MapServer/0';

/* Regulatory constants, with their citations. These are the numbers the panel
 * turns into flags, so each carries where it comes from; do not change one
 * without re-reading the cited section. All were extracted from the LLM-
 * optimized code texts on 2026-08-28 and recorded in HANDOFF section 4. */
var CQB_REG = {
  /* LMC 27.52.040(g) / 27.53.040(g): developments larger than this many acres
   * in FEMA Zone A require an engineered base flood elevation study. */
  zoneAStudyAcres: 5,
  /* Same sections -- both chapters read "greater than either five acres or
   * fifty lots", so the lot alternative applies in Existing Urban AND New
   * Growth. County Art. 11.007(h) is acres-only, no lot trigger. No public
   * layer counts proposed lots, so this stays a caveat, never a computed flag. */
  zoneAStudyLots: 50,
  /* Ord. 18893 effective date: the storage-volume baseline for allowable fill
   * under LMC 27.52.035. Lidar shows current ground, not this date's ground. */
  storageBaselineDate: '2007-03-05',
  sqFtPerAcre: 43560
};

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

/* The empty shapes ArcGIS actually returns for a missing attribute: null,
 * undefined, '' and -- on this county's data -- a single space. Number() turns
 * the first three into 0 and isFinite(0) is true, which is how a value the
 * county never published becomes a confident zero on the panel. Test with this
 * BEFORE coercing anything a user will read as a regulatory number. */
function cqbBlank(v) {
  return v === null || v === undefined || String(v).trim() === '';
}

/* Storage areas are shown by number; an unnumbered one must not read "#null". */
function cqbSaLabel(n) {
  return cqbBlank(n) ? '(unnumbered)' : '#' + n;
}

function cqbQs(o) {
  return Object.keys(o).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]);
  }).join('&');
}

function cqbGetJson(url, timeoutMs, postBody) {
  return new Promise(function (resolve, reject) {
    var done = false;
    var t = setTimeout(function () {
      if (!done) { done = true; reject(new Error('timeout')); }
    }, timeoutMs || 30000);
    fetch(url, postBody == null ? undefined : {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: postBody
    })
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
  /* Filled, not sparse. A bare new Array(n) has holes, and holes are SKIPPED by
   * every/some/forEach -- so a check like "every sample came back" passes
   * vacuously when nothing came back at all. An explicit null means "asked, no
   * answer", which is what callers test for. */
  var results = new Array(points.length);
  for (var f = 0; f < points.length; f++) results[f] = null;
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
    /* POST, not GET. A multipoint geometry in a query string is roughly 24
     * characters per point, so a 200-point batch builds a ~9,800-character URL
     * and the request dies at the server's 8 KB request-line limit -- as a bare
     * "Failed to fetch", with no status and no error body to explain it.
     * Measured live 2026-08-28 against this service: 150 points (7,413 chars)
     * succeeded, 200 points (9,806 chars) failed, and a POST of all 740 points
     * of a real lot succeeded in one request. The same parameters go in the
     * body instead, and locationId still indexes within the batch. */
    var body = cqbQs({
      geometry: JSON.stringify({
        points: wm, spatialReference: { wkid: 102100 }
      }),
      geometryType: 'esriGeometryMultipoint',
      returnFirstValueOnly: 'true',
      f: 'json'
    });
    return cqbGetJson(CQB_3DEP + '/getSamples', 45000, body).then(function (j) {
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

function cqbDist(a, b) {
  var dx = b[0] - a[0], dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy);
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

var CQB_SA_URL  = CQB_PUB + 'LTUWatershed/FEMEFloodDetails/MapServer/3';

var CQB_BFE_URL = CQB_PUB + 'LTUWatershed/FEMEFloodDetails/MapServer/1';

/* Flatten BFE polylines into elevation-tagged segments. */
function cqbBfeSegments(features) {
  var segs = [];
  (features || []).forEach(function (f) {
    /* Number(null) is 0, so a null ELEV would otherwise become a sea-level BFE
     * line and drag every interpolation near it. Reject the empty cases first. */
    var raw = f.attributes ? f.attributes.ELEV : null;
    if (raw === null || raw === undefined || raw === '') return;
    var e = Number(raw);
    if (!isFinite(e)) return;
    ((f.geometry && f.geometry.paths) || []).forEach(function (path) {
      for (var i = 0; i < path.length - 1; i++) segs.push({ e: e, a: path[i], b: path[i + 1] });
    });
  });
  var elevs = [];
  segs.forEach(function (s) { if (elevs.indexOf(s.e) < 0) elevs.push(s.e); });
  elevs.sort(function (a, b) { return a - b; });
  return { segs: segs, elevs: elevs };
}

/* BFE at a point: inverse-distance blend of the two nearest distinct contour
 * elevations, which is what puts a point sitting between the 1152 and 1153 lines
 * at 1152.x rather than snapping it to whichever line happens to be closer. */
function cqbBfeAt(bfe, p) {
  if (!bfe || !bfe.elevs.length) return null;
  var per = bfe.elevs.map(function (e) {
    var m = Infinity;
    bfe.segs.forEach(function (s) {
      if (s.e !== e) return;
      var d = cqbPtSegDist(p, s.a, s.b);
      if (d < m) m = d;
    });
    return { e: e, d: m };
  }).filter(function (x) { return isFinite(x.d); });
  if (!per.length) return null;
  per.sort(function (a, b) { return a.d - b.d; });
  if (per.length === 1) return per[0].e;
  var d0 = per[0].d, d1 = per[1].d;
  /* Standing exactly on a line means that line's elevation, not a divide by zero. */
  if (d0 + d1 === 0) return per[0].e;
  return (per[0].e * d1 + per[1].e * d0) / (d0 + d1);
}

function cqbStorageCalc(pid, opts, deps) {
  opts = opts || {};
  deps = deps || {};
  var getJson = deps.getJson || cqbGetJson;
  var post    = deps.geoPost || cqbGeoPost;
  var sample  = deps.sample  || cqbSampleElevation;
  var say = opts.onStatus || function () {};
  var rep = { warnings: [] };

  /* cqbFloodReview fetches the parcel once and passes it in, so the review's
   * three checks share a single TaxParcels request. Called directly (tests,
   * or the calculator on its own), the fetch happens here. */
  var pfPromise = opts.parcelFeature
    ? Promise.resolve(opts.parcelFeature)
    : cqbParcelByPid(pid, 'PARCELID,SITEADDRESS,GIS_AREA', getJson);
  return pfPromise.then(function (f) {
    rep.pid = f.attributes.PARCELID;
    rep.address = f.attributes.SITEADDRESS || '';
    rep._parcel = f.geometry;

    say('Finding the storage area...');
    return getJson(CQB_SA_URL + '/query?' + cqbQs({
      geometry: JSON.stringify({ rings: f.geometry.rings, spatialReference: { wkid: CQB_SP_FT } }),
      geometryType: 'esriGeometryPolygon', inSR: CQB_SP_FT, outSR: CQB_SP_FT,
      spatialRel: 'esriSpatialRelIntersects', outFields: 'SA_NUMBER,FILL_PRCNT',
      returnGeometry: 'true', f: 'json'
    }));
  }).then(function (j) {
    var fs = j.features || [];
    if (!fs.length) { rep.noStorageArea = true; return null; }
    rep.storageAreas = fs.length;
    var sa = fs[0];
    rep.saNumber = cqbBlank(sa.attributes.SA_NUMBER) ? null : sa.attributes.SA_NUMBER;
    rep.saLabel = cqbSaLabel(rep.saNumber);
    /* Same Number(null) === 0 trap cqbBfeSegments guards for ELEV, and it bit
     * here: a null, empty or single-space FILL_PRCNT used to report a confident
     * "fill allowance 0%" / "Allowable fill: 0 CY" with no warning, and a
     * non-numeric one "fill allowance NaN%". Blank-not-null is a real shape in
     * this county's data -- the FLOODWAY field on a sibling layer is a single
     * space 1,527 times. Refuse to state an allowance we do not have. */
    var rawPct = sa.attributes ? sa.attributes.FILL_PRCNT : null;
    var pct = cqbBlank(rawPct) ? NaN : Number(rawPct);
    if (isFinite(pct)) {
      rep.fillPercent = pct;
    } else {
      rep.fillPercent = null;
      rep.fillPercentUnknown = true;
      rep.warnings.push('Storage area ' + rep.saLabel + ' has no usable fill allowance ' +
        'percentage recorded' + (cqbBlank(rawPct) ? '' : ' (it reads "' + String(rawPct) + '")') +
        ', so no allowable fill is shown. The storage volume below is unaffected.');
    }
    if (fs.length > 1) {
      rep.warnings.push('This parcel touches ' + fs.length + ' storage areas; only SA ' +
        rep.saLabel + ' (' + (rep.fillPercent == null ? 'allowance not recorded'
          : rep.fillPercent + '%') + ') is computed here.');
    }

    say('Clipping to the storage area...');
    return post('intersect', {
      sr: CQB_SP_FT,
      geometries: JSON.stringify({ geometryType: 'esriGeometryPolygon', geometries: [rep._parcel] }),
      geometry: JSON.stringify({ geometryType: 'esriGeometryPolygon', geometry: sa.geometry })
    });
  }).then(function (ix) {
    if (rep.noStorageArea) return null;
    if (!ix || ix.error) throw new Error('The geometry service could not clip the parcel to the storage area.');
    var clip = (ix.geometries || []).filter(function (g) { return g && g.rings && g.rings.length; })[0];
    if (!clip) { rep.emptyClip = true; return null; }
    rep._clip = clip;

    say('Reading the BFE lines...');
    var b = cqbExpand(cqbBounds(clip.rings), opts.bfeSearchFt || 2000);
    return getJson(CQB_BFE_URL + '/query?' + cqbQs({
      geometry: JSON.stringify({ xmin: b.minx, ymin: b.miny, xmax: b.maxx, ymax: b.maxy,
                                 spatialReference: { wkid: CQB_SP_FT } }),
      geometryType: 'esriGeometryEnvelope', inSR: CQB_SP_FT, outSR: CQB_SP_FT,
      spatialRel: 'esriSpatialRelIntersects', outFields: 'ELEV,V_DATUM',
      returnGeometry: 'true', f: 'json'
    }));
  }).then(function (j) {
    if (rep.noStorageArea || rep.emptyClip) return null;
    var fs = (j && j.features) || [];
    if (!fs.length) { rep.noBfe = true; return null; }
    /* Datum has to match 3DEP or the subtraction is meaningless. */
    var datums = {}, undeclared = 0;
    fs.forEach(function (f) {
      var d = f.attributes && f.attributes.V_DATUM;
      if (cqbBlank(d)) { undeclared++; return; }
      datums[String(d).trim()] = 1;
    });
    rep.bfeDatums = Object.keys(datums);
    rep.bfeDatumMissing = undeclared;
    if (rep.bfeDatums.length && rep.bfeDatums.indexOf('NAVD88') === -1) {
      rep.warnings.push('BFE lines report vertical datum ' + rep.bfeDatums.join('/') +
        ', but the elevation model is NAVD88. The depths below are not trustworthy.');
    } else if (!rep.bfeDatums.length) {
      /* The empty-object case used to short-circuit the test above and be read
       * as agreement. Not declaring a datum is not the same as declaring ours. */
      rep.warnings.push('None of the ' + fs.length + ' BFE lines near this parcel declares a ' +
        'vertical datum, so it cannot be confirmed they are on the same NAVD88 basis as the ' +
        'ground elevations. Treat the depths below as unverified.');
    }
    var bfe = cqbBfeSegments(fs);
    if (!bfe.elevs.length) { rep.noBfe = true; return null; }
    rep.bfeLineCount = fs.length;

    var gspec = cqbGridSpec(cqbBounds(rep._clip.rings), opts.maxPoints || 3000, opts.gridStep || 5);
    rep.gridStep = gspec.step;
    /* Sample at cell CENTRES, not cell corners. The shared grid is corner-aligned
     * because that is what marching squares wants, but here each sample stands for
     * the cell around it, and a corner-aligned grid puts a whole row and a whole
     * column exactly on the boundary of an axis-aligned lot -- which most platted
     * lots are. Point-in-polygon has to resolve those one way or the other, so the
     * error is a systematic ~one-cell-wide strip off two sides, not noise: on a
     * 100 ft lot at a 5 ft grid it cost 9% of the area. Half a cell fixes it. */
    var all = cqbGridPoints({
      step: gspec.step, cols: gspec.cols, rows: gspec.rows,
      x0: gspec.x0 + gspec.step / 2, y0: gspec.y0 + gspec.step / 2
    });
    var inside = all.filter(function (p) { return cqbPointInRings(p[0], p[1], rep._clip.rings); });
    if (!inside.length) { rep.tooSmall = true; return null; }
    rep.cells = inside.length;

    say('Sampling ground elevations...');
    return sample(inside, function (i, n) { say('Sampling ground elevations... ' + i + '/' + n); })
      .then(function (zs) { return { bfe: bfe, pts: inside, zs: zs, step: gspec.step }; });
  }).then(function (d) {
    /* Ring geometry is working state, not part of the report the user is shown. */
    delete rep._parcel; delete rep._clip;
    if (!d) return rep;
    var cellArea = d.step * d.step;
    var vol = 0, wet = 0, miss = 0;
    var zmin = Infinity, zmax = -Infinity, bmin = Infinity, bmax = -Infinity;
    d.pts.forEach(function (p, i) {
      var z = d.zs[i];
      if (z == null || !isFinite(z)) { miss++; return; }
      if (z < zmin) zmin = z;
      if (z > zmax) zmax = z;
      var b = cqbBfeAt(d.bfe, p);
      if (b == null) { miss++; return; }
      if (b < bmin) bmin = b;
      if (b > bmax) bmax = b;
      var depth = b - z;
      if (depth > 0) { vol += depth * cellArea; wet++; }
    });
    rep.noData = miss;
    if (miss === d.pts.length) { rep.noElevation = true; return rep; }
    rep.areaSqFt = d.pts.length * cellArea;
    rep.groundMin = zmin; rep.groundMax = zmax;
    rep.bfeMin = bmin;    rep.bfeMax = bmax;
    rep.volumeCF = vol;
    rep.volumeCY = vol / 27;
    rep.wetCells = wet;
    /* isFinite(null) is true (Number(null) === 0), so the null check is load-bearing. */
    if (rep.fillPercent != null && isFinite(rep.fillPercent)) {
      rep.allowableCY = rep.volumeCY * rep.fillPercent / 100;
    }
    if (miss) rep.warnings.push(miss + ' of ' + d.pts.length + ' sample points had no elevation and were skipped.');
    if (!wet) rep.warnings.push('No part of the clipped area sits below the base flood elevation, so there is no storage to fill.');
    return rep;
  });
}


/* ---- Flood review (v1.11.0) ------------------------------------------------
 * One parcel fetch, then three independent checks run in parallel: the FEMA
 * Zone A study flag, the Salt Creek fill capacity, and the recorded flood
 * documents. Each check degrades alone: a dead layer reports itself as
 * unchecked instead of taking the others down or -- worse -- reading as a
 * clean answer. */

/* The one place a parcel is fetched by PID. Throws (message must keep the
 * words 'not found' -- the UI and tests rely on it) when the parcel does not
 * exist or carries no polygon. The empty-rings case is real: a PARCELID can
 * resolve to a record whose geometry has rings: []. */
function cqbParcelByPid(pid, outFields, getJson) {
  var g = getJson || cqbGetJson;
  return g(CQB_SITE_SOURCES[0].url + '/query?' + cqbQs({
    where: "PARCELID='" + String(pid).replace(/'/g, "''") + "'",
    outFields: outFields || 'PARCELID,SITEADDRESS,GIS_AREA',
    returnGeometry: 'true', outSR: CQB_SP_FT, f: 'json'
  })).then(function (j) {
    var f = (j.features || [])[0];
    if (!f || !f.geometry || !f.geometry.rings || !f.geometry.rings.length) {
      throw new Error('Parcel ' + pid + ' not found, or it has no mapped boundary.');
    }
    return f;
  });
}

/* Epoch-milliseconds date to 'YYYY-MM-DD', or null. The guard order is the
 * point: new Date(null) is 1970-01-01, NOT Invalid Date, so a null must be
 * rejected before it reaches the Date constructor. Same family as the
 * Number(null) === 0 trap cqbBlank exists for. */
function cqbDateStr(raw) {
  if (cqbBlank(raw)) return null;
  var n = Number(raw);
  if (!isFinite(n) || n <= 0) return null;
  var d = new Date(n);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/* FEMA zones touching the parcel, and the Zone A acreage facts.
 *
 * LMC 27.52.040(g) / 27.53.040(g) require an engineered BFE study for
 * developments larger than 5 acres in Zone A. Per Geovanni (2026-08-31),
 * WHAT the 5 acres is measured against -- the whole development, or only the
 * part of it in Zone A -- is a staff determination made case by case. So this
 * never renders a verdict. It reports BOTH measurements, parcel total and the
 * parcel's area inside Zone A, plus the threshold, and leaves the call to
 * staff. A null total area is surfaced as unmeasurable ("cannot be ruled
 * out"), never coerced: Number(null) is 0, 0 > 5 is false, and a coerced null
 * would silently suppress a regulatory notice -- fail-open. rep.failed means
 * the layer could not be asked, which the UI must render as unchecked, not as
 * all-clear. The Zone A clip area comes from the county geometry service via
 * cqbClipArea, which returns null rather than a guess when any step fails. */
function cqbZoneAssess(parcelGeom, attrs, deps) {
  deps = deps || {};
  var getJson = deps.getJson || cqbGetJson;
  var post = deps.geoPost || cqbGeoPost;
  var rep = { zones: [], floodway: false, inZoneA: false };
  var rawArea = attrs ? attrs.GIS_AREA : null;
  var area = cqbBlank(rawArea) ? NaN : Number(rawArea);
  if (isFinite(area) && area > 0) {
    rep.acres = area / CQB_REG.sqFtPerAcre;
  } else {
    rep.acres = null;
    rep.acresUnknown = true;
  }
  return getJson(CQB_FEMA_URL + '/query?' + cqbQs({
    geometry: JSON.stringify({ rings: parcelGeom.rings, spatialReference: { wkid: CQB_SP_FT } }),
    geometryType: 'esriGeometryPolygon', inSR: CQB_SP_FT,
    spatialRel: 'esriSpatialRelIntersects', outFields: 'FLD_ZONE,FLOODWAY',
    returnGeometry: 'false', f: 'json'
  })).then(function (j) {
    (j.features || []).forEach(function (f) {
      var a = f.attributes || {};
      var z = cqbBlank(a.FLD_ZONE) ? '' : String(a.FLD_ZONE).trim();
      if (z && rep.zones.indexOf(z) < 0) rep.zones.push(z);
      if (!cqbBlank(a.FLOODWAY) && String(a.FLOODWAY).trim() === 'FLOODWAY') rep.floodway = true;
    });
    rep.zones.sort();
    rep.inZoneA = rep.zones.indexOf('A') >= 0;
    if (!rep.inZoneA) return rep;
    /* Second, geometry-carrying query only for Zone A parcels: fetch the Zone A
     * polygons touching the parcel and measure the overlap. Zone A polygons are
     * large rural reaches, so this response can be heavy -- which is why it is
     * not part of the first query and only Zone A parcels pay for it. */
    return getJson(CQB_FEMA_URL + '/query?' + cqbQs({
      geometry: JSON.stringify({ rings: parcelGeom.rings, spatialReference: { wkid: CQB_SP_FT } }),
      geometryType: 'esriGeometryPolygon', inSR: CQB_SP_FT, outSR: CQB_SP_FT,
      spatialRel: 'esriSpatialRelIntersects', where: "FLD_ZONE='A'",
      outFields: 'FLD_ZONE', returnGeometry: 'true', f: 'json'
    })).then(function (jz) {
      var geoms = (jz.features || []).map(function (f) { return f.geometry; });
      return cqbClipArea(parcelGeom, geoms, post);
    }).then(function (sqft) {
      rep.zoneAAcres = (sqft === null || sqft === undefined)
        ? null : sqft / CQB_REG.sqFtPerAcre;
      rep.overOnTotal = rep.acres != null ? rep.acres > CQB_REG.zoneAStudyAcres : null;
      rep.overOnZoneA = rep.zoneAAcres != null ? rep.zoneAAcres > CQB_REG.zoneAStudyAcres : null;
      return rep;
    }).catch(function () {
      rep.zoneAAcres = null;
      rep.overOnTotal = rep.acres != null ? rep.acres > CQB_REG.zoneAStudyAcres : null;
      rep.overOnZoneA = null;
      return rep;
    });
  }).catch(function () {
    rep.failed = true;
    return rep;
  });
}

/* Recorded flood documents mapped on the parcel: building restriction
 * agreements and watershed encumbrances, both county layers on the same host
 * as everything else. Each source reports ok:false on failure -- an outage
 * must never render as 'none recorded'. */
function cqbRecordedFlood(parcelGeom, deps) {
  deps = deps || {};
  var getJson = deps.getJson || cqbGetJson;
  function lookup(url, outFields) {
    return getJson(url + '/query?' + cqbQs({
      geometry: JSON.stringify({ rings: parcelGeom.rings, spatialReference: { wkid: CQB_SP_FT } }),
      geometryType: 'esriGeometryPolygon', inSR: CQB_SP_FT,
      spatialRel: 'esriSpatialRelIntersects', outFields: outFields,
      returnGeometry: 'false', f: 'json'
    })).then(function (j) {
      return { ok: true, items: (j.features || []).map(function (f) { return f.attributes || {}; }) };
    }).catch(function () {
      return { ok: false, items: [] };
    });
  }
  return Promise.all([
    lookup(CQB_BRA_URL, 'EO_Number,Applicant,CurrentOwn,DateFiled,Final_Date,SubjectMat,Instrument'),
    lookup(CQB_WSE_URL, 'ENCUMID,ENCUMTYPE,NAME,ENCUMBRANCEHOLDER,ProjectName,SRCREF,LEGALSTARTDATE')
  ]).then(function (r) {
    return { bra: r[0], wse: r[1] };
  });
}

/* The orchestrator behind the Site tools button. Fetches the parcel once,
 * then runs the three checks concurrently. The storage calculation may throw
 * (its established behaviour, which its own tests pin); here that failure is
 * caught and carried as storage.failed so the Zone A flag and the recorded
 * documents still reach the screen. Only an unknown parcel rejects outright,
 * because then there is nothing to review. */
function cqbFloodReview(pid, opts, deps) {
  opts = opts || {};
  deps = deps || {};
  var getJson = deps.getJson || cqbGetJson;
  var say = opts.onStatus || function () {};
  return cqbParcelByPid(pid, 'PARCELID,SITEADDRESS,GIS_AREA', getJson).then(function (pf) {
    say('Checking flood layers...');
    var storageOpts = {};
    for (var k in opts) storageOpts[k] = opts[k];
    storageOpts.parcelFeature = pf;
    return Promise.all([
      cqbZoneAssess(pf.geometry, pf.attributes, deps),
      cqbStorageCalc(pid, storageOpts, deps).catch(function (e) {
        return { failed: true, message: String((e && e.message) || e), warnings: [] };
      }),
      cqbRecordedFlood(pf.geometry, deps)
    ]).then(function (r) {
      return {
        pid: pf.attributes.PARCELID,
        address: pf.attributes.SITEADDRESS || '',
        zone: r[0],
        storage: r[1],
        records: r[2]
      };
    });
  });
}

/* Development Viewer -- Site tools dialog (shared).
 *
 * The dialog every user gets: one parcel field, the USGS elevation opt-in, and
 * Fill capacity. Extra tools plug in at build time: a private module may push a
 * function onto CQB_SITE_PLUGINS and it will be called with a small API when
 * the dialog opens. The standard build ships with the array empty, so there is
 * no dormant export code in it -- the private controls simply do not exist. */

var CQB_SE_OPTIN = '__claude_qb_elev_optin';

/* Chip tooltip. A build that adds tools overwrites this with a fuller wording. */
var CQB_SITE_TOOLS_TIP = 'For one parcel: compute Salt Creek flood storage and the allowable fill';

/* Build-time extension point. Each entry is a function (api) that may add
 * controls and buttons to the dialog. Populated only in builds that include
 * extra modules; never at runtime. */
var CQB_SITE_PLUGINS = [];

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

/* Everything a county record hands back is free text headed for innerHTML,
 * so it all goes through this first. */
function cqbSeEsc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* The Zone A block. Empty string when there is nothing regulatory to say
 * (AE-only parcels are covered by the popup's floodplain rows already).
 * Per staff practice (Geovanni, 2026-08-31), whether the 5-acre engineered-
 * study threshold is measured against the whole development or only the Zone A
 * portion is decided case by case -- so this block shows BOTH measurements and
 * the rule, and never a verdict. A failed lookup is said out loud; silence
 * would read as all-clear. */
function cqbSeZoneHtml(z) {
  if (!z) return '';
  if (z.failed) {
    return '<div class="warn">The FEMA flood layer could not be checked just now, so no ' +
      'Zone A determination is shown. That is a lookup failure, not an all-clear.</div>';
  }
  if (!z.inZoneA) return '';
  var ac2 = function (v) { return Math.round(v * 100) / 100; };
  var totalTxt = z.acres != null ? ac2(z.acres) + ' acres total' : 'total area not recorded';
  var zoneTxt = z.zoneAAcres != null
    ? ac2(z.zoneAAcres) + ' acres of it inside Zone A'
    : 'the area inside Zone A could not be measured just now';
  var over = z.overOnTotal === true || z.overOnZoneA === true ||
             z.overOnTotal === null || z.overOnZoneA === null;
  var open = over ? '<div class="warn">' : '<div style="margin-top:6px;color:#c2d4e6">';
  return open + '<b>FEMA Zone A' + (z.floodway ? ' (and floodway)' : '') + '.</b> ' +
    'This parcel touches Zone A, which has no determined base flood elevation. ' +
    'Measured: ' + totalTxt + '; ' + zoneTxt + '. ' +
    'Developments greater than either ' + CQB_REG.zoneAStudyAcres + ' acres or ' +
    CQB_REG.zoneAStudyLots + ' lots in Zone A require an engineered base flood elevation ' +
    'study (LMC 27.52.040(g) / 27.53.040(g); the county code, Art. 11.007(h), uses the ' +
    'acreage test only). Whether the ' + CQB_REG.zoneAStudyAcres + ' acres is measured against the whole ' +
    'development or only its Zone A portion is a staff determination made case by case ' +
    '&mdash; both figures are shown here and this tool does not decide it. A development ' +
    'can also span multiple parcels, which parcel mapping alone cannot capture.</div>';
}

/* Recorded flood documents. Three honest shapes: the documents found, an
 * explicit "none mapped" when both lookups answered, and a named failure when
 * one did not. */
function cqbSeRecordsHtml(rec) {
  if (!rec) return '';
  var esc = cqbSeEsc;
  var bits = [];
  (rec.bra.items || []).forEach(function (a) {
    var line = '<b>Building restriction agreement' +
      (cqbBlank(a.EO_Number) ? '' : ' EO ' + esc(a.EO_Number)) + '.</b>';
    if (!cqbBlank(a.SubjectMat)) line += ' ' + esc(a.SubjectMat) + '.';
    var parts = [];
    if (!cqbBlank(a.Applicant)) parts.push('applicant ' + esc(a.Applicant));
    if (!cqbBlank(a.CurrentOwn)) parts.push('current owner ' + esc(a.CurrentOwn));
    var fd = cqbDateStr(a.DateFiled);
    if (fd) parts.push('filed ' + fd);
    if (!cqbBlank(a.Instrument)) parts.push('instrument ' + esc(a.Instrument));
    if (parts.length) line += ' ' + parts.join('; ') + '.';
    bits.push('<div class="warn">' + line + '</div>');
  });
  (rec.wse.items || []).forEach(function (a) {
    var line = '<b>Watershed encumbrance' +
      (cqbBlank(a.NAME) ? '' : ' &mdash; ' + esc(a.NAME)) + '.</b>';
    var parts = [];
    if (!cqbBlank(a.ENCUMTYPE)) parts.push('type ' + esc(a.ENCUMTYPE));
    if (!cqbBlank(a.ENCUMBRANCEHOLDER)) parts.push('holder ' + esc(a.ENCUMBRANCEHOLDER));
    if (!cqbBlank(a.ProjectName)) parts.push('project ' + esc(a.ProjectName));
    if (!cqbBlank(a.SRCREF)) parts.push('recorded ref ' + esc(a.SRCREF));
    var sd = cqbDateStr(a.LEGALSTARTDATE);
    if (sd) parts.push('effective ' + sd);
    if (parts.length) line += ' ' + parts.join('; ') + '.';
    bits.push('<div class="warn">' + line + '</div>');
  });
  var fails = [];
  if (!rec.bra.ok) fails.push('building restriction agreements');
  if (!rec.wse.ok) fails.push('watershed encumbrances');
  if (fails.length) {
    bits.push('<div class="warn">Could not check ' + fails.join(' or ') +
      ' just now. That is a lookup failure, not an all-clear.</div>');
  }
  if (!bits.length) {
    return '<div style="margin-top:6px;color:#9fb4c8">No building restriction agreements or ' +
      'watershed encumbrances are mapped on this parcel.</div>';
  }
  return bits.join('');
}

/* The fill-capacity block, one honest outcome at a time. r is a
 * cqbStorageCalc report, or {failed,message} when the calculation itself
 * fell over -- which must not hide the other blocks of the review. */
function cqbSeStorageHtml(r) {
  if (!r) return '';
  if (r.failed) {
    return '<div class="warn">The fill-capacity calculation failed: ' +
      cqbSeEsc(r.message) + '</div>';
  }
  if (r.noStorageArea) {
    return '<div style="margin-top:6px;color:#c2d4e6">This parcel is not ' +
      'inside a mapped Salt Creek flood storage area, so no fill allowance applies here. ' +
      'That is not the same as "no floodplain rules apply" &mdash; the FEMA check above ' +
      'and the popup\u2019s floodplain rows cover the mapped zones.</div>';
  }
  if (r.emptyClip) {
    return '<div style="margin-top:6px;color:#c2d4e6">The parcel only touches ' +
      'the edge of storage area ' + r.saLabel + '; none of its area falls inside.</div>';
  }
  if (r.noBfe) {
    return '<div class="warn">Storage area ' + r.saLabel + ' was found, but ' +
      'no base flood elevation lines were mapped within 2,000 ft, so there is nothing to ' +
      'measure depth against.</div>';
  }
  if (r.tooSmall || r.noElevation) {
    return '<div class="warn">' + (r.tooSmall
      ? 'The part of this parcel inside the storage area is too small to grid.'
      : 'The elevation service returned no ground heights for this parcel.') + '</div>';
  }

  var f = function (n) { return Math.round(n).toLocaleString(); };
  var html =
    '<table>' +
      '<tr><td>Storage area</td><td class="n">' + r.saLabel + ' (' +
        (r.fillPercent == null ? 'fill allowance not recorded'
                               : 'fill allowance ' + r.fillPercent + '%') + ')</td></tr>' +
      '<tr><td>Parcel inside it</td><td class="n">' + f(r.areaSqFt) + ' sq ft</td></tr>' +
      '<tr><td>Ground</td><td class="n">' + r.groundMin.toFixed(1) + ' &ndash; ' +
        r.groundMax.toFixed(1) + ' ft</td></tr>' +
      '<tr><td>Base flood elevation</td><td class="n">' + r.bfeMin.toFixed(2) + ' &ndash; ' +
        r.bfeMax.toFixed(2) + ' ft</td></tr>' +
      '<tr><td>Storage below BFE</td><td class="n"><b>' + f(r.volumeCF) + ' cu ft = ' +
        f(r.volumeCY) + ' CY</b></td></tr>' +
      (r.allowableCY != null
        ? '<tr><td>Allowable fill at ' + r.fillPercent + '%</td><td class="n"><b>' +
          f(r.allowableCY) + ' CY</b></td></tr>' : '') +
    '</table>' +
    '<div style="margin-top:8px;color:#9fb4c8">Method: USGS 3DEP bare-earth lidar sampled on ' +
    'a ' + r.gridStep + ' ft grid over the parcel inside the storage area (' + r.cells +
    ' cells, ' + r.wetCells + ' below the BFE); the BFE surface is interpolated between the ' +
    'county\u2019s ' + r.bfeLineCount + ' mapped BFE lines. Both are NAVD88.<br>' +
    '<b>Preliminary, and a floor rather than a ceiling.</b> LMC 27.52.035 assesses the whole ' +
    'DEVELOPMENT AREA, which can span multiple parcels in one storage area and shift fill ' +
    'between them by easement &mdash; the figure above is for this parcel alone. The ordinance ' +
    'baseline is the storage that existed on ' + CQB_REG.storageBaselineDate + ' (Ord. 18893); ' +
    'the lidar here is current ground, so any fill placed since then is already invisible to ' +
    'it and the true remaining allowance may be smaller. "Fill" includes buildings (27.52.020), ' +
    'which this calculation does not count. Two proposal-dependent exemptions ' +
    '(wet-floodproofed single-family, shed or garage; single-family non-substantial ' +
    'improvements) cannot be detected from mapping. It also ignores floodway rules and ' +
    'compensatory-storage design requirements. Verify against an engineering study before ' +
    'relying on it.</div>';
  if (r.warnings.length) {
    html += '<div class="warn">' + r.warnings.map(function (w) {
      return cqbSeEsc(w);
    }).join('<br><br>') + '</div>';
  }
  return html;
}

function cqbSiteToolsDialog() {
  cqbSeCss();
  var back = document.createElement('div');
  back.className = 'cqb-se-back';
  var optedIn = false;
  try { optedIn = localStorage.getItem(CQB_SE_OPTIN) === '1'; } catch (e) {}

  back.innerHTML =
    '<div class="cqb-se" role="dialog" aria-modal="true" aria-label="Site tools">' +
      '<h2>Site tools</h2>' +
      '<div class="bd">' +
        '<label for="cqb-se-pid">Parcel ID</label>' +
        '<input type="text" id="cqb-se-pid" placeholder="10 to 14 digits">' +
        /* Build-time extras (a private module's controls) land here. */
        '<div id="cqb-se-ext"></div>' +
        /* The one consent that gates every use of ground elevations. */
        '<div class="warn" id="cqb-se-optin" style="display:none">' +
          '<b>This is the one thing that leaves the county server.</b><br>' +
          'The county publishes no elevation data, so ground heights come from the USGS ' +
          '3D Elevation Program. Your browser sends the lot outline (public parcel ' +
          'coordinates, nothing about you) to elevation.nationalmap.gov and gets ground ' +
          'heights back.<br><br>' +
          'It is bare-earth lidar, <b>not a survey</b>: it predates recent grading and fill, ' +
          'omits structures, and must not be used for finished floor elevations, drainage ' +
          'design, or floodplain compliance.' +
          '<div class="row" style="margin-top:9px"><input type="checkbox" id="cqb-se-ok">' +
            '<span>Understood, fetch elevations</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="st" id="cqb-se-st"></div>' +
      '<div class="res" id="cqb-se-res"></div>' +
      '<div class="ft">' +
        '<button id="cqb-se-x">Close</button>' +
        '<button class="go" id="cqb-se-fill">Fill capacity</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(back);

  var $ = function (id) { return back.querySelector('#' + id); };
  $('cqb-se-pid').value = cqbSeGuessPid();
  if (optedIn) { $('cqb-se-ok').checked = true; }

  /* Shown whenever something on this dialog is about to reach outside the
   * county server, and never once the user has already agreed. */
  function needElevation(on) {
    $('cqb-se-optin').style.display = (on && !$('cqb-se-ok').checked) ? 'block' : 'none';
  }
  $('cqb-se-ok').addEventListener('change', function () {
    if (this.checked) $('cqb-se-optin').style.display = 'none';
  });

  function close() { back.remove(); }
  $('cqb-se-x').addEventListener('click', close);
  back.addEventListener('click', function (e) { if (e.target === back) close(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });

  /* ---- Fill capacity (Salt Creek flood storage) --------------------------
   * It only means anything inside one of the county's mapped Salt Creek
   * storage areas, so the honest outcomes are "here is the number" and "this
   * parcel is not in one" -- never a quiet zero. */
  $('cqb-se-fill').addEventListener('click', function () {
    var pid = ($('cqb-se-pid').value || '').replace(/\D/g, '');
    var st = $('cqb-se-st'), res = $('cqb-se-res');
    res.innerHTML = '';
    if (!/^\d{8,16}$/.test(pid)) { st.textContent = 'Enter a parcel ID first.'; return; }
    if (!$('cqb-se-ok').checked) {
      needElevation(true);
      st.textContent = 'Fill capacity needs ground elevations. Tick the box to confirm.';
      return;
    }
    try { localStorage.setItem(CQB_SE_OPTIN, '1'); } catch (e) {}

    var btn = this;
    btn.disabled = true;
    st.textContent = 'Reading the parcel...';

    cqbFloodReview(pid, { onStatus: function (t) { st.textContent = t; } }).then(function (rv) {
      btn.disabled = false;
      st.textContent = 'Done.';
      var head = '<b>' + (rv.address || ('PID ' + rv.pid)) + '</b>';
      res.innerHTML = head +
        cqbSeZoneHtml(rv.zone) +
        cqbSeStorageHtml(rv.storage) +
        cqbSeRecordsHtml(rv.records);
    }).catch(function (e) {
      btn.disabled = false;
      st.textContent = '';
      res.innerHTML = '<div class="warn">' + cqbSeEsc(String((e && e.message) || e)) + '</div>';
    });
  });

  /* Let build-time extras add their controls and buttons. A broken extra must
   * not take the core dialog down with it. */
  var api = {
    root: back,
    $: $,
    ext: $('cqb-se-ext'),
    foot: back.querySelector('.ft'),
    statusEl: $('cqb-se-st'),
    resultEl: $('cqb-se-res'),
    needElevation: needElevation,
    optKey: CQB_SE_OPTIN,
    getPid: function () { return ($('cqb-se-pid').value || '').replace(/\D/g, ''); },
    close: close
  };
  CQB_SITE_PLUGINS.forEach(function (p) {
    try { p(api); } catch (e) {
      if (typeof console !== 'undefined' && console.warn) console.warn('site-tools plugin failed', e);
    }
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
  var se = chip('Site tools', CQB_SITE_TOOLS_TIP);
  se.addEventListener('click', function () { try { cqbSiteToolsDialog(); } catch (e) { toast('Site tools failed to open: ' + (e && e.message ? e.message : e)); } });
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


  /* ---- 5d. the DATS Report menu item (v3.10) -------------------------------------------
   * "I want to... > DATS Report" runs VertiGIS workflow item
   * e40e25c0d0d74553b81c041160672b58, which is not shared publicly. For an anonymous
   * visitor the workflow runtime loads and then nothing happens at all -- no message, no
   * error, just a menu item that does nothing.
   *
   * v3.6 through v3.9 tried to detect that by asking the portal whether this session could
   * reach the item, sending cookies with credentials:'include', and hiding the item on a
   * 403. THAT WAS WRONG, and it did the opposite of what it intended.
   *
   * This app authenticates with OAuth: the credential lives in localStorage under
   * esriJSAPIOAuth, keyed to gis.lincoln.ne.gov/portal, and the only cookies on the domain
   * are Google Analytics (_ga*). A credentials:'include' request therefore carries no
   * authentication whatsoever -- it forwards analytics cookies and nothing else -- so the
   * probe returned 403 for EVERY session. Measured live 2026-08-28 while signed in as a
   * real portal user: the probe still returned 403 and the menu item was hidden from the
   * very person entitled to run it.
   *
   * So: no request, no session-dependent logic, no hard-coded item id to go stale. The app
   * already has a convention for this -- "Add Secure Data" and "Add Secure Data - Address
   * Grid" both read "User Authentication Required.  Internal Use Only." -- and DATS Report
   * simply was not given one. Saying so is honest for both audiences and costs nothing: a
   * signed-in user keeps the item, and an anonymous visitor gets an explanation instead of
   * a control that silently does nothing.
   *
   * localStorage __claude_qb_nodats = "1" leaves the menu item completely untouched. */
  var CQB_DATS_NOTE = 'User Authentication Required.';
  function labelDatsMenuItem() {
    if (localStorage.getItem('__claude_qb_nodats') === '1') return;
    document.querySelectorAll('[role="menuitem"]').forEach(function (mi) {
      if ((mi.textContent || '').indexOf('DATS Report') !== 0) return;

      /* Undo the v3.6-v3.9 behaviour if an older build hid this node in this page. */
      if (mi.style && mi.style.display === 'none') mi.style.display = '';

      /* Idempotent by content rather than by a flag: the observer sweeps often, and the
       * app may re-render the row and wipe the note, in which case it must come back. */
      var sec = mi.querySelector ? mi.querySelector('.MuiListItemText-secondary') : null;
      if (sec && (sec.textContent || '').indexOf(CQB_DATS_NOTE) === -1) {
        sec.textContent = (sec.textContent || '').trim() + '  ' + CQB_DATS_NOTE;
      }
      if (mi.getAttribute && mi.setAttribute) {
        var t = mi.getAttribute('title') || '';
        if (t.indexOf(CQB_DATS_NOTE) === -1) {
          mi.setAttribute('title', (t.trim() + '  ' + CQB_DATS_NOTE).trim());
        }
      }
    });
  }

  function fixAllFeatureDetailPanels() {
    document.querySelectorAll('.gcx-feature-details').forEach(function (p) {
      fixObliqueButton(p);
      try { repairInvalidValues(p); } catch (e) { /* never let a repair break the bar */ }
    });
    try { maintainSearchGroup(); } catch (e) { /* the search box must survive our mistakes */ }
    try { labelDatsMenuItem(); } catch (e) { /* nor must the "I want to..." menu */ }
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
