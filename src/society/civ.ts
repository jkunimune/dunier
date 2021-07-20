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
import {Nodo} from "../planet/surface.js";
import {DeuteroLang, Language, ProtoLang, WordType} from "../language/language.js";
import {Random} from "../util/random.js";
import {World} from "./world.js";
import {Style, transcribe} from "../language/script.js";


const SOCIAL_DECAY_PERIOD = 1000; // [year] time it takes for an empire's might to decay by 2.7
const CULTURAL_MEMORY = 160; // [year] time it takes to erase a people's language
const HUMAN_WEIGHT = 100; // [] multiplier on vertical distances TODO: use the minimum slope that a military can traverse instead

const DOMUBLIA = new Map([ // terrain modifiers for civ spawning and population growth
	['samud',       0.0],
	['potistan',    0.1],
	['barxojangle', 0.3],
	['jangle',      3.0],
	['lage',        0.0],
	['taige',       0.3],
	['piristan',    0.1],
	['grasistan',   1.0],
	['registan',    0.1],
	['tundre',      0.1],
	['aise',        0.0],
]);
const RIVER_UTILITY_THRESHOLD = 1e6;
const RIVER_UTILITY = 0.1;
const OCEAN_UTILITY = 1.0;
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
 * a single political entity
 */
export class Civ {
	public readonly id: number;
	private arableLand: number; // the population, pre technology modifier
	public languages: Map<Nodo, Language>; // the languages of this country
	public officialLanguage: Language;
	public readonly capital: Nodo; // the capital city
	public readonly nodos: Set<Nodo>; // the tiles it owns
	public readonly kenare: Map<Nodo, Set<Nodo>>; // the set of tiles it owns that are adjacent to tiles it doesn't
	private readonly world: World;

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
		this.world = world; // TODO if every Civ has its own rng, it would make things a bit more stable
		this.id = id;
		this.arableLand = 0;
		this.nodos = new Set();
		this.kenare = new Map<Nodo, Set<Nodo>>();
		this.languages = new Map();

		if (world.currentRuler(capital) === null) // if this is a wholly new civilization
			this.officialLanguage = new ProtoLang(rng); // make up a language
		else // if it's based on an existing one
			this.officialLanguage = null; // the language will get automatically set when the capital is conquered

		this.capital = capital;
		this.conquer(capital);

