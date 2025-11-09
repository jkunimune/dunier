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
import { orthogonalBasis, Vector } from "./geometry.js";
/**
 * cover a 3D surface full of points in Delaunay triangles.
 * @param points the list of points in 3-space that are to be triangulated
 * @param normals the normal vector of the triangulated circle at each point, assumed to be [0,0,1] if not specified.
 * @param sample optional set of dummy points to seed the surface
 * @param sampleNormals normal vectors to go with sample
 * @param partition optional set of starter triangles to establish topology, represented as arrays of sample indices.
 * the partition must contain all points if given, and must be given for non-planes.
 * @return triangles – the indices of the nodes that form each triangle in the mesh
 *         parentage – the indices of all parents of each node
 *         between – the indices for all pairs of points that each node separated
 */
export function delaunayTriangulate(points, normals, sample, sampleNormals, partition) {
    var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e, e_6, _f;
    if (normals === void 0) { normals = [new Vector(0, 0, 1)]; }
    if (sample === void 0) { sample = []; }
    if (sampleNormals === void 0) { sampleNormals = [new Vector(0, 0, 1)]; }
    if (partition === void 0) { partition = []; }
    if (points.length === 0)
        return { triangles: [], parentage: [], between: [] };
    if (partition.length === 0) { // start by creating a partition if we have none
        var xMax = -Infinity, xMin = Infinity;
        var yMax = -Infinity, yMin = Infinity;
        for (var i = 0; i < points.length; i++) {
            if (points[i].z !== 0) // assert that it is in fact a plane (remove this if I ever need to implement for not a plane)
                throw new Error("me yexo no bina autonomi fene da no plate.");
            if (points[i].x > xMax)
                xMax = points[i].x; // and get the bounding box in the x-y plane
            if (points[i].x < xMin)
                xMin = points[i].x;
            if (points[i].y > yMax)
                yMax = points[i].y;
            if (points[i].y < yMin)
                yMin = points[i].y;
        }
        sample = [
            new Vector(2 * xMin - xMax, 2 * yMin - yMax, 0), // set the sample to the corners of the bounding boxen
            new Vector(2 * xMax - xMin, 2 * yMin - yMax, 0),
            new Vector(2 * xMax - xMin, 2 * yMax - yMin, 0),
            new Vector(2 * xMin - xMax, 2 * yMax - yMin, 0),
        ];
        partition = [[0, 1, 2], [2, 3, 0]]; // and triangulate it trivially
    }
    var nodos = []; // convert the primitive inputs into our own object formats
    for (var i = 0; i < sample.length; i++)
        nodos.push(new DelaunayNodo(i - sample.length, sample[i], sampleNormals[i % sampleNormals.length]));
    var partitionTriangles = partition.map(function (t) {
        return new DelaunayTriangle(nodos[t[0]], true, nodos[t[1]], true, nodos[t[2]], true);
    });
    var triangles = partitionTriangles.slice(); // then set up the full triangle array
    for (var i = 0; i < points.length; i++)
        nodos.push(new DelaunayNodo(i, points[i], normals[i % normals.length])); // and make the actual nodos
    try {
        for (var _g = __values(nodos.slice(sample.length)), _h = _g.next(); !_h.done; _h = _g.next()) { // for each node,
            var node = _h.value;
            var containing = findSmallestEncompassing(node, partitionTriangles); // find out which triangle it's in
            containing.children = [];
            for (var j = 0; j < 3; j++) { // add the three new child triangles
                containing.children.push(new DelaunayTriangle(node, true, containing.nodos[j], false, containing.nodos[(j + 1) % 3], true));
            }
            triangles.push.apply(triangles, __spreadArray([], __read(containing.children), false)); // add them to the master list
            containing.enabled = false; // we could remove containing from triangles now, but it would be a waste of time
            var flipQueue = []; // start a list of edges to try flipping
            for (var i = 0; i < 3; i++)
                flipQueue.push(new DelaunayEdge(containing.nodos[i], containing.nodos[(i + 1) % 3])); // and put the edges of this triangle on it
            var flipHistory = flipEdges(flipQueue, triangles, [], node); // do the flipping thing
            node.parents = [];
            try {
                for (var _j = (e_2 = void 0, __values(node.triangles)), _k = _j.next(); !_k.done; _k = _j.next()) { // its parentage is all currently connected non-dummy nodes
                    var triangle = _k.value;
                    if (triangle.enabled && widershinsOf(node, triangle).i >= 0)
                        node.parents.push(widershinsOf(node, triangle));
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_k && !_k.done && (_b = _j.return)) _b.call(_j);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                for (var flipHistory_1 = (e_3 = void 0, __values(flipHistory)), flipHistory_1_1 = flipHistory_1.next(); !flipHistory_1_1.done; flipHistory_1_1 = flipHistory_1.next()) { // keep track of the edges that this node flipped; it is "between" those endpoints
                    var edge = flipHistory_1_1.value;
                    if (edge.a.i >= 0 && edge.b.i >= 0)
                        node.between.push([edge.a, edge.b]);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (flipHistory_1_1 && !flipHistory_1_1.done && (_c = flipHistory_1.return)) _c.call(flipHistory_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_h && !_h.done && (_a = _g.return)) _a.call(_g);
        }
        finally { if (e_1) throw e_1.error; }
    }
    try {
        for (var _l = __values(nodos.slice(0, sample.length)), _m = _l.next(); !_m.done; _m = _l.next()) {
            var node = _m.value;
            triangles.push.apply(// now remove the partition vertices
            triangles, __spreadArray([], __read(removeNode(node)), false));
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
        }
        finally { if (e_4) throw e_4.error; }
    }
    try {
        for (var triangles_1 = __values(triangles), triangles_1_1 = triangles_1.next(); !triangles_1_1.done; triangles_1_1 = triangles_1.next()) {
            var triangle = triangles_1_1.value;
            if (triangle.enabled)
                try {
                    for (var _o = (e_6 = void 0, __values(triangle.nodos)), _p = _o.next(); !_p.done; _p = _o.next()) {
                        var nodo = _p.value;
                        console.assert(nodo.i >= 0, triangle, points);
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_p && !_p.done && (_f = _o.return)) _f.call(_o);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
        }
    }
    catch (e_5_1) { e_5 = { error: e_5_1 }; }
    finally {
        try {
            if (triangles_1_1 && !triangles_1_1.done && (_e = triangles_1.return)) _e.call(triangles_1);
        }
        finally { if (e_5) throw e_5.error; }
    }
    // finally, convert to built-in types
    var triangleIdx = triangles.filter(function (t) { return t.enabled; })
        .map(function (t) { return t.nodos.map(function (n) { return n.i; }); });
    var parentIdx = nodos.filter(function (n) { return n.i >= 0; })
        .map(function (n) { return n.parents.map(function (n) { return n.i; }); });
    var betweenIdx = nodos.filter(function (n) { return n.i >= 0; })
        .map(function (n) { return n.between.map(function (ns) { return [ns[0].i, ns[1].i]; }); });
    return { triangles: triangleIdx, parentage: parentIdx, between: betweenIdx }; // convert all to indices and return
}
/**
 * remove all Triangles and Edges connected to the given node, and return a list of new
 * Triangles between the surrounding nodes to replace them.
 * @param node the dummy node to be removed
 * @return array of new Triangles
 */
function removeNode(node) {
    var allOldTriangles = __spreadArray([], __read(node.triangles), false).filter(function (t) { return t.enabled; });
    if (allOldTriangles.length === 0)
        throw new Error("this triangle doesn't seem to be _in_ the network.  like… it makes my job easier but I don't think that should be possible.");
    var oldTriangles = [allOldTriangles[0]]; // starting with an arbitrary neighboring triangle
    while (true) { // trace the graph to find the surrounding triangles in widershins order
        var prev = oldTriangles[oldTriangles.length - 1];
        var med = clockwiseOf(node, prev);
        var next = void 0;
        try {
            next = triangleOf(node, med);
        }
        catch ( // if you come up short,
        _a) { // if you come up short,
            while (true) { // do the same thing in the other direction
                var prev_1 = oldTriangles[0];
                var med_1 = widershinsOf(node, prev_1);
                var next_1 = void 0;
                try {
                    next_1 = triangleOf(med_1, node);
                }
                catch (_b) {
                    next_1 = null;
                }
                if (next_1 === null)
                    break;
                else
                    oldTriangles.splice(0, 0, next_1);
                if (oldTriangles.length > allOldTriangles.length)
                    throw new Error("the graph is messed up here.");
            }
            return removeNodeHull(node, oldTriangles); // and call the exterior node function
        }
        if (next === oldTriangles[0]) // otherwise go until you get back to whence you started
            break;
        else
            oldTriangles.push(next);
        if (oldTriangles.length > allOldTriangles.length)
            throw new Error("the graph is messed up here.");
    }
    return removeNodeInterior(node, oldTriangles); // and then call the embedded node function
}
/**
 * remove all Triangles and Edges connected to the given interior node, given the Triangles that completely surround it.
 * @param node the dummy node to be removed
 * @param surroundings all triangles connected to node to be destroyed, in widershins order
 */
function removeNodeInterior(node, surroundings) {
    var newTriangles = [];
    var flipQueue = [], flipImmune = [];
    arbitrationLoop: for (var i0 = 0; i0 < surroundings.length; i0++) { // we have to pick an arbitrary border node to start this process
        var a = clockwiseOf(node, surroundings[i0]); // choosing i0 is harder than it may seem if we want to avoid coincident triangles
        for (var j = 2; j < surroundings.length - 1; j++) { // run through all the edges we're going to make
            var c = clockwiseOf(node, surroundings[(i0 + j) % surroundings.length]);
            if (isAdjacentTo(a, c)) // and check if any of them already exist
                continue arbitrationLoop; // if so, try a different start
        }
        for (var j = 0; j < surroundings.length; j++) { // begin fixing the gap left by this null node
            var b = widershinsOf(node, surroundings[(i0 + j) % surroundings.length]);
            var c = clockwiseOf(node, surroundings[(i0 + j) % surroundings.length]);
            surroundings[j].enabled = false; // by disabling the triangles that used to fill it
            if (j >= 2)
                newTriangles.push(new DelaunayTriangle(a, true, b, false, c, true)); // and filling it with new, naively placed triangles
            if (j >= 2 && j < surroundings.length - 1)
                flipQueue.push(new DelaunayEdge(a, c)); // keep track of the edges to be flipped
            flipImmune.push(new DelaunayEdge(b, c)); // and to avoid being flipped
        } // if you make it to the end of the for loop, then arbitrary was a fine choice
        break; // and we can proceed
    }
    flipEdges(flipQueue, newTriangles, flipImmune); // do the part where we make it delaunay
    return newTriangles;
}
/**
 * remove all Triangles and Edges connected to the given hull node, given the Triangles that connect it to the interior.
 * @param node the dummy node to be removed
 * @param neighbors all triangles connected to node to be destroyed, ordered from right to left from Node's perspective
 */
function removeNodeHull(node, neighbors) {
    var e_7, _a;
    var newTriangles = [];
    var flipQueue = [];
    for (var i = neighbors.length - 1; i > 0; i--) { // for each edge connected to node
        var a = widershinsOf(node, neighbors[i - 1]); // consider what would happen if you flipped it
        var b = clockwiseOf(node, neighbors[i - 1]);
        var c = clockwiseOf(node, neighbors[i]);
        var _b = __read(flatten(a, b, c), 3), ap = _b[0], bp = _b[1], cp = _b[2]; // project their positions into the normal plane
        if (isRightSideOut(ap, bp, cp)) { // if the resulting triangle could be considered a triangle by the weakest possible definition
            neighbors[i - 1].enabled = neighbors[i].enabled = false; // flip it
            neighbors.splice(i - 1, 1, new DelaunayTriangle(c, false, node, false, a, false)); // you get a new triangle in neighbors
            newTriangles.push(new DelaunayTriangle(a, false, b, false, c, false)); // and a new triangle in newTriangles
            flipQueue.push(new DelaunayEdge(a, c));
        }
    }
    try {
        for (var _c = __values(node.triangles), _d = _c.next(); !_d.done; _d = _c.next()) {
            var triangle = _d.value;
            triangle.enabled = false;
        }
    }
    catch (e_7_1) { e_7 = { error: e_7_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_7) throw e_7.error; }
    }
    flipEdges(flipQueue, newTriangles); // and do some Delaunay checking
    return newTriangles;
}
/**
 * Go through the queue and flip any non-delaunay edges. After flipping an edge, add
 * adjacent edges to the queue. Do not check edges that have newestNode as an endpoint or
 * that are in immune.
 * @param queue initial edges to check
 * @param triangles the list of all Triangles, which must be kept up to date
 * @param immune edges that do not need to be checked
 * @param newestNode a node for which any edges that touch it need not be checked
 * @return Array of Edges that were flipped
 */
export function flipEdges(queue, triangles, immune, newestNode) {
    var e_8, _a, e_9, _b;
    if (immune === void 0) { immune = []; }
    if (newestNode === void 0) { newestNode = null; }
    var flipped = [];
    while (queue.length > 0) { // go through that queue
        var edge = queue.pop(); // extract the needed geometric entities
        var a = edge.a;
        var c = edge.b;
        var abc = null, cda = null;
        try { // be careful when getting the hypothetical cross edge
            abc = triangleOf(c, a);
            cda = triangleOf(a, c);
        }
        catch ( // if you can't find a triangle on one side or the other
        _c) { // if you can't find a triangle on one side or the other
            continue; // it might mean you've hit the end of the partition (I'm sure it's fine)
        }
        var b = widershinsOf(a, abc);
        var d = widershinsOf(c, cda);
        if (isAdjacentTo(b, d))
            continue; // don't try to flip a tetrahedron, tho, as that will create an invalid mesh
        var _d = __read(flatten(a, b, c, d), 4), ap = _d[0], bp = _d[1], cp = _d[2], dp = _d[3]; // project their positions into the normal plane
        if (!isDelaunay(ap, bp, cp, dp)) { // and check for non-Delaunay edges
            abc.children = cda.children = [
                new DelaunayTriangle(b, false, c, false, d, true), // if it is so, assign the old triangles new children
                new DelaunayTriangle(d, false, a, false, b, true),
            ];
            triangles.push.apply(triangles, __spreadArray([], __read(abc.children), false)); // add the new ones to the master list
            abc.enabled = cda.enabled = false; // remove the old ones
            flipped.push(new DelaunayEdge(a, c)); // record this
            immune.push(new DelaunayEdge(a, c));
            var perimeter = [new DelaunayEdge(a, b), new DelaunayEdge(b, c), new DelaunayEdge(c, d), new DelaunayEdge(d, a)];
            try {
                addToQueueLoop: for (var perimeter_1 = (e_8 = void 0, __values(perimeter)), perimeter_1_1 = perimeter_1.next(); !perimeter_1_1.done; perimeter_1_1 = perimeter_1.next()) { // and add the neighbors to the queue
                    var nextEdge = perimeter_1_1.value;
                    try {
                        for (var _e = (e_9 = void 0, __values(queue.concat(immune))), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var safeEdge = _f.value;
                            if (nextEdge.a === safeEdge.a && nextEdge.b === safeEdge.b)
                                continue addToQueueLoop;
                        } // taking care to skip edges that have already been flipped
                    }
                    catch (e_9_1) { e_9 = { error: e_9_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_9) throw e_9.error; }
                    }
                    if (nextEdge.a === newestNode || nextEdge.b === newestNode)
                        continue;
                    queue.push(nextEdge);
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (perimeter_1_1 && !perimeter_1_1.done && (_a = perimeter_1.return)) _a.call(perimeter_1);
                }
                finally { if (e_8) throw e_8.error; }
            }
        }
    }
    return flipped;
}
/**
 * Average the normal vectors of the given nodes and project them into the plane perpendicular to that normal.
 */
export function flatten() {
    var e_10, _a, e_11, _b;
    var nodes = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        nodes[_i] = arguments[_i];
    }
    var n = new Vector(0, 0, 0);
    try {
        for (var nodes_1 = __values(nodes), nodes_1_1 = nodes_1.next(); !nodes_1_1.done; nodes_1_1 = nodes_1.next()) {
            var node = nodes_1_1.value;
            n = n.plus(node.n);
        }
    }
    catch (e_10_1) { e_10 = { error: e_10_1 }; }
    finally {
        try {
            if (nodes_1_1 && !nodes_1_1.done && (_a = nodes_1.return)) _a.call(nodes_1);
        }
        finally { if (e_10) throw e_10.error; }
    }
    var _c = orthogonalBasis(n, true), u = _c.u, v = _c.v;
    var projected = [];
    try {
        for (var nodes_2 = __values(nodes), nodes_2_1 = nodes_2.next(); !nodes_2_1.done; nodes_2_1 = nodes_2.next()) {
            var node = nodes_2_1.value;
            projected.push({ x: node.r.dot(u), y: node.r.dot(v) });
        }
    }
    catch (e_11_1) { e_11 = { error: e_11_1 }; }
    finally {
        try {
            if (nodes_2_1 && !nodes_2_1.done && (_b = nodes_2.return)) _b.call(nodes_2);
        }
        finally { if (e_11) throw e_11.error; }
    }
    return projected;
}
/**
 * Check whether a--c is a Delaunay edge in 2D given the existence of b and d
 */
