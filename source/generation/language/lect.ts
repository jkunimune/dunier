/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Random} from "../../utilities/random.js";
import {Sound} from "./sound.js";
import {Process, PROCESS_OPTIONS, StressPlacement} from "./process.js";
import {ipa, transcribe} from "./script.js";
import {Phrase, Word} from "./word.js";
import {decodeBase37} from "../../utilities/miscellaneus.js";


/** print out debug statements whenever the language generation does anything */
const LOG_ETYMOLOGIES = false;

/** the maximum number of names a person can have */
export const MAX_NUM_NAME_PARTS = 4;
/** the number of centuries that two dialects must evolve independently before they're considered separate languages */
const DEVIATION_TIME = 2;
/** the rate at which suprasegmental linguistic details change per century */
const DRIFT_RATE = .02;

enum RootType { // TODO: have proper words also that get capitalized
	/** normal words */
	COMMON,
	/** words used as common affixes, but that are words in their own rite */
	SHORT,
	/** affixen that do not stand alone as words, or grammatical particles */
	GRAMMATICAL,
}

/**
 * an object used to describe morphemes
 */
interface Meaning {
	/** a pseudorandom seed that uniquely identifies it; by convention it should be an english word */
	english: string,
	/** roughly how many letters should go into the word for this (depending on how much information is contained in each letter */
	type: RootType,
}

const PEOPLE_AFFIX = {english: "people", type: RootType.SHORT};
const LANGUAGE_AFFIX = {english: "language", type: RootType.SHORT};
const COUNTRY_AFFIX = {english: "land", type: RootType.SHORT};
const DESCENDANT_AFFIX = {english: "son", type: RootType.SHORT};
const ADJECTIVE_AFFIX = {english: "y", type: RootType.GRAMMATICAL};
const OCCUPATION_AFFIXES = [
	{english: "er", type: RootType.SHORT},
	{english: "ist", type: RootType.SHORT},
	{english: "professional", type: RootType.SHORT},
];
const CITY_AFFIXES = [
	{english: "ton", type: RootType.SHORT},
	{english: "ham", type: RootType.SHORT},
	{english: "burg", type: RootType.SHORT},
];
const GENDERS = [ // the five genders
	{english: "woman", type: RootType.GRAMMATICAL},
	{english: "man", type: RootType.GRAMMATICAL},
	{english: "neither", type: RootType.GRAMMATICAL},
	{english: "vegetable", type: RootType.GRAMMATICAL},
	{english: "long_object", type: RootType.GRAMMATICAL},
];

/**
 * different components to personal names
 */
interface NameStyle {
	numGivenNames: number,
	parentName: boolean,
	numFamilyNames: number,
	originName: boolean,
	givenFirst: boolean,
}

/**
 * generate a new format for personal names, either by modifying a preexisting one or generating one from scratch
 */
function rollNewNameStyle(rng: Random, parent: NameStyle = null): NameStyle {
	let numGivenNames, parentName, numFamilyNames, originName;
	if (parent === null || rng.probability(DRIFT_RATE))
		numGivenNames = rng.probability(2/3) ? 1 : 2;
	else
		numGivenNames = parent.numGivenNames;
	if (parent === null || rng.probability(DRIFT_RATE))
		parentName = rng.probability(1/6);
	else
		parentName = parent.parentName;
	if (parent === null || rng.probability(DRIFT_RATE))
		numFamilyNames = rng.probability(1/2) ? 0 : (rng.probability(2/3) ? 1 : 2);
	else
		numFamilyNames = parent.numFamilyNames;
	if (parent === null || rng.probability(DRIFT_RATE))
		originName = rng.probability(1/6);
	else
		originName = parent.originName;

	// remove family names as necessary to prevent these from getting too long
	const numParts = numGivenNames + (parentName ? 1 : 0) + numFamilyNames + (originName ? 1 : 0);
	if (numParts > MAX_NUM_NAME_PARTS)
		numFamilyNames -= numParts - MAX_NUM_NAME_PARTS;

	const givenFirst = rng.probability(2/3);

	return {numGivenNames, parentName, numFamilyNames, originName, givenFirst};
}

/**
 * an immutable definition of a language's vocabulary
 */
export abstract class Lect {
	/** this language 100 years ago, or null if this language materialized from the ether */
	protected readonly parent: Lect | null;
	/** this language's preferd romanization style */
	public readonly defaultTranscriptionStyle: string;
	/** how names are set up in this language */
	public readonly nameStyle: NameStyle;
	/** the untranslated allowable noun endings, or [] if nouns can end in anything */
	protected readonly genders: Meaning[];
	/** the untranslated word to put on the ends of country, people, and language names */
	private readonly affixes: {
		country: Meaning | null,
		people: Meaning | null,
		language: Meaning | null,
		adjective: Meaning | null };
	/** whether this language prefers prefixen */
	protected readonly prefixing: boolean;
	/** the proto-language for the set of lects intelligible to this one */
	private readonly macrolanguage: Lect;
	/** the seed we use to get the name of this Language's people/place of origin */
	private readonly homelandIndex: number;

