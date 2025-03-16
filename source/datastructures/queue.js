/**
 * ISC License
 *
 * Copyright (c) 2017, Vladimir Agafonkin
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose
 * with or without fee is hereby granted, provided that the above copyright notice
 * and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
 * OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
 * TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
 * THIS SOFTWARE.
 */
/**
 * The smallest and simplest binary heap priority queue in JavaScript.
 * @author Vladimir Agafonkin (@mourner)
 */
var Queue = /** @class */ (function () {
    function Queue(data, compare) {
        if (data === void 0) { data = []; }
        this.data = data;
        this.length = this.data.length;
        this.compare = compare;
        if (this.length > 0)
            for (var i = (this.length >> 1) - 1; i >= 0; i--)
                this.down(i);
    }
    Queue.prototype.empty = function () {
        return this.length === 0;
    };
    Queue.prototype.push = function (item) {
        this.data.push(item);
        this.up(this.length++);
    };
    Queue.prototype.pop = function () {
        if (this.length === 0)
            return undefined;
        var top = this.data[0];
        var bottom = this.data.pop();
        if (--this.length > 0) {
            this.data[0] = bottom;
            this.down(0);
        }
        return top;
    };
    Queue.prototype.peek = function () {
        return this.data[0];
    };
    Queue.prototype.up = function (pos) {
        var _a = this, data = _a.data, compare = _a.compare;
        var item = data[pos];
        while (pos > 0) {
            var parent_1 = (pos - 1) >> 1;
            var current = data[parent_1];
            if (compare(item, current) >= 0)
                break;
            data[pos] = current;
            pos = parent_1;
        }
        data[pos] = item;
    };
    Queue.prototype.down = function (pos) {
        var _a = this, data = _a.data, compare = _a.compare;
        var halfLength = this.length >> 1;
        var item = data[pos];
        while (pos < halfLength) {
            var bestChild = (pos << 1) + 1; // initially it is the left child
            var right = bestChild + 1;
            if (right < this.length && compare(data[right], data[bestChild]) < 0) {
                bestChild = right;
            }
            if (compare(data[bestChild], item) >= 0)
                break;
            data[pos] = data[bestChild];
            pos = bestChild;
        }
        data[pos] = item;
    };
    return Queue;
}());
export default Queue;
//# sourceMappingURL=queue.js.map