/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Surface} from "../surface/surface.js";
import {
	PathSegment,
	Place,
	Point
} from "../utilities/coordinates.js";


/**
 * a class to manage the plotting of points from a Surface onto a plane.
 */
export abstract class MapProjection {
	public readonly surface: Surface;
	/** whether this projection is continuous at the antimeridian */
	public readonly wrapsAround: boolean;

	protected constructor(surface: Surface, wrapsAround: boolean) {
		this.surface = surface;
		this.wrapsAround = wrapsAround;
	}

	/**
	 * transform the given parametric coordinates to Cartesian ones.
	 * @param point the latitude and longitude in radians, in the range [-π, π]
	 * @return the x and y coordinates in km
	 */
	abstract projectPoint(point: Place): Point

	/**
	 * generate some <path> segments to trace a line of constant latitude between two longitudes
	 * @param ф the relative latitude in radians
	 * @param _λ0 the relative starting longitude in the range [-π, π]
	 * @param λ1 the relative ending longitude in the range [-π, π]
	 * @return the Cartesian path in km
	 */
	projectParallel(_λ0: number, λ1: number, ф: number): PathSegment[] {
		const {x, y} = this.projectPoint({ф: ф, λ: λ1});
		return [{type: 'L', args: [x, y]}];
	}

	/**
	 * generate some <path> segments to trace a line of constant longitude between two latitudes
	 * @param _ф0 the relative starting latitude in radians
	 * @param ф1 the relative ending latitude in radians
	 * @param λ the relative longitude in the range [-π, π]
	 * @return the Cartesian path in km
	 */
	projectMeridian(_ф0: number, ф1: number, λ: number): PathSegment[] {
		const {x, y} = this.projectPoint({ф: ф1, λ: λ});
		return [{type: 'L', args: [x, y]}];
	}

}
