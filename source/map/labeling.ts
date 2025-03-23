/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {assert_xy, endpoint, PathSegment, XYPoint} from "../utilities/coordinates.js";
import {arcCenter, Vector} from "../utilities/geometry.js";
import {delaunayTriangulate} from "../utilities/delaunay.js";
import {contains} from "./pathutilities.js";
import {INFINITE_PLANE} from "../surface/surface.js";
import {localizeInRange, longestShortestPath, pathToString, Side} from "../utilities/miscellaneus.js";
import {circularRegression} from "../utilities/fitting.js";
import {ErodingSegmentTree} from "../datastructures/erodingsegmenttree.js";


const SIMPLE_PATH_LENGTH = 72; // maximum number of vertices for estimating median axis
const N_DEGREES = 6; // number of line segments into which to break one radian of arc
const RALF_NUM_CANDIDATES = 6; // number of sizeable longest shortest paths to try using for the label


/**
 * a function comprising a diagonal line down from infinity,
 * a horizontal line, and a diagonal line up to infinity
 */
interface Wedge {
	/** the x-coordinate of the transition from decreasing to constant */
	xL: number;
	/** the x-coordinate of the transition from constant to increasing */
	xR: number;
	/** the height of the horizontal pant */
	y: number;
	/** the absolute value of the slopes of the diagonal parts */
	slope: number;
}

/** a node in the skeleton graph */
interface Circumcenter {
	/** the x-coordinate of the point */
	x: number;
	/** the y-coordinate of the point */
	y: number;
	/** the distance from this point to the polygon */
	r: number;
	/** whether this point is inside the polygon */
	isContained: boolean;
	/**
	 * a list describing all of its potential graph connections.  each element represents
	 * a Circumcenter in the graph. a value of null indicates that there is no edge to the
	 * Circumcenter at that index.  a nonnull value indicates that there is an edge, and
	 * includes the distance between the two centers and the amount of space around that
	 * edge that's available for text.
	 */
	edges: { length: number, clearance: number }[];
}


/**
 * decide where to put the given label in the given polygon using a simplified form of the RALF labeling
 * algorithm, described in
 *     Krumpe, F. and Mendel, T. (2020) "Computing Curved Area Labels in Near-Real Time"
 *     (Doctoral dissertation). University of Stuttgart, Stuttgart, Germany.
 *     https://arxiv.org/abs/2001.02938 TODO: try horizontal labels: https://github.com/mapbox/polylabel
 * @param path the shape into which the label must fit
 * @param aspectRatio the ratio of the length of the text to be written to its height
 * @param minHeight the text height below which you shouldn't bother placing a label
 * @return the label location defined by the arc start point, the PathSegment describing its curvature and endpoint, and the allowable height of the label
 * @throws Error if it can't find any adequate place for this label
 */
