/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Chart} from "../source/map/chart.js";
import {Sphere} from "../source/surface/sphere.js";

describe("chooseCentralMeridian", () => {
	test("front hemisphere", () => {
		const path = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [0, Math.PI/3]}];
		expect(Chart.chooseCentralMeridian(path)).toBeCloseTo(Math.PI/6);
	});
	test("back hemisphere", () => {
		const path = [
			{type: 'M', args: [0, Math.PI/2]},
			{type: 'L', args: [0, -3*Math.PI/4]}];
		expect(Chart.chooseCentralMeridian(path)).toBeCloseTo(7*Math.PI/8);
	});
	test("two parts", () => {
		const path = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [0, Math.PI/4]},
			{type: 'M', args: [0, Math.PI/2]},
			{type: 'L', args: [0, Math.PI]}];
		expect(Chart.chooseCentralMeridian(path)).toBeCloseTo(Math.PI/2);
	});
	test("all longitudes", () => {
		const path = [
			{type: 'M', args: [0, -Math.PI]},
			{type: 'L', args: [0, -Math.PI/3]},
			{type: 'L', args: [0, Math.PI/3]},
			{type: 'L', args: [0, Math.PI]}];
		expect(Chart.chooseCentralMeridian(path)).toBeCloseTo(0);
	});
});

test("rectangle", () => {
	expect(Chart.rectangle(1, 2, 3, 4, true)).toEqual([
		{type: 'M', args: [1, 2]},
		{type: 'Φ', args: [1, 4]},
		{type: 'Λ', args: [3, 4]},
		{type: 'Φ', args: [3, 2]},
		{type: 'Λ', args: [1, 2]},
	]);
});

describe("calculatePathBounds", () => {
	test("empty", () => {
		expect(() => Chart.calculatePathBounds([])).toThrow();
	});
	test("forward arc", () => {
		const path = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [0, 1]},
			{type: 'A', args: [1, 1, 0, 0, 0, Math.sqrt(3)/2, -1/2]},
			{type: 'Q', args: [0, -2, 0, -1/2]},
			{type: 'Z', args: []},
		];
		expect(Chart.calculatePathBounds(path)).toEqual({
			sMin: expect.closeTo(0),
			sMax: expect.closeTo(1),
			tMin: expect.closeTo(-2),
			tMax: expect.closeTo(1)
		});
	});
	test("backwards arc", () => {
		const path = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [0, 1]},
			{type: 'A', args: [1, 1, 0, 0, 1, -Math.sqrt(3)/2, -1/2]},
			{type: 'Q', args: [0, -2, 0, -1/2]},
			{type: 'Z', args: []},
		];
		expect(Chart.calculatePathBounds(path)).toEqual({
			sMin: expect.closeTo(-1),
			sMax: expect.closeTo(0),
			tMin: expect.closeTo(-2),
			tMax: expect.closeTo(1)
		});
	});
	test("degenerate arc", () => {
		const path = [
			{type: 'M', args: [6, 6]},
			{type: 'A', args: [2, 2, 0, 0, 0, 6, 6]},
		];
		expect(() => Chart.calculatePathBounds(path)).toThrow();
	});
	test("point at end of arc", () => {
		const path = [
			{type: 'M', args: [0, 0]},
			{type: 'A', args: [2, 2, 0, 0, 0, 2, 0]},
			{type: 'L', args: [1, -1]},
			{type: 'Z', args: []}
		];
		expect(Chart.calculatePathBounds(path)).toEqual({
			sMin: expect.closeTo(0),
			sMax: expect.closeTo(2),
			tMin: expect.closeTo(-1),
			tMax: expect.closeTo(2 - Math.sqrt(3)),
		});
	});
});

describe("all together", () => {
	const globe = new Sphere(1);
	globe.initialize();
	test("full world Equal Earth", () => {
		const chart = new Chart(
			"equal_area", globe, [], true, true);
		expect(chart.dimensions).toEqual(expect.objectContaining({
			left: expect.closeTo(-2.7893), right: expect.closeTo(2.7893),
			bottom: 0, top: expect.closeTo(-2.5788),
		}));
	});
});
