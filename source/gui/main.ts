/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import "../libraries/plotly.min.js"; // note that I modified this copy of Plotly to work in vanilla ES6
import {DOM} from "./dom.js";
import {format} from "./internationalization.js";
import {generateTerrain} from "../generation/terrain.js";
import {Surface, Tile} from "../surface/surface.js";
import {World} from "../generation/world.js";
import {Random} from "../utilities/random.js";
import {Chart} from "../map/chart.js";
import {Spheroid} from "../surface/spheroid.js";
import {Sphere} from "../surface/sphere.js";
import {Disc} from "../surface/disc.js";
import {Toroid} from "../surface/toroid.js";
import {LockedDisc} from "../surface/lockeddisc.js";
import {generateFactbook} from "../generation/factsheet.js";
import {Selector} from "../utilities/selector.js";
import {Civ} from "../generation/civ.js";
import {convertSVGToBlob, convertSVGToPNGAndThenDownloadIt, download, serialize} from "./export.js";
import {filterSet} from "../utilities/miscellaneus.js";
import {subdivideLand} from "../generation/subdivideRegion.js";
// @ts-ignore
const Plotly = window.Plotly;


const TERRAIN_COLORMAP = [
	[0.00, 'rgb(251, 254, 248)'],
	[0.08, 'rgb(216, 231, 245)'],
	[0.15, 'rgb(164, 215, 237)'],
	[0.23, 'rgb(104, 203, 206)'],
	[0.31, 'rgb( 68, 185, 156)'],
	[0.38, 'rgb( 54, 167, 105)'],
	[0.46, 'rgb( 64, 145,  47)'],
	[0.54, 'rgb( 92, 116,  11)'],
	[0.62, 'rgb(100,  89,   5)'],
	[0.69, 'rgb( 99,  62,   1)'],
	[0.77, 'rgb( 91,  33,   1)'],
	[0.85, 'rgb( 75,   2,   6)'],
	[0.92, 'rgb( 41,   4,   5)'],
	[1.00, 'rgb(  7,   0,   0)'],
];

const MIN_SIZE_TO_LIST = 6;
const MAX_COUNTRIES_TO_LIST = 20;
const FONT_SIZE = 8; // pt

enum Layer {
	NONE,
	PLANET,
	TERRAIN,
	HISTORY,
	MAP,
	FACTBOOK
}

/** which level of the model currently has all input changes applied */
let lastUpdated = Layer.NONE;
/** whether the plotly image is up to date with the model */
let planetRendered = false;
/** whether a process is currently running */
let inProgress: boolean = false; // TODO; I can't remember why this is here; if I click forward in the tabs while it's loading, does everything update?
/** the planet on which the map is defined */
let surface: Surface = null;
/** the list of continents with at least some land */
let continents: Set<Tile>[] = null;
/** the human world on that planet */
let world: World = null;
/** the Chart representing the main map */
let chart: Chart = null;
/** the list of countries on the current map */
let mappedCivs: Civ[] = null;
/** the number of alerts that have been posted */
let alertCounter: number = 0;


/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 */
function applyPlanet() {
	console.log("jena planete...");
	const planetType = DOM.val('planet-type'); // read input
	const hasDayNightCycle = !DOM.checked('planet-locked');
	const radius = Number(DOM.val('planet-size')) / (2*Math.PI);
	const gravity = Number(DOM.val('planet-gravity')) * 9.8;
	const spinRate = 1 / Number(DOM.val('planet-day')) * 2*Math.PI/3600;
	const obliquity = Number(DOM.val('planet-tilt')) * Math.PI/180;

	try { // create a surface
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
			console.error(`What kind of planet is ${planetType}`);
			return;
		}
	} catch (err) {
		if (err instanceof RangeError) {
			let message: string;
			if (err.message.startsWith("Too fast"))
				message = format(null, "error.planet_too_fast"); // TODO: it should automaticly bound the day-length at stable values
			else if (err.message.startsWith("Too slow"))
				message = format(null, "error.planet_too_slow");
			postErrorAlert(message);
			return;
		} else
			throw err;
	}
	surface.initialize();

	console.log("fina!");
	lastUpdated = Layer.PLANET;
	planetRendered = false;
}