	protected constructor(parent: Lect | null, homelandIndex: number, rng: Random) {
		this.parent = parent;
		this.homelandIndex = homelandIndex;

		if (parent === null || rng.probability(DRIFT_RATE))
			this.defaultTranscriptionStyle = `native${rng.discrete(0, 4)}`;
		else
			this.defaultTranscriptionStyle = parent.defaultTranscriptionStyle;

		this.nameStyle = rollNewNameStyle(rng, (parent !== null) ? parent.nameStyle : null);

		if (parent === null || rng.probability(DRIFT_RATE)) {
			if (rng.probability(1/3))
				this.genders = GENDERS.slice(rng.discrete(2, 5));
			else
				this.genders = [];
		}
		else
			this.genders = parent.genders;

		if (parent === null || rng.probability(DRIFT_RATE)) {
			const p = rng.random();
			if (p < 1/6)
				this.affixes = {
					country: null, people: null, language: null, adjective: null};
			else if (p < 1/3)
				this.affixes = {
					country: null, people: ADJECTIVE_AFFIX, language: ADJECTIVE_AFFIX, adjective: ADJECTIVE_AFFIX};
			else if (p < 1/2)
				this.affixes = {
					country: null, people: PEOPLE_AFFIX, language: LANGUAGE_AFFIX, adjective: null};
			else if (p < 2/3)
				this.affixes = {
					country: COUNTRY_AFFIX, people: null, language: LANGUAGE_AFFIX, adjective: null};
			else if (p < 5/6)
				this.affixes = {
					country: COUNTRY_AFFIX, people: ADJECTIVE_AFFIX, language: ADJECTIVE_AFFIX, adjective: ADJECTIVE_AFFIX};
			else
				this.affixes = {
					country: COUNTRY_AFFIX, people: PEOPLE_AFFIX, language: LANGUAGE_AFFIX, adjective: PEOPLE_AFFIX};
		}
		else {
			this.affixes = parent.affixes;
		}

		if (parent === null || rng.probability(DRIFT_RATE))
			this.prefixing = rng.probability(1/5);
		else
			this.prefixing = parent.prefixing;

		this.macrolanguage = this.getAncestor(DEVIATION_TIME);
	}

	/**
	 * pull a word from this language
	 * @param meaning the english words getting translated.  if there are multiple, this will be a compound word,
	 *                and they should be given in tail-head order (so if this is a prefixing language they'll be reversed).
	 *                the length of each meaning string will be proportional to the number of syllables in the translated morpheme.
	 *                other than that the exact content of each meaning doesn't matter; it's just a pseudorandom seed.
	 *                make sure you include the gender ending, if applicable.
	 */
	abstract getWord(meaning: Meaning[]): Word;

	/**
	 * get the gender suffix that typically goes with this concept
	 * @throws if this language lacks gender
	 */
	abstract getGender(meaning: Meaning): Meaning;

	/**
	 * pull a common noun from this language.
	 * this is the same as getWord basicly; it just saves the user from having to import RootType.
	 * @param english the english meaning
	 */
	getCommonNoun(english: string): Word {
		return this.getWord([{english: english, type: RootType.COMMON}]);
	}

	/**
	 * get the name of a place in this language
	 * @param index the index of the tile being named
	 */
	getToponym(index: number): Phrase {
		return this.compound({english: `tile${index}`, type: RootType.COMMON}, this.affixes.country);
	}

	/**
	 * get the name of a people in this language
	 * @param index the index of the tile where these people live
	 */
	getEthnonym(index: number): Phrase {
		return this.compound({english: `tile${index}`, type: RootType.COMMON}, this.affixes.people);
	}

	/**
	 * get the name of a language in this language
	 * @param index the index of the tile where this language is spoken
	 */
	getGlossonym(index: number): Phrase {
		return this.compound({english: `tile${index}`, type: RootType.COMMON}, this.affixes.language);
	}

	/**
	 * get the adjective to describe things from a place in this language
	 * @param index the index of the tile that the thing is from
	 */
	getTopoAdjective(index: number): Phrase {
		return this.compound({english: `tile${index}`, type: RootType.COMMON}, this.affixes.adjective);
	}

