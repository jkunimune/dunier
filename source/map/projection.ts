/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Domain, Surface} from "../surface/surface.js";
import {
	PathSegment,
	ΦΛPoint,
	XYPoint, assert_φλ
} from "../utilities/coordinates.js";
import {binarySearch, cumulativeIntegral, linterp, localizeInRange} from "../utilities/miscellaneus.js";


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
	public readonly λCenter: number;
	public readonly φMin: number;
	public readonly φMax: number;
	public readonly λMin: number;
	public readonly λMax: number;
	public readonly domain: Domain;

	/**
	 * define a pseudoconic map projection with lookup tables for the y coordinate and x scale along the prime meridian.
	 * @param surface the surface on which points exist before we project them
	 * @param φRef the latitudes at which y and dx/dλ are defined (must be evenly spaced)
	 * @param yRef the y coordinate of the prime meridian at each reference latitude (must all be finite)
	 * @param dx_dλRef the horizontal scale along each reference latitude (equal to the parallel's length divided by 2π)
	 * @param yCenter the center of the parallels if the parallels are concentric arcs, or ±Infinity if the parallels are straight lines
	 * @param λCenter the central meridian
	 */
	private constructor(surface: Surface, φRef: number[], yRef: number[], dx_dλRef: number[], yCenter: number, λCenter: number) {
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
		this.λCenter = λCenter;

		this.φMin = this.φRef[0];
		this.φMax = this.φRef[this.φRef.length - 1];
		this.λMin = this.λCenter - Math.PI;
		this.λMax = this.λCenter + Math.PI;
		this.domain = new Domain(
			this.φMin, this.φMin + 2*Math.PI, this.λMin, this.λMax,
			(point) => this.surface.isOnEdge(assert_φλ(point)));
	}

	/**
	 * transform the given geographic coordinates to Cartesian ones.
	 * @param point the latitude and longitude in radians, in the range [-π, π]
	 * @return the x and y coordinates in km
	 */
	public projectPoint(point: ΦΛPoint): XYPoint {
		if (isFinite(this.yCenter)) {
			const r = this.y(point.φ) - this.yCenter;
			if (r !== 0) {
				const θ = this.dx_dλ(point.φ)*(point.λ - this.λCenter)/r;
				return this.convertPolarToCartesian({r: r, θ: θ});
			}
			else
				return {x: 0, y: this.yCenter};
		}
		else
			return {x: this.dx_dλ(point.φ)*(point.λ - this.λCenter), y: this.y(point.φ)};
	}

	/**
	 * transform the given Cartesian coordinates to geographic ones.
	 * @param point the x and y coordinates in km
	 * @return the latitude and longitude in radians
	 */
	public inverseProjectPoint(point: XYPoint): ΦΛPoint {
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
			const λ = point.x/this.dx_dλ(φ) + this.λCenter;
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
				const θ0 = this.dx_dλ(φ)*(λ0 - this.λCenter)/r;
				const θ1 = this.dx_dλ(φ)*(λ1 - this.λCenter)/r;
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
			i0 = binarySearch(this.φRef, (φi) => φi > φ0);
			i1 = binarySearch(this.φRef, (φi) => φi >= φ1) - 1;
		}
		else {
			i0 = binarySearch(this.φRef, (φi) => φi >= φ0) - 1;
			i1 = binarySearch(this.φRef, (φi) => φi > φ1);
		}
		// add a vertex to the path for every reference latitude between the two endpoints
		for (let i = i0; i !== i1; i += Math.sign(i1 - i0)) {
			const {x, y} = this.projectPoint({φ: this.φRef[i], λ: λ});
			path.push({type: 'L', args: [x, y]}); // TODO: use bezier curves
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
			if (Math.abs(this.yRef[i] - this.yCenter) - this.dx_dλRef[i] > 1e-8*this.surface.rz(this.φRef[i]).r)
				return false;
		return true;
	}

	/**
	 * quantify how nondifferentiable the prime meridian is at this latitude, if at all
	 * @param φ either the maximum latitude of this surface or the minimum latitude, in radians
	 * @return a number near 1 if the prime meridian is smooth at that point,
	 *         a number less than 1 if it's cuspy, and
	 *         a number much less than 1 if this point should theoreticly diverge to infinity
	 *         (in theory it should be negative for divergent conditions but we'll never measure that in practice;
	 *         in practice you'll get maybe .6 for a Mercator pole).
	 */
	differentiability(φ: number): number {
		const Δφ = 5/180*Math.PI;
		// choose three refLatitudes intervals that are near the point
		let φ1, φ2;
		if (φ === this.φMin) {
			φ1 = φ + Δφ;
			φ2 = φ + 2*Δφ;
		}
		else if (φ === this.φMax) {
			φ1 = φ - Δφ;
			φ2 = φ - 2*Δφ;
		}
		else {
			throw Error("this function is only defined at the limits of the map projection.");
		}
		// compare the y difference across a small interval to the y difference across a big interval
		const innerΔy = this.y(φ1) - this.y(φ);
		const outerΔy = this.y(φ2) - this.y(φ);
		const innerΔs = this.surface.ds_dφ((φ + φ1)/2)*Δφ;
		const outerΔs = this.surface.ds_dφ((φ + φ2)/2)*2*Δφ;
		// fit a power law to their ratio
		return Math.log(innerΔy/outerΔy)/Math.log(innerΔs/outerΔs);
	}

	/**
	 * convert an r and θ to Cartesian x and y, where θ is in radians and is defined such that, for positive r,
	 * θ = 0 is maximum y (the bottom of the circle) and increases as you go counterclockwise.  negative r is
	 * permitted and will reverse all points about the origin such that θ = 0 is minimum y (the top of the circle)
	 */
	private convertPolarToCartesian(point: {r: number, θ: number}): XYPoint {
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
	public static equirectangular(surface: Surface, φMin: number, φMax: number, λStd: number): MapProjection {
		const scale = Math.sqrt(surface.area/(2*Math.PI*(φMax - φMin)));
		return new MapProjection(
			surface,
			[φMin, φMax],
			[-scale*φMin, -scale*φMax],
			[scale, scale], Infinity, λStd);
	}

	/**
	 * construct a Bonne projection with a standard parallel in the given range.  if the standard parallel is an equator,
	 * this will resolve to the sinusoidal projection, and if it is a pole, this will resolve to the Stab-Werner projection.
	 * @param surface the surface from which to project
	 * @param φMin the southernmost parallel in radians
	 * @param φStd the standard parallel in radians
	 * @param φMax the northernmost parallel in radians	 * @param λStd the central meridian
	 * @param λStd the central meridian in radians
	 */
	public static bonne(surface: Surface, φMin: number, φStd: number, φMax: number, λStd: number): MapProjection {
		if (!(φStd >= surface.φMin && φStd <= surface.φMax))
			throw new Error(`${φStd} is not a valid standard latitude`);
		const [φRef, yRef] = cumulativeIntegral(
			(x) => -surface.ds_dφ(x), φMin, φMax, 0.2, 0.02, 1e-3); // do the necessary integrals to get the y positions of the prime meridian
		const dx_dλRef = []; // and the arc lengths corresponding to one radian
		for (let i = 0; i < φRef.length; i ++)
			dx_dλRef.push(surface.rz(φRef[i]).r);
		// set the curvature at the standard parallel
		const yStd = linterp(φStd, φRef, yRef);
		let yCenter = yStd + surface.rz(φStd).r/surface.tangent(φStd).r;
		// make sure the center is outside of the map area
		if (yCenter < yRef[0] && yCenter > yRef[yRef.length - 1]) {
			if (yCenter > yRef[Math.floor(yRef.length/2)])
				yCenter = yRef[0];
			else
				yCenter = yRef[yRef.length - 1];
		}
		return new MapProjection(surface, φRef, yRef, dx_dλRef, yCenter, λStd);
	}

	/**
	 * construct an equidistant conic projection with a standard parallel in the given range.  if the standard parallel
	 * is an equator, this will resolve to the equidistant projection, and if it is a pole, this will resolve to the
	 * azimuthal equidistant projection.
	 * @param surface the surface from which to project
	 * @param φMin the southernmost parallel in radians
	 * @param φStd the standard parallel in radians
	 * @param φMax the northernmost parallel in radians	 * @param λStd the central meridian
	 * @param λStd the central meridian in radians
	 */
	public static conformalConic(surface: Surface, φMin: number, φStd: number, φMax: number, λStd: number): MapProjection {
		if (!(φStd >= surface.φMin && φStd <= surface.φMax))
			throw new Error(`${φStd} is not a valid standard latitude`);

		// start by calculating the angular scale
		let n = -surface.tangent(φStd).r;

		// for cylindrical projections, you need to use a different function
		if (Math.abs(n) < 1e-12)
			return this.mercator(surface, φMin, φStd, φMax, λStd);
		// for nearly azimuthal projections, make it azimuthal
		else if (n > 0.75)
			n = 1;
		else if (n < -0.75)
			n = -1;

		// build out from some central parallel to get the log-radii to get the y positions of the prime meridian
		const φMid = (φMin + φMax)/2;
		const [northernΦ, northernLogR] = cumulativeIntegral(
			(φ: number) => -n/surface.rz(φ).r*surface.ds_dφ(φ),
			φMid, φMax, 0.2, 0.02, 1e-3);
		const [southernΦ, southernLogR] = cumulativeIntegral(
			(φ: number) => -n/surface.rz(φ).r*surface.ds_dφ(φ),
			φMid, φMin, 0.2, 0.02, 1e-3);
		// combine the two and exp them to get y positions
		const φ = [];
		const y = [];
		for (let i = southernΦ.length - 1; i > 0; i --) {
			φ.push(southernΦ[i]);
			y.push(Math.min(Math.exp(southernLogR[i]), 1e3)); // limit the radii to finite values
		}
		for (let i = 0; i < northernΦ.length; i ++) {
			φ.push(northernΦ[i]);
			y.push(Math.min(Math.exp(northernLogR[i]), 1e3));
		}

		// figure out what the scale needs to be set to
		const iStd = binarySearch(φ, (φi) => φi > φStd) - 1;
		if (iStd < 0 || iStd + 1 >= φ.length)
			throw new Error("the standard parallel ended up falling outside of the projection bounds so I can't set the scale");
		const currentScale = (y[iStd + 1] - y[iStd])/(φ[iStd + 1] - φ[iStd]);
		const desiredScale = -surface.ds_dφ(φStd);
		const scaleFactor = desiredScale/currentScale;
		// apply the new scale to the y values
		for (let i = 0; i < φ.length; i ++)
			y[i] *= scaleFactor; // limit the radii to finite values

		// then do the arc lengths corresponding to one radian
		const dx_dλRef = [];
		for (let i = 0; i < φ.length; i ++)
			dx_dλRef.push(y[i]*n);

		return new MapProjection(surface, φ, y, dx_dλRef, 0, λStd);
	}

	/**
	 * construct a mercator projection scaled to the given standard parallel.
	 * @param surface the surface from which to project
	 * @param φMin the southernmost parallel in radians
	 * @param φStd the standard parallel in radians
	 * @param φMax the northernmost parallel in radians
	 * @param λStd the central meridian
	 * @param λStd the central meridian in radians
	 */
	public static mercator(surface: Surface, φMin: number, φStd: number, φMax: number, λStd: number): MapProjection {
		const dx_dλ = surface.rz(φStd).r;
		const [northernΦ, northernY] = cumulativeIntegral(
			(φ: number) => -dx_dλ/surface.rz(φ).r*surface.ds_dφ(φ),
			φStd, φMax, 0.2, 0.02, 1e-3);
		const [southernΦ, southernY] = cumulativeIntegral(
			(φ: number) => -dx_dλ/surface.rz(φ).r*surface.ds_dφ(φ),
			φStd, φMin, 0.2, 0.02, 1e-3);
		const φ = [];
		const y = [];
		for (let i = southernΦ.length - 1; i > 0; i --) {
			φ.push(southernΦ[i]);
			y.push(Math.min(southernY[i], dx_dλ*1e3)); // make sure to clip them to finite values
		}
		for (let i = 0; i < northernΦ.length; i ++) {
			φ.push(northernΦ[i]);
			y.push(Math.max(northernY[i], -dx_dλ*1e3));
		}
		return new MapProjection(surface, φ, y, Array(φ.length).fill(dx_dλ), Infinity, λStd);
	}

	/**
	 * construct an Equal Earth projection scaled to best represent the region between the two given parallels.
	 * this is only a true Equal Earth projection when the surface is a sphere and φMin and φMax are ±π/2.  in all
	 * other cases, it's a generalization meant to mimic the spirit of the Equal Earth projection as best as possible,
	 * scaled vertically and horizontally to minimize angular error between the given latitude bounds.
	 * @param surface the surface from which to project
	 * @param meanRadius this parameter sets the horizontal scale of the map projection
	 * @param φMin the southernmost parallel in radians
	 * @param φMax the northernmost parallel in radians
	 * @param λStd the central meridian
	 */
	public static equalEarth(surface: Surface, meanRadius: number, φMin: number, φMax: number, λStd: number): MapProjection {
		if (!(meanRadius > 0))
			throw new Error(`${meanRadius} is not a valid map width`);
		function x(φ: number): number {
			return MapProjection.equalEarthShapeFunction(surface.rz(φ).r/meanRadius)*meanRadius;
		}
		function dy_dφ(φ: number): number {
			return -surface.rz(φ).r*surface.ds_dφ(φ)/x(φ);
		}
		const [φRef, yRef] = cumulativeIntegral(dy_dφ, φMin, φMax, 0.2, 0.02, 1e-3);
		const xRef = [];
		for (let i = 0; i < φRef.length; i ++)
			xRef.push(x(φRef[i]));
		return new MapProjection(surface, φRef, yRef, xRef, Infinity, λStd);
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
