var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { TEMPERATURE_COLORS } from "../mapping/chart.js";
import { DOM } from "./dom.js";
import { localize } from "./internationalization.js";
import { Selector } from "../utilities/selector.js";
import { convertXMLToBlob, convertSVGToPNGAndThenDownloadIt, download } from "./export.js";
import "../utilities/external/plotly.min.js"; // note that I modified this copy of Plotly to work in vanilla ES6
import HARFIA_TABLE from "../../resources/alphabet.js";
import KATAKANA_TABLE from "../../resources/rules_ja.js";
// @ts-ignore
var Plotly = window.Plotly;
var LANGUAGE = DOM.elm("bash").textContent;
var Layer;
(function (Layer) {
    Layer[Layer["NONE"] = 0] = "NONE";
    Layer[Layer["PLANET"] = 1] = "PLANET";
    Layer[Layer["TERRAIN"] = 2] = "TERRAIN";
    Layer[Layer["HISTORY"] = 3] = "HISTORY";
    Layer[Layer["MAP"] = 4] = "MAP";
    Layer[Layer["FACTBOOK"] = 5] = "FACTBOOK";
})(Layer || (Layer = {}));
/** which levels of the model are up to date */
var latestUpdated = Layer.NONE;
/** which levels of the model will be up to date if the current model succeeds */
var latestUpdating = Layer.NONE;
/** whether the plotly image is up to date with the model */
var planetRendered = false;
/** whether a process is currently running */
var inProgress = false;
/** the number of alerts that have been posted */
var alertCounter = 0;
/** the current aspect ratio of the main map */
var aspectRatio = Math.sqrt(2);
/** the width of every character in the map font */
var characterWidthMap = null;
// start the work thread
var worker = new Worker("/source/gui/mapgenerator.js", { type: "module" });
function updateEverythingUpTo(target) {
    if (inProgress) // don't ask the worker to do multiple things at once, or the state will get confused.
        return; // just wait and let the user click the update button agen.
    disableButtons();
    // get all the inputs
    var planetType = DOM.val('planet-type');
    var tidallyLocked = DOM.checked('planet-locked');
    var radius = Number(DOM.val('planet-size')) / (2 * Math.PI);
    var gravity = Number(DOM.val('planet-gravity')) * 9.8;
    var spinRate = 1 / Number(DOM.val('planet-day')) * 2 * Math.PI / 3600;
    var obliquity = Number(DOM.val('planet-tilt')) * Math.PI / 180;
    var terrainSeed = Number(DOM.val('terrain-seed'));
    var numContinents = Number(DOM.val('terrain-continents'));
    var seaLevel = Number(DOM.val('terrain-sea-level'));
    var temperature = Number(DOM.val('terrain-temperature'));
    var historySeed = Number(DOM.val('history-seed'));
    var cataclysms = Number(DOM.val('history-meteors'));
    var year = Number(DOM.val('history-year'));
    var projectionName = DOM.val('map-projection');
    var orientation = DOM.val('map-orientation');
    var width = Number.parseFloat(DOM.val('map-width-mm'));
    var height = Number.parseFloat(DOM.val('map-height-mm'));
    var focusSpecifier = DOM.val('map-jung');
    var colorSchemeName = DOM.val('map-color');
    var rivers = DOM.checked('map-rivers');
    var borders = DOM.checked('map-borders');
    var graticule = DOM.checked('map-graticule');
    var windrose = DOM.checked('map-windrose');
    var landTexture = DOM.checked('map-land-texture');
    var seaTexture = DOM.checked('map-sea-texture');
    var shading = DOM.checked('map-shading');
    var civLabels = DOM.checked('map-political-labels');
    var style = DOM.val('map-spelling');
    // preemptively determine how up to date the model will be when this finishes
    latestUpdating = Math.max(latestUpdated, target);
    // send them to the worker thread and start waiting
    worker.postMessage([
        LANGUAGE, latestUpdated, target,
        planetType, tidallyLocked, radius, gravity, spinRate, obliquity,
        terrainSeed, numContinents, seaLevel, temperature,
        historySeed, cataclysms, year,
        projectionName, orientation, width, height, focusSpecifier,
        colorSchemeName, rivers, borders, landTexture, seaTexture, shading, civLabels, graticule, windrose, style,
        characterWidthMap,
    ]);
}
worker.onmessage = function (message) {
    var _a = __read(message.data, 7), planetData = _a[0], terrainMap = _a[1], historyMap = _a[2], map = _a[3], factbook = _a[4], focusOptions = _a[5], selectedFocusOption = _a[6];
    latestUpdated = latestUpdating; // update the state
    if (planetData !== null && !planetRendered && !DOM.elm('planet-panel').hasAttribute("hidden")) {
        // show a 3D model of the planet
        renderPlanet(planetData);
        planetRendered = true;
    }
    if (terrainMap !== null) {
        // show the global physical map
        DOM.elm('terrain-map-container').innerHTML = terrainMap;
    }
    if (historyMap !== null) {
        // show the global political map
        DOM.elm('history-map-container').innerHTML = historyMap;
    }
    if (map !== null) {
        // show the main map
        DOM.elm('map-map-container').innerHTML = map;
        // adjust the height and width options to reflect the new aspect ratio
        aspectRatio = calculateAspectRatio(DOM.elm('map-map-container').firstElementChild);
        enforceAspectRatio("neither", "mm");
        enforceAspectRatio("neither", "px");
    }
    if (factbook !== null) {
        // show the factbook
        DOM.elm('factbook-embed').setAttribute('srcdoc', factbook);
    }
    enableButtons();
    // now set up the "focus" options for the map tab:
    if (focusOptions !== null) {
        var picker = DOM.elm('map-jung');
        // clear it
        picker.textContent = "";
        for (var i = 0; i < focusOptions.length; i++) {
            var option = document.createElement('option');
            option.selected = (focusOptions[i].value === selectedFocusOption);
            option.setAttribute('value', focusOptions[i].value);
            option.textContent = focusOptions[i].label;
            picker.appendChild(option);
        }
        // if the selection could not be kept, default it to continent 1
        if (picker.selectedIndex === -1 && picker.childNodes.length > 1)
            picker.childNodes.item(1).selected = true;
    }
};
worker.onerror = function (error) {
    console.error(error);
    if (error.message === undefined)
        console.error("the worker threw an error that doesn't have a message!  is it a syntax issue, or maybe an import error?");
    else {
        var message = error.message.includes(":") ? error.message.split(":")[1].trim() : error.message;
        if (message.startsWith("Too fast"))
            postErrorAlert(localize("error.planet_too_fast", LANGUAGE));
        else if (message.startsWith("Too slow"))
            postErrorAlert(localize("error.planet_too_slow", LANGUAGE));
        else
            postErrorAlert(localize("error.uncaught", LANGUAGE));
    }
    enableButtons();
};
/**
 * use Plotly to draw the planet in a 3D plot
 * @param planetData the result of calling surface.parameterize(), which will be used to draw the Surface in 3D
 */
