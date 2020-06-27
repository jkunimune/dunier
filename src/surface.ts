// surface.ts: defines the geometric classes

import {Random} from "./random.js";
import {delaunayTriangulate, legendreP2, legendreP4, legendreP6, linterp} from "./utils.js";

const INTEGRATION_RESOLUTION = 32;
const TILE_AREA = 30000; // typical area of a tile in km^2


/**
 * Generic 3D collection of nodes and edges
 */
export class Surface {
	public nodos: Set<Nodo>;
	public triangles: Set<Triangle>;
	public rivers: Set<(Nodo | Triangle)[]>;
	public area: number;
	public height: number;
	private readonly φMin: number;
	private readonly φMax: number;
	readonly axis: Vector; // orientation of geodetic coordinate system
	refLatitudes: number[];
	cumulAreas: number[];
	cumulDistances: number[];


	constructor(φMin: number, φMax: number) {
		this.nodos = new Set();
		this.φMin = φMin;
		this.φMax = φMax;
		this.axis = this.xyz(0, 0).cross(this.xyz(0, Math.PI/2)).norm();
	}

	/**
	 * fill this.nodes with random nodes, spaced via numLloyd iterations of Lloyd
	 * relaxation
	 */
	populate(rng: Random) {
		this.refLatitudes = []; // fill in latitude-integrated values
		this.cumulAreas = []; // for use in map projections
		this.cumulDistances = [];
		let φ = this.φMin, A = 0, s = 0;
		const dφ = (this.φMax - this.φMin)/INTEGRATION_RESOLUTION;
		for (let i = 0; i <= INTEGRATION_RESOLUTION; i ++) {
			this.refLatitudes.push(φ);
			this.cumulAreas.push(A);
			this.cumulDistances.push(s);
			const dsdφ = this.dsdφ(φ + dφ/2); // a simple middle Riemann sum will do
			const dAds = this.dAds(φ + dφ/2);
			φ += dφ;
			A += dAds*dsdφ*dφ;
			s += dsdφ*dφ;
		}
		this.area = this.cumulAreas[INTEGRATION_RESOLUTION];
		this.height = this.cumulDistances[INTEGRATION_RESOLUTION];

		const nodos = []; // remember to clear the old nodes, if necessary
		for (let i = 0; i < Math.max(100, this.area/TILE_AREA); i ++)
			nodos.push(new Nodo(i, this.randomPoint(rng), this)); // push a bunch of new ones
		this.nodos = new Set(nodos); // keep that list, but save it as a set as well
		this.triangles = new Set(); // also start a new set for the triangles

		delaunayTriangulate(this);

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
	}

	/**
	 * return the coordinates of a point uniformly sampled from the Surface using the
	 * given random number generator.
	 */
	randomPoint(rng: Random): Place {
		const λ = rng.uniform(-Math.PI, Math.PI);
		const A = rng.uniform(0, this.cumulAreas[this.cumulAreas.length-1]);
		const φ = linterp(A, this.cumulAreas, this.refLatitudes);
		return {φ: φ, λ: λ};
	}

	/**
	 * return 2d arrays of x, y, z, and insolation.
	 */
	parameterize(resolution: number): {x: number[][], y: number[][], z: number[][], I: number[][]} {
		const n = 2*resolution, m = 4*resolution;
		const X = [], Y = [], Z = [], S = [];
		for (let i = 0; i <= n; i ++) {
			const φ = i/n*(this.φMax - this.φMin) + this.φMin; // map i to the valid range for φ
			const s = this.insolation(φ);
			X.push([]);
			Y.push([]);
			Z.push([]);
			S.push([]);
			for (let j = 0; j <= m; j ++) {
				const λ = j/m*2*Math.PI; // I think λ always represents some [0, 2*pi) angle
				const {x, y, z} = this.xyz(φ, λ);
				X[i].push(x);
				Y[i].push(y);
				Z[i].push(z);
				S[i].push(s);
			}
		}
		return {x: X, y: Y, z: Z, I: S};
	}

