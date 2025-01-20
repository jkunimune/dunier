/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {MapProjection} from "../source/map/projection.js";
import {Disc} from "../source/surface/disc.js";
import {Spheroid} from "../source/surface/spheroid.js";

describe("on a sphere", () => {
	const sphere = new Spheroid(1, 1, 0, 0);
	sphere.initialize();

	describe("sinusoidal projection", () => {
		const projection = MapProjection.bonne(sphere, 0);
		test("projectPoint()", () => {
			expect(projection.projectPoint({ф: 1, λ: -1})).toEqual(
				{x: expect.closeTo(-Math.cos(1)), y: expect.closeTo(-Math.PI/2 - 1)});
		});
		test("inverseProjectPoint()", () => {
			expect(projection.inverseProjectPoint({x: -Math.cos(1), y: -Math.PI/2 - 1})).toEqual(
				{ф: expect.closeTo(1), λ: expect.closeTo(-1)});
		});
		test("projectMeridian()", () => {
			const trueMeridian = projection.projectMeridian(-Math.PI/2, 0, 1);
			const expectedMeridian = [];
			for (let i = 1; i < sphere.refLatitudes.length/2; i ++) {
				const ф = sphere.refLatitudes[i];
				expectedMeridian.push({type: 'L', args: [expect.closeTo(Math.cos(ф)), expect.closeTo(-Math.PI/2 - ф)]});
			}
			expect(trueMeridian).toEqual(expectedMeridian);
		});
		describe("projectParallel()", () => {
			test("non-pole", () => {
				expect(projection.projectParallel(2, -1, Math.PI/3)).toEqual([
					{type: 'L', args: [expect.closeTo(-1/2), expect.closeTo(-5*Math.PI/6)]},
				]);
			});
			test("pole", () => {
				expect(projection.projectParallel(2, -1, Math.PI/2)).toEqual([]);
			});
		});
		test("wrapsAround()", () => {
			expect(projection.wrapsAround()).toEqual(false);
		});
		describe("differentiability()", () => {
			test("north pole", () => {
				expect(projection.differentiability(Math.PI/2)).toBeCloseTo(1, 1);
			});
			test("equator", () => {
				expect(projection.differentiability(0)).toBeCloseTo(1, 1);
			});
			test("south pole", () => {
				expect(projection.differentiability(-Math.PI/2)).toBeCloseTo(1, 1);
			});
		});
	});

	describe("stereographic projection", () => {
		const projection = MapProjection.conformalConic(sphere, -Math.PI/2);
		describe("projectPoint()", () => {
			test("south pole", () => {
				expect(projection.projectPoint({ф: -Math.PI/2, λ: 2})).toEqual(
					{x: expect.closeTo(0), y: expect.closeTo(0)});
			});
			test("equator", () => {
				expect(projection.projectPoint({ф: 0, λ: -Math.PI/6})).toEqual(
					{x: expect.closeTo(-1), y: expect.closeTo(-Math.sqrt(3))});
			});
			test("antimeridian", () => {
				expect(projection.projectPoint({ф: 0, λ: Math.PI})).toEqual(
					{x: expect.closeTo(0), y: expect.closeTo(2)});
			});
			test("consistency of antimeridian", () => {
				expect(projection.projectPoint({ф: -1, λ: Math.PI})).toEqual(
					projection.projectPoint({ф: -1, λ: -Math.PI}));
			});
		});
		describe("inverseProjectPoint()", () => {
			test("south pole", () => {
				expect(projection.inverseProjectPoint({x: 0, y: 0})).toEqual(
					{ф: expect.closeTo(-Math.PI/2), λ: NaN});
			});
			test("equator", () => {
				expect(projection.inverseProjectPoint({x: -1, y: -Math.sqrt(3)})).toEqual(
					{ф: expect.closeTo(0), λ: expect.closeTo(-Math.PI/6)});
			});
		});
		test("projectMeridian()", () => {
			const trueMeridian = projection.projectMeridian(-Math.PI/2, 0, Math.PI/2);
			const expectedMeridian = [];
			for (let i = 1; i < sphere.refLatitudes.length/2; i ++) {
				const ф = sphere.refLatitudes[i];
				expectedMeridian.push({type: 'L', args: [expect.closeTo(2*Math.tan((ф + Math.PI/2)/2)), expect.closeTo(0)]});
			}
			expect(trueMeridian).toEqual(expectedMeridian);
		});
		describe("projectParallel()", () => {
			test("small arc", () => {
				expect(projection.projectParallel(Math.PI/6, -Math.PI/3, 0)).toEqual([
					{type: 'A', args: [
						expect.closeTo(2), expect.closeTo(2),
						0, 0, 0,
						expect.closeTo(-Math.sqrt(3)), expect.closeTo(-1),
					]},
				]);
			});
			test("large arc", () => {
				expect(projection.projectParallel(5*Math.PI/6, -2*Math.PI/3, 0)).toEqual([
					{type: 'A', args: [
						expect.closeTo(2), expect.closeTo(2),
						0, 0, 0,
						expect.closeTo(0), expect.closeTo(-2)
					]},
					{type: 'A', args: [
						expect.closeTo(2), expect.closeTo(2),
						0, 0, 0,
						expect.closeTo(-Math.sqrt(3)), expect.closeTo(1)
					]},
				]);
			});
			test("none arc", () => {
				expect(projection.projectParallel(5*Math.PI/6, -2*Math.PI/3, -Math.PI/2)).toEqual([]);
			});
		});
		test("wrapsAround()", () => {
			expect(projection.wrapsAround()).toEqual(true);
		});
		describe("differentiability()", () => {
			test("north pole", () => {
				expect(projection.differentiability(Math.PI/2)).toBeLessThan(0.5);
			});
			test("equator", () => {
				expect(projection.differentiability(0)).toBeCloseTo(1, 1);
			});
			test("south pole", () => {
				expect(projection.differentiability(-Math.PI/2)).toBeCloseTo(1, 1);
			});
		});
	});

	describe("Mercator projection", () => {
		const projection = MapProjection.conformalConic(sphere, 0);
		describe("projectPoint()", () => {
			test("normal point", () => {
				const origin = projection.projectPoint({ф: 0, λ: 0});
				expect(projection.projectPoint({ф: -Math.PI/4, λ: -1})).toEqual(
					{x: expect.closeTo(origin.x - 1), y: expect.closeTo(origin.y + Math.log(Math.tan(3*Math.PI/8)))});
			});
			test("north pole", () => {
				expect(projection.projectPoint({ф: Math.PI/2, λ: 2})).toEqual({x: 2, y: expect.anything()});
			});
			test("south pole", () => {
				expect(projection.projectPoint({ф: -Math.PI/2, λ: 2})).toEqual({x: 2, y: expect.anything()});
			});
		});
		describe("inverseProjectPoint()", () => {
			test("normal point", () => {
				const origin = projection.projectPoint({ф: 0, λ: 0});
				expect(projection.inverseProjectPoint({x: origin.x - 1, y: origin.y + Math.log(Math.tan(3*Math.PI/8))})).toEqual(
					{ф: expect.closeTo(-Math.PI/4), λ: expect.closeTo(-1)});
			});
		});
		test("projectMeridian()", () => {
			const trueMeridian = projection.projectMeridian(-Math.PI/2, 0, 1);
			const expectedMeridian = [];
			for (let i = 1; i < sphere.refLatitudes.length/2; i ++)
				expectedMeridian.push({type: 'L', args: [expect.closeTo(1), expect.anything()]});
			expect(trueMeridian).toEqual(expectedMeridian);
		});
		test("projectParallel()", () => {
			expect(projection.projectParallel(-2, 3, Math.PI/4)).toEqual([
				{type: 'L', args: [expect.closeTo(3), expect.anything()]},
			]);
		});
		test("wrapsAround()", () => {
			expect(projection.wrapsAround()).toEqual(false);
		});
		describe("differentiability()", () => {
			test("north pole", () => {
				expect(projection.differentiability(Math.PI/2)).toBeLessThan(0.7);
			});
			test("equator", () => {
				expect(projection.differentiability(0)).toBeCloseTo(1, 1);
			});
			test("south pole", () => {
				expect(projection.differentiability(-Math.PI/2)).toBeLessThan(0.7);
			});
		});
	});

	describe("conic projection", () => {
		const projection = MapProjection.conformalConic(sphere, Math.PI/6);
		test("projectPoint()", () => {
			expect(projection.projectPoint({ф: Math.PI/2, λ: 1})).toEqual({x: 0, y: 0});
		});
		test("inverseProjectPoint()", () => {
			expect(projection.inverseProjectPoint({x: 0, y: 0})).toEqual({ф: Math.PI/2, λ: NaN});
		});
		test("wrapsAround()", () => {
			expect(projection.wrapsAround()).toEqual(false);
		});
		describe("differentiability()", () => {
			test("north pole", () => {
				expect(projection.differentiability(Math.PI/2)).toBeCloseTo(0.5, 1);
			});
			test("equator", () => {
				expect(projection.differentiability(0)).toBeCloseTo(1, 1);
			});
			test("south pole", () => {
				expect(projection.differentiability(-Math.PI/2)).toBeLessThan(0.5);
			});
		});
	});
});

