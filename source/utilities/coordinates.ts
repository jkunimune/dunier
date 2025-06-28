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
export interface Point {
	/** the first coordinate (either x or latitude depending on context) */
	s: number;
	/** the twoth coordinate (either y or longitude depending on context) */
	t: number;
}

/**
 * the specification of a point on a plane in Cartesian coordinates
 */
export interface XYPoint {
	/** the horizontal coordinate in kilometers */
	x: number;
	/** the vertical coordinate, increasing downward, in kilometers */
	y: number;
}

/**
 * the specification of a point on a Surface in geographical coordinates
 */
export interface ΦΛPoint {
	/** the latitude in radians */
	φ: number;
	/** the longitude in radians */
	λ: number;
}

/**
 * extract the endpoint from a segment (i.e. the last two args)
 */
export function endpoint(segment: PathSegment): Point {
	const args = segment.args;
	return { s: args[args.length - 2], t: args[args.length - 1] };
}

/**
 * rename this point's coordinates from s and t to x and y, so that it can be passed to
 * cartesian-specific functions
 */
export function assert_xy(location: Point): XYPoint {
	return { x: location.s, y: location.t };
}

/**
 * rename this point's coordinates from x and y to s and t, so that it can be passed to
 * generic functions
 * @param location
 */
export function generic(location: XYPoint): Point {
	return { s: location.x, t: location.y };
}

/**
 * rename this point's coordinates from s and t to φ and λ, so that it can be passed to
 * geographic functions
 */
export function assert_φλ(location: Point): ΦΛPoint {
	return { φ: location.s, λ: location.t };
}
