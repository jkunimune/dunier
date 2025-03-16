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
import { transcribe } from "./script.js";
var Name = /** @class */ (function () {
    function Name(parts, language) {
        var e_1, _a;
        try {
            for (var parts_1 = __values(parts), parts_1_1 = parts_1.next(); !parts_1_1.done; parts_1_1 = parts_1.next()) {
                var part = parts_1_1.value;
                if (part.length === 0)
                    throw new Error("this word has an empty part: '".concat(transcribe(parts, "ipa"), "'"));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (parts_1_1 && !parts_1_1.done && (_a = parts_1.return)) _a.call(parts_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.parts = parts;
        this.language = language;
    }
    /**
     * strip this of its linguistic context so that it is just a string of phones (and
     * will render in the IPA by default)
     */
    Name.prototype.pronunciation = function () {
        return new Name(this.parts, null);
    };
    /**
     * transcribe this in the given orthographick style, or its native romanizacion
     * system if none is specified
     */
    Name.prototype.toString = function (style) {
        if (style === void 0) { style = null; }
        if (this.language === null) // if language is null, this is just phonetick informacion and should be put in phonetick notacion regardless of the specified Style
            return transcribe(this.parts, 'ipa');
        else if (style !== null) // otherwise, use the specified style
            return transcribe(this.parts, style);
        else // otherwise, use the native style of this word's language
            return transcribe(this.parts, this.language.defaultStyle);
    };
    return Name;
}());
export { Name };
//# sourceMappingURL=name.js.map