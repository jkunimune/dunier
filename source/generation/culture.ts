/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Random} from "../utilities/random.js";
import {Dialect, Lect, WordType, ProtoLang} from "../language/lect.js";
import {Tile} from "../surface/surface.js";
import {Civ} from "./civ.js";
import {Name} from "../language/name.js";
import {format} from "../gui/internationalization.js";
import {BIOME_NAMES} from "./terrain.js";

import UNPARSED_KULTUR_ASPECTS from "../../resources/culture.js";


const DRIFT_RATE = .05; // fraccion of minor attributes that change each century


// define the types that define a culture
interface Aspect { key: string, chance: number, logaIndex: number | null, features: Feature[] }
interface Feature { key: string, possibleValues: FeatureValue[] }
interface FeatureValue { key: string, klas: string, conditions: Condition[] }
interface Condition { type: ConditionType, value: string | number }
enum ConditionType { REQUIREMENT, INCOMPATIBLE, TECH_LEVEL}

// do some postprocessing on the array of attributes you loaded
const KULTUR_ASPECTS: Aspect[] = [];
for (const {key, chance, features} of UNPARSED_KULTUR_ASPECTS) {
	const aspect: Aspect = {
		key: key, chance: chance, logaIndex: null, features: [] as Feature[],
	};
	for (let i = 0; i < features.length; i ++) {
		const {key, newWord, values} = features[i];
		const feature: Feature = {
			key: key, possibleValues: [] as FeatureValue[],
		};
		if (newWord) {
			if (aspect.logaIndex !== null)
				throw new Error("you marked two features as having new words but in the current scheme only one can.");
			aspect.logaIndex = i;
		}
		for (const {key, klas, conditions} of values) {
			const possibleValue: FeatureValue = {
				key: key, klas: (klas !== "none") ? klas : key, conditions: [] as Condition[],
			};
			for (const conditionString of conditions) {
				let condition; // and parse every requirement, checking if it starts with "+", "-", or "tech>"
				if (conditionString.startsWith("+"))
					condition = {type: ConditionType.REQUIREMENT, value: conditionString.slice(1)};
				else if (conditionString.startsWith("-"))
					condition = {type: ConditionType.INCOMPATIBLE, value: conditionString.slice(1)};
				else if (conditionString.startsWith("tech>"))
					condition = {
						type: ConditionType.TECH_LEVEL,
						value: Math.exp((Number.parseFloat(conditionString.slice(5)) + 3000)/1400)
					};
				else
					throw new Error(`can't parse this condition string: '${conditionString}'.`);
				possibleValue.conditions.push(condition);
			}
			feature.possibleValues.push(possibleValue);
		}
		aspect.features.push(feature);
	}
	KULTUR_ASPECTS.push(aspect);
}


/**
 * a class that contains factoids about a peeple groop.
 */
export class Culture {
	private readonly featureLists: (FeatureValue[] | null)[];
	public readonly klas: Set<string>;
	public readonly homeland: Tile;
	public readonly government: Civ;
	public readonly lect: Lect;

