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
import {Surface} from "../planet/surface.js";
import {isBetween, localizeInRange} from "../util/util.js";
import {ErodingSegmentTree} from "../util/erodingsegmenttree.js";
import {
	assert_xy,
	assert_фλ,
	endpoint,
	Location,
	LongLineType,
	PathSegment,
	Place,
	Point
} from "../util/coordinates.js";
import {chordCenter, isAcute, lineArcIntersections, lineLineIntersection} from "../util/geometry.js";


const MAP_PRECISION = 5e-2;
const π = Math.PI;

/**
 * a class to manage the plotting of points from a Surface onto a plane.
 */
export abstract class MapProjection {
	public readonly surface: Surface;
	public readonly northUp: boolean;
	public readonly center: number;
	public geoEdges: MapEdge[][];
	public mapEdges: MapEdge[][];
	private left: number;
	private right: number;
	private top: number;
	private bottom: number;

	protected constructor(surface: Surface,
						  northUp: boolean, locus: PathSegment[],
						  left: number, right:number,
						  top: number, bottom: number,
						  edges: MapEdge[][] = null) {
		this.surface = surface;
		this.northUp = northUp;
		this.setDimensions(left, right, top, bottom);

		if (locus !== null)
			this.center = MapProjection.centralMeridian(locus); // choose a center based on the locus
		else
			this.center = 0;

		if (edges === null) // the default set of edges is a rectangle around the map
			edges = MapProjection.buildGeoEdges(surface.фMin, surface.фMax, -π, π);
		this.geoEdges = edges;
	}

	/**
	 * make any preliminary transformations that don't depend on the type of map
	 * projection.  this method accounts for south-up maps and central meridians, and
	 * should almost always be calld before project or getCrossing.
	 * @param segments the jeograffickal imputs in absolute coordinates
	 * @returns the relative outputs in transformed coordinates
	 */
	transform(segments: PathSegment[]): PathSegment[] {
		const output: PathSegment[] = [];
		for (const segment of segments) {
			const [фi, λi] = segment.args;
			let λo = localizeInRange(λi - this.center, -π, π); // shift to the central meridian and snap the longitude into the [-π, π] domain
			let фo = фi;
			if (!this.northUp) { // flip the map over if it should be south-up
				фo *= -1;
				λo *= -1;
			}
			output.push({ type: segment.type, args: [фo, λo] });
		}
		return output;
	}

	/**
	 * transform the given parametric coordinates to Cartesian ones.
	 * @param point the latitude and longitude in radians, in the range [-π, π]
	 */
	abstract projectPoint(point: Place): Point

	/**
	 * generate some <path> segments to trace a line of constant latitude between two longitudes
	 * @param ф the relative latitude in radians
	 * @param λ0 the relative starting longitude in the range [-π, π]
	 * @param λ1 the relative ending longitude in the range [-π, π]
	 */
	projectParallel(λ0: number, λ1: number, ф: number): PathSegment[] {
		const {x, y} = this.projectPoint({ф: ф, λ: λ1});
		return [{type: 'L', args: [x, y]}];
	}

	/**
	 * generate some <path> segments to trace a line of constant longitude between two latitudes
	 * @param ф0 the relative starting latitude in radians
	 * @param ф1 the relative ending latitude in radians
	 * @param λ the relative longitude in the range [-π, π]
	 */
	projectMeridian(ф0: number, ф1: number, λ: number): PathSegment[] {
		const {x, y} = this.projectPoint({ф: ф1, λ: λ});
		return [{type: 'L', args: [x, y]}];
	}

