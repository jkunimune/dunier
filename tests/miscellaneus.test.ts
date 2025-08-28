/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {
	arctanh,
	argmax,
	binarySearch, cumulativeIntegral, decodeBase37, filterSet, findRoot, isBetween,
	legendreP2,
	legendreP4,
	legendreP6,
	linterp,
	localizeInRange, longestShortestPath, Matrix, pathToString,
	tanh, union, weightedAverage
} from "../source/utilities/miscellaneus.js";
import {poissonDiscSample, rasterInclusion} from "../source/utilities/poissondisc.js";
import {Random} from "../source/utilities/random.js";
import {offset} from "../source/utilities/offset.js";
import {Rule, Side} from "../source/mapping/pathutilities.js";

describe("argmax()", () => {
	test("empty", () => {
		expect(() => argmax([])).toThrow();
	});
	test("singleton", () => {
		expect(argmax([-Infinity])).toEqual(0);
	});
	test("generic", () => {
		expect(argmax([-1, 3, 2])).toEqual(1);
	});
	test("duplicates", () => {
		expect(argmax([-1, 2, 2])).toEqual(1);
	});
});

describe("legendreP2()", () => {
	test("0", () => {
		expect(legendreP2(0)).toBeCloseTo(-1/2.);
	});
	test("1", () => {
		expect(legendreP2(1)).toBeCloseTo(1.);
	});
});

describe("legendreP4()", () => {
	test("0", () => {
		expect(legendreP4(0)).toBeCloseTo(3/8.);
	});
	test("1", () => {
		expect(legendreP4(1)).toBeCloseTo(1.);
	});
});

describe("legendreP6()", () => {
	test("0", () => {
		expect(legendreP6(0)).toBeCloseTo(-5/16.);
	});
	test("1", () => {
		expect(legendreP6(1)).toBeCloseTo(1.);
	});
});

describe("tanh()", () => {
	test("small", () => {
		expect(tanh(-137)).toBeCloseTo(-1);
	});
	test("0", () => {
		expect(tanh(0)).toBeCloseTo(0);
	});
	test("1", () => {
		expect(tanh(1)).toBeCloseTo(0.761594);
	});
	test("big", () => {
		expect(tanh(137)).toBeCloseTo(1);
	});
});

describe("arctanh()", () => {
	test("0", () => {
		expect(arctanh(0)).toBeCloseTo(0);
	});
	test("0.761594", () => {
		expect(arctanh(0.761594)).toBeCloseTo(1);
	});
	test("out of bounds", () => {
		expect(arctanh(2)).toBeNaN();
	});
});

describe("binarySearch()", () => {
	test("empty", () => {
		expect(() => binarySearch([], x => x >= 0)).toThrow();
	});
	test("less than all", () => {
		expect(binarySearch([0, 1, 2], x => x >= -1)).toEqual(0);
	});
	test("equal to one", () => {
		expect(binarySearch([0, 1, 2], x => x >= 1)).toEqual(1);
	});
	test("in the middle", () => {
		expect(binarySearch([0, 1, 2], x => x >= 1.5)).toEqual(2);
	});
	test("greater than all", () => {
		expect(binarySearch([0, 1, 2], x => x >= 3)).toEqual(3);
	});
});

describe("findRoot()", () => {
	test("simple function", () => {
		expect(findRoot(
			(x) => {
				return {value: x**2 - 1, slope: 2*x};
			},
			2, 0, 3,
			1e-6,
		)).toBeCloseTo(1, 5);
	});
});

describe("linterp()", () => {
	test("empty", () => {
		expect(() => linterp(0, [], [])).toThrow();
	});
	test("mismatched lengths", () => {
		expect(() => linterp(0, [0, 1], [0, 1, 2])).toThrow();
	});
	test("generic", () => {
		expect(linterp(1.5, [0, 1, 2], [8, 5, 6])).toBeCloseTo(5.5);
	});
	test("minimum", () => {
		expect(linterp(0, [0, 1, 2], [8, 5, 6])).toEqual(8);
	});
	test("maximum", () => {
		expect(linterp(2, [0, 1, 2], [8, 5, 6])).toEqual(6);
	});
	test("below minimum", () => {
		expect(linterp(-1, [0, 1, 2], [8, 5, 6])).toEqual(8);
	});
	test("above maximum", () => {
		expect(linterp(3, [0, 1, 2], [8, 5, 6])).toEqual(6);
	});
});

