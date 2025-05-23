/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Random} from "../utilities/random.js";
import {binarySearch, linterp, noisyProfile} from "../utilities/miscellaneus.js";
import {Culture} from "../generation/culture.js";
import {Biome} from "../generation/terrain.js";
import {ΦΛPoint, XYPoint, Point} from "../utilities/coordinates.js";
import {checkVoronoiPolygon, circumcenter, orthogonalBasis, Vector} from "../utilities/geometry.js";
import {straightSkeleton} from "../utilities/straightskeleton.js";
import {delaunayTriangulate} from "../utilities/delaunay.js";
import {Civ} from "../generation/civ.js";
import {POPULATION_DENSITY} from "../generation/world.js";


const TILE_AREA = 30000; // target area of a tile in km^2
const GREEBLE_FACTOR = .35;
const FINEST_RESOLUTION = 0.1; // km
const INTEGRATION_RESOLUTION = 32;


/**
 * an object that encodes basic topologic information for a 2D coordinate system.
 * it contains bounds, which should be either infinite for a Cartesian coordinate system,
 * or two intervals of width 2π for an angular coordinate system.
 */
export class Domain {
	public readonly sMin: number;
	public readonly sMax: number;
	public readonly tMin: number;
	public readonly tMax: number;
	public readonly isOnEdge: (point: Point) => boolean;

	constructor(sMin: number, sMax: number, tMin: number, tMax: number, isOnEdge: (point: Point) => boolean) {
		this.sMin = sMin;
		this.sMax = sMax;
		this.tMin = tMin;
		this.tMax = tMax;
		this.isOnEdge = isOnEdge;
	}

	isPeriodic() {
		return Number.isFinite(this.sMin);
	}
}


/**
 * a domain with no edge and no periodicity in its coordinates
 */
export const INFINITE_PLANE = new Domain(-Infinity, Infinity, -Infinity, Infinity, (_) => false);


/**
 * Generic 3D collection of Voronoi polygons
 */
export abstract class Surface {
	public tiles: Set<Tile>;
	public vertices: Set<Vertex>;
	public rivers: Set<(Tile | Vertex)[]>;
	public area: number;
	/** orientation of geodetic coordinate system */
	public axis: Vector;
	public edge: Map<Tile, {prev: Tile, next: Tile}>;
	public readonly φMin: number;
	public readonly φMax: number;
	public readonly hasDayNightCycle: boolean;
	private refLatitudes: number[];
	private cumulAreas: number[];


