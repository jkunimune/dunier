/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Surface} from "../surface/surface.js";
import {MapProjection} from "./projection.js";
import {linterp} from "../utilities/miscellaneus.js";
import {PathSegment, Place, Point} from "../utilities/coordinates.js";

/**
 * a cylindrical projection that makes loxodromes appear as straight lines.
 */
export class Mercator extends MapProjection {
	private static readonly ASPECT: number = Math.sqrt(2);
	private readonly dxdλ: number;
	private readonly фRef: number[];
	private readonly yRef: number[];

	constructor(surface: Surface, northUp: boolean, locus: PathSegment[]) {
		super(surface, northUp, locus, null, null, null, null);

		// find the surface's widest point to set the scale
		const width = Math.max(
			surface.dAds(surface.фMin), surface.dAds(surface.фMax),
			surface.dAds((surface.фMin + surface.фMax)/2));

		this.фRef = surface.refLatitudes;
		this.yRef = [0];
		for (let i = 1; i < this.фRef.length; i ++) {
			const dф = this.фRef[i] - this.фRef[i-1];
			const dsdф = surface.dsdф((this.фRef[i-1] + this.фRef[i])/2);
			const dAds = surface.dAds((this.фRef[i-1] + this.фRef[i])/2);
			this.yRef.push(this.yRef[i-1] - width*dsdф*dф/dAds);
		}

		let bottom = this.yRef[0];
		let top = this.yRef[this.yRef.length-1];
		if (surface.dAds(surface.фMin) > surface.dAds(surface.фMax)) // if the South Pole is thicker than the North
			top = Math.max(top, bottom - width/Mercator.ASPECT); // crop the top to get the correct aspect ratio
		else if (surface.dAds(surface.фMin) < surface.dAds(surface.фMax)) // if the North Pole is thicker
			 bottom = Math.min(bottom, top + width/Mercator.ASPECT); // crop the bottom to make correct
		else { // if they are equally important
			const excess = Math.max(0, bottom - top - width/Mercator.ASPECT);
			top = top + excess/2; // crop both
			bottom = bottom - excess/2;
		}
		this.setDimensions(-width/2, width/2, top, bottom);

		this.dxdλ = width/(2*Math.PI);
	}

	projectPoint(point: Place): Point {
		return {x: this.dxdλ*point.λ, y: linterp(point.ф, this.фRef, this.yRef)};
	}
}
