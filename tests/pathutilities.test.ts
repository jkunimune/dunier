/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {
	applyProjectionToPath, calculatePathBounds,
	contains,
	intersection,
	encompasses,
	getEdgeCrossings,
	isClosed, Domain, INFINITE_PLANE, polygonize, decimate, getAllCombCrossings, Rule, Side
} from "../source/mapping/pathutilities.js";
import {endpoint, PathSegment} from "../source/utilities/coordinates.js";
import {LockedDisc} from "../source/generation/surface/lockeddisc.js";
import {MapProjection} from "../source/mapping/projection.js";

const π = Math.PI;
const plane = INFINITE_PLANE;
const geoid = new Domain(-π, π, -π, π, (_) => false);

describe("isClosed", () => {
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
			{type: 'L', args: [1, -π]},
		];
		expect(isClosed(path, geoid)).toBe(true);
	});
	test("loop around the antimeridian without the required connecting segment", () => {
		const path = [
			{type: 'M', args: [1, -π]},
			{type: 'Φ', args: [1, π]},
		];
		expect(isClosed(path, geoid)).toBe(false);
	});
	test("loop along the domain boundary", () => {
		const path = [
			{type: 'M', args: [π, π]},
			{type: 'Φ', args: [π, -π]},
			{type: 'Λ', args: [-π, -π]},
			{type: 'Φ', args: [-π, π]},
			{type: 'Λ', args: [π, π]},
		];
		expect(isClosed(path, geoid)).toBe(true);
	});
	test("open loop on edge", () => {
		const disc = new Domain(-Math.PI/2, -0.1, -Math.PI, Math.PI, (p) => p.s === -0.1);
		const path = [
			{type: 'M', args: [-0.1, 0.3]},
			{type: 'L', args: [-0.2, 0.4]},
			{type: 'L', args: [-0.1, 0.5]},
		];
		expect(isClosed(path, disc)).toBe(true);
	});
});

