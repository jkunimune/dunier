/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Sound} from "./sound.js";
import {Lect} from "./lect.js";
import {transcribe} from "./script.js";

export class Word {
	public readonly segments: Sound[];
	public readonly language: Lect;
	public readonly length: number;

	constructor(segments: Sound[], language: Lect) {
		this.segments = segments;
		this.language = language;
		this.length = this.segments.length;
	}

	/**
	 * strip this of its linguistic context so that it is just a string of phones (and
	 * will render in the IPA by default)
	 */
	pronunciation(): Word {
		return new Word(this.segments, null);
	}

	/**
	 * transcribe this in the given orthographick style, or its native romanizacion
	 * system if none is specified
	 */
	toString(style: string = null): string {
		if (this.language === null) // if language is null, this is just phonetick informacion and should be put in phonetick notacion regardless of the specified Style
			return transcribe(this.segments, 'ipa');
		else if (style !== null) // otherwise, use the specified style
			return transcribe(this.segments, style);
		else // otherwise, use the native style of this word's language
			return transcribe(this.segments, this.language.defaultStyle);
	}
}
