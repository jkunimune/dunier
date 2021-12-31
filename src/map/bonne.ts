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
import {Place, Surface} from "../planet/surface.js";

export class Bonne extends MapProjection {
	private readonly EDGE_RESOLUTION = 18; // the number of points per radian
	private readonly radius: number;
	private readonly minф: number;
	private readonly maxф: number;
	private readonly minλ: number;
	private readonly maxλ: number;

	public constructor(surface: Surface, norde: boolean, locus: PathSegment[]) {
		super(surface, norde, locus,
			null, null, null, null, []);

		let minф = Number.POSITIVE_INFINITY; // get the bounds of the locus
		let maxф = Number.NEGATIVE_INFINITY; // TODO: integrate this in case it's not a sphere
		let maxλ = Number.NEGATIVE_INFINITY;
		for (const segment of this.transform(locus)) {
			let [ф, λ] = segment.args;
			if (ф < minф)
				minф = ф;
			if (ф > maxф)
				maxф = ф; // TODO: this won't notice when the pole is included in the region
			if (λ > maxλ)
				maxλ = λ;
		}

		let ф1;
		if (maxф == Math.PI/2 && minф == -Math.PI/2) // choose a standard parallel
			ф1 = 0;
		else if (maxф == Math.PI/2)
			ф1 = maxф;
		else if (minф == -Math.PI/2)
			ф1 = minф;
		else
			ф1 = Math.atan((Math.tan(maxф) + Math.tan(minф))/2);
		this.radius = 1/Math.tan(ф1) + ф1; // convert it into an equatorial radius

		this.maxф = Math.min(Math.PI/2, 1.5*maxф - 0.5*minф); // spread the limits out a bit to give a contextual view
		this.minф = Math.max(-Math.PI/2, 1.5*minф - 0.5*maxф);
		this.maxλ = Math.min(Math.PI, 2*maxλ);
		this.minλ = -this.maxλ;

		this.edges = MapProjection.buildEdges(this.minф, this.maxф, this.minλ, this.maxλ); // redo the edges

		let top = this.project(this.maxф, 0).y; // then determine the dimensions of this map
		let bottom = this.project(this.minф, 0).y;
		let right = 0;
		for (const {args} of this.drawMeridian(this.minф, this.maxф, this.maxλ)) {
			if (args[0] > right)
				right = args[0];
			if (args[1] < top)
				top = args[1];
			if (args[1] > bottom)
				bottom = args[1];
		}
		this.setDimensions(-right, right, top, bottom);
	}

	project(ф: number, λ: number): { x: number; y: number } {
		if (ф < this.minф || ф > this.maxф || λ < this.minλ || λ > this.maxλ)
			return { x: NaN, y: NaN };
		if (Number.isFinite(this.radius)) { // use these formulas for normal maps
			const r = this.radius - ф;
			const E = (r != 0) ? λ*Math.cos(ф)/r : 0;
			return {
				x: r*Math.sin(E),
				y: r*Math.cos(E),
			};
		}
		else { // resort to sinusoidal in the limit of large radius
			return {
				x: λ*Math.cos(ф),
				y: Math.sin(ф)
			};
		}
	}

	getCrossing(фλ0: number[], фλ1: number[]): Place[] {
		const basicCrossing = super.getCrossing(фλ0, фλ1);
		if (basicCrossing != null) // if the line between them goes around the back
			return basicCrossing; // split it there so that we can deal with each half more cleanly

		const [ф0, λ0] = фλ0;
		const [ф1, λ1] = фλ1;
		const фS = Math.min(ф0, ф1);
		const фN = Math.max(ф0, ф1);
		const λW = Math.min(λ0, λ1);
		const λE = Math.max(λ0, λ1);

		if (λW < this.minλ && λE > this.minλ) // if they are on opposite sides of the west bound
			return this.getMeridianCrossing(ф0, λ0, ф1, λ1, this.minλ);
		else if (λW < this.maxλ && λE > this.maxλ) // if they are on opposite sides of the east bound
			return this.getMeridianCrossing(ф0, λ0, ф1, λ1, this.maxλ);
		else if (фS < this.minф && фN > this.minф) // if they are on opposite sides of the south bound
			return this.getParallelCrossing(ф0, λ0, ф1, λ1, this.minф);
		else if (фS < this.maxф && фN > this.maxф) // if they are on opposite sides of the north bound
			return this.getParallelCrossing(ф0, λ0, ф1, λ1, this.maxф);

		return null;
	}

	drawParallel(λ0: number, λ1: number, ф: number): PathSegment[] {
		const {x, y} = this.project(ф, λ1);
		const r = Math.abs(this.radius - ф);
		return [{
			type: 'A',
			args: [
				r, r, 0,
				(Math.abs(λ1 - λ0) > Math.PI) ? 1 : 0,
				((λ1 > λ0) == (this.radius < 0)) ? 1 : 0,
				x, y],
		}];
	}

	drawMeridian(ф0: number, ф1: number, λ: number): PathSegment[] {
		const edge: PathSegment[] = [];
		const n = Math.ceil(Math.abs(ф1 - ф0)*this.EDGE_RESOLUTION);
		for (let i = 1; i <= n; i ++) {
			const {x, y} = this.project(ф0 + (ф1 - ф0)*i/n, λ);
			edge.push({type: 'L', args: [x, y]});
		}
		return edge;
	}

}
