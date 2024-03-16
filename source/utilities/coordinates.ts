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
 * Generalized 2D location specification
 */
export interface Location {
	s: number;
	t: number;
}

/**
 * Cartesian 2D location specification
 */
export interface Point {
	x: number;
	y: number;
}

/**
 * Similar to a Vector but in spherical coordinates
 */
export interface Place {
	ф: number;
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
 * cast the generalized coordinate pair to cartesian, so that it can be passd to
 * cartesian-specific functions
 * @param location
 */
export function assert_xy(location: Location): Point {
	return { x: location.s, y: location.t };
}

/**
 * cast the generalized coordinate pair to geographic, so that it can be passd to
 * geographic functions
 * @param location
 */
export function assert_фλ(location: Location): Place {
	return { ф: location.s, λ: location.t };
}