describe("localizeInRange()", () => {
	test("on minimum", () => {
		expect(localizeInRange(1, 1, 4)).toEqual(1);
	});
	test("on maximum", () => {
		expect(localizeInRange(1, -12, 1)).toEqual(-12);
	});
	test("out of bounds", () => {
		expect(localizeInRange(1, -12, -10)).toEqual(-11);
	});
	test("roundoff resistance", () => {
		const x = -2/7; // an arbitrary number
		expect(localizeInRange(x, x + 2*Math.PI, x + 4*Math.PI)).toEqual(x + 2*Math.PI);
	});
	test("more roundoff resistance", () => {
		expect(localizeInRange(4.289922754764645, -1.9932625524149412, 4.289922754764645)).toEqual(-1.9932625524149412);
	});
});

describe("isBetween()", () => {
	test("in", () => {
		expect(isBetween(0.8, 0, 1)).toEqual(true);
	});
	test("out", () => {
		expect(isBetween(2, 0, 1)).toEqual(false);
	});
	test("in, reversed", () => {
		expect(isBetween(0.8, 1, 0)).toEqual(true);
	});
	test("out, reversed", () => {
		expect(isBetween(2, 1, 0)).toEqual(false);
	});
	test("on lower bound", () => {
		expect(isBetween(0, 0, 1)).toEqual(true);
	});
	test("on upper bound", () => {
		expect(isBetween(1, 0, 1)).toEqual(true);
	});
});

describe("cumulativeIntegral()", () => {
	test("line", () => {
		function f(x: number): number {
			return x + 2;
		}
		const [x, y] = cumulativeIntegral(f, -3, 3, 1, .01, 1e-17);
		expect(x).toEqual([-3, -2, -1, 0, 1, 2, 3]);
		expect(y).toEqual([0, -0.5, 0, 1.5, 4, 7.5, 12]);
	});
	test("backwards", () => {
		function f(x: number): number {
			return x + 2;
		}
		const [x, y] = cumulativeIntegral(f, 3, -3, 1, .01, 1e-17);
		expect(x).toEqual([3, 2, 1, -0, -1, -2, -3]);
		expect(y).toEqual([-0, -4.5, -8, -10.5, -12, -12.5, -12]);
	});
	test("parabola", () => {
		function f(x: number): number {
			return 10 + x*x;
		}
		const [x, y] = cumulativeIntegral(f, 0, 2.0, 1, .01, .01);
		expect(x).toEqual([0.0, 0.5, 1.0, 1.5, 2.0]);
		for (let i = 0; i < x.length; i ++)
			expect(y[i]).toBeCloseTo(10*x[i] + x[i]*x[i]*x[i]/3, 0);
	});
	test("at min step size", () => {
		function f(x: number): number {
			return Math.exp(x/.01);
		}
		const [x, _] = cumulativeIntegral(f, 0, 1, 1, .1, 1e-6);
		expect(x).toEqual([0.000, 0.125, 0.250, 0.375, 0.500, 0.625, 0.750, 0.875, 1.000]);
	});
	test("zero width", () => {
		const [x, y] = cumulativeIntegral((_) => 10, 1, 1, 1, .01, 1e-17);
		expect(x).toEqual([1]);
		expect(y).toEqual([0]);
	});
});

describe("weightedAverage()", () => {
	test("uniform weight", () => {
		expect(
			weightedAverage((x) => x, (_) => 10, 1, 3, .1, .01, 1e-17)
		).toBeCloseTo(2);
	});
	test("step weight", () => {
		expect(
			weightedAverage((x) => x, (x) => x < 2 ? 0 : 10, 1, 3, .1, .01, 1e-17)
		).toBeCloseTo(2.5);
	});
});

describe("union()", () => {
	test("empty", () => {
		expect(union([], [])).toEqual([]);
	});
	test("without duplicates", () => {
		expect(new Set(union([4, 2, 0], [3, 1]))).toEqual(new Set([0, 1, 2, 3, 4]));
	});
	test("with duplicates", () => {
		expect(new Set(union([0, 1], [1, 2]))).toEqual(new Set([0, 1, 2]));
	});
});

describe("filterSet()", () => {
	test("generic", () => {
		expect(
			filterSet(new Set([0, 7, 3, 4]), (x) => x%2 === 0)
		).toEqual(
			new Set([0, 4])
		);
	});
});

describe("decodeBase36()", () => {
	test("empty", () => {
		expect(decodeBase37("")).toEqual(0);
	});
	test("numerals", () => {
		expect(decodeBase37("12")).toEqual(39);
	});
	test("lowercase letters", () => {
		expect(decodeBase37("ab")).toEqual(381);
	});
	test("uppercase letters", () => {
		expect(() => decodeBase37("AB")).toThrow();
	});
	test("long", () => {
		expect(() => decodeBase37("yachanchihunkichik")).not.toThrow();
	});
	test("comparison", () => {
		expect(decodeBase37("firstname13") - decodeBase37("firstname12")).toEqual(1);
	});
});

