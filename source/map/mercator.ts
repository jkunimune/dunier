/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Surface} from "../surface/surface.js";
import {MapProjection} from "./projection.js";
import {linterp} from "../utilities/miscellaneus.js";
import {Place, Point} from "../utilities/coordinates.js";

/**
 * a cylindrical projection that makes loxodromes appear as straight lines.
 */
export class Mercator extends MapProjection {
	private readonly dx_dλ: number;
	private readonly фRef: number[];
	private readonly yRef: number[];

	constructor(surface: Surface) {
		super(surface, false);

		// find the surface's widest point to set the scale
		this.dx_dλ = Math.max(
			surface.ds_dλ(surface.фMin), surface.ds_dλ(surface.фMax),
			surface.ds_dλ((surface.фMin + surface.фMax)/2));

		this.фRef = surface.refLatitudes;
		this.yRef = [0];
		for (let i = 1; i < this.фRef.length; i ++) {
			const dф = this.фRef[i] - this.фRef[i-1];
			const ds_dф = surface.ds_dф((this.фRef[i-1] + this.фRef[i])/2);
			const ds_dλ = surface.ds_dλ((this.фRef[i-1] + this.фRef[i])/2);
			this.yRef.push(this.yRef[i-1] - this.dx_dλ*ds_dф*dф/ds_dλ);
		}
	}

	projectPoint(point: Place): Point {
		return {x: this.dx_dλ*point.λ, y: linterp(point.ф, this.фRef, this.yRef)};
	}
}