function renderPlanet(planetData) {
    console.log("grafa planete...");
    var x = planetData.x, y = planetData.y, z = planetData.z, I = planetData.I;
    var maxRadius = 0;
    for (var i = 0; i < x.length; i++)
        for (var j = 0; j < x[i].length; j++)
            maxRadius = Math.max(maxRadius, Math.sqrt(Math.pow(x[i][j], 2) + Math.pow(y[i][j], 2) + Math.pow(z[i][j], 2)));
    // apply a smotherstep normalization to the insolation
    var color = [];
    for (var i = 0; i < I.length; i++) {
        color.push([]);
        for (var j = 0; j < I[i].length; j++)
            color[i].push(Math.pow(I[i][j], 3) * (3 * I[i][j] * I[i][j] - 15 * I[i][j] + 20) / 8);
    }
    // set up a colormap object
    var temperatureColormap = [];
    for (var i = 0; i < TEMPERATURE_COLORS.length; i++)
        temperatureColormap.push([i / (TEMPERATURE_COLORS.length - 1), TEMPERATURE_COLORS[i]]);
    Plotly.react(DOM.elm("planet-map-container"), [{
            type: 'surface',
            x: x,
            y: y,
            z: z,
            surfacecolor: color,
            cmin: 0.,
            cmax: 2.,
            colorscale: temperatureColormap,
            showscale: false,
            lightposition: { x: 1000, y: 0, z: 0 },
            hoverinfo: "none",
            contours: {
                x: { highlight: false },
                y: { highlight: false },
                z: { highlight: false }
            },
        }], {
        margin: { l: 20, r: 20, t: 20, b: 20 },
        scene: {
            xaxis: {
                showspikes: false,
                range: [-maxRadius, maxRadius],
            },
            yaxis: {
                showspikes: false,
                range: [-maxRadius, maxRadius],
            },
            zaxis: {
                showspikes: false,
                range: [-maxRadius, maxRadius],
            },
            aspectmode: 'cube',
        },
    }, {
        responsive: true,
    }).then(function () {
    });
    console.log("fina!");
}
function disableButtons() {
    var e_5, _a;
    inProgress = true;
    try {
        for (var _b = __values(['planet', 'terrain', 'history', 'map']), _c = _b.next(); !_c.done; _c = _b.next()) {
            var tab = _c.value;
            DOM.elm("".concat(tab, "-apply")).toggleAttribute('disabled', true);
            DOM.elm("".concat(tab, "-ready")).style.display = 'none';
            DOM.elm("".concat(tab, "-loading")).style.display = null;
            DOM.elm("".concat(tab, "-map-container")).style.opacity = '50%';
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_5) throw e_5.error; }
    }
    DOM.elm("back").toggleAttribute('disabled', true);
    DOM.elm("reroll").toggleAttribute('disabled', true);
    DOM.elm("reroll-ready").style.display = 'none';
    DOM.elm("reroll-loading").style.display = null;
}
function enableButtons() {
    var e_6, _a;
    inProgress = false;
    try {
        for (var _b = __values(['planet', 'terrain', 'history', 'map']), _c = _b.next(); !_c.done; _c = _b.next()) {
            var tab = _c.value;
            DOM.elm("".concat(tab, "-apply")).toggleAttribute('disabled', false);
            DOM.elm("".concat(tab, "-ready")).style.display = null;
            DOM.elm("".concat(tab, "-loading")).style.display = 'none';
            DOM.elm("".concat(tab, "-map-container")).style.opacity = '100%';
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_6) throw e_6.error; }
    }
    DOM.elm("back").toggleAttribute('disabled', false);
    DOM.elm("reroll").toggleAttribute('disabled', false);
    DOM.elm("reroll-ready").style.display = null;
    DOM.elm("reroll-loading").style.display = 'none';
}
/**
 * create a red alert box across the top of the screen with some message
 */
