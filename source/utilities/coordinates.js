/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
/**
 * extract the endpoint from a segment (i.e. the last two args)
 */
export function endpoint(segment) {
    var args = segment.args;
    return { s: args[args.length - 2], t: args[args.length - 1] };
}
/**
 * rename this point's coordinates from s and t to x and y, so that it can be passed to
 * cartesian-specific functions
 */
export function assert_xy(location) {
    return { x: location.s, y: location.t };
}
/**
 * rename this point's coordinates from x and y to s and t, so that it can be passed to
 * generic functions
 * @param location
 */
export function generic(location) {
    return { s: location.x, t: location.y };
}
/**
 * rename this point's coordinates from s and t to φ and λ, so that it can be passed to
 * geographic functions
 */
export function assert_φλ(location) {
    return { φ: location.s, λ: location.t };
}
//# sourceMappingURL=coordinates.js.map