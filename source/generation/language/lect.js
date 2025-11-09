var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { Random } from "../../utilities/random.js";
import { PROCESS_OPTIONS, StressPlacement } from "./process.js";
import { ipa, transcribe } from "./script.js";
import { Phrase, Word } from "./word.js";
import { decodeBase37 } from "../../utilities/miscellaneus.js";
/** print out debug statements whenever the language generation does anything */
var LOG_ETYMOLOGIES = false;
/** the maximum number of names a person can have */
export var MAX_NUM_NAME_PARTS = 4;
/** the number of centuries that two dialects must evolve independently before they're considered separate languages */
var DEVIATION_TIME = 5;
/** the rate at which suprasegmental linguistic details change per century */
var DRIFT_RATE = .02;
var RootType;
(function (RootType) {
    /** normal words */
    RootType[RootType["COMMON"] = 0] = "COMMON";
    /** words used as common affixes, but that are words in their own rite */
    RootType[RootType["SHORT"] = 1] = "SHORT";
    /** affixen that do not stand alone as words, or grammatical particles */
    RootType[RootType["GRAMMATICAL"] = 2] = "GRAMMATICAL";
})(RootType || (RootType = {}));
var PEOPLE_AFFIX = { english: "people", type: RootType.SHORT };
var LANGUAGE_AFFIX = { english: "language", type: RootType.SHORT };
var COUNTRY_AFFIX = { english: "land", type: RootType.SHORT };
var DESCENDANT_AFFIX = { english: "son", type: RootType.SHORT };
var ADJECTIVE_AFFIX = { english: "y", type: RootType.GRAMMATICAL };
var OCCUPATION_AFFIXES = [
    { english: "er", type: RootType.SHORT },
    { english: "ist", type: RootType.SHORT },
    { english: "professional", type: RootType.SHORT },
];
var CITY_AFFIXES = [
    { english: "ton", type: RootType.SHORT },
    { english: "ham", type: RootType.SHORT },
    { english: "burg", type: RootType.SHORT },
];
var GENDERS = [
    { english: "woman", type: RootType.GRAMMATICAL },
    { english: "man", type: RootType.GRAMMATICAL },
    { english: "neither", type: RootType.GRAMMATICAL },
    { english: "vegetable", type: RootType.GRAMMATICAL },
    { english: "long_object", type: RootType.GRAMMATICAL },
];
/**
 * generate a new format for personal names, either by modifying a preexisting one or generating one from scratch
 */
function rollNewNameStyle(rng, parent) {
    if (parent === void 0) { parent = null; }
    var numGivenNames, parentName, numFamilyNames, originName;
    if (parent === null || rng.probability(DRIFT_RATE))
        numGivenNames = rng.probability(2 / 3) ? 1 : 2;
    else
        numGivenNames = parent.numGivenNames;
    if (parent === null || rng.probability(DRIFT_RATE))
        parentName = rng.probability(1 / 6);
    else
        parentName = parent.parentName;
    if (parent === null || rng.probability(DRIFT_RATE))
        numFamilyNames = rng.probability(1 / 2) ? 0 : (rng.probability(2 / 3) ? 1 : 2);
    else
        numFamilyNames = parent.numFamilyNames;
    if (parent === null || rng.probability(DRIFT_RATE))
        originName = rng.probability(1 / 6);
    else
        originName = parent.originName;
    // remove family names as necessary to prevent these from getting too long
    var numParts = numGivenNames + (parentName ? 1 : 0) + numFamilyNames + (originName ? 1 : 0);
    if (numParts > MAX_NUM_NAME_PARTS)
        numFamilyNames -= numParts - MAX_NUM_NAME_PARTS;
    var givenFirst = rng.probability(2 / 3);
    return { numGivenNames: numGivenNames, parentName: parentName, numFamilyNames: numFamilyNames, originName: originName, givenFirst: givenFirst };
}
/**
 * an immutable definition of a language's vocabulary
 */
