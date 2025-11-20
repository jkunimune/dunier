/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {generateFactbook} from "../generation/factsheet.js";
import {Spheroid} from "../generation/surface/spheroid.js";
import {Sphere} from "../generation/surface/sphere.js";
import {Toroid} from "../generation/surface/toroid.js";
import {Disc} from "../generation/surface/disc.js";
import {Surface, Tile} from "../generation/surface/surface.js";
import {Random} from "../utilities/random.js";
import {generateTerrain} from "../generation/terrain.js";
import {subdivideLand} from "../generation/subdivideRegion.js";
import {depict} from "../mapping/chart.js";
import {World} from "../generation/world.js";
import {format, localize} from "./internationalization.js";
import {filterSet} from "../utilities/miscellaneus.js";
import {Civ} from "../generation/civ.js";
import {LockedDisc} from "../generation/surface/lockeddisc.js";
import {toXML, VNode} from "./virtualdom.js";
import {Lect} from "../generation/language/lect.js";


const MIN_SIZE_TO_LIST = 6;
const MAX_COUNTRIES_TO_LIST = 10;
const FONT_SIZE = 8; // pt

enum Layer {
	_,
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
/** some SVG assets we should have on hand in case the Chart needs it */
let resources: Map<string, string> = null;
/** a list of messages that had to be deferred because the Worker wasn't ready yet */
const messageQueue: MessageEvent[] = [];
/** whether we're accepting messages yet */
let ready = false;


// route all messages to generateFantasyMap() unless we're still loading the assets
onmessage = (message) => {
	if (ready)
		generateFantasyMap(message.data);
	else
		messageQueue.push(message);
};


// load the assets
loadSVGResources(
	"windrose",
	"textures/banyan_0", "textures/banyan_1",
	"textures/grass_0", "textures/grass_1", "textures/grass_2", "textures/grass_3",
	"textures/hill_0", "textures/hill_1",
	"textures/meranti_0", "textures/meranti_1",
	"textures/monkeypod_0", "textures/monkeypod_1", "textures/monkeypod_2", "textures/monkeypod_3",
	"textures/mountain_0", "textures/mountain_1", "textures/mountain_2", "textures/mountain_3",
	"textures/mountain_4", "textures/mountain_5", "textures/mountain_6", "textures/mountain_7",
	"textures/oak_0", "textures/oak_1", "textures/oak_2", "textures/oak_3",
	"textures/palm_0", "textures/palm_1",
	"textures/shrub_0", "textures/shrub_1", "textures/shrub_2", "textures/shrub_3",
	"textures/spruce_0", "textures/spruce_1", "textures/spruce_2", "textures/spruce_3",
).then(() => {
	ready = true;
	console.log("ready!");
	// when you're done, retroactively deal with any messages we've received and cached
	for (const message of messageQueue)
		generateFantasyMap(message.data);
});


// I don't understand what this block is but it makes the error handling work correctly
self.addEventListener('unhandledrejection', (event) => {
	console.trace(event.reason);
	throw event.reason;
});


/**
 * respond to a message from the GUI thread by generating the requested map
 */
function generateFantasyMap(args: any[]): void {
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
	let width: number;
	let height: number;
	let selectedFocusOption: string;
	let colorSchemeName: string;
	let rivers: boolean;
	let borders: boolean;
	let landTexture: boolean;
	let seaTexture: boolean;
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
		projectionName, orientation, width, height, selectedFocusOption,
		colorSchemeName, rivers, borders, landTexture, seaTexture, shading, civLabels, graticule, windrose, style,
		characterWidthMap,
	] = args;

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
			projectionName, orientation, width, height, selectedFocusOption,
			colorSchemeName, rivers, borders, graticule, windrose, landTexture, seaTexture, shading,
			civLabels, style);
	if (target >= Layer.FACTBOOK && lastUpdated < Layer.FACTBOOK)
		factbook = applyFactbook(map, mappedCivs, world.getLects(), year, tidallyLocked, language, style);

	postMessage([
		surface.parameterize(18),
		(terrainMap !== null) ? toXML(terrainMap) : null,
		(historyMap !== null) ? toXML(historyMap) : null,
		(map !== null) ? toXML(map) : null,
		(factbook !== null) ? toXML(factbook) : null,
		focusOptions,
		selectedFocusOption,
	]);
}


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
		surface.tiles, 4, 500);
	continents.sort((tilesA, tilesB) => tilesB.size - tilesA.size);

	console.log("grafa...");
	const projection = (surface.maximumCurvature() === 0) ? "orthographic" : "equal_earth";
	const {map} = depict(
		surface,
		continents,
		null,
		projection, surface.tiles,
		"north", 210,
		'physical',
		resources, characterWidthMap,
		true, false, true,
	);

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
		surface,
		seed);
	world.generateHistory(
		year); // create the terrain!

	console.log("grafa...");
	const projection = (surface.maximumCurvature() === 0) ? "orthographic" : "equal_earth";
	const {map} = depict(
		surface,
		null,
		world,
		projection,
		filterSet(surface.tiles, (t) => !t.isWater()),
		"north", 210,
		'political',
		resources, characterWidthMap,
		false, true, false,
		);

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
		label: localize("parameter.map.focus.whole_world", language),
	});
	// show a single continent
	for (let i = 0; i < continents.length; i ++)
		focusOptions.push({
			value: `continent${i}`,
			label: format(localize("parameter.map.focus.continent", language), i + 1),
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
 * @param width the approximate desired width of the map (mm)
 * @param height the approximate desired height of the map (mm)
 * @param focusSpecifier a string that specifies what location is being mapped
 * @param colorSchemeName the color scheme
 * @param rivers whether to add rivers
 * @param borders whether to add state borders
 * @param landTexture whether to draw little trees to indicate the biomes
 * @param seaTexture whether to draw horizontal lines by the coast
 * @param shading whether to add shaded relief
 * @param civLabels whether to label countries
 * @param graticule whether to draw a graticule
 * @param windrose whether to add a compass rose
 * @param style the transliteration convention to use for them
 */
function applyMap(
	projectionName: string, orientation: string,
	width: number, height: number, focusSpecifier: string,
	colorSchemeName: string, rivers: boolean, borders: boolean, graticule: boolean, windrose: boolean,
	landTexture: boolean, seaTexture: boolean, shading: boolean, civLabels: boolean,
	style: string): [VNode, Civ[]] {

	console.log("grafa zemgrafe...");

	// then interpret it into an actual region
	let regionOfInterest: Set<Tile>;
	if (focusSpecifier === "world") {
		regionOfInterest = filterSet(surface.tiles, t => !t.isWater());
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
			regionOfInterest = filterSet(civ.getTiles(), tile => !tile.isWater());
		}
		catch {
			console.error(`invalid civ index: ${i}`);
			regionOfInterest = surface.tiles;
		}
	}
	else
		throw new Error(`invalid focusSpecifier: '${focusSpecifier}'`);

	// now you can construct and call the Chart object
	const {map, mappedCivs} = depict(
		surface,
		continents,
		world,
		(surface.maximumCurvature() === 0) ? "orthographic" : projectionName,
		regionOfInterest,
		orientation, Math.max(width, height),
		colorSchemeName,
		resources, characterWidthMap,
		rivers,
		borders,
		graticule,
		windrose,
		landTexture,
		seaTexture,
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
 * @param currentYear today's date
 * @param tidalLock whether the planet is tidally locked (if so that changes the names of the cardinal directions)
 * @param lects the list of languages of which to be aware, from most to least important
 * @param language the language in which to write the factbook
 * @param style the spelling style to use for the proper nouns
 */
function applyFactbook(map: VNode, mappedCivs: Civ[], lects: Lect[], currentYear: number, tidalLock: boolean, language: string, style: string): VNode {
	console.log("jena factbook...");
	const doc = generateFactbook(
		map,
		mappedCivs,
		lects,
		currentYear,
		tidalLock,
		language,
		style,
	);

	console.log("fina!");
	return doc;
}


/**
 * grab all of the SVG files from the resources folder, fetch them into memory,
 * and wait for them to be loaded.
 */
async function loadSVGResources(...filenames: string[]): Promise<void> {
	resources = new Map<string, string>();
	for (const filename of filenames) {
		const response = await fetch(`../../resources/${filename}.svg`);
		const content = await response.text();
		const match = content.match(/<\?xml.*\?>\s*<svg[^>]*>\s*(.*)\s*<\/svg>\s*/s);
		if (match === null) {
			console.error(content);
			throw new Error(`I tried to load resources/${filename}.svg but I didn't seem to get a valid SVG.`);
		}
		const innerSVG = match[1];
		if (innerSVG === null)
			throw new Error(`what's wrong with ../../resources/${filename}.svg?  I can't read it.`);
		resources.set(filename, innerSVG);
	}
}
