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
import {Fon} from "./sound.js";
import {Lect} from "./lect.js";
import {transcribe} from "./script.js";

export class Word {
	public readonly segments: Fon[];
	public readonly language: Lect;
	public readonly length: number;

	constructor(segments: Fon[], language: Lect) {
		this.segments = segments;
		this.language = language;
		this.length = this.segments.length
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
			return transcribe(this.segments, 'ipa')
		else if (style !== null) // otherwise, use the specified style
			return transcribe(this.segments, style);
		else // otherwise, use the native style of this word's language
			return transcribe(this.segments, this.language.defaultStyle);
	}
}
