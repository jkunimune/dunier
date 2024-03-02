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
import Queue from '../datastructures/queue';
import {Surface, Vertex, Tile} from "../planet/surface.js";
import {Random} from "../util/random.js";
import {argmax, union} from "../util/util.js";
import {Vector} from "../util/geometry.js";
import { delaunayTriangulate } from '../util/delaunay.js';


const TILE_AREA = 30000; // target area of a tile in km^2
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
const RIVER_WIDTH = 10; // km
const CANYON_DEPTH = 0.1; // km
const LAKE_THRESH = -0.07; // km

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
	CONTINENT_COLLISION,
	SEA_TRENCH,
	ISLAND_ARC,
	OCEANIC_RIFT,
	RIFT_WITH_SLOPE,
}


export enum Biome {
	OCEAN,
	LAKE,
	ICE,
	TUNDRA,
	TAIGA,
	FOREST,
	JUNGLE,
	DESERT,
	PLAINS,
	SWAMP,
	STEAMLAND,
}
export const BIOME_NAMES: Map<string, Biome> = new Map([
	["ocean", Biome.OCEAN],
	["lake", Biome.LAKE],
	["ice", Biome.ICE],
	["tundra", Biome.TUNDRA],
	["taiga", Biome.TAIGA],
	["forest", Biome.FOREST],
	["jungle", Biome.JUNGLE],
	["desert", Biome.DESERT],
	["plains", Biome.PLAINS],
	["swamp", Biome.SWAMP],
	["steamland", Biome.STEAMLAND],
]);


/**
 * fill this.tiles with random tiles.
 */
export function populateSurface(surf: Surface, rng: Random): void {
	// generate the tiles
	const tiles: Tile[] = []; // remember to clear the old tiles, if necessary
	for (let i = 0; i < Math.max(100, surf.area/TILE_AREA); i ++)
		tiles.push(new Tile(i, surf.drawRandomPoint(rng), surf)); // push a bunch of new ones
	surf.tiles = new Set(tiles); // keep that list, but save it as a set as well

	// seed the surface
	const partition = surf.partition();

	// call the delaunay triangulation subroutine
	const triangulation = delaunayTriangulate(
		tiles.map((n: Tile) => n.pos),
		tiles.map((n: Tile) => n.normal),
		partition.nodos.map((n: Tile) => n.pos),
		partition.nodos.map((n: Tile) => n.normal),
		partition.triangles.map((t: Vertex) => t.tiles.map((n: Tile) => partition.nodos.indexOf(n)))
	);
	surf.vertices = new Set(); // unpack the resulting Voronoi vertices
	for (const [ia, ib, ic] of triangulation.triangles) {
		surf.vertices.add(new Vertex(tiles[ia], tiles[ib], tiles[ic])); // this will automatically generate the Edges
	}
	for (let i = 0; i < tiles.length; i ++) {
		for (const j of triangulation.parentage[i]) // as well as the parentage
			tiles[i].parents.push(tiles[j]);
		for (const [j, k] of triangulation.between[i]) // and separation information
			tiles[i].between.push([tiles[j], tiles[k]]);
	}

	// after all that's through, some tiles won't have any parents
	for (let i = 1; i < tiles.length; i ++) {
		if (tiles[i].parents.length === 0) { // if that's so,
			const orphan = tiles[i];
			let closest = null; // the easiest thing to do is to just assign it the closest tile that came before it using the list
			let minDistance = Number.POSITIVE_INFINITY;
			for (let j = 0; j < orphan.index; j ++) {
				const distance = surf.distance(tiles[j], orphan);
				if (distance < minDistance) {
					minDistance = distance;
					closest = tiles[j];
				}
			}
			orphan.parents = [closest];
		}
	}

	// do any geometric upkeep to make all the Tiles and Vertexes consistent
	surf.computeGraph();
}


