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
import {
	Fon,
	Klas,
	Latia,
	Loke,
	Longia,
	MinorLoke,
	Mode,
	Nosia,
	PendaniSif,
	Sif,
	SIF_TIPE,
	Silabia,
	Voze
} from "./sound.js";
import {ipaSymbol} from "./script.js";
import {loadTSV} from "../util/fileio.js";
import {Word} from "./word.js";

/**
 * a process by which words change over time
 */
export interface Proces {
	apply(old: Word): Word;
}

/**
 * a process that causes segments to change according to a rule
 */
class FonMute implements Proces {
	private readonly ca: Klas[]; // original value
	private readonly pa: Klas[]; // target value
	private readonly idx: number[]; // reference indices for target phones
	private readonly chen: Klas[]; // requisite predecessor
	private readonly bade: Klas[]; // requisite follow-up

	constructor(ca: Klas[], pa: Klas[], idx: number[], bada: Klas[], chena: Klas[]) {
		if (idx.length !== pa.length)
			throw RangeError(`The pa array must be properly indexed: ${ca} > ${pa} / ${bada} _ ${chena}`);
		if (pa.length === 0 && bada.every((klas) => klas.macha(Fon.PAUSE)) && chena.every((klas) => klas.macha(Fon.PAUSE)))
			throw RangeError(`this deletion event is unchecked: ${ca} > ${pa} / ${bada} _ ${chena}`);
		this.ca = ca;
		this.pa = pa;
		this.idx = idx;
		this.chen = bada;
		this.bade = chena;
	}

	/**
	 * go through the word and apply this sound change.
	 * @param old
	 */
	apply(old: Word): Word {
		const drowWen: Fon[] = []; // build the neWword in reverse
		let i = old.length;
		while (i >= 0) {
			if (this.applies([Fon.PAUSE].concat(old.segments.slice(0, i)), [Fon.PAUSE].concat(drowWen))) { // if it applies here,
				for (let j = this.pa.length - 1; j >= 0; j --) { // fill in the replacement
					if (this.idx[j] < this.ca.length)
						drowWen.push(this.pa[j].konformu(
							old.segments[i + this.idx[j] - this.ca.length], // mapping to the relevant old segments
							this.bade.length > 0 ? old.segments[i] : old.segments[i-1]));
					else
						drowWen.push(this.pa[j].konformu()); // or drawing new segments from thin air
				}
				i -= this.ca.length; // and jump to the next set of consonants
			}
			else { // if not
				i -= 1;
				if (i >= 0) drowWen.push(old.segments[i]); // just add the next character of old
			}
		}
		return new Word(drowWen.reverse(), old.language);
	}

	/**
	 * does the segment string at the end of oldWord qualify to be changed?
	 * @param oldWord the unchanged word where we are considering making the change
	 * @param novWord the changed following section of the word, reversed
	 */
	applies(oldWord: Fon[], novWord: Fon[]) {
		if (this.chen.length + this.ca.length > oldWord.length || this.bade.length > novWord.length)
			return false;
		if (this.ca.length === 1 && this.chen.length > 0 && this.bade.length > 0 &&
			(oldWord[oldWord.length-1].longia === Longia.LONG || oldWord[oldWord.length-1].minorLoke === MinorLoke.PHARYNGEALIZED)) // geminates and emphatics are immune to /X_X processes
			return false;
		for (let j = 0; j < this.chen.length; j ++) // start with the left half of the context
			if (!this.chen[j].macha(oldWord[j - this.ca.length - this.chen.length + oldWord.length])) // check if it matches
				return false;
		for (let j = 0; j < this.ca.length; j ++) // then check the text that will be replaced
			if (!this.ca[j].macha(oldWord[j - this.ca.length + oldWord.length]))
				return false;
		for (let j = 0; j < this.bade.length; j ++) // then check the right half of the context
			if (!this.bade[j].macha(novWord[novWord.length - 1 - j]))
				return false;
		return true;
	}
}

/**
 * a process that causes sounds in the same word to share a feature
 */
class Harmonia implements Proces {
	private readonly kutube: Sif[];
	private readonly affectsConsonants: boolean;

