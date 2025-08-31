/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Random} from "../../utilities/random.js";
import {Sound} from "./sound.js";
import {DEFAULT_STRESS, WordProcess, PhraseProcess, WORD_PROCESS_OPTIONS, PHRASE_PROCESS_OPTIONS} from "./process.js";
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
	else if (p < 5/3)
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
		numFamilyNames = rng.probability(1/3) ? 0 : (rng.probability(3/4) ? 1 : 2);
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
	/** the year in which this language was spoken */
	public readonly year: number;
	/** the seed we use to get the name of this Language's people/place of origin */
	private readonly homelandIndex: number;

	protected constructor(defaultTranscriptionStyle: string, nameStyle: NameStyle,
	                      year: number, homelandIndex: number) {
		this.defaultTranscriptionStyle = defaultTranscriptionStyle;
		this.nameStyle = nameStyle;
		this.year = year;
		this.homelandIndex = homelandIndex;
	}

	/**
	 * get a word from this language. the style of word and valid indices depend on the WordType:
	 * @param index the pseudorandom seed of the word
	 * @param tipo the type of word
	 */
	abstract getWord(index: string, tipo: WordType): Word;

	/**
	 * get the language that this was n timesteps ago
	 * @param n the number of steps backward, in centuries.
	 */
	abstract getAncestor(n: number): Lect;

	/**
	 * get a full personal name given a set of random seeds
	 * @param seeds
	 */
	getFullName(seeds: number[]): Word {
		if (seeds.length !== MAX_NUM_NAME_PARTS)
			throw new Error("wrong number of seeds");
		// put in whatever components we want
		const nameParts: Sound[][][] = [];
		let seedIndex = 0;
		for (let i = 0; i < this.nameStyle.numGivenNames; i ++) {
			nameParts.push(this.getWord(`name${seeds[seedIndex]}`, WordType.GENERIC).parts);
			seedIndex ++;
		}
		if (this.nameStyle.parentName) {
			nameParts.push(this.getWord(`name${seeds[seedIndex]}`, WordType.PARENTAGE).parts);
			seedIndex ++;
		}
		for (let i = 0; i < this.nameStyle.numFamilyNames; i ++) {
			nameParts.push(this.getWord(`family${seeds[seedIndex]}`, WordType.FAMILY).parts);
			seedIndex ++;
		}
		if (this.nameStyle.originName) {
			nameParts.push(this.getWord("of", WordType.GRAMMATICAL_PARTICLE).parts);
			nameParts.push(this.getWord(`place${seeds[seedIndex]}`, WordType.CITY).parts);
		}

		// account for variable name order
		if (!this.nameStyle.givenFirst)
			nameParts.reverse();

		// remove spaces in individual components
		const names = nameParts.map((parts) => [].concat(...parts));

		return new Word(names, this);
	}

	/**
	 * is this language actually a dialect of lang?
	 */
	isIntelligible(lang: Lect): boolean {
		if (this.year !== lang.year)
			throw new Error("these languages were never contemporary so we shouldn't be comparing them.");
		return this.macrolanguage === lang.macrolanguage;
	}

	getName(): Word {
		return this.getWord(`place${this.homelandIndex}`, WordType.LANGUAGE);
	}
}

/**
 * an original Lect
 */
export class ProtoLect extends Lect {
	private static VOWELS = ipa("aiueoəɛɔyø");
	private static CONSON = ipa("mnptksljwhfbdɡrzŋʃʔxqvɣθʙ");
	private static MEDIAL = ipa("ljwr");
	private static R_INDEX = ProtoLect.CONSON.indexOf(ipa("r")[0]); // note the index of r, because it's phonotactically important

	private static P_ONSET = 0.8;
	private static P_MEDIAL = 0.4;
	private static P_NUCLEUS = 2.0;
	private static P_CODA = 0.4;

	/** whether this language prefers prefixen */
	private readonly prefixing: boolean;
	/** what kinds of suffixes to use for names of countries, peoples, and languages */
	private readonly toponymAffixStyle: ToponymClassifierStyle;
	/** the typical number of lexical suffixes used for one type of word */
	private readonly diversity: number;
	/** the number of consonants in this language */
	private readonly nConson: number;
	/** the number of vowels in this langugage */
	private readonly nVowel: number;
	/** the numer of medials in this language */
	private readonly nMedial: number;
	/** the approximate amount of information in one syllable */
	private readonly complexity: number;
	/** the word references of each type */
	private readonly word: Map<WordType, Map<string, Word>>;
	/** the noun classifiers */
	private readonly classifiers: Map<WordType, Sound[][]>;
	/** the noun endings */
	private readonly affixes: Map<PartOfSpeech, Sound[][]>;

