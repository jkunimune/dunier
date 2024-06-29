/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {
	assert_xy,
	assert_фλ,
	endpoint,
	Location,
	LongLineType,
	PathSegment,
	Place,
	Point
} from "../utilities/coordinates.js";
import {chordCenter, isAcute, lineArcIntersections, lineLineIntersection} from "../utilities/geometry.js";
import {isBetween, localizeInRange, pathToString} from "../utilities/miscellaneus.js";
import {MapProjection} from "./projection.js";
import {Surface} from "../surface/surface.js";


const π = Math.PI;


/**
 * make any preliminary transformations that don't depend on the type of map
 * projection.  this method accounts for central meridians, and
 * should almost always be calld before project or getCrossing.
 * @param center the central meridian in radians
 * @param segments the jeograffickal imputs in absolute coordinates
 * @returns the relative outputs in transformed coordinates
 */
export function transformInput(center: number, segments: PathSegment[]): PathSegment[] {
	// if the central meridian is zero, don't do anything.  we wouldn't want to disturb points positioned on the antimeridian
	if (center === 0)
		return segments;
	// otherwise, go thru and shift all the longitudes
	else {
		const output: PathSegment[] = [];
		for (const segment of segments) {
			let [фi, λ] = segment.args;
			λ = localizeInRange(λ - center, - π, π); // shift to the central meridian and snap the longitude into the [-π, π] domain
			output.push({type: segment.type, args: [фi, λ]});
		}
		return output;
	}
}

/**
 * make any final transformations that don't depend on the type of map
 * projection.  this method accounts for south-up maps, and
 * should almost always be calld after project.
 * @param northUp whether to leave x and y signs the same (rather than flipping them)
 * @param segments the Cartesian imputs in absolute coordinates
 * @returns the relative outputs in transformed coordinates
 */
export function transformOutput(northUp: boolean, segments: PathSegment[]): PathSegment[] {
	if (northUp)
		return segments;
	else {
		const output: PathSegment[] = [];
		for (const segment of segments) {
			let args;
			switch (segment.type) {
				case "A":
					args = segment.args.slice(0, 5).concat([-segment.args[5], -segment.args[6]]);
					break;
				case "Z": case "H": case "V": case "M":
				case "L": case "Q": case "C":
					args = segment.args.map((arg) => -arg);
					break;
				default:
					throw new Error(`I don't know how to rotate a ${segment.type} segment.`);
			}
			output.push({type: segment.type, args: args});
		}
		return output;
	}
}

/**
 * project a list of SVG paths in latitude-longitude coordinates representing a series of closed paths.
 * @param projection the projection to use for each point
 * @param inPoints ordered Iterator of segments, which each have attributes .type (str) and .args ([double])
 * @param precision the maximum permissible line segment length (anything longer will be broken up to make sure the projection isn't too degraded)
 * @return SVG.Path object
 */
