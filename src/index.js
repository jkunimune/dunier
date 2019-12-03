// index.js: interfaces with forms and plots
'use strict';

const TERRAIN_COLORMAP = [
	[0.00, 'rgb(194, 229, 253)'],
	[0.17, 'rgb(157, 214, 218)'],
	[0.33, 'rgb(117, 201, 181)'],
	[0.50, 'rgb(073, 188, 137)'],
	[0.67, 'rgb(037, 173, 084)'],
	[0.83, 'rgb(068, 150, 024)'],
	[1.00, 'rgb(095, 124, 017)'],
];

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
	const surface = new Sphere(
		$( '#planet-day' ).val(),
		$( '#planet-gravity' ).val(),
		$( '#planet-circumference' ).val(),
		$( '#planet-tilt' ).val());
	surface.populate(1000, 2);

	const mapDiv = document.getElementById('planet-map');
	const data = [{
		type: "mesh3d",
		x: surface.nodes.map(n => n.x),
		y: surface.nodes.map(n => n.y),
		z: surface.nodes.map(n => n.z),
		i: surface.triangles.map(t => t.i),
		j: surface.triangles.map(t => t.j),
		k: surface.triangles.map(t => t.k),
		intensity: surface.nodes.map(n => Math.cos(n.u)),
		colorscale: TERRAIN_COLORMAP,
	}];
	const layout = {
		margin: {l: 20, r: 20, t: 20, b: 20},
	};
	const config = {
		responsive: true,
	};

	Plotly.react(mapDiv, data, layout, config);
});
