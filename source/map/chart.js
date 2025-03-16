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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { EmptySpace, INFINITE_PLANE } from "../surface/surface.js";
import { filterSet, localizeInRange, longestShortestPath, pathToString, Side } from "../utilities/miscellaneus.js";
import { MapProjection } from "./projection.js";
import { delaunayTriangulate } from "../utilities/delaunay.js";
import { circularRegression } from "../utilities/fitting.js";
import { ErodingSegmentTree } from "../datastructures/erodingsegmenttree.js";
import { assert_xy, endpoint } from "../utilities/coordinates.js";
import { arcCenter, Vector } from "../utilities/geometry.js";
import { ARABILITY, Biome } from "../generation/terrain.js";
import { applyProjectionToPath, calculatePathBounds, contains, convertPathClosuresToZ, intersection, transformInput, transformOutput } from "./pathutilities.js";
// DEBUG OPTIONS
var DISABLE_GREEBLING = false; // make all lines as simple as possible
var SMOOTH_RIVERS = false; // make rivers out of bezier curves so there's no sharp corners
var COLOR_BY_PLATE = false; // choropleth the land by plate index rather than whatever else
var COLOR_BY_TECHNOLOGY = false; // choropleth the countries by technological level rather than categorical colors
var SHOW_BACKGROUND = false; // have a big red rectangle under the map
// OTHER FIXED DISPLAY OPTIONS
var GREEBLE_FACTOR = 1e-2; // the smallest edge lengths to show relative to the map size
var SUN_ELEVATION = 60 / 180 * Math.PI;
var AMBIENT_LIGHT = 0.2;
var RIVER_DISPLAY_FACTOR = 6e-2; // the watershed area relative to the map area needed to display a river
var BORDER_SPECIFY_THRESHOLD = 0.51;
var SIMPLE_PATH_LENGTH = 72; // maximum number of vertices for estimating median axis
var N_DEGREES = 6; // number of line segments into which to break one radian of arc
var RALF_NUM_CANDIDATES = 6; // number of sizeable longest shortest paths to try using for the label
var MAP_PRECISION = 5e-2;
var EGGSHELL = '#FAF2E4';
var LIGHT_GRAY = '#d4cdbf';
var DARK_GRAY = '#857f76';
var CHARCOAL = '#302d28';
var BLUE = '#5A7ECA';
var AZURE = '#C6ECFF';
var BIOME_COLORS = new Map([
    [Biome.LAKE, '#5A7ECA'],
    [Biome.JUNGLE, '#82C17A'],
    [Biome.FOREST, '#B0C797'],
    [Biome.TAIGA, '#9FE0B0'],
    [Biome.STEAMLAND, '#A1A17E'],
    [Biome.PLAINS, '#D9E88A'],
    [Biome.DESERT, '#FCF0B7'],
    [Biome.TUNDRA, '#FFFFFF'],
    [Biome.ICE, '#FFFFFF'],
]);
var COUNTRY_COLORS = [
    'rgb(230, 169, 187)',
    'rgb(143, 211, 231)',
    'rgb(232, 212, 167)',
    'rgb(188, 165, 210)',
    'rgb(137, 200, 178)',
    'rgb(246, 187, 177)',
    'rgb(181, 221, 261)',
    'rgb(165, 180, 133)',
    'rgb(226, 173, 206)',
    'rgb(142, 216, 220)',
    'rgb(249, 210, 175)',
    'rgb(173, 173, 220)',
    'rgb(154, 202, 166)',
    'rgb(251, 188, 196)',
    'rgb(169, 228, 257)',
    'rgb(185, 179, 132)',
    'rgb(217, 180, 223)',
    'rgb(150, 220, 207)',
    'rgb(262, 208, 188)',
    'rgb(157, 181, 225)',
    'rgb(173, 202, 157)',
    'rgb(251, 191, 215)',
    'rgb(163, 235, 249)',
    'rgb(203, 177, 136)',
    'rgb(204, 188, 236)',
    'rgb(164, 222, 194)',
    'rgb(271, 208, 205)',
    'rgb(142, 189, 225)',
    'rgb(194, 201, 152)',
    'rgb(245, 197, 234)',
    'rgb(165, 239, 237)',
    'rgb(218, 175, 146)',
    'rgb(188, 197, 244)',
    'rgb(182, 223, 182)',
    'rgb(274, 210, 224)',
    'rgb(131, 196, 219)',
];
var ALTITUDE_STEP = 0.5;
var ALTITUDE_COLORS = [
    'rgb(114, 184, 91)',
    'rgb(153, 192, 94)',
    'rgb(187, 201, 96)',
    'rgb(215, 210, 122)',
    'rgb(229, 225, 162)',
    'rgb(243, 240, 201)',
];
var DEPTH_STEP = 1.0;
var DEPTH_COLORS = [
    'rgb(85, 165, 178)',
    'rgb(37, 138, 178)',
    'rgb(42, 106, 171)',
    'rgb(59, 72, 151)',
];
var Layer;
(function (Layer) {
    Layer[Layer["GEO"] = 0] = "GEO";
    Layer[Layer["BIO"] = 1] = "BIO";
    Layer[Layer["KULTUR"] = 2] = "KULTUR";
})(Layer || (Layer = {}));
/**
 * a class to handle all of the graphical arrangement stuff.
 */