export function applyProjectionToPath(
	projection: MapProjection, inPoints: PathSegment[], precision: number): PathSegment[] {
	// check for NaNs because they can really mess things up
	for (const segment of inPoints)
		for (const arg of segment.args)
			if (!isFinite(arg))
				throw new Error(`you may not pass ${arg} to the mapping functions!`);

	let repeatCount = 0; // now do the math
	const outPoints: PathSegment[] = []; // start a list of the projected points that are done
	const pendingPoints: PathSegment[] = []; // and a list of projected points that mite come later (in reverse order)
	const ogi: number[] = [];
	for (let i = 0; i < inPoints.length; i ++)
		ogi.push(i);
	let i = 0; // and the index in inPoints that corresponds to the end of outPoints
	while (i < inPoints.length) {
		if (inPoints[i].type === LongLineType.MERIDIAN) { // do the projection
			const [ф0, λ] = inPoints[i-1].args;
			const [ф1, _] = inPoints[i].args;
			console.assert(λ === _, "meridians must start and end at the same longitude.");
			outPoints.push(...projection.projectMeridian(ф0, ф1, λ));
			i ++;
		}
		else if (inPoints[i].type === LongLineType.PARALLEL) {
			const [ф, λ0] = inPoints[i-1].args;
			const [_, λ1] = inPoints[i].args;
			console.assert(ф === _, "parallels must start and end at the same latitude.");
			outPoints.push(...projection.projectParallel(λ0, λ1, ф));
			i ++;
		}
		else if (inPoints[i].type === 'M') {
			const point = assert_фλ(endpoint(inPoints[i]));
			const {x, y} = projection.projectPoint(point);
			outPoints.push({type: 'M', args: [x, y]});
			i ++;
		}
		else if (inPoints[i].type === 'L') {
			const point = assert_фλ(endpoint(inPoints[i]));
			let {x, y} = projection.projectPoint(point);
			pendingPoints.push({type: 'L', args: [x, y]}); // put a pin in it; we mite haff to split it in haff
		}
		else {
			throw new Error(`I don't think you can use ${inPoints[i].type} here`);
		}

		while (pendingPoints.length > 0) { // now, if there are points in the pending cue
			const a = assert_xy(endpoint(outPoints[outPoints.length - 1])); // check the map distance
			const b = assert_xy(endpoint(pendingPoints[pendingPoints.length - 1])); // between the end of outPoints and the start of pendingPoints
			if (Math.hypot(b.x - a.x, b.y - a.y) < precision) { // if it's short enuff
				outPoints.push(pendingPoints.pop()); // unpend it
				i ++;
			}
			else { // if it's too long
				const aGeo = assert_фλ(endpoint(inPoints[i-1]));
				const bGeo = assert_фλ(endpoint(inPoints[i]));
				const {ф, λ} = getGeoMidpoint(projection.surface, aGeo, bGeo); // that means we need to plot a midpoint
				inPoints.splice(i, 0, {type: 'L', args: [ф, λ]});
				ogi.splice(i, 0, ogi[i]);
				break; // break out of this so we can go project it
			}
		}

		repeatCount ++;
		if (repeatCount > 100000)
			throw new Error(`why can't I find a point between ${inPoints[i - 1].args}=>${outPoints[outPoints.length - 1].args} and ${inPoints[i].args}=>${pendingPoints[pendingPoints.length - 1].args}`);
	}

	// check for NaNs because they can really mess things up
	for (const segment of outPoints)
		for (const arg of segment.args)
			console.assert(isFinite(arg), arg);
	return outPoints;
}

/**
 * take a path with some lines nad movetos and stuff, and modify it to fit within the
 * given edges by cutting it and adding lines and stuff.
 * @param segments the segments to cut
 * @param surface the surface on which the edges exist, or null if 
 * @param edges the MapEdges within which to fit this
 * @param closePath whether you should add stuff around the edges when things clip
 */
