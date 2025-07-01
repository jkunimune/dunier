/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {generic, PathSegment, XYPoint} from "./coordinates.js";
import {calculatePathBounds, contains} from "../mapping/pathutilities.js";

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
 * @param density the density of points to attempt.  the actual density will be lower if miDistance is nonzero; it will max out somewhere around 0.69minDistance**-2
 * @param minDistance the minimum allowable distance between two samples
 */
export function poissonDiscSample(region: PathSegment[], density: number, minDistance: number): XYPoint[] {
	// decide on the area to sample
	const domainBounds = calculatePathBounds(region);
	domainBounds.sMin -= minDistance;
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
		width: numX*gridScale,
		yMin: domainBounds.tMin,
		numY: numY,
		height: numY*gridScale,
	};

	// the index of the sample in each grid cell, or null if there is none
	const cellContent: number[][] = [];
	for (let i = 0; i < numX; i ++) {
		cellContent.push([]);
		for (let j = 0; j < numY; j ++)
			cellContent[i].push(null);
	}

	// draw a certain number of candidates
	const domainArea = (domainBounds.sMax - domainBounds.sMin)*(domainBounds.tMax - domainBounds.tMin);
	const numCandidates = Math.round(domainArea*Math.min(100/minDistance**2, density));
	const points: XYPoint[] = [];
	candidateGeneration:
	for (let k = 0; k < numCandidates; k ++) {
		const candidate = {
			x: grid.xMin + Math.random()*grid.width,
			y: grid.yMin + Math.random()*grid.height,
		};
		const index = bin(candidate, grid);
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
		// if it passes both tests, add it to the list and mark this cell
		cellContent[index.i][index.j] = points.length;
		points.push(candidate);
	}

	// now, downsample to just points inside the region
	const feasiblePoints: XYPoint[] = [];
	for (let i = points.length - 1; i >= 0; i --)
		if (contains(region, generic(points[i])))
			feasiblePoints.push(points[i]);

	return feasiblePoints;
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
