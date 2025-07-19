/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {assert_xy, endpoint, PathSegment} from "./coordinates.js";
import {
	decimate,
	removeHoles
} from "../mapping/pathutilities.js";
import {angleSign, arcCenter} from "./geometry.js";

/**
 * take a closed SVG path and generate another one that encloses the same space that the input path encloses,
 * plus all of the points within a certain distance of it.
 * the resulting path won't necessarily be nice; there may be a lot of self-intersection.
 * but if you just use a nonzero fill winding it _will_ contain the correct set of points.
 * @param path the shape to be offset.  it may have multiple parts, but it must be closed.
 * @param offset the distance.
 */
export function offset(path: PathSegment[], offset: number): PathSegment[] {
	// first, discard any detail that will be lost when we turn everything into arcs
	path = decimate(path, offset/6);
	// remove holes, because this algorithm doesn't necessarily work when there are holes
	path = removeHoles(path);
	// then switch to our fancy new arc notation
	path = parameterize(path);

	// then break it up into however many separate sections there are
	const ogSections: PathSegment[][] = [];
	let i = null;
	for (let j = 0; j <= path.length; j ++) {
		if (j >= path.length || path[j].type === 'M') {
			if (i !== null) {
				const start = endpoint(path[i]);
				const end = endpoint(path[j - 1]);
				if (start.s !== end.s || start.t !== end.t)
					throw new Error("I can't currently offset curves that aren't closed.");
				ogSections.push(path.slice(i, j));
			}
			i = j;
		}
	}

	// now, go thru each segment of each section and do the actual offsetting
	const offSections: PathSegment[][] = [];
	for (const ogSection of ogSections) {
		const offSection: PathSegment[] = [];
		for (let i = 1; i < ogSection.length; i++) {

			// put down the offset version of this segment
			const vertex = assert_xy(endpoint(ogSection[i]));
			let offsetVertex1;
			if (ogSection[i].type === 'L') {
				const start = assert_xy(endpoint(ogSection[i - 1]));
				const length = Math.hypot(vertex.x - start.x, vertex.y - start.y);
				const normal = {
					x: (start.y - vertex.y)/length,
					y: (vertex.x - start.x)/length,
				};
				offsetVertex1 = {
					x: vertex.x + offset*normal.x,
					y: vertex.y + offset*normal.y,
				};
				offSection.push({type: 'L', args: [offsetVertex1.x, offsetVertex1.y]});
			}
			else if (ogSection[i].type === 'A*') {
				const [radius, xC, yC, x, y] = ogSection[i].args;
				offsetVertex1 = {
					x: x + offset/radius*(x - xC),
					y: y + offset/radius*(y - yC),
				};
				offSection.push({type: 'A*', args: [
					Math.abs(radius + offset)*Math.sign(radius),
					xC, yC,
					offsetVertex1.x, offsetVertex1.y,
				]});
			}
			else
				throw new Error(`offset() is not implemented for '${ogSection[i].type}'-type segments.`);

			// calculate the start-point of the offset version of the next segment
			const iPlus1 = i%(ogSection.length - 1) + 1;
			let offsetVertex2;
			if (ogSection[iPlus1].type === 'L') {
				const start = assert_xy(endpoint(ogSection[i]));
				const end = assert_xy(endpoint(ogSection[iPlus1]));
				const length = Math.hypot(end.x - start.x, end.y - start.y);
				const normal = {
					x: (start.y - end.y)/length,
					y: (end.x - start.x)/length,
				};
				offsetVertex2 = {
					x: start.x + offset*normal.x,
					y: start.y + offset*normal.y,
				};
			}
			else if (ogSection[iPlus1].type === 'A*') {
				const [radius, xC, yC, , ] = ogSection[iPlus1].args;
				offsetVertex2 = {
					x: vertex.x + offset/radius*(vertex.x - xC),
					y: vertex.y + offset/radius*(vertex.y - yC),
				};
			}
			else
				throw new Error(`offset() is not implemented for '${ogSection[i].type}'-type segments.`);

			// put down the arc linking this segment and the next
			if (offsetVertex1.x !== offsetVertex2.x || offsetVertex1.y !== offsetVertex2.y) {
				const isConvex = angleSign(offsetVertex1, vertex, offsetVertex2) > 0;
				offSection.push({type: 'A*', args: [
					isConvex ? offset : -offset,
					vertex.x, vertex.y,
					offsetVertex2.x, offsetVertex2.y,
				]});
			}
		}

		// finally, add the initial M
		const start = assert_xy(endpoint(offSection[offSection.length - 1]));
		offSection.splice(0, 0, {type: 'M', args: [start.x, start.y]});
		offSections.push(offSection);
	}

	// put it all back together and change back to regular arc notation before returning it
	return deparameterize([].concat(...offSections));
}


/**
 * return a copy of this path where you've converted all of the 'A' commands to 'A*'.
 * 'A*' is a special command defined just in this file that represents an arc,
 * but rather than the standard SVG arc arguments, its arguments are
 * [signed_radius, x_center, y_center, x_1, y_1].
 */
function parameterize(path: PathSegment[]): PathSegment[] {
	const output = [];
	for (let i = 0; i < path.length; i ++) {
		if (path[i].type === 'A') {
			const start = assert_xy(endpoint(path[i - 1]));
			const [rx, ry, , largeArcFlag, sweepFlag, xEnd, yEnd] = path[i].args;
			const r = (sweepFlag === 0) ?
				(rx + ry)/2 :
				-(rx + ry)/2;
			const center = arcCenter(start, {x: xEnd, y: yEnd}, Math.abs(r), largeArcFlag !== sweepFlag);
			output.push({
				type: 'A*', args: [r, center.x, center.y, xEnd, yEnd],
			});
		}
		else
			output.push(path[i]);
	}
	return output;
}

/**
 * return a copy of this path where you've converted all of the 'A*' commands back to regular 'A'.
 */
function deparameterize(path: PathSegment[]): PathSegment[] {
	const output = [];
	for (let i = 0; i < path.length; i ++) {
		if (path[i].type === 'A*') {
			const start = assert_xy(endpoint(path[i - 1]));
			let [r, xCenter, yCenter, xEnd, yEnd] = path[i].args;
			let largeArc = angleSign(start, {x: xCenter, y: yCenter}, {x: xEnd, y: yEnd}) < 0;
			let sweepFlag;
			if (r < 0) {
				r = Math.abs(r);
				largeArc = !largeArc;
				sweepFlag = 1;
			}
			else
				sweepFlag = 0;
			output.push({
				type: 'A', args: [r, r, 0, largeArc ? 1 : 0, sweepFlag, xEnd, yEnd],
			});
		}
		else
			output.push(path[i]);
	}
	return output;
}