	constructor(sif: string, affectsConsonants: boolean) {
		this.affectsConsonants = affectsConsonants;
		if (sif === 'front') // then construct the list of "polar" attributes
			this.kutube = [Loke.VELAR, Loke.PALATAL];
		else if (sif === 'hight')
			this.kutube = [PendaniSif.LOW, PendaniSif.HIGH];
		else if (sif === 'round')
			this.kutube = [MinorLoke.UNROUNDED, MinorLoke.LABIALIZED];
		else if (sif === 'tense')
			this.kutube = [PendaniSif.LAX, PendaniSif.TENSE];
		else
			throw `unrecognized harmony type: ${sif}`;
	}

	apply(old: Word): Word {
		const nov: Fon[] = new Array<Fon>(old.length);
		let val: Sif = null;
		for (let i = 0; i < old.length; i ++) { // iterate backwards through the word
			nov[i] = old.segments[i]; // in most cases, we will just make this the same as it was in the old word
			if (this.affectsConsonants || !old.segments[i].is(PendaniSif.VOWEL)) { // but if this segment isn't immune
				for (let sif of this.kutube) { // check its polarity
					if (old.segments[i].is(sif)) { // if it's polar,
						if (val !== null) // change this sound to match what came before
							nov[i] = old.segments[i].with(val); // and add it to the new word
						else // or read the property to match if we haven't seen this yet
							val = sif;
						break;
					} // if it's neutral, just ignore it without resetting val or changing anything
				}
			}
		}
		return new Word (nov, old.language);
	}
}

/**
 * a process that places syllables according to the sonority sequencing constraint
 */
class SilaboPoze implements Proces {
	private readonly bias: number; // amount to prefer earlier or later syllables
	private readonly minSonority: number; // minimum allowable sonority of a nucleus

	/**
	 * set up a new syllable placement system
	 * @param bias a positive number indicates that /iuiu/ is [juju], negative indicates [iwiw],
	 * and zero indicates [iuiu]
	 * @param minSonority the sonority of the most sordid allowable nucleus; if a peak is too sordid,
	 * a schwa will be inserted
	 */
	constructor(bias: number, minSonority: number) {
		this.bias = bias;
		this.minSonority = minSonority;
	}

	apply(old: Word): Word {
		const sonority = [];
		for (const fon of old.segments) // first calculate the sonorities
			sonority.push(fon.getSonority());
		const nov = []; // then copy the old word
		for (let i = 0; i < old.length; i ++) { // and assign syllables accordingly
			const c = sonority[i];
			const l = (i-1 >= 0) ? sonority[i-1] : Number.NEGATIVE_INFINITY;
			const r = (i+1 < old.length) ? sonority[i+1] : Number.NEGATIVE_INFINITY;
			if (c >= l && c >= r && !(this.bias < 0 && c === l && c < r) && !(this.bias > 0 && c < l && c === r)) { // if it is a peak
				if (old.segments[i].getSonority() < this.minSonority) {
					nov.push(new Fon(Mode.OPEN_MID, Loke.CENTRAL, Voze.VOICED,
						old.segments[i].silabia, Longia.SHORT, Latia.MEDIAN,
						MinorLoke.UNROUNDED, Nosia.ORAL).with(PendaniSif.SYLLABIC));
					nov.push(old.segments[i].with(Silabia.NONSYLLABIC)); // insert an epenthetic schwa or
				}
				else
					nov.push(old.segments[i].with(PendaniSif.SYLLABIC)); // make it syllabic
			}
			else if (old.segments[i].is(PendaniSif.SPOKEN)) // otherwise if it is a sound
				nov.push(old.segments[i].with(Silabia.NONSYLLABIC)); // make it nonsyllabic
			else
				nov.push(old.segments[i]); // ignore pauses
		}
		return new Word(nov, old.language);
	}
}


/**
 * a process that places stress according to certain rules
 */
export class AcentoPoze implements Proces {
	private readonly reverse: boolean; // whether the primary stress is on the right
	private readonly headSize: number; // the number of unstressed syllables to put between the word edge and the initial stress
	private readonly attractors: number; // the minimum weight that attracts stress
	private readonly tailMode: string; // ['lapse', 'clash', 'none'] how to handle stress at the tail end when the syllables ar odd
	private readonly lengthen: boolean; // whether to lengthen stressed open syllables

