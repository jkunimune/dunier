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
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 */
$( '#planet-apply' ).on("click", function() {
	const surface = new Spheroid(
		$( '#planet-day' ).val(),
		$( '#planet-gravity' ).val(),
		$( '#planet-size' ).val(),
		$( '#planet-tilt' ).val());
	surface.populate(1000, 2);

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
