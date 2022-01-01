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
import {linterp, Vector, orthogonalBasis, circumcenter} from "../util/util.js";
import {delaunayTriangulate} from "../util/delaunay.js";
import {Kultur} from "../society/culture";


const INTEGRATION_RESOLUTION = 32;
const TILE_AREA = 30000; // target area of a tile in km^2


/**
 * Generic 3D collection of nodes and edges
 */
export abstract class Surface {
	public nodos: Set<Nodo>;
	public triangles: Set<Triangle>;
	public rivers: Set<(Nodo | Triangle)[]>;
	public area: number;
	public height: number;
	public axis: Vector; // orientation of geodetic coordinate system
	public edge: Map<Nodo, {prev: Nodo, next: Nodo}>;
	readonly фMin: number;
	readonly фMax: number;
	refLatitudes: number[];
	cumulAreas: number[];
	cumulDistances: number[];


	protected constructor(фMin: number, фMax: number) {
		this.nodos = new Set();
		this.фMin = фMin;
		this.фMax = фMax;
		this.axis = null;
		this.edge = new Map();
	}

	/**
	 * do the general constructor stuff that has to be done after the subclass constructor
	 */
	initialize() {
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

		this.axis = this.xyz(1, Math.PI/2).minus(this.xyz(1, 0)).cross(
			this.xyz(1, Math.PI).minus(this.xyz(1, Math.PI/2))).norm(); // figure out which way the coordinate system points
	}

	/**
	 * fill this.nodes with random nodes.
	 */
	populate(rng: Random) {
		const nodos: Nodo[] = []; // remember to clear the old nodes, if necessary
		for (let i = 0; i < Math.max(100, this.area/TILE_AREA); i ++)
			nodos.push(new Nodo(i, this.randomPoint(rng), this)); // push a bunch of new ones
		this.nodos = new Set(nodos); // keep that list, but save it as a set as well

		const partition = this.partition();
		const triangulation = delaunayTriangulate( // call the delaunay triangulation subroutine
			nodos.map((n: Nodo) => n.pos),
			nodos.map((n: Nodo) => n.normal),
			partition.nodos.map((n: Nodo) => n.pos),
			partition.nodos.map((n: Nodo) => n.normal),
			partition.triangles.map((t: Triangle) => t.vertices.map((n: Nodo) => partition.nodos.indexOf(n)))
		);
		this.triangles = new Set(); // unpack the resulting triangles
		for (const [ia, ib, ic] of triangulation.triangles) {
			this.triangles.add(new Triangle(nodos[ia], nodos[ib], nodos[ic]));
		}
		for (let i = 0; i < nodos.length; i ++) {
			for (const j of triangulation.parentage[i]) // as well as the parentage
				nodos[i].parents.push(nodos[j]);
			for (const [j, k] of triangulation.between[i]) // and separation information
				nodos[i].between.push([nodos[j], nodos[k]]);
		}

		for (let i = 1; i < nodos.length; i ++) { // after all that's through, some nodes won't have any parents
			if (nodos[i].parents.length === 0) { // if that's so,
				const orphan = nodos[i];
				let closest = null; // the easiest thing to do is to just assign it the closest node that came before it using the list
				let minDistance = Number.POSITIVE_INFINITY;
				for (let j = 0; j < orphan.index; j ++) {
					const distance = this.distance(nodos[j], orphan);
					if (distance < minDistance) {
						minDistance = distance;
						closest = nodos[j];
					}
				}
				orphan.parents = [closest];
			}
		}

		for (const triangle of this.triangles) { // finally, complete the remaining triangles' network graphs
			for (let i = 0; i < 3; i ++) {
				const edge = triangle.edges[i];
				if (triangle === edge.triangleL)
					triangle.neighbors.set(edge.triangleR, edge);
				else
					triangle.neighbors.set(edge.triangleL, edge);
			}
			triangle.computeCircumcenter();
		}

		for (const nodo of this.nodos) // and find the edge, if there is one
			for (const neibor of nodo.neighbors.keys())
				if (nodo.rightOf(neibor) === null)
					this.edge.set(nodo, {next: neibor, prev: null});
		for (const nodo of this.edge.keys()) // and make it back-searchable
			this.edge.get(this.edge.get(nodo).next).prev = nodo;
	}

