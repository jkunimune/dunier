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
import {MapProjection, PathSegment} from "./projection.js";
import {Surface} from "../planet/surface.js";
import {linterp} from "../util/util.js";

export class Conic extends MapProjection {
	private static SPREAD = 0.4;
	private readonly yJong: number;
	private readonly n: number;

	public constructor(surface: Surface, norde: boolean, locus: PathSegment[]) {
		super(surface, norde, locus,
			null, null, null, null);

		const focus = MapProjection.standardParallels(locus, this);
		const dф = 1e-2;
		const y0 = -linterp(focus.фStd, surface.refLatitudes, surface.cumulDistances);
		this.yJong = surface.dAds(focus.фStd)/surface.d2Ads2(focus.фStd) + y0; // TODO: try this with something that spans both poles.  I feel like it probably won't work
		this.n = (Number.isFinite(this.yJong)) ?
			surface.dAds(focus.фStd)/(2*Math.PI*(y0 - this.yJong)) :
			surface.dAds(focus.фStd)/(2*Math.PI); // use that to calculate the angular scale

		// for (let i = 0; i < 2; i ++) { TODO: there are absolute limits that the map should not get bigger than
		let top = y0; // then determine the dimensions of this map
		let bottom = y0;
		let right = 0;
		for (const ф of [focus.фMin, focus.фMax]) {
			for (const λ of [0, Math.min(Math.PI/2/Math.abs(this.n), focus.λMax)]) {
				const {x, y} = this.project(ф, λ);
				if (y > bottom)
					bottom = y;
				if (y < top)
					top = y;
				if (x > right)
					right = x;
			}
		}
		// }
		const spread = Conic.SPREAD, spreadp1 = Conic.SPREAD + 1;
		top = spreadp1*top - spread*bottom; // spread the limits out a bit to give a contextual view
		bottom = spreadp1*bottom - spread/spreadp1*(spread*bottom + top);
		right = (2*spread + 1)*right;

		this.setDimensions(-right, right, top, bottom);
	}

	project(ф: number, λ: number): { x: number; y: number } {
		const y0 = -linterp(ф, this.surface.refLatitudes, this.surface.cumulDistances);
		if (Number.isFinite(this.yJong)) {
			const R = y0 - this.yJong;
			return {
				x: R*Math.sin(this.n*λ),
				y: R*Math.cos(this.n*λ) + this.yJong };
		}
		else
			return {
				x: this.n*λ,
				y: y0 };
	}

	drawParallel(λ0: number, λ1: number, ф: number): PathSegment[] {
		const {x, y} = this.project(ф, λ1);
		if (Number.isFinite(this.yJong)) {
			const r = Math.hypot(x, y - this.yJong);
			return [{
				type: 'A',
				args: [
					r, r, 0,
					(this.n*Math.abs(λ1 - λ0) > Math.PI) ? 1 : 0,
					((λ1 > λ0) != (this.yJong > 0)) ? 1 : 0,
					x, y],
			}];
		}
		else {
			return [{
				type: 'L',
				args: [x, y],
			}]
		}
	}
}
