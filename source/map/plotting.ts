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
import {chordCenter, isAcute, lineArcIntersections, lineLineIntersection, signCrossing} from "../utilities/geometry.js";
import {isBetween, localizeInRange, pathToString, Side} from "../utilities/miscellaneus.js";
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

	const outPoints: PathSegment[] = []; // start a list of the projected points that are done
	for (let i = 0; i < inPoints.length; i ++) {
		if (inPoints[i].type === LongLineType.MERIDIAN) { // do the projection
			// call projectMeridian for meridians
			const [ф0, λ] = inPoints[i-1].args;
			const [ф1, _] = inPoints[i].args;
			console.assert(λ === _, "meridians must start and end at the same longitude.");
			outPoints.push(...projection.projectMeridian(ф0, ф1, λ));
		}
		else if (inPoints[i].type === LongLineType.PARALLEL) {
			// call projectParallel for parallels
			const [ф, λ0] = inPoints[i-1].args;
			const [_, λ1] = inPoints[i].args;
			console.assert(ф === _, "parallels must start and end at the same latitude.");
			outPoints.push(...projection.projectParallel(λ0, λ1, ф));
		}
		else if (inPoints[i].type === 'M') {
			// call projectPoint for movetos
			const point = assert_фλ(endpoint(inPoints[i]));
			const {x, y} = projection.projectPoint(point);
			outPoints.push({type: 'M', args: [x, y]});
		}
		else if (inPoints[i].type === 'L') {
			// for continuus segments, don't call projectPoint just yet
			const pendingInPoints = [assert_фλ(endpoint(inPoints[i]))]; // add the desired destination to a queue
			const completedInPoints = [assert_фλ(endpoint(inPoints[i - 1]))];
			while (pendingInPoints.length > 0) { // now, as long as there are points in the pending cue
				const nextInPoint = pendingInPoints.pop(); // take the next point
				const nextOutPoint = projection.projectPoint(nextInPoint); // project it
				const lastInPoint = completedInPoints[completedInPoints.length - 1];
				const lastOutPoint = assert_xy(endpoint(outPoints[outPoints.length - 1])); // check the map distance between here and the last point
				if (Math.hypot(nextOutPoint.x - lastOutPoint.x, nextOutPoint.y - lastOutPoint.y) < precision) { // if it's short enuff
					completedInPoints.push(nextInPoint); // unpend it
					outPoints.push({type: 'L', args: [nextOutPoint.x, nextOutPoint.y]});
				}
				else { // if it's too long
					pendingInPoints.push(nextInPoint); // put it back
					const intermediateInPoint = assert_фλ(getMidpoint(
						{type: 'M', args: [lastInPoint.ф, lastInPoint.λ]},
						{type: 'L', args: [nextInPoint.ф, nextInPoint.λ]}, true)); // that means we need to plot a midpoint first
					pendingInPoints.push(intermediateInPoint);

					if (Math.abs(nextInPoint.λ - lastInPoint.λ) > π || Math.abs(nextInPoint.ф - lastInPoint.ф) > π)
						throw new Error(`the input to applyProjectionToPath needs to be run thru cutToSize first.  ` +
						                `this clearly hasn't because there's no way you can draw an uncropped line ` +
						                `from ${lastInPoint.ф},${lastInPoint.λ} to ${nextInPoint.ф},${nextInPoint.λ}.`);
					if (pendingInPoints.length + outPoints.length > 100000)
						throw new Error(`why can't I find a point between [${lastOutPoint.x},${lastOutPoint.y}] and [${nextInPoint.ф},${nextInPoint.λ}]=>[${nextOutPoint.x},${nextOutPoint.y}]`);
				}
			}
		}
		else {
			throw new Error(`I don't think you can use ${inPoints[i].type} here`);
		}
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
 * @param edges the MapEdges within which to fit this
 * @param surface the surface on which the edges exist, or null if
 * @param closePath whether you should add stuff around the edges when things clip
 */
export function cutToSize(segments: PathSegment[], edges: PathSegment[], surface: Surface | InfinitePlane, closePath: boolean): PathSegment[] {
	if (closePath && !isClosed(segments, surface)) {
		console.error(pathToString(segments));
		throw new Error(`ew, it's open.  go make sure your projections are 1:1!`);
	}
	if (!isClosed(edges, surface)) {
		console.error(pathToString(edges));
		throw new Error(`gross, your edges are open.  go check how you defined them!`);
	}

	const geographic = surface instanceof Surface;

	// start by breaking the edges up into separate loops
	const edgeLoops: PathSegment[][] = [];
	for (const edge of edges) {
		if (edge.type === 'M')
			edgeLoops.push([]);
		const currentLoop = edgeLoops[edgeLoops.length - 1];
		currentLoop.push(edge);
	}

	// then break the segments up into separate sections
	const segmentQueue = segments.slice().reverse();
	const sections: PathSegment[][] = [];
	let currentSection: PathSegment[] = null;
	let iterations = 0;
	while (true) { // you'll have to go thru it like a cue rather than a set list, since we'll be adding segments as we go
		const thisSegment = (segmentQueue.length > 0 ? segmentQueue.pop() : null);

		if (thisSegment === null || thisSegment.type === 'M') { // at movetos and at the end
			if (currentSection !== null) {
				if (encompasses(edges, currentSection, geographic))
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
			const start = endpoint(lastSegment);
			const end = endpoint(thisSegment);
			const crossings = getEdgeCrossings(
				start, thisSegment, edges, geographic); // check for interruption
			// but discard any interruptions that coincide with existing breaks in segments
			for (let i = crossings.length - 1; i >= 0; i --) {
				const {intersect0, intersect1} = crossings[i];
				if (intersect1.s === start.s && intersect1.t === start.t) {
					if (lastSegment.type === 'M') {
						crossings.splice(i, 1);
						continue;
					}
				}
				if (intersect0.s === end.s && intersect0.t === end.t) {
					if (segmentQueue.length === 0 || segmentQueue[segmentQueue.length - 1].type === 'M') {
						crossings.splice(i, 1);
					}
				}
			}

			if (crossings.length === 0) { // if there's no interruption or we discarded them all
				if (encompasses(edges, [lastSegment], geographic) !== encompasses(edges, [lastSegment], geographic))
					throw new Error(`you failed to detect a crossing between ${lastSegment.type}${lastSegment.args.join(',')} and ${thisSegment.type}${thisSegment.args.join(',')}.`);
				currentSection.push(thisSegment); // move the points from the queue to the section
			}
			else { // if there is, the line jumps across an interruption
				const { intersect0, intersect1 } = crossings[0];
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
	while (!weHaveDrawn.every((value) => value)) {

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
				const edgeLoop = edgeLoops[endPosition.loop]; // then we should move to another point on a wall

				let bestSection = null, bestPositionIndex = null;
				for (let i = 0; i < startPositions.length; i ++) { // check the remaining sections
					const startPosition = startPositions[i];
					if (startPosition.loop === endPosition.loop) { // for any on the same edge loop as us
						if (!weHaveDrawn[i] || i === supersectionIndex) {
							let relativeIndex = startPosition.index;
							if (startPosition.index < endPosition.index)
								relativeIndex += edgeLoop.length - 1; // account for the fact that the loops are all periodic
							if (bestPositionIndex === null || relativeIndex < bestPositionIndex) {
								bestSection = i; // calculate which one should come next
								bestPositionIndex = relativeIndex;
							}
						}
					}
				}
				if (bestSection === null) {
					console.error(pathToString(segments));
					console.error(pathToString(edges));
					throw new Error(`couldn't find a new start position on loop ${endPosition.loop}`);
				}

				const endEdge = Math.trunc(endPosition.index) + 1;
				const restartEdge = Math.trunc(bestPositionIndex) + 1;
				const nextStart = endpoint(sections[bestSection][0]);
				for (let i = endEdge; i <= restartEdge; i ++) { // go around the edges to the new restarting point
					const edge = edgeLoop[(i - 1)%(edgeLoop.length - 1) + 1];
					const edgeEnd = endpoint(edge);
					const targetPlace = (i === restartEdge) ? nextStart : edgeEnd;
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
		for (const edgeLoop of edgeLoops) { // for each loop
			let isInsideOut; // determine if it is inside out
			if (output.length > 0)
				isInsideOut = encompasses(output, edgeLoop, geographic) === Side.IN; // using the newly cropped output
			else
				isInsideOut = encompasses(segments, edgeLoop, geographic) === Side.IN; // or whatever was cropped out if the output is empty
			if (isInsideOut) // if it is inside out with respect to that loop
				output.push(...edgeLoop); // draw the outline of the entire edge loop to contain it
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
 * find out if the given points are wholly within a given path-defined region.
 * it is assumed that they are either all in or all out.  points on an edge are considerd ambiguous, so
 * the result may be ambiguous if *all* of the points are on the edge.  note that the directionality of
 * the region path matters (see contains() for more details) but the directionality of points does not
 * matter; we're just checking to see if the vertices themselves are enclosed.
 * @param polygon the path that defines the region we're checking
 * @param points the path whose points may or may not be in the region
 * @param periodic whether these points are defined in geographic coordinates, mandating a [-π, π) periodic domain
 * @return whether all of points are inside edges
 */
export function encompasses(polygon: PathSegment[], points: PathSegment[], periodic: boolean): Side {
	for (let i = 0; i < points.length; i ++) { // the fastest way to judge this is to just look at the first point
		const tenancy = contains(
			polygon, endpoint(points[i]), periodic);
		if (tenancy !== Side.BORDERLINE) // that is not ambiguous
			return tenancy;
	}
	for (let i = 1; i < points.length; i ++) { // if that didn't work, use midpoints
		const tenancy = contains(
			polygon, getMidpoint(points[i - 1], points[i], periodic), periodic);
		if (tenancy !== Side.BORDERLINE) // in practice, this should always be unambiguous
			return tenancy;
	}
	return Side.BORDERLINE; // if it's completely on the edge, mark it as such
}


/**
 * find out if a point is contained by a polygon.
 * the direction of the polygon matters; if you're travelling along the polygon's edge,
 * points on your left are IN and points on your right are OUT.
 * if a point is on the polygon, it is considered BORDERLINE.
 * note that this operates on a left-handed coordinate system (if your y is decreasing, higher x is on your right)
 * @param polygon the path that defines the region we're checking.  it may jump across the boundary domains if
 *                periodicS and/or periodicT are set to true.  however, it may not intersect itself, and it must not
 *                form any ambiguusly included regions (like two concentric circles going the same way) or the result
 *                is undefined.
 * @param point the point that may or may not be in the region
 * @param periodic whether these points are defined in geographic coordinates, mandating a [-π, π) periodic domain
 * @return IN if the point is part of the polygon, OUT if it's separate from the polygon,
 *         and BORDERLINE if it's on the polygon's edge.
 */
export function contains(polygon: PathSegment[], point: Location, periodic: boolean): Side {
	if (polygon.length === 0)
		return Side.IN;

	// choose a point near the polygon
	let terminus = null;
	for (let i = 1; i < polygon.length; i ++) {
		if (polygon[i].type !== 'M') {
			const start = endpoint(polygon[i-1]);
			const end = endpoint(polygon[i]);
			if (polygon[i].type === 'A' || start.t !== end.t) {
				const knownPolygonPoint = getMidpoint(polygon[i - 1], polygon[i], periodic);
				if (knownPolygonPoint.s !== point.s) {
					const bonusLength = Math.hypot(end.s - start.s, end.t - start.t);
					terminus = { // chosen to be a little bit beyond an arbitrary segment
						s: knownPolygonPoint.s + Math.sign(knownPolygonPoint.s - point.s)*bonusLength,
						t: knownPolygonPoint.t };
					break;
				}
			}
		}
	}
	if (terminus === null)
		throw new Error(`this polygon didn't seem to have any segments: ${pathToString(polygon)}`);
	const testEdge = [ // and draw a path from the point to that point
		{ type: 'M',
		  args: [point.s, point.t] },
		{ type: (periodic) ? LongLineType.PARALLEL : 'L',
		  args: [point.s, terminus.t] },
		{ type: (periodic) ? LongLineType.MERIDIAN : 'L',
		  args: [terminus.s, terminus.t] },
	];

	// manually check for the most common forms of coincidences
	for (let i = 1; i < polygon.length; i ++) {
		if (polygon[i].type === 'L' || polygon[i].type === LongLineType.PARALLEL || polygon[i].type === LongLineType.MERIDIAN) {
			const start = endpoint(polygon[i - 1]);
			const end = endpoint(polygon[i]);
			let inTheRightSNeighborhood = isBetween(point.s, start.s, end.s);
			let inTheRightTNeighborhood = isBetween(point.t, start.t, end.t);
			if (periodic && polygon[i].type === 'L') {
				if (Math.abs(start.s - end.s) > π) // check for s periodicity
					inTheRightSNeighborhood = !inTheRightSNeighborhood;
				if (Math.abs(start.t - end.t) > π) // check for t periodicity
					inTheRightTNeighborhood = !inTheRightTNeighborhood;
			}
			// if the point is exactly on this edge, count it as borderline
			if (inTheRightSNeighborhood && inTheRightTNeighborhood)
				if ((start.s === end.s && start.s === point.s) || (start.t === end.t && start.t === point.t))
					return Side.BORDERLINE;
		}
	}

	// this Stokes's-Theorem-inspired algorithm a little different from the normal nonzero/even-odd rule. this is
	// chiefly because it needs to account for the directionality of the polygon.  drawing a ray from the point that
	// doesn't intersect the polygon doesn't automaticly mean the point is out; you would need to then go and check
	// whether the polygon is inside-out or not (or put more strictly, whether it contains the infinitely distant
	// terminus of your ray). there are two modifications that have to be made here as a result.  first is that instead
	// of a ray from the point in an arbitrary direction, our test path needs to be chosen to garantee it intersects the
	// polygon.  this is acheved by calculating testPath as above.  twoth is that we need to mind the direction of the
	// nearest crossing rather than just counting how many crossings there are in each direction.  nieve implementations
	// of this will fail if the polygon has a vertex on the test path but doesn't *cross* the test path at that vertex,
	// because if you're just noting the direction of the segments and the location where they intersect the path,
	// you'll see two crossings in opposite directions at the exact same point, and it's then impossible to say which
	// was closer, even tho by eye the anser might look unambiguus.  the solution is to not just count the crossings but
	// *sum* them, weying them by how far they are from the point.  since the crossings should always alternate in
	// direction when you look at them along a path, and any two crossings in the same place will now cancel out, it can
	// be shown that the sign of that sum will then correspond to the nearest unambiguus crossing.
	let crossingSum = 0.;
	// iterate around the polygon
	for (let i = 1; i < polygon.length; i ++) {
		if (polygon[i].type !== 'M') {
			// check to see if this segment crosses the test path
			const crossings = getEdgeCrossings(endpoint(polygon[i - 1]), polygon[i], testEdge, periodic);
			for (const {intersect0, entering} of crossings) { // look for places where the polygon crosses the path we drew
				// determine how far it is from the pole
				const d = Math.abs(intersect0.s - point.s) + Math.abs(intersect0.t - point.t);
				if (d === 0) // if any segment is *on* the point, it's borderline
					return Side.BORDERLINE;
				crossingSum += (entering) ? 1/d : -1/d; // otherwise, add its weited crossing direction to the sum
			}
		}
	}
	if (crossingSum === 0) {
		console.log(pathToString(polygon));
		console.log(pathToString(testEdge));
		throw new Error("you need to check this algorithm because crossingSum should never be 0.");
	}
	return (crossingSum > 0) ? Side.IN : Side.OUT;
}


/**
 * return a point on the given segment.
 */
function getMidpoint(prev: PathSegment, segment: PathSegment, periodic: boolean): Location {
	if (segment.type === 'L') {
		const start = endpoint(prev);
		const end = endpoint(segment);
		const midpoint =  { s: (start.s + end.s)/2, t: (start.t + end.t)/2 };
		if (periodic) {
			if (Math.abs(end.s - start.s) > π) // it's an arithmetic mean of the coordinates but you have to account for periodicity
				midpoint.s = localizeInRange(midpoint.s + π, -π, π);
			if (Math.abs(end.t - start.t) > π)
				midpoint.t = localizeInRange(midpoint.t + π, -π, π);
		}
		return midpoint;
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
	else if (segment.type === LongLineType.MERIDIAN || segment.type === LongLineType.PARALLEL) {
		const start = endpoint(prev);
		const end = endpoint(segment);
		return { s: (start.s + end.s)/2, t: (start.t + end.t)/2 };
	}
	else {
		throw new Error(`don't know how to take the midpoint of ${segment.type} segments.`);
	}
}

/**
 * compute the coordinates at which the line between these two points crosses an interrupcion.  for
 * each crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
 * the 1th point's side.  also, the index of the loop on which this crossing lies,
 * and whether the line is going from the right (outside) of the edge to the left (inside).
 *
 * the periodicity of the Surface, if the Surface is periodic, will be accounted for with the line between the points
 * (that is, if coords0 and coords1 are on opposite sides of the map, the path between them will be interpreted as the
 * line across the antimeridian).  the edges themselves must be LongLineType.MERIDIANs or LongLineType.PARALLELs if the
 * surface is geographic, meaning they will never wrap around the backside of the map (since those line types are
 * defined to always be monotonic in latitude or longitude) and their periodicity is therefore not accounted for.
 *
 * for the purposes of this function, points on an edge count as out.  so no crossing will be returnd for a segment
 * between a point outside the edges and a point on an edge.
 * if the segment passes thru the vertex between two edges, it will only register as a single crossing
 */
export function getEdgeCrossings(
	segmentStart: Location, segment: PathSegment, edges: PathSegment[], periodic: boolean,
): { intersect0: Location, intersect1: Location, loopIndex: number, entering: boolean }[] {
	const crossings = [];
	let loopIndex = 0;
	for (let i = 1; i < edges.length; i ++) { // then look at each edge segment
		if (edges[i].type === 'M') {
			loopIndex ++; // counting to keep track of which loop we're on
			continue;
		}

		const edgeStart = endpoint(edges[i - 1]);
		const edge = edges[i];
		// if we're on a geographic surface
		if (periodic) {
			// find all the geo edge crossings
			const crossing = getGeoEdgeCrossing(assert_фλ(segmentStart), segment, assert_фλ(edgeStart), edge);
			if (crossing !== null) {
				const { place0, place1, entering } = crossing;
				crossings.push({ intersect0: { s: place0.ф, t: place0.λ },
					intersect1: { s: place1.ф, t: place1.λ },
					loopIndex: loopIndex, entering: entering }); // note that if this is a double edge, it is always exiting
			}
		}
		// if we're in the infinite cartesian plane
		else {
			// find all the map edge crossings
			for (const crossing of getMapEdgeCrossings(assert_xy(segmentStart), segment, assert_xy(edgeStart), edge)) {
				const { point, entering } = crossing;
				crossings.push({ intersect0: { s: point.x, t: point.y },
					intersect1: { s: point.x, t: point.y },
					loopIndex: loopIndex, entering: entering }); // even if the getCrossing function thaut it was only entering
			}
		}
	}
	// now remove any duplicate crossings
	for (let i = crossings.length - 1; i > 0; i --) {
		for (let j = i - 1; j >= 0; j --) {
			if ( // checking for crossing equality is kind of a pain
				crossings[i].loopIndex === crossings[j].loopIndex &&
				(
					crossings[i].intersect0.s === crossings[j].intersect0.s &&
					crossings[i].intersect0.t === crossings[j].intersect0.t
				) || (
					crossings[i].intersect1.s === crossings[j].intersect1.s &&
					crossings[i].intersect1.t === crossings[j].intersect1.t
				)
			) {
				crossings.splice(i, 1);
				break;
			}
		}
	}
	// return the pruned list
	return crossings;
}

/**
 * compute the coordinates at which the line between these two points crosses an interrupcion in the map.  for
 * each crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
 * the 1th point's side.  also, the index of the loop on which this crossing lies, and whether the line is crossing
 * to the left from the POV of the edge (remember that SVG is a left-handed coordinate system).
 *
 * for the purposes of this function, points on the edge count as out.
 * if the segment passes thru the vertex between two edges, it might register as two identical crossings.
 */
function getMapEdgeCrossings(segmentStart: Point, segment: PathSegment, edgeStart: Point, edge: PathSegment
): { point: Point, entering: boolean }[] {
	if (edge.type !== 'L')
		throw new Error(`You can't use ${edge.type} edges in this funccion.`);

	const crossings = [];
	let segmentEnd = assert_xy(endpoint(segment));
	const edgeEnd = assert_xy(endpoint(edge));
	if (segment.type === 'L') { // if it's a line
		const intersect = lineLineIntersection(
			segmentStart, segmentEnd, edgeStart, edgeEnd);
		if (intersect !== null) // if there is an intersection
			crossings.push({
				point: intersect,
				entering: signCrossing(segmentStart, segmentEnd, edgeStart, edgeEnd) > 0 }); // return it!
	}
	else if (segment.type === 'A') { // if it's an arc
		const [r, rOther, , largeArc, sweepDirection, , ] = segment.args; // get the parameters
		console.assert(r === rOther, "I haven't accounted for ellipses.");

		if (sweepDirection === 0) { // arrange a and b so that it sweeps clockwise (in graphical coordinates)
			const temporary = segmentStart;
			segmentStart = segmentEnd;
			segmentEnd = temporary;
		}
		const center = chordCenter(segmentStart, segmentEnd, r, largeArc === 0); // compute the center

		const points = lineArcIntersections(edgeStart, edgeEnd, center, r, segmentStart, segmentEnd); // check for intersections
		for (const intersect of points) {
			let direction = {x: center.y - intersect.y, y: intersect.x - center.x};
			if (sweepDirection === 0)
				direction = {x: -direction.x, y: -direction.y};
			crossings.push({
				point: intersect,
				entering: signCrossing({x: 0, y: 0}, direction, edgeStart, edgeEnd) > 0 });
		}
	}
	else {
		throw new Error(`I don't think you're allowd to use '${segment.type}' segments here`);
	}
	// check any crossings that are on an endpoint to see if they're really supposed to be there
	for (let i = crossings.length - 1; i >= 0; i --) {
		if (crossings[i].point.x === segmentStart.x &&
			crossings[i].point.y === segmentStart.y &&
			!crossings[i].entering)
			crossings.splice(i, 1); // if the intersect is the start point and it goes out after that then it's not a crossing
		else if (crossings[i].point.x === segmentEnd.x &&
			crossings[i].point.y === segmentEnd.y &&
			crossings[i].entering)
			crossings.splice(i, 1); // if the intersect is the endpoint and it's coming from outside then it's not a crossing
	}
	return crossings;
}

/**
 * compute the coordinates at which the line between these two points crosses a bound on the surface.  if
 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
 * the 1th point's side.  also, whether the path is crossing to the left from the edge's POV.
 *
 * for the purposes of this function, points on the edge count as out.
 * if the segment passes thru the vertex between two edges, it might register as two identical crossings.
 */
function getGeoEdgeCrossing(
	segmentStart: Place, segment: PathSegment, edgeStart: Place, edge: PathSegment,
): { place0: Place, place1: Place, entering: boolean } | null {
	// if the edge is a meridian, rotate everything so we can reuse the parallel-crossing code
	if (edge.type === LongLineType.MERIDIAN) {
		let newSegmentType;
		if (segment.type === LongLineType.PARALLEL)
			newSegmentType = LongLineType.MERIDIAN;
		else if (segment.type === LongLineType.MERIDIAN)
			newSegmentType = LongLineType.PARALLEL;
		else
			newSegmentType = segment.type;
		const crossing = getGeoEdgeCrossing(
			{ф: segmentStart.λ, λ: -segmentStart.ф},
			{type: newSegmentType, args: [segment.args[1], -segment.args[0]]},
			{ф: edgeStart.λ, λ: -edgeStart.ф},
			{type: LongLineType.PARALLEL, args: [edge.args[1], -edge.args[0]]},
		);
		if (crossing === null)
			return null;
		else
			return {
				place0: {λ: crossing.place0.ф, ф: -crossing.place0.λ},
				place1: {λ: crossing.place1.ф, ф: -crossing.place1.λ},
				entering: crossing.entering,
			};
	}
	else if (edge.type !== LongLineType.PARALLEL)
		throw new Error(`I don't think you're allowd to use ${edge.type} here`);

	const [ф0, λ0] = [segmentStart.ф, segmentStart.λ]; // extract the input coordinates
	const [ф1, λ1] = segment.args;
	const фX = edgeStart.ф;
	const edgeEnd = assert_фλ(endpoint(edge));
	// if it's a regular line crossing a parallel
	if (segment.type === 'L') {
		const inclusiveToTheSouth = edgeEnd.λ > edgeStart.λ;
		const ф̄0 = localizeInRange(ф0, фX, фX + 2*π, inclusiveToTheSouth);
		const ф̄1 = localizeInRange(ф1, фX, фX + 2*π, inclusiveToTheSouth);
		if (Math.abs(ф̄0 - ф̄1) >= π) { // call the getParallelCrossing function
			const {place0, place1} = getParallelCrossing(
				ф̄0, λ0, ф̄1, λ1, фX);
			if (isBetween(place0.λ, edgeStart.λ, edgeEnd.λ))
				return {
					place0: place0, place1: place1,
					entering: (ф̄1 < ф̄0) === (edgeEnd.λ > edgeStart.λ) };
		}
	}
	// if they're both parallels, they can't cross each other
	else if (segment.type === LongLineType.PARALLEL) {
		return null;
	}
	// if it's a meridian crossing a parallel
	else if (segment.type === LongLineType.MERIDIAN) {
		if (isBetween(λ0, edgeStart.λ, edgeEnd.λ)) { // crossings with meridians are simple
			let crosses; // just make sure you get the tangencies right
			if (edgeEnd.λ < edgeStart.λ)
				crosses = (ф0 >= фX) !== (ф1 >= фX);
			else
				crosses = (ф0 > фX) !== (ф1 > фX);
			if (crosses) {
				const place = {ф: фX, λ: segmentStart.λ};
				return {
					place0: place, place1: place,
					entering: (ф1 > ф0) === (edgeEnd.λ > edgeStart.λ) };
			}
		}
	}
	// if it's any other type of segment
	else
		throw new Error(`You can't use '${segment.type}' segments in this funccion.`);

	return null;
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
	const weit0 = localizeInRange(ф1 - фX, -π, π);
	const weit1 = localizeInRange(фX - ф0, -π, π);
	let λX;
	if (weit0 === 0)
		λX = λ1; // avoid doing division if you can help it (because of the roundoff)
	else if (weit1 === 0)
		λX = λ0;
	else {
		if (Math.abs(λ1 - λ0) > π) { // account for longitude-periodicity
			const λMin = Math.max(λ0, λ1);
			const λMax = λMin + 2*π;
			λ0 = localizeInRange(λ0, λMin, λMax);
			λ1 = localizeInRange(λ1, λMin, λMax);
		}
		λX = localizeInRange(
			(weit0*λ0 + weit1*λ1)/(weit0 + weit1), -π, π);
	}
	if (Math.abs(фX) === π && ф0 < ф1)
		return { place0: { ф: -π, λ: λX },
			place1: { ф:  π, λ: λX } };
	else if (Math.abs(фX) === π)
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
function getPositionOnEdge(point: Location, edges: PathSegment[]): {loop: number, index: number} {
	let loopIndex = 0;
	let segmentIndex = 0;
	for (let i = 1; i < edges.length; i ++) { // start by choosing an edge
		if (edges[i].type === 'M') {
			loopIndex ++;
			segmentIndex = 0;
		}
		else { // an edge that's not just a moveto
			const start = endpoint(edges[i - 1]);
			const end = endpoint(edges[i]);
			const onThisEdge = (
				(point.s >= Math.min(start.s, end.s)) &&
				(point.s <= Math.max(start.s, end.s)) &&
				(point.t >= Math.min(start.t, end.t)) &&
				(point.t <= Math.max(start.t, end.t)));

			if (onThisEdge) {
				const startToPointVector = [ point.s - start.s,
					point.t - start.t ];
				const startToEndVector = [ end.s - start.s,
					end.t - start.t ];
				let startToEndSqr = 0;
				let dotProduct = 0;
				for (let k = 0; k < 2; k ++) {
					startToEndSqr += Math.pow(startToEndVector[k], 2);
					dotProduct += startToPointVector[k]*startToEndVector[k];
				}
				return { loop: loopIndex, index: segmentIndex + dotProduct/startToEndSqr };
			}

			segmentIndex ++;
		}
	}
	return { loop: null, index: null };
}

/**
 * just make sure every contiguus section either ends where it started or starts and ends on an edge
 * @param segments the Path to test
 * @param surface the surface that contains the points (so we know when it goes off the edge)
 */
export function isClosed(segments: PathSegment[], surface: Surface | InfinitePlane): boolean {
	let start: Location = null;
	for (let i = 0; i < segments.length; i ++) {
		if (segments[i].type === 'M')
			start = endpoint(segments[i]);
		// loop from M to M to find each contiguus section
		if (i + 1 === segments.length || segments[i+1].type === 'M') {
			if (start === null)
				throw new Error(`path must begin with a moveto, not ${segments[0].type}`);
			const end = endpoint(segments[i]);
			// account for periodicity
			if (surface instanceof Surface) {
				start.s = localizeInRange(start.s, -π, π);
				start.t = localizeInRange(start.t, -π, π);
				end.s = localizeInRange(end.s, -π, π);
				end.t = localizeInRange(end.t, -π, π);
			}
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