describe("calculatePathBounds", () => {
	test("empty", () => {
		expect(() => calculatePathBounds([])).toThrow();
	});
	test("forward arc", () => {
		const path = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [0, 1]},
			{type: 'A', args: [1, 1, 0, 0, 0, Math.sqrt(3)/2, -1/2]},
			{type: 'Q', args: [0, -2, 0, -1/2]},
			{type: 'Z', args: []},
		];
		expect(calculatePathBounds(path)).toEqual({
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
		expect(calculatePathBounds(path)).toEqual({
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
		expect(() => calculatePathBounds(path)).toThrow();
	});
	test("point at end of arc", () => {
		const path = [
			{type: 'M', args: [0, 0]},
			{type: 'A', args: [2, 2, 0, 0, 0, 2, 0]},
			{type: 'L', args: [1, -1]},
			{type: 'Z', args: []}
		];
		expect(calculatePathBounds(path)).toEqual({
			sMin: expect.closeTo(0),
			sMax: expect.closeTo(2),
			tMin: expect.closeTo(-1),
			tMax: expect.closeTo(2 - Math.sqrt(3)),
		});
	});
});

describe("getEdgeCrossings", () => {
	describe("geographical", () => {
		const geoid = new Domain(-π, π, -π, π, (_) => false);
		test("line across a meridian", () => {
			const meridian = [
				{type: 'M', args: [-1, 3]},
				{type: 'Λ', args: [1, 3]}
			];
			const segment = [
				{type: 'M', args: [1, 2]},
				{type: 'L', args: [-1, 4]},
			];
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], meridian, geoid)).toEqual([{
				intersect0: {s: -0, t: 3}, intersect1: {s: -0, t: 3}, loopIndex: 0,
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
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], antimeridian, geoid)).toEqual([{
				intersect0: {s: 0, t: π}, intersect1: {s: 0, t: -π}, loopIndex: 0,
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
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], meridian, geoid)).toEqual([{
				intersect0: {s: 1, t: 0}, intersect1: {s: 1, t: 0}, loopIndex: 0,
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
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, geoid)).toEqual([{
				intersect0: {s: 0, t: 1}, intersect1: {s: 0, t: 1}, loopIndex: 0,
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
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, geoid)).toEqual([{
				intersect0: {s: 0, t: 5*π/6}, intersect1: {s: 0, t: 5*π/6}, loopIndex: 0,
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
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, geoid)).toEqual([{
				intersect0: {s: 0, t: 2}, intersect1: {s: 0, t: 2}, loopIndex: 0,
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
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, geoid)).toEqual([{
				intersect0: {s: π, t: 2}, intersect1: {s: -π, t: 2}, loopIndex: 0,
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
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], corner, geoid)).toEqual([
				{intersect0: {s: 0, t: 1}, intersect1: {s: 0, t: 1}, loopIndex: 0},
				{intersect0: {s: 1, t: 0}, intersect1: {s: 1, t: 0}, loopIndex: 0},
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
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], corner, geoid)).toEqual([
				{intersect0: {s: -0, t: 0}, intersect1: {s: -0, t: 0}, loopIndex: 0},
				{intersect0: {s: 0, t: 0}, intersect1: {s: 0, t: 0}, loopIndex: 0},
			]);
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
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, geoid)).toEqual([]);
			});
			test("exiting", () => {
				const segment = [
					{type: 'M', args: [-1, 3]},
					{type: 'L', args: [0, 0]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, geoid)).toEqual([{
					intersect0: {s: 0, t: 0}, intersect1: {s: 0, t: 0}, loopIndex: 0,
				}]);
			});
			test("along", () => {
				const segment = [
					{type: 'M', args: [0, 0]},
					{type: 'L', args: [0, 1]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], parallel, geoid)).toEqual([]);
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
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edge, geoid)).toEqual([{
					intersect0: {s: 2.2990403105010992, t: -0.08824891027566292},
					intersect1: {s: 2.2990403105010992, t: -0.08824891027566292},
					loopIndex: 0,
				}]);
			});
		});
		describe("line onto the antimeridian", () => {
			const shiftedGeoid = new Domain(0, 2*π, 0, 2*π, (_) => false);
			const edges = [
				{type: 'M', args: [0, 0]},
				{type: 'Φ', args: [0, 2*π]},
				{type: 'Λ', args: [2*π, 2*π]},
				{type: 'Φ', args: [2*π, 0]},
				{type: 'Λ', args: [0, 0]},
			];
			test("west", () => {
				const segment = [
					{type: 'M', args: [2, 1]},
					{type: 'L', args: [1, 0]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edges, shiftedGeoid)).toEqual([{
					intersect0: {s: 1, t: 0}, intersect1: {s: 1, t: 2*π}, loopIndex: 0,
				}]);
			});
			test("east", () => {
				const segment = [
					{type: 'M', args: [2, 6]},
					{type: 'L', args: [1, 2*π]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edges, shiftedGeoid)).toEqual([{
					intersect0: {s: 1, t: 2*π}, intersect1: {s: 1, t: 0}, loopIndex: 0,
				}]);
			});
			test("west to east", () => {
				const segment = [
					{type: 'M', args: [1, 0]},
					{type: 'L', args: [1, 2*π]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edges, shiftedGeoid)).toEqual([]);
			});
			test("east to west", () => {
				const segment = [
					{type: 'M', args: [1, 2*π]},
					{type: 'L', args: [1, 0]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edges, shiftedGeoid)).toEqual([]);
			});
		});
		describe("line off of the antimeridian", () => {
			const shiftedGeoid = new Domain(-π/2, π/2, -5.06370236647894, 1.2194829407006464, (_) => false);
			const edges = [
				{type: 'M', args: [π/2, 1.2194829407006464]},
				{type: 'Φ', args: [π/2, -5.06370236647894]},
				{type: 'Λ', args: [-π/2, -5.06370236647894]},
				{type: 'Φ', args: [-π/2, 1.2194829407006464]},
				{type: 'Λ', args: [π/2, 1.2194829407006464]},
			];
			test("west", () => {
				const segment = [
					{type: 'M', args: [1, 0]},
					{type: 'L', args: [0, 1]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edges, shiftedGeoid)).toEqual([]);
			});
			test("east", () => {
				const segment = [
					{type: 'M', args: [1, 1.2194829407006464]},
					{type: 'L', args: [0, 1]},
				];
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edges, shiftedGeoid)).toEqual([{
					intersect0: {s: 1, t: -5.06370236647894}, intersect1: {s: 1, t: 1.2194829407006464}, loopIndex: 0,
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
			expect(getEdgeCrossings(endpoint(segment[0]), segment[1], meridian, geoid)).toEqual([{
				intersect0: {s: 0.18247162241832457, t: -π}, intersect1: {s: 0.18247162241832457, t: π},
				loopIndex: 0,
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
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edge, plane)).toEqual([{
					intersect0: {s: 1, t: -1/2}, intersect1: {s: 1, t: -1/2},
					loopIndex: 0,
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
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edges, plane)).toEqual([
					{intersect0: {s: 1, t: 0}, intersect1: {s: 1, t: 0}, loopIndex: 0,},
					{intersect0: {s: 0, t: -1}, intersect1: {s: 0, t: -1}, loopIndex: 0,},
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
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], corner, plane)).toEqual([
					{intersect0: {s: 1, t: -1}, intersect1: {s: 1, t: -1}, loopIndex: 0},
					{intersect0: {s: 1, t: -1}, intersect1: {s: 1, t: -1}, loopIndex: 0},
				]);
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
					expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edge, plane)).toEqual([{
						intersect0: {s: 2, t: 0}, intersect1: {s: 2, t: 0}, loopIndex: 0,
					}]);
				});
				test("exiting", () => {
					const segment = [
						{type: 'M', args: [1, 1]},
						{type: 'L', args: [2, 0]},
					];
					expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edge, plane)).toEqual([{
						intersect0: {s: 2, t: 0}, intersect1: {s: 2, t: 0}, loopIndex: 0,
					}]);
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
				expect(getEdgeCrossings(endpoint(segment[0]), segment[1], edge, plane)).toEqual([{
					intersect0: {s: 1., t: -1.}, intersect1: {s: 1., t: -1.}, loopIndex: 0,
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
				expect(getEdgeCrossings(endpoint(segments[0]), segments[1], edge, plane)).toEqual([{
					intersect0: {s: 0, t: -2}, intersect1: {s: 0, t: -2}, loopIndex: 0,
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
				expect(getEdgeCrossings(endpoint(segments[0]), segments[1], edge, plane)).toEqual([{
					intersect0: {s: -346.1074722752436, t: -2833.32760088764},
					intersect1: {s: -346.1074722752436, t: -2833.32760088764},
					loopIndex: 0,
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
				expect(getEdgeCrossings(endpoint(segments[0]), segments[1], edge, plane)).toEqual([
					{
						intersect0: {s: 2 + Math.sqrt(3), t: -1},
						intersect1: {s: 2 + Math.sqrt(3), t: -1},
						loopIndex: 0,
					},
					{
						intersect0: {s: expect.closeTo(2 - Math.sqrt(3)), t: -1},
						intersect1: {s: expect.closeTo(2 - Math.sqrt(3)), t: -1},
						loopIndex: 0,
					},
				]);
			});
		});
	});
});

describe("getCombCrossings", () => {
	test("line", () => {
		const path = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [2, 2]},
		];
		expect(getAllCombCrossings(path, 0, 1, INFINITE_PLANE)).toEqual([
			{segmentIndex: 1, s: 1, lineIndex: 1, goingEast: true},
			{segmentIndex: 1, s: 2, lineIndex: 2, goingEast: true},
		]);
	});
	test("arc", () => {
		const path = [
			{type: 'M', args: [0, 0]},
			{type: 'A', args: [5, 5, 0, 0, 1, 1, 3]},
		];
		expect(getAllCombCrossings(path, 0, 1, INFINITE_PLANE)).toEqual([
			{segmentIndex: 1, s: Math.sqrt(21) - 4, lineIndex: 1, goingEast: true},
			{segmentIndex: 1, s: Math.sqrt(24) - 4, lineIndex: 2, goingEast: true},
			{segmentIndex: 1, s: 1, lineIndex: 3, goingEast: true},
		]);
	});
});

describe("contains", () => {
	test("illegal point", () => {
		const region: PathSegment[] = [];
		expect(() => contains(region, {s: -9, t: 8}, geoid)).toThrow();
	});
	describe("normal region", () => {
		const region = [
			{type: 'M', args: [4, 0]},
			{type: 'L', args: [2, -4]},
			{type: 'L', args: [2, -1]},
			{type: 'L', args: [3, 0]},
			{type: 'L', args: [4, 0]},
		];
		test("inside", () => {
			expect(contains(region, {s: 3, t: -1}, plane))
				.toBe(Side.IN);
		});
		describe("outside", () => {
			test("to the south", () => {
				expect(contains(region, {s: 0, t: -1}, plane))
					.toBe(Side.OUT);
			});
			test("to the west", () => {
				expect(contains(region, {s: 3, t: -8}, plane))
					.toBe(Side.OUT);
			});
			test("in line with an edge", () => {
				expect(contains(region, {s: 0, t: 0}, plane))
					.toBe(Side.OUT);
			});
		});
		test("borderline", () => {
			expect(contains(region, {s: 2, t: -3}, plane))
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
			expect(contains(region, {s: 2, t: -2}, plane))
				.toBe(Side.IN);
		});
		test("outside toward the point", () => {
			expect(contains(region, {s: 4, t: -3}, plane))
				.toBe(Side.OUT);
		});
		test("outside away from the point", () => {
			expect(contains(region, {s: 0, t: -3}, plane))
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
			expect(contains(region, {s: 0, t: -8}, plane))
				.toBe(Side.IN);
		});
		test("outside", () => {
			expect(contains(region, {s: 3, t: -1}, plane))
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
			expect(contains(region, {s: 1.5, t: -1}, plane))
				.toBe(Side.IN);
		});
		test("outside", () => {
			expect(contains(region, {s: 0, t: -8}, plane))
				.toBe(Side.OUT);
		});
		test("in the hole", () => {
			expect(contains(region, {s: 3, t: -1}, plane))
				.toBe(Side.OUT);
		});
	});
	test("collinear in two directions", () => {
		const region: PathSegment[] = [
			{type: 'M', args: [0.0, 0.0]},
			{type: 'L', args: [0.0, 1.0]},
			{type: 'L', args: [1.0, 1.0]},
			{type: 'L', args: [1.0, 0.1]},
			{type: 'L', args: [0.9, 0.0]},
			{type: 'L', args: [0.0, 0.0]},
		];
		expect(contains(region, {s: 1.0, t: 0.0}, plane))
			.toBe(Side.OUT);
	});
	test("circular region", () => {
		const segments = [
			{type: 'M', args: [0.5, 0.0]},
			{type: 'A', args: [0.5, 0.5, 0., 0, 0, 0.5, 1.0]},
			{type: 'A', args: [0.5, 0.5, 0., 0, 0, 0.5, 0.0]},
		];
		expect(contains(segments, {s: 0, t: 0}, plane)).toBe(Side.OUT);
	});
	describe("circular segment region", () => {
		const segments = [
			{type: 'M', args: [0., 0.]},
			{type: 'A', args: [6., 6., 0., 0, 0, 0., 1.]},
			{type: 'L', args: [0., 0.]},
		];
		describe("on the arc side", () => {
			test("in line with top edge", () => {
				expect(contains(segments, {s: -1., t: 0.}, plane)).toBe(Side.OUT);
			});
			test("in line with bottom edge", () => {
				expect(contains(segments, {s: -1., t: 1.}, plane)).toBe(Side.OUT);
			});
		});
		describe ("on the line side", () => {
			test("in line with top edge", () => {
				expect(contains(segments, {s: 1., t: 0.}, plane)).toBe(Side.OUT);

			});
			test("in line with bottom edge", () => {
				expect(contains(segments, {s: 1., t: 0.}, plane)).toBe(Side.OUT);
			});
		});
	});
	test("concave region", () => {
		const region = [
			{type: 'M', args: [-π, -1]},
			{type: 'L', args: [-2, 0]},
			{type: 'L', args: [-π, 1]},
			{type: 'Φ', args: [-π, π]},
			{type: 'Λ', args: [0, π]},
			{type: 'Φ', args: [0, -π]},
			{type: 'Λ', args: [-π, -π]},
			{type: 'Φ', args: [-π, -1]},
		];
		expect(contains(region, {s: -3, t: 0}, geoid)).toBe(Side.OUT);
	});
	describe("periodic region", () => {
		const region = [
			{type: 'M', args: [.5, π]},
			{type: 'Φ', args: [.5, -π]},
			{type: 'L', args: [.5, π]},
			{type: 'M', args: [-.5, -π]},
			{type: 'Φ', args: [-.5, π]},
			{type: 'L', args: [-.5, -π]},
		];
		test("inside", () => {
			expect(contains(region, {s: 0, t: 2}, geoid))
				.toBe(Side.IN);
		});
		test("outside", () => {
			expect(contains(region, {s: 1, t: 2}, geoid))
				.toBe(Side.OUT);
		});
		test("inside on the antimeridian", () => {
			expect(contains(region, {s: 0, t: -π}, geoid))
				.toBe(Side.IN);
		});
		test("outside on the antimeridian", () => {
			expect(contains(region, {s: 1, t: -π}, geoid))
				.toBe(Side.OUT);
		});
	});
	describe("compound region", () => {
		const region = [
			{type: 'M', args: [.5, π]},
			{type: 'Φ', args: [.5, -π]},
			{type: 'Λ', args: [.2, -π]},
			{type: 'L', args: [.1, -π/3]},
			{type: 'L', args: [.3, π/3]},
			{type: 'L', args: [.2, π]},
			{type: 'Λ', args: [.5, π]},
		];
		test("inside", () => {
			expect(contains(region, {s: .4, t: 2}, geoid))
				.toBe(Side.IN);
		});
		test("outside, north", () => {
			expect(contains(region, {s: .6, t: 2}, geoid))
				.toBe(Side.OUT);
		});
		test("outside, south", () => {
			expect(contains(region, {s: .0, t: 2}, geoid))
				.toBe(Side.OUT);
		});
		test("inside on the antimeridian", () => {
			expect(contains(region, {s: .4, t: -π}, geoid))
				.toBe(Side.BORDERLINE);
		});
		test("outside, north, on the antimeridian", () => {
			expect(contains(region, {s: .6, t: -π}, geoid))
				.toBe(Side.OUT);
		});
		test("outside, south, on the antimeridian", () => {
			expect(contains(region, {s: .0, t: -π}, geoid))
				.toBe(Side.OUT);
		});
	});
	describe("region straddles domain y-boundary", () => {
		describe("rightside-in region", () => {
			const region = [
				{type: 'M', args: [0.3, 2]},
				{type: 'L', args: [0.1, 2]},
				{type: 'L', args: [0.2, -3]},
				{type: 'L', args: [0.3, 2]},
			];
			test("inside", () => {
				expect(contains(region, {s: 0.2, t: 3}, geoid))
					.toBe(Side.IN);
			});
			test("outside, between", () => {
				expect(contains(region, {s: 0.2, t: 0}, geoid))
					.toBe(Side.OUT);
			});
			test("outside, beside", () => {
				expect(contains(region, {s: 0, t: 0}, geoid))
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
				expect(contains(region, {s: 0.2, t: 0}, geoid))
					.toBe(Side.IN);
			});
			test("outside", () => {
				expect(contains(region, {s: 0.2, t: 3}, geoid))
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
				{type: 'L', args: [0, π]},
			];
			test("inside", () => {
				expect(contains(region, {s: -1, t: 0}, geoid))
					.toBe(Side.IN);
			});
			test("outside", () => {
				expect(contains(region, {s: 3, t: 0}, geoid))
					.toBe(Side.OUT);
			});
		});
	});
	describe("region straddles domain x-boundary", () => {
		const region = [
			{type: 'M', args: [-2, 0.3]},
			{type: 'L', args: [-2, 0.1]},
			{type: 'L', args: [2, 0.1]},
			{type: 'L', args: [2, 0.3]},
			{type: 'L', args: [-2, 0.3]},
		];
		test("inside", () => {
			expect(contains(region, {s: -3, t: 0.2}, geoid))
				.toBe(Side.IN);
		});
		test("outside, between", () => {
			expect(contains(region, {s: 0, t: 0.2}, geoid))
				.toBe(Side.OUT);
		});
		test("outside, beside", () => {
			expect(contains(region, {s: 0, t: 0}, geoid))
				.toBe(Side.OUT);
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
			expect(contains(region, {s: -3, t: -1}, geoid))
				.toBe(Side.IN);
		});
		test("borderline", () => {
			expect(contains(region, {s: -π, t: -1}, geoid))
				.toBe(Side.BORDERLINE);
		});
	});
	describe("periodic region is domain boundary", () => {
		const region = [
			{type: 'M', args: [π, π]},
			{type: 'Φ', args: [π, -π]},
			{type: 'L', args: [π, π]},
			{type: 'M', args: [-π, -π]},
			{type: 'Φ', args: [-π, π]},
			{type: 'L', args: [-π, -π]},
		];
		test("inside", () => {
			expect(contains(region, {s: 0, t: 2}, geoid))
				.toBe(Side.IN);
		});
		test("on the antiequator", () => {
			expect(contains(region, {s: -π, t: 2}, geoid))
				.toBe(Side.BORDERLINE);
		});
		test("on the antimeridian", () => {
			expect(contains(region, {s: 0, t: -π}, geoid))
				.toBe(Side.IN);
		});
	});
	test("null region", () => {
		const region: PathSegment[] = [];
		expect(contains(region, {s: 9000, t: 9001}, plane)).toBe(Side.IN);
	});
	test("degenerate region (just a point)", () => {
		const region: PathSegment[] = [
			{type: 'M', args: [0, 0]},
		];
		expect(() => contains(region, {s: 9000, t: 9001}, plane)).toThrow();
	});
	test("degenerate region (one segment)", () => {
		const region: PathSegment[] = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [0, 0]},
		];
		expect(() => contains(region, {s: 9000, t: 9001}, plane)).toThrow();
	});
	test("degenerate region (two segments)", () => {
		const region: PathSegment[] = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [1, 1]},
			{type: 'L', args: [0, 0]},
		];
		expect(() => contains(region, {s: 9000, t: 9001}, plane)).toThrow();
	});
	describe("self-intersecting region", () => {
		const region: PathSegment[] = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [1, 0]},
			{type: 'L', args: [1, 5]},
			{type: 'L', args: [2, 5]},
			{type: 'L', args: [3, 4]},
			{type: 'L', args: [2, 4]},
			{type: 'L', args: [3, 5]},
			{type: 'L', args: [4, 4]},
			{type: 'L', args: [0, 0]},
		];
		describe("positive fill-rule", () => {
			test("0 wraps", () => {
				expect(contains(region, {s: 0, t: 0.5}, INFINITE_PLANE, Rule.POSITIVE)).toBe(Side.OUT);
			});
			test("+1 wrap", () => {
				expect(contains(region, {s: 2, t: 3}, INFINITE_PLANE, Rule.POSITIVE)).toBe(Side.IN);
			});
			test("-1 wrap", () => {
				expect(contains(region, {s: 0.9, t: 0.1}, INFINITE_PLANE, Rule.POSITIVE)).toBe(Side.OUT);
			});
			test("+2 wraps", () => {
				expect(contains(region, {s: 2.5, t: 4.1}, INFINITE_PLANE, Rule.POSITIVE)).toBe(Side.IN);
			});
		});
		describe("even-odd file rule", () => {
			test("0 wraps", () => {
				expect(contains(region, {s: 0, t: 0.5}, INFINITE_PLANE, Rule.ODD)).toBe(Side.OUT);
			});
			test("+1 wrap", () => {
				expect(contains(region, {s: 2, t: 3}, INFINITE_PLANE, Rule.ODD)).toBe(Side.IN);
			});
			test("-1 wrap", () => {
				expect(contains(region, {s: 0.9, t: 0.1}, INFINITE_PLANE, Rule.ODD)).toBe(Side.IN);
			});
			test("+2 wraps", () => {
				expect(contains(region, {s: 2.5, t: 4.1}, INFINITE_PLANE, Rule.ODD)).toBe(Side.OUT);
			});
		});
	});
	test("point slightly above a small arc", () => {
		const region = [
			{type: 'M', args: [-368.67239788855727,-578.0988182358551]},
			{type: 'A', args: [3826.6684255896325,3826.6684255896325,0,0,1,-414.2758161882544,-582.7888094995683]},
			{type: 'L', args: [-421.67283704881993,-531.3248962207613]},
			{type: 'L', args: [-368.67239788855727,-578.0988182358551]},
		];
		expect(contains(region, {s: -476.5620387373164, t: -582.7888094995687}, INFINITE_PLANE)).toBe(Side.OUT);
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
				expect(encompasses(region, points, plane)).toBe(Side.IN);
			});
			test("outside", () => {
				const points = [
					{type: 'M', args: [1.1, 1.1]},
					{type: 'L', args: [1.1, 1.9]},
					{type: 'L', args: [1.9, 1.5]},
				];
				expect(encompasses(region, points, plane)).toBe(Side.OUT);
			});
			test("around", () => {
				const points = [
					{type: 'M', args: [-2, -2]},
					{type: 'L', args: [-2, 3]},
					{type: 'L', args: [3, 0.5]},
				];
				expect(encompasses(region, points, plane)).toBe(Side.OUT);
			});
		});
		describe("partially coincident", () => {
			test("inside", () => {
				const points = [
					{type: 'M', args: [0.0, 0.1]},
					{type: 'L', args: [0.0, 0.9]},
					{type: 'L', args: [0.9, 0.5]},
				];
				expect(encompasses(region, points, plane)).toBe(Side.IN);
			});
			test("outside", () => {
				const points = [
					{type: 'M', args: [0.0, 0.1]},
					{type: 'L', args: [0.0, 0.9]},
					{type: 'L', args: [-0.9, 0.5]},
				];
				expect(encompasses(region, points, plane)).toBe(Side.OUT);
			});
		});
		test("fully coincident", () => {
			expect(encompasses(region, region, plane)).toBe(Side.BORDERLINE);
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
				expect(encompasses(region, points, plane)).toBe(Side.OUT);
			});
			test("outside", () => {
				const points = [
					{type: 'M', args: [1.1, 1.1]},
					{type: 'L', args: [1.1, 1.9]},
					{type: 'L', args: [1.9, 1.5]},
				];
				expect(encompasses(region, points, plane)).toBe(Side.IN);
			});
		});
		describe("partially coincident", () => {
			test("inside", () => {
				const points = [
					{type: 'M', args: [0.0, 0.1]},
					{type: 'L', args: [0.0, 0.9]},
					{type: 'L', args: [0.9, 0.5]},
				];
				expect(encompasses(region, points, plane)).toBe(Side.OUT);
			});
			test("outside", () => {
				const points = [
					{type: 'M', args: [0.0, 0.1]},
					{type: 'L', args: [0.0, 0.9]},
					{type: 'L', args: [-0.9, 0.5]},
				];
				expect(encompasses(region, points, plane)).toBe(Side.IN);
			});
		});
		test("fully coincident", () => {
			expect(encompasses(region, region, plane)).toBe(Side.BORDERLINE);
		});
	});
	describe("concave regions", () => {
		test("arcs", () => {
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
			expect(encompasses(region, arc, plane)).toBe(Side.IN);
		});
		test("*almost* fully coincident", () => {
			const edges = [
				{type: 'M', args: [.3, .1]},
				{type: 'L', args: [.9, .1]},
				{type: 'L', args: [.9, .9]},
				{type: 'L', args: [.1, .9]},
				{type: 'L', args: [.1, .1]},
				{type: 'L', args: [.2, .1]},
				{type: 'L', args: [.2, 0.]},
				{type: 'L', args: [0., 0.]},
				{type: 'L', args: [0., 1.]},
				{type: 'L', args: [1., 1.]},
				{type: 'L', args: [1., 0.]},
				{type: 'L', args: [.3, 0.]},
				{type: 'L', args: [.3, .1]},
			];
			const points = [
				{type: 'M', args: [0., 0.]},
				{type: 'L', args: [0., 1.]},
				{type: 'L', args: [1., 1.]},
				{type: 'L', args: [1., 0.]},
				{type: 'L', args: [0., 0.]},
			];
			// XXX technically this result is incorrect, but it would be hard to fix, and I think I can handle this shortcoming well enuff
			expect(encompasses(
				edges, points, geoid,
			)).toBe(Side.BORDERLINE);
		});
	});
});

