/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Surface} from "../surface/surface.js";
import {MapProjection} from "./projection.js";
import {linterp} from "../utilities/miscellaneus.js";
import {LongLineType, PathSegment, Place, Point} from "../utilities/coordinates.js";

/**
 * an azimuthal equidistant projection
 */
export class Azimuthal extends MapProjection {
	private readonly rMax: number;
	private readonly sign: number;

	constructor(surface: Surface, northUp: boolean, locus: PathSegment[]) {
		const r0 = surface.ds_dλ(Math.PI/2);
		const rMax = r0 + linterp(Math.PI/2, surface.refLatitudes, surface.cumulDistances);
		super(
			surface, northUp, locus,
			-rMax, rMax, -rMax, rMax,
			[
				[{
					type: LongLineType.PARALLEL,
					start: { s: surface.фMax, t:  Math.PI },
					end:   { s: surface.фMax, t: -Math.PI },
				}],
				[{
					type: LongLineType.PARALLEL,
					start: { s: surface.фMin, t: -Math.PI },
					end:   { s: surface.фMin, t:  Math.PI },
				}],
			]);
		this.rMax = rMax;
		// decide whether to do the flip thing
		if (MapProjection.standardParallels(locus, this).фStd < 0)
			this.sign = -1;
		else
			this.sign = 1;
	}

	projectPoint(point: Place): Point {
		const r = this.r(point.ф);
		if (Math.abs(point.λ) !== Math.PI)
			return { x: r*Math.sin(point.λ), y: this.sign*r*Math.cos(point.λ) };
		else
			return { x: 0, y: -this.sign*r };
	}

	projectParallel(λ0: number, λ1: number, ф: number): PathSegment[] {
		const r = this.r(ф);
		const sweepFlag = (λ1 > λ0) ? 0 : 1;
		if (r > 0) {
			const {x, y} = this.projectPoint({ф: ф, λ: λ1});
			if (Math.abs(λ0 - λ1) <= Math.PI)
				return [
					{type: 'A', args: [r, r, 0, 0, sweepFlag, x, y]},
				];
			else
				return [
					{type: 'A', args: [r, r, 0, 0, sweepFlag, 0, this.sign*r]},
					{type: 'A', args: [r, r, 0, 0, sweepFlag, x, y]},
				];
		}
		else
			return [];
	}

	r(ф: number): number {
		return this.rMax - linterp(this.sign*ф,
		                           this.surface.refLatitudes,
		                           this.surface.cumulDistances);
	}
}
