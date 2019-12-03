// surface.js: defines the geometric classes
'use strict';


/**
 * Generic 3D collection of nodes and edges
 */
class Surface {
	constructor() {
		this.nodes = [];
		this.triangles = [];
	}

	/**
	 * Fill this.nodes with random nodes, spaced via numLloyd iterations of Lloyd
	 * relaxation
	 */
	populate(numNodes, numLloyd) {
		for (let i = 0; i < numNodes; i ++)
			this.nodes.push(new Node(i, this.randomPoint(), this));

		delaunayTriangulate(this);

		// for (let j = 0; j < numLloyd; j ++) {
		// 	for (let i = 0; i < numNodes; i ++) {
		// 		let {u, v} = this.nodes[i].getCentroid();
		// 		this.nodes[i].u = u;
		// 		this.nodes[i].v = v;

		// 		delaunayTriangulate(this);
		// 	}
		// }
	}

	/**
	 * return the u-v parameterization of a point uniformly sampled from the Surface
	 */
	randomPoint() {
		throw new Error("Unimplemented");
	}

	/**
	 * return a list of nodes along with an associated list of triangles that
	   completely cover this Surface
	 */
	partition() {
		throw new Error("Unimplemented");
	}

	/**
	 * return the local length-to-latitude rate
	 */
	dsdu(u, v) {
		throw new Error("Unimplemented");
	}

	/**
	 * return the local effective width
	 */
	dAds(u, v) {
		throw new Error("Unimplemented");
	}

	/**
	 * return the 3D cartesian coordinates corresponding to the given parameters
	 */
	 xyz(u, v) {
	 	throw new Error("Unimplemented");
	 }

	/**
	 * does the given triangle contain the given point on this surface?
	 */
	encompassing(triangle, node) {
		throw new Error("Unimplemented");
	}

	/**
	 * orthodromic distance from A to B on the surface
	 */
	distance(a, b) {
		throw new Error("Unimplemented");
	}
}


class Sphere extends Surface {
	constructor(dayLength, gravity, circumference, tilt) {
		super();
		this.radius = circumference/(2*Math.PI);
	}

	randomPoint() {
		return { u: Math.asin(2*Math.random()-1), v: Math.PI*(2*Math.random()-1) };
	}

	partition() {
		let nodes = [
			new Node(null, { u: 0, v: 0 }, this),
			new Node(null, { u: 0, v: Math.PI/2 }, this),
			new Node(null, { u: 0, v: Math.PI }, this),
			new Node(null, { u: 0, v: -Math.PI/2 }, this),
			new Node(null, { u: Math.PI/2, v: 0 }, this),
			new Node(null, { u: -Math.PI/2, v: 0 }, this),
		];
		let triangles = [];
		for (let i = 0; i < 4; i ++) {
			triangles.push(
				new Triangle(nodes[4], nodes[i], nodes[(i+1)%4]));
			triangles.push(
				new Triangle(nodes[5], nodes[(i+1)%4], nodes[i]));
		}
		return [nodes, triangles];
	}

	dsdu(ph, l) {
		return radius;
	}

	dAds(ph, l) {
		return radius*Math.cos(ph);
	}

	xyz(ph, l) {
		return {
			x: -Math.cos(ph)*Math.sin(l),
			y: Math.cos(ph)*Math.cos(l),
			z: Math.sin(ph) };
	}

	encompassing(triangle, r) {
		for (let i = 0; i < 3; i ++) {
			const a = triangle.vertices[i];
			const b = triangle.vertices[(i+1)%3];
			const axb = {
				x: a.y*b.z - a.z*b.y,
				y: a.z*b.x - a.x*b.z,
				z: a.x*b.y - a.y*b.x};
			if (axb.x*r.x + axb.y*r.y + axb.z*r.z < 0)
				return false;
		}
		return true;
	}

	distance(a, b) {
		return Math.acos(Math.sin(a.u)*Math.sin(b.u) + Math.cos(a.u)*Math.cos(b.u)*Math.cos(a.v - b.v));
	}
}


/**
 * A single delaunay vertex/voronoi polygon, which contains geographical information
 */
class Node {
	constructor(index, position, surface) {
		this.surface = surface;
		this.index = index;
		this.u = position.u, this.v = position.v;
		let {x, y, z} = surface.xyz(this.u, this.v);
		this.x = x, this.y = y, this.z = z;
		this.neighbors = new Map();
		this.parents = null;
	}

	toString() {
		return `<${Math.trunc(10*this.x)}, ${Math.trunc(10*this.y)}, ${Math.trunc(10*this.z)}>`;
	}
}


/**
 * A single Delaunay triangle/voronoi vertex, which binds three Nodes
 */
class Triangle {
	constructor(a, b, c) {
		this.vertices = [a, b, c]; // nodes, ordered widdershins
		this.edges = [null, null, null]; // edges a-b, b-c, and c-a
		this.surface = a.surface;
		this.i = a.index;
		this.j = b.index;
		this.k = c.index;
		this.children = null;

		for (let i = 0; i < 3; i ++) { // check each pair to see if they are already connected
			const node0 = this.vertices[i], node1 = this.vertices[(i+1)%3];
			if (node0.neighbors.has(node1)) { // if so,
				this.edges[i] = node0.neighbors.get(node1); // take that edge
				if (this.edges[i].nodeA == node0) // and depending on its direction,
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

	toString() {
		return `${this.vertices[0]}--${this.vertices[1]}--${this.vertices[2]}`;
	}
}


/**
 * A line between two connected Nodes, and separating two triangles
 */
class Edge {
	constructor(nodeA, triangleR, nodeB, triangleL, length) {
		this.nodeA = nodeA; // save these new values for the edge
		this.triangleR = triangleR;
		this.nodeB = nodeB;
		this.triangleL = triangleL;
		this.length;

		nodeA.neighbors.set(nodeB, this);
		nodeB.neighbors.set(nodeA, this);
	}

	toString() {
		return `${this.nodeA}--${this.nodeB}`;
	}
}
