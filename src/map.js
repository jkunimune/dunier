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
		let jinPoints = [];
		for (const vertex of polygon) {
			const {u, v} = vertex.getCircumcenter();
			jinPoints.push({type: 'L', args: [u, v]}); // start by collecting the input into a list of segments
		}

		let numX = 0;
		let indeX = null;
		for (let i = jinPoints.length; i > 0; i --) { // sweep through the result
			const [u0, v0] = jinPoints[i-1].args;
			const [u1, v1] = jinPoints[i%jinPoints.length].args;
			if (Math.abs(v1 - v0) > Math.PI) { // look for lines that cross the +/- pi border
				const pos0 = this.surface.xyz(u0, v0);
				const pos1 = this.surface.xyz(u1, v1);
				const posX = pos0.plus(pos1).over(2);
				const uX = this.surface.uv(posX.x, posX.y, posX.z).u;
				const vX = (v1 < v0) ? Math.PI : -Math.PI;
				numX += Math.sign(v0 - v1); // count the number of times it crosses east
				jinPoints.splice(i, 0,
					{type: 'L', args: [uX, vX]}, {type: 'M', args: [uX, -vX]}); // and break them up accordingly
				indeX = i + 1;
			}
		}

		if (indeX !== null) // if we have an index of a break
			jinPoints = jinPoints.slice(indeX).concat(jinPoints.slice(0, indeX)); // shift the array around to put it at the start
		else // if there were no breaks
			jinPoints.push({...jinPoints[0]}); // add a path closure to the end
		jinPoints[0].type = 'M'; // ensure the beginning is a moveto

		const cutPoints = [];
		for (const {type, args} of jinPoints) {
			const [u, v] = args;
			const {x, y} = this.project(u, v); // project each point to the plane
			cutPoints.push({type: type, args: [x, y]});
		}

		for (let i = 1; i < jinPoints.length; i ++) { // sweep through the resulting polygon
			if (jinPoints[i].type === 'L') { // skipping the ones that aren't actually lines
				const [x0, y0] = cutPoints[i-1].args;
				const [x1, y1] = cutPoints[i].args;
				if (Math.hypot(x1 - x0, y1 - y0) > MAP_PRECISION) { // look for lines that are too long
					const [u0, v0] = jinPoints[i-1].args;
					const [u1, v1] = jinPoints[i].args;
					const midPos = this.surface.xyz(u0, v0).plus(
						this.surface.xyz(u1, v1)).over(2); // and split them in half
					const {u, v} = this.surface.uv(midPos.x, midPos.y, midPos.z);
					const {x, y} = this.project(u, v);
					jinPoints.splice(i, 0, {type: 'L', args: [u, v]}); // add the midpoints to the polygon
					cutPoints.splice(i, 0, {type: 'L', args: [x, y]});
					i --; // and check again
				}
			}
		}

		if (numX === 1) // now, if it circumnavigated east, then it circled the North Pole
			cutPoints.push(...this.mapNorthPole()); // add whatever element is needed to deal with that
		else if (numX === -1) // if it circumnavigated west, then it circled the South Pole
			cutPoints.push(...this.mapSouthPole()); // do what you need to do
		else if (numX !== 0) // beware of polygons that circumnavigate multiple times
			throw "we no pologon!"; // because that would be geometrically impossible

		let str = ''; // finally, put it in the <path>
		for (let i = 0; i < cutPoints.length; i ++)
			str += cutPoints[i].type + cutPoints[i].args.join(',') + ' ';
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
		return [];
	}

	mapSouthPole() {
		return [
			{type: 'M', args: [0, -1]},
			{type: 'A', args: [1, 1, 0, 1, 0, 0, 1]},
			{type: 'A', args: [1, 1, 0, 1, 0, 0, -1]}];
	}
}
