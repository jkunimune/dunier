// defines a pseudorandom number generator
'use strict';

/**
 * a simple seedable pseudorandom number generator, capable of drawing from a handful of
 * useful distributions. seed must be an integer.
 */
class Random {
	constructor(seed) {
		this.val = seed + 12345;
		this.index = 0;
		this.boxMullerBacklog = null;
		for (let i = 0; i < 3; i ++)
			this.next(); // throw out the first few values, which are not random at all
	}

	next() {
		this.val = this.val * 1132489760 % 2147483647;
		return (this.val-1) / 2147483646;
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

	discreet(min, max) {
		return Math.trunc(this.uniform(min, max));
	}
}
