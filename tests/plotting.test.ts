/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {contains, cutToSize, encompasses, getEdgeCrossings, InfinitePlane} from "../source/map/plotting.js";
import {Side} from "../source/utilities/miscellaneus.js";
import {endpoint, LongLineType, PathSegment} from "../source/utilities/coordinates.js";
import {Toroid} from "../source/surface/toroid.js";
import {Sphere} from "../source/surface/sphere.js";

const π = Math.PI;
const PLANE = new InfinitePlane();
const SPHERE = new Sphere(1);
const TOROID = new Toroid(3, 1, .008, 0);

describe("getEdgeCrossings", () => {
	describe("geographical", () => {
		test("line across a meridian", () => {
			const meridian = [
				{type: 'M', args: [-1, 3]},
				{type: LongLineType.MERIDIAN, args: [1, 3]}
			];
			const segment = [
				{type: 'M', args: [1, 2]},
				{type: 'L', args: [-1, 4]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], SPHERE, meridian)).toEqual([{
				intersect0: {s: -0, t: 3}, intersect1: {s: -0, t: 3},
				loopIndex: 0, entering: false,
			}]);
		});
		test("line across the antimeridian", () => {
			const antimeridian = [
				{type: 'M', args: [-1, π]},
				{type: LongLineType.MERIDIAN, args: [1, π]}
			];
			const segment = [
				{type: 'M', args: [0, 3]},
				{type: 'L', args: [0, -3]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], SPHERE, antimeridian)).toEqual([{
				intersect0: {s: 0, t: π}, intersect1: {s: 0, t: -π},
				loopIndex: 0, entering: false,
			}]);
		});
		test("parallel across a meridian", () => {
			const meridian = [
				{type: 'M', args: [0, 0]},
				{type: LongLineType.MERIDIAN, args: [π, 0]},
			];
			const segment = [
				{type: 'M', args: [1, -2]},
				{type: LongLineType.PARALLEL, args: [1, 2]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], SPHERE, meridian)).toEqual([{
				intersect0: {s: 1, t: 0}, intersect1: {s: 1, t: 0},
				loopIndex: 0, entering: false,
			}]);
		});
		test("line across a parallel", () => {
			const parallel = [
				{type: 'M', args: [0, 2]},
				{type: LongLineType.PARALLEL, args: [0, -3]},
			];
			const segment = [
				{type: 'M', args: [-1, 0]},
				{type: 'L', args: [2, 3]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], SPHERE, parallel)).toEqual([{
				intersect0: {s: 0, t: 1}, intersect1: {s: 0, t: 1},
				loopIndex: 0, entering: false,
			}]);
		});
		test("periodic line across a parallel", () => {
			const parallel = [
				{type: 'M', args: [0, π]},
				{type: LongLineType.PARALLEL, args: [0, 0]},
			];
			const segment = [
				{type: 'M', args: [-1, 2*π/3]},
				{type: 'L', args: [2, -5*π/6]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], SPHERE, parallel)).toEqual([{
				intersect0: {s: 0, t: 5*π/6}, intersect1: {s: 0, t: 5*π/6},
				loopIndex: 0, entering: false,
			}]);
		});
		test("meridian across a parallel", () => {
			const parallel = [
				{type: 'M', args: [0, π]},
				{type: LongLineType.PARALLEL, args: [0, 0]},
			];
			const segment = [
				{type: 'M', args: [-1, 2]},
				{type: LongLineType.MERIDIAN, args: [3, 2]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], SPHERE, parallel)).toEqual([{
				intersect0: {s: 0, t: 2}, intersect1: {s: 0, t: 2},
				loopIndex: 0, entering: false,
			}]);
		});
		test("line across the antiequator", () => {
			const parallel = [
				{type: 'M', args: [π, 2]},
				{type: LongLineType.PARALLEL, args: [π, -3]},
			];
			const segment = [
				{type: 'M', args: [3, 2]},
				{type: 'L', args: [-3, 2]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], TOROID, parallel)).toEqual([{
				intersect0: {s: π, t: 2}, intersect1: {s: -π, t: 2},
				loopIndex: 0, entering: false,
			}]);
		});
		test("line across two edges", () => {
			const corner = [
				{type: 'M', args: [-1, 1]},
				{type: LongLineType.MERIDIAN, args: [1, 1]},
				{type: LongLineType.PARALLEL, args: [1, -1]},
			];
			const segment = [
				{type: 'M', args: [-1.5, 2.5]},
				{type: 'L', args: [1.5, -0.5]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], SPHERE, corner)).toEqual([
				{intersect0: {s: 0, t: 1}, intersect1: {s: 0, t: 1}, loopIndex: 0, entering: true},
				{intersect0: {s: 1, t: 0}, intersect1: {s: 1, t: 0}, loopIndex: 0, entering: false},
			]);
		});
		test("line thru a vertex", () => {
			const corner = [
				{type: 'M', args: [-1, 0]},
				{type: LongLineType.MERIDIAN, args: [0, 0]},
				{type: LongLineType.PARALLEL, args: [0, -1]},
			];
			const segment = [
				{type: 'M', args: [-1, -1]},
				{type: 'L', args: [1, 1]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], SPHERE, corner)).toEqual([{
				intersect0: {s: -0, t: 0}, intersect1: {s: -0, t: 0},
				loopIndex: 0, entering: false,
			}]);
		});
		describe("line onto a parallel", () => {
			const parallel = [
				{type: 'M', args: [0, 2]},
				{type: LongLineType.PARALLEL, args: [0, -3]},
			];
			test("entering", () => {
				const segment = [
					{type: 'M', args: [1, 0]},
					{type: 'L', args: [0, 0]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], SPHERE, parallel)).toEqual([]);
			});
			test("exiting", () => {
				const segment = [
					{type: 'M', args: [-1, 0]},
					{type: 'L', args: [0, 0]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], SPHERE, parallel)).toEqual([{
					intersect0: {s: 0, t: 0}, intersect1: {s: 0, t: 0},
					loopIndex: 0, entering: false,
				}]);
			});
			test("along", () => {
				const segment = [
					{type: 'M', args: [0, 0]},
					{type: 'L', args: [0, 1]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], SPHERE, parallel)).toEqual([]);
			});
		});
	});
	describe("Cartesian", () => {
		test("line", () => {
			const edge = [
				{type: 'M', args: [1, 0]},
				{type: 'L', args: [1, -1]},
			];
			const segment = [
				{type: 'M', args: [0, 0]},
				{type: 'L', args: [2, -1]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], PLANE, edge)).toEqual([{
				intersect0: {s: 1, t: -1/2}, intersect1: {s: 1, t: -1/2},
				loopIndex: 0, entering: false,
			}]);
		});
		test("arc", () => {
			const edge = [
				{type: 'M', args: [1., 0.]},
				{type: 'L', args: [1., -2.]},
			];
			const segment = [
				{type: 'M', args: [0., 0.]},
				{type: 'A', args: [1., 1., 0, 0, 1, 2., 0.]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], PLANE, edge)).toEqual([{
				intersect0: {s: 1., t: -1.}, intersect1: {s: 1., t: -1.},
				loopIndex: 0, entering: false,
			}]);
		});
		test("across two edges", () => {
			const edges = [
				{type: 'M', args: [1, 1]},
				{type: 'L', args: [1, -1]},
				{type: 'L', args: [-1, -1]},
			];
			const segment = [
				{type: 'M', args: [2, 1]},
				{type: 'L', args: [-1, -2]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], PLANE, edges)).toEqual([
				{intersect0: {s: 1, t: 0}, intersect1: {s: 1, t: 0}, loopIndex: 0, entering: true},
				{intersect0: {s: 0, t: -1}, intersect1: {s: 0, t: -1}, loopIndex: 0, entering: false},
			]);
		});
		test("thru a vertex", () => {
			const corner = [
				{type: 'M', args: [1, 1]},
				{type: 'L', args: [1, -1]},
				{type: 'L', args: [-1, -1]},
			];
			const segment = [
				{type: 'M', args: [0, 0]},
				{type: 'L', args: [2, -2]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], PLANE, corner)).toEqual([{
				intersect0: {s: 1, t: -1}, intersect1: {s: 1, t: -1},
				loopIndex: 0, entering: false,
			}]);
		});
		describe("onto a line", () => {
			const edge = [
				{type: 'M', args: [3, 0]},
				{type: 'L', args: [-2, 0]},
			];
			test("entering", () => {
				const segment = [
					{type: 'M', args: [1, -1]},
					{type: 'L', args: [2, 0]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], PLANE, edge)).toEqual([]);
			});
			test("exiting", () => {
				const segment = [
					{type: 'M', args: [1, 1]},
					{type: 'L', args: [2, 0]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], PLANE, edge)).toEqual([{
					intersect0: {s: 2, t: 0}, intersect1: {s: 2, t: 0},
					loopIndex: 0, entering: false,
				}]);
			});
			test("along", () => {
				const segment = [
					{type: 'M', args: [1, 0]},
					{type: 'L', args: [2, 0]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], PLANE, edge)).toEqual([]);
			});
		});
	});
});

