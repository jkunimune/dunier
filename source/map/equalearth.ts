/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Surface} from "../surface/surface.js";
import {MapProjection} from "./projection.js";
import {linterp} from "../utilities/miscellaneus.js";
import {PathSegment, Place, Point} from "../utilities/coordinates.js";

/**
 * a pseudocylindrical equal-area projection similar to Eckert IV or Natural Earth
 */
export class EqualEarth extends MapProjection {
	private readonly фRef: number[];
	private readonly xRef: number[];
	private readonly yRef: number[];

	constructor(surface: Surface, northUp: boolean, locus: PathSegment[]) {
		super(surface, northUp, locus, null, null, null, null);

		let ds_dλAvg = 0;
		for (let i = 1; i < surface.refLatitudes.length; i ++) // first measure the typical width of the surface
			ds_dλAvg += surface.ds_dλ((surface.refLatitudes[i-1] + surface.refLatitudes[i])/2)*
				(surface.cumulAreas[i] - surface.cumulAreas[i-1])/surface.area;

		this.фRef = surface.refLatitudes;
		this.xRef = [];
		this.yRef = [0];
		for (let i = 0; i < this.фRef.length; i ++) {
			this.xRef.push(this.shapeFunction(surface.ds_dλ(this.фRef[i])/ds_dλAvg)*ds_dλAvg);
			if (i > 0) {
				const verAre = surface.cumulAreas[i] - surface.cumulAreas[i-1];
				this.yRef.push(this.yRef[i-1] - verAre / (2*Math.PI*(this.xRef[i-1] + this.xRef[i])/2));
			}
		}

		let maxX = 0;
		for (const x of this.xRef)
			if (x > maxX)
				maxX = x;
		this.setDimensions(
			-Math.PI*maxX,
			Math.PI*maxX,
			this.yRef[this.yRef.length-1],
			this.yRef[0]);
	}

	projectPoint(point: Place): Point {
		return {
			x: linterp(point.ф, this.фRef, this.xRef)*point.λ,
			y: linterp(point.ф, this.фRef, this.yRef)}; // TODO: use better interpolacion
	}

	projectMeridian(ф0: number, ф1: number, λ: number): PathSegment[] {
		const edge = [];
		let i0, i1;
		if (ф1 > ф0) {
			i0 = Math.floor(
				(ф0 - this.фRef[0])/(this.фRef[this.фRef.length-1] - this.фRef[0])*(this.фRef.length-1)) + 1; // TODO: use bezier curves
			i1 = Math.ceil(
				(ф1 - this.фRef[0])/(this.фRef[this.фRef.length-1] - this.фRef[0])*(this.фRef.length-1));
		}
		else {
			i0 = Math.ceil(
				(ф0 - this.фRef[0])/(this.фRef[this.фRef.length-1] - this.фRef[0])*(this.фRef.length-1)) - 1;
			i1 = Math.floor(
				(ф1 - this.фRef[0])/(this.фRef[this.фRef.length-1] - this.фRef[0])*(this.фRef.length-1));
		}
		for (let i = i0; i !== i1; i += Math.sign(i1 - i0))
			edge.push({type: 'L', args: [λ*this.xRef[i], this.yRef[i]]});
		const {x, y} = this.projectPoint({ф: ф1, λ: λ});
		edge.push({type: 'L', args: [x, y]});
		return edge;
	}

	/**
	 * a function on the domain 0 <= x <= 1 that determines the shape of this equal-area pseudocylindrical map.
	 * f(x) = x would correspond to the sinusoidal projection.  f(0) > 0 corresponds to a pointed-polar projection.
	 * f(1) should = 1 to ensure that the distortion goes down as the surface becomes more cylindrical, not that it
	 * terribly matters since cylinder isn't a map option (maybe it should be... :thinking:)
	 * @param x
	 */
	shapeFunction(x: number): number {
		return 1 - Math.sqrt(.29) + Math.sqrt(.04 + .25*x*x);
	}
}