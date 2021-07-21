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
import {format} from "../util/util.js";
import {DeuteroLang, Language, ProtoLang} from "../language/language.js";


const HEADERS: string[] = [
	"muzika ye {0} e uze ba poli {1}.  ",
	"le {0} fuku {2} {1}.  ",
];
const CHUZABLE: string[][][] = [
	[
		["tritonic", "pentatonic", "heptatonic"],
		["drums", "panpipes", "saxophones"],
	], [
		["men", "women", "children"],
		["turbans", "robes", "hats", "shoes"],
		["white", "black"],
	] // TODO: read from disk
]

const FACTOID_NUMBER = 1;//4; // the average number of factoids each Kultur should have
const FACTOID_FRACCION = FACTOID_NUMBER/CHUZABLE.length;
const DRIFT_RATE = .05; // fraccion of minor attributes that change each century

/**
 * a class that contains factoids about a peeple groop.
 */
export class Kultur {
	private readonly sif: string[][];
	// private emphasis: boolean[];
	public readonly language: Language;

	/**
	 * base a kultur off of some ancestor kultur, with some changes
	 * @param parent
	 * @param rng
	 */
	constructor(parent: Kultur, rng: Random) {
		this.sif = [];
		for (let i = 0; i < CHUZABLE.length; i ++) {
			if (parent !== null) { // if a parent is provided
				this.sif.push(parent.sif[i].slice()); // base this off of it
				for (let j = 0; j < CHUZABLE[i].length; j ++)
					this.sif[i].push(rng.choice(CHUZABLE[i][j])); // with some minor adjustments
				this.language = new DeuteroLang(parent.language, rng);
			}
			else {
				this.sif.push([]);
				for (let j = 0; j < CHUZABLE[i].length; j ++)
					this.sif[i].push(rng.choice(CHUZABLE[i][j])); // TODO: check for compatibility before choosing cultural features
				this.language = new ProtoLang(rng); // create a new language from scratch
			}
		}
	}

	/**
	 * are these two Kulturs' languages mutually intelligible?
	 * @param that
	 */
	isIntelligible(that: Kultur): boolean {
		return this.language.isIntelligible(that.language);
	}

	/**
	 * format this Kultur as a nice short paragraff
	 */
	toString(): string {
		let str = "";
		for (let i = 0; i < this.sif.length; i ++) // TODO: only show some informacion for each country
			str += format(HEADERS[i], ...this.sif[i]);
		return str.trim();
	}
}