	/**
	 * create a new stress system given some simplified parameters
	 * @param reverse
	 * @param headSize
	 * @param attractors
	 * @param tailMode ['lapse', 'clash', or 'none']
	 * @param lengthen
	 */
	constructor(reverse: boolean, headSize: number, attractors: number, tailMode: string, lengthen: boolean) {
		this.reverse = reverse;
		this.headSize = headSize;
		this.attractors = attractors;
		this.tailMode = tailMode;
		this.lengthen = lengthen
	}

	apply(old: Word): Word {
		let nuclei: {i: number, weight: number}[] = [];
		let numC = 1;
		for (let i = old.length - 1; i >= 0; i --) { // first, tally up the syllables
			if (!old.segments[i].is(PendaniSif.SPOKEN)) { // skip past any pauses
				numC = 1;
			}
			else if (old.segments[i].is(PendaniSif.SYLLABIC)) { // using syllabicity to identify nuclei
				if (old.segments[i].is(Longia.LONG))
					nuclei.push({i: i, weight: 2}); // long vowels have weight 2
				else if (numC > 1)
					nuclei.push({i: i, weight: 1}); // codas have weight 1
				else
					nuclei.push({i: i, weight: 0}); // open syllables have weight 0
				numC = 0;
			}
			else {
				numC += (old.segments[i].is(Longia.LONG)) ? 2 : 1; // long consonants count as two segments for this purpose
			}
		}

		if (!this.reverse) // choose the correct orientation
			nuclei = nuclei.reverse();

		const stress: boolean[] = new Array(nuclei.length);
		let lapse = 0;
		for (let i = 0; i < nuclei.length; i ++) {
			if (nuclei[i].weight >= this.attractors) // if this is a stress attractor
				stress[i] = true;
			else if (lapse === i && (i === this.headSize || i === nuclei.length - 1)) // if this is the head
				stress[i] = true;
			else if (lapse === i && i < this.headSize) // keep ordinary stress off the pre-primary region
				stress[i] = false;
			else if (this.tailMode === 'lapse' && (i + 1 >= nuclei.length || nuclei[i + 1].weight >= this.attractors)) // if *Clash or NonFinal is active and there's a stress coming up
				stress[i] = false;
			else if (this.tailMode !== 'none' && lapse >= 1) // otherwise, assign stress to avoid lapses
				stress[i] = true;
			else
				stress[i] = false;

			if (!stress[i]) lapse ++; // count the lapses
			else            lapse = 0;
		}

		const nov: Fon[] = old.segments.slice(); // then edit the word
		let firstStress = true;
		for (let i = 0; i < nuclei.length; i ++) {
			if (!stress[i]) {
				nov[nuclei[i].i] = old.segments[nuclei[i].i].with(Silabia.UNSTRESSED); // stressless is stressless
				if (this.lengthen && nuclei[i].weight === 2)
					nov[nuclei[i].i] = nov[nuclei[i].i].with(Longia.SHORT); // shorten unstressed heavy syllables if Ident long is outranked
			}
			else {
				nov[nuclei[i].i] = old.segments[nuclei[i].i].with(
					firstStress ? Silabia.PRIMARY_STRESSED : Silabia.SECONDARY_STRESSED); // the first stress is primary
				firstStress = false;
				if (this.lengthen && nuclei[i].weight === 0)
					nov[nuclei[i].i] = nov[nuclei[i].i].with(Longia.LONG); // lengthen stressed open syllables if Ident long is outranked
			}
		}
		return new Word(nov, old.language);
	}
}


export const DEFAULT_ACENTE = new AcentoPoze(true, 1, 1, 'lapse', false);

