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
import {standardizeAngle, Vector} from "../util/util.js";
import {ErodingSegmentTree} from "../util/erodingsegmenttree.js";


/**
 * the direccion and shape of a line on the surface
 */
export enum Direction {
	GING, // along a meridian
	VEI, // along a parallel
}

/**
 * the edge of a map projection
 */
export interface MapEdge {
	start: Place;
	end: Place;
	direction: Direction;
}

/**
 * something that can be dropped into an SVG <path>.
 */
export interface PathSegment {
	type: string;
	args: number[];
}

/**
 * a class to manage the plotting of points from a Surface onto a plane.
 */
export abstract class MapProjection {
	public readonly surface: Surface;
	public readonly northUp: boolean;
	public readonly center: number;
	public edges: MapEdge[][];
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

		if (locus != null)
			this.center = MapProjection.centralMeridian(locus); // choose a center based on the locus
		else
			this.center = 0;

		if (edges === null) // the default set of edges is a rectangle around the map
			edges = MapProjection.buildEdges(surface.фMin, surface.фMax, -Math.PI, Math.PI);
		this.edges = edges;
	}

	/**
	 * transform the given parametric coordinates to Cartesian ones.
	 * @param ф the transformed latitude in radians
	 * @param λ the transformed longitude in the range [-π, π]
	 */
	abstract project(ф: number, λ: number): {x: number, y: number}

	/**
	 * generate some <path> segments to trace a line of constant latitude between two longitudes
	 * @param ф the relative latitude in radians
	 * @param λ0 the relative starting longitude in the range [-π, π]
	 * @param λ1 the relative ending longitude in the range [-π, π]
	 */
	drawParallel(λ0: number, λ1: number, ф: number): PathSegment[] {
		const {x, y} = this.project(ф, λ1);
		return [{type: 'L', args: [x, y]}];
	}

	/**
	 * generate some <path> segments to trace a line of constant longitude between two latitudes
	 * @param ф0 the relative starting latitude in radians
	 * @param ф1 the relative ending latitude in radians
	 * @param λ the relative longitude in the range [-π, π]
	 */
	drawMeridian(ф0: number, ф1: number, λ: number): PathSegment[] {
		const {x, y} = this.project(ф1, λ);
		return [{type: 'L', args: [x, y]}];
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
			let λo = standardizeAngle(λi - this.center); // shift to the central meridian and snap the longitude into the [-π, π] domain
			let фo = фi;
			if (!this.northUp) { // flip the map over if it should be south-up
				фo *= -1;
				λo *= -1;
			}
			output.push({ type: segment.type, args: [фo, λo] })
		}
		return output;
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
		ф0: number, λ0: number, ф1: number, λ1: number, λX: number = Math.PI
	): Place[] {
		const pos0 = this.surface.xyz(ф0, λ0 - λX);
		const pos1 = this.surface.xyz(ф1, λ1 - λX);
		const posX = pos0.times(pos1.x).plus(pos1.times(-pos0.x)).over(
			pos1.x - pos0.x);
		const фX = this.surface.фλ(posX.x, posX.y, posX.z).ф;
		if (λX === Math.PI && λ0 < λ1)
			return [ {ф: фX, λ: -Math.PI},
				     {ф: фX, λ:  Math.PI} ];
		else if (λX === Math.PI)
			return [ {ф: фX, λ:  Math.PI},
				     {ф: фX, λ: -Math.PI} ];
		else
			return [ {ф: фX, λ: λX},
				     {ф: фX, λ: λX} ];
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
		ф0: number, λ0: number, ф1: number, λ1: number, фX: number = Math.PI
	): Place[] {
		const λX = ((ф1 - фX)*λ0 + (фX - ф0)*λ1)/(ф1 - ф0); // this solution is not as exact as the meridian one,
		if (фX === Math.PI && ф0 < ф1) // but it's good enuff.  the interseccion between a cone and a line is too hard.
			return [ {ф: -Math.PI, λ: λX},
				     {ф:  Math.PI, λ: λX} ];
		else if (фX === Math.PI)
			return [ {ф:  Math.PI, λ: λX},
				     {ф: -Math.PI, λ: λX} ];
		else
			return [ {ф: фX, λ: λX},
				     {ф: фX, λ: λX} ];
	}

	/**
	 * compute the coordinates at which the line between these two points crosses an interrupcion in the map.  if
	 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
	 * the 1th point's side.
	 * @param фλ0 the transformed coordinates of the zeroth point
	 * @param фλ1 the transformed coordinates of the oneth point
	 */
	getCrossing(фλ0: number[], фλ1: number[]): Place[] {
		const [ф0, λ0] = фλ0;
		const [ф1, λ1] = фλ1;
		if (Math.abs(λ1 - λ0) > Math.PI)
			return this.getMeridianCrossing(ф0, λ0, ф1, λ1);
		else if (Math.abs(ф1 - ф0) > Math.PI)
			return this.getParallelCrossing(ф0, λ0, ф1, λ1);
		return null;
	}

	/**
	 * return a number indicating where on the edge of map this point lies
	 * @param ф the transformed latitude in radians
	 * @param λ the transformed longitude on the [-π, π] interval
	 * @return the index of the edge that contains this point plus the fraccional distance from that edges start to its
	 * end of that point, or null if there is no such edge.  also, the index of the edge loop about which we're tauking
	 * or null if the point isn't on an edge
	 */
	getPositionOnEdge(ф: number, λ: number): {loop: number, index: number} {
		for (let i = 0; i < this.edges.length; i ++) {
			for (let j = 0; j < this.edges[i].length; j ++) {
				const edge = this.edges[i][j];
				if (ф >= Math.min(edge.start.ф, edge.end.ф) && ф <= Math.max(edge.start.ф, edge.end.ф) &&
					λ >= Math.min(edge.start.λ, edge.end.λ) && λ <= Math.max(edge.start.λ, edge.end.λ)) {
					const startToPoint = new Vector(λ - edge.start.λ, ф - edge.start.ф, 0);
					const startToEnd = new Vector(edge.end.λ - edge.start.λ, edge.end.ф - edge.start.ф, 0);
					return {loop: i, index: j + startToPoint.dot(startToEnd)/startToEnd.sqr()};
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
	protected setDimensions(left: number, right: number, top: number, bottom: number) {
		this.left = left;
		this.right = right;
		this.top = top;
		this.bottom = bottom;
	}

	/**
	 * what is the longest empty longitudinal interval, possibly including the one that
	 * contains ±180°?
	 * @param segments the list of segments that fill up some region in n dimensions
	 * distances between the ritemost endpoint and +π and the leftmost endpoint and -π
	 */
	static centralMeridian(segments: PathSegment[]): number {
		const emptyLongitudes: ErodingSegmentTree = new ErodingSegmentTree(-Math.PI, Math.PI);
		for (let i = 1; i < segments.length; i ++) {
			if (segments[i].type != 'M') {
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
		if (фMax == Math.PI/2 && фMin == -Math.PI/2) // choose a standard parallel
			фStd = 0;
		else if (фMax == Math.PI/2)
			фStd = фMax;
		else if (фMin == -Math.PI/2)
			фStd = фMin;
		else
			фStd = Math.atan((Math.tan(фMax) + Math.tan(фMin))/2);

		return {фStd: фStd, фMin: фMin, фMax: фMax, λMin: -λMax, λMax: λMax};
	}

	/**
	 * create an array of edges for a map with a fixed rectangular bound in lat/lon space,
	 * for use in the edge cutting algorithm.
	 */
	static buildEdges(фMin: number, фMax: number, λMin: number, λMax: number): MapEdge[][] {
		const edges: MapEdge[][] = [[
			{ start: { ф: фMax, λ: λMax }, end: null,
				direction: Direction.VEI },
			{ start: { ф: фMax, λ: λMin }, end: null,
				direction: Direction.GING },
			{ start: { ф: фMin, λ: λMin }, end: null,
				direction: Direction.VEI },
			{ start: { ф: фMin, λ: λMax }, end: null,
				direction: Direction.GING },
		]];
		for (let i = 0; i < edges[0].length; i ++) // enforce the contiguity of the edge loops
			edges[0][i].end = edges[0][(i+1)%edges[0].length].start;
		return edges;
	}
}
