/**
 * MIT License
 *
 * Copyright (c) 2021 Justin Kunimune
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import {Random} from "../util/random.js";
import {binarySearch, linterp, noisyProfile} from "../util/util.js";
import {Culture} from "../society/culture.js";
import {Biome} from "../society/terrain.js";
import {Place, Point} from "../util/coordinates.js";
import {checkVoronoiPolygon, circumcenter, orthogonalBasis, Vector} from "../util/geometry.js";
import {straightSkeleton} from "../util/straightskeleton.js";


const GREEBLE_FACTOR = .35;
const INTEGRATION_RESOLUTION = 32;


/**
 * Generic 3D collection of Voronoi polygons
 */
export abstract class Surface {
	public tiles: Set<Tile>;
	public vertices: Set<Vertex>;
	public rivers: Set<(Tile | Vertex)[]>;
	public area: number;
	public height: number;
	public axis: Vector; // orientation of geodetic coordinate system
	public edge: Map<Tile, {prev: Tile, next: Tile}>;
	readonly фMin: number;
	readonly фMax: number;
	refLatitudes: number[];
	cumulAreas: number[];
	cumulDistances: number[];


	protected constructor(фMin: number, фMax: number) {
		this.tiles = null;
		this.фMin = фMin;
		this.фMax = фMax;
		this.axis = null;
		this.edge = new Map();
	}

	/**
	 * do the general constructor stuff that has to be done after the subclass constructor
	 */
	initialize(): void {
		this.refLatitudes = []; // fill in latitude-integrated values
		this.cumulAreas = []; // for use in map projections
		this.cumulDistances = [];
		let ф = this.фMin, A = 0, s = 0;
		const dф = (this.фMax - this.фMin)/INTEGRATION_RESOLUTION;
		for (let i = 0; i <= INTEGRATION_RESOLUTION; i ++) {
			this.refLatitudes.push(ф);
			this.cumulAreas.push(A);
			this.cumulDistances.push(s);
			const dsdф = this.dsdф(ф + dф/2); // a simple middle Riemann sum will do
			const dAds = this.dAds(ф + dф/2);
			ф += dф;
			A += dAds*dsdф*dф;
			s += dsdф*dф;
		}
		this.area = this.cumulAreas[INTEGRATION_RESOLUTION];
		this.height = this.cumulDistances[INTEGRATION_RESOLUTION];

		this.axis = this.xyz({ф: 1, λ: Math.PI/2}).minus(this.xyz({ф: 1, λ: 0})).cross(
			this.xyz({ф: 1, λ: Math.PI}).minus(this.xyz({ф: 1, λ: Math.PI/2}))).normalized(); // figure out which way the coordinate system points
	}

	/**
	 * set the positions of all the vertices and the edge map in a way that is
	 * consistent with the current values of this.tiles and this.vertices
	 */
	computeGraph(): void {
		// finally, complete the remaining vertices' network graphs
		for (const vertex of this.vertices) {
			for (let i = 0; i < 3; i ++) {
				const edge = vertex.edges[i];
				if (vertex === edge.vertex1)
					vertex.neighbors.set(edge.vertex0, edge);
				else
					vertex.neighbors.set(edge.vertex1, edge);
			}
			vertex.computePosition();
		}

		// and find the edge, if there is one
		for (const tile of this.tiles)
			for (const neibor of tile.neighbors.keys())
				if (tile.rightOf(neibor) === null)
					this.edge.set(tile, {next: neibor, prev: null});
		for (const tile of this.edge.keys()) // and make it back-searchable
			this.edge.get(this.edge.get(tile).next).prev = tile;


		// now we can save each tile's strait skeleton to the edges (to bound the greebling)
		for (const tile of this.tiles) {
			const vertices: Point[] = [];
			for (const {vertex} of tile.getPolygon()) {
				vertices.push({
					x: vertex.minus(tile.pos).dot(tile.east), // project the voronoi polygon into 2D
					y: vertex.minus(tile.pos).dot(tile.north),
				});
			}
			checkVoronoiPolygon(vertices); // validate it
			let skeletonLeaf = straightSkeleton(vertices); // get the strait skeleton
			for (const {edge} of tile.getPolygon()) {
				const arc = skeletonLeaf.pathToNextLeaf();
				const projectedArc: Vector[] = [];
				for (const joint of arc.slice(1, arc.length - 1)) {
					const {x, y} = joint.value;
					projectedArc.push( // drop the endpoints and project it back
						tile.pos.plus(
							tile.east.times(x).plus(
								tile.north.times(y))));
				}
				if (edge !== null) {
					if (edge.tileL === tile) // then save each part of the skeleton it to an edge
						edge.leftBoundCartesian = projectedArc;
					else
						edge.rightBoundCartesian = projectedArc;
				}
				skeletonLeaf = arc[arc.length - 1]; // move onto the next one
			}
		}
	}