	/**
	 * return a list of nodes along with an associated list of triangles that
	 * completely cover this Surface. The mesh must never diverge from the surface farther
	 * than the radius of curvature.
	 */
	partition(): {nodos: Nodo[], triangles: Triangle[]} {
		throw "Unimplemented";
	}

	/**
	 * return the local length-to-latitude rate
	 */
	dsdφ(φ: number): number {
		throw "Unimplemented";
	}

	/**
	 * return the local effective width
	 */
	dAds(φ: number): number {
		throw "Unimplemented";
	}

	/**
	 * return the amount of moisture accumulation at a latitude, normalized to peak at 1.
	 */
	windConvergence(φ: number): number {
		throw "Unimplemented";
	}

	/**
	 * for the purposes of the orographic effect, return a dimensionless tangent velocity.
	 */
	windVelocity(φ: number): {n: number, d: number} {
		throw "Unimplemented";
	}

	/**
	 * return the amount of solar radiation at a latitude, normalized to average to 1.
	 */
	insolation(φ: number): number {
		throw "Unimplemented";
	}

	/**
	 * return the 3D cartesian coordinate vector corresponding to the given parameters
	 */
	xyz(φ: number, λ: number): Vector {
		throw "Unimplemented";
	}

	/**
	 * return the 2D parameterization corresponding to the given parameters
	 */
	φλ(x: number, y: number, z: number): Place {
		throw "Unimplemented";
	}

	/**
	 * return the normalized vector pointing outward at this node. the node may be assumed
	 * to be on this Surface.
	 */
	normal(node: Place): Vector {
		throw "Unimplemented";
	}

	/**
	 * orthodromic distance from A to B on the surface (it's okay if it's just
	 * an approximation).
	 */
	distance(a: Place, b: Place): number {
		throw "Unimplemented";
	}
}


export class Spheroid extends Surface {
	private readonly radius: number;
	private readonly aspectRatio: number;
	private readonly flattening: number;
	private readonly eccentricity: number;
	private readonly obliquity: number;

	constructor(radius: number, gravity: number, omega: number, obliquity: number) {
		super(-Math.PI/2, Math.PI/2);
		this.radius = radius; // keep radius in km
		const w = (radius*1000)*omega*omega/gravity; // this dimensionless parameter determines the aspect ratio
		this.aspectRatio = 1 + w/2 + 1.5*w*w + 6.5*w*w*w; // numerically determined formula for oblateness
		if (this.aspectRatio > 4)
			throw new RangeError("Unstable planet");
		this.flattening = 1 - 1/this.aspectRatio;
		this.eccentricity = Math.sqrt(1 - Math.pow(this.aspectRatio, -2));
		this.obliquity = obliquity;
	}

	partition(): {triangles: Triangle[]; nodos: Nodo[]} {
		const b = Math.atan(1/this.aspectRatio);
		const m = Math.trunc(2*Math.PI/Math.hypot(Math.sin(b)/this.aspectRatio, 1 - Math.cos(b)));
		const n = 4;
		const nodos = [];
		for (let i = 1; i < n; i ++) // construct a grid of points,
			for (let j = 0; j < m; j ++)
				nodos.push(new Nodo(null, {
					φ: Math.PI*(i/n - .5),
					λ: 2*Math.PI*(j + .5*(i%2))/m,
				}, this));
		const kS = nodos.length; // assign Nodes to the poles,
		nodos.push(new Nodo(null, { φ: -Math.PI/2, λ: 0 }, this));
		const kN = nodos.length;
		nodos.push(new Nodo(null, { φ: Math.PI/2, λ: 0 }, this));

		const triangles = []; // and strew it all with triangles
		for (let j = 0; j < m; j ++)
			triangles.push(
				new Triangle(nodos[kS], nodos[(j+1)%m], nodos[j]));
		for (let i = 1; i < n-1; i ++) {
			for (let j = 0; j < m; j ++) {
				if (i%2 === 1) {
					triangles.push(new Triangle(
						nodos[(i-1)*m + j],
						nodos[i*m + (j+1)%m],
						nodos[i*m + j]));
					triangles.push(new Triangle(
						nodos[(i-1)*m + j],
						nodos[(i-1)*m + (j+1)%m],
						nodos[i*m + (j+1)%m]));
				}
				else {
					triangles.push(new Triangle(
						nodos[(i-1)*m + j],
						nodos[(i-1)*m + (j+1)%m],
						nodos[i*m + j]));
					triangles.push(new Triangle(
						nodos[(i-1)*m + (j+1)%m],
						nodos[i*m + (j+1)%m],
						nodos[i*m + j]));
				}
			}
		}
		for (let j = 0; j < m; j ++)
			triangles.push(
				new Triangle(nodos[kN], nodos[(n-2)*m + j], nodos[(n-2)*m + (j+1)%m]));
		return {nodos: nodos, triangles: triangles};
	}

