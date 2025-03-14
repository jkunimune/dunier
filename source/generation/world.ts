/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import Queue from '../datastructures/queue.js';
import {Tile, Surface} from "../surface/surface.js";
import {Random} from "../utilities/random.js";
import {Civ} from "./civ.js";


export const START_OF_HUMAN_HISTORY = -3200; // [BCE]
export const TIME_STEP = 100; // [year]
export const CIVILIZATION_RATE = 1e-7; // [1/year/km^2] rate at which people coalesce into kingdoms
export const REBELLION_RATE = 2e-7; // [1/year/km^2] rate at which people start revolucions
export const NATIONALISM_FACTOR = 3.0; // [] factor by which oppressed minorities are more likely to rebel
export const CONQUEST_RATE = 1.5e-1; // [km/y] the rate at which denizens conquer
export const TECH_ADVANCEMENT_RATE = 5e-8; // [1/y] the rate at which denizens have good ideas
export const POPULATION_DENSITY = .20; // [1/km^2] density of people that can live in one unit of arable land with entry-level technology
export const TECH_SPREAD_RATE = .01; // [1/year] rate at which ideas spread across borders
export const APOCALYPSE_SURVIVAL_RATE = .80; // [] the fraccion of the populacion a country gets to keep after a cataclysm (not accounting for domino effects)
export const MEAN_EMPIRE_LIFETIME = 1000; // [year] time it takes for an empire's might to decay by 2.7
export const MEAN_ASSIMILATION_TIME = 160; // [year] time it takes to erase a people's language
export const SLOPE_FACTOR = 100; // [] multiplier on vertical distances TODO: use the minimum slope that a military can traverse instead


/**
 * collection of civilizations and languages that goes on a planet
 */
export class World {
	/** [1/y] the rate at which the apocalypse happens */
	public readonly cataclysms: number;
	public planet: Surface;
	public readonly politicalMap: Map<Tile, Civ>;
	private readonly civs: Set<Civ>;
	private nextID: number;


	constructor(cataclysms: number, planet: Surface) {
		this.cataclysms = cataclysms;
		this.planet = planet;
		this.civs = new Set(); // list of countries in the world
		this.nextID = 0;
		this.politicalMap = new Map();
	}

	/**
	 * populate the World with all the civs and stuff.
	 * @param year the number of years to simulate
	 * @param rng the random number generator to use
	 */
	generateHistory(year: number, rng: Random) {
		for (let t = START_OF_HUMAN_HISTORY; t < year; t += TIME_STEP) {
			for (const civ of this.civs)
				if (civ.tileTree.size > 0)
					civ.update(rng);
			this.spawnCivs(rng); // TODO: build cities
			this.spreadCivs(rng);
			this.spreadIdeas();
			if (Math.floor((t+TIME_STEP)*this.cataclysms) > Math.floor((t)*this.cataclysms))
				this.haveCataclysm(rng);
		}
	}

	/**
	 * generate a few new civs in uninhabited territory
	 * @param rng the random number generator to use
	 */
	spawnCivs(rng: Random) {
		for (const tile of this.planet.tiles) {
			const demomultia = POPULATION_DENSITY*tile.arableArea; // TODO: implement nomads, city state leagues, and federal states.
			const ruler = this.currentRuler(tile);
			if (ruler === null) { // if it is uncivilized, the limiting factor is the difficulty of establishing a unified state
				if (rng.probability(CIVILIZATION_RATE*TIME_STEP*demomultia))
					this.civs.add(new Civ(tile, this.nextID, this, rng));
			}
			else { // if it is already civilized, the limiting factor is the difficulty of starting a revolution
				let linguisticModifier;
				if (tile.culture.lect.isIntelligible(ruler.capital.culture.lect))
					linguisticModifier = 1;
				else
					linguisticModifier = NATIONALISM_FACTOR;
				if (rng.probability(REBELLION_RATE*TIME_STEP*demomultia*linguisticModifier)) // use the population without technology correction for balancing
					this.civs.add(new Civ(tile, this.nextID, this, rng, ruler.technology));
			}
			this.nextID ++;
		}
	}