	/**
	 * project and convert a list of SVG paths in latitude-longitude coordinates representing a series of closed paths
	 * into an SVG.Path object, and add that Path to the given SVG.
	 * @param segments ordered Iterator of segments, which each have attributes .type (str) and .args ([double])
	 * @param closePath if this is set to true, the map will make adjustments to account for its complete nature
	 * @returns SVG.Path object
	 */
	project(segments: PathSegment[], closePath: boolean): PathSegment[] {
		if (segments.length === 0) // what're you trying to pull here?
			return [];
		else if (closePath && !MapProjection.isClosed(segments))
			throw "you can't pass open paths and expect me to close them for you.";

		segments = this.transform(segments);

		const jinPoints = this.cutToSize(segments, this.geoEdges, closePath);

		const precision = MAP_PRECISION*this.getDimensions().diagonal;
		let repeatCount = 0; // now do the math
		const cutPoints: PathSegment[] = []; // start a list of the projected points that are done
		const pendingPoints: PathSegment[] = []; // and a list of projected points that mite come later (in reverse order)
		const ogi: number[] = [];
		for (let i = 0; i < jinPoints.length; i ++)
			ogi.push(i);
		let i = 0; // and the index in jinPoints that corresponds to the end of cutPoints
		while (i < jinPoints.length) {
			if (jinPoints[i].type === LongLineType.GING) { // do the projection
				const [ф0, λ] = jinPoints[i-1].args;
				const [ф1, _] = jinPoints[i].args;
				console.assert(λ === _);
				cutPoints.push(...this.projectMeridian(ф0, ф1, λ));
				i ++;
			}
			else if (jinPoints[i].type === LongLineType.VEI) {
				const [ф, λ0] = jinPoints[i-1].args;
				const [_, λ1] = jinPoints[i].args;
				console.assert(ф === _);
				cutPoints.push(...this.projectParallel(λ0, λ1, ф));
				i ++;
			}
			else if (jinPoints[i].type === 'M') {
				const point = assert_фλ(endpoint(jinPoints[i]));
				const {x, y} = this.projectPoint(point);
				cutPoints.push({type: 'M', args: [x, y]});
				i ++;
			}
			else if (jinPoints[i].type === 'L') {
				const point = assert_фλ(endpoint(jinPoints[i]));
				let {x, y} = this.projectPoint(point);
				pendingPoints.push({type: 'L', args: [x, y]}); // put a pin in it; we mite haff to split it in haff
			}
			else {
				throw `I don't think you can use ${jinPoints[i].type} here`;
			}

			while (pendingPoints.length > 0) { // now, if there are points in the pending cue
				const a = assert_xy(endpoint(cutPoints[cutPoints.length - 1])); // check the map distance
				const b = assert_xy(endpoint(pendingPoints[pendingPoints.length - 1])); // between the end of cutPoints and the start of pendingPoints
				if (Math.hypot(b.x - a.x, b.y - a.y) < precision) { // if it's short enuff
					cutPoints.push(pendingPoints.pop()); // unpend it
					i ++;
				}
				else { // if it's too long
					const aGeo = assert_фλ(endpoint(jinPoints[i-1]));
					const bGeo = assert_фλ(endpoint(jinPoints[i]));
					const {ф, λ} = this.getGeoMidpoint(aGeo, bGeo); // that means we need to plot a midpoint
					jinPoints.splice(i, 0, {type: 'L', args: [ф, λ]});
					ogi.splice(i, 0, ogi[i]);
					break; // break out of this so we can go project it
				}
			}

			repeatCount ++;
			if (repeatCount > 100000)
				throw `why can't I find a point between ${jinPoints[i - 1].args}=>${cutPoints[cutPoints.length - 1].args} and ${jinPoints[i].args}=>${pendingPoints[pendingPoints.length - 1].args}`;
		}

		for (const segment of cutPoints)
			for (const arg of segment.args)
				console.assert(!Number.isNaN(arg), cutPoints);

		return this.cutToSize(cutPoints, this.mapEdges, closePath);
	}

