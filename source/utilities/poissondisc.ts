/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {generic, PathSegment, XYPoint} from "./coordinates.js";
import {
	calculatePathBounds,
	contains,
	getAllCombCrossings,
	INFINITE_PLANE, reversePath, rotatePath,
	Rule,
	Side
} from "../mapping/pathutilities.js";
import {Random} from "./random.js";
import {offset} from "./offset.js";

/**
 * generate a set of random points in a region of a plane
 * where no two points are closer than a given minimum distance.
 * @param region the path that defines the bounds of the region to sample
 * @param walls any line features that samples need to avoid
 * @param density the density of points to attempt.  the actual density will be lower if miDistance is nonzero; it will max out somewhere around 0.69minDistance**-2
 * @param minDistance the minimum allowable distance between two samples
 * @param rng the random number generator to use
 */
export function poissonDiscSample(region: PathSegment[], walls: PathSegment[][], density: number, minDistance: number, rng: Random): XYPoint[] {
	// decide on the area to sample
	const feasibleRegion = offset(region, -minDistance/2);
	const domainBounds = calculatePathBounds(feasibleRegion);

	// establish the grid
	const gridScale = minDistance/Math.sqrt(2);
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

	// whether each cell is fully in the feasible space, fully infeasible, or mixed
	const cellFeasibility = rasterInclusion(feasibleRegion, grid, Rule.POSITIVE);
	// the index of the sample in each grid cell, or null if there is none
	const cellContent: number[][] = [];
	for (let i = 0; i < numX; i ++) {
		cellContent.push([]);
		for (let j = 0; j < numY; j ++)
			cellContent[i].push(null);
	}

	// decide on the order in which you will test each cell
	const feasibleCells: {i: number, j: number}[] = [];
	for (let i = 0; i < numX; i ++)
		for (let j = 0; j < numY; j ++)
			if (cellFeasibility[i][j] !== Side.OUT)
				feasibleCells.push({i: i, j: j});
	shuffle(feasibleCells, rng);

	// decide on any additional areas where you definitely can't sample
	const forbiddenRegions = [];
	for (const wall of walls)
		forbiddenRegions.push(offset(wall, minDistance/2).concat(offset(reversePath(wall), minDistance/2)));
	const cellForbidenness = [];
	for (const forbiddenRegion of forbiddenRegions)
		cellForbidenness.push(rasterInclusion(forbiddenRegion, grid, Rule.POSITIVE));

	// draw a certain number of candidates
	const feasibleArea = grid.Δx*grid.Δy*feasibleCells.length;
	const numCandidates = Math.round(feasibleArea*Math.min(100/minDistance**2, density));
	const points: XYPoint[] = [];
	candidateGeneration:
	for (let k = 0; k < numCandidates; k ++) {
		const index = feasibleCells[k%feasibleCells.length];
		const candidate = {
			x: grid.xMin + index.i*grid.Δx + rng.uniform(0, grid.Δx),
			y: grid.yMin + index.j*grid.Δy + rng.uniform(0, grid.Δy),
		};
		// make sure it's not too close to any other points
		if (cellContent[index.i][index.j] !== null)
			continue;
		for (let iPrime = index.i - 2; iPrime <= index.i + 2; iPrime ++) {
			for (let jPrime = index.j - 2; jPrime <= index.j + 2; jPrime ++) {
				if (iPrime >= 0 && iPrime < grid.numX &&
					jPrime >= 0 && jPrime < grid.numY &&
					cellContent[iPrime][jPrime] !== null
				) {
					const priorPoint = points[cellContent[iPrime][jPrime]];
					const distance = Math.hypot(
						candidate.x - priorPoint.x, candidate.y - priorPoint.y);
					if (distance < minDistance)
						continue candidateGeneration;
				}
			}
		}
		// make sure it's in
		if (cellFeasibility[index.i][index.j] !== Side.IN)
			if (contains(feasibleRegion, generic(candidate), INFINITE_PLANE, Rule.POSITIVE) !== Side.IN)
				continue;
		// make sure it's not clipping thru a wall
		for (let l = 0; l < forbiddenRegions.length; l ++)
			if (cellForbidenness[l][index.i][index.j] !== Side.OUT)
				if (contains(forbiddenRegions[l], generic(candidate), INFINITE_PLANE, Rule.POSITIVE) !== Side.OUT)
					continue candidateGeneration;
		// if it passes all tests, add it to the list and mark this cell
		cellContent[index.i][index.j] = points.length;
		points.push(candidate);
	}

	return points;
}


