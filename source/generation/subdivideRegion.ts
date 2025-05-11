/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {Tile} from "../surface/surface.js";
import {filterSet} from "../utilities/miscellaneus.js";
import Queue from "../datastructures/queue.js";

/**
 * break the land tiles of the world up into a handful of continents.
 * each continent will have at least minArea tiles and at most maxArea tiles,
 * and they will be delineated by oceans and isthmuses
 */
export function subdivideLand(tiles: Iterable<Tile>, minArea: number, maxArea: number, connectionDistance: number): Set<Tile>[] {
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

	for (const tile of land)
		tile.height = distanceMap.get(tile)/500;

	// now calculate the "drainage divides" of this distance function
	const tree = calculateDrainageDivides(land, distanceMap);

	// assign one continent to each parentless tile
	const regionRoots = [...filterSet(land, t => tree.get(t).parent === null)];

	// break up any that are too big
	for (let i = 0; i < regionRoots.length; i ++) {
		const root = regionRoots[i];
		if (tree.get(root).ownedArea > maxArea) {
			for (const child of root.neighbors.keys()) {
				if (tree.get(child).parent === root) { // find every child Tile
					tree.get(child).parent = null; // and make it the root of its own region
					regionRoots.push(child);
				}
			}
			tree.get(root).ownedArea = root.getArea(); // now the root is the parent of none and only owns itself
		}
	}

	// collect the continent around each landmass
	const regions: {tiles: Set<Tile>, area: number}[] = [];
	for (const root of regionRoots)
		regions.push({tiles: collectChildrenOf(root, tree), area: tree.get(root).ownedArea});

	// combine neiboring ones that are too small
	const continents = combineAdjacentRegions(regions, connectionDistance, minArea, maxArea);

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
 * calculate the drainage divides of a heightmap.
 * @param tiles the set of tiles we want to divide up
 * @param heightmap the Map used to determine the altitude of each Tile
 * @return the map that specifies which Tile is above each other Tile, and
 */
function calculateDrainageDivides(tiles: Set<Tile>, heightmap: Map<Tile, number>): Map<Tile, {parent: Tile, ownedArea: number}> {
	// store the dividing edges in this map
	const parentage = new Map<Tile, {parent: Tile, ownedArea: number}>();
	for (const tile of tiles) {
		if (!heightmap.has(tile))
			throw new Error("the heightmap is incomplete!");
		let highestNeibor = null;
		for (const neibor of tile.neighbors.keys())
			if (tiles.has(neibor))
				if (highestNeibor === null || heightmap.get(neibor) > heightmap.get(highestNeibor))
					highestNeibor = neibor;
		if (highestNeibor !== null && heightmap.get(highestNeibor) > heightmap.get(tile))
			parentage.set(tile, {parent: highestNeibor, ownedArea: tile.getArea()});
		else
			parentage.set(tile, {parent: null, ownedArea: tile.getArea()});
	}
	// go thru all the tiles from lowest to highest
	const childCountingQueue = new Queue<Tile>(
		[...tiles], (a, b) => heightmap.get(a) - heightmap.get(b));
	// to sum up the total area under each Tile on the tree
	while (!childCountingQueue.empty()) {
		const tile = childCountingQueue.pop();
		const {parent, ownedArea} = parentage.get(tile);
		if (parent !== null)
			parentage.get(parent).ownedArea += ownedArea;
	}

	return parentage;
}


/**
 * get all Tiles whose parentage in the hierarchy can be traced to root
 */
function collectChildrenOf(root: Tile, hierarchy: Map<Tile, {parent: Tile}>): Set<Tile> {
	const children = new Set<Tile>();
	const collectionQueue = [root];
	while (collectionQueue.length > 0) {
		const tile = collectionQueue.pop();
		children.add(tile);
		for (const neibor of tile.neighbors.keys())
			if (hierarchy.has(neibor) && !children.has(neibor) && hierarchy.get(neibor).parent === tile)
				collectionQueue.push(neibor);
	}
	return children;
}


/**
 * take a bunch of collections of Tiles, and combine some of them together so that as many as possible have areas
 * of at least minArea and at most maxArea.  collections may be combined if any of their constituent Tiles are
 * within connectionDistance of each other.
 */
function combineAdjacentRegions(
	regions: Region[], connectionDistance: number, minArea: number, maxArea: number): Region[] {
	if (regions.length === 0)
		return [];

	// first, sort them from biggest to smallest
	regions.sort((a, b) => b.area - a.area);
	// now, until all of these are the minimum size or have been dropped
	while (regions[regions.length - 1].area < minArea) {
		// consider the smallest region
		const i = regions.length - 1;
		// do a quick Dijkstra search to find other regions that are nearby
		const searchStart = [];
		for (const tile of regions[i].tiles)
			for (const neibor of tile.neighbors.keys())
				if (!regions[i].tiles.has(neibor))
					searchStart.push({tile: neibor, distance: tile.neighbors.get(neibor).getDistance()/2});
		const searchQueue = new Queue<{tile: Tile, distance: number}>(
			searchStart, (a, b) => a.distance - b.distance);
		const visited = new Set<Tile>();
		const connectedRegions = new Set<number>();
		search:
		while (!searchQueue.empty()) {
			// for each tile you find
			const {tile, distance} = searchQueue.pop();
			visited.add(tile);
			// figure out in which region it is
			let owner = null;
			for (let j = 0; j < regions.length; j ++)
				if (regions[j].tiles.has(tile))
					owner = j;
			// if it's in none of them, propagate the search further into the unknown
			if (owner === null) {
				for (const neibor of tile.neighbors.keys()) {
					const neiborDistance = distance + tile.neighbors.get(neibor).getDistance();
					if (neiborDistance > connectionDistance) // up to connection distance
						break search;
					else if (!visited.has(neibor))
						searchQueue.push({tile: neibor, distance: neiborDistance});
				}
			}
			// if it is in another region, mark it as connected
			else if (owner !== i) {
				connectedRegions.add(owner);
			}
		}

		// now, sort the connected regions from biggest to smallest
		const sortedConnectedRegions = [...connectedRegions].sort((a, b) => a - b);

		// until you hit the minimum area
		let totalArea = regions[i].area;
		const assimilatedRegions: number[] = [];
		while (totalArea < minArea && sortedConnectedRegions.length > 0) {
			// take the next smallest connected region
			const j = sortedConnectedRegions.pop();
			if (totalArea + regions[j].area > maxArea)
				break;
			else {
				totalArea += regions[j].area;
				assimilatedRegions.push(j);
			}
		}
		// if there were no legal merges
		if (assimilatedRegions.length === 0) {
			// just drop this from the list because that means it will never be sufficient
			regions.pop();
		}
		// if some merges were legal
		else {
			// perform the merges
			const allTiles = [...regions[i].tiles];
			regions.splice(i, 1);
			for (let j of assimilatedRegions) {
				allTiles.push(...regions[j].tiles);
				regions.splice(j, 1);
			}
			// add the combined region to the list
			regions.push({tiles: new Set(allTiles), area: totalArea});
			// re-sort
			regions.sort((a, b) => b.area - a.area);
		}

		if (regions.length === 0)
			return [];
	}

	return regions;
}


interface Region {
	tiles: Set<Tile>;
	area: number;
}
