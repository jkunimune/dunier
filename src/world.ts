// world.ts

import "../node_modules/tinyqueue/tinyqueue.min.js"
//@ts-ignore
const TinyQueue = window.TinyQueue;

import {Nodo, Surface} from "./surface.js";
import {Random} from "./random.js";


const TIME_STEP = 100; // year
const INVASION_SPEED = 10; // km/year
const PASABLIA = { // terrain modifiers for invasion speed
	'samud':       .5,
	'potistan':    '#444921',
	'barxojangal': .3,
	'jangal':      1,
	'lage':        1,
	'taige':       1,
	'piristan':    .5,
	'grasistan':   1.5,
	'registan':    .3,
	'tundar':      .5,
	null:         NaN,
};


/**
 * collection of civilizations and languages that goes on a planet
 */
export class World {
	public planet: Surface;
	public civs: Set<Civ>;
	private numCivs: number = 0;

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
			this.spawnCivs(rng);
			this.spreadCivs(rng);
		}
	}

	/**
	 * generate a few new civs in uninhabited territory
	 * @param rng the random number generator to use
	 */
	spawnCivs(rng: Random) {
		for (const tile of this.planet.nodos) {
			if (tile.biome !== 'samud' && this.currentRuler(tile) == null) {
				const canivia = 0.005;
				if (rng.probability(canivia)) {
					this.civs.add(new Civ(tile, this.numCivs, this, rng));
					this.numCivs ++;
				}
			}
		}
	}

	/**
	 * expand the territories of expansionist civs
	 * @param rng the random number generator to use
	 */
	spreadCivs(rng: Random) {
		const invasions	= new TinyQueue([], (a, b) => a.end - b.end); // keep track of all current invasions
		for (const invader of this.civs) {
			for (let i = 0; i < invader.expansionism; i ++) { // each civ initiates some number of invasions
				if (invader.kenare.length > 0) {
					const tile = invader.kenare.pop();
					const time = this.estimateInvasionTime(invader, tile, rng); // figure out when they will be done
					if (time <= TIME_STEP) // if that time is finite and positive
						invasions.push({end: time, invader: invader, tile: tile}); // start on it
				}
			}
		}
		while (invasions.length > 0) {
			let {end, invader, tile} = invasions.pop(); // as invasions finish
			invader.conquer(tile); // update the game state
			if (invader.kenare.length > 0) {
				tile = invader.kenare.pop(); // and move onto the next one
				end = end + this.estimateInvasionTime(invader, tile, rng);
				if (end <= TIME_STEP) // assuming it is possible
					invasions.push({end: end, invader: invader, tile: tile});
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
		const resistance = (invadee != null) ? invadee.getStrength() : 1;
		const distance = Math.sqrt(site.surface.area/site.surface.nodos.size)/PASABLIA[site.biome];
		const time = distance/INVASION_SPEED/(momentum - resistance*rng.exponential(1/Math.log(2)));
		if (time > 0)
			return time;
		else
			return TIME_STEP+1;
	}

	/**
	 * determine the current Civ of this tile
	 */
	currentRuler(tile: Nodo): Civ {
		for (const civ of this.civs)
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
	public capital: Nodo; // the capital city
	public nodos: Set<Nodo>; // the tiles it owns
	public kenare; // the list of tiles it wants to invade
	public language: Language; // the official language
	private world: World;

	public expansionism: number; // how many tiles it can invade at once
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
		this.nodos = new Set();
		this.kenare = new TinyQueue([], (a, b) => a.index - b.index);
		this.capital = capital;
		this.conquer(capital);
		this.language = new Language();

		this.expansionism = rng.discrete(0, 4);
		this.militarism = rng.exponential(1);
		this.enlightenment = 0;
	}

	/**
	 * do the upkeep required for this to officially gain tile.
	 * @param tile the land being acquired
	 */
	conquer(tile: Nodo) {
		const loser = this.world.currentRuler(tile);
		if (loser != null)
			loser.lose(tile);

		// if (loser == null) {
			this.nodos.add(tile);
			for (const neighbor of tile.neighbors.keys()) {
				if (this.world.currentRuler(neighbor) != this) {
					this.kenare.push(neighbor);
				}
			}
		// }
		// else {
		// 	this.kenare.push(tile);
		// }
	}

	/**
	 * do the upkeep required for this to officially lose tile.
	 * @param tile the land being taken
	 */
	lose(tile: Nodo) {
		this.nodos.delete(tile);
		this.kenare.push(tile);
		if (!this.nodos.has(this.capital)) // kill it when it loses its capital
			this.expansionism = 0;
	}

	getStrength() : number {
		return this.militarism*Math.exp(this.enlightenment/20);
	}
}


class Language {
	constructor() {
	}
}
