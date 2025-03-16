/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { Name } from "../language/name.js";
import { DOM } from "./dom.js";
import EN_STRINGS from "../../resources/translations/en.js";
import ES_STRINGS from "../../resources/translations/es.js";
import JA_STRINGS from "../../resources/translations/ja.js";
import PD_STRINGS from "../../resources/translations/pd.js";
var USER_STRINGS;
var SPECIAL_RULE_FOR_AND_BEFORE_I = false;
switch (DOM.elm("bash").textContent) {
    case "en":
        USER_STRINGS = EN_STRINGS;
        break;
    case "es":
        USER_STRINGS = ES_STRINGS;
        SPECIAL_RULE_FOR_AND_BEFORE_I = true;
        break;
    case "ja":
        USER_STRINGS = JA_STRINGS;
        break;
    case "pd":
        USER_STRINGS = PD_STRINGS;
        break;
    default:
        throw new Error("I don't recognize the language code ".concat(DOM.elm("bash").textContent));
}
/**
 * cast the given args to user strings (with a fixed format specificacion) and add them to
 * the given format in place of '{0}', '{1}', etc.  output will all ultimately be
 * extracted from USER_STRINGS.
 * @param sentence the key for the encompassing phrase
 * @param args the data to fill into the template.  there are a few different data types that get formatted differently.
 *               - strings will be treated as translation keys; the corresponding value from the translation file will be added.
 *               - numbers will be displayed as nice integers
 *               - Names will be transcribed using the given style
 *               - lists of strings will get concatenated with commas and "and"s between them
 * @param transcriptionStyle the spelling style to use for any Names
 */
export function format(transcriptionStyle, sentence) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    if (!USER_STRINGS.hasOwnProperty(sentence))
        throw new Error("Could not find user string in resource file for ".concat(sentence));
    var output = USER_STRINGS[sentence];
    for (var i = 0; i < args.length; i++) { // loop thru the args and format each one
        var convertedArg = void 0;
        if (args[i] === null || args[i] === undefined) {
            if (sentence.includes("{".concat(i, "}")))
                throw new Error("".concat(args[i], " was passd as the ").concat(i, "\u00B0 argument.  this is only allowd when the argument is absent from the format string, which was not the case here."));
            continue;
        }
        if (args[i] instanceof Name) {
            convertedArg = args[i].toString(transcriptionStyle); // transcribe words using the specified style TODO: use the user-specified style TODO sometimes italicize instead of capitalizing
        }
        else if (typeof args[i] === 'string') {
            convertedArg = USER_STRINGS[args[i]]; // look up strings in the resource file
        }
        else if (typeof args[i] == 'number') {
            if (args[i] === 0) {
                convertedArg = "0"; // zeros get formatted like so
            }
            else { // and other numbers are formatted like so
                var magnitude = Math.pow(10, Math.floor(Math.log10(args[i])) - 3); // determine its order of magnitude
                var value = Math.round(args[i] / magnitude) * magnitude; // round to three decimal points below that
                convertedArg = value.toString().split("").reverse().join(""); // reverse it
                convertedArg = convertedArg.replace(/(\d\d\d)(\d)/g, '$1 $2').replace(/,$/, ''); // add thousands separators
                convertedArg = convertedArg.split("").reverse().join(""); // reverse it back
            }
        }
        // for an array, list them out using a language-specific separator
        else if (args[i] instanceof Array) {
            var parts = args[i];
            if (parts.length === 0)
                throw new Error("this sentence needs to be rephrased if there are zero items: ".concat(output.replace("{".concat(i, "}"), "(none)")));
            else if (parts.length === 1)
                convertedArg = parts[0].toString();
            else if (parts.length === 2) {
                var and = format(transcriptionStyle, 'grammar.and');
                if (SPECIAL_RULE_FOR_AND_BEFORE_I && /^[iíïịɨиイ]/i.test(parts[1]))
                    and = and.replace("y", "e");
                convertedArg = parts[0] + and + parts[1];
            }
            else {
                var first_parts = parts.slice(0, parts.length - 1);
                var first_separator = format(transcriptionStyle, 'grammar.comma');
                var last_part = parts[parts.length - 1];
                var last_separator = format(transcriptionStyle, 'grammar.comma_and');
                if (SPECIAL_RULE_FOR_AND_BEFORE_I && /^[iíïịɨиイ]/i.test(parts[parts.length - 1]))
                    last_separator = last_separator.replace("y", "e");
                convertedArg = first_parts.join(first_separator) + last_separator + last_part;
            }
        }
        if (convertedArg === undefined) // do Javascript's job for it
            throw new Error("Could not find user string in resource file for ".concat(args[i]));
        output = output.replaceAll("{".concat(i, "}"), convertedArg); // then slot it in
    }
    return output;
}
//# sourceMappingURL=internationalization.js.map