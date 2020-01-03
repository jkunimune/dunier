// index.js: interfaces with forms and plots
'use strict';


// const TERRAIN_COLORMAP = [
// 	[0.0, 'rgb(251, 252, 253)'],
// 	[0.1, 'rgb(215, 233, 249)'],
// 	[0.2, 'rgb(165, 217, 245)'],
// 	[0.3, 'rgb(117, 204, 214)'],
// 	[0.4, 'rgb( 80, 189, 174)'],
// 	[0.5, 'rgb( 41, 174, 131)'],
// 	[0.6, 'rgb( 13, 156,  82)'],
// 	[0.7, 'rgb( 53, 134,  28)'],
// 	[0.8, 'rgb( 81, 109,   0)'],
// 	[0.9, 'rgb( 87,  85,   3)'],
// 	[1.0, 'rgb( 85,  61,   3)'],
// ];

const TERRAIN_COLORMAP = [
	[0.0, 'rgb(  0,   0,   0)'],
	[0.1, 'rgb( 35,  11,  15)'],
	[0.2, 'rgb( 74,  21,  30)'],
	[0.3, 'rgb(115,  22,  40)'],
	[0.4, 'rgb(161,   5,  39)'],
	[0.5, 'rgb(197,  32,  19)'],
	[0.6, 'rgb(217,  77,   3)'],
	[0.7, 'rgb(232, 117,   5)'],
	[0.8, 'rgb(242, 159,  34)'],
	[0.9, 'rgb(246, 202,  78)'],
	[1.0, 'rgb(249, 242, 144)'],
];

const BIOME_COLORS = [
	['samud',       '#234095'],
	['barxojangal', '#0A6E07'],
	['jangal',      '#677F39'],
	['taige',       '#4CA06B'],
	['grasistan',   '#A9C024'],
	['savanah',     '#EFBF53'],
	['registan',    '#FAE09A'],
	['tundar',      '#FFFFFF'],
	['potistan',    '#00FFBF'],
	['piristan',    '#FF5F00'],
	[null,          '#000000'],
];


let surface = undefined;


/**
 * Once the page is ready, start the algorithm!
 */
$( document ).ready(function() {
	console.log("ready!");
});


/**
 * The "Toroid" option makes the "Tidally-locked" checkbox nonapplicable.
 */
$( '#planet-type' ).on('click', function() {
	const checkbox = $('#planet-locked');
	if (this.value === '1') { // if it's toroidal now
		if (checkbox.prop('checked')) // uncheck tidal locking if we need to
			checkbox.click();
		checkbox.prop('disabled', true); // and disable it
	}
	else { // if it's anything else
		checkbox.prop('disabled', false); // enable it
	}
});


/**
 * The "Tidally-locked" checkbox makes some other options nonapplicable.
 */
$( '#planet-locked' ).on('click', function() {
	$('#planet-day').prop('disabled', this.checked); // rotation period
	$('#planet-tilt').prop('disabled', this.checked); // and obliquity are both irrelevant
});


/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 */
$( '#planet-apply' ).on('click', function() {
	const planetType = $('#planet-type').val(); // read input
	const tidallyLocked = $('#planet-locked').prop('checked');
	const radius = $('#planet-size').val() / (2*Math.PI);
	const gravity = $('#planet-gravity').val() * 9.8;
	const spinRate = 1/$('#planet-day').val() * 2*Math.PI/3600;
	const obliquity = $('#planet-tilt').val() * Math.PI/180;

	try { // create a surface
		if (planetType === '0') { // spheroid
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
		else if (planetType === '1') { // toroid
			// surface = new Toroid(
			// 	radius,
			// 	gravity,
			// 	spinRate,
			// 	obliquity);
		}
		else if (planetType === '2') { // plane
			if (tidallyLocked) { // with static sun
				// surface = new StaticPlane(
				// 	radius);
			}
			else { // with orbiting sun
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
		}
		else
			throw err;
	}

	const [x, y, z, I] = surface.parameterize(18);
	const mapDiv = $('#planet-map')[0];
	const data = [{
		type: "surface",
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
	Plotly.react(mapDiv, data, layout, config);
});


/**
 * Generate the heightmap and biomes on the planet's surface.
 */
$( '#terrain-apply' ).on('click', function() {
	const randomSeme = $('#terrain-seme').val();
	const numContinents = $('#terrain-continents').val() * 2;
	const seaLevel = $('#terrain-samud').val();
	const avgTerme = parseFloat($('#terrain-terme').val()) + 273;
	const riverSize = $('#terrain-nade').val();

	let rng = new Random(randomSeme); // use the random seed
	surface.populate(2, rng); // finish constructing the surface
	rng = rng.reset();
	generateTerrain(
		numContinents,
		seaLevel,
		avgTerme,
		surface, rng); // create the terrain!

	const mapper = new Chart(new Azimuthal(surface));
	const mapSvg = SVG('#terrain-tiles');
	mapSvg.clear();
	for (const [biome, color] of BIOME_COLORS)
		mapper.fill(surface.nodes.filter(n => n.biome === biome), mapSvg, color);
});
