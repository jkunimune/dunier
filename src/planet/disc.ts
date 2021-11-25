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
import {Vector} from "../util/util.js";
import {Nodo, Place, Surface, Triangle} from "./surface.js";

/**
 * a planar planet based on the modern flat earth model, where the sun circles in a horizontal plane above the world,
 * and the oscillating radius of its orbit effects the seasons.
 */
export class Disc extends Surface {
	protected readonly radius: number;
	protected readonly firmamentHite: number;
	private readonly effectiveObliquity: number;

	constructor(radius: number, obliquity: number, aspectRatio: number = 4.) {
		super(Math.atan(1/aspectRatio), Math.PI/2);
		this.radius = radius;
		this.firmamentHite = radius/aspectRatio;
		this.effectiveObliquity = obliquity;
	}

	partition(): {triangles: Triangle[], nodos: Nodo[]} {
		const nodos: Nodo[] = [
			new Nodo(null, {ф: Math.atan(1/8), λ: 0}, this),
			new Nodo(null, {ф: Math.atan(1/8), λ: Math.PI/2}, this),
			new Nodo(null, {ф: Math.atan(1/8), λ: Math.PI}, this),
			new Nodo(null, {ф: Math.atan(1/8), λ: 3*Math.PI/2}, this),
		];

		const triangles: Triangle[] = [
			new Triangle(nodos[0], nodos[1], nodos[2]),
			new Triangle(nodos[2], nodos[3], nodos[0]),
		];

		return {triangles: triangles, nodos: nodos};
	}

	dsdф(ф: number): number {
		return this.firmamentHite*Math.pow(Math.sin(ф), -2);
	}

	dAds(ф: number): number {
		return 2*Math.PI*this.firmamentHite/Math.tan(ф);
	}

	insolation(ф: number): number {
		const cosψ = Math.cos(2*this.effectiveObliquity)
		const ρ = this.firmamentHite/this.radius/Math.tan(ф);
		return 7.0/(
			(3.865*cosψ + 6.877) -
			(44.803*cosψ +  1.216)*Math.pow(ρ, 2) +
			(87.595*cosψ + 19.836)*Math.pow(ρ, 4) -
			(38.728*cosψ -  8.049)*Math.pow(ρ, 6));
	}

	windConvergence(ф: number): number {
		return 1.5*(Math.sin(2*ф)**2 + Math.sin(3*ф)**2 - 0.5)
	}

	windVelocity(ф: number): {nord: number, dong: number} {
		return {nord: Math.sin(2*ф), dong: 0};
	}

	xyz(ф: number, λ: number): Vector {
		const r = this.firmamentHite/Math.tan(ф);
		return new Vector(r*Math.sin(λ), -r*Math.cos(λ), 0);
	}

	фλ(x: number, y: number, z: number): Place {
		return {
			ф: Math.max(Math.atan(this.firmamentHite/Math.hypot(x, y)), this.фMin),
			λ: Math.atan2(x, -y)};
	}

	normal(node: Place): Vector {
		return new Vector(0, 0, 1);
	}

	distance(a: Place, b: Place): number {
		const ar = this.firmamentHite/Math.tan(a.ф);
		const br = this.firmamentHite/Math.tan(b.ф);
		return Math.sqrt(ar*ar + br*br - 2*ar*br*Math.cos(a.λ - b.λ));
	}
}
