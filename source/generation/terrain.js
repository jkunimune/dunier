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
import Queue from '../utilities/external/tinyqueue.js';
import { Vertex, Tile, EmptySpace } from "./surface/surface.js";
import { argmin, filterSet, union } from "../utilities/miscellaneus.js";
import { Vector } from "../utilities/geometry.js";
/** the magnitude of random temperature variation (°C) */
var TERME_NOISE_LEVEL = 5;
/** the magnitude of random rainfall variation */
var BARXE_NOISE_LEVEL = 0.3;
/** the maximum number of planet radii at which random variation is correlated */
var MAX_NOISE_SCALE = 1 / 8;
/** the decay parameter for temperature as a function of altitude (km) */
var ATMOSPHERE_THICKNESS = 25;
/** the minimum mountain heit needed to cast a rain shadow (km) */
var CLOUD_HEIGHT = 3;
/** the strength of rain shadows */
var OROGRAPHIC_MAGNITUDE = 1;
/** the maximum distance from the ocean at which rain shadows can happen (km) */
var OROGRAPHIC_RANGE = 2000;
/** the temperature threshold between tundra and taiga (°C) */
var TUNDRA_TEMP = -15;
/** the temperature above which evaporation is important (°C) */
var EVAPORATION_INTERCEPT = -15;
/** the exponent for the evaporation rate */
var EVAPORATION_POWER = 4 / 3;
/** the prefactor for the evaporation rate */
var EVAPORATION_COEFFICIENT = 0.009;
/** the temperature threshold between taiga and temperate forest (°C) */
var TAIGA_TEMP = -5;
/** the temperature threshold between grassland and steamland (°C) */
var FLASH_TEMP = +50;
/** the temperature threshold between temperate forest and jungle (°C) */
var TROPIC_TEMP = +22;
/** a prefactor for the threshold between grassland and forest */
var FOREST_FACTOR = 1.35;
/** the temperature threshold between normal biomes and permanent ice sheets (°C) */
var PERMAFREEZE_TEMP = -20;
/** the temperature threshold between variably liquid ocean and permanent ice sheets (°C) */
var BRINE_PERMAFREEZE_TEMP = -20;
/** the minimum edge length that can separate two rivers without them merging (km) */
var RIVER_WIDTH = 10;
/** the maximum amount that a river can flow uphill (km) */
var CANYON_DEPTH = 0.2;
/** the depth threshold needed to form a large lake (km) */
var LAKE_THRESH = .15;
/** the average altitude difference between oceanic crust and continental crust (km) */
var OCEAN_DEPTH = 4;
/** the magnitude of random altitude variation on continents (km) */
var CONTINENT_VARIATION = 1.0;
/** the magnitude of random depth variation in oceans (km) */
var OCEANIC_VARIATION = 0.5;
/** the typical height of mountain ranges formed by continental collisions (km) */
var MOUNTAIN_HEIGHT = 6.0;
/** the typical height of mountain ranges formed over subduction zones (km) */
var VOLCANO_HEIGHT = 3.0;
/** the typical height of mid-oceanic ridges (km) */
var RIDGE_HEIGHT = 1.5;
/** the typical depth of subduction trenches (km) */
var TRENCH_DEPTH = 3.0;
/** the typical depth of a continental rift */
var RIFT_DEPTH = 1.5;
/** the typical width of mountain ranges (km) */
var MOUNTAIN_WIDTH = 400;
/** the typical width of subduction trenches (km) */
var TRENCH_WIDTH = 200;
/** the typical depth of continental slopes (km) */
var SLOPE_WIDTH = 200;
/** the typical width of mid-oceanic ridges (km) */
var RIDGE_WIDTH = 100;
/** the typical width of inter-continental oceans, as a fraction of continental length scale */
var OCEAN_SIZE = 0.2;
/** the amount of depression to apply to the edges of continents near passive margins */
var CONTINENTAL_CONVEXITY = 0.5; // between 0 and 1
/** terrestrial ecoregion classifications */
export var Biome;
(function (Biome) {
    Biome[Biome["OCEAN"] = 0] = "OCEAN";
    Biome[Biome["LAKE"] = 1] = "LAKE";
    Biome[Biome["SEA_ICE"] = 2] = "SEA_ICE";
    Biome[Biome["LAND_ICE"] = 3] = "LAND_ICE";
    Biome[Biome["TUNDRA"] = 4] = "TUNDRA";
    Biome[Biome["TAIGA"] = 5] = "TAIGA";
    Biome[Biome["FOREST"] = 6] = "FOREST";
    Biome[Biome["JUNGLE"] = 7] = "JUNGLE";
    Biome[Biome["DESERT"] = 8] = "DESERT";
    Biome[Biome["GRASSLAND"] = 9] = "GRASSLAND";
    Biome[Biome["STEAMLAND"] = 10] = "STEAMLAND";
})(Biome || (Biome = {}));
export var BIOME_NAMES = [
    "ocean",
    "lake",
    "sea_ice",
    "land_ice",
    "tundra",
    "taiga",
    "forest",
    "jungle",
    "desert",
    "grassland",
    "steamland",
];
export var PASSABILITY = new Map([
    [Biome.OCEAN, 0.3],
    [Biome.JUNGLE, 1.0],
    [Biome.FOREST, 1.0],
    [Biome.LAKE, 3.0],
    [Biome.TAIGA, 1.0],
    [Biome.STEAMLAND, 0.3],
    [Biome.GRASSLAND, 3.0],
    [Biome.DESERT, 0.3],
    [Biome.TUNDRA, 0.3],
    [Biome.LAND_ICE, 0.3],
    [Biome.SEA_ICE, 0.0],
]);
export var ARABILITY = new Map([
    [Biome.OCEAN, 0.00],
    [Biome.JUNGLE, 0.30],
    [Biome.FOREST, 1.00],
    [Biome.LAKE, 0.00],
    [Biome.TAIGA, 0.10],
    [Biome.STEAMLAND, 0.03],
    [Biome.GRASSLAND, 0.30],
    [Biome.DESERT, 0.00],
    [Biome.TUNDRA, 0.03],
    [Biome.LAND_ICE, 0.00],
    [Biome.SEA_ICE, 0.00],
]);
export var RIVER_UTILITY_THRESHOLD = 2e5; // [km^2] size of watershed needed to produce a river that supports large cities
export var FRESHWATER_UTILITY = 20; // [km] width of highly populated region near river
export var SALTWATER_UTILITY = 50; // [km] width of highly populated region near coast
/**
 * create all of the continents and biomes and rivers that go into the physical geography
 * of a good fictional world.
 * @param numContinents number of continents, equal to half the number of plates
 * @param seaLevel desired sea level in km
 * @param meanTemperature some vaguely defined median temperature in °C
 * @param surf the surface to modify
 * @param rng the seeded random number generator to use
 */
