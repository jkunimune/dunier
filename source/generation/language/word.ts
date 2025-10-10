/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Sound} from "./sound.js";
import {Lect} from "./lect.js";
import {transcribePhrase, transcribeWord} from "./script.js";

/**
 * an immutable collection of sounds with spelling information attached
 */
export class Word {
	/** the pronunciation */
	public readonly morphemes: Sound[][];
	/** the language of origin (this will sometimes determine how it's spelled) */
	public readonly language: Lect;

	constructor(morphemes: Sound[][], language: Lect) {
		if (morphemes.length === 0)
			throw new Error("this word is empty.");
		for (const part of morphemes)
			if (part.length === 0)
				throw new Error(`this word has an empty part: '${transcribeWord(morphemes, "ipa")}'`);
		this.morphemes = morphemes;
		this.language = language;
	}

	/**
	 * transcribe this in the given orthographick style, or its native romanizacion
	 * system if the style is '(default)'
	 */
	toString(style: string = '(default)'): string {
		if (style === '(default)')
			style = this.language.defaultTranscriptionStyle;
		return transcribeWord(this.morphemes, style);
	}
}

export class Phrase {
	/** the component words */
	public readonly words: Word[];
	/** the language of origin (this will sometimes determine how it's spelled) */
	public readonly language: Lect;

	constructor(words: Word[], language: Lect) {
		if (words.length === 0)
			throw new Error("this phrase has no words in it.");
		this.words = words;
		this.language = language;
	}

	/**
	 * transcribe this in the given orthographick style, or its native romanizacion
	 * system if the style is '(default)'
	 */
	toString(style: string = '(default)'): string {
		if (style === '(default)')
			style = this.language.defaultTranscriptionStyle;
		return transcribePhrase(this.words.map(w => w.morphemes), style);
	}
}
