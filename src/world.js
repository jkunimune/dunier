// world.js
'use strict';


/**
 * collection of civilizations and languages that goes on a planet
 */
class World {
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
	generateHistory(year, surface, rng) {
		let i = 0;
		for (const tile of surface.nodes) {
			if (tile.biome !== 'samud' && rng.probability(0.04)) {
				this.civs.add(new Civ(tile, i, this));
				i ++;
			}
		}
	}
}


class Civ {
	constructor(capital, id, world) {
		this.capital = capital;
		this.id = id;
		this.world = world;
		this.nodes = new Set([capital]);
		world.barbaria.delete(capital); // this is no longer uncivilized
		this.language = new Language();
	}
}


class Language {
	constructor() {
	}
}
