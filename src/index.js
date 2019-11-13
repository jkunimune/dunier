// index.js: interfaces with forms and plots
'use strict';

/**
 * Once the page is ready, start the algorithm!
 */
$( document ).ready(function() {
	console.log("ready!");
});

/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 */
$( "#planet-apply" ).on("click", function() {
	const mapDiv = document.getElementById('planet-map');
	const data = [{
		type: "mesh3d",
		x: [], y: [], z: [],
		intensity: [],
		colorscale: 'Hot',
	}];
	const layout = {
		margin: {l: 20, r: 20, t: 20, b: 20},
	};
	const config = {
		responsive: true,
	};

	for (let i = 0; i < 36; i ++) {
		let ph = Math.asin(2*Math.random() - 1);
		let l = Math.PI*(2*Math.random() - 1);
		data[0].x.push(Math.cos(ph)*Math.cos(l));
		data[0].y.push(Math.cos(ph)*Math.sin(l));
		data[0].z.push(Math.sin(ph));
		data[0].intensity.push(Math.cos(ph)*Math.cos(ph));
	}

	Plotly.react(mapDiv, data, layout, config);
});
