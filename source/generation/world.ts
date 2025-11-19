/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import Queue from '../utilities/external/tinyqueue.js';
import {Tile, Surface} from "./surface/surface.js";
import {Random} from "../utilities/random.js";
import {Civ} from "./civ.js";
import {Lect} from "./language/lect.js";
import {factorial} from "../utilities/miscellaneus.js";
import {Culture} from "./culture.js";
import {Phrase} from "./language/word.js";


/** a debug option to print detailed information about territory changes */
const LOG_LAND_CLAIMS = false;

/** the year at which civilization starts */
export const START_OF_HUMAN_HISTORY = -3200;
/** the smallest time interval to simulate (year) */
export const TIME_STEP = 100; // [year]
/** the rate at which people coalesce into kingdoms (/year/km^2) */
export const CIVILIZATION_RATE = 2e-8;
/** the rate at which people start revolutions (/year/km^2) */
export const REBELLION_RATE = 2e-7;
/** the rate at which people conquer with entry-level technology (km/y) */
export const CONQUEST_RATE = 3e-2;
/** the rate at which a person has good ideas (/y) */
export const TECH_ADVANCEMENT_RATE = 3.2e-8;
/** the density of people that can live in one unit of arable land with entry-level technology (/km^2) */
export const POPULATION_DENSITY = .20;
/** the rate at which ideas diffuse across borders (/y) */
export const TECH_SPREAD_RATE = .02;
/** the fraction of countries that are especially good at sailing */
export const BOAT_CHANCE = 0.1;
/** how much better a sailing-specialist country is at sailing */
export const BOAT_FACTOR = 5;
/** the fraction of the populacion a country gets to keep after a cataclysm (not accounting for domino effects) */
export const APOCALYPSE_SURVIVAL_RATE = .50;
/** the amount of time to prepare an apocalypse. if the time between cataclysms is less than this, they will be weakened in power (y) */
export const APOCALYPSE_ACCUMULATION_RATE = 200;
/** the time it takes for an empire's might to decay by 2.7 (y) */
export const MAX_DYNASTY_LIFETIME = 2000;
/** the time it takes to erase a people's language (y) */
export const MEAN_ASSIMILATION_TIME = 160;
/** multiplier on vertical distances */
export const SLOPE_FACTOR = 100; // TODO: express it as the minimum slope that a military can traverse instead


export interface Region {
	id: number;
	getTiles(): Set<Tile>;
	getName(): Phrase;
}


/**
 * a mutable collection of civilizations and cultures that goes on a Surface
 */
export class World {
	/** [1/y] the rate at which the apocalypse happens */
	public readonly cataclysms: number;
	public readonly rng: Random;
	public planet: Surface;
	private readonly civs: Set<Civ>;
	private readonly cultures: Set<Culture>;
	private lastCivID: number;
	private lastCultureID: number;


	constructor(cataclysms: number, planet: Surface, seed: number) {
		this.cataclysms = cataclysms;
		this.planet = planet;
		this.civs = new Set<Civ>(); // list of countries in the world
		this.cultures = new Set<Culture>();
		this.rng = new Random(seed);
		this.lastCivID = 0;
		this.lastCultureID = 0;

		// clear these variables, which may be carried over from previous Worlds
		for (const tile of planet.tiles) {
			tile.culture = null;
			tile.government = null;
		}
	}

	/**
	 * populate the World with all the civs and stuff.
	 * @param year the number of years to simulate
	 */
	generateHistory(year: number) {
		const cataclysmicFactor = Math.exp(-this.cataclysms*APOCALYPSE_ACCUMULATION_RATE);
		for (let t = START_OF_HUMAN_HISTORY; t < year; t += TIME_STEP) {
			if (Math.floor(t*this.cataclysms) > Math.floor((t - TIME_STEP)*this.cataclysms))
				this.haveCataclysm(t, cataclysmicFactor);
			this.spawnCivs(t); // TODO: build cities
			this.spreadCivs(t, t + TIME_STEP);
			this.spreadIdeas();
			for (const civ of this.civs) {
				if (!civ.isDead())
					civ.update(TIME_STEP); // handle technological development, militaristic decay, etc.
				else
					this.civs.delete(civ); // clear out any Civs that no longer have population
			}
			for (const culture of this.cultures) {
				if (culture.tiles.size > 0)
					culture.update(); // handle linguistic development, societal change, etc.
				else
					this.cultures.delete(culture); // clear out any Cultures that are extinct
			}
		}
	}

