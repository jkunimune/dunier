/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {DOM} from "./dom.js";
import {localize} from "./internationalization.js";
import {Selector} from "../utilities/selector.js";
import {convertXMLToBlob, convertSVGToPNGAndThenDownloadIt, download} from "./export.js";
import "../utilities/external/plotly.min.js"; // note that I modified this copy of Plotly to work in vanilla ES6
import HARFIA_TABLE from "../../resources/alphabet.js";
import KATAKANA_TABLE from "../../resources/rules_ja.js";
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

const LANGUAGE = DOM.elm("bash").textContent;


enum Layer {
	NONE,
	PLANET,
	TERRAIN,
	HISTORY,
	MAP,
	FACTBOOK
}

/** which levels of the model are up to date */
let latestUpdated = Layer.NONE;
/** which levels of the model will be up to date if the current model succeeds */
let latestUpdating = Layer.NONE;
/** whether the plotly image is up to date with the model */
let planetRendered = false;
/** whether a process is currently running */
let inProgress: boolean = false;
/** the number of alerts that have been posted */
let alertCounter: number = 0;

/** the current aspect ratio of the main map */
let aspectRatio = Math.sqrt(2);
/** the width of every character in the map font */
let characterWidthMap: Map<string, number> = null;


// start the work thread
const worker = new Worker("/source/gui/mapgenerator.js", {type: "module"});


function updateEverythingUpTo(target: Layer) {
	if (inProgress) // don't ask the worker to do multiple things at once, or the state will get confused.
		return; // just wait and let the user click the update button agen.

	disableButtons();

	// get all the inputs
	const planetType = DOM.val('planet-type');
	const tidallyLocked = DOM.checked('planet-locked');
	const radius = Number(DOM.val('planet-size')) / (2*Math.PI);
	const gravity = Number(DOM.val('planet-gravity')) * 9.8;
	const spinRate = 1 / Number(DOM.val('planet-day')) * 2*Math.PI/3600;
	const obliquity = Number(DOM.val('planet-tilt')) * Math.PI/180;
	const terrainSeed = Number(DOM.val('terrain-seed'));
	const numContinents = Number(DOM.val('terrain-continents'));
	const seaLevel = Number(DOM.val('terrain-sea-level'));
	const temperature = Number(DOM.val('terrain-temperature'));
	const historySeed = Number(DOM.val('history-seed'));
	const cataclysms = Number(DOM.val('history-meteors'));
	const year = Number(DOM.val('history-year'));
	const projectionName = DOM.val('map-projection');
	const orientation = DOM.val('map-orientation');
	const width = Number.parseFloat(DOM.val('map-width-mm'));
	const height = Number.parseFloat(DOM.val('map-height-mm'));
	const focusSpecifier = DOM.val('map-jung');
	const colorSchemeName = DOM.val('map-color');
	const rivers = DOM.checked('map-rivers');
	const borders = DOM.checked('map-borders');
	const graticule = DOM.checked('map-graticule');
	const windrose = DOM.checked('map-windrose');
	const landTexture = DOM.checked('map-land-texture');
	const seaTexture = DOM.checked('map-sea-texture');
	const shading = DOM.checked('map-shading');
	const civLabels = DOM.checked('map-political-labels');
	const style = DOM.val('map-spelling');

	// preemptively determine how up to date the model will be when this finishes
	latestUpdating = Math.max(latestUpdated, target);

	// send them to the worker thread and start waiting
	worker.postMessage([
		LANGUAGE, latestUpdated, target,
		planetType, tidallyLocked, radius, gravity, spinRate, obliquity,
		terrainSeed, numContinents, seaLevel, temperature,
		historySeed, cataclysms, year,
		projectionName, orientation, width, height, focusSpecifier,
		colorSchemeName, rivers, borders, landTexture, seaTexture, shading, civLabels, graticule, windrose, style,
		characterWidthMap,
	]);
}


