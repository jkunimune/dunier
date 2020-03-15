// terrain.js: terrain generation functions
'use strict';


const TERME_NOISE_LEVEL = 12;
const BARXE_NOISE_LEVEL = 1;
const MAX_NOISE_SCALE = 1/8;
const ATMOSPHERE_THICKNESS = 12; // km
const CLOUD_HEIGHT = 2; // km
const OROGRAPHIC_MAGNITUDE = 1;
const OROGRAPHIC_RANGE = 8000; // km

const TUNDRA_TEMP = -10;
const DESERT_INTERCEPT = -30;
const DESERT_SLOPE = 60;
const TAIGA_TEMP = +5;
const FLASH_TEMP = +50;
const TROPIC_TEMP = +22;
const FOREST_INTERCEPT = -35;
const FOREST_SLOPE = 37;
const MARSH_THRESH = 3.5;

const OCEAN_DEPTH = 4; // km
const CONTINENT_VARIATION = .5; // km
const OCEANIC_VARIATION = 1; // km
const MOUNTAIN_HEIGHT = 4; // km
const VOLCANO_HEIGHT = 3.3; // km
const RIFT_HEIGHT = 2; // km
const TRENCH_DEPTH = 4; // km
const MOUNTAIN_WIDTH = 400; // km
const TRENCH_WIDTH = 100; // km
const SLOPE_WIDTH = 400; // km
const RIFT_WIDTH = 800; // km
const OCEAN_SIZE = 0.25; // as a fraction of continental length scale


/**
 * create all of the continents and biomes and rivers that go into the physical geography
 * of a good fictional world.
 * @param numContinents number of continents, equal to half the number of plates
 * @param seaLevel desired sea level in km
 * @param avgTerme some vaguely defined median temperature in Kelvin
 * @param surf the surface to modify
 * @param rng the seeded random number generator to use
 */
function generateTerrain(numContinents, seaLevel, avgTerme, surf, rng) {
	generateContinents(numContinents, surf, rng);
	rng = rng.reset();
	movePlates(surf, rng);
	fillOcean(seaLevel, surf);
	rng = rng.reset();
	generateClimate(avgTerme, surf, rng);
	setBiomes(surf);
}

function generateClimate(avgTerme, surf, rng) {
	const maxScale = MAX_NOISE_SCALE*Math.sqrt(surf.area);
	for (const node of surf.nodes) { // assign each node random values
		node.terme = getNoiseFunction(node, node.parents, 'terme', surf, rng,
			maxScale, TERME_NOISE_LEVEL, 2);
		node.barxe = getNoiseFunction(node, node.parents, 'barxe', surf, rng,
			maxScale, BARXE_NOISE_LEVEL, 2);
	}

	for (const node of surf.nodes) { // and then throw in the baseline
		node.terme += Math.pow(
			surf.insolation(node.φ)*Math.exp(-node.gawe/ATMOSPHERE_THICKNESS),
			1/4.)*avgTerme - 273;
		node.barxe += surf.windConvergence(node.φ);
		const {n, d} = surf.windVelocity(node.φ);
		node.hawe = node.nord.times(n).plus(node.dong.times(d));
	}

	for (const node of surf.nodes)
		node.downwind = [];
	const queue = [];
	for (const node of surf.nodes) {
		let bestDix = null; // define node.upwind as the neighbor that is in the upwindest direction of each node
		for (const neighbor of node.neighbors.keys()) {
			const dix = neighbor.pos.minus(node.pos).norm();
			if (bestDix == null ||
				dix.dot(node.hawe) < bestDix.dot(node.hawe)) {
				bestDix = dix;
				node.upwind = neighbor;
				node.windSpeed = -dix.dot(node.hawe);
			}
		}
		node.upwind.downwind.push(node); // and make sure that all nodes know who is downwind of them
		if (node.biome === 'samud') // also seed the orographic effect in the oceans
			queue.push({node: node, moisture: OROGRAPHIC_MAGNITUDE});
		if (node.gawe > CLOUD_HEIGHT) // and also remove some moisture from mountains
			node.barxe -= OROGRAPHIC_MAGNITUDE;
	}
	while (queue.length > 0) {
		const {node, moisture} = queue.pop(); // each node looks downwind
		node.barxe += moisture;
		for (const downwind of node.downwind) {
			if (downwind.biome !== 'samud' && downwind.gawe <= CLOUD_HEIGHT) { // land neighbors that are not separated by mountains
				const distance = node.neighbors.get(downwind).length;
				queue.push({
					node: downwind,
					moisture: moisture*(1 - distance/OROGRAPHIC_RANGE/downwind.windSpeed)}); // receive slightly less moisture than this one got
			}
		}
	}
}


