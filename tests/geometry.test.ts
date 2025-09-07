/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {
	angleSign, arcCenter,
	checkVoronoiPolygon,
	crossingSign,
	lineArcIntersections, lineSegmentDistance, orthogonalBasis,
	trajectoryIntersection, Vector
} from "../source/utilities/geometry.js";

describe("crossingSign()", () => {
	test("positive", () => {
		expect(crossingSign({x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 2, y: 2})).toBeGreaterThan(0);
	});
	test("negative", () => {
		expect(crossingSign({x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 2, y: -2})).toBeLessThan(0);
	});
	test("parallel", () => {
		expect(crossingSign({x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 4, y: 2})).toBeCloseTo(0);
	});
	test("antiparallel", () => {
		expect(crossingSign({x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 0, y: -2})).toBeCloseTo(0);
	});
	test("stationary", () => {
		expect(crossingSign({x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 2, y: 0})).toBeCloseTo(0);
	});
});

describe("angleSign()", () => {
	test("positive", () => {
		expect(angleSign({x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1})).toBeGreaterThan(0);
	});
	test("negative", () => {
		expect(angleSign({x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 0})).toBeLessThan(0);
	});
	test("degenerate", () => {
		expect(angleSign({x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2})).toBeCloseTo(0);
	});
});

describe("arcCenter()", () => {
	test("on the right", () => {
		expect(arcCenter({x: 0, y: -1}, {x: 1, y: 0}, 1, true)).toEqual(
			{x: expect.closeTo(0), y: expect.closeTo(0)});
	});
	test("on the left", () => {
		expect(arcCenter({x: 0, y: -1}, {x: 1, y: 0}, 1, false)).toEqual(
			{x: expect.closeTo(1), y: expect.closeTo(-1)});
	});
	test("180°", () => {
		expect(arcCenter({x: 0, y: 0}, {x: 2, y: -2}, Math.sqrt(2), true)).toEqual(
			{x: expect.closeTo(1), y: expect.closeTo(-1)});
	});
	test("a little bit too short", () => {
		expect(arcCenter({x: 0, y: 0}, {x: 2.000001, y: -2.000001}, Math.sqrt(2), true)).toEqual(
			{x: expect.closeTo(1), y: expect.closeTo(-1)});
	});
});

describe("trajectoryIntersection()", () => {
	test("normal", () => {
		expect(trajectoryIntersection(
			{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 0, y: -2})).toEqual(
			{x: expect.closeTo(2), y: expect.closeTo(2), ta: expect.closeTo(2), tb: expect.closeTo(-1)});
	});
	test("parallel", () => {
		expect(() => trajectoryIntersection(
			{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: -2, y: -2})).toThrow();
	});
	test("stationary", () => {
		expect(() => trajectoryIntersection(
			{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 0, y: 0})).toThrow();
	});
});

describe("lineArcIntersections()", () => {
	test("secant", () => {
		const line = [{x: -1/2, y: 0}, {x: -1/2, y: 2}];
		const center = {x: 0, y: 1};
		const r = 1;
		const q0 = {x: 0, y: 2};
		const q1 = {x: 0, y: 0};
		expect(lineArcIntersections(line[0], line[1], center, r, q0, q1)).toEqual([
			{x: -1/2, y: 1 + Math.sqrt(3)/2},
			{x: -1/2, y: 1 - Math.sqrt(3)/2},
		]);
	});
	test("from inside to outside", () => {
		const line = [{x: -1/2, y: 1}, {x: -1/2, y: 2}];
		const center = {x: 0, y: 1};
		const r = 1;
		const q0 = {x: 0, y: 2};
		const q1 = {x: 0, y: 0};
		expect(lineArcIntersections(line[0], line[1], center, r, q0, q1)).toEqual([
			{x: -1/2, y: 1 + Math.sqrt(3)/2},
		]);
	});
	test("roundoff resistance", () => {
		const line = [{x: -2068.1868751652805, y: -129.1815424610015}, {x: 2068.1868751652805, y: -129.1815424610015}];
		const center = {x: 5.684341886080802e-14, y: -2.842170943040401e-14};
		const r = 533.6225571525157;
		const q0 = {x: -517.7500966580174, y: -129.18154246100173};
		const q1 = {x: -496.36792052009014, y: -195.8875212476573};
		expect(lineArcIntersections(line[0], line[1], center, r, q0, q1)).toEqual([]);
	});
});

