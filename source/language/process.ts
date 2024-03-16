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
import {ipaSymbol} from "./script.js";
import {loadTSV} from "../utilities/fileio.js";
import {Word} from "./word.js";

/**
 * a process by which words change over time
 */
export interface Process {
	apply(old: Word): Word;
}

/**
 * a process that causes segments to change according to a rule
 */
class SoundChange implements Process {
	private readonly pattern: Klas[]; // original value
	private readonly result: Klas[]; // target value
	private readonly idx: number[]; // reference indices for target phones
	private readonly pre: Klas[]; // requisite predecessor
	private readonly post: Klas[]; // requisite follow-up

	constructor(from: Klas[], to: Klas[], idx: number[], after: Klas[], before: Klas[]) {
		if (idx.length !== to.length)
			throw RangeError(`The pa array must be properly indexed: ${from} > ${to} / ${after} _ ${before}`);
		if (to.length === 0 && after.every((klas) => klas.matches(Sound.PAUSE)) && before.every((klas) => klas.matches(Sound.PAUSE)))
			throw RangeError(`this deletion event is unchecked: ${from} > ${to} / ${after} _ ${before}`);
		this.pattern = from;
		this.result = to;
		this.idx = idx;
		this.pre = after;
		this.post = before;
	}

	/**
	 * go through the word and apply this sound change.
	 * @param old
	 */
	apply(old: Word): Word {
		const drowWen: Sound[] = []; // build the neWword in reverse
		let i = old.length;
		while (i >= 0) {
			if (this.applies([Sound.PAUSE].concat(old.segments.slice(0, i)), [Sound.PAUSE].concat(drowWen))) { // if it applies here,
				for (let j = this.result.length - 1; j >= 0; j --) { // fill in the replacement
					if (this.idx[j] < this.pattern.length)
						drowWen.push(this.result[j].apply(
							old.segments[i + this.idx[j] - this.pattern.length], // mapping to the relevant old segments
							this.post.length > 0 ? old.segments[i] : old.segments[i-1]));
					else
						drowWen.push(this.result[j].apply()); // or drawing new segments from thin air
				}
				i -= this.pattern.length; // and jump to the next set of consonants
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
	applies(oldWord: Sound[], novWord: Sound[]) {
		if (this.pre.length + this.pattern.length > oldWord.length || this.post.length > novWord.length)
			return false;
		if (this.pattern.length === 1 && this.pre.length > 0 && this.post.length > 0 &&
			(oldWord[oldWord.length-1].longia === Longia.LONG || oldWord[oldWord.length-1].minorLoke === MinorLoke.PHARYNGEALIZED)) // geminates and emphatics are immune to /X_X processes
			return false;
		for (let j = 0; j < this.pre.length; j ++) // start with the left half of the context
			if (!this.pre[j].matches(oldWord[j - this.pattern.length - this.pre.length + oldWord.length])) // check if it matches
				return false;
		for (let j = 0; j < this.pattern.length; j ++) // then check the text that will be replaced
			if (!this.pattern[j].matches(oldWord[j - this.pattern.length + oldWord.length]))
				return false;
		for (let j = 0; j < this.post.length; j ++) // then check the right half of the context
			if (!this.post[j].matches(novWord[novWord.length - 1 - j]))
				return false;
		return true;
	}
}

/**
 * a process that causes sounds in the same word to share a feature
 */
class Harmony implements Process {
	private readonly kutube: Feature[];
	private readonly affectsConsonants: boolean;

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

	apply(old: Word): Word {
		const nov: Sound[] = new Array<Sound>(old.length);
		let val: Feature = null;
		for (let i = 0; i < old.length; i ++) { // iterate backwards through the word
			nov[i] = old.segments[i]; // in most cases, we will just make this the same as it was in the old word
			if (this.affectsConsonants || !old.segments[i].is(Quality.VOWEL)) { // but if this segment isn't immune
				for (let feature of this.kutube) { // check its polarity
					if (old.segments[i].is(feature)) { // if it's polar,
						if (val !== null) // change this sound to match what came before
							nov[i] = old.segments[i].with(val); // and add it to the new word
						else // or read the property to match if we haven't seen this yet
							val = feature;
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
class Syllabicization implements Process {
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
		for (const sound of old.segments) // first calculate the sonorities
			sonority.push(sound.getSonority());
		const nov = []; // then copy the old word
		for (let i = 0; i < old.length; i ++) { // and assign syllables accordingly
			const c = sonority[i];
			const l = (i-1 >= 0) ? sonority[i-1] : Number.NEGATIVE_INFINITY;
			const r = (i+1 < old.length) ? sonority[i+1] : Number.NEGATIVE_INFINITY;
			if (c >= l && c >= r && !(this.bias < 0 && c === l && c < r) && !(this.bias > 0 && c < l && c === r)) { // if it is a peak
				if (old.segments[i].getSonority() < this.minSonority) {
					nov.push(new Sound(Mode.OPEN_MID, Loke.CENTRAL, Voze.VOICED,
						old.segments[i].silabia, Longia.SHORT, Latia.MEDIAN,
						MinorLoke.UNROUNDED, Nosia.ORAL).with(Quality.SYLLABIC));
					nov.push(old.segments[i].with(Silabia.NONSYLLABIC)); // insert an epenthetic schwa or
				}
				else
					nov.push(old.segments[i].with(Quality.SYLLABIC)); // make it syllabic
			}
			else if (old.segments[i].is(Quality.SPOKEN)) // otherwise if it is a sound
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
export class StressPlacement implements Process {
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
		this.lengthen = lengthen;
	}

	apply(old: Word): Word {
		let nuclei: {i: number, weight: number}[] = [];
		let numC = 1;
		for (let i = old.length - 1; i >= 0; i --) { // first, tally up the syllables
			if (!old.segments[i].is(Quality.SPOKEN)) { // skip past any pauses
				numC = 1;
			}
			else if (old.segments[i].is(Quality.SYLLABIC)) { // using syllabicity to identify nuclei
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

		const nov: Sound[] = old.segments.slice(); // then edit the word
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


export const DEFAULT_STRESS = new StressPlacement(true, 1, 1, 'lapse', false);

export const PROCESS_OPTIONS: {chanse: number, proces: Process}[] = [];
for (const processString of loadTSV('processes.txt', /\s+/, /%/)) { // load the phonological processes
	const chance = Number.parseInt(processString[0])/1000;
	if (processString[1] === 'mute') {
		const ca: Klas[] = [], pa: Klas[] = [], bada: Klas[] = [], chena: Klas[] = [];
		let idx: number[] = [];
		let fen = ca;
		let sa: Feature[] = null, na: Feature[] = null, ka: string[] = null;
		for (let token of processString.slice(2)) { // and parse them
			if (token === '>') // > transitions from ca to pa
				fen = pa;
			else if (token === '_') // _ transitions from badu to chenu
				fen = chena;
			else if (token === '#') // indicates a word boundary
				fen.push(new Klas([], [Quality.SPOKEN]));
			else if (token === '/') { // / transitions from pa to badu
				if (idx.length < pa.length) { // and assigns indices if they weren't assigned explicitly
					if (ca.length > 1 && ca.length !== pa.length) throw new Error(`please specify indices for ${processString}`);
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
				throw RangeError(`unintelligible symbol near line ${PROCESS_OPTIONS.length}: ${token}`);
			}
		}
		PROCESS_OPTIONS.push({chanse: chance, proces:
				new SoundChange(ca, pa, idx, bada, chena)});
	}
	else if (processString[1] === 'harmonia') {
		const feature = processString[2];
		const affectsConsonants = processString[3] === 'all';
		PROCESS_OPTIONS.push({chanse: chance, proces:
				new Harmony(feature, affectsConsonants)});
	}
	else if (processString[1] === 'acente') {
		const reverse = processString[2] === 'right';
		const headSize = Number.parseInt(processString[3]);
		for (let attractors = 1; attractors <= 3; attractors ++)
			for (const tailMode of ['clash', 'lapse', 'none'])
				for (const lengthen of [true, false])
					PROCESS_OPTIONS.push({chanse: chance/18., proces:
							new StressPlacement(reverse, headSize, attractors, tailMode, lengthen)});
	}
	else if (processString[1] === 'silabe') {
		const minSilabia = Number.parseInt(processString[2]);
		for (let bias = -1; bias <= 1; bias ++)
			PROCESS_OPTIONS.push({chanse: chance/3, proces:
					new Syllabicization(bias, minSilabia)});
	}
	else {
		throw new Error(`unrecognized process classification: ${processString[1]}`);
	}
}