	/**
	 * return the coordinates of a point uniformly sampled from the Surface using the
	 * given random number generator.
	 */
	drawRandomPoint(rng: Random): Place {
		const λ = rng.uniform(-Math.PI, Math.PI);
		const A = rng.uniform(0, this.cumulAreas[this.cumulAreas.length-1]);
		const ф = linterp(A, this.cumulAreas, this.refLatitudes);
		return {ф: ф, λ: λ};
	}

	/**
	 * return 2d arrays of x, y, z, and insolation.
	 */
	parameterize(resolution: number): {x: number[][], y: number[][], z: number[][], I: number[][]} {
		const n = 2*resolution, m = 4*resolution;
		const X = [], Y = [], Z = [], S = [];
		for (let i = 0; i <= n; i ++) {
			const ф = i/n*(this.фMax - this.фMin) + this.фMin; // map i to the valid range for ф
			const s = this.insolation(ф);
			X.push([]);
			Y.push([]);
			Z.push([]);
			S.push([]);
			for (let j = 0; j <= m; j ++) {
				const λ = j/m*2*Math.PI; // I think λ always represents some [0, 2*pi) angle
				const {x, y, z} = this.xyz({ф: ф, λ: λ});
				X[i].push(x);
				Y[i].push(y);
				Z[i].push(z);
				S[i].push(s);
			}
		}
		return {x: X, y: Y, z: Z, I: S};
	}

	d2Ads2(ф: number): number {
		let фL = ф - 1e-2, фR = ф + 1e-2;
		if (фL < this.фMin) фL = this.фMin;
		if (фR > this.фMax) фR = this.фMax;
		return (this.dAds(фR) - this.dAds(фL))/
			(this.dsdф(ф) * (фR - фL));
	}

	/**
	 * return a list of Delaunay nodes along with an associated list of triangles that
	 * completely cover this Surface. The mesh must never diverge from the surface farther
	 * than the radius of curvature.
	 */
	abstract partition(): {nodos: Tile[], triangles: Vertex[]};

	/**
	 * return the local length-to-latitude rate [km]
	 */
	abstract dsdф(ф: number): number;

	/**
	 * return the local effective width [km]
	 */
	abstract dAds(ф: number): number;

	/**
	 * return the amount of solar radiation at a latitude, normalized to average to 1.
	 */
	abstract insolation(ф: number): number;

	/**
	 * return the amount of moisture accumulation at a latitude, normalized to peak at 1.
	 */
	abstract windConvergence(ф: number): number;

	/**
	 * for the purposes of the orographic effect, return a dimensionless tangent velocity.
	 */
	abstract windVelocity(ф: number): {north: number, east: number};

	/**
	 * return the 3D cartesian coordinate vector corresponding to the given parameters
	 */
	abstract xyz(place: Place): Vector;

	/**
	 * return the 2D parameterization corresponding to the given parameters
	 */
	abstract фλ(point: {x: number, y: number, z: number}): Place;

	/**
	 * return the normalized vector pointing outward at this location. the location may be assumed
	 * to be on this Surface.
	 */
	abstract normal(tile: Tile): Vector;

	/**
	 * orthodromic distance from A to B on the surface (it's okay if it's just
	 * an approximation).
	 */
	abstract distance(a: Place, b: Place): number;
}


/**
 * a Voronoi polygon, which contains geographical information.
 * equivalent to a Delaunay node.
 */
export class Tile {
	public readonly surface: Surface;
	public readonly index: number;
	public readonly ф: number;
	public readonly λ: number;
	public readonly pos: Vector;
	public readonly normal: Vector;
	public readonly east: Vector;
	public readonly north: Vector;
	public readonly neighbors: Map<Tile, Edge>;
	public readonly between: Tile[][];
	public parents: Tile[];

