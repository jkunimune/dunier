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
import {Random} from "../util/random.js";
import {Sound} from "./sound.js";
import {DEFAULT_STRESS, Process, PROCESS_OPTIONS} from "./process.js";
import {ipa} from "./script.js";
import {Word} from "./word.js";
import {Enumify} from "../lib/enumify.js";
import {decodeBase37} from "../util/util.js";


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
	static CITY = new WordType(3, 6, 'city');
	static FAMILY = new WordType(4, 12, 'family');
	static OTHER = new WordType(5, 0, 'other');
	static _ = WordType.closeEnum();

	constructor(index: number, numClassifiers: number, asString: string) {
		super();
		this.index = index;
		this.numClassifiers = numClassifiers;
		this.asString = asString;
	}
}

/**
 * a collection of similar words.
 */
export abstract class Lect {
	public readonly defaultStyle: string; // this language's preferd romanization style
	public readonly prefixing: boolean; // whether this language prefers prefixen
	public macrolanguage: Lect; // the proto-language for the set of lects intelligible to this one

	protected constructor(defaultStyle: string, rightBranching: boolean) {
		this.defaultStyle = defaultStyle;
		this.prefixing = rightBranching;
	}

	/**
	 * get a name from this language. the style of name and valid indices depend on the WordType:
	 * @param index the pseudorandom seed of the name
	 * @param tipo the type of name
	 */
	abstract getName(index: string, tipo: WordType): Word;

	/**
	 * get the language that this was n timesteps ago
	 * @param n the number of steps backward, in centuries.
	 */
	abstract getAncestor(n: number): Lect;

	/**
	 * is this language actually a dialect of lang?
	 * @param lang
	 */
	isIntelligible(lang: Lect): boolean {
		return this.macrolanguage === lang.macrolanguage;
	}
}

export class ProtoLang extends Lect {
	private static VOWELS = ipa("aiueoəɛɔyø");
	private static CONSON = ipa("mnptksljwhfbdɡrzŋʃʔxqvɣθʙ");
	private static MEDIAL = ipa("ljwr");
	private static R_INDEX = ProtoLang.CONSON.indexOf(ipa("r")[0]); // note the index of r, because it's phonotactically important

	private static P_ONSET = 0.8;
	private static P_MEDIAL = 0.4;
	private static P_NUCLEUS = 1.5;
	private static P_CODA = 0.4;

	private readonly diversity: number; // the typical number of lexical suffixes used for one type of word
	private readonly nConson: number; // the number of consonants in this language
	private readonly nVowel: number; // the number of vowels in this langugage
	private readonly nMedial: number; // the numer of medials in this language
	private readonly complexity: number; // the approximate amount of information in one syllable
	private readonly name: Map<WordType, Map<string, Word>>; // the word references of each type
	private readonly classifiers: Map<WordType, Sound[][]>; // the noun classifiers
	private readonly fin: Sound[][]; // the noun endings

	constructor(rng: Random) {
		super(
			rng.discrete(0, 4).toString(),
			rng.probability(0.2));
		this.macrolanguage = this;

		this.nConson = 7 + rng.binomial(18, .5); // choose how many consonants the protolanguage will have
		this.nVowel = 5 + rng.binomial(5, .1); // choose how many nuclei it will have
		this.nMedial = (this.nConson > ProtoLang.R_INDEX) ? 4 : 0;
		this.complexity = 2*Math.log10(1 + this.nConson)
			+ Math.log10(1 + this.nMedial) + Math.log10(1 + this.nVowel);

		this.fin = [];
		const numGenders = rng.probability(.3) ? 0 : rng.discrete(2, 6);
		for (let i = 0; i < numGenders; i ++) // choose how much basic suffixing to do
			this.fin.push(this.noveMul('fmncrh'[i], 0.5));

		this.diversity = rng.uniform(0, 1); // choose how much lexical suffixing to do
		this.name = new Map<WordType, Map<string, Word>>();
		this.classifiers = new Map<WordType, Sound[][]>();
		for (const wordType of WordType) {
			this.name.set(<WordType>wordType, new Map<string, Word>());
			this.classifiers.set(<WordType>wordType, []);
			for (let i = 0; i < Math.round(this.diversity*(<WordType>wordType).numClassifiers); i ++) // TODO countries can be named after cities
				this.classifiers.get(<WordType>wordType).push(
					this.noveLoga(`${(<WordType>wordType).asString}${i}`, 1.5/this.complexity));
		}
	}

	getName(index: string, tipo: WordType): Word {
		if (!this.name.get(tipo).has(index)) {
			const base = this.noveLoga(index, 4/this.complexity); // get the base

			let name;
			if (this.classifiers.get(tipo).length === 0)
				name = base;
			else {
				const seed = decodeBase37(index) + 100;
				const rng = new Random(seed);
				const classifierOptions = this.classifiers.get(tipo);
				const classifier = rng.choice(classifierOptions);
				if (this.prefixing)
					name = classifier.concat([Sound.PAUSE], base);
				else
					name = base.concat([Sound.PAUSE], classifier);
			}

			this.name.get(tipo).set(index,
				DEFAULT_STRESS.apply(new Word(name, this)));
		}
		return this.name.get(tipo).get(index);
	}

	/**
	 * generate a new random word, including a gender affix
	 * @param index the pseudorandom seed for this root
	 * @param syllables the number of syllables in the root
	 */
	noveLoga(index: string, syllables: number): Sound[] {
		const root = this.noveMul(index, syllables);
		if (this.fin.length === 0)
			return root;
		else {
			const seed = decodeBase37(index);
			const rng = new Random(seed);
			const affix = rng.choice(this.fin);
			if (this.prefixing)
				return affix.concat(root);
			else
				return root.concat(affix);
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
			if (rng.probability(ProtoLang.P_ONSET*syllableSize))
				mul.push(rng.choice(ProtoLang.CONSON.slice(0, this.nConson)));
			if (this.nMedial > 0 && rng.probability(ProtoLang.P_MEDIAL*syllableSize))
				mul.push(rng.choice(ProtoLang.MEDIAL.slice(0, this.nMedial)));
			if (rng.probability(ProtoLang.P_NUCLEUS*syllableSize))
				mul.push(rng.choice(ProtoLang.VOWELS.slice(0, this.nVowel)));
			if (rng.probability(ProtoLang.P_CODA*syllableSize))
				mul.push(rng.choice(ProtoLang.CONSON.slice(0, this.nConson)));
		}
		return mul;
	}

	getAncestor(n: number): Lect {
		return this;
	}

	isIntelligible(lang: Lect): boolean {
		return this === lang;
	}
}

export class Dialect extends Lect {
	private readonly parent: Lect;
	private readonly changes: Process[];

	constructor(parent: Lect, rng: Random) {
		super(parent.defaultStyle, parent.prefixing);
		this.parent = parent;
		this.macrolanguage = this.getAncestor(DEVIATION_TIME);

		this.changes = [];
		for (const {chanse, proces} of PROCESS_OPTIONS)
			if (rng.probability(chanse))
				this.changes.push(proces);
	}

	getName(index: string, tipo: WordType) {
		return this.applyChanges(this.parent.getName(index, tipo));
	}

	applyChanges(lekse: Word): Word {
		for (const change of this.changes) {
			try {
				lekse = change.apply(lekse);
			} catch (e) {
				console.error("could not apply", change, "to", lekse, `(${lekse.toString('ipa')})`, "because");
				throw e;
			}
		}
		return lekse;
	}

	getAncestor(n: number): Lect {
		if (n <= 0)
			return this;
		else
			return this.parent.getAncestor(n - 1);
	}
}
