/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Edge, EmptySpace, outline, Surface, Tile, Vertex} from "../generation/surface/surface.js";
import {
	filterSet, findRoot, localizeInRange,
	pathToString,
} from "../utilities/miscellaneus.js";
import {World} from "../generation/world.js";
import {MapProjection} from "./projection.js";
import {Civ} from "../generation/civ.js";
import {ErodingSegmentTree} from "../utilities/erodingsegmenttree.js";
import {assert_φλ, endpoint, PathSegment, XYPoint, ΦΛPoint} from "../utilities/coordinates.js";
import {Vector} from "../utilities/geometry.js";
import {Biome, BIOME_NAMES} from "../generation/terrain.js";
import {
	applyProjectionToPath, calculatePathBounds, contains,
	convertPathClosuresToZ, Domain, getAllCombCrossings, INFINITE_PLANE,
	intersection, polygonize, removeLoosePoints, reversePath, rotatePath, Rule, scalePath,
	transformInput,
} from "./pathutilities.js";
import {chooseLabelLocation} from "./labeling.js";
import {cloneNode, h, VNode} from "../gui/virtualdom.js";
import {poissonDiscSample} from "../utilities/poissondisc.js";

import TEXTURE_MIXES from "../../resources/texture_mixes.js";
import {Random} from "../utilities/random.js";
import {offset} from "../utilities/offset.js";


// DEBUG OPTIONS
const DISABLE_GREEBLING = false; // make all lines as simple as possible
const SMOOTH_RIVERS = false; // make rivers out of bezier curves so there's no sharp corners
const SHOW_TILE_INDICES = false; // label each tile with its number
const COLOR_BY_PLATE = false; // choropleth the land by plate index rather than whatever else
const COLOR_BY_CONTINENT = false; // choropleth the land by continent index rather than whatever else
const COLOR_BY_TILE = false; // color each tile a different color
const SHOW_LABEL_PATHS = false; // instead of placing labels, just stroke the path where the label would have gone
const SHOW_BACKGROUND = false; // have a big red rectangle under the map

// OTHER FIXED DISPLAY OPTIONS
const GREEBLE_SCALE = 3.; // the smallest edge lengths to show (mm)
const SUN_ELEVATION = 45/180*Math.PI;
const AMBIENT_LIGHT = 0.2;
const RIVER_DISPLAY_FACTOR = 3000; // the average scaled watershed area needed to display a river (mm²)
const BORDER_SPECIFY_THRESHOLD = 0.3; // the population density at which borders must be rigorusly defined
const MAP_PRECISION = 10; // max segment length in mm
const GRATICULE_SPACING = 30; // typical spacing between lines of latitude or longitude in mm
const HILL_HEIGHT = 1.5; // the altitude at which terrain becomes hilly (km)
const MOUNTAIN_HEIGHT = 3.0; // the altitude at which terrain becomes mountainous (km)

/** color scheme presets */
const COLOR_SCHEMES = new Map([
	['debug', {
		primaryStroke: '#302d28',
		waterStroke: '#302d28',
		secondaryStroke: '#5a554c',
		waterFill: 'none',
		landFill: '#faf2e4',
		iceFill: 'none',
	}],
	['white', {
		primaryStroke: '#302d28',
		waterStroke: '#302d28',
		secondaryStroke: '#5a554c',
		waterFill: '#FFFFFF',
		landFill: '#FFFFFF',
		iceFill: 'none',
	}],
	['gray', {
		primaryStroke: '#302d28',
		waterStroke: '#4c473f',
		secondaryStroke: '#5a554c',
		waterFill: '#d4cdbf',
		landFill: '#faf2e4',
		iceFill: 'none',
	}],
	['black', {
		primaryStroke: '#302d28',
		waterStroke: '#302d28',
		secondaryStroke: '#302d28',
		waterFill: '#302d28',
		landFill: '#faf2e4',
		iceFill: 'none',
	}],
	['sepia', {
		primaryStroke: '#361907',
		waterStroke: '#361907',
		secondaryStroke: '#896b50',
		waterFill: '#E9CFAA',
		landFill: '#F9E7D0',
		iceFill: 'none',
	}],
	['wikipedia', {
		primaryStroke: '#4c473f',
		waterStroke: '#5A7ECA',
		secondaryStroke: '#857f77',
		waterFill: '#cceeff',
		landFill: '#fff7d9',
		iceFill: 'none',
	}],
	['political', {
		primaryStroke: '#302d28',
		waterStroke: '#5A7ECA',
		secondaryStroke: '#5a554c',
		waterFill: '#d8ecf6',
		landFill: '#faf2e4',
		iceFill: 'none',
	}],
	['physical', {
		primaryStroke: '#302d28',
		waterStroke: '#5A7ECA',
		secondaryStroke: '#4c473f',
		waterFill: '#5A7ECA',
		landFill: '#FFFFFF77',
		iceFill: '#FFFFFF',
	}],
	['heightmap', {
		primaryStroke: '#302d28',
		waterStroke: 'rgb(59, 72, 151)',
		secondaryStroke: '#4c473f',
		waterFill: '#FF00FF',
		landFill: '#FFFFFF77',
		iceFill: 'none',
	}],
]);

/** color scheme for biomes */
const BIOME_COLORS = new Map([
	[Biome.LAKE,      '#5A7ECA'],
	[Biome.JUNGLE,    '#82C17A'],
	[Biome.FOREST,    '#B0C797'],
	[Biome.TAIGA,     '#9FE0B0'],
	[Biome.STEAMLAND, '#A1A17E'],
	[Biome.GRASSLAND, '#D9E88A'],
	[Biome.DESERT,    '#FCF0B7'],
	[Biome.TUNDRA,    '#FFFFFF'],
	[Biome.LAND_ICE,  '#FFFFFF'],
	[Biome.SEA_ICE,   '#FFFFFF'],
]);
const ORDERED_BIOME_COLORS: string[] = [];
for (let biome = 0; biome < BIOME_NAMES.length; biome ++) {
	if (BIOME_COLORS.has(biome))
		ORDERED_BIOME_COLORS.push(BIOME_COLORS.get(biome));
	else
		ORDERED_BIOME_COLORS.push("none");
}

/** color scheme for political maps */
const COUNTRY_COLORS = [
	'rgb(230, 169, 187)',
	'rgb(143, 211, 231)',
	'rgb(232, 212, 167)',
	'rgb(188, 165, 210)',
	'rgb(137, 200, 178)',
	'rgb(246, 187, 177)',
	'rgb(181, 221, 261)',
	'rgb(165, 180, 133)',
	'rgb(226, 173, 206)',
	'rgb(142, 216, 220)',
	'rgb(249, 210, 175)',
	'rgb(173, 173, 220)',
	'rgb(154, 202, 166)',
	'rgb(251, 188, 196)',
	'rgb(169, 228, 257)',
	'rgb(185, 179, 132)',
	'rgb(217, 180, 223)',
	'rgb(150, 220, 207)',
	'rgb(262, 208, 188)',
	'rgb(157, 181, 225)',
	'rgb(173, 202, 157)',
	'rgb(251, 191, 215)',
	'rgb(163, 235, 249)',
	'rgb(203, 177, 136)',
	'rgb(204, 188, 236)',
	'rgb(164, 222, 194)',
	'rgb(271, 208, 205)',
	'rgb(142, 189, 225)',
	'rgb(194, 201, 152)',
	'rgb(245, 197, 234)',
	'rgb(165, 239, 237)',
	'rgb(218, 175, 146)',
	'rgb(188, 197, 244)',
	'rgb(182, 223, 182)',
	'rgb(274, 210, 224)',
	'rgb(131, 196, 219)',
];

/** spacing between topographic contours */
const ALTITUDE_STEP = 0.5;
/** colormap for above-sea-level elevation */
const ALTITUDE_COLORS = [
	'rgb(114, 184, 91)',
	'rgb(153, 192, 94)',
	'rgb(187, 201, 96)',
	'rgb(215, 210, 122)',
	'rgb(229, 225, 162)',
	'rgb(243, 240, 201)',
];
/** spacing between bathymetric contours */
const DEPTH_STEP = 1.0;
/** coloramp for below-sea-level elevation */
const DEPTH_COLORS = [
	'rgb(85, 165, 178)',
	'rgb(37, 138, 178)',
	'rgb(42, 106, 171)',
	'rgb(59, 72, 151)',
];

/** a type of area feature with a particular greebling profile */
enum Layer {
	/** geographic regions – greeble everything */
	GEO,
	/** bioregions – greeble only coasts */
	BIO,
	/** cultural regions – greeble only coasts and densely populated areas */
	KULTUR,
}


