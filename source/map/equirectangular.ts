/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Surface} from "../surface/surface.js";
import {MapProjection} from "./projection.js";
import {Place, Point} from "../utilities/coordinates.js";

/**
 * a Plate-Caree projection, primarily for interfacing with other mapping software.
 */
export class Equirectangular extends MapProjection {
	private readonly factor: number;

	constructor(surface: Surface) {
		const scale = Math.sqrt(surface.area/(2*Math.PI*(surface.фMax - surface.фMin)));
		super(surface, false);
		this.factor = scale;
	}

	projectPoint(point: Place): Point {
		return {x: this.factor*point.λ, y: -this.factor*point.ф};
	}
}
