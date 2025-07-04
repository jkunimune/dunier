/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import Queue from '../utilities/external/tinyqueue.js';
import {Surface, Vertex, Tile, EmptySpace} from "./surface/surface.js";
import {Random} from "../utilities/random.js";
import {argmin, union} from "../utilities/miscellaneus.js";
import {Vector} from "../utilities/geometry.js";


/** the magnitude of random temperature variation (°C) */
const TERME_NOISE_LEVEL = 5;
/** the magnitude of random rainfall variation */
const BARXE_NOISE_LEVEL = 0.3;
/** the maximum number of planet radii at which random variation is correlated */
const MAX_NOISE_SCALE = 1/8;
/** the decay parameter for temperature as a function of altitude (km) */
const ATMOSPHERE_THICKNESS = 12;
/** the minimum mountain heit needed to cast a rain shadow (km) */
const CLOUD_HEIGHT = 2;
/** the strength of rain shadows */
const OROGRAPHIC_MAGNITUDE = 1;
/** the maximum distance from the ocean at which rain shadows can happen (km) */
const OROGRAPHIC_RANGE = 2000;

/** the temperature threshold between tundra and taiga (°C) */
const TUNDRA_TEMP = -15;
/** the temperature above which evaporation is important (°C) */
const EVAPORATION_INTERCEPT = -15;
/** the exponent for the evaporation rate */
const EVAPORATION_POWER = 4/3;
/** the prefactor for the evaporation rate */
const EVAPORATION_COEFFICIENT = 0.01;
/** the temperature threshold between taiga and temperate forest (°C) */
const TAIGA_TEMP = -5;
/** the temperature threshold between grassland and steamland (°C) */
const FLASH_TEMP = +50;
/** the temperature threshold between temperate forest and jungle (°C) */
const TROPIC_TEMP = +22;
/** a prefactor for the threshold between grassland and forest */
const FOREST_FACTOR = 1.35;

/** the temperature threshold between normal biomes and permanent ice sheets (°C) */
const RIVER_THRESH = -20;
/** the minimum edge length that can separate two rivers without them merging (km) */
const RIVER_WIDTH = 10;
/** the maximum amount that a river can flow uphill (km) */
const CANYON_DEPTH = 0.1;
/** the depth threshold needed to form a large lake (km) */
const LAKE_THRESH = -0.07;

/** the average altitude difference between oceanic crust and continental crust (km) */
const OCEAN_DEPTH = 4;
/** the magnitude of random altitude variation on continents (km) */
const CONTINENT_VARIATION = .5;
/** the magnitude of random depth variation in oceans (km) */
const OCEANIC_VARIATION = 1;
/** the typical height of mountain ranges formed by continental collisions (km) */
const MOUNTAIN_HEIGHT = 4;
/** the typical height of mountain ranges formed over subduction zones (km) */
const VOLCANO_HEIGHT = 2.3;
/** the typical height of mid-oceanic ridges (km) */
const RIDGE_HEIGHT = 1.5;
/** the typical depth of subduction trenches (km) */
const TRENCH_DEPTH = 4;
/** the typical width of mountain ranges (km) */
const MOUNTAIN_WIDTH = 400;
/** the typical width of subduction trenches (km) */
const TRENCH_WIDTH = 100;
/** the typical depth of continental slopes (km) */
const SLOPE_WIDTH = 200;
/** the typical width of mid-oceanic ridges (km) */
const RIDGE_WIDTH = 100;
/** the typical width of inter-continental oceans, as a fraction of continental length scale */
const OCEAN_SIZE = 0.2;
/** the amount of depression to apply to the edges of continents near passive margins */
const CONTINENTAL_CONVEXITY = 0.05; // between 0 and 1

/** different ways two plates can interact at a given fault */
enum FaultType {
	CONTINENT_COLLISION,
	SEA_TRENCH,
	ISLAND_ARC,
	OCEANIC_RIFT,
	RIFT_WITH_SLOPE,
}

