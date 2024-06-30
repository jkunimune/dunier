/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Edge, EmptySpace, Surface, Tile, Vertex} from "../surface/surface.js";
import {filterSet, linterp, localizeInRange, longestShortestPath, pathToString} from "../utilities/miscellaneus.js";
import {ARABILITY, World} from "../generation/world.js";
import {MapProjection} from "./projection.js";
import {Civ} from "../generation/civ.js";
import {delaunayTriangulate} from "../utilities/delaunay.js";
import {circularRegression} from "../utilities/fitting.js";
import {ErodingSegmentTree} from "../datastructures/erodingsegmenttree.js";
import {
	assert_xy,
	endpoint,
	Location,
	LongLineType,
	PathSegment,
	Place
} from "../utilities/coordinates.js";
import {chordCenter, signAngle, Vector} from "../utilities/geometry.js";
import {Biome} from "../generation/terrain.js";
import {
	applyProjectionToPath,
	contains,
	cutToSize,
	InfinitePlane,
	MapEdge,
	transformInput,
	transformOutput
} from "./plotting.js";

// DEBUG OPTIONS
const DISABLE_GREEBLING = false; // make all lines as simple as possible
const SMOOTH_RIVERS = false; // make rivers out of bezier curves so there's no sharp corners
const COLOR_BY_TECHNOLOGY = false; // choropleth the countries by technological level rather than
const SHOW_BACKGROUND = false; // have a big red rectangle under the map

// OTHER FIXED DISPLAY OPTIONS
const GREEBLE_FACTOR = 1e-2; // the smallest edge lengths to show relative to the map size
const SUN_ELEVATION = 60/180*Math.PI;
const AMBIENT_LIGHT = 0.2;
const RIVER_DISPLAY_FACTOR = 6e-2; // the watershed area relative to the map area needed to display a river
const BORDER_SPECIFY_THRESHOLD = 0.51;
const SIMPLE_PATH_LENGTH = 72; // maximum number of vertices for estimating median axis
const N_DEGREES = 6; // number of line segments into which to break one radian of arc
const RALF_NUM_CANDIDATES = 6; // number of sizeable longest shortest paths to try using for the label
const MAP_PRECISION = 5e-2;

