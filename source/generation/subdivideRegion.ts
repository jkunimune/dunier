/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {Tile} from "../surface/surface.js";
import {filterSet} from "../utilities/miscellaneus.js";
import Queue from "../datastructures/queue.js";

/**
 * break the land tiles of the world up into a handful of continents.
 * each continent will have an area of around `targetArea`,
 * and they will be delineated by oceans and isthmuses
 */
export function subdivideLand(tiles: Iterable<Tile>, targetNumContinents: number, connectionDistance: number): Set<Tile>[] {
	const land = filterSet(tiles, t => !t.isSaltWater());
	if (land.size === 0)
		return []; // if there is no land, then there are no continents

	// first, perform a grassfire transform to get the distance from the ocean of each Tile
	let distanceMap;
	try {
		distanceMap = calculateBoundaryDistance(land);
	} catch (e) {
		return [land]; // if this fails, that probably means there's no boundary, so just use the whole thing
	}

	// now calculate the "drainage divides" of this distance function
	const basins = calculateInvertedDrainageBasins(land, distanceMap);

	// combine neiboring ones that are too small
	const totalLandArea = [...land].map(t => t.getArea()).reduce((a, b) => a + b);
	const targetContinentArea = totalLandArea/targetNumContinents;
	const minimumContinentArea = targetContinentArea/3;
	const regions = combineAdjacentRegions(
		basins, targetContinentArea, minimumContinentArea);

	// then remove small ones and expand the bigger ones to cover them
	const continents = makeContinentsComprehensive(
		land, regions, minimumContinentArea, connectionDistance);

	return continents.map(continent => continent.tiles);
}


/**
 * calculate the distance of every Tile in region from the nearest Tile in boundaries
 */
function calculateBoundaryDistance(region: Set<Tile>): Map<Tile, number> {
	// seed the queue with all coastal tiles
	const startPoints = [];
	for (const tile of region) {
		for (const neibor of tile.neighbors.keys()) {
			if (!region.has(neibor)) {
				startPoints.push({
					tile: tile,
					seaDistance: tile.neighbors.get(neibor).getDistance()/2,
				});
			}
		}
	}
	const grassfireQueue = new Queue<{ tile: Tile, seaDistance: number }>(
		startPoints, (a, b) => a.seaDistance - b.seaDistance);
	if (grassfireQueue.empty())
		throw new Error("the region is somehow completely separated from the boundaries so the distance is undefined.");
	// store the distances in this map
	const seaDistanceMap = new Map<Tile, number>();
	while (!grassfireQueue.empty()) {
		const {tile, seaDistance} = grassfireQueue.pop();
		if (seaDistanceMap.has(tile))
			continue;
		else {
			seaDistanceMap.set(tile, seaDistance);
			for (const mauka of tile.neighbors.keys())
				if (region.has(mauka) && !seaDistanceMap.has(mauka))
					grassfireQueue.push({
						tile: mauka,
						seaDistance: seaDistance + tile.neighbors.get(mauka).getDistance(),
					});
		}
	}

	// check that we got them all
	for (const tile of region)
		if (!seaDistanceMap.has(tile))
			throw new Error(`what happened?  why didn't we get the distance of this BIOME-${tile.biome} tile?`);
	if (seaDistanceMap.size !== region.size)
		throw new Error(`what happened?  we categorized the distances of ${seaDistanceMap.size} tiles but we were supposed to categorize ${region.size}.`);

	return seaDistanceMap;
}


/**
 * calculate the inverted drainage divides of a heightmap.
 * rather than seeding water thruout the region, making it flow downward, and seeing where it exits,
 * we drop water at the edges of the region, make it flow upward, and see where it collects.
 * @param tiles the set of tiles we want to divide up
 * @param heightmap the Map used to determine the altitude of each Tile
 * @return a bunch of Regions that cover the space
 */
function calculateInvertedDrainageBasins(tiles: Set<Tile>, heightmap: Map<Tile, number>): Region[] {
	// go from top to bottom, adding each Tile to the appropriate basin
	const roots = new Set<Tile>();
	const basins = new Map<Tile, Region>();
	const tilesFromTopToBottom = [...tiles].sort((a, b) => heightmap.get(b) - heightmap.get(a));
	for (const tile of tilesFromTopToBottom) {
		if (!heightmap.has(tile))
			throw new Error("the heightmap is incomplete!");
		// calculate to which neibor this will flow
		let highestNeibor = null;
		for (const neibor of tile.neighbors.keys())
			if (tiles.has(neibor))
				if (highestNeibor === null || heightmap.get(neibor) > heightmap.get(highestNeibor))
					highestNeibor = neibor;

		// find the basin associated with that neibor
		let basin: Region;
		if (highestNeibor !== null && basins.has(highestNeibor)) {
			basin = basins.get(highestNeibor);
		}
		else {
			roots.add(tile); // or create a new one if this is a local max
			basin = {tiles: new Set(), area: 0, borders: null};
		}

		// add it to that basin
		basin.tiles.add(tile);
		basin.area += tile.getArea();
		basins.set(tile, basin);
	}

	// finally, extract all of the basins in an array
	const uniqueBasins = [];
	for (const root of roots)
		uniqueBasins.push(basins.get(root));
	return uniqueBasins;
}


/**
 * take a bunch of collections of Tiles, and combine some of them together so that as many as possible have areas
 * of about targetArea, and ideally at least minimumArea.
 */
