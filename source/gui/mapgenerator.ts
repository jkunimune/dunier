/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {generateFactbook} from "../generation/factsheet.js";
import {Spheroid} from "../surface/spheroid.js";
import {Sphere} from "../surface/sphere.js";
import {Toroid} from "../surface/toroid.js";
import {Disc} from "../surface/disc.js";
import {Surface, Tile} from "../surface/surface.js";
import {Random} from "../utilities/random.js";
import {generateTerrain} from "../generation/terrain.js";
import {subdivideLand} from "../generation/subdivideRegion.js";
import {Chart} from "../map/chart.js";
import {World} from "../generation/world.js";
import {format} from "./internationalization.js";
import {filterSet} from "../utilities/miscellaneus.js";
import {Civ} from "../generation/civ.js";
import {LockedDisc} from "../surface/lockeddisc.js";
import {toXML, VNode} from "./virtualdom.js";


const MIN_SIZE_TO_LIST = 6;
const MAX_COUNTRIES_TO_LIST = 20;
const FONT_SIZE = 8; // pt

export enum Layer {
	NONE,
	PLANET,
	TERRAIN,
	HISTORY,
	MAP,
	FACTBOOK
}

/** the planet on which the map is defined */
let surface: Surface = null;
/** the list of continents with at least some land */
let continents: Set<Tile>[] = null;
/** the human world on that planet */
let world: World = null;
/** the current main map SVG */
let map: VNode = null;
/** the list of countries that are visible on the current map */
let mappedCivs: Civ[] = null;
/** the width of every character in the map font */
let characterWidthMap: Map<string, number> = null;


onmessage = (message) => {
	let language: string;
	let lastUpdated: Layer;
	let target: Layer;
	let planetType: string;
	let tidallyLocked: boolean;
	let radius: number;
	let gravity: number;
	let spinRate: number;
	let obliquity: number;
	let terrainSeed: number;
	let numContinents: number;
	let seaLevel: number;
	let temperature: number;
	let historySeed: number;
	let cataclysms: number;
	let year: number;
	let projectionName: string;
	let orientation: string;
	let rectangularBounds: boolean;
	let width: number;
	let height: number;
	let selectedFocusOption: string;
	let color: string;
	let rivers: boolean;
	let borders: boolean;
	let shading: boolean;
	let civLabels: boolean;
	let graticule: boolean;
	let windrose: boolean;
	let style: string;
	[
		language, lastUpdated, target,
		planetType, tidallyLocked, radius, gravity, spinRate, obliquity,
		terrainSeed, numContinents, seaLevel, temperature,
		historySeed, cataclysms, year,
		projectionName, orientation, rectangularBounds, width, height, selectedFocusOption,
		color, rivers, borders, shading, civLabels, graticule, windrose, style,
		characterWidthMap,
	] = message.data;

	let terrainMap = null;
	let historyMap = null;
	let focusOptions = null;
	let factbook = null;

	if (target >= Layer.PLANET && lastUpdated < Layer.PLANET)
		surface = applyPlanet(
			planetType, !tidallyLocked, radius, gravity, spinRate, obliquity);
	if (target >= Layer.TERRAIN && lastUpdated < Layer.TERRAIN)
		[continents, terrainMap] = applyTerrain(
			terrainSeed, numContinents, seaLevel, temperature);
	if (target >= Layer.HISTORY && lastUpdated < Layer.HISTORY) {
		[world, historyMap] = applyHistory(
			historySeed, cataclysms, year);
		[focusOptions, selectedFocusOption] = listFocusOptions(
			continents, world, selectedFocusOption, language, style);
	}
	if (target >= Layer.MAP && lastUpdated < Layer.MAP)
		[map, mappedCivs] = applyMap(
			projectionName, orientation, rectangularBounds, width, height, selectedFocusOption,
			color, rivers, borders, graticule, windrose, shading, civLabels, style);
	if (target >= Layer.FACTBOOK && lastUpdated < Layer.FACTBOOK)
		factbook = applyFactbook(map, mappedCivs, tidallyLocked, language, style);
	lastUpdated = target;

	postMessage([
		lastUpdated,
		surface.parameterize(18),
		(terrainMap !== null) ? toXML(terrainMap) : null,
		(historyMap !== null) ? toXML(historyMap) : null,
		(map !== null) ? toXML(map) : null,
		(factbook !== null) ? toXML(factbook) : null,
		focusOptions,
		selectedFocusOption,
	]);
};


