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
var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e, e_6, _f, e_7, _g, e_8, _h, e_9, _j;
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { Klas, Loke, Longia, MinorLoke, Mode, Nosia, Quality, Silabia, Voze, Sound, Latia, get_loke_from_name, get_mode_from_name } from "./sound.js";
import HARFIA_TABLE from "../../../resources/alphabet.js";
import ENGLISH_REPLACEMENTS from "../../../resources/rules_en.js";
import KATAKANA_TABLE from "../../../resources/rules_ja.js";
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
            if (baziFon.length >= 2 && (diacritic.includes('Y') || diacritic.includes('y'))) {
                var Y = lookUp(baziFon[1], style, i + 1);
                graf = graf.replace('Y', Y);
                if (diacritic.includes('y')) {
                    var y = Y.slice(0, 1);
                    if (baziFon[1].mode === Mode.AFFRICATE)
                        y = lookUp(baziFon[1].with(Mode.STOP), style, i + 1).slice(0, 1);
                    graf = graf.replace('y', y);
                }
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
 * split a word up into its syllables
 */
function syllabate(sounds) {
    var nucleusIndices = [];
    for (var i = 0; i < sounds.length; i++)
        if (sounds[i].is(Quality.SYLLABIC))
            nucleusIndices.push(i);
    var breakIndices = [0];
    for (var i = 0; i < nucleusIndices.length - 1; i++)
        breakIndices.push(Math.ceil((nucleusIndices[i] + nucleusIndices[i + 1]) / 2));
    breakIndices.push(sounds.length);
    var syllables = [];
    for (var i = 0; i < breakIndices.length - 1; i++)
        syllables.push(sounds.slice(breakIndices[i], breakIndices[i + 1]));
    return syllables;
}
/**
 * convert a phonetic word to a unicode string somehow.
 * @param sounds the array of sounds.
 * @param style the transcription style to use.
 *              don't pass "(default)" for native spelling; that won't work.  you need to call Word.toString for that.
 */
export function transcribe(sounds, style) {
    var e_11, _a, e_12, _b, e_13, _c, e_14, _d;
    if (style === void 0) { style = "ipa"; }
    if (!ORTHOGRAPHIC_FLAGS.has(style))
        throw new Error("there is no such transcription style as '".concat(style, "'."));
    // start by making our own copy of the part
    sounds = sounds.slice();
    // handle some common orthographickal rules
    if (ORTHOGRAPHIC_FLAGS.get(style).get('au as ao')) {
        for (var i = 0; i < sounds.length - 1; i++) // for this flag, go thru the original phonemick representacion
            if (sounds[i].is(Quality.LOW) && new Klas([Loke.VELAR, Quality.HIGH, Silabia.NONSYLLABIC]).matches(sounds[i + 1])) // find the sequence aw
                sounds[i + 1] = new Klas([Quality.MID]).apply(sounds[i + 1]); // and change it to ao
    }
    if (ORTHOGRAPHIC_FLAGS.get(style).get('diphthong as hiatus')) {
        for (var i = 1; i < sounds.length; i++) // for this flag, go thru the original phonemick representacion
            if (sounds[i - 1].is(Quality.VOWEL) && sounds[i].is(Quality.GLIDE)
                && (i + 1 >= sounds.length || sounds[i + 1].is(Silabia.NONSYLLABIC)) // find glides in codas
                && (sounds[i - 1].loke !== sounds[i].loke || sounds[i - 1].mode !== sounds[i].mode || sounds[i - 1].minorLoke !== sounds[i].minorLoke) // that differe from the preceeding vowel
            )
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
    // remove stress markers from any monosyllabic words
    var syllables = [];
    for (var i = 0; i < sounds.length; i++)
        if (sounds[i].is(Quality.SYLLABIC))
            syllables.push(i);
    if (syllables.length === 1)
        sounds[syllables[0]] = new Klas([Silabia.UNSTRESSED]).apply(sounds[syllables[0]]);
    // syllabate the word
    var sound_syllables = syllabate(sounds);
    // form the inicial spelling by reading the transcripcion out of the table
    var symbol_syllables = [];
    try {
        for (var sound_syllables_1 = __values(sound_syllables), sound_syllables_1_1 = sound_syllables_1.next(); !sound_syllables_1_1.done; sound_syllables_1_1 = sound_syllables_1.next()) {
            var syllable = sound_syllables_1_1.value;
            symbol_syllables.push(syllable.map(function (sound) { return lookUp(sound, style); }).join(""));
        }
    }
    catch (e_11_1) { e_11 = { error: e_11_1 }; }
    finally {
        try {
            if (sound_syllables_1_1 && !sound_syllables_1_1.done && (_a = sound_syllables_1.return)) _a.call(sound_syllables_1);
        }
        finally { if (e_11) throw e_11.error; }
    }
    // apply IPA suprasegmental markings
    if (style === 'ipa') {
        // move all stress symbols to the start of the respective syllable
        for (var i = 0; i < symbol_syllables.length; i++) {
            if (symbol_syllables[i].includes("ˈ"))
                symbol_syllables[i] = "ˈ" + symbol_syllables[i].replace("ˈ", "");
            else if (symbol_syllables[i].includes("ˌ"))
                symbol_syllables[i] = "ˌ" + symbol_syllables[i].replace("ˌ", "");
        }
    }
    // join the syllables with the appropriate separator
    var symbols = symbol_syllables.join(TO_TEXT.get(style).get("syllable break"));
    // apply this one "simplified latin" rule
    if (style === 'simple') {
        // add a diacritic to word-final e so English-speakers know it's not silent
        symbols = symbols.replace(/e\b/, "ë");
    }
    // apply russian spelling rules
    if (style === 'ru') {
        // forbid double й or ь
        symbols = symbols.replace(/([йь])[йь]/g, "$1");
        // a soft-sign turns ш into щ
        symbols = symbols.replace(/шь/g, "щь");
        // a soft-sign or й merges with a following vowel
        symbols = symbols.replace(/[йь][ая]/g, "я");
        symbols = symbols.replace(/[йь][эе]/g, "е");
        symbols = symbols.replace(/[йь][оё]/g, "ё");
        symbols = symbols.replace(/[йь][ыи]/g, "и");
        symbols = symbols.replace(/[йь][ую]/g, "ю");
        // an и softens the following vowel (except э and ы)
        symbols = symbols.replace(/и(́?)а/g, "и$1я");
        symbols = symbols.replace(/и(́?)о/g, "и$1ё");
        symbols = symbols.replace(/и(́?)у/g, "и$1ю");
        // й must follow a vowel or becomes и
        symbols = symbols.replace(/([^аеёиоуыэюя])й/g, "$1и");
        // э is only used at the starts of words
        symbols = symbols.replace(/(.)э/g, "$1е");
    }
    // apply latin spelling rules
    if (style === 'la') {
        // apply these special rules to try to make ʃ and t͡ʃ look nice
        symbols = symbols.replace(/š([eij])/g, "sc$1");
        symbols = symbols.replace(/š([aou])/g, "sci$1");
        symbols = symbols.replace(/š/g, "s");
        symbols = symbols.replace(/č([eij])/g, "c$1");
        symbols = symbols.replace(/č([aou])/g, "ci$1");
        symbols = symbols.replace(/č/g, "s");
        // forbid double j
        symbols = symbols.replace(/jj/g, "j");
        // forbid double v
        symbols = symbols.replace(/vv/g, "v");
        // remove j between a consonant and i
        symbols = symbols.replace(/([^aæeijoœuvȳ])ji/g, "$1i");
        symbols = symbols.replace(/ij([^aæeioœuy])/g, "ī$1");
        // remove v between a consonant and u
        symbols = symbols.replace(/([^aæeijoœuvȳ])vu/g, "$1u");
        symbols = symbols.replace(/uv([^aæeioœuy])/g, "ū$1");
        // change j to i adjacent to consonants
        symbols = symbols.replace(/([^aæeijoœuvȳ])j/g, "$1i");
        symbols = symbols.replace(/j([^aæeijoœuvȳ])/g, "i$1");
        // change v to u adjacent to consonants
        symbols = symbols.replace(/([^aæeijoœuvȳ])v/g, "$1u");
        symbols = symbols.replace(/v([^aæeijoœuvȳ])/g, "u$1");
        // make things look like latin words if it's convenient to do so
        symbols = symbols.replace(/om$/g, "um");
        symbols = symbols.replace(/e$/g, "a");
        symbols = symbols.replace(/i$/g, "ia");
        symbols = symbols.replace(/os$/g, "us");
        // use q
        symbols = symbols.replace(/cu([aæeioœy])/, "qu$1");
    }
    // apply spanish spelling rules
    if (style === 'es') {
        // remove duplicate letters
        for (var i = symbols.length - 1; i >= 1; i--)
            if (symbols[i - 1] === symbols[i])
                symbols = symbols.slice(0, i - 1) + symbols.slice(i);
        for (var i = symbols.length - 1; i >= 2; i--)
            if (symbols[i - 1] === "́" && symbols[i - 2] === symbols[i]) // watch out for the combining diacritics
                symbols = symbols.slice(0, i) + symbols.slice(i + 1);
        // change y to i adjacent to consonants
        symbols = symbols.replace(/([^aeioú])y/g, "$1i");
        symbols = symbols.replace(/y([^aeioú])/g, "i$1");
        // this may create double is, so remove those
        symbols = symbols.replace(/ii/g, "i");
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
        // now try to guess where the regular stress falls
        var seenAnything = false;
        var seenAConsonantCluster = false;
        var seenAPreConsonantVowelCluster = false;
        for (var i = symbols.length - 1; i >= 0; i--) {
            if (seenAnything && "áéíóú".includes(symbols[i])) {
                symbols = symbols.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u");
                break;
            }
            if (i === symbols.length - 1 && "ns".includes(symbols[i]))
                continue;
            seenAnything = true;
            if (!"aeiouáéíóú".includes(symbols[i]))
                seenAConsonantCluster = true;
            if (seenAConsonantCluster && "aeiouáéíóú".includes(symbols[i]))
                seenAPreConsonantVowelCluster = true;
            if (seenAPreConsonantVowelCluster && !"aeiouáéíóú".includes(symbols[i]))
                break;
        }
    }
    // apply english spelling rules
    else if (style === 'en') {
        symbols = "#" + symbols + "#";
        try {
            for (var ENGLISH_REPLACEMENTS_1 = __values(ENGLISH_REPLACEMENTS), ENGLISH_REPLACEMENTS_1_1 = ENGLISH_REPLACEMENTS_1.next(); !ENGLISH_REPLACEMENTS_1_1.done; ENGLISH_REPLACEMENTS_1_1 = ENGLISH_REPLACEMENTS_1.next()) {
                var vise = ENGLISH_REPLACEMENTS_1_1.value;
                try {
                    for (var _e = (e_13 = void 0, __values(vise.patterns)), _f = _e.next(); !_f.done; _f = _e.next()) { // look through the replacements in ENGLI_VISE
                        var pattern = _f.value;
                        for (var i = symbols.length; i >= 1; i--) { // and go through the string
                            if (i - pattern.length >= 0 && symbols.substring(i - pattern.length, i) === pattern)
                                symbols = symbols.substring(0, i - pattern.length) + vise.result + symbols.substring(i);
                        }
                    }
                }
                catch (e_13_1) { e_13 = { error: e_13_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_c = _e.return)) _c.call(_e);
                    }
                    finally { if (e_13) throw e_13.error; }
                }
            }
        }
        catch (e_12_1) { e_12 = { error: e_12_1 }; }
        finally {
            try {
                if (ENGLISH_REPLACEMENTS_1_1 && !ENGLISH_REPLACEMENTS_1_1.done && (_b = ENGLISH_REPLACEMENTS_1.return)) _b.call(ENGLISH_REPLACEMENTS_1);
            }
            finally { if (e_12) throw e_12.error; }
        }
        symbols = symbols.substring(1, symbols.length - 1);
        if (symbols[symbols.length - 1] === 'ɦ' && '*–aeiouyw'.includes(symbols[symbols.length - 2]))
            symbols = symbols.substring(0, symbols.length - 1) + "gh"; // replace word-final <h> with <gh>
        else if ('bcdfgjklmnpqrstvz'.includes(symbols[symbols.length - 1]) && symbols[symbols.length - 2] === '-')
            symbols += 'e'; // add <e> when the last vowel needs to be long
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
            for (var _g = __values([[/cw/g, "qu"], [/[ck]s/g, "x"], [/yy/g, "y"], [/ww/g, "w"], [/sh[ck]/g, "sc"], [/ɦw/g, "wh"], [/ɦ/g, "h"]]), _h = _g.next(); !_h.done; _h = _g.next()) {
                var _j = __read(_h.value, 2), ca = _j[0], pa = _j[1];
                symbols = symbols.replace(ca, pa);
            }
        }
        catch (e_14_1) { e_14 = { error: e_14_1 }; }
        finally {
            try {
                if (_h && !_h.done && (_d = _g.return)) _d.call(_g);
            }
            finally { if (e_14) throw e_14.error; }
        }
    }
    // apply japanese spelling rules
    else if (style === "ja") {
        // long nasalized vowels will end in ンー by default; the ン already makes it long so drop the ー
        symbols = symbols.replace(/ンー/g, "ン");
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
                if (i_4 - 1 >= 0 && "aiueoywー".includes(symbols[i_4 - 1]))
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
                throw new Error("invalid romaji input: /".concat(transcribe(sounds), "/ -> '").concat(symbols.slice(0, i), "[").concat(symbols[i], "]").concat(symbols.slice(i + 1), "'"));
            }
            i--;
        }
        symbols = newSymbols.reverse().join("");
    }
    // remove triplicate letters (note the exception for Japanese: syllables are different)
    if (style !== "ja")
        for (var i = symbols.length - 1; i >= 2; i--)
            if (symbols[i - 2] === symbols[i - 1] && symbols[i - 1] === symbols[i])
                symbols = symbols.slice(0, i - 1) + symbols.slice(i);
    return symbols;
}
/**
 * capitalize the first letter of a word, skipping any initial non-cased letters
 * @param word
 */
