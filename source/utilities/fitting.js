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
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { Matrix } from "./miscellaneus.js";
import { circumcenter } from "./geometry.js";
/**
 * fit an arc to a set of points using an algorithm inspired by this paper:
 *     Chernov, N., Lesort, C. "Least Squares Fitting of Circles". J Math Imaging Vis 23,
 *     239–252 (2005). https://doi.org/10.1007/s10851-005-0482-8
 * @return {R: the radius of the arc, cx,cy: the coordinates of the center of curvature of
 *          the arc, μx,μy: the coordinates of the center of mass of the arc}
 */
export function circularRegression(points) {
    var e_1, _a, _b, e_2, _c, _d, _e;
    if (points.length <= 1)
        throw new Error("you need more than one point to fit a circle, dingus.");
    else if (points.length === 2)
        throw new Error("I suppose I could fit a line thru these two points, but with the way you've parameterized it, that's not really doable.");
    else if (points.length === 3) {
        var c = circumcenter(points);
        return {
            cx: c.x, cy: c.y,
            R: Math.hypot(points[0].x - c.x, points[0].y - c.y)
        };
    }
    var μx = 0, μy = 0;
    try {
        for (var points_1 = __values(points), points_1_1 = points_1.next(); !points_1_1.done; points_1_1 = points_1.next()) {
            var _f = points_1_1.value, x = _f.x, y = _f.y;
            μx += x;
            μy += y;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (points_1_1 && !points_1_1.done && (_a = points_1.return)) _a.call(points_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    _b = __read([μx / points.length, μy / points.length], 2), μx = _b[0], μy = _b[1];
    var sum = [];
    for (var i = 0; i <= 3; i++)
        sum.push([0, 0, 0, 0]);
    try {
        for (var points_2 = __values(points), points_2_1 = points_2.next(); !points_2_1.done; points_2_1 = points_2.next()) {
            var _g = points_2_1.value, x = _g.x, y = _g.y;
            for (var i = 0; i <= 3; i++)
                for (var j = 0; j <= 3; j++)
                    if (i + j >= 2 && i + j <= 3)
                        sum[i][j] += Math.pow(x - μx, i) * Math.pow(y - μy, j);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (points_2_1 && !points_2_1.done && (_c = points_2.return)) _c.call(points_2);
        }
        finally { if (e_2) throw e_2.error; }
    }
    var _h = __read(solveLinearSystem([[sum[2][0], sum[1][1]], [sum[1][1], sum[0][2]]], [(sum[3][0] + sum[1][2]) / 2, (sum[2][1] + sum[0][3]) / 2]), 2), cx = _h[0], cy = _h[1];
    var R = Math.sqrt((sum[2][0] + sum[0][2]) / points.length + cx * cx + cy * cy);
    _d = __read([cx + μx, cy + μy], 2), cx = _d[0], cy = _d[1];
    // const c = circumcenter([points[0], points[Math.trunc(points.length/2)], points[points.length-1]]);
    // let cx = c.x, cy = c.y;
    // let R = Math.hypot(points[0].x - cx, points[0].y - cy); // 4. TRI initial condition
    var A = 1 / (2 * R); // reparameterize the circle as A*(x^2 + y^2) + B*x + C*y + D = 1
    var B = -2 * A * cx; // where D is defined by 1 = B^2 + C^2 - 4*A*D
    var C = -2 * A * cy;
    _e = __read(fitLevenbergMarquardt(function (point, state) {
        var _a = __read(point, 2), x = _a[0], y = _a[1];
        var _b = __read(state, 3), A = _b[0], B = _b[1], C = _b[2];
        var r2 = x * x + y * y;
        var D = (B * B + C * C - 1) / (4 * A);
        var P = A * r2 + B * x + C * y + D;
        var Q = Math.sqrt(1 + 4 * A * P);
        var d = 2 * P / (1 + Q);
        return [d, r2, D, Q];
    }, function (point, state, args) {
        var _a = __read(point, 2), x = _a[0], y = _a[1];
        var _b = __read(state, 3), A = _b[0], B = _b[1], C = _b[2];
        var _c = __read(args, 4), d = _c[0], r2 = _c[1], D = _c[2], Q = _c[3];
        var partial = 2 * (1 - A * d / Q) / (1 + Q);
        return [
            partial * (r2 - D / A) - d * d / Q,
            partial * (x + B / (2 * A)),
            partial * (y + C / (2 * A))
        ];
    }, points.map(function (point) { return [point.x, point.y]; }), [A, B, C], 1e-8), 3), A = _e[0], B = _e[1], C = _e[2];
    return { R: 1 / (2 * Math.abs(A)), cx: -B / (2 * A), cy: -C / (2 * A) }; // convert the result into more natural parameters
}
/**
 * find a local minimum of the function f(state; points) = Σ dist(point[i], state)^2,
 * using the Levenberg-Marquardt formula as defined in
 *     Shakarji, C. "Least-Square Fitting Algorithms of the NIST Algorithm Testing
 *     System". Journal of Research of the National Institute of Standards and Technology
 *     103, 633–641 (1988). https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=821955
 * @param dist the error of a single point given the state, along with any intermediate
 *             quantities that may be useful.  these will all be passed to grad as args.
 * @param grad the gradient of dist
 * @param points the list of points for which to minimize the errors
 * @param gess the inicial gess for the optimal state
 * @param tolerance the maximum acceptable value of the components of the gradient of the
 *                  sum of squares, normalized by the norm of the errors and the norm of
 *                  the gradients of the individual errors.
 * @return the parameters that minimize the sum of squared distances
 */
export function fitLevenbergMarquardt(dist, grad, points, gess, tolerance) {
    if (tolerance === void 0) { tolerance = 1e-4; }
    var iter = 0;
    var state = gess.slice();
    var λ = 4e-5;
    var args = []; // compute inicial distances
    var lastValue = Infinity, newValue = 0;
    for (var i = 0; i < points.length; i++) {
        args.push(dist(points[i], state)); // the dist funccion mite return other numbers besides the point distance
        newValue += Math.pow(args[i][0], 2);
    }
    while (true) {
        var dists = []; // extract distances
        var grads = []; // compute gradients
        for (var i = 0; i < points.length; i++) {
            dists.push([args[i][0]]);
            grads.push(grad(points[i], state, args[i]));
        }
        if (isConverged(lastValue, newValue, dists, grads, tolerance, tolerance)) // check global convergence
            return state;
        lastValue = newValue;
        var d0 = new Matrix(dists); // convert distances and gradients to matrices
        var J0 = new Matrix(grads);
        var U = J0.trans().times(J0); // and do some linear algebra
        var v = J0.trans().times(d0);
        while (true) {
            var H = U.asArray(); // estimate Hessian
            for (var i = 0; i < state.length; i++)
                H[i][i] += λ * (1 + U.get(i, i));
            var B = new Matrix(H).inverse();
            var x = B.times(v);
            var newState = []; // take step
            for (var i = 0; i < x.n; i++)
                newState.push(state[i] - x.get(i));
            var newArgs = []; // recompute distances
            newValue = 0;
            for (var i = 0; i < points.length; i++) {
                newArgs.push(dist(points[i], newState));
                newValue += Math.pow(newArgs[i][0], 2);
            }
            // console.log(`  ${lastValue} -> ${newValue}`);
            // console.log(x.trans().asArray()[0].toString());
            if (newValue <= lastValue) { // check line search convergence
                state = newState;
                args = newArgs;
                // console.log("exiting line search");
                break;
            }
            λ *= 10; // increment line search parameter
            if (λ > 1e64) // check iterations
                throw new Error("the line search did not converge");
        }
        if (λ > 1e-17)
            λ *= 4e-4; // decrement line search parameter
        iter += 1; // check iterations
        if (iter > 10000)
            throw new Error("the maximum number of iteracions has been reachd");
    }
}
/**
 * check a vector of distances and their jacobian to see if we are clone enuff to the
 * minimum of the sum of squared distances
 * @param lastValue the sum of squared errors from the previous iteration
 * @param nextValue the sum of squared errors from the current iteration
 * @param dists the colum-vector of distances
 * @param grads the matrix where each row is the gradient of one distance
 * @param funcTolerance the minimum worthwhile relative change in the sum of squares
 * @param gradTolerance the maximum allowable absolute value of the cosine of the angle
 *                  between a colum of the jacobian and a residual vector
 */
export function isConverged(lastValue, nextValue, dists, grads, funcTolerance, gradTolerance) {
    if (dists.length !== grads.length)
        throw new Error("these matrix shapes do not match.");
    for (var i = 0; i < dists.length; i++)
        if (dists[i].length !== 1)
            throw new Error("This residual vector has not the rite shape.");
    if ((lastValue - nextValue) / lastValue < funcTolerance) // if the last relative change was smol
        return true; // call it dun
    for (var j = 0; j < grads[0].length; j++) { // for each dimension of the state vector
        var distsSqr = 0;
        var gradDotDist = 0;
        var gradsSqr = 0;
        for (var i = 0; i < grads.length; i++) {
            distsSqr += dists[i][0] * dists[i][0];
            gradDotDist += dists[i][0] * grads[i][j]; // compute the derivative of the sum of squares
            gradsSqr += grads[i][j] * grads[i][j];
        }
        var cosine = gradDotDist / Math.sqrt(distsSqr * gradsSqr); // normalize it
        if (Math.abs(cosine) > gradTolerance) // if just one derivative is nonzero
            return false; // it's not converged
    }
    return true; // if we got thru them all, then you're all g to terminate
}
/**
 * solve for the vector x such that vec = mat*x
 */
export function solveLinearSystem(mat, vec) {
    var A = new Matrix(mat);
    var b = new Matrix([vec]).trans();
    var x = A.inverse().times(b);
    return x.trans().asArray()[0];
}
//# sourceMappingURL=fitting.js.map