	/**
	 * base a culture off of some ancestor culture, with some changes
	 * @param parent the proto-culture off of which this one is based
	 * @param homeland the place that will serve as the new cultural capital
	 * @param government the Civ that rules this Nodo
	 * @param seed a random number seed
	 */
	constructor(parent: Culture | null, homeland: Tile, government: Civ, seed: number) { // TODO: check to see if this actually works, once ocean kingdoms are gon and maps are regional
		const rng = new Random(seed);
		this.featureLists = [];
		this.government = government;
		this.homeland = homeland;
		this.klas = new Set<string>();
		
		// start by assigning the deterministic cultural classes it has from its location
		this.klas.add(BIOME_NAMES[homeland.biome]);
		if (this.homeland.surface.hasDayNightCycle)
			this.klas.add("day_night_cycle");
		
		if (parent === null) {
			this.lect = new ProtoLang(rng); // create a new language from scratch
			for (const aspect of KULTUR_ASPECTS) { // make up a whole new culture
				if (rng.probability(aspect.chance)) {
					const featureList = [];
					for (const feature of aspect.features) {
						const value = rng.choice(this.compatibleOptions(feature.possibleValues));
						featureList.push(value); // pick all these things freely
						this.klas.add(value.klas); // be sure to get note their classes to keep everything compatible
					}
					this.featureLists.push(featureList);
				}
				else {
					this.featureLists.push(null); // unless it's not notable, in which case it's all null
				}
			}
		}
		else {
			this.lect = new Dialect(parent.lect, rng);
			for (let i = 0; i < KULTUR_ASPECTS.length; i ++) {
				let featureList;
				if (parent.featureLists[i] === null) {
					if (rng.probability(DRIFT_RATE*KULTUR_ASPECTS[i].chance)) {
						featureList = [];
						for (const feature of KULTUR_ASPECTS[i].features) {
							const featureValue = rng.choice(this.compatibleOptions(feature.possibleValues));
							featureList.push(featureValue); // pick all these things freely
							this.klas.add(featureValue.klas); // be sure to get note their classes to keep everything compatible
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
						featureList = parent.featureLists[i].slice();
						for (let j = 0; j < KULTUR_ASPECTS[i].features.length; j ++) {
							if (!this.isCompatible(featureList[j].conditions) || rng.probability(DRIFT_RATE)) { // and occasionally
								featureList[j] = rng.choice(this.compatibleOptions(KULTUR_ASPECTS[i].features[j].possibleValues)); // make a modificacion
								this.klas.add(featureList[j].klas);
							}
							else {
								this.klas.add(featureList[j].klas);
							}
						}
					}
				}
				this.featureLists[i] = featureList; // base this off of it
			}
		}
	}

	/**
	 * return the list of valid options for this cultural feature
	 * @param options the Options from which to choose
	 */
	private compatibleOptions(options: FeatureValue[]): FeatureValue[] {
		return options.filter(
			(option: FeatureValue) => this.isCompatible(option.conditions));
	}

	/**
	 * check if this Culture is compatible with this list of stipulations
	 */
	private isCompatible(conditions: Condition[]): boolean {
		for (const condition of conditions) {
			switch (condition.type) {
				case ConditionType.REQUIREMENT:
					if (!this.klas.has(condition.value as string))
						return false;
					break;
				case ConditionType.INCOMPATIBLE:
					if (this.klas.has(condition.value as string))
						return false;
					break;
				case ConditionType.TECH_LEVEL:
					if (this.government.technology < (condition.value as number))
						return false;
			}
		}
		return true;
	}

	public getName(): Name {
		return this.lect.getName(
			this.homeland.index.toString(), WordType.PEOPLE);
	}

	/**
	 * format this Kultur as a nice short paragraff
	 */
	public toString(): string {
		let str = "";
		for (let i = 0; i < this.featureLists.length; i ++) { // rite each sentence about a cultural facette TODO: only show some informacion for each country
			const featureList = this.featureLists[i];
			const logaIndex = KULTUR_ASPECTS[i].logaIndex;
			if (featureList !== null) {
				let madeUpWord;
				if (logaIndex !== null)
					madeUpWord = this.lect.getName(featureList[logaIndex].key, WordType.OTHER);
				else
					madeUpWord = null;
				const keys: string[] = [];
				for (let j = 0; j < this.featureLists[i].length; j ++)
					keys.push(`factbook.${KULTUR_ASPECTS[i].key}.${KULTUR_ASPECTS[i].features[j].key}.${featureList[j].key}`);
				str += format(`factbook.${KULTUR_ASPECTS[i].key}`,
				              ...keys, madeUpWord); // slotting in the specifick attributes and a randomly generated word in case we need it
			}
		}
		return str.trim();
	}
}
