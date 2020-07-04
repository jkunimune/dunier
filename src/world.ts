// world.ts

import "./lib/tinyqueue.js"
//@ts-ignore
const TinyQueue = window.TinyQueue;

import {Nodo, Surface} from "./surface.js";
import {Random} from "./random.js";
import {Language, ProtoLanguage, DeuteroLanguage, Convention, romanize} from "./language.js";


const TIME_STEP = 100; // [year]
const AUTHORITARIANISM = 1e-7; // [1/year/km^2] rate at which people coalesce into kingdoms
const LIBERTARIANISM = 5e-7; // [1/year/km^2] rate at which tribes coalesce into kingdoms
const IMPERIALISM = .1; // [km/year] rate at which the average empire spreads without organized resistance
const CARRYING_CAPACITY = .05; // [1/km^2] density of people that can live in a grassland with entry-level technology
const HUMAN_INTELLIGENCE = 1e-7; // [1/year] probability that one person has an idea in a year
const VALUE_OF_KNOWLEDGE = 0.5; // [] value of a single technological advancement
const POWER_OF_MEMES = .02; // [1/year] probability that an idea spreads across a border in a year

const DOMUBLIA = new Map([ // terrain modifiers for civ spawning and population growth
	['samud',       0.0],
	['potistan',    0.1],
	['barxojangal', 0.3],
	['jangal',      3.0],
	['lage',        0.0],
	['taige',       0.3],
	['piristan',    0.1],
	['grasistan',   1.0],
	['registan',    0.1],
	['tundre',      0.1],
	['aise',        0.0],
]);
const PASABLIA = new Map([ // terrain modifiers for invasion speed
	['samud',       0.1],
	['potistan',    0.1],
	['barxojangal', 0.1],
	['jangal',      1.0],
	['lage',        0.3],
	['taige',       1.0],
	['piristan',    0.3],
	['grasistan',   3.0],
	['registan',    0.1],
	['tundre',      0.3],
	['aise',        0.1],
]);


/**
 * collection of civilizations and languages that goes on a planet
 */
export class World {
	public planet: Surface;
	public civs: Set<Civ>;

	constructor(planet: Surface) {
		this.planet = planet;
		this.civs = new Set(); // list of countries in the world
	}

	/**
	 * populate the World with all the civs and stuff.
	 * @param year the number of years to simulate
	 * @param rng the random number generator to use
	 */
	generateHistory(year: number, rng: Random) {
		for (let t = 0; t < year; t += TIME_STEP) {
			for (const civ of this.civs)
				civ.update(rng);
			this.spawnCivs(rng);
			this.spreadCivs(rng);
			this.spreadIdeas(rng);
		}
	}

	/**
	 * generate a few new civs in uninhabited territory
	 * @param rng the random number generator to use
	 */
	spawnCivs(rng: Random) {
		for (const tile of this.planet.nodos) { // TODO: bonus from rivers and lakes
			const demomultia = CARRYING_CAPACITY*DOMUBLIA.get(tile.biome)*tile.surface.area/tile.surface.nodos.size;
			const ruler = this.currentRuler(tile);
			if (ruler == null) { // if it is uncivilized, the limiting factor is the difficulty of establishing a unified state
				if (rng.probability(AUTHORITARIANISM*TIME_STEP*demomultia)) {
					this.civs.add(new Civ(tile, this.civs.size, this, rng));
				}
			}
			else { // if it is already civilized, the limiting factor is the difficulty of starting a revolution
				if (rng.probability(LIBERTARIANISM*TIME_STEP*demomultia)) { // use the population without technology correction for balancing
					ruler.lose(tile);
					this.civs.add(new Civ(tile, this.civs.size, this, rng, ruler.technology));
				}
			}
		}
	}

	/**
	 * expand the territories of expansionist civs
	 * @param rng the random number generator to use
	 */
	spreadCivs(rng: Random) { // TODO: detriment from mountains
		const invasions	= new TinyQueue([], (a: {end: number}, b: {end: number}) => a.end - b.end); // keep track of all current invasions
		for (const invader of this.civs) {
			for (const tile of invader.kenare) { // each civ initiates all its invasions
				const time = this.estimateInvasionTime(invader, tile, rng); // figure out when they will be done
				if (time <= TIME_STEP) // if that goal is within reach
					invasions.push({end: time, invader: invader, tile: tile}); // start on it
			}
		}
		while (invasions.length > 0) {
			let {end, invader, tile} = invasions.pop(); // as invasions finish
			if (invader.kenare.has(tile)) { // check that they're still doable
				invader.conquer(tile); // update the game state
				for (const neighbor of tile.neighbors.keys()) { // and move on
					if (invader.kenare.has(neighbor)) { // note that this check can refresh stalled invasions, thus giving the invader advantage on adjacent fronts
						end = end + this.estimateInvasionTime(invader, neighbor, rng);
						if (end <= TIME_STEP) // assuming it is possible
							invasions.push({end: end, invader: invader, tile: neighbor});
					}
				}
			}
		}
	}

