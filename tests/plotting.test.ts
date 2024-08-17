/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {
	applyProjectionToPath,
	contains,
	cropToEdges,
	encompasses,
	getEdgeCrossings,
	isClosed
} from "../source/map/plotting.js";
import {Side} from "../source/utilities/miscellaneus.js";
import {endpoint, PathSegment} from "../source/utilities/coordinates.js";
import {Toroid} from "../source/surface/toroid.js";
import {LockedDisc} from "../source/surface/lockeddisc.js";
import {MapProjection} from "../source/map/projection.js";
import {Sphere} from "../source/surface/sphere.js";
import {INFINITE_PLANE} from "../source/surface/surface";

const π = Math.PI;

describe("isClosed", () => {
	const plane = INFINITE_PLANE;
	const sphere = new Sphere(1);
	test("nothing", () => {
		const path: PathSegment[] = [];
		expect(isClosed(path, plane)).toBe(true);
	});
	test("line", () => {
		const path = [
			{type: 'M', args: [-1, 2]},
			{type: 'L', args: [3, -4]},
		];
		expect(isClosed(path, plane)).toBe(false);
	});
	test("loop", () => {
		const path = [
			{type: 'M', args: [-1, 2]},
			{type: 'L', args: [3, -4]},
			{type: 'L', args: [-5, 0]},
			{type: 'L', args: [-1, 2]},
		];
		expect(isClosed(path, plane)).toBe(true);
	});
	test("loop around the antimeridian", () => {
		const path = [
			{type: 'M', args: [1, -π]},
			{type: 'Φ', args: [1, π]},
		];
		expect(isClosed(path, sphere)).toBe(true);
	});
});