/**
 * build an object for visualizing geographic information in SVG.
 * @param surface the surface that we're mapping
 * @param continents some sets of tiles that go nicely together (only used for debugging)
 * @param world the world on that surface, if we're mapping human features
 * @param projectionName the type of projection to choose – one of "equal_earth", "bonne", "conformal_conic", "mercator", or "orthographic"
 * @param regionOfInterest the map focus, for the purposes of tailoring the map projection and setting the bounds
 * @param orientationName the cardinal direction that should correspond to up – one of "north", "south", "east", or "west"
 * @param area the desired bounding box area in mm²
 * @param colorSchemeName the color scheme
 * @param rivers whether to add rivers
 * @param borders whether to add state borders
 * @param landTexture whether to draw little trees to indicate the biomes
 * @param seaTexture whether to draw horizontal lines by the coast
 * @param shading whether to add shaded relief
 * @param civLabels whether to label countries
 * @param graticule whether to draw a graticule
 * @param windrose whether to add a compass rose
 * @param resources any preloaded SVG assets we should have
 * @param characterWidthMap a table containing the width of every possible character, for label length calculation purposes
 * @param fontSize the size of city labels and minimum size of country and biome labels (mm)
 * @param style the transliteration convention to use for them
 * @return the SVG on which everything has been drawn, and the list of Civs that are shown in this map
 */
export function depict(surface: Surface, continents: Set<Tile>[] | null, world: World | null,
                       projectionName: string, regionOfInterest: Set<Tile>,
                       orientationName: string, area: number,
                       colorSchemeName: string,
                       resources: Map<string, string>, characterWidthMap: Map<string, number>,
                       rivers = false, borders = false,
                       graticule = false, windrose = false,
                       landTexture = false, seaTexture = false, shading = false,
                       civLabels = false,
                       fontSize = 3, style: string = '(default)') {
	// convert the orientation name into a number of degrees
	let orientation;
	if (orientationName === 'north')
		orientation = 0;
	else if (orientationName === 'south')
		orientation = 180;
	else if (orientationName === 'east')
		orientation = 90;
	else if (orientationName === 'west')
		orientation = 270;
	else
		throw new Error(`I don't recognize this direction: '${orientationName}'.`);

	// determine the central coordinates and thus domain of the map projection
	const {centralMeridian, centralParallel, meanRadius} = chooseMapCentering(regionOfInterest, surface);
	const southLimitingParallel = Math.max(surface.φMin, centralParallel - Math.PI);
	const northLimitingParallel = Math.min(surface.φMax, southLimitingParallel + 2*Math.PI);

	// construct the map projection
	let projection;
	let rectangularBounds;
	if (projectionName === 'equal_earth') {
		projection = MapProjection.equalEarth(
			surface, meanRadius, southLimitingParallel, northLimitingParallel, centralMeridian);
		rectangularBounds = false;
	}
	else if (projectionName === 'bonne') {
		projection = MapProjection.bonne(
			surface, southLimitingParallel, centralParallel, northLimitingParallel,
			centralMeridian, 0); // we'll revisit the longitude bounds later so leave them at 0 for now
		rectangularBounds = false;
	}
	else if (projectionName === 'conformal_conic') {
		projection = MapProjection.conformalConic(
			surface, southLimitingParallel, centralParallel, northLimitingParallel, centralMeridian);
		rectangularBounds = true;
	}
	else if (projectionName === 'mercator') {
		projection = MapProjection.mercator(
			surface, southLimitingParallel, centralParallel, northLimitingParallel, centralMeridian);
		rectangularBounds = true;
	}
	else if (projectionName === 'orthographic') {
		projection = MapProjection.orthographic(
			surface, southLimitingParallel, northLimitingParallel, centralMeridian);
		rectangularBounds = true;
	}
	else {
		throw new Error(`no jana metode da graflance: '${projectionName}'.`);
	}

	if (rectangularBounds) {
		const newCentralMeridian = adjustMapCentering(regionOfInterest, projection);
		projection = projection.recenter(newCentralMeridian);
	}

	// put the region of interest in the correct coordinate system
	const transformedRegionOfInterest = intersection(
		transformInput(
			projection.domain,
			convertToGreebledPath(outline(regionOfInterest), Layer.GEO, 1e-6)),
		rectangle(
			projection.φMax, projection.λMax,
			projection.φMin, projection.λMin, true),
		projection.domain, true);

	// establish the geographic bounds of the region
	const {φMin, φMax, λMin, λMax, geoEdges} = chooseGeoBounds(
		transformedRegionOfInterest,
		projection,
		rectangularBounds);

	// if it's a Bonne projection, re-generate it with these new bounds in case you need to adjust the curvature
	if (projectionName === 'bonne')
		projection = MapProjection.bonne(
			surface, φMin, centralParallel, φMax,
			projection.λCenter, λMax - λMin); // the only thing that changes here is projection.yCenter

	// establish the Cartesian bounds of the map
	const {xRight, xLeft, yBottom, yTop, mapEdges} = chooseMapBounds(
		transformedRegionOfInterest,
		projection,
		rectangularBounds,
		geoEdges);

	const rawBbox = new Dimensions(xLeft, xRight, yTop, yBottom);

	// determine the appropriate scale to make this have the correct area
	const scale = Math.sqrt(area/rawBbox.area); // mm/km

	const transform = new Transform(projection, geoEdges, mapEdges, orientation, scale);

	// expand the Chart dimensions by a couple millimeters on each side to give the edge some breathing room
	const margin = Math.max(2.1, rawBbox.diagonal*scale/100);

	// adjust the bounding box to account for rotation, scale, and margin
	const bbox = rawBbox.rotate(orientation).scale(scale).offset(margin);

	let colorScheme = COLOR_SCHEMES.get(colorSchemeName);
	if (COLOR_BY_PLATE || COLOR_BY_CONTINENT || COLOR_BY_TILE)
		colorScheme = COLOR_SCHEMES.get('debug');

	const svg = h('svg', {
		viewBox: `${bbox.left} ${bbox.top} ${bbox.width} ${bbox.height}`,
	});

	// set the basic overarching styles
	const styleSheet = h('style');
	styleSheet.textContent =
		'.label {\n' +
		'  font-family: "Noto Serif","Times New Roman","Times",serif;\n' +
		'  text-anchor: middle;\n' +
		'  fill: black;\n' +
		'}\n' +
		'.halo {\n' +
		`  fill: none;\n` +
		'  stroke-width: 1.4;\n' +
		'  opacity: 0.7;\n' +
		'}\n';
	svg.children.push(styleSheet);

	if (SHOW_BACKGROUND) {
		const rectangle = h('rect', {
			x: `${bbox.left}`,
			y: `${bbox.top}`,
			width: `${bbox.width}`,
			height: `${bbox.height}`,
			style: 'fill: red; stroke: black; stroke-width: 10px',
		});
		svg.children.push(rectangle);
	}

	const lineFeatures: PathSegment[][] = [];
	const areaFeatures: {path: PathSegment[], color: string}[] = [];
	const politicalColorMap = new Map<number, string>();
	politicalColorMap.set(0, colorScheme.landFill);

	// color in the land
	if (COLOR_BY_PLATE) {
		// color the land (and the sea (don't worry, we'll still trace coastlines later)) by plate index
		areaFeatures.push(...fillChoropleth(
			surface.tiles, n => n.plateIndex, 1, COUNTRY_COLORS,
			transform, createSVGGroup(svg, "plates"), Layer.GEO));
	}
	else if (COLOR_BY_CONTINENT && continents !== null) {
		areaFeatures.push(...fillMultiple(
			continents, COUNTRY_COLORS, surface.tiles, colorScheme.landFill,
			transform, createSVGGroup(svg, "continents"), Layer.GEO));
	}
	else if (COLOR_BY_TILE) {
		areaFeatures.push(...fillMultiple(
			[...surface.tiles].map(tile => new Set([tile])), COUNTRY_COLORS, null, null,
			transform, createSVGGroup(svg, "tiles"), Layer.GEO,
			colorScheme.waterStroke, 0.35));
	}
	else if (colorSchemeName === 'physical') {
		// color the land by biome
		areaFeatures.push(...fillChoropleth(
			surface.tiles, n => n.biome, 1, ORDERED_BIOME_COLORS,
			transform, createSVGGroup(svg, "biomes"), Layer.BIO));
	}
	else if (colorSchemeName === 'political') {
		// color the land by country
		if (world === null)
			throw new Error("this Chart was asked to color land politicly but the provided World was null");
		const biggestCivs = world.getCivs(true);
		const biggestCivExtents = [];
		for (const civ of biggestCivs)
			biggestCivExtents.push(filterSet(civ.tileTree.keys(), n => !n.isWater()));
		const drawnCivs = fillMultiple(
			biggestCivExtents, COUNTRY_COLORS, surface.tiles, colorScheme.landFill,
			transform, createSVGGroup(svg, "countries"), Layer.KULTUR);
		areaFeatures.push(...drawnCivs);
		for (const {index, color} of drawnCivs)
			politicalColorMap.set(biggestCivs[index].id, color);
	}
	else if (colorSchemeName === 'heightmap') {
		// color the land by altitude
		areaFeatures.push(...fillChoropleth(
			filterSet(surface.tiles, n => !n.isWater()), n => n.height, ALTITUDE_STEP, ALTITUDE_COLORS,
			transform, createSVGGroup(svg, "land-contours"), Layer.GEO));
	}
	else {
		// color in the land with a uniform color
		fill(surface.tiles, transform, svg, colorScheme.landFill, Layer.BIO);
	}

	// add rivers
	if (rivers) {
		lineFeatures.push(drawRivers(
			surface.rivers, RIVER_DISPLAY_FACTOR/scale**2,
			transform, svg, colorScheme.waterStroke, 1.4, Layer.GEO));
	}

	// also color in sea-ice if desired
	if (colorScheme.iceFill !== 'none') {
		fill(
			filterSet(surface.tiles, n => n.isIceCovered()),
			transform, svg, colorScheme.iceFill, Layer.BIO);
	}

	// add borders
	if (borders) {
		if (world === null)
			throw new Error("this Chart was asked to draw political borders but the provided World was null");
		lineFeatures.push(...drawBorders(
			world.getCivs(), transform, createSVGGroup(svg, "borders"), colorScheme.primaryStroke, 0.7));
	}

	// add relief shadows
	if (shading) {
		shade(surface.vertices, transform, createSVGGroup(svg, "shading"));
	}

	// color in the sea
	let sea;
	if (colorScheme.iceFill === 'none')
		sea = filterSet(surface.tiles, n => n.isWater());
	else
		sea = filterSet(surface.tiles, n => n.isWater() && !n.isIceCovered());
	if (colorSchemeName === 'heightmap') {
		// color in the sea by altitude
		areaFeatures.push(...fillChoropleth(
			sea, n => -n.height, DEPTH_STEP, DEPTH_COLORS,
			transform, createSVGGroup(svg, "sea-contours"), Layer.GEO)); // TODO: enforce contiguity of shallow ocean?
		fill(sea, transform, svg, "none", Layer.GEO, colorScheme.waterStroke, 0.7);
	}
	else {
		// color in the sea with a uniform color
		fill(sea, transform, svg, colorScheme.waterFill, Layer.GEO, colorScheme.waterStroke, 0.7);
	}

	// add some horizontal hatching around the coast
	if (seaTexture) {
		hatchCoast(
			filterSet(surface.tiles, t => !sea.has(t)), transform, createSVGGroup(svg, "sea-texture"),
			(colorScheme.waterStroke !== colorScheme.waterFill) ?
				colorScheme.waterStroke : colorScheme.secondaryStroke,
			0.35, 1.2, 3.0);
	}

	// add some terrain elements for texture
	if (landTexture) {
		drawTexture(
			surface.tiles, lineFeatures, areaFeatures,
			transform, createSVGGroup(svg, "land-texture"),
			colorScheme.landFill, colorScheme.secondaryStroke, 0.35,
			resources);
	}

	// add the graticule
	if (graticule) {
		drawGraticule(
			surface, {φMin, φMax, λMin, λMax},
			transform, createSVGGroup(svg, "graticule"), colorScheme.primaryStroke, 0.35);
	}

	// label everything
	if (civLabels) {
		if (world === null)
			throw new Error("this Chart was asked to label countries but the provided World was null");
		placeLabels(
			world.getCivs(), style, (landTexture) ? politicalColorMap : null,
			transform, createSVGGroup(svg, "labels"), fontSize, 3*fontSize,
			characterWidthMap);
	}

	if (SHOW_TILE_INDICES) {
		for (const tile of surface.tiles) {
			const text = h('text'); // start by creating the text element
			const location = transformPoint(tile, transform);
			if (location !== null) {
				text.attributes["x"] = `${location.x}`;
				text.attributes["y"] = `${location.y}`;
				text.attributes["font-size"] = "0.2em";
				text.textContent = `${tile.index}`;
				svg.children.push(text);
			}
		}
	}

	// add a margin and outline to the whole thing
	drawOuterBorder(bbox, transform, svg, "white", "black", 1.4);

	// add the windrose
	if (windrose) {
		placeWindrose(bbox, resources.get("windrose"), createSVGGroup(svg, "compass-rose"));
	}

	let visible;
	if (world !== null) {
		// finally, check which Civs are on this map
		// (this is somewhat inefficient, since it probably already calculated this, but it's pretty quick, so I think it's fine)
		visible = [];
		for (const civ of world.getCivs(true))
			if (transformedOutline(
				[...civ.tileTree.keys()].filter(n => !n.isWater()),
				Layer.KULTUR, transform
			).length > 0)
				visible.push(civ);
	}
	else {
		visible = null;
	}

	return {map: svg, mappedCivs: visible};
}

