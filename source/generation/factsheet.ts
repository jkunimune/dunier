/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Civ} from "./civ.js";
import {PortableDocument} from "../utilities/portabledocument.js";
import {format} from "../gui/internationalization.js";
import {WordType} from "../language/lect.js";
import {Culture, KULTUR_ASPECTS} from "./culture.js";


const PRINT_DEBUGGING_INFORMATION = false;


/**
 * add a page to this PDF document with all the interesting informacion about the given Civ
 * @param doc
 * @param topic
 */
export function generateFactSheet(doc: PortableDocument, topic: Civ) { // TODO: this file is kind of empty; consider pushing this method somewhere else

	doc.addPage("a4", "portrait", { left: 30, rite: 30, top: 30, bottom: 30});
	doc.addParagraph(
		format('factbook.title',
			topic.getName(),
			topic.getName().pronunciation()),
		24);

	doc.addParagraph(
		format('factbook.stats',
			topic.getArea(),
			topic.getPopulation()),
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

	for (const {culture, size} of topic.getCultures()) {
		doc.addParagraph(
			format((size < 2/3) ?
				       'factbook.demography.minority' :
				       'factbook.demography.majority',
			       culture.getName(),
			       0,
			       Math.round(size*100),
			       topic.getName()) +
			writeParagraphAbout(culture),
			12, true);
		
		if (PRINT_DEBUGGING_INFORMATION)
			doc.addParagraph(
				`that culture has the following classes: [${[...culture.klas].join(", ")}]`,
				12, true);
	}
}


/**
 * format this Culture as a nice short paragraff
 */
function writeParagraphAbout(culture: Culture): string {
	let str = "";
	for (let i = 0; i < culture.featureLists.length; i ++) { // rite each sentence about a cultural facette TODO: only show some informacion for each country
		const featureList = culture.featureLists[i];
		const logaIndex = KULTUR_ASPECTS[i].logaIndex;
		if (featureList !== null) {
			let madeUpWord;
			if (logaIndex !== null)
				madeUpWord = culture.lect.getName(featureList[logaIndex].key, WordType.OTHER);
			else
				madeUpWord = null;
			const keys: string[] = [];
			for (let j = 0; j < culture.featureLists[i].length; j ++)
				keys.push(`factbook.${KULTUR_ASPECTS[i].key}.${KULTUR_ASPECTS[i].features[j].key}.${featureList[j].key}`);
			str += format(`factbook.${KULTUR_ASPECTS[i].key}`,
				...keys, madeUpWord); // slotting in the specifick attributes and a randomly generated word in case we need it
		}
	}
	return str.trim();
}
