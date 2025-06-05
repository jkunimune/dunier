/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {DOM} from "./dom.js";
import {format} from "./internationalization.js";
import {Selector} from "../utilities/selector.js";
import {convertXMLToBlob, convertSVGToPNGAndThenDownloadIt, download} from "./export.js";
import "../libraries/plotly.min.js";
import {Layer} from "./mapgenerator.js"; // note that I modified this copy of Plotly to work in vanilla ES6
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


/** which level of the model currently has all input changes applied */
let lastUpdated = Layer.NONE;
/** whether the plotly image is up to date with the model */
let planetRendered = false;
/** whether a process is currently running */
let inProgress: boolean = false; // TODO; I can't remember why this is here; if I click forward in the tabs while it's loading, does everything update?
const worker = new Worker("source/gui/mapgenerator.js", {type: "module"});
/** the number of alerts that have been posted */
let alertCounter: number = 0;

/** the current aspect ratio of the main map */
let aspectRatio = Math.sqrt(2);


function updateEverythingUpTo(target: Layer) {
	disableButtons();

	const planetType = DOM.val('planet-type'); // read input
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
	const rectangularBounds = (DOM.val('map-shape') === 'rectangle');
	const width = Number.parseFloat(DOM.val('map-width-mm'));
	const height = Number.parseFloat(DOM.val('map-height-mm'));
	const focusSpecifier = DOM.val('map-jung');
	const color = DOM.val('map-color');
	const rivers = DOM.checked('map-rivers');
	const borders = DOM.checked('map-borders');
	const graticule = DOM.checked('map-graticule');
	const windrose = DOM.checked('map-windrose');
	const shading = DOM.checked('map-shading');
	const civLabels = DOM.checked('map-political-labels');
	const geoLabels = DOM.checked('map-physical-labels');
	const style = DOM.val('map-spelling');

	worker.postMessage([
		LANGUAGE, lastUpdated, target,
		planetType, tidallyLocked, radius, gravity, spinRate, obliquity,
		terrainSeed, numContinents, seaLevel, temperature,
		historySeed, cataclysms, year,
		projectionName, orientation, rectangularBounds, width, height, focusSpecifier,
		color, rivers, borders, shading, civLabels, geoLabels, graticule, windrose, style,
	]);
}


worker.onmessage = (message) => {
	let planetData: { x: number[][], y: number[][], z: number[][], I: number[][] };
	let terrainMap: string;
	let historyMap: string;
	let map: string;
	let factbook: string;
	let focusOptions: {value: string, label: string}[];
	[
		lastUpdated,
		planetData, terrainMap, historyMap, map, factbook,
		focusOptions,
	] = message.data;

	// TODO: plot
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
		console.log("mute ba chuze bil...");
		const picker = document.getElementById('map-jung');
		picker.textContent = "";
		for (let i = 0; i < focusOptions.length; i ++) {
			const option = document.createElement('option');
			option.selected = (i === 1);
			option.setAttribute('value', focusOptions[i].value);
			option.textContent = focusOptions[i].label;
			picker.appendChild(option);
		}
	}
};


worker.onerror = (error) => {
	console.error(error.message);
	console.error(error);
	postErrorAlert(format(
		LANGUAGE, null,
		"error.uncaught"));
	enableButtons();
};


/**
 * use Plotly to draw the planet in a 3D plot
 * @param planetData the result of calling surface.parameterize(), which will be used to draw the Surface in 3D
 * @param radius the radius of the planet
 */
function renderPlanet(planetData: {x: number[][], y: number[][], z: number[][], I: number[][]}, radius: number): HTMLDivElement {
	console.log("grafa planete...");

	const {x, y, z, I} = planetData;

	// apply a smotherstep normalization to the insolation
	const color = [];
	for (let i = 0; i < I.length; i ++) {
		color.push([]);
		for (let j = 0; j < I[i].length; j ++)
			color[i].push(Math.pow(I[i][j], 3)*(3*I[i][j]*I[i][j] - 15*I[i][j] + 20)/8);
	}

	const plot = new HTMLDivElement();
	Plotly.react(
		plot,
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
	return plot;
}


function disableButtons() {
	inProgress = true;
	for (const tab of ['planet', 'terrain', 'history', 'map']) {
		DOM.elm(`${tab}-apply`).toggleAttribute('disabled', true);
		DOM.elm(`${tab}-ready`).style.display = 'none';
		DOM.elm(`${tab}-loading`).style.display = null;
		DOM.elm(`${tab}-map-container`).style.opacity = '50%';
	}
}


function enableButtons() {
	inProgress = false;
	for (const tab of ['planet', 'terrain', 'history', 'map']) {
		DOM.elm(`${tab}-apply`).toggleAttribute('disabled', false);
		DOM.elm(`${tab}-ready`).style.display = null;
		DOM.elm(`${tab}-loading`).style.display = 'none';
		DOM.elm(`${tab}-map-container`).style.opacity = '100%';
	}

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
		if (!inProgress)
			updateEverythingUpTo(Layer.PLANET);
	});

	/**
	 * When the terrain tab or button is clicked, do its thing
	 */
	DOM.elm(`terrain-${suffix}`).addEventListener('click', () => {
		if (!inProgress)
			updateEverythingUpTo(Layer.TERRAIN);
	});

	/**
	 * When the history tab or button is clicked, activate its purpose.
	 */
	DOM.elm(`history-${suffix}`).addEventListener('click', () => {
		if (!inProgress)
			updateEverythingUpTo(Layer.HISTORY);
	});

	/**
	 * When the map tab or button is clicked, reveal its true form.
	 */
	DOM.elm(`map-${suffix}`).addEventListener('click', () => {
		if (!inProgress)
			updateEverythingUpTo(Layer.MAP);
	});
}

/**
 * When the factbook tab is clicked, generate the factbook.
 */
DOM.elm('factbook-tab').addEventListener('click', () => {
	if (!inProgress)
		updateEverythingUpTo(Layer.FACTBOOK);
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
		format(LANGUAGE, null, "filename.map") + ".svg");
});

/**
 * When the download button is clicked, export and download the map as a PNG
 */
DOM.elm('map-download-png').addEventListener('click', () => {
	convertSVGToPNGAndThenDownloadIt(
		convertXMLToBlob(DOM.elm('map-map-container').firstElementChild as SVGSVGElement, "image/svg"),
		Number.parseInt(DOM.val('map-width-px')),
		Number.parseInt(DOM.val('map-height-px')),
		format(LANGUAGE, null, "filename.map") + ".png");
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
		format(LANGUAGE, null, "filename.factbook") + ".html");
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
