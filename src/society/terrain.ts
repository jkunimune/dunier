/**
 * MIT License
 *
 * Copyright (c) 2021 Justin Kunimune
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import Queue from '../util/queue.js';
import {Surface, Triangle, Nodo} from "../planet/surface.js";
import {Random} from "../util/random.js";
import {argmax, union} from "../util/util.js";
import {Vector} from "../util/geometry.js";


const TERME_NOISE_LEVEL = 12;
const BARXE_NOISE_LEVEL = 1;
const MAX_NOISE_SCALE = 1/8;
const ATMOSPHERE_THICKNESS = 12; // km
const CLOUD_HEIGHT = 2; // km
const OROGRAPHIC_MAGNITUDE = 1;
const OROGRAPHIC_RANGE = 500; // km
const RAINFALL_NEEDED_TO_CREATE_MARSH = 1e7; // km^2

const TUNDRA_TEMP = -10; // °C
const DESERT_INTERCEPT = -30; // °C
const DESERT_SLOPE = 60; // °C/u
const TAIGA_TEMP = +5; // °C
const FLASH_TEMP = +50; // °C
const TROPIC_TEMP = +22; // °C
const FOREST_INTERCEPT = -40; // °C
const FOREST_SLOPE = 37; // °C/u
const MARSH_THRESH = 3.5; // u
const RIVER_THRESH = -25; // °C
const LAKE_THRESH = -0.1; // km

const OCEAN_DEPTH = 4; // km
const CONTINENT_VARIATION = .5; // km
const OCEANIC_VARIATION = 1; // km
const MOUNTAIN_HEIGHT = 4; // km
const VOLCANO_HEIGHT = 3.3; // km
const RIDGE_HEIGHT = 1.5; // km
const TRENCH_DEPTH = 4; // km
const MOUNTAIN_WIDTH = 400; // km
const TRENCH_WIDTH = 100; // km
const SLOPE_WIDTH = 200; // km
const RIDGE_WIDTH = 100; // km
const OCEAN_SIZE = 0.2; // as a fraction of continental length scale
const CONTINENTAL_CONVEXITY = 0.05; // between 0 and 1


enum FaultType {
	SAN,
	KAVE,
	NESIA,
	FENTOPIA,
	PANDE,
}


export enum Biome {
	HAI,
	LAK,
	AIS,
	TUNDRA,
	TAIGA,
	JANGAL,
	BARSAJANGAL,
	ARENATOPIA,
	GAZOTOPIA,
	FANTOPIA,
	AGNITOPIA,
}
export const BIOME_NAMES: Map<string, Biome> = new Map([
	["hai", Biome.HAI],
	["lak", Biome.LAK],
	["ais", Biome.AIS],
	["tundra", Biome.TUNDRA],
	["taiga", Biome.TAIGA],
	["jangal", Biome.JANGAL],
	["barsajangal", Biome.BARSAJANGAL],
	["arenatopia", Biome.ARENATOPIA],
	["gazotopia", Biome.GAZOTOPIA],
	["fantopia", Biome.FANTOPIA],
	["agnitopia", Biome.AGNITOPIA],
]);


/**
 * create all of the continents and biomes and rivers that go into the physical geography
 * of a good fictional world.
 * @param numContinents number of continents, equal to half the number of plates
 * @param seaLevel desired sea level in km
 * @param avgTerme some vaguely defined median temperature in Kelvin
 * @param surf the surface to modify
 * @param rng the seeded random number generator to use
 */
export function generateTerrain(numContinents: number, seaLevel: number, avgTerme: number, surf: Surface, rng: Random): void {
	generateContinents(numContinents, surf, rng);
	rng = rng.reset();
	movePlates(surf, rng);
	fillOcean(seaLevel, surf);
	rng = rng.reset();
	generateClimate(avgTerme, surf, rng); // TODO: I reely think I should have an avgRain parameter
	addRivers(surf);
	setBiomes(surf);
}

