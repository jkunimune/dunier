/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {XYPoint} from "./coordinates.js";

/**
 * calculate the sign of this triangle
 * @return in a left-handed coordinate system:
 *         - a positive number if b is to the left of a from the point of view of an observer at c facing d
 *           (meaning d is to the right of c for an observer facing from a to b);
 *         - a negative number if b is to the right of a for an observer at c facing d; or
 *         - 0 if ab and cd are collinear or either has zero magnitude.
 *         in a right-handed coordinate system: the reverse
 */
export function crossingSign(a: XYPoint, b: XYPoint, c: XYPoint, d: XYPoint): number {
	return (b.x - a.x)*(d.y - c.y) - (b.y - a.y)*(d.x - c.x);
}


/**
 * calculate the sign of this triangle in a left-handed coordinate system
 * @return a positive number if the triangle goes clockwise, a negative number if it
 *         goes widershins, and zero if it is degenerate.  in actuality, this returns
 *         two times the area of the triangle formed by these points, so if there is
 *         roundoff error, know that it will be of that order.
 */
export function angleSign(a: XYPoint, b: XYPoint, c: XYPoint): number {
	return crossingSign(b, c, b, a);
}


/**
 * calculate the sign of this passing
 * @return a positive number if the vector from a to b is roughly in the same direction
 * as that from c to d (within 90°), a negative number if they're in roughly opposite
 * directions, and 0 if they're perpendicular or either has zero length.
 */
export function passingSign(a: XYPoint, b: XYPoint, c: XYPoint, d: XYPoint): number {
	return (b.x - a.x)*(d.x - c.x) + (b.y - a.y)*(d.y - c.y);
}


/**
 * compute the point equidistant from the three points given.
 */
export function circumcenter(points: XYPoint[]): XYPoint {
	if (points.length !== 3)
		throw new Error("it has to be 3.");
	let xNumerator = 0, yNumerator = 0;
	let denominator = 0;
	for (let i = 0; i < 3; i++) { // do the 2D circumcenter calculation
		const a = points[i];
		const b = points[(i + 1)%3];
		const c = points[(i + 2)%3];
		xNumerator += (a.x*a.x + a.y*a.y) * (b.y - c.y);
		yNumerator += (a.x*a.x + a.y*a.y) * (c.x - b.x);
		denominator += a.x * (b.y - c.y);
	}
	return {
		x: xNumerator/denominator/2,
		y: yNumerator/denominator/2};
}


/**
 * get the center of a circle given two points on it and its radius
 * @param a the first point on the circle
 * @param b the second point on the circle
 * @param r the radius of the circle
 * @param onTheRight whether the center is on the right of the strait-line path from a to b in a left-handed
 *                   coordinate system (for SVG arcs this is largeArcFlag!=sweepFlag)
 */
export function arcCenter(a: XYPoint, b: XYPoint, r: number, onTheRight: boolean): XYPoint {
	const d = Math.hypot(b.x - a.x, b.y - a.y);
	let l = Math.sqrt(r*r - d*d/4);
	if (onTheRight) l *= -1;
	const sin_θ =  (b.y - a.y)/d;
	const cos_θ = -(b.x - a.x)/d;
	return {
		x: (a.x + b.x)/2 + l*sin_θ,
		y: (a.y + b.y)/2 + l*cos_θ,
	};
}
/**
 * find the intersection between two line segments, or determine that there isn't one.
 * for the purposes of this function, when one endpoint is coincident with the other
 * segment, it is counted as an intersection.
 * @returns the location where they cross, or null if they don't
 */