export function capitalize(word) {
    for (var i = 0; i < word.length; i++)
        if (word[i].toLowerCase() !== word[i].toUpperCase())
            return word.slice(0, i) + word[i].toUpperCase() + word.slice(i + 1);
    return word;
}
/**
 * convert a word to a unicode string somehow.
 */
export function transcribeWord(morphemes, style) {
    var morphemeBreak = TO_TEXT.get(style).get("morpheme break");
    var intrawordCapitalization = ORTHOGRAPHIC_FLAGS.get(style).get('intraword capitalization');
    var interwordCapitalization = ORTHOGRAPHIC_FLAGS.get(style).get('interword capitalization');
    // if this style doesn't account for morphemes, then remove morpheme boundaries to apply spelling rules more effectively
    if (!intrawordCapitalization && morphemeBreak === "")
        morphemes = [[].concat.apply([], __spreadArray([], __read(morphemes), false))];
    // then transcribe each morpheme
    var parts = morphemes.map(function (morpheme) { return transcribe(morpheme, style); });
    // capitalize each morpheme, if desired
    if (intrawordCapitalization)
        parts = parts.map(function (morpheme) { return capitalize(morpheme); });
    // combine the morphemes
    var whole = parts.join(morphemeBreak);
    // capitalize the whole thing, if desired
    if (interwordCapitalization)
        whole = capitalize(whole);
    return whole;
}
/**
 * convert a phrase to a unicode string somehow.
 */
export function transcribePhrase(words, style) {
    var parts = words.map(function (word) { return transcribeWord(word, style); });
    return parts.join(TO_TEXT.get(style).get("word break"));
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