describe("lineSegmentDistance()", () => {
	const start = {x: 0, y: 0};
	const end = {x: 4, y: 3};
	test("start point", () => {
		expect(lineSegmentDistance(start, end, {x: -2, y: 0})).toBeCloseTo(2);
	});
	test("middle", () => {
		expect(lineSegmentDistance(start, end, {x: 0.5, y: 3.5})).toBeCloseTo(2.5);
	});
	test("end point", () => {
		expect(lineSegmentDistance(start, end, {x: 4, y: 6})).toBeCloseTo(3);
	});
	test("degenerate", () => {
		expect(lineSegmentDistance(end, end, {x: 4, y: 6})).toBeCloseTo(3);
	});
});

describe("orthogonalBasis()", () => {
	test("Cartesian", () => {
		const {u, v, n} = orthogonalBasis(new Vector(0, 0, 1), true);
		expect(u.sqr()).toBeCloseTo(1);
		expect(v.sqr()).toBeCloseTo(1);
		expect(n).toEqual(expect.objectContaining({
			x: 0, y: 0, z: 1}));
		expect(u.dot(v)).toBeCloseTo(0);
		expect(v.dot(n)).toBeCloseTo(0);
		expect(n.dot(u)).toBeCloseTo(0);
	});
	test("random", () => {
		const {u, v, n} = orthogonalBasis(new Vector(2, -3, 6), true);
		expect(u.sqr()).toBeCloseTo(1);
		expect(v.sqr()).toBeCloseTo(1);
		expect(n).toEqual(expect.objectContaining({
			x: expect.closeTo(2/7), y: expect.closeTo(-3/7), z: expect.closeTo(6/7)}));
		expect(u.dot(v)).toBeCloseTo(0);
		expect(v.dot(n)).toBeCloseTo(0);
		expect(n.dot(u)).toBeCloseTo(0);
	});
});

describe("checkVoronoiPolygon()", () => {
	describe("full loop", () => {
		test("fine", () => {
			const originalPolygon = [
				{x: 1, y: 0},
				{x: 0, y: 2},
				{x: -3, y: -4},
			];
			expect(checkVoronoiPolygon(originalPolygon)).toEqual([
				expect.objectContaining({x: 1, y: 0}),
				expect.objectContaining({x: 0, y: 2}),
				expect.objectContaining({x: -3, y: -4}),
			]);
		});
		test("one segment backwards", () => {
			const originalPolygon = [
				{x: 1, y: 0},
				{x: 0, y: 2},
				{x: -3, y: -0.1},
				{x: -3, y: 0.1},
				{x: 0, y: -4},
			];
			expect(checkVoronoiPolygon(originalPolygon)).toEqual([
				expect.objectContaining({x: 1, y: 0}),
				expect.objectContaining({x: 0, y: 2}),
				expect.objectContaining({x: -3, y: 0.1}),
				expect.objectContaining({x: -3, y: -0.1}),
				expect.objectContaining({x: 0, y: -4}),
			]);
		});
		test("two segments backwards", () => {
			const originalPolygon = [
				{x: 1, y: 0},
				{x: 0, y: 2},
				{x: -3, y: -0.1},
				{x: -3, y: 0},
				{x: -3, y: 0.1},
				{x: 0, y: -4},
			];
			expect(checkVoronoiPolygon(originalPolygon)).toEqual([
				expect.objectContaining({x: 1, y: 0}),
				expect.objectContaining({x: 0, y: 2}),
				expect.objectContaining({x: -3, y: 0.1}),
				expect.objectContaining({x: -3, y: 0}),
				expect.objectContaining({x: -3, y: -0.1}),
				expect.objectContaining({x: 0, y: -4}),
			]);
		});
	});
	describe("incomplete", () => {
		test("fine", () => {
			const originalPolygon = [
				{x: 1, y: 0},
				{x: 3, y: 4},
				{x: 0, y: 2},
			];
			expect(checkVoronoiPolygon(originalPolygon)).toEqual([
				expect.objectContaining({x: 1, y: 0}),
				expect.objectContaining({x: 3, y: 4}),
				expect.objectContaining({x: 0, y: 2}),
			]);
		});
	});
});