describe("contains", () => {
	describe("normal region", () => {
		const region = [
			{type: 'M', args: [4, 0]},
			{type: 'L', args: [2, -4]},
			{type: 'L', args: [2, -1]},
			{type: 'L', args: [4, 0]},
		];
		test("inside", () => {
			expect(contains(region, {s: 3, t: -1}, PLANE))
				.toBe(Side.IN);
		});
		test("outside", () => {
			expect(contains(region, {s: 0, t: -8}, PLANE))
				.toBe(Side.OUT);
		});
		test("borderline", () => {
			expect(contains(region, {s: 2, t: -3}, PLANE))
				.toBe(Side.BORDERLINE);
		});
	});
	describe("something rong", () => {
		test("something wrong", () => {
			const edges = [
				{type: 'M', args: [0.27540769417888183, 0.7144245826446864]},
				{type: LongLineType.PARALLEL, args: [0.27540769417888183,-0.7144245826446864]},
				{type: LongLineType.MERIDIAN, args: [-0.5045001577858806,-0.7144245826446864 ]},
				{type: LongLineType.PARALLEL, args: [-0.5045001577858806,0.7144245826446864]},
				{type: LongLineType.MERIDIAN, args: [0.27540769417888183,0.7144245826446864]},
			];
			expect(contains(edges, {s: 0.2588485579138271, t: 0.717536284054199}, SPHERE)).toBe(Side.OUT);
		});
	});
	describe("isoceles region", () => {
		const region = [
			{type: 'M', args: [1, -3]},
			{type: 'L', args: [1, -1]},
			{type: 'L', args: [3, -2]},
			{type: 'L', args: [1, -3]},
		];
		test("inside", () => {
			expect(contains(region, {s: 2, t: -2}, PLANE))
				.toBe(Side.IN);
		});
		test("outside toward the point", () => {
			expect(contains(region, {s: 4, t: -3}, PLANE))
				.toBe(Side.OUT);
		});
		test("outside away from the point", () => {
			expect(contains(region, {s: 0, t: -3}, PLANE))
				.toBe(Side.OUT);
		});
	});
	describe("inside-out region", () => {
		const region = [
			{type: 'M', args: [4, 0]},
			{type: 'L', args: [2, -1]},
			{type: 'L', args: [2, -4]},
			{type: 'L', args: [4, 0]},
		];
		test("inside", () => {
			expect(contains(region, {s: 0, t: -8}, PLANE))
				.toBe(Side.IN);
		});
		test("outside", () => {
			expect(contains(region, {s: 3, t: -1}, PLANE))
				.toBe(Side.OUT);
		});
	});
	describe("region with hole", () => {
		const region = [
			{type: 'M', args: [4, 0]},
			{type: 'L', args: [2, -1]},
			{type: 'L', args: [2, -4]},
			{type: 'L', args: [4, 0]},
			{type: 'M', args: [5, 1]},
			{type: 'L', args: [1, -7]},
			{type: 'L', args: [1, -1]},
			{type: 'L', args: [5, 1]},
		];
		test("inside", () => {
			expect(contains(region, {s: 1.5, t: -1}, PLANE))
				.toBe(Side.IN);
		});
		test("outside", () => {
			expect(contains(region, {s: 0, t: -8}, PLANE))
				.toBe(Side.OUT);
		});
		test("in the hole", () => {
			expect(contains(region, {s: 3, t: -1}, PLANE))
				.toBe(Side.OUT);
		});
	});
	describe("periodic region", () => {
		const region = [
			{type: 'M', args: [.5, π]},
			{type: LongLineType.PARALLEL, args: [.5, -π]},
		];
		test("inside", () => {
			expect(contains(region, {s: 0, t: 2}, SPHERE))
				.toBe(Side.IN);
		});
		test("outside", () => {
			expect(contains(region, {s: 1, t: 2}, SPHERE))
				.toBe(Side.OUT);
		});
	});
	describe("region straddles domain boundary", () => {
		describe("rightside-in region", () => {
			const region = [
				{type: 'M', args: [0.3, 2]},
				{type: 'L', args: [0.1, 2]},
				{type: 'L', args: [0.2, -3]},
				{type: 'L', args: [0.3, 2]},
			];
			test("inside", () => {
				expect(contains(region, {s: 0.2, t: 3}, SPHERE))
					.toBe(Side.IN);
			});
			test("outside", () => {
				expect(contains(region, {s: 0.2, t: 0}, SPHERE))
					.toBe(Side.OUT);
			});
		});
		describe("inside-out region", () => {
			const region = [
				{type: 'M', args: [0.3, 2]},
				{type: 'L', args: [0.2, -3]},
				{type: 'L', args: [0.1, 2]},
				{type: 'L', args: [0.3, 2]},
			];
			test("inside", () => {
				expect(contains(region, {s: 0.2, t: 0}, SPHERE))
					.toBe(Side.IN);
			});
			test("outside", () => {
				expect(contains(region, {s: 0.2, t: 3}, SPHERE))
					.toBe(Side.OUT);
			});
		});
		describe("periodic region", () => {
			const region = [
				{type: 'M', args: [2, -2]},
				{type: 'L', args: [-3, 0]},
				{type: 'L', args: [2, 2]},
				{type: 'L', args: [2, -2]},
				{type: 'M', args: [0, π]},
				{type: LongLineType.PARALLEL, args: [0, -π]},
			];
			test("inside", () => {
				expect(contains(region, {s: -1, t: 0}, TOROID))
					.toBe(Side.IN);
			});
			test("outside", () => {
				expect(contains(region, {s: 3, t: 0}, TOROID))
					.toBe(Side.OUT);
			});
		});
	});
	describe("region is domain boundary", () => {
		const region = [
			{type: 'M', args: [-π, -π]},
			{type: LongLineType.PARALLEL, args: [-π, π]},
			{type: LongLineType.MERIDIAN, args: [π, π]},
			{type: LongLineType.PARALLEL, args: [π, -π]},
			{type: LongLineType.MERIDIAN, args: [-π, -π]},
		];
		test("inside", () => {
			expect(contains(region, {s: -3, t: -1}, TOROID))
				.toBe(Side.IN);
		});
		test("outside", () => {
			expect(contains(region, {s: -4, t: -1}, TOROID))
				.toBe(Side.OUT);
		});
		test("borderline", () => {
			expect(contains(region, {s: -π, t: -1}, TOROID))
				.toBe(Side.BORDERLINE);
		});
	});
	test("null region", () => {
		const region: PathSegment[] = [];
		expect(contains(region, {s: 9000, t: 9001}, PLANE)).toBe(Side.IN);
	});
});

