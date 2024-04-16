/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {
	Sound,
	Klas,
	Latia,
	Loke,
	Longia,
	MinorLoke,
	Mode,
	Nosia,
	Quality,
	Feature,
	FEATURE_TYPES,
	Silabia,
	Voze
} from "./sound.js";
import {ipaSymbol, transcribe} from "./script.js";
import {Name} from "./name.js";

import UNPARSED_PROCESS_OPTIONS from "../../resources/processes.js";

/**
 * a process by which words change over time
 */
export interface WordProcess {
	apply(old: Sound[]): Sound[];
}

/**
 * a process that causes segments to change according to a rule
 */
export class SoundChange implements WordProcess {
	private readonly pattern: Klas[]; // original value
	private readonly result: Klas[]; // target value
	private readonly idx: number[]; // reference indices for target phones
	private readonly pre: Klas[]; // requisite predecessor
	private readonly post: Klas[]; // requisite follow-up

	constructor(from: Klas[], to: Klas[], idx: number[], after: Klas[], before: Klas[]) {
		if (idx.length !== to.length)
			throw RangeError(`The pa array must be properly indexed: ${from} > ${to} / ${after} _ ${before}`);
		this.pattern = from;
		this.result = to;
		this.idx = idx;
		this.pre = after;
		this.post = before;
	}

	/**
	 * go through the word and apply this sound change.
	 * @param oldWord
	 */
	apply(oldWord: Sound[]): Sound[] {
		const drowWen: Sound[] = []; // build the neWword in reverse
		let i = oldWord.length;
		while (i >= 0) {
			if (this.applies(oldWord.slice(0, i), drowWen)) { // if it applies here,
				for (let j = this.result.length - 1; j >= 0; j --) { // fill in the replacement
					if (this.idx[j] < this.pattern.length) {
						let ref; // choose an appropriate reference phoneme if there's a ± feature
						if (this.result[j].referencesAnything()) {
							if (this.pattern.length === 2 && this.pre.length === 0 && this.post.length === 0)
								ref = oldWord[i - this.idx[j] - 1];
							else if (this.pattern.length === 1 && this.pre.length > 0 && this.post.length === 0)
								ref = oldWord[i - 2];
							else if (this.pattern.length === 1 && this.pre.length === 0 && this.post.length > 0)
								ref = oldWord[i];
							else
								throw new Error(`I don't know what ref to use for this ± expression in ${this}`);
						}
						else {
							ref = null;
						}
						drowWen.push(this.result[j].apply(
							oldWord[i + this.idx[j] - this.pattern.length], ref)); // mapping to the relevant old segments
					}
					else
						drowWen.push(this.result[j].apply()); // or drawing new segments from thin air
				}
				i -= this.pattern.length; // and jump to the next set of consonants
			}
			else { // if not
				i -= 1;
				if (i >= 0) drowWen.push(oldWord[i]); // just add the next character of old
			}
		}
		return drowWen.reverse();
	}

	/**
	 * does the segment string at the end of oldWord qualify to be changed?
	 * @param oldWord the unchanged word where we are considering making the change
	 * @param novWord the already changed following section of the word, reversed
	 */
	applies(oldWord: Sound[], novWord: Sound[]) {
		if (this.pattern.length > oldWord.length) // make sure the word is long enuff to fit the whole pattern
			return false;
		for (let j = 0; j < this.pre.length; j ++) { // start with the left half of the context
			if (j - this.pattern.length - this.pre.length + oldWord.length >= 0) {
				if (!this.pre[j].matches(oldWord[j - this.pattern.length - this.pre.length + oldWord.length])) // check if it matches
					return false;
			}
			else {
				if (!this.pre[j].matchesSilence())
					return false;
			}
		}
		for (let j = 0; j < this.pattern.length; j ++) // then check the text that will be replaced
			if (!this.pattern[j].matches(oldWord[oldWord.length - this.pattern.length + j]))
				return false;
		for (let j = 0; j < this.post.length; j ++) { // then check the right half of the context
			if (novWord.length - 1 - j >= 0) {
				if (!this.post[j].matches(novWord[novWord.length - 1 - j]))
					return false;
			}
			else {
				if (!this.post[j].matchesSilence())
					return false;
			}
		}
		return true;
	}

	toString(): string {
		return `${this.pattern.join(" ")} > ${this.result.join(" ")} / ${this.pre.join(' ')} _ ${this.post.join(" ")}`;
	}
}

/**
 * a process that causes sounds in the same word to share a feature
 */
export class Harmony implements WordProcess {
	private readonly kutube: Feature[];
	private readonly affectsConsonants: boolean;