function combineAdjacentRegions(
	regions: Region[], targetArea: number, minimumArea: number): Region[] {
	if (regions.length === 0)
		return [];

	// build a map so we can look up who owns each Tile
	const map = new Map<Tile, Region>();
	for (const region of regions)
		for (const tile of region.tiles)
			map.set(tile, region);

	// determine which are adjacent to each other and by how much
	for (const region of regions)
		region.borders = new Map<Region, number>();
	for (const regionA of regions) {
		for (const tile of regionA.tiles) {
			for (const neibor of tile.neighbors.keys()) {
				if (map.has(neibor) && regionA !== map.get(neibor)) {
					const regionB = map.get(neibor);
					if (!regionA.borders.has(regionB))
						regionA.borders.set(regionB, 0);
					let adjacency = regionA.borders.get(regionB);
					adjacency += tile.neighbors.get(neibor).getLength();
					regionA.borders.set(regionB, adjacency);
				}
			}
		}
	}

	// then seed the merge cue
	const initiallyPossibleMerges: {a: Region, b: Region, priority: number}[] = [];
	for (const regionA of regions)
		for (const regionB of regionA.borders.keys())
			if (regionA.area <= regionB.area) // include this check to reduce the number of duplicate mergers
				initiallyPossibleMerges.push({
					a: regionA,
					b: regionB,
					priority: regionA.borders.get(regionB)/Math.min(regionA.area, regionB.area),
				});

	const remainingRegions = new Set(regions);
	const minimumAcceptableQuality = Math.sqrt((8*Math.PI/3 + Math.sqrt(3))/targetArea); // this coefficient is the L/A of a standard double bubble

	// create a priority cue of merges
	const queue = new Queue<{a: Region, b: Region, priority: number}>(
		initiallyPossibleMerges, (a, b) => b.priority - a.priority);
	// go thru it until we have a reasonable number of continents or no more merges are possible
	while (!queue.empty()) {
		const {a, b, priority} = queue.pop();
		if (Number.isNaN(priority))
			throw new Error(`nan priorities are not okay.  the areas are ${a.area} km² and ${b.area} km² and their border is ${a.borders.get(b)} km long`);
		// stop when the continents get big or separated enuff
		if (priority >= minimumAcceptableQuality || Math.min(a.area, b.area) < minimumArea) {
			// skip any outdated merges
			if (!remainingRegions.has(a) || !remainingRegions.has(b))
				continue;

			// merge the regions and their associated data
			const combinedBorders = a.borders;
			for (const neighbor of b.borders.keys()) {
				if (!combinedBorders.has(neighbor))
					combinedBorders.set(neighbor, 0);
				let borderLength = combinedBorders.get(neighbor);
				borderLength += b.borders.get(neighbor);
				combinedBorders.set(neighbor, borderLength);
			}
			combinedBorders.delete(a);
			combinedBorders.delete(b);
			const newRegion = {
				tiles: new Set([...a.tiles, ...b.tiles]),
				area: a.area + b.area,
				borders: combinedBorders,
			};
			remainingRegions.delete(a);
			remainingRegions.delete(b);
			remainingRegions.add(newRegion);

			// update the neibors' border maps
			for (const neighbor of newRegion.borders.keys()) {
				neighbor.borders.delete(a);
				neighbor.borders.delete(b);
				neighbor.borders.set(newRegion, newRegion.borders.get(neighbor));
			}

			// don't forget to cue up the next possible mergers
			for (const neighbor of combinedBorders.keys())
				queue.push({
					a: newRegion,
					b: neighbor,
					priority: newRegion.borders.get(neighbor)/Math.min(newRegion.area, neighbor.area),
				});
		}
	}

	return [...remainingRegions];
}


/**
 * take a subdivision of a region that may have some really small divisions and may not cover everything.
 * try to trim both of those so that every Tile in the region is part of a continent with area of at least minimumArea.
 * you may extend a continent across ocean, but no further than maximumDistance.
 */
function makeContinentsComprehensive(region: Set<Tile>, divisions: Region[], minimumArea: number, maximumDistance: number): Region[] {
	// delete any regions that are too small
	for (let i = divisions.length - 1; i >= 0; i --)
		if (divisions[i].area < minimumArea)
			divisions.splice(i, 1);

	// do a Dijkstra search until you get all of them
	const initialClaims = [];
	for (const continent of divisions)
		for (const tile of continent.tiles)
			initialClaims.push({continent: continent, tile: tile, landDistance: 0, seaDistance: 0});
	const voronoiQueue = new Queue<{continent: Region, tile: Tile, landDistance: number, seaDistance: number}>(
		initialClaims,
		(a, b) => (a.seaDistance !== b.seaDistance) ? a.seaDistance - b.seaDistance : a.landDistance - b.landDistance,
	);
	const visitedTiles = new Set<Tile>();
	while (!voronoiQueue.empty()) {
		const {continent, tile, landDistance, seaDistance} = voronoiQueue.pop();
		if (visitedTiles.has(tile))
			continue;
		visitedTiles.add(tile);
		if (seaDistance > maximumDistance)
			continue;

		// if it's a land tile, take it and its neibors
		if (region.has(tile)) {
			continent.tiles.add(tile);
			for (const neibor of tile.neighbors.keys())
				if (!visitedTiles.has(neibor))
					voronoiQueue.push({
						continent: continent,
						tile: neibor,
						landDistance: landDistance + tile.neighbors.get(neibor).getDistance(),
						seaDistance: 0,
					});
		}
		// if it's a sea tile, don't add it to the continent but do check its neibors
		else {
			for (const neibor of tile.neighbors.keys())
				if (!visitedTiles.has(neibor))
					voronoiQueue.push({
						continent: continent,
						tile: neibor,
						landDistance: 0,
						seaDistance: seaDistance + tile.neighbors.get(neibor).getDistance(),
					});
		}
	}

	return divisions;
}


interface Region {
	tiles: Set<Tile>;
	area: number;
	borders: Map<Region, number> | null;
}
