// map.ts: all of the cartographic code

import {Nodo, Place, Surface, Triangle, Vector} from "./surface.js";
import {linterp} from "./utils.js";
import {Convention} from "./language.js";
import {World} from "./world.js";

const MAP_PRECISION = 1e-1;
const SUN_ELEVATION = 60/180*Math.PI;
const AMBIENT_LIGHT = 0.2;

const BIOME_COLORS = new Map([
	['zeme',        '#93d953'],
	['samud',       '#06267f'],
	['lage',        '#06267f'],
	['potistan',    '#444921'],
	['barxojangal', '#176D0D'],
	['jangal',      '#647F45'],
	['taige',       '#4EA069'],
	['piristan',    '#DD9C6F'],
	['grasistan',   '#BED042'],
	['registan',    '#F5E292'],
	['tundar',      '#FFFFFF'],
	['aise',        '#FFFFFF'],
	['kagaze',      '#FAF2E4'],
	[null,          '#000000'],
]);

const CATEGORY_COLORS = [
	'rgb( 96, 189, 218)',
	'rgb(182, 161,  92)',
	'rgb(173, 132, 198)',
	'rgb( 38, 149, 129)',
	'rgb(153, 108,  97)',
	'rgb( 77, 131, 177)',
	'rgb(121, 149,  83)',
	'rgb(214, 128, 172)',
	'rgb( 49, 186, 200)',
	'rgb(210, 179, 148)',
	'rgb(174, 172, 227)',
	'rgb( 96, 178, 134)',
	'rgb(215, 120, 126)',
	'rgb(  6, 144, 186)',
	'rgb(123, 121,  84)',
	'rgb(156, 111, 154)',
	'rgb( 28, 156, 149)',
	'rgb(211, 137, 100)',
	'rgb(133, 171, 233)',
	'rgb(166, 192, 158)',
];

const RIVER_DISPLAY_THRESHOLD = 3e6; // km^2


/**
 * create an ordered Iterator of segments that form all of these lines, aggregating where applicable.
 * aggregation may behave unexpectedly if some members of lines contain nonendpoints that are endpoints of others.
 * @param lines Set of lists of points to be combined and pathified.
 */
