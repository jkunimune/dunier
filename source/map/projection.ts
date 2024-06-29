/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Surface} from "../surface/surface.js";
import {
	PathSegment,
	Place,
	Point
} from "../utilities/coordinates.js";
import {linterp} from "../utilities/miscellaneus.js";


/**
 * a class to manage the plotting of points from a Surface onto a plane.
 * this class generalizes all supported map projections to a lookup-table-based pseudoconic projection.
 * that is, the parallels will always be either parallel straight lines or concentric arcs, the prime meridian will
 * always be a straight vertical line, and scale along any given parallel will always be constant.  the equations
 * governing how parallels are spaced and how scale varies between parallels will be evaluated once when the projection
 * is instantiated and saved as lookup tables, from which they will thence be linearly interpolated.
 */
export class MapProjection {
	public readonly surface: Surface;
	private readonly фRef: number[];
	private readonly yRef: number[];
	private readonly dx_dλRef: number[];
	private readonly yCenter: number;

	/**
	 * define a pseudoconic map projection with lookup tables for the y coordinate and x scale along the prime meridian.
	 * @param surface the surface on which points exist before we project them
	 * @param фRef the latitudes at which y and dx/dλ are defined (must be evenly spaced)
	 * @param yRef the y coordinate of the prime meridian at each reference latitude
	 * @param dx_dλRef the horizontal scale along each reference latitude (equal to the parallel's length divided by 2π)
	 * @param yCenter the center of the parallels if the parallels are concentric arcs, or ±Infinity if the parallels are straight lines
	 */
	private constructor(surface: Surface, фRef: number[], yRef: number[], dx_dλRef: number[], yCenter: number) {
		// check the inputs
		if (фRef.length !== yRef.length || yRef.length !== dx_dλRef.length)
			throw new Error("these inputs' lengths don't match.");
		for (const dx_dλ of dx_dλRef)
			if (dx_dλ < 0)
				throw new Error("these reference parallel lengths must be nonnegative.");
		for (let i = 1; i < фRef.length; i ++) {
			if (фRef[i] <= фRef[i - 1])
				throw new Error("these reference latitudes must be monotonicly increasing.");
			if (yRef[i] >= yRef[i - 1])
				throw new Error("these reference y values must be monotonicly decreasing (going up).");
		}

		this.surface = surface;
		this.фRef = фRef;
		this.yRef = yRef;
		this.dx_dλRef = dx_dλRef;
		this.yCenter = yCenter;
	}

	/**
	 * transform the given parametric coordinates to Cartesian ones.
	 * @param point the latitude and longitude in radians, in the range [-π, π]
	 * @return the x and y coordinates in km
	 */
	public projectPoint(point: Place): Point {
		if (isFinite(this.yCenter)) {
			const r = this.y(point.ф) - this.yCenter;
			if (r !== 0) {
				const θ = this.dx_dλ(point.ф)*point.λ/r;
				return this.convertPolarToCartesian({r: r, θ: θ});
			}
			else
				return {x: 0, y: this.yCenter};
		}
		else
			return {x: this.dx_dλ(point.ф)*point.λ, y: this.y(point.ф)};
	}