/**
 * fill multiple regions with colors from a list.  when it runs out of colors it will stop filling in regions.
 * regions that don't appear on the map will be skipped, so it won't do that unless every color appears on the map.
 * @param regions the regions to fill
 * @param colors the colors to use
 * @param tiles the total tileset to fill in with a background color
 * @param baseColor the background color to use for anything in the tileset that isn't part of a colored region
 *                  (if this isn't passed it will loop colors to try to make sure everything is part of a colored region)
 * @param transform the projection, extent, scale, and orientation information
 * @param svg object on which to put the Paths
 * @param greeble what kind of edge it is for the purposes of greebling
 * @param strokeColor color of the outlines
 * @param strokeWidth the width of the outline to put around each one
 */
function fillMultiple(regions: Set<Tile>[], colors: string[], tiles: Set<Tile> | null, baseColor: string | null,
                      transform: Transform, svg: VNode, greeble: Layer,
                      strokeColor="none", strokeWidth=0): {index: number, path: PathSegment[], color: string}[] {
	if (baseColor !== null)
		fill(tiles, transform, svg, baseColor, greeble);
	const features = [];
	let colorIndex = 0;
	for (let regionIndex = 0; regionIndex < regions.length; regionIndex ++) {
		const path = fill(
			regions[regionIndex], transform, svg, colors[colorIndex], greeble,
			strokeColor, strokeWidth);
		if (path.length === 0)
			continue;
		else {
			features.push({path: path, color: colors[colorIndex], index: regionIndex});
			colorIndex ++;
			if (colorIndex >= colors.length) {
				if (baseColor === null)
					colorIndex = 0;
				else
					break;
			}
		}
	}
	return features;
}

/**
 * fill multiple a bunch of tiles according to some numeric evaluation of them.
 * contours will be filled with a given z-spacing, and colors will be drawn from a colormap.
 * the number should generally be positive; any negative numbers will be lumped into the lowest bin, just as numbers
 * bigger than colors.length*binSize will be lumped into the highest bin.
 * @param tiles the tiles to color in
 * @param valuator the function that is used to determine in which bin each tile goes
 * @param binSize the size of each interval to color together
 * @param colors the color for each value bin
 * @param transform the projection, extent, scale, and orientation information
 * @param svg object on which to put the Paths
 * @param greeble what kind of edge it is for the purposes of greebling
 */
function fillChoropleth(tiles: Set<Tile>, valuator: (t: Tile) => number, binSize: number, colors: string[],
                        transform: Transform, svg: VNode, greeble: Layer): {path: PathSegment[], color: string}[] {
	const contours = [];
	for (let i = 0; i < colors.length; i ++) {
		if (colors[i] === "none")
			continue;
		const min = (i !== 0) ? i * binSize : -Infinity;
		const max = (i !== colors.length - 1) ? (i + 1) * binSize : Infinity;
		const path = fill(
			filterSet(tiles, n => valuator(n) >= min && valuator(n) < max),
			transform, svg, colors[i], greeble);
		contours.push({path: path, color: colors[i]});
	}
	return contours;
}

/**
 * draw a region of the world on the map with the given color.
 * @param tiles Iterator of Tiles to be colored in.
 * @param transform the projection, extent, scale, and orientation information
 * @param svg object on which to put the Path.
 * @param color color of the interior.
 * @param greeble what kind of edge it is for the purposes of greebling
 * @param stroke color of the outline.
 * @param strokeWidth the width of the outline to put around it (will match fill color).
 * @param strokeLinejoin the line joint style to use
 * @return the path object associated with this <path>
 */
