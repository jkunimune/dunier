/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Civ} from "./civ.js";
import {format, formatList, localize} from "../gui/internationalization.js";
import {Lect, MAX_NUM_NAME_PARTS, WordType} from "./language/lect.js";
import {Culture, KULTUR_ASPECTS} from "./culture.js";
import {argmax} from "../utilities/miscellaneus.js";
import {compare} from "./language/script.js";
import {Tile} from "./surface/surface.js";
import {Vector} from "../utilities/geometry.js";
import {Biome, BIOME_NAMES} from "./terrain.js";
import TECHNOLOGIES from "../../resources/tech_tree.js";
import {cloneNode, h, VNode} from "../gui/virtualdom.js";
import {Random} from "../utilities/random.js";
import {transcribePhrase} from "./language/word.js";


const NUM_CIVS_TO_DESCRIBE = 10;
const NUM_NAMES_TO_LIST = 3;


/**
 * initialize an HTML document and fill it out with a comprehensive description
 * @param map the complete SVG code of the map
 * @param civs the list of Civs that will be described later in the document
 * @param lects the list of languages of which to be aware, from most to least important
 * @param currentYear today's date
 * @param tidalLock whether the planet is tidally locked (if so that changes the names of the cardinal directions)
 * @param language the language in which to write the factbook
 * @param transcriptionStyle the spelling style to use for the proper nouns
 */
export function generateFactbook(map: VNode, civs: Civ[], lects: Lect[], currentYear: number, tidalLock: boolean, language: string, transcriptionStyle: string): VNode {
	const listedCivs = chooseMostImportantCivs(civs, transcriptionStyle);
	const title = h('title');
	title.textContent = localize('parameter.factbook', language);
	const style = h('style');
	style.textContent = 'body { font-family: "Noto Sans", "Arial", "sans-serif"; }';
	const head = h('head', {}, title, style);
	const body = h('body');
	generateTitlePage(body, map, listedCivs, language, transcriptionStyle);
	for (const civ of listedCivs)
		generateFactSheet(body, civ, lects, currentYear, tidalLock, language, transcriptionStyle);
	return h('html', {}, head, body);
}


/**
 * decide which civs are going to be included in the fact sheet and in what order
 */
