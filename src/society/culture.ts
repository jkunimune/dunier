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
import {Dialect, Lect, WordType, ProtoLang} from "../language/lect.js";
import {loadTSV} from "../util/fileio.js";
import {Tile} from "../planet/surface.js";
import {Civ} from "./civ.js";
import {Biome, BIOME_NAMES} from "./terrain.js";
import {Word} from "../language/word.js";
import {format} from "../util/internationalization.js";


class Feature {
	public readonly kode: string;
	public readonly nam: string;
	public readonly klas: string; // describing classes
	private readonly requiredKlas: Set<string>; // classes that must be present for this
	public readonly forbiddenKlas: Set<string>; // class that may not be present for this
	private readonly forbiddenBiomes: Set<Biome>; // biomes where this cannot be used
	private readonly technology: number; // the tech level needed for this

	constructor(header: string, subheader: string, args: string[]) {
		this.kode = `factbook.${header}.${subheader}.${args[0]}`;
		this.nam = args[0];
		this.klas = this.nam;
		this.requiredKlas = new Set<string>();
		this.forbiddenKlas = new Set<string>();
		this.forbiddenBiomes = new Set<Biome>();
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
					this.forbiddenBiomes.add(BIOME_NAMES.get(args[i].slice(7)));
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
	isCompatible(host: Culture): boolean {
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

// read in the array of attributes from static res
const KULTUR_ASPECTS: { key: string, chance: number, options: Feature[][], logaIndex: number }[] = [];
let zai: { key: string, chance: number, options: Feature[][], logaIndex: number } = null;
let header = null, subheader = null;
for (const row of loadTSV('../../res/culture.tsv')) {
	row[0] = row[0].replace(/^ +/, ''); // start by ignoring my indentacion
	if (row[0].startsWith('# ')) { // when you see a main header
		header = row[0].slice(2);
		zai = {
			key: `factbook.${header}`,
			chance: Number.parseFloat(row[1]),
			options: [],
			logaIndex: null
		}; // set up the new section object
		KULTUR_ASPECTS.push(zai);
	}
	else if (row[0].startsWith('## ')) { // when you see a subheader
		if (zai !== null) {
			subheader = row[0].slice(3);
			if (row.length >= 2 && row[1] === 'new_word')
				zai.logaIndex = zai.options.length; // look to see if it is a new word index
			zai.options.push([]); // and set up the subsection object
		}
		else {
			console.error("culture.tsv file has stuff out of order!");
		}
	}
	else { // when you see anything else
		if (zai !== null && zai.options.length > 0) {
			const feature = new Feature(header, subheader, row); // make it an object
			zai.options[zai.options.length - 1].push(feature); // add it to the list
		}
		else {
			console.error("culture.tsv file has stuff out of order!");
		}
	}
}


const DRIFT_RATE = .05; // fraccion of minor attributes that change each century

/**
 * a class that contains factoids about a peeple groop.
 */
export class Culture {
	private readonly features: Feature[][];
	public readonly klas: Set<string>;
	public readonly homeland: Tile;
	public readonly government: Civ;
	public readonly lect: Lect;

	/**
	 * base a culture off of some ancestor culture, with some changes
	 * @param parent the proto-culture off of which this one is based
	 * @param homeland the place that will serve as the new cultural capital, or null if
	 *                 it will keep using the old one
	 * @param government the Civ that rules this Nodo
	 * @param seed a random number seed
	 */
	constructor(parent: Culture, homeland: Tile, government: Civ, seed: number) { // TODO: check to see if this actually works, once ocean kingdoms are gon and maps are regional
		const rng = new Random(seed);
		this.features = [];
		this.government = government;
		if (parent === null) {
			this.klas = new Set<string>();
			this.homeland = homeland;
			this.lect = new ProtoLang(rng); // create a new language from scratch
			for (const aspect of KULTUR_ASPECTS) { // make up a whole new culture
				if (rng.probability(aspect.chance)) {
					const featureList = [];
					for (const options of aspect.options) {
						const feature = rng.choice(this.compatibleFeatures(options));
						featureList.push(feature); // pick all these things freely
						this.klas.add(feature.klas); // be sure to get note their classes to keep everything compatible
					}
					this.features.push(featureList);
				}
				else {
					this.features.push(null); // unless it's not notable, in which case it's all null
				}
			}
		}
		else {
			this.klas = new Set<string>();
			this.homeland = (homeland === null) ? parent.homeland : homeland;
			this.lect = new Dialect(parent.lect, rng);
			for (let i = 0; i < KULTUR_ASPECTS.length; i ++) {
				let featureList;
				if (parent.features[i] === null) {
					if (rng.probability(DRIFT_RATE*KULTUR_ASPECTS[i].chance)) {
						featureList = [];
						for (const options of KULTUR_ASPECTS[i].options) {
							const feature = rng.choice(this.compatibleFeatures(options));
							featureList.push(feature); // pick all these things freely
							this.klas.add(feature.klas); // be sure to get note their classes to keep everything compatible
						}
					}
					else {
						featureList = null;
					}
				}
				else {
					if (rng.probability(DRIFT_RATE*(1 - KULTUR_ASPECTS[i].chance))) {
						featureList = null;
					}
					else {
						featureList = parent.features[i].slice();
						for (let j = 0; j < KULTUR_ASPECTS[i].options.length; j ++) {
							if (!featureList[j].isCompatible(this) || rng.probability(DRIFT_RATE)) { // and occasionally
								featureList[j] = rng.choice(this.compatibleFeatures(KULTUR_ASPECTS[i].options[j])); // make a modificacion
								this.klas.add(featureList[j].klas);
							}
							else {
								this.klas.add(featureList[j].klas);
							}
						}
					}
				}
				this.features[i] = featureList; // base this off of it
			}
		}
	}

	/**
	 * return one cultural feature from the given set
	 * @param options the Features from which to choose
	 */
	private compatibleFeatures(options: Feature[]): Feature[] {
		return options.filter(
			(feature: Feature) => feature.isCompatible(this));
	}

	public getName(): Word {
		return this.lect.getName(
			this.homeland.index.toString(), WordType.PEOPLE);
	}

	/**
	 * format this Kultur as a nice short paragraff
	 */
	public toString(): string {
		let str = "";
		for (let i = 0; i < this.features.length; i ++) { // rite each sentence about a cultural facette TODO: only show some informacion for each country
			const attributes = this.features[i];
			const logaIndex = KULTUR_ASPECTS[i].logaIndex;
			if (attributes !== null) {
				let madeUpWord;
				if (logaIndex !== null)
					madeUpWord = this.lect.getName(attributes[logaIndex].nam, WordType.OTHER);
				else
					madeUpWord = null;
				str += format(KULTUR_ASPECTS[i].key,
				              ...attributes, madeUpWord); // slotting in the specifick attributes and a randomly generated word in case we need it
			}
		}
		return str.trim();
	}
}
