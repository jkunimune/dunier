/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {straightSkeleton} from "../source/utilities/straightskeleton.js";

test("empty", () => {
	expect(() => straightSkeleton([])).toThrow();
});
const triangle = [{x: 0, y: 0}, {x: 1/2, y: 0}, {x: 0, y: Math.sqrt(3)/2}];
test("triangle", () => {
	expect(straightSkeleton(triangle)).toEqual(
		expect.objectContaining({
			value: expect.objectContaining({x: 0, y: 0}),
			parent: expect.objectContaining({
				value: expect.objectContaining({
					x: expect.closeTo((Math.sqrt(3) - 1)/4),
					y: expect.closeTo((Math.sqrt(3) - 1)/4)
				}),
			}),
		}),
	);
});
test("reversed", () => {
	expect(() => straightSkeleton(triangle.slice().reverse())).toThrow();
});
const rectangle = [{x: -2, y: -1}, {x: 2, y: -1}, {x: 2, y: 1}, {x: -2, y: 1}];
test("rectangle", () => {
	expect(straightSkeleton(rectangle)).toEqual(
		expect.objectContaining({
			value: expect.objectContaining({x: -2, y: -1}),
			parent: expect.objectContaining({
				value: expect.objectContaining({x: -1, y: 0}),
				parent: expect.objectContaining({
					value: expect.objectContaining({x: 1, y: 0}),
				}),
			}),
		}),
	);
});
const square = [{x: -1, y: -1}, {x: 1, y: -1}, {x: 1, y: 1}, {x: -1, y: 1}];
test("square", () => {
	expect(straightSkeleton(square)).toEqual(
		expect.objectContaining({
			value: expect.objectContaining({x: -1, y: -1}),
			parent: expect.objectContaining({
				value: expect.objectContaining({x: 0, y: 0}),
			}),
		}),
	);
});
const trapezoid = [{x: -1, y: -1/2}, {x: -1, y: -1}, {x: 1, y: -1}, {x: 1 + 2/Math.sqrt(3), y: 1}, {x: -1, y: 1}];
test("trapezoid", () => {
	expect(straightSkeleton(trapezoid)).toEqual(
		expect.objectContaining({
			value: expect.objectContaining({x: -1, y: -1/2}),
			parent: expect.objectContaining({
				value: expect.objectContaining({x: -1/2, y: -1/2}),
				parent: expect.objectContaining({
					value: expect.objectContaining({x: 0, y: 0}),
					parent: expect.objectContaining({
						value: expect.objectContaining({x: 1 - 1/Math.sqrt(3), y: 0}),
					}),
				}),
			}),
		}),
	);
});
