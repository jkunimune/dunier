/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Random} from "../../utilities/random.js";
import {Sound} from "./sound.js";
import {WordProcess, PhraseProcess, WORD_PROCESS_OPTIONS, PHRASE_PROCESS_OPTIONS, StressPlacement} from "./process.js";
import {ipa} from "./script.js";
import {Word} from "./word.js";
import {Enumify} from "../../utilities/external/enumify.js";
import {decodeBase37} from "../../utilities/miscellaneus.js";


/** the maximum number of names a person can have */
export const MAX_NUM_NAME_PARTS = 4;
/** the number of centuries that two dialects must evolve independently before they're considered separate languages */
const DEVIATION_TIME = 2;
/** the rate at which suprasegmental linguistic details change per century */
const DRIFT_RATE = .05;

/**
 * different types of word ending
 */
enum PartOfSpeech {
	NOUN, ADJECTIVE, NONE,
}

/**
 * different types of nym
 */
export class WordType extends Enumify {
	public readonly numClassifiers: number;
	public readonly partOfSpeech: PartOfSpeech;

	static GENERIC = new WordType(0, PartOfSpeech.NOUN);
	static PEOPLE = new WordType(1, PartOfSpeech.NOUN);
	static LANGUAGE = new WordType(1, PartOfSpeech.NOUN);
	static CITY = new WordType(4, PartOfSpeech.NOUN);
	static COUNTRY = new WordType(3, PartOfSpeech.NOUN);
	static FAMILY = new WordType(6, PartOfSpeech.NOUN);
	static PARENTAGE = new WordType(1, PartOfSpeech.NOUN);
	static ADJECTIVE = new WordType(2, PartOfSpeech.ADJECTIVE);
	static GRAMMATICAL_PARTICLE = new WordType(1, PartOfSpeech.NONE);
	static _ = WordType.closeEnum();

	constructor(numClassifiers: number, partOfSpeech: PartOfSpeech) {
		super();
		this.numClassifiers = numClassifiers;
		this.partOfSpeech = partOfSpeech;
	}
}

/**
 * arrangement of suffixes in words for peoples, places, and languages
 */
interface ToponymClassifierStyle {
	country: WordType;
	people: WordType;
	language: WordType;
}

/**
 * randomly generate a new system of toponym suffixes
 */