	protected constructor(φMin: number, φMax: number, hasDayNightCycle: boolean) {
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
	initialize(): void {
		const φStart = Math.max(this.φMin, -Math.PI);
		const φEnd = Math.min(this.φMax, Math.PI);

		this.refLatitudes = [φStart]; // fill in latitude-integrated values
		this.cumulAreas = [0]; // for use in sampling
		const Δλ = 2*Math.PI;
		for (let i = 1; i <= INTEGRATION_RESOLUTION; i ++) {
			this.refLatitudes.push(φStart + (φEnd - φStart)*i/INTEGRATION_RESOLUTION);
			const north = this.rz(this.refLatitudes[i]);
			const south = this.rz(this.refLatitudes[i - 1]);
			const Δs = Math.hypot(north.r - south.r, north.z - south.z); // treat the surface as a series of cone segments
			const ds_dλ = (north.r + south.r)/2;
			const ΔArea = ds_dλ*Δλ*Δs;
			this.cumulAreas.push(this.cumulAreas[i - 1] + ΔArea);
		}
		this.area = this.cumulAreas[INTEGRATION_RESOLUTION]; // and record the totals as their own instance variables

		this.axis = this.xyz({φ: 1, λ: Math.PI/2}).minus(this.xyz({φ: 1, λ: 0})).cross(
			this.xyz({φ: 1, λ: Math.PI}).minus(this.xyz({φ: 1, λ: Math.PI/2}))).normalized(); // figure out which way the coordinate system points
	}

	/**
	 * fill this.tiles with the given tiles.
	 */
	populateWith(tiles: Tile[]): void {
		this.tiles = new Set(tiles); // keep that list, but save it as a set as well

		// seed the surface
		const partition = this.partition();

		// call the delaunay triangulation subroutine
		const triangulation = delaunayTriangulate(
			tiles.map((t: Tile) => t.pos),
			tiles.map((t: Tile) => t.normal),
			partition.nodos.map((t: Tile) => t.pos),
			partition.nodos.map((t: Tile) => t.normal),
			partition.triangles.map((v: Vertex) => v.tiles.map((t: Tile) => partition.nodos.indexOf(t)))
		);
		this.vertices = new Set(); // unpack the resulting Voronoi vertices
		for (const [ia, ib, ic] of triangulation.triangles) {
			const {pos, coordinates} = Vertex.computeLocation(tiles[ia], tiles[ib], tiles[ic]);
			// only create Vertices inside the surface domain; discard any that fall outside
			if (coordinates.φ <= this.φMax && coordinates.φ >= this.φMin)
				this.vertices.add(new Vertex(tiles[ia], tiles[ib], tiles[ic], pos, coordinates)); // this will automatically generate the Edges
		}
		for (let i = 0; i < tiles.length; i ++) {
			for (const j of triangulation.parentage[i]) // as well as the parentage
				tiles[i].parents.push(tiles[j]);
			for (const [j, k] of triangulation.between[i]) // and separation information
				tiles[i].between.push([tiles[j], tiles[k]]);
		}

		// after all that's through, some tiles won't have any parents
		for (let i = 1; i < tiles.length; i ++) {
			if (tiles[i].parents.length === 0) { // if that's so,
				const orphan = tiles[i];
				let closest = null; // the easiest thing to do is to just assign it the closest tile that came before it using the list
				let minDistance = Infinity;
				for (let j = 0; j < orphan.index; j ++) {
					const distance = this.distance(tiles[j], orphan);
					if (distance < minDistance) {
						minDistance = distance;
						closest = tiles[j];
					}
				}
				orphan.parents = [closest];
			}
		}

		// add Vertices along the edge, if there is one, to complete the graph
		for (const vertex of new Set(this.vertices)) {
			for (const edge of vertex.edges) {
				if (edge.vertex1 === null) { // you're looking for Edges that are missing a Vertex
					const {pos, coordinates} = this.computeEdgeVertexLocation(edge.tileL, edge.tileR);
					this.vertices.add(new Vertex(edge.tileL, edge.tileR, new EmptySpace(this), pos, coordinates));
				}
			}
		}

		// finally, complete the remaining vertices' network graphs
		for (const vertex of this.vertices) {
			for (let i = 0; i < 3; i ++) {
				const edge = vertex.edges[i];
				if (edge !== null) {
					if (vertex === edge.vertex1)
						vertex.neighbors.set(edge.vertex0, edge);
					else
						vertex.neighbors.set(edge.vertex1, edge);
				}
			}
		}

		// and find the edge of the surface, if there is one
		for (const tile of this.tiles)
			for (const neibor of tile.neighbors.keys())
				if (tile.rightOf(neibor).widershinsOf(tile) instanceof EmptySpace)
					this.edge.set(tile, {next: neibor, prev: null});
		for (const tile of this.edge.keys()) // and make it back-searchable
			this.edge.get(this.edge.get(tile).next).prev = tile;

		// now we can save each tile's strait skeleton to the edges (to bound the greebling)
		for (const tile of this.tiles) {
			let vertices: XYPoint[] = [];
			for (const {vertex} of tile.getPolygon()) {
				vertices.push({
					x: vertex.pos.minus(tile.pos).dot(tile.east), // project the voronoi polygon into 2D
					y: vertex.pos.minus(tile.pos).dot(tile.north),
				});
			}
			// sometimes errors arising from the surface curvature cause the polygon to be a little twisted.
			// check for this and fudge it to make it to be non-intersecting if you must.
			vertices = checkVoronoiPolygon(vertices);
			// now get the strait skeleton
			let skeletonLeaf = straightSkeleton(vertices);
			for (const {edge} of tile.getPolygon()) {
				if (edge !== null) {
					const arc = skeletonLeaf.pathToNextLeaf();
					const projectedArc: Vector[] = [];
					for (const joint of arc.slice(1, arc.length - 1)) {
						const {x, y} = joint.value;
						projectedArc.push( // drop the endpoints and project it back
							tile.pos.plus(
								tile.east.times(x).plus(
									tile.north.times(y))));
					}
					if (edge.tileL === tile) // then save each part of the skeleton it to an edge
						edge.leftBoundCartesian = projectedArc;
					else
						edge.rightBoundCartesian = projectedArc;
					skeletonLeaf = arc[arc.length - 1]; // move onto the next one
				}
			}
		}
	}

	/**
	 * return a list of however many tiles are needed to populate this Surface, uniformly
	 * sampled from the Surface using the given random number generator.
	 */
	randomlySubdivide(rng: Random): Tile[] {
		// generate the tiles
		const tiles: Tile[] = []; // remember to clear the old tiles, if necessary
		for (let i = 0; i < Math.max(100, this.area/TILE_AREA); i ++) {
			const λ = rng.uniform(-Math.PI, Math.PI);
			const A = rng.uniform(0, this.cumulAreas[this.cumulAreas.length-1]);
			const φ = linterp(A, this.cumulAreas, this.refLatitudes);
			tiles.push(new Tile(i, {φ: φ, λ: λ}, this)); // push a bunch of new ones
		}
		return tiles;
	}

	/**
	 * return 2d arrays of x, y, z, and insolation.
	 */
	parameterize(resolution: number): {x: number[][], y: number[][], z: number[][], I: number[][]} {
		const φStart = Math.max(this.φMin, -Math.PI);
		const φEnd = Math.min(this.φMax, Math.PI);

		const n = 2*resolution, m = 4*resolution;
		const X = [], Y = [], Z = [], S = [];
		for (let i = 0; i <= n; i ++) {
			const φ = i/n*(φEnd - φStart) + φStart; // map i to the valid range for φ
			const s = this.insolation(φ);
			X.push([]);
			Y.push([]);
			Z.push([]);
			S.push([]);
			for (let j = 0; j <= m; j ++) {
				const λ = j/m*2*Math.PI; // I think λ always represents some [0, 2*pi) angle
				const {x, y, z} = this.xyz({φ: φ, λ: λ});
				X[i].push(x);
				Y[i].push(y);
				Z[i].push(z);
				S[i].push(s);
			}
		}
		return {x: X, y: Y, z: Z, I: S};
	}

	/**
	 * return the 2D parameterization corresponding to the given cartesian coordinates
	 */
	φλ(point: {x: number, y: number, z: number}): ΦΛPoint {
		return {
			φ: this.φ({r: Math.hypot(point.x, point.y), z: point.z}),
			λ: Math.atan2(point.x, -point.y)};
	}

	/**
	 * return the 3D cartesian coordinate vector corresponding to the given parameters
	 */
	xyz(place: ΦΛPoint): Vector {
		const {r, z} = this.rz(place.φ);
		return new Vector(r*Math.sin(place.λ), -r*Math.cos(place.λ), z);
	}

	/**
	 * return the normalized vector pointing outward at this location. the location may be assumed
	 * to be on this Surface.
	 * this implementation assumes this.axis = <0, 0, 1>.  make sure you overwrite it for any other axis.
	 */
	normal(place: ΦΛPoint): Vector {
		const tangent = this.tangent(place.φ);
		return new Vector(
			tangent.z*Math.sin(place.λ),
			-tangent.z*Math.cos(place.λ),
			-tangent.r);
	}

	/**
	 * return the normalized vector pointing along the meridian at this location. the location may be assumed
	 * to be on this Surface.
	 * this implementation assumes this.axis = <0, 0, 1>.  make sure you overwrite it for any other axis.
	 */
	north(place: ΦΛPoint): Vector {
		const tangent = this.tangent(place.φ);
		return new Vector(
			tangent.r*Math.sin(place.λ),
			-tangent.r*Math.cos(place.λ),
			tangent.z);
	}

	/**
	 * find the place where the given Edge hits the edge of this surface
	 */
	computeEdgeVertexLocation(_tileL: Tile, _tileR: Tile): {pos: Vector, coordinates: ΦΛPoint} {
		throw new Error("this surface doesn't have an edge.");
	}

	/**
	 * return a list of Delaunay nodes along with an associated list of triangles that
	 * completely cover this Surface. The mesh must never diverge from the surface farther
	 * than the radius of curvature.
	 */
	abstract partition(): {nodos: Tile[], triangles: Vertex[]};

	/**
	 * return the amount of solar radiation at a latitude, normalized to average to 1.
	 */
	abstract insolation(φ: number): number;

	/**
	 * whether the given latitude is nontropical
	 */
	abstract hasSeasons(φ: number): boolean;

	/**
	 * return the amount of moisture accumulation at a latitude, normalized to peak at 1.
	 */
	abstract windConvergence(φ: number): number;

	/**
	 * for the purposes of the orographic effect, return a dimensionless tangent velocity.
	 */
	abstract windVelocity(φ: number): {north: number, east: number};

	/**
	 * return the parametric latitude corresponding to the given cylindrical coordinates
	 */
	abstract φ(point: {r: number, z: number}): number;

	/**
	 * return the 2D cylindrical coordinate vector corresponding to the given parameters
	 */
	abstract rz(φ: number): {r: number, z: number};

	/**
	 * return the local cylindrical gradient (that is, dr/ds and dz/ds)
	 */
	abstract tangent(φ: number): {r: number, z: number};

	/**
	 * return the local length-to-latitude rate [km/rad]
	 */
	abstract ds_dφ(φ: number): number;

	/**
	 * orthodromic distance from A to B on the surface (it's okay if it's just
	 * an approximation).
	 */
	abstract distance(a: ΦΛPoint, b: ΦΛPoint): number;

	/**
	 * whether the point is exactly on the line between this surface's domain and oblivion
	 */
	abstract isOnEdge(place: ΦΛPoint): boolean;

	/**
	 * whether the curvature of this surface is globally 0
	 */
	abstract isFlat(): boolean;
}


/**
 * a Voronoi polygon, which contains geographical information.
 * equivalent to a Delaunay node.
 */
export class Tile {
	public readonly surface: Surface;
	public readonly index: number;
	public readonly φ: number;
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
	public arableArea: number;
	public passability: number;
	public plateIndex: number;
	public windVelocity: Vector;
	public downwind: Tile[];
	public flow: number;
	public flag: boolean;
	private area: number;
	public government: Civ | null;
	public culture: Culture | null;

