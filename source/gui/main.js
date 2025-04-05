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
var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import "../libraries/plotly.min.js"; // note that I modified this copy of Plotly to work in vanilla ES6
import { DOM } from "./dom.js";
import { format } from "./internationalization.js";
import { Biome, generateTerrain } from "../generation/terrain.js";
import { World } from "../generation/world.js";
import { Random } from "../utilities/random.js";
import { Chart } from "../map/chart.js";
import { Spheroid } from "../surface/spheroid.js";
import { Sphere } from "../surface/sphere.js";
import { Disc } from "../surface/disc.js";
import { Toroid } from "../surface/toroid.js";
import { LockedDisc } from "../surface/lockeddisc.js";
import { generateFactbook } from "../generation/factsheet.js";
import { Selector } from "../utilities/selector.js";
import { convertSVGToBlob, convertSVGToPNGAndThenDownloadIt, download, serialize } from "./export.js";
import { filterSet } from "../utilities/miscellaneus.js";
// @ts-ignore
var Plotly = window.Plotly;
var TERRAIN_COLORMAP = [
    [0.00, 'rgb(251, 254, 248)'],
    [0.08, 'rgb(216, 231, 245)'],
    [0.17, 'rgb(164, 215, 237)'],
    [0.25, 'rgb(104, 203, 206)'],
    [0.33, 'rgb( 68, 185, 156)'],
    [0.42, 'rgb( 54, 167, 105)'],
    [0.50, 'rgb( 64, 145,  47)'],
    [0.58, 'rgb( 92, 116,  11)'],
    [0.67, 'rgb(100,  89,   5)'],
    [0.75, 'rgb( 99,  62,   1)'],
    [0.83, 'rgb( 91,  33,   1)'],
    [0.92, 'rgb( 75,   2,   6)'],
    [1.00, 'rgb( 41,   4,   5)'],
];
var MIN_SIZE_TO_LIST = 6;
var MAX_COUNTRIES_TO_LIST = 20;
var FONT_SIZE = 8; // pt
var Layer;
(function (Layer) {
    Layer[Layer["NONE"] = 0] = "NONE";
    Layer[Layer["PLANET"] = 1] = "PLANET";
    Layer[Layer["TERRAIN"] = 2] = "TERRAIN";
    Layer[Layer["HISTORY"] = 3] = "HISTORY";
    Layer[Layer["MAP"] = 4] = "MAP";
    Layer[Layer["FACTBOOK"] = 5] = "FACTBOOK";
})(Layer || (Layer = {}));
/** which level of the model currently has all input changes applied */
var lastUpdated = Layer.NONE;
/** whether the plotly image is up to date with the model */
var planetRendered = false;
/** whether a process is currently running */
var inProgress = false; // TODO; I can't remember why this is here; if I click forward in the tabs while it's loading, does everything update?
/** the planet on which the map is defined */
var surface = null;
/** the list of continents with at least some land */
var continents = null;
/** the human world on that planet */
var world = null;
/** the Chart representing the main map */
var chart = null;
/** the list of countries on the current map */
var mappedCivs = null;
/** the number of alerts that have been posted */
var alertCounter = 0;
/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 */
function applyPlanet() {
    console.log("jena planete...");
    var planetType = DOM.val('planet-type'); // read input
    var hasDayNightCycle = !DOM.checked('planet-locked');
    var radius = Number(DOM.val('planet-size')) / (2 * Math.PI);
    var gravity = Number(DOM.val('planet-gravity')) * 9.8;
    var spinRate = 1 / Number(DOM.val('planet-day')) * 2 * Math.PI / 3600;
    var obliquity = Number(DOM.val('planet-tilt')) * Math.PI / 180;
    try { // create a surface
        if (planetType === 'spheroid') { // spheroid
            if (hasDayNightCycle) { // oblate
                surface = new Spheroid(radius, gravity, spinRate, obliquity);
            }
            else { // spherical
                surface = new Sphere(radius);
            }
        }
        else if (planetType === 'toroid') { // toroid
            surface = new Toroid(radius, gravity, spinRate, obliquity);
        }
        else if (planetType === 'plane') { // plane
            if (hasDayNightCycle) { // with orbiting sun
                surface = new Disc(radius, obliquity, hasDayNightCycle);
            }
            else { // with static sun
                surface = new LockedDisc(radius);
            }
        }
        else {
            console.error("What kind of planet is ".concat(planetType));
            return;
        }
    }
    catch (err) {
        if (err instanceof RangeError) {
            var message = void 0;
            if (err.message.startsWith("Too fast"))
                message = format(null, "error.planet_too_fast"); // TODO: it should automaticly bound the day-length at stable values
            else if (err.message.startsWith("Too slow"))
                message = format(null, "error.planet_too_slow");
            postErrorAlert(message);
            return;
        }
        else
            throw err;
    }
    surface.initialize();
    console.log("fina!");
    lastUpdated = Layer.PLANET;
    planetRendered = false;
}
function renderPlanet() {
    if (lastUpdated < Layer.PLANET)
        applyPlanet();
    console.log("grafa planete...");
    var radius = Number(DOM.val('planet-size')) / (2 * Math.PI);
    var _a = surface.parameterize(18), x = _a.x, y = _a.y, z = _a.z, I = _a.I;
    Plotly.react(DOM.elm('planet-map'), [{
            type: 'surface',
            x: x,
            y: y,
            z: z,
            surfacecolor: I,
            cmin: 0.,
            cmax: 2.,
            colorscale: TERRAIN_COLORMAP,
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
                range: [-radius, radius],
            },
            yaxis: {
                showspikes: false,
                range: [-radius, radius],
            },
            zaxis: {
                showspikes: false,
                range: [-radius, radius],
            },
            aspectmode: 'cube',
        },
    }, {
        responsive: true,
    }).then(function () {
    });
    console.log("fina!");
    planetRendered = true;
}
/**
 * Generate the heightmap and biomes on the planet's surface.
 */