function rollNewToponymClassifierStyle(rng: Random): ToponymClassifierStyle {
	const p = rng.random();
	if (p < 1/6)
		return { country: WordType.GENERIC, people: WordType.ADJECTIVE, language: WordType.ADJECTIVE };
	else if (p < 1/3)
		return { country: WordType.GENERIC, people: WordType.PEOPLE, language: WordType.LANGUAGE };
	else if (p < 1/2)
		return { country: WordType.COUNTRY, people: WordType.GENERIC, language: WordType.LANGUAGE };
	else if (p < 2/3)
		return { country: WordType.COUNTRY, people: WordType.PEOPLE, language: WordType.GENERIC };
	else if (p < 5/6)
		return { country: WordType.COUNTRY, people: WordType.ADJECTIVE, language: WordType.ADJECTIVE };
	else
		return { country: WordType.COUNTRY, people: WordType.PEOPLE, language: WordType.LANGUAGE };
}

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
	/** this language's preferd romanization style */
	public readonly defaultTranscriptionStyle: string;
	/** how names are set up in this language */
	public readonly nameStyle: NameStyle;
	/** the proto-language for the set of lects intelligible to this one */
	public macrolanguage: Lect;
	/** the seed we use to get the name of this Language's people/place of origin */
	private readonly homelandIndex: number;

	protected constructor(defaultTranscriptionStyle: string, nameStyle: NameStyle,
	                      homelandIndex: number) {
		this.defaultTranscriptionStyle = defaultTranscriptionStyle;
		this.nameStyle = nameStyle;
		this.homelandIndex = homelandIndex;
	}

	/**
	 * get a word from this language. the style of word and valid indices depend on the WordType:
	 * @param index the pseudorandom seed of the word
	 * @param tipo the type of word
	 */
	abstract getProperWord(index: string, tipo: WordType): Word;

	/**
	 * get the language that this was n timesteps ago
	 * @param n the number of steps backward, in centuries.
	 */
	abstract getAncestor(n: number): Lect;

	/**
	 * get a full personal name given a set of random seeds
	 * @param seeds
	 */
	getFullName(seeds: number[]): Word[] {
		if (seeds.length !== MAX_NUM_NAME_PARTS)
			throw new Error("wrong number of seeds");
		// put in whatever components we want
		const nameParts: Word[] = [];
		let seedIndex = 0;
		for (let i = 0; i < this.nameStyle.numGivenNames; i ++) {
			nameParts.push(this.getProperWord(`name${seeds[seedIndex]}`, WordType.GENERIC));
			seedIndex ++;
		}
		if (this.nameStyle.parentName) {
			nameParts.push(this.getProperWord(`name${seeds[seedIndex]}`, WordType.PARENTAGE));
			seedIndex ++;
		}
		for (let i = 0; i < this.nameStyle.numFamilyNames; i ++) {
			nameParts.push(this.getProperWord(`family${seeds[seedIndex]}`, WordType.FAMILY));
			seedIndex ++;
		}
		if (this.nameStyle.originName) { // this one requires "of" to be connected to the city name TODO use a real city name
			const part = [
				this.getProperWord("of", WordType.GRAMMATICAL_PARTICLE).parts[0],
				[].concat(...this.getProperWord(`place${seeds[seedIndex]}`, WordType.CITY).parts),
			];
			if (!this.nameStyle.givenFirst)
				part.reverse();
			nameParts.push(new Word(part, this));
		}

		// account for variable name order
		if (!this.nameStyle.givenFirst)
			nameParts.reverse();

		return nameParts;
	}

	/**
	 * is this language actually a dialect of lang?
	 */
	isIntelligible(lang: Lect): boolean {
		return this.macrolanguage === lang.macrolanguage;
	}

	getName(): Word {
		return this.getProperWord(this.homelandIndex.toString(), WordType.LANGUAGE);
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

	/** whether this language prefers prefixen */
	private readonly prefixing: boolean;
	/** what stress rule does this language use */
	private readonly stressRule: StressPlacement;
	/** what kinds of suffixes to use for names of countries, peoples, and languages */
	private readonly toponymAffixStyle: ToponymClassifierStyle;
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
	private readonly word: Map<WordType, Map<string, Word>>;
	/** the noun classifiers */
	private readonly classifiers: Map<WordType, Sound[][]>;
	/** the noun endings */
	private readonly affixes: Map<PartOfSpeech, Sound[][]>;
	/** the random number seed to use when composing original words */
	private readonly seed: number;

	constructor(homelandIndex: number, rng: Random) {
		super(
			`native${rng.discrete(0, 4)}`,
			rollNewNameStyle(rng),
			homelandIndex);
		this.seed = rng.next();
		this.macrolanguage = this;

		this.prefixing = rng.probability(0.2);
		this.toponymAffixStyle = rollNewToponymClassifierStyle(rng);

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

		const numGenders = rng.probability(1/2) ? 0 : rng.discrete(2, 6);
		this.affixes = new Map<PartOfSpeech, Sound[][]>();
		for (let partOfSpeech = 0; partOfSpeech < 3; partOfSpeech ++) {
			const affixes: Sound[][] = [];
			if (partOfSpeech !== PartOfSpeech.NONE) {
				for (let i = 0; i < numGenders; i ++) // choose how much basic suffixing to do
					affixes.push(this.getRoot('fmncrh'[i] + partOfSpeech.toString(), 0.6));
			}
			this.affixes.set(partOfSpeech, affixes);
		}

		this.word = new Map<WordType, Map<string, Word>>();
		this.classifiers = new Map<WordType, Sound[][]>();
		let classifierSeed = 0;
		for (const wordType of WordType) {
			this.word.set(<WordType>wordType, new Map<string, Word>());
			const classifiers: Sound[][] = [];
			const numClassifiers = Math.round((<WordType>wordType).numClassifiers);
			for (let i = 0; i < numClassifiers; i++) { // TODO countries can be named after cities
				classifiers.push(this.getCommonWord(
					`${classifierSeed}`, Math.max(1, 3/this.complexity),
					(<WordType>wordType).partOfSpeech));
				classifierSeed ++;
			}
			this.classifiers.set(<WordType>wordType, classifiers);
		}
	}

	getProperWord(index: string, tipo: WordType): Word {
		if (!this.word.get(tipo).has(index)) {
			// decide what kind of classifier we should use (usually the one that directly corresponds to tipo but the toponym style can differ)
			if (tipo === WordType.COUNTRY)
				tipo = this.toponymAffixStyle.country;
			else if (tipo === WordType.PEOPLE)
				tipo = this.toponymAffixStyle.people;
			else if (tipo === WordType.LANGUAGE)
				tipo = this.toponymAffixStyle.language;
			const availableClassifiers = this.classifiers.get(tipo);

			// decide whether the base needs a word ending (or if this is a compound word)
			let baseForm;
			if (availableClassifiers.length === 0)
				baseForm = tipo.partOfSpeech;
			else
				baseForm = PartOfSpeech.NONE;

			// get the base
			const size = (tipo === WordType.GRAMMATICAL_PARTICLE) ? 1 : Math.max(1, 5/this.complexity);
			const base = this.getCommonWord(index, Math.max(1, size), baseForm);
			if (base.length === 0)
				throw new Error(`this new word is empty; it was supposed to have ${size} syllables`);

			// choose a classifier
			let wordParts;
			if (availableClassifiers.length > 0) {
				const seed = decodeBase37(index) + 100;
				const rng = new Random(seed);
				const classifierOptions = this.classifiers.get(tipo);
				const classifier = rng.choice(classifierOptions);

				if (this.prefixing)
					wordParts = [classifier, base];
				else
					wordParts = [base, classifier];
			}
			else
				wordParts = [base];

			this.word.get(tipo).set(index, new Word(wordParts, this));
		}
		return this.word.get(tipo).get(index);
	}

	/**
	 * generate a new random word, including a gender affix
	 * @param index the pseudorandom seed for this root
	 * @param syllables the number of syllables in the root
	 * @param partOfSpeech the type of word to determine what if any ending it should get
	 */
	getCommonWord(index: string, syllables: number, partOfSpeech: PartOfSpeech): Sound[] {
		const root = this.getRoot(index, syllables);
		if (this.affixes.get(partOfSpeech).length === 0)
			return this.stressRule.apply(root);
		else {
			const seed = decodeBase37(index);
			const rng = new Random(seed);
			const affix = rng.choice(this.affixes.get(partOfSpeech));
			if (this.prefixing)
				return this.stressRule.apply(affix.concat(root));
			else
				return this.stressRule.apply(root.concat(affix));
		}
	}

	/**
	 * generate a new random word root
	 * @param index the pseudorandom seed for this root as a lowercase base-36 string
	 * @param syllables the number of syllables in this root
	 */
	getRoot(index: string, syllables: number): Sound[] {
		const seed = this.seed + decodeBase37(index);
		const rng = new Random(seed);
		let syllableNumber, multiplier;
		if (syllables > 1) {
			syllableNumber = Math.round(syllables + rng.uniform(-1/2, 1/2));
			multiplier = 1;
		}
		else {
			syllableNumber = 1;
			multiplier = syllables;
		}
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
		return mul;
	}

	getAncestor(_n: number): Lect {
		return this;
	}
}