	dsdφ(φ: number): number {
		const β = Math.atan(Math.tan(φ)/this.aspectRatio);
		const dβdφ = this.aspectRatio/(
			Math.pow(Math.sin(φ), 2) +
			Math.pow(this.aspectRatio*Math.cos(φ), 2));
		const dsdβ = this.radius*
			Math.sqrt(1 - Math.pow(this.eccentricity*Math.cos(β), 2));
		return dsdβ*dβdφ;
	}

	dAds(φ: number): number {
		const β = Math.atan(Math.tan(φ)/this.aspectRatio);
		return 2*Math.PI*this.radius*Math.cos(β);
	}

	insolation(φ: number): number {
		return 1 -
			5/8.*legendreP2(Math.cos(this.obliquity))*legendreP2(Math.sin(φ)) -
			9/64.*legendreP4(Math.cos(this.obliquity))*legendreP4(Math.sin(φ)) -
			65/1024.*legendreP6(Math.cos(this.obliquity))*legendreP6(Math.sin(φ));
	}

	windConvergence(φ: number): number {
		return Math.pow(Math.cos(φ), 2) + Math.pow(Math.cos(3*φ), 2);
	}

	windVelocity(φ: number): {n: number, d: number} {
		return {n: 0, d: Math.cos(φ)};
	}

	xyz(φ: number, λ: number): Vector {
		const β = Math.atan(Math.tan(φ)/this.aspectRatio);
		return new Vector(
			-this.radius*Math.cos(β)*Math.sin(λ),
			 this.radius*Math.cos(β)*Math.cos(λ),
			 this.radius*Math.sin(β)/this.aspectRatio);
	}

	φλ(x: number, y: number, z: number): Place {
		const β = Math.atan2(this.aspectRatio*z, Math.hypot(x, y));
		const λ = Math.atan2(-x, y);
		return {φ: Math.atan(Math.tan(β)*this.aspectRatio), λ: λ};
	}

	normal(node: Place): Vector {
		return new Vector(
			-Math.cos(node.φ)*Math.sin(node.λ),
			 Math.cos(node.φ)*Math.cos(node.λ),
			 Math.sin(node.φ));
	}

	distance(a: Place, b: Place): number {
		const s = Math.acos(Math.sin(a.φ)*Math.sin(b.φ) +
			Math.cos(a.φ)*Math.cos(b.φ)*Math.cos(a.λ - b.λ));
		const p = (a.φ + b.φ)/2;
		const q = (b.φ - a.φ)/2;
		const x = (s - Math.sin(s))*Math.pow(Math.sin(p)*Math.cos(q)/Math.cos(s/2), 2);
		const y = (s + Math.sin(s))*Math.pow(Math.cos(p)*Math.sin(q)/Math.sin(s/2), 2);
		return this.radius*(s - this.flattening/2*(x + y));
	}
}


/**
 * a non-rotating spheroid. aspectRatio = 1, and latitude is measured in the y direction
 * rather than the z.
 */
export class Sphere extends Spheroid {
	constructor(radius: number) {
		super(radius, 1, 0, Number.NaN);
	}

	insolation(φ: number): number {
		return 1.5*Math.max(0, Math.sin(φ));
	}

	windConvergence(φ: number): number {
		return Math.cos(φ);
	}

	windVelocity(φ: number): {n: number, d: number} {
		return {n: -Math.cos(φ), d: 0};
	}