function chooseMostImportantCivs(civs: Civ[], transcriptionStyle: string): Civ[] {
	if (civs.length === 0)
		return [];
	const listedCivs = [];
	const unlistedCivs = civs.slice();
	// make sure we include the Civ with the most advanced technology
	if (unlistedCivs.length > 0) {
		const mostAdvancedIndex = argmax(unlistedCivs.map(c => c.technology));
		listedCivs.push(...unlistedCivs.splice(mostAdvancedIndex, 1));
	}
	// make sure we include the Civ with the largest population
	if (unlistedCivs.length > 0) {
		const mostPopulusIndex = argmax(unlistedCivs.map(c => c.getPopulation()));
		listedCivs.push(...unlistedCivs.splice(mostPopulusIndex, 1));
	}
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
 * @param language the language in which to write the factbook
 * @param transcriptionStyle the spelling style to use for the proper nouns
 */
function generateTitlePage(doc: VNode, map: VNode, civs: Civ[], language: string, transcriptionStyle: string) {
	const page = h('div', {style: 'break-after: page'});
	doc.children.push(page);

	addParagraph(
		localize('factbook.outline.title', language),
		page, 'h1');

	if (civs.length >= 2)
		addParagraph(
			format(
				localize('factbook.outline.lede.some', language),
				civs.length,
				formatList(civs.map(c => c.getName().toString(transcriptionStyle)), language)),
			page, 'p');
	else if (civs.length === 1)
		addParagraph(
			format(
				localize('factbook.outline.lede.one', language),
				civs[0].getName().toString(transcriptionStyle)),
			page, 'p');
	else
		addParagraph(
			localize('factbook.outline.lede.none', language),
			page, 'p');

	const importedMap = cloneNode(map);
	importedMap.attributes.width = "100%";
	importedMap.attributes.height = "6.5in";
	page.children.push(importedMap);
}


/**
 * add a page to this document with all the interesting informacion about the given Civ
 * @param doc the document into which to write this page
 * @param topic the Civ being described on this page
 * @param currentYear today's date
 * @param tidalLock whether the planet is tidally locked (if so that changes the names of the cardinal directions)
 * @param listOfLects a presorted list of all of the Lects of which to be aware in order of prominence
 * @param language the language in which to write the factbook
 * @param style the spelling style to use for the loanwords
 */
function generateFactSheet(doc: VNode, topic: Civ, listOfLects: Lect[], currentYear: number, tidalLock: boolean, language: string, style: string) {
	const page = h('div', {style: 'break-after: page'});
	doc.children.push(page);

	addParagraph(
		format(
			localize('factbook.outline.section_header', language),
			topic.getName().toString(style),
		),
		page, 'h2');

	addParagraph(
		format(
			localize('factbook.stats', language),
			topic.getName().toString('(default)'),
			topic.getName().toString('ipa'),
			topic.getLandArea(),
			topic.getPopulation()),
		page, 'p');

	addGeographySection(page, topic, tidalLock, language, style);

	addDemographicsSection(page, topic, listOfLects, tidalLock, language, style);

	addHistorySection(page, topic, currentYear, language, style);
}


/**
 * add some paragraphs to this page recounting the history of the given country
 */
function addHistorySection(page: VNode, topic: Civ, currentYear: number, language: string, style: string) {
	let history: {type: string, year: number, participants: (Civ | Culture | number)[]}[] = topic.history;

	// add in the time of peak area if that's interesting
	if (topic.peak.landArea > 2*topic.getLandArea())
		history = [...history, {type: "peak", year: topic.peak.year, participants: [topic, topic.peak.landArea]}];
	history.sort((a, b) => a.year - b.year);

	let text = "";
	for (const event of history) {
		// collect the transcribed names of all the entities mentioned in the records
		const args: (string | number)[] = [];
		for (const participant of event.participants) {
			if (participant instanceof Civ || participant instanceof Culture)
				args.push(participant.getName().toString(style));
			else
				args.push(participant);
		}
		// add a note if the first country name mentioned is different from the current country name
		if (event === history[0] && event.participants[0] instanceof Civ && args[0] !== topic.getName().toString(style))
			args[0] = format(
				localize('factbook.history.predecessor_clarification', language),
				args[0], topic.getName().toString(style));
		// write it out into the history paragraph
		text += format(
			localize(`factbook.history.${event.type}`, language),
			currentYear - event.year, ...args);
	}
	addParagraph(text, page, 'p');
}


/**
 * add some paragraphs to this page detailing the geography of the given country
 */
function addGeographySection(page: VNode, topic: Civ, tidalLock: boolean, language: string, style: string) {
	// look at every tile adjacent to this country
	const adjacentLand: Set<Tile> = new Set();
	const adjacentWater: Set<Tile> = new Set();
	for (const borderTile of topic.border.keys()) {
		for (const adjacentTile of borderTile.neighbors.keys()) {
			if (topic !== adjacentTile.government) {
				if (borderTile.isWater() || adjacentTile.isWater())
					adjacentWater.add(adjacentTile);
				else
					adjacentLand.add(adjacentTile);
			}
		}
	}
	const numLandBorders = adjacentLand.size;
	const numWaterBorders = adjacentWater.size;

	// group them by polity
	const adjacentCivs: Map<Civ, Set<Tile>> = new Map();
	for (const adjacentTile of adjacentLand) {
		if (adjacentTile.government !== null) {
			const adjacentCiv = adjacentTile.government;
			if (!adjacentCivs.has(adjacentCiv))
				adjacentCivs.set(adjacentCiv, new Set());
			adjacentCivs.get(adjacentCiv).add(adjacentTile);
		}
 	}

	// decide how to describe the border
	let borderSpecifier;
	if (adjacentCivs.size === 0) {
		// if there's noting there, say so
		borderSpecifier = localize('factbook.geography.nothing', language);
	}
	else if (adjacentCivs.size === 1) {
		// if there's one civ, get its name out of the Map and use just that
		for (const neighboringCiv of adjacentCivs.keys())
			borderSpecifier = neighboringCiv.getName().toString(style);
	}
	else {
		// otherwise, ascertain the average direction to each adjacent polity
		const borders: Map<string, Civ[]> = new Map();
		for (const neighboringCiv of adjacentCivs.keys()) {
			const borderLength = adjacentCivs.get(neighboringCiv).size;
			let borderCentroid = new Vector(0, 0, 0);
			for (const adjacentTile of adjacentCivs.get(neighboringCiv))
				borderCentroid = borderCentroid.plus(adjacentTile.pos);
			borderCentroid = borderCentroid.over(borderLength);
			const offset = borderCentroid.minus(topic.capital.pos);
			const easting = offset.dot(topic.capital.east);
			const northing = offset.dot(topic.capital.north);
			const bearing = Math.atan2(northing, easting)*180/Math.PI;
			let direction;
			if (Math.abs(bearing) > 135)
				direction = tidalLock ? "left" : "west";
			else if (bearing > 45)
				direction = tidalLock ? "night" : "north";
			else if (bearing > -45)
				direction = tidalLock ? "right" : "east";
			else
				direction = tidalLock ? "day" : "south";
			if (!borders.has(direction))
				borders.set(direction, []);
			borders.get(direction).push(neighboringCiv);
		}

		const borderDescriptions = [];
		for (const direction of borders.keys()) {
			const neighborNames = [];
			for (const neighbor of borders.get(direction))
				neighborNames.push(neighbor.getName().toString(style));
			neighborNames.sort((a, b) => compare(a, b, style));
			borderDescriptions.push(format(
				localize('factbook.geography.neibor_direction', language),
				formatList(neighborNames, language),
				localize(`factbook.direction.${direction}`, language)));
		}

		borderSpecifier = formatList(borderDescriptions, language);
	}

	const landArea = topic.getLandArea();
	const waterArea = topic.getTotalArea() - topic.getLandArea();

	// decide which sentence to usefor its geography
	let type;
	if (numWaterBorders === 0)
		type = 'landlock';
	else if (numLandBorders === 0) {
		if (landArea > 1000000)
			type = 'continent';
		else
			type = 'island';
	}
	else if (waterArea > landArea && landArea > 200000)
		type = 'oceanic';
	else if (numWaterBorders > numLandBorders)
		type = 'coastal';
	else
		type = 'generic';

	const locationSentence = format(
		localize(`factbook.geography.${type}`, language),
		topic.getName().toString(style), borderSpecifier);

	// tally up all the biomes in this country
	const biomeCounter: number[] = [];
	for (const tile of topic.tileTree.keys()) {
		while (biomeCounter.length <= tile.biome)
			biomeCounter.push(0);
		biomeCounter[tile.biome] += tile.getArea();
	}
	// and figure out of which biome it has the most
	const allBiomes = [];
	for (let biome = 0; biome < biomeCounter.length; biome ++)
		if (biome !== Biome.OCEAN && biome !== Biome.SEA_ICE && biome !== Biome.LAKE)
			allBiomes.push(biome);
	allBiomes.sort((a, b) => biomeCounter[b] - biomeCounter[a]);
	let terrainSentence;
	if  (biomeCounter[allBiomes[0]] >= topic.getLandArea()/2) {
		const mainBiome = allBiomes[0];
		terrainSentence = format(
			localize(`factbook.geography.biome`, language),
			localize(`factbook.geography.${BIOME_NAMES[mainBiome]}`, language));
	}
	else {
		const mainBiomes = allBiomes.slice(0, 3);
		terrainSentence = format(
			localize(`factbook.geography.biomes`, language),
			formatList(
				mainBiomes.map(biome => localize(`factbook.geography.${BIOME_NAMES[biome]}`, language)),
				language,
			));
	}

	addParagraph(
		locationSentence + terrainSentence,
		page, 'p');
}


/**
 * add some paragraphs to this page listing and describing the peoples of the given country
 */
function addDemographicsSection(page: VNode, topic: Civ, listOfLects: Lect[], tidalLock: boolean, language: string, style: string) {
	// write a bit about the technology level
	const techDescriptors = new Map<string, string>();
	for (const technology of TECHNOLOGIES)
		if (topic.technology >= Math.exp((technology.year + 3000)/1400))
			techDescriptors.set(technology.type, technology.key);
	addParagraph(
		format(
			localize(`factbook.tech`, language),
			topic.getName().toString(style),
			localize(`factbook.tech.age.${techDescriptors.get("age")}`, language),
			localize(`factbook.tech.fighting.${techDescriptors.get("fighting")}`, language),
			localize(`factbook.tech.movement.${techDescriptors.get("movement")}`, language),
			localize(`factbook.tech.lighting.${techDescriptors.get("lighting")}`, language),
			localize(`factbook.tech.other.${techDescriptors.get("other")}`, language),
		),
		page, 'p');

	// calculate the centroid of the whole country
	let civCentroid = new Vector(0, 0, 0);
	for (const tile of topic.tileTree.keys())
		civCentroid = civCentroid.plus(tile.pos);
	civCentroid = civCentroid.over(topic.tileTree.size);

	// for each culture in this civ
	for (const {culture, populationFraction, inhabitedTiles} of topic.getCultures()) {
		// find its geographic center of mass and the country's moment of inertia about it
		let centroid = new Vector(0, 0, 0);
		for (const tile of inhabitedTiles)
			centroid = centroid.plus(tile.pos);
		centroid = centroid.over(inhabitedTiles.size);
		let scale = 0;
		for (const tile of inhabitedTiles)
			scale += tile.pos.minus(centroid).sqr();
		scale /= inhabitedTiles.size;
		// thus describe the region where they live
		const offset = centroid.minus(civCentroid);
		let region;
		if (offset.sqr() < scale/8)
			region = "center";
		else {
			const easting = offset.dot(topic.capital.east);
			const northing = offset.dot(topic.capital.north);
			const bearing = Math.atan2(northing, easting)*180/Math.PI;
			if (Math.abs(bearing) > 157.5)
				region = tidalLock ? "left": "west";
			else if (bearing > 112.5)
				region = tidalLock ? "nightleft": "northwest";
			else if (bearing > 67.5)
				region = tidalLock ? "night" : "north";
			else if (bearing > 22.5)
				region = tidalLock ? "nightright" : "northeast";
			else if (bearing > -22.5)
				region = tidalLock ? "right" : "east";
			else if (bearing > -67.5)
				region = tidalLock ? "dayleft" : "southeast";
			else if (bearing > -112.5)
				region = tidalLock ? "day" : "south";
			else
				region = tidalLock ? "dayleft" : "southwest";
		}

		let roundedPopulationPercentage;
		if (populationFraction > .05)
			roundedPopulationPercentage = Math.round(populationFraction*20)*5;
		else if (populationFraction > .01)
			roundedPopulationPercentage = Math.round(populationFraction*100);
		else
			roundedPopulationPercentage = 1.;

		const populationSentence = format(
			localize(
				(populationFraction < 2/3) ?
					'factbook.demography.minority' :
					'factbook.demography.majority',
				language),
			culture.getName().toString(style),
			localize(
				(inhabitedTiles.size <= topic.tileTree.size/2) ?
					`factbook.demography.part` :
					`factbook.demography.whole`,
				language),
			localize(
				`factbook.direction.${region}`,
				language),
			roundedPopulationPercentage,
			topic.getName().toString(style));

		let relatedLect = null;
		for (const otherLect of listOfLects) {
			if (otherLect !== culture.lect && culture.lect.getAncestor(10_000) === otherLect.getAncestor(10_000)) {
				relatedLect = otherLect;
				break;
			}
		}

		let languageSentence;
		if (relatedLect === null)
			languageSentence = format(
				localize('factbook.demography.language_isolate', language),
				culture.lect.getName().toString(style));
		else
			languageSentence = format(
				localize('factbook.demography.language_related', language),
				culture.lect.getName().toString(style),
				relatedLect.getName().toString(style));

		addParagraph(
			populationSentence + languageSentence + describe(culture, language, style),
			page, 'p');
	}
}


/**
 * format this Culture as a nice short paragraff
 */
function describe(culture: Culture, language: string, style: string): string {
	let str = "";
	for (let i = 0; i < culture.featureLists.length; i ++) { // rite each sentence about a cultural facette
		const featureList = culture.featureLists[i];
		const logaIndex = KULTUR_ASPECTS[i].logaIndex;
		if (featureList !== null) {
			let madeUpWord;
			if (logaIndex !== null)
				madeUpWord = culture.lect
					.getProperWord(featureList[logaIndex].key, WordType.GENERIC)
					.toString(style);
			else
				madeUpWord = null;
			const args: string[] = [];
			for (let j = 0; j < culture.featureLists[i].length; j ++)
				args.push(localize(
					`factbook.${KULTUR_ASPECTS[i].key}.${KULTUR_ASPECTS[i].features[j].key}.${featureList[j].key}`,
					language));
			str += format(
				localize(`factbook.${KULTUR_ASPECTS[i].key}`, language),
				...args, madeUpWord); // slotting in the specifick attributes and a randomly generated word in case we need it
		}
	}

	// add in a list of some common names
	const names: string[] = [];
	const rng = new Random(culture.homeland.index);
	const unusedSeeds = new Set<number>();
	for (let i = 0; i < 2*NUM_NAMES_TO_LIST*MAX_NUM_NAME_PARTS; i ++)
		unusedSeeds.add(i); // make sure the same seed isn't used multiple times
	for (let i = 0; i < NUM_NAMES_TO_LIST; i ++) {
		const seeds = [];
		for (let j = 0; j < MAX_NUM_NAME_PARTS; j ++) {
			seeds.push(rng.choice([...unusedSeeds]));
			unusedSeeds.delete(seeds[j]);
		}
		names.push(format(
			localize('grammar.mention', language),
			transcribePhrase(culture.lect.getFullName(seeds), style)));
	}
	str += format(
		localize('factbook.demography.common_names', language),
		culture.getName().toString(style),
		formatList(names, language));

	return str.trim();
}


/**
 * append some text to the document
 * @param text the content to add
 * @param page the element to which to add it
 * @param type the HTML tag (usually "p", "h1", or "h2")
 */
function addParagraph(text: string, page: VNode, type: string = 'p') {
	const paragraph = h(type); // start by creating the text element
	paragraph.textContent = text;
	page.children.push(paragraph);
}