worker.onmessage = (message) => {
	let [
		planetData, terrainMap, historyMap, map, factbook,
		focusOptions, selectedFocusOption,
	] = message.data;

	latestUpdated = latestUpdating; // update the state

	if (planetData !== null && !planetRendered && !DOM.elm('planet-panel').hasAttribute("hidden")) {
		// show a 3D model of the planet
		renderPlanet(planetData);
		planetRendered = true;
	}
	if (terrainMap !== null) {
		// show the global physical map
		DOM.elm('terrain-map-container').innerHTML = terrainMap;
	}
	if (historyMap !== null) {
		// show the global political map
		DOM.elm('history-map-container').innerHTML = historyMap;
	}
	if (map !== null) {
		// show the main map
		DOM.elm('map-map-container').innerHTML = map;
		// adjust the height and width options to reflect the new aspect ratio
		aspectRatio = calculateAspectRatio(DOM.elm('map-map-container').firstElementChild as SVGSVGElement);
		enforceAspectRatio("neither", "mm");
		enforceAspectRatio("neither", "px");
	}
	if (factbook !== null) {
		// show the factbook
		DOM.elm('factbook-embed').setAttribute('srcdoc', factbook);
	}

	enableButtons();

	// now set up the "focus" options for the map tab:
	if (focusOptions !== null) {
		const picker = DOM.elm('map-jung') as HTMLSelectElement;
		// clear it
		picker.textContent = "";
		for (let i = 0; i < focusOptions.length; i ++) {
			const option = document.createElement('option');
			option.selected = (focusOptions[i].value === selectedFocusOption);
			option.setAttribute('value', focusOptions[i].value);
			option.textContent = focusOptions[i].label;
			picker.appendChild(option);
		}
		// if the selection could not be kept, default it to continent 1
		if (picker.selectedIndex === -1 && picker.childNodes.length > 1)
			(picker.childNodes.item(1) as HTMLOptionElement).selected = true;
	}
};


worker.onerror = (error) => {
	console.error(error);
	if (error.message === undefined)
		console.error("the worker threw an error that doesn't have a message!  is it a syntax issue, or maybe an import error?");
	else {
		const message = error.message.includes(":") ? error.message.split(":")[1].trim() : error.message;
		if (message.startsWith("Too fast"))
			postErrorAlert(localize("error.planet_too_fast", LANGUAGE));
		else if (message.startsWith("Too slow"))
			postErrorAlert(localize("error.planet_too_slow", LANGUAGE));
		else
			postErrorAlert(localize("error.uncaught", LANGUAGE));
	}
	enableButtons();
};


/**
 * use Plotly to draw the planet in a 3D plot
 * @param planetData the result of calling surface.parameterize(), which will be used to draw the Surface in 3D
 */