function fill(tiles: Set<Tile>, transform: Transform, svg: VNode, color: string, greeble: Layer,
              stroke = 'none', strokeWidth = 0, strokeLinejoin = 'round'): PathSegment[] {
	if (tiles.size <= 0)
		return [];
	const segments = transformedOutline(tiles, greeble, transform);
	const path = draw(convertPathClosuresToZ(segments), svg);
	path.attributes.style =
		`fill: ${color}; stroke: ${stroke}; stroke-width: ${strokeWidth}; stroke-linejoin: ${strokeLinejoin};`;
	return segments;
}

/**
 * draw a series of lines on the map with the giver color.
 * @param rivers the Iterable of lists of points to connect and draw.
 * @param riverDisplayThreshold the flow rate above which a river segment must be to be shown
 * @param transform the projection, extent, scale, and orientation information
 * @param svg SVG object on which to put the Path.
 * @param color String that HTML can interpret as a color.
 * @param width the width of the stroke
 * @param greeble what kind of edge it is for the purposes of greebling
 * @returns the newly created element comprising all these lines
 */
function drawRivers(rivers: Set<(Tile | Vertex)[]>, riverDisplayThreshold: number, transform: Transform, svg: VNode, color: string, width: number, greeble: Layer): PathSegment[] {
	const strokes = [...rivers].filter(ud => ud[0].flow >= riverDisplayThreshold);
	let segments = transformPath(
		convertToGreebledPath(aggregate(strokes), greeble, transform.scale), transform, false);
	if (SMOOTH_RIVERS)
		segments = smooth(segments);
	const path = draw(segments, svg);
	path.attributes.style =
		`fill: none; stroke: ${color}; stroke-width: ${width}; stroke-linejoin: round; stroke-linecap: round;`;
	return segments;
}

/**
 *
 * @param civs
 * @param transform the projection, extent, scale, and orientation information
 * @param svg SVG object on which to put the Paths
 * @param color
 * @param width
 */
function drawBorders(civs: Civ[], transform: Transform, svg: VNode, color: string, width: number): PathSegment[][] {
	const lineFeatures = [];
	for (const civ of civs) {
		const line = fill(
			filterSet(civ.tileTree.keys(), n => !n.isWater()),
			transform, svg, 'none', Layer.KULTUR, color, width);
		lineFeatures.push(line);
	}
	return lineFeatures;
}

/**
 * shade in the area around a polygon with horizontal lines
 * @param land the region to outline in hatch
 * @param transform the projection, extent, scale, and orientation information
 * @param svg the SVG object on which to put the lines
 * @param color the color of the lines
 * @param width the thickness of the lines
 * @param spacing distance between adjacent lines in the pattern
 * @param radius the distance from the shape to draw horizontal lines
 */
function hatchCoast(land: Set<Tile>, transform: Transform, svg: VNode,
                    color: string, width: number, spacing: number, radius: number): void {
	// instantiate a random number generator for feathering the edges
	const rng = new Random(0);

	const shape = transformedOutline(
		land, Layer.GEO, transform);

	// calculate the outer envelope of the lines
	const dilatedShape = offset(shape, radius);

	// establish the y coordinates of the lines
	const boundingBox = calculatePathBounds(dilatedShape);
	const yMed = (boundingBox.tMin + boundingBox.tMax)/2;
	const numLines = Math.floor((boundingBox.tMax - boundingBox.tMin)/spacing/2)*2 + 1;
	const yMin = yMed - spacing*(numLines - 1)/2;

	// find everywhere one of the lines crosses either polygon
	const intersections: {x: number, downward: boolean, trueCoast: boolean}[][] = [];
	for (let j = 0; j < numLines; j ++)
		intersections.push([]);
	for (const {s, j, goingEast} of getAllCombCrossings(shape, yMin, spacing, INFINITE_PLANE))
		intersections[j].push({x: s, downward: goingEast, trueCoast: true});
	for (const {s, j, goingEast} of getAllCombCrossings(dilatedShape, yMin, spacing, INFINITE_PLANE))
		intersections[j].push({x: s, downward: goingEast, trueCoast: false});

	// select the ones that should be the endpoints of line segments
	const endpoints: number[][] = [];
	for (let j = 0; j < numLines; j ++) {
		endpoints.push([]);
		intersections[j] = intersections[j].sort((a, b) => a.x - b.x);
		let falseWraps = 0;
		let trueWraps = 0;
		for (const intersection of intersections[j]) {
			if (intersection.trueCoast) {
				if (intersection.downward)
					trueWraps += 1;
				else
					trueWraps -= 1;
				endpoints[j].push(intersection.x);
			}
			else {
				if (intersection.downward) {
					if (falseWraps === 0 && trueWraps === 0)
						endpoints[j].push(rng.normal(intersection.x, spacing/2));
					falseWraps += 1;
				}
				else {
					falseWraps -= 1;
					if (falseWraps === 0 && trueWraps === 0)
						endpoints[j].push(rng.normal(intersection.x, spacing/2));
				}
			}
		}
		if (endpoints[j].length%2 !== 0) {
			console.error("something went wrong in the hatching; these should always be even.");
			endpoints[j] = [];
		}
	}

	// finally, draw the lines
	for (let j = 0; j < numLines; j ++) {
		for (let k = 0; k < endpoints[j].length; k += 2) {
			const x1 = endpoints[j][k];
			const x2 = endpoints[j][k + 1];
			const y = yMin + j*spacing;
			draw([{type: 'M', args: [x1, y]}, {type: 'H', args: [x2]}], svg);
		}
	}

	svg.attributes.style =
		`fill:none; stroke:${color}; stroke-width:${width}; stroke-linecap:round`;
}

/**
 * describe a bunch of random symbols to put on the map to indicate biome and elevation
 * @param tiles the tiles being textured
 * @param lineFeatures any lines on the map to avoid
 * @param areaFeatures any regions on the map whose color we might have to match
 * @param transform the projection, extent, scale, and orientation information
 * @param svg SVG object on which to put the drawings
 * @param fillColor the fill color to give each picture by default
 * @param strokeColor the color for the lines
 * @param strokeWidth the thickness of the lines
 * @param resources a map containing all of the predrawn pictures to use for the texture
 */
function drawTexture(tiles: Set<Tile>, lineFeatures: PathSegment[][], areaFeatures: {path: PathSegment[], color: string}[],
                     transform: Transform, svg: VNode, fillColor: string,
                     strokeColor: string, strokeWidth: number, resources: Map<string, string>): void {
	const textureMixLookup = new Map<string, {name: string, density: number, diameter: number}[]>();
	for (const {name, components} of TEXTURE_MIXES)
		textureMixLookup.set(name, components);

	// get the hill texture
	const hillComponents = textureMixLookup.get("hill");
	let hillCoverage = 0;
	for (const rock of hillComponents)
		hillCoverage += rock.density*rock.diameter**2;

	const textureRegions: {region: Set<Tile>, components: {name: string, density: number, diameter: number}[]}[] = [];
	// for each non-aquatic biome
	for (let biome = 0; biome < BIOME_NAMES.length; biome ++) {
		if (!textureMixLookup.has(BIOME_NAMES[biome]))
			continue;

		const region = filterSet(tiles, t => t.biome === biome);

		// get the plant texture
		const plantComponents = textureMixLookup.has(BIOME_NAMES[biome]) ?
			textureMixLookup.get(BIOME_NAMES[biome]) : [];
		let plantCoverage = 0;
		for (const plant of plantComponents)
			plantCoverage += plant.density*plant.diameter**2;

		// fill the lowlands of that biome with the appropriate flora
		textureRegions.push({
			region: filterSet(region, t => t.height < HILL_HEIGHT),
			components: plantComponents,
		});

		// fill the highlands of that biome with the appropriate flora plus hills
		let totalCoverage = Math.max(plantCoverage, hillCoverage);
		const plantFactor = (totalCoverage - hillCoverage)/plantCoverage;
		const components = hillComponents.slice();
		for (const {name, diameter, density} of plantComponents)
			components.push({name: name, diameter: diameter, density: density*plantFactor});
		textureRegions.push({
			region: filterSet(region, t => t.height >= HILL_HEIGHT && t.height < MOUNTAIN_HEIGHT),
			components: components,
		});
	}

	// also fill the mountainous regions of the world with mountains
	textureRegions.push({
		region: filterSet(tiles, t => t.height >= MOUNTAIN_HEIGHT && !t.isWater()),
		components: textureMixLookup.get("mountain"),
	});

	const rng = new Random(0);
	const symbols: {x: number, y: number, name: string}[] = [];
	// for each texture region you identified
	for (const {region, components} of textureRegions) {
		const polygon = transformedOutline(region, Layer.BIO, transform);
		if (polygon.length > 0) {
			// choose the locations (remember to scale vertically since we're looking down at a 45° angle)
			const sinθ = Math.sqrt(1/2);
			const scaledPolygon = scalePath(polygonize(polygon), 1, 1/sinθ);
			const scaledLineFeatures = lineFeatures.map((line) => scalePath(polygonize(line), 1, 1/sinθ));
			const scaledLocations = poissonDiscSample(
				scaledPolygon, scaledLineFeatures, components, rng);
			const locations = scaledLocations.map(({x, y, type}) => ({x: x, y: y*sinθ, type: type}));
			// and then divvy those locations up among the different components of the texture
			for (const {x, y, type} of locations)
				symbols.push({x: x, y: y, name: components[type].name});
		}
	}

	// make sure zorder is based on y
	symbols.sort((a, b) => a.y - b.y);

	const textureNames = new Set<string>();
	for (const symbol of symbols)
		textureNames.add(symbol.name);

	// add all the relevant textures to the <defs/>
	const defs = h('defs');
	svg.children.splice(0, 0, defs);
	for (const textureName of textureNames) {
		if (!resources.has(`textures/${textureName}`))
			throw new Error(`I couldn't find the texture textures/${textureName}.svg!`);
		const texture = h('g', {id: `texture-${textureName}`});
		texture.textContent = resources.get(`textures/${textureName}`);
		defs.children.push(texture);
	}

	// then add the things to the map
	svg.attributes.style =
		`stroke:${strokeColor}; stroke-width:${strokeWidth}; stroke-linejoin:round; stroke-linecap: round;`;
	for (const {x, y, name} of symbols) {
		const picture = h('use', {href: `#texture-${name}`, x: `${x}`, y: `${y}`, fill: fillColor});
		for (const region of areaFeatures) { // check if it should inherit color from a base fill
			if (contains(region.path, {s: x, t: y}, INFINITE_PLANE, Rule.POSITIVE)) {
				picture.attributes.fill = region.color;
				break;
			}
		}
		svg.children.push(picture);
	}
}