export function chooseLabelLocation(path: PathSegment[], aspectRatio: number, minHeight: number): {start: XYPoint, arc: PathSegment, height: number} {
	path = resamplePath(path);

	// estimate the topological skeleton
	const centers = estimateSkeleton(path);

	let argmax = -1;
	for (let i = 0; i < centers.length; i++) { // find the circumcenter with the greatest clearance
		if (centers[i].isContained && (argmax < 0 || centers[i].r > centers[argmax].r))
			argmax = i;
	}
	if (argmax === -1) {
		console.log(pathToString(path));
		console.log(centers);
		throw new Error(`none of these circumcenters are contained in the polygon.  how is that possible?`);
	}

	const candidates: number[][] = []; // next collect candidate paths along which you might fit labels
	let minClearance = centers[argmax].r;
	while (candidates.length < RALF_NUM_CANDIDATES && minClearance >= minHeight) {
		minClearance /= 1.4; // gradually loosen a minimum clearance filter, until it is slitely smaller than the smallest font size
		const minLength = minClearance*aspectRatio;
		const usedPoints = new Set<number>();
		while (usedPoints.size < centers.length) {
			const newEndpoint = longestShortestPath(
				centers,
				(usedPoints.size > 0) ? usedPoints : new Set([argmax]),
				minClearance).points[0]; // find the point farthest from the paths you have checked TODO expand on this argmax thing to make sure check every exclave fore we start reducing the minimum
			if (usedPoints.has(newEndpoint)) break;
			const newShortestPath = longestShortestPath(
				centers, new Set([newEndpoint]), minClearance); // find a new diverse longest shortest path with that as endpoin
			if (newShortestPath.length >= minLength) { // if the label will fit,
				candidates.push(newShortestPath.points); // take it
				for (const point of newShortestPath.points)
					usedPoints.add(point); // and look for a different one
			}
			else // if it won't
				break; // reduce the required clearance and try again
		}
	}
	if (candidates.length === 0)
		throw new Error("no acceptable label candidates were found");

	let axisValue = -Infinity;
	let bestAxis: {start: XYPoint, arc: PathSegment, height: number} = null;
	for (const candidate of candidates) { // for each candidate label axis
		if (candidate.length < 3) continue; // with at least three points
		const {R, cx, cy} = circularRegression(candidate.map((i: number) => centers[i]));
		const midpoint = centers[candidate[Math.trunc(candidate.length/2)]];

		// convert path segments into wedge-shaped no-label zones
		const θ0 = Math.atan2(midpoint.y - cy, midpoint.x - cx);
		const {xMin, xMax, wedges} = mapPointsToArcCoordinates(R, cx, cy, θ0, path, aspectRatio);
		if (xMin > xMax) // occasionally we get these really terrible candidates TODO I think this means I did something rong.
			continue; // just skip them
		wedges.sort((a: { y: number }, b: { y: number }) => b.y - a.y); // TODO it would be slightly more efficient if I can merge wedges that share a min vertex

		let {location, halfHeight} = findOpenSpotOnArc(
			xMin, xMax, wedges);

		if (2*halfHeight < minHeight)
			continue; // also skip any candidates that are too small

		const θC = θ0 + location/R;
		const area = halfHeight*halfHeight, bendRatio = halfHeight/R, horizontality = -Math.sin(θ0);
		if (horizontality < 0) // if it's going to be upside down
			halfHeight *= -1; // flip it around
		// choose the axis with the biggest area and smallest curvature
		const value = Math.log(area) - bendRatio/(1 - bendRatio) + Math.pow(horizontality, 2);
		if (value > axisValue) {
			axisValue = value;
			const θL = θC - halfHeight*aspectRatio/R;
			const θR = θC + halfHeight*aspectRatio/R;
			bestAxis = {
				start: {x: cx + R*Math.cos(θL), y: cy + R*Math.sin(θL)},
				arc: {type: 'A', args: [
						R, R, 0,
						(Math.abs(θR - θL) < Math.PI) ? 0 : 1,
						(θR < θL) ? 0 : 1,
						cx + R*Math.cos(θR), cy + R*Math.sin(θR)
					]},
				height: 2*halfHeight,
			};
		}
	}
	if (bestAxis === null)
		throw new Error(`all ${candidates.length} candidates were somehow incredible garbage`);
	return bestAxis;
}


/**
 * add redundant vertices and delete shorter segments in an attempt to make the vertices of this shape
 * evenly spaced, and to make it have around `SIMPLE_PATH_LENGTH` vertices in total.
 * @param path the shape to resample
 */
function resamplePath(path: PathSegment[]): PathSegment[] {
	// first, copy the input so you don't modify it
	path = path.slice();

	for (let i = path.length - 1; i >= 1; i --) { // convert it into a simplified polygon
		if (path[i].type === 'A') { // turn arcs into triscadecagons TODO: find out if this can create coincident nodes and thereby Delaunay Triangulation to fail
			const start = assert_xy(endpoint(path[i-1]));
			const end = assert_xy(endpoint(path[i]));
			const l = Math.hypot(end.x - start.x, end.y - start.y);
			const r = Math.abs(path[i].args[0] + path[i].args[1])/2;
			const c = arcCenter(start, end, r,
				path[i].args[3] === path[i].args[4]);
			const Δθ = 2*Math.asin(l/(2*r));
			const θ0 = Math.atan2(start.y - c.y, start.x - c.x);
			const nSegments = Math.ceil(N_DEGREES*Δθ);
			const lineApprox = [];
			for (let j = 1; j <= nSegments; j ++)
				lineApprox.push({type: 'L', args: [ // TODO why not use arc segments here?
						c.x + r*Math.cos(θ0 + Δθ*j/nSegments),
						c.y + r*Math.sin(θ0 + Δθ*j/nSegments)]});
			path.splice(i, 1, ...lineApprox);
		}
	}

	while (path.length > SIMPLE_PATH_LENGTH) { // simplify path
		let shortI = -1, minL = Infinity;
		for (let i = 1; i < path.length-1; i ++) {
			if (path[i].type === 'L' && path[i+1].type === 'L') {
				let l = Math.hypot(
					path[i+1].args[0] - path[i-1].args[0], path[i+1].args[1] - path[i-1].args[1]);
				if (l < minL) { // find the vertex whose removal results in the shortest line segment
					minL = l;
					shortI = i;
				}
			}
		}
		path.splice(shortI, 1); // and remove it
	} // TODO this only ever upsamples or downsamples, but sometimes it may be necessary to do both to get an even edge length
	while (path.length < SIMPLE_PATH_LENGTH/2) { // complicate path
		let longI = -1, maxL = -Infinity;
		for (let i = 1; i < path.length; i ++) {
			if (path[i].type === 'L') {
				let l = Math.hypot(
					path[i].args[0] - path[i-1].args[0], path[i].args[1] - path[i-1].args[1]);
				if (l > maxL) { // find the longest line segment
					maxL = l;
					longI = i; // TODO it seems inefficient to do this every time rather than resampling all paths the desired degree
				}
			}
		}
		console.assert(longI >= 0, path);
		path.splice(longI, 0, { // and split it
			type: 'L',
			args: [(path[longI].args[0] + path[longI-1].args[0])/2, (path[longI].args[1] + path[longI-1].args[1])/2]
		});
	}

	return path;
}


