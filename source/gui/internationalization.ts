/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import EN_STRINGS from "../../resources/translations/en.js";
import ES_STRINGS from "../../resources/translations/es.js";
import JA_STRINGS from "../../resources/translations/ja.js";


const USER_STRINGS: { [index: string]: { [index: string]: string } } = {
	en: EN_STRINGS,
	es: ES_STRINGS,
	ja: JA_STRINGS,
};


const VOWELS = /[aeiouáéíóúäạåæëẹəïịɨöọœüụỵаиоуыэアイウエオ]/i;
const FRONT_HIGH_VOWELS = /[iíïịɨиイ]/i;
const SILENT_LETTERS = /[hʕʻ]/i;
const IRREGULAR_FEMININE_NOUNS = ["clave", "fuente"];
const IRREGULAR_MASCULINE_NOUNS = ["mapa"];

/**
 * convert the given string key to a translated user string extracted from USER_STRINGS.
 * @param key the key to look up in the translation JSON file
 * @param language the current user language.  unfortunately we can't read it from the DOM because this function sometimes needs to be called from the Worker thread, which can't access the DOM.
 */
export function localize(key: string, language: string): string {
	if (!USER_STRINGS[language].hasOwnProperty(key))
		throw new Error(`Could not find user string in resource file for ${key}`);
	else
		return USER_STRINGS[language][key];
}

/**
 * convert a list to a nicely formatted string using the relevant language
 * @param items
 * @param language
 */
export function formatList(items: string[], language: string): string {
	if (items.length === 0)
		throw new Error("this sentence needs to be rephrased if there are zero items.");
	else if (items.length === 1)
		return items[0].toString();
	else if (items.length === 2) {
		let and = localize('grammar.and', language);
		return items[0] + and + items[1];
	}
	else {
		const first_parts = items.slice(0, items.length - 1);
		const first_separator = localize('grammar.comma', language);
		const last_part = items[items.length - 1];
		let last_separator = localize( 'grammar.comma_and', language);
		return first_parts.join(first_separator) + last_separator + last_part;
	}
}

/**
 * add the given args to
 * the given format in place of '{0}', '{1}', etc.  output will all ultimately be
 * extracted from USER_STRINGS.  it will also adjust any a(n)s or @s to make it grammatical.
 * @param sentence the encompassing phrase
 * @param args the data to fill into the template.
 */
export function format(sentence: string, ...args: (string|number|string[]|null)[]): string {
	for (let i = 0; i < args.length; i ++) { // loop thru the args and format each one
		let convertedArg: string;
		if (args[i] === null || args[i] === undefined) {
			if (sentence.includes(`{${i}}`))
				throw new Error(`${args[i]} was passd as the ${i}° argument.  this is only allowd when the argument is absent from the format string, which was not the case here.`);
			continue;
		}
		else if (typeof args[i] === 'string') {
			convertedArg = <string>args[i]; // look up strings in the resource file
		}
		else if (typeof args[i] == 'number') {
			convertedArg = formatNumber(<number>args[i]);
		}
		sentence = sentence.replaceAll(`{${i}}`, convertedArg); // then slot it in
	}
	return enforceGrammaticalAgreement(sentence);
}

/**
 * go through this string and replace "a(n)", "y/e", " "@"
 * @param phrase
 */
function enforceGrammaticalAgreement(phrase: string): string {
	// replace "a(n)" with either "a" or "an" depending on the next letter
	while (phrase.search(/a\(n\) /i) >= 0) {
		const i = phrase.search(/a\(n\) /i);
		if (phrase[i + 5].match(VOWELS))
			phrase = phrase.slice(0, i) + "an " + phrase.slice(i + 5);
		else
			phrase = phrase.slice(0, i) + "a " + phrase.slice(i + 5);
	}
	// replace "y/e" with either "y" or "e" depending on the next two letters
	while (phrase.search(/y\/e \S./i) >= 0) {
		const i = phrase.search(/y\/e \S./i);
		if (phrase[i + 4].match(FRONT_HIGH_VOWELS) ||
			(phrase[i + 4].match(SILENT_LETTERS) && phrase[i + 5].match(FRONT_HIGH_VOWELS)))
			phrase = phrase.slice(0, i) + "e " + phrase.slice(i + 4);
		else
			phrase = phrase.slice(0, i) + "y " + phrase.slice(i + 4);
	}
	// replace "@" with either "a" or "o" depending on the previus word
	while (phrase.search(/\S \S*@/i) >= 0) {
		const match = phrase.match(/\b((\S*[^s])s? \S*)@/i);
		const i = match.index + match[1].length;
		if (esFeminina(match[2]))
			phrase = phrase.slice(0, i) + "a" + phrase.slice(i + 1);
		else
			phrase = phrase.slice(0, i) + "o" + phrase.slice(i + 1);
	}
	// replace "(e)l(a)" with either "el" or "la" depending on the next word
	while (phrase.search(/\(e\)l\(a\) /i) >= 0) {
		const match = phrase.match(/\(e\)l\(a\) (\S*)\b/i);
		if (esFeminina(match[1]))
			phrase = phrase.slice(0, match.index) + "la" + phrase.slice(match.index + 7);
		else
			phrase = phrase.slice(0, match.index) + "el" + phrase.slice(match.index + 7);
	}
	// fix "de el" and "a el"
	phrase = phrase.replaceAll(/\bde el\b/g, "del");
	phrase = phrase.replaceAll(/\ba el\b/g, "al");
	return phrase;
}

/**
 * figure out the gender of this word in Spanish
 */
function esFeminina(palabra: string): boolean {
	if (IRREGULAR_FEMININE_NOUNS.includes(palabra))
		return true;
	else if (IRREGULAR_MASCULINE_NOUNS.includes(palabra))
		return false;
	else if (palabra.endsWith("a"))
		return true;
	else
		return false;
}

/**
 * nicely format a number (the result of this function looks way nicer than Number.toString)
 */
function formatNumber(number: number): string {
	if (number === 0) {
		return "0"; // zeros get formatted like so
	}
	else { // and other numbers are formatted like so
		const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(number)))); // determine its order of magnitude
		const precision = Math.max(magnitude/1e3, 1);
		const value = Math.round(number/precision)*precision; // round to three decimal points below that
		let digits = value.toString().split("").reverse().join(""); // reverse it
		if (magnitude >= 10000)
			digits = digits.replace(/(\d\d\d)/g, '$1 ').replace(/ $/, ''); // add thousands separators
		digits = digits.replace("-", "−");
		return digits.split("").reverse().join(""); // reverse it back
	}
}
