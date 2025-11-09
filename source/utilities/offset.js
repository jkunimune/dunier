/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
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
import { assert_xy, endpoint } from "./coordinates.js";
import { decimate, INFINITE_PLANE, isClosed } from "../mapping/pathutilities.js";
import { angleSign, arcCenter } from "./geometry.js";
/**
 * take a closed SVG path and generate another one that encloses the same space that the input path encloses,
 * plus all of the points within a certain distance of it.
 * the resulting path won't necessarily be nice; there may be a lot of self-intersection.
 * but if you just use a positive winding fill rule it _will_ contain the correct set of points.
 * note that the direction of the input curve matters.
 * it's assumed that the input path uses a positive fill rule,
 * so this isn't _super_ well defined for inside-out curves, though it will work for holes.
 * if a path has zero area (like a linear feature that doubles back on itself) it will be interpreted as rightside-out,
 * so you can use such a doubled-back path with a positive offset to get the area surrounding the path itself.
 * @param path the shape to be offset.  it may have multiple parts, but it must be closed.
 * @param offset the distance; positive for dilation and negative for erosion.
 */
export function offset(path, offset) {
    var e_1, _a;
    if (!isClosed(path, INFINITE_PLANE))
        throw new Error("I can't currently offset curves that aren't closed.");
    if (offset === 0)
        return path;
    // first, discard any detail that will be lost when we turn everything into arcs
    path = decimate(path, offset / 6);
    // then switch to our fancy new arc notation
    path = parameterize(path);
    // then break it up into however many separate sections there are
    var ogSections = [];
    var i = null;
    for (var j = 0; j <= path.length; j++) {
        if (j >= path.length || path[j].type === 'M') {
            if (i !== null)
                ogSections.push(path.slice(i, j));
            i = j;
        }
    }
    // now, go thru each segment of each section and do the actual offsetting
    var offSections = [];
    try {
        for (var ogSections_1 = __values(ogSections), ogSections_1_1 = ogSections_1.next(); !ogSections_1_1.done; ogSections_1_1 = ogSections_1.next()) {
            var ogSection = ogSections_1_1.value;
            var offSection = [];
            for (var i_1 = 1; i_1 < ogSection.length; i_1++) {
                // put down the offset version of this segment
                var vertex = assert_xy(endpoint(ogSection[i_1]));
                var offsetVertex1 = void 0;
                if (ogSection[i_1].type === 'L') {
                    var start_1 = assert_xy(endpoint(ogSection[i_1 - 1]));
                    var length_1 = Math.hypot(vertex.x - start_1.x, vertex.y - start_1.y);
                    var normal = {
                        x: (start_1.y - vertex.y) / length_1,
                        y: (vertex.x - start_1.x) / length_1,
                    };
                    offsetVertex1 = {
                        x: vertex.x + offset * normal.x,
                        y: vertex.y + offset * normal.y,
                    };
                    offSection.push({ type: 'L', args: [offsetVertex1.x, offsetVertex1.y] });
                }
                else if (ogSection[i_1].type === 'A*') {
                    var _b = __read(ogSection[i_1].args, 5), radius = _b[0], xC = _b[1], yC = _b[2], x = _b[3], y = _b[4];
                    offsetVertex1 = {
                        x: x + offset / radius * (x - xC),
                        y: y + offset / radius * (y - yC),
                    };
                    offSection.push({ type: 'A*', args: [
                            Math.abs(radius + offset) * Math.sign(radius),
                            xC, yC,
                            offsetVertex1.x, offsetVertex1.y,
                        ] });
                }
                else
                    throw new Error("offset() is not implemented for '".concat(ogSection[i_1].type, "'-type segments."));
                // calculate the start-point of the offset version of the next segment
                var iPlus1 = i_1 % (ogSection.length - 1) + 1;
                var offsetVertex2 = void 0;
                if (ogSection[iPlus1].type === 'L') {
                    var start_2 = assert_xy(endpoint(ogSection[i_1]));
                    var end = assert_xy(endpoint(ogSection[iPlus1]));
                    var length_2 = Math.hypot(end.x - start_2.x, end.y - start_2.y);
                    var normal = {
                        x: (start_2.y - end.y) / length_2,
                        y: (end.x - start_2.x) / length_2,
                    };
                    offsetVertex2 = {
                        x: start_2.x + offset * normal.x,
                        y: start_2.y + offset * normal.y,
                    };
                }
                else if (ogSection[iPlus1].type === 'A*') {
                    var _c = __read(ogSection[iPlus1].args, 4), radius = _c[0], xC = _c[1], yC = _c[2];
                    offsetVertex2 = {
                        x: vertex.x + offset / radius * (vertex.x - xC),
                        y: vertex.y + offset / radius * (vertex.y - yC),
                    };
                }
                else
                    throw new Error("offset() is not implemented for '".concat(ogSection[i_1].type, "'-type segments."));
                // put down the arc linking this segment and the next
                if (offsetVertex1.x !== offsetVertex2.x || offsetVertex1.y !== offsetVertex2.y) {
                    var isConvex = angleSign(offsetVertex1, vertex, offsetVertex2) >= 0; // note that this treats 180° turns as convex
                    offSection.push({ type: 'A*', args: [
                            isConvex ? Math.abs(offset) : -Math.abs(offset),
                            vertex.x, vertex.y,
                            offsetVertex2.x, offsetVertex2.y,
                        ] });
                }
            }
            // add the initial M
            var start = assert_xy(endpoint(offSection[offSection.length - 1]));
            offSection.splice(0, 0, { type: 'M', args: [start.x, start.y] });
            // finally, add a little loop at the end.  it's a little hacky, but what this does is ensure that if this
            // section happens to be inside-out, that we don't accidentally reverse its polarity with the offset.
            if (offSection[offSection.length - 1].type === 'A*' && offSection[offSection.length - 1].args[0] === -offset) {
                // if you were already ending with an arc in the wrong direction, merge them since they'll partially cancel out and we want to avoid degeneracy
                offSection[offSection.length - 1].args[0] = offset;
            }
            else {
                var startVertex = assert_xy(endpoint(ogSection[ogSection.length - 1]));
                offSection.push({ type: 'A*', args: [offset, startVertex.x, startVertex.y, start.x, start.y] });
            }
            offSections.push(offSection);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (ogSections_1_1 && !ogSections_1_1.done && (_a = ogSections_1.return)) _a.call(ogSections_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    // put it all back together and change back to regular arc notation before returning it
    return deparameterize([].concat.apply([], __spreadArray([], __read(offSections), false)));
}
/**
 * return a copy of this path where you've converted all of the 'A' commands to 'A*'.
 * 'A*' is a special command defined just in this file that represents an arc,
 * but rather than the standard SVG arc arguments, its arguments are
 * [signed_radius, x_center, y_center, x_1, y_1].
 * for 'A*' commands, an arc where start and end are the same is interpreted as the full 360°.
 */
function parameterize(path) {
    var output = [];
    for (var i = 0; i < path.length; i++) {
        if (path[i].type === 'A') {
            var start = assert_xy(endpoint(path[i - 1]));
            var _a = __read(path[i].args, 7), rx = _a[0], ry = _a[1], largeArcFlag = _a[3], sweepFlag = _a[4], xEnd = _a[5], yEnd = _a[6];
            if (start.x !== xEnd || start.y !== yEnd) {
                var r = (sweepFlag === 0) ?
                    (rx + ry) / 2 :
                    -(rx + ry) / 2;
                var center = arcCenter(start, { x: xEnd, y: yEnd }, Math.abs(r), largeArcFlag !== sweepFlag);
                output.push({
                    type: 'A*', args: [r, center.x, center.y, xEnd, yEnd],
                });
            }
        }
        else
            output.push(path[i]);
    }
    return output;
}
/**
 * return a copy of this path where you've converted all of the 'A*' commands back to regular 'A'.
 */
function deparameterize(path) {
    var output = [];
    for (var i = 0; i < path.length; i++) {
        if (path[i].type === 'A*') {
            var start = assert_xy(endpoint(path[i - 1]));
            var _a = __read(path[i].args, 5), r = _a[0], xCenter = _a[1], yCenter = _a[2], xEnd = _a[3], yEnd = _a[4];
            var largeArc = Math.sign(r) * angleSign(start, { x: xCenter, y: yCenter }, { x: xEnd, y: yEnd }) < 0;
            var sweepFlag = void 0;
            if (r < 0) {
                r = Math.abs(r);
                sweepFlag = 1;
            }
            else
                sweepFlag = 0;
            // if the arc is a full 360°, then we need to break it up because 'A' arcs will become degenerate
            if (start.x === xEnd && start.y === yEnd) {
                output.push({ type: 'A', args: [r, r, 0, 0, sweepFlag, 2 * xCenter - xEnd, 2 * yCenter - yEnd] }, { type: 'A', args: [r, r, 0, 0, sweepFlag, xEnd, yEnd] });
            }
            // otherwise, just write it as a regular 'A' arc
            else
                output.push({ type: 'A', args: [r, r, 0, largeArc ? 1 : 0, sweepFlag, xEnd, yEnd] });
        }
        else
            output.push(path[i]);
    }
    return output;
}
//# sourceMappingURL=offset.js.map