/** terrestrial ecoregion classifications */
export enum Biome {
	OCEAN,
	LAKE,
	SEA_ICE,
	LAND_ICE,
	TUNDRA,
	TAIGA,
	FOREST,
	JUNGLE,
	DESERT,
	GRASSLAND,
	STEAMLAND,
}

export const BIOME_NAMES = [
	"ocean",
	"lake",
	"sea_ice",
	"land_ice",
	"tundra",
	"taiga",
	"forest",
	"jungle",
	"desert",
	"grassland",
	"steamland",
];

export const PASSABILITY = new Map([ // terrain modifiers for invasion speed
	[Biome.OCEAN,     0.1],
	[Biome.JUNGLE,    0.1],
	[Biome.FOREST,    1.0],
	[Biome.LAKE,      3.0],
	[Biome.TAIGA,     1.0],
	[Biome.STEAMLAND, 0.3],
	[Biome.GRASSLAND, 3.0],
	[Biome.DESERT,    0.1],
	[Biome.TUNDRA,    0.3],
	[Biome.LAND_ICE,  0.1],
	[Biome.SEA_ICE,   0.1],
]);
export const ARABILITY = new Map([ // terrain modifiers for civ spawning and population growth
	[Biome.OCEAN,     0.00],
	[Biome.JUNGLE,    0.30],
	[Biome.FOREST,    1.00],
	[Biome.LAKE,      0.00],
	[Biome.TAIGA,     0.10],
	[Biome.STEAMLAND, 0.03],
	[Biome.GRASSLAND, 0.30],
	[Biome.DESERT,    0.00],
	[Biome.TUNDRA,    0.03],
	[Biome.LAND_ICE,  0.00],
	[Biome.SEA_ICE,   0.00],
]);
export const RIVER_UTILITY_THRESHOLD = 1e6; // [km^2] size of watershed needed to produce a river that supports large cities
export const FRESHWATER_UTILITY = 20; // [km] width of highly populated region near river
export const SALTWATER_UTILITY = 50; // [km] width of highly populated region near coast


/**
 * create all of the continents and biomes and rivers that go into the physical geography
 * of a good fictional world.
 * @param numContinents number of continents, equal to half the number of plates
 * @param seaLevel desired sea level in km
 * @param meanTemperature some vaguely defined median temperature in °C
 * @param surf the surface to modify
 * @param rng the seeded random number generator to use
 */
