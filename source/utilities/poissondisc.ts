/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {generic, PathSegment} from "./coordinates.js";
import {
	calculatePathBounds,
	contains, doublePath,
	getAllCombCrossings,
	INFINITE_PLANE, rectangle, reversePath, rotatePath,
	Rule,
	Side
} from "../mapping/pathutilities.js";
import {Random} from "./random.js";
import {offset} from "./offset.js";
import {binarySearch} from "./miscellaneus.js";

/**
 * generate a set of random non-overlapping discs in a region of a plane.
 * @param region the path that defines the bounds of the region to sample
 * @param walls any line features that samples need to avoid
 * @param discTypes the list of types of sample.  each has a density of times to attempt it (the actual density will be lower if diameter is nonzero; it will max out somewhere around 0.69diameter**-2) and a diameter which represents how close it may be to other samples.
 * @param rng the random number generator to use
 */
export function poissonDiscSample(region: PathSegment[], walls: PathSegment[][], discTypes: {density: number, diameter: number}[], rng: Random): {type: number, x: number, y: number}[] {
	// establish the closest any two points can possibly be
	const minDistance = Math.min(...discTypes.map(({diameter}) => diameter));
	const maxRadius = Math.max(...discTypes.map(({diameter}) => diameter))/2;

	// establish the grid
	const domainBounds = calculatePathBounds(region);
	const gridScale = minDistance/Math.sqrt(2); // set this so that each cell has no more than one sample
	const numX = Math.ceil((domainBounds.sMax - domainBounds.sMin)/gridScale);
	const numY = Math.ceil((domainBounds.tMax - domainBounds.tMin)/gridScale);
	const grid = {
		xMin: domainBounds.sMin,
		numX: numX,
		Δx: gridScale,
		yMin: domainBounds.tMin,
		numY: numY,
		Δy: gridScale,
	};

	// the index of the sample in each grid cell, or null if there is none
	const cellContent: number[][] = [];
	for (let i = 0; i < numX; i ++) {
		cellContent.push([]);
		for (let j = 0; j < numY; j ++)
			cellContent[i].push(null);
	}

	// the unique diameters for which offsets must be calculated
	const uniqueDiameters = new Set<number>(discTypes.map(type => type.diameter));

	// rule out any additional areas where you definitely can't sample
	const boundingRegion = rectangle(
		grid.xMin - grid.Δx,
		grid.yMin - grid.Δy,
		grid.xMin + (grid.numX + 1)*grid.Δx,
		grid.yMin + (grid.numY + 1)*grid.Δy);
	const externalZone = boundingRegion.concat(reversePath(region));
	const doubledWalls = walls.map(wall => doublePath(wall));
	const forbiddenRegions = new Map<number, PathSegment[][]>();
	const cellForbiddenness = new Map<number, {clusion: Side, regionIndexes: Set<number> | null}[][]>();
	forbiddenRegions.set(0, [externalZone, ...doubledWalls]);
	cellForbiddenness.set(0, containsRaster([externalZone], grid));
	for (const diameter of uniqueDiameters) {
		forbiddenRegions.set(diameter, forbiddenRegions.get(0).map(path => offset(path, diameter/2)));
		cellForbiddenness.set(diameter, containsRaster(forbiddenRegions.get(diameter), grid));
	}

	// decide on the order in which you will test each cell
	const feasibleCells: {i: number, j: number}[] = [];
	for (let i = 0; i < numX; i ++)
		for (let j = 0; j < numY; j ++)
			// look for cells that could contain the smallest discs; make sure they're also in the plain region (that last check is necessary because my offsets are janky)
			if (cellForbiddenness.get(minDistance)[i][j].clusion !== Side.IN && cellForbiddenness.get(0)[i][j].clusion !== Side.IN)
				feasibleCells.push({i: i, j: j});
	rng.shuffle(feasibleCells);

	// prepare to randomly choose types for each sample
	const cumulativeProbability = [0];
	for (let type = 0; type < discTypes.length; type ++)
		cumulativeProbability.push(cumulativeProbability[type] + discTypes[type].density);
	const scalingFactor = cumulativeProbability[discTypes.length];
	for (let type = 0; type <= discTypes.length; type ++)
		cumulativeProbability[type] /= scalingFactor;
	// in particular, take care to fix any nans in the event of infinite (i.e. maximal) densities
	if (scalingFactor === Infinity) {
		for (let type = 0; type <= discTypes.length; type ++) {
			if (type < discTypes.length && discTypes[type].density !== Infinity)
				throw new Error("don't call this function where some types have infinite diameter and others don't.  that doesn't make any sense.  either all should be infinite or none should be.");
			else
				cumulativeProbability[type] = type/discTypes.length;
		}
	}

	// draw a certain number of candidates
	let totalDensity = 0;
	for (const {density} of discTypes)
		totalDensity += density;
	const feasibleArea = grid.Δx*grid.Δy*feasibleCells.length;
	const numCandidates = Math.round(feasibleArea*Math.min(100/minDistance**2, totalDensity));
	const points: {type: number, x: number, y: number, diameter: number}[] = [];
	candidateGeneration:
	for (let k = 0; k < numCandidates; k ++) {
		// take the next cell in the list
		const index = feasibleCells[k%feasibleCells.length];
		// make sure this cell isn't occupied
		if (cellContent[index.i][index.j] !== null)
			continue;
		// generate the candidate
		const typeCutoff = rng.random();
		const type = binarySearch(cumulativeProbability, (x) => x > typeCutoff) - 1;
		const candidate = {
			type: type,
			diameter: discTypes[type].diameter,
			x: grid.xMin + index.i*grid.Δx + rng.uniform(0, grid.Δx),
			y: grid.yMin + index.j*grid.Δy + rng.uniform(0, grid.Δy),
		};
		// make sure it's not too close to any other points
		const searchRadius = Math.ceil((candidate.diameter/2 + maxRadius)/gridScale);
		for (let iPrime = index.i - searchRadius; iPrime <= index.i + searchRadius; iPrime ++) {
			for (let jPrime = index.j - searchRadius; jPrime <= index.j + searchRadius; jPrime ++) {
				if (iPrime >= 0 && iPrime < grid.numX &&
					jPrime >= 0 && jPrime < grid.numY &&
					cellContent[iPrime][jPrime] !== null
				) {
					const priorPoint = points[cellContent[iPrime][jPrime]];
					const distance = Math.hypot(
						candidate.x - priorPoint.x, candidate.y - priorPoint.y);
					if (distance < (candidate.diameter + priorPoint.diameter)/2)
						continue candidateGeneration;
				}
			}
		}
		// make sure it's not in a forbidden zone
		if (cellForbiddenness.get(candidate.diameter)[index.i][index.j].clusion === Side.IN)
			continue;
		else if (cellForbiddenness.get(candidate.diameter)[index.i][index.j].clusion === Side.BORDERLINE) {
			for (const k of cellForbiddenness.get(candidate.diameter)[index.i][index.j].regionIndexes) {
				const candidateForbiddenness = contains(
					forbiddenRegions.get(candidate.diameter)[k],
					generic(candidate),
					INFINITE_PLANE, Rule.POSITIVE,
				);
				if (candidateForbiddenness === Side.IN)
					continue candidateGeneration;
			}
		}
		// if it passes all tests, add it to the list and mark this cell
		cellContent[index.i][index.j] = points.length;
		points.push(candidate);
	}

	return points;
}


