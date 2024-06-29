/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {Spheroid} from "../source/surface/spheroid.js";
import {Vector} from "../source/utilities/geometry.js";
import {Toroid} from "../source/surface/toroid.js";
import {Disc} from "../source/surface/disc";

describe("Spheroid", () => {
	const radius = 6371;
	const surface = new Spheroid(radius, 9.83, 2*Math.PI/86400, 23.5/180*Math.PI);
	test("flattening", () => {
		expect(surface.flattening).toBeCloseTo(1/298, 2);
	});
	describe("ds_dф()", () => {
		test("equator", () => {
			expect(surface.ds_dф(0)).toBeCloseTo(110.567/(Math.PI/180), -2);
		});
		test("pole", () => {
			expect(surface.ds_dф(Math.PI/2)).toBeCloseTo(111.699/(Math.PI/180), -2);
		});
	});
	describe("фλ()", () => {
		test("equator", () => {
			expect(surface.фλ(new Vector(1, -Math.sqrt(3), 0))).toEqual(expect.objectContaining(
				{ф: expect.closeTo(0, 6), λ: expect.closeTo(Math.PI/6, 6)}));
		});
		test("pole", () => {
			expect(surface.фλ(new Vector(0, 0, 1))).toEqual(expect.objectContaining(
				{ф: expect.closeTo(Math.PI/2, 6)}));
		});
	});
	describe("xyz()", () => {
		test("equator", () => {
			expect(surface.xyz({ф: 0, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(radius/2, 3), y: expect.closeTo(-radius*Math.sqrt(3)/2, 3), z: expect.closeTo(0, 3)}));
		});
		test("pole", () => {
			expect(surface.xyz({ф: -Math.PI/2, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(0, 3), y: expect.closeTo(0, 3), z: expect.closeTo(-radius*(1 - 1/298), -2)}));
		});
	});
	describe("normal()", () => {
		test("equator", () => {
			expect(surface.normal({ф: 0, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(1/2, 6), y: expect.closeTo(-Math.sqrt(3)/2, 6), z: expect.closeTo(0, 6)}));
		});
		test("pole", () => {
			expect(surface.normal({ф: -Math.PI/2, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(0, 6), y: expect.closeTo(0, 6), z: expect.closeTo(-1, 6)}));
		});
	});
	test("consistency between rz() and tangent()", () => {
		const ф = 1;
		const dф = 1e-4;
		const point0 = surface.rz(ф);
		const point1 = surface.rz(ф + dф);
		const ds = Math.hypot(point1.r - point0.r, point1.z - point0.z);
		expect(surface.tangent(ф + dф/2)).toEqual({
			r: expect.closeTo((point1.r - point0.r)/ds),
			z: expect.closeTo((point1.z - point0.z)/ds)});
	});
	describe("insolation()", () => {
		test("pole to equator", () => {
			expect(surface.insolation(-Math.PI/2)/surface.insolation(0)).toBeCloseTo(.412, 1);
		});
	});
	describe("isOnEdge()", () => {
		test("equator", () => {
			expect(surface.isOnEdge({ф: 0, λ: 0})).toBe(false);
		});
		test("pole", () => {
			expect(surface.isOnEdge({ф: -Math.PI/2, λ: 0})).toBe(false);
		});
	});
	describe("hasSeasons()", () => {
		test("tropics", () => {
			expect(surface.hasSeasons(-23/180*Math.PI)).toBe(false);
		});
		test("southern temperates", () => {
			expect(surface.hasSeasons(-24/180*Math.PI)).toBe(true);
		});
	});
	test("cumulAreas", () => {
		surface.initialize();
		for (let i = 1; i < surface.cumulAreas.length; i ++)
			expect(surface.cumulAreas[i] - surface.cumulAreas[i - 1]).toBeGreaterThan(0);
	});
});

