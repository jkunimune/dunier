/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {MapProjection} from "./projection.js";
import {Surface} from "../surface/surface.js";
import {linterp} from "../utilities/miscellaneus.js";
import {PathSegment, Place, Point} from "../utilities/coordinates.js";

export class Bonne extends MapProjection {
	private readonly EDGE_RESOLUTION = 18; // the number of points per radian
	private readonly yJong: number;
	private readonly фRef: number[];
	private readonly yRef: number[];
	private readonly sRef: number[];
	private readonly фMin: number;
	private readonly фMax: number;
	private readonly λMin: number;
	private readonly λMax: number;

	public constructor(surface: Surface, northUp: boolean, locus: PathSegment[]) {
		super(surface, northUp, locus,
			null, null, null, null, []);

		const focus = MapProjection.standardParallels(locus, this);
		const distance0 = linterp(focus.фStd, surface.refLatitudes, surface.cumulDistances);
		this.yJong = surface.ds_dλ(focus.фStd)/surface.dds_dλdф(focus.фStd);

		this.фRef = surface.refLatitudes; // do the necessary integrals
		this.yRef = []; // to get the y positions of the prime meridian
		this.sRef = []; // and the arc lengths corresponding to one radian
		for (let i = 0; i < this.фRef.length; i ++) {
			this.yRef.push(distance0 - surface.cumulDistances[i]);
			this.sRef.push(surface.ds_dλ(this.фRef[i])); // TODO: try this with something that spans both poles.  I feel like it probably won't work
		}

		const yBottom = this.yVertex(focus.фMin);
		const yTop = this.yVertex(focus.фMax);
		this.фMax = linterp(Math.max(1.4*yTop - 0.4*yBottom, this.yRef[this.yRef.length - 1]),
		                    this.yRef.slice().reverse(), this.фRef.slice().reverse()); // spread the limits out a bit to give a contextual view
		this.фMin = linterp(Math.min(1.4*yBottom - 0.4*yTop, this.yRef[0]),
		                    this.yRef.slice().reverse(), this.фRef.slice().reverse());
		this.λMax = Math.min(Math.PI, focus.λMax + 0.4*(yBottom - yTop)/this.sRadian(focus.фStd));
		this.λMin = -this.λMax;

		this.geoEdges = MapProjection.buildGeoEdges(
			this.фMin, this.фMax, this.λMin, this.λMax); // redo the edges

		let top = this.projectPoint({ф: this.фMax, λ: 0}).y; // then determine the dimensions of this map
		let bottom = this.projectPoint({ф: this.фMin, λ: 0}).y;
		let right = 0;
		for (const ф of surface.refLatitudes.concat(this.фMin, this.фMax)) {
			if (ф >= this.фMin && ф <= this.фMax) {
				const {x, y} = this.projectPoint({ф: ф, λ: this.λMax});
				if (x > right)
					right = x;
				if (y < top)
					top = y;
				if (y > bottom)
					bottom = y;
			}
		}
		for (const ф of [this.фMin, this.фMax]) {
			const r = Math.abs(this.radius(ф));
			if (Math.abs(this.λMax*this.sRadian(ф)) > Math.PI*r/2) {
				if (r > right)
					right = r;
			}
		}
		this.setDimensions(-right, right, top, bottom);
	}

	projectPoint(point: Place): Point {
		const y0 = this.yVertex(point.ф);
		const s1 = this.sRadian(point.ф);
		if (Number.isFinite(this.yJong)) {
			const R = y0 - this.yJong;
			return {
				x: R*Math.sin(s1/R*point.λ),
				y: R*Math.cos(s1/R*point.λ) + this.yJong };
		}
		else
			return {
				x: s1*point.λ,
				y: y0 };
	}

	projectParallel(λ0: number, λ1: number, ф: number): PathSegment[] {
		const {x, y} = this.projectPoint({ф: ф, λ: λ1});
		if (Number.isFinite(this.yJong)) {
			const r = Math.hypot(x, y - this.yJong);
			return [{
				type: 'A',
				args: [
					r, r, 0,
					(this.sRadian(ф)*Math.abs(λ1 - λ0) > Math.PI*r) ? 1 : 0,
					((λ1 > λ0) === (this.yJong > 0)) ? 1 : 0,
					x, y],
			}];
		}
		else {
			return [{
				type: 'L',
				args: [x, y],
			}];
		}
	}

	projectMeridian(ф0: number, ф1: number, λ: number): PathSegment[] {
		const edge: PathSegment[] = [];
		const n = Math.ceil(Math.abs(ф1 - ф0)*this.EDGE_RESOLUTION);
		for (let i = 1; i <= n; i ++) {
			let ф = ф0 + (ф1 - ф0)*i/n;
			if (i === 0) ф = ф0; // do this because of roundoff
			if (i === n) ф = ф1;
			const {x, y} = this.projectPoint({ф: ф, λ: λ});
			edge.push({type: 'L', args: [x, y]});
		}
		const test = this.projectPoint({ф: ф1, λ: λ});
		console.assert(test.x === edge[edge.length-1].args[0] && test.y === edge[edge.length-1].args[1]);
		return edge;
	}


	private sRadian(ф: number): number {
		return linterp(ф, this.фRef, this.sRef); // TODO: use better interpolation
	}

	private yVertex(ф: number): number {
		return linterp(ф, this.фRef, this.yRef);
	}

	private radius(ф: number): number {
		return this.yVertex(ф) - this.yJong;
	}

}
