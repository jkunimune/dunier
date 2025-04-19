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
import { format } from "../gui/internationalization.js";
import { WordType } from "../language/lect.js";
import { KULTUR_ASPECTS } from "./culture.js";
import { argmax } from "../utilities/miscellaneus.js";
import { compare } from "../language/script.js";
import { Vector } from "../utilities/geometry.js";
var NUM_CIVS_TO_DESCRIBE = 10;
var PRINT_DEBUGGING_INFORMATION = false;
/**
 * initialize an HTML document and fill it out with a comprehensive description
 * @param map the complete SVG code of the map
 * @param civs the list of Civs that will be described later in the document
 * @param tidalLock whether the planet is tidally locked (if so that changes the names of the cardinal directions)
 * @param transcriptionStyle the spelling style to use for the proper nouns
 */
export function generateFactbook(map, civs, tidalLock, transcriptionStyle) {
    var e_1, _a;
    var listedCivs = chooseMostImportantCivs(civs, transcriptionStyle);
    var doc = document.implementation.createHTMLDocument(format(transcriptionStyle, 'parameter.factbook'));
    generateTitlePage(doc, map, listedCivs, transcriptionStyle);
    try {
        for (var listedCivs_1 = __values(listedCivs), listedCivs_1_1 = listedCivs_1.next(); !listedCivs_1_1.done; listedCivs_1_1 = listedCivs_1.next()) {
            var civ = listedCivs_1_1.value;
            generateFactSheet(doc, civ, tidalLock, transcriptionStyle);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (listedCivs_1_1 && !listedCivs_1_1.done && (_a = listedCivs_1.return)) _a.call(listedCivs_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return doc;
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
    var mostAdvancedIndex = argmax(unlistedCivs.map(function (c) { return c.technology; }));
    listedCivs.push.apply(listedCivs, __spreadArray([], __read(unlistedCivs.splice(mostAdvancedIndex, 1)), false));
    // make sure we include the Civ with the largest population
    var mostPopulusIndex = argmax(unlistedCivs.map(function (c) { return c.getPopulation(); }));
    listedCivs.push.apply(listedCivs, __spreadArray([], __read(unlistedCivs.splice(mostPopulusIndex, 1)), false));
    // then add the 8 remaining Civs with the largest area
    listedCivs.push.apply(listedCivs, __spreadArray([], __read(unlistedCivs.slice(0, NUM_CIVS_TO_DESCRIBE - 2)), false));
    // sort alphabetically before you leave
    return listedCivs.sort(function (a, b) { return compare(a.getName().toString(transcriptionStyle), b.getName().toString(transcriptionStyle), transcriptionStyle); });
}
/**
 * add a page to this document reproducing the map and setting the stage for the rest of the document
 * @param doc the document into which to write this page
 * @param map the complete SVG code of the map
 * @param civs the list of Civs that will be described later in the document
 * @param transcriptionStyle the spelling style to use for the proper nouns
 */
function generateTitlePage(doc, map, civs, transcriptionStyle) {
    var page = document.createElementNS('http://www.w3.org/2000/html', 'div');
    page.setAttribute('style', 'break-after: page');
    doc.body.appendChild(page);
    addParagraph(format(transcriptionStyle, 'factbook.outline.title'), page, 'h1');
    if (civs.length > 0)
        addParagraph(format(transcriptionStyle, 'factbook.outline.lede.some', civs.length, civs.map(function (c) { return c.getName().toString(transcriptionStyle); })), page, 'p');
    else
        addParagraph(format(transcriptionStyle, 'factbook.outline.lede.none'), page, 'p');
    var importedMap = map.cloneNode(true);
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
function generateFactSheet(doc, topic, tidalLock, transcriptionStyle) {
    var page = document.createElementNS('http://www.w3.org/2000/html', 'div');
    page.setAttribute('style', 'break-after: page');
    doc.body.appendChild(page);
    addParagraph(format(transcriptionStyle, 'factbook.outline.section_header', topic.getName(), topic.getName().pronunciation()), page, 'h2');
    addParagraph(format(transcriptionStyle, 'factbook.stats', topic.getLandArea(), topic.getPopulation()), page, 'p');
    addHistorySection(page, topic, transcriptionStyle);
    addGeographySection(page, topic, tidalLock, transcriptionStyle);
    addDemographicsSection(page, topic, tidalLock, transcriptionStyle);
}
/**
 * add some paragraphs to this page recounting the history of the given country
 */
function addHistorySection(page, topic, transcriptionStyle) {
}
/**
 * add some paragraphs to this page detailing the geography of the given country
 */
function addGeographySection(page, topic, tidalLock, transcriptionStyle) {
    var e_2, _a, e_3, _b, e_4, _c, e_5, _d, e_6, _e, e_7, _f, e_8, _g, e_9, _h;
    // look at every tile adjacent to this country
    var adjacentLand = new Set();
    var adjacentWater = new Set();
    try {
        for (var _j = __values(topic.border.keys()), _k = _j.next(); !_k.done; _k = _j.next()) {
            var borderTile = _k.value;
            try {
                for (var _l = (e_3 = void 0, __values(topic.border.get(borderTile))), _m = _l.next(); !_m.done; _m = _l.next()) {
                    var adjacentTile = _m.value;
                    if (borderTile.isWater() || adjacentTile.isWater())
                        adjacentWater.add(adjacentTile);
                    else
                        adjacentLand.add(adjacentTile);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_m && !_m.done && (_b = _l.return)) _b.call(_l);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_k && !_k.done && (_a = _j.return)) _a.call(_j);
        }
        finally { if (e_2) throw e_2.error; }
    }
    var numLandBorders = adjacentLand.size;
    var numWaterBorders = adjacentWater.size;
    // group them by polity
    var adjacentCivs = new Map();
    try {
        for (var adjacentLand_1 = __values(adjacentLand), adjacentLand_1_1 = adjacentLand_1.next(); !adjacentLand_1_1.done; adjacentLand_1_1 = adjacentLand_1.next()) {
            var adjacentTile = adjacentLand_1_1.value;
            var adjacentCiv = void 0;
            if (topic.world.politicalMap.has(adjacentTile)) {
                adjacentCiv = topic.world.politicalMap.get(adjacentTile);
                if (!adjacentCivs.has(adjacentCiv))
                    adjacentCivs.set(adjacentCiv, new Set());
                adjacentCivs.get(adjacentCiv).add(adjacentTile);
            }
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (adjacentLand_1_1 && !adjacentLand_1_1.done && (_c = adjacentLand_1.return)) _c.call(adjacentLand_1);
        }
        finally { if (e_4) throw e_4.error; }
    }
    // decide how to describe the border
    var borderSpecifier;
    if (adjacentCivs.size === 0) {
        // if there's noting there, say so
        borderSpecifier = 'factbook.geography.nothing';
    }
    else if (adjacentCivs.size === 1) {
        try {
            // if there's one civ, get its name out of the Map and use just that
            for (var _o = __values(adjacentCivs.keys()), _p = _o.next(); !_p.done; _p = _o.next()) {
                var neighboringCiv = _p.value;
                borderSpecifier = neighboringCiv.getName();
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_p && !_p.done && (_d = _o.return)) _d.call(_o);
            }
            finally { if (e_5) throw e_5.error; }
        }
    }
    else {
        // otherwise, ascertain the average direction to each adjacent polity
        var borders = new Map();
        try {
            for (var _q = __values(adjacentCivs.keys()), _r = _q.next(); !_r.done; _r = _q.next()) {
                var neighboringCiv = _r.value;
                var borderLength = adjacentCivs.get(neighboringCiv).size;
                var borderCentroid = new Vector(0, 0, 0);
                try {
                    for (var _s = (e_7 = void 0, __values(adjacentCivs.get(neighboringCiv))), _t = _s.next(); !_t.done; _t = _s.next()) {
                        var adjacentTile = _t.value;
                        borderCentroid = borderCentroid.plus(adjacentTile.pos);
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (_t && !_t.done && (_f = _s.return)) _f.call(_s);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
                borderCentroid = borderCentroid.over(borderLength);
                var offset = borderCentroid.minus(topic.capital.pos);
                var easting = offset.dot(topic.capital.east);
                var northing = offset.dot(topic.capital.north);
                console.log("for a Tile located at <".concat(topic.capital.pos.x, ", ").concat(topic.capital.pos.y, ", ").concat(topic.capital.pos.z));
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
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_r && !_r.done && (_e = _q.return)) _e.call(_q);
            }
            finally { if (e_6) throw e_6.error; }
        }
        var borderDescriptions = [];
        try {
            for (var _u = __values(borders.keys()), _v = _u.next(); !_v.done; _v = _u.next()) {
                var direction = _v.value;
                var neighborNames = [];
                try {
                    for (var _w = (e_9 = void 0, __values(borders.get(direction))), _x = _w.next(); !_x.done; _x = _w.next()) {
                        var neighbor = _x.value;
                        neighborNames.push(neighbor.getName().toString(transcriptionStyle));
                    }
                }
                catch (e_9_1) { e_9 = { error: e_9_1 }; }
                finally {
                    try {
                        if (_x && !_x.done && (_h = _w.return)) _h.call(_w);
                    }
                    finally { if (e_9) throw e_9.error; }
                }
                neighborNames.sort(function (a, b) { return compare(a, b, transcriptionStyle); });
                borderDescriptions.push(format(transcriptionStyle, 'factbook.geography.neibor_direction', neighborNames, "factbook.direction.".concat(direction)));
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_v && !_v.done && (_g = _u.return)) _g.call(_u);
            }
            finally { if (e_8) throw e_8.error; }
        }
        borderSpecifier = borderDescriptions;
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
    addParagraph(format(transcriptionStyle, "factbook.geography.".concat(type), topic.getName(), borderSpecifier), page, 'p');
}
/**
 * add some paragraphs to this page listing and describing the peoples of the given country
 */
function addDemographicsSection(page, topic, tidalLock, transcriptionStyle) {
    var e_10, _a, e_11, _b, e_12, _c, e_13, _d;
    // calculate the centroid of the whole country
    var civCentroid = new Vector(0, 0, 0);
    try {
        for (var _e = __values(topic.tileTree.keys()), _f = _e.next(); !_f.done; _f = _e.next()) {
            var tile = _f.value;
            civCentroid = civCentroid.plus(tile.pos);
        }
    }
    catch (e_10_1) { e_10 = { error: e_10_1 }; }
    finally {
        try {
            if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
        }
        finally { if (e_10) throw e_10.error; }
    }
    civCentroid = civCentroid.over(topic.tileTree.size);
    try {
        // for each culture in this civ
        for (var _g = __values(topic.getCultures()), _h = _g.next(); !_h.done; _h = _g.next()) {
            var _j = _h.value, culture = _j.culture, populationFraction = _j.populationFraction, inhabitedTiles = _j.inhabitedTiles;
            // find its geographic center of mass and the country's moment of inertia about it
            var centroid = new Vector(0, 0, 0);
            try {
                for (var inhabitedTiles_1 = (e_12 = void 0, __values(inhabitedTiles)), inhabitedTiles_1_1 = inhabitedTiles_1.next(); !inhabitedTiles_1_1.done; inhabitedTiles_1_1 = inhabitedTiles_1.next()) {
                    var tile = inhabitedTiles_1_1.value;
                    centroid = centroid.plus(tile.pos);
                }
            }
            catch (e_12_1) { e_12 = { error: e_12_1 }; }
            finally {
                try {
                    if (inhabitedTiles_1_1 && !inhabitedTiles_1_1.done && (_c = inhabitedTiles_1.return)) _c.call(inhabitedTiles_1);
                }
                finally { if (e_12) throw e_12.error; }
            }
            centroid = centroid.over(inhabitedTiles.size);
            var scale = 0;
            try {
                for (var inhabitedTiles_2 = (e_13 = void 0, __values(inhabitedTiles)), inhabitedTiles_2_1 = inhabitedTiles_2.next(); !inhabitedTiles_2_1.done; inhabitedTiles_2_1 = inhabitedTiles_2.next()) {
                    var tile = inhabitedTiles_2_1.value;
                    scale += tile.pos.minus(centroid).sqr();
                }
            }
            catch (e_13_1) { e_13 = { error: e_13_1 }; }
            finally {
                try {
                    if (inhabitedTiles_2_1 && !inhabitedTiles_2_1.done && (_d = inhabitedTiles_2.return)) _d.call(inhabitedTiles_2);
                }
                finally { if (e_13) throw e_13.error; }
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
            addParagraph(format(transcriptionStyle, (populationFraction < 2 / 3) ?
                'factbook.demography.minority' :
                'factbook.demography.majority', culture.getName(), (inhabitedTiles.size <= topic.tileTree.size / 2) ?
                "factbook.demography.part" :
                "factbook.demography.whole", "factbook.direction.".concat(region), Math.round(populationFraction * 100), topic.getName()) +
                describe(culture, transcriptionStyle), page, 'p');
            if (PRINT_DEBUGGING_INFORMATION)
                addParagraph("that culture has the following classes: [".concat(__spreadArray([], __read(culture.klas), false).join(", "), "]"), page, 'p');
        }
    }
    catch (e_11_1) { e_11 = { error: e_11_1 }; }
    finally {
        try {
            if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
        }
        finally { if (e_11) throw e_11.error; }
    }
}
/**
 * format this Culture as a nice short paragraff
 */
function describe(culture, transcriptionStyle) {
    var str = "";
    for (var i = 0; i < culture.featureLists.length; i++) { // rite each sentence about a cultural facette TODO: only show some informacion for each country
        var featureList = culture.featureLists[i];
        var logaIndex = KULTUR_ASPECTS[i].logaIndex;
        if (featureList !== null) {
            var madeUpWord = void 0;
            if (logaIndex !== null)
                madeUpWord = culture.lect.getName(featureList[logaIndex].key, WordType.OTHER);
            else
                madeUpWord = null;
            var keys = [];
            for (var j = 0; j < culture.featureLists[i].length; j++)
                keys.push("factbook.".concat(KULTUR_ASPECTS[i].key, ".").concat(KULTUR_ASPECTS[i].features[j].key, ".").concat(featureList[j].key));
            str += format.apply(void 0, __spreadArray(__spreadArray([transcriptionStyle, "factbook.".concat(KULTUR_ASPECTS[i].key)], __read(keys), false), [madeUpWord], false)); // slotting in the specifick attributes and a randomly generated word in case we need it
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
function addParagraph(text, page, type) {
    if (type === void 0) { type = 'p'; }
    var paragraph = document.createElementNS('http://www.w3.org/2000/html', type); // start by creating the text element
    paragraph.innerHTML = text;
    page.appendChild(paragraph);
}
//# sourceMappingURL=factsheet.js.map