function postErrorAlert(message) {
    var id = "alert-".concat(alertCounter);
    alertCounter++;
    DOM.elm('alert-box').innerHTML +=
        "<div class='alert fade show' role='alert' id='".concat(id, "'>\n") +
            "  ".concat(message, "\n") +
            "  <button type='button' class='close' data-dismiss='alert' aria-label='Close' onclick='document.getElementById(\"".concat(id, "\").remove();'>\n") +
            "    <span aria-hidden='true'>&times;</span>\n" +
            "  </button>\n" +
            "</div>";
}
/**
 * automaticly adjust the day length for toroids or spheroids to keep things stable
 */
function fixDayLength() {
    var locking = DOM.elm('planet-locked');
    var radius = Number(DOM.val('planet-size')) / (2 * Math.PI);
    var gravity = Number(DOM.val('planet-gravity')) * 9.8;
    // if it's spheroidal now
    if (DOM.val("planet-type") === 'spheroid') {
        // locking is okay
        locking.toggleAttribute('disabled', false);
        // make sure it's not spinning too fast
        var minDayLength = Math.ceil(2 * Math.PI / Math.sqrt(0.5 * gravity / (radius * 1000)) / 3600 * 10) / 10;
        DOM.set("planet-day", String(Math.max(minDayLength, Number(DOM.val("planet-day")))));
    }
    // if it's toroidal now
    else if (DOM.val("planet-type") === 'toroid') {
        // locking is not okay
        if (locking.checked) // uncheck tidal locking if we need to
            locking.click();
        locking.toggleAttribute('disabled', true); // and disable it
        // make sure it's not spinning too fast or too slow
        var minDayLength = Math.ceil(2 * Math.PI / Math.sqrt(0.50 * gravity / (radius * 1000)) / 3600 * 10) / 10;
        var maxDayLength = Math.floor(2 * Math.PI / Math.sqrt(0.17 * gravity / (radius * 1000)) / 3600 * 10) / 10;
        DOM.set("planet-day", String(Math.max(minDayLength, Math.min(maxDayLength, Number(DOM.val("planet-day"))))));
    }
    // if it's planar
    else {
        // locking is okay
        locking.toggleAttribute('disabled', false);
    }
}
/**
 * infer the aspect ratio of an SVG element from its viewBox
 */
