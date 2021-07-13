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
import {Matrix} from "./util.js";


/**
 * fit an arc to a set of points using an algorithm inspired by this paper:
 *     Chernov, N., Lesort, C. "Least Squares Fitting of Circles". J Math Imaging Vis 23,
 *     239–252 (2005). https://doi.org/10.1007/s10851-005-0482-8
 * @return {R: the radius of the arc, cx,cy: the coordinates of the center of curvature of
 *          the arc, μx,μy: the coordinates of the center of mass of the arc
 */
export function circularRegression(
	points: {x: number, y: number}[]): {cx: number, cy: number, R: number} {
	if (points.length <= 1)
		throw "you need more than one point to fit a circle, dingus.";
	else if (points.length == 2)
		throw "I suppose I could fit a line thru these two points, but with the way you've parameterized it, that's not really doable.";
	else if (points.length === 3)
		throw "I'll implement this later";

	let μx = 0, μy = 0;
	for (const {x, y} of points) {
		μx += x;
		μy += y;
	}
	[μx, μy] = [μx/points.length, μy/points.length];
	let sum = [];
	for (let i = 0; i <= 3; i ++)
		sum.push([0, 0, 0, 0]);
	for (const {x, y} of points)
		for (let i = 0; i <= 3; i ++)
			for (let j = 0; j <= 3; j ++)
				if (i + j >= 2 && i + j <= 3)
					sum[i][j] += Math.pow(x - μx, i) * Math.pow(y - μy, j);
	let [cx, cy] = solveLinearSystem(
		[[sum[2][0], sum[1][1]], [sum[1][1], sum[0][2]]],
		[(sum[3][0] + sum[1][2])/2, (sum[2][1] + sum[0][3])/2]);
	let R = Math.sqrt((sum[2][0] + sum[0][2])/points.length + cx*cx + cy*cy);
	[cx, cy] = [cx + μx, cy + μy];

	// const c = circumcenter([points[0], points[Math.trunc(points.length/2)], points[points.length-1]]);
	// let cx = c.x, cy = c.y;
	// let R = Math.hypot(points[0].x - cx, points[0].y - cy); // 4. TRI initial condition

	let A = 1/(2*R); // reparameterize the circle as A*(x^2 + y^2) + B*x + C*y + D = 1
	let B = -2*A*cx; // where D is defined by 1 = B^2 + C^2 - 4*A*D
	let C = -2*A*cy;

	[A, B, C] = fitLevenbergMarquardt(
		function(point: number[], state: number[]): number[] {
			const [x, y] = point;
			const [A, B, C] = state;
			const r2 = x*x + y*y;
			const D = (B*B + C*C - 1)/(4*A);
			const P = A*r2 + B*x + C*y + D;
			const Q = Math.sqrt(1 + 4*A*P);
			const d = 2*P/(1 + Q);
			return [d, r2, D, Q];
		},
		function(point: number[], state: number[], args: number[]): number[] {
			const [x, y] = point;
			const [A, B, C] = state;
			const [d, r2, D, Q] = args;
			const partial = 2*(1 - A*d/Q)/(1 + Q);
			return [
				partial*(r2 - D/A) - d*d/Q,
				partial*(x + B/(2*A)),
				partial*(y + C/(2*A))];
		},
		points.map((point: {x: number, y: number}) => [point.x, point.y]),
		[A, B, C],
		1e-8,
	);

	return {R: 1/(2*Math.abs(A)), cx: -B/(2*A), cy: -C/(2*A)}; // convert the result into more natural parameters
}

/**
 * find a local minimum of the funccion f(state; points) = Σ dist(point[i], state)^2,
 * using the Levengerg-Marquardt formula as defined in
 *     Shakarji, C. "Least-Square Fitting Algorithms of the NIST Algorithm Testing
 *     System". Journal of Research of the National Institute of Standards and Technology
 *     103, 633–641 (1988). https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=821955
 * @param dist the error of a single point given the state, along with any intermediate
 *             quantities that may be useful.  these will all be passd to grad as args.
 * @param grad the gradient of dist
 * @param points the list of points for which to minimize the errors
 * @param gess the inicial gess for the optimal state
 * @param tolerance the maximum acceptable value of the components of the gradient of the
 *                  sum of squares, normalized by the norm of the errors and the norm of
 *                  the gradients of the individual errors.
 * @return the parameters that minimize the sum of squared distances
 */
