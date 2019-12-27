// map.js: all of the cartographic code
'use strict';

const MAP_PRECISION = 0.1;


/**
 * a class to manage the plotting of points from a surface onto an SVG object.
 */
class MapProjection {
	constructor(surface) {
		this.surface = surface;
	}

	/**
	 * render the given polygon on the given SVG object in the given color. assumes the
	 * polygon to be widdershins; if the polygon is clockwise, it will fill in the area
	 * _outside_ it instead of inside it.
	 * @param polygon Array of Triangles, where the circumcenters are the points to map.
	 * @param svg SVG object, or one of the subgroup things that can also draw.
	 * @param color String or anything that can be passed to svg.js's functions.
	 */
	map(polygon, svg, color) {
		let segments = [];
		let jinPoints = [];
		for (const vertex of polygon) {
			const {u, v} = vertex.getCircumcenter();
			segments.push('L'); // start by collecting the input into a list of Strings
			jinPoints.push([u, v]); // of movement types and Arrays
		}

		let numX = 0;
		let indeX = null;
		for (let i = segments.length; i > 0; i --) { // sweep through the result
			const [u0, v0] = jinPoints[i-1];
			const [u1, v1] = jinPoints[i%segments.length];
			if (Math.abs(v1 - v0) > Math.PI) { // look for lines that cross the +/- pi border
				const pos0 = this.surface.xyz(u0, v0);
				const pos1 = this.surface.xyz(u1, v1);
				const posX = pos0.plus(pos1).times(1/2);
				const uX = this.surface.uv(posX.x, posX.y, posX.z).u;
				const vX = (v1 < v0) ? Math.PI : -Math.PI;
				numX += Math.sign(v0 - v1); // count the number of times it crosses east
				segments.splice(i, 0, 'L', 'M');
				jinPoints.splice(i, 0, [uX, vX], [uX, -vX]); // and break them up accordingly
				indeX = i + 1;
			}
		}

		if (indeX !== null) { // if we have a nonzero index of a break
			segments = segments.slice(indeX).concat(segments.slice(0, indeX)); // shift the array around to put it at the start
			jinPoints = jinPoints.slice(indeX).concat(jinPoints.slice(0, indeX));
		}
		else { // if there were no breaks
			segments.push(segments[0]); // add a path closure to the end
			jinPoints.push(jinPoints[0]);
			segments[0] = 'M'; // and change the beginning to a moveto
		}

		const cutPoints = [];
		for (const [u, v] of jinPoints) {
			const {x, y} = this.project(u, v); // project each point to the plane
			cutPoints.push([x, y]);
		}

		for (let i = 1; i < segments.length; i ++) { // sweep through the resulting polygon
			if (segments[i] === 'L') { // skipping the ones that aren't actually lines
				const [x0, y0] = cutPoints[i-1];
				const [x1, y1] = cutPoints[i];
				if (Math.hypot(x1 - x0, y1 - y0) > MAP_PRECISION) { // look for lines that are too long
					const [u0, v0] = jinPoints[i-1];
					const [u1, v1] = jinPoints[i];
					const midPos = this.surface.xyz(u0, v0).plus(
						this.surface.xyz(u1, v1)).times(1 / 2); // and split them in half
					const {u, v} = this.surface.uv(midPos.x, midPos.y, midPos.z);
					const {x, y} = this.project(u, v);
					segments.splice(i, 0, 'L');
					jinPoints.splice(i, 0, [u, v]); // add the midpoints to the polygon
					cutPoints.splice(i, 0, [x, y]);
					i --; // and check again
				}
			}
		}

		if (numX === 1) { // now, if it circumnavigated east,
			const [poleSegments, polePoints] = this.mapNorthPole(); // then it circled the North Pole
			segments.push(...poleSegments); // add whatever element is needed to deal with that
			cutPoints.push(...polePoints);
		}
		else if (numX === -1) { // if it circumnavigated west,
			const [poleSegments, polePoints] = this.mapSouthPole(); // then it circled the South Pole
			segments.push(...poleSegments); // do what you need to do
			cutPoints.push(...polePoints);
		}
		else if (numX !== 0) { // beware of polygons that circumnavigate multiple times
			throw "we no pologon!"; // because that would be geometrically impossible
		}

		let str = ''; // finally, put it in the <path>
		for (let i = 0; i < segments.length; i ++)
			str += segments[i] + cutPoints[i].join() + ' ';
		svg.path(str).fill(color);
	}

	/**
	 * transform the given parametric coordinates to Cartesian ones.
	 */
	project(u, v) {
		throw "unimplemented";
	}

	/**
	 * generate some <path> segments to compensate for something circling the North Pole.
	 * @return Array containing [Array of String, Array of Array]
	 */
	mapNorthPole() {
		throw "unimplemented";
	}

	/**
	 * generate some <path> segments to compensate for something circling the South Pole.
	 * @return Array containing [Array of String, Array of Array]
	 */
	mapSouthPole() {
		throw "unimplemented";
	}
}


class Azimuthal extends MapProjection {
	constructor(surface, svg) {
		super(surface, svg);
	}

	project(u, v) {
		const p = linterp(u, this.surface.refLatitudes, this.surface.cumulDistances);
		const r = 1 - p/this.surface.height;
		return {x: r*Math.sin(v), y: r*Math.cos(v)};
	}

	mapNorthPole() {
		return [[], []];
	}

	mapSouthPole() {
		return [
			['M',     'A',                   'A'],
			[[0, -1], [1, 1, 0, 1, 0, 0, 1], [1, 1, 0, 1, 0, 0, -1]]];
	}
}
