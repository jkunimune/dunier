/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {orthogonalBasis, Vector} from "./geometry.js";

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
export function delaunayTriangulate(points: Vector[],
									normals = [new Vector(0, 0, 1)],
									sample: Vector[] = [],
									sampleNormals = [new Vector(0, 0, 1)],
									partition: number[][] = []
): {triangles: number[][], parentage: number[][], between: number[][][]} {
	if (points.length === 0)
		return {triangles: [], parentage: [], between: []};

	if (partition.length === 0) { // start by creating a partition if we have none
		let xMax = -Infinity, xMin = Infinity;
		let yMax = -Infinity, yMin = Infinity;
		for (let i = 0; i < points.length; i ++) {
			if (points[i].z !== 0) // assert that it is in fact a plane (remove this if I ever need to implement for not a plane)
				throw new Error("me yexo no bina autonomi fene da no plate.");
			if (points[i].x > xMax) xMax = points[i].x; // and get the bounding box in the x-y plane
			if (points[i].x < xMin) xMin = points[i].x;
			if (points[i].y > yMax) yMax = points[i].y;
			if (points[i].y < yMin) yMin = points[i].y;
		}
		sample = [
			new Vector(2*xMin - xMax, 2*yMin - yMax, 0), // set the sample to the corners of the bounding boxen
			new Vector(2*xMax - xMin, 2*yMin - yMax, 0),
			new Vector(2*xMax - xMin, 2*yMax - yMin, 0),
			new Vector(2*xMin - xMax, 2*yMax - yMin, 0),
		];
		partition = [[0, 1, 2], [2, 3, 0]]; // and triangulate it trivially
	}

	const nodos: DelaunayNodo[] = []; // convert the primitive inputs into our own object formats
	for (let i = 0; i < sample.length; i ++)
		nodos.push(new DelaunayNodo(i - sample.length, sample[i], sampleNormals[i%sampleNormals.length]));
	const partitionTriangles = partition.map((t: number[]) =>
		new DelaunayTriangle(nodos[t[0]], true, nodos[t[1]], true, nodos[t[2]], true));

	const triangles = partitionTriangles.slice(); // then set up the full triangle array
	for (let i = 0; i < points.length; i ++)
		nodos.push(new DelaunayNodo(i, points[i], normals[i%normals.length])); // and make the actual nodos

	for (const node of nodos.slice(sample.length)) { // for each node,
		const containing = findSmallestEncompassing(node, partitionTriangles); // find out which triangle it's in
		containing.children = [];
		for (let j = 0; j < 3; j ++) { // add the three new child triangles
			containing.children.push(new DelaunayTriangle(
				node, true,
				containing.nodos[j], false,
				containing.nodos[(j + 1) % 3], true,
			));
		}
		triangles.push(...containing.children); // add them to the master list
		containing.enabled = false; // we could remove containing from triangles now, but it would be a waste of time
		const flipQueue = []; // start a list of edges to try flipping
		for (let i = 0; i < 3; i ++)
			flipQueue.push(new DelaunayEdge(containing.nodos[i], containing.nodos[(i+1)%3])); // and put the edges of this triangle on it
		const flipHistory = flipEdges(flipQueue, triangles, [], node); // do the flipping thing
		node.parents = [];
		for (const triangle of node.triangles) { // its parentage is all currently connected non-dummy nodes
			if (triangle.enabled && widershinsOf(node, triangle).i >= 0)
				node.parents.push(widershinsOf(node, triangle));
		}
		for (const edge of flipHistory) { // keep track of the edges that this node flipped; it is "between" those endpoints
			if (edge.a.i >= 0 && edge.b.i >= 0)
				node.between.push([edge.a, edge.b]);
		}
	}

	for (const node of nodos.slice(0, sample.length)) // now remove the partition vertices
		triangles.push(...removeNode(node));
	for (const triangle of triangles)
		if (triangle.enabled)
			for (const nodo of triangle.nodos)
				console.assert(nodo.i >= 0, triangle, points);

	// finally, convert to built-in types
	const triangleIdx = triangles.filter((t: DelaunayTriangle) => t.enabled)
		.map((t: DelaunayTriangle) => t.nodos.map((n: DelaunayNodo) => n.i));
	const parentIdx = nodos.filter((n: DelaunayNodo) => n.i >= 0)
		.map((n: DelaunayNodo) => n.parents.map((n: DelaunayNodo) => n.i));
	const betweenIdx = nodos.filter((n: DelaunayNodo) => n.i >= 0)
		.map((n: DelaunayNodo) => n.between.map((ns: DelaunayNodo[]) => [ns[0].i, ns[1].i]));
	return {triangles: triangleIdx, parentage: parentIdx, between: betweenIdx}; // convert all to indices and return
}

