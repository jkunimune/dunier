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
import { Random } from "../utilities/random.js";
import { DEFAULT_STRESS, WORD_PROCESS_OPTIONS, PHRASE_PROCESS_OPTIONS } from "./process.js";
import { ipa } from "./script.js";
import { Name } from "./name.js";
import { Enumify } from "../libraries/enumify.js";
import { decodeBase37 } from "../utilities/miscellaneus.js";
var DEVIATION_TIME = 2; // TODO: replace this with a number of sound changes
/**
 * different types of nym
 */
var WordType = /** @class */ (function (_super) {
    __extends(WordType, _super);
    function WordType(index, numClassifiers, asString) {
        var _this = _super.call(this) || this;
        _this.index = index;
        _this.numClassifiers = numClassifiers;
        _this.asString = asString;
        return _this;
    }
    WordType.PEOPLE = new WordType(0, 1, 'people');
    WordType.LANGUAGE = new WordType(1, 1, 'language');
    WordType.COUNTRY = new WordType(2, 3, 'country');
    WordType.CITY = new WordType(3, 6, 'city');
    WordType.FAMILY = new WordType(4, 12, 'family');
    WordType.OTHER = new WordType(5, 0, 'other');
    WordType._ = WordType.closeEnum();
    return WordType;
}(Enumify));
export { WordType };
/**
 * a collection of similar words.
 */