export function cutToSize(segments: PathSegment[], surface: Surface | InfinitePlane, edges: MapEdge[][], closePath: boolean): PathSegment[] {
	// for (const segment of segments)
	// 	if (typeof segment.type !== 'string')
	// 		throw new Error(`you can't pass ${segment.type}-type segments to this funccion.`);
	if (segments.length === 0) // what're you trying to pull here?
		return [];
	else if (closePath && !isClosed(segments, surface)) {
		console.error(pathToString(segments));
		throw new Error(`ew, it's open.  go make sure your projections are 1:1!`);
	}
	const segmentQueue = segments.slice().reverse();
	const sections: PathSegment[][] = [];
	let currentSection: PathSegment[] = null;
	let iterations = 0;
	while (true) { // first, break it up into sections
		const thisSegment = (segmentQueue.length > 0 ? segmentQueue.pop() : null);

		if (thisSegment === null || thisSegment.type === 'M') { // at movetos and at the end
			if (currentSection !== null) {
				if (encompasses(surface, edges, currentSection))
					sections.push(currentSection); // save whatever you have so far to sections (if it's within the edges)
			}
			if (thisSegment !== null)
				currentSection = [thisSegment]; // and start a new section
			else
				break; // or stop if we're done
		}

		else { // for segments in the middle of a section
			if (currentSection === null)
				throw new Error("it didn't start with 'M', I gess?");

			const lastSegment = currentSection[currentSection.length - 1];
			const crossing = getEdgeCrossing(
				lastSegment, thisSegment, surface, edges); // check for interruption

			if (crossing === null) { // if there's no interruption
				if (encompasses(surface, edges, [lastSegment]) !== encompasses(surface, edges, [lastSegment]))
					throw new Error(`you failed to detect a crossing between ${lastSegment.type}${lastSegment.args.join(',')} and ${thisSegment.type}${thisSegment.args.join(',')}.`);
				currentSection.push(thisSegment); // just add the points to the section
			}
			else { // if there is, the line jumps across an interruption
				const { intersect0, intersect1 } = crossing;
				segmentQueue.push( // add a moveto to the segment queue and go back to the start of the loop
					...spliceSegment(
						endpoint(lastSegment), thisSegment,
						intersect0, intersect1,
					).reverse() // remember to reverse it for the FILO segment cue
				);
			}
		}
		iterations ++;
		if (iterations > 100000)
			throw new Error(`*Someone* (not pointing any fingers) messd up an interruption between ${currentSection.pop()} and ${thisSegment}.`);
	}

	if (sections.length === 0) // if it's all off the map
		return []; // goodbye TODO: have a way to check if we need to shade in the entire map

	const startPositions: { loop: number, index: number }[] = [];
	const weHaveDrawn: boolean[] = []; // set up some section-indexed vectors
	for (const section of sections) {
		startPositions.push(getPositionOnEdge(
			endpoint(section[0]), edges));
		weHaveDrawn.push(false);
	}

	const output: PathSegment[] = []; // now start re-stitching it all together
	let sectionIndex = 0;
	let supersectionIndex = -1;
	let supersectionStart = null;
	let startingANewSupersection = true;
	while (true) {

		let section = sections[sectionIndex]; // take a section
		if (!startingANewSupersection) {
			section = section.slice(1); // remove its moveto
		}
		else {
			supersectionIndex = sectionIndex;
			supersectionStart = endpoint(section[0]);
		}
		startingANewSupersection = false; // turn off this notification flag until we need it agen

		output.push(...section); // add the section's points to the thing
		weHaveDrawn[sectionIndex] = true; // mark it as drawn

		if (!closePath) { // if we're not worrying about closing it off
			startingANewSupersection = true; // forget it and move onto a random section
		}
		else { // if we *are* worrying about closing it off
			const sectionEnd = endpoint(section[section.length-1]); // look at where on Earth we are
			const endPosition = getPositionOnEdge(
				sectionEnd, edges);

			if (sectionEnd.s === supersectionStart.s &&
				sectionEnd.t === supersectionStart.t) { // first, check if this is the closure of this supersection
				startingANewSupersection = true; // if so, don't look any further
			}
			else if (endPosition.loop !== null) { // if we ended hitting a wall
				const endLoop = edges[endPosition.loop]; // then we should move to another point on a wall

				let bestSection = null, bestPositionIndex = null;
				for (let i = 0; i < startPositions.length; i ++) { // check the remaining sections
					const startPosition = startPositions[i];
					if (startPosition.loop === endPosition.loop) { // for any on the same edge loop as us
						if (!weHaveDrawn[i] || i === supersectionIndex) {
							let relativeIndex = startPosition.index;
							if (startPosition.index < endPosition.index)
								relativeIndex += endLoop.length;
							if (bestPositionIndex === null || relativeIndex < bestPositionIndex) {
								bestSection = i; // calculate which one should come next
								bestPositionIndex = relativeIndex;
							}
						}
					}
				}
				if (bestSection === null) {
					console.error(pathToString(segments));
					console.error(edges);
					throw new Error(`couldn't find a new start position on loop ${endPosition.loop}`);
				}

				const endEdge = Math.trunc(endPosition.index);
				const restartEdge = Math.trunc(bestPositionIndex);
				const nextStart = endpoint(sections[bestSection][0]);
				for (let i = endEdge; i <= restartEdge; i ++) { // go around the edges to the new restarting point
					const edge = endLoop[i%endLoop.length];
					const targetPlace = (i === restartEdge) ? nextStart : edge.end;
					output.push({type: edge.type,
						args: [targetPlace.s, targetPlace.t]});
				}
				if (bestSection === supersectionIndex) // if this brings us back to where we started this supersection
					startingANewSupersection = true; // move on randomly
				else if (!weHaveDrawn[bestSection]) // otherwise, if you found a fresh place to restart
					sectionIndex = bestSection; // go to it
				else
					throw new Error("I don't think it should be possible to rap around to a drawn section that's not this one");
			}
			else { // if we ended at a random point in the middle of the map
				sectionIndex = null;
				for (let i = 0; i < sections.length; i ++) { // look for the one that picks up from here
					const start = endpoint(sections[i][0]);
					if (start.s === sectionEnd.s && start.t === sectionEnd.t) {
						sectionIndex = i; // and go there
						break;
					}
				}
				if (sectionIndex === null) { // there really should be exactly one that picks up from here
					throw new Error(`I was left hanging at [${sectionEnd.s}, ${sectionEnd.t}]`);
				}
				if (weHaveDrawn[sectionIndex]) // if that one has already been drawn
					throw new Error(`how has the section starting at [${sectionEnd.s}, ${sectionEnd.t}] already been drawn? I'm on a supersection that started at ${supersectionStart.s}, ${supersectionStart.t}`); // we're done; move on randomly
			}
		}
		if (startingANewSupersection) { // if we were planning to move onto whatever else for the next section
			sectionIndex = 0;
			while (sectionIndex < sections.length && weHaveDrawn[sectionIndex])
				sectionIndex ++; // sweep thru it until we find one that has not been drawn
			if (sectionIndex === sections.length) // if you can't find any
				break; // we're done!
		}
	}

	if (closePath) { // if it matters which side is inside and which side out, draw the outline of the map
		for (let i = 0; i < edges.length; i ++) { // for each loop
			if (isInsideOut(output, edges[i])) { // if it is inside out
				const start = edges[i][0].start;
				output.push({type: 'M', args: [start.s, start.t]}); // draw the outline of the entire map to contain it
				for (const edge of edges[i])
					output.push({type: edge.type, args: [edge.end.s, edge.end.t]});
			}
		}
	}

	for (let i = output.length - 1; i >= 1; i --) { // remove any zero-length segments
		const a = endpoint(output[i - 1]);
		const b = endpoint(output[i]);
		if (a.s === b.s && a.t === b.t)
			output.splice(i, 1);
	}
	for (let i = output.length - 1; i >= 1; i --) // and then any orphand movetos
		if (output[i - 1].type === "M" && output[i].type === "M")
			output.splice(i - 1, 1);

	return output;
}


