// world.ts

import {Nodo, Surface} from "./surface.js";
import {Random} from "./random.js";


/**
 * collection of civilizations and languages that goes on a planet
 */
export class World {
	public planet: Surface;
	public civs: Set<Civi>;
	private numCivs: number = 0;

	constructor(planet) {
		this.planet = planet;
		this.civs = new Set(); // list of countries in the world
	}

	/**
	 * populate the World with all the civs and stuff.
	 * @param century the number of timesteps
	 * @param rng the random number generator to use
	 */
	generateHistory(century: number, rng: Random) {
		for (let i = 0; i < century; i ++) {
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
				const canivia = 0.01;
				if (rng.probability(canivia)) {
					this.civs.add(new Civi(tile, this.numCivs, this));
					this.numCivs++;
				}
			}
		}
	}

	/**
	 * expand the territories of expansionist civs
	 * @param rng the random number generator to use
	 */
	spreadCivs(rng: Random) {
		for (const here of this.planet.nodos) {
			if (this.currentRuler(here) == null) {
				for (const there of here.neighbors.keys()) {
					if (this.currentRuler(there) != null) {
						if (rng.probability(0.5)) {
							this.currentRuler(there).conquer(here);
							break;
						}
					}
				}
			}
		}
	}

	/**
	 * determine the current Civi of this tile
	 */
	currentRuler(tile: Nodo): Civi {
		for (const civ of this.civs)
			if (civ.nodos.has(tile))
				return civ;
		return null;
	}
}


/**
 * a single political entity
 */
class Civi {
	public readonly id: number;
	public nodos: Set<Nodo>; // the tiles it owns
	public capital: Nodo; // the capital city
	public language: Language; // the official language
	private kenare: Set<Nodo>; // the tiles adjacent to tiles it owns (this always contains all adjacent lands and no owned lands)
	private world: World;

	constructor(capital: Nodo, id: number, world: World) {
		this.world = world;
		this.id = id;
		this.nodos = new Set();
		this.kenare = new Set();
		this.conquer(capital);
		this.capital = capital;
		this.language = new Language();
	}

	conquer(tile: Nodo) {
		this.nodos.add(tile);
		this.kenare.delete(tile);
		for (const neighbor of tile.neighbors.keys()) {
			if (this.world.currentRuler(neighbor) != this) {
				this.kenare.add(neighbor);
			}
		}
	}
}


class Language {
	constructor() {
	}
}
