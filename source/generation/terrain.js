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
import Queue from '../datastructures/queue.js';
import { Vertex, Tile } from "../surface/surface.js";
import { argmin, union } from "../utilities/miscellaneus.js";
import { Vector } from "../utilities/geometry.js";
var TERME_NOISE_LEVEL = 12;
var BARXE_NOISE_LEVEL = 1;
var MAX_NOISE_SCALE = 1 / 8;
var ATMOSPHERE_THICKNESS = 12; // km
var CLOUD_HEIGHT = 2; // km
var OROGRAPHIC_MAGNITUDE = 1;
var OROGRAPHIC_RANGE = 500; // km
var RAINFALL_NEEDED_TO_CREATE_MARSH = 1e7; // km^2
var TUNDRA_TEMP = -10; // °C
var DESERT_INTERCEPT = -30; // °C
var DESERT_SLOPE = 60; // °C/u
var TAIGA_TEMP = +5; // °C
var FLASH_TEMP = +50; // °C
var TROPIC_TEMP = +22; // °C
var FOREST_INTERCEPT = -40; // °C
var FOREST_SLOPE = 37; // °C/u
var RIVER_THRESH = -25; // °C
var RIVER_WIDTH = 10; // km
var CANYON_DEPTH = 0.1; // km
var LAKE_THRESH = -0.07; // km
var OCEAN_DEPTH = 4; // km
var CONTINENT_VARIATION = .5; // km
var OCEANIC_VARIATION = 1; // km
var MOUNTAIN_HEIGHT = 4; // km
var VOLCANO_HEIGHT = 3.3; // km
var RIDGE_HEIGHT = 1.5; // km
var TRENCH_DEPTH = 4; // km
var MOUNTAIN_WIDTH = 400; // km
var TRENCH_WIDTH = 100; // km
var SLOPE_WIDTH = 200; // km
var RIDGE_WIDTH = 100; // km
var OCEAN_SIZE = 0.2; // as a fraction of continental length scale
var CONTINENTAL_CONVEXITY = 0.05; // between 0 and 1
/** different ways two plates can interact at a given fault */
var FaultType;
(function (FaultType) {
    FaultType[FaultType["CONTINENT_COLLISION"] = 0] = "CONTINENT_COLLISION";
    FaultType[FaultType["SEA_TRENCH"] = 1] = "SEA_TRENCH";
    FaultType[FaultType["ISLAND_ARC"] = 2] = "ISLAND_ARC";
    FaultType[FaultType["OCEANIC_RIFT"] = 3] = "OCEANIC_RIFT";
    FaultType[FaultType["RIFT_WITH_SLOPE"] = 4] = "RIFT_WITH_SLOPE";
})(FaultType || (FaultType = {}));
/** terrestrial ecoregion classifications */
export var Biome;
(function (Biome) {
    Biome[Biome["OCEAN"] = 0] = "OCEAN";
    Biome[Biome["LAKE"] = 1] = "LAKE";
    Biome[Biome["ICE"] = 2] = "ICE";
    Biome[Biome["TUNDRA"] = 3] = "TUNDRA";
    Biome[Biome["TAIGA"] = 4] = "TAIGA";
    Biome[Biome["FOREST"] = 5] = "FOREST";
    Biome[Biome["JUNGLE"] = 6] = "JUNGLE";
    Biome[Biome["DESERT"] = 7] = "DESERT";
    Biome[Biome["PLAINS"] = 8] = "PLAINS";
    Biome[Biome["STEAMLAND"] = 9] = "STEAMLAND";
})(Biome || (Biome = {}));
/** keys used for referencing biomes in configuration files */
export var BIOME_NAMES = [
    "ocean", "lake", "ice", "tundra", "taiga", "forest",
    "jungle", "desert", "plains", "steamland"
];
export var PASSABILITY = new Map([
    [Biome.OCEAN, 0.1],
    [Biome.JUNGLE, 0.1],
    [Biome.FOREST, 1.0],
    [Biome.LAKE, 3.0],
    [Biome.TAIGA, 1.0],
    [Biome.STEAMLAND, 0.3],
    [Biome.PLAINS, 3.0],
    [Biome.DESERT, 0.1],
    [Biome.TUNDRA, 0.3],
    [Biome.ICE, 0.1],
]);
export var ARABILITY = new Map([
    [Biome.OCEAN, 0.00],
    [Biome.JUNGLE, 0.30],
    [Biome.FOREST, 1.00],
    [Biome.LAKE, 0.00],
    [Biome.TAIGA, 0.10],
    [Biome.STEAMLAND, 0.03],
    [Biome.PLAINS, 0.30],
    [Biome.DESERT, 0.00],
    [Biome.TUNDRA, 0.03],
    [Biome.ICE, 0.00],
]);
export var RIVER_UTILITY_THRESHOLD = 1e6; // [km^2] size of watershed needed to produce a river that supports large cities
export var FRESHWATER_UTILITY = 20; // [km] width of highly populated region near river
export var SALTWATER_UTILITY = 50; // [km] width of highly populated region near coast
/**
 * create all of the continents and biomes and rivers that go into the physical geography
 * of a good fictional world.
 * @param numContinents number of continents, equal to half the number of plates
 * @param seaLevel desired sea level in km
 * @param meanTemperature some vaguely defined median temperature in Kelvin
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
    var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e;
    var maxScale = MAX_NOISE_SCALE * Math.sqrt(surf.area);
    try {
        for (var _f = __values(surf.tiles), _g = _f.next(); !_g.done; _g = _f.next()) { // start by assigning plates
            var tile = _g.value;
            if (tile.index < numPlates) {
                tile.plateIndex = tile.index; // the first few are seeds
                tile.height = 0;
                rng.next(); // but call rng anyway to keep things consistent
            }
            else { // and the rest with a method similar to that above
                var prefParents = [];
                try {
                    for (var _h = (e_2 = void 0, __values(tile.between)), _j = _h.next(); !_j.done; _j = _h.next()) { // if this tile is directly between two tiles
                        var pair = _j.value;
                        if (pair[0].plateIndex === pair[1].plateIndex) { // of the same plate
                            if (!prefParents.includes(pair[0]))
                                prefParents.push(pair[0]); // try to have it take the plate from one of them, to keep that plate together
                            if (!prefParents.includes(pair[1]))
                                prefParents.push(pair[1]);
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_j && !_j.done && (_b = _h.return)) _b.call(_h);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                var options = (prefParents.length > 0) ? prefParents : tile.parents;
                var distances = [];
                try {
                    for (var options_1 = (e_3 = void 0, __values(options)), options_1_1 = options_1.next(); !options_1_1.done; options_1_1 = options_1.next()) {
                        var parent_1 = options_1_1.value;
                        distances.push(surf.distance(tile, parent_1));
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (options_1_1 && !options_1_1.done && (_c = options_1.return)) _c.call(options_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                tile.plateIndex = options[argmin(distances)].plateIndex;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var _loop_1 = function (tile) {
        tile.height = getNoiseFunction(tile, tile.parents.filter(function (p) { return p.plateIndex === tile.plateIndex; }), 'height', surf, rng, maxScale, (tile.plateIndex % 2 === 0) ? CONTINENT_VARIATION : OCEANIC_VARIATION, 1); // at last apply the noise function
    };
    try {
        for (var _k = __values(surf.tiles), _l = _k.next(); !_l.done; _l = _k.next()) {
            var tile = _l.value;
            _loop_1(tile);
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_l && !_l.done && (_d = _k.return)) _d.call(_k);
        }
        finally { if (e_4) throw e_4.error; }
    }
    try {
        for (var _m = __values(surf.tiles), _o = _m.next(); !_o.done; _o = _m.next()) { // once that's done, add in the plate altitude baselines
            var tile = _o.value;
            if (tile.plateIndex % 2 === 0)
                tile.height += OCEAN_DEPTH / 2; // order them so that adding and removing plates results in minimal change
            else
                tile.height -= OCEAN_DEPTH / 2;
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (_o && !_o.done && (_e = _m.return)) _e.call(_m);
        }
        finally { if (e_5) throw e_5.error; }
    }
}
/**
 * apply plate tectonics to the surface!
 */
