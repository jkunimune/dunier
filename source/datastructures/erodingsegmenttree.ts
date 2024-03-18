/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

/**
 * a data structure storing a series of nonintersecting line segments that shrink.
 */
export class ErodingSegmentTree {
	/** the remaining height it can erode before being empty (half-width of the largest empty interval) */
	private radius: number;
	/** the center of the largest empty interval */
	private pole: number;
	/** the link with the leftmost endpoint */
	private minim: Link;
	/** the link with the rightmost endpoint */
	private maxim: Link;
	/** the link with the root endpoint */
	private mul: Link;
	/** the number of additions so far */
	private index: number;

	constructor(xMin: number, xMax: number) {
		if (xMin > xMax)
			throw RangeError("initial range must be positive!");
		this.minim = new Link(xMin, true, 0, null);
		this.maxim = new Link(xMax, false, 1, this.minim, this.minim, null);
		this.mul = this.minim;
		this.radius = (xMax - xMin)/2;
		this.pole = (xMax + xMin)/2;
		this.index = 1;
	}

	/**
	 * fill the region between xL and xR.
	 * @param xL
	 * @param xR
	 */
	public remove(xL: number, xR: number): void {
		if (xL > xR)
			throw RangeError("removal range must be positive!");
		let left = this.search(xL, this.mul); // find the left bound
		if (left !== null && left.esaLeft) // if it is in an included area
			left = this.insert(xL, false, this.mul); // insert a new Link
		let rait = this.search(xR, this.mul);
		rait = (rait !== null) ? rait.bad : this.minim; // find the right bound
		if (rait !== null && !rait.esaLeft) // if it is in an included area
			rait = this.insert(xR, true, this.mul); // find the right bound

		if (left === null || left.bad !== rait) // if there was anything between them
			this.deleteBetween(left, rait, this.mul); // remove it

		if ((left === null || this.pole >= left.val) || (rait === null || this.pole <= rait.val)) { // if you touched the pole, recalculate it
			this.radius = 0;
			this.pole = null;
			let link = this.minim;
			while (link !== null) {
				if (link.bad.val - link.val > 2 * this.radius) {
					this.radius = (link.bad.val - link.val)/2;
					this.pole = (link.bad.val + link.val)/2;
				}
				link = link.bad.bad;
			}
		}
	}

	/**
	 * shorten all line segments by t at each end.
	 * @param t
	 */
	public erode(t: number): void {
		let link = this.minim;
		while (link !== null) {
			if (link.bad.val - link.val <= 2*t) {
				const next = link.bad.bad;
				this.deleteBetween(link.cen, next, this.mul);
				link = next;
			}
			else {
				link.val += t;
				link.bad.val -= t;
				link = link.bad.bad;
			}
		}
		this.radius -= t;
	}

	/**
	 * is this value on one of the line segments?
	 * @param value
	 */
	public contains(value: number): boolean {
		const left = this.search(value, this.mul);
		return left !== null && left.esaLeft;
	}

	/**
	 * insert a new value, with it's esaLeft parameter, in the proper place
	 * @param value
	 * @param left
	 * @param start
	 */
	private insert(value: number, left: boolean, start: Link): Link {
		if (start.val <= value) {
			if (start.raitPute !== null)
				return this.insert(value, left, start.raitPute); // look in the right subtree
			else
				return start.raitPute = new Link(value, left, this.index += 1, start, start, start.bad); // this _is_ the right subtree
		}
		else {
			if (start.leftPute !== null)
				return this.insert(value, left, start.leftPute); // look in the left subtree
			else
				return start.leftPute = new Link(value, left, this.index += 1, start, start.cen, start); // this _is_ the left subtree
		}
	}

	/**
	 * search for the last element e in the subtree from start, such that e.val <= value
	 * @param value
	 * @param start
	 */
	private search(value: number, start: Link): Link {
		if (start.val <= value) { // if it could be start
			let res = null;
			if (start.raitPute !== null) // look in the right subtree
				res = this.search(value, start.raitPute);
			if (res === null) // if there was no right subtree or the search turn up noting
				return start; // the answer is start
			else
				return res; // otherwise return whatever you found
		}
		else { // if it is left of start
			if (start.leftPute !== null)
				return this.search(value, start.leftPute); // look in the left tree. if it's not there, it's not here.
			else
				return null;
		}
	}

