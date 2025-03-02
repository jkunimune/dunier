/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Name} from "../language/name.js";
import {DOM} from "./dom.js";

import EN_STRINGS from "../../resources/translations/en.js";
import ES_STRINGS from "../../resources/translations/es.js";
import JA_STRINGS from "../../resources/translations/ja.js";
import PD_STRINGS from "../../resources/translations/pd.js";


let USER_STRINGS: { [index: string]: string };
switch (DOM.elm("bash").textContent) {
	case "en":
		USER_STRINGS = EN_STRINGS;
		break;
	case "es":
		USER_STRINGS = ES_STRINGS;
		break;
	case "ja":
		USER_STRINGS = JA_STRINGS;
		break;
	case "pd":
		USER_STRINGS = PD_STRINGS;
		break;
	default:
		throw new Error(`I don't recognize the language code ${DOM.elm("bash").textContent}`);
}


/**
 * cast the given args to user strings (with a fixed format specificacion) and add them to
 * the given format in place of '{0}', '{1}', etc.  output will all ultimately be
 * extracted from USER_STRINGS.
 * @param sentence the key for the encompassing phrase
 * @param args the key for the arguments to slot in
 */
export function format(sentence: string, ...args: (string|number|Name|Name[])[]): string {
	if (!USER_STRINGS.hasOwnProperty(sentence))
		throw new Error(`Could not find user string in resource file for ${sentence}`);
	let format = USER_STRINGS[sentence];
	for (let i = 0; i < args.length; i ++) { // loop thru the args and format each one
		let convertedArg: string;
		if (args[i] === null || args[i] === undefined) {
			if (sentence.includes(`{${i}}`))
				throw new Error(`${args[i]} was passd as the ${i}° argument.  this is only allowd when the argument is absent from the format string, which was not the case here.`);
			continue;
		}
		if (args[i] instanceof Name) {
			convertedArg = (<Name>args[i]).toString(); // transcribe words using the specified style TODO: use the user-specified style TODO sometimes italicize instead of capitalizing
		}
		else if (typeof args[i] === 'string') {
			convertedArg = USER_STRINGS[<string>args[i]]; // look up strings in the resource file
		}
		else if (typeof args[i] == 'number') {
			if (args[i] === 0) {
				convertedArg = "0"; // zeros get formatted like so
			}
			else { // and other numbers are formatted like so
				const magnitude = Math.pow(10, Math.floor(Math.log10(<number>args[i])) - 3); // determine its order of magnitude
				const value = Math.round(<number>args[i]/magnitude)*magnitude; // round to three decimal points below that
				convertedArg = value.toString().split("").reverse().join(""); // reverse it
				convertedArg = convertedArg.replace(/(\d\d\d)(\d)/g, '$1 $2').replace(/,$/, ''); // add thousands separators
				convertedArg = convertedArg.split("").reverse().join(""); // reverse it back
			}
		}
		else if (args[i] instanceof Array) {
			convertedArg = (<Name[]>args[i]).map((n: Name) => n.toString()).join(" and ");
		}
		if (convertedArg === undefined) // do Javascript's job for it
			throw new Error(`Could not find user string in resource file for ${args[i]}`);
		format = format.replace(`{${i}}`, convertedArg); // then slot it in
	}
	return format;
}
