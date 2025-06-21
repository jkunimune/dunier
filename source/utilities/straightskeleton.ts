/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {XYPoint} from "./coordinates.js";
import {Tree} from "./tree.js";
import Queue from "./external/tinyqueue.js";
import {trajectoryIntersection} from "./geometry.js";

/**
 * compute the strait skeleton of a convex polygon and return it, formatted as a tree of
 * nodes.  the polygon must go widdershins.
 * @param polygon must be convex and oriented so it goes widershins
 * @return a reference to the tree node corresponding to polygon[0].  other nodes will
 *         be found by traversing the attached tree graph.  each of the top two nodes is
 *         the other's parent
 */
export function straightSkeleton(polygon: XYPoint[]): Tree<XYPoint> {
	if (polygon.length < 3)
		throw new Error(`this polygon only has ${polygon.length} vertices; how can it have any geometric properties at all?`);
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

	throw new Error("the straight skeleton algorithm failed.  I don't fully understand how that's possible, but is this polygon by chance concave?");
}


/**
 * the normalized direction inward from a given edge
 */
function direction(a: XYPoint, b: XYPoint): { vx: number, vy: number } {
	const vx = a.y - b.y;
	const vy = b.x - a.x;
	const length = Math.hypot(vx, vy);
	return { vx: vx/length, vy: vy/length };
}


class Merger {
	left: Nodo;
	rite: Nodo;
	time: number;
	place: XYPoint;

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
class Nodo extends Tree<XYPoint> {
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
				location: XYPoint,
				time: number,
				leftChild: Nodo = null,
				riteChild: Nodo = null) {
		super(location, leftChild, riteChild);
		this.leftEdge = leftEdge;
		this.riteEdge = riteEdge;
		this.time = time;

		// to compute the direction this node propagates
		this.direction = {
			x: (leftEdge.vx + riteEdge.vx)/2.,
			y: (leftEdge.vy + riteEdge.vy)/2. }; // average the two edge velocities
		const sin2_θ = Math.pow(this.direction.x, 2) + Math.pow(this.direction.y, 2); // use this handy identity
		if (sin2_θ > 1e-6) {
			this.direction.x /= sin2_θ;
			this.direction.y /= sin2_θ;
		}
		else { // but it mite fail for nearly parallel edges...
			this.direction = { // get the direction this way
				x: (riteEdge.vy - leftEdge.vy)/2.,
				y: (leftEdge.vx - riteEdge.vx)/2. };
			if (sin2_θ !== 0) {
				const cos2_θ = Math.pow(this.direction.x, 2) + Math.pow(this.direction.y, 2); // try using this other identity
				const cos_θ_sin_θ = Math.sqrt(sin2_θ*cos2_θ);
				this.direction.x /= cos_θ_sin_θ;
				this.direction.y /= cos_θ_sin_θ;
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
