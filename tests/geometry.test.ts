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
import {checkVoronoiPolygon, signCrossing, trajectoryIntersection} from "../source/utilities/geometry.js";

describe("signCrossing()", () => {
    test("positive", () => {
        expect(signCrossing({x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 2, y: 2})).toBeGreaterThan(0);
    });
    test("negative", () => {
        expect(signCrossing({x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 2, y: -2})).toBeLessThan(0);
    });
    test("parallel", () => {
        expect(signCrossing({x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 4, y: 2})).toBeCloseTo(0);
    });
    test("antiparallel", () => {
        expect(signCrossing({x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 0, y: -2})).toBeCloseTo(0);
    });
    test("stationary", () => {
        expect(signCrossing({x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 2, y: 0})).toBeCloseTo(0);
    });
});

describe("trajectoryIntersection()", () => {
    test("normal", () => {
        expect(trajectoryIntersection(
            {x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 0, y: -2})).toEqual(
            {x: expect.closeTo(2), y: expect.closeTo(2), ta: expect.closeTo(2), tb: expect.closeTo(-1)});
    });
    test("parallel", () => {
        expect(() => trajectoryIntersection(
            {x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: -2, y: -2})).toThrow();
    });
    test("stationary", () => {
        expect(() => trajectoryIntersection(
            {x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 0, y: 0})).toThrow();
    });
});

describe("checkVoronoiPolygon()", () => {
    test("fine", () => {
        const originalPolygon = [{x: 1, y: 0}, {x: 0, y: 2}, {x: -3, y: -4}];
        expect(checkVoronoiPolygon(originalPolygon)).toEqual(originalPolygon);
    });
    test("incomplete", () => {
        const originalPolygon = [{x: 1, y: 0}, {x: 3, y: 4}, {x: 0, y: 2}];
        expect(checkVoronoiPolygon(originalPolygon)).toEqual(originalPolygon);
    });
    test("backwards", () => {
        const originalPolygon = [{x: 1, y: 0}, {x: -3, y: -4}, {x: 0, y: 2}];
        expect(checkVoronoiPolygon(originalPolygon)).toEqual([originalPolygon[1], originalPolygon[0], originalPolygon[2]]);
    });
    test.only("real life", () => {
        const originalPolygon = [
            {x: 13.8, y: -111.3},
            {x: 173.2, y: -91.1},
            {x: 180.10, y: -23.48},
            {x: -97.201, y: 186.889},
            {x: -97.168, y: 186.779},
            {x: -135.0, y: 162.4},
            {x: 0.4, y: -99.5},
        ];
        expect(checkVoronoiPolygon(originalPolygon)).toEqual(originalPolygon);
    });
});
