/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {MapProjection} from "./projection.js";
import {Surface} from "../surface/surface.js";
import {linterp} from "../utilities/miscellaneus.js";
import {assert_фλ, endpoint, PathSegment, Place, Point} from "../utilities/coordinates.js";

export class Conic extends MapProjection {
	private readonly yJong: number;
	private readonly n: number;

	public constructor(surface: Surface, northUp: boolean, locus: PathSegment[]) {
		super(surface, northUp, locus,
			null, null, null, null);

		const focus = MapProjection.standardParallels(locus, this);
		const y0 = -linterp(focus.фStd, surface.refLatitudes, surface.cumulDistances);
		this.yJong = surface.dAds(focus.фStd)/surface.d2Ads2(focus.фStd) + y0; // TODO: try this with something that spans both poles.  I feel like it probably won't work
		this.n = (Number.isFinite(this.yJong)) ?
			surface.dAds(focus.фStd)/(2*Math.PI*(y0 - this.yJong)) :
			surface.dAds(focus.фStd)/(2*Math.PI); // use that to calculate the angular scale

		let locusTop = Infinity; // then determine the dimensions of this map
		let locusBottom = -Infinity;
		let locusLeft = 0;
		let locusRight = 0;
		for (const segment of this.transformInput(locus)) { // check the extent of the thing we're mapping
			const point = assert_фλ(endpoint(segment));
			const {x, y} = this.projectPoint(point);
			if (y < locusTop)
				locusTop = y;
			if (y > locusBottom)
				locusBottom = y;
			if (x < locusLeft)
				locusLeft = x;
			if (x > locusRight)
				locusRight = x;
		}

		let coneTop = Infinity;
		let coneBottom = -Infinity;
		let coneRight = 0;
		for (const ф of [surface.фMin, surface.фMax]) { // and check the extent of the whole world
			for (const λ of [0, Math.PI/2/this.n, Math.PI]) {
				if (Math.abs(λ) <= Math.PI) {
					const {x, y} = this.projectPoint({ф: ф, λ: λ});
					if (y > coneBottom)
						coneBottom = y;
					if (y < coneTop)
						coneTop = y;
					if (Math.abs(x) > coneRight)
						coneRight = Math.abs(x);
				}
			}
		}

		const top = Math.max(coneTop, 1.4*locusTop - 0.4*locusBottom); // spread the limits out a bit to give a contextual view
		const bottom = Math.min(coneBottom, 1.4*locusBottom - 0.4*locusTop);
		const right = Math.min(coneRight, 0.9*(locusRight - locusLeft));
		this.setDimensions(-right, right, top, bottom);
	}

	projectPoint(point: Place): Point {
		const y0 = -linterp(point.ф, this.surface.refLatitudes, this.surface.cumulDistances);
		if (Number.isFinite(this.yJong)) {
			const R = y0 - this.yJong;
			return {
				x: R*Math.sin(this.n*point.λ),
				y: R*Math.cos(this.n*point.λ) + this.yJong };
		}
		else
			return {
				x: this.n*point.λ,
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
					(Math.abs(this.n*(λ1 - λ0)) > Math.PI) ? 1 : 0,
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
}