function renderPlanet() {
	if (lastUpdated < Layer.PLANET)
		applyPlanet();

	console.log("grafa planete...");
	const radius = Number(DOM.val('planet-size')) / (2*Math.PI);

	const {x, y, z, I} = surface.parameterize(18);

	// apply a smotherstep normalization to the insolation
	const color = [];
	for (let i = 0; i < I.length; i ++) {
		color.push([]);
		for (let j = 0; j < I[i].length; j ++)
			color[i].push(Math.pow(I[i][j], 3)*(3*I[i][j]*I[i][j] - 15*I[i][j] + 20)/8);
	}

	Plotly.react(
		DOM.elm('planet-map'),
		[{
			type: 'surface',
			x: x,
			y: y,
			z: z,
			surfacecolor: color,
			cmin: 0.,
			cmax: 2.,
			colorscale: TERRAIN_COLORMAP,
			showscale: false,
			lightposition: {x: 1000, y: 0, z: 0},
			hoverinfo: "none",
			contours: {
				x: {highlight: false},
				y: {highlight: false},
				z: {highlight: false}},
		}],
		{
			margin: {l: 20, r: 20, t: 20, b: 20},
			scene: {
				xaxis: {
					showspikes: false,
					range: [-radius, radius],
				},
				yaxis: {
					showspikes: false,
					range: [-radius, radius],
				},
				zaxis: {
					showspikes: false,
					range: [-radius, radius],
				},
				aspectmode: 'cube',
			},
		},
		{
			responsive: true,
		}
	).then(() => {
	});

	console.log("fina!");
	planetRendered = true;
}


/**
 * Generate the heightmap and biomes on the planet's surface.
 */
function applyTerrain(): void {
	if (lastUpdated < Layer.PLANET)
		applyPlanet();

	console.log("Delone tingonfa...");
	let rng = new Random(Number(DOM.val('terrain-seed'))); // use the random seed
	surface.populateWith(surface.randomlySubdivide(rng)); // finish constructing the surface

	console.log("jena zemforme...");
	rng = rng.reset();
	generateTerrain(
		Number(DOM.val('terrain-continents')),
		Number(DOM.val('terrain-sea-level')),
		Number(DOM.val('terrain-temperature')),
		surface, rng); // create the terrain!

	// break the landmasses up into continents
	continents = subdivideLand(
		surface.tiles, 3, 500);
	continents = continents.sort((tilesA, tilesB) => tilesB.size - tilesA.size);

	console.log("grafa...");
	const projection = surface.isFlat() ? "orthographic" : "equal_earth";
	const mapper = new Chart(
		projection, surface, surface.tiles,
		"north", false, 62500);
	mapper.depict(surface,
				  continents,
	              null,
	              DOM.elm('terrain-map') as SVGGElement,
	              'physical',
	              true, false, true);

	console.log("fina!");
	lastUpdated = Layer.TERRAIN;
}


/**
 * Generate the countries on the planet's surface.
 */
function applyHistory(): void {
	if (lastUpdated < Layer.TERRAIN)
		applyTerrain();

	console.log("jena histore...");
	world = new World(
		Number(DOM.val('history-meteors')),
		surface);
	let rng = new Random(Number(DOM.val('history-seed'))); // use the random seed
	world.generateHistory(
		Number(DOM.val('history-year')),
		rng); // create the terrain!

	console.log("grafa...");
	const projection = surface.isFlat() ? "orthographic" : "equal_earth";
	const mapper = new Chart(
		projection, surface, surface.tiles,
		"north", false, 62500);
	mapper.depict(surface,
				  continents,
	              world,
	              DOM.elm('history-map') as SVGGElement,
	              'political',
	              false, true, false);

	// now set up the "focus" options for the map tab:
	console.log("mute ba chuze bil...");
	const picker = document.getElementById('map-jung');
	picker.textContent = "";
	// show the whole world
	const option = document.createElement('option');
	option.setAttribute('value', 'world');
	option.textContent = format(null, "parameter.map.focus.whole_world");
	picker.appendChild(option);
	// show a single continent
	for (let i = 0; i < continents.length; i ++) {
		const option = document.createElement('option');
		option.selected = (i === 0);
		option.setAttribute('value', `continent${i}`);
		option.textContent = format(null, "parameter.map.focus.continent", i + 1);
		picker.appendChild(option);
	}
	// or show a single country
	const countries = world.getCivs(true, MIN_SIZE_TO_LIST); // list the biggest countries for the centering selection
	for (const country of countries.slice(0, MAX_COUNTRIES_TO_LIST)) {
		const option = document.createElement('option');
		option.setAttribute('value', `country${country.id}`);
		option.textContent = country.getName().toString(DOM.val("map-spelling"));
		picker.appendChild(option);
	}

	console.log("fina!");
	lastUpdated = Layer.HISTORY;
}