	/**
	 * construct a new Harmony process on a given feature
	 * @param feature what aspect of the sounds must match; one of ["front", "hight", "round", "tense]
	 * @param affectsConsonants whether consonants are affected as well as vowels
	 */
	constructor(feature: string, affectsConsonants: boolean) {
		this.affectsConsonants = affectsConsonants;
		if (feature === 'front') // then construct the list of "polar" attributes
			this.kutube = [Loke.VELAR, Loke.PALATAL];
		else if (feature === 'hight')
			this.kutube = [Quality.LOW, Quality.HIGH];
		else if (feature === 'round')
			this.kutube = [MinorLoke.UNROUNDED, MinorLoke.LABIALIZED];
		else if (feature === 'tense')
			this.kutube = [Quality.LAX, Quality.TENSE];
		else
			throw new Error(`unrecognized harmony type: ${feature}`);
	}

	apply(oldWord: Sound[]): Sound[] {
		const newWord: Sound[] = new Array<Sound>(oldWord.length);
		let val: Feature = null;
		for (let i = 0; i < oldWord.length; i ++) { // iterate backwards through the word
			newWord[i] = oldWord[i]; // in most cases, we will just make this the same as it was in the old word
			if (this.affectsConsonants || oldWord[i].is(Quality.VOWEL)) { // but if this segment isn't immune
				for (let feature of this.kutube) { // check its polarity
					if (oldWord[i].is(feature)) { // if it's polar,
						if (val !== null) // change this sound to match what came before
							newWord[i] = oldWord[i].with(val); // and add it to the new word
						else // or read the property to match if we haven't seen this yet
							val = feature;
						break;
					} // if it's neutral, just ignore it without resetting val or changing anything
				}
			}
		}
		return newWord;
	}
}

/**
 * a process that places syllables according to the sonority sequencing constraint
 */
export class Syllabicization implements WordProcess {
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

	apply(oldWord: Sound[]): Sound[] {
		const sonority = [];
		for (const sound of oldWord) // first calculate the sonorities
			sonority.push(sound.getSonority());
		let weNeedANewStress = false;
		const newWord = []; // then copy the old word
		for (let i = 0; i < oldWord.length; i ++) { // and assign syllables accordingly
			const c = sonority[i];
			const l = (i-1 >= 0) ? sonority[i-1] : -Infinity;
			const r = (i+1 < oldWord.length) ? sonority[i+1] : -Infinity;
			// if it is a local maximum of sonority, make it syllabic
			if (c >= l && c >= r && !(this.bias < 0 && c === l && c > r) && !(this.bias > 0 && c > l && c === r)) { // if it is a peak
				let desiredLevelOfStress;
				if (weNeedANewStress)
					desiredLevelOfStress = Silabia.PRIMARY_STRESSED;
				else if (oldWord[i].is(Quality.SYLLABIC))
					desiredLevelOfStress = oldWord[i].silabia;
				else
					desiredLevelOfStress = Silabia.UNSTRESSED;
				weNeedANewStress = false;
				// if it's invalid as a syllable nucleus, insert an epenthetic schwa
				if (oldWord[i].getSonority() < this.minSonority) {
					newWord.push(new Sound(Mode.OPEN_MID, Loke.CENTRAL, Voze.VOICED,
						oldWord[i].silabia, Longia.SHORT, Latia.MEDIAN,
						MinorLoke.UNROUNDED, Nosia.ORAL).with(desiredLevelOfStress));
					newWord.push(oldWord[i].with(Silabia.NONSYLLABIC));
				}
				// otherwise, just make it syllabic
				else
					newWord.push(oldWord[i].with(desiredLevelOfStress));
			}
			// otherwise make it nonsyllabic
			else {
				if (oldWord[i].silabia === Silabia.PRIMARY_STRESSED)
					weNeedANewStress = true; // make a note if it carried the primary stress
				newWord.push(oldWord[i].with(Silabia.NONSYLLABIC));
			}
		}
		// if you didn't manage to replace the primary stress, put it on the last syllable
		if (weNeedANewStress) {
			for (let i = newWord.length - 1; i >= 0; i --) {
				if (newWord[i].is(Quality.SYLLABIC)) {
					newWord[i] = newWord[i].with(Silabia.PRIMARY_STRESSED);
					return newWord;
				}
			}
			throw new Error(
				`if you got this far, it means there are no syllables in ` +
				`[${transcribe([newWord], "ipa")}]`);
		}
		else
			return newWord;
	}
}


/**
 * a process that places stress according to certain rules
 */