function isDelaunay(a, b, c, d) {
    var mat = [
        [a.x - d.x, a.y - d.y, a.x * a.x + a.y * a.y - d.x * d.x - d.y * d.y],
        [b.x - d.x, b.y - d.y, b.x * b.x + b.y * b.y - d.x * d.x - d.y * d.y],
        [c.x - d.x, c.y - d.y, c.x * c.x + c.y * c.y - d.x * d.x - d.y * d.y],
    ];
    var det = 0;
    for (var i = 0; i < 3; i++) {
        det = det +
            mat[0][i] * mat[1][(i + 1) % 3] * mat[2][(i + 2) % 3] -
            mat[0][(i + 2) % 3] * mat[1][(i + 1) % 3] * mat[2][i];
    }
    return det < 0;
}
/**
 * Check whether a--b--c is a right-side-out triangle (return false if it's within machine precision of colinearity)
 */
function isRightSideOut(a, b, c) {
    return a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y) > 1e-14 * (Math.pow(a.x, 2) + Math.pow(a.y, 2));
}
/**
 * go down the chain of triangles to find the one that contains this point
 * @param node the node being encompassed
 * @param triangles the top-level list of triangles in which to search
 */
function findSmallestEncompassing(node, triangles) {
    var e_12, _a, _b;
    var bestTriangle = null;
    var bestDistance = Infinity;
    try {
        // iterate thru all triangles
        for (var triangles_2 = __values(triangles), triangles_2_1 = triangles_2.next(); !triangles_2_1.done; triangles_2_1 = triangles_2.next()) {
            var triangle = triangles_2_1.value;
            // find one that contains this node
            if (contains(triangle, node)) {
                var d2 = distanceSqr(triangle, node); // we need to check the distance in case there are multiple candies
                if (d2 < bestDistance)
                    _b = __read([d2, triangle], 2), bestDistance = _b[0], bestTriangle = _b[1];
            }
        }
    }
    catch (e_12_1) { e_12 = { error: e_12_1 }; }
    finally {
        try {
            if (triangles_2_1 && !triangles_2_1.done && (_a = triangles_2.return)) _a.call(triangles_2);
        }
        finally { if (e_12) throw e_12.error; }
    }
    if (bestTriangle === null)
        throw new RangeError("no eureka tingon da indu");
    else if (bestTriangle.enabled)
        return bestTriangle;
    else
        return findSmallestEncompassing(node, bestTriangle.children);
}
/**
 * determine whether this triangle contains the given Nodo, using its neighbors to
 * hint at the direction of the surface. must return false for points outside the
 * triangle's circumcircle.
 * @param triangle the containing triangle
 * @param p the point being contained
 */
