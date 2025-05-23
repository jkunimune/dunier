/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {outline, Tile, Vertex} from "../surface/surface.js";
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

	// now calculate the "drainage divides" of this distance function
	const basins = divideDrainageBasins(land);

	// combine neiboring ones that are too small
	const totalLandArea = [...land].map(t => t.getArea()).reduce((a, b) => a + b);
	const targetContinentArea = totalLandArea/targetNumContinents;
	const minimumContinentArea = targetContinentArea/3;
	const regions = combineAdjacentRegions(
		basins, targetContinentArea, minimumContinentArea);

	// then remove small ones and expand them to cover endorheic basins
	const continents = makeContinentsComprehensive(
		land, regions, minimumContinentArea, connectionDistance);

	return continents.map(continent => continent.tiles);
}


/**
 * get the drainage basin for every river
 */
function divideDrainageBasins(region: Set<Tile>): Region[] {
	const basins: Region[][] = [];
	const wraps: boolean[] = [];
	// first iterate around the region's border
	const vertices = outline(region);
	for (let i = 0; i < vertices.length; i ++) {
		wraps.push(vertices[i][0] === vertices[i][vertices[i].length - 1]);
		basins.push([]);
		for (let j = 0; j < vertices[i].length; j ++) {
			if (wraps[i] && j === vertices[i].length - 1)
				break; // skip the last vertex if it's the same as the first one
			// find the basin for each vertex
			const basin = findDrainageBasin(vertices[i][j]);
			if (basin.area > 0) {
				basin.borderLengths = new Map<Region, number>();
				basin.neighbors = new Set<Region>();
				basins[i].push(basin);
			}
		}
	}
	// then go back and assign adjacencies
	for (let i = 0; i < basins.length; i ++) {
		if (basins[i].length > 1) {
			for (let j0 = 0; j0 < basins[i].length; j0 ++) {
				if (!wraps[i] && j0 === basins[i].length - 1)
					break; // skip connecting the last pair if this loop isn't closed
				let j1 = (j0 + 1)%basins[i].length;
				basins[i][j0].neighbors.add(basins[i][j1]);
				basins[i][j1].neighbors.add(basins[i][j0]);
			}
		}
	}

	const ravelledBasins = [];
	for (let i = 0; i < basins.length; i ++)
		ravelledBasins.push(...basins[i]);
	return ravelledBasins;
}


/**
 * get the set of Tiles that drains into a given river Vertex
 */
function findDrainageBasin(delta: Vertex): Region {
	const riverVertices = new Set<Vertex>();
	const abuttingTiles = new Set<Tile>();
	// first explore up the river system
	const explorationQueue: Vertex[] = [delta];
	while (explorationQueue.length > 0) {
		const vertex = explorationQueue.pop();
		// note every vertex you pass
		riverVertices.add(vertex);
		// note all Tiles to which you are adjacent
		for (const tile of vertex.tiles)
			if (tile instanceof Tile && !tile.isSaltWater())
				abuttingTiles.add(tile);
		// then propagate to your upstream neibors
		for (const neibor of vertex.neighbors.keys())
			if (vertex === neibor.downstream)
				explorationQueue.push(neibor);
	}

	// now filter out the abutting Tiles that should actually drain to adjacent river systems
	const basin = new Set<Tile>();
	let area = 0;
	for (const tile of abuttingTiles) {
		let bestNeiboringVertex: Vertex | null = null;
		for (const {vertex} of tile.getPolygon())
			if (bestNeiboringVertex === null || vertex.flow > bestNeiboringVertex.flow)
				bestNeiboringVertex = vertex;
		// if its neiboring vertex with the most flow is in the river system
		if (riverVertices.has(bestNeiboringVertex)) {
			basin.add(tile); // take it
			area += tile.getArea();
		}
		// if its fastest flowing neibor is someone else, leave it
	}
	return {tiles: basin, area: area, borderLengths: null, neighbors: null};
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
	for (const regionA of regions) {
		for (const tile of regionA.tiles) {
			for (const neibor of tile.neighbors.keys()) {
				if (map.has(neibor) && regionA !== map.get(neibor)) {
					const regionB = map.get(neibor);
					if (!regionA.borderLengths.has(regionB))
						regionA.borderLengths.set(regionB, 0);
					let adjacency = regionA.borderLengths.get(regionB);
					adjacency += tile.neighbors.get(neibor).getLength();
					regionA.borderLengths.set(regionB, adjacency);
					regionB.borderLengths.set(regionA, adjacency);
				}
			}
		}
	}

	for (const region of regions)
		for (const neighbor of region.neighbors)
			if (!region.borderLengths.has(neighbor))
				region.borderLengths.set(neighbor, 0);

	// then seed the merge cue
	const initiallyPossibleMerges: {a: Region, b: Region, priority: number}[] = [];
	for (const regionA of regions)
		for (const regionB of regionA.neighbors)
			if (regionA.area <= regionB.area) // include this check to reduce the number of duplicate mergers
				initiallyPossibleMerges.push({
					a: regionA,
					b: regionB,
					priority: regionA.borderLengths.get(regionB)/Math.min(regionA.area, regionB.area),
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
			throw new Error(`nan priorities are not okay.  the areas are ${a.area} km² and ${b.area} km² and their border is ${a.borderLengths.get(b)} km long`);
		// stop when the continents get big or separated enuff
		if (priority >= minimumAcceptableQuality || Math.min(a.area, b.area) < minimumArea) {
			// skip any outdated merges
			if (!remainingRegions.has(a) || !remainingRegions.has(b))
				continue;

			// merge the regions and their associated data
			const combinedBorderLengths = a.borderLengths;
			for (const neighbor of b.borderLengths.keys()) {
				if (!combinedBorderLengths.has(neighbor))
					combinedBorderLengths.set(neighbor, 0);
				let borderLength = combinedBorderLengths.get(neighbor);
				borderLength += b.borderLengths.get(neighbor);
				combinedBorderLengths.set(neighbor, borderLength);
			}
			combinedBorderLengths.delete(a);
			combinedBorderLengths.delete(b);
			const combinedNeighbors = new Set([...a.neighbors, ...b.neighbors]);
			combinedNeighbors.delete(a);
			combinedNeighbors.delete(b);
			const newRegion = {
				tiles: new Set([...a.tiles, ...b.tiles]),
				area: a.area + b.area,
				borderLengths: combinedBorderLengths,
				neighbors: combinedNeighbors,
			};
			remainingRegions.delete(a);
			remainingRegions.delete(b);
			remainingRegions.add(newRegion);

			// update the neibors' border maps
			for (const neighbor of newRegion.borderLengths.keys()) {
				neighbor.borderLengths.delete(a);
				neighbor.borderLengths.delete(b);
				neighbor.borderLengths.set(newRegion, newRegion.borderLengths.get(neighbor));
			}
			for (const neighbor of newRegion.neighbors) {
				neighbor.neighbors.delete(a);
				neighbor.neighbors.delete(b);
				neighbor.neighbors.add(newRegion);
			}

			// don't forget to update the next possible mergers
			for (const neighbor of combinedNeighbors)
				queue.push({
					a: newRegion,
					b: neighbor,
					priority: newRegion.borderLengths.get(neighbor)/Math.min(newRegion.area, neighbor.area),
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
	borderLengths: Map<Region, number> | null;
	neighbors: Set<Region> | null;
}
