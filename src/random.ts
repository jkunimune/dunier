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
		return -mean*Math.log(this.next());
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
	 * return a pseudorandom number drawn from a Poisson distribution (approximate for means >= 36)
	 * @param mean
	 */
	poisson(mean: number): number {
		if (mean === 0) {
			return 0;
		} else if (mean < 36) {
			const expMean = Math.exp(-mean);
			let u = this.next();
			let k = 0;
			let kFact = 1;
			while (true) {
				const pk = Math.pow(mean, k) * expMean / kFact;
				if (u < pk)
					return k;
				else
					u -= pk;
				k++;
				kFact *= k;
			}
		}
		else {
			return Math.max(0, Math.round(this.normal(mean, Math.sqrt(mean))));
		}
	}

	/**
	 * return a pseudorandom number drawn from a Binomial distribution (approximate for large numbers)
	 * @param num
	 * @param prob
	 */
	binomial(num: number, prob: number): number {
		if (prob === 0) {
			return 0;
		}
		else if (prob === 1) {
			return num;
		}
		else if (num*prob < 36 || num*prob > num - 36) {
			let u = this.next();
			let nCk = 1;
			for (let k = 0; k <= num; k++) {
				const pk = nCk * Math.pow(prob, k) * Math.pow(1 - prob, num - k);
				if (u < pk)
					return k;
				else
					u -= pk;
				nCk *= (num - k) / (k + 1);
			}
			throw `Math is borken: ${num}, ${prob} left ${u}`;
		}
		else {
			return Math.max(0, Math.min(num, Math.round(
				this.normal(num*prob, Math.sqrt(num*prob*(1 - prob))))));
		}
	}

	/**
	 * return a random choice from this list
	 * @param options the elements from which we choose
	 */
	choice(options: any[]): any {
		return options[this.discrete(0, options.length)];
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