function contains(triangle, p) {
    // check alignment on the surface
    var totalNormal = triangle.nodos[0].n.plus(triangle.nodos[1].n).plus(triangle.nodos[2].n);
    if (p.n.dot(totalNormal) < 0)
        return false;
    // check each side condition
    for (var i = 0; i < 3; i++) {
        if (!triangle.siblingFacingEdges[i])
            continue; // but don't check any external edges (these have effectively already been checked and it would be unfortunate if we checked it again and got a different anser)
        var a = triangle.nodos[i];
        var na = a.n;
        var b = triangle.nodos[(i + 1) % 3];
        var nb = b.n;
        var edgeDirection = b.r.minus(a.r);
        var normalDirection = na.plus(nb);
        var boundDirection = normalDirection.cross(edgeDirection);
        var relativePos = (a.i < b.i) ? p.r.minus(a.r) : p.r.minus(b.r);
        if (boundDirection.dot(relativePos) < 0)
            return false;
    }
    return true;
}
/**
 * compute the square of the minimum distance from this triangle to this Nodo.
 */
function distanceSqr(triangle, p) {
    for (var i = 0; i < 3; i++) { // for each edge
        var _a = __read([triangle.nodos[i % 3], triangle.nodos[(i + 1) % 3], triangle.nodos[(i + 2) % 3]], 3), a = _a[0], b = _a[1], c = _a[2];
        var u = b.r.minus(a.r); // throw together some quick orthogonal aligned with each edge
        var v = triangle.n.cross(u);
        var t = v.dot(p.r.minus(a.r)); // project onto the perpendicular plane
        if (t < 0) { // if it lands outside the triangle
            var s = u.dot(p.r.minus(a.r)); // project onto the edge plane
            if (s <= 0) { // if it falls too far to the left
                if (c.r.minus(a.r).dot(p.r.minus(a.r)) > 0) // check whether it falls into the domain of the last edge
                    continue; // otherwise,
                return p.r.minus(a.r).sqr(); // it's the distance to this vertex
            }
            else if (s >= u.dot(b.r.minus(a.r))) { // if it's too far to the rite
                if (c.r.minus(b.r).dot(p.r.minus(a.r)) > 0) // check whether it falls into the domain of the next edge
                    continue; // otherwise,
                return p.r.minus(b.r).sqr(); // it's the distance to that vertex
            }
            else // if it's in the middle
                return p.r.minus(a.r).sqr() - Math.pow(u.dot(p.r.minus(a.r)), 2) / u.sqr(); // compute the point-line distance
        }
    }
    return Math.pow(p.r.minus(triangle.nodos[0].r).dot(triangle.n), 2) / triangle.n.sqr(); // compute the point-plane distance
}
/**
 * find the Nodo that appears after node on this triangle.
 */
