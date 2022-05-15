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
import Queue from "../util/queue.js";
import {USER_STRINGS} from "../gui/main.js";
import {Word} from "../language/word.js";
import {Point} from "./coordinates.js";
import {Random} from "./random.js";
import {trajectoryIntersection, Vector} from "./geometry.js";

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

export function tanh(x: number): number {
	if (!Number.isFinite(x) && x < 0) // tanh(-∞) = -1
		return -1;
	else if (!Number.isFinite(x) && x > 0) // tanh(+∞) = 1
		return 1;
	else { // tanh(x) = (exp(x) - exp(-x))/(exp(x) + exp(-x))
		const plus = Math.exp(x);
		const minus = Math.exp(- x);
		return (plus - minus)/(plus + minus);
	}
}

export function arctanh(x: number): number {
	return (Math.log(1 + x) - Math.log(1 - x))/2.;
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
 * shift a number by hole multiples of (max - min) to put it in the range [min, max],
 * assuming max > min.  if not, it will automatically reverse them.
 * @param value
 * @param min
 * @param max
 */
export function localizeInRange(value: number, min: number, max: number): number {
	return value - Math.floor((value - min)/(max - min))*(max - min);
}

/**
 * is value inside the inclusive interval bounded by a and b (order of a and b matters not)
 * @param value
 * @param a
 * @param b
 */
export function isBetween(value: number, a: number, b: number): boolean {
	if (a < b)
		return value >= a && value <= b;
	else
		return value >= b && value <= a;
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
		if (args[i] === null || args[i] === undefined) {
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
							 endpoints: Set<number>, threshold = 0): {points: number[], length: number} {
	const graph = [];
	for (let i = 0; i < nodes.length; i ++)
		graph.push({distance: Number.POSITIVE_INFINITY, cene: null, lewi: false});

	const queue: Queue<{start: number, end: number, distance: number}> = new Queue(
		[], (a, b) => a.distance - b.distance);
	for (const i of endpoints)
		queue.push({start: null, end: i, distance: 0}); // populate the queue with the endpoints

	let furthest = null;
	while (!queue.empty()) { // while there are places whither you can go
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
 * randomly generate a series of points that form a fractyllic squiggly line.  it will
 * start at (0, 0), and at (0, 1), and will all fall within the envelope formed by the
 * provided bounds polygon.
 * @param minScale all segments will be at most this long
 * @param rng the random number generator
 * @param bounds a closed polygon that the profile will try not to cross
 * @param alpha a dimensionless parameter that alters how noisy it is (limit is 1 or so)
 */
export function noisyProfile(minScale: number, rng: Random, bounds: Point[] = [], alpha = 0.5): Point[] {
	const confirmd = [{x: 0, y: 0}]; // the profile, which we will build gradually
	const pending = [{x: 1, y: 0}]; // the points that will go in the profile after something else (reversed)
	while (pending.length > 0) {
		const last = confirmd[confirmd.length - 1]; // look at the upcoming segment
		const next = pending[pending.length - 1];
		const distance = Math.hypot(next.x - last.x, next.y - last.y);
		if (distance > minScale) { // if it is too long
			const r0 = new Vector((last.x + next.x)/2, (last.y + next.y)/2, 0); // find the point between them
			const axis = new Vector((last.y - next.y)/2, (next.x - last.x)/2, 0); // find the axis perpendicular to them

			let min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY; // now enforce the bounds
			for (let i = 0; i < bounds.length; i ++) {
				const a = bounds[i];
				const b = bounds[(i + 1)%bounds.length];
				const intersect = trajectoryIntersection(
					r0, axis, a, { x: b.x - a.x, y: b.y - a.y });
				const rX = new Vector(intersect.x, intersect.y, 0);
				const yX = (rX.minus(r0)).dot(axis)/axis.sqr();
				if (yX > 0)
					max = Math.min(max, yX);
				else
					min = Math.max(min, yX);
			}

			const y = alpha*arctanh(rng.uniform(tanh(min/alpha), tanh(max/alpha))); // TODO: also prevent self-intersection TODO: is there a more efficient function I can use?

			const nov = { x: r0.x + y*axis.x, y: r0.y + y*axis.y };
			console.assert(Number.isFinite(nov.x), bounds, r0, axis, min, max, y, nov);
			pending.push(nov); // and check it
		}
		else { // if it is short
			confirmd.push(pending.pop()); // confirm it
		}

		if (confirmd.length + pending.length > 1000) {
			console.error("I think something went rong??");
			return confirmd.concat(pending.slice().reverse());
		}
	}
	return confirmd;
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


