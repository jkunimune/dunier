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
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { assert_xy, endpoint } from "../utilities/coordinates.js";
import { Vector } from "../utilities/geometry.js";
import { delaunayTriangulate } from "../utilities/delaunay.js";
import { contains, polygonize, INFINITE_PLANE, Side } from "./pathutilities.js";
import { localizeInRange, longestShortestPath, pathToString } from "../utilities/miscellaneus.js";
import { circularRegression } from "../utilities/fitting.js";
import { ErodingSegmentTree } from "../utilities/erodingsegmenttree.js";
var SIMPLE_PATH_LENGTH = 72; // maximum number of vertices for estimating median axis
var RALF_NUM_CANDIDATES = 6; // number of sizeable longest shortest paths to try using for the label
var DEBUG_FULL_SKELETON = false; // return skeletons instead of usable arcs
var DEBUG_UNFIT_AXIS = false; // return the raw medial axis rather than the arc fit to it
/**
 * decide where to put the given label in the given polygon using a simplified form of the RALF labeling
 * algorithm, described in
 *     Krumpe, F. and Mendel, T. (2020) "Computing Curved Area Labels in Near-Real Time"
 *     (Doctoral dissertation). University of Stuttgart, Stuttgart, Germany.
 *     https://arxiv.org/abs/2001.02938 TODO: try horizontal labels: https://github.com/mapbox/polylabel
 * @param path the shape into which the label must fit
 * @param aspectRatio the ratio of the length of the text to be written to its height
 * @param margin the amount of space to allot around the label
 * @param maxHeight the maximum desirable label height.  labels larger than this will be shrunk to match.
 * @return the label location defined as an SVG path, the allowable height of the label, and how much the letter spacing must be adjusted
 * @throws Error if it can't find any adequate place for this label
 */
