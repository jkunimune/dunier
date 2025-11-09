/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
import { generateFactbook } from "../generation/factsheet.js";
import { Spheroid } from "../generation/surface/spheroid.js";
import { Sphere } from "../generation/surface/sphere.js";
import { Toroid } from "../generation/surface/toroid.js";
import { Disc } from "../generation/surface/disc.js";
import { Random } from "../utilities/random.js";
import { generateTerrain } from "../generation/terrain.js";
import { subdivideLand } from "../generation/subdivideRegion.js";
import { depict } from "../mapping/chart.js";
import { World } from "../generation/world.js";
import { format, localize } from "./internationalization.js";
import { filterSet } from "../utilities/miscellaneus.js";
import { LockedDisc } from "../generation/surface/lockeddisc.js";
import { toXML } from "./virtualdom.js";
var MIN_SIZE_TO_LIST = 6;
var MAX_COUNTRIES_TO_LIST = 10;
var FONT_SIZE = 8; // pt
var Layer;
(function (Layer) {
    Layer[Layer["_"] = 0] = "_";
    Layer[Layer["PLANET"] = 1] = "PLANET";
    Layer[Layer["TERRAIN"] = 2] = "TERRAIN";
    Layer[Layer["HISTORY"] = 3] = "HISTORY";
    Layer[Layer["MAP"] = 4] = "MAP";
    Layer[Layer["FACTBOOK"] = 5] = "FACTBOOK";
})(Layer || (Layer = {}));
/** the planet on which the map is defined */
var surface = null;
/** the list of continents with at least some land */
var continents = null;
/** the human world on that planet */
var world = null;
/** the current main map SVG */
var map = null;
/** the list of countries that are visible on the current map */
var mappedCivs = null;
/** the width of every character in the map font */
var characterWidthMap = null;
/** some SVG assets we should have on hand in case the Chart needs it */
var resources = null;
/** a list of messages that had to be deferred because the Worker wasn't ready yet */
var messageQueue = [];
/** whether we're accepting messages yet */
var ready = false;
// route all messages to generateFantasyMap() unless we're still loading the assets
onmessage = function (message) {
    if (ready)
        generateFantasyMap(message.data);
    else
        messageQueue.push(message);
};
// load the assets
loadSVGResources("windrose", "textures/banyan_0", "textures/banyan_1", "textures/grass_0", "textures/grass_1", "textures/grass_2", "textures/grass_3", "textures/hill_0", "textures/hill_1", "textures/meranti_0", "textures/meranti_1", "textures/monkeypod_0", "textures/monkeypod_1", "textures/monkeypod_2", "textures/monkeypod_3", "textures/mountain_0", "textures/mountain_1", "textures/mountain_2", "textures/mountain_3", "textures/mountain_4", "textures/mountain_5", "textures/mountain_6", "textures/mountain_7", "textures/oak_0", "textures/oak_1", "textures/oak_2", "textures/oak_3", "textures/palm_0", "textures/palm_1", "textures/shrub_0", "textures/shrub_1", "textures/shrub_2", "textures/shrub_3", "textures/spruce_0", "textures/spruce_1", "textures/spruce_2", "textures/spruce_3").then(function () {
    var e_1, _a;
    ready = true;
    console.log("ready!");
    try {
        // when you're done, retroactively deal with any messages we've received and cached
        for (var messageQueue_1 = __values(messageQueue), messageQueue_1_1 = messageQueue_1.next(); !messageQueue_1_1.done; messageQueue_1_1 = messageQueue_1.next()) {
            var message = messageQueue_1_1.value;
            generateFantasyMap(message.data);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (messageQueue_1_1 && !messageQueue_1_1.done && (_a = messageQueue_1.return)) _a.call(messageQueue_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
});
// I don't understand what this block is but it makes the error handling work correctly
self.addEventListener('unhandledrejection', function (event) {
    console.trace(event.reason);
    throw event.reason;
});
/**
 * respond to a message from the GUI thread by generating the requested map
 */
function generateFantasyMap(args) {
    var _a, _b, _c, _d, _e;
    var language;
    var lastUpdated;
    var target;
    var planetType;
    var tidallyLocked;
    var radius;
    var gravity;
    var spinRate;
    var obliquity;
    var terrainSeed;
    var numContinents;
    var seaLevel;
    var temperature;
    var historySeed;
    var cataclysms;
    var year;
    var projectionName;
    var orientation;
    var width;
    var height;
    var selectedFocusOption;
    var colorSchemeName;
    var rivers;
    var borders;
    var landTexture;
    var seaTexture;
    var shading;
    var civLabels;
    var graticule;
    var windrose;
    var style;
    _a = __read(args, 32), language = _a[0], lastUpdated = _a[1], target = _a[2], planetType = _a[3], tidallyLocked = _a[4], radius = _a[5], gravity = _a[6], spinRate = _a[7], obliquity = _a[8], terrainSeed = _a[9], numContinents = _a[10], seaLevel = _a[11], temperature = _a[12], historySeed = _a[13], cataclysms = _a[14], year = _a[15], projectionName = _a[16], orientation = _a[17], width = _a[18], height = _a[19], selectedFocusOption = _a[20], colorSchemeName = _a[21], rivers = _a[22], borders = _a[23], landTexture = _a[24], seaTexture = _a[25], shading = _a[26], civLabels = _a[27], graticule = _a[28], windrose = _a[29], style = _a[30], characterWidthMap = _a[31];
    var terrainMap = null;
    var historyMap = null;
    var focusOptions = null;
    var factbook = null;
    if (target >= Layer.PLANET && lastUpdated < Layer.PLANET)
        surface = applyPlanet(planetType, !tidallyLocked, radius, gravity, spinRate, obliquity);
    if (target >= Layer.TERRAIN && lastUpdated < Layer.TERRAIN)
        _b = __read(applyTerrain(terrainSeed, numContinents, seaLevel, temperature), 2), continents = _b[0], terrainMap = _b[1];
    if (target >= Layer.HISTORY && lastUpdated < Layer.HISTORY) {
        _c = __read(applyHistory(historySeed, cataclysms, year), 2), world = _c[0], historyMap = _c[1];
        _d = __read(listFocusOptions(continents, world, selectedFocusOption, language, style), 2), focusOptions = _d[0], selectedFocusOption = _d[1];
    }
    if (target >= Layer.MAP && lastUpdated < Layer.MAP)
        _e = __read(applyMap(projectionName, orientation, width, height, selectedFocusOption, colorSchemeName, rivers, borders, graticule, windrose, landTexture, seaTexture, shading, civLabels, style), 2), map = _e[0], mappedCivs = _e[1];
    if (target >= Layer.FACTBOOK && lastUpdated < Layer.FACTBOOK)
        factbook = applyFactbook(map, mappedCivs, world.getLects(), year, tidallyLocked, language, style);
    postMessage([
        surface.parameterize(18),
        (terrainMap !== null) ? toXML(terrainMap) : null,
        (historyMap !== null) ? toXML(historyMap) : null,
        (map !== null) ? toXML(map) : null,
        (factbook !== null) ? toXML(factbook) : null,
        focusOptions,
        selectedFocusOption,
    ]);
}
/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 * @param planetType the category of surface, one of ["spheroid", "toroid", or "plane"]
 * @param hasDayNightCycle whether or not the planet is rotating relative to its sun
 * @param radius the radius of the planet at its widest point (km)
 * @param gravity the acceleration due to gravity at the equator (m/s²)
 * @param spinRate the angular velocity of the planet (/s)
 * @param obliquity the angle of this planet's axis with respect to its orbital plane (radians)
 */
function applyPlanet(planetType, hasDayNightCycle, radius, gravity, spinRate, obliquity) {
    console.log("jena planete...");
    // create a surface
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
        throw new Error("What kind of planet is ".concat(planetType));
    }
    surface.initialize();
    console.log("fina!");
    return surface;
}
/**
 * Generate the heightmap and biomes on the planet's surface.
 * @param seed the random seed to use for the generation
 * @param numContinents the number of tectonic plates.  half of them will be continental.
 * @param seaLevel the altitude of the ocean relative to the average plate thickness (km)
 * @param temperature the average temperature on this planet (°C)
 * @return the list of continents, and the rendering of the terrain
 */
function applyTerrain(seed, numContinents, seaLevel, temperature) {
    console.log("Delone tingonfa...");
    var rng = new Random(seed); // use the random seed
    surface.populateWith(surface.randomlySubdivide(rng)); // finish constructing the surface
    console.log("jena zemforme...");
    rng = rng.reset();
    generateTerrain(numContinents, seaLevel, temperature, surface, rng); // create the terrain!
    // break the landmasses up into continents
    var continents = subdivideLand(surface.tiles, 4, 500);
    continents.sort(function (tilesA, tilesB) { return tilesB.size - tilesA.size; });
    console.log("grafa...");
    var projection = (surface.maximumCurvature() === 0) ? "orthographic" : "equal_earth";
    var map = depict(surface, continents, null, projection, surface.tiles, "north", 210, 'physical', resources, characterWidthMap, true, false, true).map;
    console.log("fina!");
    return [continents, map];
}
/**
 * Generate the countries on the planet's surface.
 * @param seed the random seed to use for the generation
 * @param cataclysms the number of apocalypses (/y)
 * @param year the point in history to which to simulate (y)
 */
function applyHistory(seed, cataclysms, year) {
    console.log("jena histore...");
    var world = new World(cataclysms, surface, seed);
    world.generateHistory(year); // create the terrain!
    console.log("grafa...");
    var projection = (surface.maximumCurvature() === 0) ? "orthographic" : "equal_earth";
    var map = depict(surface, null, world, projection, filterSet(surface.tiles, function (t) { return !t.isWater(); }), "north", 210, 'political', resources, characterWidthMap, false, true, false).map;
    console.log("fina!");
    return [world, map];
}
/**
 * enumerate the geographic entities at which we can look
 * @param continents the list of available continents
 * @param world the World containing the available countries
 * @param selectedFocusOption the currently selected option
 * @param language the language in which to localize the option labels
 * @param style the transcription style to use for the proper nouns
 */
function listFocusOptions(continents, world, selectedFocusOption, language, style) {
    var e_2, _a;
    var focusOptions = [];
    // show the whole world
    focusOptions.push({
        value: 'world',
        label: localize("parameter.map.focus.whole_world", language),
    });
    // show a single continent
    for (var i = 0; i < continents.length; i++)
        focusOptions.push({
            value: "continent".concat(i),
            label: format(localize("parameter.map.focus.continent", language), i + 1),
        });
    // or show a single country
    var countries = world.getCivs(true, MIN_SIZE_TO_LIST); // list the biggest countries for the centering selection
    try {
        for (var _b = __values(countries.slice(0, MAX_COUNTRIES_TO_LIST)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var country = _c.value;
            focusOptions.push({
                value: "country".concat(country.id, "-").concat(country.getName().toString('ipa')),
                label: country.getName().toString(style),
            });
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_2) throw e_2.error; }
    }
    // now, if the set of options no longer contains the selected one, set it to the default
    if (!focusOptions.some(function (option) { return selectedFocusOption === option.value; })) {
        if (focusOptions.length > 1)
            selectedFocusOption = focusOptions[1].value;
        else
            selectedFocusOption = focusOptions[0].value;
    }
    return [focusOptions, selectedFocusOption];
}
/**
 * Generate a final formatted map.
 * @param projectionName the type of projection to choose – one of "equal_earth", "bonne", "conformal_conic", "mercator", or "orthographic"
 * @param orientation the cardinal direction that should correspond to up – one of "north", "south", "east", or "west"
 * @param width the approximate desired width of the map (mm)
 * @param height the approximate desired height of the map (mm)
 * @param focusSpecifier a string that specifies what location is being mapped
 * @param colorSchemeName the color scheme
 * @param rivers whether to add rivers
 * @param borders whether to add state borders
 * @param landTexture whether to draw little trees to indicate the biomes
 * @param seaTexture whether to draw horizontal lines by the coast
 * @param shading whether to add shaded relief
 * @param civLabels whether to label countries
 * @param graticule whether to draw a graticule
 * @param windrose whether to add a compass rose
 * @param style the transliteration convention to use for them
 */
function applyMap(projectionName, orientation, width, height, focusSpecifier, colorSchemeName, rivers, borders, graticule, windrose, landTexture, seaTexture, shading, civLabels, style) {
    console.log("grafa zemgrafe...");
    // then interpret it into an actual region
    var regionOfInterest;
    if (focusSpecifier === "world") {
        regionOfInterest = filterSet(surface.tiles, function (t) { return !t.isWater(); });
        if (regionOfInterest.size === 0)
            regionOfInterest = surface.tiles;
    }
    else if (focusSpecifier.startsWith("continent")) {
        var i = Number.parseInt(focusSpecifier.slice(9));
        if (i < continents.length)
            regionOfInterest = continents[i];
        else {
            console.error("invalid continent index: ".concat(i));
            regionOfInterest = surface.tiles;
        }
    }
    else if (focusSpecifier.startsWith("country")) {
        var i = Number.parseInt(focusSpecifier.split("-")[0].slice(7));
        try {
            var civ = world.getCiv(i);
            regionOfInterest = filterSet(civ.tileTree.keys(), function (tile) { return !tile.isWater(); });
        }
        catch (_a) {
            console.error("invalid civ index: ".concat(i));
            regionOfInterest = surface.tiles;
        }
    }
    else
        throw new Error("invalid focusSpecifier: '".concat(focusSpecifier, "'"));
    // now you can construct and call the Chart object
    var _b = depict(surface, continents, world, (surface.maximumCurvature() === 0) ? "orthographic" : projectionName, regionOfInterest, orientation, Math.max(width, height), colorSchemeName, resources, characterWidthMap, rivers, borders, graticule, windrose, landTexture, seaTexture, shading, civLabels, FONT_SIZE * 0.35, // convert to mm
    style), map = _b.map, mappedCivs = _b.mappedCivs;
    console.log("fina!");
    return [map, mappedCivs];
}
/**
 * Generate a nicely typeset document giving all the information about the mapped countries
 * @param map the map being described
 * @param mappedCivs the list of Civs of which to write descriptions
 * @param currentYear today's date
 * @param tidalLock whether the planet is tidally locked (if so that changes the names of the cardinal directions)
 * @param lects the list of languages of which to be aware, from most to least important
 * @param language the language in which to write the factbook
 * @param style the spelling style to use for the proper nouns
 */
function applyFactbook(map, mappedCivs, lects, currentYear, tidalLock, language, style) {
    console.log("jena factbook...");
    var doc = generateFactbook(map, mappedCivs, lects, currentYear, tidalLock, language, style);
    console.log("fina!");
    return doc;
}
/**
 * grab all of the SVG files from the resources folder, fetch them into memory,
 * and wait for them to be loaded.
 */
function loadSVGResources() {
    var filenames = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        filenames[_i] = arguments[_i];
    }
    return __awaiter(this, void 0, void 0, function () {
        var filenames_1, filenames_1_1, filename, response, content, match, innerSVG, e_3_1;
        var e_3, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    resources = new Map();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 7, 8, 9]);
                    filenames_1 = __values(filenames), filenames_1_1 = filenames_1.next();
                    _b.label = 2;
                case 2:
                    if (!!filenames_1_1.done) return [3 /*break*/, 6];
                    filename = filenames_1_1.value;
                    return [4 /*yield*/, fetch("../../resources/".concat(filename, ".svg"))];
                case 3:
                    response = _b.sent();
                    return [4 /*yield*/, response.text()];
                case 4:
                    content = _b.sent();
                    match = content.match(/<\?xml.*\?>\s*<svg[^>]*>\s*(.*)\s*<\/svg>\s*/s);
                    if (match === null) {
                        console.error(content);
                        throw new Error("I tried to load resources/".concat(filename, ".svg but I didn't seem to get a valid SVG."));
                    }
                    innerSVG = match[1];
                    if (innerSVG === null)
                        throw new Error("what's wrong with ../../resources/".concat(filename, ".svg?  I can't read it."));
                    resources.set(filename, innerSVG);
                    _b.label = 5;
                case 5:
                    filenames_1_1 = filenames_1.next();
                    return [3 /*break*/, 2];
                case 6: return [3 /*break*/, 9];
                case 7:
                    e_3_1 = _b.sent();
                    e_3 = { error: e_3_1 };
                    return [3 /*break*/, 9];
                case 8:
                    try {
                        if (filenames_1_1 && !filenames_1_1.done && (_a = filenames_1.return)) _a.call(filenames_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=mapgenerator.js.map