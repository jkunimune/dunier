// map.js: all of the cartographic code
'use strict';

const MAP_PRECISION = 1/6;
const RELIEF_HEIGHT = 3e-2;
const SUN_DIRECTION = new Vector(1, 2, 4).norm();


/**
 * create an ordered Iterator of triangles that form the boundary of this.
 * @param nodes Set of Node that are part of this group.
 * @return Array of {type: String, args: [Number, Number]} that represents the
 * boundary as a series of Path segments, ordered widdershins.
 */
function trace(nodes) {
	if (!(nodes instanceof Set)) // first, cast this to a Set
		nodes = new Set(nodes); // we're going to be making a _lot_ of calls to Set.has()

	const accountedFor = new Set(); // keep track of which Edge have been done
	const output = [];
	for (let ind of nodes) { // look at every included node
		for (let way of ind.neighbors.keys()) { // and every node adjacent to an included one
			if (nodes.has(way))    continue; // (really we only care about excluded way)
			let edge = ind.neighbors.get(way);
			if (accountedFor.has(edge)) continue; // (and can ignore edges we've already hit)

			const loopIdx = output.length;
			const start = edge; // the edge between them defines the start of the loop
			do {
				const next = ind.leftOf(way); // look for the next triangle, going widdershins
				const vertex = next.getCircumcenter(); // pick out its circumcenter to plot
				output.push({type: 'L', args: [vertex.φ, vertex.λ]}); // make the Path segment
				accountedFor.add(edge); // check this edge off
				if (nodes.has(next.acrossFrom(edge))) // then, depending on the state of the Node after that Triangle
					ind = next.acrossFrom(edge); // advance one of the state nodes
				else
					way = next.acrossFrom(edge);
				edge = ind.neighbors.get(way); // and update edge
			} while (edge !== start); // continue for the full loop

			output[loopIdx].type = 'M'; // whenever a loop ends, set its beginning to a moveTo
			output.push({type: 'L', args: [...output[loopIdx].args]}); // and add closure
		}
	}

	return output;
}


/**
 * a class to handle all of the graphical arrangement stuff.
 */
class Chart {
	constructor(projection) {
		this.projection = projection;
	}

	/**
	 * draw a region of the world on the map with the given color.
	 * @param nodes Iterator of Node to be colored in.
	 * @param svg SVG object on which to put the Path.
	 * @param color String that HTML can interpret as a color.
	 * @return Path the newly created element encompassing these triangles.
	 */
	fill(nodes, svg, color) {
		if (nodes.length <= 0)
			return null;
		return this.map(trace(nodes), svg).fill(color);
	}

	/**
	 * create a relief layer for the given set of triangles.
	 * @param triangles Array of Triangle to shade.
	 * @param svg SVG object on which to shade.
	 * @param attr String name of attribute to base the relief on.
	 */
	shade(triangles, svg, attr) {
		if (!triangles)
			return;

		let terrainHeight = 0; // start by normalizing the terrain
		for (const triangle of triangles)
			for (const node of triangle.vertices)
				if (node[attr] > terrainHeight)
					terrainHeight = node[attr]; // to its highest value

		for (const triangle of triangles) { // for each triangle
			const p2 = [], p3 = [];
			for (const node of triangle.vertices) {
				const {x, y} = this.projection.project(node.φ, node.λ);
				const z = Math.max(0, node[attr])/terrainHeight*RELIEF_HEIGHT;
				p2.push({type: 'L', args: [node.φ, node.λ]}); // put its values in a plottable form
				p3.push(new Vector(x, -y, z)); // and also compute its 3d position
			}
			p2[0].type = 'M';
			p2.push({type: 'L', args: [...p2[0].args]});
			let n = p3[1].minus(p3[0]).cross(p3[2].minus(p3[0])).norm(); // use the 3d positions to get a normal direction
			if (n.z < 0)    n = n.times(-1); // (occasionally these can end up upside down)
			const brightness = Math.max(0, n.dot(SUN_DIRECTION)); // and use that to get a brightness
			this.map(p2, svg).fill({color: '#000', opacity: 1-brightness});
		}
	}

