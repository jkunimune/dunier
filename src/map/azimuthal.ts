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
import {LongLineType, PathSegment, Place, Point} from "../util/coordinates.js";

/**
 * an azimuthal equidistant projection
 */
export class Azimuthal extends MapProjection {
	private readonly rMax: number;
	private readonly rMin: number;

	constructor(surface: Surface, norde: boolean, locus: PathSegment[]) {
		const r0 = surface.dAds(Math.PI/2)/(2*Math.PI);
		const rMax = r0 + linterp(Math.PI/2, surface.refLatitudes, surface.cumulDistances);
		super(
			surface, norde, locus,
			-rMax, rMax, -rMax, rMax,
			[
				[{
					type: LongLineType.VEI,
					start: { s: surface.фMax, t:  Math.PI },
					end:   { s: surface.фMax, t: -Math.PI },
					loopIndex: 0,
					twoWay: surface.фMax - surface.фMin >= 2*Math.PI,
				}],
				[{
					type: LongLineType.VEI,
					start: { s: surface.фMin, t: -Math.PI },
					end:   { s: surface.фMin, t:  Math.PI },
					loopIndex: 1,
					twoWay: surface.фMax - surface.фMin >= 2*Math.PI,
				}],
			]);
		this.rMax = rMax;
		this.rMin = rMax - surface.height;
	}

	projectPoint(point: Place): Point {
		const r = this.rMax - linterp(point.ф, this.surface.refLatitudes, this.surface.cumulDistances);
		if (Math.abs(point.λ) !== Math.PI)
			return { x: r*Math.sin(point.λ), y: r*Math.cos(point.λ) };
		else
			return { x: 0, y: -r };
	}

	projectParallel(λ0: number, λ1: number, ф: number): PathSegment[] {
		const r = this.rMax - linterp(ф, this.surface.refLatitudes, this.surface.cumulDistances);
		const sweepFlag = (λ1 > λ0) ? 0 : 1;
		if (r > 0) {
			const {x, y} = this.projectPoint({ф: ф, λ: λ1});
			if (Math.abs(λ0 - λ1) <= Math.PI)
				return [
					{type: 'A', args: [r, r, 0, 0, sweepFlag, x, y]},
				]
			else
				return [
					{type: 'A', args: [r, r, 0, 0, sweepFlag, 0, r]},
					{type: 'A', args: [r, r, 0, 0, sweepFlag, x, y]},
				];
		}
		else
			return [];
	}
}