	/**
	 * generate a few new civs in uninhabited territory
	 * @param year the end of the time-step in which these are spawning
	 */
	spawnCivs(year: number) {
		for (const tile of this.planet.tiles) {
			const demomultia = POPULATION_DENSITY*tile.arableArea;
			const ruler = tile.government;
			if (ruler === null) { // if it is uncivilized, the limiting factor is the difficulty of establishing a unified state
				if (this.rng.probability(CIVILIZATION_RATE*TIME_STEP*demomultia)) {
					const civ = this.addNewCiv(null, tile, year);
					civ.conquer(tile, null, year);
				}
			}
			else { // if it is already civilized, the limiting factor is the difficulty of starting a revolution
				if (this.rng.probability(REBELLION_RATE*TIME_STEP*demomultia)) { // use the population without technology correction for balancing
					const civ = this.addNewCiv(ruler, tile, year);
					if (civ.getStrength(tile) > ruler.getStrength(tile)) // make sure the rebellion is strong enuff to succeed
						civ.conquer(tile, null, year);
				}
			}
		}
	}

	/**
	 * expand the territories of expansionist civs
	 * @param start_time the year in which we start this timestep
	 * @param stop_time the year in which we freeze the borders
	 */
	spreadCivs(start_time: number, stop_time: number) {
		const invasions: Queue<{time: number, invader: Civ, start: Tile, end: Tile}> = new Queue(
			[], (a, b) => a.time - b.time); // keep track of all current invasions
		for (const invader of this.civs) {
			for (const ourTile of invader.border.keys()) { // each civ initiates all its invasions
				for (const theirTile of ourTile.neighbors.keys()) {
					if (invader !== theirTile.government) {
						const time = start_time + this.rng.exponential(invader.estimateInvasionTime(ourTile, theirTile)); // figure out when they will be done
						if (time <= stop_time) // if that goal is within reach
							invasions.push({time: time, invader: invader, start: ourTile, end: theirTile}); // start on it
					}
				}
			}
		}
		while (!invasions.empty()) {
			const {time, invader, start, end} = invasions.pop(); // as invasions finish
			const invadee = end.government;
			const invaderStrength = invader.getStrength(end);
			const invadeeStrength = (invadee !== null) ? invadee.getStrength(end) : 0;
			if (invader.getTiles().has(start) && !invader.getTiles().has(end) &&
					invaderStrength > invadeeStrength) { // check that they're still doable
				invader.conquer(end, start, time); // update the game state
				for (const conquerdLand of invader.getAllChildrenOf(end)) { // and set up new invasions that bild off of it
					for (const neighbor of conquerdLand.neighbors.keys()) {
						if (!invader.getTiles().has(neighbor)) {
							const nextTime = time + this.rng.exponential(invader.estimateInvasionTime(conquerdLand, neighbor));
							if (nextTime <= stop_time) {
								invasions.push({time: nextTime, invader: invader, start: conquerdLand, end: neighbor});
							}
						}
					}
					if (LOG_LAND_CLAIMS)
						console.log(`${time.toFixed(0)}: ${invader.getName()} takes tile ${conquerdLand.index} from ${(invadee !== null) ? invadee.getName() : "no one"} via tile ${start.index}.`);
				}
			}
		}
	}

	/**
	 * carry technology across borders. every civ has a chance to gain each technology at least one of their neighors
	 * have that they don't
	 */
	spreadIdeas() {
		// go from smartest countries to dumbest, to ensure we apply the greatest possible final tech level to each Civ
		const queue = new Queue<{civ: Civ, newTechLevel: number, sourceTechLevels: number[]}>(
			[...this.civs].map(civ => ({civ: civ, newTechLevel: civ.technology, sourceTechLevels: []})), // by default, try assigning each Civ its current tech level
			(a, b) => b.newTechLevel - a.newTechLevel,
		);
		const visited = new Set<Civ>();
		while (!queue.empty()) {
			const {civ, newTechLevel, sourceTechLevels} = queue.pop();
			if (!visited.has(civ)) { // if we haven't already advanced this one
				// apply it
				civ.technology = newTechLevel;
				visited.add(civ);
				const previusTechLevels = sourceTechLevels.concat([civ.technology]);
				// then look to our neibors
				const neibors = new Set<Civ>();
				for (const borderTile of civ.border)
					for (const tile of borderTile.neighbors.keys())
						if (tile.government !== null && tile.government !== civ)
							neibors.add(tile.government);
				// diffuse our technology to our dumber neibors
				for (const neibor of neibors) {
					if (!visited.has(neibor)) {
						let neiborsNewTechLevel = neibor.technology +
							(previusTechLevels[0] - neibor.technology)*(1 - Math.exp(-TIME_STEP*TECH_SPREAD_RATE));
						for (let i = 1; i < previusTechLevels.length; i ++)
							neiborsNewTechLevel -= (-TIME_STEP*TECH_SPREAD_RATE)**i/factorial(i)*
								(previusTechLevels[previusTechLevels.length - i] - previusTechLevels[0]); // this summation is the solution to this multivariate diffusion equation
						queue.push({civ: neibor, newTechLevel: neiborsNewTechLevel, sourceTechLevels: previusTechLevels});
						// NOTE: I think it's possible in theory for a civ to surpass its neibor, which makes the math
						// considerably more complicated, but I assume that's unlikely enuff to happen within a timestep
						// that it's not a big deal.
					}
				}
			}
		}
	}

