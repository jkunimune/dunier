var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
// @ts-ignore
import Queue from "./external/tinyqueue.js";
import { trajectoryIntersection, Vector } from "./geometry.js";
/**
 * index of the maximum.
 */
export function argmax(arr) {
    if (arr.length === 0)
        throw new Error("I cannot find the maximum of an empty array");
    var maxIdx = null;
    for (var i = 0; i < arr.length; i++)
        if (maxIdx === null || arr[i] > arr[maxIdx])
            maxIdx = i;
    return maxIdx;
}
/**
 * index of the minimum
 */
export function argmin(arr) {
    if (arr.length === 0)
        throw new Error("I cannot find the minimum of an empty array");
    var maxIdx = null;
    for (var i = 0; i < arr.length; i++)
        if (maxIdx === null || arr[i] < arr[maxIdx])
            maxIdx = i;
    return maxIdx;
}
/**
 * compute the factorial.  Stirling's approximation will be used for n >= 1e6
 */
export function factorial(n) {
    if (n < 1000000) {
        var value = 1;
        for (var i = 1; i <= n; i++)
            value *= i;
        return value;
    }
    else {
        return Math.sqrt(2 * Math.PI * n) * Math.pow((n / Math.E), n);
    }
}
/**
 * second Legendre polynomial.
 */
export function legendreP2(y) {
    return (3 * y * y - 1) / 2;
}
/**
 * second Legendre polynomial.
 */
export function legendreP4(y) {
    return ((35 * y * y - 30) * y * y + 3) / 8;
}
/**
 * second Legendre polynomial.
 */
export function legendreP6(y) {
    return (((231 * y * y - 315) * y * y + 105) * y * y - 5) / 16;
}
export function tanh(x) {
    if (x < -20) // tanh(-∞) = -1
        return -1;
    else if (x > 20) // tanh(+∞) = 1
        return 1;
    else { // tanh(x) = (exp(x) - exp(-x))/(exp(x) + exp(-x))
        var plus = Math.exp(x);
        var minus = Math.exp(-x);
        return (plus - minus) / (plus + minus);
    }
}
export function arctanh(x) {
    return (Math.log(1 + x) - Math.log(1 - x)) / 2.;
}
/**
 * given a function f(x), find the x that most closely solves f(x) = 0; f'(x) > 0.
 * @param funccion the function that should return 0. it must return both the value and the derivative at each point.
 *                 it must transition from negative to positive somewhere in the allowed range, or the result may not
 *                 make sense.  it may be non-monotonic and it may have multiple roots.
 * @param initialGess something that's probably close to the right answer
 * @param leftBound the minimum x to consider.  if the solution seems to be less than leftBound, leftBound will be returned
 * @param rightBound the maximum x to consider.  if the solution seems to be greater than rightBound, rightBound will be returned
 * @param tolerance the absolute allowable value of the funccion
 * @return the value of x that makes the function equal 0
 * @throw Error if too many iterations elapse and it can't find a solution
 */
export function findRoot(funccion, initialGess, leftBound, rightBound, tolerance) {
    if (tolerance <= 0)
        throw new Error("tolerance must be positive, not ".concat(tolerance));
    if (leftBound >= rightBound)
        throw new Error("the left bound must be less than the right bound, but you gave ".concat(leftBound, " and ").concat(rightBound, "."));
    if (initialGess < leftBound || initialGess > rightBound)
        throw new Error("the initial gess ".concat(initialGess, " is not in the feasible range [").concat(leftBound, ", ").concat(rightBound, "]."));
    var knownLeft = -Infinity; // the rightmost point where we know that f(x) < 0
    var knownRight = Infinity; // the leftmost point where we know that f(x) > 0
    var gess = initialGess;
    var numIterations = 0;
    while (true) {
        var _a = funccion(gess), value = _a.value, slope = _a.slope;
        // check the termination condition
        if (Math.abs(value) <= tolerance)
            return gess;
        // update left and right
        else if (value > 0)
            knownRight = gess;
        else
            knownLeft = gess;
        // calculate the step
        var step = -value / slope;
        // if the step is in the wrong direction, set it to an arbitrary amount in the right direction
        if (Math.sign(step) !== -Math.sign(value))
            step = -Math.sign(value) * (rightBound - leftBound) / 4;
        // check if it's trying really hard to step out of bounds
        if (gess === leftBound && step < 0)
            return leftBound;
        else if (gess === rightBound && step > 0)
            return rightBound;
        // take the step
        gess += step;
        // make sure you respect whatever bounds we have already found
        if (step < 0 && gess < 0.8 * knownLeft + 0.2 * knownRight)
            gess = 0.8 * knownLeft + 0.2 * knownRight;
        else if (step > 0 && gess > 0.2 * knownLeft + 0.8 * knownRight)
            gess = 0.2 * knownLeft + 0.8 * knownRight;
        // make sure you respect the provided bounds
        if (gess < leftBound)
            gess = leftBound;
        else if (gess > rightBound)
            gess = rightBound;
        // make sure we don't spend too long here
        numIterations++;
        if (numIterations > 100)
            throw new Error("could not find a root.");
    }
}
/**
 * search a sorted array for the first element that meets some condition
 * @param array the set of values to search, ordered such that all elements that don't
 *              meet the condition come before all elements that do meet the condition
 * @param condition the criterion that will determine which indices are acceptable
 * @return the index of the first element that meets the condition, or the length of
 *         the array if there is no such element.
 */
