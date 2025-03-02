/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

/**
 * direct the user's browser to save a resource to disc.
 */
export function download(blob: Blob, filename: string): void {
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.download = filename;
	link.href = url;
	link.click();
	link.remove();
	window.URL.revokeObjectURL(url);
}

/**
 * stuff the contents of an SVG into a Blob and assign it a URL
 */
export function convertSVGToBlob(svg: SVGSVGElement): Blob {
	const serializedSVG = '<?xml version="1.0" encoding="UTF-8"?>' + serialize(svg);
	return new Blob([serializedSVG], {type: "image/svg+xml;charset=utf-8"});
}

/**
 * convert some HTML elements to their string representation.
 * this function does not modify the input.
 */
export function serialize(element: Node): string {
	const serializer = new XMLSerializer();
	return serializer.serializeToString(element);
}