describe("Toroid", () => {
	const radius = 6371;
	const surface = new Toroid(radius, 9.83, 2*Math.PI/7200, 23.5/180*Math.PI);
	test("majorRadius", () => {
		expect(surface.majorRadius).toBeGreaterThan(radius/2);
		expect(surface.majorRadius).toBeLessThan(radius);
	});
	test("minorRadius", () => {
		expect(surface.minorRadius).toBeCloseTo(radius - surface.majorRadius);
	});
	test("elongation", () => {
		expect(surface.elongation).toBeGreaterThan(0);
		expect(surface.elongation).toBeLessThan(1);
	});
	describe("фλ()", () => {
		test("outer equator", () => {
			expect(surface.фλ(new Vector(radius, -radius*Math.sqrt(3), 0))).toEqual(expect.objectContaining(
				{ф: expect.closeTo(0), λ: expect.closeTo(Math.PI/6)}));
		});
		test("inner equator", () => {
			expect(surface.фλ(new Vector(radius/6, -radius*Math.sqrt(3)/6, 0))).toEqual(expect.objectContaining(
				{ф: expect.closeTo(Math.PI), λ: expect.closeTo(Math.PI/6)}));
		});
	});
	describe("xyz()", () => {
		test("outer equator", () => {
			expect(surface.xyz({ф: 0, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(radius/2), y: expect.closeTo(-radius*Math.sqrt(3)/2), z: expect.closeTo(0)}));
		});
		test("inner equator", () => {
			const xyz = surface.xyz({ф: -Math.PI, λ: Math.PI/6});
			expect(xyz.x/xyz.y).toBeCloseTo(-1/Math.sqrt(3));
			expect(xyz.z).toBeCloseTo(0);
		});
	});
	describe("normal()", () => {
		test("equator", () => {
			expect(surface.normal({ф: 0, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(1/2), y: expect.closeTo(-Math.sqrt(3)/2), z: expect.closeTo(0)}));
		});
		test("pole", () => {
			expect(surface.normal({ф: -Math.PI/2, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(0), y: expect.closeTo(0), z: expect.closeTo(-1)}));
		});
	});
	test("consistency between rz() and tangent()", () => {
		const ф = 1;
		const dф = 1e-4;
		const point0 = surface.rz(ф);
		const point1 = surface.rz(ф + dф);
		const ds = Math.hypot(point1.r - point0.r, point1.z - point0.z);
		expect(surface.tangent(ф + dф/2)).toEqual({
			r: expect.closeTo((point1.r - point0.r)/ds),
			z: expect.closeTo((point1.z - point0.z)/ds)});
	});
	describe("insolation()", () => {
		test("pole to equator", () => {
			expect(surface.insolation(-Math.PI/2)/surface.insolation(0)).toBeCloseTo(.412, 1);
		});
		test("inner equator", () => {
			expect(surface.insolation(-Math.PI)).toBeLessThanOrEqual(surface.insolation(0));
		});
	});
	describe("isOnEdge()", () => {
		test("outer equator", () => {
			expect(surface.isOnEdge({ф: 0, λ: 0})).toBe(false);
		});
		test("inner equator", () => {
			expect(surface.isOnEdge({ф: -Math.PI, λ: 0})).toBe(false);
		});
	});
	describe("hasSeasons()", () => {
		test("tropics", () => {
			expect(surface.hasSeasons(-23/180*Math.PI)).toBe(false);
		});
		test("southern temperates", () => {
			expect(surface.hasSeasons(-24/180*Math.PI)).toBe(true);
		});
	});
	test("cumulAreas", () => {
		surface.initialize();
		for (let i = 1; i < surface.cumulAreas.length; i ++)
			expect(surface.cumulAreas[i] - surface.cumulAreas[i - 1]).toBeGreaterThan(0);
	});
});

describe("Disc", () => {
	const radius = 20000;
	const firmamentHeight = 5000;
	const surface = new Disc(radius, Math.PI/4, true);
	describe("ds_dф()", () => {
		test("Boston", () => {
			expect(surface.ds_dф(Math.PI/4)).toBeCloseTo(2*firmamentHeight);
		});
		test("pole", () => {
			expect(surface.ds_dф(Math.PI/2)).toBeCloseTo(firmamentHeight);
		});
	});
	describe("фλ()", () => {
		test("Boston", () => {
			expect(surface.фλ(new Vector(firmamentHeight/2, -firmamentHeight*Math.sqrt(3)/2, 10))).toEqual(expect.objectContaining(
				{ф: Math.PI/4, λ: Math.PI/6}));
		});
		test("pole", () => {
			expect(surface.фλ(new Vector(0, 0, 10))).toEqual(expect.objectContaining(
				{ф: Math.PI/2}));
		});
	});
	describe("xyz()", () => {
		test("Boston", () => {
			expect(surface.xyz({ф: Math.PI/4, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(firmamentHeight/2), y: expect.closeTo(-firmamentHeight*Math.sqrt(3)/2), z: 0}));
		});
		test("pole", () => {
			expect(surface.xyz({ф: Math.PI/2, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(0), y: expect.closeTo(0), z: 0}));
		});
	});
	describe("normal()", () => {
		test("Boston", () => {
			expect(surface.normal({ф: Math.PI/4, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(0), y: expect.closeTo(0), z: expect.closeTo(1)}));
		});
		test("pole", () => {
			expect(surface.normal({ф: Math.PI/4, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(0), y: expect.closeTo(0), z: expect.closeTo(1)}));
		});
	});
	test("consistency between rz() and tangent()", () => {
		const ф = 1;
		const dф = 1e-4;
		const point0 = surface.rz(ф);
		const point1 = surface.rz(ф + dф);
		const ds = Math.hypot(point1.r - point0.r, point1.z - point0.z);
		expect(surface.tangent(ф + dф/2)).toEqual({
			r: expect.closeTo((point1.r - point0.r)/ds),
			z: expect.closeTo((point1.z - point0.z)/ds)});
	});
	describe("isOnEdge()", () => {
		test("edge", () => {
			expect(surface.isOnEdge({ф: Math.atan(firmamentHeight/radius), λ: 0})).toBe(true);
		});
		test("pole", () => {
			expect(surface.isOnEdge({ф: Math.PI/2, λ: 0})).toBe(false);
		});
	});
	describe("hasSeasons()", () => {
		test("tropics", () => {
			expect(surface.hasSeasons(Math.atan(firmamentHeight/(.749*radius)))).toBe(false);
		});
		test("southern temperates", () => {
			expect(surface.hasSeasons(Math.atan(firmamentHeight/(.751*radius)))).toBe(true);
		});
	});
	test("cumulAreas", () => {
		surface.initialize();
		for (let i = 1; i < surface.cumulAreas.length; i ++)
			expect(surface.cumulAreas[i] - surface.cumulAreas[i - 1]).toBeGreaterThan(0);
	});
});