	/**
	 * return the coordinates of a point uniformly sampled from the Surface using the
	 * given random number generator.
	 */
	randomPoint(rng: Random): Place {
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
				const {x, y, z} = this.xyz(ф, λ);
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
	 * return a list of nodes along with an associated list of triangles that
	 * completely cover this Surface. The mesh must never diverge from the surface farther
	 * than the radius of curvature.
	 */
	abstract partition(): {nodos: Nodo[], triangles: Triangle[]};

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
	abstract windVelocity(ф: number): {nord: number, dong: number};

	/**
	 * return the 3D cartesian coordinate vector corresponding to the given parameters
	 */
	abstract xyz(ф: number, λ: number): Vector;

	/**
	 * return the 2D parameterization corresponding to the given parameters
	 */
	abstract фλ(x: number, y: number, z: number): Place;

	/**
	 * return the normalized vector pointing outward at this node. the node may be assumed
	 * to be on this Surface.
	 */
	abstract normal(node: Place): Vector;

	/**
	 * orthodromic distance from A to B on the surface (it's okay if it's just
	 * an approximation).
	 */
	abstract distance(a: Place, b: Place): number;
}


/**
 * A single Voronoi polygon, which contains geographical information
 */
export class Nodo {
	public readonly surface: Surface;
	public readonly index: number;
	public readonly ф: number;
	public readonly λ: number;
	public readonly pos: Vector;
	public readonly normal: Vector;
	public readonly dong: Vector;
	public readonly nord: Vector;
	public readonly neighbors: Map<Nodo, Edge>;
	public readonly between: Nodo[][];
	public parents: Nodo[];

	public gawe: number;
	public terme: number;
	public barxe: number;
	public biome: string;
	public domublia: number;
	public pasablia: number;
	public kultur: Kultur;
	public plate: number;
	public windVelocity: Vector;
	public downwind: Nodo[];
	public liwe: number;
	public flag: boolean;
	private area: number;

	constructor(index: number, position: Place, surface: Surface) {
		this.surface = surface;
		this.index = index;
		this.ф = position.ф;
		this.λ = position.λ;
		this.pos = surface.xyz(this.ф, this.λ);
		const basis = orthogonalBasis(surface.normal(this), true, surface.axis, this.pos.times(-1));
		this.normal = basis.n;
		this.nord = basis.v;
		this.dong = basis.u;

		this.neighbors = new Map();
		this.parents = [];
		this.between = [];

		this.terme = 0;
		this.barxe = 0;
		this.gawe = 0;
		this.biome = null;
		this.area = null;
	}

	/**
	 * return the triangle which appears left of that from the point of view of this.
	 */
	leftOf(that: Nodo): Triangle {
		if (this.neighbors.get(that).node0 === this)
			return this.neighbors.get(that).triangleL;
		else
			return this.neighbors.get(that).triangleR;
	}

	/**
	 * return the triangle which appears right of that from the point of view of this.
	 */
	rightOf(that: Nodo): Triangle {
		if (this.neighbors.get(that).node0 === this)
			return this.neighbors.get(that).triangleR;
		else
			return this.neighbors.get(that).triangleL;
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
}


/**
 * A voronoi vertex, which exists at the confluence of three Nodos
 */
export class Triangle {
	public ф: number;
	public λ: number;
	public vertices: Nodo[];
	public edges: Edge[];
	public neighbors: Map<Triangle, Edge>;
	public surface: Surface;
	public circumcenter: Place;

	public gawe: number
	public liwe: number;
	public liwonice: Triangle | Nodo;

