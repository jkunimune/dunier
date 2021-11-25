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
import {Place, Surface} from "../planet/surface.js";
import {Vector} from "../util/util.js";
import {ErodingSegmentTree} from "../util/erodingsegmenttree.js";


/**
 * the edge of a map projection
 */
export interface MapEdge {
	start: Place;
	end: Place;
	trace: (ф0: number, λ0: number, ф1: number, λ1: number) => PathSegment[];
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
	public left: number;
	public right: number;
	public top: number;
	public bottom: number;
	protected edges: MapEdge[][];

	protected constructor(surface: Surface,
						  northUp: boolean, locus: PathSegment[],
						  left: number, right:number,
						  top: number, bottom: number) {
		this.surface = surface;
		this.left = left;
		this.right = right;
		this.top = top;
		this.bottom = bottom;

		this.northUp = northUp;
		if (locus != null)
			this.center = MapProjection.largest_gap(locus) + Math.PI;
		else
			this.center = 0;
	}

	/**
	 * transform the given parametric coordinates to Cartesian ones.
	 */
	abstract project(ф: number, λ: number): {x: number, y: number}

	/**
	 * make any preliminary transformations that don't depend on the type of map
	 * projection.  this method accounts for south-up maps and central meridians, and
	 * should almost always be calld before project or getCrossing.
	 * @param segments the jeograffickal imputs
	 */
	transform(segments: PathSegment[]): PathSegment[] {
		const output: PathSegment[] = [];
		for (const segment of segments) {
			const [фi, λi] = segment.args;
			let λo = λi - this.center; // shift to the central meridian
			let фo = фi;
			if (!this.northUp) { // flip the map over if it should be south-up
				фo *= -1;
				λo *= -1;
			}
			λo = λo - Math.floor((λo + Math.PI)/(2*Math.PI))*2*Math.PI; // snap the longitude into the [-π, π] domain
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
	 * compute the coordinates at which the line between these two points crosses the y-z plane.  two Places will be
	 * returnd: one on the 0th point's side of the interrupcion, and one on the 1th point's side.
	 */
	getMeridianCrossing(ф0: number, λ0: number, ф1: number, λ1: number) {
		const pos0 = this.surface.xyz(ф0, λ0);
		const pos1 = this.surface.xyz(ф1, λ1);
		const posX = pos0.times(pos1.x).plus(pos1.times(-pos0.x)).over(
			pos1.x - pos0.x);
		const фX = this.surface.фλ(posX.x, posX.y, posX.z).ф;
		const λX = (λ0 > λ1) ? Math.PI : -Math.PI;
		return {
			endpoint0: {ф: фX, λ: λX},
			endpoint1: {ф: фX, λ: -λX},
		};
	}

	/**
	 * compute the coordinates at which the line between these two points crosses the equatorial plane.  two Places
	 * will be returnd: one on the 0th point's side of the interrupcion, and one on the 1th point's side.
	 */
	getEquatorCrossing(ф0: number, λ0: number, ф1: number, λ1: number) {
		const pos0 = this.surface.xyz(ф0, λ0);
		const pos1 = this.surface.xyz(ф1, λ1);
		const posX = pos0.times(pos1.z).plus(pos1.times(-pos0.z)).over(
			pos1.z - pos0.z);
		const фX = (ф0 > ф1) ? Math.PI : -Math.PI;
		const λX = this.surface.фλ(posX.x, posX.y, posX.z).λ;
		return {
			endpoint0: {ф: фX, λ: λX},
			endpoint1: {ф: -фX, λ: λX},
		};
	}

	/**
	 * compute the coordinates at which the line between these two points crosses an interrupcion in the map.  if
	 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
	 * the 1th point's side.
	 */
	getCrossing(фλ0: number[], фλ1: number[]): {endpoint0: Place, endpoint1: Place} {
		const [ф0, λ0] = фλ0;
		const [ф1, λ1] = фλ1;
		if (Math.abs(λ1 - λ0) > Math.PI)
			return this.getMeridianCrossing(ф0, λ0, ф1, λ1);
		else if (Math.abs(ф1 - ф0) > Math.PI)
			return this.getEquatorCrossing(ф0, λ0, ф1, λ1);
		return null;
	}

	/**
	 * bild the lists of map edges.  each list represents one continuous loop of chaind loxodromes.
	 */
	getEdges(): MapEdge[][] {
		if (this.edges === undefined) {
			this.edges = [[
				{
					start: {ф: this.surface.фMax, λ:  Math.PI}, end: null,
					trace: (_0, λ0, _1, λ1) => this.drawParallel(λ0, λ1, this.surface.фMax),
				},
				{
					start: {ф: this.surface.фMax, λ: -Math.PI}, end: null,
					trace: (ф0, _0, ф1, _1) => this.drawMeridian(ф0, ф1, -Math.PI),
				},
				{
					start: {ф: this.surface.фMin, λ: -Math.PI}, end: null,
					trace: (_0, λ0, _1, λ1) => this.drawParallel(λ0, λ1, this.surface.фMin),
				},
				{
					start: {ф: this.surface.фMin, λ:  Math.PI}, end: null,
					trace: (ф0, _0, ф1, _1) => this.drawMeridian(ф0, ф1, Math.PI),
				},
			]];
			for (let i = 0; i < this.edges[0].length; i ++)
				this.edges[0][i].end = this.edges[0][(i+1)%this.edges[0].length].start;
		}
		return this.edges;
	}

	/**
	 * return a number indicating where on the edge of map this point lies
	 * @return the index of the edge that contains this point plus the fraccional distance from that edges start to its
	 * end of that point, or null if there is no such edge.  also, the index of the edge loop about which we're tauking
	 * or null if the point isn't on an edge
	 */
	getPositionOnEdge(ф: number, λ: number): {loop: number, index: number} {
		for (let i = 0; i < this.getEdges().length; i ++) {
			for (let j = 0; j < this.getEdges()[i].length; j ++) {
				const edge = this.getEdges()[i][j];
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

	/**
	 * generate some <path> segments to trace a line of constant latitude between two longitudes
	 */
	drawParallel(λ0: number, λ1: number, ф: number): PathSegment[] {
		const {x, y} = this.project(ф, λ1);
		return [{type: 'L', args: [x, y]}];
	}

	/**
	 * generate some <path> segments to trace a line of constant longitude between two latitudes
	 */
	drawMeridian(ф0: number, ф1: number, λ: number): PathSegment[] {
		const {x, y} = this.project(ф1, λ);
		return [{type: 'L', args: [x, y]}];
	}

	/**
	 * what is the longest empty longitudinal interval, possibly including the one that
	 * contains ±180°?
	 * @param segments the list of segments that fill up some region in n dimensions
	 * distances between the ritemost endpoint and +π and the leftmost endpoint and -π
	 */
	static largest_gap(segments: PathSegment[]): number {
		const coverage: ErodingSegmentTree = new ErodingSegmentTree(-Math.PI, Math.PI);
		for (let i = 1; i < segments.length; i ++) {
			if (segments[i].type != 'M') {
				const x1 = segments[i - 1].args[1];
				const x2 = segments[i].args[1];
				if (Math.abs(x1 - x2) < Math.PI) {
					coverage.fill(Math.min(x1, x2), Math.max(x1, x2));
				}
				else {
					coverage.fill(Math.max(x1, x2), Math.PI);
					coverage.fill(-Math.PI, Math.min(x1, x2));
				}
			}
		}
		return coverage.getPole(true).location;
	}
}