function calculateAspectRatio(svg) {
    var _a = __read(svg.getAttribute("viewBox").split(" "), 4), widthString = _a[2], heightString = _a[3];
    return Number(widthString) / Number(heightString);
}
/**
 * when the map aspect ratio changes or one of the map size input spinners change,
 * make sure they're all consistent.
 */
function enforceAspectRatio(fixed, unit) {
    var widthSpinner = DOM.elm("map-width-".concat(unit));
    var heightSpinner = DOM.elm("map-height-".concat(unit));
    if (fixed === "width") {
        var width = Number.parseFloat(widthSpinner.value);
        heightSpinner.value = Math.round(width / aspectRatio).toString();
    }
    else if (fixed === "height") {
        var height = Number.parseFloat(heightSpinner.value);
        widthSpinner.value = Math.round(height * aspectRatio).toString();
    }
    else {
        var length_1 = Math.max(Number.parseFloat(widthSpinner.value), Number.parseFloat(heightSpinner.value));
        if (aspectRatio > 1) {
            widthSpinner.value = length_1.toString();
            heightSpinner.value = Math.round(length_1 / aspectRatio).toString();
        }
        else {
            heightSpinner.value = length_1.toString();
            widthSpinner.value = Math.round(length_1 * aspectRatio).toString();
        }
    }
}
/**
 * build a map containing the width of every possible character
 */
