/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Tile, Surface, Vertex} from "./surface.js";
import {legendreP2, legendreP4, legendreP6} from "../utilities/miscellaneus.js";
import {Place} from "../utilities/coordinates.js";
import {Vector} from "../utilities/geometry.js";

/**
 * an oblate spheroid (i.e. a normal planet)
 */
export class Spheroid extends Surface {
	protected readonly radius: number;
	private readonly aspectRatio: number;
	readonly flattening: number;
	private readonly eccentricity: number;
	private readonly obliquity: number;

	/**
	 * construct an oblate spheroid
	 * @param radius the radius of the equator in km
	 * @param gravity the surface gravity at the equator in m/s^2
	 * @param omega the rotation rate in radians/s
	 * @param obliquity the axial tilt in radians
	 */
	constructor(radius: number, gravity: number, omega: number, obliquity: number) {
		if (obliquity < 0)
			throw new Error(`the obliquity must be a nonnegative number, not ${obliquity}`);
		super(-Math.PI/2, Math.PI/2, omega > 0);
		this.radius = radius; // keep radius in km
		const w = (radius*1000)*omega*omega/gravity; // this dimensionless parameter determines the aspect ratio
		// this polynomial is based on some fitting done in source/python/simulate_perspective.py, assuming a uniformly dense fluid body.
		// it doesn't quite match the Earth's flattening because the Earth is not uniformly dense.
		this.aspectRatio = 1 + 1.25*w - 0.550*w*w + 7.362*w*w*w;
		if (this.aspectRatio > 4)
			throw new RangeError("Too fast to sustain an ellipsoidal planet.");
		this.flattening = 1 - 1/this.aspectRatio;
		this.eccentricity = Math.sqrt(1 - Math.pow(this.aspectRatio, -2));
		this.obliquity = obliquity;
	}

	partition(): {triangles: Vertex[]; nodos: Tile[]} {
		const b = Math.atan(1/this.aspectRatio);
		const m = Math.trunc(2*Math.PI/Math.hypot(Math.sin(b)/this.aspectRatio, 1 - Math.cos(b)));
		const n = 4;
		const nodos = [];
		for (let i = 1; i < n; i ++) // construct a grid of points,
			for (let j = 0; j < m; j ++)
				nodos.push(new Tile(null, {
					ф: Math.PI*(i/n - .5),
					λ: 2*Math.PI*(j + .5*(i%2))/m,
				}, this));
		const kS = nodos.length; // assign Nodes to the poles,
		nodos.push(new Tile(null, { ф: -Math.PI/2, λ: 0 }, this));
		const kN = nodos.length;
		nodos.push(new Tile(null, { ф: Math.PI/2, λ: 0 }, this));

		const triangles = []; // and strew it all with triangles
		for (let j = 0; j < m; j ++)
			triangles.push(
				new Vertex(nodos[kS], nodos[(j+1)%m], nodos[j]));
		for (let i = 1; i < n-1; i ++) {
			for (let j = 0; j < m; j ++) {
				if (i%2 === 1) {
					triangles.push(new Vertex(
						nodos[(i-1)*m + j],
						nodos[i*m + (j+1)%m],
						nodos[i*m + j]));
					triangles.push(new Vertex(
						nodos[(i-1)*m + j],
						nodos[(i-1)*m + (j+1)%m],
						nodos[i*m + (j+1)%m]));
				}
				else {
					triangles.push(new Vertex(
						nodos[(i-1)*m + j],
						nodos[(i-1)*m + (j+1)%m],
						nodos[i*m + j]));
					triangles.push(new Vertex(
						nodos[(i-1)*m + (j+1)%m],
						nodos[i*m + (j+1)%m],
						nodos[i*m + j]));
				}
			}
		}
		for (let j = 0; j < m; j ++)
			triangles.push(
				new Vertex(nodos[kN], nodos[(n-2)*m + j], nodos[(n-2)*m + (j+1)%m]));
		return {nodos: nodos, triangles: triangles};
	}

	ds_dф(ф: number): number {
		const β = Math.atan(Math.tan(ф)/this.aspectRatio);
		const dβ_dф = this.aspectRatio/(
			Math.pow(Math.sin(ф), 2) +
			Math.pow(this.aspectRatio*Math.cos(ф), 2));
		const ds_dβ = this.radius*
			Math.sqrt(1 - Math.pow(this.eccentricity*Math.cos(β), 2));
		return ds_dβ*dβ_dф;
	}

	ds_dλ(ф: number): number {
		const β = Math.atan(Math.tan(ф)/this.aspectRatio);
		return this.radius*Math.cos(β);
	}

	insolation(ф: number): number {
		return Spheroid.annualInsolationFunction(this.obliquity, ф);
	}

	hasSeasons(ф: number): boolean {
		return Math.abs(ф) > this.obliquity;
	}

	windConvergence(ф: number): number {
		return Math.pow(Math.cos(ф), 2) + Math.pow(Math.cos(3*ф), 2);
	}

	windVelocity(ф: number): {north: number, east: number} {
		return {north: 0, east: Math.cos(ф)}; // realistically this should change direccion, but this formula makes rain shadows more apparent
	}

	xyz(place: Place): Vector {
		const β = Math.atan(Math.tan(place.ф)/this.aspectRatio);
		return new Vector(
			this.radius*Math.cos(β)*Math.sin(place.λ),
			-this.radius*Math.cos(β)*Math.cos(place.λ),
			this.radius*Math.sin(β)/this.aspectRatio);
	}

	фλ(point: Vector): Place {
		const β = Math.atan2(this.aspectRatio*point.z, Math.hypot(point.x, point.y));
		const λ = Math.atan2(point.x, -point.y);
		return {ф: Math.atan(Math.tan(β)*this.aspectRatio), λ: λ};
	}

	normal(place: Place): Vector {
		return new Vector(
			Math.cos(place.ф)*Math.sin(place.λ),
			-Math.cos(place.ф)*Math.cos(place.λ),
			Math.sin(place.ф));
	}

	distance(a: Place, b: Place): number { // TODO: check
		const s = Math.acos(Math.sin(a.ф)*Math.sin(b.ф) +
			Math.cos(a.ф)*Math.cos(b.ф)*Math.cos(a.λ - b.λ));
		const p = (a.ф + b.ф)/2;
		const q = (b.ф - a.ф)/2;
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

	isOnEdge(_: Place): boolean {
		return false;
	}
}