export function binarySearch(array, condition) {
    if (array.length === 0)
        throw new Error("I cannot search an empty array.");
    var min = -1, max = array.length;
    while (max - min > 1) {
        var mid = Math.trunc((min + max) / 2);
        if (condition(array[mid]))
            max = mid;
        else
            min = mid;
    }
    return max;
}
/**
 * linearly interpolate x from the sorted function X onto the corresponding output Y.
 * if the input is out of the range covered by X, it will return the first or last element of Y, as appropriate.
 */
export function linterp(inVal, inRef, exRef) {
    if (inRef.length !== exRef.length)
        throw new Error("array lengths must match");
    if (inRef[0] > inRef[inRef.length - 1])
        throw new Error("input reference array must be monotonicly increasing, \n\t\t\tbut this one goes from ".concat(inRef[0], " to ").concat(inRef[inRef.length - 1]));
    else if (inVal <= inRef[0])
        return exRef[0];
    else if (inVal >= inRef[inRef.length - 1])
        return exRef[inRef.length - 1];
    else {
        var i = binarySearch(inRef, function (ref) { return ref >= inVal; });
        var rightWeit = (inVal - inRef[i - 1]) / (inRef[i] - inRef[i - 1]);
        var leftWeit = 1 - rightWeit;
        return exRef[i - 1] * leftWeit + exRef[i] * rightWeit;
    }
}
/**
 * this function is the derivative of linterp().
 * it calculates the derivative of a piecewise function using nearest-neibor interpolation.
 */
export function gradient_linterp(inVal, inRef, exRef) {
    if (inVal < inRef[0] || inVal > inRef[inRef.length - 1])
        return 0;
    else {
        var i = binarySearch(inRef, function (ref) { return ref >= inVal; });
        return (exRef[i] - exRef[i - 1]) / (inRef[i] - inRef[i - 1]);
    }
}
/**
 * shift a number by hole multiples of (max - min) to put it in the range [min, max),
 * assuming max > min.
 * @param value the number, which may or may not be in range
 * @param min one end of the range (always inclusive)
 * @param max the other end of the range (only inclusive if you pass inclusive: true)
 * @param inclusive if this is true, it will put it in the range [min, max].
 *                  that is, multiples of the boundary on the high side will return max, not min.
 */
export function localizeInRange(value, min, max, inclusive) {
    if (inclusive === void 0) { inclusive = false; }
    if (max <= min)
        throw new Error("you can't localize into this range because its invalid because ".concat(min, " should be less than ").concat(max, "."));
    if (value > min && value < max)
        return value;
    else if (Math.abs(value - max) % (max - min) < 2 * Number.EPSILON * (max - min)) { // this is to make it resistant to roundoff error
        if (inclusive && value >= max)
            return max;
        else
            return min;
    }
    else
        return value - Math.floor((value - min) / (max - min)) * (max - min);
}
/**
 * is value inside the inclusive interval bounded by a and b.  the order of a and b matters not.
 * @param value the value that may or may not be in the interval
 * @param a the inclusive bound (could be minimum or maximum)
 * @param b the exclusive bound (could be minimum or maximum)
 */