function setBiomes(surf) {
	for (const node of surf.nodes) {
		if (node.biome == null) {
			if (node.terme < TUNDRA_TEMP)
				node.biome = 'tundar';
			else if (node.terme > DESERT_SLOPE*node.barxe + DESERT_INTERCEPT)
				node.biome = 'registan';
			else if (node.terme < TAIGA_TEMP)
				node.biome = 'taige';
			else if (node.terme > FLASH_TEMP)
				node.biome = 'piristan';
			else if (node.terme > FOREST_SLOPE*node.barxe + FOREST_INTERCEPT)
				node.biome = 'grasistan';
			else if (node.terme < TROPIC_TEMP) {
				if (node.barxe < MARSH_THRESH)
					node.biome = 'jangal';
				else
					node.biome = 'potistan';
			}
			else {
				node.biome = 'barxojangal';
			}
		}
	}
}


function generateContinents(numPlates, surf, rng) {
	const maxScale = MAX_NOISE_SCALE*Math.sqrt(surf.area);
	for (const node of surf.nodes) { // start by assigning plates
		if (node.index < numPlates) {
			node.plate = node.index; // the first few are seeds
			node.gawe = 0;
			rng.discrete(0, 0); // but call rng anyway to keep things consistent
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
				node.plate = node.parents[rng.discrete(0, node.parents.length)].plate; // if there are no pairs, just choose from the full set
		}
	}

	for (const node of surf.nodes) { // refine the plate definitions
		if (node.plate !== node.index) {
			const count = new Array(numPlates).fill(0);
			for (const neighbor of node.neighbors.keys())
				count[neighbor.plate] ++;
			count[node.plate] += 0.5;
			node.plate = argmax(count); // to smooth out the plate borders at the finest level
		}
	}

	for (const node of surf.nodes) { // with plates finalized,
		node.gawe = getNoiseFunction(node,
			node.parents.filter(p => p.plate === node.plate), 'gawe',
			surf, rng, maxScale,
			(node.plate%2===0) ? CONTINENT_VARIATION : OCEANIC_VARIATION,
			1); // at last apply the noise function
	}

	for (const node of surf.nodes) { // once that's done, add in the plate altitude baselines
		if (node.plate%2 === 0)
			node.gawe += OCEAN_DEPTH/2; // order them so that adding and removing plates results in minimal change
		else
			node.gawe -= OCEAN_DEPTH/2;
	}
}


/**
 * apply plate tectonics to the surface!
 */
