/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
/**
 * a simple seedable pseudorandom number generator, capable of drawing from a handful of
 * useful distributions. seed must be an integer.
 */
var Random = /** @class */ (function () {
    function Random(seed) {
        this.seed = seed;
        this.value = seed;
        this.boxMullerBacklog = null;
        for (var i = 0; i < 3; i++)
            this.next(); // throw out the first few values, which are not random at all
    }
    /**
     * return the next pseudorandom integer, in some obscene non-useful range
     */
    Random.prototype.next = function () {
        return this.value = (this.value * 0x19660D + 0x3C6EF35F) % 0x100000000;
    };
    /**
     * return a pseudorandom number in [0, 1)
     */
    Random.prototype.random = function () {
        return this.next() / 0x100000000;
    };
    /**
     * the red ball fraction of this returning true is p.
     * @param p the probability of returning true
     */
    Random.prototype.probability = function (p) {
        return this.random() < p;
    };
    /**
     * return a pseudorandom number in [min, max)
     * @param min inclusive minimum value
     * @param max exclusive maximum value
     */
    Random.prototype.uniform = function (min, max) {
        return min + (max - min) * this.random();
    };
    /**
     * return a pseudorandom number drawn from a normal distribution
     * @param mean the center of the distribution
     * @param std the scale of the distribution
     */
    Random.prototype.normal = function (mean, std) {
        if (this.boxMullerBacklog !== null) {
            var z0_1 = this.boxMullerBacklog;
            this.boxMullerBacklog = null;
            return std * z0_1 + mean;
        }
        var u0 = this.random();
        var u1 = this.random();
        var z0 = Math.sqrt(-2 * Math.log(u0)) * Math.cos(2 * Math.PI * u1);
        var z1 = Math.sqrt(-2 * Math.log(u0)) * Math.sin(2 * Math.PI * u1);
        this.boxMullerBacklog = z0;
        return std * z1 + mean;
    };
    /**
     * return a pseudorandom number drawn from an exponential distribution
     * @param mean the scale of the distribution
     */
    Random.prototype.exponential = function (mean) {
        return -mean * Math.log(this.random());
    };
    /**
     * return a pseudorandom number drawn from an erlang distribution (inefficient for large shape)
     * @param shape the shape parameter
     * @param mean the scale of the distribution
     */
    Random.prototype.erlang = function (shape, mean) {
        var x = 0;
        for (var i = 0; i < shape; i++)
            x += this.exponential(mean / shape);
        return x;
    };
    /**
     * return a pseudorandom integer between min (inclusive) and max (exclusive)
     * @param min inclusive minimum value
     * @param max exclusive maximum value
     */
    Random.prototype.discrete = function (min, max) {
        if (max - min < 1)
            throw new RangeError("you want a random integer in [".concat(min, ", ").concat(max, ")? there are none."));
        return Math.trunc(this.uniform(min, max));
    };
    /**
     * return a pseudorandom number drawn from a Binomial distribution (approximates with normal for expectations/
     * antiexpectations over 36).
     */
    Random.prototype.binomial = function (num, prob) {
        if (num === 0 || prob === 0) {
            return 0;
        }
        else if (prob === 1) {
            return num;
        }
        else if (prob > 0.5) {
            return num - this.binomial(num, 1 - prob);
        }
        else if (num * prob < 36 || num * prob > num - 36) {
            var u = this.random();
            var nCk = 1;
            for (var k = 0; k <= num; k++) {
                var pk = nCk * Math.pow(prob, k) * Math.pow(1 - prob, num - k);
                if (u < pk)
                    return k;
                else
                    u -= pk;
                nCk *= (num - k) / (k + 1);
            }
            throw new Error("Math is borken: ".concat(num, ", ").concat(prob, " left ").concat(u));
        }
        else {
            return Math.max(0, Math.min(num, Math.round(this.normal(num * prob, Math.sqrt(num * prob * (1 - prob))))));
        }
    };
    /**
     * return a random choice from this list
     * @param options the elements from which we choose
     */
    Random.prototype.choice = function (options) {
        return options[this.discrete(0, options.length)];
    };
    /**
     * randomly shuffle an array in-place using the "forward" version of the Fisher–Yates algorithm
     * https://possiblywrong.wordpress.com/2020/12/10/the-fisher-yates-shuffle-is-backward/
     */
    Random.prototype.shuffle = function (array) {
        for (var i = 0; i < array.length; i++) {
            var j = Math.floor(this.uniform(0, i + 1));
            var a = array[i];
            var b = array[j];
            array[j] = a;
            array[i] = b;
        }
    };
    /**
     * return a new Random based on this one. it will be seeded by a random number
     * dependent on this.seed, but the values it produces will be pseudo-independent of
     * the values of this one. this may be useful if one wants to produce multiple static
     * series of pseudorandom numbers where the lengths of the series are variable.
     */
    Random.prototype.reset = function () {
        return new Random(this.seed + 1);
    };
    return Random;
}());
export { Random };
//# sourceMappingURL=random.js.map