/**
 * convert a continuous path segment to an equivalent list of path segments that are
 * careful to step over the intersection point (which should be on the input segment)
 * @param start
 * @param segment
 * @param intersect0 the intersection point. in the event that the coordinate system
 *                   is not 1:1, this will be on the side corresponding to start.
 * @param intersect1 the intersection point. in the event that the coordinate system
 *                   is not 1:1, this will be on the side of segment's endpoint.
 */
function spliceSegment(start: Location, segment: PathSegment, intersect0: Location, intersect1: Location): PathSegment[] {
	if (segment.type === 'L') { // to split a line
		return [
			{ type: 'L', args: [intersect0.s, intersect0.t] }, // it's a line up to the very edge
			{ type: 'M', args: [intersect1.s, intersect1.t] }, // then a jump to the other side
			segment, // followd by the final stretch to the end
		];
	}

	else if (segment.type === 'A') { // to split an arc
		const a = assert_xy(start);
		const b = assert_xy(intersect0);
		const c = assert_xy(intersect1);
		const [r1, r2, rot, oldLargeArc, sweepDirection, dx, dy] = segment.args;
		const d = { x: dx, y: dy };
		console.assert(r1 === r2);
		console.assert(b.x === c.x && b.y === c.y);

		const endpoints = [a, d];
		let newLargeArc: number[] = []; // you haff to figure out whether to change the large arc flag for the children
		for (let i = 0; i < 2; i ++) {
			const acute = isAcute(
				b, endpoints[1 - i], endpoints[i]); // luckily, this angle tells you whether the arc is big
			newLargeArc.push(acute ? 0 : 1);
			console.assert(newLargeArc[i] <= oldLargeArc);
		}
		return [
			{
				type: 'A',
				args: [r1, r2, rot, newLargeArc[0], sweepDirection, b.x, b.y],
			}, // the first segment
			{ type: 'M', args: [c.x, c.y] }, //the jump
			{
				type: 'A',
				args: [r1, r2, rot, newLargeArc[1], sweepDirection, d.x, d.y]
			}, // the twoth segment
		];
	}

	else {
		throw new Error(`can't use '${segment.type}' here`);
	}
}


/**
 * find out if the given points are contained by a set of edges, using an even/odd
 * rule. it is assumed that they are either all in or all out.  points on an edge are
 * considerd ambiguous
 * @param surface the surface on which the points are defined
 * @param edges
 * @param points
 * @return whether all of points are inside edges
 */
function encompasses(surface: Surface | InfinitePlane, edges: MapEdge[][], points: PathSegment[]): boolean {
	const polygon: PathSegment[] = [];
	for (const loop of edges) {
		polygon.push({type: 'M', args: [loop[0].start.s, loop[0].start.t]});
		for (const edge of loop)
			polygon.push({type: 'L', args: [edge.end.s, edge.end.t]});
	}
	for (let i = 0; i < points.length; i ++) { // the fastest way to judge this is to just look at the first point
		const containd = contains(
			polygon,
			endpoint(points[i]));
		if (containd !== null) // that is not ambiguous
			return containd;
	}
	for (let i = 1; i < points.length; i ++) { // if that didn't work, use midpoints
		const containd = contains(
			polygon,
			getMidpoint(points[i - 1], points[i], surface));
		if (containd !== null) // in practice, this should always be unambiguous
			return containd;
	}
	return true; // if it's completely on the edge, mark it as in since it might determine whether the inside is included or not
}


