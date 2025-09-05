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
	expect(straightSkeleton(triangle.slice().reverse())).toEqual(
		expect.objectContaining({
			value: expect.objectContaining({x: 0, y: Math.sqrt(3)/2}),
			parent: expect.objectContaining({
				value: expect.objectContaining({
					x: expect.closeTo((Math.sqrt(3) - 1)/4),
					y: expect.closeTo((Math.sqrt(3) - 1)/4)
				}),
			}),
		}),
	);
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
const utah = [{x: -2, y: -1}, {x: 2, y: -1}, {x: 2, y: 1}, {x: -1.8, y: 1}, {x: -1.8, y: 0.8}, {x: -2, y: 0.8}];
test("concave", () => {
	expect(straightSkeleton(utah)).toEqual(
		expect.objectContaining({
			value: expect.objectContaining({x: expect.closeTo(-2), y: expect.closeTo(-1)}),
			parent: expect.objectContaining({
				value: expect.objectContaining({x: expect.closeTo(-1.1), y: expect.closeTo(-0.1)}),
				parent: expect.objectContaining({
					value: expect.objectContaining({x: expect.closeTo(-0.9), y: expect.closeTo(-0.1)}),
					parent: expect.objectContaining({
						value: expect.objectContaining({x: expect.closeTo(-0.8), y: expect.closeTo(0)}),
						parent: expect.objectContaining({
							value: expect.objectContaining({x: expect.closeTo(1), y: expect.closeTo(0)}),
						}),
					}),
				}),
			}),
		}),
	);
});
const spiky = [{x: -123.1397656277029, y: 57.707032738777876}, {x: 12.991144269083025, y: -201.4169278574795}, {x: 11.85127222929715, y: -186.19413041339828}, {x: 14.456793518365282, y: -196.1088095791851}, {x: 16.686895793162808, y: -183.45502258411253}, {x: 59.93873571694265, y: -98.0019270863268}, {x: 8.904811218900601, y: 44.68705717409662}];
test("split in two", () => {
	expect(() => straightSkeleton(spiky)).not.toThrow();
});
