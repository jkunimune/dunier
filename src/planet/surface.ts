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
import {delaunayTriangulate} from "../util/delaunay.js";
import {Culture} from "../society/culture.js";
import {Biome} from "../society/terrain.js";
import {Place, Point} from "../util/coordinates.js";
import {checkVoronoiPolygon, circumcenter, orthogonalBasis, Vector} from "../util/geometry.js";
import {straightSkeleton} from "../util/straightskeleton.js";


const INTEGRATION_RESOLUTION = 32;
const TILE_AREA = 30000; // target area of a tile in km^2
const FINEST_SCALE = 10; // the smallest edge lengths that it will generate


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
		this.nodos = null;
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
	 * fill this.nodes with random nodes.
	 */
	populate(rng: Random): void {
		// generate the nodes
		const nodos: Nodo[] = []; // remember to clear the old nodes, if necessary
		for (let i = 0; i < Math.max(100, this.area/TILE_AREA); i ++)
			nodos.push(new Nodo(i, this.randomPoint(rng), this)); // push a bunch of new ones
		this.nodos = new Set(nodos); // keep that list, but save it as a set as well

		// seed the surface
		const partition = this.partition();

		// call the delaunay triangulation subroutine
		const triangulation = delaunayTriangulate(
			nodos.map((n: Nodo) => n.pos),
			nodos.map((n: Nodo) => n.normal),
			partition.nodos.map((n: Nodo) => n.pos),
			partition.nodos.map((n: Nodo) => n.normal),
			partition.triangles.map((t: Triangle) => t.vertices.map((n: Nodo) => partition.nodos.indexOf(n)))
		);
		this.triangles = new Set(); // unpack the resulting triangles
		for (const [ia, ib, ic] of triangulation.triangles) {
			this.triangles.add(new Triangle(nodos[ia], nodos[ib], nodos[ic])); // this will automatically generate the Edges
		}
		for (let i = 0; i < nodos.length; i ++) {
			for (const j of triangulation.parentage[i]) // as well as the parentage
				nodos[i].parents.push(nodos[j]);
			for (const [j, k] of triangulation.between[i]) // and separation information
				nodos[i].between.push([nodos[j], nodos[k]]);
		}

		// after all that's through, some nodes won't have any parents
		for (let i = 1; i < nodos.length; i ++) {
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

		// finally, complete the remaining triangles' network graphs
		for (const triangle of this.triangles) {
			for (let i = 0; i < 3; i ++) {
				const edge = triangle.edges[i];
				if (triangle === edge.triangleL)
					triangle.neighbors.set(edge.triangleR, edge);
				else
					triangle.neighbors.set(edge.triangleL, edge);
			}
			triangle.computeCircumcenter();
		}

		// and find the edge, if there is one
		for (const nodo of this.nodos)
			for (const neibor of nodo.neighbors.keys())
				if (nodo.rightOf(neibor) === null)
					this.edge.set(nodo, {next: neibor, prev: null});
		for (const nodo of this.edge.keys()) // and make it back-searchable
			this.edge.get(this.edge.get(nodo).next).prev = nodo;

		// now we can save each node's strait skeleton
		for (const nodo of this.nodos) {
			const vertices: Point[] = [];
			for (const {vertex} of nodo.getPolygon()) {
				vertices.push({
					x: vertex.minus(nodo.pos).dot(nodo.east), // project the voronoi polygon into 2D
					y: vertex.minus(nodo.pos).dot(nodo.north),
				});
			}
			checkVoronoiPolygon(vertices); // validate it
			let skeletonLeaf = straightSkeleton(vertices); // get the strait skeleton
			for (const {edge} of nodo.getPolygon()) {
				const arc = skeletonLeaf.pathToNextLeaf();
				const projectedArc: Vector[] = [];
				for (const joint of arc) {
					const {x, y} = joint.value;
					projectedArc.push( // project it back
						nodo.pos.plus(
							nodo.east.times(x).plus(
							nodo.north.times(y))));
				}
				if (edge.node0 === nodo) // then save it to the edge
					edge.backBorder = projectedArc;
				else
					edge.foreBorder = projectedArc;
				skeletonLeaf = arc[arc.length - 1]; // move onto the next one
			}
		}

		// finally, add the greebles
		for (const triangle of this.triangles) // TODO this probably belongs in terrain.ts, no?
			for (const edge of triangle.edges)
				if (edge.path === null)
					edge.greeblePath(rng);
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
	public readonly east: Vector;
	public readonly north: Vector;
	public readonly neighbors: Map<Nodo, Edge>;
	public readonly between: Nodo[][];
	public parents: Nodo[];

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
	public downwind: Nodo[];
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
	 * of the list is the circumcenter of a triangle and the edge that leads from it to
	 * the next one.
	 */
	getPolygon(): { vertex: Vector, edge: Edge }[] {
		const output = [];
		let start;
		if (this.surface.edge.has(this))
			start = this.surface.edge.get(this).prev;
		else
			start = this.neighbors.keys().next().value;

		let nodo = start;
		do {
			const triangle = this.leftOf(nodo);
			if (triangle === null)
				break;
			nodo = triangle.widershinsOf(nodo);

			output.push({
				vertex: triangle.centerPos,
				edge: this.neighbors.get(nodo)
			});
		} while (nodo !== start);

		return output;
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
	public center: Place; // circumcenter (the locacion of the vertex on the Voronoi graph (also present in ф and λ))
	public centerPos: Vector; // circumcenter (in 3D this time)

	public height: number;
	public flow: number;
	public downstream: Triangle | Nodo;

	constructor(a: Nodo, b: Nodo, c: Nodo) {
		const nodeDix = a.normal.plus(b.normal).plus(c.normal);
		const faceDix = b.pos.minus(a.pos).cross(c.pos.minus(a.pos));
		if (nodeDix.dot(faceDix) <= 0)
			throw "triangles must be instantiated facing outward, but this one was not.";
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
	computeCircumcenter(): void {
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
		this.centerPos = u.times(x).plus(v.times(y)).plus(n.times(z));
		this.center = this.surface.фλ(this.centerPos); // finally, put it back in ф-λ space

		this.ф = this.center.ф; // and make these values a bit easier to access
		this.λ = this.center.λ;
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
	public flow: number;
	public path: Place[];
	public foreBorder: Vector[]; // these borders are the limits of the greebling
	public backBorder: Vector[];

	constructor(node0: Nodo, triangleR: Triangle, node1: Nodo, triangleL: Triangle, length: number) {
		this.node0 = node0; // save these new values for the edge
		this.triangleR = triangleR;
		this.node1 = node1;
		this.triangleL = triangleL;
		this.length = length;
		this.path = null;

		node0.neighbors.set(node1, this);
		node1.neighbors.set(node0, this);

		this.foreBorder = [];
		this.backBorder = [];
	}

	/**
	 * transform these points onto the surface so that t maps to the direction along the
	 * voronoi edge, and s maps to the perpendicular direction.  specifically (0,0)
	 * corresponds to triangleL, (0, 1) corresponds to triangleR, and (1, 1/2) corresponds
	 * to node1.
	 */
	greeblePath(rng: Random): void {
		// define the inicial coordinate vectors
		const origin = this.triangleL.centerPos; // compute its coordinate system
		const i = this.triangleR.centerPos.minus(origin);
		const k = this.node0.normal.plus(this.node1.normal);
		let j = k.cross(i);
		j = j.times(Math.sqrt(i.sqr()/j.sqr())); // make sure |i| == |j|

		// transform the border into the plane
		const bounds = [];
		for (const vector of this.foreBorder.concat(this.backBorder))
			bounds.push({
				x: vector.minus(origin).dot(i)/i.sqr(),
				y: vector.minus(origin).dot(j)/j.sqr(),
			});

		// generate the random curve
		const points = noisyProfile(
			FINEST_SCALE/Math.sqrt(i.sqr()),
			rng, bounds, .35);

		// then transform the result out of the plane
		this.path = [];
		for (const {x, y} of points) {
			const transformed = origin.plus(i.times(x).plus(j.times(y)));
			this.path.push(this.node0.surface.фλ(transformed));
		}
		// finally, adjust the endpoints to prevent roundoff issues
		this.path[0] = this.triangleL.center;
		this.path[this.path.length - 1] = this.triangleR.center;
	}

	toString(): string {
		return `${this.node0.pos}--${this.node1.pos}`;
	}
}