function measureAllCharacters() {
    var e_7, _a, e_8, _b, e_9, _c, e_10, _d, e_11, _e, e_12, _f, e_13, _g, e_14, _h, e_15, _j, e_16, _k;
    var allCharacters = new Set();
    for (var style = 0; style < HARFIA_TABLE.styles.length; style++) {
        try {
            for (var _l = (e_7 = void 0, __values(HARFIA_TABLE.sounds)), _m = _l.next(); !_m.done; _m = _l.next()) {
                var sound = _m.value;
                try {
                    for (var _o = (e_8 = void 0, __values(sound.symbols[style])), _p = _o.next(); !_p.done; _p = _o.next()) {
                        var character = _p.value;
                        allCharacters.add(character);
                        if (HARFIA_TABLE.flags[0].values[style])
                            allCharacters.add(character.toUpperCase());
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (_p && !_p.done && (_b = _o.return)) _b.call(_o);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_m && !_m.done && (_a = _l.return)) _a.call(_l);
            }
            finally { if (e_7) throw e_7.error; }
        }
        try {
            for (var _q = (e_9 = void 0, __values(HARFIA_TABLE.suprasegmentals)), _r = _q.next(); !_r.done; _r = _q.next()) {
                var suprasegmental = _r.value;
                allCharacters.add(suprasegmental.symbols[style]);
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (_r && !_r.done && (_c = _q.return)) _c.call(_q);
            }
            finally { if (e_9) throw e_9.error; }
        }
        try {
            for (var _s = (e_10 = void 0, __values(HARFIA_TABLE.modifiers)), _t = _s.next(); !_t.done; _t = _s.next()) {
                var modifier = _t.value;
                try {
                    for (var _u = (e_11 = void 0, __values(modifier.symbols[style])), _v = _u.next(); !_v.done; _v = _u.next()) {
                        var character = _v.value;
                        allCharacters.add(character);
                        if (HARFIA_TABLE.flags[0].values[style])
                            allCharacters.add(character.toUpperCase());
                    }
                }
                catch (e_11_1) { e_11 = { error: e_11_1 }; }
                finally {
                    try {
                        if (_v && !_v.done && (_e = _u.return)) _e.call(_u);
                    }
                    finally { if (e_11) throw e_11.error; }
                }
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (_t && !_t.done && (_d = _s.return)) _d.call(_s);
            }
            finally { if (e_10) throw e_10.error; }
        }
    }
    try {
        for (var _w = __values(KATAKANA_TABLE.columns), _x = _w.next(); !_x.done; _x = _w.next()) {
            var row = _x.value;
            try {
                for (var _y = (e_13 = void 0, __values(row.kana)), _z = _y.next(); !_z.done; _z = _y.next()) {
                    var syllable = _z.value;
                    try {
                        for (var syllable_1 = (e_14 = void 0, __values(syllable)), syllable_1_1 = syllable_1.next(); !syllable_1_1.done; syllable_1_1 = syllable_1.next()) {
                            var character = syllable_1_1.value;
                            allCharacters.add(character);
                        }
                    }
                    catch (e_14_1) { e_14 = { error: e_14_1 }; }
                    finally {
                        try {
                            if (syllable_1_1 && !syllable_1_1.done && (_h = syllable_1.return)) _h.call(syllable_1);
                        }
                        finally { if (e_14) throw e_14.error; }
                    }
                }
            }
            catch (e_13_1) { e_13 = { error: e_13_1 }; }
            finally {
                try {
                    if (_z && !_z.done && (_g = _y.return)) _g.call(_y);
                }
                finally { if (e_13) throw e_13.error; }
            }
        }
    }
    catch (e_12_1) { e_12 = { error: e_12_1 }; }
    finally {
        try {
            if (_x && !_x.done && (_f = _w.return)) _f.call(_w);
        }
        finally { if (e_12) throw e_12.error; }
    }
    try {
        for (var _0 = __values("áéíóúüяеёию"), _1 = _0.next(); !_1.done; _1 = _0.next()) {
            var specialCharacter = _1.value;
            allCharacters.add(specialCharacter);
            allCharacters.add(specialCharacter.toUpperCase());
        }
    }
    catch (e_15_1) { e_15 = { error: e_15_1 }; }
    finally {
        try {
            if (_1 && !_1.done && (_j = _0.return)) _j.call(_0);
        }
        finally { if (e_15) throw e_15.error; }
    }
    var testText = DOM.elm('test-text');
    testText.innerHTML = 'n';
    var en = testText.getBoundingClientRect().width;
    var widthMap = new Map();
    try {
        for (var allCharacters_1 = __values(allCharacters), allCharacters_1_1 = allCharacters_1.next(); !allCharacters_1_1.done; allCharacters_1_1 = allCharacters_1.next()) {
            var character = allCharacters_1_1.value;
            testText.innerHTML = 'n' + character + 'n';
            var testTextLength = testText.getBoundingClientRect().width;
            widthMap.set(character, (testTextLength - 2 * en) / 20);
        }
    }
    catch (e_16_1) { e_16 = { error: e_16_1 }; }
    finally {
        try {
            if (allCharacters_1_1 && !allCharacters_1_1.done && (_k = allCharacters_1.return)) _k.call(allCharacters_1);
        }
        finally { if (e_16) throw e_16.error; }
    }
    testText.innerHTML = '';
    return widthMap;
}
var _loop_1 = function (prefix) {
    /** when the user clicks on a card header, toggle whether it is shown and hide all the others */
    DOM.elm("map-".concat(prefix, "-heading")).addEventListener('click', function () {
        var e_17, _a;
        try {
            for (var _b = (e_17 = void 0, __values(['content', 'style', 'formatting'])), _c = _b.next(); !_c.done; _c = _b.next()) {
                var otherPrefix = _c.value;
                var heading = DOM.elm("map-".concat(otherPrefix, "-heading"));
                var collapse = DOM.elm("map-".concat(otherPrefix, "-collapse"));
                var nowShown = void 0;
                if (otherPrefix === prefix) // toggle the selected header
                    nowShown = collapse.classList.toggle("show");
                else // hide all other headers
                    nowShown = collapse.classList.toggle("show", false);
                heading.setAttribute("aria-expanded", nowShown.toString());
            }
        }
        catch (e_17_1) { e_17 = { error: e_17_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_17) throw e_17.error; }
        }
    });
};
try {
    for (var _e = __values(['content', 'style', 'formatting']), _f = _e.next(); !_f.done; _f = _e.next()) {
        var prefix = _f.value;
        _loop_1(prefix);
    }
}
catch (e_1_1) { e_1 = { error: e_1_1 }; }
finally {
    try {
        if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
    }
    finally { if (e_1) throw e_1.error; }
}
var _loop_2 = function (prefix) {
    /** when the user clicks on a tab, show its panel and hide all others */
    DOM.elm("".concat(prefix, "-tab")).addEventListener('click', function () {
        var e_18, _a;
        try {
            for (var _b = (e_18 = void 0, __values(['planet', 'terrain', 'history', 'map', 'factbook'])), _c = _b.next(); !_c.done; _c = _b.next()) {
                var otherPrefix = _c.value;
                var tab = DOM.elm("".concat(otherPrefix, "-tab"));
                var panel = DOM.elm("".concat(otherPrefix, "-panel"));
                if (otherPrefix === prefix) {
                    tab.setAttribute("aria-selected", "true");
                    tab.classList.add("active");
                    panel.classList.add("active");
                    panel.toggleAttribute("hidden", false);
                }
                else {
                    tab.setAttribute("aria-selected", "false");
                    tab.classList.remove("active");
                    panel.classList.remove("active");
                    panel.toggleAttribute("hidden", true);
                }
            }
        }
        catch (e_18_1) { e_18 = { error: e_18_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_18) throw e_18.error; }
        }
    });
};
try {
    for (var _g = __values(['planet', 'terrain', 'history', 'map', 'factbook']), _h = _g.next(); !_h.done; _h = _g.next()) {
        var prefix = _h.value;
        _loop_2(prefix);
    }
}
catch (e_2_1) { e_2 = { error: e_2_1 }; }
finally {
    try {
        if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
    }
    finally { if (e_2) throw e_2.error; }
}
try {
    for (var _j = __values(['apply', 'tab']), _k = _j.next(); !_k.done; _k = _j.next()) {
        var suffix = _k.value;
        /**
         * When the planet button is clicked, call its function.
         */
        DOM.elm("planet-".concat(suffix)).addEventListener('click', function () {
            updateEverythingUpTo(Layer.PLANET);
        });
        /**
         * When the terrain tab or button is clicked, do its thing
         */
        DOM.elm("terrain-".concat(suffix)).addEventListener('click', function () {
            updateEverythingUpTo(Layer.TERRAIN);
        });
        /**
         * When the history tab or button is clicked, activate its purpose.
         */
        DOM.elm("history-".concat(suffix)).addEventListener('click', function () {
            updateEverythingUpTo(Layer.HISTORY);
        });
        /**
         * When the map tab or button is clicked, reveal its true form.
         */
        DOM.elm("map-".concat(suffix)).addEventListener('click', function () {
            updateEverythingUpTo(Layer.MAP);
        });
    }
}
catch (e_3_1) { e_3 = { error: e_3_1 }; }
finally {
    try {
        if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
    }
    finally { if (e_3) throw e_3.error; }
}
/**
 * When the factbook tab is clicked, generate the factbook.
 */
