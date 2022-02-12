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

export class Bonne extends MapProjection {
	private readonly EDGE_RESOLUTION = 18; // the number of points per radian
	private readonly yJong: number;
	private readonly фRef: number[];
	private readonly yRef: number[];
	private readonly sRef: number[];
	private readonly minф: number;
	private readonly maxф: number;
	private readonly minλ: number;
	private readonly maxλ: number;

	public constructor(surface: Surface, norde: boolean, locus: PathSegment[]) {
		super(surface, norde, locus,
			null, null, null, null, []);

		const focus = MapProjection.standardParallels(locus, this);
		const distance0 = linterp(focus.фStd, surface.refLatitudes, surface.cumulDistances);
		this.yJong = surface.dAds(focus.фStd)/surface.d2Ads2(focus.фStd);

		this.фRef = surface.refLatitudes; // do the necessary integrals
		this.yRef = []; // to get the y positions of the prime meridian
		this.sRef = []; // and the arc lengths corresponding to one radian
		for (let i = 0; i < this.фRef.length; i ++) {
			this.yRef.push(distance0 - surface.cumulDistances[i]);
			this.sRef.push(surface.dAds(this.фRef[i])/(2*Math.PI)); // TODO: try this with something that spans both poles.  I feel like it probably won't work
		}

		this.maxф = Math.min(Math.PI/2, 1.4*focus.фMax - 0.4*focus.фMin); // spread the limits out a bit to give a contextual view
		this.minф = Math.max(-Math.PI/2, 1.4*focus.фMin - 0.4*focus.фMax);
		this.maxλ = Math.min(Math.PI, 1.8*focus.λMax);
		this.minλ = -this.maxλ;

		this.geoEdges = MapProjection.buildEdges(this.minф, this.maxф, this.minλ, this.maxλ); // redo the edges

		let top = this.project(this.maxф, 0).y; // then determine the dimensions of this map
		let bottom = this.project(this.minф, 0).y;
		let right = 0;
		for (const ф of surface.refLatitudes.concat(this.minф, this.maxф)) {
			if (ф >= this.minф && ф <= this.maxф) {
				const {x, y} = this.project(ф, this.maxλ);
				if (x > right)
					right = x;
				if (y < top)
					top = y;
				if (y > bottom)
					bottom = y;
			}
		}
		for (const ф of [this.minф, this.maxф]) {
			const r = Math.abs(this.radius(ф));
			if (Math.abs(this.maxλ*this.sRadian(ф)) > Math.PI*r/2) {
				if (r > right)
					right = r;
			}
		}
		this.setDimensions(-right, right, top, bottom);
	}

	project(ф: number, λ: number): { x: number; y: number } {
		const y0 = this.yVertex(ф);
		const s1 = this.sRadian(ф);
		if (Number.isFinite(this.yJong)) {
			const R = y0 - this.yJong;
			return {
				x: R*Math.sin(s1/R*λ),
				y: R*Math.cos(s1/R*λ) + this.yJong };
		}
		else
			return {
				x: s1*λ,
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
					(this.sRadian(ф)*Math.abs(λ1 - λ0) > Math.PI*r) ? 1 : 0,
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

	drawMeridian(ф0: number, ф1: number, λ: number): PathSegment[] {
		const edge: PathSegment[] = [];
		const n = Math.ceil(Math.abs(ф1 - ф0)*this.EDGE_RESOLUTION);
		for (let i = 1; i <= n; i ++) {
			let ф = ф0 + (ф1 - ф0)*i/n;
			ф = Math.max(this.minф, ф);
			ф = Math.min(this.maxф, ф);
			const {x, y} = this.project(ф, λ);
			edge.push({type: 'L', args: [x, y]});
		}
		return edge;
	}


	private sRadian(ф: number): number {
		return linterp(ф, this.фRef, this.sRef);
	}

	private yVertex(ф: number): number {
		return linterp(ф, this.фRef, this.yRef);
	}

	private radius(ф: number): number {
		return this.yVertex(ф) - this.yJong;
	}

}
