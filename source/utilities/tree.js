/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
/**
 * a data structure to keep track of a set of elements with a tree-shaped hierarchy
 */
var Tree = /** @class */ (function () {
    /**
     * make a new Tree, optionally providing smaller trees with which to fill it
     */
    function Tree(value, leftChild, riteChild) {
        if (leftChild === void 0) { leftChild = null; }
        if (riteChild === void 0) { riteChild = null; }
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
    Tree.prototype.pathToNextLeaf = function () {
        var segment = this;
        var path = [segment];
        // first, go up as long as up is left
        while (segment === segment.parent.riteChild) {
            segment = segment.parent;
            path.push(segment);
        }
        var weHaveFlippedToTheOtherSide = segment !== segment.parent.leftChild;
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
    };
    return Tree;
}());
export { Tree };
//# sourceMappingURL=tree.js.map