export function lineLineIntersection(
	p1: XYPoint, p2: XYPoint,
	q1: XYPoint, q2: XYPoint): XYPoint {
	if (q1.x === q2.x) {
		let r = null;
		if (p1.x === q1.x)
			r = p1;
		else if (p2.x === q1.x)
			r = p2;
		else if (Math.min(p1.x, p2.x) <= q1.x && Math.max(p1.x, p2.x) >= q1.x)
			r = {x: q1.x, y: (q1.x - p1.x)/(p2.x - p1.x)*(p2.y - p1.y) + p1.y};
		if (r !== null && r.y >= Math.min(q1.y, q2.y) && r.y <= Math.max(q1.y, q2.y))
			return r;
		return null;
	}
	else if (q1.y === q2.y) {
		return transpose(lineLineIntersection(
			transpose(p1), transpose(p2), transpose(q1), transpose(q2)));
	}
	else {
		throw new Error("I haven't implemented obleke intersections, but if you want, try https://blogs.sas.com/content/iml/2018/07/09/intersection-line-segments.html");
	}
}


/**
 * find the intersection between two lines given in point–velocity form, returning it in
 * both cartesian and parametric coordinates.
 * @returns the location where the lines cross and the corresponding times
 */
export function trajectoryIntersection(
	a: XYPoint, va: { x: number, y: number },
	b: XYPoint, vb: { x: number, y: number }): { x: number, y: number, ta: number, tb: number} {
	if (va.x*vb.y - va.y*vb.x === 0)
		throw new Error(`the given trajectories do not ever intersect.`);
	const ta = (vb.x*(a.y - b.y) - vb.y*(a.x - b.x))/
		(va.x*vb.y - va.y*vb.x);
	const x = a.x + va.x*ta;
	const y = a.y + va.y*ta;
	const tb = (vb.y === 0) ? (x - b.x)/vb.x:
	                          (y - b.y)/vb.y;
	return { x: x, y: y, ta: ta, tb: tb };
}


/**
 * find the intersections between a line segment and an arc.  for the purposes of this
 * function, the line being tangent to the arc body does not count as intersection, but
 * the line passing thru one of the arc's endpoints does, as does the arc passing thru
 * one of the line's endpoints.
 * @param p0 one endpoint of the line segment
 * @param p1 the other endpoint of the line segment
 * @param o the center of the arc
 * @param r the radius of the arc
 * @param q0 the point on the rite of the arc (viewd from the center)
 * @param q1 the point on the left of the arc (viewd from the center)
 * @param epsilon amount of roundoff for which to account
 */
export function lineArcIntersections(
	p0: XYPoint, p1: XYPoint, o: XYPoint, r: number, q0: XYPoint, q1: XYPoint, epsilon=1e-15
): XYPoint[] {
	const scale = Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2);
	const pitch = (p0.x - o.x)*(p1.x - p0.x) + (p0.y - o.y)*(p1.y - p0.y);
	const distance = (p0.x + q0.x - 2*o.x)*(p0.x - q0.x) +
		(p0.y + q0.y - 2*o.y)*(p0.y - q0.y);
	const vertex = -pitch/scale;
	const discriminant = vertex*vertex - distance/scale;
	// if this quadratic is solvable, extract the roots
	if (discriminant > r*r/scale*epsilon) {
		const sqrtDiscriminant = Math.sqrt(discriminant);
		const roots = [
			vertex + sqrtDiscriminant,
			vertex - sqrtDiscriminant];
		const crossings: XYPoint[] = [];

		// then, check each one to see if it is between the line segment endpoints
		for (const t of roots) {
			if (t >= 0 && t <= 1) {
				let x = { x: p0.x + (p1.x - p0.x)*t, y: p0.y + (p1.y - p0.y)*t };
				for (const q of [q0, q1])
					if (angleSign(q, p0, p1) === 0 && (t > vertex) === (passingSign(o, q, p0, p1) > 0))
						x = q; // make it exactly equal to the endpoint if it seems like it should be
				// and if it is between the arc endpoints
				const rightOfQ0 = angleSign(q0, o, x) <= 0;
				const leftOfQ1 = angleSign(x, o, q1) <= 0;
				const insideOut = angleSign(q0, o, q1) >= 0;
				const onArc = insideOut ? rightOfQ0 || leftOfQ1 : rightOfQ0 && leftOfQ1;
				if (onArc)
					crossings.push(x);
			}
		}
		return crossings;
	}
	else {
		return [];
	}
}