export function generateTerrain(numContinents, seaLevel, meanTemperature, surf, rng) {
    generateContinents(numContinents, surf, rng);
    rng = rng.reset();
    movePlates(surf, rng);
    fillOcean(seaLevel, surf);
    rng = rng.reset();
    generateClimate(meanTemperature, surf, rng); // TODO: I really think I should have an avgRain parameter
    addRivers(surf);
    setBiomes(surf);
}
/**
 * get the base planetary setup set up, with continents and plates and simple altitudes.
 * @param numPlates the desired number of plates (half will be oceanic, and half will be continental)
 * @param surf the surface on which to generate these continents
 * @param rng the seeded random number generator to use
 */
function generateContinents(numPlates, surf, rng) {
    var e_1, _a, e_2, _b, e_3, _c;
    var maxScale = MAX_NOISE_SCALE * Math.sqrt(surf.area);
    var _loop_1 = function (tile) {
        var e_4, _k, e_5, _l, e_6, _m, e_7, _o;
        if (tile.index < numPlates) {
            tile.plateIndex = tile.index; // the first few are seeds
            tile.height = 0;
            rng.next(); // but call rng anyway to keep things consistent
        }
        else { // and the rest get assigned a parent's plate
            var prefParents = new Set();
            try {
                for (var _p = (e_4 = void 0, __values(tile.between)), _q = _p.next(); !_q.done; _q = _p.next()) { // if this tile is directly between two tiles
                    var pair = _q.value;
                    if (pair[0].plateIndex === pair[1].plateIndex) { // of the same plate
                        prefParents.add(pair[0]); // try to have it take the plate from one of them, to keep that plate together
                        prefParents.add(pair[1]);
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_q && !_q.done && (_k = _p.return)) _k.call(_p);
                }
                finally { if (e_4) throw e_4.error; }
            }
            var options = (prefParents.size > 0) ? __spreadArray([], __read(prefParents), false) : tile.parents;
            var distances = [];
            try {
                for (var options_1 = (e_5 = void 0, __values(options)), options_1_1 = options_1.next(); !options_1_1.done; options_1_1 = options_1.next()) {
                    var parent_1 = options_1_1.value;
                    distances.push(surf.distance(tile, parent_1));
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (options_1_1 && !options_1_1.done && (_l = options_1.return)) _l.call(options_1);
                }
                finally { if (e_5) throw e_5.error; }
            }
            tile.plateIndex = options[argmin(distances)].plateIndex;
        }
        // do the same thing but for subplates
        if (tile.index < 2 * numPlates) {
            tile.subplateIndex = tile.index;
            rng.next();
        }
        else {
            var samePlateParents = tile.parents.filter(function (parent) { return parent.plateIndex === tile.plateIndex; });
            var prefParents = new Set();
            try {
                for (var _r = (e_6 = void 0, __values(tile.between)), _s = _r.next(); !_s.done; _s = _r.next()) { // if this tile is directly between two tiles
                    var pair = _s.value;
                    if (pair[0].plateIndex === tile.plateIndex && pair[0].subplateIndex === pair[1].subplateIndex) { // of the same plate
                        prefParents.add(pair[0]); // try to have it take the plate from one of them, to keep that plate together
                        prefParents.add(pair[1]);
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_s && !_s.done && (_m = _r.return)) _m.call(_r);
                }
                finally { if (e_6) throw e_6.error; }
            }
            var options = (prefParents.size > 0) ? __spreadArray([], __read(prefParents), false) : samePlateParents;
            var distances = [];
            try {
                for (var options_2 = (e_7 = void 0, __values(options)), options_2_1 = options_2.next(); !options_2_1.done; options_2_1 = options_2.next()) {
                    var parent_2 = options_2_1.value;
                    distances.push(surf.distance(tile, parent_2));
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (options_2_1 && !options_2_1.done && (_o = options_2.return)) _o.call(options_2);
                }
                finally { if (e_7) throw e_7.error; }
            }
            tile.subplateIndex = options[argmin(distances)].subplateIndex;
        }
    };
    try {
        // start by assigning plates
        for (var _d = __values(surf.tiles), _e = _d.next(); !_e.done; _e = _d.next()) {
            var tile = _e.value;
            _loop_1(tile);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var _loop_2 = function (tile) {
        tile.height = getNoiseFunction(tile, tile.parents.filter(function (p) { return p.plateIndex === tile.plateIndex; }), 'height', surf, rng, maxScale, (tile.plateIndex % 2 === 0) ? CONTINENT_VARIATION : OCEANIC_VARIATION, 1); // at last apply the noise function
    };
    try {
        for (var _f = __values(surf.tiles), _g = _f.next(); !_g.done; _g = _f.next()) {
            var tile = _g.value;
            _loop_2(tile);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
        }
        finally { if (e_2) throw e_2.error; }
    }
    try {
        for (var _h = __values(surf.tiles), _j = _h.next(); !_j.done; _j = _h.next()) { // once that's done, add in the plate altitude baselines
            var tile = _j.value;
            if (tile.plateIndex % 2 !== 0)
                tile.height -= OCEAN_DEPTH; // order them so that adding and removing plates results in minimal change
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
        }
        finally { if (e_3) throw e_3.error; }
    }
}
/**
 * apply plate tectonics to the surface!
 */
function movePlates(surf, rng) {
    var e_8, _a, e_9, _b;
    var velocities = [];
    try {
        for (var _c = __values(surf.tiles), _d = _c.next(); !_d.done; _d = _c.next()) { // start by counting up all the plates
            var tile = _d.value;
            if (tile.plateIndex >= velocities.length) // and assigning them random velocities // TODO allow for plate rotation in the tangent plane
                velocities.push(tile.east.times(rng.normal(0, 1 / Math.sqrt(2))).plus(tile.north.times(rng.normal(0, 1 / Math.sqrt(2))))); // orthogonal to the normal at their seeds
            else
                break;
        }
    }
    catch (e_8_1) { e_8 = { error: e_8_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_8) throw e_8.error; }
    }
    var oceanWidth = OCEAN_SIZE * Math.sqrt(surf.area / velocities.length); // do a little dimensional analysis on the ocean scale
    moveCertainPlates(surf.tiles, function (tile) { return tile.plateIndex; }, velocities, true, oceanWidth);
    var subvelocities = [];
    try {
        for (var _e = __values(surf.tiles), _f = _e.next(); !_f.done; _f = _e.next()) { // start by counting up all the plates
            var tile = _f.value;
            if (tile.subplateIndex >= subvelocities.length) // and assigning them random velocities // TODO allow for plate rotation in the tangent plane
                subvelocities.push(tile.east.times(rng.normal(0, 0.2 / Math.sqrt(2))).plus(tile.north.times(rng.normal(0, 0.2 / Math.sqrt(2))))); // orthogonal to the normal at their seeds
            else
                break;
        }
    }
    catch (e_9_1) { e_9 = { error: e_9_1 }; }
    finally {
        try {
            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
        }
        finally { if (e_9) throw e_9.error; }
    }
    var _loop_3 = function (plateIndex) {
        moveCertainPlates(filterSet(surf.tiles, function (tile) { return tile.plateIndex === plateIndex; }), function (tile) { return tile.subplateIndex; }, subvelocities, false);
    };
    for (var plateIndex = 0; plateIndex < velocities.length; plateIndex++) {
        _loop_3(plateIndex);
    }
}
/**
 * apply plate tectonics given the velocities for all the plates.
 */
function moveCertainPlates(tiles, getPlate, velocities, affectOcean, oceanWidth) {
    var e_10, _a, e_11, _b;
    if (oceanWidth === void 0) { oceanWidth = 0; }
    // create a queue to propagate the fault line effects
    var queue = new Queue([], function (a, b) {
        if (Number.isFinite(a.priority) || Number.isFinite(b.priority))
            return a.distance / a.priority - b.distance / b.priority;
        else
            return a.distance - b.distance;
    });
    var _loop_4 = function (tile) {
        var e_12, _f, e_13, _g;
        if (!affectOcean && tile.height < -OCEAN_DEPTH / 2)
            return "continue"; // skip anything oceanic
        var fault = null;
        var minDistance = Infinity;
        try {
            for (var _h = (e_12 = void 0, __values(tile.neighbors.keys())), _j = _h.next(); !_j.done; _j = _h.next()) { // look for adjacent tiles
                var neighbor = _j.value;
                if (tiles.has(neighbor) && getPlate(neighbor) !== getPlate(tile)) { // that are on different plates
                    var distance = tile.neighbors.get(neighbor).getDistance();
                    if (fault === null || distance < minDistance) {
                        fault = neighbor;
                        minDistance = distance;
                    }
                }
            }
        }
        catch (e_12_1) { e_12 = { error: e_12_1 }; }
        finally {
            try {
                if (_j && !_j.done && (_f = _h.return)) _f.call(_h);
            }
            finally { if (e_12) throw e_12.error; }
        }
        if (fault !== null) { // if you found one,
            var tilePos = new Vector(0, 0, 0); // do some additional computation to smooth out the boundaries
            var faultPos = new Vector(0, 0, 0);
            var tileMass = 0, faultMass = 0;
            try {
                for (var _k = (e_13 = void 0, __values(union(tile.neighbors.keys(), fault.neighbors.keys()))), _l = _k.next(); !_l.done; _l = _k.next()) {
                    var t = _l.value;
                    if (getPlate(t) === getPlate(tile)) {
                        tilePos = tilePos.plus(t.pos);
                        tileMass++;
                    }
                    else if (getPlate(t) === getPlate(fault)) {
                        faultPos = faultPos.plus(t.pos);
                        faultMass++;
                    }
                }
            }
            catch (e_13_1) { e_13 = { error: e_13_1 }; }
            finally {
                try {
                    if (_l && !_l.done && (_g = _k.return)) _g.call(_k);
                }
                finally { if (e_13) throw e_13.error; }
            }
            var relPosition = tilePos.over(tileMass).minus(faultPos.over(faultMass));
            var relVelocity = velocities[getPlate(tile)].minus(velocities[getPlate(fault)]);
            var relSpeed_1 = relPosition.normalized().dot(relVelocity); // determine the relSpeed at which they are moving away from each other
            if (relSpeed_1 < 0) {
                // continental collisions make himalaya-type plateaus
                if (tile.height >= -OCEAN_DEPTH / 2 && fault.height >= -OCEAN_DEPTH / 2) {
                    var width_1 = Math.sqrt(-relSpeed_1) * MOUNTAIN_WIDTH;
                    queue.push({
                        tile: tile, distance: minDistance / 2,
                        maxDistance: width_1 * Math.sqrt(2),
                        priority: Infinity,
                        heightFunction: function (distance) { return Math.sqrt(-relSpeed_1) * MOUNTAIN_HEIGHT * // continent-continent ranges are even
                            bellCurve(distance / width_1) * wibbleCurve(distance / width_1, 1 / 6); },
                    });
                }
                // oceans subduct under continents forming deep sea trenches
                else if (tile.height < -OCEAN_DEPTH / 2 && (fault.height >= -OCEAN_DEPTH / 2 || getPlate(tile) < getPlate(fault)))
                    queue.push({
                        tile: tile, distance: minDistance / 2,
                        maxDistance: TRENCH_WIDTH * Math.sqrt(2),
                        priority: -relSpeed_1,
                        heightFunction: function (distance) { return -Math.sqrt(-relSpeed_1) * TRENCH_DEPTH *
                            digibbalCurve(distance / TRENCH_WIDTH); },
                    });
                // anything on top of of ocean forms andean-type ranges or island chains
                else
                    queue.push({
                        tile: tile, distance: minDistance / 2,
                        maxDistance: MOUNTAIN_WIDTH * Math.sqrt(2),
                        priority: -relSpeed_1,
                        heightFunction: function (distance) { return Math.sqrt(-relSpeed_1) * VOLCANO_HEIGHT *
                            digibbalCurve(distance / MOUNTAIN_WIDTH) * wibbleCurve(distance / MOUNTAIN_WIDTH, 1); },
                    });
            }
            else {
                // separating oceans form mid-oceanic rifts
                if (tile.height < -OCEAN_DEPTH / 2)
                    queue.push({
                        tile: tile, distance: minDistance / 2,
                        maxDistance: RIDGE_WIDTH * 2,
                        priority: relSpeed_1,
                        heightFunction: function (distance) { return RIDGE_HEIGHT *
                            Math.exp(-distance / RIDGE_WIDTH); },
                    });
                else {
                    // separating continents form ocean basins
                    if (affectOcean) {
                        var width_2 = relSpeed_1 * oceanWidth; // passive margins are kind of complicated
                        queue.push({
                            tile: tile, distance: minDistance / 2,
                            maxDistance: width_2 + 2 * SLOPE_WIDTH,
                            priority: Infinity,
                            heightFunction: function (distance) {
                                var x0 = Math.min(0, width_2 - 2 * SLOPE_WIDTH - 2 * RIDGE_WIDTH);
                                var xS = (width_2 - distance) / SLOPE_WIDTH;
                                var xR = (distance - x0) / RIDGE_WIDTH;
                                return Math.min(OCEAN_DEPTH * (Math.exp(-xS) - 1) + RIDGE_HEIGHT * Math.exp(-xR), -OCEAN_DEPTH / 2 / (1 + Math.exp(-xS / 2.) / CONTINENTAL_CONVEXITY));
                            },
                        });
                    }
                    // unless we're doing subplates in which case they form rift valleys
                    else {
                        var width_3 = Math.sqrt(relSpeed_1) * MOUNTAIN_WIDTH;
                        queue.push({
                            tile: tile, distance: minDistance / 2,
                            maxDistance: width_3 + 2 * RIDGE_WIDTH,
                            priority: relSpeed_1,
                            heightFunction: function (distance) {
                                if (distance < width_3)
                                    return -Math.sqrt(relSpeed_1) * RIFT_DEPTH;
                                else
                                    return Math.sqrt(relSpeed_1) * RIDGE_HEIGHT * Math.exp(-(distance - width_3) / RIDGE_WIDTH) * wibbleCurve(distance / RIDGE_HEIGHT, 1 / 6);
                            }
                        });
                    }
                }
            }
        }
    };
    try {
        for (var tiles_1 = __values(tiles), tiles_1_1 = tiles_1.next(); !tiles_1_1.done; tiles_1_1 = tiles_1.next()) {
            var tile = tiles_1_1.value;
            _loop_4(tile);
        }
    }
    catch (e_10_1) { e_10 = { error: e_10_1 }; }
    finally {
        try {
            if (tiles_1_1 && !tiles_1_1.done && (_a = tiles_1.return)) _a.call(tiles_1);
        }
        finally { if (e_10) throw e_10.error; }
    }
    var visited = new Set();
    while (!queue.empty()) { // now, we iterate through the queue in order of priority
        var _c = queue.pop(), tile = _c.tile, distance = _c.distance, maxDistance = _c.maxDistance, priority = _c.priority, heightFunction = _c.heightFunction; // each element of the queue is a tile waiting to be affected by plate tectonics
        if (visited.has(tile))
            continue; // some of them may have already come up
        if (distance > maxDistance)
            continue; // there's also always a possibility we are out of the range of influence of this fault
        tile.height += heightFunction(distance);
        visited.add(tile); // mark this tile
        try {
            for (var _d = (e_11 = void 0, __values(tile.neighbors.keys())), _e = _d.next(); !_e.done; _e = _d.next()) {
                var neighbor = _e.value;
                if (getPlate(neighbor) === getPlate(tile))
                    queue.push({
                        tile: neighbor,
                        distance: distance + tile.neighbors.get(neighbor).getDistance(),
                        maxDistance: maxDistance,
                        priority: priority,
                        heightFunction: heightFunction,
                    });
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
            }
            finally { if (e_11) throw e_11.error; }
        }
    }
}
/**
 * fill in the ocean biome using a very simple flood fill
 * @param level the altitude up to which to fill
 * @param surf the surface
 */
function fillOcean(level, surf) {
    var e_14, _a, e_15, _b, e_16, _c, e_17, _d, e_18, _e;
    var bestStart = null; // the size of the ocean depends heavily on where we start
    var remainingUnchecked = surf.tiles.size;
    var bestSize = 0;
    try {
        for (var _f = __values(surf.tiles), _g = _f.next(); !_g.done; _g = _f.next()) { // we want to find the start point that maximizes that size
            var start = _g.value;
            if (start.biome === Biome.OCEAN) // use biome = OCEAN to mark tiles we've checked
                continue; // and don't check them twice
            if (start.height > level) { // skip past points above sea level
                remainingUnchecked -= 1;
            }
            else { // for unchecked points below sea level
                var size = floodFrom(start, level); // try putting an ocean here
                remainingUnchecked -= size;
                if (size > bestSize) { // see if it's bigger than any oceans we've found thus far
                    bestStart = start;
                    bestSize = size;
                }
                if (remainingUnchecked <= bestSize) // stop when it's no longer possible to find a bigger ocean
                    break;
            }
        }
    }
    catch (e_14_1) { e_14 = { error: e_14_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
        }
        finally { if (e_14) throw e_14.error; }
    }
    if (bestStart === null)
        return; // it's theoretically possible that *everything* was above sea level.  in which case eh.
    try {
        for (var _h = __values(surf.tiles), _j = _h.next(); !_j.done; _j = _h.next()) {
            var tile = _j.value;
            tile.biome = null;
        }
    }
    catch (e_15_1) { e_15 = { error: e_15_1 }; }
    finally {
        try {
            if (_j && !_j.done && (_b = _h.return)) _b.call(_h);
        }
        finally { if (e_15) throw e_15.error; }
    }
    floodFrom(bestStart, level); // and re-flood the best one you found
    try {
        for (var _k = __values(surf.tiles), _l = _k.next(); !_l.done; _l = _k.next()) {
            var tile = _l.value;
            tile.height -= level;
        }
    }
    catch (e_16_1) { e_16 = { error: e_16_1 }; }
    finally {
        try {
            if (_l && !_l.done && (_c = _k.return)) _c.call(_k);
        }
        finally { if (e_16) throw e_16.error; }
    }
    try {
        // set the coastal flag
        for (var _m = __values(surf.tiles), _o = _m.next(); !_o.done; _o = _m.next()) {
            var tile = _o.value;
            tile.coastal = false;
            if (!tile.isSaltWater())
                try {
                    for (var _p = (e_18 = void 0, __values(tile.neighbors.keys())), _q = _p.next(); !_q.done; _q = _p.next()) {
                        var neibor = _q.value;
                        if (neibor.isSaltWater())
                            tile.coastal = true;
                    }
                }
                catch (e_18_1) { e_18 = { error: e_18_1 }; }
                finally {
                    try {
                        if (_q && !_q.done && (_e = _p.return)) _e.call(_p);
                    }
                    finally { if (e_18) throw e_18.error; }
                }
        }
    }
    catch (e_17_1) { e_17 = { error: e_17_1 }; }
    finally {
        try {
            if (_o && !_o.done && (_d = _m.return)) _d.call(_m);
        }
        finally { if (e_17) throw e_17.error; }
    }
}
function generateClimate(avgTerme, surf, rng) {
    var e_19, _a, e_20, _b, e_21, _c, e_22, _d, e_23, _e, e_24, _f;
    var maxScale = MAX_NOISE_SCALE * Math.sqrt(surf.area);
    try {
        for (var _g = __values(surf.tiles), _h = _g.next(); !_h.done; _h = _g.next()) { // assign each tile random values
            var tile = _h.value;
            tile.temperature = getNoiseFunction(tile, tile.parents, 'temperature', surf, rng, maxScale, TERME_NOISE_LEVEL, 2);
            tile.rainfall = getNoiseFunction(tile, tile.parents, 'rainfall', surf, rng, maxScale, BARXE_NOISE_LEVEL, 2);
        }
    }
    catch (e_19_1) { e_19 = { error: e_19_1 }; }
    finally {
        try {
            if (_h && !_h.done && (_a = _g.return)) _a.call(_g);
        }
        finally { if (e_19) throw e_19.error; }
    }
    try {
        for (var _j = __values(surf.tiles), _k = _j.next(); !_k.done; _k = _j.next()) { // and then throw in the baseline
            var tile = _k.value;
            tile.temperature += Math.pow(surf.insolation(tile.φ) * Math.exp(-Math.max(0, tile.height) / ATMOSPHERE_THICKNESS), 1 / 4.) * (avgTerme + 273) - 273;
            tile.rainfall += surf.windConvergence(tile.φ);
            tile.rainfall = Math.max(0, tile.rainfall);
            var _l = surf.windVelocity(tile.φ), north = _l.north, east = _l.east;
            tile.windVelocity = tile.north.times(north).plus(tile.east.times(east));
        }
    }
    catch (e_20_1) { e_20 = { error: e_20_1 }; }
    finally {
        try {
            if (_k && !_k.done && (_b = _j.return)) _b.call(_j);
        }
        finally { if (e_20) throw e_20.error; }
    }
    try {
        for (var _m = __values(surf.tiles), _o = _m.next(); !_o.done; _o = _m.next()) {
            var tile = _o.value;
            tile.downwind = [];
        }
    }
    catch (e_21_1) { e_21 = { error: e_21_1 }; }
    finally {
        try {
            if (_o && !_o.done && (_c = _m.return)) _c.call(_m);
        }
        finally { if (e_21) throw e_21.error; }
    }
    var queue = [];
    try {
        for (var _p = __values(surf.tiles), _q = _p.next(); !_q.done; _q = _p.next()) {
            var tile = _q.value;
            var bestTile = null, bestDixe = null; // define tile.upwind as the neighbor that is in the upwindest direction of each tile
            try {
                for (var _r = (e_23 = void 0, __values(tile.neighbors.keys())), _s = _r.next(); !_s.done; _s = _r.next()) {
                    var neighbor = _s.value;
                    var dix = neighbor.pos.minus(tile.pos).normalized();
                    if (bestDixe === null ||
                        dix.dot(tile.windVelocity) < bestDixe.dot(tile.windVelocity)) {
                        bestTile = neighbor;
                        bestDixe = dix;
                    }
                }
            }
            catch (e_23_1) { e_23 = { error: e_23_1 }; }
            finally {
                try {
                    if (_s && !_s.done && (_e = _r.return)) _e.call(_r);
                }
                finally { if (e_23) throw e_23.error; }
            }
            bestTile.downwind.push(tile); // and make sure that all tiles know who is downwind of them
            if (tile.biome === Biome.OCEAN) // also seed the orographic effect in the oceans
                queue.push({ tile: tile, moisture: OROGRAPHIC_MAGNITUDE });
            if (tile.height > CLOUD_HEIGHT) // and also remove some moisture from mountains
                tile.rainfall -= OROGRAPHIC_MAGNITUDE / 2;
        }
    }
    catch (e_22_1) { e_22 = { error: e_22_1 }; }
    finally {
        try {
            if (_q && !_q.done && (_d = _p.return)) _d.call(_p);
        }
        finally { if (e_22) throw e_22.error; }
    }
    while (queue.length > 0) {
        var _t = queue.pop(), tile = _t.tile, moisture = _t.moisture; // wet air blows from upwind
        tile.rainfall += moisture; // this tile gets rain from the wet air
        if (tile.height <= CLOUD_HEIGHT) { // if it's is low enuff
            try {
                for (var _u = (e_24 = void 0, __values(tile.downwind)), _v = _u.next(); !_v.done; _v = _u.next()) { // it passes it onto any neibors downwind of it
                    var downwind = _v.value;
                    if (downwind.biome !== Biome.OCEAN) {
                        var distance = tile.neighbors.get(downwind).getDistance();
                        queue.push({
                            tile: downwind,
                            moisture: moisture * Math.exp(-distance / OROGRAPHIC_RANGE / Math.sqrt(downwind.windVelocity.sqr()))
                        }); // the air gradually dries out
                    }
                }
            }
            catch (e_24_1) { e_24 = { error: e_24_1 }; }
            finally {
                try {
                    if (_v && !_v.done && (_f = _u.return)) _f.call(_u);
                }
                finally { if (e_24) throw e_24.error; }
            }
        }
    }
}
/**
 * give the surface some rivers to draw, and also set up some nearby lakes.
 * @param surf the Surface on which this takes place
 */
function addRivers(surf) {
    var e_25, _a, e_26, _b, e_27, _c, e_28, _d, e_29, _e, e_30, _f, e_31, _g, e_32, _h, e_33, _j, e_34, _k;
    try {
        for (var _l = __values(surf.vertices), _m = _l.next(); !_m.done; _m = _l.next()) {
            var vertex = _m.value;
            var numAdjacentTiles = 0;
            var totalHeight = 0;
            try {
                for (var _o = (e_26 = void 0, __values(vertex.tiles)), _p = _o.next(); !_p.done; _p = _o.next()) {
                    var tile = _p.value;
                    if (tile instanceof Tile) {
                        totalHeight += tile.height;
                        numAdjacentTiles += 1;
                    }
                }
            }
            catch (e_26_1) { e_26 = { error: e_26_1 }; }
            finally {
                try {
                    if (_p && !_p.done && (_b = _o.return)) _b.call(_o);
                }
                finally { if (e_26) throw e_26.error; }
            }
            vertex.height = totalHeight / numAdjacentTiles; // first define altitudes for vertices, which only matters for this one purpose
            vertex.downstream = null; // also initialize this
        }
    }
    catch (e_25_1) { e_25 = { error: e_25_1 }; }
    finally {
        try {
            if (_m && !_m.done && (_a = _l.return)) _a.call(_l);
        }
        finally { if (e_25) throw e_25.error; }
    }
    var riverOrder = new Map();
    var riverStack = [];
    var riverQueue = new Queue([], function (a, b) { return b.quality - a.quality; }); // start with a queue of rivers forming from their deltas
    try {
        // start by searching for vertices where a river can enter the ocean or flow off the edge
        for (var _q = __values(surf.vertices), _r = _q.next(); !_r.done; _r = _q.next()) {
            var vertex = _r.value;
            for (var i = 0; i < 3; i++) { // if you can find any orientation
                var a = vertex.tiles[i];
                var b = vertex.tiles[(i + 1) % 3];
                var c = vertex.tiles[(i + 2) % 3];
                var viableAsADelta = ((a instanceof EmptySpace || a.isSaltWater()) &&
                    (b instanceof Tile && !b.isSaltWater() &&
                        (c instanceof Tile && !c.isSaltWater())));
                if (viableAsADelta) { // where there are two land tiles facing one sea/empty tile
                    vertex.downstream = a; // set its flow as into the ocean
                    riverOrder.set(vertex, 0);
                    riverStack.push(vertex);
                    riverQueue.push({
                        below: vertex, above: b.rightOf(c),
                        maxHeight: 0, uphillLength: 0,
                        quality: Infinity,
                    });
                    break;
                }
            }
        }
    }
    catch (e_27_1) { e_27 = { error: e_27_1 }; }
    finally {
        try {
            if (_r && !_r.done && (_c = _q.return)) _c.call(_q);
        }
        finally { if (e_27) throw e_27.error; }
    }
    while (!riverQueue.empty()) { // then iteratively extend them
        var _s = riverQueue.pop(), below = _s.below, above = _s.above, maxHeight = _s.maxHeight, uphillLength = _s.uphillLength; // pick out the steepest potential river
        if (above.downstream === null) { // if it's available
            above.downstream = below; // take it
            riverOrder.set(above, riverStack.length); // track the number of steps from the delta
            riverStack.push(above); // cue it up for the flow calculation later
            try {
                for (var _t = (e_28 = void 0, __values(above.neighbors.keys())), _u = _t.next(); !_u.done; _u = _t.next()) { // then look for what comes next
                    var beyond = _u.value;
                    if (beyond !== null) {
                        if (beyond.downstream === null) { // (it's a little redundant, but checking availability here as well saves some time)
                            if (beyond.height >= maxHeight - CANYON_DEPTH) {
                                var length_1 = surf.distance(beyond, above);
                                var quality = // decide how good a river this would be
                                 void 0; // decide how good a river this would be
                                if (length_1 < RIVER_WIDTH) // if the edge is really short we must make it a river immediately
                                    quality = Infinity;
                                else if (beyond.height >= above.height) // otherwise, calculate the slope for downhill rivers
                                    quality = (beyond.height - above.height) / length_1;
                                else // calculate the amount of canyon you would need for an uphill river
                                    quality = -(uphillLength + length_1);
                                riverQueue.push({
                                    below: above, above: beyond,
                                    maxHeight: Math.max(maxHeight, beyond.height),
                                    uphillLength: uphillLength + ((beyond.height < above.height) ? length_1 : 0),
                                    quality: quality,
                                });
                            }
                        }
                    }
                }
            }
            catch (e_28_1) { e_28 = { error: e_28_1 }; }
            finally {
                try {
                    if (_u && !_u.done && (_d = _t.return)) _d.call(_t);
                }
                finally { if (e_28) throw e_28.error; }
            }
        }
    }
    try {
        for (var _v = __values(surf.vertices), _w = _v.next(); !_w.done; _w = _v.next()) {
            var vertex = _w.value;
            vertex.flow = 0; // define this temporary variable real quick...
            try {
                for (var _x = (e_30 = void 0, __values(vertex.neighbors.values())), _y = _x.next(); !_y.done; _y = _x.next()) {
                    var edge = _y.value;
                    edge.flow = 0;
                }
            }
            catch (e_30_1) { e_30 = { error: e_30_1 }; }
            finally {
                try {
                    if (_y && !_y.done && (_f = _x.return)) _f.call(_x);
                }
                finally { if (e_30) throw e_30.error; }
            }
        }
    }
    catch (e_29_1) { e_29 = { error: e_29_1 }; }
    finally {
        try {
            if (_w && !_w.done && (_e = _v.return)) _e.call(_v);
        }
        finally { if (e_29) throw e_29.error; }
    }
    surf.rivers = new Set();
    // now we need to propagate water downhill to calculate flow rates
    var unitArea = surf.area / surf.tiles.size;
    while (riverStack.length > 0) {
        var vertex = riverStack.pop(); // at each river vertex
        if (vertex.downstream instanceof Vertex) {
            try {
                for (var _z = (e_31 = void 0, __values(vertex.tiles)), _0 = _z.next(); !_0.done; _0 = _z.next()) { // compute the sum of rainfall and inflow (with some adjustments)
                    var tile = _0.value;
                    if (tile instanceof Tile) {
                        var nadasle = tile.rainfall
                            - evaporation_rate(tile.temperature) // subtract out evaporation
                            + tile.height / CLOUD_HEIGHT; // add in mountain sources
                        if (nadasle > 0 && tile.temperature >= PERMAFREEZE_TEMP) // this could lead to evaporation, but I'm not doing that because it would look ugly
                            vertex.flow += nadasle * unitArea / tile.neighbors.size;
                    }
                }
            }
            catch (e_31_1) { e_31 = { error: e_31_1 }; }
            finally {
                try {
                    if (_0 && !_0.done && (_g = _z.return)) _g.call(_z);
                }
                finally { if (e_31) throw e_31.error; }
            }
            vertex.downstream.flow += vertex.flow; // and pass that flow onto the downstream tile
            vertex.neighbors.get(vertex.downstream).flow = vertex.flow;
        }
        if (vertex.downstream instanceof Vertex || vertex.downstream instanceof Tile)
            surf.rivers.add([vertex, vertex.downstream]);
    }
    // now add lakes
    var lageQueue = __spreadArray([], __read(surf.tiles), false).filter(function (t) { return !surf.edge.has(t); });
    queue: while (lageQueue.length > 0) { // now look at the tiles
        var tile = lageQueue.pop();
        if (tile.isWater() || tile.temperature < PERMAFREEZE_TEMP)
            continue; // ignoring things that are already water or too cold for this
        // check whether there is up to 1 continuous body of water at its border
        var seenAnyWater = false;
        var seenRightEdge = false;
        try {
            for (var _1 = (e_32 = void 0, __values(tile.getPolygon())), _2 = _1.next(); !_2.done; _2 = _1.next()) {
                var vertex = _2.value.vertex;
                var last = vertex.widershinsOf(tile);
                var next = vertex.widershinsOf(last); // look at the Tiles next to it
                if (next instanceof Tile && next.biome === Biome.OCEAN)
                    continue queue; // don't let ocean-adjacent tiles become lakes
                var lastIsWater = (last instanceof Tile) && (tile.neighbors.get(last).flow > 0 || last.biome === Biome.LAKE);
                var nextIsWater = (next instanceof Tile) && (tile.neighbors.get(next).flow > 0 || next.biome === Biome.LAKE);
                var betweenIsWater = vertex.acrossFrom(tile).flow > 0;
                var isWater = lastIsWater || nextIsWater || betweenIsWater;
                if (isWater)
                    seenAnyWater = true;
                var isRightEdge = (!lastIsWater && nextIsWater) || (!lastIsWater && !nextIsWater && betweenIsWater);
                if (isRightEdge) { // if this has the right edge of a body of water
                    if (seenRightEdge) // if there's already been a right edge
                        continue queue; // then it's not contiguous and this tile is not eligible
                    else // otherwise
                        seenRightEdge = true; // record that
                }
            }
        }
        catch (e_32_1) { e_32 = { error: e_32_1 }; }
        finally {
            try {
                if (_2 && !_2.done && (_h = _1.return)) _h.call(_1);
            }
            finally { if (e_32) throw e_32.error; }
        }
        if (!seenAnyWater) // if there wasn't _any_ adjacent water
            continue; // then there's nothing to feed the lake
        // locate the downstreamest river flowing away
        var outflow = null;
        try {
            for (var _3 = (e_33 = void 0, __values(tile.getPolygon())), _4 = _3.next(); !_4.done; _4 = _3.next()) {
                var vertex = _4.value.vertex;
                if (outflow === null || riverOrder.get(vertex) <= riverOrder.get(outflow)) // i.e. the vertex with the most ultimate flow
                    outflow = vertex;
            }
        }
        catch (e_33_1) { e_33 = { error: e_33_1 }; }
        finally {
            try {
                if (_4 && !_4.done && (_j = _3.return)) _j.call(_3);
            }
            finally { if (e_33) throw e_33.error; }
        }
        if (outflow !== null && outflow.downstream instanceof Vertex && outflow.flow > 0 &&
            outflow.downstream.height > outflow.height + LAKE_THRESH) { // if we made it through all that, make an altitude check
            tile.biome = Biome.LAKE; // and assign lake status. you've earned it, tile.
            try {
                for (var _5 = (e_34 = void 0, __values(tile.neighbors.keys())), _6 = _5.next(); !_6.done; _6 = _5.next()) {
                    var neighbor = _6.value;
                    lageQueue.push(neighbor);
                } // tell your friends.
            }
            catch (e_34_1) { e_34 = { error: e_34_1 }; }
            finally {
                try {
                    if (_6 && !_6.done && (_k = _5.return)) _k.call(_5);
                }
                finally { if (e_34) throw e_34.error; }
            }
        }
    }
}
/**
 * assign biomes to all unassigned tiles according to simple rules.
 * @param surf the surface to which we're doing this
 */
function setBiomes(surf) {
    var e_35, _a, e_36, _b;
    try {
        for (var _c = __values(surf.tiles), _d = _c.next(); !_d.done; _d = _c.next()) {
            var tile = _d.value;
            // assign oceanic biomes based on temperature
            if (tile.biome === Biome.OCEAN) {
                if (tile.temperature < BRINE_PERMAFREEZE_TEMP || surf.edge.has(tile))
                    tile.biome = Biome.SEA_ICE;
            }
            // assign terrestrial biomes based on temperature and rainfall
            else if (tile.biome === null) {
                if (tile.temperature < PERMAFREEZE_TEMP || surf.edge.has(tile))
                    tile.biome = Biome.LAND_ICE;
                else if (tile.rainfall <= evaporation_rate(tile.temperature))
                    tile.biome = Biome.DESERT;
                else if (tile.temperature < TUNDRA_TEMP)
                    tile.biome = Biome.TUNDRA;
                else if (tile.temperature > FLASH_TEMP)
                    tile.biome = Biome.STEAMLAND;
                else if (tile.rainfall < FOREST_FACTOR * evaporation_rate(tile.temperature))
                    tile.biome = Biome.GRASSLAND;
                else if (tile.temperature < TAIGA_TEMP)
                    tile.biome = Biome.TAIGA;
                else if (tile.temperature < TROPIC_TEMP)
                    tile.biome = Biome.FOREST;
                else
                    tile.biome = Biome.JUNGLE;
            }
            // assine the society-relevant values to the Tiles
            tile.arableArea = ARABILITY.get(tile.biome) * tile.getArea(); // start with the biome-defined habitability
            if (tile.arableArea > 0 || tile.biome === Biome.DESERT) { // if it is habitable at all or is a desert
                try {
                    for (var _e = (e_36 = void 0, __values(tile.neighbors.keys())), _f = _e.next(); !_f.done; _f = _e.next()) { // increase habitability based on adjacent water
                        var neighbor = _f.value;
                        var edge = tile.neighbors.get(neighbor);
                        if (neighbor.biome === Biome.LAKE || edge.flow > RIVER_UTILITY_THRESHOLD)
                            tile.arableArea += FRESHWATER_UTILITY * edge.getLength();
                        if (neighbor.biome === Biome.OCEAN)
                            tile.arableArea += SALTWATER_UTILITY * edge.getLength();
                    }
                }
                catch (e_36_1) { e_36 = { error: e_36_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_36) throw e_36.error; }
                }
            }
            tile.passability = PASSABILITY.get(tile.biome);
        }
    }
    catch (e_35_1) { e_35 = { error: e_35_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_35) throw e_35.error; }
    }
}
/**
 * fill all tiles that are connected to start by a chain of Tiles that are at or below level with ocean. then, return
 * the number of tiles that could be flooded this way.
 */