test("pathToString()", () => {
	const path = [
		{type: 'M', args: [0, 1]}, {type: 'A', args: [2, 2, 0, 1, 1, 2, 3]}, {type: 'Z', args: []}];
	expect(pathToString(path)).toEqual("M0,1 A2,2,0,1,1,2,3 Z");
});

describe("longestShortestPath()", () => {
	const graph = [
		{
			x: -Math.sqrt(3)/2., y: 0, edges: [
				null, {length: 1, clearance: 1}, {length: Math.sqrt(3)/2., clearance: 1},
				{length: 1, clearance: 1}, null,
			]
		},
		{
			x: 0, y: -1/2., edges: [
				{length: 1, clearance: 1}, null, {length: 1/2., clearance: 1},
				null, {length: 1, clearance: 1},
			]
		},
		{
			x: 0, y: 0, edges: [
				{length: Math.sqrt(3)/2, clearance: 1}, {length: 1/2., clearance: 1}, null,
				{length: 1/2., clearance: 1}, {length: Math.sqrt(3)/2., clearance: 1},
			]},
		{
			x: 0, y: 1/2., edges: [
				{length: 1, clearance: 1}, null, {length: 1/2., clearance: 1},
				null, {length: 1, clearance: 1},
			]
		},
		{
			x: Math.sqrt(3)/2., y: 0, edges: [
				null, {length: 1, clearance: 1}, {length: Math.sqrt(3)/2., clearance: 1},
				{length: 1, clearance: 1}, null,
			]
		},
	];

	test("from central endpoint", () => {
		expect(
			longestShortestPath(graph, new Set([2]))
		).toEqual({points: [4, 2], length: Math.sqrt(3)/2.});
	});
	test("from remote endpoint", () => {
		expect(
			longestShortestPath(graph, new Set([0]))
		).toEqual({points: [4, 2, 0], length: Math.sqrt(3)});
	});
	test("from multiple endpoints", () => {
		expect(
			longestShortestPath(graph, new Set([4, 3, 2]))
		).toEqual({points: [0, 2], length: Math.sqrt(3)/2});
	});
});

describe("Matrix", () => {
	const A = new Matrix([[1, -2], [3, -4]]);
	const B = new Matrix([[0, 1], [-1, 0]]);
	test("get()", () => {
		expect(A.get(1, 0)).toEqual(3);
	});
	test("trans()", () => {
		const actual = A.trans();
		const expected = new Matrix([[1, 3], [-2, -4]]);
		for (let i = 0; i < expected.m; i ++)
			for (let j = 0; j < expected.n; j ++)
				expect(actual.get(i, j)).toBeCloseTo(expected.get(i, j));
	});
	test("inverse()", () => {
		const actual = A.inverse();
		const expected = new Matrix([[-2, 1], [-3/2., 1/2.]]);
		for (let i = 0; i < expected.m; i ++)
			for (let j = 0; j < expected.n; j ++)
				expect(actual.get(i, j)).toBeCloseTo(expected.get(i, j));
	});
	test("times()", () => {
		const actual = A.times(B);
		const expected = new Matrix([[2, 1], [4, 3]]);
		for (let i = 0; i < expected.m; i ++)
			for (let j = 0; j < expected.n; j ++)
				expect(actual.get(i, j)).toBeCloseTo(expected.get(i, j));
	});
});

test("poissonDisc()", () => {
	const path = [
		{type: 'M', args: [0, 0]},
		{type: 'L', args: [0, 3]},
		{type: 'L', args: [3, 3]},
		{type: 'L', args: [3, 0]},
		{type: 'L', args: [0, 0]},
	];
	const points = poissonDiscSample(path, [], [{density: Infinity, diameter: 1.0}], new Random(0));
	expect(points.length).toBeGreaterThanOrEqual(4);
	expect(points.length).toBeLessThanOrEqual(9);
	for (let i = 0; i < points.length; i ++) {
		expect(points[i].type).toEqual(0);
		expect(points[i].x).toBeGreaterThanOrEqual(0.5);
		expect(points[i].x).toBeLessThanOrEqual(2.5);
		expect(points[i].y).toBeGreaterThanOrEqual(0.5);
		expect(points[i].y).toBeLessThanOrEqual(2.5);
		for (let j = 0; j < i; j ++)
			expect(
				Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)
			).toBeGreaterThanOrEqual(1.0);
	}
});

