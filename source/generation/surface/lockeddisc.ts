/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Disc} from "./disc.js";

/**
 * a planar planet where the sun hovers stationary above the center.
 */
export class LockedDisc extends Disc {
	/**
	 * construct a constantly lit disc
	 * @param radius the radius of the disc's edge in km
	 */
	constructor(radius: number) {
		super(radius, NaN, false, 2);
	}

	insolation(φ: number): number {
		return -2.0*Math.pow(Math.sin(φ), 3);
	}

	hasSeasons(_: number): boolean {
		return false;
	}
	
	windConvergence(φ: number): number {
		return 2.0*Math.pow(Math.sin(φ), 2);
	}
}