	constructor(index: number, position: ΦΛPoint, surface: Surface) {
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
	leftOf(that: Tile): Vertex {
		if (!this.neighbors.has(that))
			throw new Error("the given Tile isn't even adjacent to this Vertex.");
		if (this.neighbors.get(that).tileL === this)
			return this.neighbors.get(that).vertex1;
		else
			return this.neighbors.get(that).vertex0;
	}

	/**
	 * return the Vertex which appears right of that from the point of view of this.
	 */
	rightOf(that: Tile): Vertex {
		if (!this.neighbors.has(that))
			throw new Error("the given Tile isn't even adjacent to this Vertex.");
		if (this.neighbors.get(that).tileL === this)
			return this.neighbors.get(that).vertex0;
		else
			return this.neighbors.get(that).vertex1;
	}

	isWater(): boolean {
		return this.biome === Biome.OCEAN || this.biome === Biome.LAKE || this.biome === Biome.SEA_ICE;
	}

	isSaltWater(): boolean {
		return this.biome === Biome.OCEAN || this.biome === Biome.SEA_ICE;
	}

	isIceCovered(): boolean {
		return this.biome === Biome.LAND_ICE || this.biome === Biome.SEA_ICE;
	}

	getArea(): number {
		if (this.area === null) {
			this.area = 0; // TODO: this underestimates the area of tiles on the edge (but who cares)
			for (const edge of this.neighbors.values()) {
				const a = this.pos;
				const b = edge.vertex0.pos;
				const c = edge.vertex1.pos;
				this.area += 1/2*Math.sqrt(b.minus(a).cross(c.minus(b)).sqr());
			}
		}
		return this.area;
	}

	/**
	 * calculate the population density of this Tile.
	 */
	getPopulationDensity(): number {
		if (this.government === null)
			return 0;
		else
			return POPULATION_DENSITY*this.government.technology*this.arableArea/this.getArea();
	}

	/**
	 * return an orderd list that goes around the Tile (widdershins, ofc).  each element
	 * of the list is a Voronoi Vertex and the edge that leads from it to the next one.
	 * if this Tile is on the edge of the Surface, the last element will have a null edge.
	 */
	getPolygon(): { vertex: Vertex, edge: Edge | null }[] {
		const output = [];
		let start: Tile;
		if (this.surface.edge.has(this)) // for Tiles on the edge, there is a natural starting point
			start = this.surface.edge.get(this).next;
		else // for internal Tiles start wherever
			start = this.neighbors.keys().next().value;

		// step around the Tile until you find either another edge or get back to where you started
		let tile: Tile | EmptySpace = start;
		let vertex = this.rightOf(tile as Tile);
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
	}
}


/**
 * a dummy value for where there would normally be a Tile but instead it's the edge of the flat earth
 */
export class EmptySpace {
	public readonly surface: Surface;

