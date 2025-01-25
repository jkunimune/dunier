/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Spheroid} from "./spheroid.js";
import {Vector} from "../utilities/geometry.js";
import {Place} from "../utilities/coordinates.js";

/**
 * a non-rotating spheroid. aspectRatio = 1, and latitude is measured in the y direction
 * rather than the z.
 */
export class Sphere extends Spheroid {
	/**
	 * construct a stationary sphere
	 * @param radius the radius of the sphere in km
	 */
	constructor(radius: number) {
		super(radius, 1, 0, NaN);
	}

	insolation(φ: number): number {
		return 2.0*Math.max(0, Math.sin(φ));
	}

	hasSeasons(_: number): boolean {
		return false;
	}

	windConvergence(φ: number): number {
		return Math.pow((Math.sin(φ) + 1)/2, 2);
	}

	windVelocity(φ: number): {north: number, east: number} {
		return {north: ((Math.sin(φ) + 1)/2)*Math.cos(φ), east: 0};
	}

	xyz(place: Place): Vector { // rotate the surface in 3-space so the planet plot is more intuitive
		const {x, y, z} = super.xyz(place);
		return new Vector(x, z, -y);
	}

	normal(place: Place): Vector { // rotate the normal vectors too to match the xyz
		const {x, y, z} = super.normal(place);
		return new Vector(x, z, -y);
	}

	φλ(point: Vector): Place {
		return super.φλ(new Vector(point.x, -point.z, point.y));
	}
}