/**
 * find out if a point is contained by a polygon, using an even/odd rule.
 * if a point is on the polygon, return null to mark it as ambiguous.
 * @param polygon
 * @param point
 * @return whether point is inside polygon, or null if it is on the edge.
 */
export function contains(polygon: PathSegment[], point: Location): boolean {
	let contained = false;
	for (let i = 0; i < polygon.length; i ++)
		console.assert(polygon[i].type === 'M' || polygon[i].type === 'L', "I can't do that segment type.");

	// take the point
	const {s, t} = point;

	// then look at each edge of the polygon
	for (let i = 1; i < polygon.length; i ++) {
		if (polygon[i].type === 'L') {
			const [s0, t0] = polygon[i-1].args;
			const [s1, t1] = polygon[i].args;

			// if the point is on an edge, return null
			if (s >= Math.min(s0, s1) && s <= Math.max(s0, s1) &&
				t >= Math.min(t0, t1) && t <= Math.max(t0, t1) &&
				(s0 === s1 || t0 === t1))
				return null;
			// otherwise, toggle depending on if our virtual s-ward ray crosses the edge
			if ((t < t0) !== (t < t1))
				if (s0 + (t - t0)/(t1 - t0)*(s1 - s0) > s)
					contained = !contained;
		}
		else {
			if (polygon[i].type !== 'M')
				throw new Error("nonononononnooooooooooooooo");
		}
	}
	return contained;
}


/**
 * return a point on the given segment.
 * @param prev
 * @param segment
 * @param surface the surface on which the segment exists.
 */
function getMidpoint(prev: PathSegment, segment: PathSegment, surface: Surface | InfinitePlane): Location {
	if (surface instanceof InfinitePlane) {
		if (segment.type === 'L') {
			const start = endpoint(prev);
			const end = endpoint(segment);
			return { s: (start.s + end.s)/2, t: (start.t + end.t)/2 };
		}
		else if (segment.type === 'A') {
			const start = assert_xy(endpoint(prev));
			const [r, , , largeArc, sweep, end_s, end_t] = segment.args;
			const end = { x: end_s, y: end_t };
			const sign = 1 - 2*sweep;
			const center = chordCenter(start, end, r, sweep !== largeArc); // find the center
			const direction = { // draw a ray thru the arc (bias it toward the start to avoid roundoff issues)
				x: -sign*(end.y - start.y) + start.x - center.x,
				y:  sign*(end.x - start.x) + start.y - center.y,
			};
			const scale = Math.hypot(direction.x, direction.y);
			return {
				s: center.x + direction.x/scale*r, // and then construct the point
				t: center.y + direction.y/scale*r,
			};
		}
		else {
			throw new Error(`don't know how to take the midpoint of ${segment.type} segments`);
		}
	}
	else if (surface instanceof Surface) {
		if (segment.type === 'L') {
			const midpoint = getGeoMidpoint(surface,
				assert_фλ(endpoint(prev)),
				assert_фλ(endpoint(segment)));
			return { s: midpoint.ф, t: midpoint.λ };
		}
		else if (segment.type === LongLineType.MERIDIAN || segment.type === LongLineType.PARALLEL) {
			const start = endpoint(prev);
			const end = endpoint(segment);
			return { s: (start.s + end.s)/2, t: (start.t + end.t)/2 };
		}
		else {
			throw new Error(`don't know how to take the midpoint of ${segment.type} segments`);
		}
	}
	else {
		throw new Error(`this surface has an impossible type: ${typeof surface}`);
	}
}


/**
 * compute the coordinates of the midpoint between these two lines.
 * @return Place
 */
function getGeoMidpoint(surface: Surface, a: Place, b: Place): Place {
	const posA = surface.xyz(a);
	const posB = surface.xyz(b);
	const posM = posA.plus(posB).over(2);
	return surface.фλ(posM);
}

/**
 * compute the coordinates at which the line between these two points crosses an interrupcion.  if
 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
 * the 1th point's side.  also, the index of the loop on which this crossing lies.
 */
