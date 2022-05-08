/*
 * MIT License
 * 
 * Copyright (c) 2022 Justin Kunimune
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

import {Point} from "./coordinates.js";
import {Tree} from "./tree.js";
import Queue from "./queue.js";
import {trajectoryIntersection} from "./geometry.js";

/**
 * compute the strait skeleton of a convex polygon and return it, formatted as a tree of
 * nodes.  the polygon must go widdershins.
 * @param polygon must be convex
 * @return a reference to the tree node corresponding to polygon[0].  other nodes will
 *         be found by traversing the attached tree graph.  each of the top two nodes is
 *         the other's parent
 */
export function straightSkeleton(polygon: Point[]): Tree<Point> {
	// start by laying a foundation which is just the polygon
	const initialNodes: Nodo[] = [];
	for (let i = 0; i < polygon.length; i ++) {
		const l = (i - 1 + polygon.length)%polygon.length;
		const r = (i + 1)%polygon.length;
		initialNodes.push(new Nodo(
				direction(polygon[l], polygon[i]),
				direction(polygon[i], polygon[r]),
				polygon[i], 0));
	}

	// then instantiate the priority cue
	const upcomingMergers = new Queue<Merger>(
		[], (a, b) => a.time - b.time);
	for (let i = 0; i < polygon.length; i ++) {
		initialNodes[i].linkRite(initialNodes[(i + 1)%polygon.length]);
		upcomingMergers.push(new Merger(
			initialNodes[i], initialNodes[(i + 1)%polygon.length]));
	}

	// then advance the wavefronts
	while (!upcomingMergers.empty()) {
		const { left, rite, time, place } = upcomingMergers.pop(); // take the next merger coming up
		if (time < 0) // this should never happen ideally
			continue; // but sometimes if the polygon is slitely concave we haff to check
		if (left.parent === null && rite.parent === null) { // if these are both still waiting to get a parent
			// merge them
			const newNodo = new Nodo(left.leftEdge, rite.riteEdge, place, time, left, rite);
			newNodo.linkLeft(left.leftNeibor); // and update the connectivity graff
			newNodo.linkRite(rite.riteNeibor);

			// check the termination condition
			if (newNodo.leftNeibor === newNodo.riteNeibor) {
				newNodo.parent = newNodo.leftNeibor;
				newNodo.leftNeibor.parent = newNodo;
				return initialNodes[0];
			}

			// predict the intersection of this with its neibors
			upcomingMergers.push(new Merger(newNodo.leftNeibor, newNodo));
			upcomingMergers.push(new Merger(newNodo, newNodo.riteNeibor));
		}
	}

	throw "I don't remember when I got here";
}


/**
 * the normalized direction inward from a given edge
 */
function direction(a: Point, b: Point): { vx: number, vy: number } {
	const vx = a.y - b.y;
	const vy = b.x - a.x;
	const length = Math.hypot(vx, vy);
	return { vx: vx/length, vy: vy/length };
}


class Merger {
	left: Nodo;
	rite: Nodo;
	time: number;
	place: Point;

	constructor(left: Nodo, rite: Nodo) {
		this.left = left;
		this.rite = rite;
		const intersection = trajectoryIntersection(
			left.value, left.direction,
			rite.value, rite.direction);
		// if (!(intersection.ta > 0 && intersection.tb > 0))
		// 	throw `(${left.value.x}, ${left.value.y}) + t (${left.direction.x}, ${left.direction.y}) = ` +
		// 	      `(${rite.value.x}, ${rite.value.y}) + t (${rite.direction.x}, ${rite.direction.y})`;
		this.time = left.time + intersection.ta;
		this.place = intersection;
	}
}


/**
 * a node on the strait skeleton grid
 */
class Nodo extends Tree<Point> {
	leftEdge: { vx: number, vy: number };
	riteEdge: { vx: number, vy: number };
	time: number;
	direction: { x: number, y: number };
	leftChild: Nodo;
	riteChild: Nodo;
	leftNeibor: Nodo;
	riteNeibor: Nodo;
	parent: Nodo;

	constructor(leftEdge: { vx: number, vy: number },
				riteEdge: { vx: number, vy: number },
				location: Point,
				time: number,
				leftChild: Nodo = null,
				riteChild: Nodo = null) {
		super(location, leftChild, riteChild);
		this.leftEdge = leftEdge;
		this.riteEdge = riteEdge;
		this.time = time;

		// to compute the direction this node propogates
		this.direction = {
			x: (leftEdge.vx + riteEdge.vx)/2.,
			y: (leftEdge.vy + riteEdge.vy)/2. }; // average the two edge velocities
		const sinθ2 = Math.pow(this.direction.x, 2) + Math.pow(this.direction.y, 2); // use this handy identity
		if (sinθ2 > 1e-6) {
			this.direction.x /= sinθ2;
			this.direction.y /= sinθ2;
		}
		else { // but it mite fail for nearly parallel edges...
			this.direction = { // get the direction this way
				x: (riteEdge.vy - leftEdge.vy)/2.,
				y: (leftEdge.vx - riteEdge.vx)/2. };
			if (sinθ2 !== 0) {
				const cosθ2 = Math.pow(this.direction.x, 2) + Math.pow(this.direction.y, 2); // try using this other identity
				const cosθsinθ = Math.sqrt(sinθ2*cosθ2);
				this.direction.x /= cosθsinθ;
				this.direction.y /= cosθsinθ;
			}
			else {} // of course, if they're actually parallel, sikataganai. this is garanteed not to merge anything in that case.
		}
	}

	linkLeft(last: Nodo): void {
		this.leftNeibor = last;
		last.riteNeibor = this;
	}

	linkRite(next: Nodo): void {
		this.riteNeibor = next;
		next.leftNeibor = this;
	}

}
