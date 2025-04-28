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
	TECH_ADVANCEMENT_RATE,
	MEAN_EMPIRE_LIFETIME,
	TIME_STEP,
	World
} from "./world.js";
import {Culture} from "./culture.js";
import {Name} from "../language/name.js";
import {Biome} from "./terrain.js";
import Queue from "../datastructures/queue.js";
import {Dequeue} from "../datastructures/dequeue.js";


/**
 * a single political entity
 */
export class Civ {
	public readonly id: number;
	/** the capital city */
	public readonly capital: Tile;
	/** the tiles it owns and the order in which it acquired them (also stores the normalized population) */
	public readonly tileTree: Map<Tile, {parent: Tile | null, children: Set<Tile>}>;
	/** the tiles it owns (maybe some it doesn't) from least to most densely populated */
	public readonly sortedTiles: Queue<Tile>;
	/** the set of tiles it owns that are adjacent to tiles it doesn't */
	public readonly border: Map<Tile, Set<Tile>>;
	public readonly world: World;

	/** base military strength */
	public militarism: number;
	/** technological military modifier */
	public technology: number;
	/** population multiplier (km^2) */
	private arableArea: number;

	/**
	 * create a new civilization
	 * @param capital the home tile, with which this empire starts
	 * @param id a nonnegative integer unique to this civ
	 * @param world the world in which this civ lives
	 * @param rng th random number generator to use to set Civ properties
	 * @param technology the starting technological multiplier
	 */
	constructor(capital: Tile, id: number, world: World, rng: Random, technology: number = 1) {
		this.world = world;
		this.id = id;
		this.tileTree = new Map<Tile, {parent: Tile | null, children: Set<Tile>}>();
		this.sortedTiles = new Queue<Tile>(
			[], (a, b) => b.arableArea - a.arableArea);
		this.border = new Map<Tile, Set<Tile>>();

		this.militarism = rng.erlang(4, 1); // TODO have naval military might separate from terrestrial
		this.technology = technology;
		this.arableArea = 0;

		this.capital = capital;
		if (capital.government === null) // if this is a wholly new civilization
			capital.culture = new Culture(null, capital, null, technology, rng.next() + 1); // make up a proto-culture (offset the seed to increase variability)
		this.conquer(capital, null);
	}

	/**
	 * do the upkeep required for this to officially gain tile and all tiles that were
	 * subsidiary to it.
	 * @param tile the land being acquired
	 * @param from the place from which it was acquired
	 */
	conquer(tile: Tile, from: Tile | null) {
		const loser = tile.government;

		this._conquer(tile, from, loser);

		if (loser !== null)
			loser.lose(tile); // do the opposite upkeep for the other gy

		for (const newLand of this.getAllChildrenOf(tile)) {
			for (const neighbor of newLand.neighbors.keys()) {
				if (this.border.has(neighbor) && this.border.get(neighbor).has(newLand)) {
					this.border.get(neighbor).delete(newLand);
					if (this.border.get(neighbor).size === 0)
						this.border.delete(neighbor);
				}
				else if (!this.tileTree.has(neighbor)) {
					if (!this.border.has(newLand))
						this.border.set(newLand, new Set<Tile>()); // finally, adjust the border map as necessary
					this.border.get(newLand).add(neighbor);
				}
			}
		}
	}

