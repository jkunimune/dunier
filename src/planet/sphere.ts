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
import {Spheroid} from "./spheroid.js";
import {Vector} from "../util/geometry.js";
import {Tile} from "./surface.js";
import {Place} from "../util/coordinates.js";

/**
 * a non-rotating spheroid. aspectRatio = 1, and latitude is measured in the y direction
 * rather than the z.
 */
export class Sphere extends Spheroid {
	constructor(radius: number) {
		super(radius, 1, 0, Number.NaN);
	}

	insolation(ф: number): number {
		return 2.0*Math.max(0, Math.sin(ф));
	}

	windConvergence(ф: number): number {
		return Math.cos(ф);
	}

	windVelocity(ф: number): {north: number, east: number} {
		return {north: -Math.cos(ф), east: 0};
	}

	xyz(place: Place): Vector {
		const {x, y, z} = super.xyz(place);
		return new Vector(x, z, -y);
	}

	фλ(point: Vector): Place {
		return super.фλ(new Vector(point.x, -point.z, point.y));
	}

	normal(tile: Tile): Vector {
		return tile.pos.norm();
	}
}
