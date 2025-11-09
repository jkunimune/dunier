/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
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
var Dequeue = /** @class */ (function () {
    function Dequeue(initial) {
        var e_1, _a;
        this.first = null;
        this.last = null;
        try {
            for (var initial_1 = __values(initial), initial_1_1 = initial_1.next(); !initial_1_1.done; initial_1_1 = initial_1.next()) {
                var value = initial_1_1.value;
                this.push(value);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (initial_1_1 && !initial_1_1.done && (_a = initial_1.return)) _a.call(initial_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    Dequeue.prototype.push = function (value) {
        var link = { value: value, next: null };
        if (this.last !== null)
            this.last.next = link;
        else
            this.first = link;
        this.last = link;
    };
    Dequeue.prototype.pop = function () {
        var link = this.first;
        this.first = this.first.next;
        if (this.first === null)
            this.last = null;
        return link.value;
    };
    Dequeue.prototype.isEmpty = function () {
        return this.first === null;
    };
    return Dequeue;
}());
export { Dequeue };
//# sourceMappingURL=dequeue.js.map