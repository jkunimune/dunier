// utils.js: some mathy methods that need not clutter up the other files
'use strict';

/**
 * second Legendre polynomial.
 */
function legendreP2(y) {
	return (3*y*y - 1)/2;
}

/**
 * second Legendre polynomial.
 */
function legendreP4(y) {
	return ((35*y*y - 30)*y*y + 3)/8;
}

/**
 * second Legendre polynomial.
 */
function legendreP6(y) {
	return (((231*y*y - 315)*y*y + 105)*y*y - 5)/16;
}

/**
 * linearly interpolate x from the sorted function X onto the corresponding output Y.
 */
function linterp(x, X, Y) {
	if (X.length !== Y.length)
		throw "array lengths must match";

	let min = 0, max = X.length - 1;
	while (max - min > 1) {
		const mid = Math.trunc((min + max)/2);
		if (X[mid] <= x)
			min = mid;
		else
			max = mid;
	}

	return (x - X[min])/(X[max] - X[min])*(Y[max] - Y[min]) + Y[min];
}

/**
 * combine the two arrays and remove duplicates.
 */
function union(a, b) {
	a = [...a];
	b = [...b];
	return a.concat(b.filter(e => !a.includes(e)));
}

/**
 * set the triangles attribute of the surface, and set up all the Edges and references
 * and stuff
 */
function delaunayTriangulate(surf) {
	const [dummyNodes, partition] = surf.partition(); // load up a top-level set of triangles
	const triangles = partition.slice(); // hold onto that list and make a copy

	for (const node of surf.nodes) { // for each node,
		const containing = findSmallestEncompassing(node, partition, surf); // find out which triangle it's in
		for (let j = 0; j < 3; j ++) { // add the three new child triangles
			triangles.push(new Triangle(
				node,
				containing.vertices[j],
				containing.vertices[(j+1)%3]));
		}
		containing.children = triangles.slice(triangles.length-3); // we could remove containing from triangles now, but it would be a waste of time

		const flipQueue = [...containing.edges]; // start a list of edges to try flipping
		const flipHistory = flipEdges(flipQueue, [], node, triangles); // and put the edges of this triangle on it
		node.parents = [];
		for (const currentNeighbor of node.neighbors.keys()) { // its parentage is all currently connected non-dummy nodes
			if (currentNeighbor.index !== null)
				node.parents.push(currentNeighbor); // so just filter node.adjacent
		}
		node.between = [];
		for (const edge of flipHistory) // store the edges that were flipped; this node is "between" those pairs of nodes
			if (edge.node0.index != null && edge.node1.index != null)
				node.between.push([edge.node0, edge.node1]);
	}

	for (const dummyNode of dummyNodes) { // now remove the original vertices
		triangles.push(...removeNode(dummyNode));
	}

	surf.triangles = triangles.filter(tri => tri.children == null); // _now_ remove the extraneous triangles
} // TODO: delete the triangle lineage graph to clear up some memory

/**
 * remove all Triangles and Edges connected to the given node, and return a list of new
 * Triangles between the surrounding nodes to replace them.
 * @param node the dummy node to be removed
 */