describe("intersection", () => {
	const edges = [
		{type: 'M', args: [0, 0]},
		{type: 'L', args: [0, 1]},
		{type: 'L', args: [1, 1]},
		{type: 'L', args: [1, 0]},
		{type: 'L', args: [0, 0]},
	];
	test("open region", () => {
		expect(() => intersection(
			[{type: 'M', args: [0, 0]}, {type: 'L', args: [1, 0]}],
			edges, INFINITE_PLANE,
			true,
		)).toThrow(); // open regions are not allowed if closePath is true
	});
	test("open edges", () => {
		expect(() => intersection(
			edges,
			[{type: 'M', args: [0, 0]}, {type: 'L', args: [1, 0]}],
			INFINITE_PLANE,
			false,
		)).toThrow(); // open edges are never allowed
	});
	test("zero islands", () => {
		expect(intersection(
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
		expect(intersection(
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
		expect(intersection(
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
		expect(intersection(
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
		expect(intersection(
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
		expect(intersection(
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
		expect(intersection(
			segments, toroidalEdges, geoid,true,
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
		expect(intersection(segments, toroidalEdges, geoid, false)).toEqual([
			{type: 'M', args: [1, 3]},
			{type: 'L', args: [1.5, π]},
			{type: 'M', args: [1.5, -π]},
			{type: 'L', args: [2, -3]},
		]);
	});
	test("fully coincident", () => {
		expect(intersection(
			edges, edges, INFINITE_PLANE, true,
		)).toEqual(edges); // if the region is the same as the edges, that's what should be returned
	});
	test("*almost* fully coincident", () => {
		const segments = [
			{type: 'M', args: [.3, .1]},
			{type: 'L', args: [.9, .1]},
			{type: 'L', args: [.9, .9]},
			{type: 'L', args: [.1, .9]},
			{type: 'L', args: [.1, .1]},
			{type: 'L', args: [.2, .1]},
			{type: 'L', args: [.2, 0.]},
			{type: 'L', args: [0., 0.]},
			{type: 'L', args: [0., 1.]},
			{type: 'L', args: [1., 1.]},
			{type: 'L', args: [1., 0.]},
			{type: 'L', args: [.3, 0.]},
			{type: 'L', args: [.3, .1]},
		];
		expect(intersection(
			segments, edges, INFINITE_PLANE, true,
		)).toEqual(segments);
	});
	test("one segment with two crossings", () => {
		const segments = [
			{type: 'M', args: [1.5, 1.5]},
			{type: 'L', args: [1.5, 0.0]},
			{type: 'L', args: [0.0, 1.5]},
			{type: 'L', args: [1.5, 1.5]},
		];
		expect(intersection(
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
		expect(intersection(
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
		expect(intersection(
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
		expect(intersection(
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
		expect(intersection(
			segments, edges, INFINITE_PLANE, true,
		)).toEqual([ // make sure it doesn't duplicate any vertices
			{type: 'M', args: [1.0, 0.0]},
			{type: 'L', args: [0.0, 1.0]},
			{type: 'L', args: [1.0, 1.0]},
			{type: 'L', args: [1.0, 0.0]},
		]);
	});
	test("wraps around a pole line", () => {
		const edges = [
			{type: 'M', args: [-π/2, -π]},
			{type: 'Φ', args: [-π/2, π]},
			{type: 'L', args: [-π/2, -π]},
			{type: 'M', args: [π/2, π]},
			{type: 'Φ', args: [π/2, -π]},
			{type: 'L', args: [π/2, π]},
		];
		const segments = [
			{type: 'M', args: [1.5, -0.5]},
			{type: 'L', args: [-0.5, 1.5]},
			{type: 'L', args: [1.5, -2.5]},
			{type: 'L', args: [1.5, -0.5]},
		];
		expect(intersection(
			segments, edges, geoid, true,
		)).toEqual(segments.concat(edges.slice(3, 6)));
	});
});

describe("applyProjectionToPath", () => {
	const surface = new LockedDisc(2);
	surface.initialize();
	const projection = MapProjection.orthographic(surface, surface.φMin, surface.φMax, 0);
	test("points", () => {
		const path = [
			{type: 'M', args: [-π/4, -π/2]},
			{type: 'M', args: [-π/4, π/2]},
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
			{type: 'M', args: [-π/2, 0]},
			{type: 'L', args: [-π/4, π/2]},
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
			{type: 'M', args: [-π/4, -π/2]},
			{type: 'L', args: [-π/4, π/2]},
		];
		expect(applyProjectionToPath(projection, path, 1.1)).toEqual([
			{type: 'M', args: [
				expect.closeTo(-1),
				expect.closeTo(0),
			]},
			{type: 'L', args: [
				expect.closeTo(-Math.sqrt(2)/2),
				expect.closeTo(-Math.sqrt(2)/2),
			]},
			{type: 'L', args: [
				expect.closeTo(0),
				expect.closeTo(-1),
			]},
			{type: 'L', args: [
				expect.closeTo(Math.sqrt(2)/2),
				expect.closeTo(-Math.sqrt(2)/2),
			]},
			{type: 'L', args: [
				expect.closeTo(1),
				expect.closeTo(0),
			]},
		]);
	});
	test("parallel", () => {
		const path = [
			{type: 'M', args: [-π/4, -π/2]},
			{type: 'Φ', args: [-π/4, π/2]},
		];
		expect(applyProjectionToPath(projection, path, 1.1)).toEqual([
			{type: 'M', args: [
				expect.closeTo(-1),
				expect.closeTo(0),
			]},
			{type: 'A', args: [
				expect.closeTo(1), expect.closeTo(1),
				0, expect.anything(), 1,
				expect.closeTo(1), expect.closeTo(0),
			]},
		]);
	});
	test("points that are actually coincident", () => {
		const path = [
			{type: 'M', args: [-π/2, -π]},
			{type: 'Φ', args: [-π/2, π]},
			{type: 'L', args: [-π/2, -π]},
		];
		expect(applyProjectionToPath(projection, path, 1.1)).toEqual([
			{type: 'M', args: [0, 0]},
		]);
	});

});


describe("polygonize", () => {
	test("empty", () => {
		expect(polygonize([], 6)).toEqual([]);
	});
	test("arc", () => {
		const path = [
			{type: 'M', args: [1, 0]},
			{type: 'A', args: [1, 1, 0, 0, 1, -1, 0]},
		];
		const expectation = [];
		for (let i = 0; i <= 19; i ++)
			expectation.push({
				type: (i === 0) ? 'M' : 'L',
				args: [
					expect.closeTo(Math.cos(i/19*Math.PI)),
					expect.closeTo(Math.sin(i/19*Math.PI)),
				],
			});
		expect(polygonize(path, 6)).toEqual(expectation);
	});
});

describe("decimate", () => {
	test("zig zag", () => {
		expect(decimate([
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [1, 1]},
			{type: 'L', args: [2, 0]},
			{type: 'L', args: [3, 0.01]},
			{type: 'L', args: [4, -0.01]},
			{type: 'L', args: [5, 0]},
		], 0.1)).toEqual([
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [1, 1]},
			{type: 'L', args: [2, 0]},
			{type: 'L', args: [5, 0]},
		]);
	});
	test("two curves", () => {
		expect(decimate([
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [1, 0]},
			{type: 'L', args: [2, 0]},
			{type: 'M', args: [3, 0]},
			{type: 'L', args: [4, 0]},
			{type: 'L', args: [5, 0]},
		], 0.1)).toEqual([
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [2, 0]},
			{type: 'M', args: [3, 0]},
			{type: 'L', args: [5, 0]},
		]);
	});
	test("arc", () => {
		expect(decimate([
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [1, 0]},
			{type: 'L', args: [2, 0]},
			{type: 'A', args: [100, 100, 0, 0, 0, 3, 0]},
			{type: 'L', args: [4, 0]},
			{type: 'L', args: [5, 0]},
		], 0.1)).toEqual([
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [2, 0]},
			{type: 'A', args: [100, 100, 0, 0, 0, 3, 0]},
			{type: 'L', args: [5, 0]},
		]);
	});
});
