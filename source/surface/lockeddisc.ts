/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Disc} from "./disc.js";

/**
 * a planar planet where the sun hovers stationary above the center.
 */
export class LockedDisc extends Disc {
	constructor(radius: number) {
		super(radius, NaN, 2);
	}

	insolation(ф: number): number {
		return 2.0/Math.pow(1 + Math.pow(Math.tan(ф), -2), 3/2.);
	}

	windConvergence(ф: number): number {
		return Math.pow(Math.sin(ф), 2);
	}
}

