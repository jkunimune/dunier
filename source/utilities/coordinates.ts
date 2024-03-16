/*
 * MIT License
 * 
 * Copyright (c) 2022 Justin Kunimune
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