/**
 * create a relief layer for the given set of triangles.
 * @param vertices Array of Vertexes to shade as triangles.
 * @param transform the projection, extent, scale, and orientation information
 * @param svg SVG object on which to shade.
 */
function shade(vertices: Set<Vertex>, transform: Transform, svg: VNode): void { // TODO use separate delaunay triangulation
	if (!vertices)
		return;

	// first determine which triangles are wholly within the map TODO: include some nodes outside the map
	const triangles: Vector[][] = [];
	let minHeight = Infinity;
	let maxHeight = -Infinity;
	let maxEdgeLength = 0;
	triangleSearch:
	for (const t of vertices) {
		const p = [];
		for (const node of t.tiles) {
			if (node instanceof EmptySpace)
				continue triangleSearch;
			const projectedNode = transformPoint(node, transform);
			if (projectedNode === null)
				continue triangleSearch;
			p.push(new Vector(projectedNode.x, -projectedNode.y, Math.max(0, node.height)));

			if (node.height < minHeight && node.height >= 0)
				minHeight = node.height;
			if (node.height > maxHeight)
				maxHeight = node.height;
		}
		triangles.push(p);

		for (let i = 0; i < 3; i ++) {
			const edgeLength = Math.hypot(p[i].x - p[(i + 1)%3].x, p[i].y - p[(i + 1)%3].y);
			if (edgeLength > maxEdgeLength)
				maxEdgeLength = edgeLength;
		}
	}

	const heightScale = maxEdgeLength/(maxHeight - minHeight)/3;

	for (const p of triangles) { // start by computing slopes of all of the triangles
		for (let i = 0; i < 3; i ++) // scale the heights
			p[i].z *= heightScale;

		let n = p[1].minus(p[0]).cross(p[2].minus(p[0])).normalized();
		const slope = -n.y/n.z;

		const path = [];
		for (const {x, y} of p)
			path.push({type: 'L', args: [x, -y]}); // put its values in a plottable form
		path.push({type: 'L', args: [...path[0].args]});
		path[0].type = 'M';
		const angle = Math.max(0, Math.min(Math.PI/2, SUN_ELEVATION - Math.atan(slope)));
		const brightness = Math.sin(angle)/Math.sin(SUN_ELEVATION); // and use that to get a brightness
		if (brightness > 1.02)
			draw(path, svg).attributes.style =
				`fill: #fff; fill-opacity: ${Math.min(brightness - 1, 1)*(1 - AMBIENT_LIGHT)};`;
		else if (brightness < 0.98)
			draw(path, svg).attributes.style =
				`fill: #000; fill-opacity: ${Math.min(1 - brightness, 1)*(1 - AMBIENT_LIGHT)};`;
	}
}

/**
 *
 * @param surface the surface being measured
 * @param extent the range of latitudes and longitudes to be marked
 * @param transform the projection, extent, scale, and orientation information
 * @param svg SVG object on which to put the Paths
 * @param color the color of the lines
 * @param width the thickness of the lines
 */
function drawGraticule(surface: Surface, extent: {φMin: number, φMax: number, λMin: number, λMax: number},
                       transform: Transform, svg: VNode, color: string, width: number): void {
	// calculate the average scale (mm/radian)
	const latitudeScale = transform.scale*surface.ds_dφ(transform.projection.φStandard);
	const longitudeScale = transform.scale*surface.rz(transform.projection.φStandard).r;

	svg.attributes.style = `fill:none; stroke:${color}; stroke-width:${width}`;
	let Δφ = GRATICULE_SPACING/latitudeScale;
	Δφ = Math.PI/2/Math.max(1, Math.round(Math.PI/2/Δφ));
	const φInit = Math.ceil(extent.φMin/Δφ)*Δφ;
	for (let φ = φInit; φ <= extent.φMax; φ += Δφ)
		draw(transformPath([
			{type: 'M', args: [φ, extent.λMin]},
			{type: 'Φ', args: [φ, extent.λMax]},
		], transform, false), svg);
	let Δλ = GRATICULE_SPACING/longitudeScale;
	Δλ = Math.PI/2/Math.max(1, Math.round(Math.PI/2/Δλ));
	const λInit = Math.ceil((extent.λMin - transform.projection.λCenter)/Δλ)*Δλ + transform.projection.λCenter;
	for (let λ = λInit; λ <= extent.λMax; λ += Δλ)
		draw(transformPath([
			{type: 'M', args: [extent.φMin, λ]},
			{type: 'Λ', args: [extent.φMax, λ]},
		], transform, false), svg);
}

/**
 * add all of the political labels to this map
 * @param civs the regions to label
 * @param style the transliteration convention to use for them
 * @param haloInfo a Map containing the color of each country by its ID, plus the generic land color at get(0), for halo styling purposes
 * @param transform the projection, extent, scale, and orientation information
 * @param svg the SVG object on which to write the label.
 * @param minFontSize the smallest allowable font size, in mm. if the label cannot fit inside
 *                    the region with this font size, no label will be placed.
 * @param maxFontSize the largest allowable font size, in mm. if there is space available for
 *                    a bigger label, it will appear at this font size
 * @param characterWidthMap a table containing the width of every possible character, for label length calculation purposes
 */
function placeLabels(civs: Civ[], style: string, haloInfo: null | Map<number, string>, transform: Transform, svg: VNode,
                     minFontSize: number, maxFontSize: number, characterWidthMap: Map<string, number>): void {
		let labelIndex = 0;
		for (const civ of civs) {
			if (civ.getPopulation() > 0) {
				const tiles = [...civ.tileTree.keys()].filter(n => !n.isSaltWater()); // TODO: do something fancier... maybe the intersection of the voronoi space and the convex hull
				const label = civ.getName().toString(style).toUpperCase();
				let haloColor;
				if (haloInfo === null)
					haloColor = null;
				else if (haloInfo.has(civ.id))
					haloColor = haloInfo.get(civ.id);
				else
					haloColor = haloInfo.get(0);

				placeLabel(tiles, label, transform, svg, minFontSize, maxFontSize, haloColor, labelIndex, characterWidthMap);
				labelIndex += 1;
			}
		}
	}

/**
 * add some text to this region on each of the
 * @param tiles the Nodos that comprise the region to be labelled.
 * @param label the text to place.
 * @param transform the projection, extent, scale, and orientation information
 * @param svg the SVG object on which to write the label.
 * @param minFontSize the smallest allowable font size, in mm. if the label cannot fit inside
 *                    the region with this font size, no label will be placed.
 * @param maxFontSize the largest allowable font size, in mm. if there is space available for
 *                    a bigger label, it will appear at this font size
 * @param haloColor the color of the text halo, if any, or null for no halos
 * @param labelIndex a unique number to use in the ID of this label and its arc
 * @param characterWidthMap a table containing the width of every possible character, for label length calculation purposes
 */
