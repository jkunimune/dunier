import {Selector} from "./selector.js";
import {loadJSON} from "./fileio.js";
import {Word} from "../language/word.js";

export const DOM = new Selector(document);
export const USER_STRINGS = loadJSON(`../../res/translations/${DOM.elm('bash').textContent}.json`);

/**
 * cast the given args to user strings (with a fixd format specificacion) and add them to
 * the given format in place of '{0}', '{1}', etc.  output will all ultimately be
 * extracted from USER_STRINGS.
 * @param sentence the key for the encompassing phrase
 * @param args the key for the arguments to slot in
 */
export function format(sentence: string, ...args: (string|number|object)[]): string {
    if (!USER_STRINGS.has(sentence))
        throw `Could not find user string in resource file for ${sentence}`;
    let format = USER_STRINGS.get(sentence);
    for (let i = 0; i < args.length; i ++) { // loop thru the args and format each one
        let convertedArg: string;
        if (args[i] === null || args[i] === undefined) {
            if (sentence.includes(`{${i}}`))
                throw `${args[i]} was passd as the ${i}° argument.  this is only allowd when the argument is absent from the format string, which was not the case here.`;
            continue;
        }
        if (args[i] instanceof Word) {
            convertedArg = (<Word>args[i]).toString(); // transcribe words using the specified style TODO: use the user-specified style TODO sometimes italicize instead of capitalizing
        }
        else if (typeof args[i] === 'string') {
            convertedArg = USER_STRINGS.get(<string>args[i]); // look up strings in the resource file
        }
        else if (typeof args[i] === 'object') {
            convertedArg = USER_STRINGS.get((<object>args[i]).toString()); // do the same for objects
        }
        else if (typeof args[i] == 'number') {
            if (args[i] === 0) {
                convertedArg = "0"; // zeros get formatted like so
            }
            else { // and other numbers are formatted like so
                const magnitude = Math.pow(10, Math.floor(Math.log10(<number>args[i])) - 3); // determine its order of magnitude
                const value = Math.round(<number>args[i]/magnitude)*magnitude; // round to three decimal points below that
                convertedArg = value.toString().split("").reverse().join(""); // reverse it
                convertedArg = convertedArg.replace(/(\d\d\d)(\d)/g, '$1 $2').replace(/,$/, ''); // add thousands separators
                convertedArg = convertedArg.split("").reverse().join(""); // reverse it back
            }
        }
        if (convertedArg === undefined) // do Javascript's job for it
            throw `Could not find user string in resource file for ${args[i]}`;
        format = format.replace(`{${i}}`, convertedArg); // then slot it in
    }
    return format;
}
