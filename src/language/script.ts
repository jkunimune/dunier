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
import {Klas, Loke, Longia, MinorLoke, Mode, Nosia, PendaniSif, Silabia, Voze, Sif, Fon, Latia} from "./sound.js";
import {loadTSV} from "../util/fileio.js";

const NUM_STYLES = 11;
/** transcription systems */
export enum Style {
	NASOMEDI,
	LATINI,
	ESPANI,
	ENGLI,
	RUSI,
	NIPONI,
	PANDUNI,
	CHANSAGI_0,
	CHANSAGI_1,
	CHANSAGI_2,
	CHANSAGI_3,
}


const MODIFIERS: {klas: Klas, baze: Sif[], kode: string}[] = [ // TODO: can I rearrange this to put the macron underneath the acute accent?
	{klas: new Klas([], [PendaniSif.SPOKEN]), baze: [], kode: 'Pau'},
	{klas: new Klas([Longia.LONG, Silabia.NONSYLLABIC]), baze: [Longia.SHORT], kode: 'Gem'},
	{klas: new Klas([Longia.LONG], [Silabia.NONSYLLABIC]), baze: [Longia.SHORT], kode: 'Len'},
	{klas: new Klas([Voze.ASPIRATED]), baze: [Voze.TENUIS], kode: 'Asp'},
	{klas: new Klas([Voze.EJECTIVE]), baze: [Voze.TENUIS], kode: 'Ejt'},
	{klas: new Klas([Loke.LINGUOLABIAL, PendaniSif.LIQUID]), baze: [Loke.DENTAL, Loke.DENTAL], kode: 'LnL'},
	{klas: new Klas([Loke.LINGUOLABIAL]), baze: [Loke.BILABIAL, Loke.DENTAL], kode: 'LnL'},
	{klas: new Klas([Loke.LABIOCORONAL]), baze: [Loke.ALVEOLAR, Loke.BILABIAL], kode: 'Dbl'},
	{klas: new Klas([Loke.LABIOVELAR]), baze: [Loke.VELAR, Loke.BILABIAL], kode: 'Dbl'},
	{klas: new Klas([MinorLoke.PALATALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'Pal'},
	{klas: new Klas([MinorLoke.PHARYNGEALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'Pha'},
	{klas: new Klas([MinorLoke.VELARIZED]), baze: [MinorLoke.UNROUNDED], kode: 'Vel'},
	{klas: new Klas([Silabia.PRIMARY_STRESSED]), baze: [Silabia.UNSTRESSED], kode: 'St1'},
	{klas: new Klas([Silabia.SECONDARY_STRESSED]), baze: [Silabia.UNSTRESSED], kode: 'St2'},
	{klas: new Klas([Nosia.NASALIZED, PendaniSif.VOCOID]), baze: [Nosia.ORAL], kode: 'Nas'},
	{klas: new Klas([Nosia.NASALIZED], [PendaniSif.VOCOID]), baze: [Mode.NASAL, Nosia.ORAL], kode: 'PrN'},
	{klas: new Klas([Voze.BREATHY]), baze: [Voze.VOICED], kode: 'Bre'},
	{klas: new Klas([Voze.TENUIS, PendaniSif.SONORANT]), baze: [Voze.VOICED], kode: 'Dev'},
	{klas: new Klas([PendaniSif.GLIDE]), baze: [Silabia.UNSTRESSED], kode: 'Gli'},
	{klas: new Klas([MinorLoke.LABIALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'Lab'},
	{klas: new Klas([PendaniSif.SYLLABIC], [PendaniSif.VOCOID]), baze: [Silabia.NONSYLLABIC], kode: 'Syl'},
	{klas: new Klas([Mode.AFFRICATE]), baze: [Mode.STOP, Mode.FRICATE], kode: 'Aff'},
	{klas: new Klas([Mode.CLOSE]), baze: [Mode.FRICATE], kode: 'Prx'},
]

const FROM_IPA: Map<string, Fon> = new Map(); // load the IPA table from static res
const TO_TEXT: Map<string, string[]> = new Map();
const TO_DIACRITICS: Map<string, string[]> = new Map();
const ORTHOGRAPHIC_FLAGS: Map<string, boolean[]> = new Map();
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
for (const row of harfiaTable) { // each row of the orthographick table tells us about the different available conventions
	const grafeme = row.slice(0, NUM_STYLES);
	const sif = row.slice(NUM_STYLES);
	if (sif.length === 3) { // first we read all the phonemes and their transcripcions
		const silabia = sif[0].includes('s') ? Silabia.UNSTRESSED : Silabia.NONSYLLABIC;
		const latia = sif[0].includes('l') ? Latia.LATERAL : Latia.MEDIAN;
		const aliSif = sif[0].includes('w') ? MinorLoke.LABIALIZED : sif[0].includes('v') ? MinorLoke.VELARIZED : MinorLoke.UNROUNDED;
		const loke = LOKE_KODE.get(sif[1]);
		const {mode, voze} = MODE_KODE.get(sif[2]);
		const foneme = new Fon(mode, loke, voze, silabia, Longia.SHORT, latia, aliSif, Nosia.ORAL);
		FROM_IPA.set(grafeme[0], foneme);
		TO_TEXT.set(foneme.hash(), grafeme);
	}
	else if (sif[0].match(/^[A-Z]/)) { // then we read the modifying features and their transcripcions
		TO_DIACRITICS.set(sif[0], grafeme);
	}
	else if (sif[0].match(/^\?/)) { // then we read the special rules
		ORTHOGRAPHIC_FLAGS.set(sif[0].slice(1),
			grafeme.map((value: string) => (value === 'y')));
	}
	else {
		throw `incomprehensible orthographickal feature: ${sif}`;
	}
}

const ENGLI_VISE = loadTSV('kanune-engli.tsv')


/**
 * get a phoneme from its IPA representation, or return null if it is not found.
 * @param ipa the symbol to put in the lookup table
 */
export function ipaSymbol(ipa: string): Fon {
	if (FROM_IPA.has(ipa))
		return FROM_IPA.get(ipa);
	else
		return null;
}

/**
 * get a phoneme array from its IPA representation
 * @param ipa the characters to put in the lookup table
 */
export function ipa(ipa: string): Fon[] {
	const output: Fon[] = [];
	for (let i = 0; i < ipa.length; i ++) {
		if (FROM_IPA.has(ipa.charAt(i)))
			output.push(FROM_IPA.get(ipa.charAt(i)));
		else
			throw `could not interpret '${ipa.charAt(i)}' as an IPA symbol`;
	}
	return output;
}

/**
 * get an orthographical representation from a phoneme
 * @param fon the sound to look up
 * @param style the romanization convention in which to look this up
 * @param level the number of diacritics we have already checkd (don't check them again)
 */
function lookUp(fon: Fon, style: Style, level: number = 0): string {
	if (TO_TEXT.has(fon.hash())) // if it's in the table
		return TO_TEXT.get(fon.hash())[style]; // just return that

	for (let i = level; i < MODIFIERS.length; i ++) { // if not, look through the diacritics
		const {klas, baze, kode} = MODIFIERS[i];
		if (klas.macha(fon)) { // to see if there's one that will help
			const baziFon = [];
			for (const sif of baze)
				baziFon.push(fon.with(sif)); // if so, simplify the foneme

			const diacritic = TO_DIACRITICS.get(kode)[style]; // and apply the diacritic
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

	throw `I don't know how to write ${fon}`;
}

/**
 * convert a phonetic word to a unicode string somehow.
 * @param lekse
 * @param style
 */
export function transcribe(lekse: Fon[], style: Style): string {
	lekse = lekse.slice(); // first, handle some common orthographickal rules
	if (ORTHOGRAPHIC_FLAGS.get('diphthong as hiatus')[style]) {
		for (let i = 0; i < lekse.length; i ++) // for this flag, go thru the original phonemick representacion
			if (lekse[i].is(PendaniSif.HIGH)
				&& (i+1 >= lekse.length || lekse[i+1].is(Silabia.NONSYLLABIC))) // find glides in codas
				lekse[i] = new Klas([Silabia.UNSTRESSED]).konformu(lekse[i]); // and change them to vowels
	}
	if (ORTHOGRAPHIC_FLAGS.get('velar nasal as coronal')[style]) {
		for (let i = 0; i < lekse.length; i ++)
			if (lekse[i].is(Loke.VELAR) && lekse[i].is(Mode.NASAL) && i+1 < lekse.length
				&& lekse[i+1].is(Loke.VELAR) && lekse[i+1].is(PendaniSif.OCCLUSIVE)) // find velar nasals followd by velar stops
				lekse[i] = new Klas([Loke.ALVEOLAR]).konformu(lekse[i]); // and change them to be coronal
	}

	let asli = "";
	for (let i = 0; i < lekse.length; i ++)
		asli += lookUp(lekse[i], style); // form the inicial spelling by reading the transcripcion out of the table

	if (style === Style.ENGLI) {
		let muti = "#"+asli+"#";
		for (let i = 1; i <= muti.length; i ++) { // go through the string
			for (const vise of ENGLI_VISE) {
				for (let j = 1; j < vise.length; j ++) { // and look through the replacements in ENGLI_VISE
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

		muti = "";
		for (let i = 0; i < asli.length; i ++) {
			if (asli[i] === "c" &&
				((i+1 < asli.length && 'eiy#'.includes(asli[i+1]))))
				muti += "k";
			else if (i+1 < asli.length && asli[i] === "j" && 'eiy'.includes(asli[i+1])) {
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
				((i+1 < asli.length && !'aeiouyw'.includes(asli[i+1])) || (i-1 >= 0 && !'*–aeiouyw'.includes(asli[i-1]))))
				muti += "";
			else if (asli[i] === "y") {
				if (i+1 === asli.length || (i+1 < asli.length && asli[i+1] === "i") || (i-1 >= 0 && asli[i-1] === "i"))
					muti += "y";
				else if ((i+1 < asli.length && !'aeiou'.includes(asli[i+1])) || (i-1 >= 0 && !'aeiou'.includes(asli[i-1])))
					muti += "i";
				else
					muti += "y";
			}
			else if (i+1 < asli.length && asli[i] === "w" && !"aeiouy".includes(asli[i+1]))
				muti += "u";
			else if (asli[i] === '–') {
				if ((i+1 < asli.length && asli[i+1] === 'ɦ') ||
					(i+2 < asli.length && !'aeiouy'.includes(asli[i+1]) && !'aeiouy'.includes(asli[i+2])) ||
					(i+2 === asli.length && !'aeiouy'.includes(asli[i+1])))
					muti += (asli[i-1] === 'a') ? 'i' : (asli[i-1] === 'o') ? 'u' : (asli[i-1] === 'i') ? '' : 'e';
			}
			else if (asli[i] === '*') {
				// if (i+2 < asli.length && !'aeiouy'.includes(asli[i+1]) && 'aeiouy'.includes(asli[i+2]))
				// 	muti += (asli[i+1] === 'k') ? 'c' : (asli[i+1] === 'j') ? '' : (asli[i+1] === 'h') ? '' : asli[i+1];
				// else if (i+1 < asli.length && asli[i] === 'i' && 'aeiouy'.includes(asli[i+1]))
				// 	muti = muti.substring(0, muti.length-1) + 'e';
				muti += "";
			}
			else
				muti += asli[i];
		}
		asli = muti;

		for (const [ca, pa] of [[/cw/g, "qu"], [/[ck]s/g, "x"], [/yy/g, "y"], [/ww/g, "w"], [/sh[ck]/g, "sc"], [/ɦw/g, "wh"], [/ɦ/g, "h"]])
			asli = asli.replace(ca, <string> pa);
	}

	if (ORTHOGRAPHIC_FLAGS.get('capitalization')[style]) { // finally, capitalize
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
