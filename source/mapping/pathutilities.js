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
 * This file contains miscellaneus functions for manipulating geometry expressed as SVG paths.
 * note that for all the functions in this file, closed paths are directional.  that means that
 * a widdershins path contains the points inside it and not the points outside it, as one would expect,
 * but a clockwise path is considered inside-out, and only contains the points outside of it.
 * in general, paths can also exist on either a planar Cartesian coordinate system where y is down,
 * or on a doubly-periodic geographic coordinate system measured in radians.  both systems are left-handed.
 *
 * the main functions are contains(), which determines whether a given point is enclosed by a certain path,
 * and intersection(), which is the geometric AND operation between an arbitrary path and a rectangular path.
 * you may also use the get*Crossings() functions, which calculate intersections between two path segments.
 * note that these are distingusihed from the getAll*Crossings() functions, which calculate intersections
 * between a full path and infinite lines.
 * the get*Crossings() functions take pains to correctly handle periodicity so that they work with geographic paths,
 * but sometimes register a single intersection as two crossings.  the getAll*Crossings() functions, on the other hand,
 * garantee that crossings are unique but don't work so well with periodicity.
 *
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { assert_xy, assert_φλ, endpoint, generic } from "../utilities/coordinates.js";
import { angleSign, arcCenter, lineArcIntersections, lineLineIntersection, lineSegmentDistance } from "../utilities/geometry.js";
import { isBetween, localizeInRange, pathToString } from "../utilities/miscellaneus.js";
var π = Math.PI;
/**
 * whether something is contained in a region or not
 */
export var Side;
(function (Side) {
    Side[Side["OUT"] = 0] = "OUT";
    Side[Side["BORDERLINE"] = 1] = "BORDERLINE";
    Side[Side["IN"] = 2] = "IN";
})(Side || (Side = {}));
/**
 * a scheme used to consistently define whether a point is contained by a signed polygon
 */
export var Rule;
(function (Rule) {
    Rule[Rule["POSITIVE"] = 0] = "POSITIVE";
    Rule[Rule["ODD"] = 1] = "ODD";
    Rule[Rule["LEFT"] = 2] = "LEFT";
})(Rule || (Rule = {}));
// TODO: this should probably be in utilities/, and it should probably include pathToString and other functions like that.
/**
 * an object that encodes basic topologic information for a 2D coordinate system.
 * it contains bounds, which should be either infinite for a Cartesian coordinate system,
 * or two intervals of width 2π for an angular coordinate system.
 */
var Domain = /** @class */ (function () {
    function Domain(sMin, sMax, tMin, tMax, isOnEdge) {
        this.sMin = sMin;
        this.sMax = sMax;
        this.tMin = tMin;
        this.tMax = tMax;
        this.isOnEdge = isOnEdge;
    }
    Domain.prototype.isPeriodic = function () {
        return Number.isFinite(this.sMin);
    };
    return Domain;
}());
export { Domain };
/**
 * a domain with no edge and no periodicity in its coordinates
 */
export var INFINITE_PLANE = new Domain(-Infinity, Infinity, -Infinity, Infinity, function (_) { return false; });
/**
 * adjust the coordinates of a path to be in the correct domain for this map projection.
 * note that this function does not change the actual values of any of the coordinates;
 * it just shifts them to and fro by multiples of 2π to put them in the right range.
 * this function can't go in MapProjection.projectPoint because it often must be called
 * before the path is intersected with the geoEdges.
 * @param domain the range of latitudes and longitudes to use
 * @param segments the jeograffickal imputs in absolute coordinates
 * @returns the relative outputs in transformed coordinates
 */