describe("getEdgeCrossings", () => {
	describe("geographical", () => {
		test("line across a meridian", () => {
			const meridian = [
				{type: 'M', args: [-1, 3]},
				{type: 'Λ', args: [1, 3]}
			];
			const segment = [
				{type: 'M', args: [1, 2]},
				{type: 'L', args: [-1, 4]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], meridian, true)).toEqual([{
				intersect0: {s: -0, t: 3}, intersect1: {s: -0, t: 3},
				loopIndex: 0, entering: false,
			}]);
		});
		test("line across the antimeridian", () => {
			const antimeridian = [
				{type: 'M', args: [-1, π]},
				{type: 'Λ', args: [1, π]}
			];
			const segment = [
				{type: 'M', args: [0, 3]},
				{type: 'L', args: [0, -3]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], antimeridian, true)).toEqual([{
				intersect0: {s: 0, t: π}, intersect1: {s: 0, t: -π},
				loopIndex: 0, entering: false,
			}]);
		});
		test("parallel across a meridian", () => {
			const meridian = [
				{type: 'M', args: [0, 0]},
				{type: 'Λ', args: [π, 0]},
			];
			const segment = [
				{type: 'M', args: [1, -2]},
				{type: 'Φ', args: [1, 2]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], meridian, true)).toEqual([{
				intersect0: {s: 1, t: 0}, intersect1: {s: 1, t: 0},
				loopIndex: 0, entering: false,
			}]);
		});
		test("line across a parallel", () => {
			const parallel = [
				{type: 'M', args: [0, 2]},
				{type: 'Φ', args: [0, -3]},
			];
			const segment = [
				{type: 'M', args: [-1, 0]},
				{type: 'L', args: [2, 3]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, true)).toEqual([{
				intersect0: {s: 0, t: 1}, intersect1: {s: 0, t: 1},
				loopIndex: 0, entering: false,
			}]);
		});
		test("periodic line across a parallel", () => {
			const parallel = [
				{type: 'M', args: [0, π]},
				{type: 'Φ', args: [0, 0]},
			];
			const segment = [
				{type: 'M', args: [-1, 2*π/3]},
				{type: 'L', args: [2, -5*π/6]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, true)).toEqual([{
				intersect0: {s: 0, t: 5*π/6}, intersect1: {s: 0, t: 5*π/6},
				loopIndex: 0, entering: false,
			}]);
		});
		test("meridian across a parallel", () => {
			const parallel = [
				{type: 'M', args: [0, π]},
				{type: 'Φ', args: [0, 0]},
			];
			const segment = [
				{type: 'M', args: [-1, 2]},
				{type: 'Λ', args: [3, 2]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, true)).toEqual([{
				intersect0: {s: 0, t: 2}, intersect1: {s: 0, t: 2},
				loopIndex: 0, entering: false,
			}]);
		});
		test("line across the antiequator", () => {
			const parallel = [
				{type: 'M', args: [π, 2]},
				{type: 'Φ', args: [π, -3]},
			];
			const segment = [
				{type: 'M', args: [3, 2]},
				{type: 'L', args: [-3, 2]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, true)).toEqual([{
				intersect0: {s: π, t: 2}, intersect1: {s: -π, t: 2},
				loopIndex: 0, entering: false,
			}]);
		});
		test("line across two edges", () => {
			const corner = [
				{type: 'M', args: [-1, 1]},
				{type: 'Λ', args: [1, 1]},
				{type: 'Φ', args: [1, -1]},
			];
			const segment = [
				{type: 'M', args: [-1.5, 2.5]},
				{type: 'L', args: [1.5, -0.5]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], corner, true)).toEqual([
				{intersect0: {s: 0, t: 1}, intersect1: {s: 0, t: 1}, loopIndex: 0, entering: true},
				{intersect0: {s: 1, t: 0}, intersect1: {s: 1, t: 0}, loopIndex: 0, entering: false},
			]);
		});
		test("line thru a vertex", () => {
			const corner = [
				{type: 'M', args: [-1, 0]},
				{type: 'Λ', args: [0, 0]},
				{type: 'Φ', args: [0, -1]},
			];
			const segment = [
				{type: 'M', args: [-1, -1]},
				{type: 'L', args: [1, 1]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], corner, true)).toEqual([{
				intersect0: {s: -0, t: 0}, intersect1: {s: -0, t: 0},
				loopIndex: 0, entering: false,
			}]);
		});
		describe("line onto a parallel", () => {
			const parallel = [
				{type: 'M', args: [0, 2]},
				{type: 'Φ', args: [0, -3]},
			];
			test("entering", () => {
				const segment = [
					{type: 'M', args: [1, 3]},
					{type: 'L', args: [0, 0]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, true)).toEqual([]);
			});
			test("exiting", () => {
				const segment = [
					{type: 'M', args: [-1, 3]},
					{type: 'L', args: [0, 0]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, true)).toEqual([{
					intersect0: {s: 0, t: 0}, intersect1: {s: 0, t: 0},
					loopIndex: 0, entering: false,
				}]);
			});
			test("along", () => {
				const segment = [
					{type: 'M', args: [0, 0]},
					{type: 'L', args: [0, 1]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, true)).toEqual([]);
			});
			test("exiting, with known roundoff issues", () => {
				const edge = [
					{type: 'M', args: [2.2990403105010992, -1]},
					{type: 'Φ', args: [2.2990403105010992, 1]},
				];
				const segment = [
					{type: 'M', args: [2.3011331145822087, -0.08713711381374845]},
					{type: 'L', args: [2.2990403105010992, -0.08824891027566292]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edge, true)).toEqual([{
					intersect0: {s: 2.2990403105010992, t: -0.08824891027566292},
					intersect1: {s: 2.2990403105010992, t: -0.08824891027566292},
					loopIndex: 0, entering: false,
				}]);
			});
		});
		test("line onto a meridian (with known roundoff issues)", () => {
			const meridian = [
				{type: 'M', args: [π, -π]},
				{type: 'Λ', args: [-π, -π]},
			];
			const segment = [
				{type: 'M', args: [0.130964506054289, -3.118616303993922]},
				{type: 'L', args: [0.18247162241832457, -π]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], meridian, true)).toEqual([{
				intersect0: {s: 0.18247162241832457, t: -π}, intersect1: {s: 0.18247162241832457, t: π},
				loopIndex: 0, entering: false
			}]);
		});
	});
	describe("Cartesian", () => {
		describe("line", () => {
			test("across a line", () => {
				const edge = [
					{type: 'M', args: [1, 0]},
					{type: 'L', args: [1, -1]},
				];
				const segment = [
					{type: 'M', args: [0, 0]},
					{type: 'L', args: [2, -1]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edge, false)).toEqual([{
					intersect0: {s: 1, t: -1/2}, intersect1: {s: 1, t: -1/2},
					loopIndex: 0, entering: false,
				}]);
			});
			test("across two lines", () => {
				const edges = [
					{type: 'M', args: [1, 1]},
					{type: 'L', args: [1, -1]},
					{type: 'L', args: [-1, -1]},
				];
				const segment = [
					{type: 'M', args: [2, 1]},
					{type: 'L', args: [-1, -2]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edges, false)).toEqual([
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
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], corner, false)).toEqual([{
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
					expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edge, false)).toEqual([]);
				});
				test("exiting", () => {
					const segment = [
						{type: 'M', args: [1, 1]},
						{type: 'L', args: [2, 0]},
					];
					expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edge, false)).toEqual([{
						intersect0: {s: 2, t: 0}, intersect1: {s: 2, t: 0},
						loopIndex: 0, entering: false,
					}]);
				});
				test("along", () => {
					const segment = [
						{type: 'M', args: [1, 0]},
						{type: 'L', args: [2, 0]},
					];
					expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edge, false)).toEqual([]);
				});
			});
		});
		describe("arc", () => {
			test("crossing a line", () => {
				const edge = [
					{type: 'M', args: [1., 0.]},
					{type: 'L', args: [1., -2.]},
				];
				const segment = [
					{type: 'M', args: [0., 0.]},
					{type: 'A', args: [1., 1., 0, 0, 1, 2., 0.]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edge, false)).toEqual([{
					intersect0: {s: 1., t: -1.}, intersect1: {s: 1., t: -1.},
					loopIndex: 0, entering: false,
				}]);
			});
			test("onto a line", () => {
				const edge = [
					{type: 'M', args: [0, -3]},
					{type: 'L', args: [0, -1]},
				];
				const segments = [
					{type: 'M', args: [1, -2]},
					{type: 'A', args: [3, 3, 0, 0, 0, 0, -2]},
				];
				expect(getEdgeCrossings(endpoint(segments[0]), segments[1], edge, false)).toEqual([{
					intersect0: {s: 0, t: -2}, intersect1: {s: 0, t: -2},
					loopIndex: 0, entering: false,
				}]);
			});
			test("onto a line (with known roundoff issues)", () => {
				const edge = [
					{type: 'M', args: [-346.1074722752436, -2846.159606596557]},
					{type: 'L', args: [-346.1074722752436, -2752]},
				];
				const segments = [
					{type: 'M', args: [-263.4140742546302, -2838.7311389789447]},
					{type: 'A', args: [4674.056630597984, 4674.056630597984, 0, 0, 0, -346.1074722752436, -2833.32760088764]},
				];
				expect(getEdgeCrossings(endpoint(segments[0]), segments[1], edge, false)).toEqual([{
					intersect0: {s: -346.1074722752436, t: -2833.32760088764},
					intersect1: {s: -346.1074722752436, t: -2833.32760088764},
					loopIndex: 0, entering: false,
				}]);
			});
			test("across a line and back", () => {
				const edge = [
					{type: 'M', args: [0, -1]},
					{type: 'L', args: [4, -1]},
				];
				const segments = [
					{type: 'M', args: [2, 0]},
					{type: 'A', args: [2, 2, 0, 1, 1, 2 + Math.sqrt(3), -1]},
				];
				expect(getEdgeCrossings(endpoint(segments[0]), segments[1], edge, false)).toEqual([
					{
						intersect0: {s: 2 + Math.sqrt(3), t: -1},
						intersect1: {s: 2 + Math.sqrt(3), t: -1},
						loopIndex: 0, entering: false,
					},
					{
						intersect0: {s: expect.closeTo(2 - Math.sqrt(3)), t: -1},
						intersect1: {s: expect.closeTo(2 - Math.sqrt(3)), t: -1},
						loopIndex: 0, entering: true,
					},
				]);
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
			expect(contains(region, {s: 3, t: -1}, false))
				.toBe(Side.IN);
		});
		test("outside", () => {
			expect(contains(region, {s: 0, t: -8}, false))
				.toBe(Side.OUT);
		});
		test("borderline", () => {
			expect(contains(region, {s: 2, t: -3}, false))
				.toBe(Side.BORDERLINE);
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
			expect(contains(region, {s: 2, t: -2}, false))
				.toBe(Side.IN);
		});
		test("outside toward the point", () => {
			expect(contains(region, {s: 4, t: -3}, false))
				.toBe(Side.OUT);
		});
		test("outside away from the point", () => {
			expect(contains(region, {s: 0, t: -3}, false))
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
			expect(contains(region, {s: 0, t: -8}, false))
				.toBe(Side.IN);
		});
		test("outside", () => {
			expect(contains(region, {s: 3, t: -1}, false))
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
			expect(contains(region, {s: 1.5, t: -1}, false))
				.toBe(Side.IN);
		});
		test("outside", () => {
			expect(contains(region, {s: 0, t: -8}, false))
				.toBe(Side.OUT);
		});
		test("in the hole", () => {
			expect(contains(region, {s: 3, t: -1}, false))
				.toBe(Side.OUT);
		});
	});
	describe("periodic region", () => {
		const region = [
			{type: 'M', args: [.5, π]},
			{type: 'Φ', args: [.5, -π]},
		];
		test("inside", () => {
			expect(contains(region, {s: 0, t: 2}, true))
				.toBe(Side.IN);
		});
		test("outside", () => {
			expect(contains(region, {s: 1, t: 2}, true))
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
				expect(contains(region, {s: 0.2, t: 3}, true))
					.toBe(Side.IN);
			});
			test("outside", () => {
				expect(contains(region, {s: 0.2, t: 0}, true))
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
				expect(contains(region, {s: 0.2, t: 0}, true))
					.toBe(Side.IN);
			});
			test("outside", () => {
				expect(contains(region, {s: 0.2, t: 3}, true))
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
				{type: 'Φ', args: [0, -π]},
			];
			test("inside", () => {
				expect(contains(region, {s: -1, t: 0}, true))
					.toBe(Side.IN);
			});
			test("outside", () => {
				expect(contains(region, {s: 3, t: 0}, true))
					.toBe(Side.OUT);
			});
		});
	});
	describe("region is domain boundary", () => {
		const region = [
			{type: 'M', args: [-π, -π]},
			{type: 'Φ', args: [-π, π]},
			{type: 'Λ', args: [π, π]},
			{type: 'Φ', args: [π, -π]},
			{type: 'Λ', args: [-π, -π]},
		];
		test("inside", () => {
			expect(contains(region, {s: -3, t: -1}, true))
				.toBe(Side.IN);
		});
		test("outside", () => {
			expect(contains(region, {s: -4, t: -1}, true))
				.toBe(Side.OUT);
		});
		test("borderline", () => {
			expect(contains(region, {s: -π, t: -1}, true))
				.toBe(Side.BORDERLINE);
		});
	});
	test("null region", () => {
		const region: PathSegment[] = [];
		expect(contains(region, {s: 9000, t: 9001}, false)).toBe(Side.IN);
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
				expect(encompasses(region, points, false)).toBe(Side.IN);
			});
			test("outside", () => {
				const points = [
					{type: 'M', args: [1.1, 1.1]},
					{type: 'L', args: [1.1, 1.9]},
					{type: 'L', args: [1.9, 1.5]},
				];
				expect(encompasses(region, points, false)).toBe(Side.OUT);
			});
			test("around", () => {
				const points = [
					{type: 'M', args: [-2, -2]},
					{type: 'L', args: [-2, 3]},
					{type: 'L', args: [3, 0.5]},
				];
				expect(encompasses(region, points, false)).toBe(Side.OUT);
			});
		});
		describe("partially coincident", () => {
			test("inside", () => {
				const points = [
					{type: 'M', args: [0.0, 0.1]},
					{type: 'L', args: [0.0, 0.9]},
					{type: 'L', args: [0.9, 0.5]},
				];
				expect(encompasses(region, points, false)).toBe(Side.IN);
			});
			test("outside", () => {
				const points = [
					{type: 'M', args: [0.0, 0.1]},
					{type: 'L', args: [0.0, 0.9]},
					{type: 'L', args: [-0.9, 0.5]},
				];
				expect(encompasses(region, points, false)).toBe(Side.OUT);
			});
		});
		test("fully coincident", () => {
			expect(encompasses(region, region, false)).toBe(Side.BORDERLINE);
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
				expect(encompasses(region, points, false)).toBe(Side.OUT);
			});
			test("outside", () => {
				const points = [
					{type: 'M', args: [1.1, 1.1]},
					{type: 'L', args: [1.1, 1.9]},
					{type: 'L', args: [1.9, 1.5]},
				];
				expect(encompasses(region, points, false)).toBe(Side.IN);
			});
		});
		describe("partially coincident", () => {
			test("inside", () => {
				const points = [
					{type: 'M', args: [0.0, 0.1]},
					{type: 'L', args: [0.0, 0.9]},
					{type: 'L', args: [0.9, 0.5]},
				];
				expect(encompasses(region, points, false)).toBe(Side.OUT);
			});
			test("outside", () => {
				const points = [
					{type: 'M', args: [0.0, 0.1]},
					{type: 'L', args: [0.0, 0.9]},
					{type: 'L', args: [-0.9, 0.5]},
				];
				expect(encompasses(region, points, false)).toBe(Side.IN);
			});
		});
		test("fully coincident", () => {
			expect(encompasses(region, region, false)).toBe(Side.BORDERLINE);
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
		expect(encompasses(region, arc, false)).toBe(Side.IN);
	});
});

