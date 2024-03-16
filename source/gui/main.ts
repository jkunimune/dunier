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
import "../libraries/plotly.min.js"; // note that I modified this copy of Plotly to work in vanilla ES6
import {DOM} from "./dom.js";
import {format} from "./internationalization.js";
import {generateTerrain} from "../generation/terrain.js";
import {Surface} from "../surface/surface.js";
import {World} from "../generation/world.js";
import {Random} from "../utilities/random.js";
import {Chart} from "../map/chart.js";
import {Azimuthal} from "../map/azimuthal.js";
import {Bonne} from "../map/bonne.js";
import {Equirectangular} from "../map/equirectangular.js";
import {Mercator} from "../map/mercator.js";
import {EqualArea} from "../map/equalarea.js";
import {Spheroid} from "../surface/spheroid.js";
import {Sphere} from "../surface/sphere.js";
import {Disc} from "../surface/disc.js";
import {Toroid} from "../surface/toroid.js";
import {LockedDisc} from "../surface/lockeddisc.js";
import {generateFactSheet} from "../generation/factsheet.js";
import {Conic} from "../map/conic.js";
import {Selector} from "../utilities/selector.js";
import {PortableDocument} from "../utilities/portabledocument.js";
import {MapProjection} from "../map/projection.js";
import {Civ} from "../generation/civ.js";
// @ts-ignore
const Plotly = window.Plotly;


const TERRAIN_COLORMAP = [
	[0.00, 'rgb(251, 254, 248)'],
	[0.08, 'rgb(216, 231, 245)'],
	[0.17, 'rgb(164, 215, 237)'],
	[0.25, 'rgb(104, 203, 206)'],
	[0.33, 'rgb( 68, 185, 156)'],
	[0.42, 'rgb( 54, 167, 105)'],
	[0.50, 'rgb( 64, 145,  47)'],
	[0.58, 'rgb( 92, 116,  11)'],
	[0.67, 'rgb(100,  89,   5)'],
	[0.75, 'rgb( 99,  62,   1)'],
	[0.83, 'rgb( 91,  33,   1)'],
	[0.92, 'rgb( 75,   2,   6)'],
	[1.00, 'rgb( 41,   4,   5)'],
];

const MIN_SIZE_TO_LIST = 6;
const MIN_COUNTRIES_TO_LIST = 3;
const MAX_COUNTRIES_TO_LIST = 20;

enum Layer {
	NONE,
	PLANET,
	TERRAIN,
	HISTORY,
	MAP,
	PDF
}

/** which level of the model currently has all input changes applied */
let lastUpdated = Layer.NONE;
/** whether the plotly image is up to date with the model */
let planetRendered = false;
/** whether a process is currently running */
let inProgress: boolean = false; // TODO; I can't remember why this is here; if I click forward in the tabs while it's loading, does everything update?
/** the planet on which the map is defined */
let surface: Surface = null;
/** the human world on that planet */
let world: World = null;
/** the list of countries on the current map */
let mappedCivs: Civ[] = null;


