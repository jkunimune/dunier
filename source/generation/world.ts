/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import Queue from '../datastructures/queue.js';
import {Tile, Surface} from "../surface/surface.js";
import {Random} from "../utilities/random.js";
import {Civ} from "./civ.js";


/** the year at which civilization starts */
export const START_OF_HUMAN_HISTORY = -3200;
/** the smallest time interval to simulate (year) */
export const TIME_STEP = 100; // [year]
/** the rate at which people coalesce into kingdoms (/year/km^2) */
export const CIVILIZATION_RATE = 1e-7;
/** the rate at which people start revolutions (/year/km^2) */
export const REBELLION_RATE = 5e-7;
/** the rate at which people conquer with entry-level technology (km/y) */
export const CONQUEST_RATE = 2e-1;
/** the rate at which a person has good ideas (/y) */
export const TECH_ADVANCEMENT_RATE = 5e-8;
/** the density of people that can live in one unit of arable land with entry-level technology (/km^2) */
export const POPULATION_DENSITY = .20;
/** the rate at which ideas spread across borders (/y) */
export const TECH_SPREAD_RATE = .01;
/** the fraction of the populacion a country gets to keep after a cataclysm (not accounting for domino effects) */
export const APOCALYPSE_SURVIVAL_RATE = .80;
/** the time it takes for an empire's might to decay by 2.7 (y) */
export const MEAN_EMPIRE_LIFETIME = 1000;
/** the time it takes to erase a people's language (y) */
export const MEAN_ASSIMILATION_TIME = 160;
/** multiplier on vertical distances */
export const SLOPE_FACTOR = 100; // TODO: express it as the minimum slope that a military can traverse instead


/**
 * collection of civilizations and languages that goes on a planet
 */
export class World {
	/** [1/y] the rate at which the apocalypse happens */
	public readonly cataclysms: number;
	public planet: Surface;
	private readonly civs: Set<Civ>;
	private nextID: number;


	constructor(cataclysms: number, planet: Surface) {
		this.cataclysms = cataclysms;
		this.planet = planet;
		this.civs = new Set(); // list of countries in the world
		this.nextID = 0;

		// clear these variables, which may be carried over from previous Worlds
		for (const tile of planet.tiles) {
			tile.culture = null;
			tile.government = null;
		}
	}

	/**
	 * populate the World with all the civs and stuff.
	 * @param year the number of years to simulate
	 * @param rng the random number generator to use
	 */
	generateHistory(year: number, rng: Random) {
		for (let t = START_OF_HUMAN_HISTORY; t < year; t += TIME_STEP) {
			this.spawnCivs(t, rng); // TODO: build cities
			this.spreadCivs(rng);
			this.spreadIdeas();
			if (Math.floor((t+TIME_STEP)*this.cataclysms) > Math.floor((t)*this.cataclysms))
				this.haveCataclysm(rng);
			for (const civ of this.civs)
				if (civ.tileTree.size > 0)
					civ.update(rng);
		}
	}

	/**
	 * generate a few new civs in uninhabited territory
	 * @param year the end of the time-step in which these are spawning
	 * @param rng the random number generator to use
	 */
	spawnCivs(year: number, rng: Random) {
		for (const tile of this.planet.tiles) {
			const demomultia = POPULATION_DENSITY*tile.arableArea;
			const ruler = tile.government;
			if (ruler === null) { // if it is uncivilized, the limiting factor is the difficulty of establishing a unified state
				if (rng.probability(CIVILIZATION_RATE*TIME_STEP*demomultia))
					this.civs.add(new Civ(tile, this.nextID, this, year, rng));
			}
			else { // if it is already civilized, the limiting factor is the difficulty of starting a revolution
				if (rng.probability(REBELLION_RATE*TIME_STEP*demomultia)) // use the population without technology correction for balancing
					this.civs.add(new Civ(tile, this.nextID, this, year, rng, ruler.technology));
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
			const invadee = end.government;
			const invaderStrength = invader.getStrength();
			const invadeeStrength = (invadee !== null) ? invadee.getStrength() : 0;
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
					const other = tile.government;
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