var Lect = /** @class */ (function () {
    function Lect(parent, homelandIndex, rng) {
        this.parent = parent;
        this.homelandIndex = homelandIndex;
        if (parent === null || rng.probability(DRIFT_RATE))
            this.defaultTranscriptionStyle = "native".concat(rng.discrete(0, 4));
        else
            this.defaultTranscriptionStyle = parent.defaultTranscriptionStyle;
        this.nameStyle = rollNewNameStyle(rng, (parent !== null) ? parent.nameStyle : null);
        if (parent === null || rng.probability(DRIFT_RATE)) {
            if (rng.probability(1 / 3))
                this.genders = GENDERS.slice(rng.discrete(2, 5));
            else
                this.genders = [];
        }
        else
            this.genders = parent.genders;
        if (parent === null || rng.probability(DRIFT_RATE)) {
            var p = rng.random();
            if (p < 1 / 6)
                this.affixes = {
                    country: null, people: null, language: null, adjective: null
                };
            else if (p < 1 / 3)
                this.affixes = {
                    country: null, people: ADJECTIVE_AFFIX, language: ADJECTIVE_AFFIX, adjective: ADJECTIVE_AFFIX
                };
            else if (p < 1 / 2)
                this.affixes = {
                    country: null, people: PEOPLE_AFFIX, language: LANGUAGE_AFFIX, adjective: null
                };
            else if (p < 2 / 3)
                this.affixes = {
                    country: COUNTRY_AFFIX, people: null, language: LANGUAGE_AFFIX, adjective: null
                };
            else if (p < 5 / 6)
                this.affixes = {
                    country: COUNTRY_AFFIX, people: ADJECTIVE_AFFIX, language: ADJECTIVE_AFFIX, adjective: ADJECTIVE_AFFIX
                };
            else
                this.affixes = {
                    country: COUNTRY_AFFIX, people: PEOPLE_AFFIX, language: LANGUAGE_AFFIX, adjective: PEOPLE_AFFIX
                };
        }
        else {
            this.affixes = parent.affixes;
        }
        if (parent === null || rng.probability(DRIFT_RATE))
            this.prefixing = rng.probability(1 / 5);
        else
            this.prefixing = parent.prefixing;
        this.standardRegister = this.getAncestor(DEVIATION_TIME);
    }
    /**
     * pull a common noun from this language.
     * this is the same as getWord basicly; it just saves the user from having to import RootType.
     * @param english the english meaning
     */
    Lect.prototype.getCommonNoun = function (english) {
        return this.getWord([{ english: english, type: RootType.COMMON }]);
    };
    /**
     * get the name of a place in this language
     * @param index the index of the tile being named
     */
    Lect.prototype.getToponym = function (index) {
        return this.compound({ english: "tile".concat(index), type: RootType.COMMON }, this.affixes.country);
    };
    /**
     * get the name of a people in this language
     * @param index the index of the tile where these people live
     */
    Lect.prototype.getEthnonym = function (index) {
        return this.compound({ english: "tile".concat(index), type: RootType.COMMON }, this.affixes.people);
    };
    /**
     * get the name of a language in this language
     * @param index the index of the tile where this language is spoken
     */
    Lect.prototype.getGlossonym = function (index) {
        return this.compound({ english: "tile".concat(index), type: RootType.COMMON }, this.affixes.language);
    };
    /**
     * get the adjective to describe things from a place in this language
     * @param index the index of the tile that the thing is from
     */
    Lect.prototype.getTopoAdjective = function (index) {
        return this.compound({ english: "tile".concat(index), type: RootType.COMMON }, this.affixes.adjective);
    };
    /**
     * get a full anthroponym given a set of random seeds
     * @param seeds
     */
    Lect.prototype.getFullName = function (seeds) {
        if (seeds.length !== MAX_NUM_NAME_PARTS)
            throw new Error("wrong number of seeds");
        // put in whatever components we want
        var nameParts = [];
        var seedIndex = 0;
        for (var i = 0; i < this.nameStyle.numGivenNames; i++) {
            nameParts.push(this.getWord([
                { english: "person".concat(seeds[seedIndex]), type: RootType.COMMON }
            ]));
            seedIndex++;
        }
        if (this.nameStyle.parentName) {
            nameParts.push(this.getWord([
                { english: "person".concat(seeds[seedIndex]), type: RootType.COMMON },
                DESCENDANT_AFFIX
            ]));
            seedIndex++;
        }
        for (var i = 0; i < this.nameStyle.numFamilyNames; i++) {
            nameParts.push(this.getWord([
                { english: "occupation".concat(seeds[seedIndex]), type: RootType.COMMON },
                OCCUPATION_AFFIXES[seeds[seedIndex] % OCCUPATION_AFFIXES.length]
            ]));
            seedIndex++;
        }
        if (this.nameStyle.originName) { // this one requires "of" to be connected to the city name TODO use a real city name
            var partParts = [
                this.getWord([
                    { english: "of", type: RootType.GRAMMATICAL }
                ]),
                this.getWord([
                    { english: "city".concat(seeds[seedIndex]), type: RootType.COMMON },
                    CITY_AFFIXES[seeds[seedIndex] % CITY_AFFIXES.length]
                ]),
            ];
            if (!this.nameStyle.givenFirst)
                partParts.reverse();
            nameParts.push(new Word(partParts[0].morphemes.concat(partParts[1].morphemes), this)); // fuse "of" at the last second so that it doesn't get eaten by phonological processes
        }
        // account for variable name order
        if (!this.nameStyle.givenFirst)
            nameParts.reverse();
        return new Phrase(nameParts, this);
    };
    /**
     * translate and combine two components according to our preferred order and amount of spacing
     * @param base the content of the compound word
     * @param affix the head to stick before or after it, or null if the base is actually fine on its own
     */
    Lect.prototype.compound = function (base, affix) {
        if (affix === null) {
            return new Phrase([this.getWord([base])], this);
        }
        else {
            return new Phrase([this.getWord([base, affix])], this);
        }
    };
    /**
     * get the language that this was n timesteps ago
     */
    Lect.prototype.getAncestor = function (n) {
        if (n <= 0 || this.parent === null)
            return this;
        else
            return this.parent.getAncestor(n - 1);
    };
    ;
    Lect.prototype.getName = function () {
        return this.getGlossonym(this.homelandIndex);
    };
    return Lect;
}());
export { Lect };
/**
 * an original Lect
 */