describe("encompasses", () => {
	describe("rightside-in region", () => {
		const region = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [0, 1]},
			{type: 'L', args: [1, 1]},
			{type: 'L', args: [1, 0]},
			{type: 'L', args: [0, 0]},
		];
		describe("separate", () => {
			test("inside", () => {
				const points = [
					{type: 'M', args: [0.1, 0.1]},
					{type: 'L', args: [0.1, 0.9]},
					{type: 'L', args: [0.9, 0.5]},
				];
				expect(encompasses(PLANE, region, points)).toBe(Side.IN);
			});
			test("outside", () => {
				const points = [
					{type: 'M', args: [1.1, 1.1]},
					{type: 'L', args: [1.1, 1.9]},
					{type: 'L', args: [1.9, 1.5]},
				];
				expect(encompasses(PLANE, region, points)).toBe(Side.OUT);
			});
			test("around", () => {
				const points = [
					{type: 'M', args: [-2, -2]},
					{type: 'L', args: [-2, 3]},
					{type: 'L', args: [3, 0.5]},
				];
				expect(encompasses(PLANE, region, points)).toBe(Side.OUT);
			});
		});
		describe("partially coincident", () => {
			test("inside", () => {
				const points = [
					{type: 'M', args: [0.0, 0.1]},
					{type: 'L', args: [0.0, 0.9]},
					{type: 'L', args: [0.9, 0.5]},
				];
				expect(encompasses(PLANE, region, points)).toBe(Side.IN);
			});
			test("outside", () => {
				const points = [
					{type: 'M', args: [0.0, 0.1]},
					{type: 'L', args: [0.0, 0.9]},
					{type: 'L', args: [-0.9, 0.5]},
				];
				expect(encompasses(PLANE, region, points)).toBe(Side.OUT);
			});
		});
		test("fully coincident", () => {
			expect(encompasses(PLANE, region, region)).toBe(Side.BORDERLINE);
		});
	});
	describe("inside-out region", () => {
		const region = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [1, 0]},
			{type: 'L', args: [1, 1]},
			{type: 'L', args: [0, 1]},
			{type: 'L', args: [0, 0]},
		];
		describe("separate", () => {
			test("inside", () => {
				const points = [
					{type: 'M', args: [0.1, 0.1]},
					{type: 'L', args: [0.1, 0.9]},
					{type: 'L', args: [0.9, 0.5]},
				];
				expect(encompasses(PLANE, region, points)).toBe(Side.OUT);
			});
			test("outside", () => {
				const points = [
					{type: 'M', args: [1.1, 1.1]},
					{type: 'L', args: [1.1, 1.9]},
					{type: 'L', args: [1.9, 1.5]},
				];
				expect(encompasses(PLANE, region, points)).toBe(Side.IN);
			});
		});
		describe("partially coincident", () => {
			test("inside", () => {
				const points = [
					{type: 'M', args: [0.0, 0.1]},
					{type: 'L', args: [0.0, 0.9]},
					{type: 'L', args: [0.9, 0.5]},
				];
				expect(encompasses(PLANE, region, points)).toBe(Side.OUT);
			});
			test("outside", () => {
				const points = [
					{type: 'M', args: [0.0, 0.1]},
					{type: 'L', args: [0.0, 0.9]},
					{type: 'L', args: [-0.9, 0.5]},
				];
				expect(encompasses(PLANE, region, points)).toBe(Side.IN);
			});
		});
		test("fully coincident", () => {
			expect(encompasses(PLANE, region, region)).toBe(Side.BORDERLINE);
		});
	});
	test("arc in a concave region", () => {
		const region = [
			{type: 'M', args: [0, -1]},
			{type: 'L', args: [2, 0]},
			{type: 'L', args: [2, -3]},
			{type: 'L', args: [-2, -3]},
			{type: 'L', args: [-2, 0]},
		];
		const arc = [
			{type: 'M', args: [2, 0]},
			{type: 'A', args: [2, 2, 0, 0, 0, -2, 0]},
		];
		expect(encompasses(PLANE, region, arc)).toBe(Side.IN);
	});
});