/**
 * remove all Triangles and Edges connected to the given node, and return a list of new
 * Triangles between the surrounding nodes to replace them.
 * @param node the dummy node to be removed
 * @return array of new Triangles
 */
function removeNode(node: DelaunayNodo): DelaunayTriangle[] {
	const allOldTriangles = [...node.triangles].filter((t: DelaunayTriangle) => t.enabled);
	if (allOldTriangles.length === 0)
		throw new Error("this triangle doesn't seem to be _in_ the network.  like… it makes my job easier but I don't think that should be possible.");
	const oldTriangles: DelaunayTriangle[] = [allOldTriangles[0]]; // starting with an arbitrary neighboring triangle
	while (true) { // trace the graph to find the surrounding triangles in widershins order
		let prev = oldTriangles[oldTriangles.length - 1];
		let med = clockwiseOf(node, prev);
		let next;
		try {
			next = triangleOf(node, med);
		} catch {
			next = null;
		}

		if (next === null) { // if you come up short,
			while (true) { // do the same thing in the other direction
				let prev = oldTriangles[0];
				let med = widershinsOf(node, prev);
				let next;
				try {
					next = triangleOf(med, node);
				} catch {
					next = null;
				}

				if (next === null)
					break;
				else
					oldTriangles.splice(0, 0, next);
			}
			return removeNodeHull(node, oldTriangles); // and call the exterior node function
		}

		else if (next === oldTriangles[0]) // otherwise go until you get back to whence you started
			break;
		else
			oldTriangles.push(next);
	}
	return removeNodeInterior(node, oldTriangles); // and then call the embedded node function
}

/**
 * remove all Triangles and Edges connected to the given interior node, given the Triangles that completely surround it.
 * @param node the dummy node to be removed
 * @param surroundings all triangles connected to node to be destroyed, in widershins order
 */