function getEdgeCrossing(
	coords0: PathSegment, coords1: PathSegment, surface: Surface | InfinitePlane, edges: MapEdge[][]
): { intersect0: Location, intersect1: Location, loopIndex: number } | null {
	// if we're on a geographic surface
	if (surface instanceof Surface) {
		const crossing = getGeoEdgeCrossing(coords0, coords1, surface, edges);
		if (crossing === null)
			return null;
		const { place0, place1, loopIndex } = crossing;
		return { intersect0: { s: place0.ф, t: place0.λ },
			intersect1: { s: place1.ф, t: place1.λ },
			loopIndex: loopIndex }; // note that if this is a double edge, it is always exiting
	}
	// if we're in the infinite cartesian plane
	else if (surface instanceof InfinitePlane) {
		const crossing = getMapEdgeCrossing(coords0, coords1, edges);
		if (crossing === null)
			return null;
		const { point0, point1, loopIndex } = crossing;
		return { intersect0: { s: point0.x, t: point0.y },
			intersect1: { s: point1.x, t: point1.y },
			loopIndex: loopIndex }; // even if the getCrossing function thaut it was only entering
	}
	else {
		throw new Error("no.");
	}
}

/**
 * compute the coordinates at which the line between these two points crosses an interrupcion in the map.  if
 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
 * the 1th point's side.  also, the index of the loop on which this crossing lies.
 */
function getMapEdgeCrossing(coords0: PathSegment, coords1: PathSegment, edges: MapEdge[][]
): { point0: Point, point1: Point, loopIndex: number } | null {
	for (const edgeLoop of edges)
		for (const edge of edgeLoop)
			console.assert(edge.type === 'L', `You can't use ${edge.type} edges in this funccion.`);

	let a = assert_xy(endpoint(coords0)); // extract the input coordinates
	let b = assert_xy(endpoint(coords1));
	if (coords1.type === 'L') { // if it's a line
		for (let i = 0; i < edges.length; i ++) { // then look at each edge loop
			for (const edge of edges[i]) { // and at each edge
				const start = assert_xy(edge.start);
				const end = assert_xy(edge.end);
				const intersect = lineLineIntersection(
					a, b, start, end);
				if (intersect !== null && // if there is an intersection
					!(intersect.x === a.x && intersect.y === a.y) &&
					!(intersect.x === b.x && intersect.y === b.y)) // and that intersection is not on one of the endpoints
					return {
						point0: intersect, point1: intersect,
						loopIndex: i }; // return it!
			}
		}
		return null;
	}
	else if (coords1.type === 'A') { // if it's an arc
		const [r, rOther, , largeArc, sweepDirection, , ] = coords1.args; // get the parameters
		console.assert(r === rOther, "I haven't accounted for ellipses.");

		if (sweepDirection === 0) { // arrange a and b so that it sweeps clockwise (in graphical coordinates)
			const temporary = a;
			a = b;
			b = temporary;
		}
		const center = chordCenter(a, b, r, largeArc === 0); // compute the center

		for (let i = 0; i < edges.length; i ++) { // then look at each edge loop
			for (const edge of edges[i]) { // and at each edge
				const start = assert_xy(edge.start);
				const end = assert_xy(edge.end);
				const points = lineArcIntersections(start, end, center, r, a, b); // check for intersections
				if (points.length > 0) {
					const intersect = points[0];
					return {
						point0: intersect,
						point1: intersect,
						loopIndex: i };
				}
			}
		}
		return null;
	}
	else {
		throw new Error(`I don't think you're allowd to use '${coords1.type}' segments here`);
	}
}

/**
 * compute the coordinates at which the line between these two points crosses a bound on the surface.  if
 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
 * the 1th point's side.  also, the index of the loop on which this crossing lies.
 */
function getGeoEdgeCrossing(
	coords0: PathSegment, coords1: PathSegment, surface: Surface, edges: MapEdge[][]
): { place0: Place, place1: Place, loopIndex: number } | null {
	for (const coords of [coords0, coords1])
		if (!['M', 'L', LongLineType.MERIDIAN, LongLineType.PARALLEL].includes(coords.type))
			throw new Error(`You can't use '${coords.type}' segments in this funccion.`);

	const [ф0, λ0] = coords0.args; // extract the input coordinates
	const [ф1, λ1] = coords1.args;

	for (let i = 0; i < edges.length; i ++) { // then look at each edge loop
		for (const edge of edges[i]) { // and at each edge
			const start = assert_фλ(edge.start);
			const end = assert_фλ(edge.end);
			if (edge.type === LongLineType.MERIDIAN) { // if it is a meridian
				const λX = start.λ;
				const λ̄0 = localizeInRange(λ0, λX, λX + 2*π);
				const λ̄1 = localizeInRange(λ1, λX, λX + 2*π);
				if (λ̄0 !== λX && λ̄1 !== λX && Math.abs(λ̄0 - λ̄1) >= π) { // check to see if it crosses this edge
					const {place0, place1} = getMeridianCrossing(
						surface, ф0, λ0, ф1, λ1, λX);
					if (isBetween(place0.ф, start.ф, end.ф))
						return {
							place0: place0, place1: place1, loopIndex: i };
				}
			}
			else if (edge.type === LongLineType.PARALLEL) { // do the same thing for parallels
				const фX = start.ф;
				const ф̄0 = localizeInRange(ф0, фX, фX + 2*π);
				const ф̄1 = localizeInRange(ф1, фX, фX + 2*π);
				if (ф̄0 !== фX && ф̄1 !== фX && Math.abs(ф̄0 - ф̄1) >= π) {
					const {place0, place1} = getParallelCrossing(
						ф0, λ0, ф1, λ1, start.ф);
					if (isBetween(place0.λ, start.λ, end.λ))
						return {
							place0: place0, place1: place1, loopIndex: i };
				}
			}
			else {
				throw new Error(`I don't think you're allowd to use ${edge.type} here`);
			}
		}
	}

	return null;
}

