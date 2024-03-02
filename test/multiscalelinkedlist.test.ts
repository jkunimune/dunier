/**
 * MIT License
 *
 * Copyright (c) 2021 Justin Kunimune
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
import {MultiScaleLinkedList} from "../src/datastructures/multiscalelinkedlist.js";

// build a test list that is numbers 0 thru 12
const list = new MultiScaleLinkedList<number>(0, 12, 12);
// lay a coarse layer at resolution 6 and a finer one at resolution 2
let coarseLink = list.start;
for (let i = 0; i < 12; i += 6) {
    if (i + 6 < 12)
        coarseLink.addNext(6, i + 6);
    else
        coarseLink.linkNext(6, list.end);
    let fineLink = coarseLink;
    for (let j = i; j < i + 6; j += 2) {
        if (j + 2 < i + 6)
            fineLink.addNext(2, j + 2);
        else
            fineLink.linkNext(2, coarseLink.getNext(6));
        fineLink = fineLink.getNext(2);
    }
    coarseLink = coarseLink.getNext(6);
}

test("coarsest", () => {
    expect(list.resolve(Number.POSITIVE_INFINITY)).toEqual([0, 12]);
});
test("coarse", () => {
    expect(list.resolve(6)).toEqual([0, 6, 12]);
});
test("medium", () => {
    expect(list.resolve(4)).toEqual([0, 2, 4, 6, 8, 10, 12]);
});
test("fine", () => {
    expect(list.resolve(2)).toEqual([0, 2, 4, 6, 8, 10, 12]);
});
test("too fine", () => {
    expect(() => list.resolve(1)).toThrowError();
});
