/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Random} from "../utilities/random.js";
import {Dialect, Lect, WordType, ProtoLect} from "./language/lect.js";
import {Tile} from "./surface/surface.js";
import {Word} from "./language/word.js";
import {Biome} from "./terrain.js";

import UNPARSED_KULTUR_ASPECTS from "../../resources/culture.js";
import {POPULATION_DENSITY} from "./world.js";


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
	public readonly homeland: Tile;
	public readonly tiles: Set<Tile>;
	public readonly rng: Random;
	/** the attributes that define this culture.  each element corresponds to an item in resources/culture.json and is either null if there's nothing noteworthy here or a list of strings taken from the lists of options */
	public featureLists: (FeatureValue[] | null)[];
	public lect: Lect;

	/**
	 * base a culture off of some ancestor culture, with some changes
	 * @param parent the proto-culture off of which this one is based
	 * @param homeland the place that will serve as the new cultural capital
	 * @param technology the current technology level to which these people have access
	 * @param seed a random number seed
	 */
	constructor(parent: Culture | null, homeland: Tile, technology: number, seed: number) {
		this.rng = new Random(seed);
		this.featureLists = [];
		this.homeland = homeland;

		if (parent === null) {
			this.lect = new ProtoLect(homeland.index, this.rng); // create a new language from scratch
			const classes = new Set<string>();
			for (const aspect of KULTUR_ASPECTS) { // make up a whole new culture
				if (this.rng.probability(aspect.chance)) {
					const featureList = [];
					for (const feature of aspect.features) {
						const value = this.rng.choice(compatibleOptions(classes, feature.possibleValues, technology));
						featureList.push(value); // pick all these things freely
						classes.add(value.klas); // be sure to get note their classes to keep everything compatible
					}
					this.featureLists.push(featureList);
				}
				else {
					this.featureLists.push(null); // unless it's not notable, in which case it's all null
				}
			}
		}
		else {
			this.lect = parent.lect;
			this.featureLists = parent.featureLists;
		}

		this.tiles = new Set<Tile>();
	}

	public update(): void {
		// advance the language thru time
		this.lect = new Dialect(this.lect, this.homeland.index, this.rng);

		// calculate the highest tech that's available to the entire culture
		let technology = Infinity;
		for (const tile of this.tiles)
			if (tile.government.technology < technology)
				technology = tile.government.technology;

		const classes = new Set<string>();

		// start by assigning the deterministic cultural classes it has from its location
		if ([Biome.JUNGLE, Biome.STEAMLAND, Biome.DESERT].includes(this.homeland.biome))
			classes.add("hot");
		if ([Biome.TAIGA, Biome.TUNDRA].includes(this.homeland.biome))
			classes.add("cold");
		if ([Biome.JUNGLE, Biome.STEAMLAND].includes(this.homeland.biome))
			classes.add("humid");
		if ([Biome.DESERT, Biome.TUNDRA].includes(this.homeland.biome))
			classes.add("arid");
		if ([Biome.DESERT, Biome.GRASSLAND].includes(this.homeland.biome))
			classes.add("plains");
		if ([Biome.DESERT, Biome.STEAMLAND].includes(this.homeland.biome))
			classes.add("barren");
		if (this.homeland.biome === Biome.DESERT)
			classes.add("sandy");
		for (const neibor of this.homeland.neighbors.keys())
			if (neibor.biome === Biome.OCEAN)
				classes.add("coastal");
		if (this.homeland.height > 3)
			classes.add("mountainous"); // TODO: someday mountainousness will be independent of altitude
		if (this.homeland.surface.hasDayNightCycle)
			classes.add("day_night_cycle");
		if (this.homeland.surface.hasSeasons(this.homeland.φ))
			classes.add("four_seasons");
		if (this.hasNationState())
			classes.add("nation_state");

		// then go thru and update the individual cultural aspects
		for (let i = 0; i < KULTUR_ASPECTS.length; i ++) {
			let newFeatureList;
			if (this.featureLists[i] === null) {
				// if you're developing a whole new aspect where we used to have none
				if (this.rng.probability(DRIFT_RATE*KULTUR_ASPECTS[i].chance)) {
					newFeatureList = [];
					for (const feature of KULTUR_ASPECTS[i].features) {
						const featureValue = this.rng.choice(compatibleOptions(classes, feature.possibleValues, technology));
						newFeatureList.push(featureValue); // pick all these things freely
						classes.add(featureValue.klas); // be sure to get note their classes to keep everything compatible
					}
				}
				else {
					newFeatureList = null;
				}
			}
			else {
				// if you're losing a cultural aspect
				if (this.rng.probability(DRIFT_RATE*(1 - KULTUR_ASPECTS[i].chance))) {
					newFeatureList = null;
				}
				// if you're keeping but mutating a cultural aspect
				else {
					newFeatureList = this.featureLists[i].slice();
					for (let j = 0; j < KULTUR_ASPECTS[i].features.length; j ++) {
						if (!isCompatible(classes, newFeatureList[j].conditions, technology) || this.rng.probability(DRIFT_RATE)) {
							newFeatureList[j] = this.rng.choice(compatibleOptions(
								classes, KULTUR_ASPECTS[i].features[j].possibleValues, technology)); // make a modificacion
							classes.add(newFeatureList[j].klas);
						}
						else {
							classes.add(newFeatureList[j].klas);
						}
					}
				}
			}
			this.featureLists[i] = newFeatureList; // base this off of it
		}
	}

	public spreadTo(tile: Tile): void {
		if (tile.culture !== null)
			tile.culture.recedeFrom(tile);
		this.tiles.add(tile);
		tile.culture = this;
	}

	public recedeFrom(tile: Tile): void {
		tile.culture.tiles.delete(tile);
		tile.culture = null;
	}

	public hasNationState(): boolean {
		return this.homeland === this.homeland.government.capital;
	}

	public getPopulation(): number {
		let totalPopulation = 0;
		for (const tile of this.tiles)
			totalPopulation += POPULATION_DENSITY*tile.government.technology*tile.arableArea;
		return Math.round(totalPopulation);
	}

	public getName(): Word {
		return this.lect.getProperWord(
			this.homeland.index.toString(), WordType.PEOPLE);
	}
}

/**
 * return the list of valid options for this cultural feature
 * @param classes the set of classes with which these Options must be compatible
 * @param options the Options from which to choose
 * @param technology the current available technology level
 */
function compatibleOptions(classes: Set<string>, options: FeatureValue[], technology: number): FeatureValue[] {
	return options.filter(
		(option: FeatureValue) => isCompatible(classes, option.conditions, technology));
}

/**
 * check if this Culture is compatible with this list of stipulations
 */
function isCompatible(classes: Set<string>, conditions: Condition[], technology: number): boolean {
	for (const condition of conditions) {
		switch (condition.type) {
			case ConditionType.REQUIREMENT:
				if (!classes.has(condition.value as string))
					return false;
				break;
			case ConditionType.INCOMPATIBLE:
				if (classes.has(condition.value as string))
					return false;
				break;
			case ConditionType.TECH_LEVEL:
				if (technology < (condition.value as number))
					return false;
		}
	}
	return true;
}