	xyz(φ: number, λ: number): Vector {
		const {x, y, z} = super.xyz(φ, λ);
		return new Vector(x, z, -y);
	}

	φλ(x: number, y: number, z: number): Place {
		return super.φλ(x, -z, y);
	}

	normal(node: Nodo): Vector {
		return node.pos.norm();
	}
}


/**
 * A single delaunay vertex/voronoi polygon, which contains geographical information
 */
export class Nodo {
	public surface: Surface;
	public index: number;
	public φ: number;
	public λ: number;
	public pos: Vector;
	public normal: Vector;
	public dong: Vector;
	public nord: Vector;
	public neighbors: Map<Nodo, Edge>;
	public between: Nodo[][];
	public parents: Nodo[];
	public vertices: Triangle[];

	public gawe: number;
	public terme: number;
	public barxe: number;
	public biome: string;
	public plate: number;
	public windVelocity: Vector;
	public downwind: Nodo[];
	public liwe: number;
	public flag: boolean;
	
	constructor(index: number, position: Place, surface: Surface) {
		this.surface = surface;
		this.index = index;
		this.φ = position.φ;
		this.λ = position.λ;
		this.pos = surface.xyz(this.φ, this.λ);
		this.normal = surface.normal(this);
		this.dong = this.surface.axis.cross(this.normal).norm();
		if (Number.isNaN(this.dong.x)) {
			this.dong = this.normal.cross(this.pos).norm();
			if (Number.isNaN(this.dong.x))
				this.dong = this.normal.cross(new Vector(1, 0, 0)).norm();
		}
		this.nord = this.normal.cross(this.dong);

		this.neighbors = new Map();
		this.parents = null;

		this.terme = 0;
		this.barxe = 0;
		this.gawe = 0;
		this.biome = null;
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

	/**
	 * check for the existence of a Triangle containing these three nodes in that order.
	 * @returns boolean
	 */
	inTriangleWith(b: Nodo, c: Nodo): boolean {
		if (!this.neighbors.has(b))
			return false;
		return this.leftOf(b).acrossFrom(this.neighbors.get(b)) === c;
	}

	/**
	 * return the Triangles that border this in widershins order.
	 */
	getPolygon(): Triangle[] {
		if (this.vertices === undefined) { // don't compute this unless you must
			this.vertices = [this.neighbors.values().next().value.triangleL]; // start with an arbitrary neighboring triangle
			while (this.vertices.length < this.neighbors.size) {
				const lastTriangle = this.vertices[this.vertices.length - 1];
				const nextNode = lastTriangle.clockwiseOf(this);
				this.vertices.push(this.leftOf(nextNode));
			}
		}
		return this.vertices;
	}
}


/**
 * A single Delaunay triangle/voronoi vertex, which binds three Nodos
 */
export class Triangle {
	public φ: number;
	public λ: number;
	public vertices: Nodo[];
	public edges: Edge[];
	public neighbors: Map<Triangle, Edge>;
	public surface: Surface;
	public children: Triangle[];
	public circumcenter: Place;

	public gawe: number
	public liwe: number;
	public liwonice: Triangle | Nodo;