function applyTerrain() {
    var e_5, _a;
    if (lastUpdated < Layer.PLANET)
        applyPlanet();
    console.log("Delone tingonfa...");
    var rng = new Random(Number(DOM.val('terrain-seed'))); // use the random seed
    surface.populateWith(surface.randomlySubdivide(rng)); // finish constructing the surface
    console.log("jena zemforme...");
    rng = rng.reset();
    generateTerrain(Number(DOM.val('terrain-continents')) * 2, Number(DOM.val('terrain-sea-level')), Number(DOM.val('terrain-temperature')), surface, rng); // create the terrain!
    console.log("grafa...");
    var projection = surface.isFlat() ? "orthographic" : "equal_earth";
    var mapper = new Chart(projection, surface, surface.tiles, "north", false, 62500);
    mapper.depict(surface, null, DOM.elm('terrain-map'), 'physical', true, false, false, false, false);
    // save the continents in an easily accessible form
    continents = [];
    try {
        for (var _b = __values(surface.tiles), _c = _b.next(); !_c.done; _c = _b.next()) {
            var tile = _c.value;
            if (tile.biome === Biome.OCEAN)
                continue;
            while (continents.length <= tile.plateIndex)
                continents.push(new Set());
            continents[tile.plateIndex].add(tile);
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_5) throw e_5.error; }
    }
    continents = continents.sort(function (tilesA, tilesB) { return tilesB.size - tilesA.size; });
    var minSizeToList = MIN_SIZE_TO_LIST;
    if (continents[0].size < minSizeToList && continents[0].size > 0)
        minSizeToList = continents[0].size;
    continents = continents.filter(function (tiles) { return tiles.size >= minSizeToList; });
    continents = continents.slice(0, Number(DOM.val('terrain-continents')));
    console.log("fina!");
    lastUpdated = Layer.TERRAIN;
}
/**
 * Generate the countries on the planet's surface.
 */
function applyHistory() {
    var e_6, _a;
    if (lastUpdated < Layer.TERRAIN)
        applyTerrain();
    console.log("jena histore...");
    world = new World(Number(DOM.val('history-meteors')), surface);
    var rng = new Random(Number(DOM.val('history-seed'))); // use the random seed
    world.generateHistory(Number(DOM.val('history-year')), rng); // create the terrain!
    console.log("grafa...");
    var projection = surface.isFlat() ? "orthographic" : "equal_earth";
    var mapper = new Chart(projection, surface, surface.tiles, "north", false, 62500);
    mapper.depict(surface, world, DOM.elm('history-map'), 'political', false, true, false, false, false);
    // now set up the "focus" options for the map tab:
    console.log("mute ba chuze bil...");
    var picker = document.getElementById('map-jung');
    picker.textContent = "";
    // show the whole world
    var option = document.createElement('option');
    option.setAttribute('value', 'world');
    option.textContent = format(null, "parameter.map.focus.whole_world");
    picker.appendChild(option);
    // show a single continent
    for (var i = 0; i < continents.length; i++) {
        var option_1 = document.createElement('option');
        option_1.selected = (i === 0);
        option_1.setAttribute('value', "continent".concat(i));
        option_1.textContent = format(null, "parameter.map.focus.continent", i + 1);
        picker.appendChild(option_1);
    }
    // or show a single country
    var countries = world.getCivs(true, MIN_SIZE_TO_LIST); // list the biggest countries for the centering selection
    try {
        for (var _b = __values(countries.slice(0, MAX_COUNTRIES_TO_LIST)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var country = _c.value;
            var option_2 = document.createElement('option');
            option_2.setAttribute('value', "country".concat(country.id));
            option_2.textContent = country.getName().toString(DOM.val("map-spelling"));
            picker.appendChild(option_2);
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_6) throw e_6.error; }
    }
    console.log("fina!");
    lastUpdated = Layer.HISTORY;
}
/**
 * Generate a final formatted map.
 */
