/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Tile} from "./surface/surface.js";
import {
	POPULATION_DENSITY,
	MEAN_ASSIMILATION_TIME,
	SLOPE_FACTOR, CONQUEST_RATE,
	TECH_ADVANCEMENT_RATE,
	MAX_DYNASTY_LIFETIME,
	World, BOAT_CHANCE, BOAT_FACTOR, Region
} from "./world.js";
import {Culture} from "./culture.js";
import {Phrase} from "./language/word.js";
import Queue from "../utilities/external/tinyqueue.js";
import {Dequeue} from "../utilities/dequeue.js";
import {Lect} from "./language/lect.js";


/**
 * a mutable collection of information defining a political entity
 */
export class Civ implements Region {
	public readonly id: number;
	/** the capital city */
	public capital: Tile;
	/** the official language */
	public language: Lect;
	/** the tiles it owns and the order in which it acquired them (also stores the normalized population) */
	private readonly tileTree: Map<Tile, {parent: Tile | null, children: Set<Tile>}>;
	/** the tiles it owns (maybe some it doesn't) from least to most densely populated */
	public readonly sortedTiles: Queue<Tile>;
	/** the set of tiles it owns that are adjacent to tiles it doesn't */
	public readonly border: Set<Tile>;
	public readonly world: World;

	/** everything interesting that has happened in this Civ's history */
	public history: Event[];

	/** base military strength */
	private militarism: number;
	/** negative rate of change of militarism */
	private readonly militarismDecayRate: number;
	/** whether we're especially good at sailing */
	private readonly thalassocratic: boolean;
	/** technological military modifier */
	public technology: number;
	/** the current total area (including ocean) in km^2 */
	private totalArea: number;
	/** the current land area in km^2 */
	private landArea: number;
	/** population multiplier (km^2) */
	private arableArea: number;
	/** the largest area it has ever had */
	peak: {year: number, landArea: number};

	/**
	 * create a new civilization
	 * @param id a nonnegative integer unique to this civ
	 * @param world the world in which this civ lives
	 * @param location the site of its (hopefully) future capital
	 * @param birthYear the exact year in which this Civ is born
	 * @param predecessor the country in which this one is founded, if any
	 */
	constructor(id: number, world: World, location: Tile, birthYear: number, predecessor: Civ = null) {
		this.world = world;
		this.id = id;
		this.tileTree = new Map<Tile, {parent: Tile | null, children: Set<Tile>}>();
		this.sortedTiles = new Queue<Tile>(
			[], (a, b) => b.arableArea - a.arableArea);
		this.border = new Set<Tile>();

		this.militarism = this.world.rng.erlang(4, 1); // TODO have naval military might separate from terrestrial
		this.militarismDecayRate = this.militarism/MAX_DYNASTY_LIFETIME;
		this.thalassocratic = this.world.rng.probability(BOAT_CHANCE) && location.coastal;
		this.technology = (predecessor !== null) ? predecessor.technology : 1;
		this.totalArea = 0;
		this.landArea = 0;
		this.arableArea = 0;
		this.peak = {year: birthYear, landArea: 0};

		// don't set the capital until you're sure we're strong enuff to take it
		this.capital = null;
	}

	/**
	 * do the upkeep required for this to officially gain tile and all tiles that were
	 * subsidiary to it.
	 * @param tile the land being acquired
	 * @param from the place from which it was acquired
	 * @param year the date on which this happened
	 */
	conquer(tile: Tile, from: Tile | null, year: number) {
		const loser = tile.government;

		// if this is our first tile, establish it as our capital
		if (this.capital === null) {
			this.capital = tile;
			// define a new national identity (offset the seed to increase variability)
			const culture = this.world.addNewCulture(
				this.capital, this.technology);
			culture.spreadTo(this.capital);
			// save the language so we have it in case the capital is destroyed
			this.language = culture.lect;
			// record this moment in history
			if (loser === null)
				this.history = [
					{type: "confederation", year: year, participants: [this, this.capital.culture]}];
			else {
				this.history = [
					{type: "independence", year: year, participants: [this, loser]}];
				loser.history.push(
					{type: "secession", year: year, participants: [loser, this]});
			}
		}

		// do the recursive stuff
		this._conquer(tile, from, loser, year);

		if (loser !== null)
			loser.lose(tile, year); // do the opposite upkeep for the other gy

		// update peak if relevant
		if (this.getLandArea() >= this.peak.landArea) {
			this.peak = {year: year, landArea: this.getLandArea()};
		}
	}

