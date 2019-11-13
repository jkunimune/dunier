// surface.js: defines the geometric classes
'use strict';


/**
 * Generic 3D collection of nodes and edges
 */
class Surface {
	/**
	 * return the u-v parameterization of a point uniformly sampled from the Surface
	 */
	randomPoint() {
		throw new Error("Unimplemented");
	}

	constructor(numNodes) {
		this.nodes = [];
		this.triangles = [];
	}

	/**
	 * Fill this.nodes with random nodes, spaced via numLloyd iterations of Lloyd relaxation
	 */
	populate(numLloyd) {
		this.nodes = [
			new Node(0, 0, 0, this),
			new Node(1, 0, Math.PI/2, this),
			new Node(2, 0, Math.PI, this),
			new Node(3, 0, -Math.PI/2, this),
			new Node(4, Math.PI/2, 0, this),
			new Node(5, -Math.PI/2, 0, this),
		];
		this.triangles = [
			new Triangle(this.nodes[0], this.nodes[1], this.nodes[4]),
			new Triangle(this.nodes[1], this.nodes[2], this.nodes[4]),
			new Triangle(this.nodes[2], this.nodes[3], this.nodes[4]),
			new Triangle(this.nodes[3], this.nodes[0], this.nodes[4]),
			new Triangle(this.nodes[1], this.nodes[0], this.nodes[5]),
			new Triangle(this.nodes[2], this.nodes[1], this.nodes[5]),
			new Triangle(this.nodes[3], this.nodes[2], this.nodes[5]),
			new Triangle(this.nodes[0], this.nodes[3], this.nodes[5]),
		];
		// for (let i = 0; i < numNodes; i ++)
		// 	this.nodes.push(new Node(i, ...this.randomPoint(), this));

		// this.triangles = delaunayTriangulation(this.nodes.map(n => xyz(n.u, n.v)));
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
}


class Sphere extends Surface {
	constructor(dayLength, gravity, circumference, tilt) {
		super(100);
		this.radius = circumference/(2*Math.PI);
	}

	randomPoint() {
		return { u: Math.asin(2*Math.random()-1), v: Math.PI*(2*Math.random()-1) };
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
}


/**
 * A single delaunay vertex/voronoi polygon, which contains geographical information
 */
class Node {
	constructor(index, u, v, surface) {
		this.surface = surface;
		this.index = index;
		this.u = u;
		this.v = v;
		let {x, y, z} = surface.xyz(u, v);
		this.x = x, this.y = y, this.z = z;
		this.neighbors = [];
		this.parents = null;
	}

	addNeighbor(edge, node) {
		this.neighbors.push({edge:edge, node:node});
		node.neighbors.push({edge:edge, node:this});
	}

	removeNeighbor(edge) {
		for (let i = 0; i < this.neighbors.length; i ++) {
			if (this.neighbors[i].edge == edge) {
				let node = this.neighbors[i].node;
				this.neighbors.splice(i, 1);
				for (let j = 0; j < node.neighbors.length; j ++) {
					if (node.neighbors[j].edge == edge) {
						node.neighbors.splice(j, 1);
						break;
					}
				}
				break;
			}
		}
	}
}


/**
 * A single Delaunay triangle/voronoi vertex, which binds three Nodes
 */
class Triangle {
	constructor(a, b, c) {
		this.nodes = [a, b, c];
		this.i = a.index;
		this.j = b.index;
		this.k = c.index;
		this.children = null;
	}
}


/**
 * A line between two connected Nodes, and separating two triangles
 */
class Edge {
	constructor(nodeA, triangleA, nodeB, triangleB, length) {
		this.nodeA = nodeA; // save these new values for the edge
		this.triangleA = triangleA;
		this.nodeB = nodeB;
		this.triangleB = triangleB;
		this.length;

		nodeA.addNeighbor(this, nodeB);
	}
}
