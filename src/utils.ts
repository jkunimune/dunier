// utils.ts: some mathy methods that need not clutter up the other files


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
 * linearly interpolate x from the sorted function X onto the corresponding output Y.
 */
export function linterp(inVal: number, inRef: number[], exRef: number[]): number {
	if (inRef.length !== exRef.length)
		throw "array lengths must match";

	let min = 0, max = inRef.length - 1;
	while (max - min > 1) {
		const mid = Math.trunc((min + max)/2);
		if (inRef[mid] <= inVal)
			min = mid;
		else
			max = mid;
	}

	return (inVal - inRef[min])/(inRef[max] - inRef[min])*(exRef[max] - exRef[min]) + exRef[min];
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

/**
 * combine the two arrays and remove duplicates.
 */
export function union(a: Iterable<any>, b: Iterable<any>): Iterable<any> {
	const aa = [...a];
	const ba = [...b];
	return aa.concat(ba.filter(e => !aa.includes(e)));
}

/**
 * load a static TSV resource. comments may be specified with a comment character. if a comment character is given,
 * whitespace will be stripped from each line after the comment is removed. so don't use a whitespace delimiter if you
 * want trailing empty columns and comments.
 * @param filename the filename (will search in ./res/ by default)
 * @param delimiter the symbol that indicates a column break
 * @param comment the symbol that indicates the start of a comment
 */
export function loadTSV(filename: string, delimiter: RegExp = /\t/, comment: RegExp = null): string[][] {
	const xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", `/res/${filename}`, false); // get the file
	xmlHttp.send();
	if (xmlHttp.status !== 200)
		throw `${xmlHttp.status} error while loading '${filename}': ${xmlHttp.statusText}`;
	const arr = [];
	for (let line of xmlHttp.responseText.split('\n')) { // read it line-by-line
		const matchObject = line.match(comment);
		if (matchObject !== null && matchObject.index === 0) continue; // skip the line if it is all one comment
		line = line.split(comment)[0]; // remove the comment
		if (comment !== null) {
			line = line.replace(/\s+$/, '') // remove trailing whitespace
			line = line.replace(/^\s+/, '') // remove leading whitespace
		}
		if (line.length !== 0) arr.push(line.split(delimiter)); // if the line is nonempty, record it
	}
	return arr;
}

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
 * compute the point equidistant from the three points given.
 */
export function circumcenter(points: {x: number, y: number}[]): {x: number, y: number} {
	if (points.length !== 3)
		console.log("it has to be 3.");
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
 * cover a field of points in Delaunay triangles.
 * @param points the list of points in 3-space that are to be triangulated
 * @param normals the normal vector of the triangulated circle at each point, assumed to be [0,0,1] if not specified.
 * @param sample optional set of dummy points to seed the surface
 * @param sampleNormals normal vectors to go with sample
 * @param partition optional set of starter triangles to establish topology, represented as arrays of sample indices.
 * the partition must contain all points if given, and must be given for non-planes.
 */
export function delaunayTriangulate(points: Vector[],
									normals: Vector[] = [new Vector(0, 0, 1)],
									sample: Vector[] = [],
									sampleNormals: Vector[] = [new Vector(0, 0, 1)],
									partition: number[][] = []
): {triangles: number[][], parentage: number[][], between: number[][][]} {
	if (partition.length === 0) { // start by creating a partition if we have none
		let xMax = Number.NEGATIVE_INFINITY, xMin = Number.POSITIVE_INFINITY;
		let yMax = Number.NEGATIVE_INFINITY, yMin = Number.POSITIVE_INFINITY;
		for (let i = 0; i < points.length; i ++) {
			if (points[i].z !== 0) // assert that it is in fact a plane (remove this if I ever need to implement for not a plane)
				throw "me yexo no bina autonomi fene da no plate.";
			if (points[i].x > xMax) xMax = points[i].x; // and get the bounding box in the x-y plane
			if (points[i].x < xMin) xMin = points[i].x;
			if (points[i].y > yMax) yMax = points[i].y;
			if (points[i].y < yMin) yMin = points[i].y;
		}
		sample = [
			new Vector(2*xMin - xMax, 2*yMin - yMax, 0), // set the sample to the corners of the bounding boxen
			new Vector(2*xMax - xMin, 2*yMin - yMax, 0),
			new Vector(2*xMax - xMin, 2*yMax - yMin, 0),
			new Vector(2*xMin - xMax, 2*yMax - yMin, 0),
		];
		partition = [[0, 1, 2], [2, 3, 0]]; // and triangulate it trivially
	}

	const nodos: DelaunayNodo[] = []; // convert the primitive inputs into our own object formats
	for (let i = 0; i < sample.length; i ++)
		nodos.push(new DelaunayNodo(i - sample.length, sample[i], sampleNormals[i%sampleNormals.length]));
	const partitionTriangles = partition.map((t: number[]) =>
		new DelaunayTriangle(nodos[t[0]], nodos[t[1]], nodos[t[2]], true));

	const triangles = partitionTriangles.slice(); // then set up the full triangle array
	for (let i = 0; i < points.length; i ++)
		nodos.push(new DelaunayNodo(i, points[i], normals[i%normals.length])); // and make the actual nodos

	for (const node of nodos.slice(sample.length)) { // for each node,
		let containing = findSmallestEncompassing(node, partitionTriangles); // find out which triangle it's in
		for (let j = 0; j < 3; j ++) { // add the three new child triangles
			triangles.push(new DelaunayTriangle(
				node,
				containing.nodos[j],
				containing.nodos[(j + 1) % 3]));
		}
		containing.children = triangles.slice(triangles.length - 3); // we could remove containing from triangles now, but it would be a waste of time
		const flipQueue = []; // start a list of edges to try flipping
		for (let i = 0; i < 3; i ++)
			flipQueue.push(new DelaunayEdge(containing.nodos[i], containing.nodos[(i+1)%3])); // and put the edges of this triangle on it
		const flipHistory = flipEdges(flipQueue, triangles, [], node); // do the flipping thing
		node.parents = [];
		for (const triangle of node.triangles) { // its parentage is all currently connected non-dummy nodes
			if (triangle.children === null && widershinsOf(node, triangle).i >= 0)
				node.parents.push(widershinsOf(node, triangle));
		}
		for (const edge of flipHistory) { // keep track of the edges that this node flipped; it is "between" those endpoints
			if (edge.a.i >= 0 && edge.b.i >= 0)
				node.between.push([edge.a, edge.b]);
		}
	}

	for (const node of nodos.slice(0, sample.length)) // now remove the partition vertices
		triangles.push(...removeNode(node));

	const triangleIdx = triangles.filter((t: DelaunayTriangle) => t.children === null)
		.map((t: DelaunayTriangle) => t.nodos.map((n: DelaunayNodo) => n.i));
	const parentIdx = nodos.filter((n: DelaunayNodo) => n.i >= 0)
		.map((n: DelaunayNodo) => n.parents.map((n: DelaunayNodo) => n.i));
	const betweenIdx = nodos.filter((n: DelaunayNodo) => n.i >= 0)
		.map((n: DelaunayNodo) => n.between.map((ns: DelaunayNodo[]) => [ns[0].i, ns[1].i]));
	return {triangles: triangleIdx, parentage: parentIdx, between: betweenIdx}; // convert all to indices and return
}

/**
 * remove all Triangles and Edges connected to the given node, and return a list of new
 * Triangles between the surrounding nodes to replace them.
 * @param node the dummy node to be removed
 * @return array of new Triangles
 */
function removeNode(node: DelaunayNodo): DelaunayTriangle[] {
	const oldTriangles: DelaunayTriangle[] = [[...node.triangles].filter((t: DelaunayTriangle) => t.children === null)[0]]; // starting with an arbitrary neighboring triangle
	while (true) { // trace the graph to find the surrounding triangles in widershins order
		let prev = oldTriangles[oldTriangles.length - 1];
		let med = clockwiseOf(node, prev);
		let next;
		try {
			next = triangleOf(node, med);
		} catch {
			next = null;
		}

		if (next === null) { // if you come up short,
			while (true) { // do the same thing in the other direction
				let prev = oldTriangles[0];
				let med = widershinsOf(node, prev);
				let next;
				try {
					next = triangleOf(med, node);
				} catch {
					next = null;
				}

				if (next === null)
					break;
				else
					oldTriangles.splice(0, 0, next);
			}
			return removeNodeHull(node, oldTriangles); // and call the exterior node function
		}

		else if (next === oldTriangles[0]) // otherwise go until you get back to whence you started
			break;
		else
			oldTriangles.push(next);
	}
	return removeNodeInterior(node, oldTriangles); // and then call the embeded node function
}

/**
 * remove all Triangles and Edges connected to the given interior node, given the Triangles that completely surround it.
 * @param node the dummy node to be removed
 * @param surroundings all triangles connected to node to be destroyed, in widershins order
 */
function removeNodeInterior(node: DelaunayNodo, surroundings: DelaunayTriangle[]): DelaunayTriangle[] {
	const newTriangles: DelaunayTriangle[] = [];
	const flipQueue: DelaunayEdge[] = [], flipImmune: DelaunayEdge[] = [];
	arbitrationLoop:
	for (let i0 = 0; i0 < surroundings.length; i0 ++) { // we have to pick an arbitrary border node to start this process
		const a = clockwiseOf(node, surroundings[i0]); // choosing i0 is harder than it may seem if we want to avoid coincident triangles
		for (let j = 2; j < surroundings.length-1; j ++) { // run through all the edges we're going to make
			const c = clockwiseOf(node, surroundings[(i0 + j)%surroundings.length]);
			if (isAdjacentTo(a, c)) // and check if any of them already exist
				continue arbitrationLoop; // if so, try a different start
		}
		for (let j = 0; j < surroundings.length; j ++) { // begin fixing the gap left by this null node
			const b = widershinsOf(node, surroundings[(i0 + j)%surroundings.length]);
			const c = clockwiseOf(node, surroundings[(i0 + j)%surroundings.length]);
			surroundings[j].children = []; // by disabling the triangles that used to fill it
			if (j >= 2)
				newTriangles.push(new DelaunayTriangle(a, b, c)); // and filling it with new, naively placed triangles
			if (j >= 2 && j < surroundings.length-1)
				flipQueue.push(new DelaunayEdge(a, c)); // keep track of the edges to be flipped
			flipImmune.push(new DelaunayEdge(b, c)); // and to avoid being flipped
		} // if you make it to the end of the for loop, then arbitrary was a fine choice
		break; // and we can proceed
	}

	flipEdges(flipQueue, newTriangles, flipImmune); // do the part where we make it delaunay
	return newTriangles;
}

/**
 * remove all Triangles and Edges connected to the given hull node, given the Triangles that connect it to the interior.
 * @param node the dummy node to be removed
 * @param neighbors all triangles connected to node to be destroyed, ordered from right to left from Node's perspective
 */
function removeNodeHull(node: DelaunayNodo, neighbors: DelaunayTriangle[]): DelaunayTriangle[] {
	const newTriangles: DelaunayTriangle[] = [];
	const flipQueue: DelaunayEdge[] = [];
	for (let i = neighbors.length-1; i > 0; i --) { // for each edge connected to node
		const a = widershinsOf(node, neighbors[i-1]); // consider what would happen if you flipped it
		const b = clockwiseOf(node, neighbors[i-1]);
		const c = clockwiseOf(node, neighbors[i]);
		const [ap, bp, cp] = flatten(a, b, c); // project their positions into the normal plane
		if (isRightSideOut(ap, bp, cp)) { // if the resulting triangle could be considered a triangle by the weakest possible definition
			neighbors[i-1].children = neighbors[i].children = []; // flip it
			neighbors.splice(i - 1, 1, new DelaunayTriangle(c, node, a)); // you get a new triangle in neighbors
			newTriangles.push(new DelaunayTriangle(a, b, c)); // and a new triangle in newTriangles
			flipQueue.push(new DelaunayEdge(a, c));
		}
	}
	for (const triangle of node.triangles) // make sure these are all gone
		triangle.children = [];
	flipEdges(flipQueue, newTriangles); // and do some Delaunay checking
	return newTriangles;
}

/**
 * Go through the queue and flip any non-delaunay edges. After flipping an edge, add
 * adjacent edges to the queue. Do not check edges that have newestNode as an endpoint or
 * that are in immune.
 * @param queue initial edges to check
 * @param triangles the list of all Triangles, which must be kept up to date
 * @param immune edges that do not need to be checked
 * @param newestNode a node for which any edges that touch it need not be checked
 * @return Array of Edges that were flipped
 */
export function flipEdges(queue: DelaunayEdge[], triangles: DelaunayTriangle[],
						  immune: DelaunayEdge[] = [], newestNode: DelaunayNodo = null): DelaunayEdge[] {
	const flipped: DelaunayEdge[] = [];

	while (queue.length > 0) { // go through that queue
		const edge = queue.pop(); // extract the needed geometric entities
		const a = edge.a;
		const c = edge.b;
		let abc = null, cda = null;
		try { // be careful when getting the hypothetical cross edge
			abc = triangleOf(c, a)
			cda = triangleOf(a, c);
		} catch { // if you can't find a triangle on one side or the other
			continue; // it might mean you've hit the end of the partition (I'm sure it's fine)
		}
		const b = widershinsOf(a, abc);
		const d = widershinsOf(c, cda);

		const [ap, bp, cp, dp] = flatten(a, b, c, d); // project their positions into the normal plane
		if (!isDelaunay(ap, bp, cp, dp)) { // and check for non-Delaunay edges
			triangles.push(new DelaunayTriangle(b, c, d)); // if it is so, add new triangles
			triangles.push(new DelaunayTriangle(d, a, b));
			abc.children = cda.children = triangles.slice(triangles.length-2); // remove the old ones by assigning them children
			flipped.push(new DelaunayEdge(a, c)); // record this
			immune.push(new DelaunayEdge(a, c));
			const perimeter = [new DelaunayEdge(a, b), new DelaunayEdge(b, c), new DelaunayEdge(c, d), new DelaunayEdge(d, a)];
			addToQueueLoop:
			for (const nextEdge of perimeter) { // and add the neighbors to the queue
				for (const safeEdge of queue.concat(immune))
					if (nextEdge.a === safeEdge.a && nextEdge.b === safeEdge.b)
						continue addToQueueLoop; // taking care to skip edges that have already been flipped
				if (nextEdge.a === newestNode || nextEdge.b === newestNode)
					continue;
				queue.push(nextEdge);
			}
		}
	}

	return flipped;
}

/**
 * Average the normal vectors of the given nodes and project them into the plane perpendicular to that normal.
 * @param nodes
 */
export function flatten(...nodes: DelaunayNodo[]) {
	let n = new Vector(0, 0, 0);
	for (const node of nodes)
		n = n.plus(node.n);
	const {u, v} = orthogonalBasis(n, true);
	const projected = [];
	for (const node of nodes)
		projected.push({x: node.r.dot(u), y: node.r.dot(v)});
	return projected;
}

/**
 * Check whether a--c is a Delaunay edge in 2D given the existence of b and d
 */
function isDelaunay(a: {x: number, y: number}, b: {x: number, y: number},
					c: {x: number, y: number}, d: {x: number, y: number}): boolean {
	const mat = [
		[a.x - d.x, a.y - d.y, a.x*a.x + a.y*a.y - d.x*d.x - d.y*d.y],
		[b.x - d.x, b.y - d.y, b.x*b.x + b.y*b.y - d.x*d.x - d.y*d.y],
		[c.x - d.x, c.y - d.y, c.x*c.x + c.y*c.y - d.x*d.x - d.y*d.y],
	];
	let det = 0;
	for (let i = 0; i < 3; i ++) {
		det = det +
			mat[0][ i     ] * mat[1][(i+1)%3] * mat[2][(i+2)%3] -
			mat[0][(i+2)%3] * mat[1][(i+1)%3] * mat[2][ i     ];
	}
	return det < 0;
}

/**
 * Check whether a--b--c is a right-side-out triangle (return false if it's within machine precision of colinearity)
 */
function isRightSideOut(a: {x: number, y: number}, b: {x: number, y: number}, c: {x: number, y: number}): boolean {
	return a.x*(b.y - c.y) + b.x*(c.y - a.y) + c.x*(a.y - b.y) > 1e-14*(a.x**2 + a.y**2);
}

/**
 * go down the chain of triangles to find the one that contains this point
 * @param node the node being encompassed
 * @param triangles the top-level list of triangles in which to search
 */
function findSmallestEncompassing(node: DelaunayNodo, triangles: Iterable<DelaunayTriangle>): DelaunayTriangle {
	let bestTriangle: DelaunayTriangle = null;
	let bestDistance: number = Number.POSITIVE_INFINITY;
	for (const triangle of triangles) {
		if (contains(triangle, node)) {
			const d2 = /*(triangle.basic) ?*/ distanceSqr(triangle, node);// : 0; // we need to check the distance in case there are multiple candies
			if (d2 < bestDistance)
				[bestDistance, bestTriangle] = [d2, triangle];
		}
	}

	// for (const triangle of triangles) {
	// 	console.log(`[`);
	// 	for (let i = 0; i <= 3; i ++) {
	// 		const a = (i < 3) ? triangle.nodos[i] : node;
	// 		console.log(`[${a.r.x}, ${a.r.y}, ${a.r.z}, ${a.n.x}, ${a.n.y}, ${a.n.z}],`);
	// 	}
	// 	if (contains(triangle, node))
	// 		console.log(`[0,0,0,0,0,0]],`);
	// 	else
	// 		console.log(`[1,1,1,1,1,1]],`);
	// }

	if (bestTriangle === null)
		throw new RangeError("no eureka tingon da indu");
	else if (bestTriangle.children === null)
		return bestTriangle;
	else
		return findSmallestEncompassing(node, bestTriangle.children);
}

/**
 * determine whether this triangle contains the given Nodo, using its neighbors to
 * hint at the direction of the surface. must return false for points outside the
 * triangle's circumcircle.
 * @param triangle the containing triangle
 * @param p the point being contained
 */
function contains(triangle: DelaunayTriangle, p: DelaunayNodo): boolean {
	const totalNormal = triangle.nodos[0].n.plus(triangle.nodos[1].n).plus(triangle.nodos[2].n);
	if (p.n.dot(totalNormal) < 0)
		return false; // check alignment on the surface
	for (let i = 0; i < 3; i ++) {
		const a = triangle.nodos[i];
		const na = a.n;
		const b = triangle.nodos[(i+1)%3];
		const nb = b.n;
		const edgeDirection = b.r.minus(a.r);
		const normalDirection = na.plus(nb);
		const boundDirection = normalDirection.cross(edgeDirection);
		const relativePos = (a.i < b.i) ? p.r.minus(a.r) : p.r.minus(b.r);
		if (boundDirection.dot(relativePos) < 0)
			return false; // check each side condition
	}
	return true;
}

/**
 * compute the square of the minimum distance from this triangle to this Nodo.
 * @param triangle
 * @param p
 */
function distanceSqr(triangle: DelaunayTriangle, p: DelaunayNodo): number {
	for (let i = 0; i < 3; i ++) { // for each edge
		const [a, b, c] = [triangle.nodos[i%3], triangle.nodos[(i+1)%3], triangle.nodos[(i+2)%3]];
		const u = b.r.minus(a.r); // throw together some quick orthogonal alined with each edge
		const v = triangle.n.cross(u);
		const t = v.dot(p.r.minus(a.r)); // project onto the perpendicular plane
		if (t < 0) { // if it lands outside the triangle
			const s = u.dot(p.r.minus(a.r)); // project onto the edge plane
			if (s <= 0) { // if it falls too far to the left
				if (c.r.minus(a.r).dot(p.r.minus(a.r)) > 0) // check whether it falls into the domain of the last edge
					continue; // otherwise,
				return p.r.minus(a.r).sqr(); // it's the distance to this vertex
			}
			else if (s >= u.dot(b.r.minus(a.r))) { // if it's too far to the rite
				if (c.r.minus(b.r).dot(p.r.minus(a.r)) > 0) // check whether it falls into the domain of the next edge
					continue; // otherwise,
				return p.r.minus(b.r).sqr(); // it's the distance to that vertex
			}
			else // if it's in the middle
				return p.r.minus(a.r).sqr() - u.dot(p.r.minus(a.r))**2/u.sqr(); // compute the point-line distance
		}
	}
	return Math.pow(p.r.minus(triangle.nodos[0].r).dot(triangle.n), 2)/triangle.n.sqr(); // compute the point-plane distance
}

/**
 * find the Nodo that appears after node on this triangle.
 * @param node
 * @param triangle
 */
function widershinsOf(node: DelaunayNodo, triangle: DelaunayTriangle) {
	for (let i = 0; i < 3; i ++)
		if (triangle.nodos[i] === node)
			return triangle.nodos[(i+1)%3];
	throw "This node isn't even in this triangle.";
}

/**
 * find the Nodo that appears previous to node on this triangle.
 * @param node
 * @param triangle
 */
function clockwiseOf(node: DelaunayNodo, triangle: DelaunayTriangle) {
	for (let i = 0; i < 3; i ++)
		if (triangle.nodos[i] === node)
			return triangle.nodos[(i+2)%3];
	throw "This node isn't even in this triangle.";
}

/**
 * find the Triangle that has these two Nodes in this order
 */
function triangleOf(a: DelaunayNodo, b: DelaunayNodo) {
	for (const triangle of a.triangles)
		if (triangle.children === null && widershinsOf(a, triangle) === b)
			return triangle;
	throw "these nodes don't appear to have a triangle";
}

/**
 * is there an edge between these two nodes?
 * @param a
 * @param b
 */
function isAdjacentTo(a: DelaunayNodo, b: DelaunayNodo) {
	for (const triangle of a.triangles)
		if (triangle.children === null && b.triangles.has(triangle))
			return true;
	return false;
}

/**
 * a delaunay node (voronoi polygon)
 */
export class DelaunayNodo {
	public i: number; // index
	public r: Vector; // position
	public n: Vector; // normal vector
	public triangles: Set<DelaunayTriangle>; // attached triangles
	public parents: DelaunayNodo[]; // parent nodes
	public between: DelaunayNodo[][]; // parent nodes it separates

	constructor(i: number, r: Vector, n: Vector) {
		this.i = i;
		this.r = r;
		this.n = n;
		this.triangles = new Set();
		this.parents = [];
		this.between = [];
	}
}

/**
 * a delaunay triangle (voronoi vertex)
 */
class DelaunayTriangle {
	public readonly nodos: DelaunayNodo[];
	public children: DelaunayTriangle[];
	public readonly basic: boolean;
	public readonly n: Vector;

	constructor(a: DelaunayNodo, b: DelaunayNodo, c: DelaunayNodo, basic: boolean = false) {
		this.nodos = [a, b, c];
		this.children = null;
		this.basic = basic;
		for (const v of this.nodos)
			v.triangles.add(this);
		this.n = b.r.minus(a.r).cross(c.r.minus(a.r));
	}
}

/**
 * a delaunay edge, connecting two nodes and two triangles
 */
class DelaunayEdge {
	public a: DelaunayNodo;
	public b: DelaunayNodo;

	constructor(a: DelaunayNodo, b: DelaunayNodo) {
		this.a = (a.i < b.i) ? a : b; // set up the order so a always has the lower index
		this.b = (a.i < b.i) ? b : a;
	}
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


/**
 * a data structure storing a series of nonintersecting segments on a line, with the ability
 * to efficiently erode all segments by the same amount.
 */
export class ErodingSegmentTree {
	/** the remaining height it can erode before being empty (half-width of the largest interval) */
	private radius: number;
	/** the center of the largest remaining interval */
	private pole: number;
	/** the link with the leftmost endpoint */
	private minim: Link;
	/** the link with the rightmost endpoint */
	private maxim: Link;
	/** the link with the root endpoint */
	private mul: Link;
	/** the number of additions so far */
	private index: number;

	constructor(xMin: number, xMax: number) {
		if (xMin > xMax)
			throw RangeError("initial range must be positive!");
		this.minim = new Link(xMin, true, 0, null);
		this.maxim = new Link(xMax, false, 1, this.minim, this.minim, null);
		this.mul = this.minim;
		this.radius = (xMax - xMin)/2;
		this.pole = (xMax + xMin)/2;
		this.index = 1;
	}

	/**
	 * remove the region between xL and xR from the segments.
	 * @param xL
	 * @param xR
	 */
	block(xL: number, xR: number): void {
		if (xL > xR)
			throw RangeError("blocking range must be positive!");
		let left = this.search(xL, this.mul); // find the left bound
		if (left !== null && left.esaLeft) // if it is in an included area
			left = this.insert(xL, false, this.mul); // insert a new Link
		let rait = this.search(xR, this.mul);
		rait = (rait !== null) ? rait.bad : this.minim; // find the right bound
		if (rait !== null && !rait.esaLeft) // if it is in an included area
			rait = this.insert(xR, true, this.mul); // find the right bound

		if (left === null || left.bad !== rait) // if there was anything between them
			this.deleteBetween(left, rait, this.mul); // remove it

		if ((left === null || this.pole >= left.val) || (rait === null || this.pole <= rait.val)) { // if you touched the pole, recalculate it
			this.radius = 0;
			this.pole = Number.NaN;
			let link = this.minim;
			while (link !== null) {
				if (link.bad.val - link.val > 2 * this.radius) {
					this.radius = (link.bad.val - link.val) / 2;
					this.pole = (link.bad.val + link.val) / 2;
				}
				link = link.bad.bad;
			}
		}
	}

	/**
	 * move all endpoints inward by t, and remove now empty intervals.
	 * @param t
	 */
	erode(t: number): void {
		let link = this.minim;
		while (link !== null) {
			if (link.bad.val - link.val <= 2*t) {
				const next = link.bad.bad;
				this.deleteBetween(link.cen, next, this.mul);
				link = next;
			}
			else {
				link.val += t;
				link.bad.val -= t;
				link = link.bad.bad;
			}
		}
		this.radius -= t;
	}

	/**
	 * is this value contained in one of the segments?
	 * @param value
	 */
	contains(value: number): boolean {
		const left = this.search(value, this.mul);
		return left !== null && left.esaLeft;
	}

	/**
	 * find the endpoint nearest this value.
	 * @param value
	 */
	nearest(value: number): number {
		const left = this.search(value, this.mul);
		const rait = left.bad;
		if (value - left.val < rait.val - value)
			return left.val;
		else
			return rait.val;
	}

	/**
	 * insert a new value, with it's esaLeft parameter, in the proper place
	 * @param value
	 * @param left
	 * @param start
	 */
	insert(value: number, left: boolean, start: Link): Link {
		if (start.val <= value) {
			if (start.raitPute !== null)
				return this.insert(value, left, start.raitPute); // look in the right subtree
			else
				return start.raitPute = new Link(value, left, this.index += 1, start, start, start.bad); // this _is_ the right subtree
		}
		else {
			if (start.leftPute !== null)
				return this.insert(value, left, start.leftPute); // look in the left subtree
			else
				return start.leftPute = new Link(value, left, this.index += 1, start, start.cen, start); // this _is_ the left subtree
		}
	}

	/**
	 * search for the last element e in the subtree from start, such that e.val <= value
	 * @param value
	 * @param start
	 */
	search(value: number, start: Link): Link {
		if (start.val <= value) { // if it could be start
			let res = null;
			if (start.raitPute !== null) // look in the right subtree
				res = this.search(value, start.raitPute);
			if (res === null) // if there was no right subtree or the search turn up noting
				return start; // the answer is start
			else
				return res; // otherwise return whatever you found
		}
		else { // if it is left of start
			if (start.leftPute !== null)
				return this.search(value, start.leftPute); // look in the left tree. if it's not there, it's not here.
			else
				return null;
		}
	}

	/**
	 * delete all Links between these two, excluding these two
	 * @param left
	 * @param rait
	 * @param start the root of the subtree where we're doing
	 */
	deleteBetween(left: Link, rait: Link, start: Link): void { // TODO how will this work with identical leavs?
		if (start === this.mul) { // if this is the top level, there's some stuff we need to check
			if (left === null && rait === null) { // if we're deleting the whole thing
				this.mul = null; // delete the whole thing and be done
				return;
			}
			else if (left === null) // if we're deleting the left side
				this.minim = rait; // get the new minim
			else if (rait === null)
				this.maxim = left; // get the new maxim
		}
		console.assert(start !== null);

		const raitOfCenter = rait === null || start.cena(rait); // does the right bound include start?
		const leftOfCenter = left === null || left.cena(start); // does the left bound include start?
		if (leftOfCenter && start.leftPute !== null) { // we need to check the left side
			if (left === null && (rait === start || raitOfCenter)) // if we can,
				start.leftPute = null; // drop the entire left branch
			else if (rait === start || raitOfCenter) // if not but at least the right side of left is all taken
				this.deleteBetween(left, null, start.leftPute); // check the left side of the left branch
			else // if there are no shortcuts
				this.deleteBetween(left, rait, start.leftPute); // check the whole left branch
		}
		if (raitOfCenter && start.raitPute !== null) { // we need to check the right side
			if (rait === null && (left === start || leftOfCenter)) // if we can,
				start.raitPute = null; // drop the entire right branch
			else if (left === start || leftOfCenter) // if not but at least the left side of right is all taken
				this.deleteBetween(null, rait, start.raitPute); // check the left side of the right branch
			else // if there are no shortcuts
				this.deleteBetween(left, rait, start.raitPute); // check the whole right branch
		}
		if (raitOfCenter && leftOfCenter) { // we need to delete this node
			this.delete(start);
		}

		if (left !== null)
			left.bad = rait;
		if (rait !== null)
			rait.cen = left;
	}

	/**
	 * remove a single node from the tree, keeping its children
	 * @param link
	 */
	delete(link: Link) {
		if (link.leftPute === null) {
			if (link.raitPute === null) { // if there are no children
				if (link.jener === null)
					this.mul = null;
				else if (link.jener.leftPute === link)
					link.jener.leftPute = null; // just delete it
				else
					link.jener.raitPute = null;
			}
			else { // if there is a rait child
				if (link === this.mul)
					this.mul = link.raitPute;
				link.kopiyu(link.raitPute); // move it here
			}
		}
		else {
			if (link.raitPute === null) { // if there is a left child
				if (link === this.mul)
					this.mul = link.leftPute;
				link.kopiyu(link.leftPute); // move it here
			}
			else { // if there are two children
				let veriBad = link.raitPute; // find the successor
				while (veriBad.leftPute !== null) // (don't use .bad because that one may have been deleted)
					veriBad = veriBad.leftPute;
				this.delete(veriBad); // cut that successor out of the graph
				if (link === this.mul)
					this.mul = veriBad;
				link.kopiyu(veriBad); // then reinsert it, overwriting this one
				veriBad.getaPute(link.leftPute, link.raitPute); // and transfer any remaining children to the successor
			}
		}
	}

	getClosest(value: number) {
		let closest = Number.NaN;
		let link = this.minim;
		while (link !== null) {
			if (Number.isNaN(closest) || Math.abs(link.val - value) < Math.abs(closest - value))
				closest = link.val;
			link = link.bad;
		}
		return closest;
	}

	getMinim(): number {
		return this.minim.val;
	}

	getMaxim(): number {
		return this.maxim.val;
	}

	getRadius(): number {
		return this.radius;
	}

	getPole(): number {
		return this.pole;
	}

	print(subtree: Link = null, indent: number = 0): void {
		if (subtree === null)
			subtree = this.mul;
		if (subtree === null) {
			console.log(`∅`);
			return;
		}
		let chenfikse = "";
		for (let i = 0; i < indent; i ++)
			chenfikse += "  ";
		console.log(chenfikse+`${subtree.val}#${subtree.index} (child of #${(subtree.jener === null) ? 'n' : subtree.jener.index}; #${(subtree.cen === null) ? 'n' : subtree.cen.index}<t<#${(subtree.bad === null) ? 'n' : subtree.bad.index})`);
		if (subtree.leftPute === null)
			console.log(chenfikse+"  -");
		else
			this.print(subtree.leftPute, indent + 1);
		if (subtree.raitPute === null)
			console.log(chenfikse+"  -");
		else
			this.print(subtree.raitPute, indent + 1);

		if (subtree === this.mul) {
			let l = this.minim;
			let str = '';
			while (l !== null) {
				if (l.esaLeft)
					str += `[${l.val}#${l.index}, `;
				else
					str += `${l.val}#${l.index}] `;
				l = l.bad;
			}
			console.log(str);
		}
	}
}

class Link {
	public jener: Link;
	public leftPute: Link;
	public raitPute: Link;
	public cen: Link;
	public bad: Link;
	public val: number;
	public esaLeft: boolean;
	public readonly index: number;

	constructor(val: number, left: boolean, index: number, jener: Link, cen: Link = null, bad: Link = null) {
		this.val = val;
		this.esaLeft = left;
		this.index = index;

		this.jener = jener;
		this.leftPute = null;
		this.raitPute = null;
		if (jener !== null) {
			if (jener === cen)
				jener.raitPute = this;
			else if (jener === bad)
				jener.leftPute = this;
			else
				throw "you can't insert a new leaf under neither of its neighbors; that makes no sense.";
		}

		this.cen = cen;
		if (cen !== null)
			cen.bad = this;
		this.bad = bad;
		if (bad !== null)
			bad.cen = this;
	}

	cena(that: Link): boolean {
		return this.val < that.val || (this.val === that.val && this.index < that.index);
	}

	kopiyu(nove: Link) {
		nove.jener = this.jener; // move it here
		if (this.jener !== null) {
			if (this.jener.raitPute === this)
				this.jener.raitPute = nove;
			else
				this.jener.leftPute = nove;
		}
	}

	getaPute(left: Link, rait: Link) {
		this.leftPute = left;
		if (left !== null)
			left.jener = this;
		this.raitPute = rait;
		if (rait !== null)
			rait.jener = this;
	}
}
