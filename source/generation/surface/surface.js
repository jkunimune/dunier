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
import { Random } from "../../utilities/random.js";
import { binarySearch, linterp, noisyProfile } from "../../utilities/miscellaneus.js";
import { Biome } from "../terrain.js";
import { checkVoronoiPolygon, circumcenter, orthogonalBasis, Vector } from "../../utilities/geometry.js";
import { straightSkeleton } from "../../utilities/straightskeleton.js";
import { delaunayTriangulate } from "../../utilities/delaunay.js";
import { POPULATION_DENSITY } from "../world.js";
var TILE_AREA = 30000; // target area of a tile in km^2
var GREEBLE_FACTOR = .35;
var FINEST_RESOLUTION = 0.1; // km
var INTEGRATION_RESOLUTION = 32;
/**
 * Generic 3D collection of Voronoi polygons
 */
var Surface = /** @class */ (function () {
    function Surface(φMin, φMax, hasDayNightCycle) {
        this.tiles = null;
        this.φMin = φMin;
        this.φMax = φMax;
        this.axis = null;
        this.edge = new Map();
        this.hasDayNightCycle = hasDayNightCycle;
    }
    /**
     * do the general constructor stuff that has to be done after the subclass constructor
     */
    Surface.prototype.initialize = function () {
        var φStart = Math.max(this.φMin, -Math.PI);
        var φEnd = Math.min(this.φMax, Math.PI);
        this.refLatitudes = [φStart]; // fill in latitude-integrated values
        this.cumulAreas = [0]; // for use in sampling
        var Δλ = 2 * Math.PI;
        for (var i = 1; i <= INTEGRATION_RESOLUTION; i++) {
            this.refLatitudes.push(φStart + (φEnd - φStart) * i / INTEGRATION_RESOLUTION);
            var north = this.rz(this.refLatitudes[i]);
            var south = this.rz(this.refLatitudes[i - 1]);
            var Δs = Math.hypot(north.r - south.r, north.z - south.z); // treat the surface as a series of cone segments
            var ds_dλ = (north.r + south.r) / 2;
            var ΔArea = ds_dλ * Δλ * Δs;
            this.cumulAreas.push(this.cumulAreas[i - 1] + ΔArea);
        }
        this.area = this.cumulAreas[INTEGRATION_RESOLUTION]; // and record the totals as their own instance variables
        this.axis = this.xyz({ φ: 1, λ: Math.PI / 2 }).minus(this.xyz({ φ: 1, λ: 0 })).cross(this.xyz({ φ: 1, λ: Math.PI }).minus(this.xyz({ φ: 1, λ: Math.PI / 2 }))).normalized(); // figure out which way the coordinate system points
    };
    /**
     * fill this.tiles with the given tiles.
     */
    Surface.prototype.populateWith = function (tiles) {
        var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e, e_6, _f, e_7, _g, e_8, _h, e_9, _j, e_10, _k, e_11, _l, e_12, _m, e_13, _o;
        this.tiles = new Set(tiles); // keep that list, but save it as a set as well
        // seed the surface
        var partition = this.partition();
        // call the delaunay triangulation subroutine
        var triangulation = delaunayTriangulate(tiles.map(function (t) { return t.pos; }), tiles.map(function (t) { return t.normal; }), partition.nodos.map(function (t) { return t.pos; }), partition.nodos.map(function (t) { return t.normal; }), partition.triangles.map(function (v) { return v.tiles.map(function (t) { return partition.nodos.indexOf(t); }); }));
        this.vertices = new Set(); // unpack the resulting Voronoi vertices
        try {
            for (var _p = __values(triangulation.triangles), _q = _p.next(); !_q.done; _q = _p.next()) {
                var _r = __read(_q.value, 3), ia = _r[0], ib = _r[1], ic = _r[2];
                var _s = Vertex.computeLocation(tiles[ia], tiles[ib], tiles[ic]), pos = _s.pos, coordinates = _s.coordinates;
                // only create Vertices inside the surface domain; discard any that fall outside
                if (coordinates.φ <= this.φMax && coordinates.φ >= this.φMin)
                    this.vertices.add(new Vertex(tiles[ia], tiles[ib], tiles[ic], pos, coordinates)); // this will automatically generate the Edges
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_q && !_q.done && (_a = _p.return)) _a.call(_p);
            }
            finally { if (e_1) throw e_1.error; }
        }
        for (var i = 0; i < tiles.length; i++) {
            try {
                for (var _t = (e_2 = void 0, __values(triangulation.parentage[i])), _u = _t.next(); !_u.done; _u = _t.next()) {
                    var j = _u.value;
                    tiles[i].parents.push(tiles[j]);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_u && !_u.done && (_b = _t.return)) _b.call(_t);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                for (var _v = (e_3 = void 0, __values(triangulation.between[i])), _w = _v.next(); !_w.done; _w = _v.next()) {
                    var _x = __read(_w.value, 2), j = _x[0], k = _x[1];
                    tiles[i].between.push([tiles[j], tiles[k]]);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_w && !_w.done && (_c = _v.return)) _c.call(_v);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
        // after all that's through, some tiles won't have any parents
        for (var i = 1; i < tiles.length; i++) {
            if (tiles[i].parents.length === 0) { // if that's so,
                var orphan = tiles[i];
                var closest = null; // the easiest thing to do is to just assign it the closest tile that came before it using the list
                var minDistance = Infinity;
                for (var j = 0; j < orphan.index; j++) {
                    var distance = this.distance(tiles[j], orphan);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closest = tiles[j];
                    }
                }
                orphan.parents = [closest];
            }
        }
        try {
            // add Vertices along the edge, if there is one, to complete the graph
            for (var _y = __values(new Set(this.vertices)), _z = _y.next(); !_z.done; _z = _y.next()) {
                var vertex = _z.value;
                try {
                    for (var _0 = (e_5 = void 0, __values(vertex.edges)), _1 = _0.next(); !_1.done; _1 = _0.next()) {
                        var edge = _1.value;
                        if (edge.vertex1 === null) { // you're looking for Edges that are missing a Vertex
                            var _2 = this.computeEdgeVertexLocation(edge.tileL, edge.tileR), pos = _2.pos, coordinates = _2.coordinates;
                            this.vertices.add(new Vertex(edge.tileL, edge.tileR, new EmptySpace(this), pos, coordinates));
                        }
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_1 && !_1.done && (_e = _0.return)) _e.call(_0);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_z && !_z.done && (_d = _y.return)) _d.call(_y);
            }
            finally { if (e_4) throw e_4.error; }
        }
        try {
            // finally, complete the remaining vertices' network graphs
            for (var _3 = __values(this.vertices), _4 = _3.next(); !_4.done; _4 = _3.next()) {
                var vertex = _4.value;
                for (var i = 0; i < 3; i++) {
                    var edge = vertex.edges[i];
                    if (edge !== null) {
                        if (vertex === edge.vertex1)
                            vertex.neighbors.set(edge.vertex0, edge);
                        else
                            vertex.neighbors.set(edge.vertex1, edge);
                    }
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_4 && !_4.done && (_f = _3.return)) _f.call(_3);
            }
            finally { if (e_6) throw e_6.error; }
        }
        try {
            // and find the edge of the surface, if there is one
            for (var _5 = __values(this.tiles), _6 = _5.next(); !_6.done; _6 = _5.next()) {
                var tile = _6.value;
                try {
                    for (var _7 = (e_8 = void 0, __values(tile.neighbors.keys())), _8 = _7.next(); !_8.done; _8 = _7.next()) {
                        var neibor = _8.value;
                        if (tile.rightOf(neibor).widershinsOf(tile) instanceof EmptySpace)
                            this.edge.set(tile, { next: neibor, prev: null });
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (_8 && !_8.done && (_h = _7.return)) _h.call(_7);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_6 && !_6.done && (_g = _5.return)) _g.call(_5);
            }
            finally { if (e_7) throw e_7.error; }
        }
        try {
            for (var _9 = __values(this.edge.keys()), _10 = _9.next(); !_10.done; _10 = _9.next()) {
                var tile = _10.value;
                this.edge.get(this.edge.get(tile).next).prev = tile;
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (_10 && !_10.done && (_j = _9.return)) _j.call(_9);
            }
            finally { if (e_9) throw e_9.error; }
        }
        try {
            // now we can save each tile's strait skeleton to the edges (to bound the greebling)
            for (var _11 = __values(this.tiles), _12 = _11.next(); !_12.done; _12 = _11.next()) {
                var tile = _12.value;
                var vertices = [];
                try {
                    for (var _13 = (e_11 = void 0, __values(tile.getPolygon())), _14 = _13.next(); !_14.done; _14 = _13.next()) {
                        var vertex = _14.value.vertex;
                        vertices.push({
                            x: vertex.pos.minus(tile.pos).dot(tile.east), // project the voronoi polygon into 2D
                            y: vertex.pos.minus(tile.pos).dot(tile.north),
                        });
                    }
                }
                catch (e_11_1) { e_11 = { error: e_11_1 }; }
                finally {
                    try {
                        if (_14 && !_14.done && (_l = _13.return)) _l.call(_13);
                    }
                    finally { if (e_11) throw e_11.error; }
                }
                // sometimes errors arising from the surface curvature cause the polygon to be a little twisted.
                // check for this and fudge it to make it to be non-intersecting if you must.
                vertices = checkVoronoiPolygon(vertices);
                // now get the strait skeleton
                var skeletonLeaf = straightSkeleton(vertices);
                try {
                    for (var _15 = (e_12 = void 0, __values(tile.getPolygon())), _16 = _15.next(); !_16.done; _16 = _15.next()) {
                        var edge = _16.value.edge;
                        if (edge !== null) {
                            var arc = skeletonLeaf.pathToNextLeaf();
                            var projectedArc = [];
                            try {
                                for (var _17 = (e_13 = void 0, __values(arc.slice(1, arc.length - 1))), _18 = _17.next(); !_18.done; _18 = _17.next()) {
                                    var joint = _18.value;
                                    var _19 = joint.value, x = _19.x, y = _19.y;
                                    projectedArc.push(// drop the endpoints and project it back
                                    tile.pos.plus(tile.east.times(x).plus(tile.north.times(y))));
                                }
                            }
                            catch (e_13_1) { e_13 = { error: e_13_1 }; }
                            finally {
                                try {
                                    if (_18 && !_18.done && (_o = _17.return)) _o.call(_17);
                                }
                                finally { if (e_13) throw e_13.error; }
                            }
                            if (edge.tileL === tile) // then save each part of the skeleton it to an edge
                                edge.leftBoundCartesian = projectedArc;
                            else
                                edge.rightBoundCartesian = projectedArc;
                            skeletonLeaf = arc[arc.length - 1]; // move onto the next one
                        }
                    }
                }
                catch (e_12_1) { e_12 = { error: e_12_1 }; }
                finally {
                    try {
                        if (_16 && !_16.done && (_m = _15.return)) _m.call(_15);
                    }
                    finally { if (e_12) throw e_12.error; }
                }
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (_12 && !_12.done && (_k = _11.return)) _k.call(_11);
            }
            finally { if (e_10) throw e_10.error; }
        }
    };
    /**
     * return a list of however many tiles are needed to populate this Surface, uniformly
     * sampled from the Surface using the given random number generator.
     * Latin hypercube sampling is used to ensure the points are somewhat evenly spaced.
     */
    Surface.prototype.randomlySubdivide = function (rng) {
        // generate the tiles
        var tileArea = Math.min(TILE_AREA, 1 / (4 * Math.pow(this.maximumCurvature(), 2)));
        var numTiles = Math.max(50, Math.round(this.area / tileArea));
        // first, generate evenly spaced latitudes and longitudes
        var longitudes = [];
        var latitudes = [];
        for (var i = 0; i < numTiles; i++) {
            var λ = -Math.PI + (2 * Math.PI) * (i + 0.5) / numTiles;
            longitudes.push(λ);
            var A = this.cumulAreas[this.cumulAreas.length - 1] * (i + 0.5) / numTiles;
            var φ = linterp(A, this.cumulAreas, this.refLatitudes);
            latitudes.push(φ);
        }
        // then shuffle them each separately
        rng.shuffle(longitudes);
        rng.shuffle(latitudes);
        // then build the tiles from those in their new order
        var tiles = [];
        for (var i = 0; i < numTiles; i++)
            tiles.push(new Tile(i, { φ: latitudes[i], λ: longitudes[i] }, this));
        return tiles;
    };
    /**
     * return 2d arrays of x, y, z, and insolation.
     */
    Surface.prototype.parameterize = function (resolution) {
        var φStart = Math.max(this.φMin, -Math.PI);
        var φEnd = Math.min(this.φMax, Math.PI);
        var n = 2 * resolution, m = 4 * resolution;
        var X = [], Y = [], Z = [], S = [];
        for (var i = 0; i <= n; i++) {
            var φ = i / n * (φEnd - φStart) + φStart; // map i to the valid range for φ
            var s = this.insolation(φ);
            X.push([]);
            Y.push([]);
            Z.push([]);
            S.push([]);
            for (var j = 0; j <= m; j++) {
                var λ = j / m * 2 * Math.PI; // I think λ always represents some [0, 2*pi) angle
                var _a = this.xyz({ φ: φ, λ: λ }), x = _a.x, y = _a.y, z = _a.z;
                X[i].push(x);
                Y[i].push(y);
                Z[i].push(z);
                S[i].push(s);
            }
        }
        return { x: X, y: Y, z: Z, I: S };
    };
    /**
     * return the 2D parameterization corresponding to the given cartesian coordinates
     */
    Surface.prototype.φλ = function (point) {
        return {
            φ: this.φ({ r: Math.hypot(point.x, point.y), z: point.z }),
            λ: Math.atan2(point.x, -point.y)
        };
    };
    /**
     * return the 3D cartesian coordinate vector corresponding to the given parameters
     */
    Surface.prototype.xyz = function (place) {
        var _a = this.rz(place.φ), r = _a.r, z = _a.z;
        return new Vector(r * Math.sin(place.λ), -r * Math.cos(place.λ), z);
    };
    /**
     * return the normalized vector pointing outward at this location. the location may be assumed
     * to be on this Surface.
     * this implementation assumes this.axis = <0, 0, 1>.  make sure you overwrite it for any other axis.
     */
    Surface.prototype.normal = function (place) {
        var tangent = this.tangent(place.φ);
        return new Vector(tangent.z * Math.sin(place.λ), -tangent.z * Math.cos(place.λ), -tangent.r);
    };
    /**
     * return the normalized vector pointing along the meridian at this location. the location may be assumed
     * to be on this Surface.
     * this implementation assumes this.axis = <0, 0, 1>.  make sure you overwrite it for any other axis.
     */
    Surface.prototype.north = function (place) {
        var tangent = this.tangent(place.φ);
        return new Vector(tangent.r * Math.sin(place.λ), -tangent.r * Math.cos(place.λ), tangent.z);
    };
    /**
     * find the place where the given Edge hits the edge of this surface
     */
    Surface.prototype.computeEdgeVertexLocation = function (_tileL, _tileR) {
        throw new Error("this surface doesn't have an edge.");
    };
    return Surface;
}());
export { Surface };
/**
 * a Voronoi polygon, which contains geographical information.
 * equivalent to a Delaunay node.
 */
var Tile = /** @class */ (function () {
    function Tile(index, position, surface) {
        this.surface = surface;
        this.index = index;
        this.φ = position.φ;
        this.λ = position.λ;
        this.pos = surface.xyz(this);
        this.normal = surface.normal(this);
        this.north = surface.north(this);
        this.east = this.north.cross(this.normal);
        this.neighbors = new Map();
        this.parents = [];
        this.between = [];
        this.temperature = 0;
        this.rainfall = 0;
        this.height = 0;
        this.biome = null;
        this.area = null;
        this.government = null;
        this.culture = null;
    }
    /**
     * return the Vertex which appears left of that from the point of view of this.
     */
    Tile.prototype.leftOf = function (that) {
        if (!this.neighbors.has(that))
            throw new Error("the given Tile isn't even adjacent to this Vertex.");
        if (this.neighbors.get(that).tileL === this)
            return this.neighbors.get(that).vertex1;
        else
            return this.neighbors.get(that).vertex0;
    };
    /**
     * return the Vertex which appears right of that from the point of view of this.
     */
    Tile.prototype.rightOf = function (that) {
        if (!this.neighbors.has(that))
            throw new Error("the given Tile isn't even adjacent to this Vertex.");
        if (this.neighbors.get(that).tileL === this)
            return this.neighbors.get(that).vertex0;
        else
            return this.neighbors.get(that).vertex1;
    };
    Tile.prototype.isWater = function () {
        return this.biome === Biome.OCEAN || this.biome === Biome.LAKE || this.biome === Biome.SEA_ICE;
    };
    Tile.prototype.isSaltWater = function () {
        return this.biome === Biome.OCEAN || this.biome === Biome.SEA_ICE;
    };
    Tile.prototype.isIceCovered = function () {
        return this.biome === Biome.LAND_ICE || this.biome === Biome.SEA_ICE;
    };
    Tile.prototype.getArea = function () {
        var e_14, _a;
        if (this.area === null) {
            this.area = 0; // TODO: this underestimates the area of tiles on the edge (but who cares)
            try {
                for (var _b = __values(this.neighbors.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var edge = _c.value;
                    var a = this.pos;
                    var b = edge.vertex0.pos;
                    var c = edge.vertex1.pos;
                    this.area += 1 / 2 * Math.sqrt(b.minus(a).cross(c.minus(b)).sqr());
                }
            }
            catch (e_14_1) { e_14 = { error: e_14_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_14) throw e_14.error; }
            }
        }
        return this.area;
    };
    /**
     * calculate the population density of this Tile.
     */
    Tile.prototype.getPopulationDensity = function () {
        if (this.government === null)
            return 0;
        else
            return POPULATION_DENSITY * this.government.technology * this.arableArea / this.getArea();
    };
    /**
     * return an orderd list that goes around the Tile (widdershins, ofc).  each element
     * of the list is a Voronoi Vertex and the edge that leads from it to the next one.
     * if this Tile is on the edge of the Surface, the last element will have a null edge.
     */
    Tile.prototype.getPolygon = function () {
        var output = [];
        var start;
        if (this.surface.edge.has(this)) // for Tiles on the edge, there is a natural starting point
            start = this.surface.edge.get(this).next;
        else // for internal Tiles start wherever
            start = this.neighbors.keys().next().value;
        // step around the Tile until you find either another edge or get back to where you started
        var tile = start;
        var vertex = this.rightOf(tile);
        do {
            output.push({
                vertex: vertex,
                edge: (tile instanceof Tile) ? this.neighbors.get(tile) : null,
            });
            if (tile instanceof EmptySpace)
                break;
            else {
                vertex = this.leftOf(tile);
                tile = vertex.widershinsOf(tile);
            }
        } while (tile !== start);
        return output;
    };
    return Tile;
}());
export { Tile };
/**
 * a dummy value for where there would normally be a Tile but instead it's the edge of the flat earth
 */
var EmptySpace = /** @class */ (function () {
    function EmptySpace(surface) {
        this.surface = surface;
    }
    return EmptySpace;
}());
export { EmptySpace };
/**
 * a Voronoi vertex, which exists at the intersection of three Tiles.
 * equivalent to a Delaunay triangle.
 */
var Vertex = /** @class */ (function () {
    /**
     * build a new Vertex between three existing Tiles and automaticly construct the adjacent Edges
     * @param a one of the adjacent Tiles
     * @param b the adjacent Tile to the left of a (from the POV of this vertex)
     * @param c the adjacent Tile to the left of b (from the POV of this vertex)
     * @param pos the Cartesian coordinate vector (not needed if we're just using this for its network graph)
     * @param coordinates the geographical coordinates (not needed if we're just using this for its network graph)
     */
    function Vertex(a, b, c, pos, coordinates) {
        if (pos === void 0) { pos = null; }
        if (coordinates === void 0) { coordinates = null; }
        this.pos = pos;
        if (coordinates !== null) {
            this.φ = coordinates.φ;
            this.λ = coordinates.λ;
        }
        this.tiles = [a, b, c]; // adjacent tiles, ordered widdershins
        this.edges = [null, null, null]; // edges a-b, b-c, and c-a
        this.neighbors = new Map(); // connected vertices
        this.surface = a.surface;
        for (var i = 0; i < 3; i++) { // check each non-empty pair to see if they are already connected
            var tileR = this.tiles[i], tileL = this.tiles[(i + 1) % 3];
            if (tileR instanceof Tile && tileL instanceof Tile) {
                if (tileR.neighbors.has(tileL)) { // if so,
                    this.edges[i] = tileR.neighbors.get(tileL); // take that edge
                    if (this.edges[i].tileL === tileL) // and depending on its direction,
                        throw new Error("vertex 0 should already be set to the vertex on the other side."); // replace one of the Vertexes on it with this
                    else
                        this.edges[i].vertex1 = this;
                }
                else { // if not,
                    this.edges[i] = new Edge(tileL, this, tileR, null, this.surface.distance(tileL, tileR)); // create an edge with the new Vertex connected to it
                }
            }
        }
    }
    /**
     * locate the confluence of the three given adjacent Tiles,
     * such that we might put a Vertex there.
     */
    Vertex.computeLocation = function (a, b, c) {
        var e_15, _a, e_16, _b;
        var tileNormal = a.normal.plus(b.normal).plus(c.normal);
        var vertexNormal = b.pos.minus(a.pos).cross(c.pos.minus(a.pos));
        if (tileNormal.dot(vertexNormal) <= 0)
            throw new Error("Vertices must be instantiated facing outward, but this one was not.");
        // project all of the Delaunay vertices into the tangent plane
        var _c = orthogonalBasis(tileNormal, true), u = _c.u, v = _c.v, n = _c.n;
        var projectedVertices = [];
        try {
            for (var _d = __values([a, b, c]), _e = _d.next(); !_e.done; _e = _d.next()) {
                var vertex = _e.value;
                projectedVertices.push({
                    x: u.dot(vertex.pos),
                    y: v.dot(vertex.pos),
                    z: n.dot(vertex.pos)
                });
            }
        }
        catch (e_15_1) { e_15 = { error: e_15_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_15) throw e_15.error; }
        }
        // call the planar circumcenter function
        var _f = circumcenter(projectedVertices), x = _f.x, y = _f.y;
        var z = 0;
        try {
            for (var projectedVertices_1 = __values(projectedVertices), projectedVertices_1_1 = projectedVertices_1.next(); !projectedVertices_1_1.done; projectedVertices_1_1 = projectedVertices_1.next()) {
                var projectedVertex = projectedVertices_1_1.value;
                z += projectedVertex.z / 3;
            }
        }
        catch (e_16_1) { e_16 = { error: e_16_1 }; }
        finally {
            try {
                if (projectedVertices_1_1 && !projectedVertices_1_1.done && (_b = projectedVertices_1.return)) _b.call(projectedVertices_1);
            }
            finally { if (e_16) throw e_16.error; }
        }
        // put the resulting vector back in the global coordinate system
        var pos = u.times(x).plus(v.times(y)).plus(n.times(z));
        var coordinates = a.surface.φλ(pos); // finally, put it back in φ-λ space
        return { pos: pos, coordinates: coordinates };
    };
    /**
     * Find and return the Edge that points from this Vertex directly away from this Tile.
     */
    Vertex.prototype.acrossFrom = function (tile) {
        var e_17, _a;
        try {
            for (var _b = __values(this.neighbors.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var edge = _c.value;
                if (tile !== edge.tileL && tile !== edge.tileR)
                    return edge;
            }
        }
        catch (e_17_1) { e_17 = { error: e_17_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_17) throw e_17.error; }
        }
        throw new Error("Could not find a nonadjacent vertex.");
    };
    /**
     * Find and return the tile widershins of the given tile.
     */
    Vertex.prototype.widershinsOf = function (tile) {
        for (var i = 0; i < 3; i++)
            if (this.tiles[i] === tile)
                return this.tiles[(i + 1) % 3];
        throw new Error("This Vertex isn't even on this Tile.");
    };
    Vertex.prototype.toString = function () {
        return "".concat((this.tiles[0] instanceof Tile) ? this.tiles[0].index : 'void', "--") +
            "".concat((this.tiles[1] instanceof Tile) ? this.tiles[1].index : 'void', "--") +
            "".concat((this.tiles[2] instanceof Tile) ? this.tiles[2].index : 'void');
    };
    return Vertex;
}());
export { Vertex };
/**
 * A line between two connected Vertexes, separating two adjacent Tiles
 */
