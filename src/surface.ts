// surface.ts: defines the geometric classes

import {Random} from "./random.js";
import {
	delaunayTriangulate, legendreP2, legendreP4, legendreP6,
	linterp, orthogonalBasis,
	Vector
} from "./utils.js";

const INTEGRATION_RESOLUTION = 32;
const TILE_AREA = 30000; // typical area of a tile in km^2


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
	readonly φMin: number;
	readonly φMax: number;
	refLatitudes: number[];
	cumulAreas: number[];
	cumulDistances: number[];


	protected constructor(φMin: number, φMax: number) {
		this.nodos = new Set();
		this.φMin = φMin;
		this.φMax = φMax;
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
	abstract partition(): {nodos: Nodo[], triangles: Triangle[]};

	/**
	 * return the local length-to-latitude rate [km]
	 */
	abstract dsdφ(φ: number): number;

	/**
	 * return the local effective width [km]
	 */
	abstract dAds(φ: number): number;

	/**
	 * return the amount of solar radiation at a latitude, normalized to average to 1.
	 */
	abstract insolation(φ: number): number;

	/**
	 * return the amount of moisture accumulation at a latitude, normalized to peak at 1.
	 */
	abstract windConvergence(φ: number): number;

	/**
	 * for the purposes of the orographic effect, return a dimensionless tangent velocity.
	 */
	abstract windVelocity(φ: number): {nord: number, dong: number};

	/**
	 * return the 3D cartesian coordinate vector corresponding to the given parameters
	 */
	abstract xyz(φ: number, λ: number): Vector;

	/**
	 * return the 2D parameterization corresponding to the given parameters
	 */
	abstract φλ(x: number, y: number, z: number): Place;

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
 * an oblate spheroid
 */
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
			throw new RangeError("Too fast to sustain an ellipsoidal planet.");
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
		return Spheroid.annualInsolationFunction(this.obliquity, φ);
	}

	windConvergence(φ: number): number {
		return Math.pow(Math.cos(φ), 2) + Math.pow(Math.cos(3*φ), 2);
	}

	windVelocity(φ: number): {nord: number, dong: number} {
		return {nord: 0, dong: Math.cos(φ)}; // realistically this should change direccion, but this formula makes orographs more apparent
	}

	xyz(φ: number, λ: number): Vector {
		const β = Math.atan(Math.tan(φ)/this.aspectRatio);
		return new Vector(
			 this.radius*Math.cos(β)*Math.sin(λ),
			-this.radius*Math.cos(β)*Math.cos(λ),
			 this.radius*Math.sin(β)/this.aspectRatio);
	}

	φλ(x: number, y: number, z: number): Place {
		const β = Math.atan2(this.aspectRatio*z, Math.hypot(x, y));
		const λ = Math.atan2(x, -y);
		return {φ: Math.atan(Math.tan(β)*this.aspectRatio), λ: λ};
	}

	normal(node: Place): Vector {
		return new Vector(
			 Math.cos(node.φ)*Math.sin(node.λ),
			-Math.cos(node.φ)*Math.cos(node.λ),
			 Math.sin(node.φ));
	}

	distance(a: Place, b: Place): number { // TODO: check
		const s = Math.acos(Math.sin(a.φ)*Math.sin(b.φ) +
			Math.cos(a.φ)*Math.cos(b.φ)*Math.cos(a.λ - b.λ));
		const p = (a.φ + b.φ)/2;
		const q = (b.φ - a.φ)/2;
		const x = (s - Math.sin(s))*Math.pow(Math.sin(p)*Math.cos(q)/Math.cos(s/2), 2);
		const y = (s + Math.sin(s))*Math.pow(Math.cos(p)*Math.sin(q)/Math.sin(s/2), 2);
		return this.radius*(s - this.flattening/2*(x + y));
	}

	/**
	 * from Alice Nadeau and Richard McGehee (2018)
	 * @param obliquity
	 * @param latitude
	 */
	static annualInsolationFunction(obliquity: number, latitude: number) {
		return 1 -
			5/8.*legendreP2(Math.cos(obliquity))*legendreP2(Math.sin(latitude)) -
			9/64.*legendreP4(Math.cos(obliquity))*legendreP4(Math.sin(latitude)) -
			65/1024.*legendreP6(Math.cos(obliquity))*legendreP6(Math.sin(latitude));
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
		return 2.0*Math.max(0, Math.sin(φ));
	}

	windConvergence(φ: number): number {
		return Math.cos(φ);
	}

	windVelocity(φ: number): {nord: number, dong: number} {
		return {nord: -Math.cos(φ), dong: 0};
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


export class Disc extends Surface {
	private readonly radius: number;
	private readonly firmamentHite: number;
	private readonly effectiveObliquity: number;

	constructor(radius: number, obliquity: number) {
		super(Math.atan(1/4), Math.PI/2);
		this.radius = radius;
		this.firmamentHite = radius/4;
		this.effectiveObliquity = obliquity;
	}

	partition(): {triangles: Triangle[], nodos: Nodo[]} {
		const nodos: Nodo[] = [
			new Nodo(null, {φ: Math.atan(1/8), λ: 0}, this),
			new Nodo(null, {φ: Math.atan(1/8), λ: Math.PI/2}, this),
			new Nodo(null, {φ: Math.atan(1/8), λ: Math.PI}, this),
			new Nodo(null, {φ: Math.atan(1/8), λ: 3*Math.PI/2}, this),
		];

		const triangles: Triangle[] = [
			new Triangle(nodos[0], nodos[1], nodos[2]),
			new Triangle(nodos[2], nodos[3], nodos[0]),
		];

		return {triangles: triangles, nodos: nodos};
	}

	dsdφ(φ: number): number {
		return this.firmamentHite*Math.pow(Math.sin(φ), -2);
	}

	dAds(φ: number): number {
		return 2*Math.PI*this.firmamentHite/Math.tan(φ);
	}

	insolation(φ: number): number {
		const cosψ = Math.cos(2*this.effectiveObliquity)
		const ρ = this.firmamentHite/this.radius/Math.tan(φ);
		return 7/(
			(3.865*cosψ + 6.877) -
			(44.803*cosψ +  1.216)*Math.pow(ρ, 2) +
			(87.595*cosψ + 19.836)*Math.pow(ρ, 4) -
			(38.728*cosψ -  8.049)*Math.pow(ρ, 6));
	}

	windConvergence(φ: number): number {
		return 1.5*(Math.sin(2*φ)**2 + Math.sin(3*φ)**2 - 0.5)
	}

	windVelocity(φ: number): {nord: number, dong: number} {
		return {nord: Math.sin(2*φ), dong: 0};
	}

	xyz(φ: number, λ: number): Vector {
		const r = this.firmamentHite/Math.tan(φ);
		return new Vector(r*Math.sin(λ), -r*Math.cos(λ), 0);
	}

	φλ(x: number, y: number, z: number): Place {
		return {
			φ: Math.max(Math.atan(this.firmamentHite/Math.hypot(x, y)), this.φMin),
			λ: Math.atan2(x, -y)};
	}

	normal(node: Place): Vector {
		return new Vector(0, 0, 1);
	}

	distance(a: Place, b: Place): number {
		const ar = this.firmamentHite/Math.tan(a.φ);
		const br = this.firmamentHite/Math.tan(b.φ);
		return Math.sqrt(ar*ar + br*br - 2*ar*br*Math.cos(a.λ - b.λ));
	}
}


/**
 * a toroidal planet
 */
export class Toroid extends Surface {
	private readonly majorRadius: number;
	private readonly minorRadius: number;
	private readonly elongation: number;
	private readonly obliquity: number;

	constructor(radius: number, gravity: number, omega: number, obliquity: number) {
		super(-Math.PI, Math.PI);
		const w = (radius*1000)*omega*omega/gravity; // this dimensionless parameter determines the aspect ratio
		const aspectRatio = 1/(1.010*w + 0.618*w*w); // numerically determined formula for aspect ratio
		this.elongation = 1/(1 - 0.204*w + 4.436*w*w); // numerically determined formula for elongation
		if (aspectRatio < 1.5)
			throw new RangeError("Too fast to sustain a toroidal planet.");
		if (aspectRatio > 6)
			throw new RangeError("Too slow to sustain a toroidal planet.");
		this.majorRadius = radius*aspectRatio/(1 + aspectRatio);
		this.minorRadius = radius/(1 + aspectRatio);
		this.obliquity = obliquity;
	}

	partition(): {triangles: Triangle[], nodos: Nodo[]} {
		const m = 3;
		const n = 4*Math.trunc(m*this.majorRadius/(this.minorRadius*this.elongation));
		const nodos = [];
		for (let i = 0; i < n; i ++) { // construct a chain of points,
			const φ0 = (i%2 === 0) ? 0 : Math.PI/m;
			for (let j = 0; j < m; j ++)
				nodos.push(new Nodo(null, {
					φ: φ0 + 2*Math.PI/m * j,
					λ: 2*Math.PI/n * i,
				}, this));
		}

		// console.log('nodos = np.array([');
		// for (const nodo of nodos)
		// 	console.log(`[${nodo.pos.x}, ${nodo.pos.y}, ${nodo.pos.z}],`);
		// console.log('])');

		// console.log('triangles = np.array([');
		const triangles = []; // and cover it with triangles
		for (let i = 0; i < n; i ++) {
			for (let j = 0; j < m; j ++) {
				for (let coords of [[[0, 0], [2, 0], [1, 0]], [[1, 0], [2, 0], [3, 0]]]) {
					const indices = [];
					for (let k = 0; k < 3; k ++)
						indices.push((i + coords[k][0])%n*m + (j + coords[k][1] + (i%2)*(coords[k][0])%2)%m);
					// console.log(`[${indices}],`);
					triangles.push(new Triangle(
						nodos[indices[0]], nodos[indices[1]], nodos[indices[2]]));
				}
			}
		}
		// console.log('])');
		return {nodos: nodos, triangles: triangles};
	}

	dsdφ(φ: number): number {
		const β = Math.atan(Math.tan(φ)*this.elongation);
		const dβdφ = this.elongation/(
			Math.pow(Math.cos(φ), 2) +
			Math.pow(this.elongation*Math.sin(φ), 2));
		const dsdβ = this.minorRadius*
			Math.hypot(Math.sin(β), this.elongation*Math.cos(β));
		return dsdβ*dβdφ;
	}

	dAds(φ: number): number {
		const β = Math.atan2(Math.sin(φ)*this.elongation, Math.cos(φ));
		return 2*Math.PI*(this.majorRadius + this.minorRadius*Math.cos(β));
	}

	insolation(φ: number): number {
		const β = Math.atan(Math.tan(φ)*this.elongation);
		const incident = Spheroid.annualInsolationFunction(this.obliquity, φ);
		let opacity;
		if (Math.cos(φ) >= 0)
			opacity = 0;
		else if (this.obliquity === 0)
			opacity = 1;
		else { // I made this formula up myself to fit some actually accurate integrals.  I'm quite proud of it.
			const dz = 2*this.majorRadius/this.minorRadius*Math.tan(this.obliquity)/this.elongation;
			opacity =
				Math.min(1, Math.min(1, (1 - Math.sin(β))/dz) * Math.min(1, (1 + Math.sin(β))/dz) +
					0.4*Math.pow(Math.sin(2*β), 2)/(1 + dz) -
					0.8*this.elongation*this.minorRadius/this.majorRadius * Math.pow(Math.cos(φ), 3));
		}
		return incident*(1 - opacity);
	}

	windConvergence(φ: number): number {
		return Math.pow(Math.cos(φ), 2) + Math.pow(Math.cos(3*φ), 2);
	}

	windVelocity(φ: number): {nord: number, dong: number} {
		return {nord: 0, dong: Math.cos(φ)};
	}

	xyz(φ: number, λ: number): Vector {
		const β = Math.atan2(Math.sin(φ)*this.elongation, Math.cos(φ));
		const r = this.majorRadius + this.minorRadius*Math.cos(β);
		const z = this.elongation*this.minorRadius*Math.sin(β);
		return new Vector(
			r*Math.sin(λ), -r*Math.cos(λ), z);
	}

	φλ(x: number, y: number, z: number): Place {
		const r = Math.hypot(x, y);
		const β = Math.atan2(z/this.elongation, r - this.majorRadius);
		return {
			φ: Math.atan2(Math.sin(β)/this.elongation, Math.cos(β)),
			λ: Math.atan2(x, -y)};
	}

	normal(node: Place): Vector {
		return new Vector(
			 Math.cos(node.φ)*Math.sin(node.λ),
			-Math.cos(node.φ)*Math.cos(node.λ),
			 Math.sin(node.φ));
	}

	distance(a: Place, b: Place): number {
		const rAvg = 2/(
			1/(this.majorRadius + this.minorRadius*Math.cos(a.φ)) +
			1/(this.majorRadius + this.minorRadius*Math.cos(b.φ)));
		const aAvg = (this.dsdφ(a.φ) + this.dsdφ(b.φ))/2;
		const sTor = rAvg * (Math.abs(a.λ - b.λ) % (2*Math.PI));
		const sPol = aAvg * Math.abs((a.φ - b.φ) % (2*Math.PI));
		return Math.hypot(sTor, sPol);
	}
}


/**
 * A single Voronoi polygon, which contains geographical information
 */
export class Nodo {
	public readonly surface: Surface;
	public readonly index: number;
	public readonly φ: number;
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
}


/**
 * A voronoi vertex, which exists at the confluence of three Nodos
 */
export class Triangle {
	public φ: number;
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
	 * compute the φ-λ parameterization of the circumcenter in the plane normal to the sum
	 * of the vertices' normal vectors.
	 */
	computeCircumcenter() {
		let nAvg = new Vector(0, 0, 0);
		for (const vertex of this.vertices)
			nAvg = nAvg.plus(vertex.normal);
		const {u, v, n} = orthogonalBasis(nAvg, true);
		const projected = [];
		for (const vertex of this.vertices) // project all of the vertices into the tangent plane
			projected.push({
				v: v.dot(vertex.pos),
				u: u.dot(vertex.pos),
				n: n.dot(vertex.pos)});

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
			x: v.x*center.v + u.x*center.u + n.x*center.n,
			y: v.y*center.v + u.y*center.u + n.y*center.n,
			z: v.z*center.v + u.z*center.u + n.z*center.n };
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
	φ: number;
	λ: number;
}


