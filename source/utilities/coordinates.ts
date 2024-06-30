/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

/**
 * something that can be dropped into an SVG <path>.
 * in addition to the basic SVG 'M', 'L', 'Z', 'A', etc., this also supports types of
 * long line, which are only defined on the surface, not on the map
 */
export interface PathSegment {
	type: string | LongLineType;
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
 * the direccion and shape of a long "strait" line
 */
export enum LongLineType {
	MERIDIAN, // along a constant longitude
	PARALLEL, // around a constant latitude
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
