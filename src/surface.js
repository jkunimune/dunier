// surface.js: defines the geometric classes
'use strict';


const NOISINESS = 5e-5;
const AVG_TEMP = 283; // K


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
	populate(numNodes, numLloyd, rng) {
		for (let i = 0; i < numNodes; i ++)
			this.nodes.push(new Node(i, this.randomPoint(rng), this));

		delaunayTriangulate(this, rng);

		// for (let j = 0; j < numLloyd; j ++) {
		// 	for (let i = 0; i < numNodes; i ++) {
		// 		let {u, v} = this.nodes[i].getCentroid();
		// 		this.nodes[i].u = u;
		// 		this.nodes[i].v = v;

		// 		delaunayTriangulate(this, rng);
		// 	}
		// }

		for (let i = 1; i < this.nodes.length; i ++) { // after all that's through, some nodes won't have any parents
			if (this.nodes[i].parents.length === 0) { // if that's so,
				const orphan = this.nodes[i];
				let closest = undefined; // the easiest thing to do is to just assign it the closest node that came before it
				let minDistance = Number.POSITIVE_INFINITY;
				for (let j = 0; j < orphan.index; j ++) {
					const distance = this.distance(this.nodes[j], orphan);
					if (distance < minDistance) {
						minDistance = distance;
						closest = this.nodes[j];
					}
				}
				orphan.parents = new Map();
				orphan.parents.set(closest, new Edge(orphan, null, closest, null, minDistance));
			}
		}

		for (const node of this.nodes) { // assign each node random values
			let scale = 0; // based on a diamond-square-like algorithm
			if (node.index >= 12) { // where the first few are zero, to keep the whole thing from floating away
				for (const parent of node.parents.keys()) {
					node.terme += parent.terme / node.parents.size;
					node.barxe += parent.barxe / node.parents.size;
					scale += node.parents.get(parent).length / node.parents.size;
				}
			}
			const std = Math.pow(scale, 1.0)*NOISINESS;
			node.terme += rng.normal(0, std);
			node.barxe += rng.normal(0, std);
		}
		for (const node of this.nodes) { // and then throw in the baseline
			node.terme += AVG_TEMP*Math.pow(this.insolation(node.u), 1/4.) - 273; // TODO: surface-dependent climate
			const lat = this.geodeticLatitude(node.u);
			node.barxe += Math.pow(Math.cos(lat), 2) + Math.pow(Math.cos(3*lat), 2);
		}

	}

	/**
	 * return the u-v parameterization of a point uniformly sampled from the Surface using
	 * the given random number generator.
	 */
	randomPoint(rng) {
		throw "Unimplemented";
	}

	/**
	 * return a list of nodes along with an associated list of triangles that
	 * completely cover this Surface. The mesh must never diverge from the surface farther
	 * than the radius of curvature.
	 */
	partition() {
		throw "Unimplemented";
	}

	/**
	 * return the local length-to-latitude rate
	 */
	dsdu(u, v) {
		throw "Unimplemented";
	}

	/**
	 * return the local effective width
	 */
	dAds(u, v) {
		throw "Unimplemented";
	}

	/**
	 * return the geodetic latitude corresponding to a u value.
	 */
	geodeticLatitude(u) {
		throw "Unimplemented";
	}

	/**
	 * return the amount of solar radiation at a u value, normalized to peak at 1.
	 */
	insolation(u) {
		throw "Unimplemented";
	}

	/**
	 * return the 3D cartesian coordinate vector corresponding to the given parameters
	 */
	xyz(u, v) {
		throw "Unimplemented";
	}

	/**
	 * return the normalized vector pointing outward at this node. the node may be assumed
	 * to be on this Surface.
	 */
	getNormal(node) {
		throw "Unimplemented";
	}

	/**
	 * orthodromic distance from A to B on the surface (it's okay if it's just
	 * an approximation).
	 */
	distance(a, b) {
		throw "Unimplemented";
	}
}


class Spheroid extends Surface {
	constructor(dayLength, gravity, circumference, obliquity) {
		super();
		this.radius = circumference/(2*Math.PI); // keep radius in km
		const g = gravity*9.8; // gravity in m/s^2
		const om = 2*Math.PI/(dayLength*3600); // and angular velocity in rad/s
		const w = (this.radius*1000)*om*om/g; // this dimensionless parameter determines the aspect ratio
		this.aspectRatio = 1 + w/2 + 1.5*w*w + 6.5*w*w*w; // numerically determined formula for oblateness
		if (this.aspectRatio > 4)
			throw new RangeError("Unstable planet");
		this.flattening = 1 - 1/this.aspectRatio;
		this.eccentricity = Math.sqrt(1 - Math.pow(this.aspectRatio, -2))
		this.obliquity = obliquity*Math.PI/180;
	}