export const PROCES_CHUZABLE: {chanse: number, proces: Proces}[] = [];
for (const procesKitabe of loadTSV('proces.txt', /\s+/, /%/)) { // load the phonological processes
	const chanse = Number.parseInt(procesKitabe[0])/1000;
	if (procesKitabe[1] === 'mute') {
		const ca: Klas[] = [], pa: Klas[] = [], bada: Klas[] = [], chena: Klas[] = [];
		let idx: number[] = [];
		let fen = ca;
		let sa: Sif[] = null, na: Sif[] = null, ka: string[] = null;
		for (let sinye of procesKitabe.slice(2)) { // and parse them
			if (sinye === '>') // > transitions from ca to pa
				fen = pa;
			else if (sinye === '_') // _ transitions from badu to chenu
				fen = chena;
			else if (sinye === '#') // indicates a word boundary
				fen.push(new Klas([], [PendaniSif.SPOKEN]));
			else if (sinye === '/') { // / transitions from pa to badu
				if (idx.length < pa.length) { // and assigns indices if they weren't assigned explicitly
					if (ca.length > 1 && ca.length !== pa.length) throw `please specify indices for ${procesKitabe}`;
					idx = [];
					for (let i = idx.length; i < pa.length; i++)
						idx.push(Math.min(i, ca.length - 1));
				}
				fen = bada;
			}
			else if (sinye === '[') { // [ stars a new phone
				sa = [];
				na = [];
				ka = [];
			}
			else if (sinye === ']') { // ] ends the current phone
				fen.push(new Klas(sa, na, ka));
				sa = na = ka = null;
			}
			else if (sinye.length === 2 && sinye[0] === ']') { // ends the current phone and assigns it a specific reference index
				fen.push(new Klas(sa, na, ka));
				idx.push(Number.parseInt(sinye[1]));
				sa = na = ka = null;
			}
			else if (sinye.length >= 4) { // features are incorporated into the current phone
				if (!'+-±'.includes(sinye.charAt(0)))
					throw RangeError(`unreadable feature descripcion: ${sinye}`);
				else if (sinye.startsWith('±')) { // either their name goes into ka
					if (ka === null)
						throw RangeError(`this ${sinye} doesn't seem to be in brackets.`);
					ka.push(sinye.slice(1));
				}
				else {
					const kutube = sinye.startsWith('+') ? sa : na;
					if (kutube === null)
						throw RangeError(`this ${sinye} doesn't seem to be in brackets.`);
					sinye = sinye.slice(1);
					const starred = sinye.startsWith('!');
					if (starred) sinye = sinye.slice(1);
					let val: Sif = null;
					sifSow:
						for (const sifKlas of starred ? SIF_TIPE.slice(1) : SIF_TIPE) { // or their value is read
							for (const sif of sifKlas) {
								if ((sif.enumKey + typeof (sif)).startsWith(sinye)) {
									val = sif;
									break sifSow;
								}
							}
						}
					if (val === null)
						throw RangeError(`unrecognized feature: ${sinye}`);
					kutube.push(val); // and added to sa or na
				}
			}
			else if (ipaSymbol(sinye) !== null) { // IPA symbols are read for their specified features
				const fon = ipaSymbol(sinye);
				fen.push(new Klas([
					fon.mode, fon.loke, fon.voze, fon.latia, fon.silabia, fon.minorLoke
				]));
				idx.push(ca.length); // they index to len(ca), to indicate they don't need any reference foneme
			}
			else {
				throw RangeError(`unintelligible symbol near line ${PROCES_CHUZABLE.length}: ${sinye}`);
			}
		}
		PROCES_CHUZABLE.push({chanse: chanse, proces:
				new FonMute(ca, pa, idx, bada, chena)});
	}
	else if (procesKitabe[1] === 'harmonia') {
		const sif = procesKitabe[2];
		const affectsConsonants = procesKitabe[3] === 'all';
		PROCES_CHUZABLE.push({chanse: chanse, proces:
				new Harmonia(sif, affectsConsonants)});
	}
	else if (procesKitabe[1] === 'acente') {
		const reverse = procesKitabe[2] === 'right';
		const headSize = Number.parseInt(procesKitabe[3]);
		for (let attractors = 1; attractors <= 3; attractors ++)
			for (const tailMode of ['clash', 'lapse', 'none'])
				for (const lengthen of [true, false])
					PROCES_CHUZABLE.push({chanse: chanse/18., proces:
							new AcentoPoze(reverse, headSize, attractors, tailMode, lengthen)});
	}
	else if (procesKitabe[1] === 'silabe') {
		const minSilabia = Number.parseInt(procesKitabe[2]);
		for (let bias = -1; bias <= 1; bias ++)
			PROCES_CHUZABLE.push({chanse: chanse/3, proces:
					new SilaboPoze(bias, minSilabia)});
	}
	else {
		throw `unrecognized process classification: ${procesKitabe[1]}`;
	}
}