export function isBetween(value, a, b) {
    if (a < b)
        return value >= a && value <= b;
    else
        return value >= b && value <= a;
}
/**
 * find the antiderivative of the given function
 * @param f the function to integrate
 * @param xStart the starting value for the independent variable
 * @param xEnd the value of the independent variable at which to stop
 * @param maxStepSize the initial step size and largest allowable spacing between returned values
 * @param minStepSize the smallest allowable spacing between returned values
 * @param relTolerance the largest permissible estimated error to the slope at any given step
 * @return a set of x values and the value of the antiderivative of f at each of those points.
 *         (the first y value will always be 0)
 */
export function cumulativeIntegral(f, xStart, xEnd, maxStepSize, minStepSize, relTolerance) {
    // first, normalize this problem so that it's going forward (it's a pain to keep track of which direction we're going otherwise)
    if (xEnd < xStart) {
        var _a = __read(cumulativeIntegral(function (x) { return f(-x); }, -xStart, -xEnd, maxStepSize, minStepSize, relTolerance), 2), x = _a[0], y = _a[1];
        return [x.map(function (x) { return -x; }), y.map(function (y) { return -y; })];
    }
    // build up arrays of x and y from xInit
    var xFinalized = [xStart];
    var fxFinalized = [f(xStart)];
    var yFinalized = [0];
    // and keep track of some future x and f(x) values so we don't have to make redundant calls to f
    var xPending = [];
    var fxPending = [];
    while (xFinalized[xFinalized.length - 1] < xEnd) {
        // if there's anything pending
        if (xPending.length > 0) {
            var i = xFinalized.length - 1;
            var j = xPending.length - 1;
            // check the midpoint between this and the next one
            var xMid = (xFinalized[i] + xPending[j]) / 2;
            var fxMid = f(xMid);
            // if the midpoint is roughly where we expect it (or if we don't want to resolve further than this)
            var Δx = xPending[j] - xFinalized[i];
            var relError = 2 / 3 * Math.abs(1 - fxMid / ((fxFinalized[i] + fxPending[j]) / 2)); // this 2/3 is from fitting a parabola thru the points
            if (relError < relTolerance || Δx / 2 < minStepSize) {
                // discard it, take that pending point off the queue, and increment y
                xFinalized.push(xPending.pop());
                fxFinalized.push(fxPending.pop());
                yFinalized.push(yFinalized[i] + (fxFinalized[i] + fxFinalized[i + 1]) / 2 * (xFinalized[i + 1] - xFinalized[i]));
            }
            // if the midpoint reveals unacceptable error
            else {
                // push it to the pending points queue and repeat
                xPending.push(xMid);
                fxPending.push(fxMid);
            }
        }
        // if we haven't looked past where we currently are
        else {
            // step forward
            var xNext = Math.min(xFinalized[xFinalized.length - 1] + maxStepSize, xEnd);
            xPending.push(xNext);
            fxPending.push(f(xNext));
        }
    }
    // return the arrays when you're completely done
    return [xFinalized, yFinalized];
}
/**
 * find the average value of value(), weighted by weight(), over the interval [xStart, xEnd].
 * @param value the function to integrate
 * @param weight the function with which to weight the average
 * @param xStart the starting value for the independent variable
 * @param xEnd the value of the independent variable at which to stop
 * @param maxStepSize the initial step size and largest allowable spacing between returned values
 * @param minStepSize the smallest allowable spacing between returned values
 * @param relTolerance the largest permissible estimated error to the slope at any given step
 */
export function weightedAverage(value, weight, xStart, xEnd, maxStepSize, minStepSize, relTolerance) {
    var numerator = cumulativeIntegral(function (x) { return value(x) * weight(x); }, xStart, xEnd, maxStepSize, minStepSize, relTolerance)[1];
    var denominator = cumulativeIntegral(function (x) { return weight(x); }, xStart, xEnd, maxStepSize, minStepSize, relTolerance)[1];
    return numerator[numerator.length - 1] / denominator[denominator.length - 1];
}
/**
 * combine the two arrays and remove duplicates, assuming the inputs have no duplicates to begin with.
 */