function applyMap() {
    if (lastUpdated < Layer.HISTORY)
        applyHistory();
    console.log("grafa zemgrafe...");
    var projectionName = surface.isFlat() ? "orthographic" : DOM.val('map-projection');
    var orientation = DOM.val('map-orientation');
    var rectangularBounds = (DOM.val('map-shape') === 'rectangle');
    var width = Number.parseFloat(DOM.val('map-width-mm'));
    var height = Number.parseFloat(DOM.val('map-height-mm'));
    var focusSpecifier = DOM.val('map-jung');
    var regionOfInterest;
    if (focusSpecifier === "world")
        regionOfInterest = surface.tiles;
    else if (focusSpecifier.startsWith("continent"))
        regionOfInterest = continents[Number.parseInt(focusSpecifier.slice(9))];
    else if (focusSpecifier.startsWith("country")) {
        var civ = world.getCiv(Number.parseInt(focusSpecifier.slice(7)));
        regionOfInterest = filterSet(civ.tileTree.keys(), function (tile) { return !tile.isWater(); });
    }
    else
        throw new Error("invalid focusSpecifier: '".concat(focusSpecifier, "'"));
    chart = new Chart(projectionName, surface, regionOfInterest, orientation, rectangularBounds, width * height);
    mappedCivs = chart.depict(surface, world, DOM.elm('map-map'), DOM.val('map-color'), DOM.checked('map-rivers'), DOM.checked('map-borders'), DOM.checked('map-shading'), DOM.checked('map-political-labels'), DOM.checked('map-physical-labels'), FONT_SIZE * 0.35, // convert to mm
    (DOM.val('map-spelling') === 'null') ?
        null :
        DOM.val('map-spelling'));
    // adjust the height and width options to reflect the new aspect ratio
    enforceAspectRatio("neither", "mm");
    enforceAspectRatio("neither", "px");
    console.log("fina!");
    lastUpdated = Layer.MAP;
}
/**
 * Generate a nicely typeset document giving all the information about the mapped countries
 */
function applyFactbook() {
    if (lastUpdated < Layer.MAP)
        applyMap();
    console.log("jena factbook...");
    var doc = generateFactbook(DOM.elm('map-map'), mappedCivs, (DOM.val('map-spelling') === 'null') ?
        null :
        DOM.val('map-spelling'));
    DOM.elm('factbook-embed').setAttribute('srcdoc', serialize(doc));
    console.log("fina!");
    lastUpdated = Layer.FACTBOOK;
}
/**
 * disable all the buttons, turn on the loading icon, call the funccion, wait, then set
 * everything back to how it was before.
 */
function disableButtonsAndDo(func) {
    var e_7, _a;
    inProgress = true;
    try {
        for (var _b = __values(['planet', 'terrain', 'history', 'map']), _c = _b.next(); !_c.done; _c = _b.next()) {
            var tab = _c.value;
            DOM.elm("".concat(tab, "-apply")).toggleAttribute('disabled', true);
            DOM.elm("".concat(tab, "-ready")).style.display = 'none';
            DOM.elm("".concat(tab, "-loading")).style.display = null;
        }
    }
    catch (e_7_1) { e_7 = { error: e_7_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_7) throw e_7.error; }
    }
    setTimeout(function () {
        var e_8, _a;
        try {
            func();
        }
        catch (error) {
            console.error(error);
            postErrorAlert(format(null, "error.uncaught"));
        }
        inProgress = false;
        try {
            for (var _b = __values(['planet', 'terrain', 'history', 'map']), _c = _b.next(); !_c.done; _c = _b.next()) {
                var tab = _c.value;
                DOM.elm("".concat(tab, "-apply")).toggleAttribute('disabled', false);
                DOM.elm("".concat(tab, "-ready")).style.display = null;
                DOM.elm("".concat(tab, "-loading")).style.display = 'none';
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_8) throw e_8.error; }
        }
    }, 10);
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
 * when the map aspect ratio changes or one of the map size input spinners change,
 * make sure they're all consistent.
 */