	randomPoint(rng) {
		const x = rng.normal(0, this.radius);
		const y = rng.normal(0, this.radius);
		const z = rng.normal(0, this.radius/this.aspectRatio);
		return { u: Math.atan(z*this.aspectRatio/Math.hypot(x,y)), v: Math.atan2(y, x) };
	}

	partition() {
		const b = Math.atan(1/this.aspectRatio);
		const m = Math.trunc(2*Math.PI/Math.hypot(Math.sin(b)/this.aspectRatio, 1 - Math.cos(b)));
		const n = 4;
		const nodes = [];
		for (let i = 1; i < n; i ++) // construct a grid of points,
			for (let j = 0; j < m; j ++)
				nodes.push(new Node(null, {
					u: Math.atan(Math.tan(Math.PI*(i/n - .5))/this.aspectRatio),
					v: 2*Math.PI*(j + .5*(i%2))/m,
				}, this));
		const kS = nodes.length; // assign Nodes to the poles,
		nodes.push(new Node(null, { u: -Math.PI/2, v: 0 }, this));
		const kN = nodes.length;
		nodes.push(new Node(null, { u: Math.PI/2, v: 0 }, this));

		const triangles = []; // and strew it all with triangles
		for (let j = 0; j < m; j ++)
			triangles.push(
				new Triangle(nodes[kS], nodes[(j+1)%m], nodes[j]));
		for (let i = 1; i < n-1; i ++) {
			for (let j = 0; j < m; j ++) {
				if (i%2 === 1) {
					triangles.push(new Triangle(
						nodes[(i-1)*m + j],
						nodes[i*m + (j+1)%m],
						nodes[i*m + j]));
					triangles.push(new Triangle(
						nodes[(i-1)*m + j],
						nodes[(i-1)*m + (j+1)%m],
						nodes[i*m + (j+1)%m]));
				}
				else {
					triangles.push(new Triangle(
						nodes[(i-1)*m + j],
						nodes[(i-1)*m + (j+1)%m],
						nodes[i*m + j]));
					triangles.push(new Triangle(
						nodes[(i-1)*m + (j+1)%m],
						nodes[i*m + (j+1)%m],
						nodes[i*m + j]));
				}
			}
		}
		for (let j = 0; j < m; j ++)
			triangles.push(
				new Triangle(nodes[kN], nodes[(n-2)*m + j], nodes[(n-2)*m + (j+1)%m]));
		for (const t of triangles)
			if (t.isInsideOut())
				throw "am me";
		return [nodes, triangles];
	}

	dsdu(ph) {
		return this.radius*Math.sqrt(1 - Math.pow(this.eccentricity*Math.cos(ph), 2));
	}

	dAds(ph) {
		return this.radius*Math.cos(ph);
	}

	geodeticLatitude(ph) {
		return Math.atan(this.aspectRatio*Math.tan(ph));
	}

	insolation(ph) {
		return 1 -
			5/8.*legendreP2(Math.cos(this.obliquity))*legendreP2(Math.sin(ph)) -
			9/64.*legendreP4(Math.cos(this.obliquity))*legendreP4(Math.sin(ph)) -
			65/1024.*legendreP6(Math.cos(this.obliquity))*legendreP6(Math.sin(ph));
	}

	xyz(ph, l) {
		return new Vector(
			-this.radius*Math.cos(ph)*Math.sin(l),
			 this.radius*Math.cos(ph)*Math.cos(l),
			 this.radius*Math.sin(ph)/this.aspectRatio);
	}

	getNormal(node) {
		const ph = this.geodeticLatitude(node.u); // use geodetic coordinates
		const l = node.v;
		return new Vector(
			-Math.cos(ph)*Math.sin(l),
			 Math.cos(ph)*Math.cos(l),
			 Math.sin(ph));
	}

