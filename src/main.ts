// index.ts: interfaces with forms and plots

import "./lib/jquery.min.js";
import {generateTerrain} from "./terrain.js";
import {Sphere, Spheroid, Surface} from "./surface.js";
import {World} from "./world.js";
import {Convention, DeuteroLang, Language, ProtoLang, transcribe, WordType} from "./language.js";
import {Azimuthal, Chart, EqualArea, Equirectangular, Mercator} from "./map.js";
import {Random} from "./random.js";
// @ts-ignore
const $ = window.$; // why is this like this? I don't know.
// import "./lib/plotly.js";
// // @ts-ignore
// const Plotly = window.Plotly;


const TERRAIN_COLORMAP = [
	[0.0, 'rgb(251, 252, 253)'],
	[0.1, 'rgb(215, 233, 249)'],
	[0.2, 'rgb(165, 217, 245)'],
	[0.3, 'rgb(117, 204, 214)'],
	[0.4, 'rgb( 80, 189, 174)'],
	[0.5, 'rgb( 41, 174, 131)'],
	[0.6, 'rgb( 13, 156,  82)'],
	[0.7, 'rgb( 53, 134,  28)'],
	[0.8, 'rgb( 81, 109,   0)'],
	[0.9, 'rgb( 87,  85,   3)'],
	[1.0, 'rgb( 85,  61,   3)'],
];


let planetOutOfSync = true;
let terrainOutOfSync = true;
let historyOutOfSync = true;
let mapOutOfSync = true;
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
	const radius = Number($('#planet-size').val()) / (2 * Math.PI);
	const gravity = Number($('#planet-gravity').val()) * 9.8;
	const spinRate = 1 / Number($('#planet-day').val()) * 2 * Math.PI / 3600;
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
			// surface = new Toroid(
			// 	radius,
			// 	gravity,
			// 	spinRate,
			// 	obliquity);
		} else if (planetType === '2') { // plane
			if (tidallyLocked) { // with static sun
				// surface = new StaticPlane(
				// 	radius);
			} else { // with orbiting sun
				// surface = new Plane(
				// 	radius,
				// 	obliquity);
			}
		}
	} catch (err) {
		if (err instanceof RangeError) {
			$('#alert-box').append(
				"<div class='alert alert-danger alert-dismissible fade show' role='alert'>\n" +
				"  The planet tore itself apart. Please try different parameters.\n" +
				"  <button type='button' class='close' data-dismiss='alert' aria-label='Close'>\n" +
				"    <span aria-hidden='true'>&times;</span>\n" +
				"  </button>\n" +
				"</div>");
			return;
		} else
			throw err;
	}

	const plotDiv = $('#planet-map');
	if (plotDiv.is(':visible')) {
		console.log("grafa...");
		const {x, y, z, I} = surface.parameterize(18);
		// Plotly.react(
		// 	plotDiv[0],
		// 	[{ // TODO: only do this when the plot is out of date
		// 		type: 'surface',
		// 		x: x,
		// 		y: y,
		// 		z: z,
		// 		surfacecolor: I,
		// 		cmin: 0,
		// 		cmax: 1.5,
		// 		colorscale: TERRAIN_COLORMAP,
		// 		showscale: false,
		// 		lightposition: {x: 1000, y: 0, z: 0},
		// 		hoverinfo: "none",
		// 		contours: {x: {highlight: false}, y: {highlight: false}, z: {highlight: false}},
		// 	}],
		// 	{
		// 		margin: {l: 20, r: 20, t: 20, b: 20},
		// 		scene: {
		// 			xaxis: {showspikes: false},
		// 			yaxis: {showspikes: false},
		// 			zaxis: {showspikes: false}
		// 		},
		// 	},
		// 	{
		// 		responsive: true,
		// 	}
		// ).then(() => {
		// });
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
	const imperistia = Number($('#history-imperistia').val()) / 1e3; // km/year
	const injenivia = Number($('#history-injenivia').val()) / 1e9; // 1/y
	const katastrofe = Number($('#history-katastrof').val());

	world = new World(imperistia, injenivia, katastrofe, surface);

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
		convention = Convention.ENGLI;
	else if (baxe === 'es')
		convention = Convention.ESPANI;
	else if (baxe === 'jp')
		convention = Convention.NIPONI;
	else if (baxe === 'pd')
		convention = Convention.PANDUNI;

	mapper.depict(surface, world, $('#map-map')[0], zemrang, marorang, filter, nade, kenare, shade, dexnam, xanonam, convention);

	console.log("fina!");
	mapOutOfSync = false;
}


