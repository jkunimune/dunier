/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Sound} from "./sound.js";
import {Lect} from "./lect.js";
import {transcribe} from "./script.js";

export class Name {
	public readonly parts: Sound[][];
	public readonly language: Lect;
	public readonly length: number;

	constructor(parts: Sound[][], language: Lect) {
		for (const part of parts)
			if (part.length === 0)
				throw new Error(`this word has an empty part: '${transcribe(parts, "ipa")}'`);
		this.parts = parts;
		this.language = language;
	}

	/**
	 * strip this of its linguistic context so that it is just a string of phones (and
	 * will render in the IPA by default)
	 */
	pronunciation(): Name {
		return new Name(this.parts, null);
	}

	/**
	 * transcribe this in the given orthographick style, or its native romanizacion
	 * system if none is specified
	 */
	toString(style: string | null = null): string {
		if (this.language === null) // if language is null, this is just phonetick informacion and should be put in phonetick notacion regardless of the specified Style
			return transcribe(this.parts, 'ipa');
		else if (style !== null) // otherwise, use the specified style
			return transcribe(this.parts, style);
		else // otherwise, use the native style of this word's language
			return transcribe(this.parts, this.language.defaultStyle);
	}
}
