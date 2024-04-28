/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Spheroid} from "./spheroid.js";
import {Vector} from "../utilities/geometry.js";
import {Tile, Vertex} from "./surface.js";
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

	insolation(ф: number): number {
		return 2.0*Math.max(0, Math.sin(ф));
	}

	hasSeasons(_: number): boolean {
		return false;
	}

	windConvergence(ф: number): number {
		return Math.cos(ф);
	}

	windVelocity(ф: number): {north: number, east: number} {
		return {north: -Math.cos(ф), east: 0};
	}

	xyz(place: Place): Vector {
		const {x, y, z} = super.xyz(place);
		return new Vector(x, z, -y);
	}

	фλ(point: Vector): Place {
		return super.фλ(new Vector(point.x, -point.z, point.y));
	}

	normal(tile: Tile | Vertex): Vector {
		return tile.pos.over(this.radius);
	}
}
