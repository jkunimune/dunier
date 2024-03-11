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
import {Tile, Vertex} from "../src/planet/surface.js";
import {Disc} from "../src/planet/disc.js";
import {Vector} from "../src/util/geometry.js";

const surface = new Disc(2, 0);
surface.initialize();
const tiles = [
    new Tile(0, surface.фλ(new Vector(-Math.sqrt(3)/2, 0, 0)), surface),
    new Tile(1, surface.фλ(new Vector(0, -1/2, 0)), surface),
    new Tile(2, surface.фλ(new Vector(0, 0, 0)), surface),
    new Tile(3, surface.фλ(new Vector(0, 1/2, 0)), surface),
    new Tile(4, surface.фλ(new Vector(Math.sqrt(3)/2, 0, 0)), surface),
];
surface.tiles = new Set(tiles);
const vertices = [
    new Vertex(tiles[0], tiles[1], tiles[2]),
    new Vertex(tiles[0], tiles[2], tiles[3]),
    new Vertex(tiles[4], tiles[2], tiles[1]),
    new Vertex(tiles[4], tiles[3], tiles[2]),
];
surface.vertices = new Set(vertices);
surface.computeGraph();

describe("Tile", () => {
    describe("leftOf()", () => {
        test("internal", () => {
            expect(tiles[2].leftOf(tiles[0])).toBe(vertices[0]);
        });
        test("external, exists", () => {
            expect(tiles[0].leftOf(tiles[1])).toBe(vertices[0]);
        });
        test("external, does not exist", () => {
            expect(tiles[0].leftOf(tiles[3])).toBe(null);
        });
    });
    describe("rightOf()", () => {
        test("internal", () => {
            expect(tiles[2].rightOf(tiles[0])).toBe(vertices[1]);
        });
        test("external, exists", () => {
            expect(tiles[0].rightOf(tiles[3])).toBe(vertices[1]);
        });
        test("external, does not exist", () => {
            expect(tiles[0].rightOf(tiles[1])).toBe(null);
        });
    });
    describe("getArea()", () => {
        test("external", () => {
            expect(tiles[1].getArea()).toBeCloseTo(0.545415);
        });
    });
});

describe("Vertex", () => {
    test("computePosition()", () => {
        expect(vertices[0].pos).toEqual(new Vector(
            expect.closeTo(-Math.sqrt(3)/4),
            expect.closeTo(-1/4),
            expect.closeTo(0)));
    });
    describe("acrossFrom()", () => {
        test("exists", () => {
            expect(vertices[0].acrossFrom(vertices[0].neighbors.get(vertices[1]))).toBe(tiles[1]);
        });
    });
    test("widershinsOf()", () => {
        expect(vertices[0].widershinsOf(tiles[1])).toBe(tiles[2]);
    });
});

describe("Edge", () => {
    describe("short", () => {
        const edge = vertices[0].neighbors.get(vertices[1]);
        edge.setCoordinatesAndBounds();
        test("distance", () => {
            expect(edge.distance).toBeCloseTo(Math.sqrt(3) / 2);
        });
        test("length", () => {
            expect(edge.length).toBeCloseTo(1 / 2);
        });
        test("leftBound", () => {
            expect(edge.leftBoundCartesian).toEqual([
                expect.objectContaining({x: expect.closeTo(-Math.sqrt(3) / 2), y: expect.closeTo(0)}),
            ]);
        });
        test("rightBound", () => {
            expect(edge.rightBoundCartesian).toEqual([
                expect.objectContaining({x: expect.closeTo(-Math.sqrt(3) / 4 + 1 / 4), y: expect.closeTo(0)}),
            ]);
        });
        test("bounds", () => {
            expect(edge.bounds).toEqual([
                {x: expect.closeTo(0.), y: expect.closeTo(0.)},
                {x: expect.closeTo(1 / 4), y: expect.closeTo(Math.sqrt(3) / 4)},
                {x: expect.closeTo(1 / 2), y: expect.closeTo(0.)},
                {x: expect.closeTo(1 / 4), y: expect.closeTo(-1 / 4)},
            ]);
        });
        test("toEdgeCoords()", () => {
            expect(edge.toEdgeCoords(new Vector(-Math.sqrt(3) / 4, 0, 0))).toEqual({
                x: expect.closeTo(1 / 4),
                y: expect.closeTo(0)
            });
        });
        test("fromEdgeCoords()", () => {
            expect(edge.fromEdgeCoords({x: 1 / 4, y: 0})).toEqual(expect.objectContaining({
                x: expect.closeTo(-Math.sqrt(3) / 4),
                y: expect.closeTo(0),
                z: expect.closeTo(0),
            }));
        });
        describe("getPath()", () => {
            test("finer scale", () => {
                expect(() => edge.getPath(0.1)).not.toThrow();
            });
            test("coarsest scale", () => {
                expect(edge.getPath(Number.POSITIVE_INFINITY)).toEqual([
                    expect.objectContaining({ф: vertices[0].ф, λ: vertices[0].λ}),
                    expect.objectContaining({ф: vertices[1].ф, λ: vertices[1].λ}),
                ]);
            });
        });
    });
    describe("long", () => {
        const edge = vertices[0].neighbors.get(vertices[2]);
        edge.setCoordinatesAndBounds();
        test("distance", () => {
            expect(edge.distance).toBeCloseTo(1/2);
        });
        test("length", () => {
            expect(edge.length).toBeCloseTo(Math.sqrt(3)/2);
        });
        test("bounds", () => {
            expect(edge.bounds).toEqual([
                {x: expect.closeTo(0.), y: expect.closeTo(0.)},
                {x: expect.closeTo(1/4), y: expect.closeTo(1/4)},
                {x: expect.closeTo(Math.sqrt(3)/2 - 1/4), y: expect.closeTo(1/4)},
                {x: expect.closeTo(Math.sqrt(3)/2), y: expect.closeTo(0)},
                {x: expect.closeTo(Math.sqrt(3)/2 - 3/8*Math.tan(15/180*Math.PI)), y: expect.closeTo(-3/8)},
                {x: expect.closeTo(3/8*Math.tan(15/180*Math.PI)), y: expect.closeTo(-3/8)},
            ]);
        });
        describe("getPath()", () => {
            test("finer scale", () => {
                expect(() => edge.getPath(0.1)).not.toThrow();
            });
            test("coarsest scale", () => {
                expect(edge.getPath(Number.POSITIVE_INFINITY)).toEqual([
                    expect.objectContaining({ф: vertices[0].ф, λ: vertices[0].λ}),
                    expect.objectContaining({ф: vertices[2].ф, λ: vertices[2].λ}),
                ]);
            });
            test("illegal scale", () => {
                expect(() => edge.getPath(0)).toThrow();
            });
        });
    });
});
