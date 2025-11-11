/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Tile, Surface, Vertex} from "./surface.js";
import {Spheroid} from "./spheroid.js";
import {ΦΛPoint} from "../../utilities/coordinates.js";
import {localizeInRange} from "../../utilities/miscellaneus.js";


/**
 * a toroidal planet
 */
export class Toroid extends Surface {
	/** the distance from the center to the radial centroid in km */
	readonly majorRadius: number;
	/** the distance from the radial centroid to either equator in km */
	readonly minorRadius: number;
	/** the ratio of the height of the torus to its radial extent */
	readonly elongation: number;
	/** the axial tilt in km */
	readonly obliquity: number;

	/**
	 * construct a toroid
	 * @param radius the distance from the center to the furthest point (the major radius plus the minor radius) in km
	 * @param gravity the surface gravity on the outer equator in m/s^2
	 * @param omega the rate at which the planet rotates in radians/s
	 * @param obliquity the axial tilt in radians
	 */
	constructor(radius: number, gravity: number, omega: number, obliquity: number) {
		super(-Infinity, Infinity, true);

		const w = (radius*1000)*omega*omega/gravity; // this dimensionless parameter determines the aspect ratio
		if (w > 0.5) // 0.5 corresponds to an aspect ratio of about 1.5
			throw new RangeError("Too fast to sustain a toroidal planet.");
		if (w < 0.17) // 0.15 corresponds to an aspect ratio of about 6.0
			throw new RangeError("Too slow to sustain a toroidal planet.");

		const aspectRatio = 1/(0.806*w + 0.991*w*w); // numerically determined formula for aspect ratio
		this.elongation = 1/(1 - 0.929*w + 5.788*w*w); // numerically determined formula for elongation
		if (!Number.isFinite(aspectRatio))
			throw new RangeError("The toroid must be rotating.");
		this.majorRadius = radius/(1 + 1/aspectRatio);
		this.minorRadius = radius/aspectRatio/(1 + 1/aspectRatio);
		this.obliquity = obliquity;
	}

	partition(): {triangles: Vertex[], nodos: Tile[]} {
		const m = 3;
		const n = 4*Math.trunc(m*this.majorRadius/(this.minorRadius*this.elongation));
		const nodos = [];
		for (let i = 0; i < n; i ++) { // construct a chain of points,
			const φ0 = (i%2 === 0) ? 0 : Math.PI/m;
			for (let j = 0; j < m; j ++)
				nodos.push(new Tile(null, {
					φ: localizeInRange(φ0 + 2*Math.PI/m * j, -Math.PI, Math.PI),
					λ: localizeInRange(2*Math.PI/n * i, -Math.PI, Math.PI),
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
					triangles.push(new Vertex(
						nodos[indices[0]], nodos[indices[1]], nodos[indices[2]]));
				}
			}
		}
		// console.log('])');
		return {nodos: nodos, triangles: triangles};
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

	hasSeasons(φ: number): boolean {
		return Math.min(Math.abs(φ), Math.PI - Math.abs(φ)) > this.obliquity && this.insolation(φ) > 0;
	}
	
	windConvergence(φ: number): number {
		return Math.pow(Math.cos(φ), 2) + Math.pow(Math.cos(3*φ), 2);
	}

	windVelocity(φ: number): {north: number, east: number} {
		return {north: 0, east: -Math.cos(φ)};
	}

	φ(point: {r: number, z: number}): number {
		const β = Math.atan2(point.z/this.elongation, point.r - this.majorRadius);
		return Math.atan2(Math.sin(β)/this.elongation, Math.cos(β));
	}

	rz(φ: number): {r: number, z: number} {
		const β = Math.atan2(Math.sin(φ)*this.elongation, Math.cos(φ));
		return {
			r: this.majorRadius + this.minorRadius*Math.cos(β),
			z: this.elongation*this.minorRadius*Math.sin(β)};
	}

	tangent(φ: number): {r: number, z: number} {
		return {r: -Math.sin(φ), z: Math.cos(φ)};
	}

	ds_dφ(φ: number): number {
		const β = Math.atan(Math.tan(φ)*this.elongation);
		const dβ_dφ = this.elongation/(
			Math.pow(Math.cos(φ), 2) +
			Math.pow(this.elongation*Math.sin(φ), 2));
		const ds_dβ = this.minorRadius*
			Math.hypot(Math.sin(β), this.elongation*Math.cos(β));
		return ds_dβ*dβ_dφ;
	}

	distance(a: ΦΛPoint, b: ΦΛPoint): number {
		const rAvg = 2/(1/this.rz(a.φ).r + 1/this.rz(b.φ).r);
		const sToroidal = rAvg * localizeInRange(Math.abs(a.λ - b.λ), -Math.PI, Math.PI);
		const aβ = Math.atan2(this.elongation*Math.sin(a.φ), Math.cos(a.φ));
		const bβ = Math.atan2(this.elongation*Math.sin(b.φ), Math.cos(b.φ));
		const sPoloidal = this.minorRadius*(
			(1 + this.elongation)/2*localizeInRange(aβ - bβ, -Math.PI, Math.PI) -
			(1 - this.elongation)/2*Math.sin(aβ - bβ)*Math.cos(aβ + bβ));
		return Math.hypot(sToroidal, sPoloidal);
	}

	isOnEdge(_: ΦΛPoint): boolean {
		return false;
	}

	maximumCurvature(): number {
		return 1/(this.minorRadius*this.elongation**2);
	}
}
