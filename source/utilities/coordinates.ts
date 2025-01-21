/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

/**
 * something that can be dropped into an SVG <path>.
 * each of these can be defined either on a geographical surface or on a Cartesian plane.
 */
export interface PathSegment {
	/**
	 * the one-letter code for what kind of segment this is. one of:
	 * - 'M' - movement without drawing anything
	 * - 'L' - straight line in equirectangular space that may wrap around if the coordinate system is periodic
	 * - 'Z' - straight line to the last 'M' location
	 * - 'A' - arc (not valid unless the coordinate system is Cartesian)
	 * - 'Q' - quadratic Bezier curve that may wrap around like a line
	 * - 'Φ' - line of constant latitude that does not wrap around but instead progresses monotonically in longitude
	 * - 'Λ' - line of constant longitude that does not wrap around but instead progresses monotonically in latitude
	 */
	type: string;

	/**
	 * the arguments that specify the movement.  usually it's just two numbers for
	 * either the latitude and longitude of the destination, or the x and y of the
	 * destination, depending on whether the coordinate system is geographic or Cartesian.
	 * if the type is 'Q' then there's a control point first, and if it's 'A' there's a
	 * bunch of additional numbers (see the SVG docs).
	 */
	args: number[];
}

/**
 * the specification of a point in a generalized 2D coordinate system
 */
export interface Location {
	/** the first coordinate (either x or latitude depending on context) */
	s: number;
	/** the twoth coordinate (either y or longitude depending on context) */
	t: number;
}

/**
 * the specification of a point on a plane in Cartesian coordinates
 */
export interface Point {
	/** the horizontal coordinate in kilometers */
	x: number;
	/** the vertical coordinate, increasing downward, in kilometers */
	y: number;
}

/**
 * the specification of a point on a Surface in geographical coordinates
 */
export interface Place {
	/** the latitude in radians */
	ф: number;
	/** the longitude in radians */
	λ: number;
}

/**
 * extract the endpoint from a segment (i.e. the last two args)
 */
export function endpoint(segment: PathSegment): Location {
	const args = segment.args;
	return { s: args[args.length - 2], t: args[args.length - 1] };
}

/**
 * cast the generalized coordinate pair to cartesian, so that it can be passed to
 * cartesian-specific functions
 * @param location
 */
export function assert_xy(location: Location): Point {
	return { x: location.s, y: location.t };
}

/**
 * cast the generalized coordinate pair to geographic, so that it can be passed to
 * geographic functions
 * @param location
 */
export function assert_фλ(location: Location): Place {
	return { ф: location.s, λ: location.t };
}
