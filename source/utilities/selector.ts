/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
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

