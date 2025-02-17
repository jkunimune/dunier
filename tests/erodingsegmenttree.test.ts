/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {ErodingSegmentTree} from "../source/datastructures/erodingsegmenttree.js";

test("full", () => {
	const tree = new ErodingSegmentTree(0, 1);
	tree.validate();
	expect(tree.getCenter()).toEqual({location: expect.closeTo(0.5), radius: expect.closeTo(0.5)});
});
test("remove left part", () => {
	const tree = new ErodingSegmentTree(0, 1);
	tree.remove(0, 0.2);
	tree.validate();
	expect(tree.getCenter()).toEqual({location: expect.closeTo(0.6), radius: expect.closeTo(0.4)});
});
test("remove right part", () => {
	const tree = new ErodingSegmentTree(0, 1);
	tree.remove(0.6, 1);
	tree.validate();
	expect(tree.getCenter()).toEqual({location: expect.closeTo(0.3), radius: expect.closeTo(0.3)});
});
test("remove middle", () => {
	const tree = new ErodingSegmentTree(0, 1);
	tree.remove(0.2, 0.6);
	tree.validate();
	expect(tree.getCenter()).toEqual({location: expect.closeTo(0.8), radius: expect.closeTo(0.2)});
});
test("remove two intervals", () => {
	const tree = new ErodingSegmentTree(0, 1);
	tree.remove(0.2, 0.3);
	tree.remove(0.7, 0.9);
	tree.validate();
	expect(tree.getCenter()).toEqual({location: expect.closeTo(0.5), radius: expect.closeTo(0.2)});
});
test("overlapping removals", () => {
	const tree = new ErodingSegmentTree(0, 1);
	tree.remove(0.2, 0.7);
	tree.remove(0.3, 0.9);
	tree.validate();
	expect(tree.getCenter()).toEqual({location: expect.closeTo(0.1), radius: expect.closeTo(0.1)});
});
test("subset removal", () => {
	const tree = new ErodingSegmentTree(0, 1);
	tree.remove(0.2, 0.6);
	tree.remove(0.3, 0.4);
	tree.validate();
	expect(tree.getCenter()).toEqual({location: expect.closeTo(0.8), radius: expect.closeTo(0.2)});
});
test("superset removal", () => {
	const tree = new ErodingSegmentTree(0, 1);
	tree.remove(0.3, 0.4);
	tree.remove(0.2, 0.6);
	expect(tree.getCenter()).toEqual({location: expect.closeTo(0.8), radius: expect.closeTo(0.2)});
});
test("erosion", () => {
	const tree = new ErodingSegmentTree(0, 1);
	tree.remove(0, 0.2);
	tree.erode(0.2);
	tree.validate();
	expect(tree.getCenter()).toEqual({location: expect.closeTo(0.6), radius: expect.closeTo(0.2)});
});
test("getClosest", () => {
	const tree = new ErodingSegmentTree(0, 1);
	tree.remove(0.2, 0.6);
	expect(tree.getClosest(0)).toBeCloseTo(0);
	expect(tree.getClosest(0.3)).toBeCloseTo(0.2);
	expect(tree.getClosest(0.5)).toBeCloseTo(0.6);
	expect(tree.getClosest(0.7)).toBeCloseTo(0.7);
});
test("periodic with center removed", () => {
	const tree = new ErodingSegmentTree(0, 2*Math.PI);
	tree.remove(Math.PI/3, Math.PI);
	expect(tree.getCenter(true)).toEqual({location: expect.closeTo(5*Math.PI/3), radius: expect.closeTo(2*Math.PI/3)});
});
test("periodic with edges removed", () => {
	const tree = new ErodingSegmentTree(0, 2*Math.PI);
	tree.remove(0, Math.PI/3);
	tree.remove(Math.PI, 2*Math.PI);
	expect(tree.getCenter(true)).toEqual({location: expect.closeTo(2*Math.PI/3), radius: expect.closeTo(Math.PI/3)});
});
test("periodic with edge and center removed", () => {
	const tree = new ErodingSegmentTree(0, 2*Math.PI);
	tree.remove(Math.PI/3, 2*Math.PI/3);
	tree.remove(5*Math.PI/3, 2*Math.PI);
	expect(tree.getCenter(true)).toEqual({location: expect.closeTo(7*Math.PI/6), radius: expect.closeTo(Math.PI/2)});
});
