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
import Queue from '../util/queue.js';
import {Nodo, Surface} from "../planet/surface.js";
import {Random} from "../util/random.js";
import {Civ} from "./civ.js";
import {Biome} from "./terrain.js";


const DOMUBLIA = new Map([ // terrain modifiers for civ spawning and population growth
	[Biome.HAI,         0.0],
	[Biome.FANTOPIA,    0.1],
	[Biome.BARSAJANGAL, 0.3],
	[Biome.JANGAL,      3.0],
	[Biome.LAK,         0.0],
	[Biome.TAIGA,       0.3],
	[Biome.AGNITOPIA,   0.1],
	[Biome.GAZOTOPIA,   1.0],
	[Biome.ARENATOPIA,  0.0],
	[Biome.TUNDRA,      0.1],
	[Biome.AIS,         0.0],
]);
const RIVER_UTILITY_THRESHOLD = 1e6;
const FRESHWATER_UTILITY = 0.1;
const SALTWATER_UTILITY = 1.0;
const PASABLIA = new Map([ // terrain modifiers for invasion speed
	[Biome.HAI,         0.1],
	[Biome.FANTOPIA,    0.1],
	[Biome.BARSAJANGAL, 0.1],
	[Biome.JANGAL,      1.0],
	[Biome.LAK,         3.0],
	[Biome.TAIGA,       1.0],
	[Biome.AGNITOPIA,   0.3],
	[Biome.GAZOTOPIA,   3.0],
	[Biome.ARENATOPIA,  0.1],
	[Biome.TUNDRA,      0.3],
	[Biome.AIS,         0.1],
]);


/**
 * collection of civilizations and languages that goes on a planet
 */
export class World {
	public static readonly startOfHumanHistory = -3200; // [BCE]
	public static readonly timeStep = 100; // [year]
	public static readonly authoritarianism = 5e-8; // [1/year/km^2] rate at which people coalesce into kingdoms
	public static readonly libertarianism = 2e-7; // [1/year/km^2] rate at which peeple start revolucions
	public static readonly nationalism = 3.0; // [] factor by which oppressed minorities are more likely to rebel
	public static readonly imperialism = 1e-1; // [km/y] the rate at which denizens conquer
	public static readonly intelligence = 5e-8; // [1/y] the rate at which denizens have good ideas
	public static readonly carryingCapacity = .05; // [1/km^2] density of people that can live in a grassland with entry-level technology
	public static readonly valueOfKnowledge = .50; // [] value of a single technological advancement
	public static readonly powerOfMemes = .02; // [1/year] probability that an idea spreads across a border in a year
	public static readonly apocalypseSurvivalRate = .50; // [] the fraccion of the populacion a country gets to keep after a cataclysm

	public readonly cataclysms: number; // [1/y] the rate at which the apocalypse happens
	public planet: Surface;
	public readonly politicalMap: Map<Nodo, Civ>;
	private readonly civs: Set<Civ>;
	private nextID: number;


	constructor(cataclysms: number, planet: Surface) {
		this.cataclysms = cataclysms;
		this.planet = planet;
		this.civs = new Set(); // list of countries in the world
		this.nextID = 0;
		this.politicalMap = new Map();

		for (const nodo of planet.nodos) { // assine the society-relevant values to the Nodos
			nodo.arability = DOMUBLIA.get(nodo.biome); // start with the biome-defined habitability
			if (nodo.arability > 0 || nodo.biome === Biome.ARENATOPIA) { // if it is habitable at all or is a desert
				for (const neighbor of nodo.neighbors.keys()) { // increase habitability based on adjacent water
					if (neighbor.biome === Biome.LAK || nodo.neighbors.get(neighbor).liwe > RIVER_UTILITY_THRESHOLD)
						nodo.arability += FRESHWATER_UTILITY;
					if (neighbor.biome === Biome.HAI)
						nodo.arability += SALTWATER_UTILITY;
				}
			}
			nodo.arableArea = nodo.arability*nodo.getArea();

			nodo.pasablia = PASABLIA.get(nodo.biome);
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
		for (const tile of this.planet.nodos) {
			const demomultia = World.carryingCapacity*tile.arableArea; // TODO: implement nomads, city state leagues, and federal states.
			const ruler = this.currentRuler(tile);
			if (ruler === null) { // if it is uncivilized, the limiting factor is the difficulty of establishing a unified state
				if (rng.probability(World.authoritarianism*World.timeStep*demomultia))
					this.civs.add(new Civ(tile, this.nextID, this, rng));
			}
			else { // if it is already civilized, the limiting factor is the difficulty of starting a revolution
				let linguisticModifier = World.nationalism;
				if (tile.kultur.lect.isIntelligible(ruler.capital.kultur.lect))
					linguisticModifier = 1;
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
		const invasions: Queue<{time: number, invader: Civ, start: Nodo, end: Nodo}> = new Queue(
			[], (a, b) => a.time - b.time); // keep track of all current invasions
		for (const invader of this.civs) {
			for (const ourTile of invader.kenare.keys()) { // each civ initiates all its invasions
				for (const theirTile of invader.kenare.get(ourTile)) {
					const time = invader.estimateInvasionTime(ourTile, theirTile, rng); // figure out when they will be done
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
			if (invader.nodos.has(start) && !invader.nodos.has(end) &&
					invaderStrength > invadeeStrength) { // check that they're still doable
				invader.conquer(end, start); // update the game state
				for (const conquerdLand of invader.nodos.getAllChildren(end)) { // and set up new invasions that bild off of it
					for (const neighbor of conquerdLand.neighbors.keys()) {
						if (!invader.nodos.has(neighbor)) {
							time = time + invader.estimateInvasionTime(conquerdLand, neighbor, rng);
							if (time <= World.timeStep) {
								invasions.push({time: time, invader: invader, start: end, end: neighbor});
							}
						}
					}
				} // note that I don't allow for counterinvasions, because I think it would be unnecessary
			}
		}
		for (const civ of this.civs)
			if (civ.getArableArea() === 0)
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
			for (const tiles of civ.kenare.values()) { // check our borders
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
			for (const nodo of civ.nodos)
				if (!rng.probability(World.apocalypseSurvivalRate))
					civ.lose(nodo);
			civ.technology = World.valueOfKnowledge*rng.binomial(
				civ.technology/World.valueOfKnowledge, World.apocalypseSurvivalRate);
		}
	}

	/**
	 * determine the current Civ of this tile
	 */
	currentRuler(tile: Nodo): Civ {
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
			minSize = Math.min(minSize, output[minNumber - 1].nodos.size());
		}
		if (minSize > 0)
			output = output.filter((c) => c.nodos.size() >= minSize);
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
