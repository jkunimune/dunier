// world.ts

import {Nodo, Surface} from "./surface.js";
import {Random} from "./random.js";


/**
 * collection of civilizations and languages that goes on a planet
 */
export class World {
	public planet: Surface;
	public barbaria: Set<Nodo>;
	public civs: Set<Civ>;

	constructor(planet) {
		this.planet = planet;
		this.barbaria = new Set(planet.nodes); // list of tiles that are not politically united
		this.civs = new Set(); // list of countries in the world
	}

	/**
	 * populate the World with all the civs and stuff.
	 * @param year
	 * @param surface
	 * @param rng
	 */
	generateHistory(year: number, surface: Surface, rng: Random) {
		let i = 0;
		for (const tile of surface.nodos) {
			if (tile.biome !== 'samud' && rng.probability(0.04)) {
				this.civs.add(new Civ(tile, i, this));
				i ++;
			}
		}
	}
}


class Civ {
	public readonly id: number;
	public nodos: Set<Nodo>;
	public capital: Nodo;
	public language: Language;
	private world: World;

	constructor(capital: Nodo, id: number, world: World) {
		this.capital = capital;
		this.id = id;
		this.world = world;
		this.nodos = new Set([capital]);
		world.barbaria.delete(capital); // this is no longer uncivilized
		this.language = new Language();
	}
}


class Language {
	constructor() {
	}
}
