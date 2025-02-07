/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {MapProjection} from "../source/map/projection.js";
import {Disc} from "../source/surface/disc.js";
import {Spheroid} from "../source/surface/spheroid.js";
import {assert_xy, endpoint} from "../source/utilities/coordinates.js";

describe("on a sphere", () => {
	const sphere = new Spheroid(1, 1, 0, 0);

	describe("sinusoidal projection", () => {
		const projection = MapProjection.bonne(sphere, -Math.PI/2, 0, Math.PI/2, 0);
		test("projectPoint()", () => {
			expect(projection.projectPoint({φ: 1, λ: -1})).toEqual(
				{x: expect.closeTo(-Math.cos(1)), y: expect.closeTo(-Math.PI/2 - 1)});
		});
		test("inverseProjectPoint()", () => {
			expect(projection.inverseProjectPoint({x: -Math.cos(1), y: -Math.PI/2 - 1})).toEqual(
				{φ: expect.closeTo(1), λ: expect.closeTo(-1)});
		});
		test("projectMeridian()", () => {
			const meridian = projection.projectMeridian(-Math.PI/2, 0, 1);
			for (let i = 0; i < meridian.length; i ++) {
				expect(meridian[i].args[0]).toBeCloseTo(Math.sin(-meridian[i].args[1]));
				if (i > 0)
					expect(meridian[i].args[1]).toBeLessThan(meridian[i - 1].args[1]);
			}
			expect(assert_xy(endpoint(meridian[meridian.length - 1]))).toEqual(projection.projectPoint({φ: 0, λ: 1}));
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
				expect(() => projection.differentiability(0)).toThrow();
			});
			test("south pole", () => {
				expect(projection.differentiability(-Math.PI/2)).toBeCloseTo(1, 1);
			});
		});
	});

	describe("stereographic projection (south pole)", () => {
		const projection = MapProjection.conformalConic(sphere, -Math.PI/2, -Math.PI/2, Math.PI/2, 0);
		describe("projectPoint()", () => {
			test("south pole", () => {
				expect(projection.projectPoint({φ: -Math.PI/2, λ: 2})).toEqual(
					{x: expect.closeTo(0), y: expect.closeTo(0)});
			});
			test("equator", () => {
				expect(projection.projectPoint({φ: 0, λ: -Math.PI/6})).toEqual(
					{x: expect.closeTo(-1), y: expect.closeTo(-Math.sqrt(3))});
			});
			test("antimeridian", () => {
				expect(projection.projectPoint({φ: 0, λ: Math.PI})).toEqual(
					{x: expect.closeTo(0), y: expect.closeTo(2)});
			});
			test("consistency of antimeridian", () => {
				expect(projection.projectPoint({φ: -1, λ: Math.PI})).toEqual(
					projection.projectPoint({φ: -1, λ: -Math.PI}));
			});
		});
		describe("inverseProjectPoint()", () => {
			test("south pole", () => {
				expect(projection.inverseProjectPoint({x: 0, y: 0})).toEqual(
					{φ: expect.closeTo(-Math.PI/2), λ: NaN});
			});
			test("equator", () => {
				expect(projection.inverseProjectPoint({x: -1, y: -Math.sqrt(3)})).toEqual(
					{φ: expect.closeTo(0), λ: expect.closeTo(-Math.PI/6)});
			});
		});
		test("projectMeridian()", () => {
			const meridian = projection.projectMeridian(-Math.PI/2, 0, Math.PI/2);
			for (let i = 0; i < meridian.length; i ++) {
				expect(meridian[i].args[1]).toBeCloseTo(0);
				if (i === 0)
					expect(meridian[i].args[0]).toBeGreaterThan(0);
				else
					expect(meridian[i].args[0]).toBeGreaterThan(meridian[i - 1].args[0]);
			}
			expect(assert_xy(endpoint(meridian[meridian.length - 1]))).toEqual(projection.projectPoint({φ: 0, λ: Math.PI/2}));
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
				expect(() => projection.differentiability(0)).toThrow();
			});
			test("south pole", () => {
				expect(projection.differentiability(-Math.PI/2)).toBeCloseTo(1, 1);
			});
		});
	});

	describe("stereographic projection (north pole)", () => {
		const projection = MapProjection.conformalConic(sphere, -Math.PI/2, Math.PI/2, Math.PI/2, 0);
		describe("projectPoint()", () => {
			test("north pole", () => {
				expect(projection.projectPoint({φ: Math.PI/2, λ: 2})).toEqual(
					{x: expect.closeTo(0), y: expect.closeTo(0)});
			});
			test("equator", () => {
				expect(projection.projectPoint({φ: 0, λ: -Math.PI/6})).toEqual(
					{x: expect.closeTo(-1), y: expect.closeTo(Math.sqrt(3))});
			});
			test("antimeridian", () => {
				expect(projection.projectPoint({φ: 0, λ: Math.PI})).toEqual(
					{x: expect.closeTo(0), y: expect.closeTo(-2)});
			});
			test("consistency of antimeridian", () => {
				expect(projection.projectPoint({φ: -1, λ: Math.PI})).toEqual(
					projection.projectPoint({φ: -1, λ: -Math.PI}));
			});
		});
	});

	describe("Mercator projection", () => {
		const projection = MapProjection.conformalConic(sphere, -Math.PI/2, 0, Math.PI/2, 0);
		describe("projectPoint()", () => {
			test("normal point", () => {
				const origin = projection.projectPoint({φ: 0, λ: 0});
				expect(projection.projectPoint({φ: -Math.PI/4, λ: -1})).toEqual(
					{x: expect.closeTo(origin.x - 1), y: expect.closeTo(origin.y + Math.log(Math.tan(3*Math.PI/8)))});
			});
			test("north pole", () => {
				expect(projection.projectPoint({φ: Math.PI/2, λ: 2})).toEqual({x: 2, y: expect.anything()});
			});
			test("south pole", () => {
				expect(projection.projectPoint({φ: -Math.PI/2, λ: 2})).toEqual({x: 2, y: expect.anything()});
			});
		});
		describe("inverseProjectPoint()", () => {
			test("normal point", () => {
				const origin = projection.projectPoint({φ: 0, λ: 0});
				expect(projection.inverseProjectPoint({x: origin.x - 1, y: origin.y + Math.log(Math.tan(3*Math.PI/8))})).toEqual(
					{φ: expect.closeTo(-Math.PI/4), λ: expect.closeTo(-1)});
			});
		});
		test("projectMeridian()", () => {
			const meridian = projection.projectMeridian(-Math.PI/2, 0, 1);
			for (let i = 0; i < meridian.length; i ++)
				expect(meridian[i].args[0]).toBeCloseTo(1);
			expect(assert_xy(endpoint(meridian[meridian.length - 1]))).toEqual(projection.projectPoint({φ: 0, λ: 1}));
		});
		test("projectParallel()", () => {
			const endpoint = projection.projectPoint({λ: 3, φ: Math.PI/4});
			expect(projection.projectParallel(-2, 3, Math.PI/4)).toEqual([
				{type: 'L', args: [endpoint.x, endpoint.y]},
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
				expect(() => projection.differentiability(0)).toThrow();
			});
			test("south pole", () => {
				expect(projection.differentiability(-Math.PI/2)).toBeLessThan(0.7);
			});
		});
	});

	describe("conic projection", () => {
		const projection = MapProjection.conformalConic(sphere, -Math.PI/2, Math.PI/6, Math.PI/2, 0);
		test("projectPoint()", () => {
			expect(projection.projectPoint({φ: Math.PI/2, λ: 1})).toEqual({x: 0, y: 0});
		});
		test("inverseProjectPoint()", () => {
			expect(projection.inverseProjectPoint({x: 0, y: 0})).toEqual({φ: Math.PI/2, λ: NaN});
		});
		test("wrapsAround()", () => {
			expect(projection.wrapsAround()).toEqual(false);
		});
		describe("differentiability()", () => {
			test("north pole", () => {
				expect(projection.differentiability(Math.PI/2)).toBeCloseTo(0.5, 1);
			});
			test("equator", () => {
				expect(() => projection.differentiability(0)).toThrow();
			});
			test("south pole", () => {
				expect(projection.differentiability(-Math.PI/2)).toBeLessThan(0.5);
			});
		});
	});
});

describe("on a disc", () => {
	const disc = new Disc(4, 0, false);

	describe("azimuthal equidistant projection", () => {
		const projection = MapProjection.orthographic(disc, disc.φMin, disc.φMax, 0);
		describe("projectPoint()", () => {
			test("pole", () => {
				expect(projection.projectPoint({φ: Math.PI/2, λ: 2})).toEqual(
					{x: expect.closeTo(0), y: expect.closeTo(0)});
			});
			test("off pole", () => {
				expect(projection.projectPoint({φ: Math.PI/4, λ: Math.PI/6})).toEqual(
					{x: expect.closeTo(1/2), y: expect.closeTo(Math.sqrt(3)/2)});
			});
			test("consistency of antimeridian", () => {
				expect(projection.projectPoint({φ: 0.5, λ: Math.PI})).toEqual(
					projection.projectPoint({φ: 0.5, λ: -Math.PI}));
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
				expect(projection.differentiability(disc.φMin)).toBeCloseTo(1, .5); // this one should be equal to 1, but the rim is so nonlinear that the error is over 10%
			});
		});
	});
});
