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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
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
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { EmptySpace, outline, Vertex } from "../generation/surface/surface.js";
import { filterSet, findRoot, localizeInRange, pathToString, } from "../utilities/miscellaneus.js";
import { MapProjection } from "./projection.js";
import { Civ } from "../generation/civ.js";
import { ErodingSegmentTree } from "../utilities/erodingsegmenttree.js";
import { assert_φλ, endpoint } from "../utilities/coordinates.js";
import { Vector } from "../utilities/geometry.js";
import { Biome, BIOME_NAMES } from "../generation/terrain.js";
import { applyProjectionToPath, calculatePathBounds, contains, convertPathClosuresToZ, Domain, getAllCombCrossings, INFINITE_PLANE, intersection, polygonize, rectangle, removeLoosePoints, reversePath, rotatePath, Rule, scalePath, transformInput, } from "./pathutilities.js";
import { chooseLabelLocation } from "./labeling.js";
import { cloneNode, h } from "../gui/virtualdom.js";
import { poissonDiscSample } from "../utilities/poissondisc.js";
import { Random } from "../utilities/random.js";
import { offset } from "../utilities/offset.js";
import TEXTURE_MIXES from "../../resources/texture_mixes.js";
// DEBUG OPTIONS
var DISABLE_GREEBLING = false; // make all lines as simple as possible
var SMOOTH_RIVERS = false; // make rivers out of bezier curves so there's no sharp corners
var SHOW_TILE_INDICES = false; // label each tile with its number
var SHOW_STRAIGHT_SKELETONS = false; // draw the straight skeleton of every tile
var COLOR_BY_PLATE = false; // choropleth the land by plate index rather than whatever else
var COLOR_BY_SUBPLATE = false; // choropleth the land by plate index rather than whatever else
var COLOR_BY_CONTINENT = false; // choropleth the land by continent index rather than whatever else
var COLOR_BY_CULTURE = false; // base the political borders off of cultures instead of civs
var COLOR_BY_TILE = false; // color each tile a different color
var COLOR_BY_TEMPERATURE = false; // color each tile based on its mean annual temperature
var COLOR_BY_RAINFALL = false; // color each tile based on its mean annual rainfall
var SHOW_SEA_BORDERS = false; // include ocean territory in each country's border
var SHOW_TECH_LEVEL = false; // caption each country with its current technology level
var SHOW_LABEL_PATHS = false; // instead of placing labels, just stroke the path where the label would have gone
var SHOW_BACKGROUND = false; // have a big red rectangle under the map
// OTHER FIXED DISPLAY OPTIONS
var GREEBLE_SCALE = 3.; // the smallest edge lengths to show (mm)
var SUN_ELEVATION = 45 / 180 * Math.PI;
var AMBIENT_LIGHT = 0.2;
var RIVER_DISPLAY_FACTOR = 500; // the average scaled watershed area needed to display a river (mm²)
var BORDER_SPECIFY_THRESHOLD = 0.3; // the population density at which borders must be rigorusly defined
var MAP_PRECISION = 10; // max segment length in mm
var GRATICULE_SPACING = 30; // typical spacing between lines of latitude or longitude in mm
var HILL_HEIGHT = 1.5; // the altitude at which terrain becomes hilly (km)
var MOUNTAIN_HEIGHT = 3.0; // the altitude at which terrain becomes mountainous (km)
/** color scheme presets */
var COLOR_SCHEMES = new Map([
    ['debug', {
            primaryStroke: '#302d28',
            waterStroke: '#302d28',
            secondaryStroke: '#5a554c',
            waterFill: 'none',
            landFill: '#faf2e4',
            iceFill: 'none',
        }],
    ['white', {
            primaryStroke: '#302d28',
            waterStroke: '#302d28',
            secondaryStroke: '#5a554c',
            waterFill: '#FFFFFF',
            landFill: '#FFFFFF',
            iceFill: 'none',
        }],
    ['gray', {
            primaryStroke: '#302d28',
            waterStroke: '#4c473f',
            secondaryStroke: '#5a554c',
            waterFill: '#d4cdbf',
            landFill: '#faf2e4',
            iceFill: 'none',
        }],
    ['black', {
            primaryStroke: '#302d28',
            waterStroke: '#302d28',
            secondaryStroke: '#302d28',
            waterFill: '#302d28',
            landFill: '#faf2e4',
            iceFill: 'none',
        }],
    ['sepia', {
            primaryStroke: '#361907',
            waterStroke: '#361907',
            secondaryStroke: '#896b50',
            waterFill: '#E9CFAA',
            landFill: '#F9E7D0',
            iceFill: 'none',
        }],
    ['wikipedia', {
            primaryStroke: '#4c473f',
            waterStroke: '#5A7ECA',
            secondaryStroke: '#857f77',
            waterFill: '#d6e4ff',
            landFill: '#fff7d9',
            iceFill: 'none',
        }],
    ['political', {
            primaryStroke: '#302d28',
            waterStroke: '#5A7ECA',
            secondaryStroke: '#5a554c',
            waterFill: '#eaf1ff',
            landFill: '#fef6e8',
            iceFill: 'none',
        }],
    ['physical', {
            primaryStroke: '#302d28',
            waterStroke: '#5A7ECA',
            secondaryStroke: '#4c473f',
            waterFill: '#5A7ECA',
            landFill: '#FFFFFF77',
            iceFill: '#FFFFFF',
        }],
    ['heightmap', {
            primaryStroke: '#302d28',
            waterStroke: 'rgb(59, 72, 151)',
            secondaryStroke: '#4c473f',
            waterFill: '#FF00FF',
            landFill: '#FFFFFF77',
            iceFill: 'none',
        }],
]);
/** color scheme for biomes */
var BIOME_COLORS = new Map([
    [Biome.LAKE, '#5A7ECA'],
    [Biome.JUNGLE, '#82C17A'],
    [Biome.FOREST, '#B0C797'],
    [Biome.TAIGA, '#9FE0B0'],
    [Biome.STEAMLAND, '#A1A17E'],
    [Biome.GRASSLAND, '#D9E88A'],
    [Biome.DESERT, '#FCF0B7'],
    [Biome.TUNDRA, '#FFFFFF'],
    [Biome.LAND_ICE, '#FFFFFF'],
    [Biome.SEA_ICE, '#FFFFFF'],
]);
var ORDERED_BIOME_COLORS = [];
for (var biome = 0; biome < BIOME_NAMES.length; biome++) {
    if (BIOME_COLORS.has(biome))
        ORDERED_BIOME_COLORS.push(BIOME_COLORS.get(biome));
    else
        ORDERED_BIOME_COLORS.push("none");
}
/** color scheme for political maps */
var COUNTRY_COLORS = [
    'rgb(234, 184, 198)',
    'rgb(158, 210, 229)',
    'rgb(219, 199, 157)',
    'rgb(212, 192, 233)',
    'rgb(164, 216, 197)',
    'rgb(240, 190, 179)',
    'rgb(201, 211, 166)',
    'rgb(234, 191, 218)',
    'rgb(160, 219, 224)',
    'rgb(236, 200, 167)',
    'rgb(182, 221, 188)',
    'rgb(247, 194, 199)',
    'rgb(222, 212, 167)',
    'rgb(230, 200, 237)',
    'rgb(169, 226, 216)',
    'rgb(249, 202, 181)',
    'rgb(202, 224, 182)',
    'rgb(249, 200, 220)',
    'rgb(240, 213, 174)',
    'rgb(184, 232, 207)',
    'rgb(256, 205, 200)',
    'rgb(224, 226, 180)',
    'rgb(247, 208, 240)',
];
/** spacing between topographic contours */
var ALTITUDE_STEP = 1.0;
/** colormap for above-sea-level elevation */
var ALTITUDE_COLORS = [
    'rgb(114, 184, 91)',
    'rgb(153, 192, 94)',
    'rgb(187, 201, 96)',
    'rgb(215, 210, 122)',
    'rgb(229, 225, 162)',
    'rgb(243, 240, 201)',
];
/** spacing between bathymetric contours */
var DEPTH_STEP = 1.0;
/** coloramp for below-sea-level elevation */
var DEPTH_COLORS = [
    'rgb( 84,  166,  175)',
    'rgb( 53,  137,  175)',
    'rgb( 46,  105,  174)',
    'rgb( 63,  71,  152)',
    'rgb( 51,  50,  92)',
    'rgb( 31,  29,  43)',
];
/** colormap for rainfall */
var RAINFALL_COLORS = [
    '#ffffff',
    '#e5eddb',
    '#c9dcb7',
    '#a5cd9f',
    '#81bf95',
    '#5bb090',
    '#3d9e8e',
    '#288c8b',
    '#167a87',
    '#046782',
    '#02557d',
    '#104075',
    '#19296d',
    '#1f0769',
];
/** colormap for temperature and insolation */
export var TEMPERATURE_COLORS = [
    'rgb(251, 254, 248)',
    'rgb(216, 231, 245)',
    'rgb(164, 215, 237)',
    'rgb(104, 203, 206)',
    'rgb( 68, 185, 156)',
    'rgb( 54, 167, 105)',
    'rgb( 64, 145,  47)',
    'rgb( 92, 116,  11)',
    'rgb(100,  89,   5)',
    'rgb( 99,  62,   1)',
    'rgb( 91,  33,   1)',
    'rgb( 75,   2,   6)',
    'rgb( 41,   4,   5)',
    'rgb(  7,   0,   0)',
];
/** a type of area feature with a particular greebling profile */
var Layer;
(function (Layer) {
    /** geographic regions – greeble everything */
    Layer[Layer["GEO"] = 0] = "GEO";
    /** bioregions – greeble only coasts */
    Layer[Layer["BIO"] = 1] = "BIO";
    /** cultural regions – greeble only coasts and densely populated areas */
    Layer[Layer["KULTUR"] = 2] = "KULTUR";
})(Layer || (Layer = {}));
/**
 * build an object for visualizing geographic information in SVG.
 * @param surface the surface that we're mapping
 * @param continents some sets of tiles that go nicely together (only used for debugging)
 * @param world the world on that surface, if we're mapping human features
 * @param projectionName the type of projection to choose – one of "equal_earth", "bonne", "conformal_conic", "mercator", or "orthographic"
 * @param regionOfInterest the map focus, for the purposes of tailoring the map projection and setting the bounds
 * @param orientationName the cardinal direction that should correspond to up – one of "north", "south", "east", or "west"
 * @param maxDimension the bounding box size in mm
 * @param colorSchemeName the color scheme
 * @param rivers whether to add rivers
 * @param borders whether to add state borders
 * @param landTexture whether to draw little trees to indicate the biomes
 * @param seaTexture whether to draw horizontal lines by the coast
 * @param shading whether to add shaded relief
 * @param civLabels whether to label countries
 * @param graticule whether to draw a graticule
 * @param windrose whether to add a compass rose
 * @param resources any preloaded SVG assets we should have
 * @param characterWidthMap a table containing the width of every possible character, for label length calculation purposes
 * @param fontSize the size of city labels and minimum size of country and biome labels (mm)
 * @param style the transliteration convention to use for them
 * @return the SVG on which everything has been drawn, and the list of Civs that are shown in this map
 */
