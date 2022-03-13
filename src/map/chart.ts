/**
 * MIT License
 *
 * Copyright (c) 2021 Justin Kunimune
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
import {Nodo, Surface, Triangle} from "../planet/surface.js";
import {chordCenter, filterSet, longestShortestPath, Vector} from "../util/util.js";
import {World} from "../society/world.js";
import {MapProjection} from "./projection.js";
import {Civ} from "../society/civ.js";
import {delaunayTriangulate} from "../util/delaunay.js";
import {circularRegression} from "../util/fitting.js";
import {ErodingSegmentTree} from "../util/erodingsegmenttree.js";
import {assert_xy, endpoint, PathSegment, Place} from "../util/coordinates.js";

const SUN_ELEVATION = 60/180*Math.PI;
const AMBIENT_LIGHT = 0.2;
const RIVER_DISPLAY_THRESHOLD = 3e6; // km^2 TODO: display rivers that connect lakes to shown rivers
const SIMPLE_PATH_LENGTH = 72; // maximum number of vertices for estimating median axis
const N_DEGREES = 6; // number of line segments into which to break one radian of arc
const RALF_NUM_CANDIDATES = 6; // number of sizeable longest shortest paths to try using for the label

const BIOME_COLORS = new Map([
	['samud',       '#06267f'],
	['lage',        '#06267f'],
	['potistan',    '#444921'],
	['barxojangle', '#176D0D'],
	['jangle',      '#647F45'],
	['taige',       '#4EA069'],
	['piristan',    '#DD9C6F'],
	['grasistan',   '#BED042'],
	['registan',    '#F5E292'],
	['tundre',      '#FFFFFF'],
	['aise',        '#FFFFFF'],
	['kagaze',      '#FAF2E4'],
	[null,          '#000000'],
]);

const COUNTRY_COLORS = [
	'rgb(199, 106, 138)',
	'rgb(0, 169, 200)',
	'rgb(193, 166, 96)',
	'rgb(141, 107, 176)',
	'rgb(35, 156, 124)',
	'rgb(218, 130, 118)',
	'rgb(105, 180, 242)',
	'rgb(106, 131, 58)',
	'rgb(193, 113, 165)',
	'rgb(0, 175, 182)',
	'rgb(218, 161, 108)',
	'rgb(116, 120, 191)',
	'rgb(78, 157, 104)',
	'rgb(225, 129, 145)',
	'rgb(73, 189, 235)',
	'rgb(134, 128, 55)',
	'rgb(179, 124, 190)',
	'rgb(43, 179, 162)',
	'rgb(237, 157, 127)',
	'rgb(82, 132, 198)',
	'rgb(112, 157, 88)',
	'rgb(225, 133, 173)',
	'rgb(53, 197, 220)',
	'rgb(159, 124, 61)',
	'rgb(158, 136, 209)',
	'rgb(82, 182, 140)',
	'rgb(250, 154, 153)',
	'rgb(36, 142, 196)',
	'rgb(142, 155, 79)',
	'rgb(216, 142, 201)',
	'rgb(62, 203, 201)',
	'rgb(180, 119, 76)',
	'rgb(129, 149, 221)',
	'rgb(116, 183, 121)',
	'rgb(254, 156, 181)',
	'rgb(0, 150, 186)',
];

const ALTITUDE_STEP = 0.5;
const ALTITUDE_COLORS = [
	'rgb(52, 103, 29)',
	'rgb(96, 130, 6)',
	'rgb(152, 152, 34)',
	'rgb(203, 175, 78)',
	'rgb(230, 212, 149)',
	'rgb(254, 253, 220)',
];
const DEPTH_STEP = 1.0;
const DEPTH_COLORS = [
	'rgb(111, 209, 232)',
	'rgb(57, 150, 197)',
	'rgb(17, 94, 164)',
	'rgb(23, 34, 118)',
];


/**
 * a class to handle all of the graphical arrangement stuff.
 */
