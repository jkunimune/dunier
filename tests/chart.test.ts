/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Chart} from "../source/mapping/chart.js";
import {Sphere} from "../source/generation/surface/sphere.js";
import {Random} from "../source/utilities/random.js";

test("rectangle", () => {
	expect(Chart.rectangle(1, 2, 3, 4, true)).toEqual([
		{type: 'M', args: [1, 2]},
		{type: 'Φ', args: [1, 4]},
		{type: 'Λ', args: [3, 4]},
		{type: 'Φ', args: [3, 2]},
		{type: 'Λ', args: [1, 2]},
	]);
});

describe("all together", () => {
	const globe = new Sphere(1);
	globe.initialize();
	globe.populateWith(globe.randomlySubdivide(new Random(0)));
	test("full world Equal Earth", () => {
		const chart = new Chart(
			"equal_earth", globe, globe.tiles,
			"north", true, 14.3861, new Map<string, number>);
		expect(chart.dimensions).toEqual(expect.objectContaining({
			left: expect.closeTo(-2.7893 - 0.5, 1),
			right: expect.closeTo(2.7893 + 0.5, 1),
			bottom: 0.5,
			top: expect.closeTo(-2.5788 - 0.5, 1),
		}));
	});
});