/**
 * create all of the continents and biomes and rivers that go into the physical geography
 * of a good fictional world.
 * @param numContinents number of continents, equal to half the number of plates
 * @param seaLevel desired sea level in km
 * @param meanTemperature some vaguely defined median temperature in Kelvin
 * @param surf the surface to modify
 * @param rng the seeded random number generator to use
 */
export function generateTerrain(numContinents: number, seaLevel: number, meanTemperature: number, surf: Surface, rng: Random): void {
	generateContinents(numContinents, surf, rng);
	rng = rng.reset();
	movePlates(surf, rng);
	fillOcean(seaLevel, surf);
	rng = rng.reset();
	generateClimate(meanTemperature, surf, rng); // TODO: I reely think I should have an avgRain parameter
	addRivers(surf);
	setBiomes(surf);
}


/**
 * get the base planetary setup set up, with continents and plates and simple altitudes.
 * @param numPlates the desired number of plates (half will be oceanic, and half will be continental)
 * @param surf the surface on which to generate these continents
 * @param rng the seeded random number generator to use
 */
function generateContinents(numPlates: number, surf: Surface, rng: Random): void {
	const maxScale = MAX_NOISE_SCALE*Math.sqrt(surf.area);
	for (const tile of surf.tiles) { // start by assigning plates
		if (tile.index < numPlates) {
			tile.plateIndex = tile.index; // the first few are seeds
			tile.height = 0;
			rng.next(); // but call rng anyway to keep things consistent
		}
		else { // and the rest with a method similar to that above
			const prefParents: Tile[] = [];
			for (const pair of tile.between) { // if this tile is directly between two tiles
				if (pair[0].plateIndex === pair[1].plateIndex) { // of the same plate
					if (!prefParents.includes(pair[0]))
						prefParents.push(pair[0]); // try to have it take the plate from one of them, to keep that plate together
					if (!prefParents.includes(pair[1]))
						prefParents.push(pair[1]);
				}
			}
			const options = (prefParents.length > 0) ? prefParents : tile.parents;
			options.sort((a: Tile, b: Tile) => a.plateIndex%2 - b.plateIndex%2); // sort these by altitude to make the randomness more stable
			tile.plateIndex = options[rng.discrete(0, options.length)].plateIndex; // in any case, just take the plate parent pseudorandomly
		}
	}

	for (const tile of surf.tiles) { // refine the plate definitions
		if (tile.plateIndex !== tile.index) {
			const count = new Array(numPlates).fill(0);
			for (const neighbor of tile.neighbors.keys())
				count[neighbor.plateIndex] ++;
			count[tile.plateIndex] += 0.5;
			tile.plateIndex = argmax(count); // to smooth out the plate borders at the finest level
		}
	}

	for (const tile of surf.tiles) { // with plates finalized,
		tile.height = getNoiseFunction(tile,
			tile.parents.filter(p => p.plateIndex === tile.plateIndex), 'height',
			surf, rng, maxScale,
			(tile.plateIndex%2===0) ? CONTINENT_VARIATION : OCEANIC_VARIATION,
			1); // at last apply the noise function
	}

	for (const tile of surf.tiles) { // once that's done, add in the plate altitude baselines
		if (tile.plateIndex%2 === 0)
			tile.height += OCEAN_DEPTH/2; // order them so that adding and removing plates results in minimal change
		else
			tile.height -= OCEAN_DEPTH/2;
	}
}


/**
 * apply plate tectonics to the surface!
 */