function widershinsOf(node, triangle) {
    for (var i = 0; i < 3; i++)
        if (triangle.nodos[i] === node)
            return triangle.nodos[(i + 1) % 3];
    throw new Error("This node isn't even in this triangle.");
}
/**
 * find the Nodo that appears previous to node on this triangle.
 */
function clockwiseOf(node, triangle) {
    for (var i = 0; i < 3; i++)
        if (triangle.nodos[i] === node)
            return triangle.nodos[(i + 2) % 3];
    throw new Error("This node isn't even in this triangle.");
}
/**
 * find the Triangle that has these two Nodes in this order
 */
function triangleOf(a, b) {
    var e_13, _a;
    try {
        for (var _b = __values(a.triangles), _c = _b.next(); !_c.done; _c = _b.next()) {
            var triangle = _c.value;
            if (triangle.enabled && widershinsOf(a, triangle) === b)
                return triangle;
        }
    }
    catch (e_13_1) { e_13 = { error: e_13_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_13) throw e_13.error; }
    }
    throw new Error("these nodes don't appear to have a triangle");
}
/**
 * is there an edge between these two nodes?
 */
function isAdjacentTo(a, b) {
    var e_14, _a;
    try {
        for (var _b = __values(a.triangles), _c = _b.next(); !_c.done; _c = _b.next()) {
            var triangle = _c.value;
            if (triangle.enabled && b.triangles.has(triangle))
                return true;
        }
    }
    catch (e_14_1) { e_14 = { error: e_14_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_14) throw e_14.error; }
    }
    return false;
}
/**
 * a delaunay node (voronoi polygon)
 */
