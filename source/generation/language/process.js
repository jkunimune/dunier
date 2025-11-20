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
var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { Sound, Klas, Latia, Loke, Longia, MinorLoke, Mode, Nosia, Quality, Silabia, Voze, parseFeature } from "./sound.js";
import { ipaSymbol, transcribe } from "./script.js";
import UNPARSED_PROCESS_OPTIONS from "../../../resources/processes.js";
/**
 * a process that applies to the sounds within a morpheme
 */
var LocalProcess = /** @class */ (function () {
    function LocalProcess() {
    }
    LocalProcess.prototype.apply = function (old) {
        var e_5, _a;
        var nue = [];
        try {
            for (var old_1 = __values(old), old_1_1 = old_1.next(); !old_1_1.done; old_1_1 = old_1.next()) {
                var oldPart = old_1_1.value;
                nue.push(this.applyToSounds(oldPart));
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (old_1_1 && !old_1_1.done && (_a = old_1.return)) _a.call(old_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return nue;
    };
    return LocalProcess;
}());
/**
 * a process that applies to all sounds, ignoring morpheme boundaries
 */
var GlobalProcess = /** @class */ (function () {
    function GlobalProcess() {
    }
    GlobalProcess.prototype.apply = function (old) {
        var allOld = [].concat.apply([], __spreadArray([], __read(old), false));
        var allNew = this.applyToSounds(allOld);
        var nue = [];
        var j = 0;
        for (var i = 0; i < old.length; i++) {
            nue.push(allNew.slice(j, j + old[i].length));
            j += old[i].length;
        }
        if (j !== allNew.length)
            throw new Error("global processes aren't allowed to change the number of sounds in a word.");
        return nue;
    };
    return GlobalProcess;
}());
/**
 * a process that causes segments to change according to a rule
 */
var SoundChange = /** @class */ (function (_super) {
    __extends(SoundChange, _super);
    function SoundChange(from, to, idx, after, before, oneTimeUse) {
        var _this = _super.call(this) || this;
        if (idx.length !== to.length)
            throw RangeError("The pa array must be properly indexed: ".concat(from, " > ").concat(to, " / ").concat(after, " _ ").concat(before));
        _this.pattern = from;
        _this.result = to;
        _this.idx = idx;
        _this.pre = after;
        _this.post = before;
        _this.oneTimeUse = oneTimeUse;
        return _this;
    }
    /**
     * go through the word and apply this sound change.
     * @param oldWord
     */
    SoundChange.prototype.applyToSounds = function (oldWord) {
        var drowWen = []; // build the neWword in reverse
        var i = oldWord.length;
        while (i >= 0) {
            if (this.applies(oldWord.slice(0, i), drowWen)) { // if it applies here,
                for (var j = this.result.length - 1; j >= 0; j--) { // fill in the replacement
                    if (this.idx[j] < this.pattern.length) {
                        var ref = // choose an appropriate reference phoneme if there's a ± feature
                         void 0; // choose an appropriate reference phoneme if there's a ± feature
                        if (this.result[j].referencesAnything()) {
                            if (this.pattern.length === 2 && this.pre.length === 0 && this.post.length === 0)
                                ref = oldWord[i - this.idx[j] - 1];
                            else if (this.pattern.length === 1 && this.pre.length > 0 && this.post.length === 0)
                                ref = oldWord[i - 2];
                            else if (this.pattern.length === 1 && this.pre.length === 0 && this.post.length > 0)
                                ref = oldWord[i];
                            else
                                throw new Error("I don't know what ref to use for this \u00B1 expression in ".concat(this));
                        }
                        else {
                            ref = null;
                        }
                        drowWen.push(this.result[j].apply(oldWord[i + this.idx[j] - this.pattern.length], ref)); // mapping to the relevant old segments
                    }
                    else
                        drowWen.push(this.result[j].apply()); // or drawing new segments from thin air
                }
                if (this.oneTimeUse) {
                    drowWen.push.apply(drowWen, __spreadArray([], __read(oldWord.slice(0, i - this.pattern.length).reverse()), false));
                    break; // if we mustn't continue, skip to the end
                }
                else
                    i -= this.pattern.length; // otherwise, jump to the next set of consonants
            }
            else { // if not
                i -= 1;
                if (i >= 0)
                    drowWen.push(oldWord[i]); // just add the next character of old
            }
        }
        var newWord = drowWen.reverse();
        // if this change would make the word too short, cancel it
        if (newWord.length < oldWord.length && newWord.length < 3)
            return oldWord;
        else
            return newWord;
    };
    /**
     * does the segment string at the end of oldWord qualify to be changed?
     * @param oldWord the unchanged word where we are considering making the change
     * @param novWord the already changed following section of the word, reversed
     */
    SoundChange.prototype.applies = function (oldWord, novWord) {
        if (this.pattern.length > oldWord.length) // make sure the word is long enuff to fit the whole pattern
            return false;
        for (var j = 0; j < this.pre.length; j++) { // start with the left half of the context
            if (j - this.pattern.length - this.pre.length + oldWord.length >= 0) {
                if (!this.pre[j].matches(oldWord[j - this.pattern.length - this.pre.length + oldWord.length])) // check if it matches
                    return false;
            }
            else {
                if (!this.pre[j].matchesSilence())
                    return false;
            }
        }
        for (var j = 0; j < this.pattern.length; j++) // then check the text that will be replaced
            if (!this.pattern[j].matches(oldWord[oldWord.length - this.pattern.length + j]))
                return false;
        for (var j = 0; j < this.post.length; j++) { // then check the right half of the context
            if (novWord.length - 1 - j >= 0) {
                if (!this.post[j].matches(novWord[novWord.length - 1 - j]))
                    return false;
            }
            else {
                if (!this.post[j].matchesSilence())
                    return false;
            }
        }
        return true;
    };
    SoundChange.prototype.toString = function () {
        return "".concat(this.pattern.join(" "), " > ").concat(this.result.join(" "), " / ").concat(this.pre.join(' '), " _ ").concat(this.post.join(" "));
    };
    return SoundChange;
}(LocalProcess));
export { SoundChange };
/**
 * a process that causes sounds in the same word to share a feature
 */
var Harmony = /** @class */ (function (_super) {
    __extends(Harmony, _super);
    /**
     * construct a new Harmony process on a given feature
     * @param leftPole a class of sounds that doesn't mix with the other class
     * @param rightPole the other class of sounds that deosn't mix with the first class
     * @param affected the class of sounds that are affected by this harmony
     */
    function Harmony(leftPole, rightPole, affected) {
        var _this = _super.call(this) || this;
        _this.affected = affected;
        _this.poles = [leftPole, rightPole];
        return _this;
    }
    Harmony.prototype.applyToSounds = function (oldWord) {
        var e_6, _a;
        var newWord = new Array(oldWord.length);
        var val = null;
        for (var i = 0; i < oldWord.length; i++) { // iterate backwards through the word
            newWord[i] = oldWord[i]; // in most cases, we will just make this the same as it was in the old word
            if (oldWord[i].is(this.affected)) { // but if this segment isn't immune
                try {
                    for (var _b = (e_6 = void 0, __values(this.poles)), _c = _b.next(); !_c.done; _c = _b.next()) { // check its polarity
                        var feature = _c.value;
                        if (oldWord[i].is(feature)) { // if it's polar,
                            if (val !== null) // change this sound to match what came before
                                newWord[i] = oldWord[i].with(val); // and add it to the new word
                            else // or read the property to match if we haven't seen this yet
                                val = feature;
                            break;
                        } // if it's neutral, just ignore it without resetting val or changing anything
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
            }
        }
        return newWord;
    };
    return Harmony;
}(GlobalProcess));
export { Harmony };
/**
 * a process that places syllables according to the sonority sequencing constraint
 */
var Syllabicization = /** @class */ (function (_super) {
    __extends(Syllabicization, _super);
    /**
     * set up a new syllable placement system
     * @param bias a positive number indicates that /iuiu/ is [juju], negative indicates [iwiw],
     *             and zero indicates [iuiu]
     * @param minSonority the sonority of the most sordid allowable nucleus; if a peak is too sordid,
     *                    a schwa will be inserted
     */
    function Syllabicization(bias, minSonority) {
        var _this = _super.call(this) || this;
        _this.bias = bias;
        _this.minSonority = minSonority;
        return _this;
    }
    Syllabicization.prototype.applyToSounds = function (oldWord) {
        var e_7, _a;
        var sonority = [];
        try {
            for (var oldWord_1 = __values(oldWord), oldWord_1_1 = oldWord_1.next(); !oldWord_1_1.done; oldWord_1_1 = oldWord_1.next()) {
                var sound = oldWord_1_1.value;
                sonority.push(sound.getSonority());
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (oldWord_1_1 && !oldWord_1_1.done && (_a = oldWord_1.return)) _a.call(oldWord_1);
            }
            finally { if (e_7) throw e_7.error; }
        }
        var weNeedANewStress = false;
        var newWord = []; // then copy the old word
        for (var i = 0; i < oldWord.length; i++) { // and assign syllables accordingly
            var c = sonority[i];
            var l = (i - 1 >= 0) ? sonority[i - 1] : -Infinity;
            var r = (i + 1 < oldWord.length) ? sonority[i + 1] : -Infinity;
            // if it is a local maximum of sonority, make it syllabic
            if (c >= l && c >= r && !(this.bias < 0 && c === l && c > r) && !(this.bias > 0 && c > l && c === r)) { // if it is a peak
                var desiredLevelOfStress = void 0;
                if (weNeedANewStress)
                    desiredLevelOfStress = Silabia.PRIMARY_STRESSED;
                else if (oldWord[i].is(Quality.SYLLABIC))
                    desiredLevelOfStress = oldWord[i].silabia;
                else
                    desiredLevelOfStress = Silabia.UNSTRESSED;
                weNeedANewStress = false;
                // if it's invalid as a syllable nucleus, insert an epenthetic schwa
                if (oldWord[i].getSonority() < this.minSonority) {
                    newWord.push(new Sound(Mode.OPEN_MID, Loke.CENTRAL, Voze.VOICED, oldWord[i].silabia, Longia.SHORT, Latia.MEDIAN, MinorLoke.UNROUNDED, Nosia.ORAL).with(desiredLevelOfStress));
                    newWord.push(oldWord[i].with(Silabia.NONSYLLABIC));
                }
                // otherwise, just make it syllabic
                else
                    newWord.push(oldWord[i].with(desiredLevelOfStress));
            }
            // otherwise make it nonsyllabic
            else {
                if (oldWord[i].silabia === Silabia.PRIMARY_STRESSED)
                    weNeedANewStress = true; // make a note if it carried the primary stress
                newWord.push(oldWord[i].with(Silabia.NONSYLLABIC));
            }
        }
        // if you didn't manage to replace the primary stress, put it on the last syllable
        if (weNeedANewStress) {
            for (var i = newWord.length - 1; i >= 0; i--) {
                if (newWord[i].is(Quality.SYLLABIC)) {
                    newWord[i] = newWord[i].with(Silabia.PRIMARY_STRESSED);
                    return newWord;
                }
            }
            throw new Error("if you got this far, it means there are no syllables in " +
                "[".concat(transcribe(newWord), "]"));
        }
        else
            return newWord;
    };
    return Syllabicization;
}(LocalProcess));
export { Syllabicization };
/**
 * a process that places stress according to certain rules
 */
var StressPlacement = /** @class */ (function (_super) {
    __extends(StressPlacement, _super);
    /**
     * create a new stress system given some simplified parameters
     * @param reverse whether to assign stress to the end of the word rather than the start
     * @param headSize the number of syllables between the primary stress and the start of the word
     * @param attractors the minimum attractiveness of a syllable to take the stress away from its normal head
     *                   position (an open syllable has weight 0, a long vowel has weight 2, and any other closed
     *                   syllable has weight 1)
     * @param tailMode how to handle stress away from the primary – either "lapse" to put in as much stress as possible
     *                 without having any adjacent stressed syllables, "clash" to put in as little stress as possible
     *                 without ever having adjacent unstressed syllables, or "none" to have no secondary stress at all.
     * @param lengthen whether to lengthen stressed open syllables
     */
    function StressPlacement(reverse, headSize, attractors, tailMode, lengthen) {
        var _this = _super.call(this) || this;
        _this.reverse = reverse;
        _this.headSize = headSize;
        _this.attractors = attractors;
        _this.tailMode = tailMode;
        _this.lengthen = lengthen;
        return _this;
    }
    StressPlacement.prototype.applyToSounds = function (oldWord) {
        // stress doesn't care about morpheme boundaries, so start by flattening these
        var nuclei = [];
        var numC = 1;
        for (var i = oldWord.length - 1; i >= 0; i--) { // first, tally up the syllables
            if (oldWord[i].is(Quality.SYLLABIC)) { // using syllabicity to identify nuclei
                if (oldWord[i].is(Longia.LONG))
                    nuclei.push({ i: i, weight: 2 }); // long vowels have weight 2
                else if (numC > 1)
                    nuclei.push({ i: i, weight: 1 }); // codas have weight 1
                else
                    nuclei.push({ i: i, weight: 0 }); // open syllables have weight 0
                numC = 0;
            }
            else {
                numC += (oldWord[i].is(Longia.LONG)) ? 2 : 1; // long consonants count as two segments for this purpose
            }
        }
        if (!this.reverse) // choose the correct orientation
            nuclei = nuclei.reverse();
        var stress = new Array(nuclei.length);
        var lapse = 0;
        for (var i = 0; i < nuclei.length; i++) {
            if (nuclei[i].weight >= this.attractors) // if this is a stress attractor
                stress[i] = true;
            else if (lapse === i && (i === this.headSize || i === nuclei.length - 1)) // if this is the head
                stress[i] = true;
            else if (lapse === i && i < this.headSize) // keep ordinary stress off the pre-primary region
                stress[i] = false;
            else if (this.tailMode === 'lapse' && (i + 1 >= nuclei.length || nuclei[i + 1].weight >= this.attractors)) // if *Clash or NonFinal is active and there's a stress coming up
                stress[i] = false;
            else if (this.tailMode !== 'none' && lapse >= 1) // otherwise, assign stress to avoid lapses
                stress[i] = true;
            else
                stress[i] = false;
            if (!stress[i])
                lapse++; // count the lapses
            else
                lapse = 0;
        }
        var newWord = oldWord.slice(); // then edit the word
        var firstStress = true;
        for (var i = 0; i < nuclei.length; i++) {
            if (!stress[i]) {
                newWord[nuclei[i].i] = oldWord[nuclei[i].i].with(Silabia.UNSTRESSED); // stressless is stressless
                if (this.lengthen && nuclei[i].weight === 2)
                    newWord[nuclei[i].i] = newWord[nuclei[i].i].with(Longia.SHORT); // shorten unstressed heavy syllables if Ident long is outranked (tf is "Ident"?)
            }
            else {
                newWord[nuclei[i].i] = oldWord[nuclei[i].i].with(firstStress ? Silabia.PRIMARY_STRESSED : Silabia.SECONDARY_STRESSED); // the first stress is primary
                firstStress = false;
                if (this.lengthen && nuclei[i].weight === 0)
                    newWord[nuclei[i].i] = newWord[nuclei[i].i].with(Longia.LONG); // lengthen stressed open syllables if Ident long is outranked
            }
        }
        return newWord;
    };
    return StressPlacement;
}(GlobalProcess));
export { StressPlacement };
/**
 * a process that removes all morpheme boundaries
 */
var Fusion = /** @class */ (function () {
    function Fusion() {
    }
    Fusion.prototype.apply = function (old) {
        return [[].concat.apply([], __spreadArray([], __read(old), false))];
    };
    return Fusion;
}());
export var PROCESS_OPTIONS = [];
try {
    for (var UNPARSED_PROCESS_OPTIONS_1 = __values(UNPARSED_PROCESS_OPTIONS), UNPARSED_PROCESS_OPTIONS_1_1 = UNPARSED_PROCESS_OPTIONS_1.next(); !UNPARSED_PROCESS_OPTIONS_1_1.done; UNPARSED_PROCESS_OPTIONS_1_1 = UNPARSED_PROCESS_OPTIONS_1.next()) { // load the phonological processes
        var _e = UNPARSED_PROCESS_OPTIONS_1_1.value, chance = _e.chance, type = _e.type, code = _e.code;
        if (type === 'mute') {
            var ca = [], pa = [], bada = [], chena = [];
            var idx = [];
            var fen = ca;
            var sa = null, na = null, ka = null;
            try {
                for (var _f = (e_2 = void 0, __values(code.split(" "))), _g = _f.next(); !_g.done; _g = _f.next()) { // and parse them
                    var token = _g.value;
                    if (token === '>') // > transitions from ca to pa
                        fen = pa;
                    else if (token === '_') // _ transitions from badu to chenu
                        fen = chena;
                    else if (token === '#') // indicates a word boundary
                        fen.push(new Klas([], [Quality.SPOKEN]));
                    else if (token === '/') { // / transitions from pa to badu
                        if (idx.length < pa.length) { // and assigns indices if they weren't assigned explicitly
                            if (ca.length > 1 && ca.length !== pa.length)
                                throw new Error("please specify indices for ".concat(code));
                            idx = [];
                            for (var i = idx.length; i < pa.length; i++)
                                idx.push(Math.min(i, ca.length - 1));
                        }
                        fen = bada;
                    }
                    else if (token === '[') { // [ stars a new phone
                        sa = [];
                        na = [];
                        ka = [];
                    }
                    else if (token === ']') { // ] ends the current phone
                        fen.push(new Klas(sa, na, ka));
                        sa = na = ka = null;
                    }
                    else if (token.length === 2 && token[0] === ']') { // ends the current phone and assigns it a specific reference index
                        fen.push(new Klas(sa, na, ka));
                        idx.push(Number.parseInt(token[1]));
                        sa = na = ka = null;
                    }
                    else if (token.length >= 4) { // features are incorporated into the current phone
                        if (!'+-±'.includes(token.charAt(0)))
                            throw RangeError("unreadable feature descripcion: ".concat(token));
                        else if (token.startsWith('±')) { // either their name goes into ka
                            if (ka === null)
                                throw RangeError("this ".concat(token, " doesn't seem to be in brackets."));
                            ka.push(token.slice(1));
                        }
                        else {
                            var kutube = token.startsWith('+') ? sa : na;
                            if (kutube === null)
                                throw RangeError("this ".concat(token, " doesn't seem to be in brackets."));
                            var feature = parseFeature(token.slice(1));
                            if (feature === null)
                                throw RangeError("unrecognized feature: ".concat(token));
                            kutube.push(feature); // and added to sa or na
                        }
                    }
                    else if (ipaSymbol(token) !== null) { // IPA symbols are read for their specified features
                        var sound = ipaSymbol(token);
                        fen.push(new Klas([
                            sound.mode, sound.loke, sound.voze, sound.latia, sound.silabia, sound.minorLoke
                        ]));
                        idx.push(ca.length); // they index to len(ca), to indicate they don't need any reference foneme
                    }
                    else {
                        throw RangeError("unintelligible symbol in '".concat(code, "': '").concat(token, "'"));
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_2) throw e_2.error; }
            }
            var oneTimeUse = code.includes("#");
            PROCESS_OPTIONS.push({ chanse: chance, proces: new SoundChange(ca, pa, idx, bada, chena, oneTimeUse) });
        }
        else if (type === 'harmonia') {
            var _h = __read(code.split(" "), 4), leftPole = _h[0], _ = _h[1], rightPole = _h[2], scope = _h[3];
            PROCESS_OPTIONS.push({ chanse: chance, proces: new Harmony(parseFeature(leftPole), parseFeature(rightPole), parseFeature(scope)) });
        }
        else if (type === 'acente') {
            var _j = __read(code.split(" "), 2), direction = _j[0], headSize = _j[1];
            for (var attractors = 1; attractors <= 3; attractors++)
                try {
                    for (var _k = (e_3 = void 0, __values(['clash', 'lapse', 'none'])), _l = _k.next(); !_l.done; _l = _k.next()) {
                        var tailMode = _l.value;
                        try {
                            for (var _m = (e_4 = void 0, __values([true, false])), _o = _m.next(); !_o.done; _o = _m.next()) {
                                var lengthen = _o.value;
                                PROCESS_OPTIONS.push({ chanse: chance / 18., proces: new StressPlacement(direction === "right", Number.parseInt(headSize), attractors, tailMode, lengthen) });
                            }
                        }
                        catch (e_4_1) { e_4 = { error: e_4_1 }; }
                        finally {
                            try {
                                if (_o && !_o.done && (_d = _m.return)) _d.call(_m);
                            }
                            finally { if (e_4) throw e_4.error; }
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_l && !_l.done && (_c = _k.return)) _c.call(_k);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
        }
        else if (type === 'silabe') {
            var _p = __read(code.split(" "), 2), minSilabia = _p[0], bias = _p[1];
            PROCESS_OPTIONS.push({ chanse: chance, proces: new Syllabicization(Number.parseInt(bias), Number.parseFloat(minSilabia)) });
        }
        else if (type === 'fusion') {
            PROCESS_OPTIONS.push({ chanse: chance, proces: new Fusion() });
        }
    }
}
catch (e_1_1) { e_1 = { error: e_1_1 }; }
finally {
    try {
        if (UNPARSED_PROCESS_OPTIONS_1_1 && !UNPARSED_PROCESS_OPTIONS_1_1.done && (_a = UNPARSED_PROCESS_OPTIONS_1.return)) _a.call(UNPARSED_PROCESS_OPTIONS_1);
    }
    finally { if (e_1) throw e_1.error; }
}
//# sourceMappingURL=process.js.map