	constructor(surface: Surface) {
		this.surface = surface;
	}
}


/**
 * a Voronoi vertex, which exists at the intersection of three Tiles.
 * equivalent to a Delaunay triangle.
 */
export class Vertex {
	public φ: number;
	public λ: number;
	public tiles: (Tile | EmptySpace)[];
	public edges: (Edge | null)[];
	public neighbors: Map<Vertex, Edge>;
	public surface: Surface;
	/** location in 3D Cartesian */
	public pos: Vector;

	public height: number;
	public flow: number;
	public downstream: Vertex | Tile | EmptySpace | null;

	/**
	 * locate the confluence of the three given adjacent Tiles,
	 * such that we might put a Vertex there.
	 */
	static computeLocation(a: Tile, b: Tile, c: Tile): {pos: Vector, coordinates: ΦΛPoint} {
		const tileNormal = a.normal.plus(b.normal).plus(c.normal);
		const vertexNormal = b.pos.minus(a.pos).cross(c.pos.minus(a.pos));
		if (tileNormal.dot(vertexNormal) <= 0)
			throw new Error("Vertices must be instantiated facing outward, but this one was not.");

		// project all of the Delaunay vertices into the tangent plane
		const {u, v, n} = orthogonalBasis(tileNormal, true);
		const projectedVertices: {x: number, y: number, z: number}[] = [];
		for (const vertex of [a, b, c])
			projectedVertices.push({
				x: u.dot(vertex.pos),
				y: v.dot(vertex.pos),
				z: n.dot(vertex.pos)});
		// call the planar circumcenter function
		const {x, y} = circumcenter(projectedVertices);
		let z = 0;
		for (const projectedVertex of projectedVertices)
			z += projectedVertex.z/3;
		// put the resulting vector back in the global coordinate system
		const pos = u.times(x).plus(v.times(y)).plus(n.times(z));
		const coordinates = a.surface.φλ(pos); // finally, put it back in φ-λ space
		return {pos: pos, coordinates: coordinates};
	}