/**
 * compute the coordinates at which the line between these two points crosses a particular meridian.  two Places
 * will be returnd: one on the 0th point's side of the interrupcion, and one on the 1th point's side.  if the
 * meridian is not the antimeridian, then they will just be the same.
 * @param surface the surface on which the meridian is defined
 * @param ф0 the transformed latitude of the zeroth point
 * @param λ0 the transformed longitude of the zeroth point
 * @param ф1 the transformed latitude of the oneth point
 * @param λ1 the transformed longitude of the oneth point
 * @param λX the longitude of the meridian
 */
function getMeridianCrossing(
	surface: Surface, ф0: number, λ0: number, ф1: number, λ1: number, λX = π
): { place0: Place, place1: Place } {
	const pos0 = surface.xyz({ф: ф0, λ: λ0 - λX});
	const pos1 = surface.xyz({ф: ф1, λ: λ1 - λX});
	const posX = pos0.times(pos1.x).plus(pos1.times(-pos0.x)).over(
		pos1.x - pos0.x);
	const фX = surface.фλ(posX).ф;
	if (Math.abs(λX) === π && λ0 < λ1)
		return { place0: { ф: фX, λ: -π },
			place1: { ф: фX, λ:  π } };
	else if (Math.abs(λX) === π)
		return { place0: { ф: фX, λ:  π },
			place1: { ф: фX, λ: -π } };
	else
		return { place0: { ф: фX, λ: λX },
			place1: { ф: фX, λ: λX } };
}

/**
 * compute the coordinates at which the line between these two points crosses a particular parallel.  two Places
 * will be returnd: one on the 0th point's side of the interrupcion, and one on the 1th point's side.  if the
 * parallel is not the antiequator
 * @param ф0 the transformed latitude of the zeroth point
 * @param λ0 the transformed longitude of the zeroth point
 * @param ф1 the transformed latitude of the oneth point
 * @param λ1 the transformed longitude of the oneth point
 * @param фX the latitude of the parallel
 */
function getParallelCrossing(
	ф0: number, λ0: number, ф1: number, λ1: number, фX = π
): { place0: Place, place1: Place } {
	const λX = ((ф1 - фX)*λ0 + (фX - ф0)*λ1)/(ф1 - ф0); // this solution is not as exact as the meridian one,
	if (фX === π && ф0 < ф1) // but it's good enuff.  the interseccion between a cone and a line is too hard.
		return { place0: { ф: -π, λ: λX }, // TODO: this won't work for the antiequator; need to weigh by sin(ф-фX)
			place1: { ф:  π, λ: λX } };
	else if (фX === π)
		return { place0: { ф:  π, λ: λX },
			place1: { ф: -π, λ: λX } };
	else
		return { place0: { ф: фX, λ: λX },
			place1: { ф: фX, λ: λX } };
}

/**
 * return a number indicating where on the edge of map this point lies
 * @param point the coordinates of the point
 * @param edges the loops of edges on which we are trying to place it
 * @return the index of the edge that contains this point plus the fraccional distance from that edges start to its
 * end of that point, or null if there is no such edge.  also, the index of the edge loop about which we're tauking
 * or null if the point isn't on an edge
 */