export function generateTerrain(numContinents: number, seaLevel: number, meanTemperature: number, surf: Surface, rng: Random): void {
	generateContinents(numContinents, surf, rng);
	rng = rng.reset();
	movePlates(surf, rng);
	fillOcean(seaLevel, surf);
	rng = rng.reset();
	generateClimate(meanTemperature, surf, rng); // TODO: I really think I should have an avgRain parameter
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
			let distances = [];
			for (const parent of options)
				distances.push(surf.distance(tile, parent));
			tile.plateIndex = options[argmin(distances)].plateIndex;
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

	// create a high- and low-priority queue to propagate the fault line effects
	const hpQueue: Queue<{tile: Tile, distance: number, width: number, speed: number, type: FaultType}> = new Queue([], (a, b) => a.distance - b.distance);
	const lpQueue: Queue<{tile: Tile, distance: number, width: number, speed: number, type: FaultType}> = new Queue([], (a, b) => a.distance - b.distance);
	for (const tile of surf.tiles) { // now for phase 2:
		let fault = null;
		let minDistance = Infinity;
		for (const neighbor of tile.neighbors.keys()) { // look for adjacent tiles
			if (neighbor.plateIndex !== tile.plateIndex) { // that are on different plates
				const distance = tile.neighbors.get(neighbor).getDistance();
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
			if (relSpeed < 0) { // TODO: make relSpeed also depend on adjacent tiles to smooth out the fault lines and make better oceans
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
					width = relSpeed*RIDGE_WIDTH*2; // TODO: this would be easier to read if I used lambda functions instead of an enum
				}
				else {
					type = FaultType.RIFT_WITH_SLOPE; // mid-oceanic rift plus continental slope (plus a little bit of convexity)
					width = 2*relSpeed*oceanWidth;
				}
			}
			const queueElement = {
				tile: tile, distance: minDistance/2, width: width,
				speed: Math.abs(relSpeed), type: type}; // add it to the queue
			if (type === FaultType.RIFT_WITH_SLOPE || type === FaultType.CONTINENT_COLLISION)
				hpQueue.push(queueElement); // continental plate boundaries have high priority
			else
				lpQueue.push(queueElement); // other plate boundaries have low priority
		}

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
					bellCurve(x) * wibbleCurve(x, 1/6); // (the sinusoidal term makes it a little more rugged)
			}
			else if (type === FaultType.SEA_TRENCH) {
				const x = distance / TRENCH_WIDTH;
				tile.height -= speed * TRENCH_DEPTH *
					digibbalCurve(x) * wibbleCurve(x, 1/6); // while subductive faults are odd
			}
			else if (type === FaultType.ISLAND_ARC) {
				const x = distance / MOUNTAIN_WIDTH;
				tile.height += speed * VOLCANO_HEIGHT *
					digibbalCurve(x) * wibbleCurve(x, 1);
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
					-OCEAN_DEPTH/2 / (1 + Math.exp(-xS/2.)/CONTINENTAL_CONVEXITY));
			}
			else {
				throw new Error("Unrecognized fault type");
			}

			tile.flag = true; // mark this tile
			for (const neighbor of tile.neighbors.keys()) // and add its neighbors to the queue
				if (neighbor.plateIndex === tile.plateIndex)
					queue.push({
						tile: neighbor,
						distance: distance + tile.neighbors.get(neighbor).getDistance(),
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
			surf.insolation(tile.φ)*Math.exp(-tile.height/ATMOSPHERE_THICKNESS),
			1/4.)*(avgTerme + 273) - 273;
		tile.rainfall += surf.windConvergence(tile.φ);
		tile.rainfall = Math.max(0, tile.rainfall);
		const {north, east} = surf.windVelocity(tile.φ);
		tile.windVelocity = tile.north.times(north).plus(tile.east.times(east));
	}

	for (const tile of surf.tiles)
		tile.downwind = [];
	const queue: {tile: Tile, moisture: number}[] = [];
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
			tile.rainfall -= OROGRAPHIC_MAGNITUDE/2;
	}
	while (queue.length > 0) {
		const {tile, moisture} = queue.pop(); // wet air blows from upwind
		tile.rainfall += moisture; // this tile gets rain from the wet air
		if (tile.height <= CLOUD_HEIGHT) { // if it's is low enuff
			for (const downwind of tile.downwind) { // it passes it onto any neibors downwind of it
				if (downwind.biome !== Biome.OCEAN) {
					const distance: number = tile.neighbors.get(downwind).getDistance();
					queue.push({
						tile: downwind,
						moisture: moisture*Math.exp(-distance/OROGRAPHIC_RANGE/Math.sqrt(downwind.windVelocity.sqr()))}); // the air gradually dries out
				}
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
		let numAdjacentTiles = 0;
		let totalHeight = 0;
		for (const tile of vertex.tiles) {
			if (tile instanceof Tile) {
				totalHeight += tile.height;
				numAdjacentTiles += 1;
			}
		}
		vertex.height = totalHeight/numAdjacentTiles; // first define altitudes for vertices, which only matters for this one purpose
		vertex.downstream = null; // also initialize this
	}

	const riverOrder: Map<Vertex, number> = new Map();
	const riverStack: Array<Vertex> = [];
	const riverQueue = new Queue<{below: Vertex, above: Vertex, maxHeight: number, uphillLength: number, quality: number}>(
		[], (a, b) => b.quality - a.quality); // start with a queue of rivers forming from their deltas

	// start by searching for vertices where a river can enter the ocean or flow off the edge
	for (const vertex of surf.vertices) {
		for (let i = 0; i < 3; i ++) { // if you can find any orientation
			const a = vertex.tiles[i];
			const b = vertex.tiles[(i + 1)%3];
			const c = vertex.tiles[(i + 2)%3];
			const viableAsADelta = (
				(a instanceof EmptySpace || a.isSaltWater()) &&
				(b instanceof Tile && !b.isSaltWater() &&
				(c instanceof Tile && !c.isSaltWater())));
			if (viableAsADelta) { // where there are two land tiles facing one sea/empty tile
				vertex.downstream = a; // set its flow as into the ocean
				riverOrder.set(vertex, 0);
				riverStack.push(vertex);
				riverQueue.push({ // then add its uphill neibor to the cue
					below: vertex, above: b.rightOf(c),
					maxHeight: 0, uphillLength: 0,
					quality: Infinity,
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
					if (beyond.downstream === null) { // (it's a little redundant, but checking availability here as well saves some time)
						if (beyond.height >= maxHeight - CANYON_DEPTH) {
							const length = surf.distance(beyond, above);
							let quality; // decide how good a river this would be
							if (length < RIVER_WIDTH) // if the edge is really short we must make it a river immediately
								quality = Infinity;
							else if (beyond.height >= above.height) // otherwise, calculate the slope for downhill rivers
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
				if (tile instanceof Tile) {
					let nadasle = (1 // base river yield is 1 per tile
						+ tile.rainfall // add in climate factor
						- evaporation_rate(tile.temperature) // subtract out evaporation
						+ tile.height/CLOUD_HEIGHT // add in mountain sources
					);
					if (nadasle > 0 && tile.temperature >= RIVER_THRESH) // this could lead to evaporation, but I'm not doing that because it would look ugly
						vertex.flow += nadasle*unitArea/tile.neighbors.size;
				}
			}
			vertex.downstream.flow += vertex.flow; // and pass that flow onto the downstream tile
			vertex.neighbors.get(vertex.downstream).flow = vertex.flow;
		}
		if (vertex.downstream instanceof Vertex || vertex.downstream instanceof Tile)
			surf.rivers.add([vertex, vertex.downstream]);
	}

	const lageQueue = [...surf.tiles].filter((t: Tile) => !surf.edge.has(t));
	queue:
	while (lageQueue.length > 0) { // now look at the tiles
		const tile = lageQueue.pop(); // TODO: make lakes more likely to appear on large rivers
		if (tile.isWater() || tile.temperature < RIVER_THRESH)
			continue; // ignoring things that are already water or too cold for this

		// check whether there is up to 1 continuous body of water at its border
		let seenAnyWater = false;
		let seenRightEdge = false;
		for (const {vertex} of tile.getPolygon()) {
			const last = vertex.widershinsOf(tile);
			const next = vertex.widershinsOf(last); // look at the Tiles next to it
			if (next instanceof Tile && next.biome === Biome.OCEAN)
				continue queue; // don't let ocean-adjacent tiles become lakes
			const lastIsWater = (last instanceof Tile) && (tile.neighbors.get(last).flow > 0 || last.biome === Biome.LAKE);
			const nextIsWater = (next instanceof  Tile) && (tile.neighbors.get(next).flow > 0 || next.biome === Biome.LAKE);
			const betweenIsWater = vertex.acrossFrom(tile).flow > 0;
			const isWater = lastIsWater || nextIsWater || betweenIsWater;
			if (isWater)
				seenAnyWater = true;
			const isRightEdge = (!lastIsWater && nextIsWater) || (!lastIsWater && !nextIsWater && betweenIsWater);
			if (isRightEdge) { // if this has the right edge of a body of water
				if (seenRightEdge) // if there's already been a right edge
					continue queue; // then it's not contiguous and this tile is not eligible
				else // otherwise
					seenRightEdge = true; // record that
			}
		}
		if (!seenAnyWater) // if there wasn't _any_ adjacent water
			continue; // then there's nothing to feed the lake

		// locate the downstreamest river flowing away
		let outflow: Vertex | null = null;
		for (const {vertex} of tile.getPolygon())
			if (outflow === null || riverOrder.get(vertex) <= riverOrder.get(outflow)) // i.e. the vertex with the most ultimate flow
				outflow = vertex;

		if (outflow !== null && outflow.downstream instanceof Vertex &&
			outflow.height - outflow.downstream.height < LAKE_THRESH) { // if we made it through all that, make an altitude check
			tile.biome = Biome.LAKE; // and assign lake status. you've earned it, tile.
			for (const neighbor of tile.neighbors.keys())
				lageQueue.push(neighbor); // tell your friends.
		}
	}
}


/**
 * assign biomes to all unassigned tiles according to simple rules.
 * @param surf the surface to which we're doing this
 */
function setBiomes(surf: Surface): void {
	for (const tile of surf.tiles) {
		// make sure the edge is frozen to hold all the water in
		if (surf.edge.has(tile)) {
			if (tile.biome === Biome.OCEAN)
				tile.biome = Biome.SEA_ICE;
			else
				tile.biome = Biome.LAND_ICE;
		}
		// assign all other biomes based on temperature and rainfall
		else if (tile.biome === null) {
			if (tile.temperature < RIVER_THRESH)
				tile.biome = Biome.LAND_ICE;
			else if (tile.rainfall <= evaporation_rate(tile.temperature))
				tile.biome = Biome.DESERT;
			else if (tile.temperature < TUNDRA_TEMP)
				tile.biome = Biome.TUNDRA;
			else if (tile.temperature > FLASH_TEMP)
				tile.biome = Biome.STEAMLAND;
			else if (tile.rainfall < FOREST_FACTOR*evaporation_rate(tile.temperature))
				tile.biome = Biome.GRASSLAND;
			else if (tile.temperature < TAIGA_TEMP)
				tile.biome = Biome.TAIGA;
			else if (tile.temperature < TROPIC_TEMP)
				tile.biome = Biome.FOREST;
			else
				tile.biome = Biome.JUNGLE;
		}

		// assine the society-relevant values to the Tiles
		tile.arableArea = ARABILITY.get(tile.biome)*tile.getArea(); // start with the biome-defined habitability
		if (tile.arableArea > 0 || tile.biome === Biome.DESERT) { // if it is habitable at all or is a desert
			for (const neighbor of tile.neighbors.keys()) { // increase habitability based on adjacent water
				const edge = tile.neighbors.get(neighbor);
				if (neighbor.biome === Biome.LAKE || edge.flow > RIVER_UTILITY_THRESHOLD)
					tile.arableArea += FRESHWATER_UTILITY*edge.getLength();
				if (neighbor.biome === Biome.OCEAN)
					tile.arableArea += SALTWATER_UTILITY*edge.getLength();
			}
		}
		tile.passability = PASSABILITY.get(tile.biome);
	}
}


/**
 * fill all tiles that are connected to start by a chain of Tiles that are at or below level with ocean. then, return
 * the number of tiles that could be flooded this way.
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
		else throw new Error(`no funcubli sife - parent.${attr}`);
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

/**
 * this isn't physics-based at all; just tuned to look nice.
 * @param T the temperature in °C
 * @return the evaporation rate in the same units as rainfall
 */
function evaporation_rate(T: number): number {
	return EVAPORATION_COEFFICIENT*Math.max(0, T - EVAPORATION_INTERCEPT)**EVAPORATION_POWER;
}

function bellCurve(x: number): number {
	return (1 - x*x*(1 - x*x/4));
}

function digibbalCurve(x: number): number {
	return Math.sqrt(3125/512)*x*(1 - x*x*(1 - x*x/4));
}

function wibbleCurve(x: number, δ: number): number {
	return 1 + δ*Math.cos(12*Math.PI*x);
}
