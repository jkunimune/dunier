/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {
	Klas,
	Loke,
	Longia,
	MinorLoke,
	Mode,
	Nosia,
	Quality,
	Silabia,
	Voze,
	Feature,
	Sound,
	Latia,
	get_loke_from_name, get_mode_from_name
} from "./sound.js";

import HARFIA_TABLE from "../../resources/alphabet.js";
import ENGLISH_REPLACEMENTS from "../../resources/rules_en.js";
import KATAKANA_TABLE from "../../resources/rules_ja.js";


const MODIFIERS: {klas: Klas, baze: Feature[], kode: string}[] = [ // TODO: can I rearrange this to put the macron underneath the acute accent?
	{klas: new Klas([Longia.LONG], [Quality.VOWEL]), baze: [Longia.SHORT], kode: 'geminate'},
	{klas: new Klas([Longia.LONG, Quality.VOWEL]), baze: [Longia.SHORT], kode: 'long'},
	{klas: new Klas([Voze.ASPIRATED]), baze: [Voze.TENUIS], kode: 'aspirate'},
	{klas: new Klas([Voze.EJECTIVE]), baze: [Voze.TENUIS], kode: 'ejective'},
	{klas: new Klas([Loke.LINGUOLABIAL, Quality.LIQUID]), baze: [Loke.DENTAL, Loke.DENTAL], kode: 'linguolab'},
	{klas: new Klas([Loke.LINGUOLABIAL, Latia.LATERAL]), baze: [Loke.DENTAL, Loke.DENTAL], kode: 'linguolab'},
	{klas: new Klas([Loke.LINGUOLABIAL]), baze: [Loke.BILABIAL, Loke.DENTAL], kode: 'linguolab'},
	{klas: new Klas([Loke.LABIOCORONAL]), baze: [Loke.ALVEOLAR, Loke.BILABIAL], kode: 'double'},
	{klas: new Klas([Loke.LABIOVELAR]), baze: [Loke.VELAR, Loke.BILABIAL], kode: 'double'},
	{klas: new Klas([MinorLoke.PALATALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'palataliz'},
	{klas: new Klas([MinorLoke.PHARYNGEALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'pharyngealiz'},
	{klas: new Klas([MinorLoke.VELARIZED]), baze: [MinorLoke.UNROUNDED], kode: 'velariz'},
	{klas: new Klas([Silabia.PRIMARY_STRESSED]), baze: [Silabia.UNSTRESSED], kode: 'primary'},
	{klas: new Klas([Silabia.SECONDARY_STRESSED]), baze: [Silabia.UNSTRESSED], kode: 'secondary'},
	{klas: new Klas([Nosia.NASALIZED, Quality.VOCOID]), baze: [Nosia.ORAL], kode: 'nasaliz'},
	{klas: new Klas([Nosia.NASALIZED], [Quality.VOCOID]), baze: [Mode.NASAL, Nosia.ORAL], kode: 'prenasaliz'},
	{klas: new Klas([Voze.BREATHY]), baze: [Voze.VOICED], kode: 'breathy'},
	{klas: new Klas([Voze.TENUIS, Quality.SONORANT]), baze: [Voze.VOICED], kode: 'devoice'},
	{klas: new Klas([Quality.GLIDE]), baze: [Silabia.UNSTRESSED], kode: 'glide'},
	{klas: new Klas([MinorLoke.LABIALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'labializ'},
	{klas: new Klas([Quality.SYLLABIC], [Quality.VOCOID]), baze: [Silabia.NONSYLLABIC], kode: 'syllabic'},
	{klas: new Klas([Mode.AFFRICATE]), baze: [Mode.STOP, Mode.FRICATE], kode: 'affricate'},
	{klas: new Klas([Mode.CLOSE]), baze: [Mode.FRICATE], kode: 'approx'},
];


// each collum of the orthographic table tells us about a different available style
const styles = HARFIA_TABLE.styles;
// first we read all the phonemes and their transcripcions
const TO_TEXT: Map<string, Map<string, string>> = new Map();
const FROM_IPA: Map<string, Sound> = new Map(); // load the IPA table from static res
for (const style of styles)
	TO_TEXT.set(style, new Map());
for (const {features, symbols} of HARFIA_TABLE.sounds) {
	// element 0 indicates the place of articulation
	const loke = get_loke_from_name(features[0]);
	// element 1 indicates the manner of articulation and voicing
	let mode = get_mode_from_name(features[1]);
	// the other elements modify voicing, syllabicity, laterality, or secondary articulation
	let voze = Voze.VOICED, silabia = Silabia.NONSYLLABIC;
	let latia = Latia.MEDIAN, aliSif = MinorLoke.UNROUNDED;
	for (const feature of features.slice(2)) {
		if (feature === "voiceless")
			voze = Voze.TENUIS;
		else if (feature === "breathy")
			voze = Voze.BREATHY;
		else if (feature === "vowel")
			silabia = Silabia.UNSTRESSED;
		else if (feature === "lateral")
			latia = Latia.LATERAL;
		else if (feature === "rounded")
			aliSif = MinorLoke.LABIALIZED;
		else if (feature === "velarized")
			aliSif = MinorLoke.VELARIZED;
		else
			throw new Error(`unrecognized phonetic feature: ${feature}`);
	}
	// put it all together in one record and store it in our IPA lookup tables
	const foneme = new Sound(mode, loke, voze, silabia, Longia.SHORT, latia, aliSif, Nosia.ORAL);
	for (let i = 0; i < symbols.length; i++)
		TO_TEXT.get(styles[i]).set(foneme.hash(), symbols[i]);
	FROM_IPA.set(symbols[styles.indexOf('ipa')], foneme);
}
// then we read any special non-phonemic symbols
for (const {name, symbols} of HARFIA_TABLE.suprasegmentals)
	for (let i = 0; i < symbols.length; i ++)
		TO_TEXT.get(styles[i]).set(name, symbols[i]);
// then we read the modifying features and their transcripcions
const TO_DIACRITICS: Map<string, Map<string, string>> = new Map();
for (const style of styles)
	TO_DIACRITICS.set(style, new Map());
for (const {name, symbols} of HARFIA_TABLE.modifiers)
	for (let i = 0; i < symbols.length; i ++)
		TO_DIACRITICS.get(styles[i]).set(name, symbols[i]);
// then we read the special rules
const ORTHOGRAPHIC_FLAGS: Map<string, Map<string, boolean>> = new Map();
for (const style of styles)
	ORTHOGRAPHIC_FLAGS.set(style, new Map());
for (const {name, values} of HARFIA_TABLE.flags)
	for (let i = 0; i < values.length; i ++)
		ORTHOGRAPHIC_FLAGS.get(styles[i]).set(name, values[i]);

// convert the loaded katakana table to a 2D map
const KATAKANA = new Map<string, Map<string, string>>();
for (const column of KATAKANA_TABLE.columns) {
	KATAKANA.set(column.consonant, new Map<string, string>());
	for (let i = 0; i < column.kana.length; i ++)
		KATAKANA.get(column.consonant).set(KATAKANA_TABLE.vowels[i], column.kana[i]);
}


/**
 * get a phoneme from its IPA representation, or return null if it is not found.
 * @param ipa the symbol to put in the lookup table
 */
export function ipaSymbol(ipa: string): Sound {
	if (FROM_IPA.has(ipa))
		return FROM_IPA.get(ipa);
	else
		return null;
}

/**
 * get a phoneme array from its IPA representation
 * @param ipa the characters to put in the lookup table
 */
export function ipa(ipa: string): Sound[] {
	const output: Sound[] = [];
	for (let i = 0; i < ipa.length; i ++) {
		if (FROM_IPA.has(ipa.charAt(i)))
			output.push(FROM_IPA.get(ipa.charAt(i)));
		else
			throw new Error(`could not interpret '${ipa.charAt(i)}' as an IPA symbol`);
	}
	return output;
}

/**
 * get an orthographical representation from a phoneme
 * @param sound the sound to look up
 * @param style the romanization convention in which to look this up
 * @param level the number of diacritics we have already checkd (don't check them again)
 */
function lookUp(sound: Sound, style: string, level: number = 0): string {
	if (!TO_TEXT.has(style))
		throw new Error(`there is no such transcripcion style as ${style}`);
	if (TO_TEXT.get(style).has(sound.hash())) // if it's in the table
		return TO_TEXT.get(style).get(sound.hash()); // just return that

	for (let i = level; i < MODIFIERS.length; i ++) { // if not, look through the diacritics
		const {klas, baze, kode} = MODIFIERS[i];
		if (klas.matches(sound)) { // to see if there's one that will help
			const baziFon = [];
			for (const feature of baze)
				baziFon.push(sound.with(feature)); // if so, simplify the foneme

			console.assert(TO_DIACRITICS.get(style).has(kode), kode); // (do JavaScript's job for it)
			const diacritic = TO_DIACRITICS.get(style).get(kode); // and apply the diacritic
			let graf = diacritic;
			if (diacritic.includes('X') || diacritic.includes('x')) {
				let X = lookUp(baziFon[0], style, i + 1);
				graf = graf.replace('X', X);
				if (diacritic.includes('x')) {
					let x = X.slice(0, 1);
					if (baziFon[0].mode === Mode.AFFRICATE)
						x = lookUp(baziFon[0].with(Mode.STOP), style, i + 1).slice(0, 1);
					graf = graf.replace('x', x);
				}
			}
			if (diacritic.includes('Y')) {
				let Y = lookUp(baziFon[1], style, i + 1);
				graf = graf.replace('Y', Y);
			}
			return graf;
		}
	}

	console.log(level);
	console.log(sound);
	console.log(MODIFIERS[20].klas.matches(sound));
	console.log(sound.with(MODIFIERS[20].baze[0]));
	throw new Error(`I don't know how to write ${sound}`);
}

/**
 * convert a phonetic word to a unicode string somehow.
 * @param allSounds the array of sound-strings
 * @param style the transcription style to use
 */
export function transcribe(allSounds: Sound[][], style: string): string {
	if (!ORTHOGRAPHIC_FLAGS.has(style))
		throw new Error(`there is no such transcription style as '${style}'.`);
	let allSymbols = [];
	for (let sounds of allSounds) {
		// start by making our own copy of each part
		sounds = sounds.slice();

		// handle some common orthographickal rules
		if (ORTHOGRAPHIC_FLAGS.get(style).get('diphthong as hiatus')) {
			for (let i = 0; i < sounds.length; i++) // for this flag, go thru the original phonemick representacion
				if (sounds[i].is(Quality.HIGH)
					&& (i + 1 >= sounds.length || sounds[i + 1].is(Silabia.NONSYLLABIC))) // find glides in codas
					sounds[i] = new Klas([Silabia.UNSTRESSED]).apply(sounds[i]); // and change them to vowels
		}
		if (ORTHOGRAPHIC_FLAGS.get(style).get('velar nasal as coronal')) {
			for (let i = 0; i < sounds.length - 1; i++)
				if (sounds[i].is(Loke.VELAR) && sounds[i].is(Mode.NASAL)
					&& sounds[i + 1].is(Loke.VELAR) && sounds[i + 1].is(Quality.OCCLUSIVE)) // find velar nasals followd by velar stops
					sounds[i] = new Klas([Loke.ALVEOLAR]).apply(sounds[i]); // and change them to be coronal
		}
		if (ORTHOGRAPHIC_FLAGS.get(style).get('chain nasalized vocoids')) {
			for (let i = 0; i < sounds.length - 1; i++)
				if (sounds[i].is(Quality.VOCOID) && sounds[i].is(Nosia.NASALIZED) && sounds[i + 1].is(Quality.NASAL)) // find nasalized vocoids followd by other nasal sounds
					sounds[i] = new Klas([Nosia.ORAL]).apply(sounds[i]); // and change them to be not nasalized
		}
		if (ORTHOGRAPHIC_FLAGS.get(style).get('monosyllabic word as unstressed')) {
			let syllables = [];
			for (let i = 0; i < sounds.length; i ++)
				if (sounds[i].is(Quality.SYLLABIC))
					syllables.push(i);
			if (syllables.length === 1)
				for (const i of syllables)
					sounds[i] = new Klas([Silabia.UNSTRESSED]).apply(sounds[i]);
		}

		// form the inicial spelling by reading the transcripcion out of the table
		let symbols = "";
		for (const sound of sounds)
			symbols += lookUp(sound, style);

		// apply russian spelling rules
		if (style === 'ru') {
			// a soft-sign turns ш into щ
			symbols = symbols.replace(/шь/, "щь");
			// a soft-sign or й merges with a following vowel
			symbols = symbols.replace(/[йь]а/g, "я");
			symbols = symbols.replace(/[йь]э/g, "е");
			symbols = symbols.replace(/[йь]о/g, "ё");
			symbols = symbols.replace(/[йь]ы/g, "и");
			symbols = symbols.replace(/[йь]у/g, "ю");
			// an и softens the following vowel (except э and ы)
			symbols = symbols.replace(/и(́?)а/g, "и$1я");
			symbols = symbols.replace(/и(́?)о/g, "и$1ё");
			symbols = symbols.replace(/и(́?)у/g, "и$1ю");
			// й must be adjacent to a vowel or becomes и
			symbols = symbols.replace(/([^аеёиоуыэюя])й([^аеёиоуыэюя])/g, "$1и$2");
			// э is only used at the starts of words
			symbols = symbols.replace(/(.)э/, "$1е");
		}
		// apply spanish spelling rules
		if (style === 'es') {
			// change y to i adjacent to consonants
			symbols = symbols.replace(/([^aeioú])y/g, "$1i");
			symbols = symbols.replace(/y([^aeioú])/g, "i$1");
			// remove duplicate letters
			for (let i = symbols.length - 1; i >= 1; i --)
				if (symbols[i - 1] === symbols[i])
					symbols = symbols.slice(0, i - 1) + symbols.slice(i);
			for (let i = symbols.length - 1; i >= 2; i --)
				if (symbols[i - 1] === "́" && symbols[i - 2] === symbols[i]) // watch out for the combining diacritics
					symbols = symbols.slice(0, i) + symbols.slice(i + 1);
			// change combining diacritics to special characters (because ú should behave differently from u)
			symbols = symbols.replace(/á/g, "á");
			symbols = symbols.replace(/é/g, "é");
			symbols = symbols.replace(/í/g, "í");
			symbols = symbols.replace(/ó/g, "ó");
			symbols = symbols.replace(/ú/g, "ú");
			// add a consonant before prevocalic u and i
			symbols = symbols.replace(/^([iu][aeiouáéíóú])/g, "h$1");
			symbols = symbols.split("").reverse().join("")
				.replace(/([aeiouáéíóú][iu])([aeiouáéíóú])/g, "$1h$2")
				.split("").reverse().join(""); // (this part needs to be done back-to-front, hence the reversal)
			// change gui to güi, gi to gui, ci to qui, and zi to ci
			symbols = symbols.replace(/gu([ieíé])/g, "gü$1");
			symbols = symbols.replace(/g([ieíé])/g, "gu$1");
			symbols = symbols.replace(/c([ieíé])/g, "qu$1");
			symbols = symbols.replace(/z([ieíé])/g, "c$1");
		}
		// apply english spelling rules
		else if (style === 'en') {
			symbols = "#" + symbols + "#";
			for (const vise of ENGLISH_REPLACEMENTS) {
				for (const pattern of vise.patterns) { // look through the replacements in ENGLI_VISE
					for (let i = symbols.length; i >= 1; i--) { // ang go through the string
						if (i - pattern.length >= 0 && symbols.substring(i - pattern.length, i) === pattern)
							symbols = symbols.substring(0, i - pattern.length) + vise.result + symbols.substring(i);
					}
				}
			}
			symbols = symbols.substring(1, symbols.length - 1);

			if (symbols[symbols.length - 1] === 'ɦ' && '*–aeiouyw'.includes(symbols[symbols.length - 2]))
				symbols = symbols.substring(0, symbols.length - 1) + "gh"; // replace word-final <h> with <gh>
			else if ('bcdfgjklmnpqrstvz'.includes(symbols[symbols.length - 1]) && symbols[symbols.length - 2] === '-')
				symbols += 'ia'; // add <ia> when the last vowel needs to be long

			if (symbols.length >= 3 &&
				'cfd'.includes(symbols.charAt(symbols.length - 1)) &&
				'*' === symbols.charAt(symbols.length - 2) &&
				(symbols.length < 4 || !'aeiou'.includes(symbols.charAt(symbols.length - 4)))) // double the final consonant if the word ends in a single short vowel followd by <c>, <f>, or <d>
				symbols += symbols.charAt(symbols.length - 1);

			let newSymbol = "";
			for (let i = 0; i < symbols.length; i++) {
				if (symbols[i] === "c" &&
					((i + 1 < symbols.length && 'eiy'.includes(symbols[i + 1])) || i + 1 === symbols.length)) // use <k> before front vowels and at the ends of words
					newSymbol += "k";
				else if (i + 1 < symbols.length && symbols[i] === "j" && 'eiy'.includes(symbols[i + 1])) { // use <g> before front vowels when it is the last consonant in the word
					let harfe = "g";
					for (let j = i + 1; j < symbols.length; j++) {
						if (!'aeiouy'.includes(symbols[j])) {
							harfe = "j";
							break;
						}
					}
					newSymbol += harfe;
				} else if (symbols[i] === "ɦ" &&
					((i + 1 < symbols.length && !'aeiouyw'.includes(symbols[i + 1])) || (i - 1 >= 0 && !'*–aeiouyw'.includes(symbols[i - 1])))) // remove <h> in consonant clusters
					newSymbol += "";
				else if (symbols[i] === "y") {
					if (i + 1 === symbols.length || (i + 1 < symbols.length && symbols[i + 1] === "i") || (i - 1 >= 0 && symbols[i - 1] === "i")) // use <y> at the ends of words and adjacent to <i>
						newSymbol += "y";
					else if ((i + 1 < symbols.length && !'aeiou'.includes(symbols[i + 1])) || (i - 1 >= 0 && !'aeiou'.includes(symbols[i - 1]))) // use <i> adjacent to consonants
						newSymbol += "i";
					else
						newSymbol += "y";
				} else if (i + 1 < symbols.length && symbols[i] === "w" && !"aeiouy".includes(symbols[i + 1])) // use <u> after vowels before consonants
					newSymbol += "u";
				else if (symbols[i] === '–') {
					if ((i + 1 < symbols.length && symbols[i + 1] === 'ɦ') ||
						(i + 2 < symbols.length && !'aeiouy'.includes(symbols[i + 1]) && !'aeiouy'.includes(symbols[i + 2])) ||
						(i + 2 === symbols.length && !'aeiouy'.includes(symbols[i + 1]))) // lengthen long vowels that look short
						newSymbol += (symbols[i - 1] === 'a') ? 'i' : (symbols[i - 1] === 'o') ? 'u' : (symbols[i - 1] === 'i') ? '' : 'e';
				} else if (symbols[i] === '*') {
					// if (i+2 < graphs.length && !'aeiouy'.includes(graphs[i+1]) && 'aeiouy'.includes(graphs[i+2]))
					// 	muti += (graphs[i+1] === 'k') ? 'c' : (graphs[i+1] === 'j') ? '' : (graphs[i+1] === 'h') ? '' : graphs[i+1];
					// else if (i+1 < graphs.length && graphs[i] === 'i' && 'aeiouy'.includes(graphs[i+1])) // double consonants when short vowels look long
					// 	muti = muti.substring(0, muti.length-1) + 'e';
				} else
					newSymbol += symbols[i];
			}
			symbols = newSymbol;

			// make some final replacements
			for (const [ca, pa] of [[/cw/g, "qu"], [/[ck]s/g, "x"], [/yy/g, "y"], [/ww/g, "w"], [/sh[ck]/g, "sc"], [/ɦw/g, "wh"], [/ɦ/g, "h"]])
				symbols = symbols.replace(ca, <string>pa);
		}
		// apply japanese spelling rules
		else if (style === "ja") {
			// convert iy and uw to long vowels
			for (let i = 2; i < symbols.length + 1; i ++) {
				if (i >= symbols.length || !"aiueo".includes(symbols[i])) {
					if (symbols[i - 2] === "i" && symbols[i - 1] === "y")
						symbols = symbols.slice(0, i - 1) + "ー" + symbols.slice(i);
					else if (symbols[i - 2] === "u" && symbols[i - 1] === "w")
						symbols = symbols.slice(0, i - 1) + "ー" + symbols.slice(i);
				}
			}
			// if there happen to be double consonants, replace them with ッ
			for (let i = symbols.length - 1; i >= 1; i --) {
				if (symbols[i - 1] === symbols[i])
					if (!"aiueo".includes(symbols[i]))
						symbols = symbols.slice(0, i - 1) + "ッ" + symbols.slice(i);
			}
			// ッ is only valid between a vowel and an obstruent
			for (let i = symbols.length; i >= 1; i --) {
				if (symbols[i - 1] === "ッ") {
					if (i - 2 < 0 || !"aiueoy".includes(symbols[i - 2]) || i >= symbols.length)
						symbols = symbols.slice(0, i - 1) + symbols.slice(i);
					else if ("yrwvッンー".includes(symbols[i]))
						symbols = symbols.slice(0, i - 1) + symbols.slice(i);
					else if ("nm".includes(symbols[i]))
						symbols = symbols.slice(0, i - 1) + "ン" + symbols.slice(i);
				}
			}
			// superscript n means add an ン if it's after a vowel but omit it otherwise
			for (let i = symbols.length - 1; i >= 0; i --) {
				if (symbols[i] === "ⁿ") {
					if (i - 1 >= 0 && "aiueo".includes(symbols[i - 1]))
						symbols = symbols.slice(0, i) + "ン" + symbols.slice(i + 1);
					else
						symbols = symbols.slice(0, i) + symbols.slice(i + 1);
				}
			}
			// convert excess n to ン
			for (let i = 1; i < symbols.length + 1; i ++)
				if (symbols[i - 1] === "n" && (i >= symbols.length || !"aiueoy".includes(symbols[i])))
					symbols = symbols.slice(0, i - 1) + "ン" + symbols.slice(i);
			// insert vowels between adjacent consonants
			for (let i = symbols.length; i >= 1; i --) {
				if (!"aiueoyッンー".includes(symbols[i - 1]) && (i >= symbols.length || !"aiueoy".includes(symbols[i]))) {
					let vowel;
					if (i < symbols.length && symbols[i] === "w" && (i + 1 >= symbols.length || symbols[i + 1] !== "a"))
						vowel = "u"; // u if we're going to need to use it as a stand-in for w
					else if ("tdh".includes(symbols[i - 1]))
						vowel = "o"; // o if it's after t
					else if ("qj".includes(symbols[i - 1]))
						vowel = "i"; // i if it's after ch or j
					else
						vowel = "u"; // u for everything else
					symbols = symbols.slice(0, i) + vowel + symbols.slice(i);
				}
			}
			// expand eligible small ャ, ュ, ョ, and ェ
			for (let i = symbols.length - 1; i >= 2; i --) {
				if (!"aiueotdcfywvッンー".includes(symbols[i - 2]) && symbols[i - 1] === "y" && "aiueo".includes(symbols[i])) {
					const nucleus = KATAKANA.get("ʸ").get(symbols[i]);
					symbols = symbols.slice(0, i - 1) + "i" + nucleus + symbols.slice(i + 1);
				}
			}
			// convert invalid y to i or remove it
			for (let i = symbols.length; i >= 1; i --) {
				if (symbols[i - 1] === "y") {
					if (i >= symbols.length || !"aiueo".includes(symbols[i]))
						symbols = symbols.slice(0, i - 1) + "i" + symbols.slice(i);
					else if (i - 2 >= 0 && !"aiueoンー".includes(symbols[i - 2]))
						symbols = symbols.slice(0, i - 1) + "i" + symbols.slice(i - 1);
				}
			}
			// remove glides to prevent superfluus compound characters (e.g. iye -> ie)
			for (let i = symbols.length - 1; i >= 2; i --) {
				if (symbols[i - 2] === "u" && symbols[i - 1] === "w" && "ieo".includes(symbols[i]))
					symbols = symbols.slice(0, i - 1) + symbols.slice(i);
				else if (symbols[i - 2] === "i" && symbols[i - 1] === "y" && symbols[i] === "e")
					symbols = symbols.slice(0, i - 1) + symbols.slice(i);
			}
			// convert the romaji to katakana
			let i = symbols.length - 1;
			let newSymbols = [];
			while (i >= 0) {
				if ("aiueo".includes(symbols[i])) {
					const vowel = symbols[i];
					let consonant = "";
					if (KATAKANA.has(symbols[i - 1])) {
						i--;
						consonant = symbols[i];
					}
					newSymbols.push(KATAKANA.get(consonant).get(vowel));
				}
				else if ("ッンーャュェョ".includes(symbols[i])) {
					newSymbols.push(symbols[i]);
				}
				else {
					throw new Error(`invalid romaji input: /${transcribe([sounds], "ipa")}/ -> '${symbols.slice(0, i)}[${symbols[i]}]${symbols.slice(i + 1)}'`);
				}
				i --;
			}
			symbols = newSymbols.reverse().join("");
		}

		// finally, capitalize
		if (ORTHOGRAPHIC_FLAGS.get(style).get('capitalization')) {
			for (let i = 0; i < symbols.length; i ++)
				if (symbols[i] !== symbols[i].toUpperCase()) {
					symbols = symbols.slice(0, i) + symbols[i].toUpperCase() + symbols.slice(i + 1);
					break;
				}
		}

		// add it to the main output
		allSymbols.push(symbols);
	}

	return allSymbols.join(TO_TEXT.get(style).get("pause"));
}
