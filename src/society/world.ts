/**
 * MIT License
 *
 * Copyright (c) 2021 Justin Kunimune
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import Queue from '../datastructures/queue.js';
import {Tile, Surface} from "../planet/surface.js";
import {Random} from "../util/random.js";
import {Civ} from "./civ.js";
import {Biome} from "./terrain.js";


const ARABILITY = new Map([ // terrain modifiers for civ spawning and population growth
	[Biome.OCEAN,     0.0],
	[Biome.SWAMP,     0.1],
	[Biome.JUNGLE,    1.0],
	[Biome.FOREST,    3.0],
	[Biome.LAKE,      0.0],
	[Biome.TAIGA,     0.3],
	[Biome.STEAMLAND, 0.1],
	[Biome.PLAINS,    1.0],
	[Biome.DESERT,    0.0],
	[Biome.TUNDRA,    0.1],
	[Biome.ICE,       0.0],
]);
const RIVER_UTILITY_THRESHOLD = 1e6;
const FRESHWATER_UTILITY = 0.1;
const SALTWATER_UTILITY = 1.0;
const PASSABILITY = new Map([ // terrain modifiers for invasion speed
	[Biome.OCEAN,     0.1],
	[Biome.SWAMP,     0.1],
	[Biome.JUNGLE,    0.1],
	[Biome.FOREST,    1.0],
	[Biome.LAKE,      3.0],
	[Biome.TAIGA,     1.0],
	[Biome.STEAMLAND, 0.3],
	[Biome.PLAINS,    3.0],
	[Biome.DESERT,    0.1],
	[Biome.TUNDRA,    0.3],
	[Biome.ICE,       0.1],
]);


/**
 * collection of civilizations and languages that goes on a planet
 */
export class World {
	public static readonly startOfHumanHistory = -3200; // [BCE]
	public static readonly timeStep = 100; // [year]
	public static readonly authoritarianism = 2e-8; // [1/year/km^2] rate at which people coalesce into kingdoms
	public static readonly libertarianism = 2e-7; // [1/year/km^2] rate at which peeple start revolucions
	public static readonly nationalism = 3.0; // [] factor by which oppressed minorities are more likely to rebel
	public static readonly imperialism = 1e-1; // [km/y] the rate at which denizens conquer
	public static readonly intelligence = 5e-8; // [1/y] the rate at which denizens have good ideas
	public static readonly carryingCapacity = .05; // [1/km^2] density of people that can live in a grassland with entry-level technology
	public static readonly valueOfKnowledge = .50; // [] value of a single technological advancement
	public static readonly powerOfMemes = .02; // [1/year] probability that an idea spreads across a border in a year
	public static readonly apocalypseSurvivalRate = .80; // [] the fraccion of the populacion a country gets to keep after a cataclysm (not accounting for domino effects)

	public readonly cataclysms: number; // [1/y] the rate at which the apocalypse happens
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

