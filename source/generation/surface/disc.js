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
import { Vector } from "../../utilities/geometry.js";
/**
 * a planar planet based on the modern flat earth model, where the sun circles in a horizontal plane above the world,
 * and the oscillating radius of its orbit causes the seasons.
 */
var Disc = /** @class */ (function (_super) {
    __extends(Disc, _super);
    /**
     * construct a flat earth
     * @param radius the radius of the disc edge in km
     * @param effectiveObliquity the effective magnitude of the seasons in radians
     * @param hasDayNightCycle whether there are days (typically true but the subclass makes it false)
     * @param aspectRatio the ratio of the disc radius to the firmament height
     */
    function Disc(radius, effectiveObliquity, hasDayNightCycle, aspectRatio) {
        if (aspectRatio === void 0) { aspectRatio = 4.; }
        var _this = _super.call(this, -Math.PI / 2, -Math.atan(1 / aspectRatio), hasDayNightCycle) || this;
        _this.radius = radius;
        _this.equatorRadius = radius / 2;
        _this.firmamentHite = radius / aspectRatio;
        _this.effectiveObliquity = effectiveObliquity;
        return _this;
    }
    Disc.prototype.partition = function () {
        var nodos = [
            new Tile(null, { φ: -Math.atan(1 / 8), λ: 0 }, this),
            new Tile(null, { φ: -Math.atan(1 / 8), λ: Math.PI / 2 }, this),
            new Tile(null, { φ: -Math.atan(1 / 8), λ: Math.PI }, this),
            new Tile(null, { φ: -Math.atan(1 / 8), λ: 3 * Math.PI / 2 }, this),
        ];
        var triangles = [
            new Vertex(nodos[2], nodos[1], nodos[0]),
            new Vertex(nodos[0], nodos[3], nodos[2]),
        ];
        return { triangles: triangles, nodos: nodos };
    };
    Disc.prototype.insolation = function (φ) {
        // this polynomial is based on some fitting done in source/python/simulate_perspective.py
        var cos_ψ = Math.cos(2 * this.effectiveObliquity);
        var ρ = this.firmamentHite / this.equatorRadius / 2 / Math.tan(φ);
        return 7.0 / ((3.865 * cos_ψ + 6.877) -
            (44.803 * cos_ψ + 1.216) * Math.pow(ρ, 2) +
            (87.595 * cos_ψ + 19.836) * Math.pow(ρ, 4) -
            (38.728 * cos_ψ - 8.049) * Math.pow(ρ, 6));
    };
    Disc.prototype.hasSeasons = function (φ) {
        return Math.abs(this.rz(φ).r - this.equatorRadius) > this.effectiveObliquity / (Math.PI / 2) * this.equatorRadius;
    };
    Disc.prototype.windConvergence = function (φ) {
        return 1.5 * (Math.pow(Math.sin(2 * φ), 2) + Math.pow(Math.sin(3 * φ), 2) - 0.5);
    };
    Disc.prototype.windVelocity = function (φ) {
        return { north: Math.sin(2 * φ), east: 0 };
    };
    Disc.prototype.φ = function (point) {
        return -Math.atan(this.firmamentHite / point.r);
    };
    Disc.prototype.rz = function (φ) {
        if (φ === -Math.PI / 2)
            return { r: 0, z: 0 };
        else
            return { r: -this.firmamentHite / Math.tan(φ), z: 0 };
    };
    Disc.prototype.tangent = function (_) {
        return { r: 1, z: 0 };
    };
    Disc.prototype.ds_dφ = function (φ) {
        return this.firmamentHite * Math.pow(Math.sin(φ), -2);
    };
    Disc.prototype.distance = function (a, b) {
        var ar = -this.firmamentHite / Math.tan(a.φ);
        var br = -this.firmamentHite / Math.tan(b.φ);
        return Math.sqrt(ar * ar + br * br - 2 * ar * br * Math.cos(a.λ - b.λ));
    };
    Disc.prototype.isOnEdge = function (place) {
        return place.φ === this.φMax;
    };
    Disc.prototype.maximumCurvature = function () {
        return 0;
    };
    Disc.prototype.computeEdgeVertexLocation = function (tileL, tileR) {
        var x0 = (tileL.pos.x + tileR.pos.x) / 2;
        var y0 = (tileL.pos.y + tileR.pos.y) / 2;
        var vx = tileR.pos.y - tileL.pos.y;
        var vy = tileL.pos.x - tileR.pos.x;
        var v2 = vx * vx + vy * vy;
        var vDotR = x0 * vx + y0 * vy;
        var Δr2 = this.radius * this.radius - x0 * x0 - y0 * y0;
        var t = (-vDotR + Math.sqrt(vDotR * vDotR + v2 * Δr2)) / v2;
        var x = x0 + vx * t;
        var y = y0 + vy * t;
        var λ = Math.atan2(x, -y);
        return { pos: new Vector(x, y, 0), coordinates: { φ: this.φMax, λ: λ } };
    };
    return Disc;
}(Surface));
export { Disc };
//# sourceMappingURL=disc.js.map