	constructor(a: Nodo, b: Nodo, c: Nodo) {
		this.vertices = [a, b, c]; // nodes, ordered widdershins
		this.edges = [null, null, null]; // edges a-b, b-c, and c-a
		this.neighbors = new Map(); // adjacent triangles
		this.surface = a.surface;
		this.children = null;

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
	 * determine whether this triangle contains the given Node, using its neighbors to
	 * hint at the direction of the surface. must return false for points outside the
	 * triangle's circumcircle.
	 */
	contains(r: Nodo): boolean {
		const totalNormal = this.vertices[0].normal.plus(
			this.vertices[1].normal).plus(this.vertices[2].normal);
		if (r.normal.dot(totalNormal) < 0)
			return false; // check alignment on the surface
		for (let i = 0; i < 3; i ++) {
			const a = this.vertices[i];
			const na = a.normal;
			const b = this.vertices[(i+1)%3];
			const nb = b.normal;
			const edgeDirection = b.pos.minus(a.pos);
			const normalDirection = na.plus(nb);
			const boundDirection = normalDirection.cross(edgeDirection);
			if (boundDirection.dot(r.pos.minus(a.pos)) < 0)
				return false; // check each side condition
		}
		return true;
	}

	/**
	 * compute the φ-λ parameterization of the circumcenter in the plane normal to the sum
	 * of the vertices' normal vectors.
	 */
	computeCircumcenter() {
		let nHat = new Vector(0, 0, 0);
		for (const vertex of this.vertices)
			nHat = nHat.plus(vertex.normal);
		nHat = nHat.norm();
		const vHat = nHat.cross(new Vector(0, 0, -1)).norm();
		const uHat = nHat.cross(vHat);
		const projected = [];
		for (const vertex of this.vertices) // project all of the vertices into the tangent plane
			projected.push({
				v: vHat.dot(vertex.pos),
				u: uHat.dot(vertex.pos),
				n: nHat.dot(vertex.pos)});

		let vNumerator = 0, uNumerator = 0;
		let denominator = 0, nSum = 0;
		for (let i = 0; i < 3; i++) { // do the 2D circumcenter calculation
			const a = projected[i];
			const b = projected[(i + 1)%3];
			const c = projected[(i + 2)%3];
			vNumerator += (a.v*a.v + a.u*a.u) * (b.u - c.u);
			uNumerator += (a.v*a.v + a.u*a.u) * (b.v - c.v);
			denominator += a.v * (b.u - c.u);
			nSum += a.n;
		}
		let center: any = {
			v:  vNumerator/denominator/2,
			u: -uNumerator/denominator/2,
			n:  nSum/3 };
		center = {
			x: vHat.x*center.v + uHat.x*center.u + nHat.x*center.n,
			y: vHat.y*center.v + uHat.y*center.u + nHat.y*center.n,
			z: vHat.z*center.v + uHat.z*center.u + nHat.z*center.n };
		this.circumcenter = this.surface.φλ(center.x, center.y, center.z); // finally, put it back in φ-λ space

		this.φ = this.circumcenter.φ; // and make these values a bit easier to access
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
	 * Find and return the vertex clockwise of the given edge.
	 */
	clockwiseOf(node: Nodo): Nodo {
		for (let i = 0; i < 3; i ++)
			if (this.vertices[i] === node)
				return this.vertices[(i+2)%3];
		throw "This node isn't even in this triangle.";
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
 * A line between two connected Nodes, and separating two triangles
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

	seppuku() {
		this.node0.neighbors.delete(this.node1);
		this.node1.neighbors.delete(this.node0);
	}

	toString(): string {
		return `${this.node0.pos}--${this.node1.pos}`;
	}
}


/**
 * Similar to a Vector but in spherical coordinates
 */
export interface Place {
	φ: number;
	λ: number;
}


/**
 * A simple class to bind vector operations
 */
export class Vector {
	public x: number;
	public y: number;
	public z: number;

	constructor(x: number, y: number, z: number) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	times(a: number): Vector {
		return new Vector(
			this.x * a,
			this.y * a,
			this.z * a);
	}

	over(a: number): Vector {
		return new Vector(
			this.x / a,
			this.y / a,
			this.z / a);
	}

	plus(that: Vector): Vector {
		return new Vector(
			this.x + that.x,
			this.y + that.y,
			this.z + that.z);
	}

	minus(that: Vector): Vector {
		return new Vector(
			this.x - that.x,
			this.y - that.y,
			this.z - that.z);
	}

	dot(that: Vector): number {
		return (
			this.x*that.x +
			this.y*that.y +
			this.z*that.z);
	}

	cross(that: Vector): Vector {
		return new Vector(
			this.y*that.z - this.z*that.y,
			this.z*that.x - this.x*that.z,
			this.x*that.y - this.y*that.x);
	}

	sqr(): number {
		return this.dot(this);
	}

	norm(): Vector {
		return this.times(Math.pow(this.sqr(), -0.5));
	}

	toString(): string {
		return `<${Math.trunc(this.x)}, ${Math.trunc(this.y)}, ${Math.trunc(this.z)}>`;
	}
}