	/**
	 * do all the parts of conquer that happen recursively
	 */
	_conquer(tile: Tile, from: Tile | null, loser: Civ) {
		tile.government = this;
		this.tileTree.set(tile, {parent: from, children: new Set()}); // add it to this.tileTree
		if (from !== null)
			this.tileTree.get(from).children.add(tile); // add it to from's children
		this.sortedTiles.push(tile);
		this.arableArea += tile.arableArea;

		if (loser !== null) {
			for (const child of loser.tileTree.get(tile).children) // then recurse
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
		if (!this.tileTree.has(tile))
			throw new Error("You tried to make a Civ lose a tile that it does not have.");
		for (const lostLand of this.getAllChildrenOf(tile)) { // start by going thru and updating the border map
			if (this === lostLand.government) // and update the global political map
				lostLand.government = null;
		}
		for (const lostLand of this.getAllChildrenOf(tile)) { // adjust the border map
			for (const neighbor of lostLand.neighbors.keys()) {
				if (this === neighbor.government) {
					if (!this.border.has(neighbor))
						this.border.set(neighbor, new Set<Tile>());
					this.border.get(neighbor).add(lostLand);
				}
			}
			this.border.delete(lostLand);
		}

		this._lose(tile); // remove it and all its children from this.tiles
		while (!this.sortedTiles.empty() && !this.tileTree.has(this.sortedTiles.peek()))
			this.sortedTiles.pop(); // remove it from this.sortedTiles as well if it happens to be on top
		if (this.tileTree.size === 0)
			this.arableArea = 0;
	}

	/**
	 * do all the parts of lose that happen recursively
	 */
	_lose(tile: Tile) {
		const {parent, children} = this.tileTree.get(tile);
		for (const child of children)
			this._lose(child);
		if (parent !== null)
			this.tileTree.get(parent).children.delete(tile);
		this.tileTree.delete(tile);

		this.arableArea -= tile.arableArea;
	}

	/**
	 * change with the passing of the centuries
	 * @param rng the random number generator to use for the update
	 */
	update(rng: Random) {
		const rulingCulture = new Culture(this.capital.culture, this.capital, null, this.technology, rng.next()); // start by updating the capital, tying it to the new homeland
		const newKultur: Map<Lect, Culture> = new Map();
		newKultur.set(
			this.capital.culture.lect.macrolanguage,
			rulingCulture);
		for (const tile of this.tileTree.keys()) { // update the culture of each tile in the empire in turn
			if (rng.probability(TIME_STEP/MEAN_ASSIMILATION_TIME)) { // if the province fails its heritage saving throw
				tile.culture = rulingCulture; // its culture gets overritten
			}
			else { // otherwise update it normally
				if (!newKultur.has(tile.culture.lect.macrolanguage)) { // if you encounter a culture that hasn't been updated and added to the Map yet
					const updatedCulture = new Culture(tile.culture, tile.culture.homeland, rulingCulture, this.technology, rng.next() + 1);
					newKultur.set(
						tile.culture.lect.macrolanguage,
						updatedCulture); // update that culture, treating it as a diaspora
				}
				tile.culture = newKultur.get(tile.culture.lect.macrolanguage); // then make the assinement
			}
		}

		this.militarism *= Math.exp(-TIME_STEP / MEAN_EMPIRE_LIFETIME);
		const densestPopulation = POPULATION_DENSITY*this.sortedTiles.peek().arableArea;
		this.technology += TECH_ADVANCEMENT_RATE*TIME_STEP*densestPopulation*this.technology;
	}

	/**
	 * how many years will it take this Civ to invade this Tile on average?
	 * @param start the source of the invaders
	 * @param end the place being invaded
	 */
	estimateInvasionTime(start: Tile, end: Tile) {
		// first, check if we surround this tile
		let numOwnedNeighbors = 0;
		for (const neibor of end.neighbors.keys())
			if (this === neibor.government)
				numOwnedNeighbors ++;
		// if we own most of its neibors, we should gain it instantly
		if (numOwnedNeighbors > end.neighbors.size/2)
			return 0;

		// otherwise, calculate how long it will take us to fill it with our armies
		const invadee = end.government;
		const momentum = this.getStrength();
		const resistance = (invadee !== null) ? invadee.getStrength() : 0;
		const distance = end.getArea()/start.neighbors.get(end).getLength();
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
	 * get all of the tiles that fall anywhere below this one on the tile tree.
	 * if this tile falls, all of these children will fall with it.
	 */
	getAllChildrenOf(tile: Tile): Iterable<Tile> {
		const tileTree = this.tileTree;
		return {
			[Symbol.iterator]: function(): Iterator<Tile> {
				const cue = new Dequeue<Tile>([tile]);
				return {
					next: function() {
						if (cue.isEmpty()) {
							return {done: true, value: null};
						}
						else {
							const next = cue.pop();
							for (const child of tileTree.get(next).children)
								cue.push(child);
							return {done: false, value: next};
						}
					}
				};
			}
		};
	}

	/**
	 * how strong the Civ's military is
	 */
	getStrength() : number {
		return this.militarism*this.technology;
	}

	/**
	 * get the total controlld area, including ocean.  careful; this is an O(n) operation.
	 */
	getTotalArea(): number {
		let area = 0;
		for (const tile of this.tileTree.keys())
			area += tile.getArea();
		return area;
	}

	/**
	 * get the total controlld land area, other than ocean.  careful; this is an O(n) operation.
	 */
	getLandArea(): number {
		let area = 0;
		for (const tile of this.tileTree.keys())
			if (tile.biome !== Biome.OCEAN)
				area += tile.getArea();
		return area;
	}

	/**
	 * list the cultures present in this country, along with the set of tiles occupied by each's share of the
	 * population and the tiles occupied by each, starting with the ruling class and then in descending
	 * order by pop.
	 */
	getCultures(): { culture: Culture, populationFraction: number, inhabitedTiles: Set<Tile> }[] {
		// count up the population fraccion of each culture
		const cultureMap = new Map<Culture, {population: number, tiles: Set<Tile>}>();
		for (const tile of this.tileTree.keys()) {
			if (!cultureMap.has(tile.culture))
				cultureMap.set(tile.culture, {population: 0, tiles: new Set()});
			cultureMap.get(tile.culture).population += tile.arableArea;
			cultureMap.get(tile.culture).tiles.add(tile);
		}
		// convert to list and sort
		const cultureList = [...cultureMap.keys()];
		cultureList.sort((a, b) => cultureMap.get(b).population - cultureMap.get(a).population);
		// then move the capital culture to the top
		cultureList.splice(cultureList.indexOf(this.capital.culture), 1);
		cultureList.splice(0, 0, this.capital.culture);
		// finally, bild the output object
		const output = [];
		for (const culture of cultureList) {
			const {population, tiles} = cultureMap.get(culture);
			output.push({
				culture: culture,
				populationFraction: population/this.arableArea,
				inhabitedTiles: tiles});
		}
		return output;
	}

	getPopulation(): number {
		return Math.round(POPULATION_DENSITY*this.technology*this.arableArea);
	}

	getName(): Name {
		return this.capital.culture.lect.getName(
			this.capital.index.toString(), WordType.COUNTRY);
	}

}