/**
 * determine whether each cell of a grid is wholly contained by any of the given regions, using a positive fill rule
 * @param regions the set of regions that might contain each cell
 * @param grid the parameters defining the gric cell sizes and locations
 * @return a 2D array indexed by the horizontal index and then the vertical index,
 *         containing {
 *           clusion: IN for cells wholly contained by a region, OUT for cells wholly outside all regions,
 *                    and BORDERLINE for cells that are touched by a region's edge.
 *           touching: the list of indices of regions for paths that touch this cell, if clusion is BORDERLINE.
 *         }
 */
export function containsRaster(regions: PathSegment[][], grid: Grid): {clusion: Side, regionIndexes: Set<number> | null}[][] {
	// initialize the array with null
	const result: {clusion: Side, regionIndexes: Set<number> | null}[][] = [];
	for (let i = 0; i < grid.numX; i ++) {
		result.push([]);
		for (let j = 0; j < grid.numY; j ++)
			result[i].push({clusion: Side.OUT, regionIndexes: null});
	}


	// apply each region one at a time
	for (let k = 0; k < regions.length; k ++) {
		const borderlineCells: {i: number, j: number}[] = [];
		// look for places where it crosses the horizontal gridlines
		const verticalCrossings = getAllCombCrossings(regions[k], grid.yMin, grid.Δy, INFINITE_PLANE);
		for (const verticalCrossing of verticalCrossings) {
			const j = verticalCrossing.lineIndex;
			const i = Math.floor((verticalCrossing.s - grid.xMin)/grid.Δx);
			// each vertical crossing hits two cells: [i, j] and [i, j - 1]
			borderlineCells.push({i: i, j: j});
			borderlineCells.push({i: i, j: j - 1});
		}
		// look for places where it crosses the vertical gridlines
		const horizontalCrossings = getAllCombCrossings(rotatePath(regions[k], 270), grid.xMin, grid.Δx, INFINITE_PLANE);
		for (const horizontalCrossing of horizontalCrossings) {
			const i = horizontalCrossing.lineIndex;
			const j = Math.floor((-horizontalCrossing.s - grid.yMin)/grid.Δy);
			// each horizontal crossing hits two cells: [i, j] and [i - 1, j]
			borderlineCells.push({i: i, j: j});
			borderlineCells.push({i: i - 1, j: j});
		}

		// apply BORDERLINE to the appropriate cells along the edge
		for (const {i, j} of borderlineCells) {
			if (i >= 0 && i < grid.numX && j >= 0 && j < grid.numY && result[i][j].clusion !== Side.IN) {
				result[i][j].clusion = Side.BORDERLINE;
				if (result[i][j].regionIndexes === null)
					result[i][j].regionIndexes = new Set([k]);
				else
					result[i][j].regionIndexes.add(k);
			}
		}

		// then group crossings by line to identify cells that are at least partially IN
		let lineIndexMin = Infinity;
		let lineIndexMax = -Infinity;
		for (const {lineIndex} of verticalCrossings) {
			if (lineIndex < lineIndexMin)
				lineIndexMin = lineIndex;
			if (lineIndex > lineIndexMax)
				lineIndexMax = lineIndex;
		}
		const lineCrossings: {x: number, goingDown: boolean}[][] = [];
		for (let lineIndex = lineIndexMin; lineIndex <= lineIndexMax; lineIndex ++)
			lineCrossings.push([]);
		for (const {lineIndex, s, goingEast} of verticalCrossings)
			lineCrossings[lineIndex - lineIndexMin].push({x: s, goingDown: goingEast});

		// go along each line to set the appropriate cells to IN, assuming we didn't already mark them BORDERLINE
		for (let lineIndex = lineIndexMin; lineIndex <= lineIndexMax; lineIndex ++) {
			lineCrossings[lineIndex - lineIndexMin].sort(((a, b) => a.x - b.x));
			let wrappings = 0;
			let startOfIn = -Infinity;
			for (const {x, goingDown} of lineCrossings[lineIndex - lineIndexMin]) {
				if (goingDown) {
					if (wrappings === 0)
						startOfIn = x;
					wrappings ++;
				}
				else {
					wrappings --;
					if (wrappings === 0) {
						const iMin = Math.floor((startOfIn - grid.xMin)/grid.Δx);
						const iMax = Math.floor((x - grid.xMin)/grid.Δx);
						for (let i = Math.max(0, iMin + 1); i < Math.min(iMax, grid.numX); i ++)
							for (const j of [lineIndex - 1, lineIndex])
								if (j >= 0 && j < grid.numY)
									if (!(result[i][j].regionIndexes !== null && result[i][j].regionIndexes.has(k)))
										result[i][j].clusion = Side.IN;
					}
				}
			}
		}
	}

	return result;
}


interface Grid {
	/** the left edge of the leftmost cell */
	xMin: number;
	/** the width of each cell */
	Δx: number;
	/** the number of columns in the grid */
	numX: number;
	/** the top edge of the topmost cell */
	yMin: number;
	/** the height of each cell */
	Δy: number;
	/** the number of rows in the grid */
	numY: number;
}
