// map.ts: all of the cartographic code

import {Nodo, Place, Surface, Triangle, Vector} from "./surface.js";
import {linterp} from "./utils.js";

const MAP_PRECISION = 1/6;
const SUN_ELEVATION = 60/180*Math.PI;
const AMBIENT_LIGHT = 0.2;


/**
 * create an ordered Iterator of segments that form all of these lines, aggregating where applicable.
 * aggregation may behave unexpectedly if some members of lines contain nonendpoints that are endpoints of others.
 * @param lines Set of lists of points to be combined and pathified.
 */
function trace(lines: Iterable<Place[]>): PathSegment[] {
	const queue = [...lines];
	const consolidated: Set<Place[]> = new Set(); // first, consolidate
	const heads: Map<Place, Place[][]> = new Map(); // map from points to [lines beginning with endpoint]
	const tails: Map<Place, Place[][]> = new Map(); // map from points endpoints to [lines ending with endpoint]
	const torsos: Map<Place, {containing: Place[], index: number}> = new Map(); // map from midpoints to line containing midpoint
	while (queue.length > 0) {
		for (const l of consolidated) {
			if (!heads.has(l[0]) || !tails.has(l[l.length - 1]))
				throw Error("up top!");
			if (torsos.has(l[0]) || torsos.has(l[l.length - 1]))
				throw Error("up slightly lower!");
		}
		let line = queue.pop(); // check each given line
		const head = line[0], tail = line[line.length-1];
		consolidated.add(line); // add it to the list
		if (!heads.has(head))  heads.set(head, []); // and connect it to these existing sets
		heads.get(head).push(line);
		if (!tails.has(tail))  tails.set(tail, []);
		tails.get(tail).push(line);
		for (let i = 1; i < line.length - 1; i ++)
			torsos.set(line[i], {containing: line, index: i});

		for (const l of consolidated)
			if (!heads.has(l[0]) || !tails.has(l[l.length-1]))
				throw Error("that was quick.");

		for (const endpoint of [head, tail]) { // first, on either end...
			if (torsos.has(endpoint)) { // does it run into the middle of another?
				const {containing, index} = torsos.get(endpoint); // then that one must be cut in half
				const fragment = containing.slice(index);
				containing.splice(index + 1);
				consolidated.add(fragment);
				if (endpoint === head)  tails.set(endpoint, []);
				else                    heads.set(endpoint, []);
				heads.get(endpoint).push(fragment);
				tails.get(endpoint).push(containing);
				tails.get(fragment[fragment.length-1])[tails.get(fragment[fragment.length-1]).indexOf(containing)] = fragment;
				torsos.delete(endpoint);
				for (let i = 1; i < fragment.length - 1; i ++)
					torsos.set(fragment[i], {containing: fragment, index: i});
			}
		}

		for (const l of consolidated) {
			if (!heads.has(l[0]) || !tails.has(l[l.length - 1]))
				throw Error(`i broke it ${l[0].φ} -> ${l[l.length-1].φ}`);
			if (torsos.has(l[0]) || torsos.has(l[l.length - 1]))
				throw Error(`yoo broke it! ${l[0].φ} -> ${l[l.length-1].φ}`);
		}

		if (tails.has(head)) { // does its beginning connect to another?
			if (heads.get(head).length === 1 && tails.get(head).length === 1) // if these fit together exclusively
				line = combine(tails.get(head)[0], line); // put them together
		}
		if (heads.has(tail)) { // does its end connect to another?
			if (heads.get(tail).length === 1 && tails.get(tail).length === 1) // if these fit together exclusively
				line = combine(line, heads.get(tail)[0]); // put them together
		}
	}

	function combine(a, b) {
		consolidated.delete(b); // delete b
		heads.delete(b[0]);
		tails.delete(b[0]);
		tails.get(b[b.length-1])[tails.get(b[b.length-1]).indexOf(b)] = a; // repoint the tail reference from b to a
		for (let i = 1; i < b.length; i ++) { // add b's elements to a
			torsos.set(b[i-1], {containing: a, index: a.length - 1});
			a.push(b[i]);
		}
		return a;
	}

	let output = [];
	for (const line of consolidated) { // then do the conversion
		output.push({type: 'M', args: [line[0].φ, line[0].λ]});
		for (let i = 1; i < line.length; i ++)
			output.push({type: 'L', args: [line[i].φ, line[i].λ]});
	}
	return output;
}