function estimateSkeleton(path: PathSegment[]) { // TODO why not calculate the exact skeleton?  it doesn't take long
	const points: Vector[] = [];
	for (const segment of path) {
		if (segment.type === 'L') {
			const {x, y} = assert_xy(endpoint(segment));
			points.push(new Vector(x, y, 0));
		}
	}
	const triangulation = delaunayTriangulate(points); // start with a Delaunay triangulation of the border
	const centers: Circumcenter[] = [];
	for (let i = 0; i < triangulation.triangles.length; i++) { // then convert that into a voronoi graph
		const abc = triangulation.triangles[i];
		const a = points[abc[0]];
		const b = points[abc[1]];
		const c = points[abc[2]];
		const D = 2*(a.x*(b.y - c.y) + b.x*(c.y - a.y) + c.x*(a.y - b.y));
		centers.push({
			x: (a.sqr()*(b.y - c.y) + b.sqr()*(c.y - a.y) + c.sqr()*(a.y - b.y))/D, // calculating the circumcenters
			y: (a.sqr()*(c.x - b.x) + b.sqr()*(a.x - c.x) + c.sqr()*(b.x - a.x))/D,
			r: 0, isContained: false, edges: new Array(triangulation.triangles.length).fill(null),
		});
		centers[i].r = Math.hypot(a.x - centers[i].x, a.y - centers[i].y);
		centers[i].isContained = contains( // build a graph out of the contained centers
			path, {s: centers[i].x, t: centers[i].y}, INFINITE_PLANE,
		) !== Side.OUT; // (we're counting "borderline" as in)
		if (centers[i].isContained) {
			for (let j = 0; j < i; j++) {
				if (centers[j].isContained) {
					const def = triangulation.triangles[j]; // and recording adjacency
					triangleFit: // TODO: just store the triangle edge associated with each graph edge so you don't need to search for it every time
						for (let k = 0; k < 3; k++) {
							for (let l = 0; l < 3; l++) {
								if (abc[k] === def[(l + 1)%3] && abc[(k + 1)%3] === def[l]) {
									const a = new Vector(centers[i].x, centers[i].y, 0);
									const c = new Vector(centers[j].x, centers[j].y, 0);
									const b = points[abc[k]], d = points[abc[(k + 1)%3]];
									const length = Math.sqrt(a.minus(c).sqr()); // compute the length of this edge
									let clearance; // estimate of minimum space around this edge
									const mid = b.plus(d).over(2);
									if (a.minus(mid).dot(c.minus(mid)) < 0)
										clearance = Math.sqrt(b.minus(d).sqr())/2;
									else
										clearance = Math.min(centers[i].r, centers[j].r);
									centers[i].edges[j] = centers[j].edges[i] = {length: length, clearance: clearance};
									break triangleFit;
								}
							}
						}
				}
			}
		}
	}
	return centers;
}


/**
 * take an arc and a bunch of points in Cartesian coordinates, and calculate how much space is
 * available for a label of a given aspect ratio at each location.  this result will be expressed as
 * the label half-height (y) as a function of the arc-distance from `midpoint` to the label center (x).
 * that function will be expressed a a bunch of `Wedge` functions; at a given center location,
 * the maximum allowable half-height is the minimum of all the `Wedge`s evaluated at that x-value,
 * where x represents distance along the
 * @param R the radius of the arc
 * @param cx the Cartesian x-coordinate of the arc center
 * @param cy the Cartesian y-coordinate of the arc center
 * @param θ0 – the angle associated with a circular x-coordinate of 0 (in radians, measured from the x+ axis)
 * @param path the set of points and line segments that the label must avoid
 * @param aspectRatio the ratio of the desired label's length to its height
 * @return xMin – the absolute minimum acceptable circular x-coordinate
 * @return xMax – the absolute maximum acceptable circular x-coordinate
 * @return wedges – the set of `Wedge` functions that define the feasible space
 */
