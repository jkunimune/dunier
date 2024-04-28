/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {
	arctanh,
	argmax,
	binarySearch, decodeBase37, filterSet, isBetween,
	legendreP2,
	legendreP4,
	legendreP6,
	linterp,
	localizeInRange, longestShortestPath, Matrix,
	tanh, union
} from "../source/utilities/miscellaneus.js";

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
	test("below minimum", () => {
		expect(linterp(-1, [0, 1, 2], [8, 5, 6])).toEqual(8);
	});
	test("above maximum", () => {
		expect(linterp(3, [0, 1, 2], [8, 5, 6])).toEqual(6);
	});
});

describe("localizeInRange()", () => {
	test("infinite", () => {
		expect(localizeInRange(1, -Infinity, Infinity)).toEqual(1);
	});
	test("on minimum", () => {
		expect(localizeInRange(1, 1, 4)).toEqual(1);
	});
	test("on maximum", () => {
		expect(localizeInRange(1, -12, 1)).toEqual(-12);
	});
	test("out of bounds", () => {
		expect(localizeInRange(1, -12, -10)).toEqual(-11);
	});
});

describe("isBetween()", () => {
	test("in", () => {
		expect(isBetween(1, 0, 1)).toEqual(true);
	});
	test("out", () => {
		expect(isBetween(2, 0, 1)).toEqual(false);
	});
	test("in, reversed", () => {
		expect(isBetween(1, 1, 0)).toEqual(true);
	});
	test("out, reversed", () => {
		expect(isBetween(2, 1, 0)).toEqual(false);
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
