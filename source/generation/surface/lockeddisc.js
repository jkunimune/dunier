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
import { Disc } from "./disc.js";
/**
 * a planar planet where the sun hovers stationary above the center.
 */
var LockedDisc = /** @class */ (function (_super) {
    __extends(LockedDisc, _super);
    /**
     * construct a constantly lit disc
     * @param radius the radius of the disc's edge in km
     */
    function LockedDisc(radius) {
        return _super.call(this, radius, NaN, false, 2) || this;
    }
    LockedDisc.prototype.insolation = function (φ) {
        return 2.0 / Math.pow(1 + Math.pow(Math.tan(φ), -2), 3 / 2.);
    };
    LockedDisc.prototype.hasSeasons = function (_) {
        return false;
    };
    LockedDisc.prototype.windConvergence = function (φ) {
        return Math.pow(Math.sin(φ), 2);
    };
    return LockedDisc;
}(Disc));
export { LockedDisc };
//# sourceMappingURL=lockeddisc.js.map