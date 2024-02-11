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
import {MapProjection} from "./projection.js";
import {linterp} from "../util/util.js";
import {PathSegment, Place, Point} from "../util/coordinates.js";

/**
 * a pseudocylindrical equal-area projection similar to Eckert IV or Natural Earth
 */
export class EqualArea extends MapProjection {
	private readonly фRef: number[];
	private readonly xRef: number[];
	private readonly yRef: number[];

	constructor(surface: Surface, northUp: boolean, locus: PathSegment[]) {
		super(surface, northUp, locus, null, null, null, 0);

		let avgWidth = 0;
		for (let i = 1; i < surface.refLatitudes.length; i ++) // first measure the typical width of the surface
			avgWidth += surface.dAds((surface.refLatitudes[i-1] + surface.refLatitudes[i])/2)*
				(surface.cumulAreas[i] - surface.cumulAreas[i-1])/surface.area;

		this.фRef = surface.refLatitudes;
		this.xRef = [];
		this.yRef = [0];
		for (let i = 0; i < this.фRef.length; i ++) {
			this.xRef.push((surface.dAds(this.фRef[i]) + avgWidth)/2/(2*Math.PI));
			if (i > 0) {
				const verAre = surface.cumulAreas[i] - surface.cumulAreas[i-1];
				this.yRef.push(this.yRef[i-1] - verAre / (2*Math.PI*(this.xRef[i-1] + this.xRef[i])/2));
			}
		}

		let maxX = 0;
		for (const x of this.xRef)
			if (x > maxX)
				maxX = x;
		this.setDimensions(
			-Math.PI*maxX,
			Math.PI*maxX,
			this.yRef[this.yRef.length-1],
			this.yRef[0]);
	}

	projectPoint(point: Place): Point {
		return {
			x: linterp(point.ф, this.фRef, this.xRef)*point.λ,
			y: linterp(point.ф, this.фRef, this.yRef)}; // TODO: use better interpolacion
	}

	projectMeridian(ф0: number, ф1: number, λ: number): PathSegment[] {
		const edge = [];
		let i0, i1;
		if (ф1 > ф0) {
			i0 = Math.floor(
				(ф0 - this.фRef[0])/(this.фRef[this.фRef.length-1] - this.фRef[0])*(this.фRef.length-1)) + 1; // TODO: use bezier curves
			i1 = Math.ceil(
				(ф1 - this.фRef[0])/(this.фRef[this.фRef.length-1] - this.фRef[0])*(this.фRef.length-1));
		}
		else {
			i0 = Math.ceil(
				(ф0 - this.фRef[0])/(this.фRef[this.фRef.length-1] - this.фRef[0])*(this.фRef.length-1)) - 1;
			i1 = Math.floor(
				(ф1 - this.фRef[0])/(this.фRef[this.фRef.length-1] - this.фRef[0])*(this.фRef.length-1));
		}
		for (let i = i0; i !== i1; i += Math.sign(i1 - i0))
			edge.push({type: 'L', args: [λ*this.xRef[i], this.yRef[i]]});
		const {x, y} = this.projectPoint({ф: ф1, λ: λ});
		edge.push({type: 'L', args: [x, y]});
		return edge;
	}
}