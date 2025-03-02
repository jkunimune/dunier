/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Civ} from "./civ.js";
import {format} from "../gui/internationalization.js";
import {WordType} from "../language/lect.js";
import {Culture, KULTUR_ASPECTS} from "./culture.js";
import {argmax} from "../utilities/miscellaneus.js";
import {compare} from "../language/script.js";


const NUM_CIVS_TO_DESCRIBE = 10;
const PRINT_DEBUGGING_INFORMATION = false;


/**
 * initialize an HTML document and fill it out with a comprehensive description
 * @param map the complete SVG code of the map
 * @param civs the list of Civs that will be described later in the document
 * @param transcriptionStyle the spelling style to use for the proper nouns
 */
export function generateFactbook(map: SVGSVGElement, civs: Civ[], transcriptionStyle: string): Document {
	const listedCivs = chooseMostImportantCivs(civs, transcriptionStyle);
	const doc = document.implementation.createHTMLDocument(format(
		transcriptionStyle, 'parameter.factbook'));
	generateTitlePage(doc, map, listedCivs, transcriptionStyle);
	for (const civ of listedCivs)
		generateFactSheet(doc, civ, transcriptionStyle);
	return doc;
}


/**
 * decide which civs are going to be included in the fact sheet and in what order
 */
function chooseMostImportantCivs(civs: Civ[], transcriptionStyle: string): Civ[] {
	const listedCivs = [];
	const unlistedCivs = civs.slice();
	// make sure we include the Civ with the most advanced technology
	const mostAdvancedIndex = argmax(unlistedCivs.map(c => c.technology));
	listedCivs.push(...unlistedCivs.splice(mostAdvancedIndex, 1));
	// make sure we include the Civ with the largest population
	const mostPopulusIndex = argmax(unlistedCivs.map(c => c.getPopulation()));
	listedCivs.push(...unlistedCivs.splice(mostPopulusIndex, 1));
	// then add the 8 remaining Civs with the largest area
	listedCivs.push(...unlistedCivs.slice(0, NUM_CIVS_TO_DESCRIBE - 2));
	// sort alphabetically before you leave
	return listedCivs.sort(
		(a: Civ, b: Civ) => compare(
			a.getName().toString(transcriptionStyle),
			b.getName().toString(transcriptionStyle), transcriptionStyle));
}


/**
 * add a page to this document reproducing the map and setting the stage for the rest of the document
 * @param doc the document into which to write this page
 * @param map the complete SVG code of the map
 * @param civs the list of Civs that will be described later in the document
 * @param transcriptionStyle the spelling style to use for the proper nouns
 */
function generateTitlePage(doc: Document, map: SVGSVGElement, civs: Civ[], transcriptionStyle: string) {
	const page = document.createElementNS('http://www.w3.org/2000/html', 'div') as HTMLDivElement;
	page.setAttribute('style', 'break-after: page');
	doc.body.appendChild(page);

	addParagraph(
		format(transcriptionStyle, 'factbook.outline.title'),
		page, 'h1');

	addParagraph(
		format(transcriptionStyle, 'factbook.outline.lede', civs.length, civs.map(c => c.getName())),
		page, 'p');

	const importedMap = <SVGSVGElement>map.cloneNode(true);
	importedMap.setAttribute("width", "100%");
	importedMap.setAttribute("height", "6.5in");
	page.appendChild(importedMap);
}


/**
 * add a page to this document with all the interesting informacion about the given Civ
 * @param doc the document into which to write this page
 * @param topic the Civ being described on this page
 * @param transcriptionStyle the spelling style to use for the loanwords
 */
function generateFactSheet(doc: Document, topic: Civ, transcriptionStyle: string) {
	const page = document.createElementNS('http://www.w3.org/2000/html', 'div') as HTMLDivElement;
	page.setAttribute('style', 'break-after: page');
	doc.body.appendChild(page);

	addParagraph(
		format(transcriptionStyle, 'factbook.outline.section_header',
			topic.getName(),
			topic.getName().pronunciation()),
		page, 'h2');

	addParagraph(
		format(transcriptionStyle, 'factbook.stats',
			topic.getArea(),
			topic.getPopulation()),
		page, 'p');

	addParagraph(
		format(transcriptionStyle, 'factbook.history'),
		page, 'h3');

	addParagraph(
		format(transcriptionStyle, 'factbook.geography'),
		page, 'h3');

	addParagraph(
		format(transcriptionStyle, 'factbook.demography'),
		page, 'h3');

	for (const {culture, size} of topic.getCultures()) {
		addParagraph(
			format(
				transcriptionStyle,
					(size < 2/3) ?
				       'factbook.demography.minority' :
				       'factbook.demography.majority',
			       culture.getName(),
			       0,
			       Math.round(size*100),
			       topic.getName()) +
			writeParagraphAbout(culture, transcriptionStyle),
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
function writeParagraphAbout(culture: Culture, transcriptionStyle: string): string {
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
			str += format(transcriptionStyle, `factbook.${KULTUR_ASPECTS[i].key}`,
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
