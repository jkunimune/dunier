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
import { Spheroid } from "./spheroid.js";
import { Vector } from "../../utilities/geometry.js";
/**
 * a non-rotating spheroid. aspectRatio = 1, and latitude is measured in the -y direction
 * rather than the +z.
 */
var Sphere = /** @class */ (function (_super) {
    __extends(Sphere, _super);
    /**
     * construct a stationary sphere
     * @param radius the radius of the sphere in km
     */
    function Sphere(radius) {
        return _super.call(this, radius, 1, 0, NaN) || this;
    }
    Sphere.prototype.insolation = function (φ) {
        return 2.0 * Math.max(0, -Math.sin(φ)); // note: the sun is at the minimum latitude, so that maps by default point away from the sun
    };
    Sphere.prototype.hasSeasons = function (_) {
        return false;
    };
    Sphere.prototype.windConvergence = function (φ) {
        return Math.pow((1 - Math.sin(φ)) / Math.sqrt(2), 2);
    };
    Sphere.prototype.windVelocity = function (φ) {
        return { north: -((1 - Math.sin(φ)) / Math.sqrt(2)) * Math.cos(φ), east: 0 };
    };
    Sphere.prototype.xyz = function (place) {
        var _a = _super.prototype.xyz.call(this, place), x = _a.x, y = _a.y, z = _a.z;
        return new Vector(x, -z, y);
    };
    Sphere.prototype.normal = function (place) {
        var _a = _super.prototype.normal.call(this, place), x = _a.x, y = _a.y, z = _a.z;
        return new Vector(x, -z, y);
    };
    Sphere.prototype.north = function (place) {
        var _a = _super.prototype.north.call(this, place), x = _a.x, y = _a.y, z = _a.z;
        return new Vector(x, -z, y);
    };
    Sphere.prototype.φλ = function (point) {
        return _super.prototype.φλ.call(this, new Vector(point.x, point.z, -point.y));
    };
    return Sphere;
}(Spheroid));
export { Sphere };
//# sourceMappingURL=sphere.js.map