function placeLabel(tiles: Tile[], label: string, transform: Transform, svg: VNode, minFontSize: number,
                    maxFontSize: number, haloColor: string, labelIndex: number, characterWidthMap: Map<string, number>): void {
	if (tiles.length === 0)
		throw new Error("there must be at least one tile to label");
	const heightPerSize = 0.72; // this number was measured for Noto Sans
	const lengthPerSize = calculateStringLength(characterWidthMap, label);
	const aspectRatio = lengthPerSize/heightPerSize;

	const path = transformedOutline( // do the projection
		tiles, Layer.KULTUR, transform,
	);
	if (path.length === 0)
		return;

	// choose the best location for the text
	let location;
	try {
		location = chooseLabelLocation(
			path, aspectRatio, 1.4, maxFontSize*heightPerSize);
	} catch (e) {
		console.error(e);
		return;
	}

	const fontSize = location.height/heightPerSize;
	if (fontSize < minFontSize)
		return;

	const arc = draw(location.arc, svg); // make the arc in the SVG
	// arc.setAttribute('style', `fill: none; stroke: #400; stroke-width: .5px;`);
	if (SHOW_LABEL_PATHS)
		arc.attributes.style = `fill: none; stroke: #770000; stroke-width: ${location.height}`;
	else
		arc.attributes.style = 'fill: none; stroke: none;';
	arc.attributes.id = `labelArc${labelIndex}`;

	// create the text element
	const textGroup = h('text', {
		style: `font-size: ${fontSize}px; letter-spacing: ${location.letterSpacing*.5}em;`}); // this .5em is just a guess at the average letter width
	const textPath = h('textPath', {
		class: 'label',
		startOffset: '50%',
		href: `#labelArc${labelIndex}`,
	});
	textPath.textContent = label;

	// also add a halo below it if desired
	if (haloColor !== null) {
		const haloPath = cloneNode(textPath);
		haloPath.attributes.class += ' halo';
		haloPath.attributes.stroke = haloColor;

		textGroup.children.push(haloPath);
	}

	textGroup.children.push(textPath);
	svg.children.push(textGroup);
}

/**
 *
 * @param bbox
 * @param content
 * @param svg SVG object on which to put the content
 */
function placeWindrose(bbox: Dimensions, content: string, svg: VNode): void {
	// decide where to put it
	const radius = Math.min(25, 0.2*Math.min(bbox.width, bbox.height));
	const x = bbox.left + 1.2*radius;
	const y = bbox.top + 1.2*radius;
	svg.attributes.transform = `translate(${x}, ${y}) scale(${radius/26})`;

	// load the content from windrose.svg
	svg.textContent = content;
}

/**
 * draw a black envelope surrounded by white around the outside of this map
 * @param bbox the dimensions of the entire map (mm)
 * @param transform the projection, extent, scale, and orientation information
 * @param svg SVG object on which to put the Path
 * @param fillColor the color of the margin space
 * @param strokeColor the color of the envelope
 * @param strokeWidth the thickness of the envelope
 */
function drawOuterBorder(bbox: Dimensions, transform: Transform, svg: VNode, fillColor: string, strokeColor: string, strokeWidth: number): void {
	const outerBorder = convertPathClosuresToZ(transformPath([], transform, true));
	const paperEdge = rectangle(bbox.left, bbox.top, bbox.right, bbox.bottom, false);
	draw(paperEdge.concat(reversePath(outerBorder)), svg).attributes.style =
		`fill: ${fillColor}; stroke: white; stroke-width: ${strokeWidth/2};`;
	draw(outerBorder, svg).attributes.style =
		`fill: none; stroke: ${strokeColor}; stroke-width: ${strokeWidth}; stroke-linejoin: miter; stroke-miterlimit: 2;`;
}

/**
 * convert the series of segments to an HTML path element and add it to the Element
 */
function draw(segments: PathSegment[], svg: VNode): VNode {
	const path = h('path', {d: pathToString(segments)});
	if (segments.length > 0)
		svg.children.push(path); // put it in the SVG
	return path;
}


/**
 * project and convert an SVG path in latitude-longitude coordinates into an SVG path in Cartesian coordinates,
 * accounting for the map domain and the orientation and scale of the map.  if segments is [] but closePath is true,
 * that will be interpreted as meaning you want the path representing the whole Surface
 * (which will end up being just the map outline)
 * @param segments ordered Iterator of segments, which each have attributes .type (str) and .args ([double])
 * @param transform the projection, extent, scale, and orientation information
 * @param closePath if this is set to true, the map will make adjustments to account for its complete nature
 * @param cleanUpPath if this is set to true, this will purge any movetos without any connected segments
 *                    (otherwise some might unexpectedly appear at the fringes of the map region)
 * @return SVG.Path object in Cartesian coordinates
 */
function transformPath(segments: PathSegment[], transform: Transform, closePath=false, cleanUpPath=true): PathSegment[] {
	const croppedToGeoRegion = intersection(
		transformInput(transform.projection.domain, segments),
		transform.geoEdges,
		transform.projection.domain, closePath,
	);
	if (croppedToGeoRegion.length === 0)
		return [];
	let projected = applyProjectionToPath(
		transform.projection,
		croppedToGeoRegion,
		MAP_PRECISION/transform.scale,
		transform.mapEdges,
	);
	if (cleanUpPath)
		projected = removeLoosePoints(projected);
	const croppedToMapRegion = intersection(
		projected,
		transform.mapEdges,
		INFINITE_PLANE, closePath,
	);
	return scalePath(rotatePath(croppedToMapRegion, transform.orientation), transform.scale, transform.scale);
}


/**
 * project a geographic point defined by latitude and longitude to a point on the map defined by x and y,
 * accounting for the map domain and the orientation and scale of the map
 * @param point
 * @param transform the projection, extent, scale, and orientation information
 * @return the projected point in Cartesian coordinates (mm), or null if the point falls outside the mapped area.
 */
function transformPoint(point: ΦΛPoint, transform: Transform): XYPoint | null {
	// use the projectPath function, since that's much more general by necessity
	const result = transformPath([{type: 'M', args: [point.φ, point.λ]}], transform, false, false);
	// then simply extract the coordinates from the result
	if (result.length === 0)
		return null;
	else if (result.length === 1)
		return {x: result[0].args[0], y: result[0].args[1]};
	else
		throw new Error("well that wasn't supposed to happen.");
}


/**
 * create a path that forms the border of this set of Tiles on the map.
 * @param tiles the tiles that comprise the region whose outline is desired
 * @param greeble what kind of border this is for the purposes of greebling
 * @param transform the projection, extent, scale, and orientation information
 */
function transformedOutline(tiles: Iterable<Tile>, greeble: Layer, transform: Transform): PathSegment[] {
	const tileSet = new Set(tiles);
	if (tileSet.size === 0)
		return [];
	return transformPath(
		convertToGreebledPath(outline(tileSet), greeble, transform.scale),
		transform,
		true);
}

/**
 * create an ordered Iterator of segments that form all of these lines, aggregating where
 * applicable. aggregation may behave unexpectedly if some members of lines contain
 * nonendpoints that are endpoints of others.
 * @param lines Set of lists of points to be combined and pathified.
 */