/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 * @param planetType the category of surface, one of ["spheroid", "toroid", or "plane"]
 * @param hasDayNightCycle whether or not the planet is rotating relative to its sun
 * @param radius the radius of the planet at its widest point (km)
 * @param gravity the acceleration due to gravity at the equator (m/s²)
 * @param spinRate the angular velocity of the planet (/s)
 * @param obliquity the angle of this planet's axis with respect to its orbital plane (radians)
 */
function applyPlanet(planetType: string, hasDayNightCycle: boolean, radius: number, gravity: number, spinRate: number, obliquity: number): Surface {
	console.log("jena planete...");

	// create a surface
	if (planetType === 'spheroid') { // spheroid
		if (hasDayNightCycle) { // oblate
			surface = new Spheroid(
				radius,
				gravity,
				spinRate,
				obliquity);
		} else { // spherical
			surface = new Sphere(
				radius);
		}
	}
	else if (planetType === 'toroid') { // toroid
		surface = new Toroid(
			radius,
			gravity,
			spinRate,
			obliquity);
	}
	else if (planetType === 'plane') { // plane
		if (hasDayNightCycle) { // with orbiting sun
			surface = new Disc(
				radius,
				obliquity,
				hasDayNightCycle);
		} else { // with static sun
			surface = new LockedDisc(
				radius);
		}
	}
	else {
		throw new Error(`What kind of planet is ${planetType}`);
	}
	surface.initialize();

	console.log("fina!");
	return surface;
}


/**
 * Generate the heightmap and biomes on the planet's surface.
 * @param seed the random seed to use for the generation
 * @param numContinents the number of tectonic plates.  half of them will be continental.
 * @param seaLevel the altitude of the ocean relative to the average plate thickness (km)
 * @param temperature the average temperature on this planet (°C)
 * @return the list of continents, and the rendering of the terrain
 */
function applyTerrain(seed: number, numContinents: number, seaLevel: number, temperature: number): [Set<Tile>[], VNode] {
	console.log("Delone tingonfa...");
	let rng = new Random(seed); // use the random seed
	surface.populateWith(surface.randomlySubdivide(rng)); // finish constructing the surface

	console.log("jena zemforme...");
	rng = rng.reset();
	generateTerrain(
		numContinents, seaLevel, temperature,
		surface, rng); // create the terrain!

	// break the landmasses up into continents
	const continents = subdivideLand(
		surface.tiles, 3, 500);
	continents.sort((tilesA, tilesB) => tilesB.size - tilesA.size);

	console.log("grafa...");
	const projection = surface.isFlat() ? "orthographic" : "equal_earth";
	const mapper = new Chart(
		projection, surface, surface.tiles,
		"north", false, 62500,
		characterWidthMap);
	const {map} = mapper.depict(surface,
		continents,
		null,
		'physical',
		true, false, true);

	console.log("fina!");
	return [continents, map];
}


/**
 * Generate the countries on the planet's surface.
 * @param seed the random seed to use for the generation
 * @param cataclysms the number of apocalypses (/y)
 * @param year the point in history to which to simulate (y)
 */
function applyHistory(seed: number, cataclysms: number, year: number): [World, VNode] {
	console.log("jena histore...");
	const world = new World(
		cataclysms,
		surface);
	let rng = new Random(seed); // use the random seed
	world.generateHistory(
		year,
		rng); // create the terrain!

	console.log("grafa...");
	const projection = surface.isFlat() ? "orthographic" : "equal_earth";
	const mapper = new Chart(
		projection, surface,
		filterSet(surface.tiles, (t) => !t.isWater() && !t.isIceCovered()),
		"north", false, 62500,
		characterWidthMap);
	const {map} = mapper.depict(surface,
		null,
		world,
		'political',
		false, true, false);

	console.log("fina!");
	return [world, map];
}


/**
 * enumerate the geographic entities at which we can look
 * @param continents the list of available continents
 * @param world the World containing the available countries
 * @param selectedFocusOption the currently selected option
 * @param language the language in which to localize the option labels
 * @param style the transcription style to use for the proper nouns
 */
