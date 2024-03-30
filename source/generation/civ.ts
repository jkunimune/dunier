/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Tile} from "../surface/surface.js";
import {Lect, WordType} from "../language/lect.js";
import {Random} from "../utilities/random.js";
import {
	POPULATION_DENSITY,
	MEAN_ASSIMILATION_TIME,
	SLOPE_FACTOR, CONQUEST_RATE,
	ADVANCEMENT_RATE, NATIONALISM_FACTOR,
	MEAN_EMPIRE_LIFETIME,
	TIME_STEP,
	TECH_VALUE,
	World
} from "./world.js";
import {Culture} from "./culture.js";
import {Word} from "../language/word.js";
import {TreeMap} from "../datastructures/treemap.js";
import {Biome} from "./terrain.js";


/**
 * a single political entity
 */
export class Civ {
	public readonly id: number;
	public readonly capital: Tile; // the capital city
	public readonly tiles: TreeMap<Tile>; // the tiles it owns and the order in which it acquired them (also stores the normalized population)
	public readonly border: Map<Tile, Set<Tile>>; // the set of tiles it owns that are adjacent to tiles it doesn't
	private readonly world: World;

	public militarism: number; // base military strength
	public technology: number; // technological military modifier
	private arableArea: number; // population multiplier (km^2)

	/**
	 * create a new civilization
	 * @param capital the home tile, with which this empire starts
	 * @param id a nonnegative integer unique to this civ
	 * @param world the world in which this civ lives
	 * @param rng th random number generator to use to set Civ properties
	 * @param technology
	 */
	constructor(capital: Tile, id: number, world: World, rng: Random, technology: number = 1) {
		this.world = world;
		this.id = id;
		this.tiles = new TreeMap<Tile>();
		this.border = new Map<Tile, Set<Tile>>();

		this.militarism = rng.erlang(4, 1); // TODO have naval military might separate from terrestrial
		this.technology = technology;
		this.arableArea = 0;

		this.capital = capital;
		if (world.currentRuler(capital) === null) // if this is a wholly new civilization
			capital.culture = new Culture(null, capital, this, rng.next() + 1); // make up a proto-culture (offset the seed to increase variability)
		this.conquer(capital, null);
	}

	/**
	 * do the upkeep required for this to officially gain tile and all tiles that were
	 * subsidiary to it.
	 * @param tile the land being acquired
	 * @param from the place from which it was acquired
	 */
	conquer(tile: Tile, from: Tile) {
		const loser = this.world.currentRuler(tile);

		this._conquer(tile, from, loser);

		if (loser !== null)
			loser.lose(tile); // do the opposite upkeep for the other gy

		for (const newLand of this.tiles.getAllChildren(tile)) {
			for (const neighbor of newLand.neighbors.keys()) {
				if (this.border.has(neighbor) && this.border.get(neighbor).has(newLand)) {
					this.border.get(neighbor).delete(newLand);
					if (this.border.get(neighbor).size === 0)
						this.border.delete(neighbor);
				}
				else if (!this.tiles.has(neighbor)) {
					if (!this.border.has(newLand))
						this.border.set(newLand, new Set<Tile>()); // finally, adjust the border map as necessary
					this.border.get(newLand).add(neighbor);
				}
			}
		}
	}

	/**
	 * do all the parts of conquer that happen recursively
	 * @param tile
	 * @param from
	 * @param loser
	 */
	_conquer(tile: Tile, from: Tile, loser: Civ) {
		this.world.politicalMap.set(tile, this);
		this.tiles.add(tile, from); // add it to this.tiles
		this.arableArea += tile.arableArea;

		if (loser !== null) {
			for (const child of loser.tiles.getChildren(tile)) // then recurse
				if (child.arableArea > 0)
					this._conquer(child, tile, loser);
		}
		else {
				tile.culture = this.capital.culture; // perpetuate the ruling culture
		}
	}

	/**
	 * do the upkeep required for this to officially lose tile.
	 * @param tile the land being taken
	 */
	lose(tile: Tile) {
		if (!this.tiles.has(tile))
			throw new Error("You tried to make a Civ lose a tile that it does not have.");
		for (const lostLand of this.tiles.getAllChildren(tile)) { // start by going thru and updating the border map
			if (this === this.world.politicalMap.get(lostLand)) // and update the global political map
				this.world.politicalMap.delete(lostLand);
		}
		for (const lostLand of this.tiles.getAllChildren(tile)) { // adjust the border map
			for (const neighbor of lostLand.neighbors.keys()) {
				if (this === this.world.politicalMap.get(neighbor)) {
					if (!this.border.has(neighbor))
						this.border.set(neighbor, new Set<Tile>());
					this.border.get(neighbor).add(lostLand);
				}
			}
			this.border.delete(lostLand);
		}

		this.tiles.delete(tile); // remove it and all its children from this.tiles
		if (this.tiles.size() > 0)
			this.arableArea -= tile.arableArea;
		else
			this.arableArea = 0;
	}