function aggregate(lines: Iterable<ΦΛPoint[]>): Iterable<ΦΛPoint[]> {
	const queue = [...lines];
	const consolidated = new Set<ΦΛPoint[]>(); // first, consolidate
	const heads: Map<ΦΛPoint, ΦΛPoint[][]> = new Map(); // map from points to [lines beginning with endpoint]
	const tails: Map<ΦΛPoint, ΦΛPoint[][]> = new Map(); // map from points endpoints to [lines ending with endpoint]
	const torsos: Map<ΦΛPoint, {containing: ΦΛPoint[], index: number}> = new Map(); // map from midpoints to line containing midpoint
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

	function combine(a: ΦΛPoint[], b: ΦΛPoint[]): ΦΛPoint[] {
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
 * @param scale the map scale at which to greeble in mm/km
 */
function convertToGreebledPath(points: Iterable<ΦΛPoint[]>, greeble: Layer, scale: number): PathSegment[] {
	let path = [];
	for (const line of points) { // then do the conversion
		path.push({type: 'M', args: [line[0].φ, line[0].λ]});

		for (let i = 1; i < line.length; i ++) {
			const start = line[i - 1];
			const end = line[i];
			// see if there's an edge to greeble
			let edge: Edge | null = null;
			if (start instanceof Vertex && end instanceof Vertex)
				if (start.neighbors.has(end))
					edge = start.neighbors.get(end);
			let step: ΦΛPoint[];
			// if there is an edge and it should be greebled, greeble it
			if (edge !== null && weShouldGreeble(edge, greeble)) {
				const path = edge.getPath(GREEBLE_SCALE/scale);
				if (edge.vertex0 === start)
					step = path.slice(1);
				else
					step = path.slice(0, path.length - 1).reverse();
			}
			// otherwise, draw a strait line
			else {
				step = [end];
			}
			console.assert(step[step.length - 1].φ === end.φ && step[step.length - 1].λ === end.λ, step, "did not end at", end);

			for (const place of step)
				path.push({ type: 'L', args: [place.φ, place.λ] });
		}
	}
	return path;
}

function smooth(input: PathSegment[]): PathSegment[] {
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

function weShouldGreeble(edge: Edge, layer: Layer): boolean {
	if (DISABLE_GREEBLING)
		return false;
	else if (layer === Layer.GEO)
		return true;
	else if (edge.tileL.isWater() !== edge.tileR.isWater())
		return true;
	else if (layer === Layer.BIO)
		return false;
	else if (Math.min(edge.tileL.getPopulationDensity(), edge.tileR.getPopulationDensity()) < BORDER_SPECIFY_THRESHOLD)
		return false;
	else
		return true;
}

/**
 * identify the meridian and parallel that are most centered on this region
 */
function chooseMapCentering(regionOfInterest: Iterable<Tile>, surface: Surface): { centralMeridian: number, centralParallel: number, meanRadius: number } {
	// start by calculating the mean radius of the region, for pseudocylindrical standard parallels
	let rSum = 0;
	let count = 0;
	for (const tile of regionOfInterest) { // first measure the typical width of the surface in the latitude bounds
		rSum += surface.rz(tile.φ).r;
		count += 1;
	}
	if (count === 0)
		throw new Error("I can't choose a map centering with an empty region of interest.");
	const meanRadius = rSum/count;

	// turn the region into a proper closed polygon in the [-π, π) domain
	const landOfInterest = filterSet(regionOfInterest, tile => !tile.isWater() && !tile.isIceCovered());
	const coastline = intersection(
		convertToGreebledPath(outline(landOfInterest), Layer.KULTUR, 1e-6),
		rectangle(
			Math.max(surface.φMin, -Math.PI), -Math.PI,
			Math.min(surface.φMax, Math.PI), Math.PI, true),
		new Domain(-Math.PI, Math.PI, -Math.PI, Math.PI,
		           (point) => surface.isOnEdge(assert_φλ(point))),
		true,
	);
	const centralMeridian = chooseCentralMeridian(regionOfInterest, coastline);

	// find the average latitude of the region
	let centralParallel;
	if (regionOfInterest === surface.tiles && surface.φMax - surface.φMin < 2*Math.PI) {
		// if it's a whole-world map and non-periodic in latitude, always use the equator
		centralParallel = (surface.φMin + surface.φMax)/2;
	}
	else {
		centralParallel = chooseCentralMeridian(regionOfInterest, rotatePath(coastline, 90));
	}

	return {
		centralMeridian: centralMeridian,
		centralParallel: centralParallel,
		meanRadius: meanRadius};
}


/**
 * identify the meridian that is most centered on this region
 */
function chooseCentralMeridian(region: Iterable<Tile>, regionBoundary: PathSegment[]): number {
	// find the longitude with the most empty space on either side of it
	const emptyLongitudes = new ErodingSegmentTree(-Math.PI, Math.PI); // start with all longitudes empty
	for (let i = 0; i < regionBoundary.length; i ++) {
		if (regionBoundary[i].type !== 'M') {
			const λ1 = regionBoundary[i - 1].args[1];
			const λ2 = regionBoundary[i].args[1];
			if (Math.abs(λ1 - λ2) < Math.PI) { // and then remove the space corresponding to each segment
				emptyLongitudes.remove(Math.min(λ1, λ2), Math.max(λ1, λ2));
			}
			else {
				emptyLongitudes.remove(Math.max(λ1, λ2), Math.PI);
				emptyLongitudes.remove(-Math.PI, Math.min(λ1, λ2));
			}
		}
	}
	if (emptyLongitudes.getCenter(true).location !== null) {
		return localizeInRange(
			emptyLongitudes.getCenter(true).location + Math.PI,
			-Math.PI, Math.PI);
	}
	else {
		// if there are no empty longitudes, do a periodic mean over the land part of the region of interest
		let xCenter = 0;
		let yCenter = 0;
		for (const tile of region) {
			xCenter += Math.cos(tile.λ);
			yCenter += Math.sin(tile.λ);
		}
		return Math.atan2(yCenter, xCenter);
	}
}


/**
 * identify the central meridian for this map projection that centers this region horizontally
 */
function adjustMapCentering(regionOfInterest: Iterable<Tile>, projection: MapProjection): number {
	const landOfInterest = filterSet(regionOfInterest, tile => !tile.isWater());
	const coastline = transformInput(projection.domain, convertToGreebledPath(outline(landOfInterest), Layer.KULTUR, 1e-6));
	const geoExtent = calculatePathBounds(coastline);
	const mapExtent = calculatePathBounds(applyProjectionToPath(projection, coastline, Infinity));

	if (coastline.length === 0)
		throw new Error("how can I adjust the map centering when there's noting to center?");

	function centroid(λCenter: number): {value: number, slope: number} {
		const rotatedProjection = projection.recenter(λCenter);
		let min: {x: number, φ: number, λ: number} = null;
		let max: {x: number, φ: number, λ: number} = null;
		for (const segment of coastline) {
			const rawVertex = assert_φλ(endpoint(segment));
			rawVertex.λ = localizeInRange(rawVertex.λ, rotatedProjection.λMin, rotatedProjection.λMax);
			const vertex = rotatedProjection.projectPoint(rawVertex);
			if (min === null || vertex.x < min.x)
				min = {x: vertex.x, φ: rawVertex.φ, λ: rawVertex.λ};
			if (max === null || vertex.x > max.x)
				max = {x: vertex.x, φ: rawVertex.φ, λ: rawVertex.λ};
		}
		return {
			value: -(min.x + max.x)/2,
			slope: (rotatedProjection.gradient(min).λ.x + rotatedProjection.gradient(max).λ.x)/2,
		};
	}

	try {
		return findRoot(
			centroid,
			projection.λCenter,
			geoExtent.tMin,
			geoExtent.tMax,
			(mapExtent.sMax - mapExtent.sMin)*0.01,
		);
	} catch {
		console.error("I couldn't center this map properly for some reason.");
		return projection.λCenter;
	}
}


/**
 * determine the Cartesian coordinate bounds of this region on the map.
 * @param regionOfInterest the region that must be enclosed entirely within the returned bounding box
 * @param projection the projection being used to map this region from a Surface to the plane
 * @param rectangularBounds whether the map should be rectangular rather than wedge-shaped
 * @param geoEdges the bounds of the geographical region being mapped
 */
function chooseMapBounds(
	regionOfInterest: PathSegment[], projection: MapProjection, rectangularBounds: boolean, geoEdges: PathSegment[],
): {xLeft: number, xRight: number, yTop: number, yBottom: number, mapEdges: PathSegment[]} {
	// start by identifying the geographic and projected extent of this thing
	const regionBounds = calculatePathBounds(regionOfInterest);
	const projectedRegion = applyProjectionToPath(projection, regionOfInterest, Infinity);
	const projectedBounds = calculatePathBounds(projectedRegion);

	// first infer some things about this projection
	const northPoleIsDistant = projection.differentiability(projection.φMax) < .5;
	const southPoleIsDistant = projection.differentiability(projection.φMin) < .5;

	// calculate the Cartesian bounds, with some margin
	const margin = 0.05*Math.sqrt(
		(projectedBounds.sMax - projectedBounds.sMin)*
		(projectedBounds.tMax - projectedBounds.tMin));
	let xLeft = Math.min(projectedBounds.sMin, -projectedBounds.sMax) - margin;
	let xRight = -xLeft;
	let yTop = projectedBounds.tMin - margin;
	let yBottom = projectedBounds.tMax + margin;
	// but if the poles are super far away, put some global limits on the map extent
	const globeWidth = 2*Math.PI*projection.surface.rz((regionBounds.sMin + regionBounds.sMax)/2).r;
	const maxHeight = globeWidth/Math.sqrt(2);
	let yNorthCutoff = -Infinity, ySouthCutoff = Infinity;
	if (northPoleIsDistant) {
		if (southPoleIsDistant) {
			const yCenter = projection.projectPoint({
				φ: (regionBounds.sMin + regionBounds.sMax)/2,
				λ: projection.λCenter,
			}).y;
			yNorthCutoff = yCenter - maxHeight/2;
			ySouthCutoff = yCenter + maxHeight/2;
		}
		else
			yNorthCutoff = yBottom - maxHeight;
	}
	else if (southPoleIsDistant)
		ySouthCutoff = yTop + maxHeight;
	// apply those limits
	yTop = Math.max(yTop, yNorthCutoff);
	yBottom = Math.min(yBottom, ySouthCutoff);

	// if we want a wedge-shaped map
	if (!rectangularBounds) {
		// expand the cartesian bounds – ideally we shouldn't see them
		xRight = Math.max(1.4*xRight, -1.4*xLeft);
		xLeft = -xRight;
		const yMargin = 0.2*(yBottom - yTop);
		yTop = yTop - yMargin;
		yBottom = yBottom + yMargin;
	}

	// the extent of the geographic region will always impose some Cartesian limits; compute those now.
	const mapBounds = calculatePathBounds(applyProjectionToPath(projection, geoEdges, Infinity));
	xLeft = Math.max(xLeft, mapBounds.sMin);
	xRight = Math.min(xRight, mapBounds.sMax);
	yTop = Math.max(yTop, mapBounds.tMin);
	yBottom = Math.min(yBottom, mapBounds.tMax);

	// set the Cartesian limits of the unrotated and unscaled mapped area (km)
	const mapEdges = rectangle(xLeft, yTop, xRight, yBottom, false);

	return {xLeft, xRight, yTop, yBottom, mapEdges};
}

/**
 * determine the geographical coordinate bounds of this region on its Surface.
 * @param regionOfInterest the region that must be enclosed entirely within the returned bounding box
 * @param projection the projection being used, for the purposes of calculating the size of the margin.
 *                   strictly speaking we only need the scale along the central meridian and along the parallels
 *                   to be correct; parallel curvature doesn't come into play in this function.
 * @param rectangularBounds whether the map should be rectangular rather than wedge-shaped
 */
function chooseGeoBounds(
	regionOfInterest: PathSegment[], projection: MapProjection, rectangularBounds: boolean,
): {φMin: number, φMax: number, λMin: number, λMax: number, geoEdges: PathSegment[]} {
	// start by identifying the geographic and projected extent of this thing
	const regionBounds = calculatePathBounds(regionOfInterest);

	// first infer some things about this projection
	const northPoleIsDistant = projection.differentiability(projection.φMax) < .5;
	const southPoleIsDistant = projection.differentiability(projection.φMin) < .5;
	const northPoleIsPoint = projection.projectPoint({φ: projection.φMax, λ: 1}).x === 0;
	const southPoleIsPoint = projection.projectPoint({φ: projection.φMin, λ: 1}).x === 0;

	// calculate the geographic bounds, with some margin
	const yMax = projection.projectPoint({φ: regionBounds.sMin, λ: projection.λCenter}).y;
	const yMin = projection.projectPoint({φ: regionBounds.sMax, λ: projection.λCenter}).y;
	const ySouthEdge = projection.projectPoint({φ: projection.φMin, λ: projection.λCenter}).y;
	const yNorthEdge = projection.projectPoint({φ: projection.φMax, λ: projection.λCenter}).y;
	let φMax = projection.inverseProjectPoint({x: 0, y: Math.max(1.05*yMin - 0.05*yMax, yNorthEdge)}).φ;
	let φMin = projection.inverseProjectPoint({x: 0, y: Math.min(1.05*yMax - 0.05*yMin, ySouthEdge)}).φ;
	const ds_dλ = projection.surface.rz((φMin + φMax)/2).r;
	let λMin = Math.max(projection.λMin, regionBounds.tMin - 0.05*(yMax - yMin)/ds_dλ);
	let λMax = Math.min(projection.λMax, regionBounds.tMax + 0.05*(yMax - yMin)/ds_dλ);

	// if we want a rectangular map
	if (rectangularBounds) {
		// expand the latitude bounds as much as possible without self-intersection, assuming no latitude bounds
		for (let i = 0; i <= 50; i ++) {
			const φ = projection.φMin + i/50*(projection.φMax - projection.φMin);
			if (Math.abs(projection.parallelCurvature(φ)) <= 1) {
				φMax = Math.max(φMax, φ);
				φMin = Math.min(φMin, φ);
			}
		}
		// then expand the longitude bounds as much as possible without self-intersection
		let limitingΔλ = 2*Math.PI;
		for (let i = 0; i <= 50; i ++) {
			const φ = φMin + i/50*(φMax - φMin);
			const parallelCurvature = projection.parallelCurvature(φ);
			limitingΔλ = Math.min(limitingΔλ, 2*Math.PI/Math.abs(parallelCurvature));
		}
		if (limitingΔλ === 2*Math.PI) {
			λMin = projection.λMin;
			λMax = projection.λMax;
		}
		else {
			λMin = Math.max(Math.min(λMin, projection.λCenter - limitingΔλ/2), projection.λMin);
			λMax = Math.min(Math.max(λMax, projection.λCenter + limitingΔλ/2), projection.λMax);
		}
	}

	// cut out the poles if desired
	const longitudesWrapAround = projection.wrapsAround() && λMin === projection.λMin && λMax === projection.λMax;
	if (northPoleIsDistant || (northPoleIsPoint && !longitudesWrapAround))
		φMax = Math.max(Math.min(φMax, projection.φMax - 10/180*Math.PI), φMin);
	if (southPoleIsDistant || (southPoleIsPoint && !longitudesWrapAround))
		φMin = Math.min(Math.max(φMin, projection.φMin + 10/180*Math.PI), φMax);

	// set the geographic limits of the mapped area
	let geoEdges;
	if (longitudesWrapAround)
		geoEdges = [
			{type: 'M', args: [φMax, λMax]},
			{type: 'Φ', args: [φMax, λMin]},
			{type: 'L', args: [φMax, λMax]},
			{type: 'M', args: [φMin, λMin]},
			{type: 'Φ', args: [φMin, λMax]},
			{type: 'L', args: [φMin, λMin]},
		];
	else
		geoEdges = rectangle(φMax, λMax, φMin, λMin, true);

	return {φMin, φMax, λMin, λMax, geoEdges};
}

/**
 * create a Path that delineate a rectangular region in either Cartesian or latitude/longitude space
 */
function rectangle(s0: number, t0: number, s2: number, t2: number, geographic: boolean): PathSegment[] {
	if (!geographic)
		return [
			{type: 'M', args: [s0, t0]},
			{type: 'L', args: [s0, t2]},
			{type: 'L', args: [s2, t2]},
			{type: 'L', args: [s2, t0]},
			{type: 'L', args: [s0, t0]},
		];
	else
		return [
			{type: 'M', args: [s0, t0]},
			{type: 'Φ', args: [s0, t2]},
			{type: 'Λ', args: [s2, t2]},
			{type: 'Φ', args: [s2, t0]},
			{type: 'Λ', args: [s0, t0]},
		];
}

/**
 * create a new <g> element under the given parent
 */
function createSVGGroup(parent: VNode, id: string): VNode {
	const g = h('g', {id: id});
	parent.children.push(g);
	return g;
}

/**
 * calculate how long a string will be when written out
 */
function calculateStringLength(characterWidthMap: Map<string, number>, text: string): number {
	let length = 0;
	for (let i = 0; i < text.length; i ++) {
		if (characterWidthMap.has(text[i]))
			length += characterWidthMap.get(text[i]);
		else
			throw new Error(`unrecognized character: '${text[i]}'`);
	}
	return length;
}


/** an object that contains all the information you need to transform points from the globe to the map */
class Transform {
	public readonly projection: MapProjection;
	public readonly geoEdges: PathSegment[];
	public readonly mapEdges: PathSegment[];
	public readonly orientation: number;
	public readonly scale: number;

	constructor(projection: MapProjection, geoEdges: PathSegment[], mapEdges: PathSegment[], orientation: number, scale: number) {
		this.projection = projection;
		this.geoEdges = geoEdges;
		this.mapEdges = mapEdges;
		this.orientation = orientation;
		this.scale = scale;
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

	rotate(angle: number): Dimensions {
		if (angle === 0)
			return this;
		else if (angle === 90)
			return new Dimensions(this.top, this.bottom, -this.right, -this.left);
		else if (angle === 180)
			return new Dimensions(-this.right, -this.left, -this.bottom, -this.top);
		else if (angle === 270)
			return new Dimensions(-this.bottom, -this.top, this.left, this.right);
		else
			throw new Error("bruh");
	}

	scale(factor: number): Dimensions {
		return new Dimensions(
			factor*this.left,
			factor*this.right,
			factor*this.top,
			factor*this.bottom,
		);
	}

	offset(margin: number): Dimensions {
		return new Dimensions(
			this.left - margin,
			this.right + margin,
			this.top - margin,
			this.bottom + margin,
		);
	}
}