DOM.elm('factbook-tab').addEventListener('click', function () {
    updateEverythingUpTo(Layer.FACTBOOK);
});
DOM.elm('reroll').addEventListener('click', function () {
    DOM.set('terrain-seed', String(Number(DOM.val('terrain-seed')) + 1));
    DOM.set('history-seed', String(Number(DOM.val('history-seed')) + 1));
    DOM.elm('terrain-seed').dispatchEvent(new Event('change')); // make sure to trigger the event listener so it knows to actually update everything
    updateEverythingUpTo(Layer.MAP);
});
DOM.elm('back').addEventListener('click', function () {
    DOM.set('terrain-seed', String(Number(DOM.val('terrain-seed')) - 1));
    DOM.set('history-seed', String(Number(DOM.val('history-seed')) - 1));
    DOM.elm('terrain-seed').dispatchEvent(new Event('change')); // make sure to trigger the event listener so it knows to actually update everything
    updateEverythingUpTo(Layer.MAP);
});
/**
 * When the download button is clicked, export and download the map as an SVG
 */
DOM.elm('map-download-svg').addEventListener('click', function () {
    var printscaleMap = DOM.elm('map-map-container').firstElementChild.cloneNode(true);
    var _a = __read(printscaleMap.getAttribute("viewBox").split(" "), 4), width = _a[2], height = _a[3];
    printscaleMap.setAttribute("width", "".concat(width, "mm"));
    printscaleMap.setAttribute("height", "".concat(height, "mm"));
    download(convertXMLToBlob(printscaleMap, "image/svg"), localize("filename.map", LANGUAGE) + ".svg");
});
/**
 * When the download button is clicked, export and download the map as a PNG
 */
