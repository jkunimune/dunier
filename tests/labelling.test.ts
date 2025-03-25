/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {chooseLabelLocation, findOpenSpotOnArc, resamplePath} from "../source/map/labeling.js";
import {endpoint} from "../source/utilities/coordinates.js";

describe("chooseLabelLocation", () => {
	const shape = [
		{type: 'M', args: [0.55, 0.953]},
		{type: 'A', args: [1.1, 1.1, 0, 0, 1, -0.55, 0.953]},
		{type: 'L', args: [-0.45, 0.866]},
		{type: 'A', args: [0.9, 0.9, 0, 0, 0, 0.45, 0.779]},
		{type: 'L', args: [0.55, 0.953]},
	];
	test("width-limited", () => {
		expect(chooseLabelLocation(shape, 10, 0.1)).toEqual({
			start: {x: -0.5, y: 0.866},
			arc: {type: 'A', args: [1.0, 1.0, 0, 0, 0, 0.50, 0.866]},
			height: Math.PI/30,
		});
	});
	test("height-limited", () => {
		expect(chooseLabelLocation(shape, 1, 0.1)).toEqual({
			start: {x: Math.sin(-0.1), y: Math.cos(-0.1)},
			arc: {type: 'A', args: [1.0, 1.0, 0, 0, 0, Math.sin(0.1), Math.cos(0.1)]},
			height: 0.2,
		});
	});
	test("too small", () => {
		expect(chooseLabelLocation(shape, 1.1*Math.PI/3, 0.3)).toThrow();
	});
});


describe("resamplePath", () => {
	test("square", () => {
		const shape = [
			{type: 'M', args: [0, 0]},
			{type: 'L', args: [0, 1]},
			{type: 'L', args: [1, 1]},
			{type: 'L', args: [1, 0]},
			{type: 'L', args: [0, 0]},
		];
		// to hit 36 segments exactly, it should break each segment up into 9
		const resampledShape = resamplePath(shape);
		expect(resampledShape.length).toEqual(37);
		for (let i = 0; i < 9; i ++)
			expect(endpoint(resampledShape[i])).toEqual({s: 0, t: i/9});
		for (let i = 9; i < 18; i ++)
			expect(endpoint(resampledShape[i])).toEqual({s: (i - 9)/9, t: 1});
		for (let i = 18; i < 27; i ++)
			expect(endpoint(resampledShape[i])).toEqual({s: 1, t: 1 - (i - 18)/9});
		for (let i = 27; i <= 36; i ++)
			expect(endpoint(resampledShape[i])).toEqual({s: 1 - (i - 27)/9, t: 0});
	});
	test("semicircle", () => {
		const shape = [
			{type: 'M', args: [0, 1]},
			{type: 'A', args: [1, 1, 0, 0, 0, 0, -1]},
			{type: 'L', args: [0, 1]},
		];
		// it will break the arc into 19 parts
		const resampledShape = resamplePath(shape);
		// to get above 36, it should bisect each arc piece and split the line in 15
		expect(resampledShape.length).toEqual(54);
		for (let i = 0; i < 38; i ++) {
			expect(endpoint(resampledShape[i])).toEqual({
				s: expect.closeTo(Math.sin(Math.PI*i/38)),
				t: expect.closeTo(Math.cos(Math.PI*i/38)),
			});
		}
		for (let i = 38; i <= 53; i ++)
			expect(endpoint(resampledShape[i])).toEqual({
				s: expect.closeTo(0), t: expect.closeTo(-1 + (i - 38)/15*2)});
	});
	test("myriagon", () => {
		const shape = [];
		for (let i = 0; i <= 144; i ++)
			shape.push({type: (i === 0) ? 'M' : 'L', args: [Math.sin(Math.PI*i/72), Math.cos(Math.PI*i/72)]});
		// it should simply remove half the vertices (ideally every other, but this algorithm isn't that smart)
		const resampledShape = resamplePath(shape);
		expect(resampledShape.length).toEqual(73);
	});
});


describe("findOpenSpotOnArc", () => {
	test("optimal segment on the origin", () => {
		const wedges = [
			{xL: -3, xR: -3, y: 0},
			{xL: -2, xR: 4, y: 2},
			{xL: 2, xR: 3, y: 1},
		];
		expect(findOpenSpotOnArc(-3, 3, wedges)).toEqual({
			location: 0, halfWidth: 2,
		});
	});
	test("optimal segment away from the origin", () => {
		const wedges = [
			{xL: 0, xR: 0, y: 0},
			{xL: 1, xR: 7, y: 2},
			{xL: 5, xR: 6, y: 1},
		];
		expect(findOpenSpotOnArc(0, 6, wedges)).toEqual({
			location: 2, halfWidth: 2,
		});
	});
	test("optimal point", () => {
		const wedges = [
			{xL: 0, xR: 0, y: 0},
			{xL: 5, xR: 6, y: 1},
		];
		expect(findOpenSpotOnArc(0, 6, wedges)).toEqual({
			location: 3, halfWidth: 3,
		});
	});
	test("two local optima", () => {
		const wedges = [
			{xL: -3, xR: -3, y: 0},
			{xL: 0, xR: 1, y: 1},
			{xL: 2, xR: 3, y: 1},
		];
		expect(findOpenSpotOnArc(-3, 3, wedges)).toEqual({
			location: -1, halfWidth: 2,
		});
	});
});