/**
 * Generate a final formatted map.
 */
function applyMap(): void {
	if (lastUpdated < Layer.HISTORY)
		applyHistory();

	console.log("grafa zemgrafe...");
	const projectionName = surface.isFlat() ? "orthographic" : DOM.val('map-projection');
	const orientation = DOM.val('map-orientation');
	const rectangularBounds = (DOM.val('map-shape') === 'rectangle');
	const width = Number.parseFloat(DOM.val('map-width-mm'));
	const height = Number.parseFloat(DOM.val('map-height-mm'));
	const focusSpecifier = DOM.val('map-jung');
	let regionOfInterest: Set<Tile>;
	if (focusSpecifier === "world")
		regionOfInterest = surface.tiles;
	else if (focusSpecifier.startsWith("continent"))
		regionOfInterest = continents[Number.parseInt(focusSpecifier.slice(9))];
	else if (focusSpecifier.startsWith("country")) {
		const civ = world.getCiv(Number.parseInt(focusSpecifier.slice(7)));
		regionOfInterest = filterSet(civ.tileTree.keys(), tile => !tile.isWater());
	}
	else
		throw new Error(`invalid focusSpecifier: '${focusSpecifier}'`);

	chart = new Chart(
		projectionName, surface, regionOfInterest,
		orientation, rectangularBounds, width*height,
		DOM.elm('test-text') as HTMLDivElement);
	mappedCivs = chart.depict(
		surface,
		continents,
		world,
		DOM.elm('map-map') as SVGGElement,
		DOM.val('map-color'),
		DOM.checked('map-rivers'),
		DOM.checked('map-borders'),
		DOM.checked('map-graticule'),
		DOM.checked('map-windrose'),
		DOM.checked('map-shading'),
		DOM.checked('map-political-labels'),
		DOM.checked('map-physical-labels'),
		FONT_SIZE*0.35, // convert to mm
		DOM.val('map-spelling'),
	);

	// adjust the height and width options to reflect the new aspect ratio
	enforceAspectRatio("neither", "mm");
	enforceAspectRatio("neither", "px");

	console.log("fina!");
	lastUpdated = Layer.MAP;
}


/**
 * Generate a nicely typeset document giving all the information about the mapped countries
 */
function applyFactbook(): void {
	if (lastUpdated < Layer.MAP)
		applyMap();

	console.log("jena factbook...");
	const doc = generateFactbook(
		DOM.elm('map-map') as SVGSVGElement,
		mappedCivs,
		DOM.checked('planet-locked'),
		DOM.val('map-spelling'),
	);
	DOM.elm('factbook-embed').setAttribute('srcdoc', serialize(doc));

	console.log("fina!");
	lastUpdated = Layer.FACTBOOK;
}


/**
 * disable all the buttons, turn on the loading icon, call the funccion, wait, then set
 * everything back to how it was before.
 */
function disableButtonsAndDo(func: () => void): void {
	inProgress = true;
	for (const tab of ['planet', 'terrain', 'history', 'map']) {
		DOM.elm(`${tab}-apply`).toggleAttribute('disabled', true);
		DOM.elm(`${tab}-ready`).style.display = 'none';
		DOM.elm(`${tab}-loading`).style.display = null;
	}

	setTimeout(() => {
		try {
			func();
		} catch (error) {
			console.error(error);
			postErrorAlert(format(null, "error.uncaught"));
		}

		inProgress = false;
		for (const tab of ['planet', 'terrain', 'history', 'map']) {
			DOM.elm(`${tab}-apply`).toggleAttribute('disabled', false);
			DOM.elm(`${tab}-ready`).style.display = null;
			DOM.elm(`${tab}-loading`).style.display = 'none';
		}
	}, 10);
}


/**
 * create a red alert box across the top of the screen with some message
 */
function postErrorAlert(message: string): void {
	const id = `alert-${alertCounter}`;
	alertCounter ++;
	DOM.elm('alert-box').innerHTML +=
		`<div class='alert fade show' role='alert' id='${id}'>\n` +
		`  ${message}\n` +
		`  <button type='button' class='close' data-dismiss='alert' aria-label='Close' onclick='document.getElementById("${id}").remove();'>\n` +
		"    <span aria-hidden='true'>&times;</span>\n" +
		"  </button>\n" +
		"</div>";
}


