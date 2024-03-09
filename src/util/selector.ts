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

export class Selector {

	private readonly document: Document;
	private readonly cash: Map<string, HTMLElement>;

	constructor(document: Document) {
		this.document = document;
		this.cash = new Map();
	}

	elm(id: string): HTMLElement | SVGElement {
		if (!this.cash.has(id))
			this.cash.set(id, this.document.getElementById(id));
		return this.cash.get(id);
	}

	val(id: string): string {
		const element = this.elm(id);
		if (element.tagName.toLowerCase() === 'input')
			return (<HTMLInputElement> element).value;
		else if (element.tagName.toLowerCase() === 'select')
			return (<HTMLSelectElement> element).value;
		else if (element.hasAttribute('value'))
			return element.getAttribute('value');
		else
			throw new Error(`This element has no value:\n${element}`);
	}

	checked(id: string): boolean {
		const element = this.elm(id);
		if (element.tagName.toLowerCase() === 'input')
			return (<HTMLInputElement> element).checked;
		else
			throw new Error(`this element has no checked property:\n${element}`);
	}

	/**
	 * applies a function recursively to this element and all elements downstream
	 * @param root
	 * @param func
	 */
	static mapToAllChildren(root: Element, func: (elm: Element) => void): void {
		func(root);
		const children = root.children;
		for (let i = 0; i < children.length; i ++)
			this.mapToAllChildren(children[i], func);
	}
}

