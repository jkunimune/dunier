/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {generic, PathSegment} from "./coordinates.js";
import {
	calculatePathBounds,
	contains, doublePath,
	getAllCombCrossings,
	INFINITE_PLANE, rotatePath,
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

	// the region in which centers may exist
	const feasibleRegion = new Map<number, PathSegment[]>();
	feasibleRegion.set(0, region);
	for (const {diameter} of discTypes)
		if (!feasibleRegion.has(diameter))
			feasibleRegion.set(diameter, offset(region, -diameter/2));

	// whether each cell is fully in the feasible space, fully infeasible, or mixed
	const cellFeasibility = new Map<number, Side[][]>();
	for (const diameter of feasibleRegion.keys())
		cellFeasibility.set(diameter, rasterInclusion(feasibleRegion.get(diameter), grid, Rule.POSITIVE));

	// the index of the sample in each grid cell, or null if there is none
	const cellContent: number[][] = [];
	for (let i = 0; i < numX; i ++) {
		cellContent.push([]);
		for (let j = 0; j < numY; j ++)
			cellContent[i].push(null);
	}

	// rule out any additional areas where you definitely can't sample
	const forbiddenRegion = new Map<number, PathSegment[]>();
	const doubledWalls = [].concat(...walls.map(wall => doublePath(wall)));
	for (const diameter of feasibleRegion.keys()) {
		forbiddenRegion.set(diameter, offset(doubledWalls, diameter/2));
		const cellForbidenness = rasterInclusion(forbiddenRegion.get(diameter), grid, Rule.POSITIVE);
		for (let i = 0; i < numX; i ++) {
			for (let j = 0; j < numY; j ++) {
				if (cellForbidenness[i][j] === Side.IN)
					cellFeasibility.get(diameter)[i][j] = Side.OUT;
				else if (cellForbidenness[i][j] === Side.BORDERLINE && cellFeasibility.get(diameter)[i][j] !== Side.OUT)
					cellFeasibility.get(diameter)[i][j] = Side.BORDERLINE;
			}
		}
	}

	// decide on the order in which you will test each cell
	const feasibleCells: {i: number, j: number}[] = [];
	for (let i = 0; i < numX; i ++)
		for (let j = 0; j < numY; j ++)
			// look for cells that could contain the smallest discs; make sure they're also in the plain region (that last check is necessary because my offsets are janky)
			if (cellFeasibility.get(minDistance)[i][j] !== Side.OUT && cellFeasibility.get(0)[i][j] !== Side.OUT)
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
		// make sure it's in
		if (cellFeasibility.get(candidate.diameter)[index.i][index.j] === Side.OUT)
			continue;
		else if (cellFeasibility.get(candidate.diameter)[index.i][index.j] === Side.BORDERLINE) {
			const candidateFeasibility = contains(
				feasibleRegion.get(candidate.diameter),
				generic(candidate),
				INFINITE_PLANE, Rule.POSITIVE,
			);
			if (candidateFeasibility === Side.OUT)
				continue;
		}
		// make sure it's not too close to a wall
		const candidateForbiddenness = contains(
			forbiddenRegion.get(candidate.diameter),
			generic(candidate),
			INFINITE_PLANE, Rule.POSITIVE,
		);
		if (candidateForbiddenness === Side.IN)
			continue;
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
		const i = Math.floor((verticalCrossing.s - grid.xMin)/grid.Δx);
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
		const j = Math.floor((-horizontalCrossing.s - grid.yMin)/grid.Δy);
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
			if (i - 1 >= 0 && matrix[i - 1][j] === null)
				queue.push({i: i - 1, j: j});
			if (i + 1 < matrix.length && matrix[i + 1][j] === null)
				queue.push({i: i + 1, j: j});
			if (j - 1 >= 0 && matrix[i][j - 1] === null)
				queue.push({i: i, j: j - 1});
			if (j + 1 < matrix[i].length && matrix[i][j + 1] === null)
				queue.push({i: i, j: j + 1});
		}
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
