// surface.js: defines the geometric classes
'use strict';


const NOISINESS = 0.03;


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

		for (const node of this.nodes) { // assign each node random values
			let variance = 0;
			for (const parent of node.parents) {
				if (parent.index != null) {
					node.terme += parent.terme/node.parents.length;
					node.barxe += parent.barxe/node.parents.length;
					variance += this.distance(node, parent)/node.parents.length;
				}
			}
			variance = variance*NOISINESS;
			let u1 = Math.random(), u2 = Math.random();
			node.terme += Math.sqrt(-2*variance*Math.log(u1))*Math.cos(2*Math.PI*u2);
			node.barxe += Math.sqrt(-2*variance*Math.log(u1))*Math.cos(2*Math.PI*u2);
		}
		for (const node of this.nodes) { // and then throw in the baseline
			node.terme += Math.pow(Math.cos(node.u), 2); // TODO: surface-dependent climate
			node.barxe += Math.pow(Math.cos(node.u), 2) + Math.pow(Math.cos(3*node.u), 2);
		}

	}

	/**
	 * return the u-v parameterization of a point uniformly sampled from the Surface
	 */
	randomPoint() {
		throw new Error("Unimplemented");
	}

	/**
	 * return a list of nodes along with an associated list of triangles that
	 * completely cover this Surface
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
	 * return the 3D cartesian coordinate vector corresponding to the given parameters
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
		return new Vector(
			-Math.cos(ph)*Math.sin(l),
			 Math.cos(ph)*Math.cos(l),
			 Math.sin(ph));
	}

	encompassing(triangle, r) {
		for (let i = 0; i < 3; i ++) {
			const a = triangle.vertices[i];
			const b = triangle.vertices[(i+1)%3];
			const axb = a.pos.cross(b.pos);
			if (axb.dot(r.pos) < 0)
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
		this.pos = surface.xyz(this.u, this.v);
		this.neighbors = new Map();
		this.parents = null;

		this.terme = 0;
		this.barxe = 0;
		this.altitude = 0;
	}

	/**
	 * Return the triangle which appears left of that from the vantage of this.
	 */
	leftOf(that) {
		if (this.neighbors.get(that).node0 == this)
			return this.neighbors.get(that).triangleL;
		else
			return this.neighbors.get(that).triangleR;
	}

	/**
	 * Return the Triangles that border this in widdershins order.
	 */
	getPolygon() {
		if (this.vertices == undefined) { // don't compute this unless you must
			this.vertices = [this.neighbors.values().next().value.triangleL]; // start with an arbitrary neighboring triangle
			while (this.vertices.length < this.neighbors.size) {
				const lastTriangle = this.vertices[this.vertices.length-1];
				const nextNode = lastTriangle.clockwiseOf(this);
				this.vertices.push(this.leftOf(nextNode));
			}
		}
		return this.vertices;
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
				if (this.edges[i].node0 == node0) // and depending on its direction,
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
	 * compute the center of the circumcenter whose center is coplanar with all three
	 * vertices (and store it if you haven't yet).
	 */
	getCircumcenter() {
		if (this.circumcenter == undefined) {
			const a = this.vertices[0], b = this.vertices[1], c = this.vertices[2]; // the math gets pretty hairy
			const ac = c.pos.minus(a.pos); // so these shortened variable names are really important
			const ab = b.pos.minus(a.pos);
			const abxac = ab.cross(ac);
			const ao =
				abxac.cross(ab).times(ac.sqr()).plus(
				ac.cross(abxac).times(ab.sqr())).times(1/
					(2*abxac.sqr()));

			this.circumcenter = a.pos.plus(ao);
		}
		return this.circumcenter;
	}

	/**
	 * Find and return the vertex across from the given edge.
	 */
	acrossFrom(edge) {
		for (const vertex of this.vertices)
			if (vertex != edge.node0 && vertex != edge.node1)
				return vertex;
		throw "Could not find a nonadjacent vertex."
	}

	/**
	 * Find and return the vertex clockwise of the given edge.
	 */
	clockwiseOf(node) {
		for (let i = 0; i < 3; i ++)
			if (this.vertices[i] == node)
				return this.vertices[(i+2)%3];
	}

	/**
	 * Find and return the vertex widdershins of the given edge.
	 */
	widdershinsOf(node) {
		for (let i = 0; i < 3; i ++)
			if (this.vertices[i] == node)
				return this.vertices[(i+1)%3];
	}

	toString() {
		return `${this.vertices[0].pos}--${this.vertices[1].pos}--${this.vertices[2].pos}`;
	}
}


/**
 * A line between two connected Nodes, and separating two triangles
 */
class Edge {
	constructor(node0, triangleR, node1, triangleL, length) {
		this.node0 = node0; // save these new values for the edge
		this.triangleR = triangleR;
		this.node1 = node1;
		this.triangleL = triangleL;
		this.length;

		node0.neighbors.set(node1, this);
		node1.neighbors.set(node0, this);
	}

	toString() {
		return `${this.node0.pos}--${this.node1.pos}`;
	}
}


/**
 * A simple class to bind vector operations
 */
class Vector {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	times(a) {
		return new Vector(
			this.x * a,
			this.y * a,
			this.z * a);
	}

	plus(that) {
		return new Vector(
			this.x + that.x,
			this.y + that.y,
			this.z + that.z);
	}

	minus(that) {
		return new Vector(
			this.x - that.x,
			this.y - that.y,
			this.z - that.z);
	}

	dot(that) {
		return (
			this.x*that.x +
			this.y*that.y +
			this.z*that.z);
	}

	cross(that) {
		return new Vector(
			this.y*that.z - this.z*that.y,
			this.z*that.x - this.x*that.z,
			this.x*that.y - this.y*that.x);
	}

	sqr() {
		return this.dot(this);
	}

	toString() {
		return `<${Math.trunc(10*this.x)}, ${Math.trunc(10*this.y)}, ${Math.trunc(10*this.z)}>`;
	}
}