	/**
	 * generate some <path> segments to trace a line of constant latitude between two longitudes.
	 * @param ф the relative latitude in radians
	 * @param λ0 the relative starting longitude in the range [-π, π]
	 * @param λ1 the relative ending longitude in the range [-π, π]
	 * @return the Cartesian path in km
	 */
	public projectParallel(λ0: number, λ1: number, ф: number): PathSegment[] {
		if (this.dx_dλ(ф) > 0) {
			if (isFinite(this.yCenter)) {
				const r = this.y(ф) - this.yCenter;
				const θ0 = this.dx_dλ(ф)*λ0/r;
				const θ1 = this.dx_dλ(ф)*λ1/r;
				const {x, y} = this.convertPolarToCartesian({r: r, θ: θ1});
				const sweepFlag = (θ1 > θ0) ? 0 : 1;
				if (Math.abs(θ1 - θ0) <= Math.PI)
					// if the arc is small, just do an arc segment
					return [{type: 'A', args: [Math.abs(r), Math.abs(r), 0, 0, sweepFlag, x, y]}];
				else
					// if the arc is larger than 180°, stop at the prime meridian to improve robustness
					return [
						{type: 'A', args: [Math.abs(r), Math.abs(r), 0, 0, sweepFlag, 0, this.yCenter + r]},
						{type: 'A', args: [Math.abs(r), Math.abs(r), 0, 0, sweepFlag, x, y]},
					];
			}
			else {	// if the parallels are actually strait lines, just draw a strait line
				const {x, y} = this.projectPoint({ф: ф, λ: λ1});
				return [{type: 'L', args: [x, y]}];
			}
		}
		else
			// if this parallels has zero length, don't put anything at all
			return [];
	}

	/**
	 * generate some <path> segments to trace a line of constant longitude between two latitudes.
	 * @param ф0 the relative starting latitude in radians
	 * @param ф1 the relative ending latitude in radians
	 * @param λ the relative longitude in the range [-π, π]
	 * @return the Cartesian path in km
	 */
	public projectMeridian(ф0: number, ф1: number, λ: number): PathSegment[] {
		// bild the path as a sequence of line segments
		const path = [];
		// start by identifying the reference latitude closest to each endpoint
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
		// add a vertex to the path for every reference latitude between the two endpoints
		for (let i = i0; i !== i1; i += Math.sign(i1 - i0)) {
			const {x, y} = this.projectPoint({ф: this.фRef[i], λ: λ});
			path.push({type: 'L', args: [x, y]});
		}
		// then a final vertex for the destination latitude
		const {x, y} = this.projectPoint({ф: ф1, λ: λ});
		path.push({type: 'L', args: [x, y]});
		return path;
	}

	/**
	 * do 180°E and 180°W wrap around and touch each other for all latitudes on this projection?
	 */
	wrapsAround(): boolean {
		if (!isFinite(this.yCenter))
			return false;
		for (let i = 0; i < this.фRef.length; i ++)
			if (Math.abs(this.yRef[i] - this.yCenter) - this.dx_dλRef[i] > 1e-8*this.surface.height)
				return false;
		return true;
	}

	/**
	 * convert an r and θ to Cartesian x and y, where θ is in radians and is defined such that, for positive r,
	 * θ = 0 is maximum y (the bottom of the circle) and increases as you go counterclockwise.  negative r is
	 * permitted and will reverse all points about the origin such that θ = 0 is minimum y (the top of the circle)
	 */
	private convertPolarToCartesian(point: {r: number, θ: number}): Point {
		if (Math.abs(point.θ) === Math.PI)
			return {x: 0, y: -point.r + this.yCenter};
		else
			return {
				x: point.r*Math.sin(point.θ),
				y: point.r*Math.cos(point.θ) + this.yCenter
			};
	}

	/**
	 * calculate the y coordinate of the point on the central meridian with the given latitude
	 * @param ф the latitude in radians
	 * @return the y coordinate in kilometers
	 */
	private y(ф: number): number {
		return linterp(ф, this.фRef, this.yRef); // TODO: use better interpolation
	}

	/**
	 * calculate the one-radian arc length for the parallel at the given latitude.
	 * note that this is <i>not</i> the radius of the arc; it also folds in the angular scale.
	 * @param ф the latitude in radians
	 * @return the scale along the parallel in kilometers per radian
	 */
	private dx_dλ(ф: number): number {
		return linterp(ф, this.фRef, this.dx_dλRef);
	}

