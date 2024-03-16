/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Civ} from "./civ.js";
import {PortableDocument} from "../utilities/portabledocument.js";
import {format} from "../gui/internationalization.js";


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