function floodFrom(start, level) {
    var e_37, _a;
    var numFilled = 0;
    var queue = new Queue([start], function (a, b) { return a.height - b.height; }); // it shall seed our ocean
    while (!queue.empty() && queue.peek().height <= level) { // flood all available tiles
        var next = queue.pop();
        if (next.biome !== Biome.OCEAN) {
            next.biome = Biome.OCEAN;
            numFilled++;
            try {
                for (var _b = (e_37 = void 0, __values(next.neighbors.keys())), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var neighbor = _c.value;
                    queue.push(neighbor);
                } // spreading the water to their neighbors
            }
            catch (e_37_1) { e_37 = { error: e_37_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_37) throw e_37.error; }
            }
        }
    }
    return numFilled;
}
/**
 * compute the diamond square noise algorithm on one Tile, given its parents.
 * @param tile Tile to be changed
 * @param parents Array of Tiles that will influence it
 * @param attr identifier of attribute that is being compared and set
 * @param surf Surface on which the algorithm takes place
 * @param rng Random to use for the values
 * @param maxScale the scale above which values are not correlated
 * @param level noise magnitude scalar
 * @param slope logarithmic rate at which noise dies off with distance
 * @return the value of attr this tile should take
 */
function getNoiseFunction(tile, parents, attr, surf, rng, maxScale, level, slope) {
    var e_38, _a;
    var scale = 0;
    var weightSum = 0;
    var value = 0;
    try {
        for (var parents_1 = __values(parents), parents_1_1 = parents_1.next(); !parents_1_1.done; parents_1_1 = parents_1.next()) {
            var parent_3 = parents_1_1.value;
            var dist = surf.distance(tile, parent_3); // look at parent distances
            var parentValue = void 0;
            if (attr === 'height')
                parentValue = parent_3.height;
            else if (attr === 'temperature')
                parentValue = parent_3.temperature;
            else if (attr === 'rainfall')
                parentValue = parent_3.rainfall;
            else
                throw new Error("no funcubli sife - parent.".concat(attr));
            scale += dist / parents.length; // compute the mean scale // TODO might save some time if I save these distances
            weightSum += 1 / dist;
            value += parentValue / dist; // compute the weighted average of them
        }
    }
    catch (e_38_1) { e_38 = { error: e_38_1 }; }
    finally {
        try {
            if (parents_1_1 && !parents_1_1.done && (_a = parents_1.return)) _a.call(parents_1);
        }
        finally { if (e_38) throw e_38.error; }
    }
    value /= weightSum; // normalize
    if (Number.isNaN(value) || scale > maxScale) { // above a certain scale (or in lieu of any parents)
        scale = maxScale; // the std levels out
        value = 0; // and information is no longer correlated
    }
    var std = level * Math.pow(scale / maxScale, slope);
    value += rng.normal(0, std); // finally, add the random part of the random noise
    return value;
}
/**
 * this isn't physics-based at all; just tuned to look nice.
 * @param T the temperature in °C
 * @return the evaporation rate in the same units as rainfall
 */
function evaporation_rate(T) {
    return EVAPORATION_COEFFICIENT * Math.pow(Math.max(0, T - EVAPORATION_INTERCEPT), EVAPORATION_POWER);
}
function bellCurve(x) {
    return 1 - x * x * (1 - x * x / 4);
}
function digibbalCurve(x) {
    return Math.sqrt(3125 / 512) * x * (1 - x * x * (1 - x * x / 4));
}
function wibbleCurve(x, δ) {
    return 1 + δ * Math.cos(12 * Math.PI * x);
}
//# sourceMappingURL=terrain.js.map