/**
 * a Lect derived from a ProtoLect with phonological processes
 */
export class Dialect extends Lect {
	private readonly parent: Lect;
	private readonly wordProcesses: WordProcess[];
	private readonly phraseProcesses: PhraseProcess[];

	constructor(parent: Lect, homelandIndex: number, rng: Random) {
		super(
			parent.defaultTranscriptionStyle, rollNewNameStyle(rng, parent.nameStyle),
			homelandIndex);
		this.parent = parent;
		this.macrolanguage = this.getAncestor(DEVIATION_TIME);

		this.wordProcesses = [];
		this.phraseProcesses = [];
		for (const {chanse, proces} of WORD_PROCESS_OPTIONS)
			if (rng.probability(chanse))
				this.wordProcesses.push(proces);
		for (const {chanse, proces} of PHRASE_PROCESS_OPTIONS)
			if (rng.probability(chanse))
				this.phraseProcesses.push(proces);
	}

	getProperWord(index: string, tipo: WordType) {
		const oldWord = this.parent.getProperWord(index, tipo);
		const newParts = [];
		for (let part of oldWord.parts) {
			for (const change of this.wordProcesses)
				part = change.apply(part);
			newParts.push(part);
		}
		let newWord = new Word(newParts, oldWord.language);
		for (const change of this.phraseProcesses)
			newWord = change.apply(newWord);
		return newWord;
	}

	getAncestor(n: number): Lect {
		if (n <= 0)
			return this;
		else
			return this.parent.getAncestor(n - 1);
	}
}