	public height: number;
	public temperature: number;
	public rainfall: number;
	public biome: Biome;
	public arability: number;
	public arableArea: number;
	public passability: number;
	public culture: Culture;
	public plateIndex: number;
	public windVelocity: Vector;
	public downwind: Tile[];
	public flow: number;
	public flag: boolean;
	private area: number;

	constructor(index: number, position: Place, surface: Surface) {
		this.surface = surface;
		this.index = index;
		this.ф = position.ф;
		this.λ = position.λ;
		this.pos = surface.xyz(this);
		const basis = orthogonalBasis(surface.normal(this), true, surface.axis, this.pos.times(-1));
		this.normal = basis.n;
		this.north = basis.v;
		this.east = basis.u;

		this.neighbors = new Map();
		this.parents = [];
		this.between = [];

		this.temperature = 0;
		this.rainfall = 0;
		this.height = 0;
		this.biome = null;
		this.area = null;
	}

	/**
	 * return the Vertex which appears left of that from the point of view of this.
	 */
	leftOf(that: Tile): Vertex {
		if (this.neighbors.get(that).tileL === this)
			return this.neighbors.get(that).vertex1;
		else
			return this.neighbors.get(that).vertex0;
	}

	/**
	 * return the Vertex which appears right of that from the point of view of this.
	 */
	rightOf(that: Tile): Vertex {
		if (this.neighbors.get(that).tileL === this)
			return this.neighbors.get(that).vertex0;
		else
			return this.neighbors.get(that).vertex1;
	}

	isWater(): boolean {
		return this.biome === Biome.OCEAN || this.biome === Biome.LAKE;
	}

	getArea(): number {
		if (this.area === null) {
			let radius = 0;
			for (const neibor of this.neighbors.keys())
				radius += this.surface.distance(this, neibor)/2/this.neighbors.size;
			this.area = Math.PI*radius*radius;
		}
		return this.area;
	}

	/**
	 * return an orderd list that goes around the Tile (widdershins, ofc).  each element
	 * of the list is a Voronoi Vertex and the edge that leads from it to the next one.
	 */
	getPolygon(): { vertex: Vector, edge: Edge }[] {
		const output = [];
		let start;
		if (this.surface.edge.has(this)) // for Tiles on the edge, there is a natural starting point
			start = this.surface.edge.get(this).next;
		else // for internal Tiles start wherever
			start = this.neighbors.keys().next().value;

		// step around the Tile until you find either another edge or get back to where you started
		let tile = start;
		do {
			const vertex = this.leftOf(tile);
			if (vertex === null)
				break;
			tile = vertex.widershinsOf(tile);

			output.push({
				vertex: vertex.pos,
				edge: this.neighbors.get(tile)
			});
		} while (tile !== start);

		// if the Tile is on the edge, we need to manually complete the polygon
		if (this.surface.edge.has(this)) {
			// this tecneke is kind of janky but it works as long as Disc is the only Surface with an edge
			output.push({
				vertex: output[output.length - 1].vertex.times(4),
				edge: null,
			});
			output.push({
				vertex: output[0].vertex.times(4),
				edge: null,
			});
		}

		return output;
	}
}


/**
 * a Voronoi vertex, which exists at the intersection of three Tiles.
 * equivalent to a Delaunay triangle.
 */
export class Vertex {
	public ф: number;
	public λ: number;
	public tiles: Tile[];
	public edges: Edge[];
	public neighbors: Map<Vertex, Edge>;
	public surface: Surface;
	public pos: Vector; // location in 3D Cartesian

	public height: number;
	public flow: number;
	public downstream: Vertex | Tile;

	constructor(a: Tile, b: Tile, c: Tile) {
		const tileNormal = a.normal.plus(b.normal).plus(c.normal);
		const vertexNormal = b.pos.minus(a.pos).cross(c.pos.minus(a.pos));
		if (tileNormal.dot(vertexNormal) <= 0)
			throw "Vertices must be instantiated facing outward, but this one was not.";
		this.tiles = [a, b, c]; // adjacent tiles, ordered widdershins
		this.edges = [null, null, null]; // edges a-b, b-c, and c-a
		this.neighbors = new Map(); // connected vertices
		this.surface = a.surface;

		for (let i = 0; i < 3; i ++) { // check each pair to see if they are already connected
			const tileR = this.tiles[i], tileL = this.tiles[(i+1)%3];
			if (tileR.neighbors.has(tileL)) { // if so,
				this.edges[i] = tileR.neighbors.get(tileL); // take that edge
				if (this.edges[i].tileL === tileL) // and depending on its direction,
					this.edges[i].vertex0 = this; // replace one of the Vertexes on it with this
				else
					this.edges[i].vertex1 = this;
			}
			else { // if not,
				this.edges[i] = new Edge(
					tileL, this, tileR, null, this.surface.distance(tileL, tileR)); // create an edge with the new Vertex connected to it
			}
		}
	}