test("rasterInclusion", () => {
	const grid = {xMin: 0., numX: 6, Δx: 1., yMin: 0., numY: 6, Δy: 1.};
	const path = [
		{type: 'M', args: [5.25, 0.25]},
		{type: 'L', args: [0.25, 5.25]},
		{type: 'L', args: [4.75, 4.75]},
		{type: 'L', args: [5.25, 0.25]},
	];
	expect(rasterInclusion(path, grid, Rule.LEFT)).toEqual([
		[Side.OUT,        Side.OUT,        Side.OUT,        Side.OUT,        Side.BORDERLINE, Side.BORDERLINE],
		[Side.OUT,        Side.OUT,        Side.OUT,        Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE],
		[Side.OUT,        Side.OUT,        Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE],
		[Side.OUT,        Side.BORDERLINE, Side.BORDERLINE, Side.IN,         Side.BORDERLINE, Side.OUT],
		[Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE, Side.OUT],
		[Side.BORDERLINE, Side.BORDERLINE, Side.BORDERLINE, Side.OUT,        Side.OUT,        Side.OUT],
	]);
});

describe("offset()", () => {
	test("positive", () => {
		const path = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [0, 12]},
			{type: 'L', args: [1, 12]},
			{type: 'A', args: [2, 2, 0, 0, 0, 1, 8]},
			{type: 'L', args: [1, 2]},
			{type: 'A', args: [1, 1, 0, 0, 1, 2, 1]},
			{type: 'L', args: [5, 1]},
			{type: 'A', args: [4, 4, 0, 0, 1, 9, 5]},
			{type: 'L', args: [9, 8]},
			{type: 'A', args: [2, 2, 0, 0, 0, 9, 12]},
			{type: 'L', args: [10, 12]},
			{type: 'L', args: [10, 0]},
			{type: 'L', args: [0, 0]},
			{type: 'M', args: [13, 15]},
			{type: 'L', args: [13, 16]},
			{type: 'L', args: [14, 16]},
			{type: 'L', args: [14, 15]},
			{type: 'L', args: [13, 15]},
		];
		expect(offset(path, 3)).toEqual([
			{type: 'M', args: [-3, 0]},
			{type: 'L', args: [-3, 12]},
			{type: 'A', args: [3, 3, 0, 0, 0, 0, 15]},
			{type: 'L', args: [1, 15]},
			{type: 'A', args: [5, 5, 0, 0, 0, 1, 5]},
			{type: 'A', args: [3, 3, 0, 1, 0, 4, 8]},
			{type: 'L', args: [4, 2]},
			{type: 'A', args: [2, 2, 0, 1, 0, 2, 4]},
			{type: 'L', args: [5, 4]},
			{type: 'A', args: [1, 1, 0, 0, 1, 6, 5]},
			{type: 'L', args: [6, 8]},
			{type: 'A', args: [3, 3, 0, 1, 0, 9, 5]},
			{type: 'A', args: [5, 5, 0, 0, 0, 9, 15]},
			{type: 'L', args: [10, 15]},
			{type: 'A', args: [3, 3, 0, 0, 0, 13, 12]},
			{type: 'L', args: [13, 0]},
			{type: 'A', args: [3, 3, 0, 0, 0, 10, -3]},
			{type: 'L', args: [0, -3]},
			{type: 'A', args: [3, 3, 0, 0, 0, -3, 0]},
			{type: 'M', args: [10, 15]},
			{type: 'L', args: [10, 16]},
			{type: 'A', args: [3, 3, 0, 0, 0, 13, 19]},
			{type: 'L', args: [14, 19]},
			{type: 'A', args: [3, 3, 0, 0, 0, 17, 16]},
			{type: 'L', args: [17, 15]},
			{type: 'A', args: [3, 3, 0, 0, 0, 14, 12]},
			{type: 'L', args: [13, 12]},
			{type: 'A', args: [3, 3, 0, 0, 0, 10, 15]},
		]);
	});

	test("negative", () => {
		const path = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [0, 3]},
			{type: 'L', args: [3, 3]},
			{type: 'L', args: [3, 0]},
			{type: 'L', args: [0, 0]},
		];
		expect(offset(path, -1)).toEqual([
			{type: 'M', args: [1, 0]},
			{type: 'L', args: [1, 3]},
			{type: 'A', args: [1, 1, 0, 1, 1, 0, 2]},
			{type: 'L', args: [3, 2]},
			{type: 'A', args: [1, 1, 0, 1, 1, 2, 3]},
			{type: 'L', args: [2, 0]},
			{type: 'A', args: [1, 1, 0, 1, 1, 3, 1]},
			{type: 'L', args: [0, 1]},
			{type: 'A', args: [1, 1, 0, 1, 1, 1, 0]},
		]);
	});
});
