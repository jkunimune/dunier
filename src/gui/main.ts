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
import "../lib/jquery.min.js"; //TODO: I should not be using jquery
import "../lib/jspdf.umd.min.js";
import "../lib/plotly.min.js";
import {generateTerrain} from "../society/terrain.js";
import {Surface} from "../planet/surface.js";
import {World} from "../society/world.js";
import {Random} from "../util/random.js";
import {Chart} from "../map/chart.js";
import {Azimuthal} from "../map/azimuthal.js";
import {Equirectangular} from "../map/equirectangular.js";
import {Mercator} from "../map/mercator.js";
import {EqualArea} from "../map/equalarea.js";
import {Style, transcribe} from "../language/script.js";
import {Spheroid} from "../planet/spheroid.js";
import {Sphere} from "../planet/sphere.js";
import {Disc} from "../planet/disc.js";
import {Toroid} from "../planet/toroid.js";
import {LockedDisc} from "../planet/lockeddisc.js";
import {generateFactSheet} from "../society/factsheet.js"; // note that I modified this copy of Plotly to work in vanilla ES6
// @ts-ignore
const $ = window.$; // why is this like this? I don't know.
// @ts-ignore
const jsPDF = window.jspdf;
// @ts-ignore
const Plotly = window.Plotly;


const TERRAIN_COLORMAP = [
	[0.00, 'rgb(251,254,248)'],
	[0.08, 'rgb(216,231,245)'],
	[0.17, 'rgb(164, 215, 237)'],
	[0.25, 'rgb(104, 203, 206)'],
	[0.33, 'rgb( 68, 185, 156)'],
	[0.42, 'rgb(54,167,105)'],
	[0.50, 'rgb( 64, 145,  47)'],
	[0.58, 'rgb( 92, 116,  11)'],
	[0.67, 'rgb(100,89,5)'],
	[0.75, 'rgb( 99,  62,   1)'],
	[0.83, 'rgb( 91,  33,   1)'],
	[0.92, 'rgb(75,2,6)'],
	[1.00, 'rgb( 41,   4,   5)'],
];


let planetOutOfSync = true;
let terrainOutOfSync = true;
let historyOutOfSync = true;
let mapOutOfSync = true;
let pdfOutOfSync = true;
let surface: Surface = null;
let world: World = null;
let inProgress: boolean = false;