describe("on a disc", () => {
	const disc = new Disc(4, 0, false);
	disc.initialize();

	describe("azimuthal equidistant projection", () => {
		const projection = MapProjection.bonne(disc, 1);
		describe("projectPoint()", () => {
			test("pole", () => {
				expect(projection.projectPoint({ф: Math.PI/2, λ: 2})).toEqual(
					{x: expect.closeTo(0), y: expect.closeTo(-4)});
			});
			test("off pole", () => {
				expect(projection.projectPoint({ф: Math.PI/4, λ: Math.PI/6})).toEqual(
					{x: expect.closeTo(1/2), y: expect.closeTo(Math.sqrt(3)/2 - 4)});
			});
			test("consistency of antimeridian", () => {
				expect(projection.projectPoint({ф: 0.5, λ: Math.PI})).toEqual(
					projection.projectPoint({ф: 0.5, λ: -Math.PI}));
			});
		});
		test("wrapsAround()", () => {
			expect(projection.wrapsAround()).toEqual(true);
		});
		describe("differentiability()", () => {
			test("north pole", () => {
				expect(projection.differentiability(Math.PI/2)).toBeCloseTo(1, 1);
			});
			test("edge", () => {
				expect(projection.differentiability(disc.фMin)).toBeCloseTo(1, 1);
			});
		});
	});
	describe("also azimuthal equidistant projection", () => {
		const projection = MapProjection.conformalConic(disc, 1);
		describe("projectPoint()", () => {
			test("consistency of antimeridian", () => {
				expect(projection.projectPoint({ф: 0.5, λ: Math.PI})).toEqual(
					projection.projectPoint({ф: 0.5, λ: -Math.PI}));
			});
		});
		test("wrapsAround()", () => {
			expect(projection.wrapsAround()).toEqual(true);
		});
		describe("differentiability()", () => {
			test("north pole", () => {
				expect(projection.differentiability(Math.PI/2)).toBeCloseTo(1, 1);
			});
			test("south pole", () => {
				expect(projection.differentiability(disc.фMin)).toBeCloseTo(1, 1);
			});
		});
	});
});