/**
 * determine whether each cell of a gri is wholly contained or wholly excluded by the given region
 * @return a 2D array indexed by the horizontal index and then the vertical index,
 *         containing IN for cells wholly contained by the region, OUT for cells wholly outside the region,
 *         and BORDERLINE for cells that are touched by the region's edge.
 */
export function rasterInclusion(region: PathSegment[], grid: Grid, rule: Rule): Side[][] {
	// initialize the array with null
	const result: Side[][] = [];
	for (let i = 0; i < grid.numX; i ++) {
		result.push([]);
		for (let j = 0; j < grid.numY; j ++)
			result[i].push(null);
	}

	// trace the edges and mark all BORDERLINE cells
	const verticalCrossings = getAllCombCrossings(region, grid.yMin, grid.Δy, INFINITE_PLANE);
	for (const verticalCrossing of verticalCrossings) {
		const j = verticalCrossing.j;
		const i = Math.min(Math.floor((verticalCrossing.s - grid.xMin)/grid.Δx), grid.numX - 1);
		if (i >= 0 && i < grid.numX) {
			if (j - 1 >= 0 && j - 1 < grid.numY)
				result[i][j - 1] = Side.BORDERLINE;
			if (j >= 0 && j < grid.numY)
				result[i][j] = Side.BORDERLINE;
		}
	}
	const horizontalCrossings = getAllCombCrossings(rotatePath(region, 270), grid.xMin, grid.Δx, INFINITE_PLANE);
	for (const horizontalCrossing of horizontalCrossings) {
		const i = horizontalCrossing.j;
		const j = Math.min(Math.floor((-horizontalCrossing.s - grid.yMin)/grid.Δy), grid.numY - 1);
		if (j >= 0 && j < grid.numY) {
			if (i - 1 >= 0 && i - 1 < grid.numX)
				result[i - 1][j] = Side.BORDERLINE;
			if (i >= 0 && i < grid.numX)
				result[i][j] = Side.BORDERLINE;
		}
	}

	// finally, go thru the remaining cells and set them to IN or OUT
	for (let i = 0; i < grid.numX; i ++) {
		for (let j = 0; j < grid.numY; j ++) {
			if (result[i][j] === null) {
				const value = contains(region, {
					s: grid.xMin + (i + 1/2)*grid.Δx,
					t: grid.yMin + (j + 1/2)*grid.Δy,
				}, INFINITE_PLANE, rule);
				if (value === Side.BORDERLINE)
					throw new Error("it shouldn't be possible for this grid cell to be borderline; I thaut we found all of those!");
				floodFill(result, i, j, value);
			}
		}
	}

	return result;
}


/**
 * populate every null space connected to the given index in the 2D array with the given value
 */
function floodFill<T>(matrix: (T | null)[][], iStart: number, jStart: number, value: T) {
	const queue: {i: number, j: number}[] = [{i: iStart, j: jStart}];
	while (queue.length > 0) {
		const {i, j} = queue.pop();
		if (matrix[i][j] === null) {
			matrix[i][j] = value;
			if (i - 1 >= 0)
				queue.push({i: i - 1, j: j});
			if (i + 1 < matrix.length)
				queue.push({i: i + 1, j: j});
			if (j - 1 >= 0)
				queue.push({i: i, j: j - 1});
			if (j + 1 < matrix[i].length)
				queue.push({i: i, j: j + 1});
		}
	}
}


/**
 * randomly shuffle an array in-place using the "forward" version of the Fisher–Yates algorithm
 * https://possiblywrong.wordpress.com/2020/12/10/the-fisher-yates-shuffle-is-backward/
 */
function shuffle<T>(array: T[], rng: Random): void {
	for (let i = 0; i < array.length; i ++) {
		const j = Math.floor(rng.uniform(0, i + 1));
		const a = array[i];
		const b = array[j];
		array[j] = a;
		array[i] = b;
	}
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