/**
 * copy and edit a polygon so that if its vertices are approximately orderd
 * counterclockwise from the POV of the origin, then they are rearranged to be
 * exactly orderd widdershins from the POV of the origin
 * @return the reorderd polygon
 */
export function checkVoronoiPolygon(vertexes: XYPoint[]): XYPoint[] {
	// start by copying the polygon (a deep copy would be better but I don't think the points will get modified)
	vertexes = vertexes.slice();
	const origen = { x: 0, y: 0 };
	// for each vertex
	for (let i = 0; i < vertexes.length; i ++) {
		// if the next one seems to be clockwise from it
		const j = (i + 1)%vertexes.length;
		if (angleSign(vertexes[i], origen, vertexes[j]) > 0) {
			// see if the following one would be widershins
			const k = (i + 2)%vertexes.length;
			// if so, reverse them
			if (angleSign(vertexes[i], origen, vertexes[k]) <= 0) {
				const vertex = vertexes[i];
				vertexes[i] = vertexes[j];
				vertexes[j] = vertex;
			}
		}
	}
	return vertexes;
}


/**
 * exchange x and y for this point
 * @param p
 */
function transpose(p: XYPoint): XYPoint {
	if (p === null)
		return null;
	else
		return {x: p.y, y: p.x};
}


/**
 * generate a set of three mutually orthogonal Vectors
 * @param n the direction of the n vector
 * @param normalize whether to normalize the three vectors before returning them
 * @param axis v will be chosen to be coplanar with axis and n
 * @param bias if axis and n are parallel, v will be chosen to be coplanar with axis, n, and bias
 * @returns three vectors, u, v, and n.  if they are normalized, u×v=n, v×n=u, and n×u=v.  if they aren’t then the
 * magnitudes will be whatever.  also, u will always be orthogonal to axis.  if there is an opcion,
 */
export function orthogonalBasis(n: Vector, normalize = false, axis = new Vector(0, 0, 1), bias = new Vector(1, 0, 0)): {u: Vector, v: Vector, n: Vector} {
	if (axis.cross(n).sqr() === 0) {
		axis = bias;
		if (bias.cross(n).sqr() === 0) {
			if (n.y !== 0)
				axis = new Vector(0, 0, 1);
			else
				axis = new Vector(0, 1, 0);
		}
	}

	let u = axis.cross(n);
	let v = n.cross(u);

	if (normalize) {
		u = u.normalized();
		v = v.normalized();
		n = n.normalized();
	}

	return {u: u, v: v, n: n};
}


/**
 * a vector in 3-space
 */
export class Vector {
	public x: number;
	public y: number;
	public z: number;

	constructor(x: number, y: number, z: number) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	times(a: number): Vector {
		return new Vector(
			this.x * a,
			this.y * a,
			this.z * a);
	}

	over(a: number): Vector {
		return new Vector(
			this.x / a,
			this.y / a,
			this.z / a);
	}

	plus(that: Vector): Vector {
		return new Vector(
			this.x + that.x,
			this.y + that.y,
			this.z + that.z);
	}

	minus(that: Vector): Vector {
		return new Vector(
			this.x - that.x,
			this.y - that.y,
			this.z - that.z);
	}

	dot(that: Vector): number {
		return (
			this.x*that.x +
			this.y*that.y +
			this.z*that.z);
	}

	cross(that: Vector): Vector {
		return new Vector(
			this.y*that.z - this.z*that.y,
			this.z*that.x - this.x*that.z,
			this.x*that.y - this.y*that.x);
	}

	/**
	 * calculate the dot product of this with itself
	 */
	sqr(): number {
		return this.dot(this);
	}

	/**
	 * return a version of this normalized to have a length of 1
	 */
	normalized(): Vector {
		return this.over(Math.sqrt(this.sqr()));
	}

	toString(): string {
		return `<${Math.trunc(this.x*1e3)/1e3}, ${Math.trunc(this.y*1e3)/1e3}, ${Math.trunc(this.z*1e3)/1e3}>`;
	}
}
