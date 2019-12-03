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

		const flipQueue = []; // start a list of edges to try flipping
		flipQueue.concat(containing.edges); // and put the edges of this triangle on it

		while (flipQueue.length > 0) { // go through that queue
			let edge = flipQueue.pop();
			if (false) { // and check for non-Delaunay edges
				const newTriangles = edge.flip(); // flip them
				triangles.concat(newTriangles);
				flipQueue.push(null); // and add their neighbors to the queue
			}
		}
	}

	const splitQueue = [];
	for (const dummyNode of dummyNodes) { // now remove the original vertices
		console.log(`Removing all triangles neighboring ${dummyNode}.`);
		splitQueue.push(dummyNode.neighbors.keys());
		for (const dummyEdge of dummyNode.neighbors.values()) {
			// print(dummyEdge);
			for (let i = 0; i < triangles.length; i ++) {
				if (triangles[i] == dummyEdge.triangleL || triangles[i] == dummyEdge.triangleR) {
					triangles.splice(i, 1);
					// console.log(`Goodbye, ${dummyEdge.triangleL}`);
				}
			}
		}
	}
	// TODO: recursively split the polygons in splitQueue with Delaunay edges

	surf.triangles = triangles.filter(t => t.children == null); // _now_ remove the extraneous triangles
} // TODO: delete the triangle lineage graph to clear up some memory

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
