/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Random} from "../utilities/random.js";
import {Dialect, Lect, WordType, ProtoLang} from "../language/lect.js";
import {Tile} from "../surface/surface.js";
import {Name} from "../language/name.js";
import {Biome} from "./terrain.js";

import UNPARSED_KULTUR_ASPECTS from "../../resources/culture.js";


const DRIFT_RATE = .05; // fraccion of minor attributes that change each century


// define the types that define a culture
interface Aspect { key: string, chance: number, logaIndex: number | null, features: Feature[] }
interface Feature { key: string, possibleValues: FeatureValue[] }
interface FeatureValue { key: string, klas: string, conditions: Condition[] }
interface Condition { type: ConditionType, value: string | number }
enum ConditionType { REQUIREMENT, INCOMPATIBLE, TECH_LEVEL}

// do some postprocessing on the array of attributes you loaded
export const KULTUR_ASPECTS: Aspect[] = [];
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
				key: key, klas: klas, conditions: [] as Condition[],
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
 * a class that contains factoids about a people group.
 */
export class Culture {
	public readonly featureLists: (FeatureValue[] | null)[];
	public readonly klas: Set<string>;
	public readonly homeland: Tile;
	public readonly lect: Lect;

	/**
	 * base a culture off of some ancestor culture, with some changes
	 * @param parent the proto-culture off of which this one is based
	 * @param homeland the place that will serve as the new cultural capital
	 * @param ruler the Culture that is dominant over this one, or null if it owns itself
	 * @param technology the current technology level to which these people have access
	 * @param seed a random number seed
	 */
	constructor(parent: Culture | null, homeland: Tile, ruler: Culture | null, technology: number, seed: number) {
		const rng = new Random(seed);
		this.featureLists = [];
		this.homeland = homeland;
		this.klas = new Set<string>();
		
		// start by assigning the deterministic cultural classes it has from its location
		if ([Biome.JUNGLE, Biome.STEAMLAND, Biome.DESERT].includes(this.homeland.biome))
			this.klas.add("hot");
		if ([Biome.TAIGA, Biome.TUNDRA].includes(this.homeland.biome))
			this.klas.add("cold");
		if ([Biome.JUNGLE, Biome.STEAMLAND].includes(this.homeland.biome))
			this.klas.add("humid");
		if ([Biome.DESERT].includes(this.homeland.biome))
			this.klas.add("dry");
		if ([Biome.DESERT, Biome.GRASSLAND].includes(this.homeland.biome))
			this.klas.add("plains");
		if ([Biome.DESERT, Biome.STEAMLAND].includes(this.homeland.biome))
			this.klas.add("barren");
		if (this.homeland.biome === Biome.DESERT)
			this.klas.add("sandy");
		for (const neibor of this.homeland.neighbors.keys())
			if (neibor.biome === Biome.OCEAN)
				this.klas.add("coastal");
		if (homeland.height > 3)
			this.klas.add("mountainous"); // TODO: someday mountainousness will be independent of altitude
		if (homeland.surface.hasDayNightCycle)
			this.klas.add("day_night_cycle");
		if (homeland.surface.hasSeasons(homeland.φ))
			this.klas.add("four_seasons");
		if (ruler === null)
			this.klas.add("nation_state");
		// there's also one deterministic class from ruler: whether they're free to be nomadic
		if (ruler === null || ruler.klas.has("nomadic"))
			this.klas.add("free");

		if (parent === null) {
			this.lect = new ProtoLang(rng); // create a new language from scratch
			for (const aspect of KULTUR_ASPECTS) { // make up a whole new culture
				if (rng.probability(aspect.chance)) {
					const featureList = [];
					for (const feature of aspect.features) {
						const value = rng.choice(this.compatibleOptions(feature.possibleValues, technology));
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
							const featureValue = rng.choice(this.compatibleOptions(feature.possibleValues, technology));
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
							if (!this.isCompatible(featureList[j].conditions, technology) || rng.probability(DRIFT_RATE)) { // and occasionally
								featureList[j] = rng.choice(this.compatibleOptions(
									KULTUR_ASPECTS[i].features[j].possibleValues, technology)); // make a modificacion
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
	 * @param technology the current available technology level
	 */
	private compatibleOptions(options: FeatureValue[], technology: number): FeatureValue[] {
		return options.filter(
			(option: FeatureValue) => this.isCompatible(option.conditions, technology));
	}

	/**
	 * check if this Culture is compatible with this list of stipulations
	 */
	private isCompatible(conditions: Condition[], technology: number): boolean {
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
					if (technology < (condition.value as number))
						return false;
			}
		}
		return true;
	}

	public getName(): Name {
		return this.lect.getName(
			this.homeland.index.toString(), WordType.PEOPLE);
	}
}
