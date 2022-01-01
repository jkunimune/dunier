/**
 * MIT License
 *
 * Copyright (c) 2021 Justin Kunimune
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
// @ts-ignore
import TinyQueue from "../lib/tinyqueue.js";
import {USER_STRINGS} from "../gui/main.js";
import {Word} from "../language/word.js";

/**
 * maximum index.
 */
export function argmax(arr: number[]): number {
	let maxIdx = null;
	for (let i = 0; i < arr.length; i ++)
		if (maxIdx === null || arr[i] > arr[maxIdx])
			maxIdx = i;
	return maxIdx;
}

/**
 * second Legendre polynomial.
 */
export function legendreP2(y: number): number {
	return (3*y*y - 1)/2;
}

/**
 * second Legendre polynomial.
 */
export function legendreP4(y: number): number {
	return ((35*y*y - 30)*y*y + 3)/8;
}

/**
 * second Legendre polynomial.
 */
export function legendreP6(y: number): number {
	return (((231*y*y - 315)*y*y + 105)*y*y - 5)/16;
}

/**
 * search a sorted array for the index of the last element less than or equal to a value
 */
export function binarySearch(value: number, array: number[]): number {
	let min = 0, max = array.length;
	while (max - min > 1) {
		const mid = Math.trunc((min + max)/2);
		if (array[mid] <= value)
			min = mid;
		else
			max = mid;
	}
	return min;
}

/**
 * linearly interpolate x from the sorted function X onto the corresponding output Y.
 */
export function linterp(inVal: number, inRef: number[], exRef: number[]): number {
	if (inRef.length !== exRef.length)
		throw "array lengths must match";

	const i = binarySearch(inVal, inRef);
	return (inVal - inRef[i])/(inRef[i+1] - inRef[i])*(exRef[i+1] - exRef[i]) + exRef[i];
}

/**
 * shift a number by hole multiples of 2π to put it in the range [-π, π]
 * @param angle
 */
export function standardizeAngle(angle: number): number {
	return angle - Math.floor((angle + Math.PI)/(2*Math.PI))*2*Math.PI
}

/**
 * combine the two arrays and remove duplicates.
 */
export function union(a: Iterable<any>, b: Iterable<any>): Iterable<any> {
	const aa = [...a];
	const ba = [...b];
	return aa.concat(ba.filter(e => !aa.includes(e)));
}

/**
 * it's like the built-in filter funccion for arrays, but it works on other iterables.
 * @param set
 * @param condition
 */
export function filterSet<T>(set: Iterable<T>, condition: (item: T) => boolean): Set<T> {
	const output = new Set<T>();
	for (const item of set) {
		if (condition.call(null, item))
			output.add(item);
	}
	return output;
}

/**
 * cast the given args to user strings (with a fixd format specificacion) and add them to
 * the given format in place of '{0}', '{1}', etc.  output will all ultimately be
 * extracted from USER_STRINGS.
 * @param sentence the key for the encompassing phrase
 * @param args the key for the arguments to slot in
 */
export function format(sentence: string, ...args: (string|number|object)[]): string {
	if (!USER_STRINGS.has(sentence))
		throw `Could not find user string in resource file for ${sentence}`;
	let format = USER_STRINGS.get(sentence);
	for (let i = 0; i < args.length; i ++) { // loop thru the args and format each one
		let convertedArg: string;
		if (args[i] === null || args[i] == undefined) {
			if (sentence.includes(`{${i}}`))
				throw `${args[i]} was passd as the ${i}° argument.  this is only allowd when the argument is absent from the format string, which was not the case here.`;
			continue;
		}
		if (args[i] instanceof Word) {
			convertedArg = (<Word>args[i]).toString(); // transcribe words using the specified style TODO: use the user-specified style TODO sometimes italicize instead of capitalizing
		}
		else if (typeof args[i] === 'string') {
			convertedArg = USER_STRINGS.get(<string>args[i]); // look up strings in the resource file
		}
		else if (typeof args[i] === 'object') {
			convertedArg = USER_STRINGS.get((<object>args[i]).toString()); // do the same for objects
		}
		else if (typeof args[i] == 'number') {
			if (args[i] === 0) {
				convertedArg = "0"; // zeros get formatted like so
			}
			else { // and other numbers are formatted like so
				const magnitude = Math.pow(10, Math.floor(Math.log10(<number>args[i])) - 3); // determine its order of magnitude
				const value = Math.round(<number>args[i]/magnitude)*magnitude; // round to three decimal points below that
				convertedArg = value.toString().split("").reverse().join(""); // reverse it
				convertedArg = convertedArg.replace(/(\d\d\d)/g, '$1 ').replace(/,$/, ''); // add thousands separators
				convertedArg = convertedArg.split("").reverse().join(""); // reverse it back
			}
		}
		if (convertedArg === undefined) // do Javascript's job for it
			throw `Could not find user string in resource file for ${args[i]}`;
		format = format.replace(`{${i}}`, convertedArg); // then slot it in
	}
	return format;
}

