/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Civ} from "./civ.js";
import {format} from "../gui/internationalization.js";
import {WordType} from "../language/lect.js";
import {Culture, KULTUR_ASPECTS} from "./culture.js";


const PRINT_DEBUGGING_INFORMATION = false;


/**
 * add a page to this PDF document with all the interesting informacion about the given Civ
 * @param doc the document into which to write this page
 * @param topic the Civ being described on this page
 */
export function generateFactSheet(doc: Document, topic: Civ) { // TODO: this file is kind of empty; consider pushing this method somewhere else

	const page = document.createElementNS('http://www.w3.org/2000/html', 'div') as HTMLDivElement;
	page.setAttribute('style', 'break-after: page');
	doc.body.appendChild(page);

	addParagraph(
		format('factbook.title',
			topic.getName(),
			topic.getName().pronunciation()),
		page, 'h2');

	addParagraph(
		format('factbook.stats',
			topic.getArea(),
			topic.getPopulation()),
		page, 'p');

	addParagraph(
		format('factbook.history'),
		page, 'h3');

	addParagraph(
		format('factbook.geography'),
		page, 'h3');

	addParagraph(
		format('factbook.demography'),
		page, 'h3');

	for (const {culture, size} of topic.getCultures()) {
		addParagraph(
			format((size < 2/3) ?
				       'factbook.demography.minority' :
				       'factbook.demography.majority',
			       culture.getName(),
			       0,
			       Math.round(size*100),
			       topic.getName()) +
			writeParagraphAbout(culture),
			page, 'p');

		if (PRINT_DEBUGGING_INFORMATION)
			addParagraph(
				`that culture has the following classes: [${[...culture.klas].join(", ")}]`,
				page, 'p');
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


/**
 * append some text to the document
 * @param text the content to add
 * @param page the element to which to add it
 * @param type the HTML tag (usually "p", "h1", or "h2")
 */
function addParagraph(text: string, page: HTMLDivElement, type: string = 'p') {
	const paragraph = document.createElementNS('http://www.w3.org/2000/html', type); // start by creating the text element
	paragraph.innerHTML = text;
	page.appendChild(paragraph);
}
