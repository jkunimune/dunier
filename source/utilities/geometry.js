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
import { localizeInRange } from "./miscellaneus.js";
/**
 * calculate the sign of this triangle
 * @return in a left-handed coordinate system:
 *         - a positive number if b is to the left of a from the point of view of an observer at c facing d
 *           (meaning d is to the right of c for an observer facing from a to b);
 *         - a negative number if b is to the right of a for an observer at c facing d; or
 *         - 0 if ab and cd are collinear or either has zero magnitude.
 *         in a right-handed coordinate system: the reverse
 */
export function crossingSign(a, b, c, d) {
    return (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
}
/**
 * calculate the sign of this triangle in a left-handed coordinate system
 * @return a positive number if the triangle goes clockwise, a negative number if it
 *         goes widershins, and zero if it is degenerate.  in actuality, this returns
 *         two times the area of the triangle formed by these points, so if there is
 *         roundoff error, know that it will be of that order.
 */
export function angleSign(a, b, c) {
    return crossingSign(b, c, b, a);
}
/**
 * calculate the sign of this passing
 * @return a positive number if the vector from a to b is roughly in the same direction
 * as that from c to d (within 90°), a negative number if they're in roughly opposite
 * directions, and 0 if they're perpendicular or either has zero length.
 */
export function passingSign(a, b, c, d) {
    return (b.x - a.x) * (d.x - c.x) + (b.y - a.y) * (d.y - c.y);
}
/**
 * compute the point equidistant from the three points given.
 */
export function circumcenter(points) {
    if (points.length !== 3)
        throw new Error("it has to be 3.");
    var xNumerator = 0, yNumerator = 0;
    var denominator = 0;
    for (var i = 0; i < 3; i++) { // do the 2D circumcenter calculation
        var a = points[i];
        var b = points[(i + 1) % 3];
        var c = points[(i + 2) % 3];
        xNumerator += (a.x * a.x + a.y * a.y) * (b.y - c.y);
        yNumerator += (a.x * a.x + a.y * a.y) * (c.x - b.x);
        denominator += a.x * (b.y - c.y);
    }
    return {
        x: xNumerator / denominator / 2,
        y: yNumerator / denominator / 2
    };
}
/**
 * get the center of a circle given two points on it and its radius
 * @param a the first point on the circle
 * @param b the second point on the circle
 * @param r the radius of the circle
 * @param onTheRight whether the center is on the right of the strait-line path from a to b in a left-handed
 *                   coordinate system (for SVG arcs this is largeArcFlag!=sweepFlag)
 */
export function arcCenter(a, b, r, onTheRight) {
    var d = Math.hypot(b.x - a.x, b.y - a.y);
    var l = Math.sqrt(Math.max(0, r * r - d * d / 4));
    if (onTheRight)
        l *= -1;
    var sin_θ = (b.y - a.y) / d;
    var cos_θ = -(b.x - a.x) / d;
    return {
        x: (a.x + b.x) / 2 + l * sin_θ,
        y: (a.y + b.y) / 2 + l * cos_θ,
    };
}
/**
 * find the intersection between two line segments, or determine that there isn't one.
 * for the purposes of this function, when one endpoint is coincident with the other
 * segment, it is counted as an intersection.
 * @returns the location where they cross, or null if they don't
 */
export function lineLineIntersection(p1, p2, q1, q2) {
    if (q1.x === q2.x) {
        var r = null;
        if (p1.x === q1.x)
            r = p1;
        else if (p2.x === q1.x)
            r = p2;
        else if (Math.min(p1.x, p2.x) <= q1.x && Math.max(p1.x, p2.x) >= q1.x)
            r = { x: q1.x, y: (q1.x - p1.x) / (p2.x - p1.x) * (p2.y - p1.y) + p1.y };
        if (r !== null && r.y >= Math.min(q1.y, q2.y) && r.y <= Math.max(q1.y, q2.y))
            return r;
        return null;
    }
    else if (q1.y === q2.y) {
        return transpose(lineLineIntersection(transpose(p1), transpose(p2), transpose(q1), transpose(q2)));
    }
    else {
        throw new Error("I haven't implemented obleke intersections, but if you want, try https://blogs.sas.com/content/iml/2018/07/09/intersection-line-segments.html");
    }
}
/**
 * find the intersection between two lines given in point–velocity form, returning it in
 * both cartesian and parametric coordinates.
 * @returns the location where the lines cross and the corresponding times
 */
export function trajectoryIntersection(a, va, b, vb) {
    if (va.x * vb.y - va.y * vb.x === 0)
        throw new Error("the given trajectories do not ever intersect.");
    var ta = (vb.x * (a.y - b.y) - vb.y * (a.x - b.x)) /
        (va.x * vb.y - va.y * vb.x);
    var x = a.x + va.x * ta;
    var y = a.y + va.y * ta;
    var tb = (vb.y === 0) ? (x - b.x) / vb.x :
        (y - b.y) / vb.y;
    return { x: x, y: y, ta: ta, tb: tb };
}
/**
 * find the intersections between a line segment and an arc.  for the purposes of this
 * function, the line being tangent to the arc body does not count as intersection, but
 * the line passing thru one of the arc's endpoints does, as does the arc passing thru
 * one of the line's endpoints.
 * @param p0 one endpoint of the line segment
 * @param p1 the other endpoint of the line segment
 * @param o the center of the arc
 * @param r the radius of the arc
 * @param q0 the point on the rite of the arc (viewd from the center)
 * @param q1 the point on the left of the arc (viewd from the center)
 * @param epsilon amount of roundoff for which to account
 */
export function lineArcIntersections(p0, p1, o, r, q0, q1, epsilon) {
    var e_1, _a, e_2, _b;
    if (epsilon === void 0) { epsilon = 1e-15; }
    var scale = Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2);
    var pitch = (p0.x - o.x) * (p1.x - p0.x) + (p0.y - o.y) * (p1.y - p0.y);
    var distance = (p0.x + q0.x - 2 * o.x) * (p0.x - q0.x) +
        (p0.y + q0.y - 2 * o.y) * (p0.y - q0.y);
    var vertex = -pitch / scale;
    var discriminant = vertex * vertex - distance / scale;
    // if this quadratic is solvable, extract the roots
    if (discriminant > r * r / scale * epsilon) {
        var sqrtDiscriminant = Math.sqrt(discriminant);
        var roots = [
            vertex + sqrtDiscriminant,
            vertex - sqrtDiscriminant
        ];
        var crossings = [];
        try {
            // then, check each one to see if it is between the line segment endpoints
            for (var roots_1 = __values(roots), roots_1_1 = roots_1.next(); !roots_1_1.done; roots_1_1 = roots_1.next()) {
                var t = roots_1_1.value;
                if (t >= 0 && t <= 1) {
                    var x = { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
                    try {
                        for (var _c = (e_2 = void 0, __values([q0, q1])), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var q = _d.value;
                            if (angleSign(q, p0, p1) === 0 && (t > vertex) === (passingSign(o, q, p0, p1) > 0))
                                x = q;
                        } // make it exactly equal to the endpoint if it seems like it should be
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    // and if it is between the arc endpoints
                    var rightOfQ0 = angleSign(q0, o, x) <= 0;
                    var leftOfQ1 = angleSign(x, o, q1) <= 0;
                    var insideOut = angleSign(q0, o, q1) >= 0;
                    var onArc = insideOut ? rightOfQ0 || leftOfQ1 : rightOfQ0 && leftOfQ1;
                    if (onArc)
                        crossings.push(x);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (roots_1_1 && !roots_1_1.done && (_a = roots_1.return)) _a.call(roots_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return crossings;
    }
    else {
        return [];
    }
}
/**
 * calcluate the minimum distance between a point and a line segment.
 * @param a one of the line segment's endpoints
 * @param b one of the line segment's endpoints
 * @param point the point to which we're measuring the distance
 */
export function lineSegmentDistance(a, b, point) {
    // if the line segment is degenerate, calculate point-to-point distance
    if (a.x === b.x && a.y === b.y)
        return Math.hypot(point.x - a.x, point.y - a.y);
    // project the point onto the line
    var t = ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / (Math.pow((b.x - a.x), 2) + Math.pow((b.y - a.y), 2));
    // use that to determine to which part of the line segment we should measure the distance
    var nearestPoint;
    if (t < 0)
        nearestPoint = a;
    else if (t > 1)
        nearestPoint = b;
    else
        nearestPoint = {
            x: (1 - t) * a.x + t * b.x,
            y: (1 - t) * a.y + t * b.y,
        };
    // measure the distance
    return Math.hypot(point.x - nearestPoint.x, point.y - nearestPoint.y);
}
/**
 * copy and edit a polygon so that if its vertices are approximately orderd
 * counterclockwise from the POV of the origin, then they are rearranged to be
 * exactly orderd widdershins from the POV of the origin (in a right-handed coordinate system)
 * @return the reorderd copy of the polygon
 */
export function checkVoronoiPolygon(vertexes) {
    var e_3, _a;
    // convert the point positions to angles
    var measuredVertexes = [];
    try {
        for (var vertexes_1 = __values(vertexes), vertexes_1_1 = vertexes_1.next(); !vertexes_1_1.done; vertexes_1_1 = vertexes_1.next()) {
            var _b = vertexes_1_1.value, x = _b.x, y = _b.y;
            measuredVertexes.push({ x: x, y: y, θ: Math.atan2(y, x) });
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (vertexes_1_1 && !vertexes_1_1.done && (_a = vertexes_1.return)) _a.call(vertexes_1);
        }
        finally { if (e_3) throw e_3.error; }
    }
    // find the largest gap between two vertices
    var largestGap = { i: -1, span: -Infinity };
    for (var i = 0; i < vertexes.length; i++) {
        var last = measuredVertexes[i];
        var next = measuredVertexes[(i + 1) % vertexes.length];
        var span = Math.abs(localizeInRange(next.θ - last.θ, -Math.PI, Math.PI));
        if (span > largestGap.span)
            largestGap = { i: i, span: span };
    }
    // fix that gap as the boundary
    var end = measuredVertexes[largestGap.i].θ;
    for (var i = 0; i < vertexes.length; i++)
        measuredVertexes[i].θ = localizeInRange(measuredVertexes[i].θ, end - 2 * Math.PI, end, true);
    // sort the angles
    measuredVertexes.sort(function (a, b) { return a.θ - b.θ; });
    // rearrange so that the break occurs at the same index as before
    return measuredVertexes.slice(vertexes.length - 1 - largestGap.i).concat(measuredVertexes.slice(0, vertexes.length - 1 - largestGap.i));
}
/**
 * exchange x and y for this point
 */
function transpose(p) {
    if (p === null)
        return null;
    else
        return { x: p.y, y: p.x };
}
/**
 * generate a set of three mutually orthogonal Vectors
 * @param n the direction of the n vector
 * @param normalize whether to normalize the three vectors before returning them
 * @returns three vectors, u, v, and n.  if they are normalized, u×v=n, v×n=u, and n×u=v.  if they aren’t then the
 * magnitudes will be whatever.  also, u will always be orthogonal to the z-axis.
 */
export function orthogonalBasis(n, normalize) {
    if (normalize === void 0) { normalize = false; }
    var bias = new Vector(0, 0, 1);
    if (bias.cross(n).sqr() === 0)
        bias = new Vector(1, 0, 0);
    var u = bias.cross(n);
    var v = n.cross(u);
    if (normalize) {
        u = u.normalized();
        v = v.normalized();
        n = n.normalized();
    }
    return { u: u, v: v, n: n };
}
/**
 * a vector in 3-space
 */
var Vector = /** @class */ (function () {
    function Vector(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    Vector.prototype.times = function (a) {
        return new Vector(this.x * a, this.y * a, this.z * a);
    };
    Vector.prototype.over = function (a) {
        return new Vector(this.x / a, this.y / a, this.z / a);
    };
    Vector.prototype.plus = function (that) {
        return new Vector(this.x + that.x, this.y + that.y, this.z + that.z);
    };
    Vector.prototype.minus = function (that) {
        return new Vector(this.x - that.x, this.y - that.y, this.z - that.z);
    };
    Vector.prototype.dot = function (that) {
        return (this.x * that.x +
            this.y * that.y +
            this.z * that.z);
    };
    Vector.prototype.cross = function (that) {
        return new Vector(this.y * that.z - this.z * that.y, this.z * that.x - this.x * that.z, this.x * that.y - this.y * that.x);
    };
    /**
     * calculate the dot product of this with itself
     */
    Vector.prototype.sqr = function () {
        return this.dot(this);
    };
    /**
     * return a version of this normalized to have a length of 1
     */
    Vector.prototype.normalized = function () {
        return this.over(Math.sqrt(this.sqr()));
    };
    Vector.prototype.toString = function () {
        return "<".concat(Math.trunc(this.x * 1e3) / 1e3, ", ").concat(Math.trunc(this.y * 1e3) / 1e3, ", ").concat(Math.trunc(this.z * 1e3) / 1e3, ">");
    };
    return Vector;
}());
export { Vector };
//# sourceMappingURL=geometry.js.map