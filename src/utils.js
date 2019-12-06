// utils.js: some mathy methods that need not clutter up the other files
'use strict';

/**
 * set the triangles attribute of the surface, and set up all the Edges and references
 * and stuff
 */
function delaunayTriangulate(surf) {
	const [dummyNodes, partition] = surf.partition(); // load up a top-level set of triangles
	const triangles = partition.slice(); // hold onto that list and make a copy

	for (const node of surf.nodes) { // for each node,
		const containing = findSmallestEncompassing(node, partition, surf); // find out which triangle it's in
		node.parents = containing.vertices; // that is its parent triangle
		for (let j = 0; j < 3; j ++) { // add the three new child triangles
			triangles.push(new Triangle(
				node,
				containing.vertices[j],
				containing.vertices[(j+1)%3]));
		}
		containing.children = triangles.slice(triangles.length-3); // we could remove containing from triangles now, but it would be a waste of time
		node.parent = containing.vertices[Math.trunc(3*Math.random())];

		const flipQueue = [...containing.edges]; // start a list of edges to try flipping
		flipEdges(flipQueue, [], node, triangles); // and put the edges of this triangle on it
	}

	for (const dummyNode of dummyNodes) { // now remove the original vertices
		const oldTriangles = dummyNode.getPolygon();
		const arbitraryNode = oldTriangles[0].clockwiseOf(dummyNode);
		const flipQueue = [];
		const flipImmune = [];
		for (let j = 0; j < oldTriangles.length; j ++) { // start by filling the gap left by this node
			const b = oldTriangles[j].widdershinsOf(dummyNode);
			const c = oldTriangles[j].clockwiseOf(dummyNode);
			if (j >= 2)
				triangles.push(new Triangle(arbitraryNode, b, c)); // with new, naively placed triangles
			if (j >= 3)
				flipQueue.push(arbitraryNode.neighbors.get(b));
			flipImmune.push(b.neighbors.get(c));
			oldTriangles[j].children = []; // and remove the old triangles
		}
		flipEdges(flipQueue, flipImmune, null, triangles);
	}
	// TODO: recursively split the polygons in splitQueue with Delaunay edges

	surf.triangles = triangles.filter(t => t.children == null); // _now_ remove the extraneous triangles
} // TODO: delete the triangle lineage graph to clear up some memory

/**
 * Go through the queue and flip any non-delaunay edges. After flipping an edge, add
 * adjacent edges to the queue. Do not check edges that have newestNode as an endpoint or
 * that are in immune. allTriangles is the running list of all triangles that must be
 * kept up to date.
 */
function flipEdges(queue, immune, newestNode, allTriangles) {
	while (queue.length > 0) { // go through that queue
		const edge = queue.pop(); // extract the needed geometric entities
		const a = edge.node0, c = edge.node1;
		const abc = edge.triangleR, cda = edge.triangleL;
		const b = abc.acrossFrom(edge);
		const d = cda.acrossFrom(edge);
		const o = abc.getCircumcenter();
		if (d.pos.minus(o).sqr() < a.pos.minus(o).sqr()) { // and check for non-Delaunay edges
			a.neighbors.delete(c); // flip them!
			c.neighbors.delete(a); // (remove the old edge)
			allTriangles.push(new Triangle(b, c, d)); // (and add new triangles)
			allTriangles.push(new Triangle(d, a, b));
			abc.children = cda.children = allTriangles.slice(allTriangles.length-2); // (the old triangles can stick around for now)
			const perimeter = [a.neighbors.get(b), b.neighbors.get(c), c.neighbors.get(d), d.neighbors.get(a)];
			for (const nextEdge of perimeter) // and add their neighbors to the queue
				if (!queue.includes(nextEdge) &&
					!immune.includes(nextEdge) &&
					(nextEdge.node0 != newestNode && nextEdge.node1 != newestNode)) { // taking care to skip edges that have already been flipped
					queue.push(nextEdge);
			}
		}
	}
}

/**
 * go down the chain of triangles to find the one that contains this point
 */
function findSmallestEncompassing(node, partition, surf) {
	for (const triangle of partition) {
		if (surf.encompassing(triangle, node)) {
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
	throw "no eureka tingon da indu.";
}