	/**
	 * build a new Vertex between three existing Tiles and automaticly construct the adjacent Edges
	 * @param a one of the adjacent Tiles
	 * @param b the adjacent Tile to the left of a (from the POV of this vertex)
	 * @param c the adjacent Tile to the left of b (from the POV of this vertex)
	 * @param pos the Cartesian coordinate vector (not needed if we're just using this for its network graph)
	 * @param coordinates the geographical coordinates (not needed if we're just using this for its network graph)
	 */
	constructor(a: Tile, b: Tile, c: Tile | EmptySpace, pos: Vector = null, coordinates: ΦΛPoint = null) {
		this.pos = pos;
		if (coordinates !== null) {
			this.φ = coordinates.φ;
			this.λ = coordinates.λ;
		}

		this.tiles = [a, b, c]; // adjacent tiles, ordered widdershins
		this.edges = [null, null, null]; // edges a-b, b-c, and c-a
		this.neighbors = new Map(); // connected vertices
		this.surface = a.surface;

		for (let i = 0; i < 3; i ++) { // check each non-empty pair to see if they are already connected
			const tileR = this.tiles[i], tileL = this.tiles[(i+1)%3];
			if (tileR instanceof Tile && tileL instanceof Tile) {
				if (tileR.neighbors.has(tileL)) { // if so,
					this.edges[i] = tileR.neighbors.get(tileL); // take that edge
					if (this.edges[i].tileL === tileL) // and depending on its direction,
						throw new Error("vertex 0 should already be set to the vertex on the other side."); // replace one of the Vertexes on it with this
					else
						this.edges[i].vertex1 = this;
				} else { // if not,
					this.edges[i] = new Edge(
						tileL, this, tileR, null, this.surface.distance(tileL, tileR)); // create an edge with the new Vertex connected to it
				}
			}
		}
	}

