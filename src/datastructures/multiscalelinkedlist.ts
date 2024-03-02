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
import {binarySearch} from "../util/util.js";

/**
 * an ordered list of values that can be resolved at multiple scales.  the idea is that
 * each pair of values has some distance between them, and values that are very close to
 * each other are not so important, so when you go and use the list you don't need to
 * keep track of <i>all</i> of them.  rather, when you evaluate this as a normal list,
 * you'll be aiming to resolve it at some particular scale, and that means you'll throw
 * away as many nodes as you can without having any adjacent nodes have a distance above
 * that scale.
 */
export class MultiScaleLinkedList<E> {
    public readonly start: Link<E>;
    public readonly end: Link<E>;

    constructor(start: E, length: number, end: E) {
        this.start = new Link<E>(start);
        this.start.addNext(length, end);
        this.end = this.start.getNextClosest();
    }

    /**
     * extract a simple list of elements, using a certain resolution
     * @param resolution the scale value to use when deciding which links to take
     * @param func a function to apply to each value rather than simply returning it
     * @return the relevant values for this scale in a simple array
     */
    public resolve(resolution: number, func: (item: E) => any = null): any[] {
        let link = this.start;
        const output = [(func !== null) ? func(link.value) : link.value];
        while (link !== this.end) {
            link = link.getNext(resolution);
            if (link === null)
                throw `this list does not have sufficient Links to support a resolution of ${resolution}`;
            output.push((func !== null) ? func(link.value) : link.value);
        }
        return output;
    }
}


/**
 * a single link in the MultiScaleLinkedList.  it has a value, information about which
 * node could come next, and information about at what scales it can be discarded.
 */
class Link<E> {
    public readonly value: E;
    private readonly successors: {distance: number, link: Link<E>}[]; // the potential next Links, and the scales at which they must be further resolved

    /**
     * initialize a Link without yet assigning it any adjacency information
     * @param value the object or quantity associated with this node that we actually care about
     */
    constructor(value: E) {
        this.value = value;
        this.successors = [];
    }

    /**
     * select the appropriate successor at this scale
     * @param resolution the maximum allowable distance between this and the next that it returns
     * @return the Link that comes next at the specified scale, or null if there is no Link at such a fine scale
     */
    public getNext(resolution: number): Link<E> {
        const i = binarySearch(this.successors, (option) => option.distance <= resolution);
        if (i < this.successors.length)
            return this.successors[i].link;
        else
            return null;
    }

    /**
     * select the successor at the finest available scale
     */
    public getNextClosest(): Link<E> {
        return this.successors[this.successors.length - 1].link;
    }

    /**
     * create and connect a new successor Link
     */
    public addNext(distance: number, value: E): void {
        this.linkNext(distance, new Link(value));
    }

    /**
     * connect a new successor that already exists as a Link
     */
    public linkNext(distance: number, value: Link<E>): void {
        if (this.successors.length > 0 && distance > this.successors[this.successors.length - 1].distance)
            throw `the successors of a Link must be sorted by distance (farthest to closest), but you tried to add a new one ${distance} ` +
            `away after the previus successor was already ${this.successors[this.successors.length - 1].distance} away.`;
        this.successors.push({distance: distance, link: value});
    }
}
