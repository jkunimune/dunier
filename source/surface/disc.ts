/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Tile, Surface, Vertex, Edge} from "./surface.js";
import {Vector} from "../utilities/geometry.js";
import {Place} from "../utilities/coordinates.js";

/**
 * a planar planet based on the modern flat earth model, where the sun circles in a horizontal plane above the world,
 * and the oscillating radius of its orbit causes the seasons.
 */
export class Disc extends Surface {
	protected readonly radius: number;
	protected readonly firmamentHite: number;
	private readonly effectiveObliquity: number;

	constructor(radius: number, obliquity: number, hasDayNightCycle: boolean, aspectRatio = 4.) {
		super(Math.atan(1/aspectRatio), Math.PI/2, hasDayNightCycle);
		this.radius = radius;
		this.firmamentHite = radius/aspectRatio;
		this.effectiveObliquity = obliquity;
	}

	partition(): {triangles: Vertex[], nodos: Tile[]} {
		const nodos = [
			new Tile(null, {ф: Math.atan(1/8), λ: 0}, this),
			new Tile(null, {ф: Math.atan(1/8), λ: Math.PI/2}, this),
			new Tile(null, {ф: Math.atan(1/8), λ: Math.PI}, this),
			new Tile(null, {ф: Math.atan(1/8), λ: 3*Math.PI/2}, this),
		];

		const triangles = [
			new Vertex(nodos[0], nodos[1], nodos[2]),
			new Vertex(nodos[2], nodos[3], nodos[0]),
		];

		return {triangles: triangles, nodos: nodos};
	}

	dsdф(ф: number): number {
		return this.firmamentHite*Math.pow(Math.sin(ф), -2);
	}

	dsdλ(ф: number): number {
		return this.firmamentHite/Math.tan(ф);
	}

	insolation(ф: number): number {
		const cosψ = Math.cos(2*this.effectiveObliquity);
		const ρ = this.firmamentHite/this.radius/Math.tan(ф);
		return 7.0/(
			(3.865*cosψ + 6.877) -
			(44.803*cosψ +  1.216)*Math.pow(ρ, 2) +
			(87.595*cosψ + 19.836)*Math.pow(ρ, 4) -
			(38.728*cosψ -  8.049)*Math.pow(ρ, 6));
	}

	windConvergence(ф: number): number {
		return 1.5*(Math.sin(2*ф)**2 + Math.sin(3*ф)**2 - 0.5);
	}

	windVelocity(ф: number): {north: number, east: number} {
		return {north: Math.sin(2*ф), east: 0};
	}

	xyz(place: Place): Vector {
		const r = this.firmamentHite/Math.tan(place.ф);
		return new Vector(r*Math.sin(place.λ), -r*Math.cos(place.λ), 0);
	}

	фλ(point: Vector): Place {
		return {
			ф: Math.atan(this.firmamentHite/Math.hypot(point.x, point.y)),
			λ: Math.atan2(point.x, -point.y)};
	}

	normal(place: Place | Vertex): Vector {
		return new Vector(0, 0, 1);
	}

	distance(a: Place, b: Place): number {
		const ar = this.firmamentHite/Math.tan(a.ф);
		const br = this.firmamentHite/Math.tan(b.ф);
		return Math.sqrt(ar*ar + br*br - 2*ar*br*Math.cos(a.λ - b.λ));
	}

	isOnEdge(place: Place): boolean {
		return place.ф === this.фMin;
	}

	computeEdgeVertexLocation(tileL: Tile, tileR: Tile, edge: Edge): { pos: Vector; coordinates: Place } {
		const x0 = (tileL.pos.x + tileR.pos.x)/2;
		const y0 = (tileL.pos.y + tileR.pos.y)/2;
		const vx = tileL.pos.y - tileR.pos.y;
		const vy = tileR.pos.x - tileL.pos.x;
		const v2 = vx*vx + vy*vy;
		const vDotR = x0*vx + y0*vy;
		const Δr2 = this.radius*this.radius - x0*x0 - y0*y0;
		const t = (-vDotR + Math.sqrt(vDotR*vDotR + v2*Δr2))/v2;
		const x = x0 + vx*t;
		const y = y0 + vy*t;
		const λ = Math.atan2(x, -y);
		return {pos: new Vector(x, y, 0), coordinates: {ф: this.фMin, λ: λ}};
	}
}
