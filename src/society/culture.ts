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
import {Dialect, Lect, LogaTipo, ProtoLang} from "../language/lect.js";
import {loadTSV} from "../util/fileio.js";
import {Nodo} from "../planet/surface.js";
import {Civ} from "./civ.js";


class Sif {
	public readonly kode: string;
	public readonly nam: string;
	public readonly klas: string; // describing classes
	private readonly requiredKlas: Set<string>; // classes that must be present for this
	public readonly forbiddenKlas: Set<string>; // class that may not be present for this
	private readonly forbiddenBiomes: Set<string>; // biomes where this cannot be used
	private readonly technology: number; // the tech level needed for this

	constructor(header: string, subheader: string, args: string[]) {
		this.kode = `data.${header}.${subheader}.${args[0]}`;
		this.nam = args[0];
		this.klas = subheader;
		this.requiredKlas = new Set<string>();
		this.forbiddenKlas = new Set<string>();
		this.forbiddenBiomes = new Set<string>();
		this.technology = 0;
		for (let i = 1; i < args.length; i ++) {
			if (args[i].length > 0) {
				if (args[i].startsWith('class='))
					this.klas = args[i].slice(6);
				else if (args[i].startsWith('require='))
					this.requiredKlas.add(args[i].slice(8));
				else if (args[i].startsWith('forbid='))
					this.forbiddenKlas.add(args[i].slice(7));
				else if (args[i].startsWith('biome!='))
					this.forbiddenBiomes.add(args[i].slice(7));
				else if (args[i].startsWith('tech='))
					this.technology = Math.exp(
						(Number.parseFloat(args[i].slice(5)) + 3000)/1400);
				else
					console.log(`WARN: I'm ignoring ${args[i]} for now.`);
			}
		}
	}

	/**
	 * check if this cultural feature is compatible with this Kultur
	 * @param host
	 */
	isCompatible(host: Kultur): boolean {
		for (const klas of this.requiredKlas)
			if (!host.klas.has(klas))
				return false;
		for (const klas of this.forbiddenKlas)
			if (host.klas.has(klas))
				return false;
		for (const biome of this.forbiddenBiomes)
			if (host.homeland.biome === biome)
				return false;
		if (host.government.technology < this.technology)
			return false;
		return true;
	}

	toString(): string {
		return this.kode;
	}
}

const HEADERS: string[] = [];
const CHUZABLE: Sif[][][] = [];
const LOGA_INDEX: number[] = [];
let header = null, subheader = null;
for (const row of loadTSV('../../res/kultur.tsv')) {
	if (row[0] === '#') {
		header = row[1];
		if (LOGA_INDEX.length < HEADERS.length)
			LOGA_INDEX.push(null);
		HEADERS.push(`data.${header}`);
		CHUZABLE.push([]);
	}
	else if (row[0] === '##') {
		subheader = row[1];
		if (row.length >= 2 && row[2] === 'new_word')
			LOGA_INDEX.push(CHUZABLE[CHUZABLE.length-1].length);
		CHUZABLE[CHUZABLE.length-1].push([]);
	}
	else {
		const sif = new Sif(header, subheader, row);
		CHUZABLE[CHUZABLE.length-1][CHUZABLE[CHUZABLE.length-1].length-1].push(sif);
	}
}
console.log(CHUZABLE);


const DRIFT_RATE = .05; // fraccion of minor attributes that change each century

/**
 * a class that contains factoids about a peeple groop.
 */
export class Kultur {
	private readonly sif: Sif[][];
	// private emphasis: boolean[];
	public readonly klas: Set<string>;
	public readonly homeland: Nodo;
	public readonly government: Civ;
	public readonly lect: Lect;

	/**
	 * base a kultur off of some ancestor kultur, with some changes
	 * @param parent the protoculture off of which this one is based
	 * @param homeland the place that will serve as the new cultural capital, or null if
	 *                 it will keep using the old one
	 * @param government the Civ that rules this Nodo
	 * @param rng
	 */
	constructor(parent: Kultur, homeland: Nodo, government: Civ, rng: Random) { // TODO: check to see if this actually works, once ocean kingdoms are gon and maps are regional
		this.sif = [];
		this.government = government;
		if (parent !== null) {
			this.klas = new Set<string>(parent.klas);
			this.homeland = (homeland === null) ? parent.homeland : homeland;
			for (let i = 0; i < CHUZABLE.length; i ++) {
				this.sif.push(parent.sif[i].slice()); // base this off of it
				for (let j = 0; j < CHUZABLE[i].length; j ++) {
					if (!this.sif[i][j].isCompatible(this) || rng.probability(DRIFT_RATE)) { // and occasionally
						this.klas.delete(this.sif[i][j].klas);
						this.sif[i][j] = this.randomCompatibleSif(i, j, rng); // make a modificacion
						this.klas.add(this.sif[i][j].klas);
					}
				}
				this.lect = new Dialect(parent.lect, rng);
			}
		}
		else {
			this.klas = new Set<string>();
			this.homeland = homeland;
			this.lect = new ProtoLang(rng); // create a new language from scratch
			for (let i = 0; i < CHUZABLE.length; i ++) { // make up a whole new culture
				this.sif.push([]);
				for (let j = 0; j < CHUZABLE[i].length; j ++) {
					this.sif[i].push(this.randomCompatibleSif(i, j, rng)); // pick all these things freely
					this.klas.add(this.sif[i][j].klas); // be sure to get note their classes to keep everything compatible
				}
			}
		}
	}

	/**
	 * return one cultural feature from the given set
	 * @param seccionIndex
	 * @param subsectionIndex
	 * @param rng
	 */
	randomCompatibleSif(seccionIndex: number, subsectionIndex: number, rng: Random): Sif {
		const compatible = CHUZABLE[seccionIndex][subsectionIndex].filter(
			(sif: Sif) => sif.isCompatible(this));
		return rng.choice(compatible);
	}

	/**
	 * format this Kultur as a nice short paragraff
	 */
	toString(): string {
		let str = "";
		for (let i = 0; i < this.sif.length; i ++) { // rite each sentence about a cultural facette TODO: only show some informacion for each country
			const attributes = this.sif[i];
			const madeUpWord = (LOGA_INDEX[i] === null) ? null : this.lect.getName(attributes[LOGA_INDEX[i]].nam, LogaTipo.ALO);
			str += format(HEADERS[i],
				...attributes, madeUpWord); // slotting in the specifick attributes and a randomly generated word in case we need it
		}
		return str.trim();
	}
}
