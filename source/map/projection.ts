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
import {linterp, localizeInRange} from "../utilities/miscellaneus.js";


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
	private readonly φRef: number[];
	private readonly yRef: number[];
	private readonly dx_dλRef: number[];
	private readonly yCenter: number;

	/**
	 * define a pseudoconic map projection with lookup tables for the y coordinate and x scale along the prime meridian.
	 * @param surface the surface on which points exist before we project them
	 * @param φRef the latitudes at which y and dx/dλ are defined (must be evenly spaced)
	 * @param yRef the y coordinate of the prime meridian at each reference latitude (must all be finite)
	 * @param dx_dλRef the horizontal scale along each reference latitude (equal to the parallel's length divided by 2π)
	 * @param yCenter the center of the parallels if the parallels are concentric arcs, or ±Infinity if the parallels are straight lines
	 */
	private constructor(surface: Surface, φRef: number[], yRef: number[], dx_dλRef: number[], yCenter: number) {
		// check the inputs
		if (φRef.length !== yRef.length || yRef.length !== dx_dλRef.length)
			throw new Error("these inputs' lengths don't match.");
		for (const y of yRef)
			if (!isFinite(y))
				throw new Error("these reference parallel positions must be finite.");
		for (const dx_dλ of dx_dλRef)
			if (dx_dλ < 0 || !isFinite(dx_dλ))
				throw new Error("these reference parallel lengths must be finite and nonnegative.");
		for (let i = 1; i < φRef.length; i ++) {
			if (φRef[i] <= φRef[i - 1])
				throw new Error("these reference latitudes must be monotonicly increasing.");
			if (yRef[i] >= yRef[i - 1])
				throw new Error("these reference y values must be monotonicly decreasing (going up).");
		}

		this.surface = surface;
		this.φRef = φRef;
		this.yRef = yRef;
		this.dx_dλRef = dx_dλRef;
		this.yCenter = yCenter;
	}

	/**
	 * transform the given geographic coordinates to Cartesian ones.
	 * @param point the latitude and longitude in radians, in the range [-π, π]
	 * @return the x and y coordinates in km
	 */
	public projectPoint(point: Place): Point {
		if (isFinite(this.yCenter)) {
			const r = this.y(point.φ) - this.yCenter;
			if (r !== 0) {
				const θ = this.dx_dλ(point.φ)*point.λ/r;
				return this.convertPolarToCartesian({r: r, θ: θ});
			}
			else
				return {x: 0, y: this.yCenter};
		}
		else
			return {x: this.dx_dλ(point.φ)*point.λ, y: this.y(point.φ)};
	}

	/**
	 * transform the given Cartesian coordinates to geographic ones.
	 * @param point the x and y coordinates in km
	 * @return the latitude and longitude in radians
	 */
	public inverseProjectPoint(point: Point): Place {
		if (isFinite(this.yCenter)) {
			let r = Math.hypot(point.x, point.y - this.yCenter);
			let θ = Math.atan2(point.x, point.y);
			if (r + this.yCenter > this.yRef[0]) { // polar coordinates have this slite degeneracy; set r's sign to whatever works
				r = -r;
				θ = localizeInRange(θ + Math.PI, -Math.PI, Math.PI);
			}
			const φ = this.φ(r + this.yCenter);
			const λ = r*θ/this.dx_dλ(φ);
			return {φ: φ, λ: λ};
		}
		else {
			const φ = this.φ(point.y);
			const λ = point.x/this.dx_dλ(φ);
			return {φ: φ, λ: λ};
		}
	}

	/**
	 * generate some <path> segments to trace a line of constant latitude between two longitudes.
	 * @param φ the relative latitude in radians
	 * @param λ0 the relative starting longitude in the range [-π, π]
	 * @param λ1 the relative ending longitude in the range [-π, π]
	 * @return the Cartesian path in km
	 */
	public projectParallel(λ0: number, λ1: number, φ: number): PathSegment[] {
		if (this.dx_dλ(φ) > 0) {
			if (isFinite(this.yCenter)) {
				const r = this.y(φ) - this.yCenter;
				const θ0 = this.dx_dλ(φ)*λ0/r;
				const θ1 = this.dx_dλ(φ)*λ1/r;
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
				const {x, y} = this.projectPoint({φ: φ, λ: λ1});
				return [{type: 'L', args: [x, y]}];
			}
		}
		else
			// if this parallels has zero length, don't put anything at all
			return [];
	}

	/**
	 * generate some <path> segments to trace a line of constant longitude between two latitudes.
	 * @param φ0 the relative starting latitude in radians
	 * @param φ1 the relative ending latitude in radians
	 * @param λ the relative longitude in the range [-π, π]
	 * @return the Cartesian path in km
	 */
	public projectMeridian(φ0: number, φ1: number, λ: number): PathSegment[] {
		// bild the path as a sequence of line segments
		const path = [];
		// start by identifying the reference latitude closest to each endpoint
		let i0, i1;
		if (φ1 > φ0) {
			i0 = Math.floor(
				(φ0 - this.φRef[0])/(this.φRef[this.φRef.length-1] - this.φRef[0])*(this.φRef.length-1)) + 1; // TODO: use bezier curves
			i1 = Math.ceil(
				(φ1 - this.φRef[0])/(this.φRef[this.φRef.length-1] - this.φRef[0])*(this.φRef.length-1));
		}
		else {
			i0 = Math.ceil(
				(φ0 - this.φRef[0])/(this.φRef[this.φRef.length-1] - this.φRef[0])*(this.φRef.length-1)) - 1;
			i1 = Math.floor(
				(φ1 - this.φRef[0])/(this.φRef[this.φRef.length-1] - this.φRef[0])*(this.φRef.length-1));
		}
		// add a vertex to the path for every reference latitude between the two endpoints
		for (let i = i0; i !== i1; i += Math.sign(i1 - i0)) {
			const {x, y} = this.projectPoint({φ: this.φRef[i], λ: λ});
			path.push({type: 'L', args: [x, y]});
		}
		// then a final vertex for the destination latitude
		const {x, y} = this.projectPoint({φ: φ1, λ: λ});
		path.push({type: 'L', args: [x, y]});
		return path;
	}

	/**
	 * do 180°E and 180°W wrap around and touch each other for all latitudes on this projection?
	 */
	wrapsAround(): boolean {
		if (!isFinite(this.yCenter))
			return false;
		for (let i = 0; i < this.φRef.length; i ++)
			if (Math.abs(this.yRef[i] - this.yCenter) - this.dx_dλRef[i] > 1e-8*this.surface.height)
				return false;
		return true;
	}

	/**
	 * quantify how nondifferentiable the prime meridian is at this latitude, if at all
	 * @param φ the latitude at which to check, in radians
	 * @return a number near 1 if the prime meridian is smooth at that point,
	 *         a number less than 1 if it's cuspy, and
	 *         a number much less than 1 if this point should theoreticly diverge to infinity
	 *         (in practice it doesn't get very low for asymptotes; maybe .6 for a Mercator pole).
	 */
	differentiability(φ: number): number {
		const n = this.surface.refLatitudes.length;
		const i = Math.min(Math.floor((φ - this.surface.φMin)/(this.surface.φMax - this.surface.φMin)*(n - 1)), n - 2);
		// choose three refLatitudes intervals that are near the point
		let iMin, iMax;
		if (i < 2) {
			iMin = 0;
			iMax = 5;
		}
		else if (i >= n - 2) {
			iMin = n - 6;
			iMax = n - 1;
		}
		else {
			iMin = i - 2;
			iMax = i + 3;
		}
		// compare the y difference across one of them to the y difference across all of them
		const innerΔy = this.y(this.surface.refLatitudes[i + 1]) - this.y(this.surface.refLatitudes[i]);
		const outerΔy = this.y(this.surface.refLatitudes[iMax]) - this.y(this.surface.refLatitudes[iMin]);
		const innerΔs = this.surface.cumulDistances[i + 1] - this.surface.cumulDistances[i];
		const outerΔs = this.surface.cumulDistances[iMax] - this.surface.cumulDistances[iMin];
		// fit a power law to their ratio
		return Math.log(outerΔy/innerΔy)/Math.log(outerΔs/innerΔs);
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
	 * @param φ the latitude in radians
	 * @return the y coordinate in kilometers
	 */
	private y(φ: number): number {
		return linterp(φ, this.φRef, this.yRef); // TODO: use better interpolation
	}

	/**
	 * calculate the latitude of the point on the central meridian at the given latitude
	 * @param y the y coordinate in kilometers
	 * @return the latitude in radians
	 * @param y
	 * @private
	 */
	private φ(y: number): number {
		return linterp(y, this.yRef.slice().reverse(), this.φRef.slice().reverse());
	}

	/**
	 * calculate the one-radian arc length for the parallel at the given latitude.
	 * note that this is <i>not</i> the radius of the arc; it also folds in the angular scale.
	 * @param φ the latitude in radians
	 * @return the scale along the parallel in kilometers per radian
	 */
	private dx_dλ(φ: number): number {
		return linterp(φ, this.φRef, this.dx_dλRef);
	}

	/**
	 * construct a plate carey projection.  this projection will <i>not</i> adjust based on the surface being
	 * projected or the region being focused on; it will always linearly translate latitude to y and longitude to x.
	 */
	public static equirectangular(surface: Surface): MapProjection {
		const scale = Math.sqrt(surface.area/(2*Math.PI*(surface.φMax - surface.φMin)));
		return new MapProjection(
			surface,
			[surface.φMin, surface.φMax],
			[-scale*surface.φMin, -scale*surface.φMax],
			[scale, scale], Infinity);
	}

	/**
	 * construct a Bonne projection with a standard parallel in the given range.  if the standard parallel is an equator,
	 * this will resolve to the sinusoidal projection, and if it is a pole, this will resolve to the Stab-Werner projection.
	 * @param surface the surface from which to project
	 * @param φStd the latitude to use to set the curvature, in radians
	 */
	public static bonne(surface: Surface, φStd: number): MapProjection {
		if (!(φStd >= surface.φMin && φStd <= surface.φMax))
			throw new Error(`${φStd} is not a valid standard latitude`);
		const yStd = -linterp(φStd, surface.refLatitudes, surface.cumulDistances);
		let yCenter = yStd + surface.rz(φStd).r/surface.tangent(φStd).r;
		const φRef = surface.refLatitudes; // do the necessary integrals
		const yRef = []; // to get the y positions of the prime meridian
		const dx_dλRef = []; // and the arc lengths corresponding to one radian
		for (let i = 0; i < φRef.length; i ++) {
			yRef.push(-surface.cumulDistances[i]);
			dx_dλRef.push(surface.rz(φRef[i]).r);
		}
		// make sure the center is outside of the map area
		if (yCenter < yRef[0] && yCenter > yRef[yRef.length - 1]) {
			if (yCenter > yRef[Math.floor(yRef.length/2)])
				yCenter = yRef[0];
			else
				yCenter = yRef[yRef.length - 1];
		}
		return new MapProjection(surface, φRef, yRef, dx_dλRef, yCenter);
	}

	/**
	 * construct an equidistant conic projection with a standard parallel in the given range.  if the standard parallel
	 * is an equator, this will resolve to the equidistant projection, and if it is a pole, this will resolve to the
	 * azimuthal equidistant projection.
	 * @param surface the surface from which to project
	 * @param φStd the latitude to use to set the curvature, in radians
	 */
	public static conformalConic(surface: Surface, φStd: number): MapProjection {
		if (!(φStd >= surface.φMin && φStd <= surface.φMax))
			throw new Error(`${φStd} is not a valid standard latitude`);

		// start by calculating the angular scale
		let n = -surface.tangent(φStd).r;

		// for cylindrical projections, you need to use a different function
		if (Math.abs(n) < 1e-12)
			return this.mercator(surface, φStd);
		// for nearly azimuthal projections, make it azimuthal
		else if (n > 0.75)
			n = 1;
		else if (n < -0.75)
			n = -1;

		// build out from the standard parallel to get the radii
		const φ = surface.refLatitudes;
		const iStart = Math.round((φStd - φ[0])/(φ[1] - φ[0]));
		const fillingOrder = [];
		for (let i = iStart; i < φ.length; i ++)
			fillingOrder.push(i);
		for (let i = iStart - 1; i >= 0; i --)
			fillingOrder.push(i);

		// for each y you need to calculate
		const y = Array(φ.length).fill(null);
		for (const i of fillingOrder) {
			let iPrevius; // find a nearby reference off which to base it
			if (i - 1 >= 0 && y[i - 1] !== null)
				iPrevius = i - 1;
			else if (i + 1 < y.length && y[i + 1] !== null)
				iPrevius = i + 1;
			else {
				y[i] = surface.rz(φ[i]).r/n; // or initialize the first one you find like so
				continue;
			}
			const rPrevius = surface.rz(φ[iPrevius]).r;
			const yPrevius = y[iPrevius];
			const r = surface.rz(φ[i]).r;
			const Δr = r - rPrevius;
			const Δs = surface.cumulDistances[i] - surface.cumulDistances[iPrevius];
			// be careful because there are many edge cases for which we must account
			if (Δs === 0) // in the case where this parallel is zero distance away from the previus one
				y[i] = yPrevius; // then obviusly their y values should be equal
			else if (rPrevius === 0) // in the case where the previus one was a pole
				y[i] = r/n; // we get to choose the scale and should choose it with this formula
			else if (r === 0 && n*Δs < 0) // if this is a pole that should technicly go to infinity
				y[i] = yPrevius*Math.exp(n*Δs/Δr); // fix the base at exp(-1) to truncate it at finity
			else if (Δr === 0) // in the case where the surface is exactly cylindrical
				y[i] = yPrevius*Math.exp(-n*Δs/rPrevius); // the exact solution resolves to an exponential
			else
				y[i] = yPrevius*Math.pow(r/rPrevius, -n*Δs/Δr); // otherwise use the full exact solution
		}

		// then do the arc lengths corresponding to one radian
		const dx_dλRef = [];
		for (let i = 0; i < φ.length; i ++)
			dx_dλRef.push(y[i]*n);

		return new MapProjection(surface, φ, y, dx_dλRef, 0);
	}

	/**
	 * construct a mercator projection scaled to the given standard parallel.
	 * @param surface the surface from which to project
	 * @param φStd the standard parallel in radians
	 */
	public static mercator(surface: Surface, φStd: number): MapProjection {
		const dx_dλ = surface.rz(φStd).r;
		const φ: number[] = surface.refLatitudes;
		const r: number[] = [];
		const y: number[] = [];
		// do this integral to get the parallel position lookup table
		for (let i = 0; i < φ.length; i ++) {
			r.push(surface.rz(φ[i]).r);
			const Δs = surface.cumulDistances[i] - surface.cumulDistances[i - 1];
			if (i === 0) // for the southernmost parallel
				y[i] = 0; // just initialize it at y = 0
			else if (r[i] === 0 || r[i - 1] === 0) // for poles, rather than going to Infinity as would be technically correct
				y[i] = y[i - 1] - dx_dλ*Δs/Math.abs(r[i] - r[i - 1]); // remove the log term to get something squareish
			else
				y[i] = y[i - 1] - dx_dλ*Δs/(r[i] - r[i - 1])*Math.log(r[i]/r[i - 1]); // otherwise use the exact solution
		}
		return new MapProjection(surface, φ, y, Array(φ.length).fill(dx_dλ), Infinity);
	}

	/**
	 * construct an Equal Earth projection scaled to best represent the region between the two given parallels.
	 * this is only a true Equal Earth projection when the surface is a sphere and φMin and φMax are ±π/2.  in all
	 * other cases, it's a generalization meant to mimic the spirit of the Equal Earth projection as best as possible,
	 * scaled vertically and horizontally to minimize angular error between the given latitude bounds.
	 * @param surface the surface from which to project
	 * @param meanRadius the
	 */
	public static equalEarth(surface: Surface, meanRadius: number): MapProjection {
		if (!(meanRadius > 0))
			throw new Error(`${meanRadius} is not a valid map width`);
		const φRef = surface.refLatitudes;
		const xRef = [];
		const yRef = [0];
		for (let i = 0; i < φRef.length; i ++) { // then set the widths
			xRef.push(MapProjection.equalEarthShapeFunction(surface.rz(φRef[i]).r/meanRadius)*meanRadius);
			if (i > 0) { // and integrate the y values so that everything stays equal-area
				const verAre = surface.cumulAreas[i] - surface.cumulAreas[i-1];
				yRef.push(yRef[i-1] - verAre / (2*Math.PI*(xRef[i-1] + xRef[i])/2));
			}
		}
		return new MapProjection(surface, φRef, yRef, xRef, Infinity);
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