var DelaunayNodo = /** @class */ (function () {
    function DelaunayNodo(i, r, n) {
        this.i = i;
        this.r = r;
        this.n = n;
        this.triangles = new Set();
        this.parents = [];
        this.between = [];
    }
    return DelaunayNodo;
}());
export { DelaunayNodo };
/**
 * a delaunay triangle (voronoi vertex)
 */
var DelaunayTriangle = /** @class */ (function () {
    function DelaunayTriangle(a, abFacesSibling, b, bcFacesSibling, c, acFacesSibling) {
        var e_15, _a;
        this.nodos = [a, b, c];
        this.siblingFacingEdges = [abFacesSibling, bcFacesSibling, acFacesSibling];
        this.children = null;
        this.enabled = true;
        try {
            for (var _b = __values(this.nodos), _c = _b.next(); !_c.done; _c = _b.next()) {
                var v = _c.value;
                v.triangles.add(this);
            }
        }
        catch (e_15_1) { e_15 = { error: e_15_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_15) throw e_15.error; }
        }
        this.n = b.r.minus(a.r).cross(c.r.minus(a.r));
    }
    return DelaunayTriangle;
}());
/**
 * a delaunay edge, connecting two nodes and two triangles
 */
var DelaunayEdge = /** @class */ (function () {
    function DelaunayEdge(a, b) {
        this.a = (a.i < b.i) ? a : b; // set up the order so a always has the lower index
        this.b = (a.i < b.i) ? b : a;
    }
    return DelaunayEdge;
}());
//# sourceMappingURL=delaunay.js.map