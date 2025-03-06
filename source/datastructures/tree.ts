/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

/**
 * a data structure to keep track of a set of elements with a tree-shaped hierarchy
 * that is faster than a TreeMap
 */
export class Tree<Type> {
	/** anything above it */
	public parent: Tree<Type>;
	/** the 1st level child on the left */
	public readonly leftChild: Tree<Type>;
	/** the 1st level child on the rite */
	public readonly riteChild: Tree<Type>;
	/** the root value */
	public readonly value: Type;

	/**
	 * make a new Tree, optionally providing smaller trees with which to fill it
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
		const weHaveFlippedToTheOtherSide = segment !== segment.parent.leftChild;
		// then go up and rite one
		segment = segment.parent;
		path.push(segment);
		// then go down and rite one (skip this if we jumpd thru the Lagrange point)
		if (!weHaveFlippedToTheOtherSide) {
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
