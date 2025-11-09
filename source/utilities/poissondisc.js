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
import { generic } from "./coordinates.js";
import { calculatePathBounds, contains, doublePath, getAllCombCrossings, INFINITE_PLANE, rectangle, reversePath, rotatePath, Rule, Side } from "../mapping/pathutilities.js";
import { offset } from "./offset.js";
import { binarySearch } from "./miscellaneus.js";
/**
 * generate a set of random non-overlapping discs in a region of a plane.
 * @param region the path that defines the bounds of the region to sample
 * @param walls any line features that samples need to avoid
 * @param discTypes the list of types of sample.  each has a density of times to attempt it (the actual density will be lower if diameter is nonzero; it will max out somewhere around 0.69diameter**-2) and a diameter which represents how close it may be to other samples.
 * @param rng the random number generator to use
 */
export function poissonDiscSample(region, walls, discTypes, rng) {
    var e_1, _a, e_2, _b;
    // establish the closest any two points can possibly be
    var minDistance = Math.min.apply(Math, __spreadArray([], __read(discTypes.map(function (_a) {
        var diameter = _a.diameter;
        return diameter;
    })), false));
    var maxRadius = Math.max.apply(Math, __spreadArray([], __read(discTypes.map(function (_a) {
        var diameter = _a.diameter;
        return diameter;
    })), false)) / 2;
    // establish the grid
    var domainBounds = calculatePathBounds(region);
    var gridScale = minDistance / Math.sqrt(2); // set this so that each cell has no more than one sample
    var numX = Math.ceil((domainBounds.sMax - domainBounds.sMin) / gridScale);
    var numY = Math.ceil((domainBounds.tMax - domainBounds.tMin) / gridScale);
    var grid = {
        xMin: domainBounds.sMin,
        numX: numX,
        Δx: gridScale,
        yMin: domainBounds.tMin,
        numY: numY,
        Δy: gridScale,
    };
    // the index of the sample in each grid cell, or null if there is none
    var cellContent = [];
    for (var i = 0; i < numX; i++) {
        cellContent.push([]);
        for (var j = 0; j < numY; j++)
            cellContent[i].push(null);
    }
    // the unique diameters for which offsets must be calculated
    var uniqueDiameters = new Set(discTypes.map(function (type) { return type.diameter; }));
    // rule out any additional areas where you definitely can't sample
    var boundingRegion = rectangle(grid.xMin - grid.Δx, grid.yMin - grid.Δy, grid.xMin + (grid.numX + 1) * grid.Δx, grid.yMin + (grid.numY + 1) * grid.Δy);
    var externalZone = boundingRegion.concat(reversePath(region));
    var doubledWalls = walls.map(function (wall) { return doublePath(wall); });
    var forbiddenRegions = new Map();
    var cellForbiddenness = new Map();
    forbiddenRegions.set(0, __spreadArray([externalZone], __read(doubledWalls), false));
    cellForbiddenness.set(0, containsRaster([externalZone], grid));
    var _loop_1 = function (diameter) {
        forbiddenRegions.set(diameter, forbiddenRegions.get(0).map(function (path) { return offset(path, diameter / 2); }));
        cellForbiddenness.set(diameter, containsRaster(forbiddenRegions.get(diameter), grid));
    };
    try {
        for (var uniqueDiameters_1 = __values(uniqueDiameters), uniqueDiameters_1_1 = uniqueDiameters_1.next(); !uniqueDiameters_1_1.done; uniqueDiameters_1_1 = uniqueDiameters_1.next()) {
            var diameter = uniqueDiameters_1_1.value;
            _loop_1(diameter);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (uniqueDiameters_1_1 && !uniqueDiameters_1_1.done && (_a = uniqueDiameters_1.return)) _a.call(uniqueDiameters_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    // decide on the order in which you will test each cell
    var feasibleCells = [];
    for (var i = 0; i < numX; i++)
        for (var j = 0; j < numY; j++)
            // look for cells that could contain the smallest discs; make sure they're also in the plain region (that last check is necessary because my offsets are janky)
            if (cellForbiddenness.get(minDistance)[i][j].clusion !== Side.IN && cellForbiddenness.get(0)[i][j].clusion !== Side.IN)
                feasibleCells.push({ i: i, j: j });
    rng.shuffle(feasibleCells);
    // prepare to randomly choose types for each sample
    var cumulativeProbability = [0];
    for (var type = 0; type < discTypes.length; type++)
        cumulativeProbability.push(cumulativeProbability[type] + discTypes[type].density);
    var scalingFactor = cumulativeProbability[discTypes.length];
    for (var type = 0; type <= discTypes.length; type++)
        cumulativeProbability[type] /= scalingFactor;
    // in particular, take care to fix any nans in the event of infinite (i.e. maximal) densities
    if (scalingFactor === Infinity) {
        for (var type = 0; type <= discTypes.length; type++) {
            if (type < discTypes.length && discTypes[type].density !== Infinity)
                throw new Error("don't call this function where some types have infinite diameter and others don't.  that doesn't make any sense.  either all should be infinite or none should be.");
            else
                cumulativeProbability[type] = type / discTypes.length;
        }
    }
    // draw a certain number of candidates
    var totalDensity = 0;
    try {
        for (var discTypes_1 = __values(discTypes), discTypes_1_1 = discTypes_1.next(); !discTypes_1_1.done; discTypes_1_1 = discTypes_1.next()) {
            var density = discTypes_1_1.value.density;
            totalDensity += density;
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (discTypes_1_1 && !discTypes_1_1.done && (_b = discTypes_1.return)) _b.call(discTypes_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    var feasibleArea = grid.Δx * grid.Δy * feasibleCells.length;
    var numCandidates = Math.round(feasibleArea * Math.min(100 / Math.pow(minDistance, 2), totalDensity));
    var points = [];
    var _loop_2 = function (k) {
        var e_3, _c;
        // take the next cell in the list
        var index = feasibleCells[k % feasibleCells.length];
        // make sure this cell isn't occupied
        if (cellContent[index.i][index.j] !== null)
            return "continue";
        // generate the candidate
        var typeCutoff = rng.random();
        var type = binarySearch(cumulativeProbability, function (x) { return x > typeCutoff; }) - 1;
        var candidate = {
            type: type,
            diameter: discTypes[type].diameter,
            x: grid.xMin + index.i * grid.Δx + rng.uniform(0, grid.Δx),
            y: grid.yMin + index.j * grid.Δy + rng.uniform(0, grid.Δy),
        };
        // make sure it's not too close to any other points
        var searchRadius = Math.ceil((candidate.diameter / 2 + maxRadius) / gridScale);
        for (var iPrime = index.i - searchRadius; iPrime <= index.i + searchRadius; iPrime++) {
            for (var jPrime = index.j - searchRadius; jPrime <= index.j + searchRadius; jPrime++) {
                if (iPrime >= 0 && iPrime < grid.numX &&
                    jPrime >= 0 && jPrime < grid.numY &&
                    cellContent[iPrime][jPrime] !== null) {
                    var priorPoint = points[cellContent[iPrime][jPrime]];
                    var distance = Math.hypot(candidate.x - priorPoint.x, candidate.y - priorPoint.y);
                    if (distance < (candidate.diameter + priorPoint.diameter) / 2)
                        return "continue-candidateGeneration";
                }
            }
        }
        // make sure it's not in a forbidden zone
        if (cellForbiddenness.get(candidate.diameter)[index.i][index.j].clusion === Side.IN)
            return "continue";
        else if (cellForbiddenness.get(candidate.diameter)[index.i][index.j].clusion === Side.BORDERLINE) {
            try {
                for (var _d = (e_3 = void 0, __values(cellForbiddenness.get(candidate.diameter)[index.i][index.j].regionIndexes)), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var k_1 = _e.value;
                    var candidateForbiddenness = contains(forbiddenRegions.get(candidate.diameter)[k_1], generic(candidate), INFINITE_PLANE, Rule.POSITIVE);
                    if (candidateForbiddenness === Side.IN)
                        return "continue-candidateGeneration";
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
        // if it passes all tests, add it to the list and mark this cell
        cellContent[index.i][index.j] = points.length;
        points.push(candidate);
    };
    candidateGeneration: for (var k = 0; k < numCandidates; k++) {
        var state_1 = _loop_2(k);
        switch (state_1) {
            case "continue-candidateGeneration": continue candidateGeneration;
        }
    }
    return points;
}
/**
 * determine whether each cell of a grid is wholly contained by any of the given regions, using a positive fill rule.
 * for the purposes of this function, a cell contains points on its upper and left edges.
 * @param regions the set of regions that might contain each cell
 * @param grid the parameters defining the gric cell sizes and locations
 * @return a 2D array indexed by the horizontal index and then the vertical index,
 *         containing {
 *           clusion: IN for cells wholly contained by a region, OUT for cells wholly outside all regions,
 *                    and BORDERLINE for cells that are touched by a region's edge.
 *           touching: the list of indices of regions for paths that touch this cell, if clusion is BORDERLINE.
 *         }
 */
export function containsRaster(regions, grid) {
    var e_4, _a, e_5, _b, e_6, _c, e_7, _d, e_8, _e, e_9, _f, e_10, _g;
    // initialize the array with null
    var result = [];
    for (var i = 0; i < grid.numX; i++) {
        result.push([]);
        for (var j = 0; j < grid.numY; j++)
            result[i].push({ clusion: Side.OUT, regionIndexes: null });
    }
    // apply each region one at a time
    for (var k = 0; k < regions.length; k++) {
        var borderlineCells = [];
        // look for places where it crosses the horizontal gridlines
        var verticalCrossings = getAllCombCrossings(regions[k], grid.yMin, grid.Δy, INFINITE_PLANE);
        try {
            for (var verticalCrossings_1 = (e_4 = void 0, __values(verticalCrossings)), verticalCrossings_1_1 = verticalCrossings_1.next(); !verticalCrossings_1_1.done; verticalCrossings_1_1 = verticalCrossings_1.next()) {
                var verticalCrossing = verticalCrossings_1_1.value;
                var j = verticalCrossing.lineIndex;
                var i = Math.floor((verticalCrossing.s - grid.xMin) / grid.Δx);
                // each vertical crossing hits two cells: [i, j] and [i, j - 1]
                borderlineCells.push({ i: i, j: j });
                borderlineCells.push({ i: i, j: j - 1 });
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (verticalCrossings_1_1 && !verticalCrossings_1_1.done && (_a = verticalCrossings_1.return)) _a.call(verticalCrossings_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
        // look for places where it crosses the vertical gridlines
        var horizontalCrossings = getAllCombCrossings(rotatePath(regions[k], 270), grid.xMin, grid.Δx, INFINITE_PLANE);
        try {
            for (var horizontalCrossings_1 = (e_5 = void 0, __values(horizontalCrossings)), horizontalCrossings_1_1 = horizontalCrossings_1.next(); !horizontalCrossings_1_1.done; horizontalCrossings_1_1 = horizontalCrossings_1.next()) {
                var horizontalCrossing = horizontalCrossings_1_1.value;
                var i = horizontalCrossing.lineIndex;
                var j = Math.floor((-horizontalCrossing.s - grid.yMin) / grid.Δy);
                // each horizontal crossing hits two cells: [i, j] and [i - 1, j]
                borderlineCells.push({ i: i, j: j });
                borderlineCells.push({ i: i - 1, j: j });
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (horizontalCrossings_1_1 && !horizontalCrossings_1_1.done && (_b = horizontalCrossings_1.return)) _b.call(horizontalCrossings_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        try {
            // apply BORDERLINE to the appropriate cells along the edge
            for (var borderlineCells_1 = (e_6 = void 0, __values(borderlineCells)), borderlineCells_1_1 = borderlineCells_1.next(); !borderlineCells_1_1.done; borderlineCells_1_1 = borderlineCells_1.next()) {
                var _h = borderlineCells_1_1.value, i = _h.i, j = _h.j;
                if (i >= 0 && i < grid.numX && j >= 0 && j < grid.numY && result[i][j].clusion !== Side.IN) {
                    result[i][j].clusion = Side.BORDERLINE;
                    if (result[i][j].regionIndexes === null)
                        result[i][j].regionIndexes = new Set([k]);
                    else
                        result[i][j].regionIndexes.add(k);
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (borderlineCells_1_1 && !borderlineCells_1_1.done && (_c = borderlineCells_1.return)) _c.call(borderlineCells_1);
            }
            finally { if (e_6) throw e_6.error; }
        }
        // then group crossings by line to identify cells that are at least partially IN
        var lineIndexMin = Infinity;
        var lineIndexMax = -Infinity;
        try {
            for (var verticalCrossings_2 = (e_7 = void 0, __values(verticalCrossings)), verticalCrossings_2_1 = verticalCrossings_2.next(); !verticalCrossings_2_1.done; verticalCrossings_2_1 = verticalCrossings_2.next()) {
                var lineIndex = verticalCrossings_2_1.value.lineIndex;
                if (lineIndex < lineIndexMin)
                    lineIndexMin = lineIndex;
                if (lineIndex > lineIndexMax)
                    lineIndexMax = lineIndex;
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (verticalCrossings_2_1 && !verticalCrossings_2_1.done && (_d = verticalCrossings_2.return)) _d.call(verticalCrossings_2);
            }
            finally { if (e_7) throw e_7.error; }
        }
        var lineCrossings = [];
        for (var lineIndex = lineIndexMin; lineIndex <= lineIndexMax; lineIndex++)
            lineCrossings.push([]);
        try {
            for (var verticalCrossings_3 = (e_8 = void 0, __values(verticalCrossings)), verticalCrossings_3_1 = verticalCrossings_3.next(); !verticalCrossings_3_1.done; verticalCrossings_3_1 = verticalCrossings_3.next()) {
                var _j = verticalCrossings_3_1.value, lineIndex = _j.lineIndex, s = _j.s, goingEast = _j.goingEast;
                lineCrossings[lineIndex - lineIndexMin].push({ x: s, goingDown: goingEast });
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (verticalCrossings_3_1 && !verticalCrossings_3_1.done && (_e = verticalCrossings_3.return)) _e.call(verticalCrossings_3);
            }
            finally { if (e_8) throw e_8.error; }
        }
        // go along each line to set the appropriate cells to IN, assuming we didn't already mark them BORDERLINE
        for (var lineIndex = lineIndexMin; lineIndex <= lineIndexMax; lineIndex++) {
            lineCrossings[lineIndex - lineIndexMin].sort((function (a, b) { return a.x - b.x; }));
            var wrappings = 0;
            var startOfIn = -Infinity;
            try {
                for (var _k = (e_9 = void 0, __values(lineCrossings[lineIndex - lineIndexMin])), _l = _k.next(); !_l.done; _l = _k.next()) {
                    var _m = _l.value, x = _m.x, goingDown = _m.goingDown;
                    if (goingDown) {
                        if (wrappings === 0)
                            startOfIn = x;
                        wrappings++;
                    }
                    else {
                        wrappings--;
                        if (wrappings === 0) {
                            var iMin = Math.floor((startOfIn - grid.xMin) / grid.Δx);
                            var iMax = Math.floor((x - grid.xMin) / grid.Δx);
                            for (var i = Math.max(0, iMin + 1); i < Math.min(iMax, grid.numX); i++)
                                try {
                                    for (var _o = (e_10 = void 0, __values([lineIndex - 1, lineIndex])), _p = _o.next(); !_p.done; _p = _o.next()) {
                                        var j = _p.value;
                                        if (j >= 0 && j < grid.numY)
                                            if (!(result[i][j].regionIndexes !== null && result[i][j].regionIndexes.has(k)))
                                                result[i][j].clusion = Side.IN;
                                    }
                                }
                                catch (e_10_1) { e_10 = { error: e_10_1 }; }
                                finally {
                                    try {
                                        if (_p && !_p.done && (_g = _o.return)) _g.call(_o);
                                    }
                                    finally { if (e_10) throw e_10.error; }
                                }
                        }
                    }
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_l && !_l.done && (_f = _k.return)) _f.call(_k);
                }
                finally { if (e_9) throw e_9.error; }
            }
        }
    }
    return result;
}
//# sourceMappingURL=poissondisc.js.map