function renderPlanet(planetData: {x: number[][], y: number[][], z: number[][], I: number[][]}): void {
	console.log("grafa planete...");

	const {x, y, z, I} = planetData;

	let maxRadius = 0;
	for (let i = 0; i < x.length; i ++)
		for (let j = 0; j < x[i].length; j ++)
			maxRadius = Math.max(
				maxRadius,
				Math.sqrt(x[i][j]**2 + y[i][j]**2 + z[i][j]**2));

	// apply a smotherstep normalization to the insolation
	const color = [];
	for (let i = 0; i < I.length; i ++) {
		color.push([]);
		for (let j = 0; j < I[i].length; j ++)
			color[i].push(Math.pow(I[i][j], 3)*(3*I[i][j]*I[i][j] - 15*I[i][j] + 20)/8);
	}

	Plotly.react(
		DOM.elm("planet-map-container"),
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
					range: [-maxRadius, maxRadius],
				},
				yaxis: {
					showspikes: false,
					range: [-maxRadius, maxRadius],
				},
				zaxis: {
					showspikes: false,
					range: [-maxRadius, maxRadius],
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
}


function disableButtons() {
	inProgress = true;
	for (const tab of ['planet', 'terrain', 'history', 'map']) {
		DOM.elm(`${tab}-apply`).toggleAttribute('disabled', true);
		DOM.elm(`${tab}-ready`).style.display = 'none';
		DOM.elm(`${tab}-loading`).style.display = null;
		DOM.elm(`${tab}-map-container`).style.opacity = '50%';
	}
	DOM.elm(`back`).toggleAttribute('disabled', true);
	DOM.elm(`reroll`).toggleAttribute('disabled', true);
	DOM.elm(`reroll-ready`).style.display = 'none';
	DOM.elm(`reroll-loading`).style.display = null;
}


function enableButtons() {
	inProgress = false;
	for (const tab of ['planet', 'terrain', 'history', 'map']) {
		DOM.elm(`${tab}-apply`).toggleAttribute('disabled', false);
		DOM.elm(`${tab}-ready`).style.display = null;
		DOM.elm(`${tab}-loading`).style.display = 'none';
		DOM.elm(`${tab}-map-container`).style.opacity = '100%';
	}
	DOM.elm(`back`).toggleAttribute('disabled', false);
	DOM.elm(`reroll`).toggleAttribute('disabled', false);
	DOM.elm(`reroll-ready`).style.display = null;
	DOM.elm(`reroll-loading`).style.display = 'none';
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
		const maxDayLength = Math.floor(2*Math.PI/Math.sqrt(0.17*gravity/(radius*1000))/3600*10)/10;
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
 * infer the aspect ratio of an SVG element from its viewBox
 */
function calculateAspectRatio(svg: SVGSVGElement): number {
	const [, , widthString, heightString] = svg.getAttribute("viewBox").split(" ");
	return Number(widthString)/Number(heightString);
}



/**
 * when the map aspect ratio changes or one of the map size input spinners change,
 * make sure they're all consistent.
 */
function enforceAspectRatio(fixed: string, unit: string) {
	const widthSpinner = DOM.elm(`map-width-${unit}`) as HTMLInputElement;
	const heightSpinner = DOM.elm(`map-height-${unit}`) as HTMLInputElement;
	if (fixed === "width") {
		const width = Number.parseFloat(widthSpinner.value);
		heightSpinner.value = Math.round(width/aspectRatio).toString();
	}
	else if (fixed === "height") {
		const height = Number.parseFloat(heightSpinner.value);
		widthSpinner.value = Math.round(height*aspectRatio).toString();
	}
	else {
		const length = Math.max(
			Number.parseFloat(widthSpinner.value),
			Number.parseFloat(heightSpinner.value));
		if (aspectRatio > 1) {
			widthSpinner.value = length.toString();
			heightSpinner.value = Math.round(length/aspectRatio).toString();
		}
		else {
			heightSpinner.value = length.toString();
			widthSpinner.value = Math.round(length*aspectRatio).toString();
		}
	}
}


/**
 * build a map containing the width of every possible character
 */
function measureAllCharacters(): Map<string, number> {
	const allCharacters = new Set<string>();
	for (let style = 0; style < HARFIA_TABLE.styles.length; style ++) {
		for (const sound of HARFIA_TABLE.sounds) {
			for (const character of sound.symbols[style]) {
				allCharacters.add(character);
				if (HARFIA_TABLE.flags[0].values[style])
					allCharacters.add(character.toUpperCase());
			}
		}
		for (const suprasegmental of HARFIA_TABLE.suprasegmentals) {
			allCharacters.add(suprasegmental.symbols[style]);
		}
		for (const modifier of HARFIA_TABLE.modifiers) {
			for (const character of modifier.symbols[style]) {
				allCharacters.add(character);
				if (HARFIA_TABLE.flags[0].values[style])
					allCharacters.add(character.toUpperCase());
			}
		}
	}
	for (const row of KATAKANA_TABLE.columns)
		for (const syllable of row.kana)
			for (const character of syllable)
				allCharacters.add(character);
	for (const specialCharacter of "áéíóúüяеёию") {
		allCharacters.add(specialCharacter);
		allCharacters.add(specialCharacter.toUpperCase());
	}

	const testText = DOM.elm('test-text');
	testText.innerHTML = 'n';
	const en = testText.getBoundingClientRect().width;
	const widthMap = new Map<string, number>();
	for (const character of allCharacters) {
		testText.innerHTML = 'n' + character + 'n';
		const testTextLength = testText.getBoundingClientRect().width;
		widthMap.set(character, (testTextLength - 2*en)/20);
	}
	testText.innerHTML = '';
	return widthMap;
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
	 */
	DOM.elm(`planet-${suffix}`).addEventListener('click', () => {
		updateEverythingUpTo(Layer.PLANET);
	});

	/**
	 * When the terrain tab or button is clicked, do its thing
	 */
	DOM.elm(`terrain-${suffix}`).addEventListener('click', () => {
		updateEverythingUpTo(Layer.TERRAIN);
	});

	/**
	 * When the history tab or button is clicked, activate its purpose.
	 */
	DOM.elm(`history-${suffix}`).addEventListener('click', () => {
		updateEverythingUpTo(Layer.HISTORY);
	});

	/**
	 * When the map tab or button is clicked, reveal its true form.
	 */
	DOM.elm(`map-${suffix}`).addEventListener('click', () => {
		updateEverythingUpTo(Layer.MAP);
	});
}

/**
 * When the factbook tab is clicked, generate the factbook.
 */
DOM.elm('factbook-tab').addEventListener('click', () => {
	updateEverythingUpTo(Layer.FACTBOOK);
});

DOM.elm('reroll').addEventListener('click', () => {
	DOM.set('terrain-seed', String(Number(DOM.val('terrain-seed')) + 1));
	DOM.set('history-seed', String(Number(DOM.val('history-seed')) + 1));
	DOM.elm('terrain-seed').dispatchEvent(new Event('change')); // make sure to trigger the event listener so it knows to actually update everything
	updateEverythingUpTo(Layer.MAP);
});

DOM.elm('back').addEventListener('click', () => {
	DOM.set('terrain-seed', String(Number(DOM.val('terrain-seed')) - 1));
	DOM.set('history-seed', String(Number(DOM.val('history-seed')) - 1));
	DOM.elm('terrain-seed').dispatchEvent(new Event('change')); // make sure to trigger the event listener so it knows to actually update everything
	updateEverythingUpTo(Layer.MAP);
});

/**
 * When the download button is clicked, export and download the map as an SVG
 */
DOM.elm('map-download-svg').addEventListener('click', () => {
	const printscaleMap = DOM.elm('map-map-container').firstElementChild.cloneNode(true) as SVGSVGElement;
	const [, , width, height] = printscaleMap.getAttribute("viewBox").split(" ");
	printscaleMap.setAttribute("width", `${width}mm`);
	printscaleMap.setAttribute("height", `${height}mm`);
	download(
		convertXMLToBlob(printscaleMap, "image/svg"),
		localize("filename.map", LANGUAGE) + ".svg");
});

/**
 * When the download button is clicked, export and download the map as a PNG
 */
DOM.elm('map-download-png').addEventListener('click', () => {
	convertSVGToPNGAndThenDownloadIt(
		convertXMLToBlob(DOM.elm('map-map-container').firstElementChild as SVGSVGElement, "image/svg"),
		Number.parseInt(DOM.val('map-width-px')),
		Number.parseInt(DOM.val('map-height-px')),
		localize("filename.map", LANGUAGE) + ".png");
});

/**
 * When the download button is clicked, export and download the factbook as a HTML
 */
DOM.elm('factbook-download-html').addEventListener('click', () => {
	const factbookFrame = DOM.elm('factbook-embed') as HTMLIFrameElement;
	let factbook: HTMLHtmlElement;
	if (factbookFrame.contentDocument)
		factbook = factbookFrame.contentDocument.documentElement as HTMLHtmlElement;
	else
		factbook = factbookFrame.contentWindow.document.documentElement as HTMLHtmlElement;
	download(
		convertXMLToBlob(factbook, "text/html"),
		localize("filename.factbook", LANGUAGE) + ".html");
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
				latestUpdated = Math.min(latestUpdated, layer - 1);
				latestUpdating = Math.min(latestUpdating, layer - 1);
				if (layer <= Layer.PLANET)
					planetRendered = false;
			});
		}
	});
}


function dateToInt(datetime: Date): number {
	return ((((datetime.getFullYear()%100*100 + datetime.getMonth() + 1)*100 +
		datetime.getDate())*100 + datetime.getHours())*100 +
		datetime.getMinutes())*100 + datetime.getSeconds();
}


/**
 * Once the page is ready, start the algorithm!
 */
document.addEventListener("DOMContentLoaded", () => {
	const seed = dateToInt(new Date());
	DOM.set('terrain-seed', `${seed}`);
	DOM.set('history-seed', `${seed}`);
	console.log("measuring the map font...");
	characterWidthMap = measureAllCharacters();
	(DOM.elm('map-tab') as HTMLElement).click();
}); // TODO: warn before leaving page