	/**
	 * do all the parts of conquer that happen recursively
	 */
	_conquer(tile: Tile, from: Tile | null, loser: Civ, year: number) {
		// update tile.government, this.tileTree, and this.sortedTiles
		tile.government = this;
		this.tileTree.set(tile, {parent: from, children: new Set()}); // add it to this.tileTree
		if (from !== null)
			this.tileTree.get(from).children.add(tile); // add it to from's children
		this.sortedTiles.push(tile);

		// update this.border
		let numForenNeibors = 0;
		for (const neibor of tile.neighbors.keys())
			if (this !== neibor.government)
				numForenNeibors ++;
		if (numForenNeibors > 0)
			this.border.add(tile);
		for (const neibor of tile.neighbors.keys()) {
			if (this.border.has(neibor)) {
				let numForenNeibors = 0;
				for (const neiborNeibor of neibor.neighbors.keys())
					if (this !== neiborNeibor.government)
						numForenNeibors ++;
				if (numForenNeibors === 0)
					this.border.delete(neibor);
			}
		}

		// update this.totalArea
		this.totalArea += tile.getArea();
		if (!tile.isSaltWater())
			this.landArea += tile.getArea();
		this.arableArea += tile.arableArea;

		// if this is the fall of a nation, record it in the annals of history
		if (loser !== null && tile === loser.capital) {
			const lastEvent = this.history[this.history.length - 1]; // figure out how to spin it: coup, civil war, or conquest?
			const finishingAShortCivilWar = lastEvent.type === "independence" && lastEvent.year >= year - 100 && lastEvent.participants[1] === loser && this.capital.culture === tile.culture;
			if (finishingAShortCivilWar) {
				this.history = loser.history.filter(({type}) => !["conquest", "secession"].includes(type)); // if we just recently came from this country, make their history our own
				if (tile !== this.capital)
					this.history.push({type: "civil_war", year: year, participants: [this, loser]});
			}
			else
				this.history.push({type: "conquest", year: year, participants: [this, loser]});
		}

		if (loser !== null) {
			for (const child of loser.tileTree.get(tile).children) // then recurse
				if (child.arableArea > 0) // unless you hit uninhabited land
					this._conquer(child, tile, loser, year);
		}
		if (tile.arableArea > 0)
			if (tile.culture === null || tile.culture.areSiblings(this.capital.culture)) // perpetuate the ruling culture
				this.capital.culture.spreadTo(tile);
	}

	/**
	 * do the upkeep required for this to officially lose tile.
	 * @param tile the land being taken
	 * @param year the year the land was taken
	 */
	lose(tile: Tile, year: number) {
		if (!this.tileTree.has(tile))
			throw new Error("You tried to make a Civ lose a tile that it does not have.");
		this._lose(tile, year); // remove it and all its children from this.tiles
		while (!this.sortedTiles.empty() && !this.tileTree.has(this.sortedTiles.peek()))
			this.sortedTiles.pop(); // remove them from this.sortedTiles as well if they happen to be on top
		if (this.tileTree.size === 0)
			this.arableArea = 0;
	}

	/**
	 * do all the parts of lose that happen recursively
	 */
	_lose(tile: Tile, year: number) {
		// start by propagating this call to all children
		const {parent, children} = this.tileTree.get(tile);
		for (const child of children) {
			// when we propagate to something that has not yet been claimed, spawn a new civ
			if (child.government === this && child.arableArea > 0) {
				const civ = this.world.addNewCiv(this, child, year);
				civ.conquer(child, null, year);
			}
			// otherwise just lose the child tiles
			else
				this._lose(child, year);
		}
		// update this.tileTree and tile.government
		if (parent !== null)
			this.tileTree.get(parent).children.delete(tile);
		this.tileTree.delete(tile);
		if (this === tile.government)
			tile.government = null;

		// update this.border
		if (this.border.has(tile))
			this.border.delete(tile);
		for (const neibor of tile.neighbors.keys())
			if (this === neibor.government && !this.border.has(neibor))
				this.border.add(neibor);

		// updated this.totalArea
		this.totalArea -= tile.getArea();
		if (!tile.isSaltWater())
			this.landArea -= tile.getArea();
		this.arableArea -= tile.arableArea;
	}

	/**
	 * change with the passing of the centuries
	 * @param timeStep the number of years to pass
	 */
	update(timeStep: number) {
		// assimilate cultures
		for (const tile of this.tileTree.keys())
			if (tile.arableArea > 0) // if anyone lives here
				if (this.world.rng.probability(timeStep/MEAN_ASSIMILATION_TIME)) // if the province fails its heritage saving throw
					this.capital.culture.spreadTo(tile); // its culture gets overritten

		this.militarism = Math.max(0, this.militarism - this.militarismDecayRate*timeStep);
		const densestPopulation = POPULATION_DENSITY*this.sortedTiles.peek().arableArea;
		this.technology += TECH_ADVANCEMENT_RATE*timeStep*densestPopulation*this.technology;
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
		// if we already mostly surround a tile, we should gain it instantly
		if (numOwnedNeighbors > end.neighbors.size/2)
			return 0;

		// otherwise, calculate how long it will take us to fill it with our armies
		const invadee = end.government;
		const momentum = this.getStrength(end);
		const resistance = (invadee !== null) ? invadee.getStrength(end) : 0;
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
	 * get all of the tiles that fall anywhere below this one on the tile tree, including itself.
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
	 * how strong the Civ's military is in this terrain
	 */
	getStrength(location: Tile) : number {
		let terrainMultiplier;
		if (this.thalassocratic) {
			if (location.isWater())
				terrainMultiplier = BOAT_FACTOR;
			else if (location.coastal)
				terrainMultiplier = 1;
			else
				terrainMultiplier = 1/BOAT_FACTOR;
		}
		else
			terrainMultiplier = 1;
		return terrainMultiplier*this.militarism*this.technology;
	}

	/**
	 * get the total controlld area, including ocean.
	 */
	getTotalArea(): number {
		return this.totalArea;
	}

	/**
	 * get the total controlld land area, other than ocean.
	 */
	getLandArea(): number {
		return this.landArea;
	}

	/**
	 * get an iterable over all controlld tiles.
	 */
	getTiles(): Set<Tile> {
		return new Set(this.tileTree.keys());
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
			if (population > 0)
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

	getName(): Phrase {
		return this.language.standardRegister.getToponym(this.capital.index);
	}

}


interface Event {
	type: string;
	year: number;
	participants: Region[];
}
