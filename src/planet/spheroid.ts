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
import {Nodo, Place, Surface, Triangle} from "./surface.js";
import {legendreP2, legendreP4, legendreP6, Vector} from "../util/util.js";

/**
 * an oblate spheroid
 */
export class Spheroid extends Surface {
	private readonly radius: number;
	private readonly aspectRatio: number;
	private readonly flattening: number;
	private readonly eccentricity: number;
	private readonly obliquity: number;

	constructor(radius: number, gravity: number, omega: number, obliquity: number) {
		super(-Math.PI/2, Math.PI/2);
		this.radius = radius; // keep radius in km
		const w = (radius*1000)*omega*omega/gravity; // this dimensionless parameter determines the aspect ratio
		this.aspectRatio = 1 + w/2 + 1.5*w*w + 6.5*w*w*w; // numerically determined formula for oblateness
		if (this.aspectRatio > 4)
			throw new RangeError("Too fast to sustain an ellipsoidal planet.");
		this.flattening = 1 - 1/this.aspectRatio;
		this.eccentricity = Math.sqrt(1 - Math.pow(this.aspectRatio, -2));
		this.obliquity = obliquity;
	}

	partition(): {triangles: Triangle[]; nodos: Nodo[]} {
		const b = Math.atan(1/this.aspectRatio);
		const m = Math.trunc(2*Math.PI/Math.hypot(Math.sin(b)/this.aspectRatio, 1 - Math.cos(b)));
		const n = 4;
		const nodos = [];
		for (let i = 1; i < n; i ++) // construct a grid of points,
			for (let j = 0; j < m; j ++)
				nodos.push(new Nodo(null, {
					φ: Math.PI*(i/n - .5),
					λ: 2*Math.PI*(j + .5*(i%2))/m,
				}, this));
		const kS = nodos.length; // assign Nodes to the poles,
		nodos.push(new Nodo(null, { φ: -Math.PI/2, λ: 0 }, this));
		const kN = nodos.length;
		nodos.push(new Nodo(null, { φ: Math.PI/2, λ: 0 }, this));

		const triangles = []; // and strew it all with triangles
		for (let j = 0; j < m; j ++)
			triangles.push(
				new Triangle(nodos[kS], nodos[(j+1)%m], nodos[j]));
		for (let i = 1; i < n-1; i ++) {
			for (let j = 0; j < m; j ++) {
				if (i%2 === 1) {
					triangles.push(new Triangle(
						nodos[(i-1)*m + j],
						nodos[i*m + (j+1)%m],
						nodos[i*m + j]));
					triangles.push(new Triangle(
						nodos[(i-1)*m + j],
						nodos[(i-1)*m + (j+1)%m],
						nodos[i*m + (j+1)%m]));
				}
				else {
					triangles.push(new Triangle(
						nodos[(i-1)*m + j],
						nodos[(i-1)*m + (j+1)%m],
						nodos[i*m + j]));
					triangles.push(new Triangle(
						nodos[(i-1)*m + (j+1)%m],
						nodos[i*m + (j+1)%m],
						nodos[i*m + j]));
				}
			}
		}
		for (let j = 0; j < m; j ++)
			triangles.push(
				new Triangle(nodos[kN], nodos[(n-2)*m + j], nodos[(n-2)*m + (j+1)%m]));
		return {nodos: nodos, triangles: triangles};
	}

	dsdφ(φ: number): number {
		const β = Math.atan(Math.tan(φ)/this.aspectRatio);
		const dβdφ = this.aspectRatio/(
			Math.pow(Math.sin(φ), 2) +
			Math.pow(this.aspectRatio*Math.cos(φ), 2));
		const dsdβ = this.radius*
			Math.sqrt(1 - Math.pow(this.eccentricity*Math.cos(β), 2));
		return dsdβ*dβdφ;
	}

	dAds(φ: number): number {
		const β = Math.atan(Math.tan(φ)/this.aspectRatio);
		return 2*Math.PI*this.radius*Math.cos(β);
	}

	insolation(φ: number): number {
		return Spheroid.annualInsolationFunction(this.obliquity, φ);
	}

	windConvergence(φ: number): number {
		return Math.pow(Math.cos(φ), 2) + Math.pow(Math.cos(3*φ), 2);
	}

	windVelocity(φ: number): {nord: number, dong: number} {
		return {nord: 0, dong: Math.cos(φ)}; // realistically this should change direccion, but this formula makes orographs more apparent
	}

	xyz(φ: number, λ: number): Vector {
		const β = Math.atan(Math.tan(φ)/this.aspectRatio);
		return new Vector(
			this.radius*Math.cos(β)*Math.sin(λ),
			-this.radius*Math.cos(β)*Math.cos(λ),
			this.radius*Math.sin(β)/this.aspectRatio);
	}

	φλ(x: number, y: number, z: number): Place {
		const β = Math.atan2(this.aspectRatio*z, Math.hypot(x, y));
		const λ = Math.atan2(x, -y);
		return {φ: Math.atan(Math.tan(β)*this.aspectRatio), λ: λ};
	}

	normal(node: Place): Vector {
		return new Vector(
			Math.cos(node.φ)*Math.sin(node.λ),
			-Math.cos(node.φ)*Math.cos(node.λ),
			Math.sin(node.φ));
	}

	distance(a: Place, b: Place): number { // TODO: check
		const s = Math.acos(Math.sin(a.φ)*Math.sin(b.φ) +
			Math.cos(a.φ)*Math.cos(b.φ)*Math.cos(a.λ - b.λ));
		const p = (a.φ + b.φ)/2;
		const q = (b.φ - a.φ)/2;
		const x = (s - Math.sin(s))*Math.pow(Math.sin(p)*Math.cos(q)/Math.cos(s/2), 2);
		const y = (s + Math.sin(s))*Math.pow(Math.cos(p)*Math.sin(q)/Math.sin(s/2), 2);
		return this.radius*(s - this.flattening/2*(x + y));
	}

	/**
	 * from Alice Nadeau and Richard McGehee (2018)
	 * @param obliquity
	 * @param latitude
	 */
	static annualInsolationFunction(obliquity: number, latitude: number) {
		return 1 -
			5/8.*legendreP2(Math.cos(obliquity))*legendreP2(Math.sin(latitude)) -
			9/64.*legendreP4(Math.cos(obliquity))*legendreP4(Math.sin(latitude)) -
			65/1024.*legendreP6(Math.cos(obliquity))*legendreP6(Math.sin(latitude));
	}
}