export class StressPlacement implements WordProcess {
	private readonly reverse: boolean; // whether the primary stress is on the right
	private readonly headSize: number; // the number of unstressed syllables to put between the word edge and the initial stress
	private readonly attractors: number; // the minimum weight that attracts stress
	private readonly tailMode: string; // ['lapse', 'clash', 'none'] how to handle stress at the tail end when the syllables ar odd
	private readonly lengthen: boolean; // whether to lengthen stressed open syllables

	/**
	 * create a new stress system given some simplified parameters
	 * @param reverse whether to assign stress to the end of the word rather than the start
	 * @param headSize the number of syllables between the primary stress and the start of the word
	 * @param attractors the minimum attractiveness of a syllable to take the stress away from its normal head
	 *                   position (an open syllable has weight 0, a long vowel has weight 2, and any other closed
	 *                   syllable has weight 1)
	 * @param tailMode how to handle stress away from the primary – either "lapse" to put in as much stress as possible
	 *                 without having any adjacent stressed syllables, "clash" to put in as little stress as possible
	 *                 without ever having adjacent unstressed syllables, or "none" to have no secondary stress at all.
	 * @param lengthen whether to lengthen stressed open syllables
	 */
	constructor(reverse: boolean, headSize: number, attractors: number, tailMode: string, lengthen: boolean) {
		this.reverse = reverse;
		this.headSize = headSize;
		this.attractors = attractors;
		this.tailMode = tailMode;
		this.lengthen = lengthen;
	}