function removeNodeInterior(node: DelaunayNodo, surroundings: DelaunayTriangle[]): DelaunayTriangle[] {
	const newTriangles: DelaunayTriangle[] = [];
	const flipQueue: DelaunayEdge[] = [], flipImmune: DelaunayEdge[] = [];
	arbitrationLoop:
		for (let i0 = 0; i0 < surroundings.length; i0 ++) { // we have to pick an arbitrary border node to start this process
			const a = clockwiseOf(node, surroundings[i0]); // choosing i0 is harder than it may seem if we want to avoid coincident triangles
			for (let j = 2; j < surroundings.length-1; j ++) { // run through all the edges we're going to make
				const c = clockwiseOf(node, surroundings[(i0 + j)%surroundings.length]);
				if (isAdjacentTo(a, c)) // and check if any of them already exist
					continue arbitrationLoop; // if so, try a different start
			}
			for (let j = 0; j < surroundings.length; j ++) { // begin fixing the gap left by this null node
				const b = widershinsOf(node, surroundings[(i0 + j)%surroundings.length]);
				const c = clockwiseOf(node, surroundings[(i0 + j)%surroundings.length]);
				surroundings[j].enabled = false; // by disabling the triangles that used to fill it
				if (j >= 2)
					newTriangles.push(new DelaunayTriangle(a, true, b, false, c, true)); // and filling it with new, naively placed triangles
				if (j >= 2 && j < surroundings.length-1)
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
function removeNodeHull(node: DelaunayNodo, neighbors: DelaunayTriangle[]): DelaunayTriangle[] {
	const newTriangles: DelaunayTriangle[] = [];
	const flipQueue: DelaunayEdge[] = [];
	for (let i = neighbors.length-1; i > 0; i --) { // for each edge connected to node
		const a = widershinsOf(node, neighbors[i-1]); // consider what would happen if you flipped it
		const b = clockwiseOf(node, neighbors[i-1]);
		const c = clockwiseOf(node, neighbors[i]);
		const [ap, bp, cp] = flatten(a, b, c); // project their positions into the normal plane
		if (isRightSideOut(ap, bp, cp)) { // if the resulting triangle could be considered a triangle by the weakest possible definition
			neighbors[i-1].enabled = neighbors[i].enabled = false; // flip it
			neighbors.splice(i - 1, 1, new DelaunayTriangle(c, false, node, false, a, false)); // you get a new triangle in neighbors
			newTriangles.push(new DelaunayTriangle(a, false, b, false, c, false)); // and a new triangle in newTriangles
			flipQueue.push(new DelaunayEdge(a, c));
		}
	}
	for (const triangle of node.triangles) // make sure these are all gone
		triangle.enabled = false;
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
export function flipEdges(queue: DelaunayEdge[], triangles: DelaunayTriangle[],
						  immune: DelaunayEdge[] = [], newestNode: DelaunayNodo = null): DelaunayEdge[] {
	const flipped: DelaunayEdge[] = [];

	while (queue.length > 0) { // go through that queue
		const edge = queue.pop(); // extract the needed geometric entities
		const a = edge.a;
		const c = edge.b;
		let abc = null, cda = null;
		try { // be careful when getting the hypothetical cross edge
			abc = triangleOf(c, a);
			cda = triangleOf(a, c);
		} catch { // if you can't find a triangle on one side or the other
			continue; // it might mean you've hit the end of the partition (I'm sure it's fine)
		}
		const b = widershinsOf(a, abc);
		const d = widershinsOf(c, cda);

		const [ap, bp, cp, dp] = flatten(a, b, c, d); // project their positions into the normal plane
		if (!isDelaunay(ap, bp, cp, dp)) { // and check for non-Delaunay edges
			abc.children = cda.children = [
				new DelaunayTriangle(b, false, c, false, d, true), // if it is so, assign the old triangles new children
				new DelaunayTriangle(d, false, a, false, b, true),
			];
			triangles.push(...abc.children); // add the new ones to the master list
			abc.enabled = cda.enabled = false; // remove the old ones
			flipped.push(new DelaunayEdge(a, c)); // record this
			immune.push(new DelaunayEdge(a, c));
			const perimeter = [new DelaunayEdge(a, b), new DelaunayEdge(b, c), new DelaunayEdge(c, d), new DelaunayEdge(d, a)];
			addToQueueLoop:
				for (const nextEdge of perimeter) { // and add the neighbors to the queue
					for (const safeEdge of queue.concat(immune))
						if (nextEdge.a === safeEdge.a && nextEdge.b === safeEdge.b)
							continue addToQueueLoop; // taking care to skip edges that have already been flipped
					if (nextEdge.a === newestNode || nextEdge.b === newestNode)
						continue;
					queue.push(nextEdge);
				}
		}
	}

	return flipped;
}

/**
 * Average the normal vectors of the given nodes and project them into the plane perpendicular to that normal.
 */
export function flatten(...nodes: DelaunayNodo[]) {
	let n = new Vector(0, 0, 0);
	for (const node of nodes)
		n = n.plus(node.n);
	const {u, v} = orthogonalBasis(n, true);
	const projected = [];
	for (const node of nodes)
		projected.push({x: node.r.dot(u), y: node.r.dot(v)});
	return projected;
}

/**
 * Check whether a--c is a Delaunay edge in 2D given the existence of b and d
 */
function isDelaunay(a: {x: number, y: number}, b: {x: number, y: number},
					c: {x: number, y: number}, d: {x: number, y: number}): boolean {
	const mat = [
		[a.x - d.x, a.y - d.y, a.x*a.x + a.y*a.y - d.x*d.x - d.y*d.y],
		[b.x - d.x, b.y - d.y, b.x*b.x + b.y*b.y - d.x*d.x - d.y*d.y],
		[c.x - d.x, c.y - d.y, c.x*c.x + c.y*c.y - d.x*d.x - d.y*d.y],
	];
	let det = 0;
	for (let i = 0; i < 3; i ++) {
		det = det +
			mat[0][ i     ] * mat[1][(i+1)%3] * mat[2][(i+2)%3] -
			mat[0][(i+2)%3] * mat[1][(i+1)%3] * mat[2][ i     ];
	}
	return det < 0;
}

/**
 * Check whether a--b--c is a right-side-out triangle (return false if it's within machine precision of colinearity)
 */
function isRightSideOut(a: {x: number, y: number}, b: {x: number, y: number}, c: {x: number, y: number}): boolean {
	return a.x*(b.y - c.y) + b.x*(c.y - a.y) + c.x*(a.y - b.y) > 1e-14*(a.x**2 + a.y**2);
}

/**
 * go down the chain of triangles to find the one that contains this point
 * @param node the node being encompassed
 * @param triangles the top-level list of triangles in which to search
 */
function findSmallestEncompassing(node: DelaunayNodo, triangles: DelaunayTriangle[]): DelaunayTriangle {
	let bestTriangle: DelaunayTriangle = null;
	let bestDistance: number = Infinity;
	// iterate thru all triangles
	for (const triangle of triangles) {
		// find one that contains this node
		if (contains(triangle, node)) {
			const d2 = distanceSqr(triangle, node); // we need to check the distance in case there are multiple candies
			if (d2 < bestDistance)
				[bestDistance, bestTriangle] = [d2, triangle];
		}
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
function contains(triangle: DelaunayTriangle, p: DelaunayNodo): boolean {
	// check alignment on the surface
	const totalNormal = triangle.nodos[0].n.plus(triangle.nodos[1].n).plus(triangle.nodos[2].n);
	if (p.n.dot(totalNormal) < 0)
		return false;
	// check each side condition
	for (let i = 0; i < 3; i ++) {
		if (!triangle.siblingFacingEdges[i])
			continue; // but don't check any external edges (these have effectively already been checked and it would be unfortunate if we checked it again and got a different anser)
		const a = triangle.nodos[i];
		const na = a.n;
		const b = triangle.nodos[(i+1)%3];
		const nb = b.n;
		const edgeDirection = b.r.minus(a.r);
		const normalDirection = na.plus(nb);
		const boundDirection = normalDirection.cross(edgeDirection);
		const relativePos = (a.i < b.i) ? p.r.minus(a.r) : p.r.minus(b.r);
		if (boundDirection.dot(relativePos) < 0)
			return false;
	}
	return true;
}

/**
 * compute the square of the minimum distance from this triangle to this Nodo.
 */
function distanceSqr(triangle: DelaunayTriangle, p: DelaunayNodo): number {
	for (let i = 0; i < 3; i ++) { // for each edge
		const [a, b, c] = [triangle.nodos[i%3], triangle.nodos[(i+1)%3], triangle.nodos[(i+2)%3]];
		const u = b.r.minus(a.r); // throw together some quick orthogonal aligned with each edge
		const v = triangle.n.cross(u);
		const t = v.dot(p.r.minus(a.r)); // project onto the perpendicular plane
		if (t < 0) { // if it lands outside the triangle
			const s = u.dot(p.r.minus(a.r)); // project onto the edge plane
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
				return p.r.minus(a.r).sqr() - u.dot(p.r.minus(a.r))**2/u.sqr(); // compute the point-line distance
		}
	}
	return Math.pow(p.r.minus(triangle.nodos[0].r).dot(triangle.n), 2)/triangle.n.sqr(); // compute the point-plane distance
}

/**
 * find the Nodo that appears after node on this triangle.
 */
function widershinsOf(node: DelaunayNodo, triangle: DelaunayTriangle) {
	for (let i = 0; i < 3; i ++)
		if (triangle.nodos[i] === node)
			return triangle.nodos[(i+1)%3];
	throw new Error("This node isn't even in this triangle.");
}

/**
 * find the Nodo that appears previous to node on this triangle.
 */
function clockwiseOf(node: DelaunayNodo, triangle: DelaunayTriangle) {
	for (let i = 0; i < 3; i ++)
		if (triangle.nodos[i] === node)
			return triangle.nodos[(i+2)%3];
	throw new Error("This node isn't even in this triangle.");
}

/**
 * find the Triangle that has these two Nodes in this order
 */
function triangleOf(a: DelaunayNodo, b: DelaunayNodo) {
	for (const triangle of a.triangles)
		if (triangle.enabled && widershinsOf(a, triangle) === b)
			return triangle;
	throw new Error("these nodes don't appear to have a triangle");
}

/**
 * is there an edge between these two nodes?
 */
function isAdjacentTo(a: DelaunayNodo, b: DelaunayNodo) {
	for (const triangle of a.triangles)
		if (triangle.enabled && b.triangles.has(triangle))
			return true;
	return false;
}

/**
 * a delaunay node (voronoi polygon)
 */
export class DelaunayNodo {
	/** index */
	public i: number;
	/** position */
	public r: Vector;
	/** normal vector */
	public n: Vector;
	/** attached triangles */
	public triangles: Set<DelaunayTriangle>;
	/** parent nodes */
	public parents: DelaunayNodo[];
	/** parent nodes it separates */
	public between: DelaunayNodo[][];

	constructor(i: number, r: Vector, n: Vector) {
		this.i = i;
		this.r = r;
		this.n = n;
		this.triangles = new Set();
		this.parents = [];
		this.between = [];
	}
}

/**
 * a delaunay triangle (voronoi vertex)
 */
class DelaunayTriangle {
	/** the three nodes that form its vertices */
	public readonly nodos: DelaunayNodo[];
	/** any triangles that came after this one and overlap it at all */
	public children: DelaunayTriangle[];
	/** whether this is part of the current triangulation (setting this to false is easier than removing it from the list) */
	public enabled: boolean;
	/** the triangle's normal vector */
	public readonly n: Vector;
	/** whether each edge borders triangles that share a parent (edge 0 is between nodes 0 and 1, edge 1 is between nodes 1 and 2, etc.) */
	public siblingFacingEdges: boolean[];

	constructor(a: DelaunayNodo, abFacesSibling: boolean, b: DelaunayNodo, bcFacesSibling: boolean, c: DelaunayNodo, acFacesSibling: boolean) {
		this.nodos = [a, b, c];
		this.siblingFacingEdges = [abFacesSibling, bcFacesSibling, acFacesSibling];
		this.children = null;
		this.enabled = true;
		for (const v of this.nodos)
			v.triangles.add(this);
		this.n = b.r.minus(a.r).cross(c.r.minus(a.r));
	}
}

/**
 * a delaunay edge, connecting two nodes and two triangles
 */
class DelaunayEdge {
	public a: DelaunayNodo;
	public b: DelaunayNodo;

	constructor(a: DelaunayNodo, b: DelaunayNodo) {
		this.a = (a.i < b.i) ? a : b; // set up the order so a always has the lower index
		this.b = (a.i < b.i) ? b : a;
	}
}