function trace(lines: Iterable<Place[]>): PathSegment[] {
	const queue = [...lines];
	console.log(queue.length);
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

	function combine(a: Place[], b: Place[]): Place[] {
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
	const output: PathSegment[] = [];
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
	 * do your thing
	 * @param surface the surface that we'e mapping
	 * @param world the world on that surface, if we're mapping human features
	 * @param svg the SVG element on which to draw everything
	 * @param zemrang the color scheme for the land areas
	 * @param marorang the color scheme for the ocean areas
	 * @param filter the color filter to apply
	 * @param shade whether to add shaded relief
	 * @param drawSmallCountries whether to draw countries that own two or fewer tiles
	 */
	depict(surface: Surface, world: World, svg: SVGGElement, zemrang: string, marorang: string, filter: string = 'nol', shade: boolean = false, drawSmallCountries: boolean = false) {
		svg.textContent = ''; // clear the layer
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		const cx = (this.projection.right + this.projection.left)/2;
		const cy = (this.projection.bottom + this.projection.top)/2;
		const s = Math.max(this.projection.right - this.projection.left, this.projection.bottom - this.projection.top);
		g.setAttributeNS(null, 'transform',
			`scale(${2/s}, ${2/s}) translate(${-cx}, ${-cy})`);
		svg.appendChild(g);

		if (zemrang === 'lugi') { // color the land light green
			this.fill([...surface.nodos].filter(n => n.biome !== 'samud'), g, BIOME_COLORS.get('zeme'));
		}
		else if (zemrang === 'jivi') { // draw the biomes
			for (const biome of BIOME_COLORS.keys())
				if (biome !== 'samud')
					this.fill([...surface.nodos].filter(n => n.biome === biome), g, BIOME_COLORS.get(biome));
		}
		else if (zemrang === 'politiki') { // draw the countries
			this.fill([...surface.nodos].filter(n => n.biome !== 'samud'), g, BIOME_COLORS.get('kagaze'));
			for (const civ of world.civs) {
				if (civ.nodos && (drawSmallCountries || civ.nodos.size > 2)) {
					const titledG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
					const hover = document.createElementNS('http://www.w3.org/2000/svg', 'title');
					const text = document.createTextNode(
						`${civ.getName(Convention.NOVOYANGI)}\n[${civ.getName(Convention.NASOMEDI)}]`);
					hover.appendChild(text);
					titledG.appendChild(hover);
					g.appendChild(titledG);
					this.fill([...civ.nodos].filter(n => n.biome !== 'samud'), titledG,
						CATEGORY_COLORS[civ.id % CATEGORY_COLORS.length], '#000', 1);
				}
			}
		}

		if (marorang === 'nili') { // color the sea deep blue
			this.fill([...surface.nodos].filter(n => n.biome === 'samud'), g, BIOME_COLORS.get('samud'));
			this.stroke([...surface.rivers].filter(ud => ud[0].liwe >= RIVER_DISPLAY_THRESHOLD),
				g, BIOME_COLORS.get('samud'), .003, true);
		}

		if (shade) { // add relief shadows
			this.shade(surface.triangles, g);
		}
	}

	/**
	 * draw a region of the world on the map with the given color.
	 * @param nodos Iterator of Node to be colored in.
	 * @param svg object on which to put the Path.
	 * @param color color of the interior.
	 * @param stroke color of the outline.
	 * @param strokeWidth the width of the outline to put around it (will match fill color).
	 * @param smooth whether to apply Bezier smoothing to the outline
	 * @return the newly created element encompassing these triangles.
	 */
	fill(nodos: Nodo[], svg: SVGGElement, color: string,
		 stroke: string = 'none', strokeWidth: number = 0, smooth: boolean = false): SVGPathElement {
		if (nodos.length <= 0)
			return null;
		const path = this.map(outline(new Set(nodos)), svg, smooth, true);
		path.setAttribute('style',
			`fill: ${color}; stroke: ${stroke}; stroke-width: ${strokeWidth}; stroke-linejoin: round;`);
		return path;
	}

	/**
	 * draw a series of lines on the map with the giver color.
	 * @param strokes the Iterable of lists of points to connect and draw.
	 * @param svg SVG object on which to put the Path.
	 * @param color String that HTML can interpret as a color.
	 * @param width the width of the stroke
	 * @param smooth whether to apply Bezier smoothing to the curve
	 * @returns the newly created element comprising all these lines
	 */
	stroke(strokes: Iterable<Place[]>, svg: SVGGElement, color: string, width: number,
		   smooth: boolean = false): SVGPathElement {
		const path = this.map(trace(strokes), svg, smooth, false);
		path.setAttribute('style',
			`fill: none; stroke: ${color}; stroke-width: ${width}; stroke-linejoin: round; stroke-linecap: round;`);
		return path;
	}

	/**
	 * create a relief layer for the given set of triangles.
	 * @param triangles Array of Triangle to shade.
	 * @param svg SVG object on which to shade.
	 */
	shade(triangles: Set<Triangle>, svg: SVGGElement) { // TODO use separate delaunay triangulation
		if (!triangles)
			return;

		const slopes: Map<Triangle, number> = new Map();
		let maxSlope = 0;
		for (const t of triangles) { // start by computing slopes of all of the things
			const p = [];
			for (const node of t.vertices) {
				const {x, y} = this.projection.project(node.φ, node.λ);
				const z = Math.max(0, node.gawe);
				p.push(new Vector(x, -y, z));
			}
			let n = p[1].minus(p[0]).cross(p[2].minus(p[0])).norm();
			slopes.set(t, n.y/n.z);
			if (n.z > 0 && slopes.get(t) > maxSlope)
				maxSlope = slopes.get(t);
		}

		const heightScale = -Math.tan(2*SUN_ELEVATION)/maxSlope; // use that to normalize

		for (const t of triangles) { // for each triangle
			const path = [];
			for (const node of t.vertices)
				path.push({type: 'L', args: [node.φ, node.λ]}); // put its values in a plottable form
			path.push({type: 'L', args: [...path[0].args]});
			path[0].type = 'M';
			const brightness = AMBIENT_LIGHT + (1-AMBIENT_LIGHT)*Math.max(0,
				Math.sin(SUN_ELEVATION + Math.atan(heightScale*slopes.get(t)))); // and use that to get a brightness
			this.map(path, svg, false, true).setAttribute('style',
				`fill: '#000'; fill-opacity: ${1-brightness};`);
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
	map(segments: PathSegment[], svg: Element, smooth: boolean, closed: boolean): SVGPathElement {
		if (segments.length === 0) // what're you trying to pull here?
			return document.createElementNS('http://www.w3.org/2000/svg', 'path');

		const sections = [];
		let touchedEdge = false;
		let start = 0;
		for (let i = 1; i <= segments.length; i ++) { // sweep through the result
			if (i === segments.length || segments[i].type === 'M') { // splitting it up at movetos
				sections.push(segments.slice(start, i));
				start = i;
			}
			else if (Math.abs(segments[i].args[1] - segments[i-1].args[1]) > Math.PI) { // and at places where it crosses the antimeridian
				const [φ0, λ0] = segments[i-1].args;
				const [φ1, λ1] = segments[i].args;
				const φX = this.projection.getCrossing(φ0, λ0, φ1, λ1, Math.PI).φ; // estimate the place where it crosses
				const λX = (λ1 < λ0) ? Math.PI : -Math.PI;
				sections.push(segments.slice(start, i).concat([{type: 'L', args: [φX, λX]}]));
				segments[i-1] = {type: 'M', args: [φX, -λX]}; // add points there so we don't get weird edge artifacts
				start = i - 1;
				touchedEdge = true;
			}
		}

		const precision = MAP_PRECISION*Math.hypot(
			this.projection.right - this.projection.left, this.projection.top - this.projection.bottom)
		const cutPoints = []; // now start putting together the projected points
		let jinPoints = sections.pop();
		let supersectionStart = jinPoints[0].args;
		while (jinPoints !== undefined) {
			const base = cutPoints.length;
			for (let i = 0; i < jinPoints.length; i ++) { // run through the section
				const [φ1, λ1] = jinPoints[i].args;
				const {x, y} = this.projection.project(φ1, λ1); // projecting points and adding them to the thing
				cutPoints.push({type: jinPoints[i].type, args: [x, y]});
			}

			for (let i = base + 1; i < cutPoints.length; i ++) { // then go back through
				const [x0, y0] = cutPoints[i-1].args;
				const [x1, y1] = cutPoints[i].args;
				if (Math.hypot(x1 - x0, y1 - y0) > precision) { // and fill in segments that are too long
					const [φ0, λ0] = jinPoints[i-base-1].args;
					const [φ1, λ1] = jinPoints[i-base].args;
					const {φ, λ} = this.projection.getMidpoint(φ0, λ0, φ1, λ1); // and split them in half
					const {x, y} = this.projection.project(φ, λ);
					jinPoints.splice(i-base, 0, {type: 'L', args: [φ, λ]}); // add the midpoints to the polygon
					cutPoints.splice(i,           0, {type: 'L', args: [x, y]});
					i --; // and check again
				}
			}

			const end = jinPoints[jinPoints.length-1].args; // when all that's done, look at where we are
			if (!closed) { // if we're not worrying about closing it off
				jinPoints = null; // move onto whatever else
			}
			else if (supersectionStart[0] === end[0] && supersectionStart[1] === end[1]) { // if we just completed a loop
				jinPoints = null; // also move on
			}
			else if (Math.abs(jinPoints[jinPoints.length-1].args[1]) === Math.PI) { // if it is and we ended hitting a wall
				const dix = Math.sign(end[1]);
				const possibleStarts = sections.map((s) => s[0].args).concat([supersectionStart]);
				console.log(possibleStarts);
				let bestSection = null, bestDistance = Number.POSITIVE_INFINITY;
				for (let i = 0; i < possibleStarts.length; i ++) { // check the remaining sections
					const start = possibleStarts[i];
					let distance;
					if (start[1] === end[1]) {
						if (dix*(start[0] - end[0]) >= 0)
							distance = dix*(start[0] - end[0]);
						else
							distance = 80 + dix*(start[0] - end[0]);
					}
					else if (start[1] === -end[1])
						distance = 40 - dix*(start[0] + end[0]);
					else
						continue;
					if (distance < bestDistance) {
						bestSection = i; // to find which one should come next
						bestDistance = distance;
					}
				}
				if (!Number.isFinite(bestDistance)) {
					throw new Error(`There was nowhither left to go. I was at ${end}, and the only options you gave me were ${possibleStarts}!`);
				}
				console.log(dix);
				console.log(bestDistance);
				if (dix > 0) { // go around the edge to get to the next start point
					cutPoints.push(
						...this.projection.outlineRightEdge(end[0], Math.min(end[0] + bestDistance, this.projection.surface.φMax)));
					if (bestDistance > 20) {
						cutPoints.push(
							...this.projection.outlineNorthPole(),
							...this.projection.outlineLeftEdge(this.projection.surface.φMax, Math.max(-(end[0] + bestDistance - 40), this.projection.surface.φMin)));
						if (bestDistance > 60) {
							cutPoints.push(
								...this.projection.outlineSouthPole(),
								...this.projection.outlineRightEdge(this.projection.surface.φMin, end[0] + bestDistance - 80));
						}
					}
				}
				else {
					cutPoints.push(
						...this.projection.outlineLeftEdge(end[0], Math.max(-(-end[0] + bestDistance), this.projection.surface.φMin)));
					if (bestDistance > 20) {
						cutPoints.push(
							...this.projection.outlineSouthPole(),
							...this.projection.outlineRightEdge(this.projection.surface.φMin, Math.min(-end[0] + bestDistance - 40, this.projection.surface.φMax)));
						if (bestDistance > 60) {
							cutPoints.push(
								...this.projection.outlineNorthPole(),
								...this.projection.outlineLeftEdge(this.projection.surface.φMax, -(-end[0] + bestDistance - 80)));
						}
					}
				}
				if (bestSection < sections.length)
					jinPoints = sections.splice(bestSection, 1)[0].slice(1); // then either take the next section without its moveto if there is one
				else
					jinPoints = null; // or move on if that was the end
			}
			else { // if we ended in the middle someplace
				jinPoints = null;
				for (let i = 0; i < sections.length; i ++) { // look for the one that picks up from here
					const start = sections[i][0];
					if (start.args[0] === end[0] && start.args[1] === end[1]) {
						jinPoints = sections.splice(i, 1)[0].slice(1); // and skip its moveto
						break;
					}
				}
				if (jinPoints === null) {
					throw new Error("I was left hanging.");
				}
			}
			if (jinPoints === null) { // if we were planning to move onto whatever else for the next section
				if (sections.length === 0) // we may be done
					break;
				else { // if not
					jinPoints = sections.pop(); // just choose the next section arbitrarily
					supersectionStart = jinPoints[0].args;
				}
			}
		}

		if (closed && !touchedEdge) { // if it matters which side is inside and which side out, adjust for the topology of the map projection
			let xTest = null;
			let yMax = Number.NEGATIVE_INFINITY;
			let insideOut = null;
			for (let i = 0; i < cutPoints.length; i ++) { // look through the path
				if (segments[i] === null) // if there are any of these things spliced in from earlier
					break; // we don't need to worry about it; it touches the edge, so this has been handled
				else if (cutPoints[i].type === 'L') { // examine the lines
					const [x0, y0] = cutPoints[i - 1].args;
					const [x1, y1] = cutPoints[i].args;
					if (xTest === null)
						xTest = (x0 + x1)/2; // choose an x
					if (x0 < xTest !== x1 < xTest) { // look for segments that cross that x
						const y = y0*(x1 - xTest)/(x1 - x0) + y1*(xTest - x0)/(x1 - x0); // find the y where they cross
						if (y > yMax) { // the lowest one will tell us
							yMax = y;
							insideOut = x1 < x0; // if this path is inside out
						}
					}
				}
			}
			if (insideOut) { // if it is
				const {x, y} = this.projection.project(0, Math.PI);
				cutPoints.push( // draw the outline of the entire map to contain it
					{type: 'M', args: [x, y]},
					...this.projection.outlineRightEdge(0),
					...this.projection.outlineNorthPole(),
					...this.projection.outlineLeftEdge(),
					...this.projection.outlineSouthPole(),
					...this.projection.outlineRightEdge(this.projection.surface.φMin, 0));
			}
		}

		if (smooth) { // smooth it, if desired
			for (let i = cutPoints.length - 2; i >= 0; i --) {
				const newEnd: number[] = [ // look ahead to the midpoint between this and the next
					(cutPoints[i].args[0] + cutPoints[i+1].args[0])/2,
					(cutPoints[i].args[1] + cutPoints[i+1].args[1])/2];
				if (cutPoints[i].type === 'L' && cutPoints[i+1].type !== 'M') // look for points that are sharp angles
					cutPoints[i] = {type: 'Q', args: [...cutPoints[i].args, ...newEnd]}; // and extend those lines into curves
				else if (cutPoints[i].type === 'M' && cutPoints[i+1].type === 'Q') { // look for curves that start with Bezier curves
					cutPoints.splice(i + 1, 0, {type: 'L', args: newEnd}); // assume we put it there and restore some linearity
				}
			}
		}

		let str = ''; // finally, put it in the <path>
		for (let i = 0; i < cutPoints.length; i ++)
			str += cutPoints[i].type + cutPoints[i].args.join(',') + ' ';

		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', str);
		path.setAttribute('vector-effect', 'non-scaling-stroke');
		return svg.appendChild(path);
	}

	transform(φ: number, λ: number): {x: number, y: number} {
		const {x, y} = this.projection.project(φ, λ);
		return {
			x: (x - this.projection.left)/(this.projection.right - this.projection.left),
			y: (y - this.projection.top)/(this.projection.bottom - this.projection.top)
		};
	}
}


/**
 * a class to manage the plotting of points from a Surface onto a plane.
 */
class MapProjection {
	surface: Surface;
	public left: number;
	public right: number;
	public top: number;
	public bottom: number;

	constructor(surface: Surface, left: number, right:number, top: number, bottom: number) {
		this.surface = surface;
		this.left = left;
		this.right = right;
		this.top = top;
		this.bottom = bottom;
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
	 * generate some <path> segments to go around the North Pole for the zero-length path from 180E to W at latitude 90N
	 * @return Array containing PathSegment
	 */
	outlineNorthPole(): PathSegment[] {
		const {x, y} = this.project(this.surface.φMax, -Math.PI);
		return [{type: 'L', args: [x, y]}];
	}

	/**
	 * generate some <path> segments to outline the antimeridian on the left from latitude φ0 to φ1
	 * @param φ0
	 * @param φ1
	 */
	outlineLeftEdge(φ0: number = this.surface.φMax, φ1: number = this.surface.φMin): PathSegment[] {
		const {x, y} = this.project(φ1, -Math.PI);
		return [{type: 'L', args: [x, y]}];
	}

	/**
	 * generate some <path> segments to go around the South Pole for the zero-length path from 180W to E at latitude 90S
	 * @return Array containing PathSegment
	 */
	outlineSouthPole(): PathSegment[] {
		const {x, y} = this.project(this.surface.φMin, Math.PI);
		return [{type: 'L', args: [x, y]}];
	}

	/**
	 * generate some <path> segments to outline the antimeridian on the right from latitude φ0 to φ1
	 * @param φ0
	 * @param φ1
	 */
	outlineRightEdge(φ0: number = this.surface.φMin, φ1: number = this.surface.φMax): PathSegment[] {
		const {x, y} = this.project(φ1, Math.PI);
		return [{type: 'L', args: [x, y]}];
	}
}


export class Equirectangular extends MapProjection {
	constructor(surface: Surface) {
		super(surface, -Math.PI, Math.PI, -surface.φMax, -surface.φMin);
	}

	project(φ: number, λ: number): {x: number, y: number} {
		return {x: λ, y: -φ};
	}
}


export class Azimuthal extends MapProjection {
	constructor(surface: Surface) {
		super(surface, -surface.height, surface.height, -surface.height, surface.height);
	}

	project(φ: number, λ: number): {x: number, y: number} {
		const p = this.surface.height - linterp(φ, this.surface.refLatitudes, this.surface.cumulDistances);
		return {x: p*Math.sin(λ), y: p*Math.cos(λ)};
	}

	outlineSouthPole(): PathSegment[] {
		return [
			{type: 'M', args: [0, -this.surface.height]},
			{type: 'A', args: [this.surface.height, this.surface.height, 0, 1, 0, 0, this.surface.height]},
			{type: 'A', args: [this.surface.height, this.surface.height, 0, 1, 0, 0, -this.surface.height]},
		];
	}

	outlineLeftEdge(φ0: number = this.surface.φMax, φ1: number = this.surface.φMin): PathSegment[] {
		return [
			{type: 'M', args: [0, linterp(φ1, this.surface.refLatitudes, this.surface.cumulDistances) - this.surface.height]},
		];
	}

	outlineRightEdge(φ0: number = this.surface.φMin, φ1: number = this.surface.φMax): PathSegment[] {
		return [
			{type: 'M', args: [0, linterp(φ1, this.surface.refLatitudes, this.surface.cumulDistances) - this.surface.height]},
		];
	}
}