	/**
	 * take a path with some lines nad movetos and stuff, and modify it to fit within the
	 * given edges by cutting it and adding lines and stuff.
	 * @param segments the segments to cut
	 * @param edges the MapEdges within which to fit this
	 * @param closePath whether you should add stuff around the edges when things clip
	 */
	cutToSize(segments: PathSegment[], edges: MapEdge[][], closePath: boolean): PathSegment[] {
		for (const segment of segments)
			if (typeof segment.type !== 'string')
				throw `you can't pass ${segment.type}-type segments to this funccion.`;
		if (closePath && !MapProjection.isClosed(segments))
			throw `ew, it's open.  go make sure your projections are 1:1!`;

		const segmentCue = segments.slice().reverse();
		const sections: PathSegment[][] = [];
		let currentSection: PathSegment[] = null;
		let iterations = 0;
		while (true) { // first, break it up into sections
			const thisSegment = (segmentCue.length > 0 ? segmentCue.pop() : null);

			if (thisSegment === null || thisSegment.type === 'M') { // at movetos and at the end
				if (currentSection !== null) {
					if (this.encompasses(edges, currentSection))
						sections.push(currentSection); // save if so TODO: save if no also
				}
				if (thisSegment !== null)
					currentSection = [thisSegment]; // and start a new section
				else
					break; // or stop if we're done
			}

			else {
				if (currentSection === null)
					throw "it didn't start with 'M', I gess?";

				const lastSegment = currentSection[currentSection.length - 1];
				const crossing = this.getEdgeCrossing(
					lastSegment, thisSegment, edges); // otherwise, check for interruption

				if (crossing === null) { // for uninterrupted segments
					currentSection.push(thisSegment); // just add them to the thing
				}
				else { // otherwise, if it jumps across an interruption
					const { intersect0, intersect1 } = crossing;
					segmentCue.push(
						...MapProjection.spliceSegment(
							endpoint(lastSegment), thisSegment,
							intersect0, intersect1,
						).reverse() // remember to reverse it for the FILO segment cue
					);
				}
			}
			iterations ++;
			if (iterations > 100000)
				throw `*Someone* (not pointing any fingers) messd up an interruption between ${currentSection.pop()} and ${thisSegment}.`;
		}

		if (sections.length === 0) // if it's all off the map
			return []; // goodbye TODO: have a way to check if we need to shade in the entire map

		const startPositions: { loop: number, index: number }[] = [];
		const weHaveDrawn: boolean[] = []; // set up some section-indexed vectors
		for (const section of sections) {
			startPositions.push(MapProjection.getPositionOnEdge(
				endpoint(section[0]), edges));
			weHaveDrawn.push(false);
		}

		const output: PathSegment[] = []; // now start re-stitching it all together
		let sectionIndex = 0;
		let supersectionIndex = -1;
		let supersectionStart = null;
		let startingANewSupersection = true;
		while (true) {

			let jinSection = sections[sectionIndex]; // take a section
			if (!startingANewSupersection) {
				jinSection = jinSection.slice(1); // remove its moveto
			}
			else {
				supersectionIndex = sectionIndex;
				supersectionStart = endpoint(jinSection[0]);
			}
			startingANewSupersection = false; // turn off this notification flag until we need it agen

			output.push(...jinSection); // add its points to the thing
			weHaveDrawn[sectionIndex] = true; // mark it as drawn

			if (!closePath) { // if we're not worrying about closing it off
				startingANewSupersection = true; // forget it and move onto a random section
			}
			else {
				const sectionEnd = endpoint(jinSection[jinSection.length-1]); // otherwise, look at where on Earth we are
				const endPosition = MapProjection.getPositionOnEdge(
					sectionEnd, edges);

				if (sectionEnd.s === supersectionStart.s &&
					sectionEnd.t === supersectionStart.t) { // first, check if we have closed this supersection
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
					if (bestSection === null)
						throw `couldn't find a new start position on loop ${endPosition.loop}`;

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
						throw "I don't think it should be possible to rap around to a drawn section that's not this one";
				}
				else { // if we ended in the middle someplace
					sectionIndex = null;
					for (let i = 0; i < sections.length; i ++) { // look for the one that picks up from here
						const start = endpoint(sections[i][0]);
						if (start.s === sectionEnd.s && start.t === sectionEnd.t) {
							sectionIndex = i; // and go there
							break;
						}
					}
					if (sectionIndex === null) {
						console.error(edges);
						console.error(sections);
						throw `I was left hanging at [${sectionEnd.s}, ${sectionEnd.t}]`;
					}
					if (weHaveDrawn[sectionIndex]) // if that one has already been drawn
						startingANewSupersection = true; // move on randomly
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
				if (MapProjection.isInsideOut(output, edges[i])) { // if it is inside out
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
	static spliceSegment(start: Location, segment: PathSegment, intersect0: Location, intersect1: Location): PathSegment[] {
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
			throw `can't use '${segment.type}' here`;
		}
	}


	/**
	 * find out if the given points are contained by a set of edges, using an even/odd
	 * rule. it is assumed that they are either all in or all out.  points on an edge are
	 * considerd ambiguous
	 * @param edges
	 * @param points
	 * @return whether all of points are inside edges
	 */
	encompasses(edges: MapEdge[][], points: PathSegment[]): boolean {
		const polygon: PathSegment[] = [];
		for (const loop of edges) {
			polygon.push({type: 'M', args: [loop[0].start.s, loop[0].start.t]});
			for (const edge of loop)
				polygon.push({type: 'L', args: [edge.end.s, edge.end.t]});
		}
		for (let i = 0; i < points.length; i ++) { // the fastest way to judge this is to just look at the first point
			const containd = MapProjection.contains(
				polygon,
				endpoint(points[i]));
			if (containd !== null) // that is not ambiguous
				return containd;
		}
		for (let i = 1; i < points.length; i ++) { // if that didn't work, use midpoints
			const containd = MapProjection.contains(
				polygon,
				this.getMidpoint(points[i - 1], points[i], edges[0][0].type === 'L'));
			if (containd !== null) // in practice, this should always be unambiguous
				return containd;
		}
		return false; // if it's completely on the edge, mark it as out so it goes away
	}


	/**
	 * find out if a point is contained by a polygon, using an even/odd rule.
	 * if a point is on the polygon, return null to mark it as ambiguous.
	 * @param polygon
	 * @param point
	 * @return whether point is inside polygon, or null if it is on the edge.
	 */
	static contains(polygon: PathSegment[], point: Location): boolean {
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
					throw "nonononononnooooooooooooooo";
			}
		}
		return contained;
	}


	/**
	 * return a point on the given segment.
	 * @param prev
	 * @param segment
	 * @param planar
	 */
	getMidpoint(prev: PathSegment, segment: PathSegment, planar: boolean): Location {
		if (planar) {
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
				throw `don't know how to take the midpoint of ${segment.type} segments`;
			}
		}
		else {
			if (segment.type === 'L') {
				const midpoint = this.getGeoMidpoint(assert_фλ(endpoint(prev)),
				                                     assert_фλ(endpoint(segment)));
				return { s: midpoint.ф, t: midpoint.λ };
			}
			else if (segment.type === LongLineType.GING || segment.type === LongLineType.VEI) {
				const start = endpoint(prev);
				const end = endpoint(segment);
				return { s: (start.s + end.s)/2, t: (start.t + end.t)/2 };
			}
			else {
				throw `don't know how to take the midpoint of ${segment.type} segments`;
			}
		}
	}


	/**
	 * compute the coordinates of the midpoint between these two lines.
	 * @return Place
	 */
	getGeoMidpoint(a: Place, b: Place): Place {
		const posA = this.surface.xyz(a);
		const posB = this.surface.xyz(b);
		const posM = posA.plus(posB).over(2);
		return this.surface.фλ(posM);
	}

	/**
	 * compute the coordinates at which the line between these two points crosses an interrupcion.  if
	 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
	 * the 1th point's side.  also, the index of the loop on which this crossing lies.
	 */
	getEdgeCrossing(
		coords0: PathSegment, coords1: PathSegment, edges: MapEdge[][]
	): { intersect0: Location, intersect1: Location, loopIndex: number } | null {
		if (edges[0][0].type === LongLineType.GING || edges[0][0].type === LongLineType.VEI) {
			const crossing = this.getGeoEdgeCrossing(coords0, coords1, edges);
			if (crossing === null)
				return null;
			const { place0, place1, loopIndex } = crossing;
			return { intersect0: { s: place0.ф, t: place0.λ },
			         intersect1: { s: place1.ф, t: place1.λ },
			         loopIndex: loopIndex }; // note that if this is a double edge, it is always exiting
		}
		else if (edges[0][0].type === 'L') {
			const crossing = this.getMapEdgeCrossing(coords0, coords1, edges);
			if (crossing === null)
				return null;
			const { point0, point1, loopIndex } = crossing;
			return { intersect0: { s: point0.x, t: point0.y },
			         intersect1: { s: point1.x, t: point1.y },
			         loopIndex: loopIndex }; // even if the getCrossing function thaut it was only entering
		}
		else {
			throw "no.";
		}
	}

	/**
	 * compute the coordinates at which the line between these two points crosses an interrupcion in the map.  if
	 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
	 * the 1th point's side.  also, the index of the loop on which this crossing lies.
	 */
	getMapEdgeCrossing(coords0: PathSegment, coords1: PathSegment, edges: MapEdge[][]
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
			throw `I don't think you're allowd to use '${coords1.type}' segments here`;
		}
	}

