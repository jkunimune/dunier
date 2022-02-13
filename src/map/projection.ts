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
import { Place, Surface} from "../planet/surface.js";
import {intersection, last_two, localizeInRange} from "../util/util.js";
import {ErodingSegmentTree} from "../util/erodingsegmenttree.js";


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
	abstract projectPoint(ф: number, λ: number): {x: number, y: number}

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
	 * @param smooth an optional feature that will smooth the Path out into Bezier curves
	 * @param closePath if this is set to true, the map will make adjustments to account for its complete nature
	 * @returns SVG.Path object
	 */
	project(segments: PathSegment[], smooth: boolean, closePath: boolean): PathSegment[] {
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
				const [x0, y0] = last_two(cutPoints[cutPoints.length - 1].args); // check the map distance
				const [x1, y1] = last_two(pendingPoints[pendingPoints.length - 1].args); // between the end of cutPoints and the start of pendingPoints
				if (Math.hypot(x1 - x0, y1 - y0) < precision) { // if it's short enuff
					cutPoints.push(pendingPoints.pop()); // unpend it
					i ++;
				}
				else { // if it's too long
					const [ф0, λ0] = jinPoints[i-1].args;
					const [ф1, λ1] = jinPoints[i].args;
					const {ф, λ} = this.getMidpoint(ф0, λ0, ф1, λ1); // that means we need to plot a midpoint
					jinPoints.splice(i, 0, {type: 'L', args: [ф, λ]});
					repeatCount ++;
					break; // break out of this so we can go project it
				}
			}

			if (repeatCount > 10000)
				throw `why can't I find a point between ${jinPoints[i - 1].args}->${cutPoints[cutPoints.length - 1].args} and ${jinPoints[i].args}->${pendingPoints[pendingPoints.length - 1].args}`;
		}
		for (const segment of cutPoints)
			for (const arg of segment.args)
				console.assert(!Number.isNaN(arg), cutPoints);

		segments = cutPoints;
		// segments = this.cutToSize(cutPoints, this.mapEdges, closePath);

		if (smooth) { // smooth it, if desired
			for (let i = segments.length - 2; i >= 0; i --) {
				const newEnd = [ // look ahead to the midpoint between this and the next
					(segments[i].args[0] + segments[i+1].args[0])/2,
					(segments[i].args[1] + segments[i+1].args[1])/2];
				if (segments[i].type === 'L' && segments[i+1].type !== 'M') // look for points that are sharp angles
					segments[i] = {type: 'Q', args: [...segments[i].args, ...newEnd]}; // and extend those lines into curves
				else if (segments[i].type === 'M' && segments[i+1].type === 'Q') { // look for curves that start with Bezier curves
					segments.splice(i + 1, 0, {type: 'L', args: newEnd}); // assume we put it there and restore some linearity
				}
			}
		}

		return segments;
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

		const touchedLoop: boolean[] = []; // keep track of which loops it touches
		for (let i = 0; i < edges.length; i ++)
			touchedLoop.push(false);

		for (let i = 0; i < segments.length; i ++) { // first, handle places where it crosses the edge of the map
			if (segments[i].type === 'L') {
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
					const { point0, point1, loopIndex } = crossing;
					segments.splice(i, 0,
						{type: 'L', args: point0}, // insert a line to the very edge
						{type: 'M', args: point1}); // and then a moveto to the other side
					if (loopIndex >= 0 && MapProjection.getPositionOnEdge(point0,  edges))
						touchedLoop[loopIndex] = true; // take note if it crossd an on-screen edge
					i --; // then step back to check if there was another one
				}
			}
			else if (segments[i].type === 'A') {
				throw "AAAAAAAAAAAHHHHHHH";
			}
		}

		const jinSections: PathSegment[][] = []; // then, break this up into sections
		let start = 0;
		for (let i = 1; i <= segments.length; i ++) { // sweep through the result
			if (i === segments.length || segments[i].type === 'M') { // and split it up at movetos and endings
				if (MapProjection.envelops(edges, segments.slice(start, i)))
					jinSections.push(segments.slice(start, i)); // but only keep the ones that are in bounds
				start = i;
			}
		}
		if (jinSections.length === 0) // if it's all off the map
			return []; // goodbye

		const startPositions: { loop: number, index: number }[] = [];
		const weHaveDrawn: boolean[] = []; // set up some section-indexed vectors
		for (const jinSection of jinSections) {
			startPositions.push(MapProjection.getPositionOnEdge(
				jinSection[0].args, edges));
			weHaveDrawn.push(false);
		}

		const output: PathSegment[] = []; // now start re-stitching it all together
		let sectionIndex = 0;
		let startingANewSupersection = true;
		while (sectionIndex !== undefined) {
			let jinSection = jinSections[sectionIndex]; // take a section
			if (!startingANewSupersection)
				jinSection = jinSection.slice(1); // take off its moveto
			output.push(...jinSection); // add its points to the thing
			weHaveDrawn[sectionIndex] = true; // mark it as drawn
			const sectionEnd = jinSection[jinSection.length-1].args; // then look at where on Earth we are

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
					const nextStart = jinSections[bestSection][0].args;
					for (let i = endEdge; i <= restartEdge; i ++) { // go around the edges to the new restarting point
						const edge = endLoop[i%endLoop.length];
						const targetPlace = (i === restartEdge) ? nextStart : edge.end; // TODO: I used to hav something here about the current place not equalling the target place... does that ever come up?  should I have a check before the for loop?  does it even matter?
						output.push({type: edge.type, args: targetPlace});
					}
					if (weHaveDrawn[bestSection]) // if you rapd around to a place we've already been
						sectionIndex = null; // move on to a random section
					else // if you found a new place to restart
						sectionIndex = bestSection; // go to it
				}
				else { // if we ended in the middle someplace
					sectionIndex = null;
					for (let i = 0; i < jinSections.length; i ++) { // look for the one that picks up from here
						const start = jinSections[i][0].args;
						if (start[0] === sectionEnd[0] && start[1] === sectionEnd[1]) {
							sectionIndex = i; // and go there
							break;
						}
					}
					console.assert(sectionIndex !== null, "I was left hanging.");
					if (weHaveDrawn[sectionIndex]) // if that one has already been drawn
						sectionIndex = null; // move on randomly
				}
			}
			if (sectionIndex === null) { // if we were planning to move onto whatever else for the next section
				sectionIndex = 0;
				while (sectionIndex < jinSections.length && weHaveDrawn[sectionIndex])
					sectionIndex ++; // sweep thru it until we find one that has not been drawn
				if (sectionIndex === jinSections.length) // if you can't find any
					break; // we're done!
				startingANewSupersection = true;
			}
			else { // if we're continuing an existing supersection
				startingANewSupersection = false; // say so
			}
		}

		if (closePath) { // if it matters which side is inside and which side out, draw the outline of the map
			for (let i = 0; i < edges.length; i ++) { // for each loop
				if (!touchedLoop[i]) { // which was not already tuchd
					const edge = edges[i][0]; // pick one edge
					console.assert(edge.start[0] === edge.end[0], "conceptually there's noting rong with what you've done, but I've only accounted for vertical edges here");
					const periodic = edges[i].length === 1; // check for periodicity in the form of an open edge
					const period = (periodic) ? Math.abs(edge.end[1] - edge.start[1]) : 0; // and measure the period
					const xEdge = edge.start[0];
					let yTest = null;
					let dMin = Number.POSITIVE_INFINITY;
					let antiparallel = null;
					for (let i = 1; i < output.length; i ++) { // look through the path
						const [x0, y0] = last_two(output[i - 1].args);
						const [x1, y1] = last_two(output[i].args);
						if (output[i].type !== 'M' && y0 !== y1) { // examine the connecting segments
							const wraps = periodic && Math.abs(y1 - y0) > period/2.; // if the domain is periodic and this line is long enuff, ita ctually raps around
							if (yTest === null) {
								yTest = (y0 + y1)/2; // choose a y value
								if (wraps) yTest = localizeInRange(yTest, edge.start[1], edge.end[1]); // adjust for rapping, if necessary
							}
							let crossesTestLine = y0 < yTest !== y1 < yTest; // look for segments that cross that y value
							if (wraps) // account for rapping
								crossesTestLine = !crossesTestLine;
							if (crossesTestLine) {
								let dy = y1 - y0, dy0 = yTest - y0, dy1 = y1 - yTest;
								if (wraps) {
									dy = localizeInRange(dy, -period/2., period/2.);
									dy0 = localizeInRange(dy0, -period/2., period/2.);
									dy1 = localizeInRange(dy1, -period/2., period/2.);
								}
								const x = x0*dy1/dy + x1*dy0/dy; // find the x value where they cross
								if (Math.abs(x - xEdge) < dMin) { // the one nearest the edge will tell us
									dMin = Math.abs(x - xEdge);
									antiparallel = (y0 < y1) !== (edge.start[1] < edge.end[1]); // if this path is widdershins relative to the edge
									if (wraps) antiparallel = !antiparallel; // account for rapping
								}
							}
						}
					}
					if (antiparallel) { // if it is
						output.push({type: 'M', args: edges[i][0].start}); // draw the outline of the entire map to contain it
						for (const edge of edges[i])
							output.push({type: edge.type, args: edge.end});
					}
				}
			}
		}

		return output;
	}


	/**
	 * find out if a point is contained by a set of edges, using an even/odd rule.
	 * @param edges
	 * @param points
	 * @return whether all of points are inside edges
	 */
	static envelops(edges: MapEdge[][], points: PathSegment[]): boolean {
		const polygon: PathSegment[] = [];
		for (const loop of edges) {
			polygon.push({type: 'M', args: loop[0].start});
			for (const edge of loop) {
				polygon.push({type: 'L', args: edge.end});
			}
		}
		for (const point of points)
			if (MapProjection.getPositionOnEdge(point.args, edges) === null) // ignore points that are _on_ an edge
				if (!MapProjection.contains(polygon, point.args))
					return false;
		return true;
	}


	/**
	 * find out if a point is contained by a polygon, using an even/odd rule.
	 * @param polygon
	 * @param point
	 * @return whether point is inside polygon
	 */
	static contains(polygon: PathSegment[], point: number[]): boolean {
		let contained = false;
		for (let i = 0; i < polygon.length; i ++)
			console.assert(polygon[i].type === 'M' || polygon[i].type === 'L', "I can't do that segment type.");
		const [x, y] = point;
		for (let i = 1; i < polygon.length; i ++) {
			if (polygon[i].type === 'L') {
				const [x0, y0] = polygon[i-1].args;
				const [x1, y1] = polygon[i].args;
				if ((y0 < y) !== (y1 < y))
					if (x0 + (y - y0)/(y1 - y0)*(x1 - x0) > x)
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
	 * @return Point
	 */
	getMidpoint(ф0: number, λ0: number, ф1: number, λ1: number): Place {
		const pos0 = this.surface.xyz(ф0, λ0);
		const pos1 = this.surface.xyz(ф1, λ1);
		const posM = pos0.plus(pos1).over(2);
		return this.surface.фλ(posM.x, posM.y, posM.z);
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
	): { point0: number[], point1: number[] } {
		const pos0 = this.surface.xyz(ф0, λ0 - λX);
		const pos1 = this.surface.xyz(ф1, λ1 - λX);
		const posX = pos0.times(pos1.x).plus(pos1.times(-pos0.x)).over(
			pos1.x - pos0.x);
		const фX = this.surface.фλ(posX.x, posX.y, posX.z).ф;
		if (λX === Math.PI && λ0 < λ1)
			return { point0: [ фX, -Math.PI ],
				     point1: [ фX,  Math.PI ] };
		else if (λX === Math.PI)
			return { point0: [ фX,  Math.PI ],
				     point1: [ фX, -Math.PI ] };
		else
			return { point0: [ фX, λX ],
				     point1: [ фX, λX ] };
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
	): { point0: number[], point1: number[] } {
		const λX = ((ф1 - фX)*λ0 + (фX - ф0)*λ1)/(ф1 - ф0); // this solution is not as exact as the meridian one,
		if (фX === Math.PI && ф0 < ф1) // but it's good enuff.  the interseccion between a cone and a line is too hard.
			return { point0: [ -Math.PI, λX ],
				     point1: [  Math.PI, λX ] };
		else if (фX === Math.PI)
			return { point0: [  Math.PI, λX ],
				     point1: [ -Math.PI, λX ] };
		else
			return { point0: [ фX, λX ],
				     point1: [ фX, λX ] };
	}

	/**
	 * compute the coordinates at which the line between these two points crosses an interrupcion in the map.  if
	 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
	 * the 1th point's side.  also, the index of the loop on which this crossing lies.
	 */
	getEdgeCrossing(фλ0: number[], фλ1: number[], edges: MapEdge[][]
	): {point0: number[], point1: number[], loopIndex: number} {
		const [ф0, λ0] = фλ0; // extract the input coordinates
		const [ф1, λ1] = фλ1;
		const фS = Math.min(ф0, ф1), фN = Math.max(ф0, ф1); // sort these by location
		const λW = Math.min(λ0, λ1), λE = Math.max(λ0, λ1);

		let anyMeridians = false, anyParallels = false;
		for (const loop of edges) {
			for (const edge of loop) {
				if (edge.type === LongLineType.GING)
					anyMeridians = true;
				else if (edge.type === LongLineType.VEI)
					anyParallels = true;
			}
		}
		if (anyMeridians && Math.abs(λ1 - λ0) > Math.PI) { // now check to see if the point crosses the _prime_ meridian
			const { point0, point1 } = this.getMeridianCrossing(ф0, λ0, ф1, λ1);
			return { point0: point0, point1: point1, loopIndex: -1 }; // use -1 to indicate that it was not on a loop
		}
		if (anyParallels && Math.abs(ф1 - ф0) > Math.PI) { // and if the point crosses the antiequator
			const { point0, point1 } = this.getParallelCrossing(ф0, λ0, ф1, λ1);
			return { point0: point0, point1: point1, loopIndex: -1 }; // use -1 to indicate that it was not on a loop
		}

		for (let i = 0; i < edges.length; i ++) { // then look at each edge loop
			for (const edge of edges[i]) { // and at each edge
				if (edge.type === LongLineType.GING) { // if it is a meridian
					if (λW < edge.start[1] && λE > edge.start[1]) { // check to see if it crosses this edge
						const { point0, point1 } = this.getMeridianCrossing(
							ф0, λ0, ф1, λ1, edge.start[1]);
						return { point0: point0, point1: point1, loopIndex: i };
					}
				}
				else if (edge.type === LongLineType.VEI) { // do the same thing for parallels
					if (фS < edge.start[0] && фN > edge.start[0]) {
						const { point0, point1 } = this.getParallelCrossing(
							ф0, λ0, ф1, λ1, edge.start[0]);
						return { point0: point0, point1: point1, loopIndex: i };
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
	 * compute the coordinates at which the line between these two points crosses the bordor of the map.  if
	 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
	 * the 1th point's side.
	 */
	getLineCrossing(xy0: number[], xy1: number[]): number[][] {
		for (const loop of this.geoEdges) {
			for (const edge of loop) {
				const crossing = intersection(
					{x: xy0[0], y: xy0[1]}, {x: xy1[0], y: xy1[1]},
					{x: edge.start[0], y: edge.start[1]}, {x: edge.end[0], y: edge.end[1]}
				);
				if (crossing !== null)
					return [
						[crossing.x, crossing.y],
						[crossing.x, crossing.y]];
			}
		}
		return null;
	}

	/**
	 * return a number indicating where on the edge of map this point lies
	 * @param coords the coordinates of the point
	 * @param edges the loops of edges on which we are trying to place it
	 * @return the index of the edge that contains this point plus the fraccional distance from that edges start to its
	 * end of that point, or null if there is no such edge.  also, the index of the edge loop about which we're tauking
	 * or null if the point isn't on an edge
	 */
	static getPositionOnEdge(coords: number[], edges: MapEdge[][]): {loop: number, index: number} {
		for (let i = 0; i < edges.length; i ++) {
			for (let j = 0; j < edges[i].length; j ++) { // start by choosing an edge
				const edge = edges[i][j];
				let onThisEdge = true;
				for (let k = 0; k < coords.length; k ++) {
					if (coords[k] < Math.min(edge.start[k], edge.end[k]))
						onThisEdge = false;
					if (coords[k] > Math.max(edge.start[k], edge.end[k]))
						onThisEdge = false;
				}
				if (onThisEdge) {
					const startToPointVector = [];
					const startToEndVector = [];
					let startToEndSqr = 0;
					let dotProduct = 0;
					for (let k = 0; k < coords.length; k ++) {
						startToPointVector.push(coords[k] - edge.start[k]);
						startToEndVector.push(edge.end[k] - edge.start[k]);
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
		if (left !== null && (left >= right || top >= bottom))
			throw `the axis bounds ${left}, ${right}, ${top}, ${bottom} are invalid.`;
		this.left = left;
		this.right = right;
		this.top = top;
		this.bottom = bottom;
		const edges: MapEdge[][] = [[
			{ start: [right, top], end: null, type: 'L' },
			{ start: [left, top], end: null, type: 'L' },
			{ start: [left, bottom], end: null, type: 'L' },
			{ start: [right, bottom], end: null, type: 'L' },
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
			{ start: [фMax, λMax], end: null, type: LongLineType.VEI },
			{ start: [фMax, λMin], end: null, type: LongLineType.GING },
			{ start: [фMin, λMin], end: null, type: LongLineType.VEI },
			{ start: [фMin, λMax], end: null, type: LongLineType.GING },
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
}

/**
 * the direccion and shape of a long "strait" line
 */
export enum LongLineType {
	ORTO, // in a strait line
	GING, // along a meridian
	VEI, // along a parallel
}

/**
 * an edge on a map projection
 */
interface MapEdge {
	start: number[];
	end: number[];
	type: string | LongLineType;
}

/**
 * something that can be dropped into an SVG <path>.
 * in addition to the basic SVG 'M', 'L', 'Z', 'A', etc., this also supports types of
 * long line, which are only defined on the surface, not on the map
 */
export interface PathSegment {
	type: string | LongLineType;
	args: number[];
}