function generateClimate(avgTerme: number, surf: Surface, rng: Random): void {
	const maxScale = MAX_NOISE_SCALE*Math.sqrt(surf.area);
	for (const node of surf.nodos) { // assign each node random values
		node.terme = getNoiseFunction(node, node.parents, 'terme', surf, rng,
			maxScale, TERME_NOISE_LEVEL, 2);
		node.barxe = getNoiseFunction(node, node.parents, 'barxe', surf, rng,
			maxScale, BARXE_NOISE_LEVEL, 2);
	}

	for (const node of surf.nodos) { // and then throw in the baseline
		node.terme += Math.pow(
			surf.insolation(node.ф)*Math.exp(-node.gawe/ATMOSPHERE_THICKNESS),
			1/4.)*avgTerme - 273;
		node.barxe += surf.windConvergence(node.ф);
		const {nord, dong} = surf.windVelocity(node.ф);
		node.windVelocity = node.nord.times(nord).plus(node.dong.times(dong));
	}

	for (const node of surf.nodos)
		node.downwind = [];
	const queue = [];
	for (const node of surf.nodos) {
		let bestNode = null, bestDixe = null; // define node.upwind as the neighbor that is in the upwindest direction of each node
		for (const neighbor of node.neighbors.keys()) {
			const dix = neighbor.pos.minus(node.pos).norm();
			if (bestDixe === null ||
				dix.dot(node.windVelocity) < bestDixe.dot(node.windVelocity)) {
				bestNode = neighbor;
				bestDixe = dix;
			}
		}
		bestNode.downwind.push(node); // and make sure that all nodes know who is downwind of them
		if (node.biome === Biome.HAI) // also seed the orographic effect in the oceans
			queue.push({node: node, moisture: OROGRAPHIC_MAGNITUDE});
		if (node.gawe > CLOUD_HEIGHT) // and also remove some moisture from mountains
			node.barxe -= OROGRAPHIC_MAGNITUDE;
	}
	while (queue.length > 0) {
		const {node, moisture} = queue.pop(); // each node looks downwind
		node.barxe += moisture;
		for (const downwind of node.downwind) {
			if (downwind.biome !== Biome.HAI && downwind.gawe <= CLOUD_HEIGHT) { // land neighbors that are not separated by mountains
				const distance = node.neighbors.get(downwind).length;
				queue.push({
					node: downwind,
					moisture: moisture*Math.exp(-distance/OROGRAPHIC_RANGE/Math.sqrt(downwind.windVelocity.sqr()))}); // receive slightly less moisture than this one got
			}
		}
	}
}


/**
 * get the base planetary setup set up, with continents and plates and simple altitudes.
 * @param numPlates the desired number of plates (half will be oceanic, and half will be continental)
 * @param surf the surface on which to generate these continents
 * @param rng the seeded random number generator to use
 */
function generateContinents(numPlates: number, surf: Surface, rng: Random): void {
	const maxScale = MAX_NOISE_SCALE*Math.sqrt(surf.area);
	for (const node of surf.nodos) { // start by assigning plates
		if (node.index < numPlates) {
			node.plate = node.index; // the first few are seeds
			node.gawe = 0;
			rng.discrete(0, 0); // but call rng anyway to keep things consistent
		}
		else { // and the rest with a method similar to that above
			const prefParents: Nodo[] = [];
			for (const pair of node.between) { // if this node is directly between two nodes
				if (pair[0].plate === pair[1].plate) { // of the same plate
					if (!prefParents.includes(pair[0]))
						prefParents.push(pair[0]); // try to have it take the plate from one of them, to keep that plate together
					if (!prefParents.includes(pair[1]))
						prefParents.push(pair[1]);
				}
			}
			const options = (prefParents.length > 0) ? prefParents : node.parents;
			options.sort((a: Nodo, b: Nodo) => a.plate%2 - b.plate%2); // sort these by altitude to make the randomness more stable
			node.plate = options[rng.discrete(0, options.length)].plate; // in any case, just take the plate parent pseudorandomly
		}
	}

	for (const node of surf.nodos) { // refine the plate definitions
		if (node.plate !== node.index) {
			const count = new Array(numPlates).fill(0);
			for (const neighbor of node.neighbors.keys())
				count[neighbor.plate] ++;
			count[node.plate] += 0.5;
			node.plate = argmax(count); // to smooth out the plate borders at the finest level
		}
	}

	for (const node of surf.nodos) { // with plates finalized,
		node.gawe = getNoiseFunction(node,
			node.parents.filter(p => p.plate === node.plate), 'gawe',
			surf, rng, maxScale,
			(node.plate%2===0) ? CONTINENT_VARIATION : OCEANIC_VARIATION,
			1); // at last apply the noise function
	}

	for (const node of surf.nodos) { // once that's done, add in the plate altitude baselines
		if (node.plate%2 === 0)
			node.gawe += OCEAN_DEPTH/2; // order them so that adding and removing plates results in minimal change
		else
			node.gawe -= OCEAN_DEPTH/2;
	}
}