function movePlates(surf, rng) {
	const velocities = [];
	for (const node of surf.nodes) { // start by counting up all the plates
		if (node.plate >= velocities.length) // and assigning them random velocities // TODO allow for plate rotation in the tangent plane
			velocities.push(
				node.dong.times(rng.normal(0, Math.sqrt(.5))).plus(
				node.nord.times(rng.normal(0, Math.sqrt(.5))))); // orthogonal to the normal at their seeds
		else
			break;
	}

	const oceanWidth = OCEAN_SIZE*Math.sqrt(surf.area/velocities.length); // do a little dimensional analysis on the ocean scale

	const hpQueue = new TinyQueue([], (a, b) => a.distance - b.distance);
	const lpQueue = new TinyQueue([], (a, b) => a.distance - b.distance);
	for (const node of surf.nodes) { // now for phase 2:
		let fault = null;
		let minDistance = Number.POSITIVE_INFINITY;
		for (const neighbor of node.neighbors.keys()) { // look for adjacent nodes
			if (neighbor.plate !== node.plate) { // that are on different plates
				const distance = node.neighbors.get(neighbor).length;
				if (fault == null || distance < minDistance) {
					fault = neighbor;
					minDistance = distance;
				}
			}
		}

		if (fault != null) { // if you found one,
			let nodePos = new Vector(0, 0, 0); // do some additional computation to smooth out the boundaries
			let faultPos = new Vector(0, 0, 0);
			let nodeMass = 0, faultMass = 0;
			for (const n of union(node.neighbors.keys(), fault.neighbors.keys())) {
				if (n.plate === node.plate) {
					nodePos = nodePos.plus(n.pos);
					nodeMass ++;
				}
				else if (n.plate === fault.plate) {
					faultPos = faultPos.plus(n.pos);
					faultMass ++;
				}
			}
			const relPosition = nodePos.over(nodeMass).minus(faultPos.over(faultMass));
			const relVelocity = velocities[node.plate].minus(velocities[fault.plate]);
			const relSpeed = relPosition.norm().dot(relVelocity); // determine the relSpeed at which they are moving away from each other
			let type, width; // and whether these are both continents or if this is a top or a bottom or what
			if (relSpeed < 0) {
				if (node.gawe > 0 && fault.gawe > 0) {
					type = 'xan'; // continental collision
					width = -relSpeed*MOUNTAIN_WIDTH*Math.sqrt(2);
				}
				else if (node.gawe < fault.gawe) {
					type = 'kav'; // deep sea trench
					width = TRENCH_WIDTH*Math.sqrt(2);
				}
				else {
					type = 'nesokurbe'; // island arc
					width = MOUNTAIN_WIDTH*Math.sqrt(2);
				}
			}
			else {
				if (node.gawe < 0) {
					type = 'fenia'; // mid-oceanic rift
					width = relSpeed*RIFT_WIDTH*2;
				}
				else {
					type = 'rampe'; // mid-oceanic rift plus continental slope
					width = relSpeed*oceanWidth;
				}
			}
			const queueElement = {
				node: node, distance: minDistance/2, width: width,
				speed: Math.abs(relSpeed), type: type}; // add it to the queue
			if (type === 'rampo')	hpQueue.push(queueElement);
			else                    lpQueue.push(queueElement); // which queue depends on priority
			node.relSpeed = relSpeed;
		}
		else
			node.relSpeed = Number.NaN;

		node.flag = false; // also set up these temporary flags
	}

	for (const queue of [hpQueue, lpQueue]) { // now, we iterate through the queues
		while (queue.length > 0) { // in order of priority
			const {node, distance, width, speed, type} = queue.pop(); // each element of the queue is a node waiting to be affected by plate tectonics
			if (node.flag)  continue; // some of them may have already come up
			if (distance > width)   continue; // there's also always a possibility we are out of the range of influence of this fault
			if (type === 'xan') { // based on the type, find the height change as a function of distance
				const x = distance / (speed*MOUNTAIN_WIDTH);
				node.gawe += Math.sqrt(speed) * MOUNTAIN_HEIGHT * // continent-continent ranges are even
					bellCurve(x) * wibbleCurve(x); // (the sinusoidal term makes it a little more rugged)
			}
			else if (type === 'kav') {
				const x = distance / TRENCH_WIDTH;
				node.gawe -= speed * TRENCH_DEPTH *
					digibbalCurve(x) * wibbleCurve(x); // while subductive faults are odd
			}
			else if (type === 'nesokurbe') {
				const x = distance / MOUNTAIN_WIDTH;
				node.gawe += speed * VOLCANO_HEIGHT *
					digibbalCurve(x) * wibbleCurve(x);
			}
			else if (type === 'fenia') {
				const dS = speed*oceanWidth;
				const dR = Math.min(0, dS - 2*SLOPE_WIDTH - 2*RIFT_WIDTH);
				const xR = (distance - dR) / RIFT_WIDTH;
				node.gawe += RIFT_HEIGHT * Math.exp(-xR);
			}
			else if (type === 'rampe') {
				const dS = speed*oceanWidth; // passive margins are kind of complicated
				const dR = Math.min(0, dS - 2*SLOPE_WIDTH - 2*RIFT_WIDTH);
				const xS = (dS - distance) / SLOPE_WIDTH;
				const xR = (distance - dR) / RIFT_WIDTH;
				node.gawe += OCEAN_DEPTH * (Math.exp(-xS) - 1) + RIFT_HEIGHT * Math.exp(-xR);
			}
			else {
				throw "Unrecognized fault type";
			}

			node.flag = true; // mark this node
			for (const neighbor of node.neighbors.keys()) // and add its neighbors to the queue
				if (neighbor.plate === node.plate)
					queue.push({
						node: neighbor,
						distance: distance + node.neighbors.get(neighbor).length,
						width: width, speed: speed, type: type
					});
		}
	}
}


/**
 * fill in the ocean biome using a very simple flood fill
 * @param level
 * @param surf
 */
function fillOcean(level, surf) {
	let bestStart = null; // the size of the ocean depends heavily on where we start
	let bestSize = 0;
	while (true) { // we want to find the start point that maximizes that size
		let start = null;
		for (const node of surf.nodes) {
			if (node.biome !== 'samud' && node.gawe <= level &&
				(start == null || node.gawe < start.gawe)) // the lowest point that we haven't already tried is a good way to test
				start = node;
		}
		if (start == null) // stop when we can't find any suitable starts
			break;
		let size = floodFrom(start, level, surf);
		if (size > bestSize) {
			bestStart = start;
			bestSize = size;
		}
		if (size > surf.nodes.length/2) // or if we find one that fills over half the nodes
			break;
	}

	if (bestStart == null)
		return; // it's theoretically possible there wasn't any suitable start point. shikata wa nai yo.

	for (const node of surf.nodes) // finally, clear all attempts
		node.biome = null;
	floodFrom(bestStart, level); // and set it so that just the best start point is filled in

	for (const node of surf.nodes) // and set sea level to 0
		node.gawe -= level;
}

function floodFrom(start, level) {
	let numFilled = 0;
	const queue = new TinyQueue([start], (a, b) => a.gawe - b.gawe); // it shall seed our ocean
	while (queue.length > 0 && queue.peek().gawe <= level) { // flood all available nodes
		const next = queue.pop();
		if (next.biome !== 'samud') {
			next.biome = 'samud';
			numFilled ++;
			for (const neighbor of next.neighbors.keys())
				queue.push(neighbor); // spreading the water to their neighbors
		}
	}

	return numFilled;
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


function bellCurve(x) {
	return (1 - x*x*(1 - x*x/4));
}

function digibbalCurve(x) {
	return Math.sqrt(3125/512)*x*(1 - x*x*(1 - x*x/4));
}

function wibbleCurve(x) {
	return 1 + Math.cos(12*Math.PI*x)/6;
}