	/**
	 * compute the coordinates at which the line between these two points crosses a bound on the surface.  if
	 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
	 * the 1th point's side.  also, the index of the loop on which this crossing lies.
	 */
	getGeoEdgeCrossing(
		coords0: PathSegment, coords1: PathSegment, edges: MapEdge[][]
	): { place0: Place, place1: Place, loopIndex: number } | null {
		for (const coords of [coords0, coords1])
			console.assert(coords.type === 'M' || coords.type === 'L',
				`You can't use arcs in this funccion.`);

		const [ф0, λ0] = coords0.args; // extract the input coordinates
		const [ф1, λ1] = coords1.args;

		for (let i = 0; i < edges.length; i ++) { // then look at each edge loop
			for (const edge of edges[i]) { // and at each edge
				const start = assert_фλ(edge.start);
				const end = assert_фλ(edge.end);
				if (edge.type === LongLineType.GING) { // if it is a meridian
					const λX = start.λ;
					const λ̄0 = localizeInRange(λ0, λX, λX + 2*π);
					const λ̄1 = localizeInRange(λ1, λX, λX + 2*π);
					if (λ̄0 !== λX && λ̄1 !== λX && Math.abs(λ̄0 - λ̄1) >= π) { // check to see if it crosses this edge
						const {place0, place1} = this.getMeridianCrossing(
							ф0, λ0, ф1, λ1, λX);
						if (isBetween(place0.ф, start.ф, end.ф))
							return {
								place0: place0, place1: place1, loopIndex: i };
					}
				}
				else if (edge.type === LongLineType.VEI) { // do the same thing for parallels
					const фX = start.ф;
					const ф̄0 = localizeInRange(ф0, фX, фX + 2*π);
					const ф̄1 = localizeInRange(ф1, фX, фX + 2*π);
					if (ф̄0 !== фX && ф̄1 !== фX && Math.abs(ф̄0 - ф̄1) >= π) {
						const {place0, place1} = this.getParallelCrossing(
							ф0, λ0, ф1, λ1, start.ф);
						if (isBetween(place0.λ, start.λ, end.λ))
							return {
								place0: place0, place1: place1, loopIndex: i };
					}
				}
				else {
					throw `I don't think you're allowd to use ${edge.type} here`;
				}
			}
		}

		return null;
	}

