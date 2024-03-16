/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

/**
 * load a static TSV resource. comments may be specified with a comment character. if a comment character is given,
 * whitespace will be stripped from each line after the comment is removed. so don't use a whitespace delimiter if you
 * want trailing empty columns and comments.
 * @param filename the filename (will search in ./resources/ by default)
 * @param delimiter the symbol that indicates a column break
 * @param comment the symbol that indicates the start of a comment
 */
export function loadTSV(filename: string, delimiter: RegExp = /\t/, comment: RegExp = null): string[][] {
	const arr = [];
	for (let line of loadFile(filename).split('\n')) { // read it line-by-line
		const matchObject = line.match(comment);
		if (matchObject !== null && matchObject.index === 0) continue; // skip the line if it is all one comment
		line = line.split(comment)[0]; // remove the comment
		if (comment !== null) {
			line = line.replace(/\s+$/, ''); // remove trailing whitespace
			line = line.replace(/^\s+/, ''); // remove leading whitespace
		}
		if (line.length !== 0) arr.push(line.split(delimiter)); // if the line is nonempty, record it
	}
	return arr;
}

/**
 * load a static JSON resource as a decent file type.
 * @param filename
 */
export function loadJSON(filename: string): Map<string, string> {
	const json: {[key: string]: string} = JSON.parse(loadFile(filename));
	const map = new Map<string, string>();
	for (const key of Object.keys(json))
		map.set(key, json[key]);
	return map;
}

/**
 * load the contents of a static file resource as a string
 * @param filename
 */
function loadFile(filename: string): string {
	const xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", `/resources/${filename}`, false); // get the file TODO: use a thread for this stuff
	xmlHttp.send();
	if (xmlHttp.status !== 200)
		throw new Error(`${xmlHttp.status} error while loading '${filename}': ${xmlHttp.statusText}`);
	return xmlHttp.responseText;
}