	/**
	 * change with the passing of the centuries
	 * @param rng the random number generator to use for the update
	 */
	update(rng: Random) {
		const newKultur: Map<Lect, Culture> = new Map();
		newKultur.set(this.capital.culture.lect.macrolanguage, new Culture(this.capital.culture, this.capital, this, rng.next())); // start by updating the capital, tying it to the new homeland
		for (const tile of this.tiles) { // update the culture of each tile in the empire in turn
			if (rng.probability(TIME_STEP/MEAN_ASSIMILATION_TIME)) { // if the province fails its heritage saving throw
				tile.culture = this.capital.culture; // its culture gets overritten
			}
			else { // otherwise update it normally
				if (!newKultur.has(tile.culture.lect.macrolanguage)) // if anyone isn't already in the thing
					newKultur.set(tile.culture.lect.macrolanguage, new Culture(tile.culture, null, this, rng.next() + 1)); // update that culture, treating it as a diaspora
				tile.culture = newKultur.get(tile.culture.lect.macrolanguage); // then make the assinement
			}
		}

		if (this.tiles.size() > 0) {
			this.militarism *= Math.exp(-TIME_STEP / MEAN_EMPIRE_LIFETIME);
			this.technology += TECH_VALUE * rng.poisson(
				ADVANCEMENT_RATE*TIME_STEP*this.getPopulation()); // TODO: subsequent technologies should be harder to reach, making this truly exponential
		}
	}

	/**
	 * how many years will it take this Civ to invade this Tile on average?
	 * @param start the source of the invaders
	 * @param end the place being invaded
	 */
	estimateInvasionTime(start: Tile, end: Tile) {
		const invadee = this.world.currentRuler(end);
		const momentum = this.getStrength(invadee, end);
		const resistance = (invadee !== null) ? invadee.getStrength(invadee, end) : 0;
		const distance = start.neighbors.get(end).distance;
		const elevation = start.height - end.height;
		const distanceEff = Math.hypot(distance, SLOPE_FACTOR*elevation)/end.passability;
		if (momentum > resistance) // this randomness ensures Civs can accomplish things over many timesteps
			return distanceEff/CONQUEST_RATE/(momentum - resistance);
		else
			return Infinity;
	}

	/**
	 * return true if this Civ no longer exists and needs to be deleted
	 */
	isDead(): boolean {
		return this.arableArea === 0;
	}

	/**
	 * how strong the Civ's military is in this particular context
	 * @param kontra the opponent
	 * @param sa the location
	 */
	getStrength(kontra: Civ, sa: Tile) : number {
		let linguisticModifier = 1;
		if (kontra !== null && sa.culture.lect.isIntelligible(this.capital.culture.lect))
			linguisticModifier = NATIONALISM_FACTOR;
		return this.militarism*this.technology*linguisticModifier;
	}

	/**
	 * get the total controlld area.  careful; this is an O(n) operation.
	 */
	getArea(): number {
		let area = 0;
		for (const tile of this.tiles)
			if (tile.biome !== Biome.OCEAN) // TODO: save this in a dynamically updating variable like the arable area
				area += tile.getArea();
		return area;
	}

	/**
	 * list the cultures present in this country, along with each's share of the
	 * population, starting with the ruling class and then in descending order by pop.
	 */
	getCultures(): { culture: Culture, size: number }[] {
		// count up the population fraccion of each culture
		const cultureSizes = new Map<Culture, number>();
		for (const tile of this.tiles) {
			const cultureSize = cultureSizes.has(tile.culture) ?
				cultureSizes.get(tile.culture) : 0;
			cultureSizes.set(tile.culture, cultureSize + tile.arableArea/this.arableArea);
		}
		// convert to list and sort
		const cultureList = [...cultureSizes.keys()];
		cultureList.sort((a, b) => cultureSizes.get(b) - cultureSizes.get(a));
		// then move the capital culture to the top
		cultureList.splice(cultureList.indexOf(this.capital.culture), 1);
		cultureList.splice(0, 0, this.capital.culture);
		// finally, bild the output object
		const output = [];
		for (const culture of cultureList)
			output.push({ culture: culture, size: cultureSizes.get(culture) });
		return output;
	}

	getPopulation(): number {
		return Math.round(POPULATION_DENSITY*this.technology*this.arableArea);
	}

	getName(): Word {
		return this.capital.culture.lect.getName(
			this.capital.index.toString(), WordType.COUNTRY);
	}

}