/**
 * apply plate tectonics to the surface!
 */
function movePlates(surf: Surface, rng: Random): void {
	const velocities = [];
	for (const node of surf.nodos) { // start by counting up all the plates
		if (node.plate >= velocities.length) // and assigning them random velocities // TODO allow for plate rotation in the tangent plane
			velocities.push(
				node.dong.times(rng.normal(0, Math.sqrt(.5))).plus(
				node.nord.times(rng.normal(0, Math.sqrt(.5))))); // orthogonal to the normal at their seeds
		else
			break;
	}

	const oceanWidth = OCEAN_SIZE*Math.sqrt(surf.area/velocities.length); // do a little dimensional analysis on the ocean scale

	const hpQueue: Queue<{node: Nodo, distance: number, width: number, speed: number, type: FaultType}> = new Queue([], (a, b) => a.distance - b.distance);
	const lpQueue: Queue<{node: Nodo, distance: number, width: number, speed: number, type: FaultType}> = new Queue([], (a, b) => a.distance - b.distance);
	for (const node of surf.nodos) { // now for phase 2:
		let fault = null;
		let minDistance = Number.POSITIVE_INFINITY;
		for (const neighbor of node.neighbors.keys()) { // look for adjacent nodes
			if (neighbor.plate !== node.plate) { // that are on different plates
				const distance = node.neighbors.get(neighbor).length;
				if (fault === null || distance < minDistance) {
					fault = neighbor;
					minDistance = distance;
				}
			}
		}

		if (fault !== null) { // if you found one,
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
			if (relSpeed < 0) { // TODO: make relspeed also depend on adjacent tiles to smooth out the fault lines and make better oceans
				if (node.gawe > 0 && fault.gawe > 0) {
					type = FaultType.SAN; // continental collision
					width = -relSpeed*MOUNTAIN_WIDTH*Math.sqrt(2);
				}
				else if (node.gawe < fault.gawe) {
					type = FaultType.KAVE; // deep sea trench
					width = TRENCH_WIDTH*Math.sqrt(2);
				}
				else {
					type = FaultType.NESIA; // island arc
					width = MOUNTAIN_WIDTH*Math.sqrt(2);
				}
			}
			else {
				if (node.gawe < 0) {
					type = FaultType.FENTOPIA; // mid-oceanic rift
					width = relSpeed*RIDGE_WIDTH*2;
				}
				else {
					type = FaultType.PANDE; // mid-oceanic rift plus continental slope (plus a little bit of convexity)
					width = 2*relSpeed*oceanWidth;
				}
			}
			const queueElement = {
				node: node, distance: minDistance/2, width: width,
				speed: Math.abs(relSpeed), type: type}; // add it to the queue
			if (type === FaultType.PANDE)	hpQueue.push(queueElement);
			else                    		lpQueue.push(queueElement); // which queue depends on priority
			// node.relSpeed = relSpeed;
		}
		// else
			// node.relSpeed = Number.NaN;

		node.flag = false; // also set up these temporary flags
	}

	for (const queue of [hpQueue, lpQueue]) { // now, we iterate through the queues
		while (!queue.empty()) { // in order of priority
			const {node, distance, width, speed, type} = queue.pop(); // each element of the queue is a node waiting to be affected by plate tectonics
			if (node.flag)  continue; // some of them may have already come up
			if (distance > width)   continue; // there's also always a possibility we are out of the range of influence of this fault
			if (type === FaultType.SAN) { // based on the type, find the height change as a function of distance
				const x = distance / (speed*MOUNTAIN_WIDTH);
				node.gawe += Math.sqrt(speed) * MOUNTAIN_HEIGHT * // continent-continent ranges are even
					bellCurve(x) * wibbleCurve(x); // (the sinusoidal term makes it a little more rugged)
			}
			else if (type === FaultType.KAVE) {
				const x = distance / TRENCH_WIDTH;
				node.gawe -= speed * TRENCH_DEPTH *
					digibbalCurve(x) * wibbleCurve(x); // while subductive faults are odd
			}
			else if (type === FaultType.NESIA) {
				const x = distance / MOUNTAIN_WIDTH;
				node.gawe += speed * VOLCANO_HEIGHT *
					digibbalCurve(x) * wibbleCurve(x);
			}
			else if (type === FaultType.FENTOPIA) {
				const width = speed*oceanWidth;
				const x0 = Math.min(0, width - 2*SLOPE_WIDTH - 2*RIDGE_WIDTH);
				const xR = (distance - x0) / RIDGE_WIDTH;
				node.gawe += RIDGE_HEIGHT * Math.exp(-xR);
			}
			else if (type === FaultType.PANDE) {
				const width = speed*oceanWidth; // passive margins are kind of complicated
				const x0 = Math.min(0, width - 2*SLOPE_WIDTH - 2*RIDGE_WIDTH);
				const xS = (width - distance) / SLOPE_WIDTH;
				const xR = (distance - x0) / RIDGE_WIDTH;
				node.gawe += Math.min(
					OCEAN_DEPTH * (Math.exp(-xS) - 1) + RIDGE_HEIGHT * Math.exp(-xR),
					-OCEAN_DEPTH/2 / (1 + Math.exp(xS/2.)/CONTINENTAL_CONVEXITY));
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
 * @param level the altitude up to which to fill
 * @param surf the surface
 */
function fillOcean(level: number, surf: Surface): void {
	let bestStart = null; // the size of the ocean depends heavily on where we start
	let bestSize = 0;
	while (true) { // we want to find the start point that maximizes that size
		let start = null;
		for (const node of surf.nodos) {
			if (node.biome !== Biome.HAI && node.gawe <= level &&
				(start === null || node.gawe < start.gawe)) // the lowest point that we haven't already tried is a good way to test
				start = node;
		}
		if (start === null) // stop when we can't find any suitable starts
			break;
		let size = floodFrom(start, level);
		if (size > bestSize) {
			bestStart = start;
			bestSize = size;
		}
		if (size > surf.nodos.size/2) // or if we find one that fills over half the nodes
			break;
	}

	if (bestStart === null)
		return; // it's theoretically possible there wasn't any suitable start point. shikata wa nai yo.

	for (const node of surf.nodos) // finally, clear all attempts
		node.biome = null;
	floodFrom(bestStart, level); // and set it so that just the best start point is filled in

	for (const node of surf.nodos) // and set sea level to 0
		node.gawe -= level;
}


/**
 * give the surface some rivers to draw, and also set up some nearby lakes.
 * @param surf the Surface on which this takes place
 */
function addRivers(surf: Surface): void {
	for (const vertex of surf.triangles) {
		vertex.gawe = 0; // first define altitudes for vertices, which only matters for this one purpose
		for (const tile of vertex.vertices)
			vertex.gawe += tile.gawe/vertex.vertices.length;
	}

	const riverDistance: Map<Nodo | Triangle, number> = new Map();

	const nadeQueue: Queue<{nice: Nodo | Triangle, supr: Triangle, slope: number}> = new Queue(
		[], (a, b) => b.slope - a.slope); // start with a queue of rivers forming from their deltas
	for (const vertex of surf.triangles) { // fill it initially with coastal vertices that are guaranteed to flow into the ocean
		for (const tile of vertex.vertices) {
			if (tile.biome === Biome.HAI) {
				riverDistance.set(tile, 0);
				nadeQueue.push({nice: tile, supr: vertex, slope: Number.POSITIVE_INFINITY});
				break;
			}
		}
	}

	while (!nadeQueue.empty()) { // then iteratively extend them
		const {nice, supr} = nadeQueue.pop(); // pick out the steepest potential river
		if (supr.liwonice === undefined) { // if it's available
			supr.liwonice = nice; // take it
			riverDistance.set(supr, riverDistance.get(nice) + 1); // number of steps to delta
			for (const beyond of supr.neighbors.keys()) { // then look for what comes next
				if (beyond !== null) {
					if (beyond.liwonice === undefined) { // (it's a little redundant, but checking availability here, as well, saves some time)
						let slope = beyond.gawe - supr.gawe;
						if (slope > 0)
							slope = surf.distance(beyond, supr); // only normalize slope by run if it is downhill
						nadeQueue.push({nice: supr, supr: beyond, slope: slope});
					}
				}
			}
		}
	}

	for (const vertex of surf.triangles) {
		vertex.liwe = 0; // define this temporary variable real quick...
		for (const edge of vertex.neighbors.values())
			edge.liwe = 0;
	}

	surf.rivers = new Set();

	const liweQueue = new Queue([...surf.triangles],
		(a: Triangle, b: Triangle) => riverDistance.get(b) - riverDistance.get(a)); // now we need to flow the water downhill
	const unitArea = surf.area/surf.nodos.size;
	while (!liweQueue.empty()) {
		const vertex = liweQueue.pop(); // at each river vertex
		if (vertex.liwonice instanceof Triangle) {
			for (const tile of vertex.vertices) { // compute the sum of rainfall and inflow (with some adjustments)
				let nadasle = 1; // base river yield is 1 per tile
				nadasle += tile.barxe - (tile.terme - DESERT_INTERCEPT) / DESERT_SLOPE; // add in biome factor
				nadasle += tile.gawe / CLOUD_HEIGHT; // add in mountain sources
				if (nadasle > 0 && tile.terme >= RIVER_THRESH) // this could lead to evaporation, but I'm not doing that because it would look ugly
					vertex.liwe += nadasle * unitArea/tile.neighbors.size;
			}
			vertex.liwonice.liwe += vertex.liwe; // and pass that flow onto the downstream tile
			vertex.neighbors.get(vertex.liwonice).liwe = vertex.liwe;
		}
		surf.rivers.add([vertex, vertex.liwonice]);
	}

	const lageQueue = [...surf.nodos].filter((n: Nodo) => !surf.edge.has(n));
	queue:
	while (lageQueue.length > 0) { // now look at the tiles
		const tile = lageQueue.pop(); // TODO: make lakes more likely to appear on large rivers
		if (tile.isWater() || tile.terme < RIVER_THRESH)
			continue; // ignoring things that are already water or too cold for this

		let seenRightEdge = false; // check that there is up to 1 continuous body of water at its border
		let outflow = null; // and while you're at it, locate the downstreamest river flowing away
		const start = <Nodo>tile.neighbors.keys()[Symbol.iterator]().next().value; // pick an arbitrary neighbor
		let last = start;
		do {
			const vertex = tile.leftOf(last); // look at the vertex next to it
			const next = vertex.widershinsOf(last);
			if (next.biome === Biome.HAI) // ocean adjacent tiles have a slight possibility of become lakes.
				continue queue; // don't let it happen
			const lastIsWater = tile.neighbors.get(last).liwe > 0 || last.biome === Biome.LAK;
			const nextIsWater = tile.neighbors.get(next).liwe > 0 || next.biome === Biome.LAK;
			const betweenIsWater = last.neighbors.get(next).liwe > 0;
			if ((!lastIsWater && nextIsWater) || (!lastIsWater && !nextIsWater && betweenIsWater)) { // if this has the right edge of a body of water
				if (seenRightEdge) // if there's already been a right edge
					continue queue; // then it's not contiguous and this tile is not eligible
				else
					seenRightEdge = true;
			}
			if (outflow === null || riverDistance.get(vertex) <= riverDistance.get(outflow)) // find the vertex with the most ultimate flow
				outflow = vertex;
			last = next;
		} while (last !== start);
		if (!seenRightEdge) // if there wasn't _any_ adjacent water
			continue; // then there's nothing to feed the lake

		if (outflow !== null && outflow.gawe - outflow.liwonice.gawe < LAKE_THRESH) { // if we made it through all that, make an altitude check
			tile.biome = Biome.LAK; // and assign lake status. you've earned it, tile.
			for (const neighbor of tile.neighbors.keys())
				lageQueue.push(); // tell your friends.
		}
	}
}


/**
 * assign biomes to all unassigned tiles according to simple rules.
 * @param surf the surface to which we're doing this
 */
function setBiomes(surf: Surface): void {
	for (const node of surf.nodos) {
		let adjacentWater = false;
		for (const neighbor of node.neighbors.keys())
			if (neighbor.biome === Biome.HAI || neighbor.biome === Biome.LAK ||
					node.neighbors.get(neighbor).liwe > RAINFALL_NEEDED_TO_CREATE_MARSH)
				adjacentWater = true;

		if (node.biome === null) {
			if (node.terme < RIVER_THRESH)
				node.biome = Biome.AIS;
			else if (node.terme < TUNDRA_TEMP)
				node.biome = Biome.TUNDRA;
			else if (node.terme > DESERT_SLOPE*node.barxe + DESERT_INTERCEPT)
				node.biome = Biome.ARENATOPIA;
			else if (node.terme < TAIGA_TEMP)
				node.biome = Biome.TAIGA;
			else if (node.terme > FLASH_TEMP)
				node.biome = Biome.AGNITOPIA;
			else if (node.terme > FOREST_SLOPE*node.barxe + FOREST_INTERCEPT)
				node.biome = Biome.GAZOTOPIA;
			else if (node.barxe >= MARSH_THRESH && node.gawe < CLOUD_HEIGHT && adjacentWater)
				node.biome = Biome.FANTOPIA;
			else if (node.terme < TROPIC_TEMP)
				node.biome = Biome.JANGAL;
			else
				node.biome = Biome.BARSAJANGAL;
		}
	}
}

/**
 * fill all tiles that are connected to start by a chain of nodes that are at or below level with ocean. then, return
 * the number of tiles that could be flooded this way.
 * @param start
 * @param level
 */
function floodFrom(start: Nodo, level: number): number {
	let numFilled = 0;
	const queue = new Queue([start], (a, b) => a.gawe - b.gawe); // it shall seed our ocean
	while (!queue.empty() && queue.peek().gawe <= level) { // flood all available nodes
		const next = queue.pop();
		if (next.biome !== Biome.HAI) {
			next.biome = Biome.HAI;
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
 * @param parents Array of Nodos that will influence it
 * @param attr identifier of attribute that is being compared and set
 * @param surf Surface on which the algorithm takes place
 * @param rng Random to use for the values
 * @param maxScale the scale above which values are not correlated
 * @param level noise magnitude scalar
 * @param slope logarithmic rate at which noise dies off with distance
 * @return the value of attr this node should take
 */
function getNoiseFunction(node: Nodo, parents: Nodo[], attr: string, surf: Surface, rng: Random,
						  maxScale: number, level: number, slope: number): number {
	let scale = 0;
	let weightSum = 0;
	let value = 0;
	for (const parent of parents) {
		const dist = surf.distance(node, parent); // look at parent distances
		let parentValue;
		if (attr === 'gawe')       parentValue = parent.gawe;
		else if (attr === 'terme') parentValue = parent.terme;
		else if (attr === 'barxe') parentValue = parent.barxe;
		else throw `no funcubli sife - parent.${attr}`;
		scale += dist/parents.length; // compute the mean scale // TODO might save some time if I save these distances
		weightSum += 1/dist;
		value += parentValue/dist; // compute the weighted average of them
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

function bellCurve(x: number): number {
	return (1 - x*x*(1 - x*x/4));
}

function digibbalCurve(x: number): number {
	return Math.sqrt(3125/512)*x*(1 - x*x*(1 - x*x/4));
}

function wibbleCurve(x: number): number {
	return 1 + Math.cos(12*Math.PI*x)/6;
}
