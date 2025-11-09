var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
import { Tile, Surface, Vertex } from "./surface.js";
import { Spheroid } from "./spheroid.js";
import { localizeInRange } from "../../utilities/miscellaneus.js";
/**
 * a toroidal planet
 */
var Toroid = /** @class */ (function (_super) {
    __extends(Toroid, _super);
    /**
     * construct a toroid
     * @param radius the distance from the center to the furthest point (the major radius plus the minor radius) in km
     * @param gravity the surface gravity on the outer equator in m/s^2
     * @param omega the rate at which the planet rotates in radians/s
     * @param obliquity the axial tilt in radians
     */
    function Toroid(radius, gravity, omega, obliquity) {
        var _this = _super.call(this, -Infinity, Infinity, true) || this;
        var w = (radius * 1000) * omega * omega / gravity; // this dimensionless parameter determines the aspect ratio
        if (w > 0.5) // 0.5 corresponds to an aspect ratio of about 1.5
            throw new RangeError("Too fast to sustain a toroidal planet.");
        if (w < 0.15) // 0.15 corresponds to an aspect ratio of about 6.0
            throw new RangeError("Too slow to sustain a toroidal planet.");
        var aspectRatio = 1 / (1.010 * w + 0.618 * w * w); // numerically determined formula for aspect ratio
        _this.elongation = 1 / (1 - 0.204 * w + 4.436 * w * w); // numerically determined formula for elongation
        if (!Number.isFinite(aspectRatio))
            throw new RangeError("The toroid must be rotating.");
        _this.majorRadius = radius / (1 + 1 / aspectRatio);
        _this.minorRadius = radius / aspectRatio / (1 + 1 / aspectRatio);
        _this.obliquity = obliquity;
        return _this;
    }
    Toroid.prototype.partition = function () {
        var e_1, _a;
        var m = 3;
        var n = 4 * Math.trunc(m * this.majorRadius / (this.minorRadius * this.elongation));
        var nodos = [];
        for (var i = 0; i < n; i++) { // construct a chain of points,
            var φ0 = (i % 2 === 0) ? 0 : Math.PI / m;
            for (var j = 0; j < m; j++)
                nodos.push(new Tile(null, {
                    φ: localizeInRange(φ0 + 2 * Math.PI / m * j, -Math.PI, Math.PI),
                    λ: localizeInRange(2 * Math.PI / n * i, -Math.PI, Math.PI),
                }, this));
        }
        // console.log('nodos = np.array([');
        // for (const nodo of nodos)
        // 	console.log(`[${nodo.pos.x}, ${nodo.pos.y}, ${nodo.pos.z}],`);
        // console.log('])');
        // console.log('triangles = np.array([');
        var triangles = []; // and cover it with triangles
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < m; j++) {
                try {
                    for (var _b = (e_1 = void 0, __values([[[0, 0], [2, 0], [1, 0]], [[1, 0], [2, 0], [3, 0]]])), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var coords = _c.value;
                        var indices = [];
                        for (var k = 0; k < 3; k++)
                            indices.push((i + coords[k][0]) % n * m + (j + coords[k][1] + (i % 2) * (coords[k][0]) % 2) % m);
                        // console.log(`[${indices}],`);
                        triangles.push(new Vertex(nodos[indices[0]], nodos[indices[1]], nodos[indices[2]]));
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
        }
        // console.log('])');
        return { nodos: nodos, triangles: triangles };
    };
    Toroid.prototype.insolation = function (φ) {
        var β = Math.atan(Math.tan(φ) * this.elongation);
        var incident = Spheroid.annualInsolationFunction(this.obliquity, φ);
        var opacity;
        if (Math.cos(φ) >= 0)
            opacity = 0;
        else if (this.obliquity === 0)
            opacity = 1;
        else { // I made this formula up myself to fit some actually accurate integrals.  I'm quite proud of it.
            var dz = 2 * this.majorRadius / this.minorRadius * Math.tan(this.obliquity) / this.elongation;
            opacity =
                Math.min(1, Math.min(1, (1 - Math.sin(β)) / dz) * Math.min(1, (1 + Math.sin(β)) / dz) +
                    0.4 * Math.pow(Math.sin(2 * β), 2) / (1 + dz) -
                    0.8 * this.elongation * this.minorRadius / this.majorRadius * Math.pow(Math.cos(φ), 3));
        }
        return incident * (1 - opacity);
    };
    Toroid.prototype.hasSeasons = function (φ) {
        return Math.min(Math.abs(φ), Math.PI - Math.abs(φ)) > this.obliquity && this.insolation(φ) > 0;
    };
    Toroid.prototype.windConvergence = function (φ) {
        return Math.pow(Math.cos(φ), 2) + Math.pow(Math.cos(3 * φ), 2);
    };
    Toroid.prototype.windVelocity = function (φ) {
        return { north: 0, east: -Math.cos(φ) };
    };
    Toroid.prototype.φ = function (point) {
        var β = Math.atan2(point.z / this.elongation, point.r - this.majorRadius);
        return Math.atan2(Math.sin(β) / this.elongation, Math.cos(β));
    };
    Toroid.prototype.rz = function (φ) {
        var β = Math.atan2(Math.sin(φ) * this.elongation, Math.cos(φ));
        return {
            r: this.majorRadius + this.minorRadius * Math.cos(β),
            z: this.elongation * this.minorRadius * Math.sin(β)
        };
    };
    Toroid.prototype.tangent = function (φ) {
        return { r: -Math.sin(φ), z: Math.cos(φ) };
    };
    Toroid.prototype.ds_dφ = function (φ) {
        var β = Math.atan(Math.tan(φ) * this.elongation);
        var dβ_dφ = this.elongation / (Math.pow(Math.cos(φ), 2) +
            Math.pow(this.elongation * Math.sin(φ), 2));
        var ds_dβ = this.minorRadius *
            Math.hypot(Math.sin(β), this.elongation * Math.cos(β));
        return ds_dβ * dβ_dφ;
    };
    Toroid.prototype.distance = function (a, b) {
        var rAvg = 2 / (1 / this.rz(a.φ).r + 1 / this.rz(b.φ).r);
        var sToroidal = rAvg * localizeInRange(Math.abs(a.λ - b.λ), -Math.PI, Math.PI);
        var aβ = Math.atan2(this.elongation * Math.sin(a.φ), Math.cos(a.φ));
        var bβ = Math.atan2(this.elongation * Math.sin(b.φ), Math.cos(b.φ));
        var sPoloidal = this.minorRadius * ((1 + this.elongation) / 2 * localizeInRange(aβ - bβ, -Math.PI, Math.PI) -
            (1 - this.elongation) / 2 * Math.sin(aβ - bβ) * Math.cos(aβ + bβ));
        return Math.hypot(sToroidal, sPoloidal);
    };
    Toroid.prototype.isOnEdge = function (_) {
        return false;
    };
    Toroid.prototype.maximumCurvature = function () {
        return 1 / (this.minorRadius * Math.pow(this.elongation, 2));
    };
    return Toroid;
}(Surface));
export { Toroid };
//# sourceMappingURL=toroid.js.map