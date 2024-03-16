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

/**
 * a data structure to keep track of a set of elements with a tree-shaped hierarchy
 * that is faster than a TreeMap
 */
export class Tree<Type> {
	public parent: Tree<Type>; // anything above it
	public readonly leftChild: Tree<Type>; // the 1st level child on the left
	public readonly riteChild: Tree<Type>; // the 1st level child on the rite
	public readonly value: Type; // the root value

	/**
	 * make a new Tree, optionally providing smaller trees with which to fill it
	 * @param value
	 * @param leftChild
	 * @param riteChild
	 */
	constructor(value: Type, leftChild: Tree<Type> = null, riteChild: Tree<Type> = null) {
		this.value = value;
		this.leftChild = leftChild;
		if (leftChild !== null)
			leftChild.parent = this;
		this.riteChild = riteChild;
		if (riteChild !== null)
			riteChild.parent = this;
		this.parent = null;
	}

	root(): Tree<Type> {
		if (this.parent === null)
			return this;
		else
			return this.parent.root();
	}

	/**
	 * return a list of Tree elements traversing the path to the nearest leaf on the
	 * rite.  this method assumes that every node either has zero or two children, but
	 * does account for the situation where two trees are joind at the root as they are
	 * by straitSkeleton.
	 */
	pathToNextLeaf(): Tree<Type>[] {
		let segment: Tree<Type> = this;
		const path: Tree<Type>[] = [segment];
		// first, go up as long as up is left
		while (segment === segment.parent.riteChild) {
			segment = segment.parent;
			path.push(segment);
		}
		const weHaveFlipdToTheOtherSide = segment !== segment.parent.leftChild;
		// then go up and rite one
		segment = segment.parent;
		path.push(segment);
		// then go down and rite one (skip this if we jumpd thru the Lagrange point)
		if (!weHaveFlipdToTheOtherSide) {
			segment = segment.riteChild;
			path.push(segment);
		}
		// then go down and left as far as you can
		while (segment.leftChild !== null) {
			segment = segment.leftChild;
			path.push(segment);
		}
		return path;
	}
}