DOM.elm('map-download-png').addEventListener('click', function () {
    convertSVGToPNGAndThenDownloadIt(convertXMLToBlob(DOM.elm('map-map-container').firstElementChild, "image/svg"), Number.parseInt(DOM.val('map-width-px')), Number.parseInt(DOM.val('map-height-px')), localize("filename.map", LANGUAGE) + ".png");
});
/**
 * When the download button is clicked, export and download the factbook as a HTML
 */
DOM.elm('factbook-download-html').addEventListener('click', function () {
    var factbookFrame = DOM.elm('factbook-embed');
    var factbook;
    if (factbookFrame.contentDocument)
        factbook = factbookFrame.contentDocument.documentElement;
    else
        factbook = factbookFrame.contentWindow.document.documentElement;
    download(convertXMLToBlob(factbook, "text/html"), localize("filename.factbook", LANGUAGE) + ".html");
});
/**
 * When the print button is clicked, send the factbook to the browser's print window
 */
DOM.elm('factbook-print').addEventListener('click', function () {
    DOM.elm('factbook-embed').contentWindow.print();
});
/**
 * When the planet type changes, make sure the day length is legal
 */
DOM.elm('planet-type').addEventListener('change', function () { return fixDayLength(); });
/**
 * When one of the map size inputs change, change its counterpart to match
 */
DOM.elm('map-width-mm').addEventListener('change', function () { return enforceAspectRatio('width', 'mm'); });
DOM.elm('map-height-mm').addEventListener('change', function () { return enforceAspectRatio('height', 'mm'); });
DOM.elm('map-width-px').addEventListener('change', function () { return enforceAspectRatio('width', 'px'); });
DOM.elm('map-height-px').addEventListener('change', function () { return enforceAspectRatio('height', 'px'); });
/**
 * when the inputs change, forget what we know
 */
var tabs = [
    { layer: Layer.PLANET, name: 'planet' },
    { layer: Layer.TERRAIN, name: 'terrain' },
    { layer: Layer.HISTORY, name: 'history' },
    { layer: Layer.MAP, name: 'map' },
    { layer: Layer.FACTBOOK, name: 'factbook' },
];
var _loop_3 = function (layer, name_1) {
    Selector.mapToAllChildren(DOM.elm("".concat(name_1, "-panel")), function (element) {
        var tagName = element.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'select') {
            element.addEventListener('change', function () {
                latestUpdated = Math.min(latestUpdated, layer - 1);
                latestUpdating = Math.min(latestUpdating, layer - 1);
                if (layer <= Layer.PLANET)
                    planetRendered = false;
            });
        }
    });
};
try {
    for (var tabs_1 = __values(tabs), tabs_1_1 = tabs_1.next(); !tabs_1_1.done; tabs_1_1 = tabs_1.next()) {
        var _l = tabs_1_1.value, layer = _l.layer, name_1 = _l.name;
        _loop_3(layer, name_1);
    }
}
catch (e_4_1) { e_4 = { error: e_4_1 }; }
finally {
    try {
        if (tabs_1_1 && !tabs_1_1.done && (_d = tabs_1.return)) _d.call(tabs_1);
    }
    finally { if (e_4) throw e_4.error; }
}
function dateToInt(datetime) {
    return ((((datetime.getFullYear() % 100 * 100 + datetime.getMonth() + 1) * 100 +
        datetime.getDate()) * 100 + datetime.getHours()) * 100 +
        datetime.getMinutes()) * 100 + datetime.getSeconds();
}
/**
 * Once the page is ready, start the algorithm!
 */
document.addEventListener("DOMContentLoaded", function () {
    var seed = dateToInt(new Date());
    DOM.set('terrain-seed', "".concat(seed));
    DOM.set('history-seed', "".concat(seed));
    console.log("measuring the map font...");
    characterWidthMap = measureAllCharacters();
    DOM.elm('map-tab').click();
}); // TODO: warn before leaving page
//# sourceMappingURL=mapgui.js.map