function movePlates(surf, rng) {
    var e_6, _a, e_7, _b, e_8, _c, e_9, _d, e_10, _e, e_11, _f;
    var velocities = [];
    try {
        for (var _g = __values(surf.tiles), _h = _g.next(); !_h.done; _h = _g.next()) { // start by counting up all the plates
            var tile = _h.value;
            if (tile.plateIndex >= velocities.length) // and assigning them random velocities // TODO allow for plate rotation in the tangent plane
                velocities.push(tile.east.times(rng.normal(0, Math.sqrt(.5))).plus(tile.north.times(rng.normal(0, Math.sqrt(.5))))); // orthogonal to the normal at their seeds
            else
                break;
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (_h && !_h.done && (_a = _g.return)) _a.call(_g);
        }
        finally { if (e_6) throw e_6.error; }
    }
    var oceanWidth = OCEAN_SIZE * Math.sqrt(surf.area / velocities.length); // do a little dimensional analysis on the ocean scale
    var hpQueue = new Queue([], function (a, b) { return a.distance - b.distance; });
    var lpQueue = new Queue([], function (a, b) { return a.distance - b.distance; });
    try {
        for (var _j = __values(surf.tiles), _k = _j.next(); !_k.done; _k = _j.next()) { // now for phase 2:
            var tile = _k.value;
            var fault = null;
            var minDistance = Infinity;
            try {
                for (var _l = (e_8 = void 0, __values(tile.neighbors.keys())), _m = _l.next(); !_m.done; _m = _l.next()) { // look for adjacent tiles
                    var neighbor = _m.value;
                    if (neighbor.plateIndex !== tile.plateIndex) { // that are on different plates
                        var distance = tile.neighbors.get(neighbor).getDistance();
                        if (fault === null || distance < minDistance) {
                            fault = neighbor;
                            minDistance = distance;
                        }
                    }
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_m && !_m.done && (_c = _l.return)) _c.call(_l);
                }
                finally { if (e_8) throw e_8.error; }
            }
            if (fault !== null) { // if you found one,
                var tilePos = new Vector(0, 0, 0); // do some additional computation to smooth out the boundaries
                var faultPos = new Vector(0, 0, 0);
                var tileMass = 0, faultMass = 0;
                try {
                    for (var _o = (e_9 = void 0, __values(union(tile.neighbors.keys(), fault.neighbors.keys()))), _p = _o.next(); !_p.done; _p = _o.next()) {
                        var t = _p.value;
                        if (t.plateIndex === tile.plateIndex) {
                            tilePos = tilePos.plus(t.pos);
                            tileMass++;
                        }
                        else if (t.plateIndex === fault.plateIndex) {
                            faultPos = faultPos.plus(t.pos);
                            faultMass++;
                        }
                    }
                }
                catch (e_9_1) { e_9 = { error: e_9_1 }; }
                finally {
                    try {
                        if (_p && !_p.done && (_d = _o.return)) _d.call(_o);
                    }
                    finally { if (e_9) throw e_9.error; }
                }
                var relPosition = tilePos.over(tileMass).minus(faultPos.over(faultMass));
                var relVelocity = velocities[tile.plateIndex].minus(velocities[fault.plateIndex]);
                var relSpeed = relPosition.normalized().dot(relVelocity); // determine the relSpeed at which they are moving away from each other
                var type = void 0, width = // and whether these are both continents or if this is a top or a bottom or what
                 void 0; // and whether these are both continents or if this is a top or a bottom or what
                if (relSpeed < 0) { // TODO: make relSpeed also depend on adjacent tiles to smooth out the fault lines and make better oceans
                    if (tile.height > 0 && fault.height > 0) {
                        type = FaultType.CONTINENT_COLLISION; // continental collision
                        width = -relSpeed * MOUNTAIN_WIDTH * Math.sqrt(2);
                    }
                    else if (tile.height < fault.height) {
                        type = FaultType.SEA_TRENCH; // deep sea trench
                        width = TRENCH_WIDTH * Math.sqrt(2);
                    }
                    else {
                        type = FaultType.ISLAND_ARC; // island arc
                        width = MOUNTAIN_WIDTH * Math.sqrt(2);
                    }
                }
                else {
                    if (tile.height < 0) {
                        type = FaultType.OCEANIC_RIFT; // mid-oceanic rift
                        width = relSpeed * RIDGE_WIDTH * 2;
                    }
                    else {
                        type = FaultType.RIFT_WITH_SLOPE; // mid-oceanic rift plus continental slope (plus a little bit of convexity)
                        width = 2 * relSpeed * oceanWidth;
                    }
                }
                var queueElement = {
                    tile: tile, distance: minDistance / 2, width: width,
                    speed: Math.abs(relSpeed), type: type
                }; // add it to the queue
                if (type === FaultType.RIFT_WITH_SLOPE)
                    hpQueue.push(queueElement);
                else
                    lpQueue.push(queueElement); // which queue depends on priority
                // tile.relSpeed = relSpeed;
            }
            // else
            // tile.relSpeed = NaN;
            tile.flag = false; // also set up these temporary flags
        }
    }
    catch (e_7_1) { e_7 = { error: e_7_1 }; }
    finally {
        try {
            if (_k && !_k.done && (_b = _j.return)) _b.call(_j);
        }
        finally { if (e_7) throw e_7.error; }
    }
    try {
        for (var _q = __values([hpQueue, lpQueue]), _r = _q.next(); !_r.done; _r = _q.next()) { // now, we iterate through the queues
            var queue = _r.value;
            while (!queue.empty()) { // in order of priority
                var _s = queue.pop(), tile = _s.tile, distance = _s.distance, width = _s.width, speed = _s.speed, type = _s.type; // each element of the queue is a tile waiting to be affected by plate tectonics
                if (tile.flag)
                    continue; // some of them may have already come up
                if (distance > width)
                    continue; // there's also always a possibility we are out of the range of influence of this fault
                if (type === FaultType.CONTINENT_COLLISION) { // based on the type, find the height change as a function of distance
                    var x = distance / (speed * MOUNTAIN_WIDTH);
                    tile.height += Math.sqrt(speed) * MOUNTAIN_HEIGHT * // continent-continent ranges are even
                        bellCurve(x) * wibbleCurve(x); // (the sinusoidal term makes it a little more rugged)
                }
                else if (type === FaultType.SEA_TRENCH) {
                    var x = distance / TRENCH_WIDTH;
                    tile.height -= speed * TRENCH_DEPTH *
                        digibbalCurve(x) * wibbleCurve(x); // while subductive faults are odd
                }
                else if (type === FaultType.ISLAND_ARC) {
                    var x = distance / MOUNTAIN_WIDTH;
                    tile.height += speed * VOLCANO_HEIGHT *
                        digibbalCurve(x) * wibbleCurve(x);
                }
                else if (type === FaultType.OCEANIC_RIFT) {
                    var width_1 = speed * oceanWidth;
                    var x0 = Math.min(0, width_1 - 2 * SLOPE_WIDTH - 2 * RIDGE_WIDTH);
                    var xR = (distance - x0) / RIDGE_WIDTH;
                    tile.height += RIDGE_HEIGHT * Math.exp(-xR);
                }
                else if (type === FaultType.RIFT_WITH_SLOPE) {
                    var width_2 = speed * oceanWidth; // passive margins are kind of complicated
                    var x0 = Math.min(0, width_2 - 2 * SLOPE_WIDTH - 2 * RIDGE_WIDTH);
                    var xS = (width_2 - distance) / SLOPE_WIDTH;
                    var xR = (distance - x0) / RIDGE_WIDTH;
                    tile.height += Math.min(OCEAN_DEPTH * (Math.exp(-xS) - 1) + RIDGE_HEIGHT * Math.exp(-xR), -OCEAN_DEPTH / 2 / (1 + Math.exp(xS / 2.) / CONTINENTAL_CONVEXITY));
                }
                else {
                    throw new Error("Unrecognized fault type");
                }
                tile.flag = true; // mark this tile
                try {
                    for (var _t = (e_11 = void 0, __values(tile.neighbors.keys())), _u = _t.next(); !_u.done; _u = _t.next()) {
                        var neighbor = _u.value;
                        if (neighbor.plateIndex === tile.plateIndex)
                            queue.push({
                                tile: neighbor,
                                distance: distance + tile.neighbors.get(neighbor).getDistance(),
                                width: width, speed: speed, type: type
                            });
                    }
                }
                catch (e_11_1) { e_11 = { error: e_11_1 }; }
                finally {
                    try {
                        if (_u && !_u.done && (_f = _t.return)) _f.call(_t);
                    }
                    finally { if (e_11) throw e_11.error; }
                }
            }
        }
    }
    catch (e_10_1) { e_10 = { error: e_10_1 }; }
    finally {
        try {
            if (_r && !_r.done && (_e = _q.return)) _e.call(_q);
        }
        finally { if (e_10) throw e_10.error; }
    }
}
/**
 * fill in the ocean biome using a very simple flood fill
 * @param level the altitude up to which to fill
 * @param surf the surface
 */
