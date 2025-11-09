/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
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
import { filterSet } from "../utilities/miscellaneus.js";
import Queue from "../utilities/external/tinyqueue.js";
/**
 * break the land tiles of the world up into a handful of continents.
 * each continent will have an area of around `targetArea`,
 * and they will be delineated by oceans and isthmuses
 */
export function subdivideLand(tiles, targetNumContinents, connectionDistance) {
    var land = filterSet(tiles, function (t) { return !t.isSaltWater() && !t.isIceCovered(); });
    if (land.size === 0)
        return []; // if there is no land, then there are no continents
    // first, perform a grassfire transform to get the distance from the ocean of each Tile
    var distanceMap;
    try {
        distanceMap = calculateBoundaryDistance(land);
    }
    catch (e) {
        return [land]; // if this fails, that probably means there's no boundary, so just use the whole thing
    }
    // now calculate the "drainage divides" of this distance function
    var basins = calculateInvertedDrainageBasins(land, distanceMap);
    var totalLandArea = __spreadArray([], __read(land), false).map(function (t) { return t.getArea(); }).reduce(function (a, b) { return a + b; });
    var targetContinentArea = totalLandArea / targetNumContinents;
    var minimumContinentArea = targetContinentArea / 6;
    var fudgeFactor = 1;
    var numTries = 0;
    var continents;
    while (true) { // it may take a few tries to get this next part right
        // combine neiboring ones that are too small
        var regions = combineAdjacentRegions(basins, targetContinentArea * fudgeFactor, minimumContinentArea * fudgeFactor);
        // then remove small ones and expand the bigger ones to cover them
        continents = makeContinentsComprehensive(land, regions, minimumContinentArea, connectionDistance);
        // aim for between 2 and 2×target continents
        numTries++;
        if (numTries > 3)
            break;
        else if (regions.length < 2)
            fudgeFactor /= 2;
        else if (regions.length > 2 * targetNumContinents)
            fudgeFactor *= 2;
        else
            break;
    }
    return continents.map(function (continent) { return continent.tiles; });
}
/**
 * calculate the distance of every Tile in region from the nearest Tile in boundaries
 */
