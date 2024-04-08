/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Klas, Loke, Longia, MinorLoke, Mode, Nosia, Quality, Silabia, Voze, Feature, Sound, Latia} from "./sound.js";
import {loadTSV} from "../utilities/fileio.js";


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

const FROM_IPA: Map<string, Sound> = new Map(); // load the IPA table from static res
const TO_TEXT: Map<string, Map<string, string>> = new Map();
const TO_DIACRITICS: Map<string, Map<string, string>> = new Map();
const ORTHOGRAPHIC_FLAGS: Map<string, Map<string, boolean>> = new Map();
const LOKE_KODE = new Map([
	['bl', Loke.BILABIAL],
	['ld', Loke.LABIODENTAL],
	['d', Loke.DENTAL],
	['ar', Loke.ALVEOLAR],
	['pa', Loke.POSTALVEOLAR],
	['rf', Loke.RETROFLEX],
	['c',  Loke.PALATAL],
	['m',  Loke.CENTRAL],
	['v',  Loke.VELAR],
	['uv', Loke.UVULAR],
	['eg', Loke.EPIGLOTTAL],
	['gl', Loke.GLOTTAL],
]);
const MODE_KODE = new Map([
	['n', {mode: Mode.NASAL, voze: Voze.VOICED}],
	['p', {mode: Mode.STOP, voze: Voze.TENUIS}],
	['b', {mode: Mode.STOP, voze: Voze.VOICED}],
	['pf', {mode: Mode.AFFRICATE, voze: Voze.TENUIS}],
	['bv', {mode: Mode.AFFRICATE, voze: Voze.VOICED}],
	['f', {mode: Mode.FRICATE, voze: Voze.TENUIS}],
	['v', {mode: Mode.FRICATE, voze: Voze.VOICED}],
	['t', {mode: Mode.TAP, voze: Voze.VOICED}],
	['r', {mode: Mode.TRILL, voze: Voze.VOICED}],
	['a', {mode: Mode.CLOSE, voze: Voze.VOICED}],
	['1', {mode: Mode.NEAR_CLOSE, voze: Voze.VOICED}],
	['2', {mode: Mode.CLOSE_MID, voze: Voze.VOICED}],
	['3', {mode: Mode.OPEN_MID, voze: Voze.VOICED}],
	['4', {mode: Mode.NEAR_OPEN, voze: Voze.VOICED}],
	['5', {mode: Mode.OPEN, voze: Voze.VOICED}],
	['k!', {mode: Mode.CLICK, voze: Voze.TENUIS}],
	['g!', {mode: Mode.CLICK, voze: Voze.VOICED}],
]);
const harfiaTable = loadTSV('alphabet.tsv');
const header = harfiaTable[0];
for (const style of header) {
	TO_TEXT.set(style, new Map());
	TO_DIACRITICS.set(style, new Map());
	ORTHOGRAPHIC_FLAGS.set(style, new Map());
}
for (const row of harfiaTable.slice(1)) { // each row of the orthographick table tells us about the different available styles
	const grafeme = row.slice(0, header.length);
	const features = row.slice(header.length);
	if (features.length === 3) { // first we read all the phonemes and their transcripcions
		// s in element 0 means syllabic
		const silabia = features[0].includes('s') ? Silabia.UNSTRESSED : Silabia.NONSYLLABIC;
		// l in element 0 means lateral
		const latia = features[0].includes('l') ? Latia.LATERAL : Latia.MEDIAN;
		// w and v in element 0 mean labialized or velarized
		const aliSif = features[0].includes('w') ? MinorLoke.LABIALIZED : features[0].includes('v') ? MinorLoke.VELARIZED : MinorLoke.UNROUNDED;
		// element 1 indicates the place of articulation
		console.assert(LOKE_KODE.has(features[1]));
		const loke = LOKE_KODE.get(features[1]);
		// element 2 indicates the manner of articulation and voicing
		console.assert(MODE_KODE.has(features[2]));
		let {mode, voze} = MODE_KODE.get(features[2]);
		// but b in element 0 overrides the voicing to breathy
		if (features[0].includes('b'))
			voze = Voze.BREATHY;
		// put it all together in one record and store it in our IPA lookup tables
		const foneme = new Sound(mode, loke, voze, silabia, Longia.SHORT, latia, aliSif, Nosia.ORAL);
		for (let i = 0; i < header.length; i ++)
			TO_TEXT.get(header[i]).set(foneme.hash(), grafeme[i]);
		FROM_IPA.set(grafeme[header.indexOf('ipa')], foneme);
	}
	else if (features[0].match(/^!/)) { // then we read any special non-phonemic symbols
		for (let i = 0; i < header.length; i ++)
			TO_TEXT.get(header[i]).set(features[0].slice(1), grafeme[i]);
	}
	else if (features[0].match(/^\^/)) { // then we read the modifying features and their transcripcions
		for (let i = 0; i < header.length; i ++)
			TO_DIACRITICS.get(header[i]).set(features[0].slice(1), grafeme[i]);
	}
	else if (features[0].match(/^\?/)) { // then we read the special rules
		for (let i = 0; i < header.length; i ++)
			ORTHOGRAPHIC_FLAGS.get(header[i]).set(features[0].slice(1), grafeme[i] === 'y');
	}
	else {
		throw new Error(`incomprehensible orthographickal feature: ${features}`);
	}
}

