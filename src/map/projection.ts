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
import {
	isBetween,
	localizeInRange
} from "../util/util.js";
import {ErodingSegmentTree} from "../util/erodingsegmenttree.js";
import {
	assert_xy,
	endpoint,
	Location,
	LongLineType,
	PathSegment,
	Point,
	Place,
	assert_фλ
} from "../util/coordinates.js";
import {
	chordCenter,
	isAcute,
	lineArcIntersections,
	lineLineIntersection,
	signCrossing
} from "../util/geometry.js";


const MAP_PRECISION = 5e-2;

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
			edges = MapProjection.buildEdges(surface.фMin, surface.фMax, -Math.PI, Math.PI);
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
			let λo = localizeInRange(λi - this.center, -Math.PI, Math.PI); // shift to the central meridian and snap the longitude into the [-π, π] domain
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
					const {ф, λ} = this.getMidpoint(aGeo, bGeo); // that means we need to plot a midpoint
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

		const touchedLoop: boolean[] = []; // keep track of which loops it touches
		for (let i = 0; i < edges.length; i ++)
			touchedLoop.push(false);

		const segmentCue = segments.slice().reverse();
		const sections: PathSegment[][] = [];
		let currentSection: PathSegment[] = null;
		const upcomingMovetos: boolean[] = [];
		let iterations = 0;
		while (true) { // first, break it up into sections
			const thisSegment = (segmentCue.length > 0 ? segmentCue.pop() : null);

			if (thisSegment === null || thisSegment.type === 'M') { // at movetos and at the end
				if (currentSection !== null) {
					let currentSectionIsIn = null;
					if (upcomingMovetos.length > 0) // check if we have catalogd it (we should have if it's on an edge)
						currentSectionIsIn = upcomingMovetos.pop(); // if so, we have noted whether the current section is in
					else // if not
						currentSectionIsIn = MapProjection.envelops( // we need to check if the last point is containd (we know it's not on an edge)
							edges, currentSection[currentSection.length - 1]); // XXX there is a *slite* chance that this will fail if a moveto is on an edge
					if (currentSectionIsIn)
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
					const { intersect0, intersect1, loopIndex, exiting } = crossing;
					touchedLoop[loopIndex] = true; // take note that it crossd an on-screen edge
					upcomingMovetos.push(exiting); // record whether this was going in or out

					if (thisSegment.type === 'L') { // to split a line
						segmentCue.push(
							thisSegment, // leave the current segment in so we can check for further interruptions
							{ type: 'M', args: [intersect1.s, intersect1.t] }, // but also insert a jump to the other side
							{ type: 'L', args: [intersect0.s, intersect0.t] }, // preceded by a line up to the very edge
						); // (don't forget to reverse because it's FILO)
					}
					else if (thisSegment.type === 'A') { // to split an arc
						const a = assert_xy(endpoint(lastSegment));
						const b = assert_xy(intersect0);
						const c = assert_xy(intersect1);
						const [r1, r2, rot, _, sweepDirection, dx, dy] = thisSegment.args;
						const d = { x: dx, y: dy };
						const endpoints = [a, d];
						let largeArc: number[] = []; // you haff to figure out whether to change the large arc flag for the children
						for (let i = 0; i < 2; i ++) {
							const acute = isAcute(
								b, endpoints[1 - i], endpoints[i]); // luckily, this angle tells you whether the arc is big
							largeArc.push(acute ? 0 : 1);
							console.assert(largeArc[i] <= _);
						}
						segmentCue.push(
							{
								type: 'A',
								args: [r1, r2, rot, largeArc[1], sweepDirection, d.x, d.y]
							}, // insert the second segment
							{ type: 'M', args: [c.x, c.y] }, // preceded by the jump
							{
								type: 'A',
								args: [r1, r2, rot, largeArc[0], sweepDirection, b.x, b.y] // preceded by
							}, // preceded by the first segment
						); // (don't forget to reverse because it's FILO)
					}
					else {
						throw `can't use '${thisSegment.type}' here`;
					}
				}
			}
			iterations ++;
			if (iterations > 100000)
				throw `*Someone* (not pointing any fingers) messd up an interruption between ${currentSection.pop()} and ${thisSegment}.`;
		}

		if (sections.length === 0) // if it's all off the map
			return []; // goodbye TODO: keep the discarded sections and use them to determine if you need to trace the edge here

		const startPositions: { loop: number, index: number }[] = [];
		const weHaveDrawn: boolean[] = []; // set up some section-indexed vectors
		for (const section of sections) {
			startPositions.push(MapProjection.getPositionOnEdge(
				endpoint(section[0]), edges));
			weHaveDrawn.push(false);
		}

		const output: PathSegment[] = []; // now start re-stitching it all together
		let sectionIndex = 0;
		let supersectionStart = -1;
		let startingANewSupersection = true;
		while (true) {

			let jinSection = sections[sectionIndex]; // take a section
			if (!startingANewSupersection)
				jinSection = jinSection.slice(1); // take off its moveto
			else
				supersectionStart = sectionIndex;
			startingANewSupersection = false; // turn off this notification flag until we need it agen

			output.push(...jinSection); // add its points to the thing
			weHaveDrawn[sectionIndex] = true; // mark it as drawn
			const sectionEnd = endpoint(jinSection[jinSection.length-1]); // then look at where on Earth we are

			if (!closePath) { // if we're not worrying about closing it off
				startingANewSupersection = true; // forget it and move onto a random section
			}
			else {
				const endPosition = MapProjection.getPositionOnEdge(
					sectionEnd, edges);

				if (endPosition.loop !== null) { // if we ended hitting a wall
					const endLoop = edges[endPosition.loop]; // then we should move to another point on a wall

					let bestSection = null, bestPositionIndex = null;
					for (let i = 0; i < startPositions.length; i ++) { // check the remaining sections
						const startPosition = startPositions[i];
						if (startPosition.loop === endPosition.loop) { // for any on the same edge loop as us
							if (!weHaveDrawn[i] || i === supersectionStart) {
								if (startPosition.index < endPosition.index)
									startPosition.index += endLoop.length;
								if (bestPositionIndex === null || startPosition.index < bestPositionIndex) {
									bestSection = i; // calculate which one should come next
									bestPositionIndex = startPosition.index;
								}
								startPosition.index %= endLoop.length;
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
						const targetPlace = (i === restartEdge) ? nextStart : edge.end; // TODO: I used to hav something here about the current place not equalling the target place... does that ever come up?  should I have a check before the for loop?  does it even matter?
						output.push({type: edge.type,
							         args: [targetPlace.s, targetPlace.t]});
					}
					if (bestSection === supersectionStart) // if this brings us back to where we started this supersection
						startingANewSupersection = true; // move on randomly
					else if (!weHaveDrawn[bestSection]) // otherwise, if you found a fresh place to restart
						sectionIndex = bestSection; // go to it
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
					if (sectionIndex === null)
						throw `I was left hanging at [${sectionEnd.s}, ${sectionEnd.t}]`;
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

		for (let i = output.length - 1; i >= 2; i --) { // remove any zero-length segments
			if (output[i].type === 'A' && output[i-1].type === 'A' && output[i-2].type === 'A')
				throw "woit!";
		}
		if (closePath) { // if it matters which side is inside and which side out, draw the outline of the map
			for (let i = 0; i < edges.length; i ++) { // for each loop
				if (!touchedLoop[i]) { // which was not already tuchd
					const edge = edges[i][0]; // pick one edge
					console.assert(edge.start.s === edge.end.s, "conceptually there's noting rong with what you've done, but I've only accounted for vertical edges here");
					const periodic = edges[i].length === 1; // check for periodicity in the form of an open edge
					const period = (periodic) ? Math.abs(edge.end.t - edge.start.t) : 0; // and measure the period
					const sEdge = edge.start.s;
					let tTest = null;
					let dMin = Number.POSITIVE_INFINITY;
					let antiparallel = null;
					for (let i = 1; i < output.length; i ++) { // look through the path
						if (output[i].type === 'M') {  // ignore moves
						}
						else if (output[i].type === 'A') { // do something with arcs
							antiparallel = false;
							break; // well, assume that if there’s an arc, it’s never going to be inside out
						}
						else if (output[i].type === 'L') { // check lines and LongLines for crossings
							const a = endpoint(output[i - 1]);
							const b = endpoint(output[i]);
							if (a.t !== b.t) {
								const wraps = periodic && Math.abs(b.t - a.t) > period/2.; // if the domain is periodic and this line is long enuff, ita ctually raps around
								if (tTest === null) {
									tTest = (a.t + b.t)/2; // choose a y value
									// if (wraps) tTest = localizeInRange(tTest, edge.start.t, edge.end.t); // adjust for rapping, if necessary
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
					if (antiparallel) { // if it is
						const start = edges[i][0].start;
						output.push({type: 'M', args: [start.s, start.t]}); // draw the outline of the entire map to contain it
						for (const edge of edges[i])
							output.push({type: edge.type, args: [edge.end.s, edge.end.t]});
					}
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
	 * find out if all of the given points are contained by a set of edges, using an
	 * even/odd rule.
	 * @param edges
	 * @param point
	 * @return whether all of points are inside edges
	 */
	static envelops(edges: MapEdge[][], point: PathSegment): boolean {
		const polygon: PathSegment[] = [];
		for (const loop of edges) {
			polygon.push({type: 'M', args: [loop[0].start.s, loop[0].start.t]});
			for (const edge of loop)
				polygon.push({type: 'L', args: [edge.end.s, edge.end.t]});
		}
		return MapProjection.contains(polygon, endpoint(point));
	}


	/**
	 * find out if a point is contained by a polygon, using an even/odd rule.
	 * if a point is on the polygon, count it as in
	 * @param polygon
	 * @param point
	 * @return whether point is inside polygon
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

				// if the point is on an edge, call it in.
				if (s >= Math.min(s0, s1) && s <= Math.max(s0, s1) && t >= Math.min(t0, t1) && t <= Math.max(t0, t1) && (s0 === s1 || t0 === t1))
					return true;
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
	 * compute the coordinates of the midpoint between these two lines.
	 * @return Place
	 */
	getMidpoint(a: Place, b: Place): Place {
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
	): { intersect0: Location, intersect1: Location, loopIndex: number, exiting: boolean } | null {
		if (edges[0][0].type === LongLineType.GING || edges[0][0].type === LongLineType.VEI) {
			const crossing = this.getGeoEdgeCrossing(coords0, coords1, edges);
			if (crossing === null)
				return null;
			const { place0, place1, loopIndex, exiting } = crossing;
			return { intersect0: { s: place0.ф, t: place0.λ },
			         intersect1: { s: place1.ф, t: place1.λ },
			         loopIndex: loopIndex, exiting: exiting };
		}
		else if (edges[0][0].type === 'L') {
			const crossing = this.getMapEdgeCrossing(coords0, coords1, edges);
			if (crossing === null)
				return null;
			const { point0, point1, loopIndex, exiting } = crossing;
			return { intersect0: { s: point0.x, t: point0.y },
			         intersect1: { s: point1.x, t: point1.y },
			         loopIndex: loopIndex, exiting: exiting };
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
	): { point0: Point, point1: Point, loopIndex: number, exiting: boolean } | null {
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
					if (intersect !== null)
						return {
							point0: intersect, point1: intersect,
							loopIndex: i,
							exiting: signCrossing(a, b, start, end) > 0 };
				}
			}
			return null;
		}
		else if (coords1.type === 'A') { // if it's an arc
			const [r, rOther, rot, largeArc, sweepDirection, bx, by] = coords1.args; // get the parameters
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
						const vx = center.y - intersect.y;
						const vy = intersect.x - center.x;
						const target = { x: intersect.x + vx, y: intersect.y + vy };
						return {
							point0: intersect,
							point1: intersect,
							loopIndex: i,
							exiting: signCrossing(points[0], target, start, end) > 0 };
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
	): { place0: Place, place1: Place, loopIndex: number, exiting: boolean } | null {
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
					const λ̄0 = localizeInRange(λ0, λX, λX + 2*Math.PI);
					const λ̄1 = localizeInRange(λ1, λX, λX + 2*Math.PI);
					if (λ̄0 !== λX && λ̄1 !== λX && Math.abs(λ̄0 - λ̄1) >= Math.PI) { // check to see if it crosses this edge
						const {place0, place1} = this.getMeridianCrossing(
							ф0, λ0, ф1, λ1, λX);
						if (isBetween(place0.ф, start.ф, end.ф))
							return {
								place0: place0, place1: place1,
								loopIndex: i,
								exiting: (end.ф > start.ф) !== (λ̄1 > λ̄0) };
					}
				}
				else if (edge.type === LongLineType.VEI) { // do the same thing for parallels
					const фX = start.ф;
					const ф̄0 = localizeInRange(ф0, фX, фX + 2*Math.PI);
					const ф̄1 = localizeInRange(ф1, фX, фX + 2*Math.PI);
					if (ф̄0 !== фX && ф̄1 !== фX && Math.abs(ф̄0 - ф̄1) >= Math.PI) {
						const {place0, place1} = this.getParallelCrossing(
							ф0, λ0, ф1, λ1, start.ф);
						if (isBetween(place0.λ, start.λ, end.λ))
							return {
								place0: place0, place1: place1,
								loopIndex: i,
								exiting: (end.λ > start.λ) === (ф̄1 > ф̄0)
							};
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
		ф0: number, λ0: number, ф1: number, λ1: number, λX = Math.PI
	): { place0: Place, place1: Place } {
		const pos0 = this.surface.xyz({ф: ф0, λ: λ0 - λX});
		const pos1 = this.surface.xyz({ф: ф1, λ: λ1 - λX});
		const posX = pos0.times(pos1.x).plus(pos1.times(-pos0.x)).over(
			pos1.x - pos0.x);
		const фX = this.surface.фλ(posX).ф;
		if (Math.abs(λX) === Math.PI && λ0 < λ1)
			return { place0: { ф: фX, λ: -Math.PI },
			         place1: { ф: фX, λ:  Math.PI } };
		else if (Math.abs(λX) === Math.PI)
			return { place0: { ф: фX, λ:  Math.PI },
			         place1: { ф: фX, λ: -Math.PI } };
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
		ф0: number, λ0: number, ф1: number, λ1: number, фX = Math.PI
	): { place0: Place, place1: Place } {
		const λX = ((ф1 - фX)*λ0 + (фX - ф0)*λ1)/(ф1 - ф0); // this solution is not as exact as the meridian one,
		if (фX === Math.PI && ф0 < ф1) // but it's good enuff.  the interseccion between a cone and a line is too hard.
			return { place0: { ф: -Math.PI, λ: λX }, // TODO: this won't work for the antiequator; need to weigh by sin(ф-фX)
			         place1: { ф:  Math.PI, λ: λX } };
		else if (фX === Math.PI)
			return { place0: { ф:  Math.PI, λ: λX },
			         place1: { ф: -Math.PI, λ: λX } };
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
		const edges: MapEdge[][] = [[
			{ start: {s: left, t: top}, end: null, type: 'L' },
			{ start: {s: left, t: bottom}, end: null, type: 'L' },
			{ start: {s: right, t: bottom}, end: null, type: 'L' },
			{ start: {s: right, t: top}, end: null, type: 'L' },
		]];
		for (let i = 0; i < edges[0].length; i ++) // enforce the contiguity of the edge loops
			edges[0][i].end = edges[0][(i+1)%edges[0].length].start;
		this.mapEdges = edges;
	}

	/**
	 * create an array of edges for a map with a fixed rectangular bound in lat/lon space,
	 * for use in the edge cutting algorithm.
	 */
	static buildEdges(фMin: number, фMax: number, λMin: number, λMax: number): MapEdge[][] {
		const edges: MapEdge[][] = [[
			{ start: {s: фMax, t: λMax}, end: null, type: LongLineType.VEI },
			{ start: {s: фMax, t: λMin}, end: null, type: LongLineType.GING },
			{ start: {s: фMin, t: λMin}, end: null, type: LongLineType.VEI },
			{ start: {s: фMin, t: λMax}, end: null, type: LongLineType.GING },
		]];
		for (let i = 0; i < edges[0].length; i ++) // enforce the contiguity of the edge loops
			edges[0][i].end = edges[0][(i+1)%edges[0].length].start;
		return edges;
	}

	/**
	 * what is the longest empty longitudinal interval, possibly including the one that
	 * contains ±180°?
	 * @param segments the list of segments that fill up some region in n dimensions
	 * distances between the ritemost endpoint and +π and the leftmost endpoint and -π
	 */
	static centralMeridian(segments: PathSegment[]): number {
		const emptyLongitudes = new ErodingSegmentTree(-Math.PI, Math.PI);
		for (let i = 1; i < segments.length; i ++) {
			if (segments[i].type !== 'M') {
				const x1 = segments[i - 1].args[1];
				const x2 = segments[i].args[1];
				if (Math.abs(x1 - x2) < Math.PI) {
					emptyLongitudes.remove(Math.min(x1, x2), Math.max(x1, x2));
				}
				else {
					emptyLongitudes.remove(Math.max(x1, x2), Math.PI);
					emptyLongitudes.remove(-Math.PI, Math.min(x1, x2));
				}
			}
		}
		return emptyLongitudes.getCenter(true).location + Math.PI;
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
		if (фMax === Math.PI/2 && фMin === -Math.PI/2) // choose a standard parallel
			фStd = 0;
		else if (фMax === Math.PI/2)
			фStd = фMax;
		else if (фMin === -Math.PI/2)
			фStd = фMin;
		else
			фStd = Math.atan((Math.tan(фMax) + Math.tan(фMin))/2);

		return {фStd: фStd, фMin: фMin, фMax: фMax, λMin: -λMax, λMax: λMax};
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
	start: Location;
	end: Location;
	type: string | LongLineType;
}