	/**
	 * compute the coordinates at which the line between these two points crosses a particular meridian.  two Places
	 * will be returnd: one on the 0th point's side of the interrupcion, and one on the 1th point's side.  if the
	 * meridian is not the antimeridian, then they will just be the same.
	 * @param ф0 the transformed latitude of the zeroth point
	 * @param λ0 the transformed longitude of the zeroth point
	 * @param ф1 the transformed latitude of the oneth point
	 * @param λ1 the transformed longitude of the oneth point
	 * @param λX the longitude of the meridian
	 */
	getMeridianCrossing(
		ф0: number, λ0: number, ф1: number, λ1: number, λX = π
	): { place0: Place, place1: Place } {
		const pos0 = this.surface.xyz({ф: ф0, λ: λ0 - λX});
		const pos1 = this.surface.xyz({ф: ф1, λ: λ1 - λX});
		const posX = pos0.times(pos1.x).plus(pos1.times(-pos0.x)).over(
			pos1.x - pos0.x);
		const фX = this.surface.фλ(posX).ф;
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
	getParallelCrossing(
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
	static getPositionOnEdge(point: Location, edges: MapEdge[][]): {loop: number, index: number} {
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

	getDimensions(): { left: number, right: number, top: number, bottom: number, width: number, height: number, diagonal: number } {
		return {
			left: this.left, right: this.right, width: this.right - this.left,
			top: this.top, bottom: this.bottom, height: this.bottom - this.top,
			diagonal: Math.hypot(this.left - this.right, this.bottom - this.top)
		};
	}

	/**
	 * set the dimensions of this map, to which it will be cropd
	 * @param left
	 * @param right
	 * @param top
	 * @param bottom
	 */
	protected setDimensions(left: number, right: number, top: number, bottom: number): void {
		console.assert(left === null || left < right, left, right);
		console.assert(top === null || top < bottom, top, bottom);
		if (left !== null && (left >= right || top >= bottom))
			throw `the axis bounds ${left}, ${right}, ${top}, ${bottom} are invalid.`;
		this.left = left;
		this.right = right;
		this.top = top;
		this.bottom = bottom;
		this.mapEdges = MapProjection.validateEdges([[
			{ type: 'L', start: {s: left, t: top}, },
			{ type: 'L', start: {s: left, t: bottom}, },
			{ type: 'L', start: {s: right, t: bottom}, },
			{ type: 'L', start: {s: right, t: top}, },
		]]);
	}

	/**
	 * create an array of edges for a map with a fixed rectangular bound in lat/lon space,
	 * for use in the edge cutting algorithm.
	 */
	static buildGeoEdges(фMin: number, фMax: number, λMin: number, λMax: number): MapEdge[][] {
		return this.validateEdges([[
			{ type: LongLineType.VEI, start: {s: фMax, t: λMax} },
			{ type: LongLineType.GING, start: {s: фMax, t: λMin} },
			{ type: LongLineType.VEI, start: {s: фMin, t: λMin} },
			{ type: LongLineType.GING, start: {s: фMin, t: λMax} },
		]]);

	}

	static validateEdges(inputs: { start: Location, type: LongLineType | string }[][]): MapEdge[][] {
		// first, bild the loops
		const edges: MapEdge[][] = [];
		for (let i = 0; i < inputs.length; i ++) {
			edges.push([]);
			for (const {start, type} of inputs[i]) {
				edges[i].push({
					type: type,
					start: start,
					end: null,
				});
			}

			// enforce the contiguity of the edge loops
			for (let j = 0; j < edges[i].length; j ++)
				edges[i][j].end = edges[i][(j+1)%edges[i].length].start;
		}
		return edges;
	}

	/**
	 * what is the longest empty longitudinal interval, possibly including the one that
	 * contains ±180°?
	 * @param segments the list of segments that fill up some region in n dimensions
	 * distances between the ritemost endpoint and +π and the leftmost endpoint and -π
	 */
	static centralMeridian(segments: PathSegment[]): number {
		const emptyLongitudes = new ErodingSegmentTree(-π, π); // start with all longitudes empty
		for (let i = 1; i < segments.length; i ++) {
			if (segments[i].type !== 'M') {
				const x1 = segments[i - 1].args[1];
				const x2 = segments[i].args[1];
				if (Math.abs(x1 - x2) < π) { // and then remove the space corresponding to each segment
					emptyLongitudes.remove(Math.min(x1, x2), Math.max(x1, x2));
				}
				else {
					emptyLongitudes.remove(Math.max(x1, x2), π);
					emptyLongitudes.remove(-π, Math.min(x1, x2));
				}
			}
		}
		if (emptyLongitudes.getCenter(true).location !== null)
			return emptyLongitudes.getCenter(true).location + π;
		else
			return 0; // default to 0°E TODO it would be really cool if I could pick a number more intelligently
	}

	/**
	 * what are the coordinate bounds of these segments?
	 * @param segments the points on which the map will focus
	 * @param projection a projection with its central meridian and orientation set
	 * so that we can properly transform the points
	 */
	static standardParallels(segments: PathSegment[], projection: MapProjection
	): {фStd: number, фMin: number, фMax: number, λMin: number, λMax: number} {
		let фMin = Number.POSITIVE_INFINITY; // get the bounds of the locus
		let фMax = Number.NEGATIVE_INFINITY;
		let λMax = Number.NEGATIVE_INFINITY; // you don't need λMin because the central meridian should be set to make it symmetrical
		for (const segment of projection.transform(segments)) {
			let [ф, λ] = segment.args;
			if (ф < фMin)
				фMin = ф;
			if (ф > фMax)
				фMax = ф; // TODO: this won't notice when the pole is included in the region
			if (λ > λMax)
				λMax = λ;
		}

		let фStd;
		if (фMax === π/2 && фMin === -π/2) // choose a standard parallel
			фStd = 0;
		else if (фMax === π/2)
			фStd = фMax;
		else if (фMin === -π/2)
			фStd = фMin;
		else
			фStd = (фMax + фMin)/2;

		return {фStd: фStd, фMin: фMin, фMax: фMax, λMin: -λMax, λMax: λMax};
	}

	/**
	 * calculate whether the given closed curve curls in the direction opposite the given
	 * edge loop
	 * @param segments
	 * @param edges
	 */
	static isInsideOut(segments: PathSegment[], edges: MapEdge[]): boolean {
		const edge = edges[0]; // pick one edge
		console.assert(edge.start.s === edge.end.s, "conceptually there's noting rong with what you've done, but I've only accounted for vertical edges here");
		const periodic = edges.length === 1; // check for periodicity in the form of an open edge
		const period = (periodic) ? Math.abs(edge.end.t - edge.start.t) : 0; // and measure the period
		const sEdge = edge.start.s;
		let tTest = null;
		let dMin = Number.POSITIVE_INFINITY;
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
	 * just make sure it eventually returns to each moveto.
	 * @param segments
	 */
	static isClosed(segments: PathSegment[]): boolean {
		let start: Location = null;
		for (let i = 0; i < segments.length; i ++) {
			if (segments[i].type === 'M')
				start = endpoint(segments[i]);
			if (i + 1 === segments.length || segments[i+1].type === 'M') {
				if (start === null)
					throw `path must begin with a moveto, not ${segments[0].type}`;
				const end = endpoint(segments[i]);
				if (start.s !== end.s || start.t !== end.t)
					return false;
			}
		}
		return true;
	}
}


/**
 * an edge on a map projection
 */
interface MapEdge {
	type: string | LongLineType;
	start: Location;
	end: Location;
}
