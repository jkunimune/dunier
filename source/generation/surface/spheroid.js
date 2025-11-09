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
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { Tile, Surface, Vertex } from "./surface.js";
import { legendreP2, legendreP4, legendreP6 } from "../../utilities/miscellaneus.js";
/**
 * an oblate spheroid (i.e. a normal planet)
 */
var Spheroid = /** @class */ (function (_super) {
    __extends(Spheroid, _super);
    /**
     * construct an oblate spheroid
     * @param radius the radius of the equator in km
     * @param gravity the surface gravity at the equator in m/s^2
     * @param omega the rotation rate in radians/s
     * @param obliquity the axial tilt in radians
     */
    function Spheroid(radius, gravity, omega, obliquity) {
        var _this = this;
        if (obliquity < 0)
            throw new Error("the obliquity must be a nonnegative number, not ".concat(obliquity));
        _this = _super.call(this, -Math.PI / 2, Math.PI / 2, omega > 0) || this;
        _this.radius = radius; // keep radius in km
        var w = (radius * 1000) * omega * omega / gravity; // this dimensionless parameter determines the aspect ratio
        if (w > 0.5) // 0.5 corresponds to an aspect ratio of about 2.4
            throw new RangeError("Too fast to sustain an ellipsoidal planet.");
        // this polynomial is based on some fitting done in source/python/simulate_perspective.py, assuming a uniformly dense fluid body.
        // it doesn't quite match the Earth's flattening because the Earth is not uniformly dense.
        _this.aspectRatio = 1 + 1.25 * w - 0.550 * w * w + 7.362 * w * w * w;
        _this.flattening = 1 - 1 / _this.aspectRatio;
        _this.eccentricity = Math.sqrt(1 - Math.pow(_this.aspectRatio, -2));
        _this.obliquity = obliquity;
        return _this;
    }
    Spheroid.prototype.partition = function () {
        var b = Math.atan(1 / this.aspectRatio);
        var m = Math.trunc(2 * Math.PI / Math.hypot(Math.sin(b) / this.aspectRatio, 1 - Math.cos(b)));
        var n = 4;
        var nodos = [];
        for (var i = 1; i < n; i++) // construct a grid of points,
            for (var j = 0; j < m; j++)
                nodos.push(new Tile(null, {
                    φ: Math.PI * (i / n - .5),
                    λ: 2 * Math.PI * (j + .5 * (i % 2)) / m,
                }, this));
        var kS = nodos.length; // assign Nodes to the poles,
        nodos.push(new Tile(null, { φ: -Math.PI / 2, λ: 0 }, this));
        var kN = nodos.length;
        nodos.push(new Tile(null, { φ: Math.PI / 2, λ: 0 }, this));
        var triangles = []; // and strew it all with triangles
        for (var j = 0; j < m; j++)
            triangles.push(new Vertex(nodos[kS], nodos[(j + 1) % m], nodos[j]));
        for (var i = 1; i < n - 1; i++) {
            for (var j = 0; j < m; j++) {
                if (i % 2 === 1) {
                    triangles.push(new Vertex(nodos[(i - 1) * m + j], nodos[i * m + (j + 1) % m], nodos[i * m + j]));
                    triangles.push(new Vertex(nodos[(i - 1) * m + j], nodos[(i - 1) * m + (j + 1) % m], nodos[i * m + (j + 1) % m]));
                }
                else {
                    triangles.push(new Vertex(nodos[(i - 1) * m + j], nodos[(i - 1) * m + (j + 1) % m], nodos[i * m + j]));
                    triangles.push(new Vertex(nodos[(i - 1) * m + (j + 1) % m], nodos[i * m + (j + 1) % m], nodos[i * m + j]));
                }
            }
        }
        for (var j = 0; j < m; j++)
            triangles.push(new Vertex(nodos[kN], nodos[(n - 2) * m + j], nodos[(n - 2) * m + (j + 1) % m]));
        return { nodos: nodos, triangles: triangles };
    };
    Spheroid.prototype.insolation = function (φ) {
        return Spheroid.annualInsolationFunction(this.obliquity, φ);
    };
    Spheroid.prototype.hasSeasons = function (φ) {
        return Math.abs(φ) > this.obliquity;
    };
    Spheroid.prototype.windConvergence = function (φ) {
        return Math.pow(Math.cos(φ), 2) + Math.pow(Math.cos(3 * φ), 2);
    };
    Spheroid.prototype.windVelocity = function (φ) {
        return { north: 0, east: -Math.cos(φ) }; // realistically this should change direccion, but this formula makes rain shadows more apparent
    };
    Spheroid.prototype.φ = function (point) {
        var β = Math.atan2(this.aspectRatio * point.z, point.r);
        return Math.atan(Math.tan(β) * this.aspectRatio);
    };
    Spheroid.prototype.rz = function (φ) {
        if (Math.abs(φ) === Math.PI / 2) {
            return {
                r: 0,
                z: this.radius * Math.sign(φ) / this.aspectRatio
            };
        }
        else {
            var β = Math.atan(Math.tan(φ) / this.aspectRatio);
            return {
                r: this.radius * Math.cos(β),
                z: this.radius * Math.sin(β) / this.aspectRatio
            };
        }
    };
    Spheroid.prototype.tangent = function (φ) {
        return { r: -Math.sin(φ), z: Math.cos(φ) };
    };
    Spheroid.prototype.ds_dφ = function (φ) {
        var β = Math.atan(Math.tan(φ) / this.aspectRatio);
        var dβ_dφ = this.aspectRatio / (Math.pow(Math.sin(φ), 2) +
            Math.pow(this.aspectRatio * Math.cos(φ), 2));
        var ds_dβ = this.radius *
            Math.sqrt(1 - Math.pow(this.eccentricity * Math.cos(β), 2));
        return ds_dβ * dβ_dφ;
    };
    /**
     * from Walter D. Lambert, J. Washington Academy of Sciences (1942)
     */
    Spheroid.prototype.distance = function (a, b) {
        // first convert a and b to parametric latitude
        a = { φ: Math.atan((1 - this.flattening) * Math.tan(a.φ)), λ: a.λ };
        b = { φ: Math.atan((1 - this.flattening) * Math.tan(b.φ)), λ: b.λ };
        // use the law of haversines to get the angle between them
        var σ = Math.acos(Math.sin(a.φ) * Math.sin(b.φ) +
            Math.cos(a.φ) * Math.cos(b.φ) * Math.cos(a.λ - b.λ));
        // calculate the correction factors
        var p = (a.φ + b.φ) / 2;
        var q = (b.φ - a.φ) / 2;
        var x = (σ - Math.sin(σ)) * Math.pow(Math.sin(p) * Math.cos(q) / Math.cos(σ / 2), 2);
        var y = (σ + Math.sin(σ)) * Math.pow(Math.cos(p) * Math.sin(q) / Math.sin(σ / 2), 2);
        // put it all together
        return this.radius * (σ - this.flattening / 2 * (x + y));
    };
    /**
     * from Alice Nadeau and Richard McGehee, J. Math. Anal. Appl. (2021)
     */
    Spheroid.annualInsolationFunction = function (obliquity, latitude) {
        return 1 -
            5 / 8. * legendreP2(Math.cos(obliquity)) * legendreP2(Math.sin(latitude)) -
            9 / 64. * legendreP4(Math.cos(obliquity)) * legendreP4(Math.sin(latitude)) -
            65 / 1024. * legendreP6(Math.cos(obliquity)) * legendreP6(Math.sin(latitude));
    };
    Spheroid.prototype.isOnEdge = function (_) {
        return false;
    };
    Spheroid.prototype.maximumCurvature = function () {
        return Math.pow(this.aspectRatio, 2) / this.radius;
    };
    return Spheroid;
}(Surface));
export { Spheroid };
//# sourceMappingURL=spheroid.js.map