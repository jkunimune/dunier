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
var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e, e_6, _f, e_7, _g, e_8, _h, e_9, _j;
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { Klas, Loke, Longia, MinorLoke, Mode, Nosia, Quality, Silabia, Voze, Sound, Latia, get_loke_from_name, get_mode_from_name } from "./sound.js";
import HARFIA_TABLE from "../../resources/alphabet.js";
import ENGLISH_REPLACEMENTS from "../../resources/rules_en.js";
import KATAKANA_TABLE from "../../resources/rules_ja.js";
var MODIFIERS = [
    { klas: new Klas([Longia.LONG], [Quality.VOWEL]), baze: [Longia.SHORT], kode: 'geminate' },
    { klas: new Klas([Longia.LONG, Quality.VOWEL]), baze: [Longia.SHORT], kode: 'long' },
    { klas: new Klas([Voze.ASPIRATED]), baze: [Voze.TENUIS], kode: 'aspirate' },
    { klas: new Klas([Voze.EJECTIVE]), baze: [Voze.TENUIS], kode: 'ejective' },
    { klas: new Klas([Loke.LINGUOLABIAL, Quality.LIQUID]), baze: [Loke.DENTAL, Loke.DENTAL], kode: 'linguolab' },
    { klas: new Klas([Loke.LINGUOLABIAL, Latia.LATERAL]), baze: [Loke.DENTAL, Loke.DENTAL], kode: 'linguolab' },
    { klas: new Klas([Loke.LINGUOLABIAL]), baze: [Loke.BILABIAL, Loke.DENTAL], kode: 'linguolab' },
    { klas: new Klas([Loke.LABIOCORONAL]), baze: [Loke.ALVEOLAR, Loke.BILABIAL], kode: 'double' },
    { klas: new Klas([Loke.LABIOVELAR]), baze: [Loke.VELAR, Loke.BILABIAL], kode: 'double' },
    { klas: new Klas([MinorLoke.PALATALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'palataliz' },
    { klas: new Klas([MinorLoke.PHARYNGEALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'pharyngealiz' },
    { klas: new Klas([MinorLoke.VELARIZED]), baze: [MinorLoke.UNROUNDED], kode: 'velariz' },
    { klas: new Klas([Silabia.PRIMARY_STRESSED]), baze: [Silabia.UNSTRESSED], kode: 'primary' },
    { klas: new Klas([Silabia.SECONDARY_STRESSED]), baze: [Silabia.UNSTRESSED], kode: 'secondary' },
    { klas: new Klas([Nosia.NASALIZED, Quality.VOCOID]), baze: [Nosia.ORAL], kode: 'nasaliz' },
    { klas: new Klas([Nosia.NASALIZED], [Quality.VOCOID]), baze: [Mode.NASAL, Nosia.ORAL], kode: 'prenasaliz' },
    { klas: new Klas([Voze.BREATHY]), baze: [Voze.VOICED], kode: 'breathy' },
    { klas: new Klas([Voze.TENUIS, Quality.SONORANT]), baze: [Voze.VOICED], kode: 'devoice' },
    { klas: new Klas([Quality.GLIDE]), baze: [Silabia.UNSTRESSED], kode: 'glide' },
    { klas: new Klas([MinorLoke.LABIALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'labializ' },
    { klas: new Klas([Quality.SYLLABIC], [Quality.VOCOID]), baze: [Silabia.NONSYLLABIC], kode: 'syllabic' },
    { klas: new Klas([Mode.AFFRICATE]), baze: [Mode.STOP, Mode.FRICATE], kode: 'affricate' },
    { klas: new Klas([Mode.CLOSE]), baze: [Mode.FRICATE], kode: 'approx' },
];
// each collum of the orthographic table tells us about a different available style
var styles = HARFIA_TABLE.styles;
// first we read all the phonemes and their transcripcions
var TO_TEXT = new Map();
var FROM_IPA = new Map(); // load the IPA table from static res
try {
    for (var styles_1 = __values(styles), styles_1_1 = styles_1.next(); !styles_1_1.done; styles_1_1 = styles_1.next()) {
        var style = styles_1_1.value;
        TO_TEXT.set(style, new Map());
    }
}
catch (e_1_1) { e_1 = { error: e_1_1 }; }
finally {
    try {
        if (styles_1_1 && !styles_1_1.done && (_a = styles_1.return)) _a.call(styles_1);
    }
    finally { if (e_1) throw e_1.error; }
}
try {
    for (var _k = __values(HARFIA_TABLE.sounds), _l = _k.next(); !_l.done; _l = _k.next()) {
        var _m = _l.value, features = _m.features, symbols = _m.symbols;
        // element 0 indicates the place of articulation
        var loke = get_loke_from_name(features[0]);
        // element 1 indicates the manner of articulation and voicing
        var mode = get_mode_from_name(features[1]);
        // the other elements modify voicing, syllabicity, laterality, or secondary articulation
        var voze = Voze.VOICED, silabia = Silabia.NONSYLLABIC;
        var latia = Latia.MEDIAN, aliSif = MinorLoke.UNROUNDED;
        try {
            for (var _o = (e_3 = void 0, __values(features.slice(2))), _p = _o.next(); !_p.done; _p = _o.next()) {
                var feature = _p.value;
                if (feature === "voiceless")
                    voze = Voze.TENUIS;
                else if (feature === "breathy")
                    voze = Voze.BREATHY;
                else if (feature === "vowel")
                    silabia = Silabia.UNSTRESSED;
                else if (feature === "lateral")
                    latia = Latia.LATERAL;
                else if (feature === "rounded")
                    aliSif = MinorLoke.LABIALIZED;
                else if (feature === "velarized")
                    aliSif = MinorLoke.VELARIZED;
                else
                    throw new Error("unrecognized phonetic feature: ".concat(feature));
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_p && !_p.done && (_c = _o.return)) _c.call(_o);
            }
            finally { if (e_3) throw e_3.error; }
        }
        // put it all together in one record and store it in our IPA lookup tables
        var foneme = new Sound(mode, loke, voze, silabia, Longia.SHORT, latia, aliSif, Nosia.ORAL);
        for (var i = 0; i < symbols.length; i++)
            TO_TEXT.get(styles[i]).set(foneme.hash(), symbols[i]);
        FROM_IPA.set(symbols[styles.indexOf('ipa')], foneme);
    }
}
catch (e_2_1) { e_2 = { error: e_2_1 }; }
finally {
    try {
        if (_l && !_l.done && (_b = _k.return)) _b.call(_k);
    }
    finally { if (e_2) throw e_2.error; }
}
try {
    // then we read any special non-phonemic symbols
    for (var _q = __values(HARFIA_TABLE.suprasegmentals), _r = _q.next(); !_r.done; _r = _q.next()) {
        var _s = _r.value, name_1 = _s.name, symbols = _s.symbols;
        for (var i = 0; i < symbols.length; i++)
            TO_TEXT.get(styles[i]).set(name_1, symbols[i]);
    }
}
catch (e_4_1) { e_4 = { error: e_4_1 }; }
finally {
    try {
        if (_r && !_r.done && (_d = _q.return)) _d.call(_q);
    }
    finally { if (e_4) throw e_4.error; }
}
// then we read the modifying features and their transcripcions
var TO_DIACRITICS = new Map();
try {
    for (var styles_2 = __values(styles), styles_2_1 = styles_2.next(); !styles_2_1.done; styles_2_1 = styles_2.next()) {
        var style = styles_2_1.value;
        TO_DIACRITICS.set(style, new Map());
    }
}
catch (e_5_1) { e_5 = { error: e_5_1 }; }
finally {
    try {
        if (styles_2_1 && !styles_2_1.done && (_e = styles_2.return)) _e.call(styles_2);
    }
    finally { if (e_5) throw e_5.error; }
}
try {
    for (var _t = __values(HARFIA_TABLE.modifiers), _u = _t.next(); !_u.done; _u = _t.next()) {
        var _v = _u.value, name_2 = _v.name, symbols = _v.symbols;
        for (var i = 0; i < symbols.length; i++)
            TO_DIACRITICS.get(styles[i]).set(name_2, symbols[i]);
    }
}
catch (e_6_1) { e_6 = { error: e_6_1 }; }
finally {
    try {
        if (_u && !_u.done && (_f = _t.return)) _f.call(_t);
    }
    finally { if (e_6) throw e_6.error; }
}
// then we read the special rules
var ORTHOGRAPHIC_FLAGS = new Map();
try {
    for (var styles_3 = __values(styles), styles_3_1 = styles_3.next(); !styles_3_1.done; styles_3_1 = styles_3.next()) {
        var style = styles_3_1.value;
        ORTHOGRAPHIC_FLAGS.set(style, new Map());
    }
}
catch (e_7_1) { e_7 = { error: e_7_1 }; }
finally {
    try {
        if (styles_3_1 && !styles_3_1.done && (_g = styles_3.return)) _g.call(styles_3);
    }
    finally { if (e_7) throw e_7.error; }
}
try {
    for (var _w = __values(HARFIA_TABLE.flags), _x = _w.next(); !_x.done; _x = _w.next()) {
        var _y = _x.value, name_3 = _y.name, values = _y.values;
        for (var i = 0; i < values.length; i++)
            ORTHOGRAPHIC_FLAGS.get(styles[i]).set(name_3, values[i]);
    }
}
catch (e_8_1) { e_8 = { error: e_8_1 }; }
finally {
    try {
        if (_x && !_x.done && (_h = _w.return)) _h.call(_w);
    }
    finally { if (e_8) throw e_8.error; }
}
// convert the loaded katakana table to a 2D map
var KATAKANA = new Map();
try {
    for (var _z = __values(KATAKANA_TABLE.columns), _0 = _z.next(); !_0.done; _0 = _z.next()) {
        var column = _0.value;
        KATAKANA.set(column.consonant, new Map());
        for (var i = 0; i < column.kana.length; i++)
            KATAKANA.get(column.consonant).set(KATAKANA_TABLE.vowels[i], column.kana[i]);
    }
}
catch (e_9_1) { e_9 = { error: e_9_1 }; }
finally {
    try {
        if (_0 && !_0.done && (_j = _z.return)) _j.call(_z);
    }
    finally { if (e_9) throw e_9.error; }
}
/**
 * get a phoneme from its IPA representation, or return null if it is not found.
 * @param ipa the symbol to put in the lookup table
 */
export function ipaSymbol(ipa) {
    if (FROM_IPA.has(ipa))
        return FROM_IPA.get(ipa);
    else
        return null;
}
/**
 * get a phoneme array from its IPA representation
 * @param ipa the characters to put in the lookup table
 */
export function ipa(ipa) {
    var output = [];
    for (var i = 0; i < ipa.length; i++) {
        if (FROM_IPA.has(ipa.charAt(i)))
            output.push(FROM_IPA.get(ipa.charAt(i)));
        else
            throw new Error("could not interpret '".concat(ipa.charAt(i), "' as an IPA symbol"));
    }
    return output;
}
/**
 * get an orthographical representation from a phoneme
 * @param sound the sound to look up
 * @param style the romanization convention in which to look this up
 * @param level the number of diacritics we have already checkd (don't check them again)
 */
function lookUp(sound, style, level) {
    var e_10, _a;
    if (level === void 0) { level = 0; }
    if (!TO_TEXT.has(style))
        throw new Error("there is no such transcripcion style as ".concat(style));
    if (TO_TEXT.get(style).has(sound.hash())) // if it's in the table
        return TO_TEXT.get(style).get(sound.hash()); // just return that
    for (var i = level; i < MODIFIERS.length; i++) { // if not, look through the diacritics
        var _b = MODIFIERS[i], klas = _b.klas, baze = _b.baze, kode = _b.kode;
        if (klas.matches(sound)) { // to see if there's one that will help
            var baziFon = [];
            try {
                for (var baze_1 = (e_10 = void 0, __values(baze)), baze_1_1 = baze_1.next(); !baze_1_1.done; baze_1_1 = baze_1.next()) {
                    var feature = baze_1_1.value;
                    baziFon.push(sound.with(feature));
                } // if so, simplify the foneme
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (baze_1_1 && !baze_1_1.done && (_a = baze_1.return)) _a.call(baze_1);
                }
                finally { if (e_10) throw e_10.error; }
            }
            console.assert(TO_DIACRITICS.get(style).has(kode), kode); // (do JavaScript's job for it)
            var diacritic = TO_DIACRITICS.get(style).get(kode); // and apply the diacritic
            var graf = diacritic;
            if (diacritic.includes('X') || diacritic.includes('x')) {
                var X = lookUp(baziFon[0], style, i + 1);
                graf = graf.replace('X', X);
                if (diacritic.includes('x')) {
                    var x = X.slice(0, 1);
                    if (baziFon[0].mode === Mode.AFFRICATE)
                        x = lookUp(baziFon[0].with(Mode.STOP), style, i + 1).slice(0, 1);
                    graf = graf.replace('x', x);
                }
            }
            if (diacritic.includes('Y')) {
                var Y = lookUp(baziFon[1], style, i + 1);
                graf = graf.replace('Y', Y);
            }
            return graf;
        }
    }
    console.log(level);
    console.log(sound);
    console.log(MODIFIERS[20].klas.matches(sound));
    console.log(sound.with(MODIFIERS[20].baze[0]));
    throw new Error("I don't know how to write ".concat(sound));
}
/**
 * convert a phonetic word to a unicode string somehow.
 * @param allSounds the array of sound-strings
 * @param style the transcription style to use
 */
export function transcribe(allSounds, style) {
    var e_11, _a, e_12, _b, e_13, _c, e_14, _d, e_15, _e, e_16, _f;
    if (!ORTHOGRAPHIC_FLAGS.has(style))
        throw new Error("there is no such transcription style as '".concat(style, "'."));
    var allSymbols = [];
    try {
        for (var allSounds_1 = __values(allSounds), allSounds_1_1 = allSounds_1.next(); !allSounds_1_1.done; allSounds_1_1 = allSounds_1.next()) {
            var sounds = allSounds_1_1.value;
            // start by making our own copy of each part
            sounds = sounds.slice();
            // handle some common orthographickal rules
            if (ORTHOGRAPHIC_FLAGS.get(style).get('diphthong as hiatus')) {
                for (var i = 0; i < sounds.length; i++) // for this flag, go thru the original phonemick representacion
                    if (sounds[i].is(Quality.HIGH)
                        && (i + 1 >= sounds.length || sounds[i + 1].is(Silabia.NONSYLLABIC))) // find glides in codas
                        sounds[i] = new Klas([Silabia.UNSTRESSED]).apply(sounds[i]); // and change them to vowels
            }
            if (ORTHOGRAPHIC_FLAGS.get(style).get('velar nasal as coronal')) {
                for (var i = 0; i < sounds.length - 1; i++)
                    if (sounds[i].is(Loke.VELAR) && sounds[i].is(Mode.NASAL)
                        && sounds[i + 1].is(Loke.VELAR) && sounds[i + 1].is(Quality.OCCLUSIVE)) // find velar nasals followd by velar stops
                        sounds[i] = new Klas([Loke.ALVEOLAR]).apply(sounds[i]); // and change them to be coronal
            }
            if (ORTHOGRAPHIC_FLAGS.get(style).get('chain nasalized vocoids')) {
                for (var i = 0; i < sounds.length - 1; i++)
                    if (sounds[i].is(Quality.VOCOID) && sounds[i].is(Nosia.NASALIZED) && sounds[i + 1].is(Quality.NASAL)) // find nasalized vocoids followd by other nasal sounds
                        sounds[i] = new Klas([Nosia.ORAL]).apply(sounds[i]); // and change them to be not nasalized
            }
            if (ORTHOGRAPHIC_FLAGS.get(style).get('monosyllabic word as unstressed')) {
                var syllables = [];
                for (var i = 0; i < sounds.length; i++)
                    if (sounds[i].is(Quality.SYLLABIC))
                        syllables.push(i);
                if (syllables.length === 1)
                    try {
                        for (var syllables_1 = (e_12 = void 0, __values(syllables)), syllables_1_1 = syllables_1.next(); !syllables_1_1.done; syllables_1_1 = syllables_1.next()) {
                            var i = syllables_1_1.value;
                            sounds[i] = new Klas([Silabia.UNSTRESSED]).apply(sounds[i]);
                        }
                    }
                    catch (e_12_1) { e_12 = { error: e_12_1 }; }
                    finally {
                        try {
                            if (syllables_1_1 && !syllables_1_1.done && (_b = syllables_1.return)) _b.call(syllables_1);
                        }
                        finally { if (e_12) throw e_12.error; }
                    }
            }
            // form the inicial spelling by reading the transcripcion out of the table
            var symbols = "";
            try {
                for (var sounds_1 = (e_13 = void 0, __values(sounds)), sounds_1_1 = sounds_1.next(); !sounds_1_1.done; sounds_1_1 = sounds_1.next()) {
                    var sound = sounds_1_1.value;
                    symbols += lookUp(sound, style);
                }
            }
            catch (e_13_1) { e_13 = { error: e_13_1 }; }
            finally {
                try {
                    if (sounds_1_1 && !sounds_1_1.done && (_c = sounds_1.return)) _c.call(sounds_1);
                }
                finally { if (e_13) throw e_13.error; }
            }
            // apply russian spelling rules
            if (style === 'ru') {
                // a soft-sign turns ш into щ
                symbols = symbols.replace(/шь/, "щь");
                // a soft-sign or й merges with a following vowel
                symbols = symbols.replace(/[йь]а/g, "я");
                symbols = symbols.replace(/[йь]э/g, "е");
                symbols = symbols.replace(/[йь]о/g, "ё");
                symbols = symbols.replace(/[йь]ы/g, "и");
                symbols = symbols.replace(/[йь]у/g, "ю");
                // an и softens the following vowel (except э and ы)
                symbols = symbols.replace(/и(́?)а/g, "и$1я");
                symbols = symbols.replace(/и(́?)о/g, "и$1ё");
                symbols = symbols.replace(/и(́?)у/g, "и$1ю");
                // й must be adjacent to a vowel or becomes и
                symbols = symbols.replace(/([^аеёиоуыэюя])й([^аеёиоуыэюя])/g, "$1и$2");
                // э is only used at the starts of words
                symbols = symbols.replace(/(.)э/, "$1е");
            }
            // apply spanish spelling rules
            if (style === 'es') {
                // change y to i adjacent to consonants
                symbols = symbols.replace(/([^aeioú])y/g, "$1i");
                symbols = symbols.replace(/y([^aeioú])/g, "i$1");
                // remove duplicate letters
                for (var i = symbols.length - 1; i >= 1; i--)
                    if (symbols[i - 1] === symbols[i])
                        symbols = symbols.slice(0, i - 1) + symbols.slice(i);
                for (var i = symbols.length - 1; i >= 2; i--)
                    if (symbols[i - 1] === "́" && symbols[i - 2] === symbols[i]) // watch out for the combining diacritics
                        symbols = symbols.slice(0, i) + symbols.slice(i + 1);
                // change combining diacritics to special characters (because ú should behave differently from u)
                symbols = symbols.replace(/á/g, "á");
                symbols = symbols.replace(/é/g, "é");
                symbols = symbols.replace(/í/g, "í");
                symbols = symbols.replace(/ó/g, "ó");
                symbols = symbols.replace(/ú/g, "ú");
                // add a consonant before prevocalic u and i
                symbols = symbols.replace(/^([iu][aeiouáéíóú])/g, "h$1");
                symbols = symbols.split("").reverse().join("")
                    .replace(/([aeiouáéíóú][iu])([aeiouáéíóú])/g, "$1h$2")
                    .split("").reverse().join(""); // (this part needs to be done back-to-front, hence the reversal)
                // change gui to güi, gi to gui, ci to qui, and zi to ci
                symbols = symbols.replace(/gu([ieíé])/g, "gü$1");
                symbols = symbols.replace(/g([ieíé])/g, "gu$1");
                symbols = symbols.replace(/c([ieíé])/g, "qu$1");
                symbols = symbols.replace(/z([ieíé])/g, "c$1");
            }
            // apply english spelling rules
            else if (style === 'en') {
                symbols = "#" + symbols + "#";
                try {
                    for (var ENGLISH_REPLACEMENTS_1 = (e_14 = void 0, __values(ENGLISH_REPLACEMENTS)), ENGLISH_REPLACEMENTS_1_1 = ENGLISH_REPLACEMENTS_1.next(); !ENGLISH_REPLACEMENTS_1_1.done; ENGLISH_REPLACEMENTS_1_1 = ENGLISH_REPLACEMENTS_1.next()) {
                        var vise = ENGLISH_REPLACEMENTS_1_1.value;
                        try {
                            for (var _g = (e_15 = void 0, __values(vise.patterns)), _h = _g.next(); !_h.done; _h = _g.next()) { // look through the replacements in ENGLI_VISE
                                var pattern = _h.value;
                                for (var i = symbols.length; i >= 1; i--) { // ang go through the string
                                    if (i - pattern.length >= 0 && symbols.substring(i - pattern.length, i) === pattern)
                                        symbols = symbols.substring(0, i - pattern.length) + vise.result + symbols.substring(i);
                                }
                            }
                        }
                        catch (e_15_1) { e_15 = { error: e_15_1 }; }
                        finally {
                            try {
                                if (_h && !_h.done && (_e = _g.return)) _e.call(_g);
                            }
                            finally { if (e_15) throw e_15.error; }
                        }
                    }
                }
                catch (e_14_1) { e_14 = { error: e_14_1 }; }
                finally {
                    try {
                        if (ENGLISH_REPLACEMENTS_1_1 && !ENGLISH_REPLACEMENTS_1_1.done && (_d = ENGLISH_REPLACEMENTS_1.return)) _d.call(ENGLISH_REPLACEMENTS_1);
                    }
                    finally { if (e_14) throw e_14.error; }
                }
                symbols = symbols.substring(1, symbols.length - 1);
                if (symbols[symbols.length - 1] === 'ɦ' && '*–aeiouyw'.includes(symbols[symbols.length - 2]))
                    symbols = symbols.substring(0, symbols.length - 1) + "gh"; // replace word-final <h> with <gh>
                else if ('bcdfgjklmnpqrstvz'.includes(symbols[symbols.length - 1]) && symbols[symbols.length - 2] === '-')
                    symbols += 'ia'; // add <ia> when the last vowel needs to be long
                if (symbols.length >= 3 &&
                    'cfd'.includes(symbols.charAt(symbols.length - 1)) &&
                    '*' === symbols.charAt(symbols.length - 2) &&
                    (symbols.length < 4 || !'aeiou'.includes(symbols.charAt(symbols.length - 4)))) // double the final consonant if the word ends in a single short vowel followd by <c>, <f>, or <d>
                    symbols += symbols.charAt(symbols.length - 1);
                var newSymbol = "";
                for (var i = 0; i < symbols.length; i++) {
                    if (symbols[i] === "c" &&
                        ((i + 1 < symbols.length && 'eiy'.includes(symbols[i + 1])) || i + 1 === symbols.length)) // use <k> before front vowels and at the ends of words
                        newSymbol += "k";
                    else if (i + 1 < symbols.length && symbols[i] === "j" && 'eiy'.includes(symbols[i + 1])) { // use <g> before front vowels when it is the last consonant in the word
                        var harfe = "g";
                        for (var j = i + 1; j < symbols.length; j++) {
                            if (!'aeiouy'.includes(symbols[j])) {
                                harfe = "j";
                                break;
                            }
                        }
                        newSymbol += harfe;
                    }
                    else if (symbols[i] === "ɦ" &&
                        ((i + 1 < symbols.length && !'aeiouyw'.includes(symbols[i + 1])) || (i - 1 >= 0 && !'*–aeiouyw'.includes(symbols[i - 1])))) // remove <h> in consonant clusters
                        newSymbol += "";
                    else if (symbols[i] === "y") {
                        if (i + 1 === symbols.length || (i + 1 < symbols.length && symbols[i + 1] === "i") || (i - 1 >= 0 && symbols[i - 1] === "i")) // use <y> at the ends of words and adjacent to <i>
                            newSymbol += "y";
                        else if ((i + 1 < symbols.length && !'aeiou'.includes(symbols[i + 1])) || (i - 1 >= 0 && !'aeiou'.includes(symbols[i - 1]))) // use <i> adjacent to consonants
                            newSymbol += "i";
                        else
                            newSymbol += "y";
                    }
                    else if (i + 1 < symbols.length && symbols[i] === "w" && !"aeiouy".includes(symbols[i + 1])) // use <u> after vowels before consonants
                        newSymbol += "u";
                    else if (symbols[i] === '–') {
                        if ((i + 1 < symbols.length && symbols[i + 1] === 'ɦ') ||
                            (i + 2 < symbols.length && !'aeiouy'.includes(symbols[i + 1]) && !'aeiouy'.includes(symbols[i + 2])) ||
                            (i + 2 === symbols.length && !'aeiouy'.includes(symbols[i + 1]))) // lengthen long vowels that look short
                            newSymbol += (symbols[i - 1] === 'a') ? 'i' : (symbols[i - 1] === 'o') ? 'u' : (symbols[i - 1] === 'i') ? '' : 'e';
                    }
                    else if (symbols[i] === '*') {
                        // if (i+2 < graphs.length && !'aeiouy'.includes(graphs[i+1]) && 'aeiouy'.includes(graphs[i+2]))
                        // 	muti += (graphs[i+1] === 'k') ? 'c' : (graphs[i+1] === 'j') ? '' : (graphs[i+1] === 'h') ? '' : graphs[i+1];
                        // else if (i+1 < graphs.length && graphs[i] === 'i' && 'aeiouy'.includes(graphs[i+1])) // double consonants when short vowels look long
                        // 	muti = muti.substring(0, muti.length-1) + 'e';
                    }
                    else
                        newSymbol += symbols[i];
                }
                symbols = newSymbol;
                try {
                    // make some final replacements
                    for (var _j = (e_16 = void 0, __values([[/cw/g, "qu"], [/[ck]s/g, "x"], [/yy/g, "y"], [/ww/g, "w"], [/sh[ck]/g, "sc"], [/ɦw/g, "wh"], [/ɦ/g, "h"]])), _k = _j.next(); !_k.done; _k = _j.next()) {
                        var _l = __read(_k.value, 2), ca = _l[0], pa = _l[1];
                        symbols = symbols.replace(ca, pa);
                    }
                }
                catch (e_16_1) { e_16 = { error: e_16_1 }; }
                finally {
                    try {
                        if (_k && !_k.done && (_f = _j.return)) _f.call(_j);
                    }
                    finally { if (e_16) throw e_16.error; }
                }
            }
            // apply japanese spelling rules
            else if (style === "ja") {
                // convert iy and uw to long vowels
                for (var i_1 = 2; i_1 < symbols.length + 1; i_1++) {
                    if (i_1 >= symbols.length || !"aiueo".includes(symbols[i_1])) {
                        if (symbols[i_1 - 2] === "i" && symbols[i_1 - 1] === "y")
                            symbols = symbols.slice(0, i_1 - 1) + "ー" + symbols.slice(i_1);
                        else if (symbols[i_1 - 2] === "u" && symbols[i_1 - 1] === "w")
                            symbols = symbols.slice(0, i_1 - 1) + "ー" + symbols.slice(i_1);
                    }
                }
                // if there happen to be double consonants, replace them with ッ
                for (var i_2 = symbols.length - 1; i_2 >= 1; i_2--) {
                    if (symbols[i_2 - 1] === symbols[i_2])
                        if (!"aiueo".includes(symbols[i_2]))
                            symbols = symbols.slice(0, i_2 - 1) + "ッ" + symbols.slice(i_2);
                }
                // ッ is only valid between a vowel and an obstruent
                for (var i_3 = symbols.length; i_3 >= 1; i_3--) {
                    if (symbols[i_3 - 1] === "ッ") {
                        if (i_3 - 2 < 0 || !"aiueoy".includes(symbols[i_3 - 2]) || i_3 >= symbols.length)
                            symbols = symbols.slice(0, i_3 - 1) + symbols.slice(i_3);
                        else if ("yrwvッンー".includes(symbols[i_3]))
                            symbols = symbols.slice(0, i_3 - 1) + symbols.slice(i_3);
                        else if ("nm".includes(symbols[i_3]))
                            symbols = symbols.slice(0, i_3 - 1) + "ン" + symbols.slice(i_3);
                    }
                }
                // superscript n means add an ン if it's after a vowel but omit it otherwise
                for (var i_4 = symbols.length - 1; i_4 >= 0; i_4--) {
                    if (symbols[i_4] === "ⁿ") {
                        if (i_4 - 1 >= 0 && "aiueo".includes(symbols[i_4 - 1]))
                            symbols = symbols.slice(0, i_4) + "ン" + symbols.slice(i_4 + 1);
                        else
                            symbols = symbols.slice(0, i_4) + symbols.slice(i_4 + 1);
                    }
                }
                // convert excess n to ン
                for (var i_5 = 1; i_5 < symbols.length + 1; i_5++)
                    if (symbols[i_5 - 1] === "n" && (i_5 >= symbols.length || !"aiueoy".includes(symbols[i_5])))
                        symbols = symbols.slice(0, i_5 - 1) + "ン" + symbols.slice(i_5);
                // insert vowels between adjacent consonants
                for (var i_6 = symbols.length; i_6 >= 1; i_6--) {
                    if (!"aiueoyッンー".includes(symbols[i_6 - 1]) && (i_6 >= symbols.length || !"aiueoy".includes(symbols[i_6]))) {
                        var vowel = void 0;
                        if (i_6 < symbols.length && symbols[i_6] === "w" && (i_6 + 1 >= symbols.length || symbols[i_6 + 1] !== "a"))
                            vowel = "u"; // u if we're going to need to use it as a stand-in for w
                        else if ("tdh".includes(symbols[i_6 - 1]))
                            vowel = "o"; // o if it's after t
                        else if ("qj".includes(symbols[i_6 - 1]))
                            vowel = "i"; // i if it's after ch or j
                        else
                            vowel = "u"; // u for everything else
                        symbols = symbols.slice(0, i_6) + vowel + symbols.slice(i_6);
                    }
                }
                // expand eligible small ャ, ュ, ョ, and ェ
                for (var i_7 = symbols.length - 1; i_7 >= 2; i_7--) {
                    if (!"aiueotdcfywvッンー".includes(symbols[i_7 - 2]) && symbols[i_7 - 1] === "y" && "aiueo".includes(symbols[i_7])) {
                        var nucleus = KATAKANA.get("ʸ").get(symbols[i_7]);
                        symbols = symbols.slice(0, i_7 - 1) + "i" + nucleus + symbols.slice(i_7 + 1);
                    }
                }
                // convert invalid y to i or remove it
                for (var i_8 = symbols.length; i_8 >= 1; i_8--) {
                    if (symbols[i_8 - 1] === "y") {
                        if (i_8 >= symbols.length || !"aiueo".includes(symbols[i_8]))
                            symbols = symbols.slice(0, i_8 - 1) + "i" + symbols.slice(i_8);
                        else if (i_8 - 2 >= 0 && !"aiueoンー".includes(symbols[i_8 - 2]))
                            symbols = symbols.slice(0, i_8 - 1) + "i" + symbols.slice(i_8 - 1);
                    }
                }
                // remove glides to prevent superfluus compound characters (e.g. iye -> ie)
                for (var i_9 = symbols.length - 1; i_9 >= 2; i_9--) {
                    if (symbols[i_9 - 2] === "u" && symbols[i_9 - 1] === "w" && "ieo".includes(symbols[i_9]))
                        symbols = symbols.slice(0, i_9 - 1) + symbols.slice(i_9);
                    else if (symbols[i_9 - 2] === "i" && symbols[i_9 - 1] === "y" && symbols[i_9] === "e")
                        symbols = symbols.slice(0, i_9 - 1) + symbols.slice(i_9);
                }
                // convert the romaji to katakana
                var i = symbols.length - 1;
                var newSymbols = [];
                while (i >= 0) {
                    if ("aiueo".includes(symbols[i])) {
                        var vowel = symbols[i];
                        var consonant = "";
                        if (KATAKANA.has(symbols[i - 1])) {
                            i--;
                            consonant = symbols[i];
                        }
                        newSymbols.push(KATAKANA.get(consonant).get(vowel));
                    }
                    else if ("ッンーャュェョ".includes(symbols[i])) {
                        newSymbols.push(symbols[i]);
                    }
                    else {
                        throw new Error("invalid romaji input: /".concat(transcribe([sounds], "ipa"), "/ -> '").concat(symbols.slice(0, i), "[").concat(symbols[i], "]").concat(symbols.slice(i + 1), "'"));
                    }
                    i--;
                }
                symbols = newSymbols.reverse().join("");
            }
            // finally, capitalize
            if (ORTHOGRAPHIC_FLAGS.get(style).get('capitalization')) {
                for (var i = 0; i < symbols.length; i++)
                    if (symbols[i] !== symbols[i].toUpperCase()) {
                        symbols = symbols.slice(0, i) + symbols[i].toUpperCase() + symbols.slice(i + 1);
                        break;
                    }
            }
            // add it to the main output
            allSymbols.push(symbols);
        }
    }
    catch (e_11_1) { e_11 = { error: e_11_1 }; }
    finally {
        try {
            if (allSounds_1_1 && !allSounds_1_1.done && (_a = allSounds_1.return)) _a.call(allSounds_1);
        }
        finally { if (e_11) throw e_11.error; }
    }
    return allSymbols.join(TO_TEXT.get(style).get("pause"));
}
/**
 * determine which of these two phrases should come first in alphabetical order.
 * this is meant to be used in Array.sort(), so it has the typical return value.
 * it's similar to string.localeCompare(), but with some modifications to make it
 * work better when there are loanwords from fictional languages in the mix.
 * @return 1 if b should come before a, -1 if a should come before b, and 0 if they can go in either order
 */
export function compare(a, b, style) {
    a = a.replace(/[̴̨̣̰̄̈̃́̆ʻ’ʼ]/g, "");
    b = b.replace(/[̴̨̣̰̄̈̃́̆ʻ’ʼ]/g, "");
    var closestRealLocale;
    if (style === "es" || style === "en" || style === "ru" || style === "ja")
        closestRealLocale = style;
    else if (style !== "ipa")
        closestRealLocale = "en";
    else
        throw new Error("we don't alphabetically sort IPA in this house.  why would you even try?");
    return a.localeCompare(b, closestRealLocale);
}
//# sourceMappingURL=script.js.map