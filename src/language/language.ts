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
import {Fon} from "./sound.js";
import {DEFAULT_ACENTE, Proces, PROCES_CHUZABLE} from "./process.js";
import {ipa, Style} from "./script.js";
import {Word} from "./word.js";


const DEVIATION_TIME = 2; // TODO: replace this with a number of sound changes


/**
 * different types of nym
 */
export enum WordType {
	JANNAM,
	FAMILNAM,
	SITONAM,
	BASHNAM,
	LOKONAM,
	DEMNAM,
}

/**
 * a collection of similar words.
 */
export abstract class Language {
	public readonly defaultStyle: Style;
	public readonly rightBranching: boolean;

	protected constructor(defaultStyle: Style, rightBranching: boolean) {
		this.defaultStyle = defaultStyle;
		this.rightBranching = rightBranching;
	}

	/**
	 * get a name from this language. the style of name and valid indices depend on the WordType:
	 * JANNAM - forename, indexed in [0, 50) TODO these numbers are silly.  make them all go [0, ∞)
	 * FAMILNAM - surname, indexed in [0, 25)
	 * SITONAM - city name, indexed in [0, 25), corresponds to the respective toponym
	 * BASHNAM - glossonym, indexed in [0, 25), corresponds to the respective toponym
	 * LOKONAM - toponym, indexed in [0, 25)
	 * DEMNAM - ethnonym, indexed in [0, 25), corresponds to the respective toponym
	 * @param i the index of the name
	 * @param type the type of name
	 */
	abstract getNamloge(i: number, type: WordType): Word;

	/**
	 * get the language that this was n timesteps ago
	 * @param n the number of steps backward, in centuries.
	 */
	abstract getAncestor(n: number): Language;

	/**
	 * is this language actually a dialect of lang?
	 * @param lang
	 */
	isIntelligible(lang: Language): boolean {
		return this.getAncestor(DEVIATION_TIME) === lang.getAncestor(DEVIATION_TIME);
	}
}

export class ProtoLang extends Language {
	private static VOWELS = ipa("aiueoɜɛɔyø");
	private static CONSON = ipa("mnptksljwhfbdɡrzŋʃʔxqvɣθʙ");
	private static MEDIAL = ipa("ljwr");
	private static R_INDEX = ProtoLang.CONSON.indexOf(ipa("r")[0]); // note the index of r, because it's phonotactically important

	private static P_ONSET = 0.8;
	private static P_MEDIAL = 0.4;
	private static P_CODA = 0.4;

	private readonly rng: Random; // this language's personal rng generator
	private readonly diversity: number; // the typical number of lexical suffixes used for one type of word
	private readonly genders: number; // the typical number of gender suffixes used for nouns
	private readonly nConson: number; // the number of consonants in this language
	private readonly nVowel: number; // the number of vowels in this langugage
	private readonly nMedial: number; // the numer of medials in this language
	private readonly complexity: number; // the approximate amount of information in one syllable
	/**
	 * the fundamental roots of this language. they are indexed as follows:
	 * [0, 6) - synonyms of "city"
	 * [6, 12) - synonyms of "land"
	 * [12, 24) - synonyms of "person"
	 * [24, 25) - word for "language"
	 * [25, 150) - generic roots
	 * @param i the index of the word, in [0, 150).
	 */
	private readonly logomul: Fon[][];
	private readonly logofin: Fon[][];

	constructor(rng: Random) {
		super(
			rng.choice([Style.CHANSAGI_0, Style.CHANSAGI_1, Style.CHANSAGI_2, Style.CHANSAGI_3]),
			rng.probability(0.2));

		this.rng = rng;
		this.diversity = Math.floor(rng.exponential(5)); // choose how much lexical suffixing to do
		this.genders = rng.discrete(0, 6); // choose how much basic suffixing to do
		this.nConson = 7 + rng.binomial(18, .5); // choose how many consonants the protolanguage will have
		this.nVowel = 5 + rng.binomial(5, .1); // choose how many nuclei it will have
		this.nMedial = (this.nConson > ProtoLang.R_INDEX) ? 4 : 0;
		this.complexity = 2*Math.log10(1 + this.nConson)
			+ Math.log10(1 + this.nMedial) + Math.log10(1 + this.nVowel);
		this.logomul = new Array<Fon[]>(150);
		this.logofin = new Array<Fon[]>(this.genders);
		if (rng.probability(.5))
			this.logomul[8] = ipa("ia"); // this is sometimes here
	}

