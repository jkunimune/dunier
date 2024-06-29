/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Tile, Surface, Vertex} from "./surface.js";
import {Vector} from "../utilities/geometry.js";
import {Place} from "../utilities/coordinates.js";

/**
 * a planar planet based on the modern flat earth model, where the sun circles in a horizontal plane above the world,
 * and the oscillating radius of its orbit causes the seasons.
 */
export class Disc extends Surface {
	protected readonly radius: number;
	protected readonly equatorRadius: number;
	protected readonly firmamentHite: number;
	private readonly effectiveObliquity: number;

	/**
	 * construct a flat earth
	 * @param radius the radius of the disc edge in km
	 * @param effectiveObliquity the effective magnitude of the seasons in radians
	 * @param hasDayNightCycle whether there are days (typically true but the subclass makes it false)
	 * @param aspectRatio the ratio of the disc radius to the firmament height
	 */
	constructor(radius: number, effectiveObliquity: number, hasDayNightCycle: boolean, aspectRatio = 4.) {
		super(Math.atan(1/aspectRatio), Math.PI/2, hasDayNightCycle);
		this.radius = radius;
		this.equatorRadius = radius/2;
		this.firmamentHite = radius/aspectRatio;
		this.effectiveObliquity = effectiveObliquity;
	}

	initialize(): void {
		super.initialize();
		// it's really important for Disc that map projections use the correct meridian lengths,
		// so recalculate all these things directly instead of the fairly imprecise integral
		const n = this.refLatitudes.length;
		this.height = this.radius;
		this.area = Math.PI*this.radius*this.radius;
		for (let i = 0; i < n - 1; i ++) {
			const r = this.rz(this.refLatitudes[i]).r;
			this.cumulDistances[i] = this.radius - r;
			this.cumulAreas[i] = this.area - Math.PI*r*r;
		}
		this.cumulDistances[n - 1] = this.height;
		this.cumulAreas[n - 1] = this.area;
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

	insolation(ф: number): number {
		// this polynomial is based on some fitting done in source/python/simulate_perspective.py
		const cos_ψ = Math.cos(2*this.effectiveObliquity);
		const ρ = this.firmamentHite/this.equatorRadius/2/Math.tan(ф);
		return 7.0/(
			(3.865*cos_ψ + 6.877) -
			(44.803*cos_ψ +  1.216)*Math.pow(ρ, 2) +
			(87.595*cos_ψ + 19.836)*Math.pow(ρ, 4) -
			(38.728*cos_ψ -  8.049)*Math.pow(ρ, 6));
	}

	hasSeasons(ф: number): boolean {
		return Math.abs(this.firmamentHite/Math.tan(ф) - this.equatorRadius) > this.effectiveObliquity/(Math.PI/2)*this.equatorRadius;
	}

	windConvergence(ф: number): number {
		return 1.5*(Math.sin(2*ф)**2 + Math.sin(3*ф)**2 - 0.5);
	}

	windVelocity(ф: number): {north: number, east: number} {
		return {north: Math.sin(2*ф), east: 0};
	}

	ф(point: {r: number, z: number}): number {
		return Math.atan(this.firmamentHite/point.r);
	}

	rz(ф: number): {r: number, z: number} {
		if (ф === Math.PI/2)
			return {r: 0, z: 0};
		else
			return {r: this.firmamentHite/Math.tan(ф), z: 0};
	}

	tangent(_: number): {r: number, z: number} {
		return {r: -1, z: 0};
	}

	ds_dф(ф: number): number {
		return this.firmamentHite*Math.pow(Math.sin(ф), -2);
	}

	distance(a: Place, b: Place): number {
		const ar = this.firmamentHite/Math.tan(a.ф);
		const br = this.firmamentHite/Math.tan(b.ф);
		return Math.sqrt(ar*ar + br*br - 2*ar*br*Math.cos(a.λ - b.λ));
	}

	isOnEdge(place: Place): boolean {
		return place.ф === this.фMin;
	}
	
	computeEdgeVertexLocation(tileL: Tile, tileR: Tile): { pos: Vector; coordinates: Place } {
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
