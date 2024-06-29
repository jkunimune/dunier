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
		const projection = MapProjection.bonne(sphere, -1, 1);
		test("projectPoint()", () => {
			expect(projection.projectPoint({ф: 1, λ: -1})).toEqual(
				{x: expect.closeTo(-Math.cos(1)), y: expect.closeTo(-Math.PI/2 - 1)});
		});
		test("projectMeridian()", () => {
			const trueMeridian = projection.projectMeridian(-Math.PI/2, 0, 1);
			const expectedMeridian = [];
			for (let i = 1; i < projection.surface.refLatitudes.length/2; i ++) {
				const ф = projection.surface.refLatitudes[i];
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
	});

	describe("azimuthal equidistant projection", () => {
		const projection = MapProjection.conic(sphere, -Math.PI/2, 1);
		describe("projectPoint()", () => {
			test("pole", () => {
				expect(projection.projectPoint({ф: -Math.PI/2, λ: 2})).toEqual(
					{x: expect.closeTo(0), y: expect.closeTo(0)});
			});
			test("equator", () => {
				expect(projection.projectPoint({ф: 0, λ: -Math.PI/6})).toEqual(
					{x: expect.closeTo(-Math.PI/4), y: expect.closeTo(-Math.PI*Math.sqrt(3)/4)});
			});
			test("antimeridian", () => {
				expect(projection.projectPoint({ф: 0, λ: Math.PI})).toEqual(
					{x: expect.closeTo(0), y: expect.closeTo(Math.PI/2)});
			});
			test("consistency of antimeridian", () => {
				expect(projection.projectPoint({ф: -1, λ: Math.PI})).toEqual(
					projection.projectPoint({ф: -1, λ: -Math.PI}));
			});
		});
		test("projectMeridian()", () => {
			const trueMeridian = projection.projectMeridian(-Math.PI/2, 0, Math.PI/2);
			const expectedMeridian = [];
			for (let i = 1; i < projection.surface.refLatitudes.length/2; i ++) {
				const ф = projection.surface.refLatitudes[i];
				expectedMeridian.push({type: 'L', args: [expect.closeTo(Math.PI/2 + ф), expect.closeTo(0)]});
			}
			expect(trueMeridian).toEqual(expectedMeridian);
		});
		describe("projectParallel()", () => {
			test("small arc", () => {
				expect(projection.projectParallel(Math.PI/6, -Math.PI/3, 2 - Math.PI/2)).toEqual([
					{type: 'A', args: [
						expect.closeTo(2), expect.closeTo(2),
						0, 0, 0,
						expect.closeTo(-Math.sqrt(3)), expect.closeTo(-1),
					]},
				]);
			});
			test("large arc", () => {
				expect(projection.projectParallel(5*Math.PI/6, -2*Math.PI/3, 2 - Math.PI/2)).toEqual([
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
	});

	describe("equirectangular projection", () => {
		const projection = MapProjection.conic(sphere, -1, 1);
		test("projectPoint()", () => {
			expect(projection.projectPoint({ф: -Math.PI/4, λ: -1})).toEqual(
				{x: expect.closeTo(-1), y: expect.closeTo(-Math.PI/4)});
		});
		test("projectMeridian()", () => {
			const trueMeridian = projection.projectMeridian(-Math.PI/2, 0, 1);
			const expectedMeridian = [];
			for (let i = 1; i < projection.surface.refLatitudes.length/2; i ++) {
				const ф = projection.surface.refLatitudes[i];
				expectedMeridian.push({type: 'L', args: [expect.closeTo(1), expect.closeTo(-Math.PI/2 - ф)]});
			}
			expect(trueMeridian).toEqual(expectedMeridian);
		});
		test("projectParallel()", () => {
			expect(projection.projectParallel(-2, 3, Math.PI/4)).toEqual([
				{type: 'L', args: [expect.closeTo(3), expect.closeTo(-3*Math.PI/4)]},
			]);
		});
		test("wrapsAround()", () => {
			expect(projection.wrapsAround()).toEqual(false);
		});
	});
});

describe("on a disc", () => {
	const disc = new Disc(4, 0, false);
	disc.initialize();

	describe("azimuthal equidistant projection", () => {
		const projection = MapProjection.bonne(disc, Math.PI/6, Math.PI/3);
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
				expect(projection.projectPoint({ф: -1, λ: Math.PI})).toEqual(
					projection.projectPoint({ф: -1, λ: -Math.PI}));
			});
		});
		test("wrapsAround()", () => {
			expect(projection.wrapsAround()).toEqual(true);
		});
	});
	describe("also azimuthal equidistant projection", () => {
		const projection = MapProjection.conic(disc, Math.PI/6, Math.PI/3);
		describe("projectPoint()", () => {
			test("consistency of antimeridian", () => {
				expect(projection.projectPoint({ф: -1, λ: Math.PI})).toEqual(
					projection.projectPoint({ф: -1, λ: -Math.PI}));
			});
		});
		test("wrapsAround()", () => {
			expect(projection.wrapsAround()).toEqual(true);
		});
	});
});
