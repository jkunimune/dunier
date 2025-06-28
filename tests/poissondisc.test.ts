/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {poissonDiscSample, rasterInclusion} from "../source/utilities/poissondisc.js";
import {Side} from "../source/utilities/miscellaneus.js";

test("maximal sampling", () => {
	const path = [
		{type: 'M', args: [0, 0]},
		{type: 'L', args: [0, 2]},
		{type: 'L', args: [2, 2]},
		{type: 'L', args: [2, 0]},
		{type: 'Z', args: []},
	];
	const points = poissonDiscSample(path, 1, 24);
	expect(points.length).toBeGreaterThanOrEqual(4);
	expect(points.length).toBeLessThanOrEqual(9);
	for (let i = 0; i < points.length; i ++)
		for (let j = 0; j < i; j ++)
			expect(Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)).toBeGreaterThanOrEqual(1);
});

test("rasterInclusion", () => {
	const grid = {xMin: 0, numX: 6, width: 6, yMin: 0, numY: 6, height: 6};
	const path = [
		{type: 'M', args: [5.25, 0.25]},
		{type: 'L', args: [0.25, 5.25]},
		{type: 'L', args: [4.75, 4.75]},
		{type: 'L', args: [5.25, 0.25]},
	];
	expect(rasterInclusion(path, grid)).toEqual([
		[Side.OUT,        Side.OUT,        Side.OUT,        Side.OUT,        Side.BORDERLINE, Side.BORDERLINE],
		[Side.OUT,        Side.OUT,        Side.OUT,        Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE],
		[Side.OUT,        Side.OUT,        Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE],
		[Side.OUT,        Side.BORDERLINE, Side.BORDERLINE, Side.IN,         Side.BORDERLINE, Side.OUT],
		[Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE, Side.OUT],
		[Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE, Side.OUT,        Side.OUT,        Side.OUT],
	]);
});