		this.militarism = rng.erlang(4, 1); // TODO have naval military might separate from terrestrial
		this.technology = technology;
	}

	/**
	 * do the upkeep required for this to officially gain tile. TODO: implement a road network; when a tile is conquered, the conquerer automatically gets everything beyond that as well
	 * @param tile the land being acquired
	 */
	conquer(tile: Nodo) {
		const loser = this.world.currentRuler(tile);
		if (loser !== null) {
			const language = loser.languages.get(tile); // update the language state
			this.languages.set(tile, language);
			if (this.officialLanguage === null)
				this.officialLanguage = language; // and take it as our official language if we don't have one already
			loser.lose(tile); // then make it neutral territory
		}
		else {
			this.languages.set(tile, this.officialLanguage);
		}

		this.nodos.add(tile); // add it to nodos
		this.kenare.set(tile, new Set<Nodo>()); // adjust the border map as necessary
		for (const neighbor of tile.neighbors.keys()) {
			if (this.kenare.has(neighbor) && this.kenare.get(neighbor).has(tile)) {
				this.kenare.get(neighbor).delete(tile);
				if (this.kenare.get(neighbor).size === 0)
					this.kenare.delete(neighbor);
			}
			else if (!this.nodos.has(neighbor))
				this.kenare.get(tile).add(neighbor);
		}

		this.arableLand += Civ.getDomublia(tile); // adjust population
		this.world.politicalMap.set(tile, this);
	}

	/**
	 * do the upkeep required for this to officially lose tile.
	 * @param tile the land being taken
	 */
	lose(tile: Nodo) {
		this.languages.delete(tile); // remove it from the language map

		this.nodos.delete(tile); // remove it from nodos
		this.kenare.delete(tile); // adjust the border map
		for (const neighbor of tile.neighbors.keys()) {
			if (this.nodos.has(neighbor)) {
				if (!this.kenare.has(neighbor))
					this.kenare.set(neighbor, new Set<Nodo>());
				this.kenare.get(neighbor).add(tile);
			}
		}

		this.arableLand -= Civ.getDomublia(tile);
		if (this.arableLand < 1e-8)
			this.arableLand = 0;
		this.world.politicalMap.delete(tile);

		if (!this.nodos.has(this.capital)) // kill it when it loses its capital TODO make this an exclave thing
			this.militarism = 0;
	}

	/**
	 * change with the passing of the centuries
	 * @param rng
	 */
	update(rng: Random) {
		const newLects: Map<Language, DeuteroLang> = new Map();
		for (const nodo of this.nodos) {
			if (this.languages.get(nodo) !== this.officialLanguage)
				if (this.languages.get(nodo).isIntelligible(this.officialLanguage) ||
					rng.probability(World.timeStep/CULTURAL_MEMORY))
					this.languages.set(nodo, this.officialLanguage);
			const currentLect = this.languages.get(nodo);
			if (!newLects.has(currentLect))
				newLects.set(currentLect, new DeuteroLang(currentLect, rng));
			this.languages.set(nodo, newLects.get(currentLect));
		}
		if (this.nodos.has(this.capital))
			this.officialLanguage = this.languages.get(this.capital);

		if (this.nodos.size > 0) {
			this.militarism *= Math.exp(-World.timeStep / SOCIAL_DECAY_PERIOD);
			this.technology += World.valueOfKnowledge * rng.poisson(
				World.intelligence*World.timeStep*this.getPopulation()); // TODO: subsequent technologies should be harder to reach, making this truly exponential
		}
	}

	/**
	 * how many years will it take this Civ to invade this Node?
	 * @param start the source of the invaders
	 * @param end the place being invaded
	 * @param rng the random number generator to use to determine the battle outcome
	 */
	estimateInvasionTime(start: Nodo, end: Nodo, rng: Random) {
		const invadee = this.world.currentRuler(end);
		const momentum = this.getStrength(invadee, end);
		const resistance = (invadee !== null) ? invadee.getStrength(invadee, end) : 0;
		const distance = start.neighbors.get(end).length;
		const elevation = start.gawe - end.gawe;
		const distanceEff = Math.hypot(distance, HUMAN_WEIGHT*elevation)/Civ.getPasablia(end);
		if (momentum > resistance) // this randomness ensures Civs can accomplish things over many timesteps
			return rng.exponential(distanceEff/World.imperialism/(momentum - resistance));
		else
			return Infinity;
	}

	getStrength(kontra: Civ, sa: Nodo) : number { // TODO automatically lose exclaves
		let linguisticModifier = 1;
		if (kontra != null && kontra.languages.get(sa).isIntelligible(this.officialLanguage))
			linguisticModifier = World.nationalism;
		return this.militarism*this.technology*linguisticModifier;
	}

	getArea(): number {
		let area = 0;
		for (const nodo of this.nodos)
			area += nodo.getArea();
		return area;
	}

	getPopulation(): number {
		return Math.round(World.carryingCapacity*this.arableLand*this.technology);
	}

	getName(convention: Style = Style.NASOMEDI): string {
		return transcribe(this.officialLanguage.getNamloge(this.capital.index%25, WordType.LOKONAM), convention);
	}


	static getDomublia(tile: Nodo): number {
		let val = DOMUBLIA.get(tile.biome);
		if (val > 0) {
			for (const neighbor of tile.neighbors.keys()) {
				if (tile.neighbors.get(neighbor).liwe > RIVER_UTILITY_THRESHOLD)
					val += RIVER_UTILITY;
				if (neighbor.biome === 'samud' || neighbor.biome === 'lage')
					val += OCEAN_UTILITY;
			}
		}
		return val*tile.getArea();
	}

	static getPasablia(tile: Nodo): number {
		return PASABLIA.get(tile.biome);
	}

}

