// terrain.js: terrain generation functions
'use strict';


const CLIMATE_NOISE_LEVEL = 1;
const TERRAIN_NOISE_LEVEL = 0;
const MAX_NOISE_SCALE = 1/16;
const NOISE_SCALE_SLOPE = 1.0;


/**
 * create all of the continents and biomes and rivers that go into the physical geography
 * of a good fictional world.
 * @param surf the surface to modify
 * @param avgTerme some vaguely defined median temperature in Kelvin
 * @param rng the seeded random number generator to use
 */
function generateTerrain(avgTerme, numContinents, surf, rng) {
	generateClimate(avgTerme, surf, rng);
	generateContinents(numContinents, surf, rng);
}

function generateClimate(avgTerme, surf, rng) {
	const maxScale = MAX_NOISE_SCALE*Math.sqrt(surf.area);
	const noiseLevel = CLIMATE_NOISE_LEVEL/Math.pow(maxScale, NOISE_SCALE_SLOPE);
	for (const node of surf.nodes) { // assign each node random values
		let scale = 0; // based on a diamond-square-like algorithm
		for (const parent of node.parents)
			scale += surf.distance(node, parent);
		scale = scale/node.parents.length;
		if (Number.isNaN(scale) || scale > maxScale) {
			scale = maxScale;
		}
		else { // where values are correlated under a certain scale
			for (const parent of node.parents) {
				node.terme += parent.terme/node.parents.length;
				node.barxe += parent.barxe/node.parents.length;
			}
		}
		const std = noiseLevel*Math.pow(maxScale, NOISE_SCALE_SLOPE);
		node.terme += rng.normal(0, std);
		node.barxe += rng.normal(0, std);
	}

	for (const node of surf.nodes) { // and then throw in the baseline
		node.terme += avgTerme*Math.pow(surf.insolation(node.u), 1/4.) - 273;
		node.barxe += surf.windConvergence(node.u);
	}
}


function generateContinents(numPlates, surf, rng) {
	const maxScale = MAX_NOISE_SCALE*Math.sqrt(surf.area);
	const noiseLevel = TERRAIN_NOISE_LEVEL/Math.pow(maxScale, NOISE_SCALE_SLOPE);
	for (const node of surf.nodes) { // assign each node random values
		if (node.index < numPlates) {
			node.plate = node.index; // completely random for the plate seeds
			if (node.index < numPlates/2)
				node.gawe = rng.uniform(0, 1); // with continents
			else
				node.gawe = rng.uniform(-1, 0); // and oceans distinguished by index
		}
		else { // and the rest with a method similar to that above,
			const parent = node.parents[rng.discrete(0, node.parents.length)]; // but with sharper borders
			const scale = surf.distance(node, parent);
			const std = noiseLevel*Math.pow(Math.min(scale, maxScale), NOISE_SCALE_SLOPE);
			node.plate = parent.plate;
			node.gawe = parent.gawe + rng.normal(0, std);
		}
	}
}