export function transformInput(domain, segments) {
    var e_1, _a;
    var output = [];
    try {
        for (var segments_1 = __values(segments), segments_1_1 = segments_1.next(); !segments_1_1.done; segments_1_1 = segments_1.next()) {
            var segment = segments_1_1.value;
            var _b = __read(segment.args, 2), φ = _b[0], λ = _b[1];
            φ = localizeInRange(φ, domain.sMin, domain.sMax, true); // snap the latitude into the right domain
            λ = localizeInRange(λ, domain.tMin, domain.tMax, true); // snap the longitude into the right domain
            output.push({ type: segment.type, args: [φ, λ] });
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (segments_1_1 && !segments_1_1.done && (_a = segments_1.return)) _a.call(segments_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return output;
}
/**
 * project a list of SVG paths in latitude-longitude coordinates representing a series of closed paths.
 * @param projection the projection to use for each point
 * @param inPoints ordered Iterator of segments, which each have attributes .type (str) and .args ([double]) (km)
 * @param precision the maximum permissible line segment length (anything longer will be broken up to make sure the projection isn't too degraded) (km)
 * @param bounds the rectangle inside which precision is needed (outside of that rectangle there will be no infill)
 */
export function applyProjectionToPath(projection, inPoints, precision, bounds) {
    var e_2, _a, e_3, _b, e_4, _c, e_5, _d;
    if (bounds === void 0) { bounds = null; }
    try {
        // check for NaNs because they can really mess things up
        for (var inPoints_1 = __values(inPoints), inPoints_1_1 = inPoints_1.next(); !inPoints_1_1.done; inPoints_1_1 = inPoints_1.next()) {
            var segment = inPoints_1_1.value;
            try {
                for (var _e = (e_3 = void 0, __values(segment.args)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var arg = _f.value;
                    if (!isFinite(arg))
                        throw new Error("you may not pass ".concat(arg, " to the mapping functions!"));
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (inPoints_1_1 && !inPoints_1_1.done && (_a = inPoints_1.return)) _a.call(inPoints_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    var outPoints = []; // start a list of the projected points that are done
    for (var i = 0; i < inPoints.length; i++) {
        if (inPoints[i].type === 'Λ') { // do the projection
            // call projectMeridian for meridians
            var _g = __read(inPoints[i - 1].args, 2), φ0 = _g[0], λ = _g[1];
            var _h = __read(inPoints[i].args, 2), φ1 = _h[0], _ = _h[1];
            console.assert(λ === _, "meridians must start and end at the same longitude.");
            outPoints.push.apply(outPoints, __spreadArray([], __read(projection.projectMeridian(φ0, φ1, λ)), false));
        }
        else if (inPoints[i].type === 'Φ') {
            // call projectParallel for parallels
            var _j = __read(inPoints[i - 1].args, 2), φ = _j[0], λ0 = _j[1];
            var _k = __read(inPoints[i].args, 2), _ = _k[0], λ1 = _k[1];
            console.assert(φ === _, "parallels must start and end at the same latitude.");
            outPoints.push.apply(outPoints, __spreadArray([], __read(projection.projectParallel(λ0, λ1, φ)), false));
        }
        else if (inPoints[i].type === 'M') {
            // call projectPoint for movetos
            var point = assert_φλ(endpoint(inPoints[i]));
            var _l = projection.projectPoint(point), x = _l.x, y = _l.y;
            outPoints.push({ type: 'M', args: [x, y] });
        }
        else if (inPoints[i].type === 'L') {
            // for continuus segments, don't call projectPoint just yet
            var pendingInPoints = [assert_φλ(endpoint(inPoints[i]))]; // add the desired destination to a queue
            var completedInPoints = [assert_φλ(endpoint(inPoints[i - 1]))];
            var numIntermediatePoints = 0;
            while (pendingInPoints.length > 0) { // now, as long as there are points in the pending cue
                var nextInPoint = pendingInPoints.pop(); // take the next point
                var nextOutPoint = projection.projectPoint(nextInPoint); // project it
                var lastInPoint = completedInPoints[completedInPoints.length - 1];
                var lastOutPoint = assert_xy(endpoint(outPoints[outPoints.length - 1])); // check the map distance between here and the last point
                if (nextOutPoint.x === lastOutPoint.x && nextOutPoint.y === lastOutPoint.y) { // if this segment ended up being redundant
                    completedInPoints.push(nextInPoint); // mark it as done but don't bother adding it to outPoints
                }
                else {
                    // if the segment is real, we need to decide whether to project its midpoint
                    var distance = Math.hypot(nextOutPoint.x - lastOutPoint.x, nextOutPoint.y - lastOutPoint.y);
                    var bothPointsOffTheMap = false;
                    if (bounds !== null)
                        bothPointsOffTheMap = contains(bounds, generic(lastOutPoint)) === Side.OUT && contains(bounds, generic(nextOutPoint)) === Side.OUT;
                    // if it's short and finite, or out of bounds
                    if (distance < precision || bothPointsOffTheMap || numIntermediatePoints > 10000) {
                        completedInPoints.push(nextInPoint); // accept it as is
                        outPoints.push({ type: 'L', args: [nextOutPoint.x, nextOutPoint.y] });
                    }
                    // if it's too long
                    else {
                        pendingInPoints.push(nextInPoint); // put it back
                        var intermediateInPoint = assert_φλ(getMidpoint({ type: 'M', args: [lastInPoint.φ, lastInPoint.λ] }, { type: 'L', args: [nextInPoint.φ, nextInPoint.λ] }, projection.domain)); // that means we need to plot a midpoint first
                        pendingInPoints.push(intermediateInPoint);
                        numIntermediatePoints += 1;
                        if (numIntermediatePoints === 10000)
                            console.error("we've put an absurd number of points between [".concat(lastInPoint.φ, ",").concat(lastInPoint.λ, "]=>[").concat(lastOutPoint.x, ",").concat(lastOutPoint.y, "] and [").concat(nextInPoint.φ, ",").concat(nextInPoint.λ, "]=>[").concat(nextOutPoint.x, ",").concat(nextOutPoint.y, "], but they're still over ").concat(precision, " apart."));
                    }
                }
            }
        }
        else {
            throw new Error("I don't think you can use ".concat(inPoints[i].type, " here"));
        }
    }
    try {
        // check for NaNs because they can really mess things up
        for (var outPoints_1 = __values(outPoints), outPoints_1_1 = outPoints_1.next(); !outPoints_1_1.done; outPoints_1_1 = outPoints_1.next()) {
            var segment = outPoints_1_1.value;
            try {
                for (var _m = (e_5 = void 0, __values(segment.args)), _o = _m.next(); !_o.done; _o = _m.next()) {
                    var arg = _o.value;
                    console.assert(isFinite(arg), arg);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_o && !_o.done && (_d = _m.return)) _d.call(_m);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (outPoints_1_1 && !outPoints_1_1.done && (_c = outPoints_1.return)) _c.call(outPoints_1);
        }
        finally { if (e_4) throw e_4.error; }
    }
    return outPoints;
}
/**
 * take a path with some lines and movetos and stuff, and modify it to fit within the
 * given edges by cutting it and adding lines and stuff.
 * @param segments the segments to cut
 * @param edges the MapEdges within which to fit this
 * @param domain the surface on which the edges exist
 * @param closePath whether you should add stuff around the edges when things clip
 */
export function intersection(segments, edges, domain, closePath) {
    var e_6, _a, e_7, _b, e_8, _c;
    if (closePath && !isClosed(segments, domain)) {
        console.error(pathToString(segments));
        throw new Error("ew, it's open.  go make sure your projections are 1:1!");
    }
    if (!isClosed(edges, domain)) {
        console.error(pathToString(edges));
        throw new Error("gross, your edges are open.  go check how you defined them!");
    }
    for (var i = 1; i < edges.length; i++) {
        var _d = endpoint(edges[i]), s = _d.s, t = _d.t;
        if (s < domain.sMin || s > domain.sMax || t < domain.tMin || t > domain.tMax)
            throw new Error("these edges go out to s=".concat(s, ",t=").concat(t, ", which is not contained in the domain [").concat(domain.sMin, ", ").concat(domain.sMax, "], [").concat(domain.tMin, ", ").concat(domain.tMax, "]"));
    }
    // start by breaking the edges up into separate loops
    var edgeLoops = [];
    try {
        for (var edges_1 = __values(edges), edges_1_1 = edges_1.next(); !edges_1_1.done; edges_1_1 = edges_1.next()) {
            var edge = edges_1_1.value;
            if (edge.type === 'M')
                edgeLoops.push([]);
            var currentLoop = edgeLoops[edgeLoops.length - 1];
            currentLoop.push(edge);
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (edges_1_1 && !edges_1_1.done && (_a = edges_1.return)) _a.call(edges_1);
        }
        finally { if (e_6) throw e_6.error; }
    }
    // then break the segments up into separate sections
    var segmentQueue = segments.slice().reverse();
    var sections = [];
    var currentSection = null;
    var iterations = 0;
    while (true) { // you'll have to go thru it like a cue rather than a fixed list, since we'll be adding segments as we go
        var thisSegment = (segmentQueue.length > 0 ? segmentQueue.pop() : null);
        // for movetos and at the end
        if (thisSegment === null || thisSegment.type === 'M') {
            if (currentSection !== null) {
                if (encompasses(edges, currentSection, domain) === Side.IN)
                    sections.push(currentSection); // save whatever you have so far to sections (if it's within the edges)
            }
            if (thisSegment !== null)
                currentSection = [thisSegment]; // and start a new section
            else
                break; // or stop if we're done
        }
        // for segments in the middle of a section
        else {
            if (currentSection === null)
                throw new Error("it didn't start with 'M', I gess?");
            var lastSegment = currentSection[currentSection.length - 1];
            var start = endpoint(lastSegment);
            var end = endpoint(thisSegment);
            var crossings = getEdgeCrossings(start, thisSegment, edges, domain); // check for interruption
            // but discard any interruptions that coincide with existing breaks in segments
            for (var i = crossings.length - 1; i >= 0; i--) {
                var _e = crossings[i], intersect0 = _e.intersect0, intersect1 = _e.intersect1;
                if (intersect1.s === start.s && intersect1.t === start.t) {
                    if (lastSegment.type === 'M') {
                        crossings.splice(i, 1);
                        continue;
                    }
                }
                if (intersect0.s === end.s && intersect0.t === end.t) {
                    if (segmentQueue.length === 0 || segmentQueue[segmentQueue.length - 1].type === 'M') {
                        crossings.splice(i, 1);
                    }
                }
            }
            if (crossings.length === 0) { // if there's no interruption or we discarded them all
                currentSection.push(thisSegment); // move the points from the queue to the section
            }
            else { // if there is, the line jumps across an interruption
                var _f = crossings[0], intersect0 = _f.intersect0, intersect1 = _f.intersect1;
                segmentQueue.push.apply(segmentQueue, __spreadArray([], __read(spliceSegment(endpoint(lastSegment), thisSegment, intersect0, intersect1).reverse() // remember to reverse it for the FILO segment cue
                ), false));
            }
        }
        iterations++;
        if (iterations > 1000000)
            throw new Error("*Someone* (not pointing any fingers) messd up an interruption between ".concat(pathToString([currentSection.pop()]), " and ").concat(pathToString([thisSegment]), "."));
    }
    var startPositions = [];
    var weHaveDrawn = []; // set up some section-indexed vectors
    try {
        for (var sections_1 = __values(sections), sections_1_1 = sections_1.next(); !sections_1_1.done; sections_1_1 = sections_1.next()) {
            var section = sections_1_1.value;
            startPositions.push(getPositionOnEdge(endpoint(section[0]), edges));
            weHaveDrawn.push(false);
        }
    }
    catch (e_7_1) { e_7 = { error: e_7_1 }; }
    finally {
        try {
            if (sections_1_1 && !sections_1_1.done && (_b = sections_1.return)) _b.call(sections_1);
        }
        finally { if (e_7) throw e_7.error; }
    }
    var output = []; // now start re-stitching it all together
    var sectionIndex = 0;
    var supersectionIndex = -1;
    var supersectionStart = null;
    var startingANewSupersection = true;
    while (!weHaveDrawn.every(function (value) { return value; })) {
        var section = sections[sectionIndex]; // take a section
        if (!startingANewSupersection) {
            section = section.slice(1); // remove its moveto
        }
        else {
            supersectionIndex = sectionIndex;
            supersectionStart = endpoint(section[0]);
        }
        startingANewSupersection = false; // turn off this notification flag until we need it agen
        output.push.apply(// turn off this notification flag until we need it agen
        output, __spreadArray([], __read(section), false)); // add the section's points to the thing
        weHaveDrawn[sectionIndex] = true; // mark it as drawn
        if (!closePath) { // if we're not worrying about closing it off
            startingANewSupersection = true; // forget it and move onto a random section
        }
        else { // if we *are* worrying about closing it off
            var sectionEnd = endpoint(section[section.length - 1]); // look at where on Earth we are
            var endPosition = getPositionOnEdge(sectionEnd, edges);
            if (sectionEnd.s === supersectionStart.s &&
                sectionEnd.t === supersectionStart.t) { // first, check if this is the closure of this supersection
                startingANewSupersection = true; // if so, don't look any further
            }
            else if (endPosition.loop !== null) { // if we ended hitting a wall
                var edgeLoop = edgeLoops[endPosition.loop]; // then we should move to another point on a wall
                var bestSection = null, bestPositionIndex = null;
                for (var i = 0; i < startPositions.length; i++) { // check the remaining sections
                    var startPosition = startPositions[i];
                    if (startPosition.loop === endPosition.loop) { // for any on the same edge loop as us
                        if (!weHaveDrawn[i] || i === supersectionIndex) {
                            var relativeIndex = startPosition.index;
                            if (startPosition.index < endPosition.index)
                                relativeIndex += edgeLoop.length - 1; // account for the fact that the loops are all periodic
                            if (bestPositionIndex === null || relativeIndex < bestPositionIndex) {
                                bestSection = i; // calculate which one should come next
                                bestPositionIndex = relativeIndex;
                            }
                        }
                    }
                }
                if (bestSection === null) {
                    console.error(pathToString(segments));
                    console.error(pathToString(edges));
                    throw new Error("couldn't find a new start position on loop ".concat(endPosition.loop));
                }
                var endEdge = Math.trunc(endPosition.index) + 1;
                var restartEdge = Math.trunc(bestPositionIndex) + 1;
                var nextStart = endpoint(sections[bestSection][0]);
                for (var i = endEdge; i <= restartEdge; i++) { // go around the edges to the new restarting point
                    var edge = edgeLoop[(i - 1) % (edgeLoop.length - 1) + 1];
                    var edgeEnd = endpoint(edge);
                    var targetPlace = (i === restartEdge) ? nextStart : edgeEnd;
                    output.push({ type: edge.type,
                        args: [targetPlace.s, targetPlace.t] });
                }
                if (bestSection === supersectionIndex) // if this brings us back to where we started this supersection
                    startingANewSupersection = true; // move on randomly
                else if (!weHaveDrawn[bestSection]) // otherwise, if you found a fresh place to restart
                    sectionIndex = bestSection; // go to it
                else
                    throw new Error("I don't think it should be possible to rap around to a drawn section that's not this one");
            }
            else { // if we ended at a random point in the middle of the map
                sectionIndex = null;
                for (var i = 0; i < sections.length; i++) { // look for the one that picks up from here
                    var start = endpoint(sections[i][0]);
                    if (start.s === sectionEnd.s && start.t === sectionEnd.t) {
                        sectionIndex = i; // and go there
                        break;
                    }
                }
                if (sectionIndex === null) { // there really should be exactly one that picks up from here
                    if (domain.isOnEdge(sectionEnd))
                        throw new Error("a path section left off on the surface edge at [".concat(sectionEnd.s, ", ").concat(sectionEnd.t, "], ") +
                            "but there's no edge here along which for it to continue.  if the surface edge is " +
                            "included in the edges, it _must_ be coincident with an edge.");
                    else
                        throw new Error("I was left hanging at [".concat(sectionEnd.s, ", ").concat(sectionEnd.t, "]"));
                }
                if (weHaveDrawn[sectionIndex]) // if that one has already been drawn
                    throw new Error("how has the section starting at [".concat(sectionEnd.s, ", ").concat(sectionEnd.t, "] already been drawn? I'm on a supersection that started at ").concat(supersectionStart.s, ", ").concat(supersectionStart.t)); // we're done; move on randomly
            }
        }
        if (startingANewSupersection) { // if we were planning to move onto whatever else for the next section
            sectionIndex = 0;
            while (sectionIndex < sections.length && weHaveDrawn[sectionIndex])
                sectionIndex++; // sweep thru it until we find one that has not been drawn
            if (sectionIndex === sections.length) // if you can't find any
                break; // we're done!
        }
    }
    if (closePath) { // if it matters which side is inside and which side out, draw the outline of the map
        try {
            for (var edgeLoops_1 = __values(edgeLoops), edgeLoops_1_1 = edgeLoops_1.next(); !edgeLoops_1_1.done; edgeLoops_1_1 = edgeLoops_1.next()) { // for each loop
                var edgeLoop = edgeLoops_1_1.value;
                var isInsideOut = // determine if it is inside out
                 void 0; // determine if it is inside out
                if (output.length > 0) // using the newly cropped output
                    isInsideOut = encompasses(output, edgeLoop, domain) === Side.IN; // it's *probably* safe to assume that if the cropped output is BORDERLINE, the outline should not be drawn
                else // or whatever was cropped out if the output is empty
                    isInsideOut = encompasses(segments, edgeLoop, domain) !== Side.OUT; // it's *probably* safe to assume that if the uncropped input is BORDERLINE, the outline does need to be drawn
                if (isInsideOut) // if it is inside out with respect to that loop
                    output.push.apply(// if it is inside out with respect to that loop
                    output, __spreadArray([], __read(edgeLoop), false)); // draw the outline of the entire edge loop to contain it
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (edgeLoops_1_1 && !edgeLoops_1_1.done && (_c = edgeLoops_1.return)) _c.call(edgeLoops_1);
            }
            finally { if (e_8) throw e_8.error; }
        }
    }
    for (var i = output.length - 1; i >= 1; i--) { // remove any zero-length segments
        var a = endpoint(output[i - 1]);
        var b = endpoint(output[i]);
        if (a.s === b.s && a.t === b.t)
            output.splice(i, 1);
    }
    for (var i = output.length - 1; i >= 1; i--) // and then any orphand movetos
        if (output[i - 1].type === "M" && output[i].type === "M")
            output.splice(i - 1, 1);
    return output;
}
/**
 * convert a continuous path segment to an equivalent list of path segments that are
 * careful to step over the intersection point (which should be on the input segment)
 * @param start the cursor position at the start of the segment
 * @param segment the path command representing the segment to splice
 * @param intersect0 the intersection point. in the event that the coordinate system
 *                   is not 1:1, this will be on the side corresponding to start.
 * @param intersect1 the intersection point. in the event that the coordinate system
 *                   is not 1:1, this will be on the side of segment's endpoint.
 *                   if not passed, this defaults to the same as intersect0
 */
function spliceSegment(start, segment, intersect0, intersect1) {
    if (intersect1 === void 0) { intersect1 = null; }
    if (intersect1 === null)
        intersect1 = intersect0;
    var end = endpoint(segment);
    if (start.s === intersect0.s && start.t === intersect0.t) // if you're splicing at the beginning
        return [
            { type: 'M', args: [start.s, start.t] }, // just add a single moveto before the segment
            segment,
        ];
    else if (intersect1.s === end.s && intersect1.t === end.t) // if you're splicing at the end
        return [
            segment,
            { type: 'M', args: [end.s, end.t] }, // just add a single moveto after the segment
        ];
    else if (segment.type === 'L') { // to split a line in the middle
        return [
            { type: 'L', args: [intersect0.s, intersect0.t] }, // it's a line up to the very edge
            { type: 'M', args: [intersect1.s, intersect1.t] }, // then a jump to the other side
            segment, // followd by the final stretch to the end
        ];
    }
    else if (segment.type === 'A') { // to split an arc in the middle
        var a = assert_xy(start);
        var b = assert_xy(intersect0);
        var c = assert_xy(intersect1);
        var _a = __read(segment.args, 7), r1 = _a[0], r2 = _a[1], rot = _a[2], largeArcAD = _a[3], sweepDirection = _a[4], dx = _a[5], dy = _a[6];
        var d = { x: dx, y: dy };
        console.assert(r1 === r2);
        console.assert(b.x === c.x && b.y === c.y);
        var center = arcCenter(a, d, r1, largeArcAD !== sweepDirection);
        var sign = (sweepDirection > 0) ? 1 : -1;
        var largeArcAB = (sign * angleSign(a, center, b) > 0) ? 1 : 0; // you haff to figure out whether to change the large arc flag for the children
        var largeArcCD = (sign * angleSign(c, center, d) > 0) ? 1 : 0; // you can do this by checking the new arcs' central angles
        return [
            {
                type: 'A',
                args: [r1, r2, rot, largeArcAB, sweepDirection, b.x, b.y],
            }, // the first segment
            { type: 'M', args: [c.x, c.y] }, //the jump
            {
                type: 'A',
                args: [r1, r2, rot, largeArcCD, sweepDirection, d.x, d.y]
            }, // the twoth segment
        ];
    }
    else {
        throw new Error("can't use '".concat(segment.type, "' here"));
    }
}
/**
 * find out if the given points are wholly within a given path-defined region.
 * it is assumed that they are either all in or all out.  points on an edge are considerd ambiguous, so
 * the result may be ambiguous if *all* of the points are on the edge.  note that the directionality of
 * the region path matters (see contains() for more details) but the directionality of points does not
 * matter; we're just checking to see if the vertices themselves are enclosed.
 * @param polygon the path that defines the region we're checking
 * @param points the path whose points may or may not be in the region
 * @param domain the topology of the space on which these points' coordinates are defined
 * @return whether all of points are inside edges
 */
export function encompasses(polygon, points, domain) {
    for (var i = 0; i < points.length; i++) { // the fastest way to judge this is to just look at the first point
        var tenancy = contains(polygon, endpoint(points[i]), domain);
        if (tenancy !== Side.BORDERLINE) // that is not ambiguous
            return tenancy;
    }
    for (var i = 1; i < points.length; i++) { // if that didn't work, use midpoints
        var tenancy = contains(polygon, getMidpoint(points[i - 1], points[i], domain), domain);
        if (tenancy !== Side.BORDERLINE) // in practice, this should always be unambiguous
            return tenancy;
    }
    return Side.BORDERLINE; // if it's completely on the edge, mark it as such
}
/**
 * find out if a point is contained by a polygon.
 * the direction of the polygon matters, depending on which rule you choose.
 * generally, if you're travelling along the polygon's edge, points on your left are IN and points on your right are OUT.
 * if a point is on the polygon, it is considered BORDERLINE.
 * for self-intersecting polygons or for polygons in geographic coordinates, there are nuances.
 * note that this operates on a left-handed coordinate system (if your y is decreasing, higher x is on your right).
 * also note that this function can fail to behave consistently when segments of the polygon move along the boundary of
 * the periodic domain and point is also on the same boundary of the periodic domain.
 * @param polygon the path that defines the region we're checking.  it may jump across the boundary domains if
 *                periodicS and/or periodicT are set to true.  however, it may not intersect itself, and it must not
 *                form any ambiguusly included regions (like two concentric circles going the same way) or the result
 *                is undefined.
 * @param point the point that may or may not be in the region
 * @param domain the topology of the space on which these points' coordinates are defined
 * @param rule one of "positive", "even", or "left".
 *             - POSITIVE is like CSS "nonzero".  points far from the polygon are OUT,
 *               and any number of positive wrappings will make a point IN.
 *             - EVEN is like CSS "evenodd".  points far from the polygon are OUT,
 *               and any odd number of wrappings in either direction will make a point IN.
 *             - LEFT is only defined for non-self-intersecting polygons.  the space far from the polygon may be
 *               IN or OUT depending on the sign of the outermost wrapping.  because no assumption is made about
 *               points at infinity, this is the only one that works for non-planar domains.  with this rule, a
 *               polygon with no sides contains the whole domain.
 * @param successGuaranteed if this is false and our line fails to conclusively determine containment, we might choose a
 *                          new point and recurse this function.  if it's true and that happens we'll just give up.
 * @return IN if the point is contained by the polygon, OUT if it's not contained by the polygon it,
 *         and BORDERLINE if it's on the polygon's edge.
 */
export function contains(polygon, point, domain, rule, successGuaranteed) {
    var e_9, _a;
    if (domain === void 0) { domain = INFINITE_PLANE; }
    if (rule === void 0) { rule = Rule.LEFT; }
    if (successGuaranteed === void 0) { successGuaranteed = false; }
    if (rule !== Rule.LEFT && domain.isPeriodic())
        throw new Error("the fill-rule ".concat(rule, " is not defined for polygons on geographic domains."));
    if (point.s < domain.sMin || point.s > domain.sMax || point.t < domain.tMin || point.t > domain.tMax)
        throw new Error("the point (".concat(point.s, ", ").concat(point.t, ") is not on the domain s \u2208 [").concat(domain.sMin, ", ").concat(domain.sMax, "] \u2229 t \u2208 [").concat(domain.tMin, ", ").concat(domain.tMax, "]"));
    var lastM = -Infinity;
    var lastCurve = -Infinity;
    for (var i = 0; i < polygon.length; i++) {
        if (polygon[i].type === 'M' && lastM >= i - 3 && lastCurve < lastM) {
            console.error(pathToString(polygon));
            throw new Error("this polygon is ill-posed because the section that starts at ".concat(lastM, " is only ").concat(i - lastM, " long so I'm not doing it."));
        }
        if (polygon[i].type === 'M')
            lastM = i;
        else if (polygon[i].type !== 'L')
            lastCurve = i;
    }
    if (polygon.length === 0) {
        switch (rule) {
            case Rule.POSITIVE:
                return Side.OUT;
            case Rule.ODD:
                return Side.OUT;
            case Rule.LEFT:
                return Side.IN;
            default:
                throw new Error("invalid fill rule");
        }
    }
    // manually check for the most common forms of coincidences
    for (var i = 1; i < polygon.length; i++) {
        if (polygon[i].type === 'L' || polygon[i].type === 'Φ' || polygon[i].type === 'Λ') {
            var start = endpoint(polygon[i - 1]);
            var end = endpoint(polygon[i]);
            var inTheRightSNeighborhood = isBetween(point.s, start.s, end.s);
            var inTheRightTNeighborhood = isBetween(point.t, start.t, end.t);
            if (domain.isPeriodic() && polygon[i].type === 'L') {
                if (Math.abs(start.s - end.s) > π) // check for s periodicity
                    inTheRightSNeighborhood = !inTheRightSNeighborhood;
                if (Math.abs(start.t - end.t) > π) // check for t periodicity
                    inTheRightTNeighborhood = !inTheRightTNeighborhood;
            }
            // if the point is exactly on this edge, count it as borderline
            if (inTheRightSNeighborhood && inTheRightTNeighborhood)
                if ((start.s === end.s && start.s === point.s) || (start.t === end.t && start.t === point.t))
                    return Side.BORDERLINE;
        }
    }
    // this Stokes's-Theorem-inspired algorithm a little different from the normal nonzero/even-odd rule. this is
    // chiefly because it needs to account for the directionality of the polygon.  drawing a ray from the point that
    // doesn't intersect the polygon doesn't automaticly mean the point is out; you would need to then go and check
    // whether the polygon is inside-out or not (or put more strictly, whether it contains the infinitely distant
    // terminus of your ray). we need to mind the direction of the
    // nearest crossing rather than just counting how many crossings there are in each direction.  nieve implementations
    // of this will fail if the polygon has a vertex on the test path but doesn't *cross* the test path at that vertex,
    // because if you're just noting the direction of the segments and the location where they intersect the path,
    // you'll see two crossings in opposite directions at the exact same point, and it's then impossible to say which
    // was closer, even tho by eye the anser might look unambiguus.  the solution is to not just count the crossings but
    // *sum* them, weying them by how far they are from the point.  since the crossings should always alternate in
    // direction when you look at them along a path, and any two crossings in the same place will now cancel out, it can
    // be shown that the sign of that sum will then correspond to the nearest unambiguus crossing.
    var intersections = getAllHorizontalLineCrossings(polygon, point.t, domain);
    var crossingSum = 0.;
    try {
        // look at where it crosses
        for (var intersections_1 = __values(intersections), intersections_1_1 = intersections_1.next(); !intersections_1_1.done; intersections_1_1 = intersections_1.next()) {
            var _b = intersections_1_1.value, s = _b.s, goingEast = _b.goingEast;
            var d = s - point.s;
            if (d === 0) // if any segment is *on* the point, it's borderline
                return Side.BORDERLINE;
            if (rule === Rule.LEFT)
                crossingSum += (goingEast) ? -1 / d : 1 / d; // otherwise, add its weited crossing direction to the sum
            else
                crossingSum += (goingEast) ? -Math.sign(d) : Math.sign(d); // for the simpler crossing rules, we need an unweited sum
        }
    }
    catch (e_9_1) { e_9 = { error: e_9_1 }; }
    finally {
        try {
            if (intersections_1_1 && !intersections_1_1.done && (_a = intersections_1.return)) _a.call(intersections_1);
        }
        finally { if (e_9) throw e_9.error; }
    }
    // count it up to determine if you're in or out
    switch (rule) {
        case Rule.POSITIVE:
            if (crossingSum > 0)
                return Side.IN;
            else
                return Side.OUT;
        case Rule.ODD:
            if (crossingSum / 2 % 2 !== 0)
                return Side.IN;
            else
                return Side.OUT;
        case Rule.LEFT:
            if (crossingSum > 0)
                return Side.IN;
            else if (crossingSum < 0)
                return Side.OUT;
            else
                break; // for LEFT, you may need to proceed to further testing; see below
        default:
            throw new Error("invalid fill rule");
    }
    // if you didn't hit any lines or you hit some but they were indeterminate
    if (successGuaranteed)
        throw new Error("this algorithm should be guaranteed to get an answer at this point, even if that answer is BORDERLINE.  " +
            "something must be rong.  the path is \"".concat(pathToString(polygon), "\"."));
    // choose a new point on the horizontal line you drew that's known to be in line with some of the polygon
    var sNew = null;
    for (var i = 1; i < polygon.length; i++) {
        if (polygon[i].type !== 'M') {
            var start = endpoint(polygon[i - 1]);
            var end = endpoint(polygon[i]);
            if (polygon[i].type === 'A' || start.s !== end.s) {
                var knownPolygonPoint = getMidpoint(polygon[i - 1], polygon[i], domain);
                sNew = knownPolygonPoint.s;
                break;
            }
        }
    }
    if (sNew === null)
        throw new Error("this polygon didn't seem to have any segments: ".concat(pathToString(polygon)));
    // and rerun this algorithm with a vertical line thru that point instead of a horizontal one
    var result = contains(rotatePath(polygon, 90), { s: point.t, t: -sNew }, rotateDomain(domain, 90), rule, true);
    if (result !== Side.BORDERLINE)
        return result;
    // be careful; if it returns BORDERLINE this time, that means the _new_ point is BORDERLINE,
    // but does not reflect the status of our OG point.
    else {
        // if you reflect about t=point.t, because of the way crossings are defined, that should clear things up
        var result_1 = contains(reflectPath(polygon), { s: point.s, t: -point.t }, reflectDomain(domain), rule, true);
        if (result_1 === Side.IN)
            return Side.OUT; // just remember that, since these polygons are signed, reflecting inverts the result
        else if (result_1 === Side.OUT)
            return Side.IN;
        else
            throw new Error("I don't think this can be BORDERLINE because the anser was indeterminate when we did it reflected about the s-axis.  " +
                "something must be rong.  the path is ".concat(pathToString(polygon)));
    }
}
/**
 * determine the coordinate bounds of this region in some 2D coordinate system
 * @param segments the region that must be enclosed entirely within the returned bounding box
 */
export function calculatePathBounds(segments) {
    var e_10, _a;
    if (segments.length === 0)
        throw new Error("this function requires some points to work at all.");
    var sMin = Infinity, sMax = -Infinity, tMin = Infinity, tMax = -Infinity;
    for (var i = 0; i < segments.length; i++) { // TODO: this won't notice when the pole is included in the region
        var segment = segments[i];
        // for each segment, pull out any points that might be extrema
        var points = void 0;
        switch (segment.type) {
            // for most simple segment types it's just the endpoints
            case 'M':
            case 'L':
            case 'Φ':
            case 'Λ':
                points = [{ s: segment.args[0], t: segment.args[1] }];
                break;
            // for bezier curves use the control points for the bonuds
            case 'Q':
            case 'C':
                points = [];
                for (var i_1 = 0; i_1 < segment.args.length; i_1 += 2)
                    points.push({ s: segment.args[i_1], t: segment.args[i_1 + 1] });
                break;
            // for arcs you must also look at certain points along the circle
            case 'A':
                // first calculate the location of the center
                if (i === 0) {
                    console.log(segments);
                    throw new Error("a path may not start with an arc.");
                }
                var start = assert_xy(endpoint(segments[i - 1]));
                var _b = __read(segment.args, 7), _ = _b[0], r = _b[1], __ = _b[2], largeArcFlag = _b[3], sweepFlag = _b[4], xEnd = _b[5], yEnd = _b[6];
                var end = { x: xEnd, y: yEnd };
                var chord = Math.hypot(end.x - start.x, end.y - start.y);
                if (chord === 0)
                    throw new Error("this arc is degenerate (the start point is the same as the endpoint): A".concat(segment.args.join(',')));
                if (chord > 2 * r)
                    r = chord / 2; // sometimes r is too small because of roundoff; clip it so the apothem is 0
                var apothem = Math.sqrt(r * r - chord * chord / 4);
                var arcSign = (largeArcFlag === sweepFlag) ? 1 : -1;
                var step = {
                    x: (end.y - start.y) / chord * apothem * arcSign,
                    y: (start.x - end.x) / chord * apothem * arcSign
                };
                var center = {
                    x: (start.x + end.x) / 2 + step.x,
                    y: (start.y + end.y) / 2 + step.y
                };
                // then enumerate the four nodes of the circle
                points = [
                    { s: end.x, t: end.y },
                    { s: center.x + r, t: center.y },
                    { s: center.x, t: center.y + r },
                    { s: center.x - r, t: center.y },
                    { s: center.x, t: center.y - r },
                ];
                // cull any that are not on this specific arc
                for (var i_2 = 4; i_2 >= 1; i_2--) {
                    var sign = -angleSign(start, assert_xy(points[i_2]), end);
                    if ((sweepFlag === 0) !== (sign > 0))
                        points.splice(i_2, 1);
                }
                break;
            // ignore Zs, naturally
            case 'Z':
                points = [];
                break;
            default:
                throw new Error("idk what the bounds of a '".concat(segment.type, "' segment are"));
        }
        try {
            // finally, search those key points for their greatest and smallest coordinates
            for (var points_1 = (e_10 = void 0, __values(points)), points_1_1 = points_1.next(); !points_1_1.done; points_1_1 = points_1.next()) {
                var _c = points_1_1.value, s = _c.s, t = _c.t;
                if (s < sMin)
                    sMin = s;
                if (s > sMax)
                    sMax = s;
                if (t < tMin)
                    tMin = t;
                if (t > tMax)
                    tMax = t;
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (points_1_1 && !points_1_1.done && (_a = points_1.return)) _a.call(points_1);
            }
            finally { if (e_10) throw e_10.error; }
        }
    }
    return { sMin: sMin, sMax: sMax, tMin: tMin, tMax: tMax };
}
/**
 * return a point on the given segment.
 */
function getMidpoint(prev, segment, domain) {
    if (segment.type === 'L') {
        var start = endpoint(prev);
        var end = endpoint(segment);
        var midpoint = { s: (start.s + end.s) / 2, t: (start.t + end.t) / 2 };
        if (domain.isPeriodic()) {
            if (Math.abs(end.s - start.s) > π) // it's an arithmetic mean of the coordinates but you have to account for periodicity
                midpoint.s = localizeInRange(midpoint.s + π, domain.sMin, domain.sMax);
            if (Math.abs(end.t - start.t) > π)
                midpoint.t = localizeInRange(midpoint.t + π, domain.tMin, domain.tMax);
        }
        return midpoint;
    }
    else if (segment.type === 'A') {
        var start = assert_xy(endpoint(prev));
        var _a = __read(segment.args, 7), r = _a[0], largeArc = _a[3], sweep = _a[4], end_s = _a[5], end_t = _a[6];
        var end = { x: end_s, y: end_t };
        var sign = 1 - 2 * sweep;
        var center = arcCenter(start, end, r, sweep !== largeArc); // find the center
        var direction = {
            x: -sign * (end.y - start.y) + start.x - center.x,
            y: sign * (end.x - start.x) + start.y - center.y,
        };
        var scale = Math.hypot(direction.x, direction.y);
        return {
            s: center.x + direction.x / scale * r, // and then construct the point
            t: center.y + direction.y / scale * r,
        };
    }
    else if (segment.type === 'Φ' || segment.type === 'Λ') {
        var start = endpoint(prev);
        var end = endpoint(segment);
        return { s: (start.s + end.s) / 2, t: (start.t + end.t) / 2 };
    }
    else {
        throw new Error("don't know how to take the midpoint of ".concat(segment.type, " segments."));
    }
}
/**
 * compute the coordinates at which the line between these two points crosses an interrupcion.  for
 * each crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
 * the 1th point's side.  also, the index of the loop on which this crossing lies.
 *
 * the periodicity of the Surface, if the Surface is periodic, will be accounted for with the line between the points
 * (that is, if coords0 and coords1 are on opposite sides of the map, the path between them will be interpreted as the
 * line across the antimeridian).  the edges themselves must be meridians or parallels if the
 * surface is geographic, meaning they will never wrap around the backside of the map (since those line types are
 * defined to always be monotonic in latitude or longitude) and their periodicity is therefore not accounted for.
 */
export function getEdgeCrossings(segmentStart, segment, edges, domain) {
    var e_11, _a;
    var crossings = [];
    var loopIndex = 0;
    for (var i = 1; i < edges.length; i++) { // then look at each edge segment
        if (edges[i].type === 'M') {
            loopIndex++; // counting to keep track of which loop we're on
            continue;
        }
        var edgeStart = endpoint(edges[i - 1]);
        var edge = edges[i];
        // if we're on a geographic surface
        if (domain.isPeriodic()) {
            // find all the geo edge crossings
            var crossing = getGeoEdgeCrossing(assert_φλ(segmentStart), segment, assert_φλ(edgeStart), edge, domain);
            if (crossing !== null) {
                var place0 = crossing.place0, place1 = crossing.place1;
                crossings.push({ intersect0: { s: place0.φ, t: place0.λ },
                    intersect1: { s: place1.φ, t: place1.λ },
                    loopIndex: loopIndex }); // note that if this is a double edge, it is always exiting
            }
        }
        // if we're in the infinite cartesian plane
        else {
            try {
                // find all the map edge crossings
                for (var _b = (e_11 = void 0, __values(getMapEdgeCrossings(assert_xy(segmentStart), segment, assert_xy(edgeStart), edge))), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var point = _c.value;
                    crossings.push({ intersect0: { s: point.x, t: point.y },
                        intersect1: { s: point.x, t: point.y },
                        loopIndex: loopIndex }); // even if the getCrossing function thaut it was only entering
                }
            }
            catch (e_11_1) { e_11 = { error: e_11_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_11) throw e_11.error; }
            }
        }
    }
    return crossings;
}
/**
 * compute the coordinates at which the line between these two points crosses an interrupcion in the map plane.
 *
 * for each crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
 * the 1th point's side.  also, the index of the loop on which this crossing lies, and whether the line is crossing
 * to the left from the POV of the edge (remember that SVG is a left-handed coordinate system).
 *
 * points on the edge will generally count as crossings.
 * also, if the segment passes thru the vertex between two edges, it might register as two identical crossings.
 */
function getMapEdgeCrossings(segmentStart, segment, edgeStart, edge) {
    if (edge.type !== 'L')
        throw new Error("You can't use ".concat(edge.type, " edges in this funccion."));
    var crossings = [];
    var segmentEnd = assert_xy(endpoint(segment));
    var edgeEnd = assert_xy(endpoint(edge));
    if (segment.type === 'L') { // if it's a line
        var intersect = lineLineIntersection(segmentStart, segmentEnd, edgeStart, edgeEnd);
        if (intersect !== null) // if there is an intersection
            crossings.push(intersect); // return it!
    }
    else if (segment.type === 'A') { // if it's an arc
        var _a = __read(segment.args, 6), r = _a[0], rOther = _a[1], largeArc = _a[3], sweepDirection = _a[4]; // get the parameters
        console.assert(r === rOther, "I haven't accounted for ellipses.");
        var q0 = void 0, q1 = void 0;
        if (sweepDirection === 1) {
            q0 = segmentStart;
            q1 = segmentEnd;
        }
        else { // arrange the arc endpoints so that it sweeps clockwise (in graphical coordinates)
            q0 = segmentEnd;
            q1 = segmentStart;
        }
        var center = arcCenter(q0, q1, r, largeArc === 0); // compute the center
        var points = lineArcIntersections(edgeStart, edgeEnd, center, r, q0, q1); // check for intersections
        crossings.push.apply(// check for intersections
        crossings, __spreadArray([], __read(points), false));
    }
    else {
        throw new Error("I don't think you're allowd to use '".concat(segment.type, "' segments here"));
    }
    return crossings;
}
/**
 * compute the coordinates at which the line between these two points crosses a bound on the surface.  if
 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
 * the 1th point's side.  also, whether the path is crossing to the left from the edge's POV.
 *
 * for the purposes of this function, points on the edge count as out (i.e. on the edge's right).
 * if the segment passes thru the vertex between two edges, it might register as two identical crossings.
 */
function getGeoEdgeCrossing(segmentStart, segment, edgeStart, edge, domain) {
    var edgeEnd = assert_φλ(endpoint(edge));
    // some lines are allowed, but they have to have zero length, and will thus never count for crossings
    if (edge.type === 'L') {
        if (localizeInRange(edgeStart.φ, domain.sMin, domain.sMax) !== localizeInRange(edge.args[0], domain.sMin, domain.sMax) ||
            localizeInRange(edgeStart.λ, domain.tMin, domain.tMax) !== localizeInRange(edge.args[1], domain.tMin, domain.tMax))
            throw new Error("'L' segments are only allowed in geoEdges for loop-closing purposes; this seems to have actual length, which is a no-no.");
        return null;
    }
    // other non-graticule segment types are absolutely NG
    else if (edge.type !== 'Λ' && edge.type !== 'Φ') {
        throw new Error("I don't think you're allowd to use ".concat(edge.type, " here"));
    }
    // the body of this function assumes the edge is a parallel going west.  if it isn't that, rotate 90° until it is.
    else if (edge.type === 'Λ' || edgeEnd.λ > edgeStart.λ) {
        var rotatedDomain = rotateDomain(domain, 90);
        var rotatedSegment = rotatePath([segment], 90)[0];
        var rotatedEdge = rotatePath([edge], 90)[0];
        var crossing = getGeoEdgeCrossing({ φ: segmentStart.λ, λ: -segmentStart.φ }, rotatedSegment, { φ: edgeStart.λ, λ: -edgeStart.φ }, rotatedEdge, rotatedDomain);
        if (crossing === null)
            return null;
        else
            return {
                place0: { λ: crossing.place0.φ, φ: -crossing.place0.λ },
                place1: { λ: crossing.place1.φ, φ: -crossing.place1.λ },
            };
    }
    var _a = __read([segmentStart.φ, segmentStart.λ], 2), φ0 = _a[0], λ0 = _a[1]; // extract the input coordinates
    var _b = __read(segment.args, 2), φ1 = _b[0], λ1 = _b[1];
    var φX = edgeStart.φ;
    // if it's a regular line crossing a parallel
    if (segment.type === 'L') {
        var φ̄0 = localizeInRange(φ0, φX, φX + 2 * π);
        var φ̄1 = localizeInRange(φ1, φX, φX + 2 * π);
        if (Math.abs(φ̄0 - φ̄1) >= π) { // call the getParallelCrossing function
            var _c = getParallelCrossing(φ̄0, λ0, φ̄1, λ1, φX, domain), place0 = _c.place0, place1 = _c.place1;
            if (isBetween(place0.λ, edgeStart.λ, edgeEnd.λ))
                return { place0: place0, place1: place1 };
        }
    }
    // if they're both parallels, they can't cross each other
    else if (segment.type === 'Φ') {
        return null;
    }
    // if it's a meridian crossing a parallel
    else if (segment.type === 'Λ') {
        if (isBetween(λ0, edgeStart.λ, edgeEnd.λ)) { // crossings with meridians are simple
            if ((φ0 >= φX) !== (φ1 >= φX)) {
                var place = { φ: φX, λ: segmentStart.λ };
                return { place0: place, place1: place };
            }
        }
    }
    // if it's any other type of segment
    else
        throw new Error("You can't use '".concat(segment.type, "' segments in this funccion."));
    return null;
}
/**
 * compute the coordinates at which the line between these two points crosses a particular parallel.  two Places
 * will be returnd: one on the 0th point's side of the interrupcion, and one on the 1th point's side.  if the
 * parallel is not the antiequator, they will be the same.
 * @param φ0 the transformed latitude of the zeroth point
 * @param λ0 the transformed longitude of the zeroth point
 * @param φ1 the transformed latitude of the oneth point
 * @param λ1 the transformed longitude of the oneth point
 * @param φX the latitude of the parallel.
 * @param domain an object that contains information about the coordinates where parallels and meridians wrap around
 */
function getParallelCrossing(φ0, λ0, φ1, λ1, φX, domain) {
    var weit0 = localizeInRange(φ1 - φX, -π, π);
    var weit1 = localizeInRange(φX - φ0, -π, π);
    var λX;
    if (weit0 === 0)
        λX = λ1; // avoid doing division if you can help it (because of the roundoff)
    else if (weit1 === 0)
        λX = λ0;
    else {
        if (Math.abs(λ1 - λ0) > π) { // account for longitude-periodicity
            var λMin = Math.max(λ0, λ1);
            var λMax = λMin + 2 * π;
            λ0 = localizeInRange(λ0, λMin, λMax);
            λ1 = localizeInRange(λ1, λMin, λMax);
        }
        λX = localizeInRange((weit0 * λ0 + weit1 * λ1) / (weit0 + weit1), domain.tMin, domain.tMax);
    }
    if ((φX === domain.sMin || φX === domain.sMax) && φ0 < φ1)
        return { place0: { φ: domain.sMin, λ: λX },
            place1: { φ: domain.sMax, λ: λX } };
    else if (φX === domain.sMin || φX === domain.sMax)
        return { place0: { φ: domain.sMax, λ: λX },
            place1: { φ: domain.sMin, λ: λX } };
    else
        return { place0: { φ: φX, λ: λX },
            place1: { φ: φX, λ: λX } };
}
/**
 * get all intersections of a path segment with an array of constant-t lines.
 * for the purposes of this function, points on a line are considered below (t+) it,
 * so a tangent segment will only log a crossing if the rest of the segment is above (t-) the line.
 * unlike getEdgeCrossings, this function will endeavor to make crossings unique.
 * @param path the segments doing the crossing
 * @param t0 the position of the line at index zero
 * @param Δt the spacing between adjacent lines
 * @param domain the topology of the space on which these points' coordinates are defined
 * @return a list of intersections, each marked by an s-coordinate, the segment index, the line index, and a direction (true if the path is increasing in t at that point, and false otherwise)
 */
export function getAllCombCrossings(path, t0, Δt, domain) {
    var e_12, _a;
    var crossings = [];
    for (var i = 1; i < path.length; i++) {
        var segmentStart = endpoint(path[i - 1]);
        var segmentAsPath = [{ type: 'M', args: [segmentStart.s, segmentStart.t] }, path[i]];
        var limits = calculatePathBounds(segmentAsPath);
        var jMin = Math.floor((limits.tMin - t0) / Δt) + 1;
        var jMax = Math.floor((limits.tMax - t0) / Δt);
        for (var j = jMin; j <= jMax; j++) {
            var tCrossings = getAllHorizontalLineCrossings(segmentAsPath, t0 + j * Δt, domain);
            try {
                for (var tCrossings_1 = (e_12 = void 0, __values(tCrossings)), tCrossings_1_1 = tCrossings_1.next(); !tCrossings_1_1.done; tCrossings_1_1 = tCrossings_1.next()) {
                    var _b = tCrossings_1_1.value, s = _b.s, i_3 = _b.i, goingEast = _b.goingEast;
                    crossings.push({ s: s, segmentIndex: i_3, lineIndex: j, goingEast: goingEast });
                }
            }
            catch (e_12_1) { e_12 = { error: e_12_1 }; }
            finally {
                try {
                    if (tCrossings_1_1 && !tCrossings_1_1.done && (_a = tCrossings_1.return)) _a.call(tCrossings_1);
                }
                finally { if (e_12) throw e_12.error; }
            }
        }
    }
    return crossings;
}
/**
 * get all intersections of a path with a constant-t line.
 * for the purposes of this function, points on a line are considered below (t+) it,
 * so a tangent path will only log a crossing if the rest of the segment is above (t-) the line.
 * unlike getEdgeCrossings, this function will endeavor to make crossings unique.
 * @return a list of intersections, each marked by an s-coordinate, the index of the path segment, and a direction (true if the path is increasing in t at that point, and false otherwise)
 */
function getAllHorizontalLineCrossings(path, t, domain) {
    var e_13, _a;
    var crossings = [];
    // iterate around the polygon
    for (var i = 1; i < path.length; i++) {
        var start = endpoint(path[i - 1]);
        var end = endpoint(path[i]);
        // check to see if this segment crosses the test path and if so where
        if (path[i].type === 'M' || path[i].type === 'Λ') {
        }
        else if (path[i].type === 'Φ') {
            var crosses = (start.t < t) !== (end.t < t);
            if (crosses)
                crossings.push({ i: i, s: end.s, goingEast: end.t > start.t });
        }
        else if (path[i].type === 'L') {
            var crosses = (start.t < t) !== (end.t < t);
            var goingRight = end.t > start.t;
            if (domain.isPeriodic()) {
                if (Math.abs(end.t - start.t) > π) { // account for wrapping
                    crosses = !crosses;
                    goingRight = !goingRight;
                    start.t = localizeInRange(start.t, t - π, t + π);
                    end.t = localizeInRange(end.t, t - π, t + π);
                }
                end.s = localizeInRange(end.s, start.s - π, start.s + π);
            }
            if (crosses) {
                var s = void 0;
                if (end.s === start.s)
                    s = end.s;
                else {
                    var startWeight = (end.t - t) / (end.t - start.t);
                    s = startWeight * start.s + (1 - startWeight) * end.s;
                }
                if (domain.isPeriodic())
                    s = localizeInRange(s, domain.sMin, domain.sMax, true);
                crossings.push({ i: i, s: s, goingEast: goingRight });
            }
        }
        else if (path[i].type === 'A') {
            if (domain.isPeriodic())
                throw new Error("you may not use arcs on periodic domains.");
            var _b = __read(path[i].args, 6), radius = _b[0], largeArc = _b[3], sweepDirection = _b[4];
            // first compute the circle
            var q0 = assert_xy(start);
            var q1 = assert_xy(end);
            var center = arcCenter(q0, q1, radius, largeArc !== sweepDirection);
            // solve for the zero or two intersections with the circle
            var discriminant = Math.pow(radius, 2) - Math.pow(t - center.y, 2);
            if (discriminant >= 0) {
                try {
                    for (var _c = (e_13 = void 0, __values([-1, 1])), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var sign = _d.value;
                        var intersect = { x: center.x + sign * Math.sqrt(discriminant), y: t };
                        if (intersect.y === q0.y && (intersect.x < center.x) === (q0.x < center.x)) // check for roundoff
                            intersect = q0;
                        else if (intersect.y === q1.y && (intersect.x < center.x) === (q1.x < center.x))
                            intersect = q1;
                        var vy = (sweepDirection > 0) ? intersect.x - center.x : center.x - intersect.x;
                        if (vy !== 0) { // (ignore tangencies)
                            // make sure the intersection is on or between the endpoints
                            // note: there's a shortcut to do this with a single cross-product by looking at the triangle
                            // formed by the three points on the arc, but we don't use it because it's much more susceptible
                            // to roundoff error than this method.
                            var sweepSign = (sweepDirection === 0) ? 1 : -1;
                            var afterQ0 = sweepSign * angleSign(q0, center, intersect) >= 0;
                            var beforeQ1 = sweepSign * angleSign(intersect, center, q1) >= 0;
                            var onArc = (largeArc > 0) ? afterQ0 || beforeQ1 : afterQ0 && beforeQ1;
                            if (onArc) {
                                // discard it if it's on an endpoint and the rest of the arc is below the endpoint (for consistency with linetos)
                                if (intersect.x === q0.x && intersect.y === q0.y && vy > 0)
                                    continue;
                                if (intersect.x === q1.x && intersect.y === q1.y && vy < 0)
                                    continue;
                                // otherwise add it to the list
                                crossings.push({ i: i, s: intersect.x, goingEast: vy > 0 });
                            }
                        }
                    }
                }
                catch (e_13_1) { e_13 = { error: e_13_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_13) throw e_13.error; }
                }
            }
        }
        else {
            throw new Error("you may not use shapes with ".concat(path[i].type, " segments in getAllHorizontalLineCrossings()"));
        }
    }
    return crossings;
}
/**
 * return a number indicating where on the edge of map this point lies
 * @param point the coordinates of the point
 * @param edges the loops of edges on which we are trying to place it
 * @return the index of the edge that contains this point plus the fraccional distance from that edges start to its
 * end of that point, or null if there is no such edge.  also, the index of the edge loop about which we're tauking
 * or null if the point isn't on an edge
 */
function getPositionOnEdge(point, edges) {
    var loopIndex = 0;
    var segmentIndex = 0;
    for (var i = 1; i < edges.length; i++) { // start by choosing an edge
        if (edges[i].type === 'M') {
            loopIndex++;
            segmentIndex = 0;
        }
        else { // an edge that's not just a moveto
            var start = endpoint(edges[i - 1]);
            var end = endpoint(edges[i]);
            var onThisEdge = ((point.s >= Math.min(start.s, end.s)) &&
                (point.s <= Math.max(start.s, end.s)) &&
                (point.t >= Math.min(start.t, end.t)) &&
                (point.t <= Math.max(start.t, end.t)));
            if (onThisEdge) {
                var startToPointVector = [point.s - start.s,
                    point.t - start.t];
                var startToEndVector = [end.s - start.s,
                    end.t - start.t];
                var startToEndSqr = 0;
                var dotProduct = 0;
                for (var k = 0; k < 2; k++) {
                    startToEndSqr += Math.pow(startToEndVector[k], 2);
                    dotProduct += startToPointVector[k] * startToEndVector[k];
                }
                return { loop: loopIndex, index: segmentIndex + dotProduct / startToEndSqr };
            }
            segmentIndex++;
        }
    }
    return { loop: null, index: null };
}
/**
 * just make sure every contiguus section either ends where it started or starts and ends on an edge
 * @param segments the Path to test
 * @param domain the surface that contains the points (so we know when it goes off the edge)
 */
export function isClosed(segments, domain) {
    var start = null;
    for (var i = 0; i < segments.length; i++) {
        if (segments[i].type === 'M')
            start = endpoint(segments[i]);
        // loop from M to M to find each contiguus section
        if (i + 1 === segments.length || segments[i + 1].type === 'M') {
            if (start === null)
                throw new Error("path must begin with a moveto, not ".concat(segments[0].type));
            var end = endpoint(segments[i]);
            // if it doesn't end where it started
            var endsOnStart = start.s === end.s && start.t === end.t;
            // and it doesn't start and end on edges
            var endsOnEdge = domain.isOnEdge(start) && domain.isOnEdge(end);
            // then the Path isn't closed
            if (!endsOnStart && !endsOnEdge)
                return false;
        }
    }
    return true;
}
/**
 * represent a path as faithfully as possible using only 'M'- and 'L'-type segments
 * @param path the true path segments
 * @param precision how many line segments to use for a one-radian arc
 */
export function polygonize(path, precision) {
    if (precision === void 0) { precision = 6; }
    var lastMovetoArgs = null;
    var newPath = [];
    for (var i = 0; i < path.length; i++) { // convert it into a simplified polygon
        if (path[i].type === 'M') {
            lastMovetoArgs = path[i].args;
            newPath.push(path[i]);
        }
        else if (path[i].type === 'L')
            newPath.push(path[i]);
        else if (path[i].type === 'Z') {
            if (lastMovetoArgs === null)
                throw new Error("bruh you didn't start the path with a 'M'?");
            newPath.push({ type: 'L', args: lastMovetoArgs });
        }
        else if (path[i].type === 'A') { // turn arcs into triscadecagons
            var start = assert_xy(endpoint(path[i - 1]));
            var end = assert_xy(endpoint(path[i]));
            var _a = __read(path[i].args, 6), r1 = _a[0], r2 = _a[1], largeArcFlag = _a[3], sweepFlag = _a[4];
            var l = Math.hypot(end.x - start.x, end.y - start.y);
            var r = (r1 + r2) / 2;
            var c = arcCenter(start, end, r, largeArcFlag !== sweepFlag);
            var Δθ = 2 * Math.asin(l / (2 * r)) * ((sweepFlag === 1) ? 1 : -1);
            var θ0 = Math.atan2(start.y - c.y, start.x - c.x);
            var nSegments = Math.ceil(precision * Math.abs(Δθ));
            var lineApprox = [];
            for (var j = 1; j < nSegments; j++)
                lineApprox.push({ type: 'L', args: [
                        c.x + r * Math.cos(θ0 + Δθ * j / nSegments),
                        c.y + r * Math.sin(θ0 + Δθ * j / nSegments)
                    ] });
            lineApprox.push({ type: 'L', args: [end.x, end.y] });
            newPath.push.apply(newPath, __spreadArray([], __read(lineApprox), false));
        }
        else
            throw new Error("I don't know how to polygonize '".concat(path[i].type, "'-type segments"));
    }
    return newPath;
}
/**
 * simplify a path as much as possible without losing detail at the given level.
 * note that the first and last PathSegments will always be unchanged.
 * this function assumes the Path is in the Cartesian plane.
 * @param path the true path segments
 * @param tolerance the maximum distance the simplified path can be from the true path
 * @param checkForM whether to check for and deal with any non-L segments.
 *                  if it's false, we'll assume it's something followed by nothing but Ls.
 */
export function decimate(path, tolerance, checkForM) {
    if (checkForM === void 0) { checkForM = true; }
    if (checkForM) {
        // go thru and separately decimate all of the polyline sections
        var output = [];
        var sectionStart = 0;
        for (var i = 1; i <= path.length; i++) {
            if (i >= path.length || path[i].type !== 'L') {
                output.push.apply(output, __spreadArray([], __read(decimate(path.slice(sectionStart, i), tolerance, false)), false));
                sectionStart = i;
            }
        }
        return output;
    }
    else {
        // otherwise activate the Ramer–Douglas–Peucker algorithm
        if (path.length <= 2)
            return path;
        var start = assert_xy(endpoint(path[0]));
        var end = assert_xy(endpoint(path[path.length - 1]));
        var greatestDistance = -Infinity;
        var farthestI = 0;
        for (var i = 1; i < path.length - 1; i++) {
            var distance = lineSegmentDistance(start, end, assert_xy(endpoint(path[i])));
            if (distance > greatestDistance) {
                greatestDistance = distance;
                farthestI = i;
            }
        }
        if (farthestI === 0)
            throw new Error("something has gone horribly rong and I'm pulling the plug before we recurse infinitely. ".concat(pathToString(path)));
        if (greatestDistance < tolerance)
            return [path[0], path[path.length - 1]];
        else
            return __spreadArray(__spreadArray([], __read(decimate(path.slice(0, farthestI), tolerance, false)), false), __read(decimate(path.slice(farthestI), tolerance, false)), false);
    }
}
/**
 * remove any isolated movetos, that don't have any segments connected to them
 */
export function removeLoosePoints(segments) {
    var newSegments = [];
    for (var i = 0; i < segments.length; i++)
        if (segments[i].type !== 'M' || (i + 1 < segments.length && segments[i + 1].type !== 'M'))
            newSegments.push(segments[i]);
    return newSegments;
}
/**
 * take a closed path and put in Zs wherever the paths close.  this function assumes that the input is
 * actually closed; it doesn't check, and it may return a rong anser if you pass a non closed path.
 */
export function convertPathClosuresToZ(segments) {
    var newSegments = [];
    for (var i = 0; i < segments.length; i++) {
        newSegments.push(segments[i]);
        if (i + 1 === segments.length || segments[i + 1].type === 'M')
            newSegments.push({ type: 'Z', args: [] });
    }
    return newSegments;
}
/**
 * return a copy of this path that traces the same route, but in the opposite direction
 */
export function reversePath(segments) {
    var output = [];
    var pendingM = true;
    var pendingZ = false;
    for (var i = segments.length - 1; i >= 1; i--) {
        if (pendingM && segments[i].type !== 'Z') {
            var end = endpoint(segments[i]);
            output.push({ type: 'M', args: [end.s, end.t] });
            pendingM = false;
        }
        if (segments[i].type === 'M') {
            if (pendingZ)
                output.push({ type: 'Z', args: [] });
            pendingZ = false;
            pendingM = true;
        }
        else if (segments[i].type === 'L') {
            var end = endpoint(segments[i - 1]);
            output.push({ type: 'L', args: [end.s, end.t] });
        }
        else if (segments[i].type === 'A') {
            var _a = __read(segments[i].args, 6), R1 = _a[0], R2 = _a[1], rotation = _a[2], largeArcFlag = _a[3], sweepFlag = _a[4];
            var end = endpoint(segments[i - 1]);
            output.push({ type: 'A', args: [
                    R1, R2, rotation, largeArcFlag, (sweepFlag > 0) ? 0 : 1, end.s, end.t
                ] });
        }
        else if (segments[i].type === 'Z') {
            pendingZ = true;
        }
        else {
            throw new Error("I haven't implemented reversePath() for segments of type '".concat(segments[i].type, "'."));
        }
    }
    return output;
}
/**
 * return a copy of this path where at the end of every section it doubles back and retraces its step
 * back to the last moveto, thus creating a closed path of area zero.
 */
export function doublePath(segments) {
    var output = [];
    var i = null;
    for (var j = 0; j <= segments.length; j++) {
        if (j >= segments.length || segments[j].type === 'M') {
            if (i !== null) {
                var forwardSection = segments.slice(i, j);
                output.push.apply(output, __spreadArray([], __read(forwardSection), false));
                var reverseSection = reversePath(forwardSection).slice(1);
                output.push.apply(output, __spreadArray([], __read(reverseSection), false));
            }
            i = j;
        }
    }
    return output;
}
/**
 * return a copy of this path that is isotropically scaled toward or from the origin
 * @param segments the path to scale
 * @param scaleS the desired dimensionless scale factor on the first dimension
 * @param scaleT the desired dimensionless scale factor on the twoth dimension
 */
export function scalePath(segments, scaleS, scaleT) {
    var e_14, _a;
    var output = [];
    try {
        for (var segments_2 = __values(segments), segments_2_1 = segments_2.next(); !segments_2_1.done; segments_2_1 = segments_2.next()) {
            var _b = segments_2_1.value, type = _b.type, oldArgs = _b.args;
            var newArgs = [];
            for (var i = 0; i < oldArgs.length; i++) {
                if (i % 2 === 0)
                    newArgs.push(oldArgs[i] * scaleS);
                else
                    newArgs.push(oldArgs[i] * scaleT);
            }
            if (type === 'A') {
                if (scaleS !== scaleT)
                    throw new Error("don't scale arcs like that; nothing in this code is equipped to deal with ellipses.");
                newArgs[2] = oldArgs[2];
                newArgs[3] = oldArgs[3];
                newArgs[4] = oldArgs[4];
            }
            output.push({ type: type, args: newArgs });
        }
    }
    catch (e_14_1) { e_14 = { error: e_14_1 }; }
    finally {
        try {
            if (segments_2_1 && !segments_2_1.done && (_a = segments_2.return)) _a.call(segments_2);
        }
        finally { if (e_14) throw e_14.error; }
    }
    return output;
}
/**
 * return a path that is like this one but rotated widershins about the origin.
 * the old path will not be modified.
 * @param segments the path to rotate
 * @param angle the amount to rotate in degrees – must be 90 or 180
 */
export function rotatePath(segments, angle) {
    var e_15, _a;
    if (angle !== 0 && angle !== 90 && angle !== 180 && angle !== 270)
        throw new Error("unsupported rotation angle: ".concat(angle));
    if (angle === 0)
        return segments;
    var output = [];
    try {
        for (var segments_3 = __values(segments), segments_3_1 = segments_3.next(); !segments_3_1.done; segments_3_1 = segments_3.next()) {
            var _b = segments_3_1.value, oldType = _b.type, oldArgs = _b.args;
            var newType = oldType;
            if (angle === 90 || angle === 270) {
                if (oldType === 'Φ')
                    newType = 'Λ';
                else if (oldType === 'Λ')
                    newType = 'Φ';
            }
            var newArgs = void 0;
            switch (oldType) {
                case "A":
                    if (angle === 90)
                        newArgs = oldArgs.slice(0, 5).concat([oldArgs[6], -oldArgs[5]]);
                    else if (angle === 180)
                        newArgs = oldArgs.slice(0, 5).concat([-oldArgs[5], -oldArgs[6]]);
                    else if (angle === 270)
                        newArgs = oldArgs.slice(0, 5).concat([-oldArgs[6], oldArgs[5]]);
                    break;
                case "Z":
                case "M":
                case "L":
                case "Φ":
                case "Λ":
                case "Q":
                case "C":
                    if (angle === 90) {
                        newArgs = Array(oldArgs.length);
                        for (var i = 0; i < oldArgs.length; i += 2) {
                            newArgs[i] = oldArgs[i + 1];
                            newArgs[i + 1] = -oldArgs[i];
                        }
                    }
                    else if (angle === 180) {
                        newArgs = oldArgs.map(function (arg) { return -arg; });
                    }
                    else if (angle === 270) {
                        newArgs = Array(oldArgs.length);
                        for (var i = 0; i < oldArgs.length; i += 2) {
                            newArgs[i] = -oldArgs[i + 1];
                            newArgs[i + 1] = oldArgs[i];
                        }
                    }
                    break;
                default:
                    throw new Error("I don't know how to rotate a ".concat(oldType, " segment."));
            }
            output.push({ type: newType, args: newArgs });
        }
    }
    catch (e_15_1) { e_15 = { error: e_15_1 }; }
    finally {
        try {
            if (segments_3_1 && !segments_3_1.done && (_a = segments_3.return)) _a.call(segments_3);
        }
        finally { if (e_15) throw e_15.error; }
    }
    return output;
}
/**
 * return a path that is like this one but reflected about the s-axis.
 * the old path will not be modified.
 * @param segments the path to rotate
 */
function reflectPath(segments) {
    var e_16, _a;
    var output = [];
    try {
        for (var segments_4 = __values(segments), segments_4_1 = segments_4.next(); !segments_4_1.done; segments_4_1 = segments_4.next()) {
            var _b = segments_4_1.value, type = _b.type, oldArgs = _b.args;
            var newArgs = void 0;
            switch (type) {
                case "A":
                    var _c = __read(oldArgs, 7), rx = _c[0], ry = _c[1], rotation = _c[2], largeArcFlag = _c[3], sweepFlag = _c[4], x = _c[5], y = _c[6];
                    newArgs = [rx, ry, rotation, largeArcFlag, 1 - sweepFlag, x, -y];
                    break;
                case "Z":
                case "M":
                case "L":
                case "Φ":
                case "Λ":
                case "Q":
                case "C":
                    newArgs = Array(oldArgs.length);
                    for (var i = 0; i < oldArgs.length; i += 2) {
                        newArgs[i] = oldArgs[i];
                        newArgs[i + 1] = -oldArgs[i + 1];
                    }
                    break;
                default:
                    throw new Error("I don't know how to flip a ".concat(type, " segment."));
            }
            output.push({ type: type, args: newArgs });
        }
    }
    catch (e_16_1) { e_16 = { error: e_16_1 }; }
    finally {
        try {
            if (segments_4_1 && !segments_4_1.done && (_a = segments_4.return)) _a.call(segments_4);
        }
        finally { if (e_16) throw e_16.error; }
    }
    return output;
}
function rotateDomain(domain, angle) {
    if (angle !== 90)
        throw new Error("this function only works for 90\u00B0 rotations");
    return new Domain(domain.tMin, domain.tMax, -domain.sMax, -domain.sMin, function (place) { return domain.isOnEdge({ s: -place.t, t: place.s }); });
}
function reflectDomain(domain) {
    return new Domain(domain.sMin, domain.sMax, -domain.tMax, -domain.tMin, function (place) { return domain.isOnEdge({ s: place.s, t: -place.t }); });
}
/**
 * create a Path that delineate a rectangular region in either Cartesian or latitude/longitude space
 */
export function rectangle(s0, t0, s2, t2, geographic) {
    if (geographic === void 0) { geographic = false; }
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
}
//# sourceMappingURL=pathutilities.js.map