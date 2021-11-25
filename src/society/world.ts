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
// @ts-ignore
import TinyQueue from '../lib/tinyqueue.js';

import {Nodo, Surface} from "../planet/surface.js";
import {Random} from "../util/random.js";
import {Civ} from "./civ.js";


const DOMUBLIA = new Map([ // terrain modifiers for civ spawning and population growth
	['samud',       0.0],
	['potistan',    0.1],
	['barxojangle', 0.3],
	['jangle',      3.0],
	['lage',        0.0],
	['taige',       0.3],
	['piristan',    0.1],
	['grasistan',   1.0],
	['registan',    0.0],
	['tundre',      0.1],
	['aise',        0.0],
]);
const RIVER_UTILITY_THRESHOLD = 1e6;
const FRESHWATER_UTILITY = 0.1;
const SALTWATER_UTILITY = 1.0;
const PASABLIA = new Map([ // terrain modifiers for invasion speed
	['samud',       0.1],
	['potistan',    0.1],
	['barxojangle', 0.1],
	['jangle',      1.0],
	['lage',        3.0],
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
	public static readonly startOfHumanHistory = -3000; // [BCE]
	public static readonly timeStep = 100; // [year]
	public static readonly authoritarianism = 1e-7; // [1/year/km^2] rate at which people coalesce into kingdoms
	public static readonly libertarianism = 2e-7; // [1/year/km^2] rate at which peeple start revolucions
	public static readonly nationalism = 3.0; // [] factor by which oppressed minorities are more likely to rebel
	public static readonly imperialism = 1e-1; // [km/y] the rate at which denizens conquer
	public static readonly intelligence = 1e-7; // [1/y] the rate at which denizens have good ideas
	public static readonly carryingCapacity = .05; // [1/km^2] density of people that can live in a grassland with entry-level technology
	public static readonly valueOfKnowledge = .50; // [] value of a single technological advancement
	public static readonly powerOfMemes = .02; // [1/year] probability that an idea spreads across a border in a year
	public static readonly apocalypseSurvivalRate = .50; // [] the fraccion of the populacion a country gets to keep after a cataclysm

	public readonly cataclysms: number; // [1/y] the rate at which the apocalypse happens
	public planet: Surface;
	private readonly civs: Set<Civ>;
	private readonly politicalMap: Map<Nodo, Civ>;
	private nextID: number;


	constructor(cataclysms: number, planet: Surface) {
		this.cataclysms = cataclysms;
		this.planet = planet;
		this.civs = new Set(); // list of countries in the world
		this.nextID = 0;
		this.politicalMap = new Map();

		for (const nodo of planet.nodos) { // assine the society-relevant values to the Nodos
			nodo.domublia = DOMUBLIA.get(nodo.biome); // start with the biome-defined habitability
			if (nodo.domublia > 0 || nodo.biome === 'registan') { // if it is habitable at all or is a desert
				for (const neighbor of nodo.neighbors.keys()) { // increase habitability based on adjacent water
					if (neighbor.biome === 'lage' || nodo.neighbors.get(neighbor).liwe > RIVER_UTILITY_THRESHOLD)
						nodo.domublia += FRESHWATER_UTILITY;
					if (neighbor.biome === 'samud')
						nodo.domublia += SALTWATER_UTILITY;
				}
			}
			nodo.domublia *= nodo.getArea();

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
			const demomultia = World.carryingCapacity*tile.domublia; // TODO: implement nomads, city state leagues, and federal states.
			const ruler = this.currentRuler(tile);
			if (ruler == null) { // if it is uncivilized, the limiting factor is the difficulty of establishing a unified state
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
		const invasions	= new TinyQueue([], (a: {time: number}, b: {time: number}) => a.time - b.time); // keep track of all current invasions
		for (const invader of this.civs) {
			for (const ourTile of invader.kenare.keys()) { // each civ initiates all its invasions
				for (const theirTile of invader.kenare.get(ourTile)) {
					const time = invader.estimateInvasionTime(ourTile, theirTile, rng); // figure out when they will be done
					if (time <= World.timeStep) // if that goal is within reach
						invasions.push({time: time, invader: invader, start: ourTile, end: theirTile}); // start on it
				}
			}
		}
		while (invasions.length > 0) {
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
							if (end <= World.timeStep) {
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
	 * get a copied list of the id of every country currently in this world, sorted from
	 * most to least populous
	 */
	getCivs(sorted: boolean = false): Civ[] {
		const output = [];
		for (const civ of this.civs)
			output.push(civ);
		if (sorted)
			output.sort((a, b) => b.getPopulation() - a.getPopulation());
		return output;
	}

	/**
	 * get the Civ from this set that has this ID
	 * @param id
	 */
	getCiv(id: number): Civ {
		for (const civ of this.civs)
			if (civ.id == id)
				return civ;
		throw new RangeError(`there is no civ with id ${id}`);
	}
}
