/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {assert_xy, endpoint, generic, PathSegment, XYPoint} from "./coordinates.js";
import {calculatePathBounds, contains, INFINITE_PLANE, polygonize} from "../mapping/pathutilities.js";
import {Side} from "./miscellaneus.js";

/**
 * generate a maximal set of random points in a region of a plane
 * where no two points are closer than a given minimum distance.
 * this function uses a modified version of Robert Bridson's algorithm (see [1])
 * that confines samples to a given region and uses the grid to find new samples rather than previus elements.
 * this allows us to ensure we fill all parts of the region even if it's noncontiguus.  the way I've done it
 * does cause grid cells on the region boundary to be a little bit oversampled, but that's probably fine.
 * the region near the edge is always going to be a little oversampled when you're doing maximal sampling,
 * unless you also generate samples outside the boundary, which I'd like to avoid.
 * the algorithm used to identify which cells are feasible is similar to that by Ebeida's et al (see [2]).
 * 1. "Fast Poisson disk sampling in arbitrary dimensions" in the ACM SIGGRAPH 2007 proceedings, DOI: 10.1145/1278780.1278807
 * 2. "Efficient Maximal Poisson-Disk Sampling" in ACM Transactions on Graphics 30, DOI: 10.1145/2010324.1964944
 * @param region the path that defines the bounds of the region to sample
 * @param minDistance the minimum allowable distance between two samples
 * @param numTries the number of times ot try each cell before declaring that it's impossible (note: each cell is
 *                 4.7× smaller than Bridson's sampling annulus, so that's why I only try 6 times, not 30)
 */
