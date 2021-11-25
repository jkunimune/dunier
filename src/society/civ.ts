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
import {Lect, LogaTipo} from "../language/lect.js";
import {Random} from "../util/random.js";
import {World} from "./world.js";
import {Kultur} from "./culture.js";
import {Word} from "../language/word.js";
import {TreeMap} from "../util/treemap.js";


const SOCIAL_DECAY_PERIOD = 1000; // [year] time it takes for an empire's might to decay by 2.7
const CULTURAL_MEMORY = 160; // [year] time it takes to erase a people's language
const HUMAN_WEIGHT = 100; // [] multiplier on vertical distances TODO: use the minimum slope that a military can traverse instead


/**
 * a single political entity
 */
export class Civ {
	public readonly id: number;
	public readonly capital: Nodo; // the capital city
	public readonly nodos: TreeMap<Nodo>; // the tiles it owns and the order in which it acquired them
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
		this.nodos = new TreeMap<Nodo>((nodo: Nodo) => nodo.domublia);
		this.kenare = new Map<Nodo, Set<Nodo>>();

		this.capital = capital;
		if (world.currentRuler(capital) === null) // if this is a wholly new civilization
			capital.kultur = new Kultur(null, capital, this, rng); // make up a proto-kultur
		this.conquer(capital, null);

		this.militarism = rng.erlang(4, 1); // TODO have naval military might separate from terrestrial
		this.technology = technology;
	}

	/**
	 * do the upkeep required for this to officially gain tile and all tiles that were
	 * subsidiary to it.
	 * @param tile the land being acquired
	 * @param from the place from which it was acquired
	 */
	conquer(tile: Nodo, from: Nodo) {
		const loser = this.world.currentRuler(tile);

		this._conquer(tile, from, loser);

		if (loser !== null)
			loser.lose(tile); // do the opposite upkeep for the other gy

		for (const newLand of this.nodos.getAllChildren(tile)) {
			for (const neighbor of newLand.neighbors.keys()) {
				if (this.kenare.has(neighbor) && this.kenare.get(neighbor).has(newLand)) {
					this.kenare.get(neighbor).delete(newLand);
					if (this.kenare.get(neighbor).size === 0)
						this.kenare.delete(neighbor);
				}
				else if (!this.nodos.has(neighbor)) {
					if (!this.kenare.has(newLand))
						this.kenare.set(newLand, new Set<Nodo>()); // finally, adjust the border map as necessary
					this.kenare.get(newLand).add(neighbor);
				}
			}
		}
	}

	/**
	 * do all the parts of conquer that happen recursively
	 * @param tile
	 * @param from
	 * @param loser
	 */
	_conquer(tile: Nodo, from: Nodo, loser: Civ) {
		this.world.politicalMap.set(tile, this);
		this.nodos.add(tile, from); // add it to nodos

		if (loser !== null) {
			for (const child of loser.nodos.getChildren(tile)) // then recurse
				if (child.domublia > 0)
					this._conquer(child, tile, loser);
		}
		else {
				tile.kultur = this.capital.kultur; // perpetuate the ruling culture
		}
	}

	/**
	 * do the upkeep required for this to officially lose tile.
	 * @param tile the land being taken
	 */
	lose(tile: Nodo) {
		for (const lostLand of this.nodos.getAllChildren(tile)) { // start by going thru and updating the border map
			if (this.world.politicalMap.get(lostLand) === this) // and update the global political map
				this.world.politicalMap.delete(lostLand);
		}
		for (const lostLand of this.nodos.getAllChildren(tile)) { // adjust the border map
			for (const neighbor of lostLand.neighbors.keys()) {
				if (this.world.politicalMap.get(neighbor) === this) {
					if (!this.kenare.has(neighbor))
						this.kenare.set(neighbor, new Set<Nodo>());
					this.kenare.get(neighbor).add(lostLand);
				}
			}
			this.kenare.delete(lostLand);
		}

		this.nodos.delete(tile); // remove it and all its children from nodos
	}

	/**
	 * change with the passing of the centuries
	 * @param rng
	 */
	update(rng: Random) {
		const newKultur: Map<Lect, Kultur> = new Map();
		newKultur.set(this.capital.kultur.lect.macrolanguage, new Kultur(this.capital.kultur, this.capital, this, rng)); // start by updating the capital, tying it to the new homeland
		for (const nodo of this.nodos) { // update the culture of each node in the empire in turn
			if (rng.probability(World.timeStep/CULTURAL_MEMORY)) { // if the province fails its heritage save
				nodo.kultur = this.capital.kultur; // its culture gets overritten
			}
			else { // otherwise update it normally
				if (!newKultur.has(nodo.kultur.lect.macrolanguage)) // if anyone isn't already in the thing
					newKultur.set(nodo.kultur.lect.macrolanguage, new Kultur(nodo.kultur, null, this, rng)); // update that culture, treating it as a diaspora
				nodo.kultur = newKultur.get(nodo.kultur.lect.macrolanguage); // then make the assinement
			}
		}

		if (this.nodos.size() > 0) {
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
		const distanceEff = Math.hypot(distance, HUMAN_WEIGHT*elevation)/end.pasablia;
		if (momentum > resistance) // this randomness ensures Civs can accomplish things over many timesteps
			return rng.exponential(distanceEff/World.imperialism/(momentum - resistance));
		else
			return Infinity;
	}

	getStrength(kontra: Civ, sa: Nodo) : number {
		let linguisticModifier = 1;
		if (kontra != null && sa.kultur.lect.isIntelligible(this.capital.kultur.lect))
			linguisticModifier = World.nationalism;
		return this.militarism*this.technology*linguisticModifier;
	}

	/**
	 * get the total controlld area.
	 */
	getArea(): number {
		let area = 0;
		for (const nodo of this.nodos)
			if (nodo.biome !== 'samud') // TODO: save this in a dynamically updating variable like the arable area
				area += nodo.getArea();
		return area;
	}

	/**
	 * get the controlld area scaled by how effectively it can support populacion.  this
	 * number is more important and therefore faster to obtain than the land area.
	 */
	getArableArea(): number {
		return this.nodos.total();
	}

	getPopulation(): number {
		return Math.round(World.carryingCapacity*this.technology*this.getArableArea());
	}

	getName(): Word {
		return this.capital.kultur.lect.getName(
			this.capital.index.toString(), LogaTipo.DESHA);
	}

}