function enforceAspectRatio(fixed, unit) {
    var aspectRatio = chart.dimensions.width / chart.dimensions.height;
    var widthSpinner = DOM.elm("map-width-".concat(unit));
    var heightSpinner = DOM.elm("map-height-".concat(unit));
    if (fixed === "width") {
        var width = Number.parseFloat(widthSpinner.value);
        heightSpinner.value = (Math.round(width / aspectRatio)).toString();
    }
    else if (fixed === "height") {
        var height = Number.parseFloat(heightSpinner.value);
        widthSpinner.value = (Math.round(height * aspectRatio)).toString();
    }
    else {
        var area = Number.parseFloat(widthSpinner.value) * Number.parseFloat(heightSpinner.value);
        widthSpinner.value = (Math.round(Math.sqrt(area * aspectRatio))).toString();
        heightSpinner.value = (Math.round(Math.sqrt(area / aspectRatio))).toString();
    }
}
var _loop_1 = function (prefix) {
    /** when the user clicks on a card header, toggle whether it is shown and hide all the others */
    DOM.elm("map-".concat(prefix, "-heading")).addEventListener('click', function () {
        var e_9, _a;
        try {
            for (var _b = (e_9 = void 0, __values(['content', 'style', 'formatting'])), _c = _b.next(); !_c.done; _c = _b.next()) {
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
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_9) throw e_9.error; }
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
        var e_10, _a;
        try {
            for (var _b = (e_10 = void 0, __values(['planet', 'terrain', 'history', 'map', 'factbook'])), _c = _b.next(); !_c.done; _c = _b.next()) {
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
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_10) throw e_10.error; }
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
         * Note that this does not check if the planet is out of sync; it
         * must update every time the tab is opened because of Plotly.
         */
        DOM.elm("planet-".concat(suffix)).addEventListener('click', function () {
            if (!planetRendered && !inProgress)
                disableButtonsAndDo(renderPlanet);
        });
        /**
         * When the terrain tab or button is clicked, do its thing
         */
        DOM.elm("terrain-".concat(suffix)).addEventListener('click', function () {
            if (lastUpdated < Layer.TERRAIN && !inProgress)
                disableButtonsAndDo(applyTerrain);
        });
        /**
         * When the history tab or button is clicked, activate its purpose.
         */
        DOM.elm("history-".concat(suffix)).addEventListener('click', function () {
            if (lastUpdated < Layer.HISTORY && !inProgress)
                disableButtonsAndDo(applyHistory);
        });
        /**
         * When the map tab or button is clicked, reveal its true form.
         */
        DOM.elm("map-".concat(suffix)).addEventListener('click', function () {
            if (lastUpdated < Layer.MAP && !inProgress)
                disableButtonsAndDo(applyMap);
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
    if (lastUpdated < Layer.FACTBOOK && !inProgress)
        disableButtonsAndDo(applyFactbook);
});
/**
 * When the download button is clicked, export and download the map as an SVG
 */
DOM.elm('map-download-svg').addEventListener('click', function () {
    var printscaleMap = DOM.elm('map-map').cloneNode(true);
    var _a = __read(printscaleMap.getAttribute("viewBox").split(" "), 4), width = _a[2], height = _a[3];
    printscaleMap.setAttribute("width", "".concat(width, "mm"));
    printscaleMap.setAttribute("height", "".concat(height, "mm"));
    download(convertSVGToBlob(printscaleMap), format(null, "filename") + ".svg");
});
/**
 * When the download button is clicked, export and download the map as a PNG
 */
DOM.elm('map-download-png').addEventListener('click', function () {
    convertSVGToPNGAndThenDownloadIt(convertSVGToBlob(DOM.elm('map-map')), Number.parseInt(DOM.val('map-width-px')), Number.parseInt(DOM.val('map-height-px')), format(null, "filename") + ".png");
});
/**
 * When the print button is clicked, send the factbook to the browser's print window
 */
DOM.elm('factbook-print').addEventListener('click', function () {
    DOM.elm('factbook-embed').contentWindow.print();
});
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
                lastUpdated = Math.min(lastUpdated, layer - 1);
                if (lastUpdated < Layer.PLANET)
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
/**
 * Once the page is ready, start the algorithm!
 */
document.addEventListener("DOMContentLoaded", function () {
    console.log("ready!");
    DOM.elm('map-tab').click();
}); // TODO: warn before leaving page
//# sourceMappingURL=main.js.map