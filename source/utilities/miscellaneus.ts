/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
// @ts-ignore
import Queue from "../datastructures/queue.js";
import {PathSegment, Point} from "./coordinates.js";
import {Random} from "./random.js";
import {trajectoryIntersection, Vector} from "./geometry.js";

/**
 * index of the maximum.
 */
export function argmax(arr: number[]): number {
	if (arr.length === 0)
		throw new Error("I cannot find the maximum of an empty array");
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
	if (x < -20) // tanh(-∞) = -1
		return -1;
	else if (x > 20) // tanh(+∞) = 1
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
 * search a sorted array for the first element that meets some condition
 * @param array the set of values to search, ordered such that all elements that don't
 *              meet the condition come before all elements that do meet the condition
 * @param condition the criterion that will determine which indices are acceptable
 * @return the index of the first element that meets the condition, or the length of
 *         the array if there is no such element.
 */
export function binarySearch<T>(array: T[], condition: (item: T) => boolean): number {
	if (array.length === 0)
		throw new Error("I cannot search an empty array.");
	let min = -1, max = array.length;
	while (max - min > 1) {
		const mid = Math.trunc((min + max)/2);
		if (condition(array[mid]))
			max = mid;
		else
			min = mid;
	}
	return max;
}

/**
 * linearly interpolate x from the sorted function X onto the corresponding output Y.
 * @throws an error if the reference array lengths don't match or if the input value is outside the given range.
 */
export function linterp(inVal: number, inRef: number[], exRef: number[]): number {
	if (inRef.length !== exRef.length)
		throw new Error("array lengths must match");
	if (inRef[0] > inRef[inRef.length - 1])
		throw new Error(
			`input reference array must be monotonicly increasing, 
			but this one goes from ${inRef[0]} to ${inRef[inRef.length - 1]}`);
	else if (inVal === inRef[0])
		return exRef[0];
	else if (inVal < inRef[0] || inVal > inRef[inRef.length - 1])
		throw new Error(
			`you tried to interpolate the point ${inVal}, which is out of bounds 
			(must be between ${inRef[0]} and ${inRef[inRef.length - 1]}`);
	else {
		const i = binarySearch(inRef, (ref) => ref >= inVal);
		return (inVal - inRef[i - 1])/(inRef[i] - inRef[i - 1])*(exRef[i] - exRef[i - 1]) + exRef[i - 1];
	}
}

/**
 * shift a number by hole multiples of (max - min) to put it in the range [min, max],
 * assuming max > min.  if not, it will automatically reverse them.
 * @param value
 * @param min
 * @param max
 */
export function localizeInRange(value: number, min: number, max: number): number {
	if (value > min && value < max)
		return value;
	else
		return value - Math.floor((value - min)/(max - min))*(max - min);
}

/**
 * is value inside the inclusive interval bounded by a and b.  the order of a and b matters not.
 * @param value the value that may or may not be in the interval
 * @param a the inclusive bound (could be minimum or maximum)
 * @param b the exclusive bound (could be minimum or maximum)
 */
export function isBetween(value: number, a: number, b: number): boolean {
	if (a < b)
		return value >= a && value <= b;
	else
		return value >= b && value <= a;
}

/**
 * combine the two arrays and remove duplicates, assuming the inputs have no duplicates to begin with.
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
 * there will be some overflow here, but I don't mind as I'm only using this for random seeds
 * @param string
 */
export function decodeBase37(string: string): number {
	let totalValue = 0;
	for (let i = 0; i < string.length; i ++) {
		const char = string.charCodeAt(i);
		let digit;
		if (char >= 48 && char < 58)
			digit = char - 48;
		else if (char >= 97 && char < 123)
			digit = char - 97 + 10;
		else if (char === 95)
			digit = 36;
		else
			throw RangeError(`base-36 strings must only contain digits, lowercase letters, and underscore, but '${string}' ` +
			                 `contains '${string.charAt(i)}'`);
		totalValue = (totalValue*37 + digit)%0x10000000000;
	}
	return totalValue;
}

/**
 * convert a path to an SVG path string that can be input to an SVG file
 * @param path
 */
export function pathToString(path: PathSegment[]): string {
	let str = ''; // create the d string
	for (let i = 0; i < path.length; i ++)
		str += path[i].type + path[i].args.join(',') + ' ';
	return str.trim();
}

/**
 * given a graph, find the longest path from some startpoint node to one of the given endpoint nodes that is shorter
 * than any other path between the same startpoint and endpoint.  so it essentially finds the path from the node
 * furthest from any valid endpoint to the nearest valid endpoint
 * @param nodes the locations of all of the nodes in the plane, and their connections.  each node has a position in the
 *              plane given as x and y and an array of edges.  the index in the array indicates which node the edge
 *              leads to (if there is no edge between two nodes there will be a null in the corresponding index of
 *              each's edges array), and each edge has properties indicating the distance along it and the amount of
 *              "clearance" it has (this is used to filter edges; those with a low clearance will be ignored if
 *              threshold is set high).
 * @param validEndpoints the indices of the possible endpoints
 * @param threshold the minimum clearance of an edge
 * @return list of indices starting with the farthest connected point and stepping through the path to the chosen
 *         endpoint, and the path's total length (the sum of the lengths of the traversed edges)
 */
export function longestShortestPath(nodes: {x: number, y: number, edges: {length: number, clearance: number}[]}[],
							        validEndpoints: Set<number>, threshold = 0): {points: number[], length: number} {
	// start by preparing an array that stores, for each node, how we got to it and how long it took
	const nodeInfo = [];
	for (let i = 0; i < nodes.length; i ++)
		nodeInfo.push({distance: Infinity, cene: null, lewi: false});

	const queue: Queue<{start: number, end: number, distance: number}> = new Queue(
		[], (a, b) => a.distance - b.distance);
	for (const end of validEndpoints)
		queue.push({start: null, end: end, distance: 0}); // populate the queue with the endpoints

	let furthest = null;
	while (!queue.empty()) { // while there are places whither you can go
		const {start, end, distance} = queue.pop(); // look for the closest one
		if (!nodeInfo[end].lewi) { // only look at each one once
			for (let next = 0; next < nodes.length; next ++) { // add its neighbors to the queue
				if (nodes[end].edges[next] !== null && nodes[end].edges[next].clearance >= threshold) // if they are connected with enough clearance
					queue.push({start: end, end: next, distance: distance + nodes[end].edges[next].length});
			}
			nodeInfo[end] = {distance: distance, cene: start, lewi: true}; // mark this as visited
			furthest = end; // and as the furthest yet visited
		}
	}

	const points = [furthest];
	let length = 0;
	let i = furthest; // starting at the furthest point you found,
	while (nodeInfo[i].cene !== null) { // step backwards and record the path
		length += nodes[i].edges[nodeInfo[i].cene].length;
		i = nodeInfo[i].cene;
		points.push(i);
	}
	return {points: points, length: length};
}


/**
 * randomly generate a series of points by fleshing out a given seed path, to form a fractyllic squiggly line.
 * it will start at the given start point, end at the given end point, and will all fall within the envelope
 * formed by the provided bounds polygon.
 * @param initialProfile some points that must be included in the profile.  there must be at least two – the first and
 *                       last ones will form the endpoints of the returned profile
 * @param resolution all segments will be at most this long
 * @param rng the random number generator
 * @param bounds a closed convex polygon that the profile will try not to cross
 * @param alpha a dimensionless parameter that alters how noisy it is (limit is 1 or so)
 */
export function noisyProfile(initialProfile: Point[], resolution: number, rng: Random, bounds: Point[] = [], alpha = 0.5): Point[] {
	if (initialProfile.length < 2)
		throw new Error(`this function must be called on an initial path with at least two points (you only gave ${initialProfile.length}).`);
	const confirmd = [initialProfile[0]]; // the profile, which we will build gradually
	const pending = initialProfile.slice(1).reverse(); // the points that will go in the profile after something else (reversed)

	while (pending.length > 0) {
		const last = confirmd[confirmd.length - 1]; // look at the upcoming segment
		const next = pending[pending.length - 1];
		const distance = Math.hypot(next.x - last.x, next.y - last.y);
		if (distance > resolution) { // if it is too long
			const r0 = new Vector((last.x + next.x)/2, (last.y + next.y)/2, 0); // find the point between them
			const axis = new Vector((last.y - next.y)/2, (next.x - last.x)/2, 0); // find the axis perpendicular to them

			let min = -Infinity, max = Infinity; // now enforce the bounds
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
			console.assert(Number.isFinite(nov.x), resolution, min, max, tanh(min/alpha), tanh(max/alpha), y, nov);
			pending.push(nov); // and check it
		}
		else { // if it is short enuff
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
 * whether something is contained in a region or not
 */
export enum Side {
	OUT, IN, BORDERLINE
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
			throw new Error("the matrix has to be square");
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
			x[n - 1][i] = b[index[n - 1]][i]/a[index[n - 1]][n - 1];
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
				const pj = a[index[i]][j]/a[index[j]][j];

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
