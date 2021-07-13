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
import {Spheroid} from "./spheroid.js";


/**
 * a toroidal planet
 */
export class Toroid extends Surface {
	private readonly majorRadius: number;
	private readonly minorRadius: number;
	private readonly elongation: number;
	private readonly obliquity: number;

	constructor(radius: number, gravity: number, omega: number, obliquity: number) {
		super(-Math.PI, Math.PI);
		const w = (radius*1000)*omega*omega/gravity; // this dimensionless parameter determines the aspect ratio
		const aspectRatio = 1/(1.010*w + 0.618*w*w); // numerically determined formula for aspect ratio
		this.elongation = 1/(1 - 0.204*w + 4.436*w*w); // numerically determined formula for elongation
		if (aspectRatio < 1.5)
			throw new RangeError("Too fast to sustain a toroidal planet.");
		if (aspectRatio > 6)
			throw new RangeError("Too slow to sustain a toroidal planet.");
		this.majorRadius = radius*aspectRatio/(1 + aspectRatio);
		this.minorRadius = radius/(1 + aspectRatio);
		this.obliquity = obliquity;
	}

	partition(): {triangles: Triangle[], nodos: Nodo[]} {
		const m = 3;
		const n = 4*Math.trunc(m*this.majorRadius/(this.minorRadius*this.elongation));
		const nodos = [];
		for (let i = 0; i < n; i ++) { // construct a chain of points,
			const φ0 = (i%2 === 0) ? 0 : Math.PI/m;
			for (let j = 0; j < m; j ++)
				nodos.push(new Nodo(null, {
					φ: φ0 + 2*Math.PI/m * j,
					λ: 2*Math.PI/n * i,
				}, this));
		}

		// console.log('nodos = np.array([');
		// for (const nodo of nodos)
		// 	console.log(`[${nodo.pos.x}, ${nodo.pos.y}, ${nodo.pos.z}],`);
		// console.log('])');

		// console.log('triangles = np.array([');
		const triangles = []; // and cover it with triangles
		for (let i = 0; i < n; i ++) {
			for (let j = 0; j < m; j ++) {
				for (let coords of [[[0, 0], [2, 0], [1, 0]], [[1, 0], [2, 0], [3, 0]]]) {
					const indices = [];
					for (let k = 0; k < 3; k ++)
						indices.push((i + coords[k][0])%n*m + (j + coords[k][1] + (i%2)*(coords[k][0])%2)%m);
					// console.log(`[${indices}],`);
					triangles.push(new Triangle(
						nodos[indices[0]], nodos[indices[1]], nodos[indices[2]]));
				}
			}
		}
		// console.log('])');
		return {nodos: nodos, triangles: triangles};
	}

	dsdφ(φ: number): number {
		const β = Math.atan(Math.tan(φ)*this.elongation);
		const dβdφ = this.elongation/(
			Math.pow(Math.cos(φ), 2) +
			Math.pow(this.elongation*Math.sin(φ), 2));
		const dsdβ = this.minorRadius*
			Math.hypot(Math.sin(β), this.elongation*Math.cos(β));
		return dsdβ*dβdφ;
	}

	dAds(φ: number): number {
		const β = Math.atan2(Math.sin(φ)*this.elongation, Math.cos(φ));
		return 2*Math.PI*(this.majorRadius + this.minorRadius*Math.cos(β));
	}

	insolation(φ: number): number {
		const β = Math.atan(Math.tan(φ)*this.elongation);
		const incident = Spheroid.annualInsolationFunction(this.obliquity, φ);
		let opacity;
		if (Math.cos(φ) >= 0)
			opacity = 0;
		else if (this.obliquity === 0)
			opacity = 1;
		else { // I made this formula up myself to fit some actually accurate integrals.  I'm quite proud of it.
			const dz = 2*this.majorRadius/this.minorRadius*Math.tan(this.obliquity)/this.elongation;
			opacity =
				Math.min(1, Math.min(1, (1 - Math.sin(β))/dz) * Math.min(1, (1 + Math.sin(β))/dz) +
					0.4*Math.pow(Math.sin(2*β), 2)/(1 + dz) -
					0.8*this.elongation*this.minorRadius/this.majorRadius * Math.pow(Math.cos(φ), 3));
		}
		return incident*(1 - opacity);
	}

	windConvergence(φ: number): number {
		return Math.pow(Math.cos(φ), 2) + Math.pow(Math.cos(3*φ), 2);
	}

	windVelocity(φ: number): {nord: number, dong: number} {
		return {nord: 0, dong: Math.cos(φ)};
	}

	xyz(φ: number, λ: number): Vector {
		const β = Math.atan2(Math.sin(φ)*this.elongation, Math.cos(φ));
		const r = this.majorRadius + this.minorRadius*Math.cos(β);
		const z = this.elongation*this.minorRadius*Math.sin(β);
		return new Vector(
			r*Math.sin(λ), -r*Math.cos(λ), z);
	}

	φλ(x: number, y: number, z: number): Place {
		const r = Math.hypot(x, y);
		const β = Math.atan2(z/this.elongation, r - this.majorRadius);
		return {
			φ: Math.atan2(Math.sin(β)/this.elongation, Math.cos(β)),
			λ: Math.atan2(x, -y)};
	}

	normal(node: Place): Vector {
		return new Vector(
			Math.cos(node.φ)*Math.sin(node.λ),
			-Math.cos(node.φ)*Math.cos(node.λ),
			Math.sin(node.φ));
	}

	distance(a: Place, b: Place): number {
		const rAvg = 2/(
			1/(this.majorRadius + this.minorRadius*Math.cos(a.φ)) +
			1/(this.majorRadius + this.minorRadius*Math.cos(b.φ)));
		const aAvg = (this.dsdφ(a.φ) + this.dsdφ(b.φ))/2;
		const sTor = rAvg * (Math.abs(a.λ - b.λ) % (2*Math.PI));
		const sPol = aAvg * Math.abs((a.φ - b.φ) % (2*Math.PI));
		return Math.hypot(sTor, sPol);
	}
}
