/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {MapProjection} from "./projection.js";
import {Surface} from "../surface/surface.js";
import {linterp} from "../utilities/miscellaneus.js";
import {PathSegment, Place, Point} from "../utilities/coordinates.js";

export class Conic extends MapProjection {
	private readonly yJong: number;
	private readonly n: number;

	public constructor(surface: Surface, фStd: number) {
		const y0 = -linterp(фStd, surface.refLatitudes, surface.cumulDistances);
		const yJong = surface.ds_dλ(фStd)/surface.dds_dλdф(фStd) + y0;
		const n = (Number.isFinite(yJong)) ?
			surface.ds_dλ(фStd)/(y0 - yJong) :
			surface.ds_dλ(фStd); // use that to calculate the angular scale

		super(surface, n === 1);

		this.yJong = yJong; // TODO: try this with something that spans both poles.  I feel like it probably won't work
		this.n = n;
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
			const sweepFlag = ((λ1 > λ0) === (this.yJong > 0)) ? 1 : 0;
			if (r > 0) {  // TODO: consolidate this block of code between conic and bonne
				if (Math.abs(this.n*(λ1 - λ0)) <= Math.PI)
					return [
						{type: 'A', args: [r, r, 0, 0, sweepFlag, x, y]},
					];
				else
					return [
						{type: 'A', args: [r, r, 0, 0, sweepFlag, 0, this.yJong - Math.sign(this.yJong)*r]},
						{type: 'A', args: [r, r, 0, 0, sweepFlag, x, y]},
					];
			}
			else
				return [];
		}
		else {
			return [{
				type: 'L',
				args: [x, y],
			}];
		}
	}
}
