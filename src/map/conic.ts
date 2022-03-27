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
import {MapProjection} from "./projection.js";
import {Surface} from "../planet/surface.js";
import {linterp} from "../util/util.js";
import {assert_фλ, endpoint, PathSegment, Place, Point} from "../util/coordinates.js";

export class Conic extends MapProjection {
	private readonly yJong: number;
	private readonly n: number;

	public constructor(surface: Surface, norde: boolean, locus: PathSegment[]) {
		super(surface, norde, locus,
			null, null, null, null);

		const focus = MapProjection.standardParallels(locus, this);
		const y0 = -linterp(focus.фStd, surface.refLatitudes, surface.cumulDistances);
		this.yJong = surface.dAds(focus.фStd)/surface.d2Ads2(focus.фStd) + y0; // TODO: try this with something that spans both poles.  I feel like it probably won't work
		this.n = (Number.isFinite(this.yJong)) ?
			surface.dAds(focus.фStd)/(2*Math.PI*(y0 - this.yJong)) :
			surface.dAds(focus.фStd)/(2*Math.PI); // use that to calculate the angular scale

		let locusTop = Number.POSITIVE_INFINITY; // then determine the dimensions of this map
		let locusBottom = Number.NEGATIVE_INFINITY;
		let locusRight = 0;
		for (const segment of this.transform(locus)) { // check the extent of the thing we're mapping
			const point = assert_фλ(endpoint(segment));
			const {x, y} = this.projectPoint(point);
			if (y < locusTop)
				locusTop = y;
			if (y > locusBottom)
				locusBottom = y;
			if (Math.abs(x) > locusRight)
				locusRight = Math.abs(x);
		}

		let coneTop = Number.POSITIVE_INFINITY;
		let coneBottom = Number.NEGATIVE_INFINITY;
		let coneRight = 0;
		for (const ф of [surface.фMin, surface.фMax]) { // and check the extent of the whole world
			for (const λ of [0, Math.PI/2/this.n, Math.PI]) {
				if (Math.abs(λ) <= Math.PI) {
					const {x, y} = this.projectPoint({ф: ф, λ: λ});
					if (y > coneBottom)
						coneBottom = y;
					if (y < coneTop)
						coneTop = y;
					if (Math.abs(x) > coneRight)
						coneRight = Math.abs(x);
				}
			}
		}

		const top = Math.max(coneTop, 1.4*locusTop - 0.4*locusBottom);
		const bottom = Math.min(coneBottom, 1.4*locusBottom - 0.4*locusTop);
		const right = Math.min(coneRight, 1.8*locusRight);
		this.setDimensions(-right, right, top, bottom);
	}

	projectPoint(point: Place): Point {
		const y0 = -linterp(point.ф, this.surface.refLatitudes, this.surface.cumulDistances);
		if (Number.isFinite(this.yJong)) {
			const R = y0 - this.yJong;
			return {
				x: R*Math.sin(this.n*point.λ),
				y: R*Math.cos(this.n*point.λ) + this.yJong };
		}
		else
			return {
				x: this.n*point.λ,
				y: y0 };
	}

	projectParallel(λ0: number, λ1: number, ф: number): PathSegment[] {
		const {x, y} = this.projectPoint({ф: ф, λ: λ1});
		if (Number.isFinite(this.yJong)) {
			const r = Math.hypot(x, y - this.yJong);
			return [{
				type: 'A',
				args: [
					r, r, 0,
					(Math.abs(this.n*(λ1 - λ0)) > Math.PI) ? 1 : 0,
					((λ1 > λ0) === (this.yJong > 0)) ? 1 : 0,
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
