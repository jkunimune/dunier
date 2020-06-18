// world.ts

import "../node_modules/tinyqueue/tinyqueue.min.js"
//@ts-ignore
const TinyQueue = window.TinyQueue;

import {Nodo, Surface} from "./surface.js";
import {Random} from "./random.js";
import {Language, ProtoLanguage, DeuteroLanguage, romanize} from "./language.js";


const TIME_STEP = 100; // year
const SPAWN_RATE = 1e-8; // 1/year/km^2
const INVASION_SPEED = .1; // km/year
const CARRYING_CAPACITY = 1000; // people that can live in a tile of grassland with entry-level technology
const DOMUBLIA = { // terrain modifiers for civ spawning and population growth
	'samud':       0.0,
	'potistan':    0.3,
	'barxojangal': 0.3,
	'jangal':      3.0,
	'lage':        0.0,
	'taige':       0.3,
	'piristan':    0.1,
	'grasistan':   1.0,
	'registan':    0.1,
	'tundar':      0.1,
	null:          NaN,
};
const PASABLIA = { // terrain modifiers for invasion speed
	'samud':       0.1,
	'potistan':    0.1,
	'barxojangal': 0.1,
	'jangal':      1.0,
	'lage':        1.0,
	'taige':       1.0,
	'piristan':    0.3,
	'grasistan':   3.0,
	'registan':    0.1,
	'tundar':      0.3,
	null:          NaN,
};


/**
 * collection of civilizations and languages that goes on a planet
 */
export class World {
	public planet: Surface;
	public civs: Set<Civ>;

	constructor(planet) {
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
			this.spreadCivs(rng); // TODO: population
		}
	}

	/**
	 * generate a few new civs in uninhabited territory
	 * @param rng the random number generator to use
	 */
	spawnCivs(rng: Random) { // TODO: rebellions
		for (const tile of this.planet.nodos) { // TODO: bonus from rivers and lakes
			if (this.currentRuler(tile) == null) {
				const canivia = SPAWN_RATE*TIME_STEP*tile.surface.area/tile.surface.nodos.size*DOMUBLIA[tile.biome];
				if (rng.probability(canivia)) {
					this.civs.add(new Civ(tile, this.civs.size, this, rng));
				}
			}
		}
	}

	/**
	 * expand the territories of expansionist civs
	 * @param rng the random number generator to use
	 */
	spreadCivs(rng: Random) { // TODO: detriment from mountains
		const invasions	= new TinyQueue([], (a, b) => a.end - b.end); // keep track of all current invasions
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
	 * how many years will it take this Civ to invade this Node?
	 * @param invader the invading party
	 * @param site the tile being invaded
	 * @param rng the random number generator to use to determine the battle outcome
	 */
	estimateInvasionTime(invader: Civ, site: Nodo, rng: Random) {
		const invadee = this.currentRuler(site);
		const momentum = invader.getStrength();
		const resistance = (invadee != null) ? invadee.getStrength() : 0;
		const distance = Math.sqrt(site.surface.area/site.surface.nodos.size)/PASABLIA[site.biome]; // TODO: bonus to same-language invasions
		if (momentum > resistance)
			return rng.exponential(distance/INVASION_SPEED/(momentum - resistance));
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
	public livableLand: number; // the population, pre technology modifier
	public capital: Nodo; // the capital city
	public nodos: Set<Nodo>; // the tiles it owns
	public kenare: Set<Nodo>; // the set of tiles adjacent to nodos
	public language: Language; // the official language
	private world: World;

	public militarism: number; // base military strength
	public enlightenment: number; // technological military modifier

	/**
	 * create a new civilization
	 * @param capital
	 * @param id
	 * @param world
	 * @param rng
	 */
	constructor(capital: Nodo, id: number, world: World, rng: Random) {
		this.world = world;
		this.id = id;
		this.livableLand = 0;
		this.nodos = new Set();
		this.kenare = new Set<Nodo>();
		this.capital = capital;
		this.conquer(capital);

		this.language = new ProtoLanguage(rng);
		this.name = rng.discrete(0, 100);

		this.militarism = rng.exponential(1);
		this.enlightenment = 1;
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
		this.livableLand += DOMUBLIA[tile.biome];
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
		this.livableLand -= DOMUBLIA[tile.biome];
		if (!this.nodos.has(this.capital)) // kill it when it loses its capital
			this.militarism = 0;
	}

	/**
	 * change with the passing of the centuries
	 * @param rng
	 */
	update(rng: Random) {
		if (this.nodos.size > 0) {
			this.language = new DeuteroLanguage(this.language, rng);
			this.militarism = rng.exponential(1); // TODO: finite personality drift speed
		} // TODO: scientific advancement
	}

	getStrength() : number {
		return this.militarism*this.enlightenment; // TODO: put this 20 in the header
	}

	getPopulation(): number {
		return CARRYING_CAPACITY*this.livableLand*this.enlightenment;
	}

	getName(): string {
		return romanize(this.language.getCountryName(this.name));
	}
}