export function fitLevenbergMarquardt(
	dist: (point: number[], state: number[]) => number[],
	grad: (point: number[], state: number[], args: number[]) => number[],
	points: number[][],
	gess: number[],
	tolerance: number = 1e-4): number[] {
	let iter = 0;
	let state = gess.slice();
	let λ = 4e-5;

	let args: number[][] = []; // compute inicial distances
	let lastValue = Number.POSITIVE_INFINITY, newValue = 0;
	for (let i = 0; i < points.length; i ++) {
		args.push(dist(points[i], state)); // the dist funccion mite return other numbers besides the point distance
		newValue += Math.pow(args[i][0], 2);
	}

	while (true) {
		let dists = []; // extract distances
		let grads = []; // compute gradients
		for (let i = 0; i < points.length; i ++) {
			dists.push([args[i][0]]);
			grads.push(grad(points[i], state, args[i]));
		}

		if (isConverged(lastValue, newValue, dists, grads, tolerance, tolerance)) // check global convergence
			return state;
		lastValue = newValue;

		const d0: Matrix = new Matrix(dists); // convert distances and gradients to matrices
		const J0: Matrix = new Matrix(grads);
		const U: Matrix = J0.trans().times(J0); // and do some linear algebra
		const v: Matrix = J0.trans().times(d0);

		while (true) {
			const H = U.asArray(); // estimate Hessian
			for (let i = 0; i < state.length; i ++)
				H[i][i] += λ*(1 + U.get(i, i));
			const B = new Matrix(H).inverse();
			const x = B.times(v);

			const newState = []; // take step
			for (let i = 0; i < x.n; i ++)
				newState.push(state[i] - x.get(i));

			let newArgs = []; // recompute distances
			newValue = 0;
			for (let i = 0; i < points.length; i ++) {
				newArgs.push(dist(points[i], newState));
				newValue += Math.pow(newArgs[i][0], 2);
			}

			// console.log(`  ${lastValue} -> ${newValue}`);
			// console.log(x.trans().asArray()[0].toString());
			if (newValue <= lastValue) { // check line search convergence
				state = newState;
				args = newArgs;
				// console.log("exiting line search");
				break;
			}
			λ *= 10; // increment line search parameter
			if (λ > 1e64) // check iterations
				throw "the line search did not converge";
		}

		λ *= 4e-4; // decrement line search parameter

		iter += 1; // check iterations
		if (iter > 10000)
			throw "the maximum number of iteracions has been reachd";
	}
}

/**
 * check a vector of distances and their jacobian to see if we are clone enuff to the
 * minimum of the sum of squared distances
 * @param lastValue the sum of squared errors from the previous iteracion
 * @param nextValue the sum of squared errors from the current iteracion
 * @param dists the colum-vector of distances
 * @param grads the matrix where each row is the gradient of one distance
 * @param funcTolerance the minimum worthwhile relative change in the sum of squares
 * @param gradTolerance the maximum allowable absolute value of the cosine of the angle
 *                  between a colum of the jacobian and a residual vector
 */
export function isConverged(lastValue: number, nextValue: number,
							dists: number[][], grads: number[][],
							funcTolerance: number, gradTolerance: number): boolean {
	if (dists.length !== grads.length)
		throw "these matrix shapes do not match.";

	for (let i = 0; i < dists.length; i ++)
		if (dists[i].length !== 1)
			throw "This residual vector has not the rite shape.";

	if ((lastValue - nextValue)/lastValue < funcTolerance) // if the last relative change was smol
		return true; // call it dun

	for (let j = 0; j < grads[0].length; j ++) { // for each dimension of the state vector
		let distsSqr = 0;
		let gradDotDist = 0;
		let gradsSqr = 0;
		for (let i = 0; i < grads.length; i ++) {
			distsSqr += dists[i][0]*dists[i][0];
			gradDotDist += dists[i][0]*grads[i][j]; // compute the derivative of the sum of squares
			gradsSqr += grads[i][j]*grads[i][j];
		}
		const cosine = gradDotDist/Math.sqrt(distsSqr*gradsSqr); // normalize it
		if (Math.abs(cosine) > gradTolerance) // if just one derivative is nonzero
			return false; // it's not converged
	}

	return true; // if we got thru them all, then you're all g to terminate
}


/**
 * solve for the vector x such that vec = mat*x
 * @param mat
 * @param vec
 */
export function solveLinearSystem(mat: number[][], vec: number[]): number[] {
	const A = new Matrix(mat);
	const b = new Matrix([vec]).trans();
	const x = A.inverse().times(b);
	return x.trans().asArray()[0];
}