var Chart = /** @class */ (function () {
    /**
     * build an object for visualizing geographic information in SVG.
     * @param projectionName the type of projection to choose – one of "equal_earth", "bonne", "conformal_conic", or "orthographic"
     * @param surface the Surface for which to design the projection
     * @param regionOfInterest the map focus, for the purposes of tailoring the map projection and setting the bounds
     * @param orientationName the cardinal direction that should correspond to up – one of "north", "south", "east", or "west"
     * @param rectangularBounds whether to make the bounding box as rectangular as possible, rather than having it conform to the graticule
     */
    function Chart(projectionName, surface, regionOfInterest, orientationName, rectangularBounds) {
        var _a = Chart.chooseMapCentering(regionOfInterest, surface), centralMeridian = _a.centralMeridian, centralParallel = _a.centralParallel, meanRadius = _a.meanRadius;
        var southLimitingParallel = Math.max(surface.φMin, centralParallel - Math.PI);
        var northLimitingParallel = Math.min(surface.φMax, southLimitingParallel + 2 * Math.PI);
        if (projectionName === 'equal_earth')
            this.projection = MapProjection.equalEarth(surface, meanRadius, southLimitingParallel, northLimitingParallel, centralMeridian);
        else if (projectionName === 'bonne')
            this.projection = MapProjection.bonne(surface, southLimitingParallel, centralParallel, northLimitingParallel, centralMeridian);
        else if (projectionName === 'conformal_conic')
            this.projection = MapProjection.conformalConic(surface, southLimitingParallel, centralParallel, northLimitingParallel, centralMeridian);
        else if (projectionName === 'orthographic')
            this.projection = MapProjection.orthographic(surface, southLimitingParallel, northLimitingParallel, centralMeridian);
        else
            throw new Error("no jana metode da graflance: '".concat(projectionName, "'."));
        if (orientationName === 'north')
            this.orientation = 0;
        else if (orientationName === 'south')
            this.orientation = 180;
        else if (orientationName === 'east')
            this.orientation = 90;
        else if (orientationName === 'west')
            this.orientation = 270;
        else
            throw new Error("I don't recognize this direction: '".concat(orientationName, "'."));
        // establish the bounds of the map
        var _b = Chart.chooseMapBounds(intersection(transformInput(this.projection, Chart.border(regionOfInterest)), Chart.rectangle(this.projection.φMax, this.projection.λMax, this.projection.φMin, this.projection.λMin, true), this.projection.domain, true), this.projection, rectangularBounds), φMin = _b.φMin, φMax = _b.φMax, λMin = _b.λMin, λMax = _b.λMax, xRight = _b.xRight, xLeft = _b.xLeft, yBottom = _b.yBottom, yTop = _b.yTop;
        this.labelIndex = 0;
        // flip them if it's a south-up map
        if (this.orientation === 0)
            this.dimensions = new Dimensions(xLeft, xRight, yTop, yBottom);
        else if (this.orientation === 90)
            this.dimensions = new Dimensions(yTop, yBottom, -xRight, -xLeft);
        else if (this.orientation === 180)
            this.dimensions = new Dimensions(-xRight, -xLeft, -yBottom, -yTop);
        else if (this.orientation === 270)
            this.dimensions = new Dimensions(-yBottom, -yTop, xLeft, xRight);
        else
            throw new Error("bruh");
        // calculate the map scale in map-widths per km
        this.scale = 1 / this.dimensions.diagonal;
        // set the geographic and Cartesian limits of the mapped area
        if (λMax - λMin === 2 * Math.PI && this.projection.wrapsAround())
            this.geoEdges = [
                { type: 'M', args: [φMax, λMax] },
                { type: 'Φ', args: [φMax, λMin] },
                { type: 'M', args: [φMin, λMin] },
                { type: 'Φ', args: [φMin, λMax] },
            ];
        else
            this.geoEdges = Chart.rectangle(φMax, λMax, φMin, λMin, true);
        this.mapEdges = Chart.rectangle(this.dimensions.left, this.dimensions.top, this.dimensions.right, this.dimensions.bottom, false);
    }
    /**
     * do your thing
     * @param surface the surface that we're mapping
     * @param world the world on that surface, if we're mapping human features
     * @param svg the SVG element on which to draw everything
     * @param landColor the color scheme for the land areas
     * @param seaColor the color scheme for the ocean areas
     * @param rivers whether to add rivers
     * @param borders whether to add state borders
     * @param shading whether to add shaded relief
     * @param civLabels whether to label countries
     * @param geoLabels whether to label mountain ranges and seas
     * @param fontSize the size of city labels and minimum size of country and biome labels [pt]
     * @param style the transliteration convention to use for them
     * @return the list of Civs that are shown in this map
     */
    Chart.prototype.depict = function (surface, world, svg, landColor, seaColor, rivers, borders, shading, civLabels, geoLabels, fontSize, style) {
        var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
        if (fontSize === void 0) { fontSize = 2; }
        if (style === void 0) { style = null; }
        var bbox = this.dimensions;
        svg.setAttribute('viewBox', "".concat(bbox.left, " ").concat(bbox.top, " ").concat(bbox.width, " ").concat(bbox.height));
        svg.textContent = ''; // clear the image
        // set the basic overarching styles
        var styleSheet = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleSheet.innerHTML = '.map-label { font-family: "Noto Serif","Times New Roman","Times",serif; text-anchor: middle; alignment-baseline: middle; }';
        svg.appendChild(styleSheet);
        // add a layer for all the map data
        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('id', 'generated-map');
        svg.appendChild(g);
        this.testTextSize = Math.min((bbox.width) / 18, bbox.height);
        this.testText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        this.testText.setAttribute('class', 'map-label');
        this.testText.setAttribute('style', "font-size: ".concat(this.testTextSize, "px;"));
        svg.appendChild(this.testText);
        if (SHOW_BACKGROUND) {
            var rectangle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rectangle.setAttribute('x', "".concat(this.dimensions.left));
            rectangle.setAttribute('y', "".concat(this.dimensions.top));
            rectangle.setAttribute('width', "".concat(this.dimensions.width));
            rectangle.setAttribute('height', "".concat(this.dimensions.height));
            rectangle.setAttribute('style', 'fill: red; stroke: black; stroke-width: 10px');
            g.appendChild(rectangle);
        }
        // decide what color the rivers will be
        var waterFill;
        var waterStroke;
        if (COLOR_BY_PLATE) {
            waterFill = 'none';
            waterStroke = CHARCOAL;
        }
        else if (seaColor === 'white') {
            waterFill = EGGSHELL;
            waterStroke = CHARCOAL;
        }
        else if (seaColor === 'gray') {
            waterFill = DARK_GRAY;
            waterStroke = DARK_GRAY;
        }
        else if (seaColor === 'black') {
            waterFill = CHARCOAL;
            waterStroke = CHARCOAL;
        }
        else if (seaColor === 'blue') {
            waterFill = BLUE;
            waterStroke = BLUE;
        }
        else if (seaColor === 'azure') {
            waterFill = AZURE;
            waterStroke = BLUE;
        }
        else if (seaColor === 'heightmap') { // color the sea by altitude
            var _loop_1 = function (i) {
                var min = (i !== 0) ? i * DEPTH_STEP : -Infinity;
                var max = (i !== DEPTH_COLORS.length - 1) ? (i + 1) * DEPTH_STEP : Infinity;
                this_1.fill(filterSet(surface.tiles, function (n) { return n.biome === Biome.OCEAN && -n.height >= min && -n.height < max; }), g, DEPTH_COLORS[i], Layer.GEO); // TODO: enforce contiguity of shallow ocean?
            };
            var this_1 = this;
            for (var i = 0; i < DEPTH_COLORS.length; i++) {
                _loop_1(i);
            }
            waterFill = 'none';
            waterStroke = DEPTH_COLORS[0];
        }
        // color in the land
        if (COLOR_BY_PLATE) {
            var _loop_2 = function (i) {
                this_2.fill(filterSet(surface.tiles, function (n) { return n.plateIndex === i; }), g, COUNTRY_COLORS[i], Layer.GEO);
            };
            var this_2 = this;
            for (var i = 0; i < 14; i++) {
                _loop_2(i);
            }
        }
        else if (landColor === 'white') {
            this.fill(filterSet(surface.tiles, function (n) { return n.biome !== Biome.OCEAN; }), g, EGGSHELL, Layer.BIO);
        }
        else if (landColor === 'gray') {
            this.fill(filterSet(surface.tiles, function (n) { return n.biome !== Biome.OCEAN; }), g, LIGHT_GRAY, Layer.BIO);
        }
        else if (landColor === 'physical') { // draw the biomes
            var _loop_3 = function (biome) {
                if (biome === Biome.LAKE)
                    this_3.fill(filterSet(surface.tiles, function (n) { return n.biome === biome; }), g, waterFill, Layer.BIO);
                else if (biome !== Biome.OCEAN)
                    this_3.fill(filterSet(surface.tiles, function (n) { return n.biome === biome; }), g, BIOME_COLORS.get(biome), Layer.BIO);
            };
            var this_3 = this;
            try {
                for (var _e = __values(BIOME_COLORS.keys()), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var biome = _f.value;
                    _loop_3(biome);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        else if (landColor === 'political') { // draw the countries
            if (world === null)
                throw new Error("this Chart was asked to color land politicly but the provided World was null");
            this.fill(filterSet(surface.tiles, function (n) { return n.biome !== Biome.OCEAN; }), g, EGGSHELL, Layer.KULTUR);
            var biggestCivs = world.getCivs(true).reverse();
            var numFilledCivs = 0;
            for (var i = 0; biggestCivs.length > 0; i++) {
                var civ = biggestCivs.pop();
                var color = void 0;
                if (COLOR_BY_TECHNOLOGY) {
                    console.log("".concat(civ.getName().toString(), " has advanced to ").concat(civ.technology.toFixed(1)));
                    color = "rgb(".concat(Math.max(0, Math.min(210, Math.log(civ.technology) * 128 - 360)), ", ") +
                        "".concat(Math.max(0, Math.min(210, Math.log(civ.technology) * 128)), ", ") +
                        "".concat(Math.max(0, Math.min(210, Math.log(civ.technology) * 128 - 180)), ")");
                }
                else {
                    if (numFilledCivs >= COUNTRY_COLORS.length)
                        break;
                    else
                        color = COUNTRY_COLORS[numFilledCivs];
                }
                var fill = this.fill(filterSet(civ.tileTree.keys(), function (n) { return n.biome !== Biome.OCEAN; }), g, color, Layer.KULTUR);
                if (fill.getAttribute("d").length > 0)
                    numFilledCivs++;
            }
        }
        else if (landColor === 'heightmap') { // color the sea by altitude
            var _loop_4 = function (i) {
                var min = (i !== 0) ? i * ALTITUDE_STEP : -Infinity;
                var max = (i !== ALTITUDE_COLORS.length - 1) ? (i + 1) * ALTITUDE_STEP : Infinity;
                this_4.fill(filterSet(surface.tiles, function (n) { return n.biome !== Biome.OCEAN && n.height >= min && n.height < max; }), g, ALTITUDE_COLORS[i], Layer.GEO);
            };
            var this_4 = this;
            for (var i = 0; i < ALTITUDE_COLORS.length; i++) {
                _loop_4(i);
            }
        }
        // add rivers
        if (rivers) {
            var riverDisplayThreshold_1 = RIVER_DISPLAY_FACTOR * this.dimensions.area;
            this.stroke(__spreadArray([], __read(surface.rivers), false).filter(function (ud) { return ud[0].flow >= riverDisplayThreshold_1; }), g, waterStroke, 1.4, Layer.GEO);
        }
        // color in the sea
        this.fill(filterSet(surface.tiles, function (n) { return n.biome === Biome.OCEAN; }), g, waterFill, Layer.GEO, waterStroke, 0.7);
        // add borders with hovertext
        if (borders) {
            if (world === null)
                throw new Error("this Chart was asked to draw political borders but the provided World was null");
            try {
                for (var _g = __values(world.getCivs()), _h = _g.next(); !_h.done; _h = _g.next()) {
                    var civ = _h.value;
                    // if (civ.getPopulation() > 0) {
                    var titledG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    var hover = document.createElementNS('http://www.w3.org/2000/svg', 'title');
                    var text = document.createTextNode("".concat(civ.getName().toString(style), "\n") +
                        "[".concat(civ.getName().toString('ipa'), "]"));
                    hover.appendChild(text);
                    titledG.appendChild(hover);
                    g.appendChild(titledG);
                    this.fill(filterSet(civ.tileTree.keys(), function (n) { return n.biome !== Biome.OCEAN; }), titledG, 'none', Layer.KULTUR, CHARCOAL, 0.7).setAttribute('pointer-events', 'all');
                    // }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        // add relief shadows
        if (shading) {
            this.shade(surface.vertices, g);
        }
        // label everything
        if (civLabels) {
            if (world === null)
                throw new Error("this Chart was asked to label countries but the provided World was null");
            try {
                for (var _j = __values(world.getCivs()), _k = _j.next(); !_k.done; _k = _j.next()) {
                    var civ = _k.value;
                    if (civ.getPopulation() > 0)
                        this.label(__spreadArray([], __read(civ.tileTree.keys()), false).filter(function (n) { return !n.isWater(); }), // TODO: do something fancier... maybe the intersection of the voronoi space and the convex hull
                        civ.getName().toString(style), svg, fontSize);
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
        // add an outline to the whole thing
        this.fill(surface.tiles, g, 'none', Layer.GEO, 'black', 1.4);
        if (world !== null) {
            // finally, check which Civs are on this map
            // (this is somewhat inefficient, since it probably already calculated this, but it's pretty quick, so I think it's fine)
            var visible = [];
            try {
                for (var _l = __values(world.getCivs(true)), _m = _l.next(); !_m.done; _m = _l.next()) {
                    var civ = _m.value;
                    if (this.projectPath(Chart.convertToGreebledPath(Chart.outline(__spreadArray([], __read(civ.tileTree.keys()), false).filter(function (n) { return !n.isWater(); })), Layer.KULTUR, this.scale), true).length > 0)
                        visible.push(civ);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
                }
                finally { if (e_4) throw e_4.error; }
            }
            return visible;
        }
        else {
            return null;
        }
    };
    /**
     * draw a region of the world on the map with the given color.
     * @param tiles Iterator of Tiles to be colored in.
     * @param svg object on which to put the Path.
     * @param color color of the interior.
     * @param greeble what kind of edge it is for the purposes of greebling
     * @param stroke color of the outline.
     * @param strokeWidth the width of the outline to put around it (will match fill color).
     * @return the newly created element encompassing these tiles.
     */
    Chart.prototype.fill = function (tiles, svg, color, greeble, stroke, strokeWidth) {
        if (stroke === void 0) { stroke = 'none'; }
        if (strokeWidth === void 0) { strokeWidth = 0; }
        if (tiles.size <= 0)
            return this.draw([], svg);
        var segments = convertPathClosuresToZ(this.projectPath(Chart.convertToGreebledPath(Chart.outline(tiles), greeble, this.scale), true));
        var path = this.draw(segments, svg);
        path.setAttribute('style', "fill: ".concat(color, "; stroke: ").concat(stroke, "; stroke-width: ").concat(strokeWidth, "; stroke-linejoin: round;"));
        return path;
    };
    /**
     * draw a series of lines on the map with the giver color.
     * @param strokes the Iterable of lists of points to connect and draw.
     * @param svg SVG object on which to put the Path.
     * @param color String that HTML can interpret as a color.
     * @param width the width of the stroke
     * @param greeble what kind of edge it is for the purposes of greebling
     * @returns the newly created element comprising all these lines
     */
    Chart.prototype.stroke = function (strokes, svg, color, width, greeble) {
        var segments = this.projectPath(Chart.convertToGreebledPath(Chart.aggregate(strokes), greeble, this.scale), false);
        if (SMOOTH_RIVERS)
            segments = Chart.smooth(segments);
        var path = this.draw(segments, svg);
        path.setAttribute('style', "fill: none; stroke: ".concat(color, "; stroke-width: ").concat(width, "; stroke-linejoin: round; stroke-linecap: round;"));
        return path;
    };
    /**
     * create a relief layer for the given set of triangles.
     * @param triangles Array of Vertexes to shade as triangles.
     * @param svg SVG object on which to shade.
     */
    Chart.prototype.shade = function (triangles, svg) {
        var e_5, _a, e_6, _b, e_7, _c, e_8, _d;
        if (!triangles)
            return;
        var slopes = new Map();
        var maxSlope = 0;
        try {
            triangleSearch: for (var triangles_1 = __values(triangles), triangles_1_1 = triangles_1.next(); !triangles_1_1.done; triangles_1_1 = triangles_1.next()) { // start by computing slopes of all of the triangles
                var t = triangles_1_1.value;
                var p = [];
                try {
                    for (var _e = (e_6 = void 0, __values(t.tiles)), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var node = _f.value;
                        if (node instanceof EmptySpace)
                            continue triangleSearch;
                        var _g = this.projection.projectPoint(node), x = _g.x, y = _g.y;
                        var z = Math.max(0, node.height);
                        p.push(new Vector(x, -y, z));
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
                var n = p[1].minus(p[0]).cross(p[2].minus(p[0])).normalized();
                slopes.set(t, n.y / n.z);
                if (n.z > 0 && slopes.get(t) > maxSlope)
                    maxSlope = slopes.get(t);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (triangles_1_1 && !triangles_1_1.done && (_a = triangles_1.return)) _a.call(triangles_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        var heightScale = -Math.tan(2 * SUN_ELEVATION) / maxSlope; // use that to normalize
        try {
            for (var triangles_2 = __values(triangles), triangles_2_1 = triangles_2.next(); !triangles_2_1.done; triangles_2_1 = triangles_2.next()) { // for each triangle TODO: use a newly generated triangulation
                var t = triangles_2_1.value;
                if (!slopes.has(t))
                    continue;
                var path = [];
                try {
                    for (var _h = (e_8 = void 0, __values(t.tiles)), _j = _h.next(); !_j.done; _j = _h.next()) {
                        var node = _j.value;
                        path.push({ type: 'L', args: [node.φ, node.λ] });
                    } // put its values in a plottable form
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (_j && !_j.done && (_d = _h.return)) _d.call(_h);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
                path.push({ type: 'L', args: __spreadArray([], __read(path[0].args), false) });
                path[0].type = 'M';
                var brightness = AMBIENT_LIGHT + (1 - AMBIENT_LIGHT) * Math.max(0, Math.sin(SUN_ELEVATION + Math.atan(heightScale * slopes.get(t)))); // and use that to get a brightness
                this.draw(this.projectPath(path, true), svg).setAttribute('style', "fill: '#000'; fill-opacity: ".concat(1 - brightness, ";"));
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (triangles_2_1 && !triangles_2_1.done && (_c = triangles_2.return)) _c.call(triangles_2);
            }
            finally { if (e_7) throw e_7.error; }
        }
    };
    /**
     * add some text to this region using a simplified form of the RALF labelling
     * algorithm, described in
     *     Krumpe, F. and Mendel, T. (2020) "Computing Curved Area Labels in Near-Real Time"
     *     (Doctoral dissertation). University of Stuttgart, Stuttgart, Germany.
     *     https://arxiv.org/abs/2001.02938 TODO: try horizontal labels: https://github.com/mapbox/polylabel
     * @param tiles the Nodos that comprise the region to be labelled.
     * @param label the text to place.
     * @param svg the SVG object on which to write the label.
     * @param minFontSize the smallest the label can be. if the label cannot fit inside
     *                    the region with this font size, no label will be placed and it
     *                    will return null.
     */
    Chart.prototype.label = function (tiles, label, svg, minFontSize) {
        var e_9, _a, e_10, _b, e_11, _c, e_12, _d;
        if (tiles.length === 0)
            throw new Error("there must be at least one tile to label");
        this.testText.textContent = '..' + label + '..';
        var boundBox = this.testText.getBoundingClientRect(); // to calibrate the font sizes, measure the size of some test text in px
        this.testText.textContent = '';
        var mapScale = svg.clientWidth / this.dimensions.width; // and also the current size of the map in px for reference
        var aspect = boundBox.width / (this.testTextSize * mapScale);
        minFontSize = minFontSize / mapScale; // TODO: at some point, I probably have to grapple with the printed width of the map.
        var path = this.projectPath(// do the projection
        Chart.convertToGreebledPath(Chart.outline(new Set(tiles)), Layer.KULTUR, this.scale), true);
        if (path.length === 0)
            return null;
        for (var i = path.length - 1; i >= 1; i--) { // convert it into a simplified polygon
            if (path[i].type === 'A') { // turn arcs into triscadecagons TODO: find out if this can create coincident nodes and thereby Delaunay Triangulation to fail
                var start = assert_xy(endpoint(path[i - 1]));
                var end = assert_xy(endpoint(path[i]));
                var l = Math.hypot(end.x - start.x, end.y - start.y);
                var r = Math.abs(path[i].args[0] + path[i].args[1]) / 2;
                var c = arcCenter(start, end, r, path[i].args[3] === path[i].args[4]);
                var Δθ = 2 * Math.asin(l / (2 * r));
                var θ0 = Math.atan2(start.y - c.y, start.x - c.x);
                var nSegments = Math.ceil(N_DEGREES * Δθ);
                var lineApprox = [];
                for (var j = 1; j <= nSegments; j++)
                    lineApprox.push({ type: 'L', args: [
                            c.x + r * Math.cos(θ0 + Δθ * j / nSegments),
                            c.y + r * Math.sin(θ0 + Δθ * j / nSegments)
                        ] });
                path.splice.apply(path, __spreadArray([i, 1], __read(lineApprox), false));
            }
        }
        while (path.length > SIMPLE_PATH_LENGTH) { // simplify path
            var shortI = -1, minL = Infinity;
            for (var i = 1; i < path.length - 1; i++) {
                if (path[i].type === 'L' && path[i + 1].type === 'L') {
                    var l = Math.hypot(path[i + 1].args[0] - path[i - 1].args[0], path[i + 1].args[1] - path[i - 1].args[1]);
                    if (l < minL) { // find the vertex whose removal results in the shortest line segment
                        minL = l;
                        shortI = i;
                    }
                }
            }
            path.splice(shortI, 1); // and remove it
        }
        while (path.length < SIMPLE_PATH_LENGTH / 2) { // complicate path
            var longI = -1, maxL = -Infinity;
            for (var i = 1; i < path.length; i++) {
                if (path[i].type === 'L') {
                    var l = Math.hypot(path[i].args[0] - path[i - 1].args[0], path[i].args[1] - path[i - 1].args[1]);
                    if (l > maxL) { // find the longest line segment
                        maxL = l;
                        longI = i;
                    }
                }
            }
            console.assert(longI >= 0, path);
            path.splice(longI, 0, {
                type: 'L',
                args: [(path[longI].args[0] + path[longI - 1].args[0]) / 2, (path[longI].args[1] + path[longI - 1].args[1]) / 2]
            });
        }
        // estimate skeleton
        var points = [];
        try {
            for (var path_1 = __values(path), path_1_1 = path_1.next(); !path_1_1.done; path_1_1 = path_1.next()) {
                var segment = path_1_1.value;
                if (segment.type === 'L')
                    points.push(new Vector(segment.args[0], -segment.args[1], 0));
            } // note the minus sign: all calculations will be done with a sensibly oriented y axis
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (path_1_1 && !path_1_1.done && (_a = path_1.return)) _a.call(path_1);
            }
            finally { if (e_9) throw e_9.error; }
        }
        var triangulation = delaunayTriangulate(points); // start with a Delaunay triangulation of the border
        var centers = [];
        for (var i = 0; i < triangulation.triangles.length; i++) { // then convert that into a voronoi graph
            var abc = triangulation.triangles[i];
            var a = points[abc[0]];
            var b = points[abc[1]];
            var c = points[abc[2]];
            var D = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
            centers.push({
                x: (a.sqr() * (b.y - c.y) + b.sqr() * (c.y - a.y) + c.sqr() * (a.y - b.y)) / D, // calculating the circumcenters
                y: (a.sqr() * (c.x - b.x) + b.sqr() * (a.x - c.x) + c.sqr() * (b.x - a.x)) / D,
                r: 0, isContained: false, edges: new Array(triangulation.triangles.length).fill(null),
            });
            centers[i].r = Math.hypot(a.x - centers[i].x, a.y - centers[i].y);
            centers[i].isContained = contains(// build a graph out of the contained centers
            path, { s: centers[i].x, t: -centers[i].y }, INFINITE_PLANE) !== Side.OUT; // (we're counting "borderline" as in)
            if (centers[i].isContained) {
                for (var j = 0; j < i; j++) {
                    if (centers[j].isContained) {
                        var def = triangulation.triangles[j]; // and recording adjacency
                        triangleFit: // TODO: what is this code doing? add better comments, and see if it can be made more efficient.
                         for (var k = 0; k < 3; k++) {
                            for (var l = 0; l < 3; l++) {
                                if (abc[k] === def[(l + 1) % 3] && abc[(k + 1) % 3] === def[l]) {
                                    var a_1 = new Vector(centers[i].x, centers[i].y, 0);
                                    var c_1 = new Vector(centers[j].x, centers[j].y, 0);
                                    var b_1 = points[abc[k]], d = points[abc[(k + 1) % 3]];
                                    var length_1 = Math.sqrt(a_1.minus(c_1).sqr()); // compute the length of this edge
                                    var clearance = // estimate of minimum space around this edge
                                     void 0; // estimate of minimum space around this edge
                                    var mid = b_1.plus(d).over(2);
                                    if (a_1.minus(mid).dot(c_1.minus(mid)) < 0)
                                        clearance = Math.sqrt(b_1.minus(d).sqr()) / 2;
                                    else
                                        clearance = Math.min(centers[i].r, centers[j].r);
                                    centers[i].edges[j] = centers[j].edges[i] = { length: length_1, clearance: clearance };
                                    break triangleFit;
                                }
                            }
                        }
                    }
                }
            }
        }
        var argmax = -1;
        for (var i = 0; i < centers.length; i++) { // find the circumcenter with the greatest clearance
            if (centers[i].isContained && (argmax < 0 || centers[i].r > centers[argmax].r))
                argmax = i;
        }
        console.assert(argmax >= 0, label, points, centers);
        var candidates = []; // next collect candidate paths along which you might fit labels
        var minClearance = centers[argmax].r;
        while (candidates.length < RALF_NUM_CANDIDATES && minClearance >= minFontSize) {
            minClearance /= 1.4; // gradually loosen a minimum clearance filter, until it is slitely smaller than the smallest font size
            var minLength = minClearance * aspect;
            var usedPoints = new Set();
            while (usedPoints.size < centers.length) {
                var newEndpoint = longestShortestPath(centers, (usedPoints.size > 0) ? usedPoints : new Set([argmax]), minClearance).points[0]; // find the point farthest from the paths you have checked TODO expand on this argmax thing to make sure check every exclave fore we start reducing the minimum
                if (usedPoints.has(newEndpoint))
                    break;
                var newShortestPath = longestShortestPath(centers, new Set([newEndpoint]), minClearance); // find a new diverse longest shortest path with that as endpoin
                if (newShortestPath.length >= minLength) { // if the label will fit,
                    candidates.push(newShortestPath.points); // take it
                    try {
                        for (var _e = (e_10 = void 0, __values(newShortestPath.points)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var point = _f.value;
                            usedPoints.add(point);
                        } // and look for a different one
                    }
                    catch (e_10_1) { e_10 = { error: e_10_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_10) throw e_10.error; }
                    }
                }
                else // if it won't
                    break; // reduce the required clearance and try again
            }
        }
        if (candidates.length === 0)
            return null;
        var axisValue = -Infinity;
        var axisR = null, axisCx = null, axisCy = null, axisΘL = null, axisΘR = null, axisH = null;
        try {
            for (var candidates_1 = __values(candidates), candidates_1_1 = candidates_1.next(); !candidates_1_1.done; candidates_1_1 = candidates_1.next()) { // for each candidate label axis
                var candidate = candidates_1_1.value;
                if (candidate.length < 3)
                    continue; // with at least three points
                var _g = circularRegression(candidate.map(function (i) { return centers[i]; })), R = _g.R, cx = _g.cx, cy = _g.cy;
                var midpoint = centers[candidate[Math.trunc(candidate.length / 2)]];
                var circularPoints = []; // get polygon segments in circular coordinates
                var θ0 = Math.atan2(midpoint.y - cy, midpoint.x - cx);
                for (var i = 0; i < points.length; i++) {
                    var _h = points[i], x = _h.x, y = _h.y;
                    var θ = (Math.atan2(y - cy, x - cx) - θ0 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
                    var r = Math.hypot(x - cx, y - cy);
                    var xp = R * θ, yp = R - r;
                    circularPoints.push({ x: xp, y: yp });
                }
                var xMin = -Math.PI * R, xMax = Math.PI * R; // TODO: move more of this into separate funccions
                var wedges = []; // get wedges from edges
                for (var i = 0; i < points.length; i++) { // there's a wedge associated with each pair of points
                    var p0 = circularPoints[i];
                    var p1 = circularPoints[(i + 1) % circularPoints.length];
                    var height = (p0.y < 0 === p1.y < 0) ? Math.min(Math.abs(p0.y), Math.abs(p1.y)) : 0;
                    var interpretations = [];
                    if (Math.abs(p1.x - p0.x) < Math.PI * R) {
                        interpretations.push([p0.x, p1.x, height]); // well, usually there's just one
                    }
                    else {
                        interpretations.push([p0.x, p1.x + 2 * Math.PI * R * Math.sign(p0.x), height]); // but sometimes there's clipping on the periodic boundary condition...
                        interpretations.push([p0.x + 2 * Math.PI * R * Math.sign(p1.x), p1.x, height]); // so you have to try wrapping p0 over to p1, and also p1 over to p0
                    }
                    try {
                        for (var interpretations_1 = (e_12 = void 0, __values(interpretations)), interpretations_1_1 = interpretations_1.next(); !interpretations_1_1.done; interpretations_1_1 = interpretations_1.next()) {
                            var _j = __read(interpretations_1_1.value, 3), x0 = _j[0], x1 = _j[1], y = _j[2];
                            if (height === 0) { // if this crosses the baseline, adjust the total bounds
                                if (x0 < 0 || x1 < 0)
                                    if (Math.max(x0, x1) > xMin)
                                        xMin = Math.max(x0, x1);
                                if (x0 > 0 || x1 > 0)
                                    if (Math.min(x0, x1) < xMax)
                                        xMax = Math.min(x0, x1);
                            }
                            else { // otherwise, add a floating wedge
                                wedges.push({
                                    xL: Math.min(x0, x1) - y * aspect,
                                    xR: Math.max(x0, x1) + y * aspect,
                                    y: y,
                                });
                            }
                        }
                    }
                    catch (e_12_1) { e_12 = { error: e_12_1 }; }
                    finally {
                        try {
                            if (interpretations_1_1 && !interpretations_1_1.done && (_d = interpretations_1.return)) _d.call(interpretations_1);
                        }
                        finally { if (e_12) throw e_12.error; }
                    }
                }
                if (xMin > xMax) // occasionally we get these really terrible candidates
                    continue; // just skip them
                wedges.sort(function (a, b) { return b.y - a.y; }); // TODO it would be slightly more efficient if I can merge wedges that share a min vertex
                var _k = Chart.findOpenSpotOnArc(xMin, xMax, aspect, wedges), location_1 = _k.location, halfHeight = _k.halfHeight;
                var area = halfHeight * halfHeight, bendRatio = halfHeight / R, horizontality = -Math.sin(θ0);
                if (horizontality < 0) // if it's going to be upside down
                    halfHeight *= -1; // flip it around
                var value = Math.log(area) - bendRatio / (1 - bendRatio) + Math.pow(horizontality, 2); // choose the axis with the biggest area and smallest curvature
                if (value > axisValue) {
                    axisValue = value;
                    axisR = R;
                    axisCx = cx;
                    axisCy = cy;
                    axisΘL = θ0 + location_1 / R - halfHeight * aspect / R;
                    axisΘR = θ0 + location_1 / R + halfHeight * aspect / R;
                    axisH = 2 * Math.abs(halfHeight); // TODO: enforce font size limit
                }
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (candidates_1_1 && !candidates_1_1.done && (_c = candidates_1.return)) _c.call(candidates_1);
            }
            finally { if (e_11) throw e_11.error; }
        }
        if (axisR === null) {
            console.error("all ".concat(candidates.length, " candidates were somehow incredible garbage"));
            return null;
        }
        // const axos = [];
        // for (const i of axis)
        // 	axos.push({type:'L', args:[centers[i].x, -centers[i].y]});
        // axos[0].type = 'M';
        // const drawing = this.draw(axos, svg);
        // drawing.setAttribute('style', 'stroke-width:.5px; fill:none; stroke:#004;');
        var arc = this.draw([
            { type: 'M', args: [
                    axisCx + axisR * Math.cos(axisΘL), -(axisCy + axisR * Math.sin(axisΘL))
                ] },
            { type: 'A', args: [
                    axisR, axisR, 0,
                    (Math.abs(axisΘR - axisΘL) < Math.PI) ? 0 : 1,
                    (axisΘR > axisΘL) ? 0 : 1,
                    axisCx + axisR * Math.cos(axisΘR), -(axisCy + axisR * Math.sin(axisΘR))
                ] },
        ], svg);
        // arc.setAttribute('style', `fill: none; stroke: #400; stroke-width: .5px;`);
        arc.setAttribute('style', "fill: none; stroke: none;");
        arc.setAttribute('id', "labelArc".concat(this.labelIndex));
        // svg.appendChild(arc);
        var textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'text'); // start by creating the text element
        textGroup.setAttribute('style', "font-size: ".concat(axisH, "px"));
        svg.appendChild(textGroup);
        var textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
        textPath.setAttribute('class', 'map-label');
        textPath.setAttribute('startOffset', '50%');
        textPath.setAttribute('href', "#labelArc".concat(this.labelIndex));
        textGroup.appendChild(textPath);
        textPath.textContent = label; // buffer the label with two spaces to ensure adequate visual spacing
        this.labelIndex += 1;
        return textGroup;
    };
    Chart.findOpenSpotOnArc = function (min, max, aspect, wedges) {
        var validRegion = new ErodingSegmentTree(min, max); // construct segment tree
        var y = 0; // iterate height upward until no segments are left
        while (true) {
            if (wedges.length > 0) {
                var pole = validRegion.getCenter();
                var next = wedges.pop();
                if (next.y < y + pole.radius / aspect) { // if the next wedge comes before we run out of space
                    validRegion.erode((next.y - y) * aspect); // go up to it
                    y = next.y;
                    if (validRegion.getMinim() >= next.xL && validRegion.getMaxim() <= next.xR) { // if it obstructs the entire remaining area
                        if (validRegion.contains(0)) // pick a remaining spot and return the current heit
                            return { halfHeight: y, location: 0 };
                        else
                            return { halfHeight: y, location: validRegion.getClosest(0) };
                    }
                    else {
                        validRegion.remove(next.xL, next.xR); // or just cover up whatever area it obstructs
                    }
                }
                else { // if the next wedge comes to late, find the last remaining point
                    return { location: pole.location, halfHeight: pole.radius / aspect };
                }
            }
            else {
                throw new Error("The algorithm that finds the optimal place on an arc to place a label failed.");
            }
        }
    };
    /**
     * convert the series of segments to an HTML path element and add it to the Element
     */
    Chart.prototype.draw = function (segments, svg) {
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathToString(segments));
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        return svg.appendChild(path); // put it in the SVG
    };
    /**
     * project and convert an SVG path in latitude-longitude coordinates into an SVG path in Cartesian coordinates,
     * accounting for the map edges properly.  if segments is [] but closePath is true, that will be interpreted as
     * meaning you want the path representing the whole Surface (which will end up being just the map outline)
     * @param segments ordered Iterator of segments, which each have attributes .type (str) and .args ([double])
     * @param closePath if this is set to true, the map will make adjustments to account for its complete nature
     * @return SVG.Path object in Cartesian coordinates
     */
    Chart.prototype.projectPath = function (segments, closePath) {
        var croppedToGeoRegion = intersection(transformInput(this.projection, segments), this.geoEdges, this.projection.domain, closePath);
        if (croppedToGeoRegion.length === 0)
            return [];
        var projected = applyProjectionToPath(this.projection, croppedToGeoRegion, MAP_PRECISION * this.dimensions.diagonal);
        var croppedToMapRegion = intersection(transformOutput(this.orientation, projected), this.mapEdges, INFINITE_PLANE, closePath);
        return croppedToMapRegion;
    };
    /**
     * create a path that forms the border of this set of Tiles.  this will only include the interface between included
     * Tiles and excluded Tiles; even if it's a surface with an edge, the surface edge will not be part of the return
     * value.  that means that a region that takes up the entire Surface will always have a border of [].
     * @param tiles the tiles that comprise the region whose outline is desired
     */
    Chart.border = function (tiles) {
        var tileSet = new Set(tiles);
        if (tileSet.size === 0)
            throw new Error("I cannot find the border of a nonexistent region.");
        return this.convertToGreebledPath(Chart.outline(tileSet), Layer.KULTUR, 1e-6);
    };
    /**
     * create some ordered loops of points that describe the boundary of these Tiles.
     * @param tiles Set of Tiles that are part of this group.
     * @return Array of loops, each loop being an Array of Vertexes or plain coordinate pairs
     */
    Chart.outline = function (tiles) {
        var e_13, _a, e_14, _b;
        var tileSet = new Set(tiles);
        var accountedFor = new Set(); // keep track of which Edge have been done
        var output = []; // TODO: will this thro an error if I try to outline the entire surface?
        try {
            for (var tileSet_1 = __values(tileSet), tileSet_1_1 = tileSet_1.next(); !tileSet_1_1.done; tileSet_1_1 = tileSet_1.next()) { // look at every included tile
                var inTile = tileSet_1_1.value;
                try {
                    for (var _c = (e_14 = void 0, __values(inTile.neighbors.keys())), _d = _c.next(); !_d.done; _d = _c.next()) { // and every tile adjacent to an included one
                        var outTile = _d.value;
                        if (tileSet.has(outTile))
                            continue; // (we only care if that adjacent tile is excluded)
                        var startingEdge = inTile.neighbors.get(outTile); // the edge between them defines the start of the loop
                        if (accountedFor.has(startingEdge))
                            continue; // (and can ignore edges we've already hit)
                        var currentLoop = []; // if we've found a new edge, start going around it
                        var currentSection = [inTile.rightOf(outTile)]; // keep track of each continuus section of this loop
                        do {
                            var vertex = inTile.leftOf(outTile); // look for the next Vertex, going widdershins
                            // add the next Vertex to the complete Path
                            currentSection.push(vertex);
                            var edge = inTile.neighbors.get(outTile); // pick out the edge between them
                            accountedFor.add(edge); // check this edge off
                            // now, advance to the next Tile(s)
                            var nextTile = vertex.widershinsOf(outTile);
                            if (nextTile instanceof EmptySpace) {
                                // if there isn't one after this Vertex, break off this section
                                currentLoop.push(currentSection);
                                // shimmy outTile around the internal portion of the edge
                                outTile = inTile;
                                var i = 0;
                                do {
                                    outTile = outTile.surface.edge.get(outTile).next;
                                    i++;
                                } while (tileSet.has(outTile)); // until it becomes external again
                                inTile = outTile.surface.edge.get(outTile).prev; // then, grab the new inTile
                                // start a new section in the same loop on this side of the gap
                                currentSection = [inTile.rightOf(outTile)];
                            }
                            else if (tileSet.has(nextTile)) // if there is and it's in, make it the new inTile
                                inTile = nextTile;
                            else // if there is and it's out, make it the new outTile
                                outTile = nextTile;
                            if (output.length >= 100000)
                                throw new Error("something went wrong why does this polygon have ".concat(output.length, " vertices?"));
                        } while (inTile.neighbors.get(outTile) !== startingEdge); // continue until you go all the outTile around this loop
                        // concatenate the first and last sections
                        if (currentLoop.length > 0) {
                            currentLoop[0] = currentSection.concat(currentLoop[0].slice(1));
                            output.push.apply(output, __spreadArray([], __read(currentLoop), false)); // and save all sections to the output
                        }
                        else {
                            output.push(currentSection);
                        }
                    }
                }
                catch (e_14_1) { e_14 = { error: e_14_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                    }
                    finally { if (e_14) throw e_14.error; }
                }
            }
        }
        catch (e_13_1) { e_13 = { error: e_13_1 }; }
        finally {
            try {
                if (tileSet_1_1 && !tileSet_1_1.done && (_a = tileSet_1.return)) _a.call(tileSet_1);
            }
            finally { if (e_13) throw e_13.error; }
        }
        return output;
    };
    /**
     * create an ordered Iterator of segments that form all of these lines, aggregating where
     * applicable. aggregation may behave unexpectedly if some members of lines contain
     * nonendpoints that are endpoints of others.
     * @param lines Set of lists of points to be combined and pathified.
     */
    Chart.aggregate = function (lines) {
        var e_15, _a, e_16, _b, e_17, _c, e_18, _d;
        var queue = __spreadArray([], __read(lines), false);
        var consolidated = new Set(); // first, consolidate
        var heads = new Map(); // map from points to [lines beginning with endpoint]
        var tails = new Map(); // map from points endpoints to [lines ending with endpoint]
        var torsos = new Map(); // map from midpoints to line containing midpoint
        while (queue.length > 0) {
            try {
                for (var consolidated_1 = (e_15 = void 0, __values(consolidated)), consolidated_1_1 = consolidated_1.next(); !consolidated_1_1.done; consolidated_1_1 = consolidated_1.next()) {
                    var l = consolidated_1_1.value;
                    if (!heads.has(l[0]) || !tails.has(l[l.length - 1]))
                        throw Error("up top!");
                    if (torsos.has(l[0]) || torsos.has(l[l.length - 1]))
                        throw Error("up slightly lower!");
                }
            }
            catch (e_15_1) { e_15 = { error: e_15_1 }; }
            finally {
                try {
                    if (consolidated_1_1 && !consolidated_1_1.done && (_a = consolidated_1.return)) _a.call(consolidated_1);
                }
                finally { if (e_15) throw e_15.error; }
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
                for (var consolidated_2 = (e_16 = void 0, __values(consolidated)), consolidated_2_1 = consolidated_2.next(); !consolidated_2_1.done; consolidated_2_1 = consolidated_2.next()) {
                    var l = consolidated_2_1.value;
                    if (!heads.has(l[0]) || !tails.has(l[l.length - 1]))
                        throw Error("that was quick.");
                }
            }
            catch (e_16_1) { e_16 = { error: e_16_1 }; }
            finally {
                try {
                    if (consolidated_2_1 && !consolidated_2_1.done && (_b = consolidated_2.return)) _b.call(consolidated_2);
                }
                finally { if (e_16) throw e_16.error; }
            }
            try {
                for (var _e = (e_17 = void 0, __values([head, tail])), _f = _e.next(); !_f.done; _f = _e.next()) { // first, on either end...
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
            catch (e_17_1) { e_17 = { error: e_17_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_c = _e.return)) _c.call(_e);
                }
                finally { if (e_17) throw e_17.error; }
            }
            try {
                for (var consolidated_3 = (e_18 = void 0, __values(consolidated)), consolidated_3_1 = consolidated_3.next(); !consolidated_3_1.done; consolidated_3_1 = consolidated_3.next()) {
                    var l = consolidated_3_1.value;
                    if (!heads.has(l[0]) || !tails.has(l[l.length - 1]))
                        throw Error("i broke it ".concat(l[0].φ, " -> ").concat(l[l.length - 1].φ));
                    if (torsos.has(l[0]) || torsos.has(l[l.length - 1]))
                        throw Error("yoo broke it! ".concat(l[0].φ, " -> ").concat(l[l.length - 1].φ));
                }
            }
            catch (e_18_1) { e_18 = { error: e_18_1 }; }
            finally {
                try {
                    if (consolidated_3_1 && !consolidated_3_1.done && (_d = consolidated_3.return)) _d.call(consolidated_3);
                }
                finally { if (e_18) throw e_18.error; }
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
    };
    /**
     * convert some paths expressd as Places into an array of PathSegments, using 'M'
     * segments to indicate gaps and 'L' segments to indicate connections.  if any of the
     * adjacent Places are actually adjacent Vertexes, go ahead and greeble some vertices
     * between them as appropriate.
     * @param points each Place[] is a polygonal path thru geographic space
     * @param greeble what kinds of connections these are for the purposes of greebling
     * @param scale the map scale at which to greeble in map-widths per km
     */
    Chart.convertToGreebledPath = function (points, greeble, scale) {
        var e_19, _a, e_20, _b;
        var path = [];
        try {
            for (var points_1 = __values(points), points_1_1 = points_1.next(); !points_1_1.done; points_1_1 = points_1.next()) { // then do the conversion
                var line = points_1_1.value;
                path.push({ type: 'M', args: [line[0].φ, line[0].λ] });
                for (var i = 1; i < line.length; i++) {
                    var start = line[i - 1];
                    var end = line[i];
                    // do this long type-casting song and dance to see if there's an edge to greeble
                    var edge = null;
                    if (start.hasOwnProperty('neighbors')) {
                        var neighbors = start.neighbors;
                        if (typeof neighbors.has === 'function' && typeof neighbors.get === 'function')
                            if (neighbors.has(end))
                                edge = neighbors.get(end);
                    }
                    var step = void 0;
                    // if there is an edge and it should be greebled, greeble it
                    if (edge !== null && Chart.weShouldGreeble(edge, greeble)) {
                        var path_2 = edge.getPath(GREEBLE_FACTOR / scale);
                        if (edge.vertex0 === start)
                            step = path_2.slice(1);
                        else
                            step = path_2.slice(0, path_2.length - 1).reverse();
                    }
                    // otherwise, draw a strait line
                    else {
                        step = [end];
                    }
                    console.assert(step[step.length - 1].φ === end.φ && step[step.length - 1].λ === end.λ, step, "did not end at", end);
                    try {
                        for (var step_1 = (e_20 = void 0, __values(step)), step_1_1 = step_1.next(); !step_1_1.done; step_1_1 = step_1.next()) {
                            var place = step_1_1.value;
                            path.push({ type: 'L', args: [place.φ, place.λ] });
                        }
                    }
                    catch (e_20_1) { e_20 = { error: e_20_1 }; }
                    finally {
                        try {
                            if (step_1_1 && !step_1_1.done && (_b = step_1.return)) _b.call(step_1);
                        }
                        finally { if (e_20) throw e_20.error; }
                    }
                }
            }
        }
        catch (e_19_1) { e_19 = { error: e_19_1 }; }
        finally {
            try {
                if (points_1_1 && !points_1_1.done && (_a = points_1.return)) _a.call(points_1);
            }
            finally { if (e_19) throw e_19.error; }
        }
        return path;
    };
    Chart.smooth = function (input) {
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
    };
    Chart.weShouldGreeble = function (edge, layer) {
        if (DISABLE_GREEBLING)
            return false;
        else if (layer === Layer.GEO)
            return true;
        else if (edge.tileL.isWater() !== edge.tileR.isWater())
            return true;
        else if (layer === Layer.BIO)
            return false;
        else if (ARABILITY.get(edge.tileL.biome) + ARABILITY.get(edge.tileR.biome) < BORDER_SPECIFY_THRESHOLD)
            return false;
        else
            return true;
    };
    /**
     * identify the meridian that is the farthest from this path on the globe
     */
    Chart.chooseMapCentering = function (regionOfInterest, surface) {
        var e_21, _a, e_22, _b, e_23, _c;
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
        catch (e_21_1) { e_21 = { error: e_21_1 }; }
        finally {
            try {
                if (regionOfInterest_1_1 && !regionOfInterest_1_1.done && (_a = regionOfInterest_1.return)) _a.call(regionOfInterest_1);
            }
            finally { if (e_21) throw e_21.error; }
        }
        if (count === 0)
            throw new Error("I can't choose a map centering with an empty region of interest.");
        var meanRadius = rSum / count;
        // find the longitude with the most empty space on either side of it
        var coastline = Chart.border(filterSet(regionOfInterest, function (tile) { return tile.biome !== Biome.OCEAN; }));
        var centralMeridian;
        var emptyLongitudes = new ErodingSegmentTree(-Math.PI, Math.PI); // start with all longitudes empty
        for (var i = 0; i < coastline.length; i++) {
            if (coastline[i].type !== 'M') {
                var λ1 = coastline[i - 1].args[1];
                var λ2 = coastline[i].args[1];
                if (Math.abs(λ1 - λ2) < Math.PI) { // and then remove the space corresponding to each segment
                    emptyLongitudes.remove(Math.min(λ1, λ2), Math.max(λ1, λ2));
                }
                else {
                    emptyLongitudes.remove(Math.max(λ1, λ2), Math.PI);
                    emptyLongitudes.remove(-Math.PI, Math.min(λ1, λ2));
                }
            }
        }
        if (emptyLongitudes.getCenter(true).location !== null) {
            centralMeridian = localizeInRange(emptyLongitudes.getCenter(true).location + Math.PI, -Math.PI, Math.PI);
        }
        else {
            // if there are no empty longitudes, do a periodic mean over the land part of the region of interest
            var xCenter = 0;
            var yCenter = 0;
            try {
                for (var regionOfInterest_2 = __values(regionOfInterest), regionOfInterest_2_1 = regionOfInterest_2.next(); !regionOfInterest_2_1.done; regionOfInterest_2_1 = regionOfInterest_2.next()) {
                    var tile = regionOfInterest_2_1.value;
                    if (tile.biome !== Biome.OCEAN) {
                        xCenter += Math.cos(tile.λ);
                        yCenter += Math.sin(tile.λ);
                    }
                }
            }
            catch (e_22_1) { e_22 = { error: e_22_1 }; }
            finally {
                try {
                    if (regionOfInterest_2_1 && !regionOfInterest_2_1.done && (_b = regionOfInterest_2.return)) _b.call(regionOfInterest_2);
                }
                finally { if (e_22) throw e_22.error; }
            }
            centralMeridian = Math.atan2(yCenter, xCenter);
        }
        // find the average latitude of the region
        var centralParallel;
        if (regionOfInterest === surface.tiles && surface.φMax - surface.φMin < 2 * Math.PI) {
            // if it's a whole-world map and non-periodic in latitude, always use the equator
            centralParallel = (surface.φMin + surface.φMax) / 2;
        }
        else {
            // otherwise do a periodic mean of latitude to get the standard parallel
            var ξCenter = 0;
            var υCenter = 0;
            try {
                for (var regionOfInterest_3 = __values(regionOfInterest), regionOfInterest_3_1 = regionOfInterest_3.next(); !regionOfInterest_3_1.done; regionOfInterest_3_1 = regionOfInterest_3.next()) {
                    var tile = regionOfInterest_3_1.value;
                    if (tile.biome !== Biome.OCEAN) {
                        ξCenter += Math.cos(tile.φ);
                        υCenter += Math.sin(tile.φ);
                    }
                }
            }
            catch (e_23_1) { e_23 = { error: e_23_1 }; }
            finally {
                try {
                    if (regionOfInterest_3_1 && !regionOfInterest_3_1.done && (_c = regionOfInterest_3.return)) _c.call(regionOfInterest_3);
                }
                finally { if (e_23) throw e_23.error; }
            }
            centralParallel = Math.atan2(υCenter, ξCenter);
        }
        return {
            centralMeridian: centralMeridian,
            centralParallel: centralParallel,
            meanRadius: meanRadius
        };
    };
    /**
     * determine the coordinate bounds of this region –
     * both its geographical coordinates on the Surface and its Cartesian coordinates on the map.
     * @param regionOfInterest the region that must be enclosed entirely within the returned bounding box
     * @param projection the projection being used to map this region from a Surface to the plane
     * @param rectangularBounds whether to make the bounding box as rectangular as possible, rather than having it conform to the graticule
     */
    Chart.chooseMapBounds = function (regionOfInterest, projection, rectangularBounds) {
        // start by identifying the geographic and projected extent of this thing
        var regionBounds = calculatePathBounds(regionOfInterest);
        var projectedRegion = applyProjectionToPath(projection, regionOfInterest, Infinity);
        var projectedBounds = calculatePathBounds(projectedRegion);
        // first infer some things about this projection
        var northPoleIsDistant = projection.differentiability(projection.φMax) < .5;
        var southPoleIsDistant = projection.differentiability(projection.φMin) < .5;
        var northPoleIsPoint = projection.projectPoint({ φ: projection.φMax, λ: 1 }).x === 0;
        var southPoleIsPoint = projection.projectPoint({ φ: projection.φMin, λ: 1 }).x === 0;
        // now to choose those bounds
        var φMin, φMax, λMin, λMax;
        var xLeft, xRight, yTop, yBottom;
        // if we want a rectangular map
        if (rectangularBounds) {
            // don't apply any geographic bounds
            φMin = projection.φMin;
            φMax = projection.φMax;
            λMin = projection.λMin;
            λMax = projection.λMax;
            // spread the projected Cartesian bounds out a bit
            var margin = 0.1 * Math.sqrt((projectedBounds.sMax - projectedBounds.sMin) *
                (projectedBounds.tMax - projectedBounds.tMin));
            xLeft = projectedBounds.sMin - margin;
            xRight = projectedBounds.sMax + margin;
            yTop = projectedBounds.tMin - margin;
            yBottom = projectedBounds.tMax + margin;
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
        }
        // if we want a wedge-shaped map
        else {
            // spread the regionBounds out a bit
            var yMax = projection.projectPoint({ φ: regionBounds.sMin, λ: projection.λCenter }).y;
            var yMin = projection.projectPoint({ φ: regionBounds.sMax, λ: projection.λCenter }).y;
            var ySouthEdge = projection.projectPoint({ φ: projection.φMin, λ: projection.λCenter }).y;
            var yNorthEdge = projection.projectPoint({ φ: projection.φMax, λ: projection.λCenter }).y;
            φMax = projection.inverseProjectPoint({ x: 0, y: Math.max(1.1 * yMin - 0.1 * yMax, yNorthEdge) }).φ;
            φMin = projection.inverseProjectPoint({ x: 0, y: Math.min(1.1 * yMax - 0.1 * yMin, ySouthEdge) }).φ;
            var ds_dλ = projection.surface.rz((φMin + φMax) / 2).r;
            λMin = Math.max(projection.λMin, regionBounds.tMin - 0.1 * (yMax - yMin) / ds_dλ);
            λMax = Math.min(projection.λMax, regionBounds.tMax + 0.1 * (yMax - yMin) / ds_dλ);
            // cut out the poles if desired
            var longitudesWrapAround = projection.wrapsAround() && λMax - λMin === 2 * Math.PI;
            if (northPoleIsDistant || (northPoleIsPoint && !longitudesWrapAround))
                φMax = Math.max(Math.min(φMax, projection.φMax - 10 / 180 * Math.PI), φMin);
            if (southPoleIsDistant || (southPoleIsPoint && !longitudesWrapAround))
                φMin = Math.min(Math.max(φMin, projection.φMin + 10 / 180 * Math.PI), φMax);
            // apply some generous Cartesian bounds
            xRight = Math.max(1.4 * projectedBounds.sMax, -1.4 * projectedBounds.sMin);
            xLeft = -xRight;
            yTop = 1.2 * projectedBounds.tMin - 0.2 * projectedBounds.tMax;
            yBottom = 1.2 * projectedBounds.tMax - 0.2 * projectedBounds.tMin;
        }
        // the extent of the geographic region will always impose some Cartesian limits; compute those now.
        var start = projection.projectPoint({ φ: φMin, λ: λMin });
        var edges = __spreadArray(__spreadArray(__spreadArray(__spreadArray([
            { type: 'M', args: [start.x, start.y] }
        ], __read(projection.projectParallel(λMin, λMax, φMin)), false), __read(projection.projectMeridian(φMin, φMax, λMax)), false), __read(projection.projectParallel(λMax, λMin, φMax)), false), __read(projection.projectMeridian(φMax, φMin, λMin)), false);
        var mapBounds = calculatePathBounds(edges);
        return {
            φMin: φMin, φMax: φMax, λMin: λMin, λMax: λMax,
            xLeft: Math.max(xLeft, mapBounds.sMin),
            xRight: Math.min(xRight, mapBounds.sMax),
            yTop: Math.max(yTop, mapBounds.tMin),
            yBottom: Math.min(yBottom, mapBounds.tMax)
        };
    };
    /**
     * create a Path that delineate a rectangular region in either Cartesian or latitude/longitude space
     */
    Chart.rectangle = function (s0, t0, s2, t2, geographic) {
        if (!geographic)
            return [
                { type: 'M', args: [s0, t0] },
                { type: 'L', args: [s0, t2] },
                { type: 'L', args: [s2, t2] },
                { type: 'L', args: [s2, t0] },
                { type: 'L', args: [s0, t0] },
            ];
        else
            return [
                { type: 'M', args: [s0, t0] },
                { type: 'Φ', args: [s0, t2] },
                { type: 'Λ', args: [s2, t2] },
                { type: 'Φ', args: [s2, t0] },
                { type: 'Λ', args: [s0, t0] },
            ];
    };
    return Chart;
}());
export { Chart };
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
    return Dimensions;
}());
//# sourceMappingURL=chart.js.map