		for (const tiles of planet.tiles) { // assine the society-relevant values to the Tiles
			tiles.arability = ARABILITY.get(tiles.biome); // start with the biome-defined habitability
			if (tiles.arability > 0 || tiles.biome === Biome.DESERT) { // if it is habitable at all or is a desert
				for (const neighbor of tiles.neighbors.keys()) { // increase habitability based on adjacent water
					if (neighbor.biome === Biome.LAKE || tiles.neighbors.get(neighbor).flow > RIVER_UTILITY_THRESHOLD)
						tiles.arability += FRESHWATER_UTILITY;
					if (neighbor.biome === Biome.OCEAN)
						tiles.arability += SALTWATER_UTILITY;
				}
			}
			tiles.arableArea = tiles.arability*tiles.getArea();

			tiles.passability = PASSABILITY.get(tiles.biome);
		}
	}

	/**
	 * populate the World with all the civs and stuff.
	 * @param year the number of years to simulate
	 * @param rng the random number generator to use
	 */
	generateHistory(year: number, rng: Random) {
		for (let t = World.startOfHumanHistory; t < year; t += World.timeStep) {
			for (const civ of this.civs)
				civ.update(rng);
			this.spawnCivs(rng); // TODO: build cities
			this.spreadCivs(rng);
			this.spreadIdeas(rng);
			if (Math.floor((t+World.timeStep)*this.cataclysms) > Math.floor((t)*this.cataclysms))
				this.haveCataclysm(rng);
		}
	}

	/**
	 * generate a few new civs in uninhabited territory
	 * @param rng the random number generator to use
	 */
	spawnCivs(rng: Random) {
		for (const tile of this.planet.tiles) {
			const demomultia = World.carryingCapacity*tile.arableArea; // TODO: implement nomads, city state leagues, and federal states.
			const ruler = this.currentRuler(tile);
			if (ruler === null) { // if it is uncivilized, the limiting factor is the difficulty of establishing a unified state
				if (rng.probability(World.authoritarianism*World.timeStep*demomultia))
					this.civs.add(new Civ(tile, this.nextID, this, rng));
			}
			else { // if it is already civilized, the limiting factor is the difficulty of starting a revolution
				let linguisticModifier;
				if (tile.culture.lect.isIntelligible(ruler.capital.culture.lect))
					linguisticModifier = 1;
				else
					linguisticModifier = World.nationalism;
				if (rng.probability(World.libertarianism*World.timeStep*demomultia*linguisticModifier)) // use the population without technology correction for balancing
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
					if (time <= World.timeStep) // if that goal is within reach
						invasions.push({time: time, invader: invader, start: ourTile, end: theirTile}); // start on it
				}
			}
		}
		while (!invasions.empty()) {
			let {time, invader, start, end} = invasions.pop(); // as invasions finish
			const invadee = this.currentRuler(end);
			const invaderStrength = invader.getStrength(invadee, end);
			const invadeeStrength = (invadee !== null) ? invadee.getStrength(invadee, end) : 0;
			if (invader.tiles.has(start) && !invader.tiles.has(end) &&
					invaderStrength > invadeeStrength) { // check that they're still doable
				invader.conquer(end, start); // update the game state
				for (const conquerdLand of invader.tiles.getAllChildren(end)) { // and set up new invasions that bild off of it
					for (const neighbor of conquerdLand.neighbors.keys()) {
						if (!invader.tiles.has(neighbor)) {
							time = time + rng.exponential(invader.estimateInvasionTime(conquerdLand, neighbor));
							if (time <= World.timeStep) {
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
	 * @param rng
	 */
	spreadIdeas(rng: Random) {
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
		const spreadChance = Math.exp(-World.timeStep*World.powerOfMemes);
		for (const civ of this.civs) {
			if (visibleTechnology.get(civ) > civ.technology)
				civ.technology += World.valueOfKnowledge*rng.binomial(
					(visibleTechnology.get(civ) - civ.technology)/World.valueOfKnowledge,
					spreadChance);
		}
	}

	/**
	 * devastate the entire world. the details of how are fuzzy, but in a nutshell half of all people die (well, more
	 * accurately, half of all provinces are depopulated, and half of all technologies are lost.
	 * @param rng
	 */
	haveCataclysm(rng: Random) {
		for (const civ of this.civs) {
			for (const tile of [...civ.tiles])
				if (civ.tiles.has(tile) && !rng.probability(World.apocalypseSurvivalRate))
					civ.lose(tile);
			civ.technology = World.valueOfKnowledge*rng.binomial(
				civ.technology/World.valueOfKnowledge, World.apocalypseSurvivalRate);
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
	 * @param minNumber return at least this many, even if they are below minSize
	 */
	getCivs(sorted: boolean = false, minSize: number = 0, minNumber: number = 0): Civ[] {
		let output = [];
		for (const civ of this.civs)
			output.push(civ);
		if (sorted)
			output.sort((a, b) => b.getArea() - a.getArea());
		if (minNumber > 0) {
			if (!sorted)
				throw "I have only implemented the minNumber constraint when the countries are sorted by size";
			minNumber = Math.min(minNumber, output.length);
			if (minNumber === 0)
				throw "There are no countries in the world";
			minSize = Math.min(minSize, output[minNumber - 1].tiles.size());
		}
		if (minSize > 0)
			output = output.filter((c) => c.tiles.size() >= minSize);
		return output;
	}

	/**
	 * get the Civ from this set that has this ID
	 * @param id
	 */
	getCiv(id: number): Civ {
		for (const civ of this.civs)
			if (civ.id === id)
				return civ;
		throw new RangeError(`there is no civ with id ${id}`);
	}
}