	/**
	 * delete all Links between these two, excluding these two
	 * @param left
	 * @param rait
	 * @param start the root of the subtree where we're doing
	 */
	private deleteBetween(left: Link, rait: Link, start: Link): void { // TODO how will this work with identical leavs?
		if (start === this.mul) { // if this is the top level, there's some stuff we need to check
			if (left === null && rait === null) { // if we're deleting the whole thing
				this.mul = null; // delete the whole thing and be done
				this.maxim = null;
				this.minim = null;
				return;
			}
			else if (left === null) // if we're deleting the left side
				this.minim = rait; // get the new minim
			else if (rait === null)
				this.maxim = left; // get the new maxim
		}
		console.assert(start !== null);

		const raitOfCenter = rait === null || start.cena(rait); // does the right bound include start?
		const leftOfCenter = left === null || left.cena(start); // does the left bound include start?
		if (leftOfCenter && start.leftPute !== null) { // we need to check the left side
			if (left === null && (rait === start || raitOfCenter)) // if we can,
				start.leftPute = null; // drop the entire left branch
			else if (rait === start || raitOfCenter) // if not but at least the right side of left is all taken
				this.deleteBetween(left, null, start.leftPute); // check the left side of the left branch
			else // if there are no shortcuts
				this.deleteBetween(left, rait, start.leftPute); // check the whole left branch
		}
		if (raitOfCenter && start.raitPute !== null) { // we need to check the right side
			if (rait === null && (left === start || leftOfCenter)) // if we can,
				start.raitPute = null; // drop the entire right branch
			else if (left === start || leftOfCenter) // if not but at least the left side of right is all taken
				this.deleteBetween(null, rait, start.raitPute); // check the left side of the right branch
			else // if there are no shortcuts
				this.deleteBetween(left, rait, start.raitPute); // check the whole right branch
		}
		if (raitOfCenter && leftOfCenter) { // we need to delete this node
			this.delete(start);
		}

		if (left !== null)
			left.bad = rait;
		if (rait !== null)
			rait.cen = left;
	}

	/**
	 * remove a single node from the tree, keeping its children
	 * @param link
	 */
	private delete(link: Link) {
		if (link.leftPute === null) {
			if (link.raitPute === null) { // if there are no children
				if (link.jener === null)
					this.mul = null;
				else if (link.jener.leftPute === link)
					link.jener.leftPute = null; // just delete it
				else
					link.jener.raitPute = null;
			}
			else { // if there is a rait child
				if (link === this.mul)
					this.mul = link.raitPute;
				link.kopiyu(link.raitPute); // move it here
			}
		}
		else {
			if (link.raitPute === null) { // if there is a left child
				if (link === this.mul)
					this.mul = link.leftPute;
				link.kopiyu(link.leftPute); // move it here
			}
			else { // if there are two children
				let veriBad = link.raitPute; // find the successor
				while (veriBad.leftPute !== null) // (don't use .bad because that one may have been deleted)
					veriBad = veriBad.leftPute;
				this.delete(veriBad); // cut that successor out of the graph
				if (link === this.mul)
					this.mul = veriBad;
				link.kopiyu(veriBad); // then reinsert it, overwriting this one
				veriBad.getaPute(link.leftPute, link.raitPute); // and transfer any remaining children to the successor
			}
		}
	}

	/**
	 * get the nearest point to value that is contained in one of the line segments.
	 * @param value
	 */
	public getClosest(value: number): number {
		const left = this.search(value, this.mul);
		if (left === null)
			return this.minim.val;
		else if (left.bad === null)
			return this.maxim.val;
		const rait = left.bad;
		if (value - left.val < rait.val - value)
			return left.val;
		else
			return rait.val;
	}

	public getMinim(): number {
		return this.minim.val;
	}

	public getMaxim(): number {
		return this.maxim.val;
	}

	/**
	 * get the midpoint of the longest line segment, and half the length of the longest
	 * line segment.  return zero if there are no line segments left.
	 * @param periodic whether we should treat it as an angular coordinate where -π is the
	 *                 same as +π
	 */
	public getCenter(periodic: boolean = false): { location: number, radius: number } {
		if (periodic && this.minim.val === -Math.PI && this.maxim.val === Math.PI) { // if it's periodic
			const leftGap = this.minim.bad.val - this.minim.val; // you haff to check the outside
			const riteGap = this.maxim.val - this.maxim.cen.val;
			if (leftGap + riteGap > 2*this.radius) // to see if that's better
				return { location: (leftGap - riteGap)/2 + Math.PI,
						 radius: (leftGap + riteGap)/2 };
		}
		return { location: this.pole, radius: this.radius }; // otherwise it's just these instance variables of which you've kept track
	}
}

/**
 * a link in the segment tree
 */
class Link {
	public jener: Link;
	public leftPute: Link;
	public raitPute: Link;
	public cen: Link;
	public bad: Link;
	public val: number;
	public esaLeft: boolean;
	public readonly index: number;

	constructor(val: number, left: boolean, index: number, jener: Link, cen: Link = null, bad: Link = null) {
		this.val = val;
		this.esaLeft = left;
		this.index = index;

		this.jener = jener;
		this.leftPute = null;
		this.raitPute = null;
		if (jener !== null) {
			if (jener === cen)
				jener.raitPute = this;
			else if (jener === bad)
				jener.leftPute = this;
			else
				throw new Error("you can't insert a new leaf under neither of its neighbors; that makes no sense.");
		}

		this.cen = cen;
		if (cen !== null)
			cen.bad = this;
		this.bad = bad;
		if (bad !== null)
			bad.cen = this;
	}

	cena(that: Link): boolean {
		return this.val < that.val || (this.val === that.val && this.index < that.index);
	}

	kopiyu(nove: Link) {
		nove.jener = this.jener; // move it here
		if (this.jener !== null) {
			if (this.jener.raitPute === this)
				this.jener.raitPute = nove;
			else
				this.jener.leftPute = nove;
		}
	}

	getaPute(left: Link, rait: Link) {
		this.leftPute = left;
		if (left !== null)
			left.jener = this;
		this.raitPute = rait;
		if (rait !== null)
			rait.jener = this;
	}
}