/**
 * set the GUI to prevent user input while a process is running
 */
function disableButtons() {
	for (const tab of ['planet', 'terrain', 'history', 'map']) {
		const btn = $(`#${tab}-apply`);
		const rediLoge = $(`#${tab}-redi`);
		const ladaLoge = $(`#${tab}-lada`);
		btn.prop('disabled', true);
		rediLoge.hide();
		ladaLoge.show();
	}
}

/**
 * set the GUI to allow user input now that a process is done
 */
function enableButtons() {
	for (const tab of ['planet', 'terrain', 'history', 'map']) {
		const btn = $(`#${tab}-apply`);
		const rediLoge = $(`#${tab}-redi`);
		const ladaLoge = $(`#${tab}-lada`);
		btn.prop('disabled', false);
		ladaLoge.hide();
		rediLoge.show();
	}
}


/**
 * When the planet button is clicked, call its function.
 * Note that this does not check if the planet is out of sync; it
 * must update every time the tab is opened because of Plotly.
 */
$('#planet-apply, #planet-tab').on('click', () => {
	if (!inProgress) {
		inProgress = true;
		disableButtons();
		setTimeout(() => {
			try {
				planetApply();
			} catch (error) {
				console.error(error);
			}
			inProgress = false;
			enableButtons();
		}, 10);
	}
});


/**
 * When the terrain button is clicked, do its thing
 */
$('#terrain-apply, #terrain-tab').on('click', () => {
	if (terrainOutOfSync && !inProgress) {
		inProgress = true;
		disableButtons();
		setTimeout(() => {
			try {
				terrainApply();
			} catch (error) {
				console.error(error);
			}
			inProgress = false;
			enableButtons();
		}, 10);
	}
});


/**
 * When the history button is clicked, activate its purpose.
 */
$('#history-apply, #history-tab').on('click', () => {
	if (historyOutOfSync && !inProgress) {
		inProgress = true;
		disableButtons();
		setTimeout(() => {
			try {
				historyApply();
			} catch (error) {
				console.error(error);
			}
			inProgress = false;
			enableButtons();
		}, 10);
	}
});


/**
 * When the map button is clicked, reveal its true form.
 */
$('#map-apply, #map-tab').on('click', () => {
	if (mapOutOfSync && !inProgress) {
		inProgress = true;
		disableButtons();
		setTimeout(() => {
			try {
				mapApply();
			} catch (error) {
				console.error(error);
			}
			inProgress = false;
			enableButtons();
		}, 10);
	}
});


$('#planet-panel :input').on('change', () => {
	planetOutOfSync = true;
	terrainOutOfSync = true;
	historyOutOfSync = true;
	mapOutOfSync = true;
});

$('#terrain-panel :input').on('change', () => {
	terrainOutOfSync = true;
	historyOutOfSync = true;
	mapOutOfSync = true;
});

$('#history-panel :input').on('change', () => {
	historyOutOfSync = true;
	mapOutOfSync = true;
});

$('#map-panel :input').on('change', () => {
	mapOutOfSync = true;
});


/**
 * Once the page is ready, start the algorithm!
 */
$(document).ready(() => {
	console.log("ready!");
	for (let i = 0; i < 18; i ++) {
		const rng = new Random(i);
		let bash: Language = new ProtoLang(rng);
		for (let j = 0; j < 20; j ++) {
			let s = "";
			for (let k = 0; k < 6; k ++)
				s += transcribe(bash.getNamloge(k, WordType.LOKONAM)) + "  ";
			console.log(s);
			bash = new DeuteroLang(bash, rng);
		}
		console.log("");
	}
	$('#map-apply').click();
}); // TODO: warn before leaving page