/**
 * perform a Dijkstra search on the given Euclidean graph from the given nodes. return the shortest path from the node
 * that is furthest from those endpoint nodes to the endpoint node that is closest to it, as a list of indices.
 * @param nodes the locations of all of the nodes in the plane, and their connections
 * @param endpoints the indices of the possible endpoints
 * @param threshold the minimum clearance of an edge
 * @return list of indices starting with the farthest connected point and stepping through the path, and the path length
 */
export function longestShortestPath(nodes: {x: number, y: number, edges: {length: number, clearance: number}[]}[],
							 endpoints: Set<number>, threshold: number = 0): {points: number[], length: number} {
	const graph = [];
	for (let i = 0; i < nodes.length; i ++)
		graph.push({distance: Number.POSITIVE_INFINITY, cene: null, lewi: false})

	const queue = new TinyQueue([], (a: {distance: number}, b: {distance: number}) => a.distance - b.distance);
	for (const i of endpoints)
		queue.push({start: null, end: i, distance: 0}); // populate the queue with the endpoints

	let furthest = null;
	while (queue.length > 0) { // while there are places whither you can go
		const {start, end, distance} = queue.pop(); // look for the closest one
		if (!graph[end].lewi) { // only look at each one once
			for (let next = 0; next < nodes.length; next ++) { // add its neighbors to the queue
				if (nodes[end].edges[next] !== null && nodes[end].edges[next].clearance >= threshold) // if they are connected with enough clearance
					queue.push({start: end, end: next, distance: distance + nodes[end].edges[next].length});
			}
			graph[end] = {distance: distance, cene: start, lewi: true}; // mark this as visited
			furthest = end; // and as the furthest yet visited
		}
	}

	const points = [furthest];
	let length = 0;
	let i = furthest; // starting at the furthest point you found,
	while (graph[i].cene !== null) { // step backwards and record the path
		length += nodes[i].edges[graph[i].cene].length;
		i = graph[i].cene;
		points.push(i);
	}
	return {points: points, length: length};
}


/**
 * compute the point equidistant from the three points given.
 */