export class Chart {
	private projection: MapProjection;
	private testText: SVGTextElement;
	private testTextSize: number;
	private labelIndex: number;


	constructor(projection: MapProjection) {
		this.projection = projection;
		this.labelIndex = 0;
	}

	/**
	 * do your thing
	 * @param surface the surface that we're mapping
	 * @param world the world on that surface, if we're mapping human features
	 * @param svg the SVG element on which to draw everything
	 * @param zemrang the color scheme for the land areas
	 * @param marorang the color scheme for the ocean areas
	 * @param filter the color filter to apply
	 * @param nade whether to add rivers
	 * @param kenare whether to add state borders
	 * @param shade whether to add shaded relief
	 * @param civLabels whether to label countries
	 * @param geoLabels whether to label mountain ranges and seas
	 * @param fontSize the size of city labels and minimum size of country and biome labels [pt]
	 * @param style the transliteration convention to use for them
	 */
	depict(surface: Surface, world: World, svg: SVGGElement, zemrang: string, marorang: string, filter = 'nol',
		   nade = true, kenare = true, shade = false,
		   civLabels = false, geoLabels = false,
		   fontSize: number = 2, style: string = null): void {
		const bbox = this.projection.getDimensions();
		svg.setAttribute('viewBox',
			`${bbox.left} ${bbox.top} ${bbox.width} ${bbox.height}`);
		svg.textContent = ''; // clear the layer
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		g.setAttribute('id', 'jeni-zemgrafe');
		svg.appendChild(g);

		this.testTextSize = Math.min(
			(bbox.width)/18,
			bbox.height);
		this.testText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		this.testText.setAttribute('class', 'zemgrafe-label');
		this.testText.setAttribute('style', `font-size: ${this.testTextSize}px;`);
		svg.appendChild(this.testText);

		// const rectangle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		// rectangle.setAttribute('x', `${this.projection.getDimensions().left}`);
		// rectangle.setAttribute('y', `${this.projection.getDimensions().top}`);
		// rectangle.setAttribute('width', `${this.projection.getDimensions().width}`);
		// rectangle.setAttribute('height', `${this.projection.getDimensions().height}`);
		// g.appendChild(rectangle);

		let nadorang = 'none';
		if (marorang === 'nili') { // color the sea deep blue
			this.fill(
				filterSet(surface.nodos, n => n.biome === 'samud'),
				g, BIOME_COLORS.get('samud'));
			nadorang = BIOME_COLORS.get('samud');
		}
		else if (marorang === 'gawia') { // color the sea by altitude
			for (let i = 0; i < DEPTH_COLORS.length; i++) {
				const min = (i !== 0) ? i * DEPTH_STEP : Number.NEGATIVE_INFINITY;
				const max = (i !== DEPTH_COLORS.length - 1) ? (i + 1) * DEPTH_STEP : Number.POSITIVE_INFINITY;
				this.fill(
					filterSet(surface.nodos, n => n.biome === 'samud' && -n.gawe >= min && -n.gawe < max),
					g, DEPTH_COLORS[i]); // TODO: enforce contiguity of shallow ocean?
			}
			nadorang = DEPTH_COLORS[0]; // TODO: outline ocean + cerni nade?
		}

		if (zemrang === 'jivi') { // draw the biomes
			for (const biome of BIOME_COLORS.keys())
				if (biome !== 'samud')
					this.fill(
						filterSet(surface.nodos, n => n.biome === biome),
						g, BIOME_COLORS.get(biome));
		}
		else if (zemrang === 'politiki' && world !== null) { // draw the countries
			this.fill(
				filterSet(surface.nodos, n => n.biome !== 'samud'),
				g, BIOME_COLORS.get('kagaze'));
			const biggestCivs = world.getCivs(true).reverse();
			for (let i = 0; i < COUNTRY_COLORS.length && biggestCivs.length > 0; i++)
				this.fill(
					filterSet(biggestCivs.pop().nodos, n => n.biome !== 'samud'),
					g, COUNTRY_COLORS[i]);
		}
		else if (zemrang === 'gawia') { // color the sea by altitude
			for (let i = 0; i < ALTITUDE_COLORS.length; i++) {
				const min = (i !== 0) ? i * ALTITUDE_STEP : Number.NEGATIVE_INFINITY;
				const max = (i !== ALTITUDE_COLORS.length - 1) ? (i + 1) * ALTITUDE_STEP : Number.POSITIVE_INFINITY;
				this.fill(
					filterSet(surface.nodos, n => n.biome !== 'samud' && n.gawe >= min && n.gawe < max),
					g, ALTITUDE_COLORS[i]);
			}
		}

		if (nade) {
			this.stroke([...surface.rivers].filter(ud => ud[0].liwe >= RIVER_DISPLAY_THRESHOLD),
				g, nadorang, 1.5, true);
		}

		if (kenare && world !== null) {
			for (const civ of world.getCivs()) {
				// if (civ.getPopulation() > 0) {
					const titledG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
					const hover = document.createElementNS('http://www.w3.org/2000/svg', 'title');
					const text = document.createTextNode(
						`${civ.getName().toString(style)}\n` +
						`[${civ.getName().toString('ipa')}]`);
					hover.appendChild(text);
					titledG.appendChild(hover);
					g.appendChild(titledG);
					this.fill(
						filterSet(civ.nodos, n => n.biome !== 'samud'),
						titledG,
						'none', '#000', 0.7).setAttribute('pointer-events', 'all');
				// }
			}
		}

		if (shade) { // add relief shadows
			this.shade(surface.triangles, g);
		}

		if (civLabels && world !== null) {
			for (const civ of world.getCivs()) // TODO: the hover text should go on this
				if (civ.getPopulation() > 0)
					this.label(
						[...civ.nodos].filter(n => n.biome !== 'samud' && n.biome !== 'lage'),
						civ.getName().toString(style),
						svg,
						fontSize);
		}
	}

