/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Klas, Loke, Longia, MinorLoke, Mode, Nosia, Quality, Silabia, Voze, Feature, Sound, Latia} from "./sound.js";
import {loadTSV} from "../utilities/fileio.js";


const MODIFIERS: {klas: Klas, baze: Feature[], kode: string}[] = [ // TODO: can I rearrange this to put the macron underneath the acute accent?
	{klas: new Klas([], [Quality.SPOKEN]), baze: [], kode: 'pause'},
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

const ENGLISH_REPLACEMENTS = loadTSV('rules_english.tsv');


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
 * @param lekse
 * @param style
 */
export function transcribe(lekse: Sound[], style: string): string {
	lekse = lekse.slice(); // first, handle some common orthographickal rules
	if (ORTHOGRAPHIC_FLAGS.get(style).get('diphthong as hiatus')) {
		for (let i = 0; i < lekse.length; i ++) // for this flag, go thru the original phonemick representacion
			if (lekse[i].is(Quality.HIGH)
				&& (i+1 >= lekse.length || lekse[i+1].is(Silabia.NONSYLLABIC))) // find glides in codas
				lekse[i] = new Klas([Silabia.UNSTRESSED]).apply(lekse[i]); // and change them to vowels
	}
	if (ORTHOGRAPHIC_FLAGS.get(style).get('velar nasal as coronal')) {
		for (let i = 0; i < lekse.length; i ++)
			if (lekse[i].is(Loke.VELAR) && lekse[i].is(Mode.NASAL) && i+1 < lekse.length
				&& lekse[i+1].is(Loke.VELAR) && lekse[i+1].is(Quality.OCCLUSIVE)) // find velar nasals followd by velar stops
				lekse[i] = new Klas([Loke.ALVEOLAR]).apply(lekse[i]); // and change them to be coronal
	}

	let asli = "";
	for (let i = 0; i < lekse.length; i ++)
		asli += lookUp(lekse[i], style); // form the inicial spelling by reading the transcripcion out of the table

	if (style === 'en') {
		let muti = "#"+asli+"#";
		for (const vise of ENGLISH_REPLACEMENTS) {
			for (let j = 1; j < vise.length; j ++) { // look through the replacements in ENGLI_VISE
				for (let i = muti.length; i >= 1; i --) { // ang go through the string
					if (i-vise[j].length >= 0 && muti.substring(i-vise[j].length, i) === vise[j])
						muti = muti.substring(0, i-vise[j].length) + vise[0] + muti.substring(i);
				}
			}
		}
		asli = muti.substring(1, muti.length-1);

		if (asli[asli.length-1] === 'ɦ' && '*–aeiouyw'.includes(asli[asli.length-2]))
			asli = asli.substring(0, asli.length-1) + "gh"; // replace word-final <h> with <gh>
		else if ('bcdfgjklmnpqrstvz'.includes(asli[asli.length-1]) && asli[asli.length-2] === '-')
			asli += 'ia'; // add <ia> when the last vowel needs to be long

		if (asli.length >= 3 &&
			'cfd'.includes(asli.charAt(asli.length-1)) &&
			'*' === asli.charAt(asli.length-2) &&
			(asli.length < 4 || !'aeiou'.includes(asli.charAt(asli.length-4)))) // double the final consonant if the word ends in a single short vowel followd by <c>, <f>, or <d>
			asli += asli.charAt(asli.length-1);

		muti = "";
		for (let i = 0; i < asli.length; i ++) {
			if (asli[i] === "c" &&
				((i+1 < asli.length && 'eiy'.includes(asli[i+1])) || i+1 === asli.length)) // use <k> before front vowels and at the ends of words
				muti += "k";
			else if (i+1 < asli.length && asli[i] === "j" && 'eiy'.includes(asli[i+1])) { // use <g> before front vowels when it is the last consonant in the word
				let harfe = "g";
				for (let j = i+1; j < asli.length; j ++) {
					if (!'aeiouy'.includes(asli[j])) {
						harfe = "j";
						break;
					}
				}
				muti += harfe;
			}
			else if (asli[i] === "ɦ" &&
				((i+1 < asli.length && !'aeiouyw'.includes(asli[i+1])) || (i-1 >= 0 && !'*–aeiouyw'.includes(asli[i-1])))) // remove <h> in consonant clusters
				muti += "";
			else if (asli[i] === "y") {
				if (i+1 === asli.length || (i+1 < asli.length && asli[i+1] === "i") || (i-1 >= 0 && asli[i-1] === "i")) // use <y> at the ends of words and adjacent to <i>
					muti += "y";
				else if ((i+1 < asli.length && !'aeiou'.includes(asli[i+1])) || (i-1 >= 0 && !'aeiou'.includes(asli[i-1]))) // use <i> adjacent to consonants
					muti += "i";
				else
					muti += "y";
			}
			else if (i+1 < asli.length && asli[i] === "w" && !"aeiouy".includes(asli[i+1])) // use <u> after vowels before consonants
				muti += "u";
			else if (asli[i] === '–') {
				if ((i+1 < asli.length && asli[i+1] === 'ɦ') ||
					(i+2 < asli.length && !'aeiouy'.includes(asli[i+1]) && !'aeiouy'.includes(asli[i+2])) ||
					(i+2 === asli.length && !'aeiouy'.includes(asli[i+1]))) // lengthen long vowels that look short
					muti += (asli[i-1] === 'a') ? 'i' : (asli[i-1] === 'o') ? 'u' : (asli[i-1] === 'i') ? '' : 'e';
			}
			else if (asli[i] === '*') {
				// if (i+2 < asli.length && !'aeiouy'.includes(asli[i+1]) && 'aeiouy'.includes(asli[i+2]))
				// 	muti += (asli[i+1] === 'k') ? 'c' : (asli[i+1] === 'j') ? '' : (asli[i+1] === 'h') ? '' : asli[i+1];
				// else if (i+1 < asli.length && asli[i] === 'i' && 'aeiouy'.includes(asli[i+1])) // double consonants when short vowels look long
				// 	muti = muti.substring(0, muti.length-1) + 'e';
			}
			else
				muti += asli[i];
		}
		asli = muti;

		for (const [ca, pa] of [[/cw/g, "qu"], [/[ck]s/g, "x"], [/yy/g, "y"], [/ww/g, "w"], [/sh[ck]/g, "sc"], [/ɦw/g, "wh"], [/ɦ/g, "h"]])
			asli = asli.replace(ca, <string> pa);
	}

	if (ORTHOGRAPHIC_FLAGS.get(style).get('capitalization')) { // finally, capitalize
		let muti = "";
		let startOfWord = true;
		for (let i = 0; i < asli.length; i ++) {
			muti += (startOfWord) ? asli[i].toUpperCase() : asli[i];

			if (startOfWord && muti[i] !== asli[i])
				startOfWord = false;
			if (asli[i] === ' ' || asli[i] === '-')
				startOfWord = true;
		}
		asli = muti;
	}

	return asli;
}