var ProtoLect = /** @class */ (function (_super) {
    __extends(ProtoLect, _super);
    function ProtoLect(homelandIndex, rng) {
        var _a;
        var _this = _super.call(this, null, homelandIndex, rng) || this;
        _this.seed = rng.next();
        // choose how many consonants the protolanguage will have
        _this.onsets = ProtoLect.CONSON.slice(0, 6 + rng.binomial(15, .4));
        // choose how many nuclei it will have
        _this.vowels = ProtoLect.VOWELS.slice(0, 3 + rng.binomial(7, .3));
        // choose how many medials it will have, and whether they can be used as medials
        var medials = ProtoLect.MEDIAL.slice(0, 2 + rng.binomial(2, .5));
        if (rng.probability(1 / 3)) {
            (_a = _this.onsets).push.apply(_a, __spreadArray([], __read(medials), false));
            _this.medials = [];
        }
        else {
            _this.medials = medials;
        }
        // choose whether syllables can have codas
        if (rng.probability(2 / 3))
            _this.codas = _this.onsets;
        else
            _this.codas = [];
        _this.complexity = (Math.log10(1 + _this.onsets.length) * ProtoLect.P_ONSET +
            Math.log10(1 + _this.medials.length) * ProtoLect.P_MEDIAL +
            Math.log10(_this.vowels.length) +
            Math.log10(1 + _this.codas.length) * ProtoLect.P_CODA);
        _this.stressRule = new StressPlacement(!_this.prefixing, 1, 1, 'lapse', false);
        _this.roots = new Map();
        return _this;
    }
    ProtoLect.prototype.getWord = function (meaning) {
        var e_1, _a;
        // add the gender ending if one was not explicitly passed
        if (this.genders.length > 0 && meaning[meaning.length - 1].type !== RootType.GRAMMATICAL)
            meaning.push(this.getGender(meaning[meaning.length - 1]));
        // translate each morpheme
        var morphemes = [];
        try {
            for (var meaning_1 = __values(meaning), meaning_1_1 = meaning_1.next(); !meaning_1_1.done; meaning_1_1 = meaning_1.next()) {
                var partMeaning = meaning_1_1.value;
                morphemes.push(this.getRoot(partMeaning));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (meaning_1_1 && !meaning_1_1.done && (_a = meaning_1.return)) _a.call(meaning_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // fuse grammatical morphemes with neibors
        for (var i = 1; i < morphemes.length; i++) {
            if (meaning[i].type === RootType.GRAMMATICAL) {
                if (!this.prefixing)
                    morphemes.splice(i - 1, 2, morphemes[i - 1].concat(morphemes[i]));
                else
                    morphemes.splice(i - 1, 2, morphemes[i].concat(morphemes[i - 1]));
            }
        }
        // adjust the order if this language is head-initial
        if (this.prefixing)
            morphemes.reverse();
        // add some stress
        var result = new Word(this.stressRule.apply(morphemes), this);
        // return the result
        if (LOG_ETYMOLOGIES)
            console.log("new word: [".concat(result.morphemes.map(function (m) { return transcribe(m); }).join("-"), "] means '").concat(meaning.map(function (m) { return m.english; }).join("-"), "'."));
        return result;
    };
    /**
     * generate a new random word root
     * @param meaning the english translation of this root.  the length of this string will be proportional to the
     *                length of the resulting root.  other than that, the exact content of the string doesn't matter;
     *                it's essentially a pseudorandom seed.
     */
    ProtoLect.prototype.getRoot = function (meaning) {
        if (!this.roots.has(meaning)) {
            // decide how many syllables and how heavy to make each syllable
            var length_1;
            if (meaning.type === RootType.GRAMMATICAL)
                length_1 = 1 / this.complexity; // grammatical affixes
            else if (meaning.type === RootType.SHORT)
                length_1 = 2 / this.complexity; // basic words used for compounds
            else
                length_1 = 4 / this.complexity; // other roots
            var seed = this.seed + decodeBase37(meaning.english);
            var rng = new Random(seed);
            var syllableNumber = void 0, multiplier = void 0;
            if (length_1 > 1) {
                syllableNumber = Math.round(length_1 + rng.uniform(-1 / 2, 1 / 2));
                multiplier = 1;
            }
            else {
                syllableNumber = 1;
                multiplier = length_1;
            }
            // generate one syllable at a time
            var mul = [];
            for (var i = 0; i < syllableNumber; i++) {
                if (rng.probability(ProtoLect.P_ONSET * multiplier))
                    mul.push(rng.choice(this.onsets));
                if (this.medials.length > 0 && rng.probability(ProtoLect.P_MEDIAL * multiplier))
                    mul.push(rng.choice(this.medials));
                mul.push(rng.choice(this.vowels));
                if (this.codas.length > 0 && rng.probability(ProtoLect.P_CODA * multiplier))
                    mul.push(rng.choice(this.codas));
            }
            // save it in our cache
            this.roots.set(meaning, mul);
            // print some debug messages, if desired
            if (LOG_ETYMOLOGIES)
                console.log("new root: [".concat(transcribe(mul), "] means '").concat(meaning.english, "'."));
        }
        return this.roots.get(meaning);
    };
    ProtoLect.prototype.getGender = function (meaning) {
        if (this.genders.length === null)
            throw new Error("um actually this language doesn't have grammatical gender.");
        else {
            var seed = this.seed + decodeBase37(meaning.english) + 1;
            var rng = new Random(seed);
            return rng.choice(this.genders);
        }
    };
    ProtoLect.VOWELS = ipa("aiueoəɛɔyø");
    ProtoLect.CONSON = ipa("mnptkshfbdɡzŋʃʔxqvɣθʙ");
    ProtoLect.MEDIAL = ipa("jwlr");
    ProtoLect.P_ONSET = 0.8;
    ProtoLect.P_MEDIAL = 0.3;
    ProtoLect.P_CODA = 0.5;
    return ProtoLect;
}(Lect));
export { ProtoLect };
/**
 * a Lect derived from a ProtoLect with phonological processes
 */
var Dialect = /** @class */ (function (_super) {
    __extends(Dialect, _super);
    function Dialect(parent, homelandIndex, rng) {
        var e_2, _a;
        var _this = _super.call(this, parent, homelandIndex, rng) || this;
        _this.processes = [];
        try {
            for (var PROCESS_OPTIONS_1 = __values(PROCESS_OPTIONS), PROCESS_OPTIONS_1_1 = PROCESS_OPTIONS_1.next(); !PROCESS_OPTIONS_1_1.done; PROCESS_OPTIONS_1_1 = PROCESS_OPTIONS_1.next()) {
                var _b = PROCESS_OPTIONS_1_1.value, chanse = _b.chanse, proces = _b.proces;
                if (rng.probability(chanse))
                    _this.processes.push(proces);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (PROCESS_OPTIONS_1_1 && !PROCESS_OPTIONS_1_1.done && (_a = PROCESS_OPTIONS_1.return)) _a.call(PROCESS_OPTIONS_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return _this;
    }
    Dialect.prototype.getWord = function (meaning) {
        var e_3, _a;
        var oldWord = this.parent.getWord(meaning);
        var morphemes = oldWord.morphemes;
        try {
            for (var _b = __values(this.processes), _c = _b.next(); !_c.done; _c = _b.next()) {
                var change = _c.value;
                morphemes = change.apply(morphemes);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        var newWord = new Word(morphemes, this);
        if (LOG_ETYMOLOGIES)
            if (newWord.toString("ipa") !== oldWord.toString("ipa"))
                console.log("    ".concat(oldWord.toString("ipa"), " -> ").concat(newWord.toString("ipa")));
        return newWord;
    };
    Dialect.prototype.getGender = function (meaning) {
        return this.parent.getGender(meaning);
    };
    return Dialect;
}(Lect));
export { Dialect };
//# sourceMappingURL=lect.js.map