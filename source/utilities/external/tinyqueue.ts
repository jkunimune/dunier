/**
 * ISC License
 *
 * Copyright (c) 2017, Vladimir Agafonkin
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose
 * with or without fee is hereby granted, provided that the above copyright notice
 * and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
 * OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
 * TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
 * THIS SOFTWARE.
 */

/**
 * The smallest and simplest binary heap priority queue in JavaScript.
 * Compare should be defined so that it returns a negative number if a should come out first
 * and a positive number if b should come out first.
 * so compare = (a, b) => a - b will go from smallest to biggest numbers
 * @author Vladimir Agafonkin (@mourner)
 */
export default class Queue<E> {
	private readonly data: E[];
	private readonly compare: (a: E, b: E) => number;
	private length: number;

	constructor(data: E[] = [], compare: (a: E, b: E) => number) {
		this.data = data;
		this.length = this.data.length;
		this.compare = compare;

		if (this.length > 0)
			for (let i = (this.length >> 1) - 1; i >= 0; i--)
				this.down(i);
	}

	public empty(): boolean {
		return this.length === 0;
	}

	public push(item: E): void {
		this.data.push(item);
		this.up(this.length++);
	}

	public pop(): E {
		if (this.length === 0) return undefined;

		const top = this.data[0];
		const bottom = this.data.pop();

		if (--this.length > 0) {
			this.data[0] = bottom;
			this.down(0);
		}

		return top;
	}

	public peek(): E {
		return this.data[0];
	}

	private up(pos: number): void {
		const {data, compare} = this;
		const item = data[pos];

		while (pos > 0) {
			const parent = (pos - 1) >> 1;
			const current = data[parent];
			if (compare(item, current) >= 0) break;
			data[pos] = current;
			pos = parent;
		}

		data[pos] = item;
	}

	private down(pos: number): void {
		const {data, compare} = this;
		const halfLength = this.length >> 1;
		const item = data[pos];

		while (pos < halfLength) {
			let bestChild = (pos << 1) + 1; // initially it is the left child
			const right = bestChild + 1;

			if (right < this.length && compare(data[right], data[bestChild]) < 0) {
				bestChild = right;
			}
			if (compare(data[bestChild], item) >= 0) break;

			data[pos] = data[bestChild];
			pos = bestChild;
		}

		data[pos] = item;
	}
}
