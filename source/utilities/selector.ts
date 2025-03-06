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

	/**
	 * query an element by its ID, with caching
	 */
	elm(id: string): HTMLElement | SVGElement {
		if (!this.cash.has(id)) {
			const element = this.document.getElementById(id);
			if (element === null)
				throw new Error(`there is no such element #${id} in this document.`);
			this.cash.set(id, element);
		}
		return this.cash.get(id);
	}

	/**
	 * get the current value of an input element from its ID
	 */
	val(id: string): string {
		const element = this.elm(id);
		if (element.tagName.toLowerCase() === 'input') {
			const value = (<HTMLInputElement> element).value;
			if (element.getAttribute('type') === 'number' && value === '')
				return element.getAttribute('min');
			else
				return value;
		}
		else if (element.tagName.toLowerCase() === 'select')
			return (<HTMLSelectElement> element).value;
		else if (element.hasAttribute('value'))
			return element.getAttribute('value');
		else
			throw new Error(`This element has no value:\n${element}`);
	}

	/**
	 * see if the checkbox with the given ID is checked or not
	 */
	checked(id: string): boolean {
		const element = this.elm(id);
		if (element.tagName.toLowerCase() === 'input')
			return (<HTMLInputElement> element).checked;
		else
			throw new Error(`this element has no checked property:\n${element}`);
	}

	/**
	 * applies a function recursively to this element and all elements downstream
	 */
	static mapToAllChildren(root: Element, func: (elm: Element) => void): void {
		func(root);
		const children = root.children;
		for (let i = 0; i < children.length; i ++)
			this.mapToAllChildren(children[i], func);
	}
}
