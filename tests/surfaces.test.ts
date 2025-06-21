/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import {Spheroid} from "../source/generation/surface/spheroid.js";
import {Vector} from "../source/utilities/geometry.js";
import {Toroid} from "../source/generation/surface/toroid.js";
import {Disc} from "../source/generation/surface/disc.js";
import {Sphere} from "../source/generation/surface/sphere.js";

describe("Spheroid", () => {
	const radius = 6371;
	const surface = new Spheroid(radius, 9.83, 2*Math.PI/86400, 23.5/180*Math.PI);
	surface.initialize();
	test("flattening", () => {
		expect(surface.flattening).toBeCloseTo(1/298, 2);
	});
	describe("ds_dφ()", () => {
		test("equator", () => {
			expect(surface.ds_dφ(0)).toBeCloseTo(110.567/(Math.PI/180), -2);
		});
		test("pole", () => {
			expect(surface.ds_dφ(Math.PI/2)).toBeCloseTo(111.699/(Math.PI/180), -2);
		});
	});
	describe("φλ()", () => {
		test("equator", () => {
			expect(surface.φλ(new Vector(1, -Math.sqrt(3), 0))).toEqual(expect.objectContaining(
				{φ: expect.closeTo(0, 6), λ: expect.closeTo(Math.PI/6, 6)}));
		});
		test("pole", () => {
			expect(surface.φλ(new Vector(0, 0, 1))).toEqual(expect.objectContaining(
				{φ: expect.closeTo(Math.PI/2, 6)}));
		});
	});
	describe("xyz()", () => {
		test("equator", () => {
			expect(surface.xyz({φ: 0, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(radius/2, 3), y: expect.closeTo(-radius*Math.sqrt(3)/2, 3), z: expect.closeTo(0, 3)}));
		});
		test("pole", () => {
			expect(surface.xyz({φ: -Math.PI/2, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(0, 3), y: expect.closeTo(0, 3), z: expect.closeTo(-radius*(1 - 1/298), -2)}));
		});
	});
	describe("normal()", () => {
		test("equator", () => {
			expect(surface.normal({φ: 0, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(1/2, 6), y: expect.closeTo(-Math.sqrt(3)/2, 6), z: expect.closeTo(0, 6)}));
		});
		test("pole", () => {
			expect(surface.normal({φ: -Math.PI/2, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(0, 6), y: expect.closeTo(0, 6), z: expect.closeTo(-1, 6)}));
		});
	});
	test("consistency between rz() and tangent()", () => {
		const φ = 1;
		const dφ = 1e-4;
		const point0 = surface.rz(φ);
		const point1 = surface.rz(φ + dφ);
		const ds = Math.hypot(point1.r - point0.r, point1.z - point0.z);
		expect(surface.tangent(φ + dφ/2)).toEqual({
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
			expect(surface.isOnEdge({φ: 0, λ: 0})).toBe(false);
		});
		test("pole", () => {
			expect(surface.isOnEdge({φ: -Math.PI/2, λ: 0})).toBe(false);
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
	test("area", () => {
		expect(surface.area).toBeCloseTo(4*Math.PI*radius*radius*(1 + Math.pow(1 - surface.flattening, 2))/2, -6);
	});
	describe("distance()", () => {
		test("along equator", () => {
			expect(surface.distance({φ: 0, λ: 1}, {φ: 0, λ: 2}))
				.toEqual(radius);
		});
		test("across equator", () => {
			expect(surface.distance({φ: -0.01, λ: -3}, {φ: 0.01, λ: -3}))
				.toBeCloseTo(0.02*radius*Math.pow(1 - surface.flattening, 2));
		});
		test("over pole", () => {
			expect(surface.distance({φ: Math.PI/2 - 0.01, λ: 0}, {φ: Math.PI/2 - 0.01, λ: Math.PI}))
				.toBeCloseTo(0.02*radius/(1 - surface.flattening));
		});
		test("diagonal", () => {
			const p1 = surface.xyz({φ: 0.003, λ: -0.004});
			const p2 = surface.xyz({φ: -0.003, λ: 0.004});
			expect(surface.distance({φ: 0.003, λ: -0.004}, {φ: -0.003, λ: 0.004}))
				.toBeCloseTo(Math.sqrt(p1.minus(p2).sqr()));
		});
	});
});

describe("Sphere", () => {
	const radius = 6371;
	const surface = new Sphere(radius);
	surface.initialize();
	test("flattening", () => {
		expect(surface.flattening).toEqual(0);
	});
	describe("ds_dφ()", () => {
		test("equator", () => {
			expect(surface.ds_dφ(0)).toEqual(radius);
		});
		test("pole", () => {
			expect(surface.ds_dφ(Math.PI/2)).toEqual(radius);
		});
	});
	test("consistency between xyz() and normal()", () => {
		const {x, y, z} = surface.xyz({φ: 0.5, λ: Math.PI/6});
		expect(surface.normal({φ: 0.5, λ: Math.PI/6})).toEqual(expect.objectContaining({
			x: expect.closeTo(x/radius),
			y: expect.closeTo(y/radius),
			z: expect.closeTo(z/radius),
		}));
	});
	describe("hasSeasons()", () => {
		test("tropics", () => {
			expect(surface.hasSeasons(-Math.PI/3)).toBe(false);
		});
	});
});

describe("Toroid", () => {
	const radius = 6371;
	const surface = new Toroid(radius, 9.83, 2*Math.PI/7200, 23.5/180*Math.PI);
	surface.initialize();
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
	describe("φλ()", () => {
		test("outer equator", () => {
			expect(surface.φλ(new Vector(radius, -radius*Math.sqrt(3), 0))).toEqual(expect.objectContaining(
				{φ: expect.closeTo(0), λ: expect.closeTo(Math.PI/6)}));
		});
		test("inner equator", () => {
			expect(surface.φλ(new Vector(radius/6, -radius*Math.sqrt(3)/6, 0))).toEqual(expect.objectContaining(
				{φ: expect.closeTo(Math.PI), λ: expect.closeTo(Math.PI/6)}));
		});
	});
	describe("xyz()", () => {
		test("outer equator", () => {
			expect(surface.xyz({φ: 0, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(radius/2), y: expect.closeTo(-radius*Math.sqrt(3)/2), z: expect.closeTo(0)}));
		});
		test("inner equator", () => {
			const xyz = surface.xyz({φ: -Math.PI, λ: Math.PI/6});
			expect(xyz.x/xyz.y).toBeCloseTo(-1/Math.sqrt(3));
			expect(xyz.z).toBeCloseTo(0);
		});
	});
	describe("normal()", () => {
		test("equator", () => {
			expect(surface.normal({φ: 0, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(1/2), y: expect.closeTo(-Math.sqrt(3)/2), z: expect.closeTo(0)}));
		});
		test("pole", () => {
			expect(surface.normal({φ: -Math.PI/2, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(0), y: expect.closeTo(0), z: expect.closeTo(-1)}));
		});
	});
	test("consistency between rz() and tangent()", () => {
		const φ = 1;
		const dφ = 1e-4;
		const point0 = surface.rz(φ);
		const point1 = surface.rz(φ + dφ);
		const ds = Math.hypot(point1.r - point0.r, point1.z - point0.z);
		expect(surface.tangent(φ + dφ/2)).toEqual({
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
			expect(surface.isOnEdge({φ: 0, λ: 0})).toBe(false);
		});
		test("inner equator", () => {
			expect(surface.isOnEdge({φ: -Math.PI, λ: 0})).toBe(false);
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
	describe("distance()", () => {
		test("along inner equator", () => {
			const innerRadius = surface.xyz({φ: Math.PI, λ: Math.PI}).y;
			expect(surface.distance({φ: Math.PI, λ: 1}, {φ: Math.PI, λ: 2}))
				.toEqual(innerRadius);
		});
		test("across inner equator", () => {
			expect(surface.distance({φ: Math.PI - 0.01, λ: 0}, {φ: -Math.PI + 0.01, λ: 0}))
				.toBeCloseTo(0.02*surface.minorRadius*Math.pow(surface.elongation, 2), 0);
		});
		test("over pole", () => {
			expect(surface.distance({φ: Math.PI/2 - 0.01, λ: 0}, {φ: Math.PI/2 + 0.01, λ: 0}))
				.toBeCloseTo(0.02*surface.minorRadius/surface.elongation, 0);
		});
		test("diagonal", () => {
			const p1 = surface.xyz({φ: 0.003, λ: -0.004});
			const p2 = surface.xyz({φ: -0.003, λ: 0.004});
			expect(surface.distance({φ: 0.003, λ: -0.004}, {φ: -0.003, λ: 0.004}))
				.toBeCloseTo(Math.sqrt(p1.minus(p2).sqr()));
		});
	});
});

describe("Disc", () => {
	const radius = 20000;
	const firmamentHeight = 5000;
	const surface = new Disc(radius, Math.PI/4, true);
	describe("ds_dφ()", () => {
		test("Comodoro Rivadavia", () => {
			expect(surface.ds_dφ(-Math.PI/4)).toBeCloseTo(2*firmamentHeight);
		});
		test("pole", () => {
			expect(surface.ds_dφ(-Math.PI/2)).toBeCloseTo(firmamentHeight);
		});
	});
	describe("φλ()", () => {
		test("Comodoro Rivadavia", () => {
			expect(surface.φλ(new Vector(firmamentHeight/2, -firmamentHeight*Math.sqrt(3)/2, 10))).toEqual(expect.objectContaining(
				{φ: -Math.PI/4, λ: Math.PI/6}));
		});
		test("pole", () => {
			expect(surface.φλ(new Vector(0, 0, 10))).toEqual(expect.objectContaining(
				{φ: -Math.PI/2}));
		});
	});
	describe("xyz()", () => {
		test("Comodoro Rivadavia", () => {
			expect(surface.xyz({φ: -Math.PI/4, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(firmamentHeight/2), y: expect.closeTo(-firmamentHeight*Math.sqrt(3)/2), z: 0}));
		});
		test("pole", () => {
			expect(surface.xyz({φ: -Math.PI/2, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(0), y: expect.closeTo(0), z: 0}));
		});
	});
	describe("normal()", () => {
		test("Comodoro Rivadavia", () => {
			expect(surface.normal({φ: -Math.PI/4, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(0), y: expect.closeTo(0), z: expect.closeTo(-1)}));
		});
		test("pole", () => {
			expect(surface.normal({φ: -Math.PI/4, λ: Math.PI/6})).toEqual(expect.objectContaining(
				{x: expect.closeTo(0), y: expect.closeTo(0), z: expect.closeTo(-1)}));
		});
	});
	test("consistency between rz() and tangent()", () => {
		const φ = -1;
		const dφ = 1e-4;
		const point0 = surface.rz(φ);
		const point1 = surface.rz(φ + dφ);
		const ds = Math.hypot(point1.r - point0.r, point1.z - point0.z);
		expect(surface.tangent(φ + dφ/2)).toEqual({
			r: expect.closeTo((point1.r - point0.r)/ds),
			z: expect.closeTo((point1.z - point0.z)/ds)});
	});
	describe("isOnEdge()", () => {
		test("edge", () => {
			expect(surface.isOnEdge({φ: -Math.atan(firmamentHeight/radius), λ: 0})).toBe(true);
		});
		test("pole", () => {
			expect(surface.isOnEdge({φ: -Math.PI/2, λ: 0})).toBe(false);
		});
	});
	describe("hasSeasons()", () => {
		test("tropics", () => {
			expect(surface.hasSeasons(-Math.atan(firmamentHeight/(.749*radius)))).toBe(false);
		});
		test("southern temperates", () => {
			expect(surface.hasSeasons(-Math.atan(firmamentHeight/(.751*radius)))).toBe(true);
		});
	});
	test("area", () => {
		surface.initialize();
		expect(surface.area).toBeCloseTo(Math.PI*radius*radius);
	});
	test("distance()", () => {
		expect(surface.distance(
			{φ: -Math.atan(firmamentHeight/3000), λ: Math.PI/2},
			{φ: -Math.atan(firmamentHeight/4000), λ: Math.PI}))
			.toBeCloseTo(5000);
	});
});