function removeNode(node) {
	const oldTriangles = node.getPolygon();
	let newTriangles, newEdges, flipQueue, flipImmune;
	arbitrationLoop:
	for (let i0 = 0; i0 < oldTriangles.length; i0 ++) { // we have to pick an arbitrary border node to start this process
		newEdges = [];
		newTriangles = [];
		flipQueue = [];
		flipImmune = [];
		const a = oldTriangles[i0].clockwiseOf(node); // choosing i0 is harder than it may seem if we want to avoid coincident triangles
		for (let j = 0; j < oldTriangles.length; j ++) { // begin filling the gap left by this null node
			const b = oldTriangles[(i0 + j)%oldTriangles.length].widershinsOf(node); // with new, naively placed triangles
			const c = oldTriangles[(i0 + j)%oldTriangles.length].clockwiseOf(node);
			if (a.inTriangleWith(c, b)) { // in the unlikely event i0 was a bad choice,
				for (const badEdge of newEdges)
					badEdge.seppuku(); // undo our mistakes
				continue arbitrationLoop; // try a different one
			}
			if (j >= 2) // otherwise
				newTriangles.push(new Triangle(a, b, c)); // proceed with the new triangle
			if (j >= 3) {
				newEdges.push(a.neighbors.get(b));
				flipQueue.push(a.neighbors.get(b));
			}
			flipImmune.push(b.neighbors.get(c));
			oldTriangles[j].children = []; // and effectively remove the old triangles
		} // if you make it to the end of the for loop, then arbitrary was a fine choice
		break; // and we can proceed
	}

	flipEdges(flipQueue, flipImmune, null, newTriangles);
	for (const witness of node.neighbors.values())
		witness.seppuku(); // remove all remaining references to this node. it never existed. take care of anyone who says otherwise.

	return newTriangles;
}

/**
 * Go through the queue and flip any non-delaunay edges. After flipping an edge, add
 * adjacent edges to the queue. Do not check edges that have newestNode as an endpoint or
 * that are in immune. allTriangles is the running list of all triangles that must be
 * kept up to date.
 * @return Array of Edges that were flipped
 */
function flipEdges(queue, immune, newestNode, allTriangles) {
	const flipped = [];

	while (queue.length > 0) { // go through that queue
		const edge = queue.pop(); // extract the needed geometric entities
		const abc = edge.triangleR;
		const cda = edge.triangleL;
		const a = edge.node0;
		const b = abc.acrossFrom(edge);
		const c = edge.node1;
		const d = cda.acrossFrom(edge);
		const ac = a.neighbors.get(c);

		const nHat = a.getNormal().plus(b.getNormal()).plus(c.getNormal()).plus(d.getNormal());
		const vHat = nHat.cross(new Vector(0, 0, -1)).norm();
		const uHat = nHat.cross(vHat).norm();
		const ap = {x: a.pos.dot(vHat), y: a.pos.dot(uHat)}; // project them into the normal plane
		const bp = {x: b.pos.dot(vHat), y: b.pos.dot(uHat)};
		const cp = {x: c.pos.dot(vHat), y: c.pos.dot(uHat)};
		const dp = {x: d.pos.dot(vHat), y: d.pos.dot(uHat)};
		if (!isDelaunay(ap, bp, cp, dp)) { // and check for non-Delaunay edges
			ac.seppuku(); // flip them! (remove the old edge)
			allTriangles.push(new Triangle(b, c, d)); // (and add new triangles)
			allTriangles.push(new Triangle(d, a, b));
			abc.children = cda.children = allTriangles.slice(allTriangles.length-2); // (the old triangles can stick around for now)
			flipped.push(ac); // record this
			const perimeter = [a.neighbors.get(b), b.neighbors.get(c), c.neighbors.get(d), d.neighbors.get(a)];
			for (const nextEdge of perimeter) // and add the neighbors to the queue
				if (!queue.includes(nextEdge) &&
					!immune.includes(nextEdge) &&
					(nextEdge.node0 !== newestNode && nextEdge.node1 !== newestNode)) { // taking care to skip edges that have already been flipped
					queue.push(nextEdge);
			}
		}
	}

	return flipped;
}

/**
 * Check whether a--c is a Delaunay edge in 2D given the existence of b and d
 */
function isDelaunay(a, b, c, d) {
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
	return det <= 0;
}

/**
 * go down the chain of triangles to find the one that contains this point
 */
function findSmallestEncompassing(node, partition, surf) {
	for (const triangle of partition) {
		if (triangle.contains(node)) {
			// console.log(`${triangle} si indu ${node}.`);
			// console.log(triangle.children)
			if (triangle.children == null)
				return triangle;
			else
				return findSmallestEncompassing(node, triangle.children, surf);
		}
		// else
		// 	console.log(`${triangle} no indu ${node}.`);
	}
	throw "no eureka tinogon da indu.";
}
