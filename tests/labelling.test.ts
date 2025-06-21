/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {chooseLabelLocation, findOpenSpotOnArc, resamplePath} from "../source/mapping/labeling.js";
import {endpoint} from "../source/utilities/coordinates.js";


describe("chooseLabelLocation", () => {
	const shape = [
		{type: 'M', args: [0, 0]},
		{type: 'L', args: [0, 1]},
		{type: 'L', args: [10, 1]},
		{type: 'L', args: [10, 0]},
		{type: 'L', args: [0, 0]},
	];
	test("normal", () => {
		expect(() => chooseLabelLocation(shape, 10)).not.toThrow();
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
		// to hit 72 segments exactly, it should break each segment up into 18
		const resampledShape = resamplePath(shape);
		expect(resampledShape.length).toEqual(73);
		for (let i = 0; i < 18; i ++)
			expect(endpoint(resampledShape[i])).toEqual({s: 0, t: i/18});
		for (let i = 18; i < 36; i ++)
			expect(endpoint(resampledShape[i])).toEqual({s: (i - 18)/18, t: 1});
		for (let i = 36; i < 54; i ++)
			expect(endpoint(resampledShape[i])).toEqual({s: 1, t: 1 - (i - 36)/18});
		for (let i = 54; i <= 72; i ++)
			expect(endpoint(resampledShape[i])).toEqual({s: 1 - (i - 54)/18, t: 0});
	});
	test("semicircle", () => {
		const shape = [
			{type: 'M', args: [0, 1]},
			{type: 'A', args: [1, 1, 0, 0, 0, 0, -1]},
			{type: 'L', args: [0, 1]},
		];
		// it will break the arc into 19 parts
		const resampledShape = resamplePath(shape);
		// each arc part will be split in two, and the line in 28, for a total of 66
		expect(resampledShape.length).toEqual(67);
		for (let i = 0; i < 38; i ++) {
			expect(endpoint(resampledShape[i])).toEqual({
				s: expect.closeTo(Math.sin(Math.PI*i/38)),
				t: expect.closeTo(Math.cos(Math.PI*i/38)),
			});
		}
		for (let i = 38; i <= 66; i ++)
			expect(endpoint(resampledShape[i])).toEqual({
				s: expect.closeTo(0), t: expect.closeTo(-1 + (i - 38)/28*2)});
	});
	test("myriagon", () => {
		const shape = [];
		for (let i = 0; i <= 180; i ++)
			shape.push({type: (i === 0) ? 'M' : 'L', args: [Math.sin(Math.PI*i/90), Math.cos(Math.PI*i/90)]});
		// it should simply remove every other vertex
		const resampledShape = resamplePath(shape);
		expect(resampledShape.length).toEqual(91);
		for (let i = 0; i <= 90; i ++)
			expect(endpoint(resampledShape[i])).toEqual({
				s: expect.closeTo(Math.sin(Math.PI*i/45)),
				t: expect.closeTo(Math.cos(Math.PI*i/45)),
			});
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
