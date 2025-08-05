/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {generic, PathSegment, XYPoint} from "./coordinates.js";
import {
	calculatePathBounds,
	contains,
	getAllCombCrossings,
	INFINITE_PLANE, rotatePath,
	Rule,
	Side
} from "../mapping/pathutilities.js";
import {Random} from "./random.js";
import {offset} from "./offset.js";

/**
 * generate a set of random points in a region of a plane
 * where no two points are closer than a given minimum distance.
 * @param region the path that defines the bounds of the region to sample
 * @param density the density of points to attempt.  the actual density will be lower if miDistance is nonzero; it will max out somewhere around 0.69minDistance**-2
 * @param minDistance the minimum allowable distance between two samples
 * @param rng the random number generator to use
 */
export function poissonDiscSample(region: PathSegment[], density: number, minDistance: number, rng: Random): XYPoint[] {
	// decide on the area to sample
	const feasibleRegion = offset(region, -minDistance/2);
	const domainBounds = calculatePathBounds(feasibleRegion);
	domainBounds.sMin -= minDistance; // expand the domain area by R so that you don't get points clustering on the edge
	domainBounds.sMax += minDistance;
	domainBounds.tMin -= minDistance;
	domainBounds.tMax += minDistance;

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
		cellFeasibility.push([]);
		cellContent.push([]);
		for (let j = 0; j < numY; j ++) {
			cellFeasibility[i].push(null);
			cellContent[i].push(null);
		}
	}

	// decide on the order in which you will test each cell
	const feasibleCells: {i: number, j: number}[] = [];
	for (let i = 0; i < numX; i ++)
		for (let j = 0; j < numY; j ++)
			if (cellFeasibility[i][j] !== Side.OUT)
				feasibleCells.push({i: i, j: j});
	shuffle(feasibleCells, rng);

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
		if (cellFeasibility[index.i][index.j] === Side.BORDERLINE)
			if (!contains(feasibleRegion, generic(candidate), INFINITE_PLANE, Rule.POSITIVE))
				continue;
		// if it passes both tests, add it to the list and mark this cell
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
		const {i} = bin({x: verticalCrossing.s, y: grid.yMin}, grid);
		result[i][j - 1] = Side.BORDERLINE;
		result[i][j] = Side.BORDERLINE;
	}
	const horizontalCrossings = getAllCombCrossings(rotatePath(region, 270), grid.xMin, grid.Δx, INFINITE_PLANE);
	for (const horizontalCrossing of horizontalCrossings) {
		const i = horizontalCrossing.j;
		const {j} = bin({x: grid.xMin, y: -horizontalCrossing.s}, grid);
		result[i - 1][j] = Side.BORDERLINE;
		result[i][j] = Side.BORDERLINE;
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


/**
 * get the indices of the grid cell that contains the given point
 * @return i: the index of the column corresponding to point.x, and j: the index of the row corresponding to point.y
 */
function bin(point: XYPoint, grid: Grid): {i: number, j: number} {
	if (point.x < grid.xMin || point.x - grid.xMin > grid.Δx*grid.numX)
		throw new Error(`this point is out of the grid's x-bounds: (${point.x}, ${point.y}) where ${grid.xMin} <= x <= ${grid.xMin + grid.Δx*grid.numX}.`);
	if (point.y < grid.yMin || point.y - grid.yMin > grid.Δy*grid.numY)
		throw new Error(`this point is out of the grid's y-bounds: (${point.x}, ${point.y}) where ${grid.yMin} <= y <= ${grid.yMin + grid.Δy*grid.numY}.`);
	return {
		i: Math.min(Math.floor((point.x - grid.xMin)/grid.Δx), grid.numX - 1),
		j: Math.min(Math.floor((point.y - grid.yMin)/grid.Δy), grid.numY - 1),
	};
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