	apply(oldWord: Sound[]): Sound[] {
		let nuclei: {i: number, weight: number}[] = [];
		let numC = 1;
		for (let i = oldWord.length - 1; i >= 0; i --) { // first, tally up the syllables
			if (oldWord[i].is(Quality.SYLLABIC)) { // using syllabicity to identify nuclei
				if (oldWord[i].is(Longia.LONG))
					nuclei.push({i: i, weight: 2}); // long vowels have weight 2
				else if (numC > 1)
					nuclei.push({i: i, weight: 1}); // codas have weight 1
				else
					nuclei.push({i: i, weight: 0}); // open syllables have weight 0
				numC = 0;
			}
			else {
				numC += (oldWord[i].is(Longia.LONG)) ? 2 : 1; // long consonants count as two segments for this purpose
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

		const newWord: Sound[] = oldWord.slice(); // then edit the word
		let firstStress = true;
		for (let i = 0; i < nuclei.length; i ++) {
			if (!stress[i]) {
				newWord[nuclei[i].i] = oldWord[nuclei[i].i].with(Silabia.UNSTRESSED); // stressless is stressless
				if (this.lengthen && nuclei[i].weight === 2)
					newWord[nuclei[i].i] = newWord[nuclei[i].i].with(Longia.SHORT); // shorten unstressed heavy syllables if Ident long is outranked (tf is "Ident"?)
			}
			else {
				newWord[nuclei[i].i] = oldWord[nuclei[i].i].with(
					firstStress ? Silabia.PRIMARY_STRESSED : Silabia.SECONDARY_STRESSED); // the first stress is primary
				firstStress = false;
				if (this.lengthen && nuclei[i].weight === 0)
					newWord[nuclei[i].i] = newWord[nuclei[i].i].with(Longia.LONG); // lengthen stressed open syllables if Ident long is outranked
			}
		}
		return newWord;
	}
}


/**
 * a process that applies to a whole phrase; not just a single word
 */
export class PhraseProcess {
	private readonly name: string;

	/**
	 * create a new change; just specify the name and we'll know what to do.
	 */
	constructor(name: string) {
		this.name = name;
	}

	apply(old: Name): Name {
		if (this.name === "compounding") {
			// string all of the parts together without pauses, and make sure there's only one primary stress
			const compoundWord = [];
			for (let i = 0; i < old.parts.length - 1; i ++) {
				for (const segment of old.parts[i]) {
					if (segment.silabia !== Silabia.PRIMARY_STRESSED)
						compoundWord.push(segment);
					else
						compoundWord.push(segment.with(Silabia.SECONDARY_STRESSED));
				}
			}
			compoundWord.push(...old.parts[old.parts.length - 1]);
			return new Name([compoundWord], old.language);
		}
		else
			throw new Error(`the special process ${this.name} is not implemented.`);
	}
}


export const DEFAULT_STRESS = new StressPlacement(true, 1, 1, 'lapse', false);

export const WORD_PROCESS_OPTIONS: {chanse: number, proces: WordProcess}[] = [];
export const PHRASE_PROCESS_OPTIONS: {chanse: number, proces: PhraseProcess}[] = [];
for (const {chance, type, code} of UNPARSED_PROCESS_OPTIONS) { // load the phonological processes
	if (type === 'mute') {
		const ca: Klas[] = [], pa: Klas[] = [], bada: Klas[] = [], chena: Klas[] = [];
		let idx: number[] = [];
		let fen = ca;
		let sa: Feature[] = null, na: Feature[] = null, ka: string[] = null;
		for (let token of code.split(" ")) { // and parse them
			if (token === '>') // > transitions from ca to pa
				fen = pa;
			else if (token === '_') // _ transitions from badu to chenu
				fen = chena;
			else if (token === '#') // indicates a word boundary
				fen.push(new Klas([], [Quality.SPOKEN]));
			else if (token === '/') { // / transitions from pa to badu
				if (idx.length < pa.length) { // and assigns indices if they weren't assigned explicitly
					if (ca.length > 1 && ca.length !== pa.length) throw new Error(`please specify indices for ${code}`);
					idx = [];
					for (let i = idx.length; i < pa.length; i++)
						idx.push(Math.min(i, ca.length - 1));
				}
				fen = bada;
			}
			else if (token === '[') { // [ stars a new phone
				sa = [];
				na = [];
				ka = [];
			}
			else if (token === ']') { // ] ends the current phone
				fen.push(new Klas(sa, na, ka));
				sa = na = ka = null;
			}
			else if (token.length === 2 && token[0] === ']') { // ends the current phone and assigns it a specific reference index
				fen.push(new Klas(sa, na, ka));
				idx.push(Number.parseInt(token[1]));
				sa = na = ka = null;
			}
			else if (token.length >= 4) { // features are incorporated into the current phone
				if (!'+-±'.includes(token.charAt(0)))
					throw RangeError(`unreadable feature descripcion: ${token}`);
				else if (token.startsWith('±')) { // either their name goes into ka
					if (ka === null)
						throw RangeError(`this ${token} doesn't seem to be in brackets.`);
					ka.push(token.slice(1));
				}
				else {
					const kutube = token.startsWith('+') ? sa : na;
					if (kutube === null)
						throw RangeError(`this ${token} doesn't seem to be in brackets.`);
					token = token.slice(1);
					const starred = token.startsWith('!');
					if (starred) token = token.slice(1);
					let val: Feature = null;
					featureSearch:
						for (const featureType of starred ? FEATURE_TYPES.slice(1) : FEATURE_TYPES) { // or their value is read
							for (const feature of featureType) {
								if ((feature.enumKey + typeof (feature)).startsWith(token)) {
									val = feature;
									break featureSearch;
								}
							}
						}
					if (val === null)
						throw RangeError(`unrecognized feature: ${token}`);
					kutube.push(val); // and added to sa or na
				}
			}
			else if (ipaSymbol(token) !== null) { // IPA symbols are read for their specified features
				const sound = ipaSymbol(token);
				fen.push(new Klas([
					sound.mode, sound.loke, sound.voze, sound.latia, sound.silabia, sound.minorLoke
				]));
				idx.push(ca.length); // they index to len(ca), to indicate they don't need any reference foneme
			}
			else {
				throw RangeError(`unintelligible symbol in '${code}': '${token}'`);
			}
		}
		WORD_PROCESS_OPTIONS.push({chanse: chance, proces:
				new SoundChange(ca, pa, idx, bada, chena)});
	}
	else if (type === 'harmonia') {
		const [feature, scope] = code.split(" ");
		WORD_PROCESS_OPTIONS.push({chanse: chance, proces:
				new Harmony(feature, scope !== "vowel")});
	}
	else if (type === 'acente') {
		const [reverse, headSize] = code.split(" ");
		for (let attractors = 1; attractors <= 3; attractors ++)
			for (const tailMode of ['clash', 'lapse', 'none'])
				for (const lengthen of [true, false])
					WORD_PROCESS_OPTIONS.push({chanse: chance/18., proces:
							new StressPlacement(
								reverse === "true",
								Number.parseInt(headSize),
								attractors, tailMode, lengthen)});
	}
	else if (type === 'silabe') {
		const minSilabia = Number.parseInt(code);
		for (let bias = -1; bias <= 1; bias ++)
			WORD_PROCESS_OPTIONS.push({chanse: chance/3, proces:
					new Syllabicization(bias, minSilabia)});
	}
	else {
		PHRASE_PROCESS_OPTIONS.push({chanse: chance, proces:
			new PhraseProcess(type)});
	}
}
