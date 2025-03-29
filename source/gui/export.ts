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
 * take a Blob containing an SVG and turn it into a PNG, and queue up a callback that will call download() on it when it finishes.
 */
export function convertSVGToPNGAndThenDownloadIt(svg: Blob, width: number, height: number, filename: string): void {
	const canvas = document.createElement("canvas") as HTMLCanvasElement;
	const context = canvas.getContext("2d");
	canvas.width = width;
	canvas.height = height;
	const image = new Image();
	image.src = window.URL.createObjectURL(svg);
	image.onload = function () {
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		canvas.toBlob(function (pngBlob) {
			download(pngBlob, filename);
		});
	};
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