	/**
	 * compute the ф-λ parameterization of this Vertex in the plane normal to the sum
	 * of the adjacent tiles' normal vectors.  this works out to finding the circumcenter
	 * of the Delaunay triangle.
	 */
	computePosition(): void {
		let nAvg = new Vector(0, 0, 0);
		for (const tile of this.tiles)
			nAvg = nAvg.plus(tile.normal);
		const {u, v, n} = orthogonalBasis(nAvg, true);
		const projectedVertices: {x: number, y: number, z: number}[] = [];
		// project all of the Delaunay vertices into the tangent plane
		for (const vertex of this.tiles)
			projectedVertices.push({
				x: u.dot(vertex.pos),
				y: v.dot(vertex.pos),
				z: n.dot(vertex.pos)});

		const {x, y} = circumcenter(projectedVertices);
		let z = 0;
		for (const projectedVertex of projectedVertices)
			z += projectedVertex.z/3;
		// put the resulting vector back in the global coordinate system
		this.pos = u.times(x).plus(v.times(y)).plus(n.times(z));
		const {ф, λ} = this.surface.фλ(this.pos); // finally, put it back in ф-λ space
		this.ф = ф;
		this.λ = λ;
	}

	/**
	 * Find and return the Tile across this Vertex from the given Edge.
	 */
	acrossFrom(edge: Edge): Tile {
		for (const tile of this.tiles)
			if (tile !== edge.tileL && tile !== edge.tileR)
				return tile;
		throw "Could not find a nonadjacent vertex.";
	}

	/**
	 * Find and return the tile widershins of the given edge.
	 */
	widershinsOf(tile: Tile): Tile {
		for (let i = 0; i < 3; i ++)
			if (this.tiles[i] === tile)
				return this.tiles[(i+1)%3];
		throw "This Vertex isn't even on this Tile.";
	}

	toString(): string {
		return `${this.tiles[0].pos}--${this.tiles[1].pos}--${this.tiles[2].pos}`;
	}
}


/**
 * A line between two connected Vertexes, separating two adjacent Tiles
 */
export class Edge {
	public tileL: Tile;
	public tileR: Tile;
	public vertex1: Vertex;
	public vertex0: Vertex;
	public distance: number; // distance between the centers of the Tiles this separates
	public length: number; // distance between the Vertices this connects
	public flow: number;
	public rightBoundCartesian: Vector[]; // these borders are the limits of the greebling
	public leftBoundCartesian: Vector[];

	public bounds: Point[];
	private readonly rng: Random; // this Random number generator is used exclusively for greebling
	private currentResolution: number; // this number keeps of track of how much greebling we have resolved so far
	private readonly paths: {resolution: number, points: Place[]}[]; // this path can be resolved at a variety of scales
	private finestPathPointsInEdgeCoords: Point[];

	private origin: Vector; // the (0, 0) point of this edge's coordinate system
	private i: Vector; // the s unit-vector of this edge's coordinate system
	private j: Vector; // the t unit-vector of this edge's coordinate system

	constructor(tileL: Tile, vertex0: Vertex, tileR: Tile, vertex1: Vertex, distance: number) {
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
		this.origin = null;
		this.i = null;
		this.j = null;

		// make a random number generator with a garanteed-uneke seed
		const index = tileL.index*tileL.surface.tiles.size + tileR.index;
		this.rng = new Random(index);
	}