/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 */
function planetApply() {
	console.log("jena planete...");
	const planetType = $('#planet-type').val(); // read input
	const tidallyLocked = $('#planet-locked').prop('checked');
	const radius = Number($('#planet-size').val()) / (2*Math.PI);
	const gravity = Number($('#planet-gravity').val()) * 9.8;
	const spinRate = 1 / Number($('#planet-day').val()) * 2*Math.PI / 3600;
	const obliquity = Number($('#planet-tilt').val()) * Math.PI / 180;

	try { // create a surface
		if (planetType === '0') { // spheroid
			if (tidallyLocked) { // spherical
				surface = new Sphere(
					radius);
			} else { // oblate
				surface = new Spheroid(
					radius,
					gravity,
					spinRate,
					obliquity);
			}
		} else if (planetType === '1') { // toroid
			surface = new Toroid(
				radius,
				gravity,
				spinRate,
				obliquity);
		} else if (planetType === '2') { // plane
			if (tidallyLocked) { // with static sun
				surface = new LockedDisc(
					radius);
			} else { // with orbiting sun
				surface = new Disc(
					radius,
					obliquity);
			}
		}
	} catch (err) {
		if (err instanceof RangeError) {
			let message: string;
			if (err.message.startsWith("Too fast"))
				message = "The planet tore itself apart. Please choose a longer day length."; // TODO: translate this.  and/or automatically correct it.
			else if (err.message.startsWith("Too slow"))
				message = "The planet broke into pieces. Please choose a shorter day length."; // TODO: translate this.  and/or automatically correct it.
			$('#alert-box').append(
				"<div class='alert alert-danger alert-dismissible fade show' role='alert'>\n" +
				`  ${message}\n` +
				"  <button type='button' class='close' data-dismiss='alert' aria-label='Close'>\n" +
				"    <span aria-hidden='true'>&times;</span>\n" +
				"  </button>\n" +
				"</div>");
			return;
		} else
			throw err;
	}
	surface.initialize();

	const plotDiv = $('#planet-map');
	if (plotDiv.is(':visible')) {
		console.log("grafa...");
		const {x, y, z, I} = surface.parameterize(18);
		Plotly.react(
			plotDiv[0],
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
	}

	console.log("fina!");
	planetOutOfSync = false;
}


/**
 * Generate the heightmap and biomes on the planet's surface.
 */
function terrainApply() {
	if (planetOutOfSync)
		planetApply();

	console.log("jena zemforme...");
	const randomSeme = Number($('#terrain-sem').val());
	const numContinents = Number($('#terrain-continents').val()) * 2;
	const seaLevel = Number($('#terrain-hay').val());
	const avgTerme = Number($('#terrain-terme').val());

	let rng = new Random(randomSeme); // use the random seed
	surface.populate(rng); // finish constructing the surface
	rng = rng.reset();
	generateTerrain(
		numContinents,
		seaLevel,
		avgTerme,
		surface, rng); // create the terrain!

	console.log("grafa...");
	const mapper = new Chart(new Azimuthal(surface));
	mapper.depict(surface, null, $('#terrain-map')[0], 'jivi', 'nili');

	console.log("fina!");
	terrainOutOfSync = false;
}


/**
 * Generate the countries on the planet's surface.
 */
function historyApply() {
	if (terrainOutOfSync)
		terrainApply();

	console.log("jena histore...");
	const randomSeme = Number($('#history-sem').val());
	const year = Number($('#history-nen').val());
	const katastrofe = Number($('#history-katastrof').val());

	world = new World(katastrofe, surface);

	let rng = new Random(randomSeme); // use the random seed
	world.generateHistory(
		year,
		rng); // create the terrain!

	console.log("grafa...");
	const mapper = new Chart(new Azimuthal(surface));
	mapper.depict(surface, world, $('#history-map')[0], 'politiki', 'nili');

	console.log("fina!");
	historyOutOfSync = false;
}


/**
 * Generate a final formatted map.
 */
function mapApply() {
	if (historyOutOfSync)
		historyApply();

	console.log("grafa zemgrafe...");
	const projection = $('#map-projection').val();
	const zemrang = $('#map-zemrang').val();
	const marorang = $('#map-hayrang').val();
	const filter = $('#map-filter').val();
	const nade = $('#map-nade').prop('checked');
	const kenare = $('#map-kenar').prop('checked');
	const shade = $('#map-say').prop('checked');
	const dexnam = $('#map-deshnam').prop('checked');
	const xanonam = $('#map-shannam').prop('checked');
	const baxe = $('#map-bash').val();

	let mapper;
	if (projection === 'equirectangular')
		mapper = new Chart(new Equirectangular(surface));
	else if (projection === 'azimuthal-equidistant')
		mapper = new Chart(new Azimuthal(surface));
	else if (projection == 'mercator')
		mapper = new Chart(new Mercator(surface));
	else if (projection == 'eckert')
		mapper = new Chart(new EqualArea(surface));
	else
		throw new Error(`no jana metode da graflance: '${projection}'.`);

	let convention;
	if (baxe === 'en')
		convention = Style.ENGLI;
	else if (baxe === 'es')
		convention = Style.ESPANI;
	else if (baxe === 'jp')
		convention = Style.NIPONI;
	else if (baxe === 'pd')
		convention = Style.PANDUNI;

	mapper.depict(surface, world, $('#map-map')[0], zemrang, marorang, filter, nade, kenare, shade, dexnam, xanonam, convention);

	console.log("fina!");
	mapOutOfSync = false;
}


/**
 * Generate a final formatted map.
 */
function pdfApply() {
	if (mapOutOfSync)
		mapApply();

	console.log("jena pdf..."); // TODO: refactor map so that I can get this in a form that I can rite directly to the PDF.  I should probably also allow export as png somehow?
	const doc = new jsPDF.jsPDF(); // instantiate the PDF document
	// doc.addSvgAsImage = jsPDF.svg.addSvgAsImage; // and include the svg module
	// doc.addImage(mapUrl, "SVG", 5, 5, 287, 200);
	doc.text("I have to add something to this page or delete it.", 20, 20, {baseline: 'top'});

	for (const civ of world.civs) {
		generateFactSheet(doc, civ);
	}

	const pdf = doc.output('blob');
	const pdfUrl = URL.createObjectURL(pdf);
	$('#pdf-embed').attr('src', pdfUrl);

	console.log("fina!");
	pdfOutOfSync = false;
}


/**
 * disable all the buttons, turn on the loading icon, call the funccion, wait, then set
 * everything back to how it was before.
 * @param func
 */
function disableButtonsAndDo(func: () => void) {
	inProgress = true;
	for (const tab of ['planet', 'terrain', 'history', 'map']) {
		const btn = $(`#${tab}-apply`);
		const rediLoge = $(`#${tab}-redi`);
		const ladaLoge = $(`#${tab}-lada`);
		btn.prop('disabled', true);
		rediLoge.hide();
		ladaLoge.show();
	}

	setTimeout(() => {
		try {
			func();
		} catch (error) {
			console.error(error);
		}

		inProgress = false;
		for (const tab of ['planet', 'terrain', 'history', 'map']) {
			const btn = $(`#${tab}-apply`);
			const rediLoge = $(`#${tab}-redi`);
			const ladaLoge = $(`#${tab}-lada`);
			btn.prop('disabled', false);
			ladaLoge.hide();
			rediLoge.show();
		}
	}, 10);
}


/**
 * When the planet button is clicked, call its function.
 * Note that this does not check if the planet is out of sync; it
 * must update every time the tab is opened because of Plotly.
 */
$('#planet-apply, #planet-tab').on('click', () => {
	if (!inProgress)
		disableButtonsAndDo(planetApply);
});

/**
 * When the terrain button is clicked, do its thing
 */
$('#terrain-apply, #terrain-tab').on('click', () => {
	if (terrainOutOfSync && !inProgress)
		disableButtonsAndDo(terrainApply);
});

/**
 * When the history button is clicked, activate its purpose.
 */
$('#history-apply, #history-tab').on('click', () => {
	if (historyOutOfSync && !inProgress)
		disableButtonsAndDo(historyApply);
});

/**
 * When the map button is clicked, reveal its true form.
 */
$('#map-apply, #map-tab').on('click', () => {
	if (mapOutOfSync && !inProgress)
		disableButtonsAndDo(mapApply);
});

/**
 * When the pdf button is clicked, generate the PDF.
 */
$('#pdf-tab').on('click', () => {
	if (pdfOutOfSync && !inProgress)
		disableButtonsAndDo(pdfApply);
});


$('#planet-panel :input').on('change', () => {
	planetOutOfSync = true;
	terrainOutOfSync = true;
	historyOutOfSync = true;
	mapOutOfSync = true;
	pdfOutOfSync = true;
});

$('#terrain-panel :input').on('change', () => {
	terrainOutOfSync = true;
	historyOutOfSync = true;
	mapOutOfSync = true;
	pdfOutOfSync = true;
});

$('#history-panel :input').on('change', () => {
	historyOutOfSync = true;
	mapOutOfSync = true;
	pdfOutOfSync = true;
});

$('#map-panel :input').on('change', () => {
	mapOutOfSync = true;
	pdfOutOfSync = true;
});


/**
 * Once the page is ready, start the algorithm!
 */
$(document).ready(() => {
	console.log("ready!");
	$('#pdf-tab').click();
}); // TODO: warn before leaving page