function calculateBoundaryDistance(region) {
    var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
    // seed the queue with all coastal tiles
    var startPoints = [];
    try {
        for (var region_1 = __values(region), region_1_1 = region_1.next(); !region_1_1.done; region_1_1 = region_1.next()) {
            var tile = region_1_1.value;
            try {
                for (var _e = (e_2 = void 0, __values(tile.neighbors.keys())), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var neibor = _f.value;
                    if (!region.has(neibor)) {
                        startPoints.push({
                            tile: tile,
                            seaDistance: tile.neighbors.get(neibor).getDistance() / 2,
                        });
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (region_1_1 && !region_1_1.done && (_a = region_1.return)) _a.call(region_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var grassfireQueue = new Queue(startPoints, function (a, b) { return a.seaDistance - b.seaDistance; });
    if (grassfireQueue.empty())
        throw new Error("the region is somehow completely separated from the boundaries so the distance is undefined.");
    // store the distances in this map
    var seaDistanceMap = new Map();
    while (!grassfireQueue.empty()) {
        var _g = grassfireQueue.pop(), tile = _g.tile, seaDistance = _g.seaDistance;
        if (seaDistanceMap.has(tile))
            continue;
        else {
            seaDistanceMap.set(tile, seaDistance);
            try {
                for (var _h = (e_3 = void 0, __values(tile.neighbors.keys())), _j = _h.next(); !_j.done; _j = _h.next()) {
                    var mauka = _j.value;
                    if (region.has(mauka) && !seaDistanceMap.has(mauka))
                        grassfireQueue.push({
                            tile: mauka,
                            seaDistance: seaDistance + tile.neighbors.get(mauka).getDistance(),
                        });
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
    }
    try {
        // check that we got them all
        for (var region_2 = __values(region), region_2_1 = region_2.next(); !region_2_1.done; region_2_1 = region_2.next()) {
            var tile = region_2_1.value;
            if (!seaDistanceMap.has(tile))
                throw new Error("what happened?  why didn't we get the distance of this BIOME-".concat(tile.biome, " tile?"));
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (region_2_1 && !region_2_1.done && (_d = region_2.return)) _d.call(region_2);
        }
        finally { if (e_4) throw e_4.error; }
    }
    if (seaDistanceMap.size !== region.size)
        throw new Error("what happened?  we categorized the distances of ".concat(seaDistanceMap.size, " tiles but we were supposed to categorize ").concat(region.size, "."));
    return seaDistanceMap;
}
/**
 * calculate the inverted drainage divides of a heightmap.
 * rather than seeding water thruout the region, making it flow downward, and seeing where it exits,
 * we drop water at the edges of the region, make it flow upward, and see where it collects.
 * @param tiles the set of tiles we want to divide up
 * @param heightmap the Map used to determine the altitude of each Tile
 * @return a bunch of Regions that cover the space
 */
function calculateInvertedDrainageBasins(tiles, heightmap) {
    var e_5, _a, e_6, _b, e_7, _c;
    // go from top to bottom, adding each Tile to the appropriate basin
    var roots = new Set();
    var basins = new Map();
    var tilesFromTopToBottom = __spreadArray([], __read(tiles), false).sort(function (a, b) { return heightmap.get(b) - heightmap.get(a); });
    try {
        for (var tilesFromTopToBottom_1 = __values(tilesFromTopToBottom), tilesFromTopToBottom_1_1 = tilesFromTopToBottom_1.next(); !tilesFromTopToBottom_1_1.done; tilesFromTopToBottom_1_1 = tilesFromTopToBottom_1.next()) {
            var tile = tilesFromTopToBottom_1_1.value;
            if (!heightmap.has(tile))
                throw new Error("the heightmap is incomplete!");
            // calculate to which neibor this will flow
            var highestNeibor = null;
            try {
                for (var _d = (e_6 = void 0, __values(tile.neighbors.keys())), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var neibor = _e.value;
                    if (tiles.has(neibor))
                        if (highestNeibor === null || heightmap.get(neibor) > heightmap.get(highestNeibor))
                            highestNeibor = neibor;
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
                }
                finally { if (e_6) throw e_6.error; }
            }
            // find the basin associated with that neibor
            var basin = void 0;
            if (highestNeibor !== null && basins.has(highestNeibor)) {
                basin = basins.get(highestNeibor);
            }
            else {
                roots.add(tile); // or create a new one if this is a local max
                basin = { tiles: new Set(), area: 0, borders: null };
            }
            // add it to that basin
            basin.tiles.add(tile);
            basin.area += tile.getArea();
            basins.set(tile, basin);
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (tilesFromTopToBottom_1_1 && !tilesFromTopToBottom_1_1.done && (_a = tilesFromTopToBottom_1.return)) _a.call(tilesFromTopToBottom_1);
        }
        finally { if (e_5) throw e_5.error; }
    }
    // finally, extract all of the basins in an array
    var uniqueBasins = [];
    try {
        for (var roots_1 = __values(roots), roots_1_1 = roots_1.next(); !roots_1_1.done; roots_1_1 = roots_1.next()) {
            var root = roots_1_1.value;
            uniqueBasins.push(basins.get(root));
        }
    }
    catch (e_7_1) { e_7 = { error: e_7_1 }; }
    finally {
        try {
            if (roots_1_1 && !roots_1_1.done && (_c = roots_1.return)) _c.call(roots_1);
        }
        finally { if (e_7) throw e_7.error; }
    }
    return uniqueBasins;
}
/**
 * take a bunch of collections of Tiles, and combine some of them together so that as many as possible have areas
 * of about targetArea, and ideally at least minimumArea.
 */
function combineAdjacentRegions(regions, targetArea, minimumArea) {
    var e_8, _a, e_9, _b, e_10, _c, e_11, _d, e_12, _e, e_13, _f, e_14, _g, e_15, _h, e_16, _j, e_17, _k, e_18, _l;
    if (regions.length === 0)
        return [];
    // build a map so we can look up who owns each Tile
    var map = new Map();
    try {
        for (var regions_1 = __values(regions), regions_1_1 = regions_1.next(); !regions_1_1.done; regions_1_1 = regions_1.next()) {
            var region = regions_1_1.value;
            try {
                for (var _m = (e_9 = void 0, __values(region.tiles)), _o = _m.next(); !_o.done; _o = _m.next()) {
                    var tile = _o.value;
                    map.set(tile, region);
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_o && !_o.done && (_b = _m.return)) _b.call(_m);
                }
                finally { if (e_9) throw e_9.error; }
            }
        }
    }
    catch (e_8_1) { e_8 = { error: e_8_1 }; }
    finally {
        try {
            if (regions_1_1 && !regions_1_1.done && (_a = regions_1.return)) _a.call(regions_1);
        }
        finally { if (e_8) throw e_8.error; }
    }
    try {
        // determine which are adjacent to each other and by how much
        for (var regions_2 = __values(regions), regions_2_1 = regions_2.next(); !regions_2_1.done; regions_2_1 = regions_2.next()) {
            var region = regions_2_1.value;
            region.borders = new Map();
        }
    }
    catch (e_10_1) { e_10 = { error: e_10_1 }; }
    finally {
        try {
            if (regions_2_1 && !regions_2_1.done && (_c = regions_2.return)) _c.call(regions_2);
        }
        finally { if (e_10) throw e_10.error; }
    }
    try {
        for (var regions_3 = __values(regions), regions_3_1 = regions_3.next(); !regions_3_1.done; regions_3_1 = regions_3.next()) {
            var regionA = regions_3_1.value;
            try {
                for (var _p = (e_12 = void 0, __values(regionA.tiles)), _q = _p.next(); !_q.done; _q = _p.next()) {
                    var tile = _q.value;
                    try {
                        for (var _r = (e_13 = void 0, __values(tile.neighbors.keys())), _s = _r.next(); !_s.done; _s = _r.next()) {
                            var neibor = _s.value;
                            if (map.has(neibor) && regionA !== map.get(neibor)) {
                                var regionB = map.get(neibor);
                                if (!regionA.borders.has(regionB))
                                    regionA.borders.set(regionB, 0);
                                var adjacency = regionA.borders.get(regionB);
                                adjacency += tile.neighbors.get(neibor).getLength();
                                regionA.borders.set(regionB, adjacency);
                            }
                        }
                    }
                    catch (e_13_1) { e_13 = { error: e_13_1 }; }
                    finally {
                        try {
                            if (_s && !_s.done && (_f = _r.return)) _f.call(_r);
                        }
                        finally { if (e_13) throw e_13.error; }
                    }
                }
            }
            catch (e_12_1) { e_12 = { error: e_12_1 }; }
            finally {
                try {
                    if (_q && !_q.done && (_e = _p.return)) _e.call(_p);
                }
                finally { if (e_12) throw e_12.error; }
            }
        }
    }
    catch (e_11_1) { e_11 = { error: e_11_1 }; }
    finally {
        try {
            if (regions_3_1 && !regions_3_1.done && (_d = regions_3.return)) _d.call(regions_3);
        }
        finally { if (e_11) throw e_11.error; }
    }
    // then seed the merge cue
    var initiallyPossibleMerges = [];
    try {
        for (var regions_4 = __values(regions), regions_4_1 = regions_4.next(); !regions_4_1.done; regions_4_1 = regions_4.next()) {
            var regionA = regions_4_1.value;
            try {
                for (var _t = (e_15 = void 0, __values(regionA.borders.keys())), _u = _t.next(); !_u.done; _u = _t.next()) {
                    var regionB = _u.value;
                    if (regionA.area <= regionB.area) // include this check to reduce the number of duplicate mergers
                        initiallyPossibleMerges.push({
                            a: regionA,
                            b: regionB,
                            priority: regionA.borders.get(regionB) / Math.min(regionA.area, regionB.area),
                        });
                }
            }
            catch (e_15_1) { e_15 = { error: e_15_1 }; }
            finally {
                try {
                    if (_u && !_u.done && (_h = _t.return)) _h.call(_t);
                }
                finally { if (e_15) throw e_15.error; }
            }
        }
    }
    catch (e_14_1) { e_14 = { error: e_14_1 }; }
    finally {
        try {
            if (regions_4_1 && !regions_4_1.done && (_g = regions_4.return)) _g.call(regions_4);
        }
        finally { if (e_14) throw e_14.error; }
    }
    var remainingRegions = new Set(regions);
    var minimumAcceptableQuality = Math.sqrt(2 / targetArea);
    // create a priority cue of merges
    var queue = new Queue(initiallyPossibleMerges, function (a, b) { return b.priority - a.priority; });
    // go thru it until we have a reasonable number of continents or no more merges are possible
    while (!queue.empty()) {
        var _v = queue.pop(), a = _v.a, b = _v.b, priority = _v.priority;
        if (Number.isNaN(priority))
            throw new Error("nan priorities are not okay.  the areas are ".concat(a.area, " km\u00B2 and ").concat(b.area, " km\u00B2 and their border is ").concat(a.borders.get(b), " km long"));
        // stop when the continents get big or separated enuff
        if (priority >= minimumAcceptableQuality || Math.min(a.area, b.area) < minimumArea) {
            // skip any outdated merges
            if (!remainingRegions.has(a) || !remainingRegions.has(b))
                continue;
            // merge the regions and their associated data
            var combinedBorders = a.borders;
            try {
                for (var _w = (e_16 = void 0, __values(b.borders.keys())), _x = _w.next(); !_x.done; _x = _w.next()) {
                    var neighbor = _x.value;
                    if (!combinedBorders.has(neighbor))
                        combinedBorders.set(neighbor, 0);
                    var borderLength = combinedBorders.get(neighbor);
                    borderLength += b.borders.get(neighbor);
                    combinedBorders.set(neighbor, borderLength);
                }
            }
            catch (e_16_1) { e_16 = { error: e_16_1 }; }
            finally {
                try {
                    if (_x && !_x.done && (_j = _w.return)) _j.call(_w);
                }
                finally { if (e_16) throw e_16.error; }
            }
            combinedBorders.delete(a);
            combinedBorders.delete(b);
            var newRegion = {
                tiles: new Set(__spreadArray(__spreadArray([], __read(a.tiles), false), __read(b.tiles), false)),
                area: a.area + b.area,
                borders: combinedBorders,
            };
            remainingRegions.delete(a);
            remainingRegions.delete(b);
            remainingRegions.add(newRegion);
            try {
                // update the neibors' border maps
                for (var _y = (e_17 = void 0, __values(newRegion.borders.keys())), _z = _y.next(); !_z.done; _z = _y.next()) {
                    var neighbor = _z.value;
                    neighbor.borders.delete(a);
                    neighbor.borders.delete(b);
                    neighbor.borders.set(newRegion, newRegion.borders.get(neighbor));
                }
            }
            catch (e_17_1) { e_17 = { error: e_17_1 }; }
            finally {
                try {
                    if (_z && !_z.done && (_k = _y.return)) _k.call(_y);
                }
                finally { if (e_17) throw e_17.error; }
            }
            try {
                // don't forget to cue up the next possible mergers
                for (var _0 = (e_18 = void 0, __values(combinedBorders.keys())), _1 = _0.next(); !_1.done; _1 = _0.next()) {
                    var neighbor = _1.value;
                    queue.push({
                        a: newRegion,
                        b: neighbor,
                        priority: newRegion.borders.get(neighbor) / Math.min(newRegion.area, neighbor.area),
                    });
                }
            }
            catch (e_18_1) { e_18 = { error: e_18_1 }; }
            finally {
                try {
                    if (_1 && !_1.done && (_l = _0.return)) _l.call(_0);
                }
                finally { if (e_18) throw e_18.error; }
            }
        }
    }
    return __spreadArray([], __read(remainingRegions), false);
}
/**
 * take a subdivision of a region that may have some really small divisions and may not cover everything.
 * try to trim both of those so that every Tile in the region is part of a continent with area of at least minimumArea.
 * you may extend a continent across ocean, but no further than maximumDistance.
 */
function makeContinentsComprehensive(region, divisions, minimumArea, maximumDistance) {
    var e_19, _a, e_20, _b, e_21, _c, e_22, _d;
    // delete any regions that are too small
    for (var i = divisions.length - 1; i >= 0; i--)
        if (divisions[i].area < minimumArea)
            divisions.splice(i, 1);
    // do a Dijkstra search until you get all of them
    var initialClaims = [];
    try {
        for (var divisions_1 = __values(divisions), divisions_1_1 = divisions_1.next(); !divisions_1_1.done; divisions_1_1 = divisions_1.next()) {
            var continent = divisions_1_1.value;
            try {
                for (var _e = (e_20 = void 0, __values(continent.tiles)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var tile = _f.value;
                    initialClaims.push({ continent: continent, tile: tile, landDistance: 0, seaDistance: 0 });
                }
            }
            catch (e_20_1) { e_20 = { error: e_20_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_20) throw e_20.error; }
            }
        }
    }
    catch (e_19_1) { e_19 = { error: e_19_1 }; }
    finally {
        try {
            if (divisions_1_1 && !divisions_1_1.done && (_a = divisions_1.return)) _a.call(divisions_1);
        }
        finally { if (e_19) throw e_19.error; }
    }
    var voronoiQueue = new Queue(initialClaims, function (a, b) { return (a.seaDistance !== b.seaDistance) ? a.seaDistance - b.seaDistance : a.landDistance - b.landDistance; });
    var visitedTiles = new Set();
    while (!voronoiQueue.empty()) {
        var _g = voronoiQueue.pop(), continent = _g.continent, tile = _g.tile, landDistance = _g.landDistance, seaDistance = _g.seaDistance;
        if (visitedTiles.has(tile))
            continue;
        visitedTiles.add(tile);
        if (seaDistance > maximumDistance)
            continue;
        // if it's a land tile, take it and its neibors
        if (region.has(tile)) {
            continent.tiles.add(tile);
            try {
                for (var _h = (e_21 = void 0, __values(tile.neighbors.keys())), _j = _h.next(); !_j.done; _j = _h.next()) {
                    var neibor = _j.value;
                    if (!visitedTiles.has(neibor))
                        voronoiQueue.push({
                            continent: continent,
                            tile: neibor,
                            landDistance: landDistance + tile.neighbors.get(neibor).getDistance(),
                            seaDistance: 0,
                        });
                }
            }
            catch (e_21_1) { e_21 = { error: e_21_1 }; }
            finally {
                try {
                    if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                }
                finally { if (e_21) throw e_21.error; }
            }
        }
        // if it's a sea tile, don't add it to the continent but do check its neibors
        else {
            try {
                for (var _k = (e_22 = void 0, __values(tile.neighbors.keys())), _l = _k.next(); !_l.done; _l = _k.next()) {
                    var neibor = _l.value;
                    if (!visitedTiles.has(neibor))
                        voronoiQueue.push({
                            continent: continent,
                            tile: neibor,
                            landDistance: 0,
                            seaDistance: seaDistance + tile.neighbors.get(neibor).getDistance(),
                        });
                }
            }
            catch (e_22_1) { e_22 = { error: e_22_1 }; }
            finally {
                try {
                    if (_l && !_l.done && (_d = _k.return)) _d.call(_k);
                }
                finally { if (e_22) throw e_22.error; }
            }
        }
    }
    return divisions;
}
//# sourceMappingURL=subdivideRegion.js.map