/**
 * automaticly adjust the day length for toroids or spheroids to keep things stable
 */
function fixDayLength() {
	const locking = <HTMLInputElement>DOM.elm('planet-locked');
	const radius = Number(DOM.val('planet-size')) / (2*Math.PI);
	const gravity = Number(DOM.val('planet-gravity')) * 9.8;
	// if it's spheroidal now
	if (DOM.val("planet-type") === 'spheroid') {
		// locking is okay
		locking.toggleAttribute('disabled', false);
		// make sure it's not spinning too fast
		const minDayLength = Math.ceil(2*Math.PI/Math.sqrt(0.5*gravity/(radius*1000))/3600*10)/10;
		DOM.set(
			"planet-day",
			String(Math.max(minDayLength, Number(DOM.val("planet-day")))));
	}
	// if it's toroidal now
	else if (DOM.val("planet-type") === 'toroid') {
		// locking is not okay
		if (locking.checked) // uncheck tidal locking if we need to
			locking.click();
		locking.toggleAttribute('disabled', true); // and disable it
		// make sure it's not spinning too fast or too slow
		const minDayLength = Math.ceil(2*Math.PI/Math.sqrt(0.50*gravity/(radius*1000))/3600*10)/10;
		const maxDayLength = Math.floor(2*Math.PI/Math.sqrt(0.15*gravity/(radius*1000))/3600*10)/10;
		DOM.set(
			"planet-day",
			String(Math.max(minDayLength, Math.min(maxDayLength, Number(DOM.val("planet-day"))))));
	}
	// if it's planar
	else {
		// locking is okay
		locking.toggleAttribute('disabled', false);
	}
}



/**
 * when the map aspect ratio changes or one of the map size input spinners change,
 * make sure they're all consistent.
 */
function enforceAspectRatio(fixed: string, unit: string) {
	const aspectRatio = chart.dimensions.width/chart.dimensions.height;
	const widthSpinner = DOM.elm(`map-width-${unit}`) as HTMLInputElement;
	const heightSpinner = DOM.elm(`map-height-${unit}`) as HTMLInputElement;
	if (fixed === "width") {
		const width = Number.parseFloat(widthSpinner.value);
		heightSpinner.value = (Math.round(width/aspectRatio)).toString();
	}
	else if (fixed === "height") {
		const height = Number.parseFloat(heightSpinner.value);
		widthSpinner.value = (Math.round(height*aspectRatio)).toString();
	}
	else {
		const area = Number.parseFloat(widthSpinner.value)*Number.parseFloat(heightSpinner.value);
		widthSpinner.value = (Math.round(Math.sqrt(area*aspectRatio))).toString();
		heightSpinner.value = (Math.round(Math.sqrt(area/aspectRatio))).toString();
	}
}


for (const prefix of ['content', 'style', 'formatting']) {
	/** when the user clicks on a card header, toggle whether it is shown and hide all the others */
	DOM.elm(`map-${prefix}-heading`).addEventListener('click', () => {
		for (const otherPrefix of ['content', 'style', 'formatting']) {
			const heading = DOM.elm(`map-${otherPrefix}-heading`);
			const collapse = DOM.elm(`map-${otherPrefix}-collapse`);
			let nowShown: boolean;
			if (otherPrefix === prefix) // toggle the selected header
				nowShown = collapse.classList.toggle("show");
			else // hide all other headers
				nowShown = collapse.classList.toggle("show", false);
			heading.setAttribute("aria-expanded", nowShown.toString());
		}
	});
}


for (const prefix of ['planet', 'terrain', 'history', 'map', 'factbook']) {
	/** when the user clicks on a tab, show its panel and hide all others */
	DOM.elm(`${prefix}-tab`).addEventListener('click', () => {
		for (const otherPrefix of ['planet', 'terrain', 'history', 'map', 'factbook']) {
			const tab = DOM.elm(`${otherPrefix}-tab`);
			const panel = DOM.elm(`${otherPrefix}-panel`);
			if (otherPrefix === prefix) {
				tab.setAttribute("aria-selected", "true");
				tab.classList.add("active");
				panel.classList.add("active");
				panel.toggleAttribute("hidden", false);
			}
			else {
				tab.setAttribute("aria-selected", "false");
				tab.classList.remove("active");
				panel.classList.remove("active");
				panel.toggleAttribute("hidden", true);
			}
		}
	});
}