var Edge = /** @class */ (function () {
    function Edge(tileL, vertex0, tileR, vertex1, distance) {
        this.tileL = tileL; // save these new values for the edge
        this.vertex0 = vertex0;
        this.tileR = tileR;
        this.vertex1 = vertex1;
        this.distance = distance;
        tileL.neighbors.set(tileR, this);
        tileR.neighbors.set(tileL, this);
        // instantiate the path (to be greebled later)
        this.paths = [];
        this.rightBoundCartesian = null;
        this.leftBoundCartesian = null;
        this.bounds = null;
        this.length = null;
        this.i = null;
        this.j = null;
        // make a random number generator with a garanteed-uneke seed
        var index = tileL.index * tileL.surface.tiles.size + tileR.index;
        this.rng = new Random(index);
    }
    /**
     * calculate the path this edge takes from vertex0 to vertex1.  the exact path will be generated
     * randomly to produce a fractylic squiggly line at a certain spacial resolution.  the finer the
     * scale, the more vertices will be generated.  the result will be cashed to ensure consistent
     * and fast execution of later mappings.  in addition, if this edge ever needs to be rendered at
     * an even finer scale, it will bild off of what it has generated here today.
     */
    Edge.prototype.getPath = function (resolution) {
        // you'll crash the browser if the resolution is too fine
        if (resolution < FINEST_RESOLUTION)
            throw new Error("a resolution of ".concat(resolution, " is unacceptable"));
        // make sure the edge's coordinate system and boundary polygon (for the greebling) are set
        if (this.bounds === null)
            this.setCoordinatesAndBounds();
        // instantiate it with the coarsest path possible
        if (this.paths.length === 0) {
            if (this.vertex0 === null || this.vertex1 === null)
                throw new Error("I cannot currently greeble paths that are on the edge of the map.");
            this.paths.push({ resolution: this.getLength(), points: [this.vertex0, this.vertex1] });
            this.finestPathPointsInEdgeCoords = [{ x: 0, y: 0 }, { x: this.getLength(), y: 0 }];
            this.currentResolution = this.getLength();
        }
        // resolve the edge if you haven't already
        while (this.currentResolution > resolution) {
            // this has to be done once at each scale
            this.currentResolution /= 2;
            var newPathPointsInEdgeCoords = noisyProfile(// generate a new squiggly line at the new scale
            this.finestPathPointsInEdgeCoords, this.currentResolution, this.rng, this.bounds, GREEBLE_FACTOR);
            var newPathPointsInGeoCoords = [];
            // put it in the correct coordinate system
            newPathPointsInGeoCoords.push(this.vertex0);
            for (var i = 1; i < newPathPointsInEdgeCoords.length - 1; i++)
                newPathPointsInGeoCoords.push(this.tileL.surface.φλ(this.fromEdgeCoords(newPathPointsInEdgeCoords[i])));
            newPathPointsInGeoCoords.push(this.vertex1);
            // save it to this.paths
            this.paths.push({ resolution: this.currentResolution, points: newPathPointsInGeoCoords });
            this.finestPathPointsInEdgeCoords = newPathPointsInEdgeCoords;
        }
        // select the relevant path from the list and return
        var pathIndex = binarySearch(this.paths, function (item) { return item.resolution <= resolution; });
        if (pathIndex === this.paths.length)
            throw new Error("for some reason there was no suitably greebled path for ".concat(resolution, " even after we ") +
                "greebled the paths to ".concat(this.currentResolution, "."));
        else
            return this.paths[pathIndex].points;
    };
    /** distance between the Vertices this connects */
    Edge.prototype.getLength = function () {
        if (this.length === null)
            this.length = Math.sqrt(this.vertex0.pos.minus(this.vertex1.pos).sqr());
        return this.length;
    };
    /** distance between the centers of the Tiles this separates */
    Edge.prototype.getDistance = function () {
        return this.distance;
    };
    /** the (0, 0) point of this edge's coordinate system */
    Edge.prototype.origin = function () {
        return this.vertex0.pos;
    };
    /**
     * do some setup stuff that only has to be done once, but has to be done after rightBound and leftBound have been set.
     * after this function executes, this.origin, this.i, this.j, and this.bounds will all be established, and you may
     * use toEdgeCoords and fromEdgeCoords.
     */
    Edge.prototype.setCoordinatesAndBounds = function () {
        // compute its coordinate system
        var i = this.vertex1.pos.minus(this.origin()).over(this.getLength());
        var k = this.tileL.normal.plus(this.tileR.normal);
        var j = k.cross(i);
        j = j.over(Math.sqrt(j.sqr())); // make sure |i| == |j| == 1
        this.i = i;
        this.j = j;
        // convert the left and right bounding arcs to edge coordinates
        if (this.rightBoundCartesian === null || this.leftBoundCartesian === null)
            throw new Error("you can't get the greebled path until after the adjacent tiles' strait skeletons are set.");
        var leftBound = this.leftBoundCartesian.map(this.toEdgeCoords, this);
        var rightBound = this.rightBoundCartesian.map(this.toEdgeCoords, this);
        // concatenate them to form a complete bounding polygon
        this.bounds = [{ x: 0., y: 0. }].concat(leftBound, [{ x: this.getLength(), y: 0. }], rightBound);
    };
    /**
     * transform a point from the global 3D coordinates into this edge's 2D coordinates, where
     * x increases [0, this.getLength()] from vertex0 to vertex1, and y points perpendicularly across from right to left
     */
    Edge.prototype.toEdgeCoords = function (point) {
        if (this.i === null)
            throw new Error("the coordinate system hasn't been set yet. don't call this function agen until after you've called setCoordinatesAndBounds().");
        return {
            x: point.minus(this.origin()).dot(this.i) / this.i.sqr(),
            y: point.minus(this.origin()).dot(this.j) / this.j.sqr(),
        };
    };
    /**
     * transform a point from this edge's 2D coordinates to the global 3D coordinates.
     */
    Edge.prototype.fromEdgeCoords = function (point) {
        if (this.i === null)
            throw new Error("the coordinate system hasn't been set yet. don't call this function agen until after you've called setCoordinatesAndBounds().");
        return this.origin().plus(this.i.times(point.x).plus(this.j.times(point.y)));
    };
    Edge.prototype.toString = function () {
        return "".concat(this.tileL.pos, "--").concat(this.tileR.pos);
    };
    return Edge;
}());
export { Edge };
/**
 * create some ordered loops of points that describe the boundary of these Tiles.
 * @param tiles Set of Tiles that are part of this group.
 * @return Array of loops, each loop being an Array of Vertexes or plain coordinate pairs.
 *         the first and last elements of each loop are the same iff the outline is a closed loop.
 */