export function union(a, b) {
    var aa = __spreadArray([], __read(a), false);
    var ba = __spreadArray([], __read(b), false);
    return aa.concat(ba.filter(function (e) { return !aa.includes(e); }));
}
/**
 * it's like the built-in filter funccion for arrays, but it works on other iterables.
 */
export function filterSet(set, condition) {
    var e_1, _a;
    var output = new Set();
    try {
        for (var set_1 = __values(set), set_1_1 = set_1.next(); !set_1_1.done; set_1_1 = set_1.next()) {
            var item = set_1_1.value;
            if (condition.call(null, item))
                output.add(item);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (set_1_1 && !set_1_1.done && (_a = set_1.return)) _a.call(set_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return output;
}
/**
 * there will be some overflow here, but I don't mind as I'm only using this for random seeds
 */
export function decodeBase37(string) {
    var totalValue = 0;
    for (var i = 0; i < string.length; i++) {
        var char = string.charCodeAt(i);
        var digit = void 0;
        if (char >= 48 && char < 58)
            digit = char - 48;
        else if (char >= 97 && char < 123)
            digit = char - 97 + 10;
        else if (char === 95)
            digit = 36;
        else
            throw RangeError("base-36 strings must only contain digits, lowercase letters, and underscore, but '".concat(string, "' ") +
                "contains '".concat(string.charAt(i), "'"));
        totalValue = (totalValue * 37 + digit) % 0x10000000000;
    }
    return totalValue;
}
/**
 * convert a path to an SVG path string that can be input to an SVG file
 */
export function pathToString(path) {
    var str = ''; // create the d string
    for (var i = 0; i < path.length; i++) {
        var formattedArgs = path[i].args.map(formatPathArg);
        str += path[i].type + formattedArgs.join(',') + ' ';
    }
    return str.trim();
}
/**
 * format a number with no more than three decimal places and no trailing zeros
 */
function formatPathArg(arg) {
    return arg.toFixed(3).replace(/\.?0*$/, "");
}
/**
 * given a graph, find the longest path from some startpoint node to one of the given endpoint nodes that is shorter
 * than any other path between the same startpoint and endpoint.  so it essentially finds the path from the node
 * furthest from any valid endpoint to the nearest valid endpoint
 * @param nodes the locations of all of the nodes in the plane, and their connections.  each node has a position in the
 *              plane given as x and y and an array of edges.  the index in the array indicates which node the edge
 *              leads to (if there is no edge between two nodes there will be a null in the corresponding index of
 *              each's edges array), and each edge has properties indicating the distance along it and the amount of
 *              "clearance" it has (this is used to filter edges; those with a low clearance will be ignored if
 *              threshold is set high).
 * @param validEndpoints the indices of the possible endpoints
 * @param threshold the minimum clearance of an edge
 * @return list of indices starting with the farthest connected point and stepping through the path to the chosen
 *         endpoint, and the path's total length (the sum of the lengths of the traversed edges)
 */
export function longestShortestPath(nodes, validEndpoints, threshold) {
    var e_2, _a;
    if (threshold === void 0) { threshold = 0; }
    // start by preparing an array that stores, for each node, how we got to it and how long it took
    var nodeInfo = [];
    for (var i_1 = 0; i_1 < nodes.length; i_1++)
        nodeInfo.push({ distance: Infinity, cene: null, lewi: false });
    var queue = new Queue([], function (a, b) { return a.distance - b.distance; });
    try {
        for (var validEndpoints_1 = __values(validEndpoints), validEndpoints_1_1 = validEndpoints_1.next(); !validEndpoints_1_1.done; validEndpoints_1_1 = validEndpoints_1.next()) {
            var end = validEndpoints_1_1.value;
            queue.push({ start: null, end: end, distance: 0 });
        } // populate the queue with the endpoints
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (validEndpoints_1_1 && !validEndpoints_1_1.done && (_a = validEndpoints_1.return)) _a.call(validEndpoints_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    var furthest = null;
    while (!queue.empty()) { // while there are places whither you can go
        var _b = queue.pop(), start = _b.start, end = _b.end, distance = _b.distance; // look for the closest one
        if (!nodeInfo[end].lewi) { // only look at each one once
            for (var next = 0; next < nodes.length; next++) { // add its neighbors to the queue
                if (nodes[end].edges[next] !== null && nodes[end].edges[next].clearance >= threshold) // if they are connected with enough clearance
                    queue.push({ start: end, end: next, distance: distance + nodes[end].edges[next].length });
            }
            nodeInfo[end] = { distance: distance, cene: start, lewi: true }; // mark this as visited
            furthest = end; // and as the furthest yet visited
        }
    }
    var points = [furthest];
    var length = 0;
    var i = furthest; // starting at the furthest point you found,
    while (nodeInfo[i].cene !== null) { // step backwards and record the path
        length += nodes[i].edges[nodeInfo[i].cene].length;
        i = nodeInfo[i].cene;
        points.push(i);
    }
    return { points: points, length: length };
}
/**
 * randomly generate a series of points by fleshing out a given seed path, to form a fractyllic squiggly line.
 * it will start at the given start point, end at the given end point, and will all fall within the envelope
 * formed by the provided bounds polygon.
 * @param initialProfile some points that must be included in the profile.  there must be at least two – the first and
 *                       last ones will form the endpoints of the returned profile
 * @param resolution all segments will be at most this long
 * @param rng the random number generator
 * @param bounds a closed convex polygon that the profile will try not to cross
 * @param alpha a dimensionless parameter that alters how noisy it is (limit is 1 or so)
 */
export function noisyProfile(initialProfile, resolution, rng, bounds, alpha) {
    if (bounds === void 0) { bounds = []; }
    if (alpha === void 0) { alpha = 0.5; }
    if (initialProfile.length < 2)
        throw new Error("this function must be called on an initial path with at least two points (you only gave ".concat(initialProfile.length, ")."));
    var confirmd = [initialProfile[0]]; // the profile, which we will build gradually
    var pending = initialProfile.slice(1).reverse(); // the points that will go in the profile after something else (reversed)
    while (pending.length > 0) {
        var last = confirmd[confirmd.length - 1]; // look at the upcoming segment
        var next = pending[pending.length - 1];
        var distance = Math.hypot(next.x - last.x, next.y - last.y);
        if (distance > resolution) { // if it is too long
            var r0 = new Vector((last.x + next.x) / 2, (last.y + next.y) / 2, 0); // find the point between them
            var axis = new Vector((last.y - next.y) / 2, (next.x - last.x) / 2, 0); // find the axis perpendicular to them
            var min = -Infinity, max = Infinity; // now enforce the bounds
            for (var i = 0; i < bounds.length; i++) {
                var a = bounds[i];
                var b = bounds[(i + 1) % bounds.length];
                var intersect = trajectoryIntersection(r0, axis, a, { x: b.x - a.x, y: b.y - a.y });
                var rX = new Vector(intersect.x, intersect.y, 0);
                var yX = (rX.minus(r0)).dot(axis) / axis.sqr();
                if (yX > 0)
                    max = Math.min(max, yX);
                else
                    min = Math.max(min, yX);
            }
            var y = alpha * arctanh(rng.uniform(tanh(min / alpha), tanh(max / alpha))); // TODO: also prevent self-intersection TODO: is there a more efficient function I can use?
            var nov = { x: r0.x + y * axis.x, y: r0.y + y * axis.y };
            console.assert(Number.isFinite(nov.x), resolution, min, max, tanh(min / alpha), tanh(max / alpha), y, nov);
            pending.push(nov); // and check it
        }
        else { // if it is short enuff
            confirmd.push(pending.pop()); // confirm it
        }
        if (confirmd.length + pending.length > 10000) {
            console.error("it seems like the greebling algorithm has entered an infinite loop somehow.");
            return confirmd.concat(pending.slice().reverse());
        }
    }
    return confirmd;
}
/**
 * an n×m matrix
 */
var Matrix = /** @class */ (function () {
    function Matrix(values) {
        for (var i = 0; i < values.length; i++)
            if (values[i].length !== values[0].length)
                throw RangeError("the rows of a Matrix must all have the same length.");
        this.values = values;
        this.n = values.length;
        this.m = values[0].length;
    }
    Matrix.prototype.times = function (that) {
        if (this.m !== that.n)
            throw RangeError("these matrices don't have compatible sizes.");
        var newValues = [];
        for (var i = 0; i < this.n; i++) {
            newValues.push([]);
            for (var j = 0; j < that.m; j++) {
                newValues[i].push(0);
                for (var k = 0; k < this.m; k++) {
                    newValues[i][j] += this.values[i][k] * that.values[k][j];
                }
            }
        }
        return new Matrix(newValues);
    };
    Matrix.prototype.trans = function () {
        var newValues = [];
        for (var i = 0; i < this.m; i++) {
            newValues.push([]);
            for (var j = 0; j < this.n; j++)
                newValues[i].push(this.values[j][i]);
        }
        return new Matrix(newValues);
    };
    /**
     * ported from https://www.sanfoundry.com/java-program-find-inverse-matrix/
     */
    Matrix.prototype.inverse = function () {
        if (this.n !== this.m)
            throw new Error("the matrix has to be square");
        var n = this.n;
        var a = [];
        for (var i = 0; i < n; i++)
            a.push(this.values[i].slice());
        var x = [];
        var b = [];
        var index = [];
        for (var i = 0; i < n; i++) {
            x.push([]);
            b.push([]);
            for (var j = 0; j < n; j++) {
                x[i].push(0);
                b[i].push((i === j) ? 1 : 0);
            }
            index.push(0);
        }
        // Transform the matrix into an upper triangle
        Matrix.gaussian(a, index);
        // Update the matrix b[i][j] with the ratios stored
        for (var i = 0; i < n - 1; i++)
            for (var j = i + 1; j < n; j++)
                for (var k = 0; k < n; k++)
                    b[index[j]][k] -= a[index[j]][i] * b[index[i]][k];
        // Perform backward substitutions
        for (var i = 0; i < n; i++) {
            x[n - 1][i] = b[index[n - 1]][i] / a[index[n - 1]][n - 1];
            for (var j = n - 2; j >= 0; j--) {
                x[j][i] = b[index[j]][i];
                for (var k = j + 1; k < n; k++) {
                    x[j][i] -= a[index[j]][k] * x[k][i];
                }
                x[j][i] /= a[index[j]][j];
            }
        }
        return new Matrix(x);
    };
    /**
     * Method to carry out the partial-pivoting Gaussian
     * elimination. Here index[] stores pivoting order.
     */
    Matrix.gaussian = function (a, index) {
        var n = index.length;
        var c = [];
        for (var i = 0; i < n; i++)
            c.push(0);
        // Initialize the index
        for (var i = 0; i < n; i++)
            index[i] = i;
        // Find the rescaling factors, one from each row
        for (var i = 0; i < n; i++) {
            var c1 = 0;
            for (var j = 0; j < n; j++) {
                var c0 = Math.abs(a[i][j]);
                if (c0 > c1)
                    c1 = c0;
            }
            c[i] = c1;
        }
        // Search the pivoting element from each column
        var k = 0;
        for (var j = 0; j < n - 1; j++) {
            var pi1 = 0;
            for (var i = j; i < n; i++) {
                var pi0 = Math.abs(a[index[i]][j]);
                pi0 /= c[index[i]];
                if (pi0 > pi1) {
                    pi1 = pi0;
                    k = i;
                }
            }
            // Interchange rows according to the pivoting order
            var itmp = index[j];
            index[j] = index[k];
            index[k] = itmp;
            for (var i = j + 1; i < n; i++) {
                var pj = a[index[i]][j] / a[index[j]][j];
                // Record pivoting ratios below the diagonal
                a[index[i]][j] = pj;
                // Modify other elements accordingly
                for (var l = j + 1; l < n; l++)
                    a[index[i]][l] -= pj * a[index[j]][l];
            }
        }
    };
    Matrix.prototype.asArray = function () {
        var e_3, _a;
        var output = [];
        try {
            for (var _b = __values(this.values), _c = _b.next(); !_c.done; _c = _b.next()) {
                var row = _c.value;
                output.push(row.slice());
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return output;
    };
    Matrix.prototype.get = function (i, j) {
        if (j === void 0) { j = 0; }
        return this.values[i][j];
    };
    return Matrix;
}());
export { Matrix };
//# sourceMappingURL=miscellaneus.js.map