function movePlates(surf: Surface, rng: Random): void {
	const velocities = [];
	for (const tile of surf.tiles) { // start by counting up all the plates
		if (tile.plateIndex >= velocities.length) // and assigning them random velocities // TODO allow for plate rotation in the tangent plane
			velocities.push(
				tile.east.times(rng.normal(0, Math.sqrt(.5))).plus(
				tile.north.times(rng.normal(0, Math.sqrt(.5))))); // orthogonal to the normal at their seeds
		else
			break;
	}

	const oceanWidth = OCEAN_SIZE*Math.sqrt(surf.area/velocities.length); // do a little dimensional analysis on the ocean scale

	const hpQueue: Queue<{tile: Tile, distance: number, width: number, speed: number, type: FaultType}> = new Queue([], (a, b) => a.distance - b.distance);
	const lpQueue: Queue<{tile: Tile, distance: number, width: number, speed: number, type: FaultType}> = new Queue([], (a, b) => a.distance - b.distance);
	for (const tile of surf.tiles) { // now for phase 2:
		let fault = null;
		let minDistance = Number.POSITIVE_INFINITY;
		for (const neighbor of tile.neighbors.keys()) { // look for adjacent tiles
			if (neighbor.plateIndex !== tile.plateIndex) { // that are on different plates
				const distance = tile.neighbors.get(neighbor).distance;
				if (fault === null || distance < minDistance) {
					fault = neighbor;
					minDistance = distance;
				}
			}
		}

		if (fault !== null) { // if you found one,
			let tilePos = new Vector(0, 0, 0); // do some additional computation to smooth out the boundaries
			let faultPos = new Vector(0, 0, 0);
			let tileMass = 0, faultMass = 0;
			for (const t of union(tile.neighbors.keys(), fault.neighbors.keys())) {
				if (t.plateIndex === tile.plateIndex) {
					tilePos = tilePos.plus(t.pos);
					tileMass ++;
				}
				else if (t.plateIndex === fault.plateIndex) {
					faultPos = faultPos.plus(t.pos);
					faultMass ++;
				}
			}
			const relPosition = tilePos.over(tileMass).minus(faultPos.over(faultMass));
			const relVelocity = velocities[tile.plateIndex].minus(velocities[fault.plateIndex]);
			const relSpeed = relPosition.normalized().dot(relVelocity); // determine the relSpeed at which they are moving away from each other
			let type, width; // and whether these are both continents or if this is a top or a bottom or what
			if (relSpeed < 0) { // TODO: make relspeed also depend on adjacent tiles to smooth out the fault lines and make better oceans
				if (tile.height > 0 && fault.height > 0) {
					type = FaultType.CONTINENT_COLLISION; // continental collision
					width = -relSpeed*MOUNTAIN_WIDTH*Math.sqrt(2);
				}
				else if (tile.height < fault.height) {
					type = FaultType.SEA_TRENCH; // deep sea trench
					width = TRENCH_WIDTH*Math.sqrt(2);
				}
				else {
					type = FaultType.ISLAND_ARC; // island arc
					width = MOUNTAIN_WIDTH*Math.sqrt(2);
				}
			}
			else {
				if (tile.height < 0) {
					type = FaultType.OCEANIC_RIFT; // mid-oceanic rift
					width = relSpeed*RIDGE_WIDTH*2;
				}
				else {
					type = FaultType.RIFT_WITH_SLOPE; // mid-oceanic rift plus continental slope (plus a little bit of convexity)
					width = 2*relSpeed*oceanWidth;
				}
			}
			const queueElement = {
				tile: tile, distance: minDistance/2, width: width,
				speed: Math.abs(relSpeed), type: type}; // add it to the queue
			if (type === FaultType.RIFT_WITH_SLOPE)
				hpQueue.push(queueElement);
			else
				lpQueue.push(queueElement); // which queue depends on priority
			// tile.relSpeed = relSpeed;
		}
		// else
			// tile.relSpeed = Number.NaN;

		tile.flag = false; // also set up these temporary flags
	}

	for (const queue of [hpQueue, lpQueue]) { // now, we iterate through the queues
		while (!queue.empty()) { // in order of priority
			const {tile, distance, width, speed, type} = queue.pop(); // each element of the queue is a tile waiting to be affected by plate tectonics
			if (tile.flag)  continue; // some of them may have already come up
			if (distance > width)   continue; // there's also always a possibility we are out of the range of influence of this fault
			if (type === FaultType.CONTINENT_COLLISION) { // based on the type, find the height change as a function of distance
				const x = distance / (speed*MOUNTAIN_WIDTH);
				tile.height += Math.sqrt(speed) * MOUNTAIN_HEIGHT * // continent-continent ranges are even
					bellCurve(x) * wibbleCurve(x); // (the sinusoidal term makes it a little more rugged)
			}
			else if (type === FaultType.SEA_TRENCH) {
				const x = distance / TRENCH_WIDTH;
				tile.height -= speed * TRENCH_DEPTH *
					digibbalCurve(x) * wibbleCurve(x); // while subductive faults are odd
			}
			else if (type === FaultType.ISLAND_ARC) {
				const x = distance / MOUNTAIN_WIDTH;
				tile.height += speed * VOLCANO_HEIGHT *
					digibbalCurve(x) * wibbleCurve(x);
			}
			else if (type === FaultType.OCEANIC_RIFT) {
				const width = speed*oceanWidth;
				const x0 = Math.min(0, width - 2*SLOPE_WIDTH - 2*RIDGE_WIDTH);
				const xR = (distance - x0) / RIDGE_WIDTH;
				tile.height += RIDGE_HEIGHT * Math.exp(-xR);
			}
			else if (type === FaultType.RIFT_WITH_SLOPE) {
				const width = speed*oceanWidth; // passive margins are kind of complicated
				const x0 = Math.min(0, width - 2*SLOPE_WIDTH - 2*RIDGE_WIDTH);
				const xS = (width - distance) / SLOPE_WIDTH;
				const xR = (distance - x0) / RIDGE_WIDTH;
				tile.height += Math.min(
					OCEAN_DEPTH * (Math.exp(-xS) - 1) + RIDGE_HEIGHT * Math.exp(-xR),
					-OCEAN_DEPTH/2 / (1 + Math.exp(xS/2.)/CONTINENTAL_CONVEXITY));
			}
			else {
				throw "Unrecognized fault type";
			}

			tile.flag = true; // mark this tile
			for (const neighbor of tile.neighbors.keys()) // and add its neighbors to the queue
				if (neighbor.plateIndex === tile.plateIndex)
					queue.push({
						tile: neighbor,
						distance: distance + tile.neighbors.get(neighbor).distance,
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
	let remainingUnchecked = surf.tiles.size;
	let bestSize = 0;
	for (const start of surf.tiles) { // we want to find the start point that maximizes that size
		if (start.biome === Biome.OCEAN) // use biome = OCEAN to mark tiles we've checked
			continue; // and don't check them twice
		if (start.height > level) { // skip past points above sea level
			remainingUnchecked -= 1;
		}
		else { // for unchecked points below sea level
			let size = floodFrom(start, level); // try putting an ocean here
			remainingUnchecked -= size;
			if (size > bestSize) { // see if it's bigger than any oceans we've found thus far
				bestStart = start;
				bestSize = size;
			}
			if (remainingUnchecked <= bestSize) // stop when it's no longer possible to find a bigger ocean
				break;
		}
	}

	if (bestStart === null)
		return; // it's theoretically possible that *everything* was above sea level.  in which case eh.

	for (const tile of surf.tiles) // clear out all the ocean you put down
		tile.biome = null;
	floodFrom(bestStart, level); // and re-flood the best one you found

	for (const tile of surf.tiles) // and redefine altitude so sea level is 0
		tile.height -= level;
}


function generateClimate(avgTerme: number, surf: Surface, rng: Random): void {
	const maxScale = MAX_NOISE_SCALE*Math.sqrt(surf.area);
	for (const tile of surf.tiles) { // assign each tile random values
		tile.temperature = getNoiseFunction(tile, tile.parents, 'temperature', surf, rng,
			maxScale, TERME_NOISE_LEVEL, 2);
		tile.rainfall = getNoiseFunction(tile, tile.parents, 'rainfall', surf, rng,
			maxScale, BARXE_NOISE_LEVEL, 2);
	}

	for (const tile of surf.tiles) { // and then throw in the baseline
		tile.temperature += Math.pow(
			surf.insolation(tile.ф)*Math.exp(-tile.height/ATMOSPHERE_THICKNESS),
			1/4.)*avgTerme - 273;
		tile.rainfall += surf.windConvergence(tile.ф);
		const {north, east} = surf.windVelocity(tile.ф);
		tile.windVelocity = tile.north.times(north).plus(tile.east.times(east));
	}

	for (const tile of surf.tiles)
		tile.downwind = [];
	const queue = [];
	for (const tile of surf.tiles) {
		let bestTile = null, bestDixe = null; // define tile.upwind as the neighbor that is in the upwindest direction of each tile
		for (const neighbor of tile.neighbors.keys()) {
			const dix = neighbor.pos.minus(tile.pos).normalized();
			if (bestDixe === null ||
				dix.dot(tile.windVelocity) < bestDixe.dot(tile.windVelocity)) {
				bestTile = neighbor;
				bestDixe = dix;
			}
		}
		bestTile.downwind.push(tile); // and make sure that all tiles know who is downwind of them
		if (tile.biome === Biome.OCEAN) // also seed the orographic effect in the oceans
			queue.push({tile: tile, moisture: OROGRAPHIC_MAGNITUDE});
		if (tile.height > CLOUD_HEIGHT) // and also remove some moisture from mountains
			tile.rainfall -= OROGRAPHIC_MAGNITUDE;
	}
	while (queue.length > 0) {
		const {tile: tile, moisture} = queue.pop(); // each tile looks downwind
		tile.rainfall += moisture;
		for (const downwind of tile.downwind) {
			if (downwind.biome !== Biome.OCEAN && downwind.height <= CLOUD_HEIGHT) { // land neighbors that are not separated by mountains
				const distance: number = tile.neighbors.get(downwind).length;
				queue.push({
					tile: downwind,
					moisture: moisture*Math.exp(-distance/OROGRAPHIC_RANGE/Math.sqrt(downwind.windVelocity.sqr()))}); // receive slightly less moisture than this one got
			}
		}
	}
}


/**
 * give the surface some rivers to draw, and also set up some nearby lakes.
 * @param surf the Surface on which this takes place
 */
function addRivers(surf: Surface): void {
	for (const vertex of surf.vertices) {
		vertex.height = 0; // first define altitudes for vertices, which only matters for this one purpose
		for (const tile of vertex.tiles)
			vertex.height += tile.height/vertex.tiles.length;
		vertex.downstream = null; // also initialize this
	}

	const riverOrder: Map<Vertex, number> = new Map();
	const riverStack: Array<Vertex> = [];
	const riverQueue: Queue<{below: Tile | Vertex, above: Vertex, maxHeight: number, uphillLength: number, quality: number}> = new Queue(
		[], (a, b) => b.quality - a.quality); // start with a queue of rivers forming from their deltas

	for (const vertex of surf.vertices) { // fill it initially with coastal vertices that are guaranteed to flow into the ocean
		for (const tile of vertex.tiles) {
			if (tile.biome === Biome.OCEAN) {
				riverQueue.push({
					below: tile, above: vertex,
					maxHeight: 0, uphillLength: 0,
					quality: Number.POSITIVE_INFINITY,
				});
				break;
			}
		}
	}

	while (!riverQueue.empty()) { // then iteratively extend them
		const {below, above, maxHeight, uphillLength} = riverQueue.pop(); // pick out the steepest potential river
		if (above.downstream === null) { // if it's available
			above.downstream = below; // take it
			riverOrder.set(above, riverStack.length); // track the number of steps from the delta
			riverStack.push(above); // cue it up for the flow calculation later
			for (const beyond of above.neighbors.keys()) { // then look for what comes next
				if (beyond !== null) {
					if (beyond.downstream === null) { // (it's a little redundant, but checking availability here, as well, saves some time)
						if (beyond.height >= maxHeight - CANYON_DEPTH) {
							const length = surf.distance(beyond, above);
							let quality; // decide how good a river this would be
							if (length < RIVER_WIDTH)
								quality = Number.POSITIVE_INFINITY;
							else if (beyond.height >= above.height) // calculate the slope for downhill rivers
								quality = (beyond.height - above.height)/length;
							else // calculate the amount of canyon you would need for an uphill river
								quality = -(uphillLength + length);
							riverQueue.push({
								below: above, above: beyond,
								maxHeight: Math.max(maxHeight, beyond.height),
								uphillLength: uphillLength + ((beyond.height < above.height) ? length : 0),
								quality: quality,
							});
						}
					}
				}
			}
		}
	}

	for (const vertex of surf.vertices) {
		vertex.flow = 0; // define this temporary variable real quick...
		for (const edge of vertex.neighbors.values())
			edge.flow = 0;
	}

	surf.rivers = new Set();

	// now we need to propagate water downhill to calculate flow rates
	const unitArea = surf.area/surf.tiles.size;
	while (riverStack.length > 0) {
		const vertex = riverStack.pop(); // at each river vertex
		if (vertex.downstream instanceof Vertex) {
			for (const tile of vertex.tiles) { // compute the sum of rainfall and inflow (with some adjustments)
				let nadasle = 1; // base river yield is 1 per tile
				nadasle += tile.rainfall - (tile.temperature - DESERT_INTERCEPT) / DESERT_SLOPE; // add in biome factor
				nadasle += tile.height / CLOUD_HEIGHT; // add in mountain sources
				if (nadasle > 0 && tile.temperature >= RIVER_THRESH) // this could lead to evaporation, but I'm not doing that because it would look ugly
					vertex.flow += nadasle * unitArea/tile.neighbors.size;
			}
			vertex.downstream.flow += vertex.flow; // and pass that flow onto the downstream tile
			vertex.neighbors.get(vertex.downstream).flow = vertex.flow;
		}
		surf.rivers.add([vertex, vertex.downstream]);
	}

	const lageQueue = [...surf.tiles].filter((n: Tile) => !surf.edge.has(n));
	queue:
	while (lageQueue.length > 0) { // now look at the tiles
		const tile = lageQueue.pop(); // TODO: make lakes more likely to appear on large rivers
		if (tile.isWater() || tile.temperature < RIVER_THRESH)
			continue; // ignoring things that are already water or too cold for this

		let seenRightEdge = false; // check that there is up to 1 continuous body of water at its border
		let outflow = null; // and while you're at it, locate the downstreamest river flowing away
		const start = <Tile>tile.neighbors.keys()[Symbol.iterator]().next().value; // pick an arbitrary neighbor
		let last = start;
		do {
			const vertex = tile.leftOf(last); // look at the vertex next to it
			const next = vertex.widershinsOf(last);
			if (next.biome === Biome.OCEAN) // ocean adjacent tiles have a slight possibility of become lakes.
				continue queue; // don't let it happen
			const lastIsWater = tile.neighbors.get(last).flow > 0 || last.biome === Biome.LAKE;
			const nextIsWater = tile.neighbors.get(next).flow > 0 || next.biome === Biome.LAKE;
			const betweenIsWater = last.neighbors.get(next).flow > 0;
			if ((!lastIsWater && nextIsWater) || (!lastIsWater && !nextIsWater && betweenIsWater)) { // if this has the right edge of a body of water
				if (seenRightEdge) // if there's already been a right edge
					continue queue; // then it's not contiguous and this tile is not eligible
				else
					seenRightEdge = true;
			}
			if (outflow === null || riverOrder.get(vertex) <= riverOrder.get(outflow)) // find the vertex with the most ultimate flow
				outflow = vertex;
			last = next;
		} while (last !== start);
		if (!seenRightEdge) // if there wasn't _any_ adjacent water
			continue; // then there's nothing to feed the lake

		if (outflow !== null && outflow.downstream !== null &&
			outflow.height - outflow.downstream.height < LAKE_THRESH) { // if we made it through all that, make an altitude check
			tile.biome = Biome.LAKE; // and assign lake status. you've earned it, tile.
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
	for (const tile of surf.tiles) {
		let adjacentWater = false;
		for (const neighbor of tile.neighbors.keys())
			if (neighbor.biome === Biome.OCEAN || neighbor.biome === Biome.LAKE ||
					tile.neighbors.get(neighbor).flow > RAINFALL_NEEDED_TO_CREATE_MARSH)
				adjacentWater = true;

		if (tile.biome === null) {
			if (tile.temperature < RIVER_THRESH)
				tile.biome = Biome.ICE;
			else if (tile.temperature < TUNDRA_TEMP)
				tile.biome = Biome.TUNDRA;
			else if (tile.temperature > DESERT_SLOPE*tile.rainfall + DESERT_INTERCEPT)
				tile.biome = Biome.DESERT;
			else if (tile.temperature < TAIGA_TEMP)
				tile.biome = Biome.TAIGA;
			else if (tile.temperature > FLASH_TEMP)
				tile.biome = Biome.STEAMLAND;
			else if (tile.temperature > FOREST_SLOPE*tile.rainfall + FOREST_INTERCEPT)
				tile.biome = Biome.PLAINS;
			else if (tile.rainfall >= MARSH_THRESH && tile.height < CLOUD_HEIGHT && adjacentWater)
				tile.biome = Biome.SWAMP;
			else if (tile.temperature < TROPIC_TEMP)
				tile.biome = Biome.FOREST;
			else
				tile.biome = Biome.JUNGLE;
		}
	}
}

/**
 * fill all tiles that are connected to start by a chain of Tiles that are at or below level with ocean. then, return
 * the number of tiles that could be flooded this way.
 * @param start
 * @param level
 */
function floodFrom(start: Tile, level: number): number {
	let numFilled = 0;
	const queue = new Queue([start], (a, b) => a.height - b.height); // it shall seed our ocean
	while (!queue.empty() && queue.peek().height <= level) { // flood all available tiles
		const next = queue.pop();
		if (next.biome !== Biome.OCEAN) {
			next.biome = Biome.OCEAN;
			numFilled ++;
			for (const neighbor of next.neighbors.keys())
				queue.push(neighbor); // spreading the water to their neighbors
		}
	}

	return numFilled;
}


/**
 * compute the diamond square noise algorithm on one Tile, given its parents.
 * @param tile Tile to be changed
 * @param parents Array of Tiles that will influence it
 * @param attr identifier of attribute that is being compared and set
 * @param surf Surface on which the algorithm takes place
 * @param rng Random to use for the values
 * @param maxScale the scale above which values are not correlated
 * @param level noise magnitude scalar
 * @param slope logarithmic rate at which noise dies off with distance
 * @return the value of attr this tile should take
 */
function getNoiseFunction(tile: Tile, parents: Tile[], attr: string, surf: Surface, rng: Random,
						  maxScale: number, level: number, slope: number): number {
	let scale = 0;
	let weightSum = 0;
	let value = 0;
	for (const parent of parents) {
		const dist = surf.distance(tile, parent); // look at parent distances
		let parentValue;
		if (attr === 'height')       parentValue = parent.height;
		else if (attr === 'temperature') parentValue = parent.temperature;
		else if (attr === 'rainfall') parentValue = parent.rainfall;
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