const BIOME_COLORS = new Map([
	[Biome.OCEAN,     '#06267f'],
	[Biome.LAKE,      '#06267f'],
	[Biome.SWAMP,     '#444921'],
	[Biome.JUNGLE,    '#176D0D'],
	[Biome.FOREST,    '#647F45'],
	[Biome.TAIGA,     '#4EA069'],
	[Biome.STEAMLAND, '#DD9C6F'],
	[Biome.PLAINS,    '#BED042'],
	[Biome.DESERT,    '#F5E292'],
	[Biome.TUNDRA,    '#FFFFFF'],
	[Biome.ICE,       '#FFFFFF'],
	[null,            '#FAF2E4'],
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

enum Layer {
	GEO,
	BIO,
	KULTUR,
}


/**
 * a class to handle all of the graphical arrangement stuff.
 */
export class Chart {
	private readonly projection: MapProjection;
	private readonly northUp: boolean;
	private readonly centralMeridian: number;
	private readonly geoEdges: MapEdge[][];
	private readonly mapEdges: MapEdge[][];
	public readonly dimensions: Dimensions;
	public readonly scale: number; // the map scale in map-widths per km
	private testText: SVGTextElement;
	private testTextSize: number;
	private labelIndex: number;


	constructor(
		projection: MapProjection, northUp: boolean, focus: PathSegment[], rectangularBounds: boolean,
	) {
		this.projection = projection;
		this.northUp = northUp;
		
		this.centralMeridian = Chart.chooseCentralMeridian(focus);
		// establish the bounds of the map
		focus = cutToSize(
			transformInput(this.centralMeridian, focus),
			this.projection.surface,
			[Chart.rectangle(projection.surface.фMax, Math.PI, projection.surface.фMin, -Math.PI, true)],
			true,
		);
		const {фMin, фMax, λMax, xRight, xLeft, yBottom, yTop} =
			Chart.calculateMapBounds(focus, projection, rectangularBounds);
		this.labelIndex = 0;

		// flip them if it's a south-up map
		if (this.northUp)
			this.dimensions = new Dimensions(xLeft, xRight, yTop, yBottom);
		else
			this.dimensions = new Dimensions(-xRight, -xLeft, -yBottom, -yTop);

		// calculate the map scale in map-widths per km
		this.scale = 1/this.dimensions.diagonal;
		
		// set the geographic and Cartesian limits of the mapped area
		if (λMax === Math.PI && this.projection.wrapsAround())
			this.geoEdges = [
				[{
					type: LongLineType.PARALLEL,
					start: { s: фMax, t:  λMax },
					end:   { s: фMax, t: -λMax },
				}],
				[{
					type: LongLineType.PARALLEL,
					start: { s: фMin, t: -λMax },
					end:   { s: фMin, t:  λMax },
				}]
			];
		else
			this.geoEdges = [Chart.rectangle(фMax, λMax, фMin, -λMax, true)];
		this.mapEdges = [Chart.rectangle(this.dimensions.left, this.dimensions.top, this.dimensions.right, this.dimensions.bottom, false)];
	}

	/**
	 * do your thing
	 * @param surface the surface that we're mapping
	 * @param world the world on that surface, if we're mapping human features
	 * @param svg the SVG element on which to draw everything
	 * @param landColor the color scheme for the land areas
	 * @param seaColor the color scheme for the ocean areas
	 * @param filter the color filter to apply
	 * @param rivers whether to add rivers
	 * @param borders whether to add state borders
	 * @param shading whether to add shaded relief
	 * @param civLabels whether to label countries
	 * @param geoLabels whether to label mountain ranges and seas
	 * @param fontSize the size of city labels and minimum size of country and biome labels [pt]
	 * @param style the transliteration convention to use for them
	 * @return the list of Civs that are shown in this map
	 */
	depict(surface: Surface, world: World | null, svg: SVGGElement,
	       landColor: string, seaColor: string, filter: string,
		   rivers: boolean, borders: boolean, shading: boolean,
		   civLabels: boolean, geoLabels: boolean,
		   fontSize = 2, style: string = null): Civ[] {
		const bbox = this.dimensions;
		svg.setAttribute('viewBox',
			`${bbox.left} ${bbox.top} ${bbox.width} ${bbox.height}`);
		svg.textContent = ''; // clear the layer
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		g.setAttribute('id', 'generated-map');
		svg.appendChild(g);

		this.testTextSize = Math.min(
			(bbox.width)/18,
			bbox.height);
		this.testText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		this.testText.setAttribute('class', 'map-label');
		this.testText.setAttribute('style', `font-size: ${this.testTextSize}px;`);
		svg.appendChild(this.testText);

		if (SHOW_BACKGROUND) {
			const rectangle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			rectangle.setAttribute('x', `${this.dimensions.left}`);
			rectangle.setAttribute('y', `${this.dimensions.top}`);
			rectangle.setAttribute('width', `${this.dimensions.width}`);
			rectangle.setAttribute('height', `${this.dimensions.height}`);
			rectangle.setAttribute('style', 'fill: red; stroke: black; stroke-width: 10px');
			g.appendChild(rectangle);
		}

		let riverColor = '#ff00ff'; // the river color will depend on the ocean color (by default make it this awful color so I can tell something's rong)
		if (seaColor === 'blue') { // color the sea deep blue
			this.fill(
				filterSet(surface.tiles, n => n.biome === Biome.OCEAN),
				g, BIOME_COLORS.get(Biome.OCEAN), Layer.GEO);
			riverColor = BIOME_COLORS.get(Biome.OCEAN);
		}
		else if (seaColor === 'heightmap') { // color the sea by altitude
			for (let i = 0; i < DEPTH_COLORS.length; i++) {
				const min = (i !== 0) ? i * DEPTH_STEP : -Infinity;
				const max = (i !== DEPTH_COLORS.length - 1) ? (i + 1) * DEPTH_STEP : Infinity;
				this.fill(
					filterSet(surface.tiles, n => n.biome === Biome.OCEAN && -n.height >= min && -n.height < max),
					g, DEPTH_COLORS[i], Layer.GEO); // TODO: enforce contiguity of shallow ocean?
			}
			riverColor = DEPTH_COLORS[0]; // TODO: outline ocean + black rivers?
		}

		if (landColor === 'physical') { // draw the biomes
			for (const biome of BIOME_COLORS.keys())
				if (biome !== Biome.OCEAN)
					this.fill(
						filterSet(surface.tiles, n => n.biome === biome),
						g, BIOME_COLORS.get(biome), Layer.BIO);
		}
		else if (landColor === 'political') { // draw the countries
			if (world === null)
				throw new Error("this Chart was asked to color land politicly but the provided World was null");
			this.fill(
				filterSet(surface.tiles, n => n.biome !== Biome.OCEAN),
				g, BIOME_COLORS.get(null), Layer.KULTUR);
			const biggestCivs = world.getCivs(true).reverse();
			for (let i = 0; biggestCivs.length > 0; i++) {
				const civ = biggestCivs.pop();
				let color;
				if (COLOR_BY_TECHNOLOGY) {
					console.log(`${civ.getName().toString()} has advanced to ${civ.technology.toFixed(1)}`);
					color = `rgb(${Math.max(0, Math.min(210, Math.log(civ.technology)*128 - 360))}, ` +
					            `${Math.max(0, Math.min(210, Math.log(civ.technology)*128))}, ` +
						        `${Math.max(0, Math.min(210, Math.log(civ.technology)*128 - 180))})`;
				}
				else {
					if (i >= COUNTRY_COLORS.length)
						break;
					color = COUNTRY_COLORS[i];
				}
				this.fill(
					filterSet(civ.tiles, n => n.biome !== Biome.OCEAN),
					g, color, Layer.KULTUR);
			}
		}
		else if (landColor === 'heightmap') { // color the sea by altitude
			for (let i = 0; i < ALTITUDE_COLORS.length; i++) {
				const min = (i !== 0) ? i * ALTITUDE_STEP : -Infinity;
				const max = (i !== ALTITUDE_COLORS.length - 1) ? (i + 1) * ALTITUDE_STEP : Infinity;
				this.fill(
					filterSet(surface.tiles, n => n.biome !== Biome.OCEAN && n.height >= min && n.height < max),
					g, ALTITUDE_COLORS[i], Layer.GEO);
			}
		}

		// add rivers
		if (rivers) {
			const riverDisplayThreshold = RIVER_DISPLAY_FACTOR*this.dimensions.area;
			this.stroke([...surface.rivers].filter(ud => ud[0].flow >= riverDisplayThreshold),
				g, riverColor, 1.5, Layer.GEO);
		}

		// add borders with hovertext
		if (borders) {
			if (world === null)
				throw new Error("this Chart was asked to draw political borders but the provided World was null");
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
						filterSet(civ.tiles, n => n.biome !== Biome.OCEAN),
						titledG,
						'none', Layer.KULTUR, '#111', 0.7).setAttribute('pointer-events', 'all');
				// }
			}
		}

		// add relief shadows
		if (shading) {
			this.shade(surface.vertices, g);
		}

		// finally, label everything
		if (civLabels) {
			if (world === null)
				throw new Error("this Chart was asked to label countries but the provided World was null");
			for (const civ of world.getCivs()) // TODO: the hover text should go on this
				if (civ.getPopulation() > 0)
					this.label(
						[...civ.tiles].filter(n => !n.isWater()), // TODO: do something fancier... maybe the intersection of the voronoi space and the convex hull
						civ.getName().toString(style),
						svg,
						fontSize);
		}

		if (world !== null) {
			// finally, check which Civs are on this map
			// (this is somewhat inefficient, since it probably already calculated this, but it's pretty quick, so I think it's fine)
			const visible = [];
			for (const civ of world.getCivs(true))
				if (this.projectPath(
					Chart.convertToGreebledPath(
						Chart.outline([...civ.tiles].filter(n => !n.isWater())),
						Layer.KULTUR, this.scale),
					true).length > 0)
					visible.push(civ);
			return visible;
		}
		else {
			return null;
		}
	}

	/**
	 * draw a region of the world on the map with the given color.
	 * @param tiles Iterator of Tiles to be colored in.
	 * @param svg object on which to put the Path.
	 * @param color color of the interior.
	 * @param greeble what kind of edge it is for the purposes of greebling
	 * @param stroke color of the outline.
	 * @param strokeWidth the width of the outline to put around it (will match fill color).
	 * @return the newly created element encompassing these tiles.
	 */
	fill(tiles: Set<Tile>, svg: SVGGElement, color: string, greeble: Layer,
		 stroke = 'none', strokeWidth = 0): SVGPathElement {
		if (tiles.size <= 0)
			return this.draw([], svg);
		const closePath = color !== 'none'; // leave the polygons open if we're not coloring them in
		const segments = this.projectPath(
			Chart.convertToGreebledPath(Chart.outline(tiles), greeble, this.scale),
			closePath);
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
	 * @param greeble what kind of edge it is for the purposes of greebling
	 * @returns the newly created element comprising all these lines
	 */
	stroke(strokes: Iterable<Place[]>, svg: SVGGElement,
		   color: string, width: number, greeble: Layer): SVGPathElement {
		let segments = this.projectPath(
			Chart.convertToGreebledPath(Chart.aggregate(strokes), greeble, this.scale), false);
		if (SMOOTH_RIVERS)
			segments = Chart.smooth(segments);
		const path = this.draw(segments, svg);
		path.setAttribute('style',
			`fill: none; stroke: ${color}; stroke-width: ${width}; stroke-linejoin: round; stroke-linecap: round;`);
		return path;
	}

	/**
	 * create a relief layer for the given set of triangles.
	 * @param triangles Array of Vertexes to shade as triangles.
	 * @param svg SVG object on which to shade.
	 */
	shade(triangles: Set<Vertex>, svg: SVGGElement): void { // TODO use separate delaunay triangulation
		if (!triangles)
			return;

		const slopes: Map<Vertex, number> = new Map();
		let maxSlope = 0;
		triangleSearch:
		for (const t of triangles) { // start by computing slopes of all of the triangles
			const p = [];
			for (const node of t.tiles) {
				if (node instanceof EmptySpace)
					continue triangleSearch;
				const {x, y} = this.projection.projectPoint(node);
				const z = Math.max(0, node.height);
				p.push(new Vector(x, -y, z));
			}
			let n = p[1].minus(p[0]).cross(p[2].minus(p[0])).normalized();
			slopes.set(t, n.y/n.z);
			if (n.z > 0 && slopes.get(t) > maxSlope)
				maxSlope = slopes.get(t);
		}

		const heightScale = -Math.tan(2*SUN_ELEVATION)/maxSlope; // use that to normalize

		for (const t of triangles) { // for each triangle TODO: use a newly generated triangulation
			if (!slopes.has(t))
				continue;
			const path = [];
			for (const node of t.tiles)
				path.push({type: 'L', args: [(node as Tile).ф, (node as Tile).λ]}); // put its values in a plottable form
			path.push({type: 'L', args: [...path[0].args]});
			path[0].type = 'M';
			const brightness = AMBIENT_LIGHT + (1-AMBIENT_LIGHT)*Math.max(0,
				Math.sin(SUN_ELEVATION + Math.atan(heightScale*slopes.get(t)))); // and use that to get a brightness
			this.draw(this.projectPath(path, true), svg).setAttribute('style',
				`fill: '#000'; fill-opacity: ${1-brightness};`
			);
		}
	}

	/**
	 * add some text to this region using a simplified form of the RALF labelling
	 * algorithm, described in
	 *     Krumpe, F. and Mendel, T. (2020) "Computing Curved Area Labels in Near-Real Time"
	 *     (Doctoral dissertation). University of Stuttgart, Stuttgart, Germany.
	 *     https://arxiv.org/abs/2001.02938 TODO: try horizontal labels: https://github.com/mapbox/polylabel
	 * @param tiles the Nodos that comprise the region to be labelled.
	 * @param label the text to place.
	 * @param svg the SVG object on which to write the label.
	 * @param minFontSize the smallest the label can be. if the label cannot fit inside
	 *                    the region with this font size, no label will be placed and it
	 *                    will return null.
	 */
	label(tiles: Tile[], label: string, svg: SVGElement, minFontSize: number): SVGTextElement {
		if (tiles.length === 0)
			throw new Error("there must be at least one tile to label");
		this.testText.textContent = '..'+label+'..';
		const boundBox = this.testText.getBoundingClientRect(); // to calibrate the font sizes, measure the size of some test text in px
		this.testText.textContent = '';
		const mapScale = svg.clientWidth/this.dimensions.width; // and also the current size of the map in px for reference
		const aspect = boundBox.width/(this.testTextSize*mapScale);
		minFontSize = minFontSize/mapScale; // TODO: at some point, I probably have to grapple with the printed width of the map.

		const path = this.projectPath( // do the projection
			Chart.convertToGreebledPath(Chart.outline(new Set(tiles)), Layer.KULTUR, this.scale),
			true
		);
		if (path.length === 0)
			return null;

		for (let i = path.length - 1; i >= 1; i --) { // convert it into a simplified polygon
			if (path[i].type === 'A') { // turn arcs into triscadecagons TODO: find out if this can create coincident nodes and thereby Delaunay Triangulation to fail
				const start = assert_xy(endpoint(path[i-1]));
				const end = assert_xy(endpoint(path[i]));
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
			let shortI = -1, minL = Infinity;
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
			let longI = -1, maxL = -Infinity;
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
				x:  (a.sqr()*(b.y - c.y) + b.sqr()*(c.y - a.y) + c.sqr()*(a.y - b.y)) / D, // calculating the circumcenters
				y:  (a.sqr()*(c.x - b.x) + b.sqr()*(a.x - c.x) + c.sqr()*(b.x - a.x)) / D,
				r: 0, isContained: false, edges: new Array(triangulation.triangles.length).fill(null),
			});
			centers[i].r = Math.hypot(a.x - centers[i].x, a.y - centers[i].y);
			centers[i].isContained = contains(
				path,  {s: centers[i].x, t: -centers[i].y});
			if (centers[i].isContained) {
				for (let j = 0; j < i; j ++) {
					if (centers[j].isContained) {
						const def = triangulation.triangles[j]; // and recording adjacency
						triangleFit: // TODO: what is this code doing? add better comments, and see if it can be made more efficient.
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
			const usedPoints = new Set<number>();
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

		let axisValue = -Infinity;
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
		textPath.setAttribute('class', 'map-label');
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
			else {
				throw new Error("The algorithm that finds the optimal place on an arc to place a label failed.");
			}
		}
	}

	/**
	 * convert the series of segments to an HTML path element and add it to the Element
	 * @param segments
	 * @param svg
	 */
	draw(segments: PathSegment[], svg: Element): SVGPathElement {
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', pathToString(segments));
		path.setAttribute('vector-effect', 'non-scaling-stroke');
		return svg.appendChild(path); // put it in the SVG
	}


	/**
	 * project and convert a list of SVG paths in latitude-longitude coordinates representing a series of closed paths
	 * into an SVG.Path object, and add that Path to the given SVG.
	 * @param segments ordered Iterator of segments, which each have attributes .type (str) and .args ([double])
	 * @param closePath if this is set to true, the map will make adjustments to account for its complete nature
	 * @return SVG.Path object in Cartesian coordinates
	 */
	projectPath(segments: PathSegment[], closePath: boolean): PathSegment[] {
		return cutToSize(
			transformOutput(
				this.northUp,
				applyProjectionToPath(
					this.projection,
					cutToSize(
						transformInput(this.centralMeridian, segments),
						this.projection.surface,
						this.geoEdges, closePath,
					),
					MAP_PRECISION*this.dimensions.diagonal,
				),
			),
			new InfinitePlane(), this.mapEdges, closePath,
		);
	}


	/**
	 * create an ordered Iterator of segments that form the border of this civ
	 * @param tiles the tiles that comprise the region whose outline is desired
	 * @param surface the Surface on which the tiles exist (solely to tell at a glance whether all tiles are included)
	 * @param excludeOcean whether to only outline the ocean
	 */
	static border(tiles: Iterable<Tile>, surface: Surface, excludeOcean=false): PathSegment[] {
		if (excludeOcean)
			tiles = filterSet(tiles, (n) => n.biome !== Biome.OCEAN);
		const tileSet = new Set(tiles);

		if (tileSet.size === 0) // if no tiles are provided
			return [];
		else if (tileSet.size < surface.tiles.size) // if some but not all tiles are provided
			return this.convertToGreebledPath(Chart.outline(tileSet), Layer.KULTUR, 1e-6);
		else { // if the entire Surface is included in this set of tiles
			return [ // build a rectangle (include a bunch of extra points to avoid ambiguity about directions)
				{type: 'M', args: [surface.фMin, -Math.PI]},
				{type: LongLineType.PARALLEL, args: [surface.фMin, -Math.PI/3]},
				{type: LongLineType.PARALLEL, args: [surface.фMin, Math.PI/3]},
				{type: LongLineType.PARALLEL, args: [surface.фMin, Math.PI]}, // TODO: I don't think I really need all these
				{type: LongLineType.MERIDIAN, args: [surface.фMin*.7 + surface.фMax*.3, Math.PI]},
				{type: LongLineType.MERIDIAN, args: [surface.фMin*.3 + surface.фMax*.7, Math.PI]},
				{type: LongLineType.MERIDIAN, args: [surface.фMax, Math.PI]},
				{type: LongLineType.PARALLEL, args: [surface.фMax, Math.PI/3]},
				{type: LongLineType.PARALLEL, args: [surface.фMax, -Math.PI/3]},
				{type: LongLineType.PARALLEL, args: [surface.фMax, -Math.PI]},
				{type: LongLineType.MERIDIAN, args: [surface.фMin*.3 + surface.фMax*.7, -Math.PI]},
				{type: LongLineType.MERIDIAN, args: [surface.фMin*.7 + surface.фMax*.3, -Math.PI]},
				{type: LongLineType.MERIDIAN, args: [surface.фMin, -Math.PI]},
			];
		}
	}

	/**
	 * create some ordered loops of points that describe the boundary of these Tiles.
	 * @param tiles Set of Tiles that are part of this group.
	 * @return Array of loops, each loop being an Array of Vertexes or plain coordinate pairs
	 */
	static outline(tiles: Tile[] | Set<Tile>): Place[][] {
		const tileSet = new Set(tiles);
		const accountedFor = new Set(); // keep track of which Edge have been done
		const output: Place[][] = []; // TODO: will this thro an error if I try to outline the entire surface?
		for (let inTile of tileSet) { // look at every included tile
			for (let outTile of inTile.neighbors.keys()) { // and every tile adjacent to an included one
				if (tileSet.has(outTile))
					continue; // (we only care if that adjacent tile is excluded)
				const startingEdge = inTile.neighbors.get(outTile); // the edge between them defines the start of the loop
				if (accountedFor.has(startingEdge))
					continue; // (and can ignore edges we've already hit)

				const currentLoop: Vertex[][] = []; // if we've found a new edge, start going around it
				let currentSection: Vertex[] = [inTile.rightOf(outTile)]; // keep track of each continuus section of this loop

				do {
					const vertex = inTile.leftOf(outTile); // look for the next Vertex, going widdershins

					// add the next Vertex to the complete Path
					currentSection.push(vertex);

					const edge = inTile.neighbors.get(outTile); // pick out the edge between them
					accountedFor.add(edge); // check this edge off

					// now, advance to the next Tile(s)
					const nextTile = vertex.widershinsOf(outTile);
					if (nextTile instanceof EmptySpace) {
						// if there isn't one after this Vertex, break off this section
						currentLoop.push(currentSection);
						// shimmy outTile around the internal portion of the edge
						outTile = inTile;
						let i = 0;
						do {
							outTile = outTile.surface.edge.get(outTile).next;
							i ++;
						} while (tileSet.has(outTile)); // until it becomes external again
						inTile = outTile.surface.edge.get(outTile).prev; // then, grab the new inTile
						// start a new section in the same loop on this side of the gap
						currentSection = [inTile.rightOf(outTile)];
					}
					else if (tileSet.has(nextTile)) // if there is and it's in, make it the new inTile
						inTile = nextTile;
					else // if there is and it's out, make it the new outTile
						outTile = nextTile;

					if (output.length >= 100000)
						throw new Error(`something went wrong why does this polygon have ${output.length} vertices?`);

				} while (inTile.neighbors.get(outTile) !== startingEdge); // continue until you go all the outTile around this loop

				// concatenate the first and last sections
				if (currentLoop.length > 0) {
					currentLoop[0] = currentSection.concat(currentLoop[0].slice(1));
					output.push(...currentLoop); // and save all sections to the output
				}
				else {
					output.push(currentSection);
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
	static aggregate(lines: Iterable<Place[]>): Iterable<Place[]> {
		const queue = [...lines];
		const consolidated = new Set<Place[]>(); // first, consolidate
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
			heads.delete(b[0]); // b[0] is no longer a startpoint or an endpoint
			tails.delete(b[0]);
			tails.get(b[b.length-1])[tails.get(b[b.length-1]).indexOf(b)] = a; // repoint the tail reference from b to a
			for (let i = 1; i < b.length; i ++) { // add b's elements to a
				torsos.set(b[i-1], {containing: a, index: a.length - 1});
				a.push(b[i]);
			}
			return a;
		}

		return consolidated;
	}

	/**
	 * convert some paths expressd as Places into an array of PathSegments, using 'M'
	 * segments to indicate gaps and 'L' segments to indicate connections.  if any of the
	 * adjacent Places are actually adjacent Vertexes, go ahead and greeble some vertices
	 * between them as appropriate.
	 * @param points each Place[] is a polygonal path thru geographic space
	 * @param greeble what kinds of connections these are for the purposes of greebling
	 * @param scale the map scale at which to greeble in map-widths per km
	 */
	static convertToGreebledPath(points: Iterable<Place[]>, greeble: Layer, scale: number): PathSegment[] {
		let path = [];
		for (const line of points) { // then do the conversion
			path.push({type: 'M', args: [line[0].ф, line[0].λ]});

			for (let i = 1; i < line.length; i ++) {
				const start = line[i - 1];
				const end = line[i];
				// do this long type-casting song and dance to see if there's an edge to greeble
				let edge: Edge | null = null;
				if (start.hasOwnProperty('neighbors')) {
					const neighbors = (<{neighbors: Map<Place, Edge>}><unknown>start).neighbors;
					if (typeof neighbors.has === 'function' && typeof neighbors.get === 'function')
						if (neighbors.has(end))
							edge = neighbors.get(end);
				}
				let step: Place[];
				// if there is an edge and it should be greebled, greeble it
				if (edge !== null && Chart.weShouldGreeble(edge, greeble)) {
					const path = edge.getPath(GREEBLE_FACTOR/scale);
					if (edge.vertex0 === start)
						step = path.slice(1);
					else
						step = path.slice(0, path.length - 1).reverse();
				}
				// otherwise, draw a strait line
				else {
					step = [end];
				}
				console.assert(step[step.length - 1].ф === end.ф && step[step.length - 1].λ === end.λ, step, "did not end at", end);

				for (const place of step)
					path.push({ type: 'L', args: [place.ф, place.λ] });
			}
		}
		return path;
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

	static weShouldGreeble(edge: Edge, layer: Layer): boolean {
		if (DISABLE_GREEBLING)
			return false;
		else if (layer === Layer.GEO)
			return true;
		else if (edge.tileL.isWater() !== edge.tileR.isWater())
			return true;
		else if (layer === Layer.BIO)
			return false;
		else if (ARABILITY.get(edge.tileL.biome) + ARABILITY.get(edge.tileR.biome) < BORDER_SPECIFY_THRESHOLD)
			return false;
		else
			return true;
	}

	/**
	 * identify the meridian that is the farthest from this path on the globe
	 */
	static chooseCentralMeridian(regionOfInterest: PathSegment[]): number {
		const emptyLongitudes = new ErodingSegmentTree(-Math.PI, Math.PI); // start with all longitudes empty
		for (let i = 1; i < regionOfInterest.length; i ++) {
			if (regionOfInterest[i].type !== 'M') {
				const x1 = regionOfInterest[i - 1].args[1];
				const x2 = regionOfInterest[i].args[1];
				if (Math.abs(x1 - x2) < Math.PI) { // and then remove the space corresponding to each segment
					emptyLongitudes.remove(Math.min(x1, x2), Math.max(x1, x2));
				}
				else {
					emptyLongitudes.remove(Math.max(x1, x2), Math.PI);
					emptyLongitudes.remove(-Math.PI, Math.min(x1, x2));
				}
			}
		}
		if (emptyLongitudes.getCenter(true).location !== null)
			return localizeInRange(emptyLongitudes.getCenter(true).location + Math.PI, -Math.PI, Math.PI);
		else
			return 0; // default to 0°E TODO it would be really cool if I could pick a number more intelligently
	}


	/**
	 * determine the coordinate bounds of this region –
	 * both its geographical coordinates on the Surface and its Cartesian coordinates on the map.
	 * @param regionOfInterest the region that must be enclosed entirely within the returned bounding box
	 * @param projection the projection being used to map this region from a Surface to the plane
	 * @param rectangularBounds whether to make the bounding box as rectangular as possible, rather than having it conform to the graticule
	 */
	static calculateMapBounds(
		regionOfInterest: PathSegment[], projection: MapProjection, rectangularBounds: boolean,
	): {фMin: number, фMax: number, λMax: number, xLeft: number, xRight: number, yTop: number, yBottom: number} {
		if (regionOfInterest.length === 0)
			throw new Error("the region of interest has no vertices.");

		let фMin, фMax, λMax;
		let xLeft, xRight, yTop, yBottom;
		// if we want a rectangular map
		if (rectangularBounds) {
			// don't apply any geographic bounds
			фMin = projection.surface.фMin;
			фMax = projection.surface.фMax;
			λMax = Math.PI;
			// and calculate the maximum extent of the projected region to get the Cartesian bounds
			const projectedRegion = applyProjectionToPath(projection, regionOfInterest, Infinity);
			const regionBounds = Chart.calculatePathBounds(projectedRegion);
			xLeft = 1.1*regionBounds.sMin - 0.1*regionBounds.sMax;
			xRight = 1.1*regionBounds.sMax - 0.1*regionBounds.sMin;
			yTop = 1.1*regionBounds.tMin - 0.1*regionBounds.tMax;
			yBottom = 1.1*regionBounds.tMax - 0.1*regionBounds.tMin;
		}
		// if we want a wedge-shaped map
		else {
			// calculate the minimum and maximum latitude and longitude of the region of interest
			let regionBounds = Chart.calculatePathBounds(regionOfInterest); // note: s in here is a generic coordinate (equal to latitude in this context)
			const фRef = projection.surface.refLatitudes; // TODO: extracting these variables shouldn't be necessary.  I should use the projection functions.
			const sRef = projection.surface.cumulDistances; // note: s here is an arc length, not a generic coordinate
			const sMin = linterp(regionBounds.sMin, фRef, sRef); // TODO use projection here
			const sMax = linterp(regionBounds.sMax, фRef, sRef);
			// spread the limits out a bit to give a contextual view
			фMax = linterp(Math.min(1.1*sMax - 0.1*sMin, sRef[sRef.length - 1]), sRef, фRef); // TODO use inverse projection here
			фMin = linterp(Math.max(1.1*sMin - 0.1*sMax, sRef[0]), sRef, фRef);
			const ds_dλ = projection.surface.rz((фMin + фMax)/2).r;
			λMax = Math.min(Math.PI, regionBounds.tMax + 0.4*(sMax - sMin)/ds_dλ);
			// and don't apply any Cartesian bounds
			xLeft = -Infinity;
			xRight = Infinity;
			yTop = -Infinity;
			yBottom = Infinity;
		}

		// the extent of the geographic region will always impose some Cartesian limits; compute those now.
		const start = projection.projectPoint({ф: фMin, λ: -λMax});
		const edges = [ // then determine the dimensions of this map
			{type: 'M', args: [start.x, start.y]},
			...projection.projectParallel(-λMax, λMax, фMin),
			...projection.projectMeridian(фMin, фMax, λMax),
			...projection.projectParallel(λMax, -λMax, фMax),
			...projection.projectMeridian(фMax, фMin, -λMax),
		];
		const mapBounds = Chart.calculatePathBounds(edges);
		return {
			фMin: фMin, фMax: фMax, λMax: λMax,
			xLeft: Math.max(xLeft, mapBounds.sMin),
			xRight: Math.min(xRight, mapBounds.sMax),
			yTop: Math.max(yTop, mapBounds.tMin),
			yBottom: Math.min(yBottom, mapBounds.tMax)
		};
	}

	/**
	 * determine the coordinate bounds of this region in some 2D coordinate system
	 * @param segments the region that must be enclosed entirely within the returned bounding box
	 */
	static calculatePathBounds(segments: PathSegment[]): {sMin: number, sMax: number, tMin: number, tMax: number} {
		let sMin = Infinity, sMax = -Infinity, tMin = Infinity, tMax = -Infinity;
		for (let i = 0; i < segments.length; i ++) { // TODO: this won't notice when the pole is included in the region
			const segment = segments[i];
			// for each segment, pull out any points that might be extrema
			let points: Location[];
			switch (segment.type) {
				// for most simple segment types it's just the endpoints
				case 'M': case 'L': case LongLineType.MERIDIAN: case LongLineType.PARALLEL:
					points = [{s: segment.args[0], t: segment.args[1]}];
					break;
				// for bezier curves use the control points for the bonuds
				case 'Q': case 'C':
					points = [];
					for (let i = 0; i < segment.args.length; i += 2)
						points.push({s: segment.args[i], t: segment.args[i + 1]});
					break;
				// for arcs you must also look at certain points along the circle
				case 'A':
					// first calculate the location of the center
					if (i === 0) {
						console.log(segments);
						throw new Error("a path may not start with an arc.");
					}
					const previusSegment = segments[i - 1];
					const start = {
						x: previusSegment.args[previusSegment.args.length - 2],
						y: previusSegment.args[previusSegment.args.length - 1]};
					const [_, r, __, largeArcFlag, sweepFlag, xEnd, yEnd] = segment.args;
					const end = {x: xEnd, y: yEnd};
					const chord = Math.hypot(end.x - start.x, end.y - start.y);
					if (chord === 0)
						throw new Error(`this arc is degenerate (the start point is the same as the endpoint): A${segment.args.join(',')}`);
					if (chord > 2*r)
						throw new Error(`this arc is impossible; it needs to span a distance of ${chord} with a radius of only ${r}?`);
					const apothem = Math.sqrt(r*r - chord*chord/4);
					const arcSign = (largeArcFlag === sweepFlag) ? 1 : -1;
					const step = {
						x: (end.y - start.y)/chord*apothem*arcSign,
						y: (start.x - end.x)/chord*apothem*arcSign};
					const center = {
						x: (start.x + end.x)/2 + step.x,
						y: (start.y + end.y)/2 + step.y};
					// then enumerate the four nodes of the circle
					points = [
						{s: end.x, t: end.y},
						{s: center.x + r, t: center.y},
						{s: center.x, t: center.y + r},
						{s: center.x - r, t: center.y},
						{s: center.x, t: center.y - r},
					];
					// cull any that are not on this specific arc
					for (let i = 4; i >= 1; i --) {
						const sign = signAngle(end, assert_xy(points[i]), start);
						if ((sweepFlag > 0) === (sign > 0))
							points.splice(i, 1);
					}
					break;
				// ignore Zs, naturally
				case 'Z':
					points = [];
					break;
				default:
					throw new Error(`idk what the bounds of a '${segment.type}' segment are`);
			}
			// finally, search those key points for their greatest and smallest coordinates
			for (const {s, t} of points) {
				if (s < sMin)
					sMin = s;
				if (s > sMax)
					sMax = s;
				if (t < tMin)
					tMin = t;
				if (t > tMax)
					tMax = t;
			}
		}
		return {sMin: sMin, sMax: sMax, tMin: tMin, tMax: tMax};
	}

	/**
	 * create a set of MapEdges that delineate a rectangular region in either Cartesian or latitude/longitude space
	 */
	static rectangle(s0: number, t0: number, s2: number, t2: number, geographic: boolean): MapEdge[] {
		// first, define the s and t coordinates
		const s = [s0, s0, s2, s2];
		const t = [t0, t2, t2, t0];
		const sIsVarying = [false, true, false, true];
		// bild the loop, ensuring the edge ends are consistent with the edge starts
		const edges: MapEdge[] = [];
		for (let i = 0; i < 4; i ++) {
			let type;
			if (!geographic)
				type = 'L';
			else if (sIsVarying[i])
				type = LongLineType.MERIDIAN;
			else
				type = LongLineType.PARALLEL;
			edges.push({
				type: type,
				start: {s: s[i], t: t[i]},
				end: {s: s[(i + 1)%4], t: t[(i + 1)%4]},
			});
		}
		return edges;
	}
}


/**
 * a simple record to efficiently represent the size and shape of a rectangle
 */
class Dimensions {
	public readonly left: number;
	public readonly right: number;
	public readonly top: number;
	public readonly bottom: number;
	public readonly width: number;
	public readonly height: number;
	public readonly diagonal: number;
	public readonly area: number;

	constructor(left: number, right: number, top: number, bottom: number) {
		if (left >= right || top >= bottom)
			throw new Error(`the axis bounds ${left}, ${right}, ${top}, ${bottom} are invalid.`);
		this.left = left;
		this.right = right;
		this.top = top;
		this.bottom = bottom;
		this.width = this.right - this.left;
		this.height = this.bottom - this.top;
		this.diagonal = Math.hypot(this.width, this.height);
		this.area = this.width*this.height;
	}
}
