// index.ts: interfaces with forms and plots

import "./lib/jquery.min.js";
// @ts-ignore
const $ = window.$; // why is this like this? I don't know.
import "./lib/plotly.js";
// @ts-ignore
const Plotly = window.Plotly;

import {generateTerrain} from "./terrain.js";
import {Sphere, Spheroid, Surface} from "./surface.js";
import {World} from "./world.js";
import {Convention} from "./language.js";
import {Azimuthal, Chart, EqualArea, Equirectangular} from "./map.js";
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


let surface: Surface = null;
let world: World = null;


/**
 * Once the page is ready, start the algorithm!
 */
$(document).ready(() => {
	console.log("ready!"); // TODO: automatically generate the first map
}); // TODO: warn before leaving page


/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 */
$('#planet-apply').on('click', () => {
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

	console.log("grafa...");
	const {x, y, z, I} = surface.parameterize(18);
	Plotly.react(
		$('#planet-map')[0],
		[{
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
		}],
		{
			margin: {l: 20, r: 20, t: 20, b: 20},
		},
		{
			responsive: true,
		}
	).then(() => {});
	console.log("fina!");
});


/**
 * Generate the heightmap and biomes on the planet's surface.
 */
$('#terrain-apply').on('click', () => {
	console.log("jena zemforme...");
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

	console.log("grafa...");
	const mapper = new Chart(new Azimuthal(surface));
	mapper.depict(surface, null, $('#terrain-map')[0], 'jivi', 'nili');

	console.log("fina!");
});


/**
 * Generate the countries on the planet's surface.
 */
$('#history-apply').on('click', () => {
	console.log("jena histore...");
	const randomSeme = Number($('#history-seme').val());
	const year = Number($('#history-nen').val());
	const imperistia = Number($('#history-imperistia').val()) / 1e3; // km/year
	const injenivia = Number($('#history-injenivia').val()) / 1e9; // 1/y
	const katastrofe = Number($('#history-katastrofe').val());

	world = new World(imperistia, injenivia, katastrofe, surface);

	let rng = new Random(randomSeme); // use the random seed
	world.generateHistory(
		year,
		rng); // create the terrain!

	console.log("grafa...");
	const mapper = new Chart(new Azimuthal(surface));
	mapper.depict(surface, world, $('#history-map')[0], 'politiki', 'nili');
	console.log("fina!");
});


/**
 * Generate a final formatted map.
 */
$('#map-apply').on('click', () => {
	console.log("grafa zemgrafe...");
	const projection = $('#map-projection').val();
	const zemrang = $('#map-zemrang').val();
	const marorang = $('#map-marorang').val();
	const filter = $('#map-filter').val();
	const nade = $('#map-nade').prop('checked');
	const kenare = $('#map-kenare').prop('checked');
	const shade = $('#map-saye').prop('checked');

	let mapper;
	if (projection === 'equirectangular')
		mapper = new Chart(new Equirectangular(surface));
	else if (projection === 'azimuthal-equidistant')
		mapper = new Chart(new Azimuthal(surface));
	else if (projection == 'eckert')
		mapper = new Chart(new EqualArea(surface));
	else
		throw new Error(`no jana metode da graflance: '${projection}'.`);

	mapper.depict(surface, world, $('#map-map')[0], zemrang, marorang, filter, nade, kenare, shade);
	console.log("fina!");
});
