/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Name} from "../language/name.js";

import EN_STRINGS from "../../resources/translations/en.js";
import ES_STRINGS from "../../resources/translations/es.js";
import JA_STRINGS from "../../resources/translations/ja.js";
import PD_STRINGS from "../../resources/translations/pd.js";
import {enforceGrammaticalAgreement, formatNumber} from "../utilities/miscellaneus.js";


const USER_STRINGS: { [index: string]: { [index: string]: string } } = {
	en: EN_STRINGS,
	es: ES_STRINGS,
	ja: JA_STRINGS,
	pd: PD_STRINGS,
};


/**
 * cast the given args to user strings (with a fixed format specificacion) and add them to
 * the given format in place of '{0}', '{1}', etc.  output will all ultimately be
 * extracted from USER_STRINGS.
 * @param language the language code for the language into which we want this localized
 * @param sentence the key for the encompassing phrase, or ".test" to just dump the arg
 * @param args the data to fill into the template.  there are a few different data types that get formatted differently.
 *               - strings will be treated as translation keys; the corresponding value from the translation file will be added.
 *               - numbers will be displayed as nice integers
 *               - Names will be transcribed using the given style
 *               - lists of strings will get concatenated with commas and "and"s between them
 * @param style the spelling style to use for any Names
 */
export function format(language: string, style: string, sentence: string, ...args: (string|number|Name|string[])[]): string {
	if (!USER_STRINGS[language].hasOwnProperty(sentence))
		throw new Error(`Could not find user string in resource file for ${sentence}`);
	let output = (sentence !== ".test") ? USER_STRINGS[language][sentence] : "{0}";
	for (let i = 0; i < args.length; i ++) { // loop thru the args and format each one
		let convertedArg: string;
		if (args[i] === null || args[i] === undefined) {
			if (output.includes(`{${i}}`))
				throw new Error(`${args[i]} was passd as the ${i}° argument.  this is only allowd when the argument is absent from the format string, which was not the case here.`);
			continue;
		}
		if (args[i] instanceof Name) {
			convertedArg = (<Name>args[i]).toString(style); // transcribe words using the specified style TODO: use the user-specified style TODO sometimes italicize instead of capitalizing
		}
		else if (typeof args[i] === 'string') {
			convertedArg = USER_STRINGS[language][<string>args[i]]; // look up strings in the resource file
		}
		else if (typeof args[i] == 'number') {
			convertedArg = formatNumber(<number>args[i]);
		}
		// for an array, list them out using a language-specific separator
		else if (args[i] instanceof Array) {
			const parts = <string[]>args[i];
			if (parts.length === 0)
				throw new Error(`this sentence needs to be rephrased if there are zero items: ${output.replace(`{${i}}`, "(none)")}`);
			else if (parts.length === 1)
				convertedArg = parts[0].toString();
			else if (parts.length === 2) {
				let and = format(language, style, 'grammar.and');
				convertedArg = parts[0] + and + parts[1];
			}
			else {
				const first_parts = parts.slice(0, parts.length - 1);
				const first_separator = format(language, style, 'grammar.comma');
				const last_part = parts[parts.length - 1];
				let last_separator = format(language, style, 'grammar.comma_and');
				convertedArg = first_parts.join(first_separator) + last_separator + last_part;
			}
		}
		if (convertedArg === undefined) // do Javascript's job for it
			throw new Error(`Could not find user string in resource file for ${args[i]}`);
		output = output.replaceAll(`{${i}}`, convertedArg); // then slot it in
	}
	return enforceGrammaticalAgreement(output);
}
