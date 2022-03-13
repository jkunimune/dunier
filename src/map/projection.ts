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
	chordCenter, isAcute,
	isBetween,
	lineArcIntersections,
	lineLineIntersection,
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
	 * @param ф the transformed latitude in radians
	 * @param λ the transformed longitude in the range [-π, π]
	 */
	abstract projectPoint(ф: number, λ: number): Point

	/**
	 * generate some <path> segments to trace a line of constant latitude between two longitudes
	 * @param ф the relative latitude in radians
	 * @param λ0 the relative starting longitude in the range [-π, π]
	 * @param λ1 the relative ending longitude in the range [-π, π]
	 */
	projectParallel(λ0: number, λ1: number, ф: number): PathSegment[] {
		const {x, y} = this.projectPoint(ф, λ1);
		return [{type: 'L', args: [x, y]}];
	}

	/**
	 * generate some <path> segments to trace a line of constant longitude between two latitudes
	 * @param ф0 the relative starting latitude in radians
	 * @param ф1 the relative ending latitude in radians
	 * @param λ the relative longitude in the range [-π, π]
	 */
	projectMeridian(ф0: number, ф1: number, λ: number): PathSegment[] {
		const {x, y} = this.projectPoint(ф1, λ);
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

		segments = this.transform(segments);

		const jinPoints = this.cutToSize(segments, this.geoEdges, closePath);

		const precision = MAP_PRECISION*this.getDimensions().diagonal;
		let repeatCount = 0; // now do the math
		const cutPoints: PathSegment[] = []; // start a list of the projected points that are done
		const pendingPoints: PathSegment[] = []; // and a list of projected points that mite come later (in reverse order)
		let i = 0; // and the index in jinPoints that corresponds to the end of cutPoints
		while (i < jinPoints.length) {
			if (jinPoints[i].type === LongLineType.GING) { // do the projection
				const [ф0, _] = jinPoints[i-1].args;
				const [ф1, λ] = jinPoints[i].args;
				cutPoints.push(...this.projectMeridian(ф0, ф1, λ));
				i ++;
			}
			else if (jinPoints[i].type === LongLineType.VEI) {
				const [_, λ0] = jinPoints[i-1].args;
				const [ф, λ1] = jinPoints[i].args;
				cutPoints.push(...this.projectParallel(λ0, λ1, ф));
				i ++;
			}
			else if (jinPoints[i].type === 'M') {
				const [ф, λ] = jinPoints[i].args;
				const {x, y} = this.projectPoint(ф, λ);
				cutPoints.push({type: 'M', args: [x, y]});
				i ++;
			}
			else if (jinPoints[i].type === 'L') {
				const [ф, λ] = jinPoints[i].args;
				let {x, y} = this.projectPoint(ф, λ);
				pendingPoints.push({type: 'L', args: [x, y]}); // put a pin in it; we mite haff to split it in haff
			}
			else {
				throw `I don't think you can use ${jinPoints[i].type} here`;
			}

			while (pendingPoints.length > 0) { // now, if there are points in the pending cue
				const a = assert_xy(endpoint(cutPoints[cutPoints.length - 1].args)); // check the map distance
				const b = assert_xy(endpoint(pendingPoints[pendingPoints.length - 1].args)); // between the end of cutPoints and the start of pendingPoints
				if (Math.hypot(b.x - a.x, b.y - a.y) < precision) { // if it's short enuff
					cutPoints.push(pendingPoints.pop()); // unpend it
					i ++;
				}
				else { // if it's too long
					const [ф0, λ0] = jinPoints[i-1].args;
					const [ф1, λ1] = jinPoints[i].args;
					const {ф, λ} = this.getMidpoint(ф0, λ0, ф1, λ1); // that means we need to plot a midpoint
					jinPoints.splice(i, 0, {type: 'L', args: [ф, λ]});
					break; // break out of this so we can go project it
				}
			}

			repeatCount ++;
			if (repeatCount > 10000)
				throw `why can't I find a point between ${jinPoints[i - 1].args}->${cutPoints[cutPoints.length - 1].args} and ${jinPoints[i].args}->${pendingPoints[pendingPoints.length - 1].args}`;
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
			throw `you can't pass open paths and expect me to close them for you.  go make sure your projections are 1:1!`;

		const touchedLoop: boolean[] = []; // keep track of which loops it touches
		for (let i = 0; i < edges.length; i ++)
			touchedLoop.push(false);

		let iterations = 0;
		for (let i = 1; i < segments.length; i ++) { // first, handle places where it crosses the edge of the map
			if (segments[i].type === 'L' || segments[i].type === 'A') {
				// if (!Number.isFinite(segments[i].args[0])) { // if a point is at infinity
				// 	if (segments[i].args[0] < 0)
				// 		segments.splice(i, 1, // remove it
				// 			{type: 'L', args: [minimum, segments[i-1].args[1]]},
				// 			{type: 'M', args: [minimum, segments[i+1].args[1]]}); // and add a moveto along the South edge
				// 	else
				// 		throw "I haven't accounted for positive infinity points.";
				// 	touchedEdge = true;
				// } TODO shouldn't this case be handled by the edge skirting I've already implemented?

				const crossing = this.getEdgeCrossing(
					segments[i-1].args, segments[i].args, edges);

				if (crossing !== null) { // otherwise, if it jumps across an interruption
					console.assert(Math.abs(crossing.intersect0.t) === Math.PI || MapProjection.getPositionOnEdge(crossing.intersect0, edges) !== null, crossing, segments[i].args, edges);
					const { intersect0, intersect1, loopIndex } = crossing;
					if (segments[i].type === 'L') {
						segments.splice(i, 0,
							{type: 'L', args: [intersect0.s, intersect0.t]}, // insert a line to the very edge
							{type: 'M', args: [intersect1.s, intersect1.t]}); // and then a moveto to the other side
					}
					else if (segments[i].type === 'A') {
						const a = assert_xy(endpoint(segments[i-1].args));
						const b = assert_xy(intersect0);
						const c = assert_xy(intersect1);
						const [r1, r2, rot, _, sweepDirection, dx, dy] = segments[i].args; // for the arc splicing,
						const d = { x: dx, y: dy };
						const endpoints = [a, d];
						let largeArc: number[] = []; // you haff to figure out whether to change the large arc flag for the children
						for (let i = 0; i < 2; i ++) {
							const acute = isAcute(
								b, endpoints[1 - i], endpoints[i]); // luckily, this angle tells you whether the arc is big
							largeArc.push(acute ? 0 : 1);
							console.assert(largeArc[i] <= _);
						}
						segments.splice(i, 1,
							{type: 'A', args: [r1, r2, rot, largeArc[0], sweepDirection, b.x, b.y]}, // insert an arc to the very edge
							{type: 'M', args: [c.x, c.y]}, // and then a moveto to the other side
							{type: 'A', args: [r1, r2, rot, largeArc[1], sweepDirection, d.x, d.y]}); // and a shorter version of the original arc from there
					}
					if (loopIndex >= 0)
						touchedLoop[loopIndex] = true; // take note if it crossd an on-screen edge
					i --; // then step back to check if there was another one
				}
			}
			else {
				console.assert(segments[i].type === 'M', segments[i], edges);
			}
			iterations ++;
			if (iterations > 100000)
				throw `*Someone* (not pointing any fingers) messd up an interruption between ${segments[i-1].args} and ${segments[i].args}.`;
		}

		const sections: PathSegment[][] = []; // then, break this up into sections
		let start = 0;
		for (let i = 1; i <= segments.length; i ++) { // sweep through the result
			if (i === segments.length || segments[i].type === 'M') { // and split it up at movetos and endings
				const section = segments.slice(start, i);
				if (MapProjection.envelops(edges, section))
					sections.push(section); // but only keep the ones that are in bounds
				start = i;
			}
		}
		if (sections.length === 0) // if it's all off the map
			return []; // goodbye

		const startPositions: { loop: number, index: number }[] = [];
		const weHaveDrawn: boolean[] = []; // set up some section-indexed vectors
		for (const jinSection of sections) {
			startPositions.push(MapProjection.getPositionOnEdge(
				endpoint(jinSection[0].args), edges));
			weHaveDrawn.push(false);
		}

		const output: PathSegment[] = []; // now start re-stitching it all together
		let sectionIndex = 0;
		let startingANewSupersection = true;
		while (sectionIndex !== undefined) {
			let jinSection = sections[sectionIndex]; // take a section
			if (!startingANewSupersection)
				jinSection = jinSection.slice(1); // take off its moveto
			output.push(...jinSection); // add its points to the thing
			weHaveDrawn[sectionIndex] = true; // mark it as drawn
			const sectionEnd = endpoint(jinSection[jinSection.length-1].args); // then look at where on Earth we are

			if (!closePath) { // if we're not worrying about closing it off
				sectionIndex = null; // forget it and move onto a random section
			}
			else {
				const endPosition = MapProjection.getPositionOnEdge(
					sectionEnd, edges);
				if (endPosition !== null) { // if we ended hitting a wall
					const endLoop = edges[endPosition.loop];

					let bestSection = null, bestPositionIndex = null;
					for (let i = 0; i < startPositions.length; i ++) { // check the remaining sections
						const startPosition = startPositions[i];
						if (startPosition !== null && startPosition.loop === endPosition.loop) { // for any on the same edge loop as us
							if (startPosition.index < endPosition.index)
								startPosition.index += endLoop.length;
							if (bestPositionIndex === null || startPosition.index < bestPositionIndex) {
								bestSection = i; // calculate which one should come next
								bestPositionIndex = startPosition.index;
							}
							startPosition.index %= endLoop.length;
						}
					}
					const endEdge = Math.trunc(endPosition.index);
					const restartEdge = Math.trunc(bestPositionIndex);
					const nextStart = endpoint(sections[bestSection][0].args);
					for (let i = endEdge; i <= restartEdge; i ++) { // go around the edges to the new restarting point
						const edge = endLoop[i%endLoop.length];
						const targetPlace = (i === restartEdge) ? nextStart : edge.end; // TODO: I used to hav something here about the current place not equalling the target place... does that ever come up?  should I have a check before the for loop?  does it even matter?
						output.push({type: edge.type,
							         args: [targetPlace.s, targetPlace.t]});
					}
					if (weHaveDrawn[bestSection]) // if you rapd around to a place we've already been
						sectionIndex = null; // move on to a random section
					else // if you found a new place to restart
						sectionIndex = bestSection; // go to it
				}
				else { // if we ended in the middle someplace
					sectionIndex = null;
					for (let i = 0; i < sections.length; i ++) { // look for the one that picks up from here
						const start = endpoint(sections[i][0].args);
						if (start.s === sectionEnd.s && start.t === sectionEnd.t) {
							sectionIndex = i; // and go there
							break;
						}
					}
					console.assert(sectionIndex !== null, "I was left hanging.", edges, segments, sections, weHaveDrawn);
					if (weHaveDrawn[sectionIndex]) // if that one has already been drawn
						sectionIndex = null; // move on randomly
				}
			}
			if (sectionIndex === null) { // if we were planning to move onto whatever else for the next section
				sectionIndex = 0;
				while (sectionIndex < sections.length && weHaveDrawn[sectionIndex])
					sectionIndex ++; // sweep thru it until we find one that has not been drawn
				if (sectionIndex === sections.length) // if you can't find any
					break; // we're done!
				startingANewSupersection = true;
			}
			else { // if we're continuing an existing supersection
				startingANewSupersection = false; // say so
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
							const a = endpoint(output[i - 1].args);
							const b = endpoint(output[i].args);
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
			const a = endpoint(output[i - 1].args);
			const b = endpoint(output[i].args);
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
	 * @param segments
	 * @return whether all of points are inside edges
	 */
	static envelops(edges: MapEdge[][], segments: PathSegment[]): boolean {
		const polygon: PathSegment[] = [];
		for (const loop of edges) {
			polygon.push({type: 'M', args: [loop[0].start.s, loop[0].start.t]});
			for (const edge of loop)
				polygon.push({type: 'L', args: [edge.end.s, edge.end.t]});
		}
		for (const segment of segments) {
			const location = endpoint(segment.args);
			if (MapProjection.getPositionOnEdge(location, edges) === null) // ignore points that are _on_ an edge
				if (!MapProjection.contains(polygon, location))
					return false;
		}
		// TODO: this condition is insufficient for arcs.  I should just look at the midpoint of the first segment
		return true;
	}


	/**
	 * find out if a point is contained by a polygon, using an even/odd rule.
	 * @param polygon
	 * @param point
	 * @return whether point is inside polygon
	 */
	static contains(polygon: PathSegment[], point: Location): boolean {
		let contained = false;
		for (let i = 0; i < polygon.length; i ++)
			console.assert(polygon[i].type === 'M' || polygon[i].type === 'L', "I can't do that segment type.");
		const {s, t} = point;
		for (let i = 1; i < polygon.length; i ++) {
			if (polygon[i].type === 'L') {
				const [s0, t0] = polygon[i-1].args;
				const [s1, t1] = polygon[i].args;
				if ((t0 < t) !== (t1 < t))
					if (s0 + (t - t0)/(t1 - t0)*(s1 - s0) > s)
						contained = !contained;
			}
		}
		return contained;
	}


	/**
	 * compute the coordinates of the midpoint between these two lines.
	 * @param ф0
	 * @param λ0
	 * @param ф1
	 * @param λ1
	 * @return Location
	 */
	getMidpoint(ф0: number, λ0: number, ф1: number, λ1: number): Place {
		const pos0 = this.surface.xyz(ф0, λ0);
		const pos1 = this.surface.xyz(ф1, λ1);
		const posM = pos0.plus(pos1).over(2);
		return this.surface.фλ(posM.x, posM.y, posM.z);
	}

	/**
	 * compute the coordinates at which the line between these two points crosses an interrupcion.  if
	 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
	 * the 1th point's side.  also, the index of the loop on which this crossing lies.
	 */
	getEdgeCrossing( // TODO: it would be a bit more efficient if this returnd an orderd list of crossings for a whole string of segments
		coords0: number[], coords1: number[], edges: MapEdge[][]
	): { intersect0: Location, intersect1: Location, loopIndex: number } | null {
		if (edges[0][0].type === LongLineType.GING || edges[0][0].type === LongLineType.VEI) {
			const crossing = this.getGeoEdgeCrossing(coords0, coords1, edges);
			if (crossing === null)
				return null;
			const { place0, place1, loopIndex } = crossing;
			return { intersect0: { s: place0.ф, t: place0.λ },
			         intersect1: { s: place1.ф, t: place1.λ },
			         loopIndex: loopIndex };
		}
		else if (edges[0][0].type === 'L') {
			const crossing = this.getMapEdgeCrossing(coords0, coords1, edges);
			if (crossing === null)
				return null;
			const { point0, point1, loopIndex } = crossing;
			return { intersect0: { s: point0.x, t: point0.y },
			         intersect1: { s: point1.x, t: point1.y },
			         loopIndex: loopIndex };
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
	getMapEdgeCrossing(coords0: number[], coords1: number[], edges: MapEdge[][]
	): { point0: Point, point1: Point, loopIndex: number } | null {
		for (const edgeLoop of edges)
			for (const edge of edgeLoop)
				console.assert(edge.type === 'L', `You can't use ${edge.type} edges in this funccion.`);

		let a = assert_xy(endpoint(coords0)); // extract the input coordinates
		let b = assert_xy(endpoint(coords1));
		if (coords1.length === 2) { // if it's a line
			for (let i = 0; i < edges.length; i ++) { // then look at each edge loop
				for (const edge of edges[i]) { // and at each edge
					const start = assert_xy(edge.start);
					const end = assert_xy(edge.end);
					const intersect = lineLineIntersection(
						a, b, start, end);
					if (intersect !== null)
						return { point0: intersect, point1: intersect, loopIndex: i };
				}
			}
			return null;
		}
		else if (coords1.length === 7) { // if it's an arc
			const [r, rOther, rot, largeArc, sweepDirection, bx, by] = coords1;
			console.assert(r === rOther, "I haven't accounted for ellipses.");

			if (sweepDirection === 0) {
				const temporary = a;
				a = b;
				b = temporary;
			}
			const center = chordCenter(a, b, r, largeArc === 0);

			for (let i = 0; i < edges.length; i ++) { // then look at each edge loop
				for (const edge of edges[i]) { // and at each edge
					const start = assert_xy(edge.start);
					const end = assert_xy(edge.end);
					const points = lineArcIntersections(start, end, center, r, a, b);
					if (points.length > 0)
						return {
							point0: points[0],
							point1: points[0], loopIndex: i};
				}
			}
			return null;
		}
		else {
			throw `I don't think you're allowd to use segments with ${coords1.length} arguments here`;
		}
	}

	/**
	 * compute the coordinates at which the line between these two points crosses a bound on the surface.  if
	 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
	 * the 1th point's side.  also, the index of the loop on which this crossing lies.
	 */
	getGeoEdgeCrossing(
		coords0: number[], coords1: number[], edges: MapEdge[][]
	): { place0: Place, place1: Place, loopIndex: number } | null {
		console.assert(coords0.length === 2, `You can't use arcs in this funccion.`);
		console.assert(coords1.length === 2, `You can't use arcs in this funccion.`);

		const [ф0, λ0] = coords0; // extract the input coordinates
		const [ф1, λ1] = coords1;

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
							return { place0: place0, place1: place1, loopIndex: i };
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
							return { place0: place0, place1: place1, loopIndex: i };
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
		const pos0 = this.surface.xyz(ф0, λ0 - λX);
		const pos1 = this.surface.xyz(ф1, λ1 - λX);
		const posX = pos0.times(pos1.x).plus(pos1.times(-pos0.x)).over(
			pos1.x - pos0.x);
		const фX = this.surface.фλ(posX.x, posX.y, posX.z).ф;
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
		return null;
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
				start = endpoint(segments[i].args);
			if (i + 1 === segments.length || segments[i+1].type === 'M') {
				if (start === null)
					throw `path must begin with a moveto, not ${segments[0].type}`;
				const end = endpoint(segments[i].args);
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
