/**
 * MIT License
 *
 * Copyright (c) 2021 Justin Kunimune
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
