/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

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
	 * return the next pseudorandom integer, in some obscene non-useful range
	 */
	next(): number {
		return this.value = (this.value*0x19660D + 0x3C6EF35F) % 0x100000000;
	}

	/**
	 * return a pseudorandom number in [0, 1)
	 */
	random(): number {
		return this.next()/0x100000000;
	}

	/**
	 * the red ball fraction of this returning true is p.
	 * @param p the probability of returning true
	 */
	probability(p: number): boolean {
		return this.random() < p;
	}

	/**
	 * return a pseudorandom number in [min, max)
	 * @param min inclusive minimum value
	 * @param max exclusive maximum value
	 */
	uniform(min: number, max: number): number {
		return min + (max - min)*this.random();
	}

	/**
	 * return a pseudorandom number drawn from a normal distribution
	 * @param mean the center of the distribution
	 * @param std the scale of the distribution
	 */
	normal(mean: number, std: number): number {
		if (this.boxMullerBacklog !== null) {
			const z0 = this.boxMullerBacklog;
			this.boxMullerBacklog = null;
			return std*z0 + mean;
		}
		const u0 = this.random();
		const u1 = this.random();
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
		return -mean*Math.log(this.random());
	}

	/**
	 * return a pseudorandom number drawn from an erlang distribution (inefficient for large shape)
	 * @param shape the shape parameter
	 * @param mean the scale of the distribution
	 */
	erlang(shape: number, mean: number): number {
		let x = 0;
		for (let i = 0; i < shape; i ++)
			x += this.exponential(mean/shape);
		return x;
	}

	/**
	 * return a pseudorandom integer between min (inclusive) and max (exclusive)
	 * @param min inclusive minimum value
	 * @param max exclusive maximum value
	 */
	discrete(min: number, max: number): number {
		if (max - min < 1)
			throw new RangeError(`you want a random integer in [${min}, ${max})? there are none.`);
		return Math.trunc(this.uniform(min, max));
	}

	/**
	 * return a pseudorandom number drawn from a Binomial distribution (approximates with normal for expectations/
	 * antiexpectations over 36).
	 * @param num
	 * @param prob
	 */
	binomial(num: number, prob: number): number {
		if (num === 0 || prob === 0) {
			return 0;
		}
		else if (prob === 1) {
			return num;
		}
		else if (prob > 0.5) {
			return num - this.binomial(num, 1 - prob);
		}
		else if (num*prob < 36 || num*prob > num - 36) {
			let u = this.random();
			let nCk = 1;
			for (let k = 0; k <= num; k++) {
				const pk = nCk * Math.pow(prob, k) * Math.pow(1 - prob, num - k);
				if (u < pk)
					return k;
				else
					u -= pk;
				nCk *= (num - k) / (k + 1);
			}
			throw new Error(`Math is borken: ${num}, ${prob} left ${u}`);
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
	 * dependent on this.seed, but the values it produces will be pseudo-independent of
	 * the values of this one. this may be useful if one wants to produce multiple static
	 * series of pseudorandom numbers where the lengths of the series are variable.
	 */
	reset(): Random {
		return new Random(this.seed + 1);
	}
}
