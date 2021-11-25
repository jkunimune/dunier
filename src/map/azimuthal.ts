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
import {MapEdge, MapProjection, PathSegment} from "./projection.js";
import {linterp} from "../util/util.js";

/**
 * an azimuthal equidistant projection
 */
export class Azimuthal extends MapProjection {
	private readonly rMax: number;
	private readonly rMin: number;

	constructor(surface: Surface, norde: boolean, locus: PathSegment[]) {
		const r0 = surface.dAds(Math.PI/2)/(2*Math.PI);
		const rMax = r0 + linterp(Math.PI/2, surface.refLatitudes, surface.cumulDistances);
		super(surface, norde, locus, -rMax, rMax, -rMax, rMax);
		this.rMax = rMax;
		this.rMin = rMax - surface.height;
	}

	project(ф: number, λ: number): {x: number, y: number} {
		const r = this.rMax - linterp(ф, this.surface.refLatitudes, this.surface.cumulDistances);
		return {x: r*Math.sin(λ), y: r*Math.cos(λ)};
	}

	drawParallel(λ0: number, λ1: number, ф: number): PathSegment[] {
		const r = this.rMax - linterp(ф, this.surface.refLatitudes, this.surface.cumulDistances);
		const sweepFlag = (λ1 > λ0) ? 0 : 1;
		if (r > 0) {
			const {x, y} = this.project(ф, λ1);
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

	getCrossing(фλ0: number[], фλ1: number[]): {endpoint0: Place, endpoint1: Place} {
		const [ф0, λ0] = фλ0;
		const [ф1, λ1] = фλ1;
		if (Math.abs(ф1 - ф0) > Math.PI)
			return this.getEquatorCrossing(ф0, λ0, ф1, λ1);
		return null;
	}

	getEdges(): MapEdge[][] {
		if (this.edges === undefined) {
			this.edges = [
				[{
					start: {ф: this.surface.фMax, λ:  Math.PI},
					end:   {ф: this.surface.фMax, λ: -Math.PI},
					trace: (_0, λ0, _1, λ1) => this.drawParallel(λ0, λ1, this.surface.фMax),
				}],
				[{
					start: {ф: this.surface.фMin, λ: -Math.PI},
					end:   {ф: this.surface.фMin, λ:  Math.PI},
					trace: (_0, λ0, _1, λ1) => this.drawParallel(λ0, λ1, this.surface.фMin),
				}],
			];
		}
		return this.edges;
	}

}