export function chooseLabelLocation(path, aspectRatio, margin, maxHeight) {
    var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
    if (aspectRatio < 0)
        throw Error("the aspect ratio can't be negative, dummy.");
    if (aspectRatio === 0)
        throw Error("this function does not work for zero-width labels.  in theory I could make it work, but I would have to " +
            "change my whole parameterization for part of it and like why would I do that for a label that's just noting?");
    if (!Number.isFinite(aspectRatio))
        throw Error("this function does not work for zero-height labels.  in theory I could make it work, but I would have to " +
            "change my whole parameterization for part of it and like why would I do that for a label that's just noting?");
    path = resamplePath(path);
    if (path.length === 0)
        throw Error("after resampling there was no path left");
    // estimate the topological skeleton
    var centers = estimateSkeleton(path);
    if (DEBUG_FULL_SKELETON) {
        var skeleton = [];
        for (var i = 0; i < centers.length; i++)
            for (var j = 0; j < i; j++)
                if (centers[i].edges[j] !== null)
                    skeleton.push({ type: 'M', args: [centers[i].x, centers[i].y] }, { type: 'L', args: [centers[j].x, centers[j].y] });
        return { arc: skeleton, height: 0, letterSpacing: 0 };
    }
    var argmin = 0;
    var argmax = 0;
    for (var i = 1; i < centers.length; i++) { // find the circumcenters with the greatest and least clearance
        if (centers[i].isContained) {
            if (centers[i].r < centers[argmin].r)
                argmin = i;
            if (centers[i].r > centers[argmax].r)
                argmax = i;
        }
    }
    var anyContained = false;
    try {
        for (var centers_1 = __values(centers), centers_1_1 = centers_1.next(); !centers_1_1.done; centers_1_1 = centers_1.next()) {
            var center = centers_1_1.value;
            anyContained || (anyContained = center.isContained);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (centers_1_1 && !centers_1_1.done && (_a = centers_1.return)) _a.call(centers_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    if (!anyContained) {
        console.log(pathToString(path));
        console.log(centers);
        throw new Error("none of these circumcenters are contained in the polygon.  how is that possible?");
    }
    var iterations = 0;
    var candidates = []; // next collect candidate paths along which you might fit labels
    var minClearance = centers[argmax].r;
    while (candidates.length < RALF_NUM_CANDIDATES && minClearance >= centers[argmin].r) {
        minClearance /= 1.4; // gradually loosen a minimum clearance filter, until it is slitely smaller than the smallest font size
        var minLength = 2 * minClearance * aspectRatio;
        var usedPoints = new Set();
        while (usedPoints.size < centers.length) {
            var newEndpoint = longestShortestPath(centers, (usedPoints.size > 0) ? usedPoints : new Set([argmax]), minClearance).points[0]; // find the point farthest from the paths you have checked TODO expand on this argmax thing to make sure check every exclave fore we start reducing the minimum
            if (usedPoints.has(newEndpoint))
                break;
            var newShortestPath = longestShortestPath(centers, new Set([newEndpoint]), minClearance); // find a new diverse longest shortest path with that as endpoint
            if (newShortestPath.length >= minLength && newShortestPath.points.length > 3) { // if the label will fit,
                candidates.push(newShortestPath.points); // take it
                if (candidates.length >= RALF_NUM_CANDIDATES)
                    break; // if we have enough, quit now
                try {
                    for (var _e = (e_2 = void 0, __values(newShortestPath.points)), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var point = _f.value;
                        usedPoints.add(point);
                    } // otherwise, look for a different one
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            else // if it won't
                break; // reduce the required clearance and try again
        }
        iterations++;
        if (iterations > 200) {
            console.error(pathToString(path));
            throw new Error("this has gone on too long.  something's messed up about this polygon and I can't label it.");
        }
    }
    if (candidates.length === 0)
        throw new Error("no acceptable label candidates were found");
    var axisValue = -Infinity;
    var bestAxis = null;
    try {
        for (var candidates_1 = __values(candidates), candidates_1_1 = candidates_1.next(); !candidates_1_1.done; candidates_1_1 = candidates_1.next()) { // for each candidate label axis
            var candidate = candidates_1_1.value;
            // fit an arc thru it
            var _g = circularRegression(candidate.map(function (i) { return centers[i]; })), R = _g.R, cx = _g.cx, cy = _g.cy;
            var midpoint = centers[candidate[Math.trunc(candidate.length / 2)]];
            // convert path segments into wedge-shaped no-label zones
            var θ0 = Math.atan2(midpoint.y - cy, midpoint.x - cx);
            var _h = mapPointsToArcCoordinates(R, cx, cy, θ0, path, aspectRatio, margin), xMin = _h.xMin, xMax = _h.xMax, wedges = _h.wedges;
            if (xMin > xMax) // occasionally we get these really terrible candidates TODO I think this means I did something rong.
                continue; // just skip them
            var _j = findOpenSpotOnArc(xMin, xMax, wedges), location_1 = _j.location, halfWidth = _j.halfWidth;
            if (halfWidth > maxHeight / 2 * aspectRatio)
                halfWidth = maxHeight / 2 * aspectRatio;
            var height = 2 * halfWidth / aspectRatio;
            var θC = θ0 + location_1 / R;
            var area = height * height, bendRatio = height / 2 / R, horizontality = -Math.sin(θC);
            if (bendRatio > 1)
                continue; // bendRatio above 1 means this is useless garbage that shouldn't even be considered
            if (horizontality < 0) // if it's going to be upside down
                halfWidth *= -1; // flip it around
            // choose the axis with the biggest area and smallest curvature
            var value = Math.log(area) - 2 * bendRatio / (1 - bendRatio) + 1 / 2 * Math.pow(horizontality, 2);
            if (value > axisValue) {
                axisValue = value;
                if (!DEBUG_UNFIT_AXIS) {
                    var θL = θC - halfWidth / R;
                    var θR = θC + halfWidth / R;
                    var rBaseline = (θR < θL) ? R + height / 2 : R - height / 2; // don't forget to offset it to center the text verticly
                    bestAxis = {
                        height: height,
                        letterSpacing: rBaseline / R - 1,
                        arc: [
                            { type: 'M', args: [
                                    cx + rBaseline * Math.cos(θL), cy + rBaseline * Math.sin(θL)
                                ] },
                            { type: 'A', args: [
                                    rBaseline, rBaseline, 0,
                                    (Math.abs(θR - θL) < Math.PI) ? 0 : 1,
                                    (θR < θL) ? 0 : 1,
                                    cx + rBaseline * Math.cos(θR), cy + rBaseline * Math.sin(θR)
                                ] },
                        ]
                    };
                    console.assert(Math.cos(θR) > Math.cos(θL), aspectRatio);
                }
                else {
                    // in this debug mode, return the raw candidate rather than the arc you found
                    bestAxis = { height: height, letterSpacing: 0, arc: [] };
                    try {
                        for (var candidate_1 = (e_4 = void 0, __values(candidate)), candidate_1_1 = candidate_1.next(); !candidate_1_1.done; candidate_1_1 = candidate_1.next()) {
                            var i = candidate_1_1.value;
                            bestAxis.arc.push({
                                type: (bestAxis.arc.length === 0) ? 'M' : 'L',
                                args: [centers[i].x, centers[i].y],
                            });
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (candidate_1_1 && !candidate_1_1.done && (_d = candidate_1.return)) _d.call(candidate_1);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                }
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (candidates_1_1 && !candidates_1_1.done && (_c = candidates_1.return)) _c.call(candidates_1);
        }
        finally { if (e_3) throw e_3.error; }
    }
    if (bestAxis === null)
        throw new Error("all ".concat(candidates.length, " candidates were somehow incredible garbage"));
    else
        return bestAxis;
}
/**
 * add redundant vertices and delete shorter segments in an attempt to make the vertices of this shape
 * evenly spaced, and to make it have between `SIMPLE_PATH_LENGTH/2` and `SIMPLE_PATH_LENGTH` vertices in total.
 * I make no garantees about the return value of this function.  it might be empty or self-intersecting.
 * well, I can at least garantee it won't be degenerate.
 * @param path the shape to resample
 */
export function resamplePath(path) {
    // first, you have to do this check because violations can cause an infinite loop
    if (path[0].type !== 'M')
        throw new Error("all paths must start with M; what is ".concat(pathToString(path), "??"));
    // first, convert the path to a polygon
    path = polygonize(path);
    // calculate the perimeter of the shape
    var segmentLengths = [];
    for (var i_1 = 0; i_1 < path.length - 1; i_1++) {
        if (path[i_1 + 1].type === 'L')
            segmentLengths.push(Math.hypot(path[i_1 + 1].args[0] - path[i_1].args[0], path[i_1 + 1].args[1] - path[i_1].args[1]));
        else
            segmentLengths.push(0);
    }
    var perimeter = segmentLengths.reduce(function (a, b, _) { return a + b; });
    // determine how long you want each segment to be
    var targetSegmentLength = perimeter / SIMPLE_PATH_LENGTH;
    // go through each segment and adjust as necessary
    var i = path.length - 1;
    while (i > 0) {
        if (path[i].type === 'L') {
            if (segmentLengths[i - 1] <= targetSegmentLength) {
                // if it's too short, step thru and see with how many preceding segments you can combine it
                var cumulLength = 0;
                var j = i;
                while (true) {
                    if (cumulLength + segmentLengths[j - 1] <= targetSegmentLength && path[j].type === 'L') {
                        j--; // step back as far as you can while keeping cumulLength from surpassing targetSegmentLength
                        cumulLength += segmentLengths[j];
                    }
                    else {
                        break; // stop when you would surpass the target or hit an 'M'
                    }
                }
                path.splice(j + 1, i - j - 1); // then delete all intermediate vertices
                i = j;
            }
            else {
                // if it's too long, subdivide it as much as possible
                var start = endpoint(path[i - 1]);
                var end = endpoint(path[i]);
                var numSubdivisions = Math.floor(segmentLengths[i - 1] / targetSegmentLength);
                for (var j = 1; j < numSubdivisions; j++)
                    path.splice(i - 1 + j, 0, { type: 'L', args: [
                            start.s + (end.s - start.s) * j / numSubdivisions,
                            start.t + (end.t - start.t) * j / numSubdivisions,
                        ] });
                i--; // step to the next segment
            }
        }
        else {
            // if this is an 'M', just leave it
            i--;
        }
    }
    // now purge any degenerate sections
    for (var i_2 = path.length - 1; i_2 >= 0; i_2--) {
        for (var j = i_2 - 1; j >= i_2 - 3; j--) {
            if (j >= 0 && path[i_2].type === 'M' && path[j].type === 'M') {
                path.splice(j, i_2 - j);
                break;
            }
        }
    }
    return path;
}
function estimateSkeleton(path) {
    var e_5, _a;
    var points = [];
    try {
        for (var path_1 = __values(path), path_1_1 = path_1.next(); !path_1_1.done; path_1_1 = path_1.next()) {
            var segment = path_1_1.value;
            if (segment.type === 'L') {
                var _b = assert_xy(endpoint(segment)), x = _b.x, y = _b.y;
                points.push(new Vector(x, y, 0));
            }
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (path_1_1 && !path_1_1.done && (_a = path_1.return)) _a.call(path_1);
        }
        finally { if (e_5) throw e_5.error; }
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
        path, { s: centers[i].x, t: centers[i].y }, INFINITE_PLANE) !== Side.OUT; // (we're counting "borderline" as in)
        if (centers[i].isContained) {
            for (var j = 0; j < i; j++) {
                if (centers[j].isContained) {
                    var def = triangulation.triangles[j]; // and recording adjacency
                    triangleFit: // TODO: just store the triangle edge associated with each graph edge so you don't need to search for it every time
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
    return centers;
}
/**
 * take an arc and a bunch of points in Cartesian coordinates, and calculate how much space is
 * available for a label of a given aspect ratio at each location.  this result will be expressed as
 * the label half-width (y) as a function of the arc-distance from `midpoint` to the label center (x).
 * that function will be expressed a a bunch of `Wedge` functions; at a given center location,
 * the maximum allowable half-width is the minimum of all the `Wedge`s evaluated at that x-value,
 * where x represents distance along the
 * @param R the radius of the arc
 * @param cx the Cartesian x-coordinate of the arc center
 * @param cy the Cartesian y-coordinate of the arc center
 * @param θ0 – the angle associated with a circular x-coordinate of 0 (in radians, measured from the x+ axis)
 * @param path the set of points and line segments that the label must avoid
 * @param aspectRatio the ratio of the desired label's length to its height
 * @param margin the amount of space to require on each side of the label
 * @return xMin – the absolute minimum acceptable circular x-coordinate
 * @return xMax – the absolute maximum acceptable circular x-coordinate
 * @return wedges – the set of `Wedge` functions that define the feasible space
 */
function mapPointsToArcCoordinates(R, cx, cy, θ0, path, aspectRatio, margin) {
    var e_6, _a;
    var polarPath = []; // get polygon segments in circular coordinates
    try {
        for (var path_2 = __values(path), path_2_1 = path_2.next(); !path_2_1.done; path_2_1 = path_2.next()) {
            var segment = path_2_1.value;
            var _b = __read(segment.args, 2), x = _b[0], y = _b[1];
            var θ = localizeInRange(Math.atan2(y - cy, x - cx) - θ0, -Math.PI, Math.PI);
            var r = Math.hypot(x - cx, y - cy);
            var xp = R * θ, yp = R - r;
            polarPath.push({ type: segment.type, args: [xp, yp] });
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (path_2_1 && !path_2_1.done && (_a = path_2.return)) _a.call(path_2);
        }
        finally { if (e_6) throw e_6.error; }
    }
    var xMin = -Math.PI * R, xMax = Math.PI * R;
    var wedges = [];
    for (var i = 1; i < polarPath.length; i++) { // there's a wedge associated with each pair of points
        if (polarPath[i].type === 'L') {
            var p0 = assert_xy(endpoint(polarPath[i - 1]));
            var p1 = assert_xy(endpoint(polarPath[i]));
            // calculate the polar bounding box of the line segment, and amplify it by the margin
            var xL = Math.min(p0.x, p1.x) - margin; // TODO: technically this margin should be scaled for radius
            var xR = Math.max(p0.x, p1.x) + margin;
            var height = (p0.y < 0 === p1.y < 0) ? Math.min(Math.abs(p0.y), Math.abs(p1.y)) - margin : 0;
            if (height <= 0) { // if this crosses the baseline, adjust the total bounds
                if (xL < 0 || xR < 0)
                    if (xR > xMin)
                        xMin = xR;
                if (xL > 0 || xR > 0)
                    if (xL < xMax)
                        xMax = xL;
            }
            else { // otherwise, add a floating wedge
                wedges.push({
                    xL: xL - height * aspectRatio,
                    xR: xR + height * aspectRatio,
                    y: height * aspectRatio,
                });
            }
        }
    }
    return { xMin: xMin, xMax: xMax, wedges: wedges };
}
/**
 * given an arc defined by a minimum x-value and a maximum x-value, and a bunch of `Wedge` functions that block off
 * large regions of high y, find the highest feasible point.
 * @param min the absolute minimum acceptable circular x-coordinate
 * @param max the absolute maximum acceptable circular x-coordinate
 * @param wedges the set of `Wedge` functions that define the feasible space
 * @return location – the circular x-coordinate of the optimal point
 * @return spotSize – the minimum value of the `Wedge` functions at the optimal point
 */
export function findOpenSpotOnArc(min, max, wedges) {
    wedges.sort(function (a, b) { return b.y - a.y; }); // TODO it would be slightly more efficient if I can merge wedges that share a min vertex
    var validRegion = new ErodingSegmentTree(min, max); // construct segment tree
    var y = 0; // iterate height upward until no segments are left
    while (true) {
        var pole = validRegion.getCenter();
        if (wedges.length > 0) {
            var next = wedges.pop();
            if (next.y < y + pole.radius) { // if the next wedge comes before we run out of space
                validRegion.erode((next.y - y)); // go up to it
                y = next.y;
                if (validRegion.getMinim() >= next.xL && validRegion.getMaxim() <= next.xR) // if it obstructs the entire remaining area
                    return { halfWidth: y, location: validRegion.getClosest(0) };
                else
                    validRegion.remove(next.xL, next.xR); // or just cover up whatever area it obstructs
            }
            else { // if the next wedge comes too late, find the last remaining point
                return { location: pole.location, halfWidth: y + pole.radius };
            }
        }
        else { // if there are no more wedges coming, find the last remaining point
            return { location: pole.location, halfWidth: y + pole.radius };
        }
    }
}
//# sourceMappingURL=labeling.js.map