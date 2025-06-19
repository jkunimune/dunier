/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Sound} from "./sound.js";
import {Lect} from "./lect.js";
import {transcribe} from "./script.js";

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
			return transcribe(this.parts, this.language.defaultStyle);
		else
			return transcribe(this.parts, style);
	}
}