	map(segments, svg) {
		let jinPoints = segments;

		let loopIdx = jinPoints.length;
		let krusIdx = null;
		for (let i = jinPoints.length-1; i >= 0; i --) { // sweep through the result
			if (jinPoints[i].type === 'L') { // look for lines
				const [φ0, λ0] = jinPoints[i-1].args;
				const [φ1, λ1] = jinPoints[i].args;
				if (Math.abs(λ1 - λ0) > Math.PI) { // that cross the +/- pi border
					const φX = this.projection.getCrossing(φ0, λ0, φ1, λ1, Math.PI).φ; // estimate the place where it crosses
					const λX = (λ1 < λ0) ? Math.PI : -Math.PI;
					jinPoints.splice(i, 0,
						{type: 'L', args: [φX, λX]}, {type: 'M', args: [φX, -λX]}); // and break them up accordingly
					loopIdx += 2; // be sure to change loopIdx to keep it in sync with the array
					krusIdx = i + 1; // remember this crossing
				}
			}
			else if (jinPoints[i].type === 'M') { // look for existing breaks in the Path
				if (krusIdx != null) { // if this map made a break in it, as well,
					jinPoints = jinPoints.slice(0, i)
						.concat(jinPoints.slice(krusIdx, loopIdx))
						.concat(jinPoints.slice(i+1, krusIdx))
						.concat(jinPoints.slice(loopIdx)); // then we'll want to rearrange this loop and cut out that moveto
				}
				krusIdx = null; // reset for the next loop
				loopIdx = i; // which starts now
			}
			else {
				throw "am. halow.";
			}
		}

		const cutPoints = [];
		for (const {type, args} of jinPoints) {
			const [φ, λ] = args;
			const {x, y} = this.projection.project(φ, λ); // project each point to the plane
			cutPoints.push({type: type, args: [x, y]});
		}

		for (let i = 1; i < jinPoints.length; i ++) { // sweep through the resulting polygon
			if (jinPoints[i].type === 'L') { // skipping the ones that aren't actually lines
				const [x0, y0] = cutPoints[i-1].args;
				const [x1, y1] = cutPoints[i].args;
				if (Math.hypot(x1 - x0, y1 - y0) > MAP_PRECISION) { // look for lines that are too long
					const [φ0, λ0] = jinPoints[i-1].args;
					const [φ1, λ1] = jinPoints[i].args;
					const {φ, λ} = this.projection.getMidpoint(φ0, λ0, φ1, λ1); // and split them in half
					const {x, y} = this.projection.project(φ, λ);
					jinPoints.splice(i, 0, {type: 'L', args: [φ, λ]}); // add the midpoints to the polygon
					cutPoints.splice(i, 0, {type: 'L', args: [x, y]});
					i --; // and check again
				}
			}
		}

		let λTest = null;
		let maxNordi = Number.NEGATIVE_INFINITY;
		let maxSudi = Number.POSITIVE_INFINITY;
		let enclosesNP = null;
		let enclosesSP = null;
		for (let i = 1; i < jinPoints.length; i ++) {
			if (jinPoints[i].type === 'L') { // examine the lines
				const [φ0, λ0] = jinPoints[i-1].args;
				const [φ1, λ1] = jinPoints[i].args;
				if (λTest == null)
					λTest = (λ0 + λ1)/2; // choose a longitude (0 or pi would be easiest, but the curve doesn't always cross those)
				if (λ0 < λTest !== λ1 < λTest) { // look for segments that cross that longitude
					const φX = this.projection.getCrossing(φ0, λ0, φ1, λ1, λTest).φ;
					if (φX > maxNordi) { // the northernmost one will tell us
						maxNordi = φX;
						enclosesNP = λ1 > λ0; // if the North Pole is enclosed
					}
					if (φX < maxSudi) { // the southernmost one will tell us
						maxSudi = φX;
						enclosesSP = λ1 < λ0; // if the South Pole is enclosed
					}
				}
			}
		}
		if (enclosesNP)
			cutPoints.push(...this.projection.mapNorthPole()); // add whatever adjustments are needed to account for singularities
		if (enclosesSP)
			cutPoints.push(...this.projection.mapSouthPole());

		let str = ''; // finally, put it in the <path>
		for (let i = 0; i < cutPoints.length; i ++)
			str += cutPoints[i].type + cutPoints[i].args.join(',') + ' ';
		return svg.path(str);
	}
}


/**
 * a class to manage the plotting of points from a Surface onto a plane.
 */
class MapProjection {
	constructor(surface) {
		this.surface = surface;
	}

	/**
	 * compute the coordinates of the midpoint between these two lines.
	 * @param φ0
	 * @param λ0
	 * @param φ1
	 * @param λ1
	 * @return {{φ: number, λ: number}}
	 */
	getMidpoint(φ0, λ0, φ1, λ1) {
		const pos0 = this.surface.xyz(φ0, λ0);
		const pos1 = this.surface.xyz(φ1, λ1);
		const posM = pos0.plus(pos1).over(2);
		return this.surface.φλ(posM.x, posM.y, posM.z);
	}

	/**
	 * compute the coordinates at which the line between these two points crosses the
	 * plane defined by the longitude λX.
	 * @param φ0
	 * @param λ0
	 * @param φ1
	 * @param λ1
	 * @param λX
	 * @return {{φ: number, λ: number}}
	 */
	getCrossing(φ0, λ0, φ1, λ1, λX) {
		const pos0 = this.surface.xyz(φ0, λ0-λX);
		const pos1 = this.surface.xyz(φ1, λ1-λX);
		const posX = pos0.times(pos1.x).plus(pos1.times(-pos0.x)).over(
			pos1.x - pos0.x);
		const φX = this.surface.φλ(posX.x, posX.y, posX.z).φ;
		return {φ: φX, λ: λX};
	}

	/**
	 * transform the given parametric coordinates to Cartesian ones.
	 */
	project(φ, λ) {
		throw "unimplemented";
	}

	/**
	 * generate some <path> segments to compensate for something enclosing the north pole.
	 * @return Array containing [Array of String, Array of Array]
	 */
	mapNorthPole() {
		throw "unimplemented";
	}

	/**
	 * generate some <path> segments to compensate for something enclosing the south pole.
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

	project(φ, λ) {
		const p = linterp(φ, this.surface.refLatitudes, this.surface.cumulDistances);
		const r = 1 - p/this.surface.height;
		return {x: r*Math.sin(λ), y: r*Math.cos(λ)};
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