	/**
	 * Find and return the Edge that points from this Vertex directly away from this Tile.
	 */
	acrossFrom(tile: Tile | EmptySpace): Edge {
		for (const edge of this.neighbors.values())
			if (tile !== edge.tileL && tile !== edge.tileR)
				return edge;
		throw new Error("Could not find a nonadjacent vertex.");
	}

	/**
	 * Find and return the tile widershins of the given tile.
	 */
	widershinsOf(tile: Tile | EmptySpace): Tile | EmptySpace {
		for (let i = 0; i < 3; i ++)
			if (this.tiles[i] === tile)
				return this.tiles[(i+1)%3];
		throw new Error("This Vertex isn't even on this Tile.");
	}

	toString(): string {
		return `${(this.tiles[0] instanceof Tile) ? this.tiles[0].pos : 'void'}--` +
		       `${(this.tiles[1] instanceof Tile) ? this.tiles[1].pos : 'void'}--` +
		       `${(this.tiles[2] instanceof Tile) ? this.tiles[2].pos : 'void'}`;
	}
}


/**
 * A line between two connected Vertexes, separating two adjacent Tiles
 */
export class Edge {
	public readonly tileL: Tile;
	public readonly tileR: Tile;
	public vertex1: Vertex;
	public readonly vertex0: Vertex;

	public flow: number;

	/** distance between the centers of the Tiles this separates */
	private readonly distance: number;
	/** distance between the Vertices this connects */
	private length: number;
	/** these borders are the limits of the greebling */
	public rightBoundCartesian: Vector[];
	public leftBoundCartesian: Vector[];
	private bounds: XYPoint[];
	/** this number keeps of track of how much greebling we have resolved so far */
	private currentResolution: number;
	/** this Random number generator is used exclusively for greebling */
	private readonly rng: Random;
	/** this path can be resolved at a variety of scales */
	private readonly paths: {resolution: number, points: ΦΛPoint[]}[];
	private finestPathPointsInEdgeCoords: XYPoint[];