	/**
	 * calculate the path this edge takes from vertex0 to vertex1.  the exact path will be generated
	 * randomly to produce a fractylic squiggly line at a certain spacial resolution.  the finer the
	 * scale, the more vertices will be generated.  the result will be cashed to ensure consistent
	 * and fast execution of later mappings.  in addition, if this edge ever needs to be rendered at
	 * an even finer scale, it will bild off of what it has generated here today.
	 */
	getPath(resolution: number): Place[] {
		// make sure the edge's coordinate system and boundary polygon (for the greebling) are set
		if (this.bounds === null)
			this.setCoordinatesAndBounds();

		// instantiate it with the coarsest path possible
		if (this.paths.length === 0) {
			if (this.vertex0 === null || this.vertex1 === null)
				throw `I cannot currently greeble paths that are on the edge of the map.`;
			this.paths.push({resolution: this.length, points: [this.vertex0, this.vertex1]});
			this.finestPathPointsInEdgeCoords = [{x: 0, y: 0}, {x: this.length, y: 0}];
			this.currentResolution = this.length;
		}

		// resolve the edge if you haven't already
		while (this.currentResolution > resolution) {
			// this has to be done once at each scale
			this.currentResolution /= 2;
			const newPathPointsInEdgeCoords = noisyProfile( // generate a new squiggly line at the new scale
				this.finestPathPointsInEdgeCoords,
				this.currentResolution, this.rng, this.bounds, GREEBLE_FACTOR);
			const newPathPointsInGeoCoords = [];
			// put it in the correct coordinate system
			newPathPointsInGeoCoords.push(this.vertex0);
			for (let i = 1; i < newPathPointsInEdgeCoords.length - 1; i ++)
				newPathPointsInGeoCoords.push(this.tileL.surface.фλ(this.fromEdgeCoords(newPathPointsInEdgeCoords[i])));
			newPathPointsInGeoCoords.push(this.vertex1);
			// save it to this.paths
			this.paths.push({resolution: this.currentResolution, points: newPathPointsInGeoCoords});
			this.finestPathPointsInEdgeCoords = newPathPointsInEdgeCoords;
		}

		// select the relevant path from the list and return
		const pathIndex = binarySearch(
			this.paths, (item) => item.resolution <= resolution);
		if (pathIndex === this.paths.length)
			throw "for some reason there was no suitably greebled path even after we greebled the paths.";
		else
			return this.paths[pathIndex].points;
	}

	/**
	 * do some setup stuff that only has to be done once, but has to be done after rightBound and leftBound have been set.
	 * after this function executes, this.origin, this.i, this.j, and this.bounds will all be established, and you may
	 * use toEdgeCoords and fromEdgeCoords.
	 */
	setCoordinatesAndBounds(): void {
		// compute its length
		this.length = Math.sqrt(this.vertex0.pos.minus(this.vertex1.pos).sqr());
		// compute its coordinate system
		this.origin = this.vertex0.pos;
		const i = this.vertex1.pos.minus(this.origin).over(this.length);
		const k = this.tileL.normal.plus(this.tileR.normal);
		let j = k.cross(i);
		j = j.over(Math.sqrt(j.sqr())); // make sure |i| == |j| == 1
		this.i = i;
		this.j = j;

		// convert the left and right bounding arcs to edge coordinates
		if (this.rightBoundCartesian === null || this.leftBoundCartesian === null)
			throw "you can't get the greebled path until after the adjacent tiles' strait skeletons are set.";
		const leftBound = this.leftBoundCartesian.map(this.toEdgeCoords, this);
		const rightBound = this.rightBoundCartesian.map(this.toEdgeCoords, this);
		// concatenate them to form a complete bounding polygon
		this.bounds = [{x: 0., y: 0.}].concat(leftBound, [{x: this.length, y: 0.}], rightBound);
	}

	/**
	 * transform a point from the global 3D coordinates into this edge's 2D coordinates, where
	 * x increases [0, this.length] from vertex0 to vertex1, and y points perpendicularly across from right to left
	 */
	toEdgeCoords(point: Vector): Point {
		if (this.origin === null)
			throw `the coordinate system hasn't been set yet. don't call this function agen until after you've called setCoordinatesAndBounds().`;
		return {
			x: point.minus(this.origin).dot(this.i) / this.i.sqr(),
			y: point.minus(this.origin).dot(this.j) / this.j.sqr(),
		};
	}

	/**
	 * transform a point from this edge's 2D coordinates to the global 3D coordinates.
	 */
	fromEdgeCoords(point: Point): Vector {
		if (this.origin === null)
			throw `the coordinate system hasn't been set yet. don't call this function agen until after you've called setCoordinatesAndBounds().`;
		return this.origin.plus(this.i.times(point.x).plus(this.j.times(point.y)));
	}

	toString(): string {
		return `${this.tileL.pos}--${this.tileR.pos}`;
	}
}