for (const suffix of ['apply', 'tab']) {
	/**
	 * When the planet button is clicked, call its function.
	 * Note that this does not check if the planet is out of sync; it
	 * must update every time the tab is opened because of Plotly.
	 */
	DOM.elm(`planet-${suffix}`).addEventListener('click', () => {
		if (!planetRendered && !inProgress)
			disableButtonsAndDo(renderPlanet);
	});

	/**
	 * When the terrain tab or button is clicked, do its thing
	 */
	DOM.elm(`terrain-${suffix}`).addEventListener('click', () => {
		if (lastUpdated < Layer.TERRAIN && !inProgress)
			disableButtonsAndDo(applyTerrain);
	});

	/**
	 * When the history tab or button is clicked, activate its purpose.
	 */
	DOM.elm(`history-${suffix}`).addEventListener('click', () => {
		if (lastUpdated < Layer.HISTORY && !inProgress)
			disableButtonsAndDo(applyHistory);
	});

	/**
	 * When the map tab or button is clicked, reveal its true form.
	 */
	DOM.elm(`map-${suffix}`).addEventListener('click', () => {
		if (lastUpdated < Layer.MAP && !inProgress)
			disableButtonsAndDo(applyMap);
	});
}

/**
 * When the factbook tab is clicked, generate the factbook.
 */
DOM.elm('factbook-tab').addEventListener('click', () => {
	if (lastUpdated < Layer.FACTBOOK && !inProgress)
		disableButtonsAndDo(applyFactbook);
});

/**
 * When the download button is clicked, export and download the map as an SVG
 */
DOM.elm('map-download-svg').addEventListener('click', () => {
	const printscaleMap = DOM.elm('map-map').cloneNode(true) as SVGSVGElement;
	const [, , width, height] = printscaleMap.getAttribute("viewBox").split(" ");
	printscaleMap.setAttribute("width", `${width}mm`);
	printscaleMap.setAttribute("height", `${height}mm`);
	download(
		convertSVGToBlob(printscaleMap),
		format(null, "filename") + ".svg");
});

/**
 * When the download button is clicked, export and download the map as a PNG
 */
DOM.elm('map-download-png').addEventListener('click', () => {
	convertSVGToPNGAndThenDownloadIt(
		convertSVGToBlob(DOM.elm('map-map') as SVGSVGElement),
		Number.parseInt(DOM.val('map-width-px')),
		Number.parseInt(DOM.val('map-height-px')),
		format(null, "filename") + ".png");
});

/**
 * When the print button is clicked, send the factbook to the browser's print window
 */
DOM.elm('factbook-print').addEventListener('click', () => {
	(DOM.elm('factbook-embed') as HTMLIFrameElement).contentWindow.print();
});

/**
 * When the planet type changes, make sure the day length is legal
 */
DOM.elm('planet-type').addEventListener('change', () => fixDayLength());

/**
 * When one of the map size inputs change, change its counterpart to match
 */
DOM.elm('map-width-mm').addEventListener('change', () => enforceAspectRatio('width', 'mm'));
DOM.elm('map-height-mm').addEventListener('change', () => enforceAspectRatio('height', 'mm'));
DOM.elm('map-width-px').addEventListener('change', () => enforceAspectRatio('width', 'px'));
DOM.elm('map-height-px').addEventListener('change', () => enforceAspectRatio('height', 'px'));

/**
 * when the inputs change, forget what we know
 */
const tabs = [
	{ layer: Layer.PLANET, name: 'planet' },
	{ layer: Layer.TERRAIN, name: 'terrain' },
	{ layer: Layer.HISTORY, name: 'history' },
	{ layer: Layer.MAP, name: 'map' },
	{ layer: Layer.FACTBOOK, name: 'factbook' },
];
for (const { layer, name } of tabs) {
	Selector.mapToAllChildren(DOM.elm(`${name}-panel`), (element) => {
		const tagName = element.tagName.toLowerCase();
		if (tagName === 'input' || tagName === 'select') {
			element.addEventListener('change', () => {
				lastUpdated = Math.min(lastUpdated, layer - 1);
				if (lastUpdated < Layer.PLANET)
					planetRendered = false;
			});
		}
	});
}


/**
 * Once the page is ready, start the algorithm!
 */
document.addEventListener("DOMContentLoaded", () => {
	console.log("ready!");
	(DOM.elm('map-tab') as HTMLElement).click();
}); // TODO: warn before leaving page