	getLoge(asle: Fon[][], i: number): Fon[] {
		if (i < 0 || i >= asle.length)
			throw RangeError("baka.");
		if (asle[i] === undefined) {
			const nSyl = (asle === this.logofin) ? 1/2 : Math.ceil((i < 25 ? 1.5 : 4)/this.complexity);
			asle[i] = this.newRoot(nSyl, this.rng);
		}
		return asle[i];
	}

	getNamloge(i: number, type: WordType): Word { // TODO this should return a string
		switch (type) {
			case WordType.SITONAM:
				return this.suffix(i, 25, 0, 6, false);
			case WordType.LOKONAM:
				return this.suffix(i, 50, 6, 12, false); // TODO countries can be named after cities
			case WordType.DEMNAM:
				return this.suffix(i, 50, 18, 19, true); // TODO people can be named after countries
			case WordType.BASHNAM:
				return this.suffix(i, 50, 24, 25, true);
			case WordType.FAMILNAM:
				return this.suffix(i, 75, 12, 24, false);
			case WordType.JANNAM:
				return this.suffix(i, 100, 0, 0, false);
		}
	}

	/**
	 * generate a new random word root
	 * @param nSyllables the number of syllables in the word, or less than one to indicate a syllable with fewer letters
	 * @param rng
	 */
	newRoot(nSyllables: number, rng: Random): Fon[] {
		let lekse;
		const reduccion = Math.min(1, nSyllables);
		do {
			lekse = [];
			for (let i = 0; i < nSyllables; i++) {
				if (rng.probability(ProtoLang.P_ONSET * reduccion))
					lekse.push(rng.choice(ProtoLang.CONSON.slice(0, this.nConson)));
				if (this.nMedial > 0 && rng.probability(ProtoLang.P_MEDIAL * reduccion))
					lekse.push(rng.choice(ProtoLang.MEDIAL.slice(0, this.nMedial)));
				if (rng.probability(reduccion))
					lekse.push(rng.choice(ProtoLang.VOWELS.slice(0, this.nVowel)));
				if (rng.probability(ProtoLang.P_CODA * reduccion))
					lekse.push(rng.choice(ProtoLang.CONSON.slice(0, this.nConson)));
			}
		} while (nSyllables >= 1 && lekse.length < 3);
		return lekse;
	}

	/**
	 * create a new word derivative based on roots
	 * @param baseI
	 * @param base0
	 * @param affix0
	 * @param affixN
	 * @param obligatory whether the affix cannot be noting
	 */
	suffix(baseI: number, base0: number, affix0: number, affixN: number, obligatory: boolean): Word {
		const base = this.getLoge(this.logomul, base0 + baseI); // get the base
		const numAffixen = Math.min(this.diversity, affixN - affix0); // count how many options we have for affixen
		const affixI = baseI%(numAffixen + (obligatory ? 0 : 1)); // pick an affix (if it's nonobligatory, none is also an option)
		const endingI = affixI%this.genders; // pick a word ending (if genders==0, there should be no ending)
		const ending = Number.isNaN(endingI) ? [] : this.getLoge(this.logofin, endingI); // get the word ending
		let mul: Fon[];
		if (affixI === numAffixen)
			mul = base; // choosing an out of bounds affix indicates that we have chosen no affix
		else {
			const affix = this.getLoge(this.logomul, affix0 + affixI); // otherwise get the chosen affix
			if (this.rightBranching)
				mul = affix.concat([Fon.PAUSE]).concat(base); // remember to put a pause between them
			else
				mul = base.concat([Fon.PAUSE]).concat(affix);
		}
		return DEFAULT_ACENTE.apply(new Word(mul.concat(ending), this));
	}

	getAncestor(n: number): Language {
		return this;
	}

	isIntelligible(lang: Language): boolean {
		return this === lang;
	}
}

export class DeuteroLang extends Language {
	private readonly parent: Language;
	private readonly changes: Proces[];

	constructor(parent: Language, rng: Random) {
		super(parent.defaultStyle, parent.rightBranching);
		this.parent = parent;
		this.changes = [];
		for (const {chanse, proces} of PROCES_CHUZABLE)
			if (rng.probability(chanse))
				this.changes.push(proces);
	}

	getNamloge(i: number, type: WordType) {
		return this.applyChanges(this.parent.getNamloge(i, type));
	}

	applyChanges(lekse: Word): Word {
		for (const change of this.changes)
			lekse = change.apply(lekse);
		return lekse;
	}

	getAncestor(n: number): Language {
		if (n <= 0)
			return this;
		else
			return this.parent.getAncestor(n - 1);
	}


}
