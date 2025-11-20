var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { Civ } from "./civ.js";
import { format, formatList, localize } from "../gui/internationalization.js";
import { MAX_NUM_NAME_PARTS } from "./language/lect.js";
import { Culture, KULTUR_ASPECTS } from "./culture.js";
import { argmax } from "../utilities/miscellaneus.js";
import { compare } from "./language/script.js";
import { Vector } from "../utilities/geometry.js";
import { Biome, BIOME_NAMES } from "./terrain.js";
import { cloneNode, h } from "../gui/virtualdom.js";
import { Random } from "../utilities/random.js";
import TECHNOLOGIES from "../../resources/tech_tree.js";
var NUM_CIVS_TO_DESCRIBE = 10;
var NUM_NAMES_TO_LIST = 3;
var NUM_CONQUESTS_TO_MENTION = 3;
/**
 * initialize an HTML document and fill it out with a comprehensive description
 * @param map the complete SVG code of the map
 * @param civs the list of Civs that may be described later in the document
 * @param lects the list of languages of which to be aware, from most to least important
 * @param currentYear today's date
 * @param tidalLock whether the planet is tidally locked (if so that changes the names of the cardinal directions)
 * @param language the language in which to write the factbook
 * @param transcriptionStyle the spelling style to use for the proper nouns
 */