describe("cutToSize", () => {
	const edges = [
		{type: 'M', args: [0, 0]},
		{type: 'L', args: [0, 1]},
		{type: 'L', args: [1, 1]},
		{type: 'L', args: [1, 0]},
		{type: 'L', args: [0, 0]},
	];
	test("open region", () => {
		expect(() => cutToSize(
			[{type: 'M', args: [0, 0]}, {type: 'L', args: [1, 0]}],
			PLANE, edges,
			true,
		)).toThrow(); // open regions are not allowed if closePath is true
	});
	test("open edges", () => {
		expect(() => cutToSize(
			edges, PLANE,
			[{type: 'M', args: [0, 0]}, {type: 'L', args: [1, 0]}],
			false,
		)).toThrow(); // open edges are never allowed
	});
	test("zero islands", () => {
		expect(cutToSize(
			[], PLANE, edges, true,
		)).toEqual(edges); // [] is interpreted as the region that includes everything
	});
	test("one island, inside", () => {
		const segments = [
			{type: 'M', args: [0.1, 0.1]},
			{type: 'L', args: [0.1, 0.9]},
			{type: 'L', args: [0.9, 0.5]},
			{type: 'L', args: [0.1, 0.1]},
		];
		expect(cutToSize(
			segments, PLANE, edges, true,
		)).toEqual(segments); // for a well-behaved island like this, cropping it doesn't change anything
	});
	test("one island, outside", () => {
		const segments = [
			{type: 'M', args: [1.1, 1.1]},
			{type: 'L', args: [1.1, 1.9]},
			{type: 'L', args: [1.9, 1.5]},
			{type: 'L', args: [1.1, 1.1]},
		];
		expect(cutToSize(
			segments, PLANE, edges, true,
		)).toEqual([]); // if the island is completely outside of the region, it's removed completely
	});
	test("one island, straddling", () => {
		const segments = [
			{type: 'M', args: [0.5, 0.1]},
			{type: 'L', args: [0.5, 0.9]},
			{type: 'L', args: [1.5, 0.5]},
			{type: 'L', args: [0.5, 0.1]},
		];
		expect(cutToSize(
			segments, PLANE, edges, true,
		)).toEqual([ // if the island is partly out, it should be clipped at the edge
			{type: 'M', args: [0.5, 0.1]},
			{type: 'L', args: [0.5, 0.9]},
			{type: 'L', args: [1.0, 0.7]},
			{type: 'L', args: [1.0, 0.3]},
			{type: 'L', args: [0.5, 0.1]},
		]);
	});
	test("negative one island, inside", () => {
		const segments = [
			{type: 'M', args: [0.1, 0.9]},
			{type: 'L', args: [0.1, 0.1]},
			{type: 'L', args: [0.9, 0.5]},
			{type: 'L', args: [0.1, 0.9]},
		];
		expect(cutToSize(
			segments, PLANE, edges, true,
		)).toEqual(segments.concat(edges)); // if the island is inverted, the edges need to be added to set its clipped boundaries
	});
	test("negative two islands, straddling", () => {
		const segments = [
			{type: 'M', args: [0.7, 0.9]},
			{type: 'L', args: [0.7, 0.1]},
			{type: 'L', args: [1.3, 0.5]},
			{type: 'L', args: [0.7, 0.9]},
			{type: 'M', args: [0.3, 0.1]},
			{type: 'L', args: [0.3, 0.9]},
			{type: 'L', args: [-.3, 0.5]},
			{type: 'L', args: [0.3, 0.1]},
		];
		expect(cutToSize(
			segments, PLANE, edges, true,
		)).toEqual([ // if there are multiple negative islands, they get connected along the edges
			{type: 'M', args: [0.7, 0.9]},
			{type: 'L', args: [0.7, 0.1]},
			{type: 'L', args: [1.0, expect.closeTo(0.3)]},
			{type: 'L', args: [1.0, 0.0]},
			{type: 'L', args: [0.0, 0.0]},
			{type: 'L', args: [0.0, expect.closeTo(0.3)]},
			{type: 'L', args: [0.3, 0.1]},
			{type: 'L', args: [0.3, 0.9]},
			{type: 'L', args: [0.0, expect.closeTo(0.7)]},
			{type: 'L', args: [0.0, 1.0]},
			{type: 'L', args: [1.0, 1.0]},
			{type: 'L', args: [1.0, expect.closeTo(0.7)]},
			{type: 'L', args: [0.7, 0.9]},
		]);
	});
	test("periodic domain", () => {
		const segments = [
			{type: 'M', args: [3, -2]},
			{type: 'L', args: [-3, 0]},
			{type: 'L', args: [3, 2]},
			{type: 'L', args: [3, -2]},
			{type: 'M', args: [0, 2]},
			{type: 'L', args: [0, 0]},
			{type: 'L', args: [0, -2]},
			{type: 'L', args: [0, 2]},
		];
		const toroidalEdges = [
			{type: 'M', args: [-π, -π]},
			{type: LongLineType.PARALLEL, args: [-π, π]},
			{type: LongLineType.MERIDIAN, args: [π, π]},
			{type: LongLineType.PARALLEL, args: [π, -π]},
			{type: LongLineType.MERIDIAN, args: [-π, -π]},
		];
		expect(cutToSize(
			segments, TOROID, toroidalEdges, true,
		)).toEqual([ // this one gets broken up into three distinct regions
			// the northwest corner
			{type: 'M', args: [3, -2]},
			{type: 'L', args: [π, -1]},
			{type: LongLineType.PARALLEL, args: [π, -π]},
			{type: LongLineType.MERIDIAN, args: [3, -π]},
			{type: 'L', args: [3, -2]},
			// the southern crescent
			{type: 'M', args: [-π, -1]},
			{type: 'L', args: [-3, 0]},
			{type: 'L', args: [-π, 1]},
			{type: LongLineType.PARALLEL, args: [-π, π]},
			{type: LongLineType.MERIDIAN, args: [0, π]},
			{type: 'L', args: [0, 2]},
			{type: 'L', args: [0, 0]},
			{type: 'L', args: [0, -2]},
			{type: 'L', args: [0, -π]},
			{type: LongLineType.MERIDIAN, args: [-π, -π]},
			{type: LongLineType.PARALLEL, args: [-π, -1]},
			// and the northeast corner
			{type: 'M', args: [π, 1]},
			{type: 'L', args: [3, 2]},
			{type: 'L', args: [3, π]},
			{type: LongLineType.MERIDIAN, args: [π, π]},
			{type: LongLineType.PARALLEL, args: [π, 1]},
		]);
	});
	test("fully coincident", () => {
		expect(cutToSize(
			edges, PLANE, edges, true,
		)).toEqual(edges); // if the region is the same as the edges, that's what should be returned
	});
	test("one segment with two crossings", () => {
		const segments = [
			{type: 'M', args: [1.5, 1.5]},
			{type: 'L', args: [1.5, 0.0]},
			{type: 'L', args: [0.0, 1.5]},
			{type: 'L', args: [1.5, 1.5]},
		];
		expect(cutToSize(
			segments, PLANE, edges, false,
		)).toEqual([ // even tho all vertices are outside the square, part of one segment should get caught
			{type: 'M', args: [1.0, 0.5]},
			{type: 'L', args: [0.5, 1.0]},
		]);
	});
	test("partially coincident but not tangent", () => {
		const segments = [
			{type: 'M', args: [1.1, 0.1]},
			{type: 'L', args: [1.0, 0.2]},
			{type: 'L', args: [1.0, 0.3]},
			{type: 'L', args: [0.9, 0.4]},
			{type: 'L', args: [1.1, 0.4]},
			{type: 'L', args: [1.1, 0.1]},
		];
		expect(cutToSize(
			segments, PLANE, edges, false,
		)).toEqual([
			{type: 'M', args: [1.0, 0.3]},
			{type: 'L', args: [0.9, 0.4]},
			{type: 'L', args: [1.0, 0.4]},
		]);
	});
	test("intersects an edge vertex", () => {
		const segments = [
			{type: 'M', args: [1.5, -0.5]},
			{type: 'L', args: [-0.5, 1.5]},
			{type: 'L', args: [1.5, 1.5]},
			{type: 'L', args: [1.5, -0.5]},
		];
		expect(cutToSize(
			segments, PLANE, edges, true,
		)).toEqual([ // make sure it doesn't duplicate any vertices
			{type: 'M', args: [1.0, 0.0]},
			{type: 'L', args: [0.0, 1.0]},
			{type: 'L', args: [1.0, 1.0]},
			{type: 'L', args: [1.0, 0.0]},
		]);
	});
});