	/**
	 * devastate the entire world. the details of how are fuzzy, but in a nutshell half of all people die (well, more
	 * accurately, 50% of all provinces are depopulated, and 50% of all technologies are lost.
	 * @param year what yer it is (for record-keeping purposes)
	 * @param power a multiplier for the cataclysm's level of destruction
	 */
	haveCataclysm(year: number, power: number) {
		const survivalRate = Math.pow(APOCALYPSE_SURVIVAL_RATE, power);
		console.log(survivalRate);
		for (const tile of this.planet.tiles) {
			if (tile.government !== null && !this.rng.probability(survivalRate)) {
				if (LOG_LAND_CLAIMS)
					console.log(`${year.toFixed(0)}: ${tile.government.getName()} loses tile ${tile.index}`);
				tile.government.lose(tile, year);
				if (tile.arableArea > 0)
					tile.culture.recedeFrom(tile);
			}
		}
		for (const civ of this.civs)
			civ.technology *= this.rng.uniform(1 - (1 - survivalRate)*2, 1);
		for (const civ of this.civs) {
			if (civ.isDead())
				this.civs.delete(civ); // clear out any Civs that no longer exist
			else
				civ.history.push({type: "cataclysm", year: year, participants: [civ]}); // mourn the Civs that still do
		}
	}

	/**
	 * get a list of every Lect currently spoken in this world, sorted roughly from most to least important.
	 * there may be duplicates.
	 */
	getLects(): Lect[] {
		const cultures = [...this.cultures].sort((a, b) => {
			// put national languages before minority languages
			if (a.hasNationState() && !b.hasNationState())
				return -1;
			if (b.hasNationState() && !a.hasNationState())
				return 1;
			// put languages with many speakers before languages with few speakers
			else
				return b.getPopulation() - a.getPopulation();
		});
		const lects = cultures.map(culture => culture.lect.standardRegister);
		// remove duplicates
		for (let i = 1; i < lects.length; i ++)
			for (let j = 0; j < i; j ++)
				if (lects[i] === lects[j])
					lects.splice(i, 1);
		return lects;
	}

	/**
	 * get a copied list of every country currently in this world
	 * @param sorted if true, return items sorted from largest to smallest
	 * @param minSize exclude all countries with fewer than minSize tiles
	 */
	getCivs(sorted: boolean = false, minSize: number = 0): Civ[] {
		let output = [...this.civs];
		if (sorted)
			output.sort((a, b) => b.getLandArea() - a.getLandArea());
		if (minSize > 0)
			output = output.filter((c) => c.getTiles().size >= minSize);
		return output;
	}

	/**
	 * get a copied list of every culture that exists anywhere in this world
	 * @param sorted if true, return items sorted from largest to smallest
	 */
	getCultures(sorted: boolean = false): Culture[] {
		let output = [...this.cultures];
		if (sorted)
			output.sort((a, b) => b.getTiles().size - a.getTiles().size);
		return output;
	}

	/**
	 * spawn a new civ
	 */
	addNewCiv(predecessor: Civ, location: Tile, year: number): Civ {
		this.lastCivID ++;
		const civ = new Civ(this.lastCivID, this, location, year, predecessor);
		this.civs.add(civ);
		return civ;
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

	/**
	 * spawn a new Culture
	 */
	addNewCulture(location: Tile, technology: number): Culture {
		this.lastCultureID ++;
		const culture = new Culture(
			location.culture, this.lastCultureID, location, technology, this.rng.next() + 1);
		this.cultures.add(culture);
		return culture;
	}
}
