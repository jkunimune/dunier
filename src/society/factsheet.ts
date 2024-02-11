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
import {Civ} from "./civ.js";
import {PortableDocument} from "../util/portabledocument.js";
import {format} from "../util/internationalization.js";


/**
 * add a page to this PDF document with all the interesting informacion about the given Civ
 * @param doc
 * @param topick
 */
export function generateFactSheet(doc: PortableDocument, topick: Civ) { // TODO: this file is kind of empty; consider pushing this method somewhere else

	doc.addPage("a4", "portrait", { left: 30, rite: 30, top: 30, bottom: 30});
	doc.addParagraph(
		format('factbook.title',
			topick.getName(),
			topick.getName().pronunciation()),
		24);

	doc.addParagraph(
		format('factbook.stats',
			topick.getArea(),
			topick.getPopulation()),
		12);

	doc.addParagraph(
		format('factbook.history'), // TODO: bold this
		18);

	doc.addParagraph(
		format('factbook.geography'), // TODO: bold this
		18);

	doc.addParagraph(
		format('factbook.demography'), // TODO: bold this
		18);

	for (const {culture, abundance} of topick.getCultures())
		doc.addParagraph(
			format((abundance < 2/3) ?
				       'factbook.demography.minority' :
				       'factbook.demography.majority',
			       culture.getName(),
			       0,
			       Math.round(abundance*100),
			       topick.getName()) +
			culture.toString(),
			12, true);
}

