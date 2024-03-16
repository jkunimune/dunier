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
import {Surface} from "../surface/surface.js";
import {MapProjection} from "./projection.js";
import {PathSegment, Place, Point} from "../utilities/coordinates.js";

/**
 * a Plate-Caree projection, primarily for interfacing with other mapping software.
 */
export class Equirectangular extends MapProjection {
	private readonly factor: number;

	constructor(surface: Surface, northUp: boolean, locus: PathSegment[]) {
		const scale = Math.sqrt(surface.area/(2*Math.PI*(surface.фMax - surface.фMin)));
		super(
			surface, northUp, locus,
			-Math.PI*scale, Math.PI*scale,
			-surface.фMax*scale, -surface.фMin*scale);
		this.factor = scale;
	}

	projectPoint(point: Place): Point {
		return {x: this.factor*point.λ, y: -this.factor*point.ф};
	}
}