const ENGLISH_REPLACEMENTS = loadTSV('rules_en.tsv');
const KATAKANA_TABLE = loadTSV('rules_ja.tsv');
const KATAKANA = new Map<string, Map<string, string>>();
for (const row of KATAKANA_TABLE) {
	KATAKANA.set(row[0], new Map<string, string>());
	for (let i = 0; i < 5; i ++)
		KATAKANA.get(row[0]).set("aiueo"[i], row[1 + i]);
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

	throw new Error(`I don't know how to write ${sound}`);
}

/**
 * convert a phonetic word to a unicode string somehow.
 * @param allSounds the array of sound-strings
 * @param style the transcription style to use
 */
export function transcribe(allSounds: Sound[][], style: string): string {
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
			for (let i = 0; i < sounds.length; i++)
				if (sounds[i].is(Loke.VELAR) && sounds[i].is(Mode.NASAL) && i + 1 < sounds.length
					&& sounds[i + 1].is(Loke.VELAR) && sounds[i + 1].is(Quality.OCCLUSIVE)) // find velar nasals followd by velar stops
					sounds[i] = new Klas([Loke.ALVEOLAR]).apply(sounds[i]); // and change them to be coronal
		}

		// form the inicial spelling by reading the transcripcion out of the table
		let symbols = "";
		for (const sound of sounds)
			symbols += lookUp(sound, style);

		// apply english spelling rules
		if (style === 'en') {
			symbols = "#" + symbols + "#";
			for (const vise of ENGLISH_REPLACEMENTS) {
				for (let j = 1; j < vise.length; j++) { // look through the replacements in ENGLI_VISE
					for (let i = symbols.length; i >= 1; i--) { // ang go through the string
						if (i - vise[j].length >= 0 && symbols.substring(i - vise[j].length, i) === vise[j])
							symbols = symbols.substring(0, i - vise[j].length) + vise[0] + symbols.substring(i);
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
					if (i - 1 >= 0 && "aiueoy".includes(symbols[i - 1]))
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
			for (let i = symbols.length; i >= 2; i --) {
				if (symbols[i - 1] === "y") {
					if (i >= symbols.length || !"aiueo".includes(symbols[i]))
						symbols = symbols.slice(0, i - 1) + "i" + symbols.slice(i);
					else if (i - 2 >= 0 && "tdcfwv".includes(symbols[i - 2]))
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
					console.log(symbols.charCodeAt(i));
					throw new Error(`invalid romaji input: ${symbols.slice(0, i)}[${symbols[i]}]${symbols.slice(i + 1)}`);
				}
				i --;
			}
			symbols = newSymbols.reverse().join("");
		}

		// finally, capitalize
		if (ORTHOGRAPHIC_FLAGS.get(style).get('capitalization')) {
			symbols = symbols[0].toUpperCase() + symbols.slice(1);
		}

		// add it to the main output
		allSymbols.push(symbols);
	}

	return allSymbols.join(TO_TEXT.get(style).get("pause"));
}