	/**
	 * expand the territories of expansionist civs
	 * @param rng the random number generator to use
	 */
	spreadCivs(rng: Random) {
		const invasions: Queue<{time: number, invader: Civ, start: Tile, end: Tile}> = new Queue(
			[], (a, b) => a.time - b.time); // keep track of all current invasions
		for (const invader of this.civs) {
			for (const ourTile of invader.border.keys()) { // each civ initiates all its invasions
				for (const theirTile of invader.border.get(ourTile)) {
					const time = rng.exponential(invader.estimateInvasionTime(ourTile, theirTile)); // figure out when they will be done
					if (time <= TIME_STEP) // if that goal is within reach
						invasions.push({time: time, invader: invader, start: ourTile, end: theirTile}); // start on it
				}
			}
		}
		while (!invasions.empty()) {
			let {time, invader, start, end} = invasions.pop(); // as invasions finish
			const invadee = this.currentRuler(end);
			const invaderStrength = invader.getStrength(invadee, end);
			const invadeeStrength = (invadee !== null) ? invadee.getStrength(invadee, end) : 0;
			if (invader.tileTree.has(start) && !invader.tileTree.has(end) &&
					invaderStrength > invadeeStrength) { // check that they're still doable
				invader.conquer(end, start); // update the game state
				for (const conquerdLand of invader.getAllChildrenOf(end)) { // and set up new invasions that bild off of it
					for (const neighbor of conquerdLand.neighbors.keys()) {
						if (!invader.tileTree.has(neighbor)) {
							time = time + rng.exponential(invader.estimateInvasionTime(conquerdLand, neighbor));
							if (time <= TIME_STEP) {
								invasions.push({time: time, invader: invader, start: end, end: neighbor});
							}
						}
					}
				}
			}
		}
		for (const civ of this.civs)
			if (civ.isDead())
				this.civs.delete(civ); // clear out any Civs that no longer exist
	}

	/**
	 * carry technology across borders. every civ has a chance to gain each technology at least one of their neighors
	 * have that they don't
	 */
	spreadIdeas() {
		const visibleTechnology: Map<Civ, number> = new Map(); // how much advanced technology can they access?
		for (const civ of this.civs) {
			visibleTechnology.set(civ, civ.technology); // well, any technology they _have_, for one
			for (const tiles of civ.border.values()) { // check our borders
				for (const tile of tiles) {
					const other = this.currentRuler(tile);
					if (other !== null && other.technology > visibleTechnology.get(civ)) { // if they have something we don't
						visibleTechnology.set(civ, other.technology); // if so, we can access their technology
					}
				}
			}
		}
		const spreadFraction = 1 - Math.exp(-TIME_STEP*TECH_SPREAD_RATE);
		for (const civ of this.civs) {
			if (visibleTechnology.get(civ) > civ.technology)
				civ.technology += (visibleTechnology.get(civ) - civ.technology)*spreadFraction;
		}
	}

	/**
	 * devastate the entire world. the details of how are fuzzy, but in a nutshell half of all people die (well, more
	 * accurately, half of all provinces are depopulated, and half of all technologies are lost.
	 */
	haveCataclysm(rng: Random) {
		for (const civ of this.civs) {
			for (const tile of [...civ.tileTree.keys()])
				if (civ.tileTree.has(tile) && !rng.probability(APOCALYPSE_SURVIVAL_RATE))
					civ.lose(tile);
			civ.technology *= rng.uniform(1 - (1 - APOCALYPSE_SURVIVAL_RATE)*2, 1);
		}
		for (const civ of this.civs)
			if (civ.isDead())
				this.civs.delete(civ); // clear out any Civs that no longer exist

	}

	/**
	 * determine the current Civ of this tile
	 */
	currentRuler(tile: Tile): Civ {
		if (this.politicalMap.has(tile))
			return this.politicalMap.get(tile);
		else
			return null;
	}

	/**
	 * get a copied list of the id of every country currently in this world
	 * @param sorted if true, return items sorted from largest to smallest
	 * @param minSize exclude all countries with fewer than minSize tiles
	 */
	getCivs(sorted: boolean = false, minSize: number = 0): Civ[] {
		let output = [];
		for (const civ of this.civs)
			output.push(civ);
		if (sorted)
			output.sort((a, b) => b.getLandArea() - a.getLandArea());
		if (minSize > 0)
			output = output.filter((c) => c.tileTree.size >= minSize);
		return output;
	}

	/**
	 * get the Civ from this set that has this ID
	 */
	getCiv(id: number): Civ {
		for (const civ of this.civs)
			if (civ.id === id)
				return civ;
		throw new RangeError(`there is no civ with id ${id}`);
	}
}
