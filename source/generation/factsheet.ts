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
import {Tile} from "../surface/surface.js";
import {Vector} from "../utilities/geometry.js";
import {Name} from "../language/name.js";
import {Biome, BIOME_NAMES} from "./terrain.js";
import TECHNOLOGIES from "../../resources/tech_tree.js";


const NUM_CIVS_TO_DESCRIBE = 10;
const PRINT_DEBUGGING_INFORMATION = false;


/**
 * initialize an HTML document and fill it out with a comprehensive description
 * @param map the complete SVG code of the map
 * @param civs the list of Civs that will be described later in the document
 * @param tidalLock whether the planet is tidally locked (if so that changes the names of the cardinal directions)
 * @param transcriptionStyle the spelling style to use for the proper nouns
 */
export function generateFactbook(map: SVGSVGElement, civs: Civ[], tidalLock: boolean, transcriptionStyle: string): Document {
	const listedCivs = chooseMostImportantCivs(civs, transcriptionStyle);
	const doc = document.implementation.createHTMLDocument(format(
		transcriptionStyle, 'parameter.factbook'));
	generateTitlePage(doc, map, listedCivs, transcriptionStyle);
	for (const civ of listedCivs)
		generateFactSheet(doc, civ, tidalLock, transcriptionStyle);
	return doc;
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

	if (civs.length > 0)
		addParagraph(
			format(
				transcriptionStyle, 'factbook.outline.lede.some',
				civs.length, civs.map(c => c.getName().toString(transcriptionStyle))),
			page, 'p');
	else
		addParagraph(
			format(transcriptionStyle, 'factbook.outline.lede.none'),
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
 * @param tidalLock whether the planet is tidally locked (if so that changes the names of the cardinal directions)
 * @param transcriptionStyle the spelling style to use for the loanwords
 */
function generateFactSheet(doc: Document, topic: Civ, tidalLock: boolean, transcriptionStyle: string) {
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
			topic.getLandArea(),
			topic.getPopulation()),
		page, 'p');

	addGeographySection(page, topic, tidalLock, transcriptionStyle);

	addDemographicsSection(page, topic, tidalLock, transcriptionStyle);

	addHistorySection(page, topic, transcriptionStyle);
}


/**
 * add some paragraphs to this page recounting the history of the given country
 */
function addHistorySection(page: HTMLDivElement, topic: Civ, transcriptionStyle: string) {
	let history: {type: string, year: number, participants: (Civ | Culture | number)[]}[] = topic.history;

	// add in the time of peak area if that's interesting
	if (topic.peak.landArea > 2*topic.getLandArea())
		history = [...history, {type: "peak", year: topic.peak.year, participants: [topic, topic.peak.landArea]}];
	history.sort((a, b) => a.year - b.year);

	let text = "";
	for (const event of history) {
		const args: (Name | number)[] = [];
		for (const participant of event.participants) {
			if (participant instanceof Civ || participant instanceof Culture)
				args.push(participant.getName());
			else
				args.push(participant);
		}
		text += format(
			transcriptionStyle, `factbook.history.${event.type}`,
			event.year, ...args);
	}
	addParagraph(text, page, 'p');
}


/**
 * add some paragraphs to this page detailing the geography of the given country
 */
function addGeographySection(page: HTMLDivElement, topic: Civ, tidalLock: boolean, transcriptionStyle: string) {
	// look at every tile adjacent to this country
	const adjacentLand: Set<Tile> = new Set();
	const adjacentWater: Set<Tile> = new Set();
	for (const borderTile of topic.border.keys()) {
		for (const adjacentTile of topic.border.get(borderTile)) {
			if (borderTile.isWater() || adjacentTile.isWater())
				adjacentWater.add(adjacentTile);
			else
				adjacentLand.add(adjacentTile);
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
		borderSpecifier = 'factbook.geography.nothing';
	}
	else if (adjacentCivs.size === 1) {
		// if there's one civ, get its name out of the Map and use just that
		for (const neighboringCiv of adjacentCivs.keys())
			borderSpecifier = neighboringCiv.getName();
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
				neighborNames.push(neighbor.getName().toString(transcriptionStyle));
			neighborNames.sort((a, b) => compare(a, b, transcriptionStyle));
			borderDescriptions.push(format(
				transcriptionStyle, 'factbook.geography.neibor_direction',
				neighborNames, `factbook.direction.${direction}`));
		}

		borderSpecifier = borderDescriptions;
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
		transcriptionStyle, `factbook.geography.${type}`,
		topic.getName(), borderSpecifier);

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
	if  (biomeCounter[allBiomes[0]] >= topic.getLandArea()/2)
		terrainSentence = format(
			transcriptionStyle, `factbook.geography.biome`,
			`factbook.geography.${BIOME_NAMES[allBiomes[0]]}`);
	else
		terrainSentence = format(
			transcriptionStyle, `factbook.geography.biomes`,
			allBiomes.slice(0, 3).map(biome => format(
				transcriptionStyle, `factbook.geography.${BIOME_NAMES[biome]}`
			)));

	addParagraph(
		locationSentence + terrainSentence,
		page, 'p');
}


/**
 * add some paragraphs to this page listing and describing the peoples of the given country
 */
function addDemographicsSection(page: HTMLDivElement, topic: Civ, tidalLock: boolean, transcriptionStyle: string) {
	// write a bit about the technology level
	const techDescriptors = new Map<string, string>();
	for (const technology of TECHNOLOGIES)
		if (topic.technology >= Math.exp((technology.year + 3000)/1400))
			techDescriptors.set(technology.type, technology.key);
	addParagraph(
		format(
			transcriptionStyle, `factbook.tech`,
			topic.getName(),
			`factbook.tech.age.${techDescriptors.get("age")}`,
			`factbook.tech.fighting.${techDescriptors.get("fighting")}`,
			`factbook.tech.movement.${techDescriptors.get("movement")}`,
			`factbook.tech.lighting.${techDescriptors.get("lighting")}`,
			`factbook.tech.other.${techDescriptors.get("other")}`,
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

		addParagraph(
			format(
				transcriptionStyle,
				(populationFraction < 2/3) ?
					'factbook.demography.minority' :
					'factbook.demography.majority',
				culture.getName(),
				(inhabitedTiles.size <= topic.tileTree.size/2) ?
					`factbook.demography.part` :
					`factbook.demography.whole`,
				`factbook.direction.${region}`,
				Math.round(populationFraction*100),
				topic.getName()) +
			describe(culture, transcriptionStyle),
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
function describe(culture: Culture, transcriptionStyle: string): string {
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
