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
import { transcribePhrase, transcribeWord } from "./script.js";
/**
 * an immutable collection of sounds with spelling information attached
 */
var Word = /** @class */ (function () {
    function Word(morphemes, language) {
        var e_1, _a;
        if (morphemes.length === 0)
            throw new Error("this word is empty.");
        try {
            for (var morphemes_1 = __values(morphemes), morphemes_1_1 = morphemes_1.next(); !morphemes_1_1.done; morphemes_1_1 = morphemes_1.next()) {
                var part = morphemes_1_1.value;
                if (part.length === 0)
                    throw new Error("this word has an empty part: '".concat(transcribeWord(morphemes, "ipa"), "'"));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (morphemes_1_1 && !morphemes_1_1.done && (_a = morphemes_1.return)) _a.call(morphemes_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.morphemes = morphemes;
        this.language = language;
    }
    /**
     * transcribe this in the given orthographick style, or its native romanizacion
     * system if the style is '(default)'
     */
    Word.prototype.toString = function (style) {
        if (style === void 0) { style = '(default)'; }
        if (style === '(default)')
            style = this.language.defaultTranscriptionStyle;
        return transcribeWord(this.morphemes, style);
    };
    return Word;
}());
export { Word };
var Phrase = /** @class */ (function () {
    function Phrase(words, language) {
        if (words.length === 0)
            throw new Error("this phrase has no words in it.");
        this.words = words;
        this.language = language;
    }
    /**
     * transcribe this in the given orthographick style, or its native romanizacion
     * system if the style is '(default)'
     */
    Phrase.prototype.toString = function (style) {
        if (style === void 0) { style = '(default)'; }
        if (style === '(default)')
            style = this.language.defaultTranscriptionStyle;
        return transcribePhrase(this.words.map(function (w) { return w.morphemes; }), style);
    };
    return Phrase;
}());
export { Phrase };
//# sourceMappingURL=word.js.map