	/**
	 * get a full anthroponym given a set of random seeds
	 * @param seeds
	 */
	getFullName(seeds: number[]): Phrase {
		if (seeds.length !== MAX_NUM_NAME_PARTS)
			throw new Error("wrong number of seeds");
		// put in whatever components we want
		const nameParts: Word[] = [];
		let seedIndex = 0;
		for (let i = 0; i < this.nameStyle.numGivenNames; i ++) {
			nameParts.push(this.getWord([
				{english: `person${seeds[seedIndex]}`, type: RootType.COMMON}]));
			seedIndex ++;
		}
		if (this.nameStyle.parentName) {
			nameParts.push(this.getWord([
				{english: `person${seeds[seedIndex]}`, type: RootType.COMMON},
				DESCENDANT_AFFIX]));
			seedIndex ++;
		}
		for (let i = 0; i < this.nameStyle.numFamilyNames; i ++) {
			nameParts.push(this.getWord([
				{english: `occupation${seeds[seedIndex]}`, type: RootType.COMMON},
				OCCUPATION_AFFIXES[seeds[seedIndex]%OCCUPATION_AFFIXES.length]]));
			seedIndex ++;
		}
		if (this.nameStyle.originName) { // this one requires "of" to be connected to the city name TODO use a real city name
			const partParts = [
				this.getWord([
					{english: "of", type: RootType.GRAMMATICAL}]),
				this.getWord([
					{english: `city${seeds[seedIndex]}`, type: RootType.COMMON},
					CITY_AFFIXES[seeds[seedIndex]%CITY_AFFIXES.length]]),
			];
			if (!this.nameStyle.givenFirst)
				partParts.reverse();
			nameParts.push(new Word(partParts[0].morphemes.concat(partParts[1].morphemes), this)); // fuse "of" at the last second so that it doesn't get eaten by phonological processes
		}

		// account for variable name order
		if (!this.nameStyle.givenFirst)
			nameParts.reverse();

		return new Phrase(nameParts, this);
	}

	/**
	 * translate and combine two components according to our preferred order and amount of spacing
	 * @param base the content of the compound word
	 * @param affix the head to stick before or after it, or null if the base is actually fine on its own
	 */
	compound(base: Meaning, affix: Meaning): Phrase {
		if (affix === null) {
			return new Phrase([this.getWord([base])], this);
		}
		else {
			return new Phrase([this.getWord([base, affix])], this);
		}
	}

	/**
	 * is this language actually a dialect of lang?
	 */
	isIntelligible(lang: Lect): boolean {
		return this.macrolanguage === lang.macrolanguage;
	}

	/**
	 * get the language that this was n timesteps ago
	 * @param n the number of steps backward, in centuries.
	 */
	getAncestor(n: number): Lect {
		if (n <= 0 || this.parent === null)
			return this;
		else
			return this.parent.getAncestor(n - 1);
	};

	getName(): Phrase {
		return this.getGlossonym(this.homelandIndex);
	}
}

/**
 * an original Lect
 */
export class ProtoLect extends Lect {
	private static VOWELS = ipa("aiueoəɛɔyø");
	private static CONSON = ipa("mnptkshfbdɡzŋʃʔxqvɣθʙ");
	private static MEDIAL = ipa("jwlr");

	private static P_ONSET = 0.8;
	private static P_MEDIAL = 0.3;
	private static P_CODA = 0.5;

	/** what stress rule does this language use */
	private readonly stressRule: StressPlacement;
	/** the onset consonants in this language */
	private readonly onsets: Sound[];
	/** the vowels in this language */
	private readonly vowels: Sound[];
	/** the medial consonants in this language */
	private readonly medials: Sound[];
	/** the codas in this language */
	private readonly codas: Sound[];
	/** the approximate amount of information in one syllable */
	private readonly complexity: number;
	/** the word references of each type */
	private readonly roots: Map<Meaning, Sound[]>;
	/** the random number seed to use when composing original words */
	private readonly seed: number;

	constructor(homelandIndex: number, rng: Random) {
		super(null, homelandIndex, rng);
		this.seed = rng.next();

		// choose how many consonants the protolanguage will have
		this.onsets = ProtoLect.CONSON.slice(0, 6 + rng.binomial(15, .4));
		// choose how many nuclei it will have
		this.vowels = ProtoLect.VOWELS.slice(0, 3 + rng.binomial(7, .3));
		// choose how many medials it will have, and whether they can be used as medials
		const medials = ProtoLect.MEDIAL.slice(0, 2 + rng.binomial(2, .5));
		if (rng.probability(1/3)) {
			this.onsets.push(...medials);
			this.medials = [];
		}
		else {
			this.medials = medials;
		}
		// choose whether syllables can have codas
		if (rng.probability(2/3))
			this.codas = this.onsets;
		else
			this.codas = [];
		this.complexity = (
			Math.log10(1 + this.onsets.length)*ProtoLect.P_ONSET +
			Math.log10(1 + this.medials.length)*ProtoLect.P_MEDIAL +
			Math.log10(this.vowels.length) +
			Math.log10(1 + this.codas.length)*ProtoLect.P_CODA);

		this.stressRule = new StressPlacement(!this.prefixing, 1, 1, 'lapse', false);

		this.roots = new Map<Meaning, Sound[]>();
	}