export function poissonDiscSample(region: PathSegment[], minDistance: number, numTries=6): XYPoint[] {
	region = polygonize(region);

	// establish the grid
	const gridScale = minDistance/Math.sqrt(2);
	const regionBounds = calculatePathBounds(region);
	const numX = Math.ceil((regionBounds.sMax - regionBounds.sMin)/gridScale);
	const numY = Math.ceil((regionBounds.tMax - regionBounds.tMin)/gridScale);
	const grid = {
		xMin: regionBounds.sMin,
		numX: numX,
		width: numX*gridScale,
		yMin: regionBounds.tMin,
		numY: numY,
		height: numY*gridScale,
	};

	// whether each cell is fully in the feasible space, fully infeasible, or mixed
	const cellFeasibility = rasterInclusion(region, grid);
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
	const remainingCells: {i: number, j: number}[] = [];
	for (let i = 0; i < numX; i ++)
		for (let j = 0; j < numY; j ++)
			if (cellFeasibility[i][j] !== Side.OUT)
				remainingCells.push({i: i, j: j});
	shuffle(remainingCells);

	const points: XYPoint[] = [];

	// go thru the list of open cells like a queue...
	while (remainingCells.length > 0) {
		const {i, j} = remainingCells.pop();
		// generate up to k samples uniformly in the cell
		candidateGeneration:
		for (let trie = 0; trie < numTries; trie ++) {
			const candidate = {
				x: grid.xMin + (i + Math.random())*grid.width/grid.numX,
				y: grid.yMin + (j + Math.random())*grid.height/grid.numY,
			};
			// make sure it's in
			if (cellFeasibility[i][j] === Side.IN || contains(region, generic(candidate), INFINITE_PLANE)) {
				// make sure it's not too close to any other points
				for (let iPrime = i - 2; iPrime <= i + 2; iPrime ++) {
					for (let jPrime = j - 2; jPrime <= j + 2; jPrime ++) {
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
				// if it passes both tests, add it to the list and mark this cell
				cellContent[i][j] = points.length;
				points.push(candidate);
				break; // no need to keep looking after that
			}
		}
	}

	return points;
}


/**
 * determine whether each cell of a gri is wholly contained or wholly excluded by the given region
 * @return a 2D array indexed by the horizontal index and then the vertical index,
 *         containing IN for cells wholly contained by the region, OUT for cells wholly outside the region,
 *         and BORDERLINE for cells that are touched by the region's edge.
 */
export function rasterInclusion(region: PathSegment[], grid: Grid): Side[][] {
	// initialize the array with null
	const result: Side[][] = [];
	for (let k = 0; k < grid.numX; k ++) {
		result.push([]);
		for (let j = 0; j < grid.numY; j ++)
			result[k].push(null);
	}

	// trace the edges and mark all BORDERLINE cells
	for (let k = 1; k < region.length; k ++) {
		if (region[k].type === 'M')
			continue;
		else if (region[k].type === 'L') {
			const start = assert_xy(endpoint(region[k - 1]));
			const end = assert_xy(endpoint(region[k]));
			const startBin = bin(start, grid);
			const endBin = bin(end, grid);
			// mark the cell containing at least one endpoint
			result[startBin.i][startBin.j] = Side.BORDERLINE;
			// for each vertical edge it crosses, mark the cells on either side
			for (let i = Math.min(startBin.i, endBin.i) + 1; i <= Math.max(startBin.i, endBin.i); i ++) {
				const xCrossing = grid.xMin + i*grid.width/grid.numX;
				const yCrossing = (xCrossing - start.x)/(end.x - start.x)*(end.y - start.y) + start.y;
				const {j} = bin({x: xCrossing, y: yCrossing}, grid);
				result[i][j] = Side.BORDERLINE;
				result[i - 1][j] = Side.BORDERLINE;
			}
			// for each horizontal edge it crosses, mark the cells on either side
			for (let j = Math.min(startBin.j, endBin.j) + 1; j <= Math.max(startBin.j, endBin.j); j ++) {
				const yCrossing = grid.yMin + j*grid.height/grid.numY;
				const xCrossing = (yCrossing - start.y)/(end.y - start.y)*(end.x - start.x) + start.x;
				const {i} = bin({x: xCrossing, y: yCrossing}, grid);
				result[i][j] = Side.BORDERLINE;
				result[i][j - 1] = Side.BORDERLINE;
			}
		}
		else
			throw new Error(`disallowed segment type here: '${region[k].type}'.  you need to polygonize this first.`);
	}

	// finally, go thru the remaining cells and set them to IN or OUT
	for (let i = 0; i < grid.numX; i ++) {
		for (let j = 0; j < grid.numY; j ++) {
			if (result[i][j] === null) {
				const value = contains(region, {
					s: grid.xMin + (i + 1/2)*grid.width/grid.numX,
					t: grid.yMin + (j + 1/2)*grid.height/grid.numY,
				});
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
function floodFill<T>(matrix: (T | null)[][], i: number, j: number, value: T) {
	matrix[i][j] = value;
	if (i - 1 >= 0 && matrix[i - 1][j] === null)
		floodFill(matrix, i - 1, j, value);
	if (i + 1 < matrix.length && matrix[i + 1][j] === null)
		floodFill(matrix, i + 1, j, value);
	if (j - 1 >= 0 && matrix[i][j - 1] === null)
		floodFill(matrix, i, j - 1, value);
	if (j + 1 < matrix[i].length && matrix[i][j + 1] === null)
		floodFill(matrix, i, j + 1, value);
}


/**
 * randomly shuffle an array in-place using the "forward" version of the Fisher–Yates algorithm
 * https://possiblywrong.wordpress.com/2020/12/10/the-fisher-yates-shuffle-is-backward/
 */
function shuffle<T>(array: T[]): void {
	for (let i = 0; i < array.length; i ++) {
		const j = Math.floor(Math.random()*(i + 1));
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
	if (point.x < grid.xMin || point.x - grid.xMin > grid.width || point.y < grid.yMin || point.y - grid.yMin > grid.height)
		throw new Error(`this point is out of bounds of the grid: ${point}.`);
	return {
		i: Math.min(Math.floor((point.x - grid.xMin)/grid.width*grid.numX), grid.numX - 1),
		j: Math.min(Math.floor((point.y - grid.yMin)/grid.height*grid.numY), grid.numY - 1),
	};
}


interface Grid {
	/** the left edge of the leftmost cell */
	xMin: number;
	/** the distance from the left edge of the leftmost cell to the right edge of the rightmost cell */
	width: number;
	/** the number of columns in the grid */
	numX: number;
	/** the top edge of the topmost cell */
	yMin: number;
	/** the distance from the top edge of the topmost cell to the bottom edge of the bottommost cell */
	height: number;
	/** the number of rows in the grid */
	numY: number;
}
