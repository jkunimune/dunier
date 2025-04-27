/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Spheroid} from "./spheroid.js";
import {Vector} from "../utilities/geometry.js";
import {ΦΛPoint} from "../utilities/coordinates.js";

/**
 * a non-rotating spheroid. aspectRatio = 1, and latitude is measured in the -y direction
 * rather than the +z.
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
		return 2.0*Math.max(0, -Math.sin(φ)); // note: the sun is at the minimum latitude, so that maps by default point away from the sun
	}

	hasSeasons(_: number): boolean {
		return false;
	}

	windConvergence(φ: number): number {
		return Math.pow((1 - Math.sin(φ))/2, 2);
	}

	windVelocity(φ: number): {north: number, east: number} {
		return {north: ((1 - Math.sin(φ))/2)*Math.cos(φ), east: 0};
	}

	xyz(place: ΦΛPoint): Vector { // rotate the surface in 3-space so the planet plot is more intuitive
		const {x, y, z} = super.xyz(place);
		return new Vector(x, -z, y);
	}

	normal(place: ΦΛPoint): Vector { // rotate the normal vectors too to match the xyz
		const {x, y, z} = super.normal(place);
		return new Vector(x, -z, y);
	}

	north(place: ΦΛPoint): Vector { // rotate the tangent vectors too to match the new normal
		const {x, y, z} = super.north(place);
		return new Vector(x, -z, y);
	}

	φλ(point: Vector): ΦΛPoint {
		return super.φλ(new Vector(point.x, point.z, -point.y));
	}
}
