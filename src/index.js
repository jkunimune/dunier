planet_map = document.getElementById('planet-map');
data = [{
	x: [1, 2, 3, 4, 5],
	y: [1, 2, 4, 8, 16] }]
layout = {
	margin: { t: 0 } }
Plotly.plot(planet_map, data, layout, {responsive: true});
