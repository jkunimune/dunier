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
// @ts-ignore
import TinyQueue from '../lib/tinyqueue.js';

import {Nodo, Place, Surface, Triangle} from "../planet/surface.js";
import {
	Vector,
	longestShortestPath,
} from "../util/util.js";
import {World} from "../society/world.js";
import {MapProjection, PathSegment} from "./projection.js";
import {Civ} from "../society/civ.js";
import {delaunayTriangulate} from "../util/delaunay.js";
import {circularRegression} from "../util/fitting.js";
import {ErodingSegmentTree} from "../util/erodingsegmenttree.js";

const MAP_PRECISION = 5e-2;
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
	depict(surface: Surface, world: World, svg: SVGGElement, zemrang: string, marorang: string, filter: string = 'nol',
		   nade: boolean = true, kenare: boolean = true, shade: boolean = false,
		   civLabels: boolean = false, geoLabels: boolean = false,
		   fontSize: number = 2, style: string = null) {
		svg.setAttribute('viewBox',
			`${this.projection.left} ${this.projection.top}
			 ${this.projection.right - this.projection.left} ${this.projection.bottom - this.projection.top}`);
		svg.textContent = ''; // clear the layer
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		g.setAttribute('id', 'jeni-zemgrafe');
		svg.appendChild(g);

		this.testTextSize = Math.min(
			(this.projection.right - this.projection.left)/18,
			this.projection.bottom - this.projection.top);
		this.testText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		this.testText.setAttribute('class', 'zemgrafe-label');
		this.testText.setAttribute('style', `font-size: ${this.testTextSize}px;`);
		svg.appendChild(this.testText);

		let nadorang = 'none';
		if (marorang === 'nili') { // color the sea deep blue
			this.fill([...surface.nodos].filter(n => n.biome === 'samud'), g, BIOME_COLORS.get('samud'));
			nadorang = BIOME_COLORS.get('samud');
		} else if (marorang === 'gawia') { // color the sea by altitude
			for (let i = 0; i < DEPTH_COLORS.length; i++) {
				const min = (i !== 0) ? i * DEPTH_STEP : Number.NEGATIVE_INFINITY;
				const max = (i !== DEPTH_COLORS.length - 1) ? (i + 1) * DEPTH_STEP : Number.POSITIVE_INFINITY;
				this.fill([...surface.nodos].filter(n => n.biome === 'samud' && -n.gawe >= min && -n.gawe < max),
					g, DEPTH_COLORS[i]); // TODO: enforce contiguity of shallow ocean?
			}
			nadorang = DEPTH_COLORS[0]; // TODO: outline ocean + cerni nade?
		}

		if (zemrang === 'jivi') { // draw the biomes
			for (const biome of BIOME_COLORS.keys())
				if (biome !== 'samud')
					this.fill([...surface.nodos].filter(n => n.biome === biome), g, BIOME_COLORS.get(biome));
		}
		else if (zemrang === 'politiki' && world !== null) { // draw the countries
			this.fill([...surface.nodos].filter(n => n.biome !== 'samud'), g, BIOME_COLORS.get('kagaze'));
			const biggestCivs = new TinyQueue([...world.civs],
				(a: Civ, b: Civ) => b.getPopulation() - a.getPopulation());
			for (let i = 0; i < COUNTRY_COLORS.length && biggestCivs.length > 0; i++)
				this.fill([...biggestCivs.pop().nodos].filter(n => n.biome !== 'samud'), g, COUNTRY_COLORS[i]);
		}
		else if (zemrang === 'gawia') { // color the sea by altitude
			for (let i = 0; i < ALTITUDE_COLORS.length; i++) {
				const min = (i !== 0) ? i * ALTITUDE_STEP : Number.NEGATIVE_INFINITY;
				const max = (i !== ALTITUDE_COLORS.length - 1) ? (i + 1) * ALTITUDE_STEP : Number.POSITIVE_INFINITY;
				this.fill([...surface.nodos].filter(n => n.biome !== 'samud' && n.gawe >= min && n.gawe < max),
					g, ALTITUDE_COLORS[i]);
			}
		}

		if (nade) {
			this.stroke([...surface.rivers].filter(ud => ud[0].liwe >= RIVER_DISPLAY_THRESHOLD),
				g, nadorang, 1.5, true);
		}

		if (kenare && world !== null) {
			for (const civ of world.civs) {
				if (civ.getPopulation() > 0) {
					const titledG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
					const hover = document.createElementNS('http://www.w3.org/2000/svg', 'title');
					const text = document.createTextNode(
						`${civ.getName().toString(style)}\n` +
						`[${civ.getName().toString('ipa')}]`);
					hover.appendChild(text);
					titledG.appendChild(hover);
					g.appendChild(titledG);
					this.fill([...civ.nodos].filter(n => n.biome !== 'samud'), titledG,
						'none', '#000', 0.7).setAttribute('pointer-events', 'all');
				}
			}
		}

		if (shade) { // add relief shadows
			this.shade(surface.triangles, g);
		}

		if (civLabels && world !== null) {
			for (const civ of world.civs) // TODO: the hover text should go on this
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
	 * @param smooth whether to apply Bezier smoothing to the outline
	 * @return the newly created element encompassing these triangles.
	 */
	fill(nodos: Nodo[], svg: SVGGElement, color: string,
		 stroke: string = 'none', strokeWidth: number = 0, smooth: boolean = false): SVGPathElement {
		if (nodos.length <= 0)
			return this.draw([], svg);
		const path = this.draw(this.map(Chart.outline(new Set(nodos)), smooth, true), svg);
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
		const path = this.draw(this.map(Chart.trace(strokes), smooth, false), svg);
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
			this.draw(this.map(path, false, true), svg).setAttribute('style',
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
		const mapScale = svg.clientWidth/(this.projection.right - this.projection.left); // and also the current size of the map in px for reference
		const aspect = boundBox.width/(this.testTextSize*mapScale);
		minFontSize = minFontSize/mapScale; // TODO: at some point, I probably have to grapple with the printed width of the map.

		const path = this.map(Chart.outline(new Set(nodos)), false, true); // do the projection
		for (let i = path.length - 1; i >= 1; i --) { // convert it into a simplified polygon
			if (path[i].type === 'A') { // turn arcs into triscadecagons TODO: find out if this can create coincident nodes and thereby Delaunay Triangulation to fail
				const x0 = path[i-1].args[path[i-1].args.length-2], y0 = path[i-1].args[path[i-1].args.length-1];
				const x1 = path[i].args[path[i].args.length-2], y1 = path[i].args[path[i].args.length-1];
				const l = Math.hypot(x1 - x0, y1 - y0);
				const r = (path[i].args[0] + path[i].args[1])/2;
				const cx = 0, cy = 0; // XXX: this could be an actual calculation, but I know that the only time an arc will come up is when it is centered on the origin
				const Δθ = 2*Math.asin(l/(2*r));
				const θ0 = Math.atan2(y0 - cy, x0 - cx);
				const nSegments = Math.ceil(N_DEGREES*Δθ);
				const lineApprox = [];
				for (let j = 1; j <= nSegments; j ++)
					lineApprox.push({type: 'L', args: [
							cx + r*Math.cos(θ0 + Δθ*j/nSegments),
							cy + r*Math.sin(θ0 + Δθ*j/nSegments)]});
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
			centers[i].isContained = Chart.contains(path, {x: centers[i].x, y: -centers[i].y});
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

			let xMin = -Math.PI*R, xMax = Math.PI*R;
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

			const validRegion = new ErodingSegmentTree(xMin, xMax); // construct segment tree

			let halfHeight = 0; // iterate height upward until only one segment is left
			let best;
			while (true) {
				if (wedges.length > 0 && wedges[wedges.length-1].y - halfHeight < validRegion.getRadius()/aspect) { // either go to the next wedge if it comes before we run out of space
					const {xL, xR, y} = wedges.pop();
					validRegion.erode((y - halfHeight)*aspect);
					halfHeight = y;
					if (validRegion.getMinim() >= xL && validRegion.getMaxim() <= xR) {
						if (validRegion.contains(0))
							best = 0;
						else
							best = validRegion.getClosest(0);
						break;
					}
					else {
						validRegion.block(xL, xR);
					}
				}
				else { // or go to here we run out of space
					best = validRegion.getPole();
					halfHeight += validRegion.getRadius()/aspect;
					break;
				}
			}
			const area = halfHeight*halfHeight, bendRatio = halfHeight/R, horizontality = -Math.sin(θ0);
			if (horizontality < 0) // if it's going to be upside down
				halfHeight *= -1; // flip it around
			const value = Math.log(area) - bendRatio/(1 - bendRatio) + Math.pow(horizontality, 2); // choose the axis with the biggest area and smallest curvature
			if (value > axisValue) {
				axisValue = value;
				axisR = R;
				axisCx = cx;
				axisCy = cy;
				axisΘL = θ0 + best/R - halfHeight*aspect/R;
				axisΘR = θ0 + best/R + halfHeight*aspect/R;
				axisH = 2*Math.abs(halfHeight); // TODO: enforce font size limit
			}
		}
		if (axisR === null) {
			console.log(`all ${candidates.length} candidates were somehow incredible garbage`);
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
	 * project and convert a list of SVG paths in latitude-longitude coordinates representing a series of closed paths
	 * into an SVG.Path object, and add that Path to the given SVG.
	 * @param segments ordered Iterator of segments, which each have attributes .type (str) and .args ([double])
	 * @param smooth an optional feature that will smooth the Path out into Bezier curves
	 * @param closed if this is set to true, the map will make adjustments to account for its complete nature
	 * @returns SVG.Path object
	 */
	map(segments: PathSegment[], smooth: boolean, closed: boolean): PathSegment[] {
		if (segments.length === 0) // what're you trying to pull here?
			return [];

		let touchedEdge = false;
		for (let i = 1; i < segments.length; i ++) { // first, handle places where it crosses the edge of the map
			if (segments[i].type === 'L') {
				if (!Number.isFinite(segments[i].args[0])) { // if a point is at infinity
					if (segments[i].args[0] < 0)
						segments.splice(i, 1, // remove it
							{type: 'L', args: [this.projection.surface.φMin, segments[i-1].args[1]]},
							{type: 'M', args: [this.projection.surface.φMin, segments[i+1].args[1]]}); // and add a moveto along the South edge
					else
						throw "I haven't accounted for positive infinity points.";
					touchedEdge = true;
				}

				const crossing = this.projection.getCrossing(segments[i-1].args, segments[i].args);
				if (crossing !== null) { // otherwise, if it jumps across an interruption
					const {endpoint0, endpoint1} = crossing;
					segments.splice(i, 0,
						{type: 'L', args: [endpoint0.φ, endpoint0.λ]}, // insert a line to the very edge
						{type: 'M', args: [endpoint1.φ, endpoint1.λ]}); // and then a moveto to the other side
					touchedEdge = true;
					i --; // then step back to check if there was another one
				}
			}
		}

		const sections: PathSegment[][] = []; // then, break this up into sections
		let start = 0;
		for (let i = 1; i <= segments.length; i ++) { // sweep through the result
			if (i === segments.length || segments[i].type === 'M') { // and split it up at movetos and endings
				sections.push(segments.slice(start, i));
				start = i;
			}
		}

		const precision = MAP_PRECISION*Math.hypot(
			this.projection.right - this.projection.left, this.projection.top - this.projection.bottom)
		const cutPoints: PathSegment[] = []; // now start putting together the projected points
		let jinPoints = sections.pop();
		let supersectionStart = jinPoints[0].args;
		while (jinPoints !== undefined) {
			const base = cutPoints.length;
			for (let i = 0; i < jinPoints.length; i ++) { // now run through the section
				const [φ1, λ1] = jinPoints[i].args;
				const {x, y} = this.projection.project(φ1, λ1); // projecting points and adding them to the thing
				cutPoints.push({type: jinPoints[i].type, args: [x, y]});
			}

			let repeatCount = 0;
			for (let i = base + 1; i < cutPoints.length; i ++) { // then go back through
				const [x0, y0] = cutPoints[i-1].args;
				const [x1, y1] = cutPoints[i].args;
				if (Math.hypot(x1 - x0, y1 - y0) > precision) { // and fill in segments that are too long
					const [φ0, λ0] = jinPoints[i-base-1].args;
					const [φ1, λ1] = jinPoints[i-base].args;
					const {φ, λ} = this.projection.getMidpoint(φ0, λ0, φ1, λ1); // by splitting them in half
					const {x, y} = this.projection.project(φ, λ);
					jinPoints.splice(i-base, 0, {type: 'L', args: [φ, λ]}); // and adding the midpoints to the polygon
					cutPoints.splice(i,           0, {type: 'L', args: [x, y]});
					i --; // and check again
					repeatCount ++;
				}
				if (repeatCount > 10000)
					throw "_someone_ (not pointing any fingers) missd an interrupcion.";
			}

			const end = jinPoints[jinPoints.length-1].args; // when all that's done, look at where we are
			if (!closed) { // if we're not worrying about closing it off
				jinPoints = null; // forget it and move onto whatever else
			}
			else if (supersectionStart[0] === end[0] && supersectionStart[1] === end[1]) { // if this whole section is one big loop
				jinPoints = null; // also move on
			}
			else {
				const endPosition = this.projection.getPositionOnEdge(end[0], end[1]);
				if (endPosition !== null) { // if we ended hitting a wall
					const edges = this.projection.getEdges()[endPosition.loop];

					const possibleStarts = sections.map((s) => s[0].args).concat([supersectionStart]);
					let bestSection = null, bestPosition = Number.POSITIVE_INFINITY;
					for (let i = 0; i < possibleStarts.length; i ++) { // check the remaining sections
						const restart = possibleStarts[i];
						let restartPosition = this.projection.getPositionOnEdge(restart[0], restart[1]);
						if (restartPosition !== null && restartPosition.loop === endPosition.loop) {
							if (restartPosition.index < endPosition.index)
								restartPosition.index += edges.length;
							if (restartPosition.index < bestPosition) {
								bestSection = i; // to find which one should come next
								bestPosition = restartPosition.index;
							}
						}
					}
					const endEdge = Math.trunc(endPosition.index), restartEdge = Math.trunc(bestPosition);
					const restart = possibleStarts[bestSection];
					for (let i = endEdge; i <= restartEdge; i ++) { // go around the edges to the new restarting point
						const edge = edges[i%edges.length];
						const currentPlace = (i === endEdge) ? end : [edge.start.φ, edge.start.λ];
						const targetPlace = (i === restartEdge) ? restart : [edge.end.φ, edge.end.λ];
						if (currentPlace !== targetPlace)
							cutPoints.push(...edge.trace(
								currentPlace[0], currentPlace[1], targetPlace[0], targetPlace[1],
							));
					}
					if (bestSection !== sections.length) // if you found a new place to restart
						jinPoints = sections.splice(bestSection, 1)[0].slice(1); // and then take that as the next section without its moveto
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
					if (jinPoints === null)
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
				for (const loop of this.projection.getEdges()) { // draw the outline of the entire map to contain it
					const startingPoint = loop[0].start;
					const {x, y} = this.projection.project(startingPoint.φ, startingPoint.λ);
					cutPoints.push({type: 'M', args: [x, y]});
					for (const edge of loop)
						cutPoints.push(...edge.trace(edge.start.φ, edge.start.λ, edge.end.φ, edge.end.λ));
				}
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

		return cutPoints;
	}



	/**
	 * find out if a point is contained by a polygon, using an even/odd rule.
	 * @param polygon
	 * @param point
	 * @return whether point is inside polygon
	 */
	static contains(polygon: PathSegment[], point: {x: number, y: number}): boolean {
		let contained = false;
		for (let i = 0; i < polygon.length; i ++)
			console.assert(polygon[i].type === 'M' || polygon[i].type === 'L', "I can't do that segment type.");
		for (let i = 1; i < polygon.length; i ++) {
			if (polygon[i].type === 'L') {
				const [x0, y0] = polygon[i-1].args;
				const [x1, y1] = polygon[i].args;
				if ((y0 < point.y) !== (y1 < point.y))
					if (x0 + (point.y - y0)/(y1 - y0)*(x1 - x0) > point.x)
						contained = !contained;
			}
		}
		return contained;
	}



	/**
	 * create an ordered Iterator of segments that form all of these lines, aggregating where
	 * applicable. aggregation may behave unexpectedly if some members of lines contain
	 * nonendpoints that are endpoints of others.
	 * @param lines Set of lists of points to be combined and pathified.
	 */
	static trace(lines: Iterable<Place[]>): PathSegment[] {
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
	static outline(nodos: Set<Nodo>): PathSegment[] {
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
						output.push({type: 'L', args: [vertex.φ, vertex.λ]}); // make the Path segment
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

}