var Lect = /** @class */ (function () {
    function Lect(defaultStyle, rightBranching) {
        this.defaultStyle = defaultStyle;
        this.prefixing = rightBranching;
    }
    /**
     * is this language actually a dialect of lang?
     */
    Lect.prototype.isIntelligible = function (lang) {
        return this.macrolanguage === lang.macrolanguage;
    };
    return Lect;
}());
export { Lect };
var ProtoLang = /** @class */ (function (_super) {
    __extends(ProtoLang, _super);
    function ProtoLang(rng) {
        var e_1, _a;
        var _this = _super.call(this, "native".concat(rng.discrete(0, 4)), rng.probability(0.2)) || this;
        _this.macrolanguage = _this;
        _this.nConson = 7 + rng.binomial(18, .5); // choose how many consonants the protolanguage will have
        _this.nVowel = 5 + rng.binomial(5, .1); // choose how many nuclei it will have
        _this.nMedial = (_this.nConson > ProtoLang.R_INDEX) ? 4 : 0;
        _this.complexity = 2 * Math.log10(1 + _this.nConson)
            + Math.log10(1 + _this.nMedial) + Math.log10(1 + _this.nVowel);
        _this.fin = [];
        var numGenders = rng.probability(.3) ? 0 : rng.discrete(2, 6);
        for (var i = 0; i < numGenders; i++) // choose how much basic suffixing to do
            _this.fin.push(_this.noveMul('fmncrh'[i], 0.5));
        _this.diversity = rng.uniform(0, 1); // choose how much lexical suffixing to do
        _this.name = new Map();
        _this.classifiers = new Map();
        try {
            for (var WordType_1 = __values(WordType), WordType_1_1 = WordType_1.next(); !WordType_1_1.done; WordType_1_1 = WordType_1.next()) {
                var wordType = WordType_1_1.value;
                _this.name.set(wordType, new Map());
                _this.classifiers.set(wordType, []);
                for (var i = 0; i < Math.round(_this.diversity * wordType.numClassifiers); i++) // TODO countries can be named after cities
                    _this.classifiers.get(wordType).push(_this.noveLoga("".concat(wordType.asString).concat(i), Math.max(1, 1.5 / _this.complexity)));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (WordType_1_1 && !WordType_1_1.done && (_a = WordType_1.return)) _a.call(WordType_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return _this;
    }
    ProtoLang.prototype.getName = function (index, tipo) {
        if (!this.name.get(tipo).has(index)) {
            var base = this.noveLoga(index, Math.max(1, 4 / this.complexity)); // get the base
            if (base.length === 0)
                throw new Error("this new word is empty; it was supposed to have ".concat(4 / this.complexity, " syllables"));
            var nameParts = void 0;
            if (this.classifiers.get(tipo).length === 0)
                nameParts = [base];
            else {
                var seed = decodeBase37(index) + 100;
                var rng = new Random(seed);
                var classifierOptions = this.classifiers.get(tipo);
                var classifier = rng.choice(classifierOptions);
                if (this.prefixing)
                    nameParts = [classifier, base];
                else
                    nameParts = [base, classifier];
            }
            this.name.get(tipo).set(index, new Name(nameParts, this));
        }
        return this.name.get(tipo).get(index);
    };
    /**
     * generate a new random word, including a gender affix
     * @param index the pseudorandom seed for this root
     * @param syllables the number of syllables in the root
     */
    ProtoLang.prototype.noveLoga = function (index, syllables) {
        var root = this.noveMul(index, syllables);
        if (this.fin.length === 0)
            return DEFAULT_STRESS.apply(root);
        else {
            var seed = decodeBase37(index);
            var rng = new Random(seed);
            var affix = rng.choice(this.fin);
            if (this.prefixing)
                return DEFAULT_STRESS.apply(affix.concat(root));
            else
                return DEFAULT_STRESS.apply(root.concat(affix));
        }
    };
    /**
     * generate a new random word root
     * @param index the pseudorandom seed for this root as a lowercase base-36 string
     * @param syllables the number of syllables in this root
     */
    ProtoLang.prototype.noveMul = function (index, syllables) {
        var seed = decodeBase37(index);
        var rng = new Random(seed);
        var syllableNumber = Math.ceil(syllables);
        var syllableSize = syllables / syllableNumber;
        var mul = [];
        for (var i = 0; i < syllableNumber; i++) {
            if (rng.probability(ProtoLang.P_ONSET * syllableSize))
                mul.push(rng.choice(ProtoLang.CONSON.slice(0, this.nConson)));
            if (this.nMedial > 0 && rng.probability(ProtoLang.P_MEDIAL * syllableSize))
                mul.push(rng.choice(ProtoLang.MEDIAL.slice(0, this.nMedial)));
            if (rng.probability(ProtoLang.P_NUCLEUS * syllableSize))
                mul.push(rng.choice(ProtoLang.VOWELS.slice(0, this.nVowel)));
            if (rng.probability(ProtoLang.P_CODA * syllableSize))
                mul.push(rng.choice(ProtoLang.CONSON.slice(0, this.nConson)));
        }
        return mul;
    };
    ProtoLang.prototype.getAncestor = function (_n) {
        return this;
    };
    ProtoLang.prototype.isIntelligible = function (lang) {
        return this === lang;
    };
    ProtoLang.VOWELS = ipa("aiueoəɛɔyø");
    ProtoLang.CONSON = ipa("mnptksljwhfbdɡrzŋʃʔxqvɣθʙ");
    ProtoLang.MEDIAL = ipa("ljwr");
    ProtoLang.R_INDEX = ProtoLang.CONSON.indexOf(ipa("r")[0]); // note the index of r, because it's phonotactically important
    ProtoLang.P_ONSET = 0.8;
    ProtoLang.P_MEDIAL = 0.4;
    ProtoLang.P_NUCLEUS = 2.0;
    ProtoLang.P_CODA = 0.4;
    return ProtoLang;
}(Lect));
export { ProtoLang };
var Dialect = /** @class */ (function (_super) {
    __extends(Dialect, _super);
    function Dialect(parent, rng) {
        var e_2, _a, e_3, _b;
        var _this = _super.call(this, parent.defaultStyle, parent.prefixing) || this;
        _this.parent = parent;
        _this.macrolanguage = _this.getAncestor(DEVIATION_TIME);
        _this.wordProcesses = [];
        _this.phraseProcesses = [];
        try {
            for (var WORD_PROCESS_OPTIONS_1 = __values(WORD_PROCESS_OPTIONS), WORD_PROCESS_OPTIONS_1_1 = WORD_PROCESS_OPTIONS_1.next(); !WORD_PROCESS_OPTIONS_1_1.done; WORD_PROCESS_OPTIONS_1_1 = WORD_PROCESS_OPTIONS_1.next()) {
                var _c = WORD_PROCESS_OPTIONS_1_1.value, chanse = _c.chanse, proces = _c.proces;
                if (rng.probability(chanse))
                    _this.wordProcesses.push(proces);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (WORD_PROCESS_OPTIONS_1_1 && !WORD_PROCESS_OPTIONS_1_1.done && (_a = WORD_PROCESS_OPTIONS_1.return)) _a.call(WORD_PROCESS_OPTIONS_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        try {
            for (var PHRASE_PROCESS_OPTIONS_1 = __values(PHRASE_PROCESS_OPTIONS), PHRASE_PROCESS_OPTIONS_1_1 = PHRASE_PROCESS_OPTIONS_1.next(); !PHRASE_PROCESS_OPTIONS_1_1.done; PHRASE_PROCESS_OPTIONS_1_1 = PHRASE_PROCESS_OPTIONS_1.next()) {
                var _d = PHRASE_PROCESS_OPTIONS_1_1.value, chanse = _d.chanse, proces = _d.proces;
                if (rng.probability(chanse))
                    _this.phraseProcesses.push(proces);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (PHRASE_PROCESS_OPTIONS_1_1 && !PHRASE_PROCESS_OPTIONS_1_1.done && (_b = PHRASE_PROCESS_OPTIONS_1.return)) _b.call(PHRASE_PROCESS_OPTIONS_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return _this;
    }
    Dialect.prototype.getName = function (index, tipo) {
        return this.applyChanges(this.parent.getName(index, tipo));
    };
    Dialect.prototype.applyChanges = function (lekse) {
        var e_4, _a, e_5, _b, e_6, _c;
        var newParts = [];
        try {
            for (var _d = __values(lekse.parts), _e = _d.next(); !_e.done; _e = _d.next()) {
                var part = _e.value;
                try {
                    for (var _f = (e_5 = void 0, __values(this.wordProcesses)), _g = _f.next(); !_g.done; _g = _f.next()) {
                        var change = _g.value;
                        part = change.apply(part);
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
                newParts.push(part);
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_4) throw e_4.error; }
        }
        var newLekse = new Name(newParts, lekse.language);
        try {
            for (var _h = __values(this.phraseProcesses), _j = _h.next(); !_j.done; _j = _h.next()) {
                var change = _j.value;
                newLekse = change.apply(newLekse);
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
            }
            finally { if (e_6) throw e_6.error; }
        }
        return newLekse;
    };
    Dialect.prototype.getAncestor = function (n) {
        if (n <= 0)
            return this;
        else
            return this.parent.getAncestor(n - 1);
    };
    return Dialect;
}(Lect));
export { Dialect };
//# sourceMappingURL=lect.js.map