export function depict(surface, continents, world, projectionName, regionOfInterest, orientationName, maxDimension, colorSchemeName, resources, characterWidthMap, rivers, borders, graticule, windrose, landTexture, seaTexture, shading, civLabels, fontSize, style) {
    var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
    if (rivers === void 0) { rivers = false; }
    if (borders === void 0) { borders = false; }
    if (graticule === void 0) { graticule = false; }
    if (windrose === void 0) { windrose = false; }
    if (landTexture === void 0) { landTexture = false; }
    if (seaTexture === void 0) { seaTexture = false; }
    if (shading === void 0) { shading = false; }
    if (civLabels === void 0) { civLabels = false; }
    if (fontSize === void 0) { fontSize = 3; }
    if (style === void 0) { style = '(default)'; }
    // convert the orientation name into a number of degrees
    var orientation;
    if (orientationName === 'north')
        orientation = 0;
    else if (orientationName === 'south')
        orientation = 180;
    else if (orientationName === 'east')
        orientation = 90;
    else if (orientationName === 'west')
        orientation = 270;
    else
        throw new Error("I don't recognize this direction: '".concat(orientationName, "'."));
    // determine the central coordinates and thus domain of the map projection
    var _e = chooseMapCentering(regionOfInterest, surface), centralMeridian = _e.centralMeridian, centralParallel = _e.centralParallel, meanRadius = _e.meanRadius;
    var southLimitingParallel = Math.max(surface.φMin, centralParallel - Math.PI);
    var northLimitingParallel = Math.min(surface.φMax, southLimitingParallel + 2 * Math.PI);
    // construct the map projection
    var projection;
    var rectangularBounds;
    if (projectionName === 'equal_earth') {
        projection = MapProjection.equalEarth(surface, meanRadius, southLimitingParallel, northLimitingParallel, centralMeridian);
        rectangularBounds = false;
    }
    else if (projectionName === 'bonne') {
        projection = MapProjection.bonne(surface, southLimitingParallel, centralParallel, northLimitingParallel, centralMeridian, 0); // we'll revisit the longitude bounds later so leave them at 0 for now
        rectangularBounds = false;
    }
    else if (projectionName === 'conformal_conic') {
        projection = MapProjection.conformalConic(surface, southLimitingParallel, centralParallel, northLimitingParallel, centralMeridian);
        rectangularBounds = true;
    }
    else if (projectionName === 'mercator') {
        projection = MapProjection.mercator(surface, southLimitingParallel, centralParallel, northLimitingParallel, centralMeridian);
        rectangularBounds = true;
    }
    else if (projectionName === 'orthographic') {
        projection = MapProjection.orthographic(surface, southLimitingParallel, northLimitingParallel, centralMeridian);
        rectangularBounds = true;
    }
    else {
        throw new Error("no jana metode da graflance: '".concat(projectionName, "'."));
    }
    if (rectangularBounds) {
        var newCentralMeridian = adjustMapCentering(regionOfInterest, projection);
        projection = projection.recenter(newCentralMeridian);
    }
    // put the region of interest in the correct coordinate system
    var transformedRegionOfInterest = intersection(transformInput(projection.domain, convertToGreebledPath(outline(regionOfInterest), Layer.GEO, 1e-6)), rectangle(projection.φMax, projection.λMax, projection.φMin, projection.λMin, true), projection.domain, true);
    // establish the geographic bounds of the region
    var _f = chooseGeoBounds(transformedRegionOfInterest, projection, rectangularBounds), φMin = _f.φMin, φMax = _f.φMax, λMin = _f.λMin, λMax = _f.λMax, geoEdges = _f.geoEdges;
    // if it's a Bonne projection, re-generate it with these new bounds in case you need to adjust the curvature
    if (projectionName === 'bonne')
        projection = MapProjection.bonne(surface, φMin, centralParallel, φMax, projection.λCenter, λMax - λMin); // the only thing that changes here is projection.yCenter
    // establish the Cartesian bounds of the map
    var _g = chooseMapBounds(transformedRegionOfInterest, projection, rectangularBounds, geoEdges), xRight = _g.xRight, xLeft = _g.xLeft, yBottom = _g.yBottom, yTop = _g.yTop, mapEdges = _g.mapEdges;
    var rawBbox = new Dimensions(xLeft, xRight, yTop, yBottom);
    // expand the Chart dimensions by a couple millimeters on each side to give the edge some breathing room
    var margin = Math.max(1.2, maxDimension / 50);
    // determine the appropriate scale to make this have the correct area
    var scale = (maxDimension - 2 * margin) / Math.max(rawBbox.width, rawBbox.height); // mm/km
    var transform = new Transform(projection, geoEdges, mapEdges, orientation, scale);
    // adjust the bounding box to account for rotation, scale, and margin
    var bbox = rawBbox.rotate(orientation).scale(scale).offset(margin);
    var colorScheme = COLOR_SCHEMES.get(colorSchemeName);
    if (COLOR_BY_PLATE || COLOR_BY_SUBPLATE || COLOR_BY_CONTINENT || COLOR_BY_TILE || COLOR_BY_TEMPERATURE || COLOR_BY_RAINFALL)
        colorScheme = COLOR_SCHEMES.get('debug');
    var svg = h('svg', {
        viewBox: "".concat(bbox.left.toFixed(3), " ").concat(bbox.top.toFixed(3), " ").concat(bbox.width.toFixed(3), " ").concat(bbox.height.toFixed(3)),
    });
    // set the basic overarching styles
    var styleSheet = h('style');
    styleSheet.textContent =
        '.label {\n' +
            '  font-family: "Noto Serif","Times New Roman","Times",serif;\n' +
            '  text-anchor: middle;\n' +
            '  fill: black;\n' +
            '}\n' +
            '.halo {\n' +
            "  fill: none;\n" +
            '  stroke-width: 1.4;\n' +
            '  stroke-miterlimit: 2;\n' +
            '  opacity: 0.7;\n' +
            '}\n';
    svg.children.push(styleSheet);
    var defs = h('defs');
    svg.children.push(defs);
    if (SHOW_BACKGROUND) {
        var rectangle_1 = h('rect', {
            x: bbox.left.toFixed(3),
            y: bbox.top.toFixed(3),
            width: bbox.width.toFixed(3),
            height: bbox.height.toFixed(3),
            style: 'fill: red; stroke: black; stroke-width: 10px',
        });
        svg.children.push(rectangle_1);
    }
    var lineFeatures = [];
    var areaFeatures = [];
    var politicalColorMap = new Map();
    politicalColorMap.set(0, colorScheme.landFill);
    // color in the land
    if (COLOR_BY_PLATE) {
        areaFeatures.push.apply(areaFeatures, __spreadArray([], __read(fillChoropleth(surface.tiles, function (n) { return n.plateIndex; }, 1, COUNTRY_COLORS, transform, createSVGGroup(svg, "plates"), Layer.GEO)), false));
    }
    else if (COLOR_BY_SUBPLATE) {
        areaFeatures.push.apply(areaFeatures, __spreadArray([], __read(fillChoropleth(surface.tiles, function (n) { return n.subplateIndex; }, 1, COUNTRY_COLORS, transform, createSVGGroup(svg, "subplates"), Layer.GEO)), false));
    }
    else if (COLOR_BY_CONTINENT && continents !== null) {
        areaFeatures.push.apply(areaFeatures, __spreadArray([], __read(fillMultiple(continents, COUNTRY_COLORS, surface.tiles, colorScheme.landFill, transform, createSVGGroup(svg, "continents"), Layer.GEO)), false));
    }
    else if (COLOR_BY_TILE) {
        areaFeatures.push.apply(areaFeatures, __spreadArray([], __read(fillMultiple(__spreadArray([], __read(surface.tiles), false).map(function (tile) { return new Set([tile]); }), COUNTRY_COLORS, null, null, transform, createSVGGroup(svg, "tiles"), Layer.GEO, colorScheme.waterStroke, 0.2)), false));
    }
    else if (COLOR_BY_CULTURE && world !== null) {
        areaFeatures.push.apply(areaFeatures, __spreadArray([], __read(fillMultiple(world.getCultures(true).map(function (culture) { return culture.tiles; }), COUNTRY_COLORS, surface.tiles, colorScheme.landFill, transform, createSVGGroup(svg, "cultures"), Layer.KULTUR, colorScheme.primaryStroke, 0.4)), false));
    }
    else if (COLOR_BY_TEMPERATURE) {
        areaFeatures.push.apply(areaFeatures, __spreadArray([], __read(fillChoropleth(surface.tiles, function (n) { return n.temperature; }, 6, TEMPERATURE_COLORS, transform, createSVGGroup(svg, "choropleth"), Layer.GEO, -35)), false));
    }
    else if (COLOR_BY_RAINFALL) {
        areaFeatures.push.apply(areaFeatures, __spreadArray([], __read(fillChoropleth(surface.tiles, function (n) { return n.rainfall; }, 0.25, RAINFALL_COLORS, transform, createSVGGroup(svg, "choropleth"), Layer.GEO)), false));
    }
    else if (colorSchemeName === 'physical') {
        // color the land by biome
        areaFeatures.push.apply(areaFeatures, __spreadArray([], __read(fillChoropleth(surface.tiles, function (n) { return n.biome; }, 1, ORDERED_BIOME_COLORS, transform, createSVGGroup(svg, "biomes"), Layer.BIO)), false));
    }
    else if (colorSchemeName === 'political') {
        // color the land by country
        if (world === null)
            throw new Error("this Chart was asked to color land politicly but the provided World was null");
        var biggestCivs = world.getCivs(true);
        biggestCivs = biggestCivs.filter(// skip really small countries
        function (// skip really small countries
        civ) { return civ.getTiles().size > 1 || civ.getPopulation() / civ.getTotalArea() >= BORDER_SPECIFY_THRESHOLD; });
        var biggestCivExtents = [];
        try {
            for (var biggestCivs_1 = __values(biggestCivs), biggestCivs_1_1 = biggestCivs_1.next(); !biggestCivs_1_1.done; biggestCivs_1_1 = biggestCivs_1.next()) {
                var civ = biggestCivs_1_1.value;
                biggestCivExtents.push(filterSet(civ.getTiles(), function (n) { return !n.isWater(); }));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (biggestCivs_1_1 && !biggestCivs_1_1.done && (_a = biggestCivs_1.return)) _a.call(biggestCivs_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var drawnCivs = fillMultiple(biggestCivExtents, COUNTRY_COLORS, surface.tiles, colorScheme.landFill, transform, createSVGGroup(svg, "countries"), Layer.KULTUR);
        areaFeatures.push.apply(areaFeatures, __spreadArray([], __read(drawnCivs), false));
        try {
            for (var drawnCivs_1 = __values(drawnCivs), drawnCivs_1_1 = drawnCivs_1.next(); !drawnCivs_1_1.done; drawnCivs_1_1 = drawnCivs_1.next()) {
                var _h = drawnCivs_1_1.value, index = _h.index, color = _h.color;
                politicalColorMap.set(biggestCivs[index].id, color);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (drawnCivs_1_1 && !drawnCivs_1_1.done && (_b = drawnCivs_1.return)) _b.call(drawnCivs_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    else if (colorSchemeName === 'heightmap') {
        // color the land by altitude
        areaFeatures.push.apply(areaFeatures, __spreadArray([], __read(fillChoropleth(filterSet(surface.tiles, function (n) { return !n.isWater(); }), function (n) { return n.height; }, ALTITUDE_STEP, ALTITUDE_COLORS, transform, createSVGGroup(svg, "land-contours"), Layer.GEO)), false));
    }
    else {
        // color in the land with a uniform color
        fill(surface.tiles, transform, svg, colorScheme.landFill, Layer.BIO);
    }
    // add rivers
    if (rivers) {
        lineFeatures.push(drawRivers(surface.rivers, RIVER_DISPLAY_FACTOR / Math.pow(scale, 2), transform, svg, colorScheme.waterStroke, 0.8, Layer.GEO));
    }
    // also color in sea-ice if desired
    if (colorScheme.iceFill !== 'none') {
        fill(filterSet(surface.tiles, function (n) { return n.isIceCovered(); }), transform, svg, colorScheme.iceFill, Layer.BIO);
    }
    // add borders
    if (borders) {
        if (world === null)
            throw new Error("this Chart was asked to draw political borders but the provided World was null");
        lineFeatures.push.apply(lineFeatures, __spreadArray([], __read(drawBorders(world.getCivs(), transform, createSVGGroup(svg, "borders"), colorScheme.primaryStroke, 0.4)), false));
    }
    // add relief shadows
    if (shading) {
        shade(surface.vertices, transform, createSVGGroup(svg, "shading"));
    }
    // color in the sea
    var sea;
    if (colorScheme.iceFill === 'none')
        sea = filterSet(surface.tiles, function (n) { return n.isWater(); });
    else
        sea = filterSet(surface.tiles, function (n) { return n.isWater() && !n.isIceCovered(); });
    if (colorSchemeName === 'heightmap') {
        // color in the sea by altitude
        areaFeatures.push.apply(areaFeatures, __spreadArray([], __read(fillChoropleth(sea, function (n) { return -n.height; }, DEPTH_STEP, DEPTH_COLORS, transform, createSVGGroup(svg, "sea-contours"), Layer.GEO)), false)); // TODO: enforce contiguity of shallow ocean?
        fill(sea, transform, svg, "none", Layer.GEO, colorScheme.waterStroke, 0.4);
    }
    else {
        // color in the sea with a uniform color
        fill(sea, transform, svg, colorScheme.waterFill, Layer.GEO, colorScheme.waterStroke, 0.4);
    }
    // add some horizontal hatching around the coast
    if (seaTexture) {
        hatchCoast(filterSet(surface.tiles, function (t) { return !sea.has(t); }), transform, createSVGGroup(svg, "sea-texture"), (colorScheme.waterStroke !== colorScheme.waterFill) ?
            colorScheme.waterStroke : colorScheme.secondaryStroke, 0.2, 1.0, 3.0);
    }
    // add some terrain elements for texture
    if (landTexture) {
        drawTexture(surface.tiles, lineFeatures, areaFeatures, transform, createSVGGroup(svg, "land-texture"), defs, colorScheme.landFill, colorScheme.secondaryStroke, 0.3, resources);
    }
    if (borders && SHOW_SEA_BORDERS && world !== null) {
        lineFeatures.push.apply(lineFeatures, __spreadArray([], __read(drawBorders(world.getCivs(), transform, createSVGGroup(svg, "borders"), colorScheme.primaryStroke, 0.4, true)), false));
    }
    // add the graticule
    if (graticule) {
        drawGraticule(surface, { φMin: φMin, φMax: φMax, λMin: λMin, λMax: λMax }, transform, createSVGGroup(svg, "graticule"), colorScheme.primaryStroke, 0.2);
    }
    // label everything
    if (civLabels) {
        if (world === null)
            throw new Error("this Chart was asked to label countries but the provided World was null");
        if (COLOR_BY_CULTURE)
            placeLabels(world.getCultures(), style, null, transform, createSVGGroup(svg, "labels"), fontSize, 3 * fontSize, characterWidthMap);
        else
            placeLabels(world.getCivs(), style, (landTexture) ? politicalColorMap : null, transform, createSVGGroup(svg, "labels"), fontSize, 3 * fontSize, characterWidthMap);
    }
    if (SHOW_STRAIGHT_SKELETONS) {
        drawStraightSkeletons(surface, transform, createSVGGroup(svg, "spooky_scary_skeletons"));
    }
    if (SHOW_TILE_INDICES) {
        placeTileLabels(surface.tiles, transform, createSVGGroup(svg, "indices"));
    }
    // add a margin and outline to the whole thing
    drawOuterBorder(bbox, transform, svg, "white", "black", 0.8);
    // add the windrose
    if (windrose) {
        placeWindrose(bbox.offset(-margin), resources.get("windrose"), createSVGGroup(svg, "compass-rose"));
    }
    var visible;
    if (world !== null) {
        // finally, check which Civs are on this map
        // (this is somewhat inefficient, since it probably already calculated this, but it's pretty quick, so I think it's fine)
        visible = [];
        try {
            for (var _j = __values(world.getCivs(true)), _k = _j.next(); !_k.done; _k = _j.next()) {
                var civ = _k.value;
                if (transformedOutline(filterSet(civ.getTiles(), function (n) { return !n.isWater(); }), Layer.KULTUR, transform).length > 0)
                    visible.push(civ);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
            }
            finally { if (e_3) throw e_3.error; }
        }
    }
    else {
        visible = null;
    }
    // log some info for the debug modes
    if (SHOW_TECH_LEVEL && world !== null) {
        var maxTechnology = 0;
        try {
            for (var _l = __values(world.getCivs()), _m = _l.next(); !_m.done; _m = _l.next()) {
                var civ = _m.value;
                if (civ.technology > maxTechnology)
                    maxTechnology = civ.technology;
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
            }
            finally { if (e_4) throw e_4.error; }
        }
        console.log("the most advanced civ in the world has tech equivalent to ".concat((Math.log(maxTechnology) * 1400 - 3000)));
    }
    return { map: svg, mappedCivs: visible };
}
/**
 * fill multiple regions with colors from a list.  when it runs out of colors it will stop filling in regions.
 * regions that don't appear on the map will be skipped, so it won't do that unless every color appears on the map.
 * @param regions the regions to fill
 * @param colors the colors to use
 * @param tiles the total tileset to fill in with a background color
 * @param baseColor the background color to use for anything in the tileset that isn't part of a colored region
 *                  (if this isn't passed it will loop colors to try to make sure everything is part of a colored region)
 * @param transform the projection, extent, scale, and orientation information
 * @param svg object on which to put the Paths
 * @param greeble what kind of edge it is for the purposes of greebling
 * @param strokeColor color of the outlines
 * @param strokeWidth the width of the outline to put around each one
 */
function fillMultiple(regions, colors, tiles, baseColor, transform, svg, greeble, strokeColor, strokeWidth) {
    if (strokeColor === void 0) { strokeColor = "none"; }
    if (strokeWidth === void 0) { strokeWidth = 0; }
    if (baseColor !== null)
        fill(tiles, transform, svg, baseColor, greeble);
    var features = [];
    var colorIndex = 0;
    for (var regionIndex = 0; regionIndex < regions.length; regionIndex++) {
        var path = fill(regions[regionIndex], transform, svg, colors[colorIndex], greeble, strokeColor, strokeWidth);
        if (path.length === 0)
            continue;
        else {
            features.push({ path: path, color: colors[colorIndex], index: regionIndex });
            colorIndex++;
            if (colorIndex >= colors.length) {
                if (baseColor === null)
                    colorIndex = 0;
                else
                    break;
            }
        }
    }
    return features;
}
/**
 * fill multiple a bunch of tiles according to some numeric evaluation of them.
 * contours will be filled with a given z-spacing, and colors will be drawn from a colormap.
 * the number should generally be positive; any negative numbers will be lumped into the lowest bin, just as numbers
 * bigger than colors.length*binSize will be lumped into the highest bin.
 * @param tiles the tiles to color in
 * @param valuator the function that is used to determine in which bin each tile goes
 * @param binSize the size of each interval to color together
 * @param binOffset the minimum value of the lowest bin
 * @param colors the color for each value bin
 * @param transform the projection, extent, scale, and orientation information
 * @param svg object on which to put the Paths
 * @param greeble what kind of edge it is for the purposes of greebling
 */
function fillChoropleth(tiles, valuator, binSize, colors, transform, svg, greeble, binOffset) {
    if (binOffset === void 0) { binOffset = 0; }
    var contours = [];
    var _loop_1 = function (i) {
        if (colors[i] === "none")
            return "continue";
        var min = (i !== 0) ? binOffset + i * binSize : -Infinity;
        var max = (i !== colors.length - 1) ? binOffset + (i + 1) * binSize : Infinity;
        var path = fill(filterSet(tiles, function (n) { return valuator(n) >= min && valuator(n) < max; }), transform, svg, colors[i], greeble);
        contours.push({ path: path, color: colors[i] });
    };
    for (var i = 0; i < colors.length; i++) {
        _loop_1(i);
    }
    return contours;
}
/**
 * draw a region of the world on the map with the given color.
 * @param tiles Iterator of Tiles to be colored in.
 * @param transform the projection, extent, scale, and orientation information
 * @param svg object on which to put the Path.
 * @param color color of the interior.
 * @param greeble what kind of edge it is for the purposes of greebling
 * @param stroke color of the outline.
 * @param strokeWidth the width of the outline to put around it (will match fill color).
 * @param strokeLinejoin the line joint style to use
 * @return the path object associated with this <path>
 */
function fill(tiles, transform, svg, color, greeble, stroke, strokeWidth, strokeLinejoin) {
    if (stroke === void 0) { stroke = 'none'; }
    if (strokeWidth === void 0) { strokeWidth = 0; }
    if (strokeLinejoin === void 0) { strokeLinejoin = 'round'; }
    if (tiles.size <= 0)
        return [];
    var segments = transformedOutline(tiles, greeble, transform);
    var path = draw(convertPathClosuresToZ(segments), svg);
    path.attributes.style =
        "fill: ".concat(color, "; stroke: ").concat(stroke, "; stroke-width: ").concat(strokeWidth, "; stroke-linejoin: ").concat(strokeLinejoin, ";");
    return segments;
}
/**
 * draw a series of lines on the map with the giver color.
 * @param rivers the Iterable of lists of points to connect and draw.
 * @param riverDisplayThreshold the flow rate above which a river segment must be to be shown
 * @param transform the projection, extent, scale, and orientation information
 * @param svg SVG object on which to put the Path.
 * @param color String that HTML can interpret as a color.
 * @param width the width of the stroke
 * @param greeble what kind of edge it is for the purposes of greebling
 * @returns the newly created element comprising all these lines
 */
function drawRivers(rivers, riverDisplayThreshold, transform, svg, color, width, greeble) {
    var strokes = __spreadArray([], __read(rivers), false).filter(function (ud) { return ud[0].flow >= riverDisplayThreshold; });
    var segments = transformPath(convertToGreebledPath(aggregate(strokes), greeble, transform.scale), transform, false);
    if (SMOOTH_RIVERS)
        segments = smooth(segments);
    var path = draw(segments, svg);
    path.attributes.style =
        "fill: none; stroke: ".concat(color, "; stroke-width: ").concat(width, "; stroke-linejoin: round; stroke-linecap: round;");
    return segments;
}
/**
 *
 * @param civs
 * @param transform the projection, extent, scale, and orientation information
 * @param svg SVG object on which to put the Paths
 * @param color the color of the borderlines
 * @param width the line width
 * @param includeSea whether to include sea borders as well
 */
function drawBorders(civs, transform, svg, color, width, includeSea) {
    var e_5, _a;
    if (includeSea === void 0) { includeSea = false; }
    var lineFeatures = [];
    try {
        for (var civs_1 = __values(civs), civs_1_1 = civs_1.next(); !civs_1_1.done; civs_1_1 = civs_1.next()) {
            var civ = civs_1_1.value;
            if (civ.getTiles().size === 1 && civ.getPopulation() / civ.getTotalArea() < BORDER_SPECIFY_THRESHOLD)
                continue; // skip really small countries
            var tiles = civ.getTiles();
            if (!includeSea)
                tiles = filterSet(tiles, function (n) { return !n.isWater(); });
            var line = fill(tiles, transform, svg, 'none', Layer.KULTUR, color, width);
            if (line.length > 0)
                lineFeatures.push(line);
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (civs_1_1 && !civs_1_1.done && (_a = civs_1.return)) _a.call(civs_1);
        }
        finally { if (e_5) throw e_5.error; }
    }
    return lineFeatures;
}
/**
 * shade in the area around a polygon with horizontal lines
 * @param land the region to outline in hatch
 * @param transform the projection, extent, scale, and orientation information
 * @param svg the SVG object on which to put the lines
 * @param color the color of the lines
 * @param width the thickness of the lines
 * @param spacing distance between adjacent lines in the pattern
 * @param radius the distance from the shape to draw horizontal lines
 */
function hatchCoast(land, transform, svg, color, width, spacing, radius) {
    var e_6, _a, e_7, _b, e_8, _c;
    // instantiate a random number generator for feathering the edges
    var rng = new Random(0);
    var shape = transformedOutline(land, Layer.GEO, transform);
    // calculate the outer envelope of the lines
    var dilatedShape = offset(shape, radius);
    // establish the y coordinates of the lines
    var boundingBox = calculatePathBounds(dilatedShape);
    var yMed = (boundingBox.tMin + boundingBox.tMax) / 2;
    var numLines = Math.floor((boundingBox.tMax - boundingBox.tMin) / spacing / 2) * 2 + 1;
    var yMin = yMed - spacing * (numLines - 1) / 2;
    // find everywhere one of the lines crosses either polygon
    var intersections = [];
    for (var j = 0; j < numLines; j++)
        intersections.push([]);
    try {
        for (var _d = __values(getAllCombCrossings(shape, yMin, spacing, INFINITE_PLANE)), _e = _d.next(); !_e.done; _e = _d.next()) {
            var _f = _e.value, s = _f.s, lineIndex = _f.lineIndex, goingEast = _f.goingEast;
            intersections[lineIndex].push({ x: s, downward: goingEast, trueCoast: true });
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
        }
        finally { if (e_6) throw e_6.error; }
    }
    try {
        for (var _g = __values(getAllCombCrossings(dilatedShape, yMin, spacing, INFINITE_PLANE)), _h = _g.next(); !_h.done; _h = _g.next()) {
            var _j = _h.value, s = _j.s, lineIndex = _j.lineIndex, goingEast = _j.goingEast;
            intersections[lineIndex].push({ x: s, downward: goingEast, trueCoast: false });
        }
    }
    catch (e_7_1) { e_7 = { error: e_7_1 }; }
    finally {
        try {
            if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
        }
        finally { if (e_7) throw e_7.error; }
    }
    // select the ones that should be the endpoints of line segments
    var endpoints = [];
    for (var j = 0; j < numLines; j++) {
        endpoints.push([]);
        intersections[j] = intersections[j].sort(function (a, b) { return a.x - b.x; });
        var falseWraps = 0;
        var trueWraps = 0;
        try {
            for (var _k = (e_8 = void 0, __values(intersections[j])), _l = _k.next(); !_l.done; _l = _k.next()) {
                var intersection_1 = _l.value;
                if (intersection_1.trueCoast) {
                    if (intersection_1.downward)
                        trueWraps += 1;
                    else
                        trueWraps -= 1;
                    endpoints[j].push(intersection_1.x);
                }
                else {
                    if (intersection_1.downward) {
                        if (falseWraps === 0 && trueWraps === 0)
                            endpoints[j].push(rng.normal(intersection_1.x, spacing / 2));
                        falseWraps += 1;
                    }
                    else {
                        falseWraps -= 1;
                        if (falseWraps === 0 && trueWraps === 0)
                            endpoints[j].push(rng.normal(intersection_1.x, spacing / 2));
                    }
                }
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_l && !_l.done && (_c = _k.return)) _c.call(_k);
            }
            finally { if (e_8) throw e_8.error; }
        }
        if (endpoints[j].length % 2 !== 0) {
            console.error("something went wrong in the hatching; these should always be even.");
            endpoints[j] = [];
        }
    }
    // finally, draw the lines
    for (var j = 0; j < numLines; j++) {
        for (var k = 0; k < endpoints[j].length; k += 2) {
            var x1 = endpoints[j][k];
            var x2 = endpoints[j][k + 1];
            var y = yMin + j * spacing;
            draw([{ type: 'M', args: [x1, y] }, { type: 'H', args: [x2] }], svg);
        }
    }
    svg.attributes.style =
        "fill:none; stroke:".concat(color, "; stroke-width:").concat(width, "; stroke-linecap:round");
}
/**
 * describe a bunch of random symbols to put on the map to indicate biome and elevation
 * @param tiles the tiles being textured
 * @param lineFeatures any lines on the map to avoid
 * @param areaFeatures any regions on the map whose color we might have to match
 * @param transform the projection, extent, scale, and orientation information
 * @param svg SVG object on which to put the drawings
 * @param defs a separate SVG object in which to put references
 * @param fillColor the fill color to give each picture by default
 * @param strokeColor the color for the lines
 * @param strokeWidth the thickness of the lines
 * @param resources a map containing all of the predrawn pictures to use for the texture
 */
function drawTexture(tiles, lineFeatures, areaFeatures, transform, svg, defs, fillColor, strokeColor, strokeWidth, resources) {
    var e_9, _a, e_10, _b, e_11, _c, e_12, _d, e_13, _e, e_14, _f, e_15, _g;
    var textureMixLookup = new Map();
    try {
        for (var TEXTURE_MIXES_1 = __values(TEXTURE_MIXES), TEXTURE_MIXES_1_1 = TEXTURE_MIXES_1.next(); !TEXTURE_MIXES_1_1.done; TEXTURE_MIXES_1_1 = TEXTURE_MIXES_1.next()) {
            var _h = TEXTURE_MIXES_1_1.value, name_1 = _h.name, components = _h.components;
            textureMixLookup.set(name_1, components);
        }
    }
    catch (e_9_1) { e_9 = { error: e_9_1 }; }
    finally {
        try {
            if (TEXTURE_MIXES_1_1 && !TEXTURE_MIXES_1_1.done && (_a = TEXTURE_MIXES_1.return)) _a.call(TEXTURE_MIXES_1);
        }
        finally { if (e_9) throw e_9.error; }
    }
    // get the hill texture
    var hillComponents = textureMixLookup.get("hill");
    var hillCoverage = 0;
    try {
        for (var hillComponents_1 = __values(hillComponents), hillComponents_1_1 = hillComponents_1.next(); !hillComponents_1_1.done; hillComponents_1_1 = hillComponents_1.next()) {
            var rock = hillComponents_1_1.value;
            hillCoverage += rock.density * Math.pow(rock.diameter, 2);
        }
    }
    catch (e_10_1) { e_10 = { error: e_10_1 }; }
    finally {
        try {
            if (hillComponents_1_1 && !hillComponents_1_1.done && (_b = hillComponents_1.return)) _b.call(hillComponents_1);
        }
        finally { if (e_10) throw e_10.error; }
    }
    var textureRegions = [];
    var _loop_2 = function (biome) {
        var e_16, _l, e_17, _m;
        if (!textureMixLookup.has(BIOME_NAMES[biome]))
            return "continue";
        var region = filterSet(tiles, function (t) { return t.biome === biome; });
        // get the plant texture
        var plantComponents = textureMixLookup.has(BIOME_NAMES[biome]) ?
            textureMixLookup.get(BIOME_NAMES[biome]) : [];
        var plantCoverage = 0;
        try {
            for (var plantComponents_1 = (e_16 = void 0, __values(plantComponents)), plantComponents_1_1 = plantComponents_1.next(); !plantComponents_1_1.done; plantComponents_1_1 = plantComponents_1.next()) {
                var plant = plantComponents_1_1.value;
                plantCoverage += plant.density * Math.pow(plant.diameter, 2);
            }
        }
        catch (e_16_1) { e_16 = { error: e_16_1 }; }
        finally {
            try {
                if (plantComponents_1_1 && !plantComponents_1_1.done && (_l = plantComponents_1.return)) _l.call(plantComponents_1);
            }
            finally { if (e_16) throw e_16.error; }
        }
        // fill the lowlands of that biome with the appropriate flora
        textureRegions.push({
            region: filterSet(region, function (t) { return t.height < HILL_HEIGHT; }),
            components: plantComponents,
        });
        // fill the highlands of that biome with the appropriate flora plus hills
        var totalCoverage = Math.max(plantCoverage, hillCoverage);
        var plantFactor = (totalCoverage - hillCoverage) / plantCoverage;
        var components = hillComponents.slice();
        try {
            for (var plantComponents_2 = (e_17 = void 0, __values(plantComponents)), plantComponents_2_1 = plantComponents_2.next(); !plantComponents_2_1.done; plantComponents_2_1 = plantComponents_2.next()) {
                var _o = plantComponents_2_1.value, name_2 = _o.name, diameter = _o.diameter, density = _o.density;
                components.push({ name: name_2, diameter: diameter, density: density * plantFactor });
            }
        }
        catch (e_17_1) { e_17 = { error: e_17_1 }; }
        finally {
            try {
                if (plantComponents_2_1 && !plantComponents_2_1.done && (_m = plantComponents_2.return)) _m.call(plantComponents_2);
            }
            finally { if (e_17) throw e_17.error; }
        }
        textureRegions.push({
            region: filterSet(region, function (t) { return t.height >= HILL_HEIGHT && t.height < MOUNTAIN_HEIGHT; }),
            components: components,
        });
    };
    // for each non-aquatic biome
    for (var biome = 0; biome < BIOME_NAMES.length; biome++) {
        _loop_2(biome);
    }
    // also fill the mountainous regions of the world with mountains
    textureRegions.push({
        region: filterSet(tiles, function (t) { return t.height >= MOUNTAIN_HEIGHT && !t.isWater(); }),
        components: textureMixLookup.get("mountain"),
    });
    var rng = new Random(0);
    var symbols = [];
    var _loop_3 = function (region, components) {
        var e_18, _p;
        var polygon = transformedOutline(region, Layer.BIO, transform);
        if (polygon.length > 0) {
            // choose the locations (remember to scale vertically since we're looking down at a 45° angle)
            var sinθ_1 = Math.sqrt(1 / 2);
            var scaledPolygon = scalePath(polygonize(polygon), 1, 1 / sinθ_1);
            var scaledLineFeatures = lineFeatures.map(function (line) { return scalePath(polygonize(line), 1, 1 / sinθ_1); });
            var scaledLocations = poissonDiscSample(scaledPolygon, scaledLineFeatures, components, rng);
            var locations = scaledLocations.map(function (_a) {
                var x = _a.x, y = _a.y, type = _a.type;
                return ({ x: x, y: y * sinθ_1, type: type });
            });
            try {
                // and then divvy those locations up among the different components of the texture
                for (var locations_1 = (e_18 = void 0, __values(locations)), locations_1_1 = locations_1.next(); !locations_1_1.done; locations_1_1 = locations_1.next()) {
                    var _q = locations_1_1.value, x = _q.x, y = _q.y, type = _q.type;
                    symbols.push({ x: x, y: y, name: components[type].name, flipped: rng.probability(1 / 2) });
                }
            }
            catch (e_18_1) { e_18 = { error: e_18_1 }; }
            finally {
                try {
                    if (locations_1_1 && !locations_1_1.done && (_p = locations_1.return)) _p.call(locations_1);
                }
                finally { if (e_18) throw e_18.error; }
            }
        }
    };
    try {
        // for each texture region you identified
        for (var textureRegions_1 = __values(textureRegions), textureRegions_1_1 = textureRegions_1.next(); !textureRegions_1_1.done; textureRegions_1_1 = textureRegions_1.next()) {
            var _j = textureRegions_1_1.value, region = _j.region, components = _j.components;
            _loop_3(region, components);
        }
    }
    catch (e_11_1) { e_11 = { error: e_11_1 }; }
    finally {
        try {
            if (textureRegions_1_1 && !textureRegions_1_1.done && (_c = textureRegions_1.return)) _c.call(textureRegions_1);
        }
        finally { if (e_11) throw e_11.error; }
    }
    // make sure zorder is based on y
    symbols.sort(function (a, b) { return a.y - b.y; });
    var textureNames = new Set();
    try {
        for (var symbols_1 = __values(symbols), symbols_1_1 = symbols_1.next(); !symbols_1_1.done; symbols_1_1 = symbols_1.next()) {
            var symbol = symbols_1_1.value;
            textureNames.add(symbol.name);
        }
    }
    catch (e_12_1) { e_12 = { error: e_12_1 }; }
    finally {
        try {
            if (symbols_1_1 && !symbols_1_1.done && (_d = symbols_1.return)) _d.call(symbols_1);
        }
        finally { if (e_12) throw e_12.error; }
    }
    try {
        // add all the relevant textures to the <defs/>
        for (var textureNames_1 = __values(textureNames), textureNames_1_1 = textureNames_1.next(); !textureNames_1_1.done; textureNames_1_1 = textureNames_1.next()) {
            var textureName = textureNames_1_1.value;
            if (!resources.has("textures/".concat(textureName)))
                throw new Error("I couldn't find the texture textures/".concat(textureName, ".svg!"));
            // include both the original texture
            var texture = h('g', { id: "texture-".concat(textureName) });
            texture.textContent = resources.get("textures/".concat(textureName));
            defs.children.push(texture);
            // and a horizontally flipped version
            var flippedTexture = h('use', { id: "texture-".concat(textureName, "-flip") });
            flippedTexture.attributes.href = "#texture-".concat(textureName);
            flippedTexture.attributes.transform = "scale(-1, 1)";
            defs.children.push(flippedTexture);
        }
    }
    catch (e_13_1) { e_13 = { error: e_13_1 }; }
    finally {
        try {
            if (textureNames_1_1 && !textureNames_1_1.done && (_e = textureNames_1.return)) _e.call(textureNames_1);
        }
        finally { if (e_13) throw e_13.error; }
    }
    // then add the things to the map
    svg.attributes.style =
        "stroke:".concat(strokeColor, "; stroke-width:").concat(strokeWidth, "; stroke-linejoin:round; stroke-linecap: round;");
    try {
        for (var symbols_2 = __values(symbols), symbols_2_1 = symbols_2.next(); !symbols_2_1.done; symbols_2_1 = symbols_2.next()) {
            var _k = symbols_2_1.value, x = _k.x, y = _k.y, name_3 = _k.name, flipped = _k.flipped;
            var referenceID = "#texture-".concat(name_3) + (flipped ? "-flip" : "");
            var picture = h('use', { href: referenceID, x: x.toFixed(3), y: y.toFixed(3), fill: fillColor });
            try {
                for (var areaFeatures_1 = (e_15 = void 0, __values(areaFeatures)), areaFeatures_1_1 = areaFeatures_1.next(); !areaFeatures_1_1.done; areaFeatures_1_1 = areaFeatures_1.next()) { // check if it should inherit color from a base fill
                    var region = areaFeatures_1_1.value;
                    if (contains(region.path, { s: x, t: y }, INFINITE_PLANE, Rule.POSITIVE)) {
                        picture.attributes.fill = region.color;
                        break;
                    }
                }
            }
            catch (e_15_1) { e_15 = { error: e_15_1 }; }
            finally {
                try {
                    if (areaFeatures_1_1 && !areaFeatures_1_1.done && (_g = areaFeatures_1.return)) _g.call(areaFeatures_1);
                }
                finally { if (e_15) throw e_15.error; }
            }
            svg.children.push(picture);
        }
    }
    catch (e_14_1) { e_14 = { error: e_14_1 }; }
    finally {
        try {
            if (symbols_2_1 && !symbols_2_1.done && (_f = symbols_2.return)) _f.call(symbols_2);
        }
        finally { if (e_14) throw e_14.error; }
    }
}
/**
 * create a relief layer for the given set of triangles.
 * @param vertices Array of Vertexes to shade as triangles.
 * @param transform the projection, extent, scale, and orientation information
 * @param svg SVG object on which to shade.
 */
function shade(vertices, transform, svg) {
    var e_19, _a, e_20, _b, e_21, _c, e_22, _d;
    if (!vertices)
        return;
    // first determine which triangles are wholly within the map TODO: include some nodes outside the map
    var triangles = [];
    var minHeight = Infinity;
    var maxHeight = -Infinity;
    var maxEdgeLength = 0;
    try {
        triangleSearch: for (var vertices_1 = __values(vertices), vertices_1_1 = vertices_1.next(); !vertices_1_1.done; vertices_1_1 = vertices_1.next()) {
            var t = vertices_1_1.value;
            var p = [];
            try {
                for (var _e = (e_20 = void 0, __values(t.tiles)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var node = _f.value;
                    if (node instanceof EmptySpace)
                        continue triangleSearch;
                    var projectedNode = transformPoint(node, transform);
                    if (projectedNode === null)
                        continue triangleSearch;
                    p.push(new Vector(projectedNode.x, -projectedNode.y, Math.max(0, node.height)));
                    if (node.height < minHeight && node.height >= 0)
                        minHeight = node.height;
                    if (node.height > maxHeight)
                        maxHeight = node.height;
                }
            }
            catch (e_20_1) { e_20 = { error: e_20_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_20) throw e_20.error; }
            }
            triangles.push(p);
            for (var i = 0; i < 3; i++) {
                var edgeLength = Math.hypot(p[i].x - p[(i + 1) % 3].x, p[i].y - p[(i + 1) % 3].y);
                if (edgeLength > maxEdgeLength)
                    maxEdgeLength = edgeLength;
            }
        }
    }
    catch (e_19_1) { e_19 = { error: e_19_1 }; }
    finally {
        try {
            if (vertices_1_1 && !vertices_1_1.done && (_a = vertices_1.return)) _a.call(vertices_1);
        }
        finally { if (e_19) throw e_19.error; }
    }
    var heightScale = maxEdgeLength / (maxHeight - minHeight) / 3;
    try {
        for (var triangles_1 = __values(triangles), triangles_1_1 = triangles_1.next(); !triangles_1_1.done; triangles_1_1 = triangles_1.next()) { // start by computing slopes of all of the triangles
            var p = triangles_1_1.value;
            for (var i = 0; i < 3; i++) // scale the heights
                p[i].z *= heightScale;
            var n = p[1].minus(p[0]).cross(p[2].minus(p[0])).normalized();
            var slope = -n.y / n.z;
            var path = [];
            try {
                for (var p_1 = (e_22 = void 0, __values(p)), p_1_1 = p_1.next(); !p_1_1.done; p_1_1 = p_1.next()) {
                    var _g = p_1_1.value, x = _g.x, y = _g.y;
                    path.push({ type: 'L', args: [x, -y] });
                } // put its values in a plottable form
            }
            catch (e_22_1) { e_22 = { error: e_22_1 }; }
            finally {
                try {
                    if (p_1_1 && !p_1_1.done && (_d = p_1.return)) _d.call(p_1);
                }
                finally { if (e_22) throw e_22.error; }
            }
            path.push({ type: 'L', args: __spreadArray([], __read(path[0].args), false) });
            path[0].type = 'M';
            var angle = Math.max(0, Math.min(Math.PI / 2, SUN_ELEVATION - Math.atan(slope)));
            var brightness = Math.sin(angle) / Math.sin(SUN_ELEVATION); // and use that to get a brightness
            if (brightness > 1.02)
                draw(path, svg).attributes.style =
                    "fill: #fff; fill-opacity: ".concat(Math.min(brightness - 1, 1) * (1 - AMBIENT_LIGHT), ";");
            else if (brightness < 0.98)
                draw(path, svg).attributes.style =
                    "fill: #000; fill-opacity: ".concat(Math.min(1 - brightness, 1) * (1 - AMBIENT_LIGHT), ";");
        }
    }
    catch (e_21_1) { e_21 = { error: e_21_1 }; }
    finally {
        try {
            if (triangles_1_1 && !triangles_1_1.done && (_c = triangles_1.return)) _c.call(triangles_1);
        }
        finally { if (e_21) throw e_21.error; }
    }
}
/**
 *
 * @param surface the surface being measured
 * @param extent the range of latitudes and longitudes to be marked
 * @param transform the projection, extent, scale, and orientation information
 * @param svg SVG object on which to put the Paths
 * @param color the color of the lines
 * @param width the thickness of the lines
 */
function drawGraticule(surface, extent, transform, svg, color, width) {
    // calculate the average scale (mm/radian)
    var latitudeScale = transform.scale * surface.ds_dφ(transform.projection.φStandard);
    var longitudeScale = transform.scale * surface.rz(transform.projection.φStandard).r;
    svg.attributes.style = "fill:none; stroke:".concat(color, "; stroke-width:").concat(width);
    var Δφ = GRATICULE_SPACING / latitudeScale;
    Δφ = Math.PI / 2 / Math.max(1, Math.round(Math.PI / 2 / Δφ));
    var φInit = Math.ceil(extent.φMin / Δφ) * Δφ;
    for (var φ = φInit; φ <= extent.φMax; φ += Δφ)
        draw(transformPath([
            { type: 'M', args: [φ, extent.λMin] },
            { type: 'Φ', args: [φ, extent.λMax] },
        ], transform, false), svg);
    var Δλ = GRATICULE_SPACING / longitudeScale;
    Δλ = Math.PI / 2 / Math.max(1, Math.round(Math.PI / 2 / Δλ));
    var λInit = Math.ceil((extent.λMin - transform.projection.λCenter) / Δλ) * Δλ + transform.projection.λCenter;
    for (var λ = λInit; λ <= extent.λMax; λ += Δλ)
        draw(transformPath([
            { type: 'M', args: [extent.φMin, λ] },
            { type: 'Λ', args: [extent.φMax, λ] },
        ], transform, false), svg);
}
/**
 * add all of the political labels to this map
 * @param civs the regions to label
 * @param style the transliteration convention to use for them
 * @param haloInfo a Map containing the color of each country by its ID, plus the generic land color at get(0), for halo styling purposes
 * @param transform the projection, extent, scale, and orientation information
 * @param svg the SVG object on which to write the label.
 * @param minFontSize the smallest allowable font size, in mm. if the label cannot fit inside
 *                    the region with this font size, no label will be placed.
 * @param maxFontSize the largest allowable font size, in mm. if there is space available for
 *                    a bigger label, it will appear at this font size
 * @param characterWidthMap a table containing the width of every possible character, for label length calculation purposes
 */
function placeLabels(civs, style, haloInfo, transform, svg, minFontSize, maxFontSize, characterWidthMap) {
    var e_23, _a;
    var labelIndex = 0;
    try {
        for (var civs_2 = __values(civs), civs_2_1 = civs_2.next(); !civs_2_1.done; civs_2_1 = civs_2.next()) {
            var civ = civs_2_1.value;
            var tiles = __spreadArray([], __read(civ.getTiles()), false).filter(function (n) { return !n.isSaltWater(); }); // TODO: do something fancier... maybe the intersection of the voronoi space and the convex hull
            if (tiles.length < 0)
                throw new Error("you seem to have passed a nonexistent Civ to placeLabels.");
            var label = void 0;
            if (SHOW_TECH_LEVEL && civ instanceof Civ)
                label = (Math.log(civ.technology) * 1400 - 3000).toFixed(0);
            else
                label = civ.getName().toString(style).toUpperCase();
            var haloColor = void 0;
            if (haloInfo === null)
                haloColor = null;
            else if (haloInfo.has(civ.id))
                haloColor = haloInfo.get(civ.id);
            else
                haloColor = haloInfo.get(0);
            placeLabel(tiles, label, transform, svg, minFontSize, maxFontSize, haloColor, labelIndex, characterWidthMap);
            labelIndex += 1;
        }
    }
    catch (e_23_1) { e_23 = { error: e_23_1 }; }
    finally {
        try {
            if (civs_2_1 && !civs_2_1.done && (_a = civs_2.return)) _a.call(civs_2);
        }
        finally { if (e_23) throw e_23.error; }
    }
}
/**
 * add some text to this region on each of the
 * @param tiles the Nodos that comprise the region to be labelled.
 * @param label the text to place.
 * @param transform the projection, extent, scale, and orientation information
 * @param svg the SVG object on which to write the label.
 * @param minFontSize the smallest allowable font size, in mm. if the label cannot fit inside
 *                    the region with this font size, no label will be placed.
 * @param maxFontSize the largest allowable font size, in mm. if there is space available for
 *                    a bigger label, it will appear at this font size
 * @param haloColor the color of the text halo, if any, or null for no halos
 * @param labelIndex a unique number to use in the ID of this label and its arc
 * @param characterWidthMap a table containing the width of every possible character, for label length calculation purposes
 */
function placeLabel(tiles, label, transform, svg, minFontSize, maxFontSize, haloColor, labelIndex, characterWidthMap) {
    if (tiles.length === 0)
        throw new Error("there must be at least one tile to label");
    var heightPerSize = 0.72; // this number was measured for Noto Sans
    var lengthPerSize = calculateStringLength(characterWidthMap, label);
    var aspectRatio = lengthPerSize / heightPerSize;
    var path = transformedOutline(// do the projection
    tiles, Layer.KULTUR, transform);
    if (path.length === 0)
        return;
    // choose the best location for the text
    var location;
    try {
        location = chooseLabelLocation(path, aspectRatio, 1.4, maxFontSize * heightPerSize);
    }
    catch (e) {
        console.error(e);
        return;
    }
    var fontSize = location.height / heightPerSize;
    if (fontSize < minFontSize)
        return;
    var arc = draw(location.arc, svg); // make the arc in the SVG
    // arc.setAttribute('style', `fill: none; stroke: #400; stroke-width: .5px;`);
    if (SHOW_LABEL_PATHS)
        arc.attributes.style = "fill: none; stroke: #770000; stroke-width: ".concat(location.height);
    else
        arc.attributes.style = 'fill: none; stroke: none;';
    arc.attributes.id = "labelArc".concat(labelIndex);
    // create the text element
    var textGroup = h('text', {
        style: "font-size: ".concat(fontSize.toFixed(1), "px; letter-spacing: ").concat((location.letterSpacing * .5).toFixed(1), "em;")
    }); // this .5em is just a guess at the average letter width
    var textPath = h('textPath', {
        class: 'label',
        startOffset: '50%',
        href: "#labelArc".concat(labelIndex),
    });
    textPath.textContent = label;
    // also add a halo below it if desired
    if (haloColor !== null) {
        var haloPath = cloneNode(textPath);
        haloPath.attributes.class += ' halo';
        haloPath.attributes.stroke = haloColor;
        textGroup.children.push(haloPath);
    }
    textGroup.children.push(textPath);
    svg.children.push(textGroup);
}
/**
 * as a debugging tool, put a text box on every Tile showing its index
 */
function placeTileLabels(tiles, transform, svg) {
    var e_24, _a;
    svg.attributes.style = "text-anchor: middle; dominant-baseline: middle";
    try {
        for (var tiles_1 = __values(tiles), tiles_1_1 = tiles_1.next(); !tiles_1_1.done; tiles_1_1 = tiles_1.next()) {
            var tile = tiles_1_1.value;
            var text = h('text'); // start by creating the text element
            var location_1 = transformPoint(tile, transform);
            if (location_1 !== null) {
                text.attributes["x"] = location_1.x.toFixed(3);
                text.attributes["y"] = location_1.y.toFixed(3);
                text.attributes["font-size"] = "0.2em";
                text.textContent = "".concat(tile.index);
                svg.children.push(text);
            }
        }
    }
    catch (e_24_1) { e_24 = { error: e_24_1 }; }
    finally {
        try {
            if (tiles_1_1 && !tiles_1_1.done && (_a = tiles_1.return)) _a.call(tiles_1);
        }
        finally { if (e_24) throw e_24.error; }
    }
}
/**
 * as a debugging tool, draw the straight skeleton of every tile
 */
function drawStraightSkeletons(surface, transform, svg) {
    var e_25, _a, e_26, _b, e_27, _c;
    var edges = new Set();
    try {
        for (var _d = __values(surface.tiles), _e = _d.next(); !_e.done; _e = _d.next()) {
            var tile = _e.value;
            try {
                for (var _f = (e_26 = void 0, __values(tile.neighbors.values())), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var edge = _g.value;
                    edges.add(edge);
                }
            }
            catch (e_26_1) { e_26 = { error: e_26_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_26) throw e_26.error; }
            }
        }
    }
    catch (e_25_1) { e_25 = { error: e_25_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
        }
        finally { if (e_25) throw e_25.error; }
    }
    var path = [];
    try {
        for (var edges_1 = __values(edges), edges_1_1 = edges_1.next(); !edges_1_1.done; edges_1_1 = edges_1.next()) {
            var edge = edges_1_1.value;
            edge.setCoordinatesAndBounds();
            var edgeCoordsPolygon = [edge.vertex0.pos].concat(edge.leftBoundCartesian, [edge.vertex1.pos], edge.rightBoundCartesian);
            var geoCoordsPolygon = edgeCoordsPolygon.map(surface.φλ, surface);
            var start = geoCoordsPolygon[geoCoordsPolygon.length - 1];
            path.push({ type: 'M', args: [start.φ, start.λ] });
            for (var i = 0; i < geoCoordsPolygon.length; i++)
                path.push({ type: 'L', args: [geoCoordsPolygon[i].φ, geoCoordsPolygon[i].λ] });
        }
    }
    catch (e_27_1) { e_27 = { error: e_27_1 }; }
    finally {
        try {
            if (edges_1_1 && !edges_1_1.done && (_c = edges_1.return)) _c.call(edges_1);
        }
        finally { if (e_27) throw e_27.error; }
    }
    svg.attributes.style = "fill: none; stroke: #302d2877; stroke-width: 0.2px; stroke-linecap: round; stroke-linejoin: round";
    draw(transformPath(path, transform), svg);
}
/**
 *
 * @param bbox the spacial extent of the map area
 * @param content
 * @param svg SVG object on which to put the content
 */
function placeWindrose(bbox, content, svg) {
    // decide where to put it
    var radius = Math.min(25, 0.2 * Math.min(bbox.width, bbox.height));
    var x = bbox.left + 1.2 * radius;
    var y = bbox.top + 1.2 * radius;
    svg.attributes.transform = "translate(".concat(x, ", ").concat(y, ") scale(").concat(radius / 26, ")");
    // load the content from windrose.svg
    svg.textContent = content;
}
/**
 * draw a black envelope surrounded by white around the outside of this map
 * @param bbox the dimensions of the entire map (mm)
 * @param transform the projection, extent, scale, and orientation information
 * @param svg SVG object on which to put the Path
 * @param fillColor the color of the margin space
 * @param strokeColor the color of the envelope
 * @param strokeWidth the thickness of the envelope
 */
function drawOuterBorder(bbox, transform, svg, fillColor, strokeColor, strokeWidth) {
    var outerBorder = convertPathClosuresToZ(transformPath([], transform, true));
    var paperEdge = rectangle(bbox.left, bbox.top, bbox.right, bbox.bottom, false);
    draw(paperEdge.concat(reversePath(outerBorder)), svg).attributes.style =
        "fill: ".concat(fillColor, "; stroke: white; stroke-width: ").concat(strokeWidth / 2, ";");
    draw(outerBorder, svg).attributes.style =
        "fill: none; stroke: ".concat(strokeColor, "; stroke-width: ").concat(strokeWidth, "; stroke-linejoin: miter; stroke-miterlimit: 2;");
}
/**
 * convert the series of segments to an HTML path element and add it to the Element
 */
function draw(segments, svg) {
    var path = h('path', { d: pathToString(segments) });
    if (segments.length > 0)
        svg.children.push(path); // put it in the SVG
    return path;
}
/**
 * project and convert an SVG path in latitude-longitude coordinates into an SVG path in Cartesian coordinates,
 * accounting for the map domain and the orientation and scale of the map.  if segments is [] but closePath is true,
 * that will be interpreted as meaning you want the path representing the whole Surface
 * (which will end up being just the map outline)
 * @param segments ordered Iterator of segments, which each have attributes .type (str) and .args ([double])
 * @param transform the projection, extent, scale, and orientation information
 * @param closePath if this is set to true, the map will make adjustments to account for its complete nature
 * @param cleanUpPath if this is set to true, this will purge any movetos without any connected segments
 *                    (otherwise some might unexpectedly appear at the fringes of the map region)
 * @return SVG.Path object in Cartesian coordinates
 */
function transformPath(segments, transform, closePath, cleanUpPath) {
    if (closePath === void 0) { closePath = false; }
    if (cleanUpPath === void 0) { cleanUpPath = true; }
    var croppedToGeoRegion = intersection(transformInput(transform.projection.domain, segments), transform.geoEdges, transform.projection.domain, closePath);
    if (croppedToGeoRegion.length === 0)
        return [];
    var projected = applyProjectionToPath(transform.projection, croppedToGeoRegion, MAP_PRECISION / transform.scale, transform.mapEdges);
    if (cleanUpPath)
        projected = removeLoosePoints(projected);
    var croppedToMapRegion = intersection(projected, transform.mapEdges, INFINITE_PLANE, closePath);
    return scalePath(rotatePath(croppedToMapRegion, transform.orientation), transform.scale, transform.scale);
}
/**
 * project a geographic point defined by latitude and longitude to a point on the map defined by x and y,
 * accounting for the map domain and the orientation and scale of the map
 * @param point
 * @param transform the projection, extent, scale, and orientation information
 * @return the projected point in Cartesian coordinates (mm), or null if the point falls outside the mapped area.
 */
function transformPoint(point, transform) {
    // use the projectPath function, since that's much more general by necessity
    var result = transformPath([{ type: 'M', args: [point.φ, point.λ] }], transform, false, false);
    // then simply extract the coordinates from the result
    if (result.length === 0)
        return null;
    else if (result.length === 1)
        return { x: result[0].args[0], y: result[0].args[1] };
    else
        throw new Error("well that wasn't supposed to happen.");
}
/**
 * create a path that forms the border of this set of Tiles on the map.
 * @param tiles the tiles that comprise the region whose outline is desired
 * @param greeble what kind of border this is for the purposes of greebling
 * @param transform the projection, extent, scale, and orientation information
 */
function transformedOutline(tiles, greeble, transform) {
    var tileSet = new Set(tiles);
    if (tileSet.size === 0)
        return [];
    return transformPath(convertToGreebledPath(outline(tileSet), greeble, transform.scale), transform, true);
}
/**
 * create an ordered Iterator of segments that form all of these lines, aggregating where
 * applicable. aggregation may behave unexpectedly if some members of lines contain
 * nonendpoints that are endpoints of others.
 * @param lines Set of lists of points to be combined and pathified.
 */
function aggregate(lines) {
    var e_28, _a, e_29, _b, e_30, _c, e_31, _d;
    var queue = __spreadArray([], __read(lines), false);
    var consolidated = new Set(); // first, consolidate
    var heads = new Map(); // map from points to [lines beginning with endpoint]
    var tails = new Map(); // map from points endpoints to [lines ending with endpoint]
    var torsos = new Map(); // map from midpoints to line containing midpoint
    while (queue.length > 0) {
        try {
            for (var consolidated_1 = (e_28 = void 0, __values(consolidated)), consolidated_1_1 = consolidated_1.next(); !consolidated_1_1.done; consolidated_1_1 = consolidated_1.next()) {
                var l = consolidated_1_1.value;
                if (!heads.has(l[0]) || !tails.has(l[l.length - 1]))
                    throw Error("up top!");
                if (torsos.has(l[0]) || torsos.has(l[l.length - 1]))
                    throw Error("up slightly lower!");
            }
        }
        catch (e_28_1) { e_28 = { error: e_28_1 }; }
        finally {
            try {
                if (consolidated_1_1 && !consolidated_1_1.done && (_a = consolidated_1.return)) _a.call(consolidated_1);
            }
            finally { if (e_28) throw e_28.error; }
        }
        var line = __spreadArray([], __read(queue.pop()), false); // check each given line (we've only shallow-copied until now, so make sure you don't alter the input lines themselves)
        var head = line[0], tail = line[line.length - 1];
        consolidated.add(line); // add it to the list
        if (!heads.has(head))
            heads.set(head, []); // and connect it to these existing sets
        heads.get(head).push(line);
        if (!tails.has(tail))
            tails.set(tail, []);
        tails.get(tail).push(line);
        for (var i = 1; i < line.length - 1; i++)
            torsos.set(line[i], { containing: line, index: i });
        try {
            for (var consolidated_2 = (e_29 = void 0, __values(consolidated)), consolidated_2_1 = consolidated_2.next(); !consolidated_2_1.done; consolidated_2_1 = consolidated_2.next()) {
                var l = consolidated_2_1.value;
                if (!heads.has(l[0]) || !tails.has(l[l.length - 1]))
                    throw Error("that was quick.");
            }
        }
        catch (e_29_1) { e_29 = { error: e_29_1 }; }
        finally {
            try {
                if (consolidated_2_1 && !consolidated_2_1.done && (_b = consolidated_2.return)) _b.call(consolidated_2);
            }
            finally { if (e_29) throw e_29.error; }
        }
        try {
            for (var _e = (e_30 = void 0, __values([head, tail])), _f = _e.next(); !_f.done; _f = _e.next()) { // first, on either end...
                var endpoint_1 = _f.value;
                if (torsos.has(endpoint_1)) { // does it run into the middle of another?
                    var _g = torsos.get(endpoint_1), containing = _g.containing, index = _g.index; // then that one must be cut in half
                    var fragment = containing.slice(index);
                    containing.splice(index + 1);
                    consolidated.add(fragment);
                    if (endpoint_1 === head)
                        tails.set(endpoint_1, []);
                    else
                        heads.set(endpoint_1, []);
                    heads.get(endpoint_1).push(fragment);
                    tails.get(endpoint_1).push(containing);
                    tails.get(fragment[fragment.length - 1])[tails.get(fragment[fragment.length - 1]).indexOf(containing)] = fragment;
                    torsos.delete(endpoint_1);
                    for (var i = 1; i < fragment.length - 1; i++)
                        torsos.set(fragment[i], { containing: fragment, index: i });
                }
            }
        }
        catch (e_30_1) { e_30 = { error: e_30_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_c = _e.return)) _c.call(_e);
            }
            finally { if (e_30) throw e_30.error; }
        }
        try {
            for (var consolidated_3 = (e_31 = void 0, __values(consolidated)), consolidated_3_1 = consolidated_3.next(); !consolidated_3_1.done; consolidated_3_1 = consolidated_3.next()) {
                var l = consolidated_3_1.value;
                if (!heads.has(l[0]) || !tails.has(l[l.length - 1]))
                    throw Error("i broke it ".concat(l[0].φ, " -> ").concat(l[l.length - 1].φ));
                if (torsos.has(l[0]) || torsos.has(l[l.length - 1]))
                    throw Error("yoo broke it! ".concat(l[0].φ, " -> ").concat(l[l.length - 1].φ));
            }
        }
        catch (e_31_1) { e_31 = { error: e_31_1 }; }
        finally {
            try {
                if (consolidated_3_1 && !consolidated_3_1.done && (_d = consolidated_3.return)) _d.call(consolidated_3);
            }
            finally { if (e_31) throw e_31.error; }
        }
        if (tails.has(head)) { // does its beginning connect to another?
            if (heads.get(head).length === 1 && tails.get(head).length === 1) // if these fit together exclusively
                line = combine(tails.get(head)[0], line); // put them together
        }
        if (heads.has(tail)) { // does its end connect to another?
            if (heads.get(tail).length === 1 && tails.get(tail).length === 1) // if these fit together exclusively
                line = combine(line, heads.get(tail)[0]); // put them together
        }
    }
    function combine(a, b) {
        consolidated.delete(b); // delete b
        heads.delete(b[0]); // b[0] is no longer a startpoint or an endpoint
        tails.delete(b[0]);
        tails.get(b[b.length - 1])[tails.get(b[b.length - 1]).indexOf(b)] = a; // repoint the tail reference from b to a
        for (var i = 1; i < b.length; i++) { // add b's elements to a
            torsos.set(b[i - 1], { containing: a, index: a.length - 1 });
            a.push(b[i]);
        }
        return a;
    }
    return consolidated;
}
/**
 * convert some paths expressd as Places into an array of PathSegments, using 'M'
 * segments to indicate gaps and 'L' segments to indicate connections.  if any of the
 * adjacent Places are actually adjacent Vertexes, go ahead and greeble some vertices
 * between them as appropriate.
 * @param points each Place[] is a polygonal path thru geographic space
 * @param greeble what kinds of connections these are for the purposes of greebling
 * @param scale the map scale at which to greeble in mm/km
 */
function convertToGreebledPath(points, greeble, scale) {
    var e_32, _a, e_33, _b;
    var path = [];
    try {
        for (var points_1 = __values(points), points_1_1 = points_1.next(); !points_1_1.done; points_1_1 = points_1.next()) { // then do the conversion
            var line = points_1_1.value;
            path.push({ type: 'M', args: [line[0].φ, line[0].λ] });
            for (var i = 1; i < line.length; i++) {
                var start = line[i - 1];
                var end = line[i];
                // see if there's an edge to greeble
                var edge = null;
                if (start instanceof Vertex && end instanceof Vertex)
                    if (start.neighbors.has(end))
                        edge = start.neighbors.get(end);
                var step = void 0;
                // if this is an edge or something, just use a strait line
                if (edge === null)
                    step = [end];
                // if there is an edge, greeble it
                else {
                    // if it's not a precise edge, tho, then greeble minimally
                    var edgeScale = weShouldGreeble(edge, greeble) ? scale : 0;
                    var path_1 = edge.getPath(GREEBLE_SCALE / edgeScale);
                    if (edge.vertex0 === start)
                        step = path_1.slice(1);
                    else
                        step = path_1.slice(0, path_1.length - 1).reverse();
                }
                console.assert(step[step.length - 1].φ === end.φ && step[step.length - 1].λ === end.λ, step, "did not end at", end);
                try {
                    for (var step_1 = (e_33 = void 0, __values(step)), step_1_1 = step_1.next(); !step_1_1.done; step_1_1 = step_1.next()) {
                        var place = step_1_1.value;
                        path.push({ type: 'L', args: [place.φ, place.λ] });
                    }
                }
                catch (e_33_1) { e_33 = { error: e_33_1 }; }
                finally {
                    try {
                        if (step_1_1 && !step_1_1.done && (_b = step_1.return)) _b.call(step_1);
                    }
                    finally { if (e_33) throw e_33.error; }
                }
            }
        }
    }
    catch (e_32_1) { e_32 = { error: e_32_1 }; }
    finally {
        try {
            if (points_1_1 && !points_1_1.done && (_a = points_1.return)) _a.call(points_1);
        }
        finally { if (e_32) throw e_32.error; }
    }
    return path;
}
function smooth(input) {
    var segments = input.slice();
    for (var i = segments.length - 2; i >= 0; i--) {
        var newEnd = [
            (segments[i].args[0] + segments[i + 1].args[0]) / 2,
            (segments[i].args[1] + segments[i + 1].args[1]) / 2
        ];
        if (segments[i].type === 'L' && segments[i + 1].type !== 'M') // look for points that are sharp angles
            segments[i] = { type: 'Q', args: __spreadArray(__spreadArray([], __read(segments[i].args), false), __read(newEnd), false) }; // and extend those lines into curves
        else if (segments[i].type === 'M' && segments[i + 1].type === 'Q') { // look for curves that start with Bezier curves
            segments.splice(i + 1, 0, { type: 'L', args: newEnd }); // assume we put it there and restore some linearity
        }
    }
    return segments;
}
function weShouldGreeble(edge, layer) {
    if (DISABLE_GREEBLING)
        return false;
    else if (layer === Layer.GEO)
        return true;
    else if (edge.tileL.isWater() !== edge.tileR.isWater())
        return true;
    else if (layer === Layer.BIO)
        return false;
    else if (Math.min(edge.tileL.getPopulationDensity(), edge.tileR.getPopulationDensity()) < BORDER_SPECIFY_THRESHOLD)
        return false;
    else
        return true;
}
/**
 * identify the meridian and parallel that are most centered on this region
 */
function chooseMapCentering(regionOfInterest, surface) {
    var e_34, _a;
    // start by calculating the mean radius of the region, for pseudocylindrical standard parallels
    var rSum = 0;
    var count = 0;
    try {
        for (var regionOfInterest_1 = __values(regionOfInterest), regionOfInterest_1_1 = regionOfInterest_1.next(); !regionOfInterest_1_1.done; regionOfInterest_1_1 = regionOfInterest_1.next()) { // first measure the typical width of the surface in the latitude bounds
            var tile = regionOfInterest_1_1.value;
            rSum += surface.rz(tile.φ).r;
            count += 1;
        }
    }
    catch (e_34_1) { e_34 = { error: e_34_1 }; }
    finally {
        try {
            if (regionOfInterest_1_1 && !regionOfInterest_1_1.done && (_a = regionOfInterest_1.return)) _a.call(regionOfInterest_1);
        }
        finally { if (e_34) throw e_34.error; }
    }
    if (count === 0)
        throw new Error("I can't choose a map centering with an empty region of interest.");
    var meanRadius = rSum / count;
    // turn the region into a proper closed polygon in the [-π, π) domain
    var landOfInterest = filterSet(regionOfInterest, function (tile) { return !tile.isWater() && !tile.isIceCovered(); });
    var coastline = intersection(convertToGreebledPath(outline(landOfInterest), Layer.KULTUR, 1e-6), rectangle(Math.max(surface.φMin, -Math.PI), -Math.PI, Math.min(surface.φMax, Math.PI), Math.PI, true), new Domain(-Math.PI, Math.PI, -Math.PI, Math.PI, function (point) { return surface.isOnEdge(assert_φλ(point)); }), true);
    var longitudeInformation = chooseCentralMeridian(landOfInterest, coastline);
    var centralMeridian = longitudeInformation.center;
    var regionWidth = longitudeInformation.width;
    // find the average latitude of the region
    var centralParallel = chooseCentralMeridian(__spreadArray([], __read(landOfInterest), false).map(function (point) { return ({ φ: -point.λ, λ: point.φ }); }), rotatePath(coastline, 270)).center;
    if (regionWidth > 3 * Math.PI / 2 && surface.φMax - surface.φMin < 2 * Math.PI) {
        // if it's a whole-world map and non-periodic in latitude, try to use the equator
        var equator = (surface.φMin + surface.φMax) / 2;
        if (Math.abs(centralParallel - equator) < 0.5)
            centralParallel = equator;
    }
    return {
        centralMeridian: centralMeridian,
        centralParallel: centralParallel,
        meanRadius: meanRadius
    };
}
/**
 * identify the meridian that is most centered on this region, and the longitudinal width of the region about that center.
 */
function chooseCentralMeridian(region, regionBoundary) {
    var e_35, _a;
    // find the longitude with the most empty space on either side of it
    var emptyLongitudes = new ErodingSegmentTree(-Math.PI, Math.PI); // start with all longitudes empty
    for (var i = 0; i < regionBoundary.length; i++) {
        if (regionBoundary[i].type !== 'M') {
            var λ1 = regionBoundary[i - 1].args[1];
            var λ2 = regionBoundary[i].args[1];
            var wraps = Math.abs(λ1 - λ2) > Math.PI && regionBoundary[i].type !== 'Φ';
            if (!wraps) { // and then remove the space corresponding to each segment
                emptyLongitudes.remove(Math.min(λ1, λ2), Math.max(λ1, λ2));
            }
            else {
                emptyLongitudes.remove(Math.max(λ1, λ2), Math.PI);
                emptyLongitudes.remove(-Math.PI, Math.min(λ1, λ2));
            }
        }
    }
    if (emptyLongitudes.getCenter(true).location !== null) {
        var biggestGap = emptyLongitudes.getCenter(true);
        return {
            center: localizeInRange(biggestGap.location + Math.PI, -Math.PI, Math.PI),
            width: 2 * Math.PI - 2 * biggestGap.radius,
        };
    }
    else {
        // if there are no empty longitudes, do a periodic mean over the land part of the region of interest
        var xCenter = 0;
        var yCenter = 0;
        try {
            for (var region_1 = __values(region), region_1_1 = region_1.next(); !region_1_1.done; region_1_1 = region_1.next()) {
                var tile = region_1_1.value;
                xCenter += Math.cos(tile.λ);
                yCenter += Math.sin(tile.λ);
            }
        }
        catch (e_35_1) { e_35 = { error: e_35_1 }; }
        finally {
            try {
                if (region_1_1 && !region_1_1.done && (_a = region_1.return)) _a.call(region_1);
            }
            finally { if (e_35) throw e_35.error; }
        }
        return {
            center: Math.atan2(yCenter, xCenter),
            width: 2 * Math.PI,
        };
    }
}
/**
 * identify the central meridian for this map projection that centers this region horizontally
 */
function adjustMapCentering(regionOfInterest, projection) {
    var landOfInterest = filterSet(regionOfInterest, function (tile) { return !tile.isWater(); });
    var coastline = transformInput(projection.domain, convertToGreebledPath(outline(landOfInterest), Layer.KULTUR, 1e-6));
    var geoExtent = calculatePathBounds(coastline);
    var mapExtent = calculatePathBounds(applyProjectionToPath(projection, coastline, Infinity));
    if (coastline.length === 0)
        throw new Error("how can I adjust the map centering when there's noting to center?");
    function centroid(λCenter) {
        var e_36, _a;
        var rotatedProjection = projection.recenter(λCenter);
        var min = null;
        var max = null;
        try {
            for (var coastline_1 = __values(coastline), coastline_1_1 = coastline_1.next(); !coastline_1_1.done; coastline_1_1 = coastline_1.next()) {
                var segment = coastline_1_1.value;
                var rawVertex = assert_φλ(endpoint(segment));
                rawVertex.λ = localizeInRange(rawVertex.λ, rotatedProjection.λMin, rotatedProjection.λMax);
                var vertex = rotatedProjection.projectPoint(rawVertex);
                if (min === null || vertex.x < min.x)
                    min = { x: vertex.x, φ: rawVertex.φ, λ: rawVertex.λ };
                if (max === null || vertex.x > max.x)
                    max = { x: vertex.x, φ: rawVertex.φ, λ: rawVertex.λ };
            }
        }
        catch (e_36_1) { e_36 = { error: e_36_1 }; }
        finally {
            try {
                if (coastline_1_1 && !coastline_1_1.done && (_a = coastline_1.return)) _a.call(coastline_1);
            }
            finally { if (e_36) throw e_36.error; }
        }
        return {
            value: -(min.x + max.x) / 2,
            slope: (rotatedProjection.gradient(min).λ.x + rotatedProjection.gradient(max).λ.x) / 2,
        };
    }
    try {
        return findRoot(centroid, projection.λCenter, geoExtent.tMin, geoExtent.tMax, (mapExtent.sMax - mapExtent.sMin) * 0.01);
    }
    catch (_a) {
        console.error("I couldn't center this map properly for some reason.");
        return projection.λCenter;
    }
}
/**
 * determine the Cartesian coordinate bounds of this region on the map.
 * @param regionOfInterest the region that must be enclosed entirely within the returned bounding box
 * @param projection the projection being used to map this region from a Surface to the plane
 * @param rectangularBounds whether the map should be rectangular rather than wedge-shaped
 * @param geoEdges the bounds of the geographical region being mapped
 */
function chooseMapBounds(regionOfInterest, projection, rectangularBounds, geoEdges) {
    // start by identifying the geographic and projected extent of this thing
    var regionBounds = calculatePathBounds(regionOfInterest);
    var projectedRegion = applyProjectionToPath(projection, regionOfInterest, Infinity);
    var projectedBounds = calculatePathBounds(projectedRegion);
    // first infer some things about this projection
    var northPoleIsDistant = projection.differentiability(projection.φMax) < .5;
    var southPoleIsDistant = projection.differentiability(projection.φMin) < .5;
    // calculate the Cartesian bounds, with some margin
    var margin = 0.05 * Math.sqrt((projectedBounds.sMax - projectedBounds.sMin) *
        (projectedBounds.tMax - projectedBounds.tMin));
    var xLeft = Math.min(projectedBounds.sMin, -projectedBounds.sMax) - margin;
    var xRight = -xLeft;
    var yTop = projectedBounds.tMin - margin;
    var yBottom = projectedBounds.tMax + margin;
    // but if the poles are super far away, put some global limits on the map extent
    var globeWidth = 2 * Math.PI * projection.surface.rz((regionBounds.sMin + regionBounds.sMax) / 2).r;
    var maxHeight = globeWidth / Math.sqrt(2);
    var yNorthCutoff = -Infinity, ySouthCutoff = Infinity;
    if (northPoleIsDistant) {
        if (southPoleIsDistant) {
            var yCenter = projection.projectPoint({
                φ: (regionBounds.sMin + regionBounds.sMax) / 2,
                λ: projection.λCenter,
            }).y;
            yNorthCutoff = yCenter - maxHeight / 2;
            ySouthCutoff = yCenter + maxHeight / 2;
        }
        else
            yNorthCutoff = yBottom - maxHeight;
    }
    else if (southPoleIsDistant)
        ySouthCutoff = yTop + maxHeight;
    // apply those limits
    yTop = Math.max(yTop, yNorthCutoff);
    yBottom = Math.min(yBottom, ySouthCutoff);
    // if we want a wedge-shaped map
    if (!rectangularBounds) {
        // expand the cartesian bounds – ideally we shouldn't see them
        xRight = Math.max(1.4 * xRight, -1.4 * xLeft);
        xLeft = -xRight;
        var yMargin = 0.2 * (yBottom - yTop);
        yTop = yTop - yMargin;
        yBottom = yBottom + yMargin;
    }
    // the extent of the geographic region will always impose some Cartesian limits; compute those now.
    var mapBounds = calculatePathBounds(applyProjectionToPath(projection, geoEdges, Infinity));
    xLeft = Math.max(xLeft, mapBounds.sMin);
    xRight = Math.min(xRight, mapBounds.sMax);
    yTop = Math.max(yTop, mapBounds.tMin);
    yBottom = Math.min(yBottom, mapBounds.tMax);
    // set the Cartesian limits of the unrotated and unscaled mapped area (km)
    var mapEdges = rectangle(xLeft, yTop, xRight, yBottom, false);
    return { xLeft: xLeft, xRight: xRight, yTop: yTop, yBottom: yBottom, mapEdges: mapEdges };
}
/**
 * determine the geographical coordinate bounds of this region on its Surface.
 * @param regionOfInterest the region that must be enclosed entirely within the returned bounding box
 * @param projection the projection being used, for the purposes of calculating the size of the margin.
 *                   strictly speaking we only need the scale along the central meridian and along the parallels
 *                   to be correct; parallel curvature doesn't come into play in this function.
 * @param rectangularBounds whether the map should be rectangular rather than wedge-shaped
 */
function chooseGeoBounds(regionOfInterest, projection, rectangularBounds) {
    // start by identifying the geographic and projected extent of this thing
    var regionBounds = calculatePathBounds(regionOfInterest);
    // first infer some things about this projection
    var northPoleIsDistant = projection.differentiability(projection.φMax) < .5;
    var southPoleIsDistant = projection.differentiability(projection.φMin) < .5;
    var northPoleIsPoint = projection.projectPoint({ φ: projection.φMax, λ: 1 }).x === 0;
    var southPoleIsPoint = projection.projectPoint({ φ: projection.φMin, λ: 1 }).x === 0;
    // calculate the geographic bounds, with some margin
    var yMax = projection.projectPoint({ φ: regionBounds.sMin, λ: projection.λCenter }).y;
    var yMin = projection.projectPoint({ φ: regionBounds.sMax, λ: projection.λCenter }).y;
    var ySouthEdge = projection.projectPoint({ φ: projection.φMin, λ: projection.λCenter }).y;
    var yNorthEdge = projection.projectPoint({ φ: projection.φMax, λ: projection.λCenter }).y;
    var φMax = projection.inverseProjectPoint({ x: 0, y: Math.max(1.05 * yMin - 0.05 * yMax, yNorthEdge) }).φ;
    var φMin = projection.inverseProjectPoint({ x: 0, y: Math.min(1.05 * yMax - 0.05 * yMin, ySouthEdge) }).φ;
    var ds_dλ = projection.surface.rz((φMin + φMax) / 2).r;
    var λMin = Math.max(projection.λMin, regionBounds.tMin - 0.05 * (yMax - yMin) / ds_dλ);
    var λMax = Math.min(projection.λMax, regionBounds.tMax + 0.05 * (yMax - yMin) / ds_dλ);
    // if we want a rectangular map
    if (rectangularBounds) {
        // expand the latitude bounds as much as possible without self-intersection, assuming no latitude bounds
        for (var i = 0; i <= 50; i++) {
            var φ = projection.φMin + i / 50 * (projection.φMax - projection.φMin);
            if (Math.abs(projection.parallelCurvature(φ)) <= 1) {
                φMax = Math.max(φMax, φ);
                φMin = Math.min(φMin, φ);
            }
        }
        // then expand the longitude bounds as much as possible without self-intersection
        var limitingΔλ = 2 * Math.PI;
        for (var i = 0; i <= 50; i++) {
            var φ = φMin + i / 50 * (φMax - φMin);
            var parallelCurvature = projection.parallelCurvature(φ);
            limitingΔλ = Math.min(limitingΔλ, 2 * Math.PI / Math.abs(parallelCurvature));
        }
        if (limitingΔλ === 2 * Math.PI) {
            λMin = projection.λMin;
            λMax = projection.λMax;
        }
        else {
            λMin = Math.max(Math.min(λMin, projection.λCenter - limitingΔλ / 2), projection.λMin);
            λMax = Math.min(Math.max(λMax, projection.λCenter + limitingΔλ / 2), projection.λMax);
        }
    }
    // cut out the poles if desired
    var straightMeridians = projection.hasStraightMeridians();
    if (northPoleIsDistant || (northPoleIsPoint && !straightMeridians))
        φMax = Math.max(Math.min(φMax, projection.φMax - 5 / 180 * Math.PI), φMin);
    if (southPoleIsDistant || (southPoleIsPoint && !straightMeridians))
        φMin = Math.min(Math.max(φMin, projection.φMin + 5 / 180 * Math.PI), φMax);
    // set the geographic limits of the mapped area
    var geoEdges;
    if (projection.wrapsAround() && λMin === projection.λMin && λMax === projection.λMax)
        geoEdges = [
            { type: 'M', args: [φMax, λMax] },
            { type: 'Φ', args: [φMax, λMin] },
            { type: 'L', args: [φMax, λMax] },
            { type: 'M', args: [φMin, λMin] },
            { type: 'Φ', args: [φMin, λMax] },
            { type: 'L', args: [φMin, λMin] },
        ];
    else
        geoEdges = rectangle(φMax, λMax, φMin, λMin, true);
    return { φMin: φMin, φMax: φMax, λMin: λMin, λMax: λMax, geoEdges: geoEdges };
}
/**
 * create a new <g> element under the given parent
 */
function createSVGGroup(parent, id) {
    var g = h('g', { id: id });
    parent.children.push(g);
    return g;
}
/**
 * calculate how long a string will be when written out
 */
function calculateStringLength(characterWidthMap, text) {
    var length = 0;
    for (var i = 0; i < text.length; i++) {
        if (!characterWidthMap.has(text[i])) {
            console.error("unrecognized character: '".concat(text[i], "'"));
            characterWidthMap.set(text[i], characterWidthMap.get("m"));
        }
        length += characterWidthMap.get(text[i]);
    }
    return length;
}
/** an object that contains all the information you need to transform points from the globe to the map */
var Transform = /** @class */ (function () {
    function Transform(projection, geoEdges, mapEdges, orientation, scale) {
        this.projection = projection;
        this.geoEdges = geoEdges;
        this.mapEdges = mapEdges;
        this.orientation = orientation;
        this.scale = scale;
    }
    return Transform;
}());
/**
 * a simple record to efficiently represent the size and shape of a rectangle
 */
var Dimensions = /** @class */ (function () {
    function Dimensions(left, right, top, bottom) {
        if (left >= right || top >= bottom)
            throw new Error("the axis bounds ".concat(left, ", ").concat(right, ", ").concat(top, ", ").concat(bottom, " are invalid."));
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
        this.width = this.right - this.left;
        this.height = this.bottom - this.top;
        this.diagonal = Math.hypot(this.width, this.height);
        this.area = this.width * this.height;
    }
    Dimensions.prototype.rotate = function (angle) {
        if (angle === 0)
            return this;
        else if (angle === 90)
            return new Dimensions(this.top, this.bottom, -this.right, -this.left);
        else if (angle === 180)
            return new Dimensions(-this.right, -this.left, -this.bottom, -this.top);
        else if (angle === 270)
            return new Dimensions(-this.bottom, -this.top, this.left, this.right);
        else
            throw new Error("bruh");
    };
    Dimensions.prototype.scale = function (factor) {
        return new Dimensions(factor * this.left, factor * this.right, factor * this.top, factor * this.bottom);
    };
    Dimensions.prototype.offset = function (margin) {
        return new Dimensions(this.left - margin, this.right + margin, this.top - margin, this.bottom + margin);
    };
    return Dimensions;
}());
//# sourceMappingURL=chart.js.map