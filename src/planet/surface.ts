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
import {linterp, noisyProfile} from "../util/util.js";
import {Culture} from "../society/culture.js";
import {Biome} from "../society/terrain.js";
import {Place} from "../util/coordinates.js";
import {circumcenter, orthogonalBasis, Vector} from "../util/geometry.js";


const INTEGRATION_RESOLUTION = 32;
const FINEST_SCALE = 10; // the smallest edge lengths that it will generate


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
			this.xyz({ф: 1, λ: Math.PI}).minus(this.xyz({ф: 1, λ: Math.PI/2}))).norm(); // figure out which way the coordinate system points
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
	 * return an orderd list that goes around the edge (widdershins, ofc).  each element
	 * of the list is a Voronoi Vertex and the edge that leads from it to the next one.
	 */
	getPolygon(): { vertex: Vector, edge: Edge }[] {
		const output = [];
		let start;
		if (this.surface.edge.has(this))
			start = this.surface.edge.get(this).prev;
		else
			start = this.neighbors.keys().next().value;

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
			const tileL = this.tiles[i], tileR = this.tiles[(i+1)%3];
			if (tileL.neighbors.has(tileR)) { // if so,
				this.edges[i] = tileL.neighbors.get(tileR); // take that edge
				if (this.edges[i].tileL === tileL) // and depending on its direction,
					this.edges[i].vertex1 = this; // replace one of the Vertexes on it with this
				else
					this.edges[i].vertex0 = this;
			}
			else { // if not,
				this.edges[i] = new Edge(
					tileL, null, tileR, this, this.surface.distance(tileL, tileR)); // create an edge with the new Vertex connected to it
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
	 * Find and return the vertex across from the given edge.
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
	public length: number;
	public flow: number;
	public path: Place[];
	public rightBorder: Vector[]; // these borders are the limits of the greebling
	public leftBorder: Vector[];
	private readonly rng: Random; // this Random number generator is used exclusively for greebling

	constructor(tileL: Tile, vertex0: Vertex, tileR: Tile, vertex1: Vertex, length: number) {
		this.tileL = tileL; // save these new values for the edge
		this.vertex0 = vertex0;
		this.tileR = tileR;
		this.vertex1 = vertex1;
		this.length = length;
		this.path = null;

		tileL.neighbors.set(tileR, this);
		tileR.neighbors.set(tileL, this);

		this.rightBorder = null;
		this.leftBorder = null;

		// make a random number generator with a garanteed-uneke seed
		const index = tileL.index*tileL.surface.tiles.size + tileR.index;
		this.rng = new Random(index);
	}

	/**
	 * transform these points onto the surface so that s maps to the direction along the
	 * voronoi edge but negative, and t maps to the perpendicular direction.  specifically (0,0)
	 * corresponds to vertex1, (0, 1) corresponds to vertex0, and (1, 1/2) corresponds
	 * to vertexR.
	 */
	greeblePath(): void {
		// define the inicial coordinate vectors
		const origin = this.vertex1.pos; // compute its coordinate system
		const i = this.vertex0.pos.minus(origin);
		const k = this.tileL.normal.plus(this.tileR.normal);
		let j = k.cross(i);
		j = j.times(Math.sqrt(i.sqr()/j.sqr())); // make sure |i| == |j|

		// transform the border into the plane
		const bounds = [];
		for (const vector of this.rightBorder.concat(this.leftBorder))
			bounds.push({
				x: vector.minus(origin).dot(i)/i.sqr(),
				y: vector.minus(origin).dot(j)/j.sqr(),
			});

		// generate the random curve
		const points = noisyProfile(
			FINEST_SCALE/Math.sqrt(i.sqr()),
			this.rng, bounds, .35);

		// then transform the result out of the plane
		this.path = [];
		for (const {x, y} of points) {
			const transformed = origin.plus(i.times(x).plus(j.times(y)));
			this.path.push(this.tileL.surface.фλ(transformed));
		}
		// finally, adjust the endpoints to prevent roundoff issues
		this.path[0] = this.vertex1;
		this.path[this.path.length - 1] = this.vertex0;
	}

	toString(): string {
		return `${this.tileL.pos}--${this.tileR.pos}`;
	}
}