	/** the s unit-vector of this edge's coordinate system */
	private i: Vector;
	/** the t unit-vector of this edge's coordinate system */
	private j: Vector;

	constructor(tileL: Tile, vertex0: Vertex, tileR: Tile, vertex1: Vertex | null, distance: number) {
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
	getPath(resolution: number): ΦΛPoint[] {
		// you'll crash the browser if the resolution is too fine
		if (resolution < FINEST_RESOLUTION)
			throw new Error(`a resolution of ${resolution} is unacceptable`);
		// make sure the edge's coordinate system and boundary polygon (for the greebling) are set
		if (this.bounds === null)
			this.setCoordinatesAndBounds();

		// instantiate it with the coarsest path possible
		if (this.paths.length === 0) {
			if (this.vertex0 === null || this.vertex1 === null)
				throw new Error(`I cannot currently greeble paths that are on the edge of the map.`);
			this.paths.push({resolution: this.getLength(), points: [this.vertex0, this.vertex1]});
			this.finestPathPointsInEdgeCoords = [{x: 0, y: 0}, {x: this.getLength(), y: 0}];
			this.currentResolution = this.getLength();
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
				newPathPointsInGeoCoords.push(this.tileL.surface.φλ(this.fromEdgeCoords(newPathPointsInEdgeCoords[i])));
			newPathPointsInGeoCoords.push(this.vertex1);
			// save it to this.paths
			this.paths.push({resolution: this.currentResolution, points: newPathPointsInGeoCoords});
			this.finestPathPointsInEdgeCoords = newPathPointsInEdgeCoords;
		}

		// select the relevant path from the list and return
		const pathIndex = binarySearch(
			this.paths, (item) => item.resolution <= resolution);
		if (pathIndex === this.paths.length)
			throw new Error(`for some reason there was no suitably greebled path for ${resolution} even after we ` +
			                `greebled the paths to ${this.currentResolution}.`);
		else
			return this.paths[pathIndex].points;
	}

	/** distance between the Vertices this connects */
	getLength(): number {
		if (this.length === null)
			this.length = Math.sqrt(this.vertex0.pos.minus(this.vertex1.pos).sqr());
		return this.length;
	}

	/** distance between the centers of the Tiles this separates */
	getDistance(): number {
		return this.distance;
	}

	/** the (0, 0) point of this edge's coordinate system */
	origin(): Vector {
		return this.vertex0.pos;
	}

	/**
	 * do some setup stuff that only has to be done once, but has to be done after rightBound and leftBound have been set.
	 * after this function executes, this.origin, this.i, this.j, and this.bounds will all be established, and you may
	 * use toEdgeCoords and fromEdgeCoords.
	 */
	setCoordinatesAndBounds(): void {
		// compute its coordinate system
		const i = this.vertex1.pos.minus(this.origin()).over(this.getLength());
		const k = this.tileL.normal.plus(this.tileR.normal);
		let j = k.cross(i);
		j = j.over(Math.sqrt(j.sqr())); // make sure |i| == |j| == 1
		this.i = i;
		this.j = j;

		// convert the left and right bounding arcs to edge coordinates
		if (this.rightBoundCartesian === null || this.leftBoundCartesian === null)
			throw new Error("you can't get the greebled path until after the adjacent tiles' strait skeletons are set.");
		const leftBound = this.leftBoundCartesian.map(this.toEdgeCoords, this);
		const rightBound = this.rightBoundCartesian.map(this.toEdgeCoords, this);
		// concatenate them to form a complete bounding polygon
		this.bounds = [{x: 0., y: 0.}].concat(leftBound, [{x: this.getLength(), y: 0.}], rightBound);
	}

	/**
	 * transform a point from the global 3D coordinates into this edge's 2D coordinates, where
	 * x increases [0, this.getLength()] from vertex0 to vertex1, and y points perpendicularly across from right to left
	 */
	toEdgeCoords(point: Vector): XYPoint {
		if (this.i === null)
			throw new Error(`the coordinate system hasn't been set yet. don't call this function agen until after you've called setCoordinatesAndBounds().`);
		return {
			x: point.minus(this.origin()).dot(this.i)/this.i.sqr(),
			y: point.minus(this.origin()).dot(this.j)/this.j.sqr(),
		};
	}

	/**
	 * transform a point from this edge's 2D coordinates to the global 3D coordinates.
	 */
	fromEdgeCoords(point: XYPoint): Vector {
		if (this.i === null)
			throw new Error(`the coordinate system hasn't been set yet. don't call this function agen until after you've called setCoordinatesAndBounds().`);
		return this.origin().plus(this.i.times(point.x).plus(this.j.times(point.y)));
	}

	toString(): string {
		return `${this.tileL.pos}--${this.tileR.pos}`;
	}
}


/**
 * create some ordered loops of points that describe the boundary of these Tiles.
 * @param tiles Set of Tiles that are part of this group.
 * @return Array of loops, each loop being an Array of Vertexes or plain coordinate pairs.
 *         the first and last elements of each loop are the same iff the outline is a closed loop.
 */
export function outline(tiles: Tile[] | Set<Tile>): Vertex[][] {
	const tileSet = new Set(tiles);
	const accountedFor = new Set(); // keep track of which Edges have been done
	const output: Vertex[][] = [];
	for (let inTile of tileSet) { // look at every included tile
		for (let outTile of inTile.neighbors.keys()) { // and every tile adjacent to an included one
			if (tileSet.has(outTile))
				continue; // (we only care if that adjacent tile is excluded)
			const startingEdge = inTile.neighbors.get(outTile); // the edge between them defines the start of the loop
			if (accountedFor.has(startingEdge))
				continue; // (and can ignore edges we've already hit)

			const currentLoop: Vertex[][] = []; // if we've found a new edge, start going around it
			let currentSection: Vertex[] = [inTile.rightOf(outTile)]; // keep track of each continuus section of this loop

			do {
				const edge = inTile.neighbors.get(outTile); // pick out the edge between them
				accountedFor.add(edge); // check this edge off

				const vertex = inTile.leftOf(outTile); // look for the next Vertex, going widdershins

				// add the next Vertex to the complete Path
				currentSection.push(vertex);

				// now, advance to the next Tile(s)
				const nextTile = vertex.widershinsOf(outTile);
				if (nextTile instanceof EmptySpace) {
					// if there isn't one after this Vertex, break off this section
					currentLoop.push(currentSection);
					// shimmy outTile around the internal portion of the edge
					outTile = inTile;
					let i = 0;
					do {
						outTile = outTile.surface.edge.get(outTile).next;
						i ++;
					} while (tileSet.has(outTile)); // until it becomes external again
					inTile = outTile.surface.edge.get(outTile).prev; // then, grab the new inTile
					// start a new section in the same loop on this side of the gap
					currentSection = [inTile.rightOf(outTile)];
				}
				else if (tileSet.has(nextTile)) // if there is and it's in, make it the new inTile
					inTile = nextTile;
				else // if there is and it's out, make it the new outTile
					outTile = nextTile;

				if (output.length >= 100000)
					throw new Error(`something went wrong why does this polygon have ${output.length} vertices?`);

			} while (inTile.neighbors.get(outTile) !== startingEdge); // continue until you go all the outTile around this loop

			// concatenate the first and last sections
			if (currentLoop.length > 0) {
				currentLoop[0] = currentSection.concat(currentLoop[0].slice(1));
				output.push(...currentLoop); // and save all sections to the output
			}
			else {
				output.push(currentSection);
			}
		}
	}

	return output;
}