describe("cropToEdges", () => {
	const TOROID = new Toroid(3, 1, .008, 0);
	const edges = [
		{type: 'M', args: [0, 0]},
		{type: 'L', args: [0, 1]},
		{type: 'L', args: [1, 1]},
		{type: 'L', args: [1, 0]},
		{type: 'L', args: [0, 0]},
	];
	test("open region", () => {
		expect(() => cropToEdges(
			[{type: 'M', args: [0, 0]}, {type: 'L', args: [1, 0]}],
			edges, INFINITE_PLANE,
			true,
		)).toThrow(); // open regions are not allowed if closePath is true
	});
	test("open edges", () => {
		expect(() => cropToEdges(
			edges,
			[{type: 'M', args: [0, 0]}, {type: 'L', args: [1, 0]}],
			INFINITE_PLANE,
			false,
		)).toThrow(); // open edges are never allowed
	});
	test("zero islands", () => {
		expect(cropToEdges(
			[], edges, INFINITE_PLANE, true,
		)).toEqual(edges); // [] is interpreted as the region that includes everything
	});
	test("one island, inside", () => {
		const segments = [
			{type: 'M', args: [0.1, 0.1]},
			{type: 'L', args: [0.1, 0.9]},
			{type: 'L', args: [0.9, 0.5]},
			{type: 'L', args: [0.1, 0.1]},
		];
		expect(cropToEdges(
			segments, edges, INFINITE_PLANE, true,
		)).toEqual(segments); // for a well-behaved island like this, cropping it doesn't change anything
	});
	test("one island, outside", () => {
		const segments = [
			{type: 'M', args: [1.1, 1.1]},
			{type: 'L', args: [1.1, 1.9]},
			{type: 'L', args: [1.9, 1.5]},
			{type: 'L', args: [1.1, 1.1]},
		];
		expect(cropToEdges(
			segments, edges, INFINITE_PLANE, true,
		)).toEqual([]); // if the island is completely outside of the region, it's removed completely
	});
	test("one island, straddling", () => {
		const segments = [
			{type: 'M', args: [0.5, 0.1]},
			{type: 'L', args: [0.5, 0.9]},
			{type: 'L', args: [1.5, 0.5]},
			{type: 'L', args: [0.5, 0.1]},
		];
		expect(cropToEdges(
			segments, edges, INFINITE_PLANE, true,
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
		expect(cropToEdges(
			segments, edges, INFINITE_PLANE, true,
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
		expect(cropToEdges(
			segments, edges, INFINITE_PLANE, true,
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
			{type: 'Φ', args: [-π, π]},
			{type: 'Λ', args: [π, π]},
			{type: 'Φ', args: [π, -π]},
			{type: 'Λ', args: [-π, -π]},
		];
		expect(cropToEdges(
			segments, toroidalEdges, TOROID,true,
		)).toEqual([ // this one gets broken up into three distinct regions
			// the northwest corner
			{type: 'M', args: [3, -2]},
			{type: 'L', args: [π, -1]},
			{type: 'Φ', args: [π, -π]},
			{type: 'Λ', args: [3, -π]},
			{type: 'L', args: [3, -2]},
			// the southern crescent
			{type: 'M', args: [-π, -1]},
			{type: 'L', args: [-3, 0]},
			{type: 'L', args: [-π, 1]},
			{type: 'Φ', args: [-π, π]},
			{type: 'Λ', args: [0, π]},
			{type: 'L', args: [0, 2]},
			{type: 'L', args: [0, 0]},
			{type: 'L', args: [0, -2]},
			{type: 'L', args: [0, -π]},
			{type: 'Λ', args: [-π, -π]},
			{type: 'Φ', args: [-π, -1]},
			// and the northeast corner
			{type: 'M', args: [π, 1]},
			{type: 'L', args: [3, 2]},
			{type: 'L', args: [3, π]},
			{type: 'Λ', args: [π, π]},
			{type: 'Φ', args: [π, 1]},
		]);
	});
	test("single vertex over a periodic domain", () => {
		const segments = [
			{type: 'M', args: [1, 3]},
			{type: 'L', args: [2, -3]},
		];
		const toroidalEdges = [
			{type: 'M', args: [-π, -π]},
			{type: 'Φ', args: [-π, π]},
			{type: 'Λ', args: [π, π]},
			{type: 'Φ', args: [π, -π]},
			{type: 'Λ', args: [-π, -π]},
		];
		expect(cropToEdges(segments, toroidalEdges, TOROID, false)).toEqual([
			{type: 'M', args: [1, 3]},
			{type: 'L', args: [1.5, π]},
			{type: 'M', args: [1.5, -π]},
			{type: 'L', args: [2, -3]},
		]);
	});
	test("fully coincident", () => {
		expect(cropToEdges(
			edges, edges, INFINITE_PLANE, true,
		)).toEqual(edges); // if the region is the same as the edges, that's what should be returned
	});
	test("one segment with two crossings", () => {
		const segments = [
			{type: 'M', args: [1.5, 1.5]},
			{type: 'L', args: [1.5, 0.0]},
			{type: 'L', args: [0.0, 1.5]},
			{type: 'L', args: [1.5, 1.5]},
		];
		expect(cropToEdges(
			segments, edges, INFINITE_PLANE, false,
		)).toEqual([ // even tho all vertices are outside the square, part of one segment should get caught
			{type: 'M', args: [1.0, 0.5]},
			{type: 'L', args: [0.5, 1.0]},
		]);
	});
	test("tangent", () => {
		const segments = [
			{type: 'M', args: [0.5, 0.1]},
			{type: 'L', args: [0.0, 0.5]},
			{type: 'L', args: [0.5, 0.9]},
			{type: 'L', args: [0.5, 0.1]},
		];
		expect(cropToEdges(
			segments, edges, INFINITE_PLANE, true,
		)).toEqual(segments);
	});
	test("doubly tangent", () => {
		const segments = [
			{type: 'M', args: [0.5, 0.1]},
			{type: 'L', args: [0.0, 0.5]},
			{type: 'L', args: [0.5, 1.0]},
			{type: 'L', args: [0.5, 0.1]},
		];
		expect(cropToEdges(
			segments, edges, INFINITE_PLANE, true,
		)).toEqual(segments);
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
		expect(cropToEdges(
			segments, edges, INFINITE_PLANE, false,
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
		expect(cropToEdges(
			segments, edges, INFINITE_PLANE, true,
		)).toEqual([ // make sure it doesn't duplicate any vertices
			{type: 'M', args: [1.0, 0.0]},
			{type: 'L', args: [0.0, 1.0]},
			{type: 'L', args: [1.0, 1.0]},
			{type: 'L', args: [1.0, 0.0]},
		]);
	});
});

describe("applyProjectionToPath", () => {
	const surface = new LockedDisc(2);
	surface.initialize();
	const projection = MapProjection.conic(surface, surface.фMin, surface.фMax);
	test("points", () => {
		const path = [
			{type: 'M', args: [π/4, -π/2]},
			{type: 'M', args: [π/4, π/2]},
		];
		expect(applyProjectionToPath(projection, path, 1.1)).toEqual([
			{type: 'M', args: [
				expect.closeTo(-1),
				expect.closeTo(0),
			]},
			{type: 'M', args: [
				expect.closeTo(1),
				expect.closeTo(0),
			]},
		]);
	});
	test("line", () => {
		const path = [
			{type: 'M', args: [π/2, 0]},
			{type: 'L', args: [π/4, π/2]},
		];
		expect(applyProjectionToPath(projection, path, 1.1)).toEqual([
			{type: 'M', args: [
				expect.closeTo(0),
				expect.closeTo(0),
			]},
			{type: 'L', args: [
				expect.closeTo(1),
				expect.closeTo(0),
			]},
		]);
	});
	test("long line", () => {
		const path = [
			{type: 'M', args: [π/4, -π/2]},
			{type: 'L', args: [π/4, π/2]},
		];
		expect(applyProjectionToPath(projection, path, 1.1)).toEqual([
			{type: 'M', args: [
				expect.closeTo(-1),
				expect.closeTo(0),
			]},
			{type: 'L', args: [
				expect.closeTo(-Math.sqrt(2)/2),
				expect.closeTo(Math.sqrt(2)/2),
			]},
			{type: 'L', args: [
				expect.closeTo(0),
				expect.closeTo(1),
			]},
			{type: 'L', args: [
				expect.closeTo(Math.sqrt(2)/2),
				expect.closeTo(Math.sqrt(2)/2),
			]},
			{type: 'L', args: [
				expect.closeTo(1),
				expect.closeTo(0),
			]},
		]);
	});
	test("parallel", () => {
		const path = [
			{type: 'M', args: [π/4, -π/2]},
			{type: 'Φ', args: [π/4, π/2]},
		];
		expect(applyProjectionToPath(projection, path, 1.1)).toEqual([
			{type: 'M', args: [
				expect.closeTo(-1),
				expect.closeTo(0),
			]},
			{type: 'A', args: [
				expect.closeTo(1), expect.closeTo(1),
				0, expect.anything(), 0,
				expect.closeTo(1), expect.closeTo(0),
			]},
		]);
	});
});