export function circumcenter(points: {x: number, y: number}[]): {x: number, y: number} {
	if (points.length !== 3)
		throw "it has to be 3.";
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
 * @param onTheLeft whether the center is on the left of the strait-line path from a to b
 */
export function chordCenter(a: {x: number, y: number}, b: {x: number, y: number}, r: number, onTheLeft: boolean) {
	const d = Math.hypot(b.x - a.x, b.y - a.y);
	let l = Math.sqrt(r*r - d*d/4);
	if (onTheLeft) l *= -1;
	const sinθ =  (b.y - a.y)/d;
	const cosθ = -(b.x - a.x)/d;
	return {
		x: (a.x + b.x)/2 + l*sinθ,
		y: (a.y + b.y)/2 + l*cosθ,
	}
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
export function orthogonalBasis(n: Vector, normalize: boolean = false, axis: Vector = new Vector(0, 0, 1), bias: Vector = new Vector(1, 0, 0)): {u: Vector, v: Vector, n: Vector} {
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
		u = u.norm();
		v = v.norm();
		n = n.norm();
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

	sqr(): number {
		return this.dot(this);
	}

	norm(): Vector {
		return this.over(Math.sqrt(this.sqr()));
	}

	toString(): string {
		return `<${Math.trunc(this.x*1e3)/1e3}, ${Math.trunc(this.y*1e3)/1e3}, ${Math.trunc(this.z*1e3)/1e3}>`;
	}
}


/**
 * an n×m matrix
 */
export class Matrix {
	private readonly values: number[][];
	public readonly n: number;
	public readonly m: number;

	constructor(values: number[][]) {
		for (let i = 0; i < values.length; i ++)
			if (values[i].length !== values[0].length)
				throw RangeError("the rows of a Matrix must all have the same length.");
		this.values = values;
		this.n = values.length;
		this.m = values[0].length;
	}

	public times(that: Matrix): Matrix {
		if (this.m !== that.n)
			throw RangeError("these matrices don't have compatible sizes.");
		const newValues: number[][] = [];
		for (let i = 0; i < this.n; i ++) {
			newValues.push([]);
			for (let j = 0; j < that.m; j ++) {
				newValues[i].push(0);
				for (let k = 0; k < this.m; k ++) {
					newValues[i][j] += this.values[i][k]*that.values[k][j];
				}
			}
		}
		return new Matrix(newValues);
	}

	public trans(): Matrix {
		const newValues: number[][] = [];
		for (let i = 0; i < this.m; i ++) {
			newValues.push([]);
			for (let j = 0; j < this.n; j ++)
				newValues[i].push(this.values[j][i]);
		}
		return new Matrix(newValues);
	}

	/**
	 * ported from https://www.sanfoundry.com/java-program-find-inverse-matrix/
	 */
	public inverse(): Matrix {
		if (this.n !== this.m)
			throw "the matrix has to be square";
		const n = this.n;

		const a: number[][] = [];
		for (let i = 0; i < n; i ++)
			a.push(this.values[i].slice());

		const x: number[][] = [];
		const b: number[][] = [];
		const index: number[] = [];
		for (let i = 0; i < n; i ++) {
			x.push([]);
			b.push([]);
			for (let j = 0; j < n; j ++) {
				x[i].push(0);
				b[i].push((i === j) ? 1 : 0);
			}
			index.push(0);
		}

		// Transform the matrix into an upper triangle
		Matrix.gaussian(a, index);

		// Update the matrix b[i][j] with the ratios stored
		for (let i = 0; i < n - 1; i ++)
			for (let j = i + 1; j < n; j ++)
				for (let k = 0; k < n; k ++)
					b[index[j]][k] -= a[index[j]][i] * b[index[i]][k];

		// Perform backward substitutions
		for (let i = 0; i < n; i ++) {
			x[n - 1][i] = b[index[n - 1]][i] / a[index[n - 1]][n - 1];
			for (let j = n - 2; j >= 0; j --) {
				x[j][i] = b[index[j]][i];
				for (let k = j + 1; k < n; k ++) {
					x[j][i] -= a[index[j]][k] * x[k][i];
				}
				x[j][i] /= a[index[j]][j];
			}
		}
		return new Matrix(x);
	}

	/**
	 * Method to carry out the partial-pivoting Gaussian
	 * elimination. Here index[] stores pivoting order.
	 */
	private static gaussian(a: number[][], index: number[]): void {
		const n = index.length;
		const c: number[] = [];
		for (let i = 0; i < n; i ++)
			c.push(0);

		// Initialize the index
		for (let i = 0; i < n; i ++)
			index[i] = i;

		// Find the rescaling factors, one from each row
		for (let i = 0; i < n; i ++) {
			let c1 = 0;
			for (let j = 0; j < n; j ++) {
				const c0 = Math.abs(a[i][j]);
				if (c0 > c1)
					c1 = c0;
			}
			c[i] = c1;
		}

		// Search the pivoting element from each column
		let k = 0;
		for (let j = 0; j < n - 1; j ++) {
			let pi1 = 0;
			for (let i = j; i < n; i ++) {
				let pi0 = Math.abs(a[index[i]][j]);
				pi0 /= c[index[i]];
				if (pi0 > pi1) {
					pi1 = pi0;
					k = i;
				}
			}

			// Interchange rows according to the pivoting order
			const itmp = index[j];
			index[j] = index[k];
			index[k] = itmp;
			for (let i = j + 1; i < n; i ++) {
				const pj = a[index[i]][j] / a[index[j]][j];

				// Record pivoting ratios below the diagonal
				a[index[i]][j] = pj;

				// Modify other elements accordingly
				for (let l = j + 1; l < n; l ++)
					a[index[i]][l] -= pj * a[index[j]][l];
			}
		}
	}

	public asArray(): number[][] {
		const output = [];
		for (const row of this.values)
			output.push(row.slice());
		return output;
	}

	get(i: number, j: number = 0): number {
		return this.values[i][j];
	}
}


