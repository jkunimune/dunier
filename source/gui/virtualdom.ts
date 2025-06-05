/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

export interface VNode {
	tag: string;
	attributes: { [index: string]: string };
	children: VNode[];
	textContent: string;
}

/**
 * construct a new virtual DOM node
 * @param tag the type of element
 * @param attributes an object containing the attributes, if any
 * @param children any nodes contained within this node
 */
export function h(
	tag: string,
	attributes: { [index: string]: string } = null,
	...children: VNode[]
): VNode {
	return {
		tag: tag,
		attributes: (attributes !== null) ? attributes : {},
		children: children,
		textContent: "",
	};
}

/**
 * deep copy a VNode
 */
export function cloneNode(node: VNode): VNode {
	const clonedAttributes: { [index: string]: string } = {};
	for (const [key, value] of Object.entries(node.attributes))
		clonedAttributes[key] = value;
	return {
		tag: node.tag,
		attributes: clonedAttributes,
		children: node.children.map(cloneNode),
		textContent: node.textContent
	};
}

/**
 * serialize a node and all its descendants as XML
 */
export function toXML(node: VNode): string {
	let attributes = "";
	for (const [key, value] of Object.entries(node.attributes))
		attributes += ` ${key}="${value}"`;
	let children = "";
	for (const child of node.children)
		children += toXML(child);
	return `<${node.tag}${attributes}>${node.textContent}${children}</${node.tag}>`;
}
