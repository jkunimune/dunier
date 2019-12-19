// index.js: interfaces with forms and plots
'use strict';


const TERRAIN_COLORMAP = [
	[0/8, 'rgb(240, 251, 252)'],
	[1/8, 'rgb(202, 234, 241)'],
	[2/8, 'rgb(156, 220, 222)'],
	[3/8, 'rgb(114, 206, 190)'],
	[4/8, 'rgb(076, 192, 154)'],
	[5/8, 'rgb(043, 176, 113)'],
	[6/8, 'rgb(041, 157, 070)'],
	[7/8, 'rgb(067, 135, 029)'],
	[8/8, 'rgb(083, 112, 001)'],
];

// const TERRAIN_COLORMAP = [
// 	[0/8, 'rgb(000, 000, 000)'],
// 	[1/8, 'rgb(073, 001, 000)'],
// 	[2/8, 'rgb(124, 002, 000)'],
// 	[3/8, 'rgb(179, 006, 000)'],
// 	[4/8, 'rgb(236, 019, 000)'],
// 	[5/8, 'rgb(255, 103, 000)'],
// 	[6/8, 'rgb(255, 165, 000)'],
// 	[7/8, 'rgb(255, 233, 016)'],
// 	[8/8, 'rgb(255, 255, 255)'],
// ];


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
	if (this.value == 1) { // if it's toroidal now
		if ($('#planet-locked').prop('checked')) // uncheck tidal locking if we need to
			$('#planet-locked').click();
		$('#planet-locked').prop('disabled', true); // and disable it
	}
	else { // if it's anything else
		$('#planet-locked').prop('disabled', false); // enable it
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
	const rng = new Random(
		$('#planet-seed').val()); // use the random seed
	let surface = undefined;
	try { // create a surface
		if ($('#planet-type').val() === '0') { // spheroid
			if ($('#planet-locked').prop('checked')) { // spherical
				surface = new Sphere(
					$('#planet-size').val());
			}
			else { // oblate
				surface = new Spheroid(
					$('#planet-size').val(),
					$('#planet-gravity').val(),
					$('#planet-day').val(),
					$('#planet-tilt').val());
			}
		}
		else if ($('#planet-type').val() === '1') { // toroid
			// surface = new Toroid(
			// 	$('#planet-size').val(),
			// 	$('#planet-gravity').val(),
			// 	$('#planet-day').val(),
			// 	$('#planet-tilt').val());
		}
		else if ($('#planet-type').val() === '2') { // plane
			if ($('#planet-locked').prop('checked')) { // with static sun
				// surface = new StaticPlane(
				// 	$('#planet-size').val());
			}
			else { // with orbiting sun
				// surface = new Plane(
				// 	$('#planet-size').val(),
				// 	$('#planet-tilt').val());
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
	surface.populate(10000, 2, rng);

	const mapDiv = document.getElementById('planet-map');
	const data = [{
		type: "mesh3d",
		x: surface.nodes.map(n => n.pos.x),
		y: surface.nodes.map(n => n.pos.y),
		z: surface.nodes.map(n => n.pos.z),
		i: surface.triangles.map(t => t.i),
		j: surface.triangles.map(t => t.j),
		k: surface.triangles.map(t => t.k),
		intensity: surface.nodes.map(n => n.terme),
		colorscale: TERRAIN_COLORMAP,
		colorbar: {title: "Temperature"},
	}];
	const layout = {
		margin: {l: 20, r: 20, t: 20, b: 20},
	};
	const config = {
		responsive: true,
	};

	Plotly.react(mapDiv, data, layout, config);
});