	constructor(year: number, homelandIndex: number, rng: Random) {
		super(
			`native${rng.discrete(0, 4)}`,
			rollNewNameStyle(rng),
			year,
			homelandIndex);
		this.macrolanguage = this;

		this.prefixing = rng.probability(0.2);
		this.toponymAffixStyle = rollNewToponymClassifierStyle(rng);

		this.nConson = 7 + rng.binomial(18, .5); // choose how many consonants the protolanguage will have
		this.nVowel = 5 + rng.binomial(5, .1); // choose how many nuclei it will have
		this.nMedial = (this.nConson > ProtoLect.R_INDEX) ? 4 : 0;
		this.complexity = 2*Math.log10(1 + this.nConson)
			+ Math.log10(1 + this.nMedial) + Math.log10(1 + this.nVowel);

		this.affixes = new Map<PartOfSpeech, Sound[][]>();
		for (let partOfSpeech = 0; partOfSpeech < 3; partOfSpeech ++) {
			const affixes: Sound[][] = [];
			if (partOfSpeech !== PartOfSpeech.NONE) {
				const numGenders = rng.probability(1/2) ? 0 : rng.discrete(2, 6);
				for (let i = 0; i < numGenders; i++) // choose how much basic suffixing to do
					affixes.push(this.noveMul('fmncrh'[i], 0.5));
			}
			this.affixes.set(partOfSpeech, affixes);
		}

		this.word = new Map<WordType, Map<string, Word>>();
		this.classifiers = new Map<WordType, Sound[][]>();
		let classifierSeed = 0;
		for (const wordType of WordType) {
			this.word.set(<WordType>wordType, new Map<string, Word>());
			const classifiers: Sound[][] = [];
			const numClassifiers = Math.round(this.diversity*(<WordType>wordType).numClassifiers);
			for (let i = 0; i < numClassifiers; i++) { // TODO countries can be named after cities
				classifiers.push(this.noveLoga(
					`${classifierSeed}`, Math.max(1, 1.5/this.complexity),
					(<WordType>wordType).partOfSpeech));
				classifierSeed++;
			}
			this.classifiers.set(<WordType>wordType, classifiers);
		}
	}

	getWord(index: string, tipo: WordType): Word {
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
			const size = (tipo === WordType.GRAMMATICAL_PARTICLE) ? 1.0 : 4/this.complexity;
			const base = this.noveLoga(index, Math.max(1, size), baseForm);
			if (base.length === 0)
				throw new Error(`this new word is empty; it was supposed to have ${4/this.complexity} syllables`);

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
	noveLoga(index: string, syllables: number, partOfSpeech: PartOfSpeech): Sound[] {
		const root = this.noveMul(index, syllables);
		if (this.affixes.get(partOfSpeech).length === 0)
			return DEFAULT_STRESS.apply(root);
		else {
			const seed = decodeBase37(index);
			const rng = new Random(seed);
			const affix = rng.choice(this.affixes.get(partOfSpeech));
			if (this.prefixing)
				return DEFAULT_STRESS.apply(affix.concat(root));
			else
				return DEFAULT_STRESS.apply(root.concat(affix));
		}
	}

	/**
	 * generate a new random word root
	 * @param index the pseudorandom seed for this root as a lowercase base-36 string
	 * @param syllables the number of syllables in this root
	 */
	noveMul(index: string, syllables: number): Sound[] {
		const seed = decodeBase37(index);
		const rng = new Random(seed);
		const syllableNumber = Math.ceil(syllables);
		const syllableSize = syllables/syllableNumber;
		let mul = [];
		for (let i = 0; i < syllableNumber; i++) {
			if (rng.probability(ProtoLect.P_ONSET*syllableSize))
				mul.push(rng.choice(ProtoLect.CONSON.slice(0, this.nConson)));
			if (this.nMedial > 0 && rng.probability(ProtoLect.P_MEDIAL*syllableSize))
				mul.push(rng.choice(ProtoLect.MEDIAL.slice(0, this.nMedial)));
			if (rng.probability(ProtoLect.P_NUCLEUS*syllableSize))
				mul.push(rng.choice(ProtoLect.VOWELS.slice(0, this.nVowel)));
			if (rng.probability(ProtoLect.P_CODA*syllableSize))
				mul.push(rng.choice(ProtoLect.CONSON.slice(0, this.nConson)));
		}
		return mul;
	}

	getAncestor(_n: number): Lect {
		return this;
	}

	isIntelligible(lang: Lect): boolean {
		return this === lang;
	}
}

/**
 * a Lect derived from a ProtoLect with phonological processes
 */
export class Dialect extends Lect {
	private readonly parent: Lect;
	private readonly wordProcesses: WordProcess[];
	private readonly phraseProcesses: PhraseProcess[];

	constructor(parent: Lect, year: number, homelandIndex: number, rng: Random) {
		super(parent.defaultTranscriptionStyle, rollNewNameStyle(rng, parent.nameStyle), year, homelandIndex);
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

	getWord(index: string, tipo: WordType) {
		return this.applyChanges(this.parent.getWord(index, tipo));
	}

	applyChanges(lekse: Word): Word {
		const newParts = [];
		for (let part of lekse.parts) {
			for (const change of this.wordProcesses)
				part = change.apply(part);
			newParts.push(part);
		}
		let newLekse = new Word(newParts, lekse.language);
		for (const change of this.phraseProcesses)
			newLekse = change.apply(newLekse);
		return newLekse;
	}

	getAncestor(n: number): Lect {
		if (n <= 0)
			return this;
		else
			return this.parent.getAncestor(n - 1);
	}
}
