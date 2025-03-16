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
import { Tree } from "../datastructures/tree.js";
import Queue from "../datastructures/queue.js";
import { trajectoryIntersection } from "./geometry.js";
/**
 * compute the strait skeleton of a convex polygon and return it, formatted as a tree of
 * nodes.  the polygon must go widdershins.
 * @param polygon must be convex and oriented so it goes widershins
 * @return a reference to the tree node corresponding to polygon[0].  other nodes will
 *         be found by traversing the attached tree graph.  each of the top two nodes is
 *         the other's parent
 */
export function straightSkeleton(polygon) {
    if (polygon.length < 3)
        throw new Error("this polygon only has ".concat(polygon.length, " vertices; how can it have any geometric properties at all?"));
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
        upcomingMergers.push(new Merger(initialNodes[i], initialNodes[(i + 1) % polygon.length]));
    }
    // then advance the wavefronts
    while (!upcomingMergers.empty()) {
        var _a = upcomingMergers.pop(), left = _a.left, rite = _a.rite, time = _a.time, place = _a.place; // take the next merger coming up
        if (time < 0) // this should never happen ideally
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
            upcomingMergers.push(new Merger(newNodo.leftNeibor, newNodo));
            upcomingMergers.push(new Merger(newNodo, newNodo.riteNeibor));
        }
    }
    throw new Error("the straight skeleton algorithm failed.  I don't fully understand how that's possible, but is this polygon by chance concave?");
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
        // if (!(intersection.ta > 0 && intersection.tb > 0))
        // 	throw `(${left.value.x}, ${left.value.y}) + t (${left.direction.x}, ${left.direction.y}) = ` +
        // 	      `(${rite.value.x}, ${rite.value.y}) + t (${rite.direction.x}, ${rite.direction.y})`;
        this.time = left.time + intersection.ta;
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
        if (sin2_θ > 1e-6) {
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