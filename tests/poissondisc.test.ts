/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {poissonDiscSample} from "../source/utilities/poissondisc.js";
import {Random} from "../source/utilities/random.js";

test("maximal sampling", () => {
	const path = [
		{type: 'M', args: [0, 0]},
		{type: 'L', args: [0, 4]},
		{type: 'L', args: [4, 4]},
		{type: 'L', args: [4, 0]},
		{type: 'L', args: [0, 0]},
	];
	const points = poissonDiscSample(path, Infinity, 1, new Random(0));
	expect(points.length).toBeGreaterThanOrEqual(4);
	expect(points.length).toBeLessThanOrEqual(23);
	for (let i = 0; i < points.length; i ++)
		for (let j = 0; j < i; j ++)
			expect(Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)).toBeGreaterThanOrEqual(1);
});