	getWord(meaning: Meaning[]): Word {
		// add the gender ending if one was not explicitly passed
		if (this.genders.length > 0 && meaning[meaning.length - 1].type !== RootType.GRAMMATICAL)
			meaning.push(this.getGender(meaning[meaning.length - 1]));
		// translate each morpheme
		const morphemes: Sound[][] = [];
		for (const partMeaning of meaning)
			morphemes.push(this.getRoot(partMeaning));
		// fuse grammatical morphemes with neibors
		for (let i = 1; i < morphemes.length; i ++) {
			if (meaning[i].type === RootType.GRAMMATICAL) {
				if (!this.prefixing)
					morphemes.splice(i - 1, 2, morphemes[i - 1].concat(morphemes[i]));
				else
					morphemes.splice(i - 1, 2, morphemes[i].concat(morphemes[i - 1]));
			}
		}
		// adjust the order if this language is head-initial
		if (this.prefixing)
			morphemes.reverse();
		// add some stress
		const result = new Word(this.stressRule.apply(morphemes), this);
		// return the result
		if (LOG_ETYMOLOGIES)
			console.log(`new word: [${result.morphemes.map(m => transcribe(m)).join("-")}] means '${meaning.map(m => m.english).join("-")}'.`);
		return result;
	}

	/**
	 * generate a new random word root
	 * @param meaning the english translation of this root.  the length of this string will be proportional to the
	 *                length of the resulting root.  other than that, the exact content of the string doesn't matter;
	 *                it's essentially a pseudorandom seed.
	 */
	getRoot(meaning: Meaning): Sound[] {
		if (!this.roots.has(meaning)) {
			// decide how many syllables and how heavy to make each syllable
			let length;
			if (meaning.type === RootType.GRAMMATICAL)
				length = 1/this.complexity; // grammatical affixes
			else if (meaning.type === RootType.SHORT)
				length = 2/this.complexity; // basic words used for compounds
			else
				length = 5/this.complexity; // other roots
			const seed = this.seed + decodeBase37(meaning.english);
			const rng = new Random(seed);
			let syllableNumber, multiplier;
			if (length > 1) {
				syllableNumber = Math.round(length + rng.uniform(-1/2, 1/2));
				multiplier = 1;
			}
			else {
				syllableNumber = 1;
				multiplier = length;
			}
			// generate one syllable at a time
			let mul = [];
			for (let i = 0; i < syllableNumber; i ++) {
				if (rng.probability(ProtoLect.P_ONSET*multiplier))
					mul.push(rng.choice(this.onsets));
				if (this.medials.length > 0 && rng.probability(ProtoLect.P_MEDIAL*multiplier))
					mul.push(rng.choice(this.medials));
				mul.push(rng.choice(this.vowels));
				if (this.codas.length > 0 && rng.probability(ProtoLect.P_CODA*multiplier))
					mul.push(rng.choice(this.codas));
			}
			// save it in our cache
			this.roots.set(meaning, mul);
			// print some debug messages, if desired
			if (LOG_ETYMOLOGIES)
				console.log(`new root: [${transcribe(mul)}] means '${meaning.english}'.`);
		}
		return this.roots.get(meaning);
	}

	getGender(meaning: Meaning): Meaning | null {
		if (this.genders.length === null)
			throw new Error("um actually this language doesn't have grammatical gender.");
		else {
			const seed = this.seed + decodeBase37(meaning.english) + 1;
			const rng = new Random(seed);
			return rng.choice(this.genders);
		}
	}
}

/**
 * a Lect derived from a ProtoLect with phonological processes
 */
export class Dialect extends Lect {
	private readonly processes: Process[];

	constructor(parent: Lect, homelandIndex: number, rng: Random) {
		super(parent, homelandIndex, rng);

		this.processes = [];
		for (const {chanse, proces} of PROCESS_OPTIONS)
			if (rng.probability(chanse))
				this.processes.push(proces);
	}

	getWord(meaning: Meaning[]): Word {
		const oldWord = this.parent.getWord(meaning);
		let morphemes = oldWord.morphemes;
		for (const change of this.processes)
			morphemes = change.apply(morphemes);
		let newWord = new Word(morphemes, this);
		if (LOG_ETYMOLOGIES)
			if (newWord.toString("ipa") !== oldWord.toString("ipa"))
				console.log(`    ${oldWord.toString("ipa")} -> ${newWord.toString("ipa")}`);
		return newWord;
	}

	getGender(meaning: Meaning): Meaning | null {
		return this.parent.getGender(meaning);
	}
}
