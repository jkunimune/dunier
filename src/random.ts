// random.ts: defines a pseudorandom number generator

/**
 * a simple seedable pseudorandom number generator, capable of drawing from a handful of
 * useful distributions. seed must be an integer.
 */
export class Random {
	private readonly seed: number;
	private value: number;
	private index: number;
	private boxMullerBacklog: number;

	constructor(seed: number) {
		this.seed = seed;
		this.value = seed;
		this.index = 0;
		this.boxMullerBacklog = null;
		for (let i = 0; i < 3; i ++)
			this.next(); // throw out the first few values, which are not random at all
	}

	/**
	 * return a pseudorandom number in [0, 1)
	 */
	next(): number {
		this.value = (this.value * 0x19660D + 0x3C6EF35F) % 0x100000000;
		return this.value / 0x100000000;
	}

	/**
	 * the red ball fraction of this returning true is p.
	 * @param p the probability of returning true
	 */
	probability(p: number): boolean {
		return this.next() < p;
	}

	/**
	 * return a pseudorandom number in [min, max)
	 * @param min inclusive minimum value
	 * @param max exclusive maximum value
	 */
	uniform(min: number, max: number): number {
		return min + (max - min)*this.next();
	}

	/**
	 * return a pseudorandom number drawn from a normal distribution
	 * @param mean the center of the distribution
	 * @param std the scale of the distribution
	 */
	normal(mean: number, std: number): number {
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

	/**
	 * return a pseudorandom number drawn from an exponential distribution
	 * @param mean the scale of the distribution
	 */
	exponential(mean: number): number {
		return mean*Math.log(this.next());
	}

	/**
	 * return a pseudorandom integer between min (inclusive) and max (exclusive)
	 * @param min inclusive minimum value
	 * @param max exclusive maximum value
	 */
	discrete(min: number, max: number): number {
		return Math.trunc(this.uniform(min, max));
	}

	/**
	 * return a new Random based on this one. it will be seeded by a random number
	 * dependent on this.seed, but the values it produces will be pseudoindependent of
	 * the values of this one. this may be useful if one wants to produce multiple static
	 * series of pseudorandom numbers where the lengths of the series are variable.
	 */
	reset(): Random {
		return new Random(this.seed + 1);
	}
}
