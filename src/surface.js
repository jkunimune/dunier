// surface.js: defines the geometric classes
'use strict';


const INTEGRATION_RESOLUTION = 20;


/**
 * Generic 3D collection of nodes and edges
 */
class Surface {
	constructor() {
		this.nodes = [];
	}

	/**
	 * fill this.nodes with random nodes, spaced via numLloyd iterations of Lloyd
	 * relaxation
	 */
	populate(numNodes, numLloyd, rng) {
		this.refLatitudes = []; // fill in latitude-integrated values
		this.cumulAreas = []; // for use in map projections
		this.cumulDistances = [];
		let u = this.uMin(), A = 0, s = 0;
		const du = (this.uMax() - this.uMin())/INTEGRATION_RESOLUTION;
		for (let i = 0; i <= INTEGRATION_RESOLUTION; i ++) {
			this.refLatitudes.push(u);
			this.cumulAreas.push(A);
			this.cumulDistances.push(s);
			const dsdu = this.dsdu(u + du/2); // a simple middle Riemann sum will do
			const dAds = this.dAds(u + du/2);
			u += du;
			A += dAds*dsdu*du;
			s += dsdu*du;
		}
		this.area = this.cumulAreas[this.cumulAreas.length - 1];

		this.nodes = []; // remember to clear the old nodes, if necessary
		for (let i = 0; i < numNodes; i ++)
			this.nodes.push(new Node(i, this.randomPoint(rng), this));

		delaunayTriangulate(this);

		// for (let j = 0; j < numLloyd; j ++) {
		// 	for (let i = 0; i < numNodes; i ++) {
		// 		let {u, v} = this.nodes[i].getCentroid();
		// 		this.nodes[i].u = u;
		// 		this.nodes[i].v = v;

		// 		delaunayTriangulate(this);
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
				orphan.parents = [closest];
			}
		}
	}

	/**
	 * return the u-v parameterization of a point uniformly sampled from the Surface using
	 * the given random number generator.
	 */
	randomPoint(rng) {
		const v = rng.uniform(0, 2*Math.PI);
		const A = rng.uniform(0, this.cumulAreas[this.cumulAreas.length-1]);
		const u = linterp(A, this.cumulAreas, this.refLatitudes);
		return {u: u, v: v};
	}

	/**
	 * return a 2d array of x, y, z, and insolation.
	 */
	parameterize(resolution) {
		const n = 2*resolution, m = 4*resolution;
		const X = [], Y = [], Z = [], S = [];
		for (let i = 0; i <= n; i ++) {
			const u = i/n*(this.uMax() - this.uMin()) + this.uMin(); // map i to the valid range for u
			const s = this.insolation(u);
			X.push([]);
			Y.push([]);
			Z.push([]);
			S.push([]);
			for (let j = 0; j <= m; j ++) {
				const v = j/m*2*Math.PI; // I think v always represents some [0, 2*pi) angle
				const {x, y, z} = this.xyz(u, v);
				X[i].push(x);
				Y[i].push(y);
				Z[i].push(z);
				S[i].push(s);
			}
		}
		return [X, Y, Z, S];
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
	dsdu(u) {
		throw "Unimplemented";
	}

	/**
	 * return the local effective width
	 */
	dAds(u) {
		throw "Unimplemented";
	}

	/**
	 * return the amount of moisture accumulation at a u value, normalized to peak at 1.
	 */
	windConvergence(u) {
		throw "Unimplemented";
	}

	/**
	 * return the amount of solar radiation at a u value, normalized to average to 1.
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
	 * return the 2D parameterization corresponding to the given parameters
	 */
	uv(x, y, z) {
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

	/**
	 * minimum valid value of u.
	 */
	uMin() {
		throw "Unimplemented";
	}

	/**
	 * maximum valid value of u.
	 */
	uMax() {
		throw "Unimplemented";
	}
}


class Spheroid extends Surface {
	constructor(radius, gravity, omega, obliquity) {
		super();
		this.radius = radius; // keep radius in km
		const w = (radius*1000)*omega*omega/gravity; // this dimensionless parameter determines the aspect ratio
		this.aspectRatio = 1 + w/2 + 1.5*w*w + 6.5*w*w*w; // numerically determined formula for oblateness
		if (this.aspectRatio > 4)
			throw new RangeError("Unstable planet");
		this.flattening = 1 - 1/this.aspectRatio;
		this.eccentricity = Math.sqrt(1 - Math.pow(this.aspectRatio, -2));
		this.obliquity = obliquity;
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

	windConvergence(ph) {
		const b = Math.atan(this.aspectRatio*Math.tan(ph));
		return Math.pow(Math.cos(b), 2) + Math.pow(Math.cos(3*b), 2);
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

	uv(x, y, z) {
		return {
			u: Math.atan2(this.aspectRatio*z, Math.hypot(x, y)),
			v: Math.atan2(-x, y)};
	}

	getNormal(node) {
		const ph = Math.atan(this.aspectRatio*Math.tan(node.u)); // use geodetic coordinates
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

	uMin() {
		return -Math.PI/2;
	}

	uMax() {
		return Math.PI/2;
	}
}


class Sphere extends Spheroid {
	constructor(circumference) {
		super(circumference, 1, Number.POSITIVE_INFINITY, Number.NaN);
	}

	insolation(ph) {
		return 1.5*Math.max(0, Math.sin(ph));
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
		this.gawe = 0;
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
	 * check for the existence of a Triangle containing these three nodes in that order.
	 * @returns boolean
	 */
	inTriangleWith(b, c) {
		if (!this.neighbors.has(b))
			return false;
		return this.leftOf(b).acrossFrom(this.neighbors.get(b)) === c;
	}

	/**
	 * return the Triangles that border this in widershins order.
	 */
	getPolygon() {
		if (this.vertices === undefined) { // don't compute this unless you must
			try {
				this.vertices = [this.neighbors.values().next().value.triangleL]; // start with an arbitrary neighboring triangle
				while (this.vertices.length < this.neighbors.size) {
					const lastTriangle = this.vertices[this.vertices.length - 1];
					const nextNode = lastTriangle.clockwiseOf(this);
					this.vertices.push(this.leftOf(nextNode));
				}
			} catch {
				throw "aahhuh";
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
			const nb = normal[(i+1)%3];
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
	 * compute the u-v parameterization of the circumcenter in the plane normal to the sum
	 * of the vertices' normal vectors.
	 */
	getCircumcenter() {
		if (this.circumcenter === undefined) {
			let nHat = new Vector(0, 0, 0);
			for (const vertex of this.vertices)
				nHat = nHat.plus(vertex.getNormal());
			nHat = nHat.norm();
			const vHat = nHat.cross(new Vector(0, 0, -1)).norm();
			const uHat = nHat.cross(vHat);
			const projected = [];
			for (const vertex of this.vertices) // project all of the vertices into the tangent plane
				projected.push({
					v: vHat.dot(vertex.pos),
					u: uHat.dot(vertex.pos),
					n: nHat.dot(vertex.pos)});

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
			const center = {
				v:  vNumerator/denominator/2,
				u: -uNumerator/denominator/2,
				n:  nSum/3};

			center.x = vHat.x*center.v + uHat.x*center.u + nHat.x*center.n;
			center.y = vHat.y*center.v + uHat.y*center.u + nHat.y*center.n;
			center.z = vHat.z*center.v + uHat.z*center.u + nHat.z*center.n;
			this.circumcenter = this.surface.uv(center.x, center.y, center.z); // finally, put it back in u-v space
		}

		return this.circumcenter;
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

	seppuku() {
		this.node0.neighbors.delete(this.node1);
		this.node1.neighbors.delete(this.node0);
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
