var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
import { generic } from "./coordinates.js";
import { Tree } from "./tree.js";
import Queue from "./external/tinyqueue.js";
import { trajectoryIntersection } from "./geometry.js";
import { contains, INFINITE_PLANE, Rule, Side } from "../mapping/pathutilities.js";
/**
 * compute the strait skeleton of a polygon and return it, formatted as a tree of nodes.
 * note that this is not a medial axis; if the polygon is concave then the points on the skeleton may not be equidistant
 * from multiple points on the edge.  if the polygon is convex, tho, then it _will_ satisfy that property, and more
 * generally it will always be nonintersecting, be wholly contained within the polygon, and connect all of the vertices
 * together.
 * @param polygon must be convex and oriented so it goes widershins in a right-handed coordinate system.
 * @return a reference to the tree node corresponding to polygon[0].  other nodes will
 *         be found by traversing the attached tree graph.  each of the top two nodes is
 *         the other's parent
 */
export function straightSkeleton(polygon) {
    var e_1, _a;
    if (polygon.length < 3)
        throw new Error("this polygon only has ".concat(polygon.length, " vertices; how can it have any geometric properties at all?"));
    var polygonPath = [];
    try {
        for (var polygon_1 = __values(polygon), polygon_1_1 = polygon_1.next(); !polygon_1_1.done; polygon_1_1 = polygon_1.next()) {
            var vertex = polygon_1_1.value;
            polygonPath.push({ type: 'L', args: [vertex.x, vertex.y] });
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (polygon_1_1 && !polygon_1_1.done && (_a = polygon_1.return)) _a.call(polygon_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    polygonPath.push({ type: 'L', args: [polygon[0].x, polygon[0].y] });
    polygonPath[0].type = 'M';
    // start by laying a foundation which is just the polygon
    var initialNodes = [];
    for (var i = 0; i < polygon.length; i++) {
        var l = (i - 1 + polygon.length) % polygon.length;
        var r = (i + 1) % polygon.length;
        initialNodes.push(new Nodo(direction(polygon[l], polygon[i]), direction(polygon[i], polygon[r]), polygon[i], 0));
    }
    // then instantiate the priority cue
    var upcomingMergers = new Queue([], function (a, b) { return a.time - b.time; });
    for (var i = 0; i < polygon.length; i++) {
        initialNodes[i].linkRite(initialNodes[(i + 1) % polygon.length]);
        try {
            upcomingMergers.push(new Merger(initialNodes[i], initialNodes[(i + 1) % polygon.length]));
        }
        catch (_b) { } // if the merger fails because the rays are parallel, just don't worry about it
    }
    // then advance the wavefronts
    var numIterations = 0;
    while (!upcomingMergers.empty()) {
        var _c = upcomingMergers.pop(), left = _c.left, rite = _c.rite, time = _c.time, place = _c.place; // take the next merger coming up
        if (contains(polygonPath, generic(place), INFINITE_PLANE, Rule.ODD) !== Side.IN) // this should never happen ideally
            continue; // but sometimes if the polygon is slitely concave we haff to check
        if (left.parent === null && rite.parent === null) { // if these are both still waiting to get a parent
            // merge them
            var newNodo = new Nodo(left.leftEdge, rite.riteEdge, place, time, left, rite);
            newNodo.linkLeft(left.leftNeibor); // and update the connectivity graff
            newNodo.linkRite(rite.riteNeibor);
            // check the termination condition
            if (newNodo.leftNeibor === newNodo.riteNeibor) {
                newNodo.parent = newNodo.leftNeibor;
                newNodo.leftNeibor.parent = newNodo;
                return initialNodes[0];
            }
            // predict the intersection of this with its neibors
            try {
                upcomingMergers.push(new Merger(newNodo.leftNeibor, newNodo));
            }
            catch (_d) { } // unless there is no intersection in which case don't worry about it
            try {
                upcomingMergers.push(new Merger(newNodo, newNodo.riteNeibor));
            }
            catch (_e) { }
            numIterations++;
            if (numIterations > polygon.length)
                throw new Error("something went rong.");
        }
    }
    throw new Error("the straight skeleton algorithm failed.  I don't fully understand how that's possible, but is this polygon by chance self-intersecting?");
}
/**
 * the normalized direction inward from a given edge
 */
function direction(a, b) {
    var vx = a.y - b.y;
    var vy = b.x - a.x;
    var length = Math.hypot(vx, vy);
    return { vx: vx / length, vy: vy / length };
}
var Merger = /** @class */ (function () {
    function Merger(left, rite) {
        this.left = left;
        this.rite = rite;
        var intersection = trajectoryIntersection(left.value, left.direction, rite.value, rite.direction);
        this.time = Math.max(left.time + Math.abs(intersection.ta), // these are usuall the same, but if there's any concavity then ta and tb can be negative,
        rite.time + Math.abs(intersection.tb));
        this.place = intersection;
    }
    return Merger;
}());
/**
 * a node on the strait skeleton grid
 */
var Nodo = /** @class */ (function (_super) {
    __extends(Nodo, _super);
    function Nodo(leftEdge, riteEdge, location, time, leftChild, riteChild) {
        if (leftChild === void 0) { leftChild = null; }
        if (riteChild === void 0) { riteChild = null; }
        var _this = _super.call(this, location, leftChild, riteChild) || this;
        _this.leftEdge = leftEdge;
        _this.riteEdge = riteEdge;
        _this.time = time;
        // to compute the direction this node propagates
        _this.direction = {
            x: (leftEdge.vx + riteEdge.vx) / 2.,
            y: (leftEdge.vy + riteEdge.vy) / 2.
        }; // average the two edge velocities
        var sin2_θ = Math.pow(_this.direction.x, 2) + Math.pow(_this.direction.y, 2); // use this handy identity
        if (Math.abs(sin2_θ) > 1e-6) {
            _this.direction.x /= sin2_θ;
            _this.direction.y /= sin2_θ;
        }
        else { // but it mite fail for nearly parallel edges...
            _this.direction = {
                x: (riteEdge.vy - leftEdge.vy) / 2.,
                y: (leftEdge.vx - riteEdge.vx) / 2.
            };
            if (sin2_θ !== 0) {
                var cos2_θ = Math.pow(_this.direction.x, 2) + Math.pow(_this.direction.y, 2); // try using this other identity
                var cos_θ_sin_θ = Math.sqrt(sin2_θ * cos2_θ);
                _this.direction.x /= cos_θ_sin_θ;
                _this.direction.y /= cos_θ_sin_θ;
            }
            else { } // of course, if they're actually parallel, sikataganai. this is garanteed not to merge anything in that case.
        }
        return _this;
    }
    Nodo.prototype.linkLeft = function (last) {
        this.leftNeibor = last;
        last.riteNeibor = this;
    };
    Nodo.prototype.linkRite = function (next) {
        this.riteNeibor = next;
        next.leftNeibor = this;
    };
    return Nodo;
}(Tree));
//# sourceMappingURL=straightskeleton.js.map