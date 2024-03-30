/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Dequeue} from "./dequeue.js";

/**
 * a data structure to keep track of a set of elements with a tree-shaped hierarchy
 * that also keeps a Map to efficiently look up elements in the Tree
 */
export class TreeMap<Type> implements Iterable<Type> {
	private readonly map: Map<Type, Link<Type>>;
	private seed: Link<Type>;

	constructor() {
		this.map = new Map<Type, Link<Type>>();
		this.seed = null;
	}

	size(): number {
		return this.map.size;
	}

	/**
	 * is this item in the tree?
	 * @param item
	 */
	has(item: Type): boolean {
		return this.map.has(item);
	}

	/**
	 * add this item to the tree under parent
	 * @param item
	 * @param parent
	 */
	add(item: Type, parent: Type): void {
		if (this.has(item))
			throw new Error("duplicates are not allowd.");

		let childLink;
		if (parent === null) {
			if (this.seed !== null)
				throw new Error("you tried to set the seed of a tree that already has one.");
			childLink = new Link<Type>(item, null);
			this.seed = childLink;
		}
		else {
			if (!this.map.has(parent))
				throw new Error("the given item is not in the tree");
			const parentLink = this.map.get(parent);
			childLink = new Link<Type>(item, this.map.get(parent));
			parentLink.children.push(childLink);
		}

		this.map.set(item, childLink);
	}
	/**
	 * get a list of the children of this item in the tree
	 * @param item
	 */
	getChildren(item: Type): Type[] {
		if (!this.has(item))
			throw new Error("the given parent is not in the tree");
		return this.map.get(item).children.map((link: Link<Type>) => link.item);
	}

	/**
	 * remove this item and all of its descendants from the TreeMap in linear time (can it
	 * be faster? maybe...).
	 * @param item
	 */
	delete(item: Type): void {
		if (!this.has(item))
			throw new Error("the given item to delete is not in the tree");
		const head = this.map.get(item);

		if (head === this.seed) { // if you are deleting the source of the entire map
			this.seed = null; // delete everything
			this.map.clear();
		}
		else {
			let parent = head.parent; // otherwise get its parent
			parent.children.splice(parent.children.indexOf(head), 1); // erase it from it's parent's memory
			this._delete(this.map.get(item)); // then deal with the map recursively
		}
	}

	/**
	 * remove this link and all of its descendants from the map in linear time.
	 * @param parent
	 */
	_delete(parent: Link<Type>): void {
		this.map.delete(parent.item);
		for (const child of parent.children)
			this._delete(child);
	}

	/**
	 * iterate thru the links of this tree in breadth-first order
	 */
	getAllChildren(start: Type): Iterable<Type> {
		const head = this.map.get(start);
		return {
			[Symbol.iterator]: function(): Iterator<Type> {
				const cue = new Dequeue<Link<Type>>([head]);
				return {
					next: function() {
						if (cue.isEmpty()) {
							return {done: true, value: null};
						}
						else {
							const next = cue.pop();
							for (const child of next.children)
								cue.push(child);
							return {done: false, value: next.item};
						}
					}
				};
			}
		};
	}

	[Symbol.iterator](): Iterator<Type> {
		if (this.seed === null)
			return [][Symbol.iterator]();
		else
			return this.getAllChildren(this.seed.item)[Symbol.iterator]();
	}
}

class Link<Type> {
	public readonly item: Type;
	public readonly parent: Link<Type>;
	public readonly children: Link<Type>[];

	constructor(value: Type, parent: Link<Type>) {
		this.item = value;
		this.parent = parent;
		this.children = [];
	}
}