	constructor(a: Nodo, b: Nodo, c: Nodo) {
		const nodeDix = a.normal.plus(b.normal).plus(c.normal);
		const faceDix = b.pos.minus(a.pos).cross(c.pos.minus(a.pos));
		if (nodeDix.dot(faceDix) <= 0)
			throw "triangles must be instantiated facing outward, but this one was not."
		this.vertices = [a, b, c]; // nodes, ordered widdershins
		this.edges = [null, null, null]; // edges a-b, b-c, and c-a
		this.neighbors = new Map(); // adjacent triangles
		this.surface = a.surface;

		for (let i = 0; i < 3; i ++) { // check each pair to see if they are already connected
			const node0 = this.vertices[i], node1 = this.vertices[(i+1)%3];
			if (node0.neighbors.has(node1)) { // if so,
				this.edges[i] = node0.neighbors.get(node1); // take that edge
				if (this.edges[i].node0 === node0) // and depending on its direction,
					this.edges[i].triangleL = this; // replace one of the triangles on it with this
				else
					this.edges[i].triangleR = this;
			}
			else { // if not,
				this.edges[i] = new Edge(
					node0, null, node1, this, this.surface.distance(node0, node1)); // create an edge with the new triangle adjacent to it
			}
		}
	}

	/**
	 * compute the ф-λ parameterization of the circumcenter in the plane normal to the sum
	 * of the vertices' normal vectors.
	 */
	computeCircumcenter() {
		let nAvg = new Vector(0, 0, 0);
		for (const vertex of this.vertices)
			nAvg = nAvg.plus(vertex.normal);
		const {u, v, n} = orthogonalBasis(nAvg, true);
		const projected: {x: number, y: number, z: number}[] = [];
		for (const vertex of this.vertices) // project all of the vertices into the tangent plane
			projected.push({
				x: u.dot(vertex.pos),
				y: v.dot(vertex.pos),
				z: n.dot(vertex.pos)});

		const {x, y} = circumcenter(projected);
		let z = 0;
		for (const nodo of projected)
			z += nodo.z/3;
		const center = u.times(x).plus(v.times(y)).plus(n.times(z));
		this.circumcenter = this.surface.фλ(center.x, center.y, center.z); // finally, put it back in ф-λ space

		this.ф = this.circumcenter.ф; // and make these values a bit easier to access
		this.λ = this.circumcenter.λ;
	}

	/**
	 * Find and return the vertex across from the given edge.
	 */
	acrossFrom(edge: Edge): Nodo {
		for (const vertex of this.vertices)
			if (vertex !== edge.node0 && vertex !== edge.node1)
				return vertex;
		throw "Could not find a nonadjacent vertex.";
	}

	/**
	 * Find and return the vertex widershins of the given edge.
	 */
	widershinsOf(node: Nodo): Nodo {
		for (let i = 0; i < 3; i ++)
			if (this.vertices[i] === node)
				return this.vertices[(i+1)%3];
		throw "This node isn't even in this triangle.";
	}

	toString(): string {
		return `${this.vertices[0].pos}--${this.vertices[1].pos}--${this.vertices[2].pos}`;
	}
}


/**
 * A line between two connected Nodos, and separating two triangles
 */
export class Edge {
	public node0: Nodo;
	public node1: Nodo;
	public triangleL: Triangle;
	public triangleR: Triangle;
	public length: number;
	public liwe: number;

	constructor(node0: Nodo, triangleR: Triangle, node1: Nodo, triangleL: Triangle, length: number) {
		this.node0 = node0; // save these new values for the edge
		this.triangleR = triangleR;
		this.node1 = node1;
		this.triangleL = triangleL;
		this.length = length;

		node0.neighbors.set(node1, this);
		node1.neighbors.set(node0, this);
	}

	toString(): string {
		return `${this.node0.pos}--${this.node1.pos}`;
	}
}


/**
 * Similar to a Vector but in spherical coordinates
 */
export interface Place {
	ф: number;
	λ: number;
}


