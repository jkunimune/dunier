// index.ts: interfaces with forms and plots

import "../node_modules/jquery/dist/jquery.min.js";
// @ts-ignore
const $ = window.$; // why is this like this? I don't know.
import "../node_modules/plotly.js/dist/plotly.js";
// @ts-ignore
const Plotly = window.Plotly;

import {generateTerrain} from "./terrain.js";
import {Sphere, Spheroid, Surface} from "./surface.js";
import {World} from "./world.js";
import {Azimuthal, Chart} from "./map.js";
import {Random} from "./random.js";


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

// const TERRAIN_COLORMAP = [
// 	[0.0, 'rgb(  0,   0,   0)'],
// 	[0.1, 'rgb( 35,  11,  15)'],
// 	[0.2, 'rgb( 74,  21,  30)'],
// 	[0.3, 'rgb(115,  22,  40)'],
// 	[0.4, 'rgb(161,   5,  39)'],
// 	[0.5, 'rgb(197,  32,  19)'],
// 	[0.6, 'rgb(217,  77,   3)'],
// 	[0.7, 'rgb(232, 117,   5)'],
// 	[0.8, 'rgb(242, 159,  34)'],
// 	[0.9, 'rgb(246, 202,  78)'],
// 	[1.0, 'rgb(249, 242, 144)'],
// ];

const BIOME_COLORS = {
	'samud':       '#06267f',
	'potistan':    '#444921',
	'barxojangal': '#176D0D',
	'jangal':      '#647F45',
	'lage':        '#2987D8',
	'taige':       '#4EA069',
	'piristan':    '#DD9C6F',
	'grasistan':   '#BED042',
	'registan':    '#F5E292',
	'tundar':      '#FFFFFF',
	'kale':        '#FAF2E4',
	 null:         '#000000',
};

const CATEGORY_COLORS = [
	'rgb( 96, 189, 218)',
	'rgb(182, 161,  92)',
	'rgb(173, 132, 198)',
	'rgb( 38, 149, 129)',
	'rgb(153, 108,  97)',
	'rgb( 77, 131, 177)',
	'rgb(121, 149,  83)',
	'rgb(214, 128, 172)',
	'rgb( 49, 186, 200)',
	'rgb(210, 179, 148)',
	'rgb(174, 172, 227)',
	'rgb( 96, 178, 134)',
	'rgb(215, 120, 126)',
	'rgb(  6, 144, 186)',
	'rgb(123, 121,  84)',
	'rgb(156, 111, 154)',
	'rgb( 28, 156, 149)',
	'rgb(211, 137, 100)',
	'rgb(133, 171, 233)',
	'rgb(166, 192, 158)',
];

const RIVER_DISPLAY_THRESHOLD = 2e6; // km^2


let surface: Surface = null;
let world: World = null;


/**
 * Once the page is ready, start the algorithm!
 */
$(document).ready(() => {
	console.log("ready!");
});


/**
 * The "Toroid" option makes the "Tidally-locked" checkbox nonapplicable.
 */
$('#planet-type').on('click', () => {
	const checkbox = $('#planet-locked');
	if ($('#planet-type').val() === '1') { // if it's toroidal now
		if (checkbox.prop('checked')) // uncheck tidal locking if we need to
			checkbox.click();
		checkbox.prop('disabled', true); // and disable it
	} else { // if it's anything else
		checkbox.prop('disabled', false); // enable it
	}
});


/**
 * The "Tidally-locked" checkbox makes some other options nonapplicable.
 */
$('#planet-locked').on('changed', () => {
	const value = $('#planet-locked').prop('checked');
	$('#planet-day').prop('disabled', value); // rotation period
	$('#planet-tilt').prop('disabled', value); // and obliquity are both irrelevant
});


/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 */
$('#planet-apply').on('click', () => {
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

	const [x, y, z, I] = surface.parameterize(18);
	const mapDiv = $('#planet-map')[0];
	// const data: Plotly.PlotData[] = [{
	const data = [{
		type: 'surface',
		x: x,
		y: y,
		z: z,
		surfacecolor: I,
		cmin: 0,
		cmax: 1.5,
		colorscale: TERRAIN_COLORMAP,
		showscale: false,
		lightposition: {x: 1000, y: 0, z: 0},
		hoverinfo: "none",
	}];
	const layout = {
		margin: {l: 20, r: 20, t: 20, b: 20},
	};
	const config = {
		responsive: true,
	};
	Plotly.react(mapDiv, data, layout, config).then(() => {});
});


/**
 * Generate the heightmap and biomes on the planet's surface.
 */
$('#terrain-apply').on('click', () => {
	const randomSeme = Number($('#terrain-seme').val());
	const numContinents = Number($('#terrain-continents').val()) * 2;
	const seaLevel = Number($('#terrain-samud').val());
	const avgTerme = Number($('#terrain-terme').val());

	let rng = new Random(randomSeme); // use the random seed
	surface.populate(rng); // finish constructing the surface
	rng = rng.reset();
	generateTerrain(
		numContinents,
		seaLevel,
		avgTerme,
		surface, rng); // create the terrain!

	const mapper = new Chart(new Azimuthal(surface));
	const colorLayer = $('#terrain-tiles')[0]; // get terrain layer
	colorLayer.textContent = ''; // clear existing terrain
	for (const biome in BIOME_COLORS)
		mapper.fill([...surface.nodos].filter(n => n.biome === biome), colorLayer, BIOME_COLORS[biome]);
	const riverLayer = $('#terrain-nade')[0];
	riverLayer.textContent = '';
	mapper.stroke([...surface.rivers].filter(ud => ud[0].liwe >= RIVER_DISPLAY_THRESHOLD),
		riverLayer, BIOME_COLORS['samud'], .003, true);
	const reliefLayer = $('#terrain-shade')[0];
	reliefLayer.textContent = '';
	// mapper.shade(surface.triangles, reliefLayer, 'gawe');
});


/**
 * Generate the countries on the planet's surface.
 */
$('#history-apply').on('click', () => {
	const randomSeme = Number($('#history-seme').val());
	const years = Number($('#history-nen').val()) + 3000;

	world = new World(surface);

	let rng = new Random(randomSeme); // use the random seed
	world.generateHistory(
		years,
		rng); // create the terrain!

	const mapper = new Chart(new Azimuthal(surface));
	const colorLayer = $('#history-tiles')[0];
	colorLayer.clear();
	mapper.fill([...surface.nodos].filter(n => n.biome !== 'samud'), colorLayer, BIOME_COLORS['kale']);
	for (const civ of world.civs) {
		const g = colorLayer.group();
		g.element('title').words(civ.getName());
		mapper.fill([...civ.nodos].filter(n => n.biome !== 'samud'), g,
			CATEGORY_COLORS[civ.id % CATEGORY_COLORS.length]);
	}
	mapper.fill([...surface.nodos].filter(n => n.biome === 'samud'), colorLayer, BIOME_COLORS['samud']);
	const reliefLayer = $('#terrain-shade')[0];
	reliefLayer.clear();
	// mapper.shade(surface.triangles, reliefLayer, 'gawe');
});
