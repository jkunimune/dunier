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
import {MapProjection, PathSegment} from "./projection.js";
import {linterp} from "../util/util.js";

/**
 * a pseudocylindrical equal-area projection similar to Eckert IV or Natural Earth
 */
export class EqualArea extends MapProjection {
	private readonly φRef: number[];
	private readonly xRef: number[];
	private readonly yRef: number[];

	constructor(surface: Surface) {
		super(surface, null, null, null, 0);

		let avgWidth = 0;
		for (let i = 1; i < surface.refLatitudes.length; i ++) // first measure the typical width of the surface
			avgWidth += surface.dAds((surface.refLatitudes[i-1] + surface.refLatitudes[i])/2)*
				(surface.cumulAreas[i] - surface.cumulAreas[i-1])/surface.area;

		this.φRef = surface.refLatitudes;
		this.xRef = [];
		this.yRef = [0];
		for (let i = 0; i < this.φRef.length; i ++) {
			this.xRef.push((surface.dAds(this.φRef[i]) + avgWidth)/2/(2*Math.PI));
			if (i > 0) {
				const verAre = surface.cumulAreas[i] - surface.cumulAreas[i-1];
				this.yRef.push(this.yRef[i-1] - verAre / (2*Math.PI*(this.xRef[i-1] + this.xRef[i])/2));
			}
		}

		let maxX = 0;
		for (const x of this.xRef)
			if (x > maxX)
				maxX = x;
		this.left = -Math.PI*maxX;
		this.right = Math.PI*maxX;
		this.bottom = this.yRef[0];
		this.top = this.yRef[this.yRef.length-1];
	}

	project(φ: number, λ: number): {x: number, y: number} {
		return {x: λ*linterp(φ, this.φRef, this.xRef), y: linterp(φ, this.φRef, this.yRef)}; // TODO: use better interpolacion
	}

	drawMeridian(φ0: number, φ1: number, λ: number): PathSegment[] {
		console.assert(φ0 !== φ1, φ0);
		const edge = [];
		let i0, i1;
		if (φ1 > φ0) {
			i0 = Math.floor(
				(φ0 - this.φRef[0])/(this.φRef[this.φRef.length-1] - this.φRef[0])*(this.φRef.length-1)) + 1; // TODO: use bezier curves
			i1 = Math.ceil(
				(φ1 - this.φRef[0])/(this.φRef[this.φRef.length-1] - this.φRef[0])*(this.φRef.length-1));
		}
		else {
			i0 = Math.ceil(
				(φ0 - this.φRef[0])/(this.φRef[this.φRef.length-1] - this.φRef[0])*(this.φRef.length-1)) - 1;
			i1 = Math.floor(
				(φ1 - this.φRef[0])/(this.φRef[this.φRef.length-1] - this.φRef[0])*(this.φRef.length-1));
		}
		for (let i = i0; i !== i1; i += Math.sign(i1 - i0))
			edge.push({type: 'L', args: [λ*this.xRef[i], this.yRef[i]]});
		const {x, y} = this.project(φ1, λ);
		edge.push({type: 'L', args: [x, y]});
		return edge;
	}
}