	/**
	 * construct a plate carey projection.  this projection will <i>not</i> adjust based on the surface being
	 * projected or the region being focused on; it will always linearly translate latitude to y and longitude to x.
	 */
	public static plateCaree(surface: Surface): MapProjection {
		const scale = Math.sqrt(surface.area/(2*Math.PI*(surface.фMax - surface.фMin)));
		return new MapProjection(
			surface,
			[surface.фMin, surface.фMax],
			[-scale*surface.фMin, -scale*surface.фMax],
			[scale, scale], Infinity);
	}

	/**
	 * construct a Bonne projection with a standard parallel in the given range.  if the standard parallel is an equator,
	 * this will resolve to the sinusoidal projection, and if it is a pole, this will resolve to the Stab-Werner projection.
	 * @param surface the surface from which to project
	 * @param фMin the southernmost latitude to worry about, in radians
	 * @param фMax the northernmost latitude to worry about, in radians
	 */
	public static bonne(surface: Surface, фMin: number, фMax: number): MapProjection {
		const фStd = MapProjection.chooseStandardParallel(фMin, фMax, surface);
		const yStd = -linterp(фStd, surface.refLatitudes, surface.cumulDistances);
		let yCenter = yStd + surface.rz(фStd).r/surface.tangent(фStd).r;
		const фRef = surface.refLatitudes; // do the necessary integrals
		const yRef = []; // to get the y positions of the prime meridian
		const dx_dλRef = []; // and the arc lengths corresponding to one radian
		for (let i = 0; i < фRef.length; i ++) {
			yRef.push(-surface.cumulDistances[i]);
			dx_dλRef.push(surface.rz(фRef[i]).r);
		}
		// make sure the center is outside of the map area
		if (yCenter < yRef[0] && yCenter > yRef[yRef.length - 1]) {
			if (yCenter > yRef[Math.floor(yRef.length/2)])
				yCenter = yRef[0];
			else
				yCenter = yRef[yRef.length - 1];
		}
		return new MapProjection(surface, фRef, yRef, dx_dλRef, yCenter);
	}

	/**
	 * construct an equidistant conic projection with a standard parallel in the given range.  if the standard parallel
	 * is an equator, this will resolve to the equidistant projection, and if it is a pole, this will resolve to the
	 * azimuthal equidistant projection.
	 * @param surface the surface from which to project
	 * @param фMin the southernmost latitude to worry about, in radians
	 * @param фMax the northernmost latitude to worry about, in radians
	 */
	public static conic(surface: Surface, фMin: number, фMax: number): MapProjection {
		const фStd = MapProjection.chooseStandardParallel(фMin, фMax, surface);
		// TODO: use the conformal conic projection instead; this will ensure radius never changes sign for toroidal planets, and will produce the Mercator projection for whole-world maps.
		const yStd = -linterp(фStd, surface.refLatitudes, surface.cumulDistances);
		let yCenter = yStd + surface.rz(фStd).r/surface.tangent(фStd).r;
		const фRef = surface.refLatitudes; // do the necessary integrals
		const yRef = []; // to get the y positions of the prime meridian
		const dx_dλRef = []; // and the arc lengths corresponding to one radian
		for (let i = 0; i < фRef.length; i ++) {
			yRef.push(-surface.cumulDistances[i]);
		}
		// make sure the center is outside of the map area
		if (yCenter < yRef[0] && yCenter > yRef[yRef.length - 1]) {
			if (yCenter > yRef[Math.floor(yRef.length/2)])
				yCenter = yRef[0];
			else
				yCenter = yRef[yRef.length - 1];
		}
		for (let i = 0; i < фRef.length; i ++) {
			if (!isFinite(yCenter)) // cylindrical projection
				dx_dλRef.push(surface.rz(фStd).r);
			else if (Math.abs(yCenter - yRef[0]) < 1e-8*surface.height) // azimuthal projection (south pole)
				dx_dλRef.push(yCenter - yRef[i]);
			else if (Math.abs(yCenter - yRef[yRef.length - 1]) < 1e-8*surface.height) // azimuthal projection (north pole)
				dx_dλRef.push(yRef[i] - yCenter);
			else // generic conic projection
				dx_dλRef.push(surface.rz(фStd).r/(yCenter - yStd)*(yCenter - yRef[i]));
		}
		return new MapProjection(surface, фRef, yRef, dx_dλRef, yCenter);
	}