function listFocusOptions(continents: Set<Tile>[], world: World, selectedFocusOption: string, language: string, style: string): [{value: string, label: string}[], string] {
	const focusOptions = [];
	// show the whole world
	focusOptions.push({
		value: 'world',
		label: format(language, null, "parameter.map.focus.whole_world"),
	});
	// show a single continent
	for (let i = 0; i < continents.length; i ++)
		focusOptions.push({
			value: `continent${i}`,
			label: format(language, null, "parameter.map.focus.continent", i + 1),
		});
	// or show a single country
	const countries = world.getCivs(true, MIN_SIZE_TO_LIST); // list the biggest countries for the centering selection
	for (const country of countries.slice(0, MAX_COUNTRIES_TO_LIST))
		focusOptions.push({
			value: `country${country.id}-${country.getName().toString('ipa')}`,
			label: country.getName().toString(style),
		});

	// now, if the set of options no longer contains the selected one, set it to the default
	if (!focusOptions.some(option => selectedFocusOption === option.value)) {
		if (focusOptions.length > 1)
			selectedFocusOption = focusOptions[1].value;
		else
			selectedFocusOption = focusOptions[0].value;
	}

	return [focusOptions, selectedFocusOption];
}


/**
 * Generate a final formatted map.
 * @param projectionName the type of projection to choose – one of "equal_earth", "bonne", "conformal_conic", "mercator", or "orthographic"
 * @param orientation the cardinal direction that should correspond to up – one of "north", "south", "east", or "west"
 * @param rectangularBounds whether to make the bounding box as rectangular as possible, rather than having it conform to the graticule
 * @param width the approximate desired width of the map (mm)
 * @param height the approximate desired height of the map (mm)
 * @param focusSpecifier a string that specifies what location is being mapped
 * @param color the color scheme
 * @param rivers whether to add rivers
 * @param borders whether to add state borders
 * @param shading whether to add shaded relief
 * @param civLabels whether to label countries
 * @param graticule whether to draw a graticule
 * @param windrose whether to add a compass rose
 * @param style the transliteration convention to use for them
 */
function applyMap(
	projectionName: string, orientation: string,
	rectangularBounds: boolean, width: number, height: number, focusSpecifier: string,
	color: string, rivers: boolean, borders: boolean, graticule: boolean, windrose: boolean,
	shading: boolean, civLabels: boolean, style: string): [VNode, Civ[]] {

	console.log("grafa zemgrafe...");

	// then interpret it into an actual region
	let regionOfInterest: Set<Tile>;
	if (focusSpecifier === "world") {
		regionOfInterest = filterSet(surface.tiles, t => !t.isIceCovered() && !t.isWater());
		if (regionOfInterest.size === 0)
			regionOfInterest = surface.tiles;
	}
	else if (focusSpecifier.startsWith("continent")) {
		const i = Number.parseInt(focusSpecifier.slice(9));
		if (i < continents.length)
			regionOfInterest = continents[i];
		else {
			console.error(`invalid continent index: ${i}`);
			regionOfInterest = surface.tiles;
		}
	}
	else if (focusSpecifier.startsWith("country")) {
		const i = Number.parseInt(focusSpecifier.split("-")[0].slice(7));
		try {
			const civ = world.getCiv(i);
			regionOfInterest = filterSet(civ.tileTree.keys(), tile => !tile.isWater());
		}
		catch {
			console.error(`invalid civ index: ${i}`);
			regionOfInterest = surface.tiles;
		}
	}
	else
		throw new Error(`invalid focusSpecifier: '${focusSpecifier}'`);

	// now you can construct and call the Chart object
	const chart = new Chart(
		surface.isFlat() ? "orthographic" : projectionName,
		surface, regionOfInterest,
		orientation, rectangularBounds, width*height,
		characterWidthMap);
	const {map, mappedCivs} = chart.depict(
		surface,
		continents,
		world,
		color,
		rivers,
		borders,
		graticule,
		windrose,
		shading,
		civLabels,
		FONT_SIZE*0.35, // convert to mm
		style,
	);

	console.log("fina!");
	return [map, mappedCivs];
}


/**
 * Generate a nicely typeset document giving all the information about the mapped countries
 * @param map the map being described
 * @param mappedCivs the list of Civs of which to write descriptions
 * @param tidalLock whether the planet is tidally locked (if so that changes the names of the cardinal directions)
 * @param language the language in which to write the factbook
 * @param style the spelling style to use for the proper nouns
 */
function applyFactbook(map: VNode, mappedCivs: Civ[], tidalLock: boolean, language: string, style: string): VNode {
	console.log("jena factbook...");
	const doc = generateFactbook(
		map,
		mappedCivs,
		tidalLock,
		language,
		style,
	);

	console.log("fina!");
	return doc;
}
