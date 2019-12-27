// terrain.js: terrain generation functions
'use strict';


const CLIMATE_NOISE_LEVEL = 1;
const TERRAIN_NOISE_LEVEL = 1e-1;
const MAX_NOISE_SCALE = 1/16;
const NOISE_SCALE_SLOPE = 1.0;


/**
 * create all of the continents and biomes and rivers that go into the physical geography
 * of a good fictional world.
 * @param numContinents number of continents, equal to half the number of plates
 * @param percentOcean fraction of nodes that should be set to samud
 * @param avgTerme some vaguely defined median temperature in Kelvin
 * @param surf the surface to modify
 * @param rng the seeded random number generator to use
 */
function generateTerrain(numContinents, percentOcean, avgTerme, surf, rng) {
	generateContinents(numContinents, surf, rng);
	fillOcean(percentOcean, surf);
	rng = rng.reset();
	generateClimate(avgTerme, surf, rng);
	setBiomes(surf);
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


function setBiomes(surf) {

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
			let parent = undefined; // but where each node chooses just one parent
			const preferredParents = [];
			for (const pair of node.between) { // if this node is directly between two nodes
				if (pair[0].plate === pair[1].plate) { // of the same plate
					if (!preferredParents.includes(pair[0]))
						preferredParents.push(pair[0]); // try to have it take the plate from one of them, to keep that plate together
					if (!preferredParents.includes(pair[1]))
						preferredParents.push(pair[1]);
				}
			}
			if (preferredParents.length > 0) {// in any case, just take the parent pseudorandomly
				parent = preferredParents[rng.discrete(0, preferredParents.length)];
			}
			else
				parent = node.parents[rng.discrete(0, node.parents.length)];

			const scale = surf.distance(node, parent);
			const std = noiseLevel*Math.pow(Math.min(scale, maxScale), NOISE_SCALE_SLOPE);
			node.plate = parent.plate;
			node.gawe = parent.gawe + rng.normal(0, std);
		}
	}
}


/**
 * fill in the ocean biome using a very simple flood fill
 * @param fraction
 * @param surf
 */
function fillOcean(fraction, surf) {
	let minim = surf.nodes[0];
	for (const node of surf.nodes) // start with the lowest node
		if (node.gawe < minim.gawe)
			minim = node;
	let samudGawe = Number.NEGATIVE_INFINITY;
	let numSamud = 0;
	const queue = new TinyQueue([minim], (a, b) => a.gawe - b.gawe); // it shall seed our ocean
	while (queue.length > 0 && numSamud < fraction*surf.nodes.length) { // up to the desired fraction:
		samudGawe = queue.peek().gawe; // raise the sea level to the next lowest point
		while (queue.peek().gawe <= samudGawe) { // and flood all lower nodes
			const next = queue.pop();
			if (next.biome !== 'samud') {
				next.biome = 'samud';
				numSamud ++;
				for (const neighbor of next.neighbors.keys())
					queue.push(neighbor); // spreading the water to their neighbors
			}
		}
	}

	for (const node of surf.nodes) {
		node.gawe -= samudGawe;
	}
}