	/**
	 * identify a parallel that runs thru the center of this region on the Surface
	 */
	private static chooseStandardParallel(фMin: number, фMax: number, surface: Surface): number {
		// first calculate the minimum and maximum latitudes of the region
		const minWeit = 1/Math.sqrt(surface.rz(фMin).r);
		const maxWeit = 1/Math.sqrt(surface.rz(фMax).r);
		if (Number.isFinite(minWeit)) { // choose a standard parallel
			if (Number.isFinite(maxWeit))
				return (фMin*minWeit + фMax*maxWeit)/(minWeit + maxWeit);
			else
				return фMax;
		}
		else {
			if (Number.isFinite(maxWeit))
				return фMin;
			else
				return (фMin + фMax)/2;
		}
	}

	/**
	 * construct an Equal Earth projection scaled to best represent the region between the two given parallels.
	 * this is only a true Equal Earth projection when the surface is a sphere and фMin and фMax are ±π/2.  in all
	 * other cases, it's a generalization meant to mimic the spirit of the Equal Earth projection as best as possible,
	 * scaled vertically and horizontally to minimize angular error between the given latitude bounds.
	 * @param surface the surface from which to project
	 * @param фMin the southernmost latitude to worry about, in radians
	 * @param фMax the northernmost latitude to worry about, in radians
	 */
	public static equalEarth(surface: Surface, фMin: number, фMax: number): MapProjection {
		let ds_dλSum = 0;
		let weitSum = 0;
		for (let i = 0; i <= 16; i ++) { // first measure the typical width of the surface in the latitude bounds
			const ф = фMin + (фMax - фMin)*i/16;
			const weit = 2*Math.PI*surface.rz(ф).r*surface.ds_dф(ф)*(фMax - фMin)/16;
			ds_dλSum += surface.rz(ф).r*weit;
			weitSum += weit;
		}
		const ds_dλAvg = ds_dλSum/weitSum;

		const фRef = surface.refLatitudes;
		const xRef = [];
		const yRef = [0];
		for (let i = 0; i < фRef.length; i ++) { // then set the widths
			xRef.push(MapProjection.equalEarthShapeFunction(surface.rz(фRef[i]).r/ds_dλAvg)*ds_dλAvg);
			if (i > 0) { // and integrate the y values so that everything stays equal-area
				const verAre = surface.cumulAreas[i] - surface.cumulAreas[i-1];
				yRef.push(yRef[i-1] - verAre / (2*Math.PI*(xRef[i-1] + xRef[i])/2));
			}
		}
		return new MapProjection(surface, фRef, yRef, xRef, Infinity);
	}

	/**
	 * a function on the domain 0 <= x <= 1 that determines the shape of this equal-area pseudocylindrical map
	 * by mapping ds/dλ on the globe at a given latitude to dx/dλ on the map at the same latitude.
	 * f(x) = x would correspond to the sinusoidal projection.  f(0) > 0 corresponds to a pole-line projection.
	 * f(1) should = 1 to ensure that the distortion goes down as the surface becomes more cylindrical, not that it
	 * terribly matters since cylinder isn't a map option (maybe it should be... :thinking:)
	 * @param x the normalized radius on the surface (i.e. the real length of the parallel divided by 2π)
	 * @return the normalized horizontal scale on the map (i.e. the mapped length of the parallel divided by 2π)
	 */
	private static equalEarthShapeFunction(x: number): number {
		return 1 - Math.sqrt(.29) + Math.sqrt(.04 + .25*x*x);
	}
}