/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 */
function applyPlanet() {
	console.log("jena planete...");
	const planetType = DOM.val('planet-type'); // read input
	const tidallyLocked = DOM.checked('planet-locked');
	const radius = Number(DOM.val('planet-size')) / (2*Math.PI);
	const gravity = Number(DOM.val('planet-gravity')) * 9.8;
	const spinRate = 1 / Number(DOM.val('planet-day')) * 2*Math.PI/3600;
	const obliquity = Number(DOM.val('planet-tilt')) * Math.PI/180;

	try { // create a surface
		if (planetType === 'spheroid') { // spheroid
			if (tidallyLocked) { // spherical
				surface = new Sphere(
					radius);
			}
			else { // oblate
				surface = new Spheroid(
					radius,
					gravity,
					spinRate,
					obliquity);
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
			if (tidallyLocked) { // with static sun
				surface = new LockedDisc(
					radius);
			}
			else { // with orbiting sun
				surface = new Disc(
					radius,
					obliquity);
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
				message = format("error.planet_too_fast"); // TODO: it should automaticly bound the day-length at stable values
			else if (err.message.startsWith("Too slow"))
				message = format("error.planet_too_slow");
			DOM.elm('alert-box').innerHTML +=
				"<div class='alert alert-danger alert-dismissible fade show' role='alert'>\n" +
				`  ${message}\n` +
				"  <button type='button' class='close' data-dismiss='alert' aria-label='Close'>\n" +
				"    <span aria-hidden='true'>&times;</span>\n" +
				"  </button>\n" +
				"</div>";
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
	Plotly.react(
		DOM.elm('planet-map'),
		[{
			type: 'surface',
			x: x,
			y: y,
			z: z,
			surfacecolor: I,
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
		Number(DOM.val('terrain-continents')) * 2,
		Number(DOM.val('terrain-sea-level')),
		Number(DOM.val('terrain-temperature')),
		surface, rng); // create the terrain!

	console.log("grafa...");
	const mapper = new Chart(new EqualArea(surface, true, null));
	mapper.depict(surface,
	              null,
	              DOM.elm('terrain-map') as SVGGElement,
	              'physical',
	              'blue');

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
	const mapper = new Chart(new EqualArea(surface, true, null));
	mapper.depict(surface,
	              world,
	              DOM.elm('history-map') as SVGGElement,
	              'political',
	              'blue');

	console.log("mute ba chuze bil...");
	const countries = world.getCivs(true, MIN_SIZE_TO_LIST, MIN_COUNTRIES_TO_LIST) // list the biggest countries for the centering selection
		.slice(0, MAX_COUNTRIES_TO_LIST); // TODO: if there are no countries, use fisickall rejons instead
	const picker = document.getElementById('map-jung');
	picker.textContent = "";
	for (let i = 0; i < countries.length; i ++) {
		const country = countries[i];
		const option = document.createElement('option');
		option.selected = (i === 0);
		option.setAttribute('value', country.id.toString());
		option.textContent = country.getName().toString();
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
	const projectionName = DOM.val('map-projection');
	const northUp = (DOM.val('map-orientation') === 'north');
	const locus = Chart.border(world.getCiv(Number.parseInt(DOM.val('map-jung'))));

	let projection: MapProjection;
	if (projectionName === 'basic')
		projection = new Equirectangular(surface, northUp, locus);
	else if (projectionName === 'polar')
		projection = new Azimuthal(surface, northUp, locus);
	else if (projectionName === 'navigational')
		projection = new Mercator(surface, northUp, locus);
	else if (projectionName === 'equal_area')
		projection = new EqualArea(surface, northUp, locus);
	else if (projectionName === 'classical')
		projection = new Bonne(surface, northUp, locus);
	else if (projectionName === 'modern')
		projection = new Conic(surface, northUp, locus);
	else
		throw new Error(`no jana metode da graflance: '${projectionName}'.`);

	const chart = new Chart(projection);
	mappedCivs = chart.depict(
		surface,
		world,
		DOM.elm('map-map') as SVGGElement,
		DOM.val('map-land-color'),
		DOM.val('map-sea-color'),
		DOM.val('map-filter'),
		DOM.checked('map-rivers'),
		DOM.checked('map-borders'),
		DOM.checked('map-shading'),
		DOM.checked('map-political-labels'),
		DOM.checked('map-physical-labels'),
		6,
		(DOM.val('map-spelling') === 'null') ?
			null :
			DOM.val('map-spelling')
	);

	console.log("fina!");
	lastUpdated = Layer.MAP;
}


/**
 * Generate a final formatted map.
 */
function applyPdf(): void {
	if (lastUpdated < Layer.MAP)
		applyMap();

	console.log("jena pdf..."); // TODO: refactor map so that I can get this in a form that I can rite directly to the PDF.  I should probably also allow export as png somehow?
	const doc = new PortableDocument(format('parameter.factbook'));
	for (const civ of mappedCivs) // TODO: only civs on the map
		generateFactSheet(doc, civ);
	DOM.elm('pdf-embed').setAttribute('src', doc.getUrl());

	console.log("fina!");
	lastUpdated = Layer.PDF;
}


/**
 * disable all the buttons, turn on the loading icon, call the funccion, wait, then set
 * everything back to how it was before.
 * @param func
 */
function disableButtonsAndDo(func: () => void): void {
	inProgress = true;
	for (const tab of ['planet', 'terrain', 'history', 'map']) {
		DOM.elm(`${tab}-apply`).setAttribute('disabled', '');
		DOM.elm(`${tab}-ready`).style.display = 'none';
		DOM.elm(`${tab}-loading`).style.display = null;
	}

	setTimeout(() => {
		try {
			func();
		} catch (error) {
			console.error(error);
		}

		inProgress = false;
		for (const tab of ['planet', 'terrain', 'history', 'map']) {
			DOM.elm(`${tab}-apply`).removeAttribute('disabled');
			DOM.elm(`${tab}-ready`).style.display = null;
			DOM.elm(`${tab}-loading`).style.display = 'none';
		}
	}, 10);
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
	 * When the terrain button is clicked, do its thing
	 */
	DOM.elm(`terrain-${suffix}`).addEventListener('click', () => {
		if (lastUpdated < Layer.TERRAIN && !inProgress)
			disableButtonsAndDo(applyTerrain);
	});

	/**
	 * When the history button is clicked, activate its purpose.
	 */
	DOM.elm(`history-${suffix}`).addEventListener('click', () => {
		if (lastUpdated < Layer.HISTORY && !inProgress)
			disableButtonsAndDo(applyHistory);
	});

	/**
	 * When the map button is clicked, reveal its true form.
	 */
	DOM.elm(`map-${suffix}`).addEventListener('click', () => {
		if (lastUpdated < Layer.MAP && !inProgress)
			disableButtonsAndDo(applyMap);
	});
}

/**
 * When the pdf button is clicked, generate the PDF.
 */
DOM.elm('pdf-tab').addEventListener('click', () => {
	if (lastUpdated < Layer.PDF && !inProgress)
		disableButtonsAndDo(applyPdf);
});


/**
 * when the inputs change, forget what we know
 */
const tabs = [
	{ layer: Layer.PLANET, name: 'planet' },
	{ layer: Layer.TERRAIN, name: 'terrain' },
	{ layer: Layer.HISTORY, name: 'history' },
	{ layer: Layer.MAP, name: 'map' },
	{ layer: Layer.PDF, name: 'pdf' },
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