export function generateFactbook(map, civs, lects, currentYear, tidalLock, language, transcriptionStyle) {
    var e_1, _a;
    var listedCivs = chooseMostImportantCivs(civs, transcriptionStyle);
    var title = h('title');
    title.textContent = localize('parameter.factbook', language);
    var style = h('style');
    style.textContent = 'body { font-family: "Noto Sans", "Arial", "sans-serif"; }';
    var head = h('head', {}, title, style);
    var body = h('body');
    generateTitlePage(body, map, listedCivs, language, transcriptionStyle);
    try {
        for (var listedCivs_1 = __values(listedCivs), listedCivs_1_1 = listedCivs_1.next(); !listedCivs_1_1.done; listedCivs_1_1 = listedCivs_1.next()) {
            var civ = listedCivs_1_1.value;
            generateFactSheet(body, civ, lects, currentYear, tidalLock, language, transcriptionStyle);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (listedCivs_1_1 && !listedCivs_1_1.done && (_a = listedCivs_1.return)) _a.call(listedCivs_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return h('html', {}, head, body);
}
/**
 * decide which civs are going to be included in the fact sheet and in what order
 */
function chooseMostImportantCivs(civs, transcriptionStyle) {
    if (civs.length === 0)
        return [];
    var listedCivs = [];
    var unlistedCivs = civs.slice();
    // make sure we include the Civ with the most advanced technology
    if (unlistedCivs.length > 0) {
        var mostAdvancedIndex = argmax(unlistedCivs.map(function (c) { return c.technology; }));
        listedCivs.push.apply(listedCivs, __spreadArray([], __read(unlistedCivs.splice(mostAdvancedIndex, 1)), false));
    }
    // make sure we include the Civ with the largest population
    if (unlistedCivs.length > 0) {
        var mostPopulusIndex = argmax(unlistedCivs.map(function (c) { return c.getPopulation(); }));
        listedCivs.push.apply(listedCivs, __spreadArray([], __read(unlistedCivs.splice(mostPopulusIndex, 1)), false));
    }
    // then add the 8 remaining Civs with the largest area, including water
    unlistedCivs.sort(function (a, b) { return b.getTotalArea() - a.getTotalArea(); });
    listedCivs.push.apply(listedCivs, __spreadArray([], __read(unlistedCivs.slice(0, NUM_CIVS_TO_DESCRIBE - 2)), false));
    // sort alphabetically before you leave
    return listedCivs.sort(function (a, b) { return compare(a.getName().toString(transcriptionStyle), b.getName().toString(transcriptionStyle), transcriptionStyle); });
}
/**
 * add a page to this document reproducing the map and setting the stage for the rest of the document
 * @param doc the document into which to write this page
 * @param map the complete SVG code of the map
 * @param civs the list of Civs that will be described later in the document
 * @param language the language in which to write the factbook
 * @param transcriptionStyle the spelling style to use for the proper nouns
 */
function generateTitlePage(doc, map, civs, language, transcriptionStyle) {
    var page = h('div', { style: 'break-after: page' });
    doc.children.push(page);
    addParagraph(localize('factbook.outline.title', language), page, 'h1');
    if (civs.length >= 2)
        addParagraph(format(localize('factbook.outline.lede.some', language), civs.length, formatList(civs.map(function (c) { return c.getName().toString(transcriptionStyle); }), language)), page, 'p');
    else if (civs.length === 1)
        addParagraph(format(localize('factbook.outline.lede.one', language), civs[0].getName().toString(transcriptionStyle)), page, 'p');
    else
        addParagraph(localize('factbook.outline.lede.none', language), page, 'p');
    var mapContainer = h('div', { style: "display:flex; width:100%; height:6.5in;" });
    var importedMap = cloneNode(map);
    importedMap.attributes.style = "max-width:100%; max-height:100%; margin:auto;";
    mapContainer.children.push(importedMap);
    page.children.push(mapContainer);
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
function generateFactSheet(doc, topic, listOfLects, currentYear, tidalLock, language, style) {
    var page = h('div', { style: 'break-after: page' });
    doc.children.push(page);
    addParagraph(format(localize('factbook.outline.section_header', language), topic.getName().toString(style)), page, 'h2');
    addParagraph(format(localize('factbook.stats', language), topic.getName().toString('(default)'), topic.getName().toString('ipa'), topic.getLandArea(), topic.getPopulation()), page, 'p');
    addGeographySection(page, topic, tidalLock, language, style);
    addDemographicsSection(page, topic, listOfLects, tidalLock, language, style);
    addHistorySection(page, topic, currentYear, language, style);
}
/**
 * add some paragraphs to this page recounting the history of the given country
 */
function addHistorySection(page, topic, currentYear, language, style) {
    var e_2, _a, e_3, _b;
    var history = topic.history.slice();
    // remove all but the last three conquests
    var numConquests = 0;
    for (var i = history.length - 1; i >= 0; i--) {
        if (history[i].type === "conquest") {
            if (numConquests >= NUM_CONQUESTS_TO_MENTION)
                history.splice(i, 1);
            numConquests++;
        }
    }
    // add in the time of peak area if that's interesting
    if (topic.peak.landArea > 2 * topic.getLandArea())
        history.push({ type: "peak", year: topic.peak.year, participants: [topic, topic.peak.landArea] });
    history.sort(function (a, b) { return a.year - b.year; });
    var text = "";
    try {
        for (var history_1 = __values(history), history_1_1 = history_1.next(); !history_1_1.done; history_1_1 = history_1.next()) {
            var event_1 = history_1_1.value;
            // collect the transcribed names of all the entities mentioned in the records
            var args = [];
            try {
                for (var _c = (e_3 = void 0, __values(event_1.participants)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var participant = _d.value;
                    if (participant instanceof Civ || participant instanceof Culture)
                        args.push(participant.getName().toString(style));
                    else if (typeof participant === "number")
                        args.push(participant);
                    else
                        throw new Error("invalid type: ".concat(typeof participant));
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                }
                finally { if (e_3) throw e_3.error; }
            }
            // add a note if the first country name mentioned is different from the current country name
            if (event_1 === history[0] && event_1.participants[0] instanceof Civ && args[0] !== topic.getName().toString(style))
                args[0] = format(localize('factbook.history.predecessor_clarification', language), args[0], topic.getName().toString(style));
            // write it out into the history paragraph
            text += format.apply(void 0, __spreadArray([localize("factbook.history.".concat(event_1.type), language),
                currentYear - event_1.year], __read(args), false));
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (history_1_1 && !history_1_1.done && (_a = history_1.return)) _a.call(history_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    addParagraph(text, page, 'p');
}
/**
 * add some paragraphs to this page detailing the geography of the given country
 */
function addGeographySection(page, topic, tidalLock, language, style) {
    var e_4, _a, e_5, _b, e_6, _c, e_7, _d, e_8, _e, e_9, _f, e_10, _g, e_11, _h, e_12, _j;
    // look at every tile adjacent to this country
    var adjacentLand = new Set();
    var adjacentWater = new Set();
    try {
        for (var _k = __values(topic.border.keys()), _l = _k.next(); !_l.done; _l = _k.next()) {
            var borderTile = _l.value;
            try {
                for (var _m = (e_5 = void 0, __values(borderTile.neighbors.keys())), _o = _m.next(); !_o.done; _o = _m.next()) {
                    var adjacentTile = _o.value;
                    if (topic !== adjacentTile.government) {
                        if (borderTile.isWater() || adjacentTile.isWater())
                            adjacentWater.add(adjacentTile);
                        else
                            adjacentLand.add(adjacentTile);
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_o && !_o.done && (_b = _m.return)) _b.call(_m);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_l && !_l.done && (_a = _k.return)) _a.call(_k);
        }
        finally { if (e_4) throw e_4.error; }
    }
    var numLandBorders = adjacentLand.size;
    var numWaterBorders = adjacentWater.size;
    // group them by polity
    var adjacentCivs = new Map();
    try {
        for (var adjacentLand_1 = __values(adjacentLand), adjacentLand_1_1 = adjacentLand_1.next(); !adjacentLand_1_1.done; adjacentLand_1_1 = adjacentLand_1.next()) {
            var adjacentTile = adjacentLand_1_1.value;
            if (adjacentTile.government !== null) {
                var adjacentCiv = adjacentTile.government;
                if (!adjacentCivs.has(adjacentCiv))
                    adjacentCivs.set(adjacentCiv, new Set());
                adjacentCivs.get(adjacentCiv).add(adjacentTile);
            }
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (adjacentLand_1_1 && !adjacentLand_1_1.done && (_c = adjacentLand_1.return)) _c.call(adjacentLand_1);
        }
        finally { if (e_6) throw e_6.error; }
    }
    // decide how to describe the border
    var borderSpecifier;
    if (adjacentCivs.size === 0) {
        // if there's noting there, say so
        borderSpecifier = localize('factbook.geography.nothing', language);
    }
    else if (adjacentCivs.size === 1) {
        try {
            // if there's one civ, get its name out of the Map and use just that
            for (var _p = __values(adjacentCivs.keys()), _q = _p.next(); !_q.done; _q = _p.next()) {
                var neighboringCiv = _q.value;
                borderSpecifier = neighboringCiv.getName().toString(style);
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_q && !_q.done && (_d = _p.return)) _d.call(_p);
            }
            finally { if (e_7) throw e_7.error; }
        }
    }
    else {
        // otherwise, ascertain the average direction to each adjacent polity
        var borders = new Map();
        try {
            for (var _r = __values(adjacentCivs.keys()), _s = _r.next(); !_s.done; _s = _r.next()) {
                var neighboringCiv = _s.value;
                var borderLength = adjacentCivs.get(neighboringCiv).size;
                var borderCentroid = new Vector(0, 0, 0);
                try {
                    for (var _t = (e_9 = void 0, __values(adjacentCivs.get(neighboringCiv))), _u = _t.next(); !_u.done; _u = _t.next()) {
                        var adjacentTile = _u.value;
                        borderCentroid = borderCentroid.plus(adjacentTile.pos);
                    }
                }
                catch (e_9_1) { e_9 = { error: e_9_1 }; }
                finally {
                    try {
                        if (_u && !_u.done && (_f = _t.return)) _f.call(_t);
                    }
                    finally { if (e_9) throw e_9.error; }
                }
                borderCentroid = borderCentroid.over(borderLength);
                var offset = borderCentroid.minus(topic.capital.pos);
                var easting = offset.dot(topic.capital.east);
                var northing = offset.dot(topic.capital.north);
                var bearing = Math.atan2(northing, easting) * 180 / Math.PI;
                var direction = void 0;
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
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_s && !_s.done && (_e = _r.return)) _e.call(_r);
            }
            finally { if (e_8) throw e_8.error; }
        }
        var borderDescriptions = [];
        try {
            for (var _v = __values(borders.keys()), _w = _v.next(); !_w.done; _w = _v.next()) {
                var direction = _w.value;
                var neighborNames = [];
                try {
                    for (var _x = (e_11 = void 0, __values(borders.get(direction))), _y = _x.next(); !_y.done; _y = _x.next()) {
                        var neighbor = _y.value;
                        neighborNames.push(neighbor.getName().toString(style));
                    }
                }
                catch (e_11_1) { e_11 = { error: e_11_1 }; }
                finally {
                    try {
                        if (_y && !_y.done && (_h = _x.return)) _h.call(_x);
                    }
                    finally { if (e_11) throw e_11.error; }
                }
                neighborNames.sort(function (a, b) { return compare(a, b, style); });
                borderDescriptions.push(format(localize('factbook.geography.neibor_direction', language), formatList(neighborNames, language), localize("factbook.direction.".concat(direction), language)));
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (_w && !_w.done && (_g = _v.return)) _g.call(_v);
            }
            finally { if (e_10) throw e_10.error; }
        }
        borderSpecifier = formatList(borderDescriptions, language);
    }
    var landArea = topic.getLandArea();
    var waterArea = topic.getTotalArea() - topic.getLandArea();
    // decide which sentence to usefor its geography
    var type;
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
    var locationSentence = format(localize("factbook.geography.".concat(type), language), topic.getName().toString(style), borderSpecifier);
    // tally up all the biomes in this country
    var biomeCounter = [];
    try {
        for (var _z = __values(topic.getTiles()), _0 = _z.next(); !_0.done; _0 = _z.next()) {
            var tile = _0.value;
            while (biomeCounter.length <= tile.biome)
                biomeCounter.push(0);
            biomeCounter[tile.biome] += tile.getArea();
        }
    }
    catch (e_12_1) { e_12 = { error: e_12_1 }; }
    finally {
        try {
            if (_0 && !_0.done && (_j = _z.return)) _j.call(_z);
        }
        finally { if (e_12) throw e_12.error; }
    }
    // and figure out of which biome it has the most
    var allBiomes = [];
    for (var biome = 0; biome < biomeCounter.length; biome++)
        if (biome !== Biome.OCEAN && biome !== Biome.SEA_ICE && biome !== Biome.LAKE)
            allBiomes.push(biome);
    allBiomes.sort(function (a, b) { return biomeCounter[b] - biomeCounter[a]; });
    var terrainSentence;
    if (biomeCounter[allBiomes[0]] >= topic.getLandArea() / 2) {
        var mainBiome = allBiomes[0];
        terrainSentence = format(localize("factbook.geography.biome", language), localize("factbook.geography.".concat(BIOME_NAMES[mainBiome]), language));
    }
    else {
        var mainBiomes = allBiomes.slice(0, 3);
        terrainSentence = format(localize("factbook.geography.biomes", language), formatList(mainBiomes.map(function (biome) { return localize("factbook.geography.".concat(BIOME_NAMES[biome]), language); }), language));
    }
    addParagraph(locationSentence + terrainSentence, page, 'p');
}
/**
 * add some paragraphs to this page listing and describing the peoples of the given country
 */
function addDemographicsSection(page, topic, listOfLects, tidalLock, language, style) {
    var e_13, _a, e_14, _b, e_15, _c, e_16, _d, e_17, _e, e_18, _f;
    // write a bit about the technology level
    var techDescriptors = new Map();
    try {
        for (var TECHNOLOGIES_1 = __values(TECHNOLOGIES), TECHNOLOGIES_1_1 = TECHNOLOGIES_1.next(); !TECHNOLOGIES_1_1.done; TECHNOLOGIES_1_1 = TECHNOLOGIES_1.next()) {
            var technology = TECHNOLOGIES_1_1.value;
            if (topic.technology >= Math.exp((technology.year + 3000) / 1400))
                techDescriptors.set(technology.type, technology.key);
        }
    }
    catch (e_13_1) { e_13 = { error: e_13_1 }; }
    finally {
        try {
            if (TECHNOLOGIES_1_1 && !TECHNOLOGIES_1_1.done && (_a = TECHNOLOGIES_1.return)) _a.call(TECHNOLOGIES_1);
        }
        finally { if (e_13) throw e_13.error; }
    }
    addParagraph(format(localize("factbook.tech", language), topic.getName().toString(style), localize("factbook.tech.age.".concat(techDescriptors.get("age")), language), localize("factbook.tech.fighting.".concat(techDescriptors.get("fighting")), language), localize("factbook.tech.movement.".concat(techDescriptors.get("movement")), language), localize("factbook.tech.lighting.".concat(techDescriptors.get("lighting")), language), localize("factbook.tech.other.".concat(techDescriptors.get("other")), language)), page, 'p');
    // calculate the centroid of the whole country
    var civCentroid = new Vector(0, 0, 0);
    try {
        for (var _g = __values(topic.getTiles()), _h = _g.next(); !_h.done; _h = _g.next()) {
            var tile = _h.value;
            civCentroid = civCentroid.plus(tile.pos);
        }
    }
    catch (e_14_1) { e_14 = { error: e_14_1 }; }
    finally {
        try {
            if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
        }
        finally { if (e_14) throw e_14.error; }
    }
    civCentroid = civCentroid.over(topic.getTiles().size);
    try {
        // for each culture in this civ
        for (var _j = __values(topic.getCultures()), _k = _j.next(); !_k.done; _k = _j.next()) {
            var _l = _k.value, culture = _l.culture, populationFraction = _l.populationFraction, inhabitedTiles = _l.inhabitedTiles;
            // find its geographic center of mass and the country's moment of inertia about it
            var centroid = new Vector(0, 0, 0);
            try {
                for (var inhabitedTiles_1 = (e_16 = void 0, __values(inhabitedTiles)), inhabitedTiles_1_1 = inhabitedTiles_1.next(); !inhabitedTiles_1_1.done; inhabitedTiles_1_1 = inhabitedTiles_1.next()) {
                    var tile = inhabitedTiles_1_1.value;
                    centroid = centroid.plus(tile.pos);
                }
            }
            catch (e_16_1) { e_16 = { error: e_16_1 }; }
            finally {
                try {
                    if (inhabitedTiles_1_1 && !inhabitedTiles_1_1.done && (_d = inhabitedTiles_1.return)) _d.call(inhabitedTiles_1);
                }
                finally { if (e_16) throw e_16.error; }
            }
            centroid = centroid.over(inhabitedTiles.size);
            var scale = 0;
            try {
                for (var inhabitedTiles_2 = (e_17 = void 0, __values(inhabitedTiles)), inhabitedTiles_2_1 = inhabitedTiles_2.next(); !inhabitedTiles_2_1.done; inhabitedTiles_2_1 = inhabitedTiles_2.next()) {
                    var tile = inhabitedTiles_2_1.value;
                    scale += tile.pos.minus(centroid).sqr();
                }
            }
            catch (e_17_1) { e_17 = { error: e_17_1 }; }
            finally {
                try {
                    if (inhabitedTiles_2_1 && !inhabitedTiles_2_1.done && (_e = inhabitedTiles_2.return)) _e.call(inhabitedTiles_2);
                }
                finally { if (e_17) throw e_17.error; }
            }
            scale /= inhabitedTiles.size;
            // thus describe the region where they live
            var offset = centroid.minus(civCentroid);
            var region = void 0;
            if (offset.sqr() < scale / 8)
                region = "center";
            else {
                var easting = offset.dot(topic.capital.east);
                var northing = offset.dot(topic.capital.north);
                var bearing = Math.atan2(northing, easting) * 180 / Math.PI;
                if (Math.abs(bearing) > 157.5)
                    region = tidalLock ? "left" : "west";
                else if (bearing > 112.5)
                    region = tidalLock ? "nightleft" : "northwest";
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
            var roundedPopulationPercentage = void 0;
            if (populationFraction > .05)
                roundedPopulationPercentage = Math.round(populationFraction * 20) * 5;
            else if (populationFraction > .01)
                roundedPopulationPercentage = Math.round(populationFraction * 100);
            else
                roundedPopulationPercentage = 1.;
            var populationSentence = format(localize((populationFraction < 2 / 3) ?
                'factbook.demography.minority' :
                'factbook.demography.majority', language), culture.getName().toString(style), localize((inhabitedTiles.size <= topic.getTiles().size / 2) ?
                "factbook.demography.part" :
                "factbook.demography.whole", language), localize("factbook.direction.".concat(region), language), roundedPopulationPercentage, topic.getName().toString(style));
            var standardLect = culture.lect.standardRegister;
            var relatedLect = null;
            try {
                for (var listOfLects_1 = (e_18 = void 0, __values(listOfLects)), listOfLects_1_1 = listOfLects_1.next(); !listOfLects_1_1.done; listOfLects_1_1 = listOfLects_1.next()) {
                    var otherLect = listOfLects_1_1.value;
                    if (otherLect !== standardLect && standardLect.getAncestor(10000) === otherLect.getAncestor(10000)) {
                        relatedLect = otherLect;
                        break;
                    }
                }
            }
            catch (e_18_1) { e_18 = { error: e_18_1 }; }
            finally {
                try {
                    if (listOfLects_1_1 && !listOfLects_1_1.done && (_f = listOfLects_1.return)) _f.call(listOfLects_1);
                }
                finally { if (e_18) throw e_18.error; }
            }
            var languageSentence = void 0;
            if (relatedLect === null)
                languageSentence = format(localize('factbook.demography.language_isolate', language), standardLect.getName().toString(style));
            else
                languageSentence = format(localize('factbook.demography.language_related', language), standardLect.getName().toString(style), relatedLect.getName().toString(style));
            addParagraph(populationSentence + languageSentence + describe(culture, language, style), page, 'p');
        }
    }
    catch (e_15_1) { e_15 = { error: e_15_1 }; }
    finally {
        try {
            if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
        }
        finally { if (e_15) throw e_15.error; }
    }
}
/**
 * format this Culture as a nice short paragraff
 */
function describe(culture, language, style) {
    var str = "";
    for (var i = 0; i < culture.featureLists.length; i++) { // rite each sentence about a cultural facette
        var featureList = culture.featureLists[i];
        var logaIndex = KULTUR_ASPECTS[i].logaIndex;
        if (featureList !== null) {
            var madeUpWord = void 0;
            if (logaIndex !== null)
                madeUpWord = culture.lect
                    .getCommonNoun(featureList[logaIndex].key)
                    .toString(style);
            else
                madeUpWord = null;
            var args = [];
            for (var j = 0; j < culture.featureLists[i].length; j++)
                args.push(localize("factbook.".concat(KULTUR_ASPECTS[i].key, ".").concat(KULTUR_ASPECTS[i].features[j].key, ".").concat(featureList[j].key), language));
            str += format.apply(void 0, __spreadArray(__spreadArray([localize("factbook.".concat(KULTUR_ASPECTS[i].key), language)], __read(args), false), [madeUpWord], false)); // slotting in the specifick attributes and a randomly generated word in case we need it
        }
    }
    // add in a list of some common names
    var names = [];
    var rng = new Random(culture.homeland.index);
    var unusedSeeds = new Set();
    for (var i = 0; i < 2 * NUM_NAMES_TO_LIST * MAX_NUM_NAME_PARTS; i++)
        unusedSeeds.add(i); // make sure the same seed isn't used multiple times
    for (var i = 0; i < NUM_NAMES_TO_LIST; i++) {
        var seeds = [];
        for (var j = 0; j < MAX_NUM_NAME_PARTS; j++) {
            seeds.push(rng.choice(__spreadArray([], __read(unusedSeeds), false)));
            unusedSeeds.delete(seeds[j]);
        }
        names.push(format(localize('grammar.mention', language), culture.lect.getFullName(seeds).toString(style)));
    }
    var nameDescriptor;
    if (language === "en")
        nameDescriptor = culture.getAdjective().toString(style);
    else
        nameDescriptor = culture.getName().toString(style);
    str += format(localize('factbook.demography.common_names', language), nameDescriptor, formatList(names, language));
    return str.trim();
}
/**
 * append some text to the document
 * @param text the content to add
 * @param page the element to which to add it
 * @param type the HTML tag (usually "p", "h1", or "h2")
 */
function addParagraph(text, page, type) {
    if (type === void 0) { type = 'p'; }
    var paragraph = h(type); // start by creating the text element
    paragraph.textContent = text;
    page.children.push(paragraph);
}
//# sourceMappingURL=factsheet.js.map