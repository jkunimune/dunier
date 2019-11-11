/**
 * Once the page is ready, start the algorithm!
 */
$( document ).ready(function() {
	console.log("ready!");
	planet_map = document.getElementById('planet-map');
	data = [{
		x: [1, 2, 3, 4, 5],
		y: [1, 2, 4, 8, 16] }]
	layout = {
		margin: { t: 0, b: 0, l: 0, r: 0 } }
	Plotly.plot(planet_map, data, layout, {responsive: true});
});

/**
 * Generate the planet and its temperature and rainfall.
 */
$( "#planet-apply" ).on("click", function() {
	console.log("planet!");
});

