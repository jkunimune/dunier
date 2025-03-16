/**
 * MIT License
 *
 * Copyright (c) 2020 Axel Rauschmayer
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
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
var Enumify = /** @class */ (function () {
    function Enumify() {
    }
    Enumify.closeEnum = function () {
        var e_1, _a;
        var enumKeys = [];
        var enumValues = [];
        try {
            // Traverse the enum entries
            for (var _b = __values(Object.entries(this)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), key = _d[0], value = _d[1];
                enumKeys.push(key);
                value.enumKey = key;
                value.enumOrdinal = enumValues.length;
                enumValues.push(value);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // Important: only add more static properties *after* processing the enum entries
        this.enumKeys = enumKeys;
        this.enumValues = enumValues;
        // TODO: prevent instantiation now. Freeze `this`?
    };
    /** Use case: parsing enum values */
    Enumify.enumValueOf = function (str) {
        var index = this.enumKeys.indexOf(str);
        if (index >= 0) {
            return this.enumValues[index];
        }
        return undefined;
    };
    Enumify[Symbol.iterator] = function () {
        return this.enumValues[Symbol.iterator]();
    };
    Enumify.prototype.toString = function () {
        return this.constructor.name + '.' + this.enumKey;
    };
    return Enumify;
}());
export { Enumify };
//# sourceMappingURL=enumify.js.map