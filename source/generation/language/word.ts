/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Sound} from "./sound.js";
import {Lect} from "./lect.js";
import {getWordSeparator, transcribe} from "./script.js";

/**
 * an immutable collection of sounds with spelling information attached
 */
export class Word {
	/** the pronunciation */
	public readonly parts: Sound[][];
	/** the language of origin (this will sometimes determine how it's spelled) */
	public readonly language: Lect;

	constructor(parts: Sound[][], language: Lect) {
		for (const part of parts)
			if (part.length === 0)
				throw new Error(`this word has an empty part: '${transcribe(parts, "ipa")}'`);
		this.parts = parts;
		this.language = language;
	}

	/**
	 * transcribe this in the given orthographick style, or its native romanizacion
	 * system if the style is '(default)'
	 */
	toString(style: string = '(default)'): string {
		if (style === '(default)')
			style = this.language.defaultTranscriptionStyle;
		return transcribe(this.parts, style);
	}
}

/**
 * transcribe a collection of words with the proper word separator
 */
export function transcribePhrase(words: Word[], style: string = '(default)'): string {
	// this is almost trivial but there's enuff fiddliness to warrant a function
	if (style === '(default)') {
		if (words.length === 0)
			throw Error("you can't ask for the default transcription style when there are no words here.");
		style = words[0].language.defaultTranscriptionStyle;
	}
	return words.map(word => word.toString(style)).join(getWordSeparator(style));
}
