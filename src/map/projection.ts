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


/**
 * the edge of a map projection
 */
export interface MapEdge {
	start: Place;
	end: Place;
	trace: (φ0: number, λ0: number, φ1: number, λ1: number) => PathSegment[];
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
	public left: number;
	public right: number;
	public top: number;
	public bottom: number;
	protected edges: MapEdge[][];

	protected constructor(surface: Surface, left: number, right:number, top: number, bottom: number) {
		this.surface = surface;
		this.left = left;
		this.right = right;
		this.top = top;
		this.bottom = bottom;
	}

	/**
	 * transform the given parametric coordinates to Cartesian ones.
	 */
	abstract project(φ: number, λ: number): {x: number, y: number};

	/**
	 * compute the coordinates of the midpoint between these two lines.
	 * @param φ0
	 * @param λ0
	 * @param φ1
	 * @param λ1
	 * @return Point
	 */
	getMidpoint(φ0: number, λ0: number, φ1: number, λ1: number): Place {
		const pos0 = this.surface.xyz(φ0, λ0);
		const pos1 = this.surface.xyz(φ1, λ1);
		const posM = pos0.plus(pos1).over(2);
		return this.surface.φλ(posM.x, posM.y, posM.z);
	}

	/**
	 * compute the coordinates at which the line between these two points crosses the y-z plane.  two Places will be
	 * returnd: one on the 0th point's side of the interrupcion, and one on the 1th point's side.
	 */
	getMeridianCrossing(φ0: number, λ0: number, φ1: number, λ1: number) {
		const pos0 = this.surface.xyz(φ0, λ0);
		const pos1 = this.surface.xyz(φ1, λ1);
		const posX = pos0.times(pos1.x).plus(pos1.times(-pos0.x)).over(
			pos1.x - pos0.x);
		const φX = this.surface.φλ(posX.x, posX.y, posX.z).φ;
		const λX = (λ0 > λ1) ? Math.PI : -Math.PI;
		return {
			endpoint0: {φ: φX, λ: λX},
			endpoint1: {φ: φX, λ: -λX},
		};
	}

	/**
	 * compute the coordinates at which the line between these two points crosses the equatorial plane.  two Places
	 * will be returnd: one on the 0th point's side of the interrupcion, and one on the 1th point's side.
	 */
	getEquatorCrossing(φ0: number, λ0: number, φ1: number, λ1: number) {
		const pos0 = this.surface.xyz(φ0, λ0);
		const pos1 = this.surface.xyz(φ1, λ1);
		const posX = pos0.times(pos1.z).plus(pos1.times(-pos0.z)).over(
			pos1.z - pos0.z);
		const φX = (φ0 > φ1) ? Math.PI : -Math.PI;
		const λX = this.surface.φλ(posX.x, posX.y, posX.z).λ;
		return {
			endpoint0: {φ: φX, λ: λX},
			endpoint1: {φ: -φX, λ: λX},
		};
	}

	/**
	 * compute the coordinates at which the line between these two points crosses an interrupcion in the map.  if
	 * there is a crossing, two Places will be returnd: one on the 0th point's side of the interrupcion, and one on
	 * the 1th point's side.
	 */
	getCrossing(φλ0: number[], φλ1: number[]): {endpoint0: Place, endpoint1: Place} {
		const [φ0, λ0] = φλ0;
		const [φ1, λ1] = φλ1;
		if (Math.abs(λ1 - λ0) > Math.PI)
			return this.getMeridianCrossing(φ0, λ0, φ1, λ1);
		else if (Math.abs(φ1 - φ0) > Math.PI)
			return this.getEquatorCrossing(φ0, λ0, φ1, λ1);
		return null;
	}

	/**
	 * bild the lists of map edges.  each list represents one continuous loop of chaind loxodromes.
	 */
	getEdges(): MapEdge[][] {
		if (this.edges === undefined) {
			this.edges = [[
				{
					start: {φ: this.surface.φMax, λ:  Math.PI}, end: null,
					trace: (_0, λ0, _1, λ1) => this.drawParallel(λ0, λ1, this.surface.φMax),
				},
				{
					start: {φ: this.surface.φMax, λ: -Math.PI}, end: null,
					trace: (φ0, _0, φ1, _1) => this.drawMeridian(φ0, φ1, -Math.PI),
				},
				{
					start: {φ: this.surface.φMin, λ: -Math.PI}, end: null,
					trace: (_0, λ0, _1, λ1) => this.drawParallel(λ0, λ1, this.surface.φMin),
				},
				{
					start: {φ: this.surface.φMin, λ:  Math.PI}, end: null,
					trace: (φ0, _0, φ1, _1) => this.drawMeridian(φ0, φ1, Math.PI),
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
	getPositionOnEdge(φ: number, λ: number): {loop: number, index: number} {
		for (let i = 0; i < this.getEdges().length; i ++) {
			for (let j = 0; j < this.getEdges()[i].length; j ++) {
				const edge = this.getEdges()[i][j];
				if (φ >= Math.min(edge.start.φ, edge.end.φ) && φ <= Math.max(edge.start.φ, edge.end.φ) &&
					λ >= Math.min(edge.start.λ, edge.end.λ) && λ <= Math.max(edge.start.λ, edge.end.λ)) {
					const startToPoint = new Vector(λ - edge.start.λ, φ - edge.start.φ, 0);
					const startToEnd = new Vector(edge.end.λ - edge.start.λ, edge.end.φ - edge.start.φ, 0);
					return {loop: i, index: j + startToPoint.dot(startToEnd)/startToEnd.sqr()};
				}
			}
		}
		return null;
	}

	/**
	 * generate some <path> segments to trace a line of constant latitude between two longitudes
	 */
	drawParallel(λ0: number, λ1: number, φ: number): PathSegment[] {
		const {x, y} = this.project(φ, λ1);
		return [{type: 'L', args: [x, y]}];
	}

	/**
	 * generate some <path> segments to trace a line of constant longitude between two latitudes
	 */
	drawMeridian(φ0: number, φ1: number, λ: number): PathSegment[] {
		const {x, y} = this.project(φ1, λ);
		return [{type: 'L', args: [x, y]}];
	}
}
