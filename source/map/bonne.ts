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
import {Surface} from "../surface/surface.js";
import {linterp} from "../utilities/miscellaneus.js";
import {PathSegment, Place, Point} from "../utilities/coordinates.js";

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

	public constructor(surface: Surface, northUp: boolean, locus: PathSegment[]) {
		super(surface, northUp, locus,
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

		this.maxф = Math.min(surface.фMax, 1.4*focus.фMax - 0.4*focus.фMin); // spread the limits out a bit to give a contextual view
		this.minф = Math.max(surface.фMin, 1.4*focus.фMin - 0.4*focus.фMax); // TODO: this should be a constant distance, not a constant latitude difference
		this.maxλ = Math.min(Math.PI, 1.8*focus.λMax);
		this.minλ = -this.maxλ;

		this.geoEdges = MapProjection.buildGeoEdges(
			this.minф, this.maxф, this.minλ, this.maxλ); // redo the edges

		let top = this.projectPoint({ф: this.maxф, λ: 0}).y; // then determine the dimensions of this map
		let bottom = this.projectPoint({ф: this.minф, λ: 0}).y;
		let right = 0;
		for (const ф of surface.refLatitudes.concat(this.minф, this.maxф)) {
			if (ф >= this.minф && ф <= this.maxф) {
				const {x, y} = this.projectPoint({ф: ф, λ: this.maxλ});
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

	projectPoint(point: Place): Point {
		const y0 = this.yVertex(point.ф);
		const s1 = this.sRadian(point.ф);
		if (Number.isFinite(this.yJong)) {
			const R = y0 - this.yJong;
			return {
				x: R*Math.sin(s1/R*point.λ),
				y: R*Math.cos(s1/R*point.λ) + this.yJong };
		}
		else
			return {
				x: s1*point.λ,
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
					(this.sRadian(ф)*Math.abs(λ1 - λ0) > Math.PI*r) ? 1 : 0,
					((λ1 > λ0) === (this.yJong > 0)) ? 1 : 0,
					x, y],
			}];
		}
		else {
			return [{
				type: 'L',
				args: [x, y],
			}];
		}
	}

	projectMeridian(ф0: number, ф1: number, λ: number): PathSegment[] {
		const edge: PathSegment[] = [];
		const n = Math.ceil(Math.abs(ф1 - ф0)*this.EDGE_RESOLUTION);
		for (let i = 1; i <= n; i ++) {
			let ф = ф0 + (ф1 - ф0)*i/n;
			if (i === 0) ф = ф0; // do this because of roundoff
			if (i === n) ф = ф1;
			const {x, y} = this.projectPoint({ф: ф, λ: λ});
			edge.push({type: 'L', args: [x, y]});
		}
		const test = this.projectPoint({ф: ф1, λ: λ});
		console.assert(test.x === edge[edge.length-1].args[0] && test.y === edge[edge.length-1].args[1]);
		return edge;
	}


	private sRadian(ф: number): number {
		return linterp(ф, this.фRef, this.sRef); // TODO: use better interpolation
	}

	private yVertex(ф: number): number {
		return linterp(ф, this.фRef, this.yRef);
	}

	private radius(ф: number): number {
		return this.yVertex(ф) - this.yJong;
	}

}