function getPositionOnEdge(point: Location, edges: MapEdge[][]): {loop: number, index: number} {
	for (let i = 0; i < edges.length; i ++) {
		for (let j = 0; j < edges[i].length; j ++) { // start by choosing an edge
			const edge = edges[i][j];
			let onThisEdge = true;
			if ((point.s < Math.min(edge.start.s, edge.end.s)) ||
				(point.s > Math.max(edge.start.s, edge.end.s)) ||
				(point.t < Math.min(edge.start.t, edge.end.t)) ||
				(point.t > Math.max(edge.start.t, edge.end.t)))
				onThisEdge = false;

			if (onThisEdge) {
				const startToPointVector = [ point.s - edge.start.s,
					point.t - edge.start.t ];
				const startToEndVector = [ edge.end.s - edge.start.s,
					edge.end.t - edge.start.t ];
				let startToEndSqr = 0;
				let dotProduct = 0;
				for (let k = 0; k < 2; k ++) {
					startToEndSqr += Math.pow(startToEndVector[k], 2);
					dotProduct += startToPointVector[k]*startToEndVector[k];
				}
				return { loop: i, index: j + dotProduct/startToEndSqr };
			}
		}
	}
	return { loop: null, index: null };
}
/**
 * calculate whether the given closed curve curls in the direction opposite the given
 * edge loop
 * @param segments
 * @param edges
 */
function isInsideOut(segments: PathSegment[], edges: MapEdge[]): boolean {
	const edge = edges[0]; // pick one edge
	console.assert(edge.start.s === edge.end.s, "conceptually there's noting rong with what you've done, but I've only accounted for vertical edges here");
	const periodic = edges.length === 1; // check for periodicity in the form of an open edge
	const period = (periodic) ? Math.abs(edge.end.t - edge.start.t) : 0; // and measure the period
	const sEdge = edge.start.s;
	let tTest = null;
	let dMin = Infinity;
	let antiparallel = null;
	for (let i = 1; i < segments.length; i ++) { // look through the path
		if (segments[i].type === 'M') {  // ignore moves
		}
		else if (segments[i].type === 'A') { // do something with arcs
			return false; // well, assume that if there’s an arc, it’s never going to be inside out
		}
		else { // check lines and LongLines
			const a = endpoint(segments[i - 1]);
			const b = endpoint(segments[i]);
			if (a.t !== b.t) {
				const wraps = periodic && Math.abs(b.t - a.t) > period/2.; // if the domain is periodic and this line is long enuff, ita ctually raps around
				if (tTest === null) {
					tTest = (a.t + b.t)/2; // choose a y value
					if (wraps)
						tTest = localizeInRange(tTest + period/2, edge.start.t, edge.end.t);
				}
				let crossesTestLine = (a.t < tTest) !== (b.t < tTest); // look for segments that cross that y value
				if (wraps) // account for rapping
					crossesTestLine = !crossesTestLine;
				if (crossesTestLine) {
					let dt = b.t - a.t, dta = tTest - a.t, dtb = b.t - tTest;
					if (wraps) {
						dt = localizeInRange(dt, - period/2., period/2.);
						dta = localizeInRange(dta, - period/2., period/2.);
						dtb = localizeInRange(dtb, - period/2., period/2.);
					}
					const s = a.s*dtb/dt + b.s*dta/dt; // find the x value where they cross
					if (Math.abs(s - sEdge) < dMin) { // the one nearest the edge will tell us
						dMin = Math.abs(s - sEdge);
						antiparallel = (a.t < b.t) !== (edge.start.t < edge.end.t); // if this path is widdershins relative to the edge
						if (wraps) antiparallel = !antiparallel; // account for rapping
					}
				}
			}
		}
	}
	return antiparallel;
}

/**
 * just make sure every contiguus section either ends where it started or starts and ends on an edge
 * @param segments the Path to test
 * @param surface the surface that contains the points (so we know when it goes off the edge)
 */
function isClosed(segments: PathSegment[], surface: Surface | InfinitePlane): boolean {
	let start: Location = null;
	for (let i = 0; i < segments.length; i ++) {
		if (segments[i].type === 'M')
			start = endpoint(segments[i]);
		// loop from M to M to find each contiguus section
		if (i + 1 === segments.length || segments[i+1].type === 'M') {
			if (start === null)
				throw new Error(`path must begin with a moveto, not ${segments[0].type}`);
			const end = endpoint(segments[i]);
			// if it doesn't end where it started
			const endsOnStart = start.s === end.s && start.t === end.t;
			// and it doesn't start and end on edges
			let endsOnEdge = surface.isOnEdge(assert_фλ(start)) && surface.isOnEdge(assert_фλ(end));
			// then the Path isn't closed
			if (!endsOnStart && !endsOnEdge)
				return false;
		}
	}
	return true;
}


/**
 * a sort of pseudo-subclass of Surface that represents the cartesian coordinate system of the map.
 */
export class InfinitePlane {
	isOnEdge(_: Place): boolean {
		return false;
	}
}


/**
 * an edge on a map projection
 */
export interface MapEdge {
	type: string | LongLineType;
	start: Location;
	end: Location;
}
