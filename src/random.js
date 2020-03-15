// defines a pseudorandom number generator
'use strict';

/**
 * a simple seedable pseudorandom number generator, capable of drawing from a handful of
 * useful distributions. seed must be an integer.
 */
class Random {
	constructor(seed) {
		this.seed = seed;
		this.value = seed;
		this.index = 0;
		this.boxMullerBacklog = null;
		for (let i = 0; i < 3; i ++)
			this.next(); // throw out the first few values, which are not random at all
	}

	next() {
		this.value = (this.value * 0x19660D + 0x3C6EF35F) % 0x100000000;
		return this.value / 0x100000000;
	}

	probability(p) {
		return this.next() < p;
	}

	uniform(min, max) {
		return min + (max - min)*this.next();
	}

	normal(mean, std) {
		if (this.boxMullerBacklog != null) {
			const z0 = this.boxMullerBacklog;
			this.boxMullerBacklog = null;
			return std*z0 + mean;
		}
		const u0 = this.next();
		const u1 = this.next();
		const z0 = Math.sqrt(-2*Math.log(u0))*Math.cos(2*Math.PI*u1);
		const z1 = Math.sqrt(-2*Math.log(u0))*Math.sin(2*Math.PI*u1);
		this.boxMullerBacklog = z0;
		return std*z1 + mean;
	}

	exponential(mean) {
		return mean*Math.log(this.next());
	}

	discrete(min, max) {
		return Math.trunc(this.uniform(min, max));
	}

	/**
	 * return a new Random based on this one. it will be seeded by a random number
	 * dependent on this.seed, but the values it produces will be pseudoindependent of
	 * the values of this one. this may be useful if one wants to produce multiple static
	 * series of pseudorandom numbers where the lengths of the series are variable.
	 */
	reset() {
		return new Random(this.seed + 1);
	}
}
