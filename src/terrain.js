// terrain.js: terrain generation functions
'use strict';


const TERME_NOISE_LEVEL = 10;
const BARXE_NOISE_LEVEL = .3;
const GAWE_NOISE_LEVEL = 0.5;
const MAX_NOISE_SCALE = 1/8;
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
	rng = rng.reset();
	movePlates(surf, rng);
	fillOcean(percentOcean, surf);
	rng = rng.reset();
	generateClimate(avgTerme, surf, rng);
	setBiomes(surf);
}

function generateClimate(avgTerme, surf, rng) {
	const maxScale = MAX_NOISE_SCALE*Math.sqrt(surf.area);
	for (const node of surf.nodes) { // assign each node random values
		node.terme = getNoiseFunction(node, node.parents, 'terme', surf, rng,
			maxScale, TERME_NOISE_LEVEL, NOISE_SCALE_SLOPE);
		node.barxe = getNoiseFunction(node, node.parents, 'barxe', surf, rng,
			maxScale, BARXE_NOISE_LEVEL, NOISE_SCALE_SLOPE);
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
	for (const node of surf.nodes) { // start by assigning plates
		if (node.index < numPlates) {
			node.plate = node.index; // the first few are seeds
			node.gawe = 0;
			rng.discrete(0, 0); // but call rng anyway to keep things consistent
			rng.normal(0, 0);
		}
		else { // and the rest with a method similar to that above
			const prefParents = [];
			for (const pair of node.between) { // if this node is directly between two nodes
				if (pair[0].plate === pair[1].plate) { // of the same plate
					if (!prefParents.includes(pair[0]))
						prefParents.push(pair[0]); // try to have it take the plate from one of them, to keep that plate together
					if (!prefParents.includes(pair[1]))
						prefParents.push(pair[1]);
				}
			}
			if (prefParents.length > 0) // in any case, just take the plate parent pseudorandomly
				node.plate = prefParents[rng.discrete(0, prefParents.length)].plate;
			else
				node.plate = node.parents[rng.discrete(0, node.parents.length)].plate;

			node.gawe = getNoiseFunction(node,
				node.parents.filter(p => p.plate === node.plate), 'gawe',
				surf, rng, maxScale, GAWE_NOISE_LEVEL, NOISE_SCALE_SLOPE);
		}
	}

	for (const node of surf.nodes) { // once that's done, add in the plate altitude baselines
		if (node.plate%2 === 0)
			node.gawe += node.plate/numPlates - 1; // order them so that adding and removing plates results in minimal change
		else
			node.gawe += 1 - node.plate/numPlates;
	}
}


/**
 * apply plate tectonics to the surface!
 */
function movePlates(surf, rng) {
	const velocities = [];
	for (const node of surf.nodes) { // start by counting up all the plates
		if (node.plate >= velocities.length) // and assigning them random velocities
			velocities.push(node.getNormal().cross(new Vector(
				rng.normal(0, 1), rng.normal(0, 1), rng.normal(0, 1)))); // orthogonal to the normal at their seeds
		else
			break;
	}

	const queue = new TinyQueue([], (a, b) => a.distance - b.distance);
	for (const node of surf.nodes) { // now for phase 2:
		let fault;
		let minDistance = Number.POSITIVE_INFINITY;
		for (const neighbor of node.neighbors.keys()) { // look for adjacent nodes
			if (neighbor.plate !== node.plate) { // that are on different plates
				const distance = node.neighbors.get(neighbor).length;
				if (typeof(fault) == 'undefined' || distance < minDistance) {
					fault = neighbor;
					minDistance = distance;
				}
			}
		}

		if (typeof(fault) != 'undefined') { // if you found one,
			const relPosition = node.pos.minus(fault.pos);
			const relVelocity = velocities[node.plate].minus(velocities[fault.plate]); // determine the speed at which they are moving away from each other
			let type; // and whether these are both continents or if this is a top or a bottom or what
			if (node.gawe > 1/3 && fault.gawe > 1/3)
				type = 'continent';
			else if (node.gawe > fault.gawe)
				type = 'top';
			else
				type = 'bottom';
			queue.push({
				node: node, distance: minDistance/2,
				speed: relPosition.norm().dot(relVelocity),
				type: type}); // add it to the queue
		}

		node.flag = false; // also set up these temporary flags
	}

	while (queue.length > 0) { // now, we iterate through the queue
		const {node, distance, speed, type} = queue.pop(); // each element of the queue is a node waiting to be affected by plate tectonics
		if (node.flag)  continue; // some of them may have already come up
		let gawoMute = 0; // the type and distance determine how it will be affected
		if (speed < 0) { // converging
			if (type === 'continent') { // continents
				gawoMute = Math.max(0, -speed*30 - distance/10);
			}
			else if (type === 'top') { // subductor

			}
			else { // subductee

			}
		}
		else { // divergence

		}

		if (gawoMute !== 0) { // if there was any change at all
			node.gawe += gawoMute; // apply it
			node.flag = true; // mark this node
			for (const neighbor of node.neighbors.keys()) // and add its neighbors to the queue
				queue.push({
					node: neighbor,
					distance: distance+node.neighbors.get(neighbor).length,
					speed: speed, type: type}); // add it to the queue
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
		while (queue.length > 0 && queue.peek().gawe <= samudGawe) { // and flood all lower nodes
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


/**
 * compute the diamond square noise algorithm to one node, given its parents.
 * @param node Node to be changed
 * @param parents Array of Nodes that will influence it
 * @param attr String identifier of attribute that is being compared and set
 * @param surf Surface on which the algorithm takes place
 * @param rng Random to use for the values
 * @param maxScale the scale above which values are not correlated
 * @param level number noise magnitude scalar
 * @param slope number logarithmic rate at which noise dies off with distance
 * @return number the value of attr this node should take
 */
function getNoiseFunction(node, parents, attr, surf, rng, maxScale, level, slope) {
	let scale = 0;
	let weightSum = 0;
	let value = 0;
	for (const parent of parents) {
		const dist = surf.distance(node, parent); // look at parent distances
		scale += dist/parents.length; // compute the mean scale // TODO might save some time if I save these distances
		weightSum += 1/dist;
		value += parent[attr]/dist; // compute the weighted average of them
	}
	value /= weightSum; // normalize

	if (Number.isNaN(value) || scale > maxScale) { // above a certain scale (or in lieu of any parents)
		scale = maxScale; // the std levels out
		value = 0; // and information is no longer correlated
	}
	const std = level*Math.pow(scale/maxScale, slope);
	value += rng.normal(0, std); // finally, add the random part of the random noise

	return value;
}
