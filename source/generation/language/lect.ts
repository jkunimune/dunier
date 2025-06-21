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


const DEVIATION_TIME = 2; // TODO: replace this with a number of sound changes


/**
 * different types of nym
 */
export class WordType extends Enumify {
	public readonly index: number;
	public readonly numClassifiers: number;
	public readonly asString: string;

	static PEOPLE = new WordType(0, 1, 'people');
	static LANGUAGE = new WordType(1, 1, 'language');
	static COUNTRY = new WordType(2, 3, 'country');
	static FAMILY = new WordType(3, 12, 'family');
	static OTHER = new WordType(4, 0, 'other');
	static _ = WordType.closeEnum();

	constructor(index: number, numClassifiers: number, asString: string) {
		super();
		this.index = index;
		this.numClassifiers = numClassifiers;
		this.asString = asString;
	}
}

/**
 * an immutable definition of a language's vocabulary
 */
export abstract class Lect {
	/** this language's preferd romanization style */
	public readonly defaultStyle: string;
	/** whether this language prefers prefixen */
	public readonly prefixing: boolean;
	/** the proto-language for the set of lects intelligible to this one */
	public macrolanguage: Lect;
	/** the year in which this language was spoken */
	public readonly year: number;
	/** the seed we use to get the name of this Language's people/place of origin */
	private readonly homelandIndex: string;

	protected constructor(defaultStyle: string, rightBranching: boolean, year: number, homelandIndex: string) {
		this.defaultStyle = defaultStyle;
		this.prefixing = rightBranching;
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
	 * is this language actually a dialect of lang?
	 */
	isIntelligible(lang: Lect): boolean {
		if (this.year !== lang.year)
			throw new Error("these languages were never contemporary so we shouldn't be comparing them.");
		return this.macrolanguage === lang.macrolanguage;
	}

	getName(): Word {
		return this.getWord(this.homelandIndex, WordType.LANGUAGE);
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
	private readonly fin: Sound[][];

	constructor(year: number, homelandIndex: string, rng: Random) {
		super(
			`native${rng.discrete(0, 4)}`,
			rng.probability(0.2),
			year,
			homelandIndex);
		this.macrolanguage = this;

		this.nConson = 7 + rng.binomial(18, .5); // choose how many consonants the protolanguage will have
		this.nVowel = 5 + rng.binomial(5, .1); // choose how many nuclei it will have
		this.nMedial = (this.nConson > ProtoLect.R_INDEX) ? 4 : 0;
		this.complexity = 2*Math.log10(1 + this.nConson)
			+ Math.log10(1 + this.nMedial) + Math.log10(1 + this.nVowel);

		this.fin = [];
		const numGenders = rng.probability(.3) ? 0 : rng.discrete(2, 6);
		for (let i = 0; i < numGenders; i ++) // choose how much basic suffixing to do
			this.fin.push(this.noveMul('fmncrh'[i], 0.5));

		this.diversity = rng.uniform(0, 1); // choose how much lexical suffixing to do
		this.word = new Map<WordType, Map<string, Word>>();
		this.classifiers = new Map<WordType, Sound[][]>();
		for (const wordType of WordType) {
			this.word.set(<WordType>wordType, new Map<string, Word>());
			this.classifiers.set(<WordType>wordType, []);
			for (let i = 0; i < Math.round(this.diversity*(<WordType>wordType).numClassifiers); i ++) // TODO countries can be named after cities
				this.classifiers.get(<WordType>wordType).push(
					this.noveLoga(`${(<WordType>wordType).asString}${i}`, Math.max(1, 1.5/this.complexity)));
		}
	}

	getWord(index: string, tipo: WordType): Word {
		if (!this.word.get(tipo).has(index)) {
			const base = this.noveLoga(index, Math.max(1, 4/this.complexity)); // get the base
			if (base.length === 0)
				throw new Error(`this new word is empty; it was supposed to have ${4/this.complexity} syllables`);

			let wordParts;
			if (this.classifiers.get(tipo).length === 0)
				wordParts = [base];
			else {
				const seed = decodeBase37(index) + 100;
				const rng = new Random(seed);
				const classifierOptions = this.classifiers.get(tipo);
				const classifier = rng.choice(classifierOptions);
				if (this.prefixing)
					wordParts = [classifier, base];
				else
					wordParts = [base, classifier];
			}

			this.word.get(tipo).set(index, new Word(wordParts, this));
		}
		return this.word.get(tipo).get(index);
	}

	/**
	 * generate a new random word, including a gender affix
	 * @param index the pseudorandom seed for this root
	 * @param syllables the number of syllables in the root
	 */
	noveLoga(index: string, syllables: number): Sound[] {
		const root = this.noveMul(index, syllables);
		if (this.fin.length === 0)
			return DEFAULT_STRESS.apply(root);
		else {
			const seed = decodeBase37(index);
			const rng = new Random(seed);
			const affix = rng.choice(this.fin);
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

	constructor(parent: Lect, year: number, homelandIndex: string, rng: Random) {
		super(parent.defaultStyle, parent.prefixing, year, homelandIndex);
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
