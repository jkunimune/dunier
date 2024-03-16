/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

export class Dequeue<Type> {
	private first: Link<Type>;
	private last: Link<Type>;

	constructor(initial: Type[]) {
		this.first = null;
		this.last = null;
		for (const value of initial)
			this.push(value);
	}

	push(value: Type): void {
		const link: Link<Type> = {value: value, next: null};
		if (this.last !== null)
			this.last.next = link;
		else
			this.first = link;
		this.last = link;
	}

	pop(): Type {
		const link: Link<Type> = this.first;
		this.first = this.first.next;
		if (this.first === null)
			this.last = null;
		return link.value;
	}

	isEmpty(): boolean {
		return this.first === null;
	}
}

interface Link<Type> {
	value: Type;
	next: Link<Type> | null;
}