function mapPointsToArcCoordinates(
	R: number, cx: number, cy: number, θ0: number, path: PathSegment[], aspectRatio: number
): {xMin: number, xMax: number, wedges: Wedge[]} {
	const polarPath: PathSegment[] = []; // get polygon segments in circular coordinates
	for (const segment of path) {
		const [x, y] = segment.args;
		const θ = localizeInRange(Math.atan2(y - cy, x - cx) - θ0, -Math.PI, Math.PI);
		const r = Math.hypot(x - cx, y - cy);
		const xp = R*θ, yp = R - r;
		polarPath.push({type: segment.type, args: [xp, yp]});
	}

	let xMin = -Math.PI*R, xMax = Math.PI*R;
	const wedges: Wedge[] = [];
	for (let i = 1; i < polarPath.length; i ++) { // there's a wedge associated with each pair of points
		if (polarPath[i].type === 'L') {
			const p0 = assert_xy(endpoint(polarPath[i - 1]));
			const p1 = assert_xy(endpoint(polarPath[i]));
			const height = (p0.y < 0 === p1.y < 0) ? Math.min(Math.abs(p0.y), Math.abs(p1.y)) : 0;
			const interpretations = [];
			if (Math.abs(p1.x - p0.x) < Math.PI*R) {
				interpretations.push([p0.x, p1.x, height]); // well, usually there's just one
			}
			else {
				interpretations.push([p0.x, p1.x + 2*Math.PI*R*Math.sign(p0.x), height]); // but sometimes there's clipping on the periodic boundary condition...
				interpretations.push([p0.x + 2*Math.PI*R*Math.sign(p1.x), p1.x, height]); // so you have to try wrapping p0 over to p1, and also p1 over to p0
			}

			for (const [x0, x1, y] of interpretations) {
				if (height === 0) { // if this crosses the baseline, adjust the total bounds TODO wouldn't it be simpler to simply put a Wedge there with y=0?
					if (x0 < 0 || x1 < 0)
						if (Math.max(x0, x1) > xMin)
							xMin = Math.max(x0, x1);
					if (x0 > 0 || x1 > 0)
						if (Math.min(x0, x1) < xMax)
							xMax = Math.min(x0, x1);
				}
				else { // otherwise, add a floating wedge
					wedges.push({
						xL: Math.min(x0, x1) - y*aspectRatio,
						xR: Math.max(x0, x1) + y*aspectRatio,
						y: y,
						slope: 1/aspectRatio,
					});
				}
			}
		}
	}
	return {xMin, xMax, wedges};
}


/**
 * given an arc defined by a minimum x-value and a maximum x-value, and a bunch of `Wedge` functions that block off
 * large regions of high y, find the highest feasible point.
 * @param min the absolute minimum acceptable circular x-coordinate
 * @param max the absolute maximum acceptable circular x-coordinate
 * @param wedges the set of `Wedge` functions that define the feasible space
 * @return location – the circular x-coordinate of the optimal point
 * @return halfHeight – the circular y-coordinate of the optimal point
 */
function findOpenSpotOnArc(min: number, max: number, wedges: Wedge[]): { location: number, halfHeight: number } {
	const slope = wedges[0].slope; // assume all wedges have the same slope

	const validRegion = new ErodingSegmentTree(min, max); // construct segment tree
	let y = 0; // iterate height upward until no segments are left
	while (true) {
		if (wedges.length > 0) {
			const pole = validRegion.getCenter();
			const next = wedges.pop();
			if (next.y < y + pole.radius*slope) { // if the next wedge comes before we run out of space
				validRegion.erode((next.y - y)/slope); // go up to it
				y = next.y;
				if (validRegion.getMinim() >= next.xL && validRegion.getMaxim() <= next.xR) { // if it obstructs the entire remaining area
					if (validRegion.contains(0)) // pick a remaining spot and return the current heit
						return {halfHeight: y, location: 0};
					else
						return {halfHeight: y, location: validRegion.getClosest(0)}; // TODO I don't need this if-statement; getClosest already does that check
				}
				else {
					validRegion.remove(next.xL, next.xR); // or just cover up whatever area it obstructs
				}
			}
			else { // if the next wedge comes to late, find the last remaining point
				return {location: pole.location, halfHeight: pole.radius*slope};
			}
		}
		else {
			throw new Error("The algorithm that finds the optimal place on an arc to place a label failed.");
		}
	}
}