export function outline(tiles) {
    var e_18, _a, e_19, _b;
    var accountedFor = new Set(); // keep track of which Edges have been done
    var output = [];
    try {
        for (var tiles_1 = __values(tiles), tiles_1_1 = tiles_1.next(); !tiles_1_1.done; tiles_1_1 = tiles_1.next()) { // look at every included tile
            var inTile = tiles_1_1.value;
            try {
                for (var _c = (e_19 = void 0, __values(inTile.neighbors.keys())), _d = _c.next(); !_d.done; _d = _c.next()) { // and every tile adjacent to an included one
                    var outTile = _d.value;
                    if (tiles.has(outTile))
                        continue; // (we only care if that adjacent tile is excluded)
                    var startingEdge = inTile.neighbors.get(outTile); // the edge between them defines the start of the loop
                    if (accountedFor.has(startingEdge))
                        continue; // (and can ignore edges we've already hit)
                    var currentLoop = []; // if we've found a new edge, start going around it
                    var currentSection = [inTile.rightOf(outTile)]; // keep track of each continuus section of this loop
                    do {
                        var edge = inTile.neighbors.get(outTile); // pick out the edge between them
                        accountedFor.add(edge); // check this edge off
                        var vertex = inTile.leftOf(outTile); // look for the next Vertex, going widdershins
                        // add the next Vertex to the complete Path
                        currentSection.push(vertex);
                        // now, advance to the next Tile(s)
                        var nextTile = vertex.widershinsOf(outTile);
                        if (nextTile instanceof EmptySpace) {
                            // if there isn't one after this Vertex, break off this section
                            currentLoop.push(currentSection);
                            // shimmy outTile around the internal portion of the edge
                            outTile = inTile;
                            var i = 0;
                            do {
                                outTile = outTile.surface.edge.get(outTile).next;
                                i++;
                            } while (tiles.has(outTile)); // until it becomes external again
                            inTile = outTile.surface.edge.get(outTile).prev; // then, grab the new inTile
                            // start a new section in the same loop on this side of the gap
                            currentSection = [inTile.rightOf(outTile)];
                        }
                        else if (tiles.has(nextTile)) // if there is and it's in, make it the new inTile
                            inTile = nextTile;
                        else // if there is and it's out, make it the new outTile
                            outTile = nextTile;
                        if (output.length >= 100000)
                            throw new Error("something went wrong why does this polygon have ".concat(output.length, " vertices?"));
                    } while (inTile.neighbors.get(outTile) !== startingEdge); // continue until you go all the outTile around this loop
                    // concatenate the first and last sections
                    if (currentLoop.length > 0) {
                        currentLoop[0] = currentSection.concat(currentLoop[0].slice(1));
                        output.push.apply(output, __spreadArray([], __read(currentLoop), false)); // and save all sections to the output
                    }
                    else {
                        output.push(currentSection);
                    }
                }
            }
            catch (e_19_1) { e_19 = { error: e_19_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                }
                finally { if (e_19) throw e_19.error; }
            }
        }
    }
    catch (e_18_1) { e_18 = { error: e_18_1 }; }
    finally {
        try {
            if (tiles_1_1 && !tiles_1_1.done && (_a = tiles_1.return)) _a.call(tiles_1);
        }
        finally { if (e_18) throw e_18.error; }
    }
    return output;
}
//# sourceMappingURL=surface.js.map