	/**
	 * carry technology across borders. every civ has a chance to gain each technology at least one of their neighors have that they don't
	 * @param rng
	 */
	spreadIdeas(rng: Random) {
		const visibleTechnology: Map<Civ, number> = new Map(); // how much advanced technology can they access?
		for (const civ of this.civs) {
			visibleTechnology.set(civ, civ.technology); // well, any technology they _have_, for one
			for (const other of this.civs) { // look at every other civ
				if (other.technology > visibleTechnology.get(civ)) { // if they have something we don't
					for (const node of civ.kenare) { // check our borders
						if (other.nodos.has(node)) { // to see if we share any with them
							visibleTechnology.set(civ, other.technology); // if so, we can access their technology
						}
					}
				}
			}
		}
		const spreadChance = Math.exp(-TIME_STEP*POWER_OF_MEMES);
		for (const civ of this.civs) {
			if (visibleTechnology.get(civ) > civ.technology)
				civ.technology += rng.binomial(visibleTechnology.get(civ) - civ.technology, spreadChance);
		}
	}

	/**
	 * how many years will it take this Civ to invade this Node?
	 * @param invader the invading party
	 * @param site the tile being invaded
	 * @param rng the random number generator to use to determine the battle outcome
	 */
	estimateInvasionTime(invader: Civ, site: Nodo, rng: Random) {
		const invadee = this.currentRuler(site);
		const momentum = invader.getStrength();
		const resistance = (invadee != null) ? invadee.getStrength() : 0;
		const distance = Math.sqrt(site.surface.area/site.surface.nodos.size)/PASABLIA.get(site.biome); // TODO: bonus to same-language invasions
		if (momentum > resistance) // this randomness ensures Civs can accomplish things over many timesteps
			return rng.exponential(distance/IMPERIALISM/(momentum - resistance));
		else
			return Infinity;
	}

	/**
	 * determine the current Civ of this tile
	 */
	currentRuler(tile: Nodo): Civ {
		for (const civ of this.civs) // TODO: does this take a lot of time?
			if (civ.nodos.has(tile))
				return civ;
		return null;
	}
}


/**
 * a single political entity
 */
class Civ {
	public readonly id: number;
	private readonly name: number; // its name index
	public arableLand: number; // the population, pre technology modifier
	public capital: Nodo; // the capital city
	public nodos: Set<Nodo>; // the tiles it owns
	public kenare: Set<Nodo>; // the set of tiles adjacent to nodos
	public language: Language; // the official language
	private world: World;

	public militarism: number; // base military strength
	public technology: number; // technological military modifier

	/**
	 * create a new civilization
	 * @param capital the home tile, with which this empire starts
	 * @param id a nonnegative integer unique to this civ
	 * @param world the world in which this civ lives
	 * @param rng a random number generator
	 * @param technology
	 */
	constructor(capital: Nodo, id: number, world: World, rng: Random, technology: number = 1) {
		this.world = world;
		this.id = id;
		this.arableLand = 0;
		this.nodos = new Set();
		this.kenare = new Set<Nodo>();
		this.capital = capital;
		this.conquer(capital);

		this.language = new ProtoLanguage(rng); // TODO associate languages with tiles, not countries, and also stamp them out
		this.name = rng.discrete(0, 100);

		this.militarism = rng.exponential(1); // TODO: decide if this is really the PDF I want
		this.technology = technology;
	}

	/**
	 * do the upkeep required for this to officially gain tile.
	 * @param tile the land being acquired
	 */
	conquer(tile: Nodo) {
		const loser = this.world.currentRuler(tile);
		if (loser != null)
			loser.lose(tile);

		this.nodos.add(tile);
		for (const neighbor of tile.neighbors.keys()) {
			if (this.world.currentRuler(neighbor) != this) {
				this.kenare.add(neighbor);
			}
		}
		this.arableLand += DOMUBLIA.get(tile.biome);
	}

	/**
	 * do the upkeep required for this to officially lose tile.
	 * @param tile the land being taken
	 */
	lose(tile: Nodo) {
		this.nodos.delete(tile); // remove it from nodos
		for (const neighbor of tile.neighbors.keys()) {
			this.kenare.delete(neighbor); // remove its neighbors from kenare
			if (this.world.currentRuler(neighbor) === this) {
				this.kenare.add(tile); // add this to kenare if there are other adjacencies
			}
			else {
				for (const further of neighbor.neighbors.keys())
					if (this.world.currentRuler(further) === this)
						this.kenare.add(neighbor); // check if you need to re-add these
			}
		}
		this.arableLand -= DOMUBLIA.get(tile.biome);
		if (this.arableLand < 0)
			this.arableLand = 0;
		if (!this.nodos.has(this.capital)) // kill it when it loses its capital
			this.militarism = 0;
	}

	/**
	 * change with the passing of the centuries
	 * @param rng
	 */
	update(rng: Random) {
		if (this.nodos.size > 0)
			this.language = new DeuteroLanguage(this.language, rng);

		this.technology += VALUE_OF_KNOWLEDGE*rng.poisson(HUMAN_INTELLIGENCE*TIME_STEP*this.getPopulation());
	}

	getStrength() : number {
		return this.militarism*this.technology;
	}

	getPopulation(): number {
		return CARRYING_CAPACITY*this.arableLand*this.technology;
	}

	getName(convention: Convention = Convention.NASOMEDI): string {
		return romanize(this.language.getCountryName(this.name), convention);
	}
}