/**
 * create an ordered Iterator of segments that form the boundary of this.
 * @param nodos Set of Node that are part of this group.
 * @return Array of PathSegments, ordered widdershins.
 */
function outline(nodos: Set<Nodo>): PathSegment[] {
	const accountedFor = new Set(); // keep track of which Edge have been done
	const output = [];
	for (let ind of nodos) { // look at every included node
		for (let way of ind.neighbors.keys()) { // and every node adjacent to an included one
			if (nodos.has(way))    continue; // (really we only care about excluded way)
			let edge = ind.neighbors.get(way);
			if (accountedFor.has(edge)) continue; // (and can ignore edges we've already hit)

			const loopIdx = output.length;
			const start = edge; // the edge between them defines the start of the loop
			do {
				const next = ind.leftOf(way); // look for the next triangle, going widdershins
				const vertex = next.circumcenter; // pick out its circumcenter to plot
				output.push({type: 'L', args: [vertex.φ, vertex.λ]}); // make the Path segment
				accountedFor.add(edge); // check this edge off
				if (nodos.has(next.acrossFrom(edge))) // then, depending on the state of the Node after that Triangle
					ind = next.acrossFrom(edge); // advance one of the state nodos
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
 * something that can be dropped into an SVG <path>.
 */
interface PathSegment {
	type: string;
	args: number[];
}


/**
 * a class to handle all of the graphical arrangement stuff.
 */
export class Chart {
	private projection: MapProjection;


	constructor(projection: MapProjection) {
		this.projection = projection;
	}

	/**
	 * draw a region of the world on the map with the given color.
	 * @param nodos Iterator of Node to be colored in.
	 * @param svg SVG object on which to put the Path.
	 * @param color String that HTML can interpret as a color.
	 * @param strokeWidth the width of the outline to put around it (will match fill color).
	 * @param smooth whether to apply Bezier smoothing to the outline
	 * @return Path the newly created element encompassing these triangles.
	 */
	// @ts-ignore
	fill(nodos: Nodo[], svg: SVG.Container, color: string, strokeWidth: number = 0, smooth: boolean = false): SVG.Element {
		if (nodos.length <= 0)
			return null;
		return this.map(outline(new Set(nodos)), svg, smooth, true)
			.fill(color).stroke({color: color, width: strokeWidth, linejoin: 'round'});
	}

	/**
	 * draw a series of lines on the map with the giver color.
	 * @param strokes the Iterable of lists of points to connect and draw.
	 * @param svg SVG object on which to put the Path.
	 * @param color String that HTML can interpret as a color.
	 * @param width the width of the stroke
	 * @param smooth whether to apply Bezier smoothing to the curve
	 * @returns Path the newly created element comprising all these lines
	 */
	// @ts-ignore
	stroke(strokes: Iterable<Place[]>, svg: SVG.Container, color: string, width: number, smooth: boolean = false): SVG.Element {
		return this.map(trace(strokes), svg, smooth, false)
			.fill('none').stroke({color: color, width: width, linecap: 'round'});
	}

	/**
	 * create a relief layer for the given set of triangles.
	 * @param triangles Array of Triangle to shade.
	 * @param svg SVG object on which to shade.
	 * @param attr name of attribute to base the relief on.
	 */
	// @ts-ignore
	shade(triangles: Set<Triangle>, svg: SVG.Container, attr: string): SVG.Element { // TODO use separate delaunay triangulation
		if (!triangles)
			return;

		const slopes = [];
		let maxSlope = 0;
		for (let i = 0; i < triangles.size; i ++) { // start by computing slopes of all of the things
			const p = [];
			for (const node of triangles[i].vertices) {
				const {x, y} = this.projection.project(node.φ, node.λ);
				const z = Math.max(0, node[attr]);
				p.push(new Vector(x, -y, z));
			}
			let n = p[1].minus(p[0]).cross(p[2].minus(p[0])).norm();
			slopes.push(n.y/n.z);
			if (n.z > 0 && slopes[i] > maxSlope)
				maxSlope = slopes[i];
		}

		const heightScale = -Math.tan(2*SUN_ELEVATION)/maxSlope; // use that to normalize

		for (let i = 0; i < triangles.size; i ++) { // for each triangle
			const path = [];
			for (const node of triangles[i].vertices)
				path.push({type: 'L', args: [node.φ, node.λ]}); // put its values in a plottable form
			path.push({type: 'L', args: [...path[0].args]});
			path[0].type = 'M';
			const brightness = AMBIENT_LIGHT + (1-AMBIENT_LIGHT)*Math.max(0,
				Math.sin(SUN_ELEVATION + Math.atan(heightScale*slopes[i]))); // and use that to get a brightness
			this.map(path, svg, false, true).fill({color: '#000', opacity: 1-brightness});
		}
	}

	/**
	 * project and convert a list of SVG paths in latitude-longitude coordinates representing a series of closed paths
	 * into an SVG.Path object, and add that Path to the given SVG.
	 * @param segments ordered Iterator of segments, which each have attributes .type (str) and .args ([double])
	 * @param svg the SVG object on which to draw things
	 * @param smooth an optional feature that will smooth the Path out into Bezier curves
	 * @param closed if this is set to true, the map will make adjustments to account for its complete nature
	 * @returns SVG.Path object
	 */
	// @ts-ignore
	map(segments: PathSegment[], svg: SVG.Container, smooth: boolean, closed: boolean): SVG.Path {
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
				if (closed && krusIdx != null) { // if this map made a break in it, as well,
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

		if (smooth) { // smooth it, if desired
			for (let i = cutPoints.length - 2; i >= 0; i --) {
				const newEnd = [ // look ahead to the midpoint between this and the next
					(cutPoints[i].args[0] + cutPoints[i+1].args[0])/2,
					(cutPoints[i].args[1] + cutPoints[i+1].args[1])/2];
				if (cutPoints[i].type === 'L' && cutPoints[i+1].type !== 'M') // look for points that are sharp angles
					cutPoints[i] = {type: 'Q', args: [...cutPoints[i].args, ...newEnd]}; // and extend those lines into curves
				else if (cutPoints[i].type === 'M' && cutPoints[i+1].type === 'Q') { // look for curves that start with Bezier curves
					cutPoints.splice(i + 1, 0, {type: 'L', args: newEnd}); // assume we put it there and restore some linearity
				}
			}
		}

		if (closed) { // if this path is closed, adjust for the topology of the map projection
			let λTest = null;
			let maxNordi = Number.NEGATIVE_INFINITY;
			let maxSudi = Number.POSITIVE_INFINITY;
			let enclosesNP = null;
			let enclosesSP = null;
			for (let i = 1; i < jinPoints.length; i++) {
				if (jinPoints[i].type === 'L') { // examine the lines
					const [φ0, λ0] = jinPoints[i - 1].args;
					const [φ1, λ1] = jinPoints[i].args;
					if (λTest == null)
						λTest = (λ0 + λ1) / 2; // choose a longitude (0 or pi would be easiest, but the curve doesn't always cross those)
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
		}

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
	protected surface: Surface;

	constructor(surface: Surface) {
		this.surface = surface;
	}

	/**
	 * compute the coordinates of the midpoint between these two lines.
	 * @param φ0
	 * @param λ0
	 * @param φ1
	 * @param λ1
	 * @return Point
	 */
	getMidpoint(φ0: number, λ0: number, φ1: number, λ1: number): Place {
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
	 * @return Point
	 */
	getCrossing(φ0: number, λ0: number, φ1:number, λ1: number, λX: number): Place {
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
	project(φ: number, λ: number): {x: number, y: number} {
		throw "unimplemented";
	}

	/**
	 * generate some <path> segments to compensate for something enclosing the north pole.
	 * @return Array containing PathSegment
	 */
	mapNorthPole(): PathSegment[] {
		throw "unimplemented";
	}

	/**
	 * generate some <path> segments to compensate for something enclosing the south pole.
	 * @return Array containing PathSegment
	 */
	mapSouthPole(): PathSegment[] {
		throw "unimplemented";
	}
}


export class Azimuthal extends MapProjection {
	constructor(surface: Surface) {
		super(surface);
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