	/**
	 * draw a region of the world on the map with the given color.
	 * @param nodos Iterator of Node to be colored in.
	 * @param svg object on which to put the Path.
	 * @param color color of the interior.
	 * @param stroke color of the outline.
	 * @param strokeWidth the width of the outline to put around it (will match fill color).
	 * @return the newly created element encompassing these triangles.
	 */
	fill(nodos: Set<Nodo>, svg: SVGGElement, color: string,
		 stroke: string = 'none', strokeWidth: number = 0): SVGPathElement {
		if (nodos.size <= 0)
			return this.draw([], svg);
		const segments = this.projection.project(Chart.outline(nodos), true);
		const path = this.draw(segments, svg);
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
		   smooth = false): SVGPathElement {
		let segments = this.projection.project(Chart.aggregate(strokes), false);
		if (smooth)
			segments = Chart.smooth(segments);
		const path = this.draw(segments, svg);
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
				const {x, y} = this.projection.projectPoint(node.ф, node.λ);
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
				path.push({type: 'L', args: [node.ф, node.λ]}); // put its values in a plottable form
			path.push({type: 'L', args: [...path[0].args]});
			path[0].type = 'M';
			const brightness = AMBIENT_LIGHT + (1-AMBIENT_LIGHT)*Math.max(0,
				Math.sin(SUN_ELEVATION + Math.atan(heightScale*slopes.get(t)))); // and use that to get a brightness
			this.draw(this.projection.project(path, true), svg).setAttribute('style',
				`fill: '#000'; fill-opacity: ${1-brightness};`);
		}
	}

	/**
	 * add some text to this region using a simplified form of the RALF labelling
	 * algorithm, described in
	 *     Krumpe, F. and Mendel, T. (2020) "Computing Curved Area Labels in Near-Real Time"
	 *     (Doctoral dissertation). University of Stuttgart, Stuttgart, Germany.
	 *     https://arxiv.org/abs/2001.02938 TODO: try horizontal labels: https://github.com/mapbox/polylabel
	 * @param nodos the Nodos that comprise the region to be labelled.
	 * @param label the text to place.
	 * @param svg the SVG object on which to write the label.
	 * @param minFontSize the smallest the label can be. if the label cannot fit inside
	 *                    the region with this font size, no label will be placed and it
	 *                    will return null.
	 */
	label(nodos: Nodo[], label: string, svg: SVGElement, minFontSize: number): SVGTextElement {
		if (nodos.length === 0)
			throw "nodos to label must be at least length 2";
		this.testText.textContent = '..'+label+'..';
		const boundBox = this.testText.getBoundingClientRect(); // to calibrate the font sizes, measure the size of some test text in px
		this.testText.textContent = '';
		const mapScale = svg.clientWidth/this.projection.getDimensions().width; // and also the current size of the map in px for reference
		const aspect = boundBox.width/(this.testTextSize*mapScale);
		minFontSize = minFontSize/mapScale; // TODO: at some point, I probably have to grapple with the printed width of the map.

		const path = this.projection.project(Chart.outline(new Set(nodos)), true); // do the projection
		if (path.length === 0)
			return null;

		for (let i = path.length - 1; i >= 1; i --) { // convert it into a simplified polygon
			if (path[i].type === 'A') { // turn arcs into triscadecagons TODO: find out if this can create coincident nodes and thereby Delaunay Triangulation to fail
				const start = assert_xy(endpoint(path[i-1].args));
				const end = assert_xy(endpoint(path[i].args));
				const l = Math.hypot(end.x - start.x, end.y - start.y);
				const r = Math.abs(path[i].args[0] + path[i].args[1])/2;
				const c = chordCenter(start, end, r,
					path[i].args[3] === path[i].args[4]);
				const Δθ = 2*Math.asin(l/(2*r));
				const θ0 = Math.atan2(start.y - c.y, start.x - c.x);
				const nSegments = Math.ceil(N_DEGREES*Δθ);
				const lineApprox = [];
				for (let j = 1; j <= nSegments; j ++)
					lineApprox.push({type: 'L', args: [
							c.x + r*Math.cos(θ0 + Δθ*j/nSegments),
							c.y + r*Math.sin(θ0 + Δθ*j/nSegments)]});
				path.splice(i, 1, ...lineApprox);
			}
		}

		while (path.length > SIMPLE_PATH_LENGTH) { // simplify path
			let shortI = -1, minL = Number.POSITIVE_INFINITY;
			for (let i = 1; i < path.length-1; i ++) {
				if (path[i].type === 'L' && path[i+1].type === 'L') {
					let l = Math.hypot(
						path[i+1].args[0] - path[i-1].args[0], path[i+1].args[1] - path[i-1].args[1]);
					if (l < minL) { // find the vertex whose removal results in the shortest line segment
						minL = l;
						shortI = i;
					}
				}
			}
			path.splice(shortI, 1); // and remove it
		}
		while (path.length < SIMPLE_PATH_LENGTH/2) { // complicate path
			let longI = -1, maxL = Number.NEGATIVE_INFINITY;
			for (let i = 1; i < path.length; i ++) {
				if (path[i].type === 'L') {
					let l = Math.hypot(
						path[i].args[0] - path[i-1].args[0], path[i].args[1] - path[i-1].args[1]);
					if (l > maxL) { // find the longest line segment
						maxL = l;
						longI = i;
					}
				}
			}
			console.assert(longI >= 0, path);
			path.splice(longI, 0, { // and split it
				type: 'L',
				args: [(path[longI].args[0] + path[longI-1].args[0])/2, (path[longI].args[1] + path[longI-1].args[1])/2]
			});
		}

		interface Circumcenter {
			x: number, y: number, r: number;
			isContained: boolean;
			edges: {length: number, clearance: number}[];
		}

		// estimate skeleton
		const points: Vector[] = [];
		for (const segment of path)
			if (segment.type === 'L')
				points.push(new Vector(segment.args[0], -segment.args[1], 0)); // note the minus sign: all calculations will be done with a sensibly oriented y axis
		const triangulation = delaunayTriangulate(points); // start with a Delaunay triangulation of the border
		const centers: Circumcenter[] = [];
		for (let i = 0; i < triangulation.triangles.length; i ++) { // then convert that into a voronoi graph
			const abc = triangulation.triangles[i];
			const a = points[abc[0]];
			const b = points[abc[1]];
			const c = points[abc[2]];
			const D = 2*(a.x*(b.y - c.y) + b.x*(c.y - a.y) + c.x*(a.y - b.y));
			centers.push({
				x:  (a.sqr() * (b.y - c.y) + b.sqr() * (c.y - a.y) + c.sqr() * (a.y - b.y)) / D, // calculating the circumcenters
				y:  (a.sqr() * (c.x - b.x) + b.sqr() * (a.x - c.x) + c.sqr() * (b.x - a.x)) / D,
				r: 0, isContained: false, edges: new Array(triangulation.triangles.length).fill(null),
			});
			centers[i].r = Math.hypot(a.x - centers[i].x, a.y - centers[i].y);
			centers[i].isContained = MapProjection.contains(
				path,  {s: centers[i].x, t: -centers[i].y});
			if (centers[i].isContained) {
				for (let j = 0; j < i; j ++) {
					if (centers[j].isContained) {
						const def = triangulation.triangles[j]; // and recording adjacency
						triangleFit:
							for (let k = 0; k < 3; k++) {
								for (let l = 0; l < 3; l++) {
									if (abc[k] === def[(l + 1) % 3] && abc[(k + 1) % 3] === def[l]) {
										const a = new Vector(centers[i].x, centers[i].y, 0);
										const c = new Vector(centers[j].x, centers[j].y, 0);
										const b = points[abc[k]], d = points[abc[(k + 1) % 3]];
										const length = Math.sqrt(a.minus(c).sqr()); // compute the length of this edge
										let clearance; // estimate of minimum space around this edge
										const mid = b.plus(d).over(2);
										if (a.minus(mid).dot(c.minus(mid)) < 0)
											clearance = Math.sqrt(b.minus(d).sqr())/2;
										else
											clearance = Math.min(centers[i].r, centers[j].r);
										centers[i].edges[j] = centers[j].edges[i] = {length: length, clearance: clearance};
										break triangleFit;
									}
								}
							}
					}
				}
			}
		}

		let argmax = -1;
		for (let i = 0; i < centers.length; i ++) { // find the circumcenter with the greatest clearance
			if (centers[i].isContained && (argmax < 0 || centers[i].r > centers[argmax].r))
				argmax = i;
		}
		console.assert(argmax >= 0, label, points, centers);

		const candidates: number[][] = []; // next collect candidate paths along which you might fit labels
		let minClearance = centers[argmax].r;
		while (candidates.length < RALF_NUM_CANDIDATES && minClearance >= minFontSize) {
			minClearance /= 1.4; // gradually loosen a minimum clearance filter, until it is slitely smaller than the smallest font size
			const minLength = minClearance*aspect;
			const usedPoints: Set<number> = new Set();
			while (usedPoints.size < centers.length) {
				const newEndpoint = longestShortestPath(
					centers,
					(usedPoints.size > 0) ? usedPoints : new Set([argmax]),
					minClearance).points[0]; // find the point farthest from the paths you have checked TODO expand on this argmax thing to make sure check every exclave fore we start reducing the minimum
				if (usedPoints.has(newEndpoint)) break;
				const newShortestPath = longestShortestPath(
					centers, new Set([newEndpoint]), minClearance); // find a new diverse longest shortest path with that as endpoin
				if (newShortestPath.length >= minLength) { // if the label will fit,
					candidates.push(newShortestPath.points); // take it
					for (const point of newShortestPath.points)
						usedPoints.add(point); // and look for a different one
				}
				else // if it won't
					break; // reduce the required clearance and try again
			}
		}
		if (candidates.length === 0)
			return null;

		let axisValue = Number.NEGATIVE_INFINITY;
		let axisR = null, axisCx = null, axisCy = null, axisΘL = null, axisΘR = null, axisH = null;
		for (const candidate of candidates) { // for each candidate label axis
			if (candidate.length < 3) continue; // with at least three points
			const {R, cx, cy} = circularRegression(candidate.map((i: number) => centers[i]));
			const midpoint = centers[candidate[Math.trunc(candidate.length/2)]];

			const circularPoints: {x: number, y: number}[] = []; // get polygon segments in circular coordinates
			const θ0 = Math.atan2(midpoint.y - cy, midpoint.x - cx);
			for (let i = 0; i < points.length; i ++) {
				const {x, y} = points[i];
				const θ = (Math.atan2(y - cy, x - cx) - θ0 + 3*Math.PI)%(2*Math.PI) - Math.PI;
				const r = Math.hypot(x - cx, y - cy);
				const xp = R*θ, yp = R - r;
				circularPoints.push({x: xp, y: yp});
			}

			let xMin = -Math.PI*R, xMax = Math.PI*R; // TODO: move more of this into separate funccions
			const wedges: {xL: number, xR: number, y: number}[] = []; // get wedges from edges
			for (let i = 0; i < points.length; i ++) { // there's a wedge associated with each pair of points
				const p0 = circularPoints[i];
				const p1 = circularPoints[(i + 1) % circularPoints.length];
				const height = (p0.y < 0 === p1.y < 0) ? Math.min(Math.abs(p0.y), Math.abs(p1.y)) : 0;
				const interpretations = [];
				if (Math.abs(p1.x - p0.x) < Math.PI*R) {
					interpretations.push([p0.x, p1.x, height]); // well, usually there's just one
				}
				else {
					interpretations.push([p0.x, p1.x + 2*Math.PI*R*Math.sign(p0.x), height]); // but sometimes there's clipping on the periodic boundary condition...
					interpretations.push([p0.x + 2*Math.PI*R*Math.sign(p1.x), p1.x, height]); // so you have to try wrapping p0 over to p1, and also p1 over to p0
				}

				for (const [x0, x1, y] of interpretations) {
					if (height === 0) { // if this crosses the baseline, adjust the total bounds
						if (x0 < 0 || x1 < 0)
							if (Math.max(x0, x1) > xMin)
								xMin = Math.max(x0, x1);
						if (x0 > 0 || x1 > 0)
							if (Math.min(x0, x1) < xMax)
								xMax = Math.min(x0, x1);
					}
					else { // otherwise, add a floating wedge
						wedges.push({
							xL: Math.min(x0, x1) - y*aspect,
							xR: Math.max(x0, x1) + y*aspect,
							y: y,
						});
					}
				}
			}
			if (xMin > xMax) // occasionally we get these really terrible candidates
				continue; // just skip them
			wedges.sort((a: {y: number}, b: {y: number}) => b.y - a.y); // TODO it would be slightly more efficient if I can merge wedges that share a min vertex

			let {location, halfHeight} = Chart.findOpenSpotOnArc(xMin, xMax, aspect, wedges);

			const area = halfHeight*halfHeight, bendRatio = halfHeight/R, horizontality = -Math.sin(θ0);
			if (horizontality < 0) // if it's going to be upside down
				halfHeight *= -1; // flip it around
			const value = Math.log(area) - bendRatio/(1 - bendRatio) + Math.pow(horizontality, 2); // choose the axis with the biggest area and smallest curvature
			if (value > axisValue) {
				axisValue = value;
				axisR = R;
				axisCx = cx;
				axisCy = cy;
				axisΘL = θ0 + location/R - halfHeight*aspect/R;
				axisΘR = θ0 + location/R + halfHeight*aspect/R;
				axisH = 2*Math.abs(halfHeight); // TODO: enforce font size limit
			}
		}
		if (axisR === null) {
			console.error(`all ${candidates.length} candidates were somehow incredible garbage`);
			return null;
		}

		// const axos = [];
		// for (const i of axis)
		// 	axos.push({type:'L', args:[centers[i].x, -centers[i].y]});
		// axos[0].type = 'M';
		// const drawing = this.draw(axos, svg);
		// drawing.setAttribute('style', 'stroke-width:.5px; fill:none; stroke:#004;');

		const arc = this.draw([ // make the arc in the SVG
			{type: 'M', args: [
				axisCx + axisR*Math.cos(axisΘL), -(axisCy + axisR*Math.sin(axisΘL))]},
			{type: 'A', args: [
				axisR, axisR, 0,
				(Math.abs(axisΘR - axisΘL) < Math.PI) ? 0 : 1,
				(axisΘR > axisΘL) ? 0 : 1,
				axisCx + axisR*Math.cos(axisΘR), -(axisCy + axisR*Math.sin(axisΘR))]},
		], svg);
		// arc.setAttribute('style', `fill: none; stroke: #400; stroke-width: .5px;`);
		arc.setAttribute('style', `fill: none; stroke: none;`);
		arc.setAttribute('id', `labelArc${this.labelIndex}`);
		// svg.appendChild(arc);
		const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'text'); // start by creating the text element
		textGroup.setAttribute('style', `font-size: ${axisH}px`);
		svg.appendChild(textGroup);
		const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
		textPath.setAttribute('class', 'zemgrafe-label');
		textPath.setAttribute('startOffset', '50%');
		textPath.setAttribute('href', `#labelArc${this.labelIndex}`);
		textGroup.appendChild(textPath);
		textPath.textContent = label; // buffer the label with two spaces to ensure adequate visual spacing

		this.labelIndex += 1;

		return textGroup;
	}

	private static findOpenSpotOnArc(min: number, max: number, aspect: number,
							  wedges: {xL: number, xR: number, y: number}[]
	): { location: number, halfHeight: number } {

		const validRegion = new ErodingSegmentTree(min, max); // construct segment tree
		let y = 0; // iterate height upward until no segments are left
		while (true) {
			if (wedges.length > 0) {
				const pole = validRegion.getCenter();
				const next = wedges.pop();
				if (next.y < y + pole.radius/aspect) { // if the next wedge comes before we run out of space
					validRegion.erode((next.y - y)*aspect); // go up to it
					y = next.y;
					if (validRegion.getMinim() >= next.xL && validRegion.getMaxim() <= next.xR) { // if it obstructs the entire remaining area
						if (validRegion.contains(0)) // pick a remaining spot and return the current heit
							return {halfHeight: y, location: 0};
						else
							return {halfHeight: y, location: validRegion.getClosest(0)};
					}
					else {
						validRegion.remove(next.xL, next.xR); // or just cover up whatever area it obstructs
					}
				}
				else { // if the next wedge comes to late, find the last remaining point
					return {location: pole.location, halfHeight: pole.radius/aspect};
				}
			}
		}
	}

	/**
	 * convert the series of segments to an HTML path element and add it to the Element
	 * @param segments
	 * @param svg
	 */
	draw(segments: PathSegment[], svg: Element): SVGPathElement {
		let str = ''; // create the d string
		for (let i = 0; i < segments.length; i ++)
			str += segments[i].type + segments[i].args.join(',') + ' ';

		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', str);
		path.setAttribute('vector-effect', 'non-scaling-stroke');
		return svg.appendChild(path); // put it in the SVG
	}


	/**
	 * create an ordered Iterator of segments that form the border of this civ
	 * @param civ the Civ whose outline is desired
	 */
	static border(civ: Civ): PathSegment[] {
		const landNodos = filterSet(civ.nodos, (n) => n.biome !== 'samud');
		return Chart.outline(landNodos);
	}

	/**
	 * create an ordered Iterator of segments that form the boundary of these nodos.
	 * @param nodos Set of Node that are part of this group.
	 * @return Array of PathSegments, ordered widdershins.
	 */
	static outline(nodos: Nodo[] | Set<Nodo>): PathSegment[] {
		nodos = new Set(nodos);
		const accountedFor = new Set(); // keep track of which Edge have been done
		const output: PathSegment[] = []; // TODO: will this thro an error if I try to outline the entire map?
		for (let ind of nodos) { // look at every included node
			for (let way of ind.neighbors.keys()) { // and every node adjacent to an included one
				if (nodos.has(way))    continue; // (we only care if that adjacent node is excluded)
				const startingEdge = ind.neighbors.get(way); // the edge between them defines the start of the loop
				if (accountedFor.has(startingEdge)) continue; // (and can ignore edges we've already hit)

				const loopIdx = output.length;
				do {
					const next = ind.leftOf(way); // look for the next triangle, going widdershins
					if (next !== null) { // assuming there is one,
						const vertex = next.circumcenter; // pick out its circumcenter to plot
						output.push({type: 'L', args: [vertex.ф, vertex.λ]}); // make the Path segment
						const lastEdge = ind.neighbors.get(way);
						accountedFor.add(lastEdge); // check this edge off
						if (nodos.has(next.acrossFrom(lastEdge))) // then, depending on the state of the Node after that Triangle
							ind = next.acrossFrom(lastEdge); // advance one of the state nodos
						else
							way = next.acrossFrom(lastEdge);
					}
					else { // if there isn't a next triangle
						if (output.length > loopIdx)
							output.push({type: 'L', args: [Number.NEGATIVE_INFINITY, Number.NaN]}); // draw a line to infinity
						else
							break; // unless you're trying to start a new seccion; the lines to infinity must be in the middle of seccions
						way = ind;
						let i = 0;
						do {
							way = way.surface.edge.get(way).next; // and shimmy way around the internal portion of the edge
							i ++;
						} while (nodos.has(way)); // until it becomes external again
						ind = way.surface.edge.get(way).prev; // then, grab the new ind and continue
					}
				} while (ind.neighbors.get(way) !== startingEdge && output.length < 10000); // continue until you go all the way around this loop

				if (loopIdx < output.length) {
					output[loopIdx].type = 'M'; // whenever a loop ends, set its beginning to a moveTo
					output.push({type: 'L', args: [...output[loopIdx].args]}); // and add closure
				}
			}
		}

		return output;
	}

	/**
	 * create an ordered Iterator of segments that form all of these lines, aggregating where
	 * applicable. aggregation may behave unexpectedly if some members of lines contain
	 * nonendpoints that are endpoints of others.
	 * @param lines Set of lists of points to be combined and pathified.
	 */
	static aggregate(lines: Iterable<Place[]>): PathSegment[] {
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
			let line = [...queue.pop()]; // check each given line (we've only shallow-copied until now, so make sure you don't alter the input lines themselves)
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
					throw Error(`i broke it ${l[0].ф} -> ${l[l.length-1].ф}`);
				if (torsos.has(l[0]) || torsos.has(l[l.length - 1]))
					throw Error(`yoo broke it! ${l[0].ф} -> ${l[l.length-1].ф}`);
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
			output.push({type: 'M', args: [line[0].ф, line[0].λ]});
			for (let i = 1; i < line.length; i ++)
				output.push({type: 'L', args: [line[i].ф, line[i].λ]});
		}
		return output;
	}

	static smooth(input: PathSegment[]): PathSegment[] {
		const segments = input.slice();
		for (let i = segments.length - 2; i >= 0; i --) {
			const newEnd = [ // look ahead to the midpoint between this and the next
				(segments[i].args[0] + segments[i+1].args[0])/2,
				(segments[i].args[1] + segments[i+1].args[1])/2];
			if (segments[i].type === 'L' && segments[i+1].type !== 'M') // look for points that are sharp angles
				segments[i] = {type: 'Q', args: [...segments[i].args, ...newEnd]}; // and extend those lines into curves
			else if (segments[i].type === 'M' && segments[i+1].type === 'Q') { // look for curves that start with Bezier curves
				segments.splice(i + 1, 0, {type: 'L', args: newEnd}); // assume we put it there and restore some linearity
			}
		}
		return segments;
	}

}

