/**
 * MIT License
 *
 * Copyright (c) 2021 Justin Kunimune
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import {straightSkeleton} from "../src/util/straightskeleton.js";

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