function fillOcean(level, surf) {
    var e_12, _a, e_13, _b, e_14, _c;
    var bestStart = null; // the size of the ocean depends heavily on where we start
    var remainingUnchecked = surf.tiles.size;
    var bestSize = 0;
    try {
        for (var _d = __values(surf.tiles), _e = _d.next(); !_e.done; _e = _d.next()) { // we want to find the start point that maximizes that size
            var start = _e.value;
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
    catch (e_12_1) { e_12 = { error: e_12_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
        }
        finally { if (e_12) throw e_12.error; }
    }
    if (bestStart === null)
        return; // it's theoretically possible that *everything* was above sea level.  in which case eh.
    try {
        for (var _f = __values(surf.tiles), _g = _f.next(); !_g.done; _g = _f.next()) {
            var tile = _g.value;
            tile.biome = null;
        }
    }
    catch (e_13_1) { e_13 = { error: e_13_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
        }
        finally { if (e_13) throw e_13.error; }
    }
    floodFrom(bestStart, level); // and re-flood the best one you found
    try {
        for (var _h = __values(surf.tiles), _j = _h.next(); !_j.done; _j = _h.next()) {
            var tile = _j.value;
            tile.height -= level;
        }
    }
    catch (e_14_1) { e_14 = { error: e_14_1 }; }
    finally {
        try {
            if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
        }
        finally { if (e_14) throw e_14.error; }
    }
}
function generateClimate(avgTerme, surf, rng) {
    var e_15, _a, e_16, _b, e_17, _c, e_18, _d, e_19, _e, e_20, _f;
    var maxScale = MAX_NOISE_SCALE * Math.sqrt(surf.area);
    try {
        for (var _g = __values(surf.tiles), _h = _g.next(); !_h.done; _h = _g.next()) { // assign each tile random values
            var tile = _h.value;
            tile.temperature = getNoiseFunction(tile, tile.parents, 'temperature', surf, rng, maxScale, TERME_NOISE_LEVEL, 2);
            tile.rainfall = getNoiseFunction(tile, tile.parents, 'rainfall', surf, rng, maxScale, BARXE_NOISE_LEVEL, 2);
        }
    }
    catch (e_15_1) { e_15 = { error: e_15_1 }; }
    finally {
        try {
            if (_h && !_h.done && (_a = _g.return)) _a.call(_g);
        }
        finally { if (e_15) throw e_15.error; }
    }
    try {
        for (var _j = __values(surf.tiles), _k = _j.next(); !_k.done; _k = _j.next()) { // and then throw in the baseline
            var tile = _k.value;
            tile.temperature += Math.pow(surf.insolation(tile.φ) * Math.exp(-tile.height / ATMOSPHERE_THICKNESS), 1 / 4.) * avgTerme - 273;
            tile.rainfall += surf.windConvergence(tile.φ);
            var _l = surf.windVelocity(tile.φ), north = _l.north, east = _l.east;
            tile.windVelocity = tile.north.times(north).plus(tile.east.times(east));
        }
    }
    catch (e_16_1) { e_16 = { error: e_16_1 }; }
    finally {
        try {
            if (_k && !_k.done && (_b = _j.return)) _b.call(_j);
        }
        finally { if (e_16) throw e_16.error; }
    }
    try {
        for (var _m = __values(surf.tiles), _o = _m.next(); !_o.done; _o = _m.next()) {
            var tile = _o.value;
            tile.downwind = [];
        }
    }
    catch (e_17_1) { e_17 = { error: e_17_1 }; }
    finally {
        try {
            if (_o && !_o.done && (_c = _m.return)) _c.call(_m);
        }
        finally { if (e_17) throw e_17.error; }
    }
    var queue = [];
    try {
        for (var _p = __values(surf.tiles), _q = _p.next(); !_q.done; _q = _p.next()) {
            var tile = _q.value;
            var bestTile = null, bestDixe = null; // define tile.upwind as the neighbor that is in the upwindest direction of each tile
            try {
                for (var _r = (e_19 = void 0, __values(tile.neighbors.keys())), _s = _r.next(); !_s.done; _s = _r.next()) {
                    var neighbor = _s.value;
                    var dix = neighbor.pos.minus(tile.pos).normalized();
                    if (bestDixe === null ||
                        dix.dot(tile.windVelocity) < bestDixe.dot(tile.windVelocity)) {
                        bestTile = neighbor;
                        bestDixe = dix;
                    }
                }
            }
            catch (e_19_1) { e_19 = { error: e_19_1 }; }
            finally {
                try {
                    if (_s && !_s.done && (_e = _r.return)) _e.call(_r);
                }
                finally { if (e_19) throw e_19.error; }
            }
            bestTile.downwind.push(tile); // and make sure that all tiles know who is downwind of them
            if (tile.biome === Biome.OCEAN) // also seed the orographic effect in the oceans
                queue.push({ tile: tile, moisture: OROGRAPHIC_MAGNITUDE });
            if (tile.height > CLOUD_HEIGHT) // and also remove some moisture from mountains
                tile.rainfall -= OROGRAPHIC_MAGNITUDE;
        }
    }
    catch (e_18_1) { e_18 = { error: e_18_1 }; }
    finally {
        try {
            if (_q && !_q.done && (_d = _p.return)) _d.call(_p);
        }
        finally { if (e_18) throw e_18.error; }
    }
    while (queue.length > 0) {
        var _t = queue.pop(), tile = _t.tile, moisture = _t.moisture; // each tile looks downwind
        tile.rainfall += moisture;
        try {
            for (var _u = (e_20 = void 0, __values(tile.downwind)), _v = _u.next(); !_v.done; _v = _u.next()) {
                var downwind = _v.value;
                if (downwind.biome !== Biome.OCEAN && downwind.height <= CLOUD_HEIGHT) { // land neighbors that are not separated by mountains
                    var distance = tile.neighbors.get(downwind).getDistance();
                    queue.push({
                        tile: downwind,
                        moisture: moisture * Math.exp(-distance / OROGRAPHIC_RANGE / Math.sqrt(downwind.windVelocity.sqr()))
                    }); // receive slightly less moisture than this one got
                }
            }
        }
        catch (e_20_1) { e_20 = { error: e_20_1 }; }
        finally {
            try {
                if (_v && !_v.done && (_f = _u.return)) _f.call(_u);
            }
            finally { if (e_20) throw e_20.error; }
        }
    }
}
/**
 * give the surface some rivers to draw, and also set up some nearby lakes.
 * @param surf the Surface on which this takes place
 */
function addRivers(surf) {
    var e_21, _a, e_22, _b, e_23, _c, e_24, _d, e_25, _e, e_26, _f, e_27, _g, e_28, _h, e_29, _j, e_30, _k, e_31, _l;
    try {
        for (var _m = __values(surf.vertices), _o = _m.next(); !_o.done; _o = _m.next()) {
            var vertex = _o.value;
            var numAdjacentTiles = 0;
            var totalHeight = 0;
            try {
                for (var _p = (e_22 = void 0, __values(vertex.tiles)), _q = _p.next(); !_q.done; _q = _p.next()) {
                    var tile = _q.value;
                    if (tile instanceof Tile) {
                        totalHeight += tile.height;
                        numAdjacentTiles += 1;
                    }
                }
            }
            catch (e_22_1) { e_22 = { error: e_22_1 }; }
            finally {
                try {
                    if (_q && !_q.done && (_b = _p.return)) _b.call(_p);
                }
                finally { if (e_22) throw e_22.error; }
            }
            vertex.height = totalHeight / numAdjacentTiles; // first define altitudes for vertices, which only matters for this one purpose
            vertex.downstream = null; // also initialize this
        }
    }
    catch (e_21_1) { e_21 = { error: e_21_1 }; }
    finally {
        try {
            if (_o && !_o.done && (_a = _m.return)) _a.call(_m);
        }
        finally { if (e_21) throw e_21.error; }
    }
    var riverOrder = new Map();
    var riverStack = [];
    var riverQueue = new Queue([], function (a, b) { return b.quality - a.quality; }); // start with a queue of rivers forming from their deltas
    try {
        for (var _r = __values(surf.vertices), _s = _r.next(); !_s.done; _s = _r.next()) { // fill it initially with coastal vertices that are guaranteed to flow into the ocean or off the edge
            var vertex = _s.value;
            try {
                for (var _t = (e_24 = void 0, __values(vertex.tiles)), _u = _t.next(); !_u.done; _u = _t.next()) {
                    var tile = _u.value;
                    if (tile instanceof Tile && tile.biome === Biome.OCEAN) {
                        riverQueue.push({
                            below: tile, above: vertex,
                            maxHeight: 0, uphillLength: 0,
                            quality: Infinity,
                        });
                        break;
                    }
                }
            }
            catch (e_24_1) { e_24 = { error: e_24_1 }; }
            finally {
                try {
                    if (_u && !_u.done && (_d = _t.return)) _d.call(_t);
                }
                finally { if (e_24) throw e_24.error; }
            }
        }
    }
    catch (e_23_1) { e_23 = { error: e_23_1 }; }
    finally {
        try {
            if (_s && !_s.done && (_c = _r.return)) _c.call(_r);
        }
        finally { if (e_23) throw e_23.error; }
    }
    while (!riverQueue.empty()) { // then iteratively extend them
        var _v = riverQueue.pop(), below = _v.below, above = _v.above, maxHeight = _v.maxHeight, uphillLength = _v.uphillLength; // pick out the steepest potential river
        if (above.downstream === null) { // if it's available
            above.downstream = below; // take it
            riverOrder.set(above, riverStack.length); // track the number of steps from the delta
            riverStack.push(above); // cue it up for the flow calculation later
            try {
                for (var _w = (e_25 = void 0, __values(above.neighbors.keys())), _x = _w.next(); !_x.done; _x = _w.next()) { // then look for what comes next
                    var beyond = _x.value;
                    if (beyond !== null) {
                        if (beyond.downstream === null) { // (it's a little redundant, but checking availability here, as well, saves some time)
                            if (beyond.height >= maxHeight - CANYON_DEPTH) {
                                var length_1 = surf.distance(beyond, above);
                                var quality = // decide how good a river this would be
                                 void 0; // decide how good a river this would be
                                if (length_1 < RIVER_WIDTH)
                                    quality = Infinity;
                                else if (beyond.height >= above.height) // calculate the slope for downhill rivers
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
            catch (e_25_1) { e_25 = { error: e_25_1 }; }
            finally {
                try {
                    if (_x && !_x.done && (_e = _w.return)) _e.call(_w);
                }
                finally { if (e_25) throw e_25.error; }
            }
        }
    }
    try {
        for (var _y = __values(surf.vertices), _z = _y.next(); !_z.done; _z = _y.next()) {
            var vertex = _z.value;
            vertex.flow = 0; // define this temporary variable real quick...
            try {
                for (var _0 = (e_27 = void 0, __values(vertex.neighbors.values())), _1 = _0.next(); !_1.done; _1 = _0.next()) {
                    var edge = _1.value;
                    edge.flow = 0;
                }
            }
            catch (e_27_1) { e_27 = { error: e_27_1 }; }
            finally {
                try {
                    if (_1 && !_1.done && (_g = _0.return)) _g.call(_0);
                }
                finally { if (e_27) throw e_27.error; }
            }
        }
    }
    catch (e_26_1) { e_26 = { error: e_26_1 }; }
    finally {
        try {
            if (_z && !_z.done && (_f = _y.return)) _f.call(_y);
        }
        finally { if (e_26) throw e_26.error; }
    }
    surf.rivers = new Set();
    // now we need to propagate water downhill to calculate flow rates
    var unitArea = surf.area / surf.tiles.size;
    while (riverStack.length > 0) {
        var vertex = riverStack.pop(); // at each river vertex
        if (vertex.downstream instanceof Vertex) {
            try {
                for (var _2 = (e_28 = void 0, __values(vertex.tiles)), _3 = _2.next(); !_3.done; _3 = _2.next()) { // compute the sum of rainfall and inflow (with some adjustments)
                    var tile = _3.value;
                    if (tile instanceof Tile) {
                        var nadasle = 1; // base river yield is 1 per tile
                        nadasle += tile.rainfall - (tile.temperature - DESERT_INTERCEPT) / DESERT_SLOPE; // add in biome factor
                        nadasle += tile.height / CLOUD_HEIGHT; // add in mountain sources
                        if (nadasle > 0 && tile.temperature >= RIVER_THRESH) // this could lead to evaporation, but I'm not doing that because it would look ugly
                            vertex.flow += nadasle * unitArea / tile.neighbors.size;
                    }
                }
            }
            catch (e_28_1) { e_28 = { error: e_28_1 }; }
            finally {
                try {
                    if (_3 && !_3.done && (_h = _2.return)) _h.call(_2);
                }
                finally { if (e_28) throw e_28.error; }
            }
            vertex.downstream.flow += vertex.flow; // and pass that flow onto the downstream tile
            vertex.neighbors.get(vertex.downstream).flow = vertex.flow;
        }
        if (vertex.downstream instanceof Vertex || vertex.downstream instanceof Tile)
            surf.rivers.add([vertex, vertex.downstream]);
    }
    var lageQueue = __spreadArray([], __read(surf.tiles), false).filter(function (t) { return !surf.edge.has(t); });
    queue: while (lageQueue.length > 0) { // now look at the tiles
        var tile = lageQueue.pop(); // TODO: make lakes more likely to appear on large rivers
        if (tile.isWater() || tile.temperature < RIVER_THRESH)
            continue; // ignoring things that are already water or too cold for this
        // check whether there is up to 1 continuous body of water at its border
        var seenAnyWater = false;
        var seenRightEdge = false;
        try {
            for (var _4 = (e_29 = void 0, __values(tile.getPolygon())), _5 = _4.next(); !_5.done; _5 = _4.next()) {
                var vertex = _5.value.vertex;
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
        catch (e_29_1) { e_29 = { error: e_29_1 }; }
        finally {
            try {
                if (_5 && !_5.done && (_j = _4.return)) _j.call(_4);
            }
            finally { if (e_29) throw e_29.error; }
        }
        if (!seenAnyWater) // if there wasn't _any_ adjacent water
            continue; // then there's nothing to feed the lake
        // locate the downstreamest river flowing away
        var outflow = null;
        try {
            for (var _6 = (e_30 = void 0, __values(tile.getPolygon())), _7 = _6.next(); !_7.done; _7 = _6.next()) {
                var vertex = _7.value.vertex;
                if (outflow === null || riverOrder.get(vertex) <= riverOrder.get(outflow)) // i.e. the vertex with the most ultimate flow
                    outflow = vertex;
            }
        }
        catch (e_30_1) { e_30 = { error: e_30_1 }; }
        finally {
            try {
                if (_7 && !_7.done && (_k = _6.return)) _k.call(_6);
            }
            finally { if (e_30) throw e_30.error; }
        }
        if (outflow !== null && outflow.downstream instanceof Vertex &&
            outflow.height - outflow.downstream.height < LAKE_THRESH) { // if we made it through all that, make an altitude check
            tile.biome = Biome.LAKE; // and assign lake status. you've earned it, tile.
            try {
                for (var _8 = (e_31 = void 0, __values(tile.neighbors.keys())), _9 = _8.next(); !_9.done; _9 = _8.next()) {
                    var neighbor = _9.value;
                    lageQueue.push(neighbor);
                } // tell your friends.
            }
            catch (e_31_1) { e_31 = { error: e_31_1 }; }
            finally {
                try {
                    if (_9 && !_9.done && (_l = _8.return)) _l.call(_8);
                }
                finally { if (e_31) throw e_31.error; }
            }
        }
    }
}
/**
 * assign biomes to all unassigned tiles according to simple rules.
 * @param surf the surface to which we're doing this
 */
function setBiomes(surf) {
    var e_32, _a, e_33, _b, e_34, _c;
    try {
        for (var _d = __values(surf.tiles), _e = _d.next(); !_e.done; _e = _d.next()) {
            var tile = _e.value;
            var adjacentWater = false;
            try {
                for (var _f = (e_33 = void 0, __values(tile.neighbors.keys())), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var neighbor = _g.value;
                    if (neighbor.biome === Biome.OCEAN || neighbor.biome === Biome.LAKE ||
                        tile.neighbors.get(neighbor).flow > RAINFALL_NEEDED_TO_CREATE_MARSH)
                        adjacentWater = true;
                }
            }
            catch (e_33_1) { e_33 = { error: e_33_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_33) throw e_33.error; }
            }
            // make sure the edge is frozen to hold all the water in
            if (surf.edge.has(tile))
                tile.biome = Biome.ICE;
            // assign all other biomes based on temperature and rainfall
            else if (tile.biome === null) {
                if (tile.temperature < RIVER_THRESH)
                    tile.biome = Biome.ICE;
                else if (tile.temperature < TUNDRA_TEMP)
                    tile.biome = Biome.TUNDRA;
                else if (tile.temperature > DESERT_SLOPE * tile.rainfall + DESERT_INTERCEPT)
                    tile.biome = Biome.DESERT;
                else if (tile.temperature < TAIGA_TEMP)
                    tile.biome = Biome.TAIGA;
                else if (tile.temperature > FLASH_TEMP)
                    tile.biome = Biome.STEAMLAND;
                else if (tile.temperature > FOREST_SLOPE * tile.rainfall + FOREST_INTERCEPT)
                    tile.biome = Biome.PLAINS;
                else if (tile.temperature < TROPIC_TEMP)
                    tile.biome = Biome.FOREST;
                else
                    tile.biome = Biome.JUNGLE;
            }
            // assine the society-relevant values to the Tiles
            tile.arableArea = ARABILITY.get(tile.biome) * tile.getArea(); // start with the biome-defined habitability
            if (tile.arableArea > 0 || tile.biome === Biome.DESERT) { // if it is habitable at all or is a desert
                try {
                    for (var _h = (e_34 = void 0, __values(tile.neighbors.keys())), _j = _h.next(); !_j.done; _j = _h.next()) { // increase habitability based on adjacent water
                        var neighbor = _j.value;
                        var edge = tile.neighbors.get(neighbor);
                        if (neighbor.biome === Biome.LAKE || edge.flow > RIVER_UTILITY_THRESHOLD)
                            tile.arableArea += FRESHWATER_UTILITY * edge.getLength();
                        if (neighbor.biome === Biome.OCEAN)
                            tile.arableArea += SALTWATER_UTILITY * edge.getLength();
                    }
                }
                catch (e_34_1) { e_34 = { error: e_34_1 }; }
                finally {
                    try {
                        if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                    }
                    finally { if (e_34) throw e_34.error; }
                }
            }
            tile.passability = PASSABILITY.get(tile.biome);
        }
    }
    catch (e_32_1) { e_32 = { error: e_32_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
        }
        finally { if (e_32) throw e_32.error; }
    }
}
/**
 * fill all tiles that are connected to start by a chain of Tiles that are at or below level with ocean. then, return
 * the number of tiles that could be flooded this way.
 */
function floodFrom(start, level) {
    var e_35, _a;
    var numFilled = 0;
    var queue = new Queue([start], function (a, b) { return a.height - b.height; }); // it shall seed our ocean
    while (!queue.empty() && queue.peek().height <= level) { // flood all available tiles
        var next = queue.pop();
        if (next.biome !== Biome.OCEAN) {
            next.biome = Biome.OCEAN;
            numFilled++;
            try {
                for (var _b = (e_35 = void 0, __values(next.neighbors.keys())), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var neighbor = _c.value;
                    queue.push(neighbor);
                } // spreading the water to their neighbors
            }
            catch (e_35_1) { e_35 = { error: e_35_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_35) throw e_35.error; }
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
    var e_36, _a;
    var scale = 0;
    var weightSum = 0;
    var value = 0;
    try {
        for (var parents_1 = __values(parents), parents_1_1 = parents_1.next(); !parents_1_1.done; parents_1_1 = parents_1.next()) {
            var parent_2 = parents_1_1.value;
            var dist = surf.distance(tile, parent_2); // look at parent distances
            var parentValue = void 0;
            if (attr === 'height')
                parentValue = parent_2.height;
            else if (attr === 'temperature')
                parentValue = parent_2.temperature;
            else if (attr === 'rainfall')
                parentValue = parent_2.rainfall;
            else
                throw new Error("no funcubli sife - parent.".concat(attr));
            scale += dist / parents.length; // compute the mean scale // TODO might save some time if I save these distances
            weightSum += 1 / dist;
            value += parentValue / dist; // compute the weighted average of them
        }
    }
    catch (e_36_1) { e_36 = { error: e_36_1 }; }
    finally {
        try {
            if (parents_1_1 && !parents_1_1.done && (_a = parents_1.return)) _a.call(parents_1);
        }
        finally { if (e_36) throw e_36.error; }
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
function bellCurve(x) {
    return (1 - x * x * (1 - x * x / 4));
}
function digibbalCurve(x) {
    return Math.sqrt(3125 / 512) * x * (1 - x * x * (1 - x * x / 4));
}
function wibbleCurve(x) {
    return 1 + Math.cos(12 * Math.PI * x) / 6;
}
//# sourceMappingURL=terrain.js.map