	distance(a, b) {
		const s = Math.acos(Math.sin(a.u)*Math.sin(b.u) +
			Math.cos(a.u)*Math.cos(b.u)*Math.cos(a.v - b.v));
		const p = (a.u + b.u)/2;
		const q = (b.u - a.u)/2;
		const x = (s - Math.sin(s))*Math.pow(Math.sin(p)*Math.cos(q)/Math.cos(s/2), 2);
		const y = (s + Math.sin(s))*Math.pow(Math.cos(p)*Math.sin(q)/Math.sin(s/2), 2);
		return this.radius*(s - this.flattening/2*(x + y));
	}
}


/**
 * A single delaunay vertex/voronoi polygon, which contains geographical information
 */
class Node {
	constructor(index, position, surface) {
		this.surface = surface;
		this.index = index;
		this.u = position.u;
		this.v = position.v;
		this.pos = surface.xyz(this.u, this.v);
		this.neighbors = new Map();
		this.parents = null;

		this.terme = 0;
		this.barxe = 0;
		this.altitude = 0;
	}

	/**
	 * return the triangle which appears left of that from the point of view of this.
	 */
	leftOf(that) {
		if (this.neighbors.get(that).node0 === this)
			return this.neighbors.get(that).triangleL;
		else
			return this.neighbors.get(that).triangleR;
	}

	/**
	 * return the Triangles that border this in widershins order.
	 */
	getPolygon() {
		if (this.vertices === undefined) { // don't compute this unless you must
			this.vertices = [this.neighbors.values().next().value.triangleL]; // start with an arbitrary neighboring triangle
			while (this.vertices.length < this.neighbors.size) {
				const lastTriangle = this.vertices[this.vertices.length-1];
				const nextNode = lastTriangle.clockwiseOf(this);
				this.vertices.push(this.leftOf(nextNode));
			}
		}
		return this.vertices;
	}

	/**
	 * return the normal direction vector at this point
	 */
	getNormal() {
		if (this.normal === undefined)
			this.normal = this.surface.getNormal(this);
		return this.normal;
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
	contains(r) {
		const normal = [];
		for (let i = 0; i < 3; i ++)
			normal.push(this.surface.getNormal(this.vertices[i])); // compute normal vectors
		if (this.surface.getNormal(r).dot(normal[0].plus(normal[1]).plus(normal[2])) < 0)
			return false; // check alignment on the surface
		for (let i = 0; i < 3; i ++) {
			const a = this.vertices[i];
			const na = normal[i];
			const b = this.vertices[(i+1)%3];
			const nb = normal[(i+1)%3]
			const ab = a.neighbors.get(b);
			const edgeDirection = b.pos.minus(a.pos);
			const normalDirection = na.plus(nb);
			const boundDirection = normalDirection.cross(edgeDirection);
			if (boundDirection.dot(r.pos.minus(a.pos)) < 0)
				return false; // check each side condition
		}
		return true;
	}

	/**
	 * compute the outward normal vector of this triangle.
	 * @returns Vector, normalized
	 */
	getNormal() {
		const ab = this.vertices[1].pos.minus(this.vertices[0].pos);
		const ac = this.vertices[2].pos.minus(this.vertices[0].pos);
		const abxac = ab.cross(ac);
		return abxac.norm();
	}

	/**
	 * Find and return the vertex across from the given edge.
	 */
	acrossFrom(edge) {
		for (const vertex of this.vertices)
			if (vertex !== edge.node0 && vertex !== edge.node1)
				return vertex;
		throw "Could not find a nonadjacent vertex.";
	}

	/**
	 * Find and return the vertex clockwise of the given edge.
	 */
	clockwiseOf(node) {
		for (let i = 0; i < 3; i ++)
			if (this.vertices[i] === node)
				return this.vertices[(i+2)%3];
	}

	/**
	 * Find and return the vertex widershins of the given edge.
	 */
	widershinsOf(node) {
		for (let i = 0; i < 3; i ++)
			if (this.vertices[i] === node)
				return this.vertices[(i+1)%3];
	}

	isInsideOut() {
		let vNormal = new Vector(0, 0, 0);
		for (let i = 0; i < 3; i ++)
			vNormal = vNormal.plus(this.surface.getNormal(this.vertices[i]));
		return this.getNormal().dot(vNormal) <= 0;
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
		this.length = length;

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

	norm() {
		return this.times(Math.pow(this.sqr(), -0.5));
	}

	toString() {
		return `<${Math.trunc(this.x)}, ${Math.trunc(this.y)}, ${Math.trunc(this.z)}>`;
	}
}
