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

/**
 * a cylindrical projection that makes loxodromes appear as straight lines.
 */
export class Mercator extends MapProjection {
	private readonly φRef: number[];
	private readonly yRef: number[];

	constructor(surface: Surface) {
		super(surface, -Math.PI, Math.PI, null, 0);

		this.φRef = surface.refLatitudes;
		this.yRef = [0];
		for (let i = 1; i < this.φRef.length; i ++) {
			const dφ = this.φRef[i] - this.φRef[i-1];
			const dsdφ = surface.dsdφ((this.φRef[i-1] + this.φRef[i])/2);
			const dAds = surface.dAds((this.φRef[i-1] + this.φRef[i])/2);
			this.yRef.push(this.yRef[i-1] - 2*Math.PI*dsdφ*dφ/dAds);
		}

		this.bottom = this.yRef[0];
		this.top = this.yRef[this.yRef.length-1];
		if (surface.dAds(surface.φMin) > surface.dAds(surface.φMax)) // if the South Pole is thicker than the North
			this.top = Math.max(this.top, this.bottom - 2*Math.PI); // crop the top to make it square
		else if (surface.dAds(surface.φMin) < surface.dAds(surface.φMax)) // if the North Pole is thicker
			this.bottom = Math.min(this.bottom, this.top + 2*Math.PI); // crop the bottom to make it square
		else { // if they are equally important
			const excess = Math.max(0, this.bottom - this.top - 2*Math.PI);
			this.top = this.top + excess/2;
			this.bottom = this.bottom - excess/2;
		}
	}

	project(φ: number, λ: number): {x: number, y: number} {
		return {x: λ, y: linterp(φ, this.φRef, this.yRef)};
	}
}
