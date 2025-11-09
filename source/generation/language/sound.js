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
import { Enumify } from "../../utilities/external/enumify.js";
/** list of active articulators */
export var Foner;
(function (Foner) {
    Foner[Foner["LABIA"] = 0] = "LABIA";
    Foner[Foner["CORONA"] = 1] = "CORONA";
    Foner[Foner["DORSUM"] = 2] = "DORSUM";
    Foner[Foner["PHARYNX"] = 3] = "PHARYNX";
    Foner[Foner["MULTIPLE"] = 4] = "MULTIPLE";
})(Foner || (Foner = {}));
/** form of primary articulation or vowel height */
var Mode = /** @class */ (function (_super) {
    __extends(Mode, _super);
    function Mode(sonority) {
        var _this = _super.call(this) || this;
        _this.sonority = sonority;
        return _this;
    }
    Mode.STOP = new Mode(0);
    Mode.AFFRICATE = new Mode(1);
    Mode.FRICATE = new Mode(1);
    Mode.NASAL = new Mode(2);
    Mode.TAP = new Mode(3);
    Mode.TRILL = new Mode(3);
    Mode.CLOSE = new Mode(4);
    Mode.OPEN = new Mode(4.2);
    Mode.NEAR_CLOSE = new Mode(4);
    Mode.NEAR_OPEN = new Mode(4.2);
    Mode.CLOSE_MID = new Mode(4.1);
    Mode.OPEN_MID = new Mode(4.1);
    Mode.CLICK = new Mode(-1);
    Mode._ = Mode.closeEnum();
    return Mode;
}(Enumify));
export { Mode };
/** look up the manner of articulation by name */
export function get_mode_from_name(name) {
    var e_1, _a;
    var normalizedName = name.toUpperCase().replace(" ", "_");
    try {
        for (var Mode_1 = __values(Mode), Mode_1_1 = Mode_1.next(); !Mode_1_1.done; Mode_1_1 = Mode_1.next()) {
            var mode = Mode_1_1.value;
            if (mode.enumKey === normalizedName)
                return mode;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (Mode_1_1 && !Mode_1_1.done && (_a = Mode_1.return)) _a.call(Mode_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    throw new Error("unrecognized manner of articulation: '".concat(name, "'"));
}
/** location of primary articulation or vowel frontness */
var Loke = /** @class */ (function (_super) {
    __extends(Loke, _super);
    function Loke(articulator) {
        var _this = _super.call(this) || this;
        _this.foner = articulator;
        return _this;
    }
    Loke.BILABIAL = new Loke(Foner.LABIA);
    Loke.LABIODENTAL = new Loke(Foner.LABIA);
    Loke.LINGUOLABIAL = new Loke(Foner.CORONA);
    Loke.DENTAL = new Loke(Foner.CORONA);
    Loke.ALVEOLAR = new Loke(Foner.CORONA);
    Loke.POSTALVEOLAR = new Loke(Foner.CORONA);
    Loke.RETROFLEX = new Loke(Foner.CORONA);
    Loke.PALATAL = new Loke(Foner.DORSUM);
    Loke.CENTRAL = new Loke(Foner.DORSUM);
    Loke.VELAR = new Loke(Foner.DORSUM);
    Loke.UVULAR = new Loke(Foner.DORSUM);
    Loke.EPIGLOTTAL = new Loke(Foner.PHARYNX);
    Loke.GLOTTAL = new Loke(Foner.PHARYNX);
    Loke.LABIOCORONAL = new Loke(Foner.MULTIPLE);
    Loke.LABIOVELAR = new Loke(Foner.MULTIPLE);
    Loke._ = Loke.closeEnum();
    return Loke;
}(Enumify));
export { Loke };
/** look up the place of articulation by name */
export function get_loke_from_name(name) {
    var e_2, _a;
    var normalizedName = name.toUpperCase().replace(" ", "_");
    try {
        for (var Loke_1 = __values(Loke), Loke_1_1 = Loke_1.next(); !Loke_1_1.done; Loke_1_1 = Loke_1.next()) {
            var loke = Loke_1_1.value;
            if (loke.enumKey === normalizedName)
                return loke;
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (Loke_1_1 && !Loke_1_1.done && (_a = Loke_1.return)) _a.call(Loke_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    throw new Error("unrecognized place of articulation: '".concat(name, "'"));
}
/** voicing */
var Voze = /** @class */ (function (_super) {
    __extends(Voze, _super);
    function Voze() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Voze.VOICED = new Voze();
    Voze.BREATHY = new Voze();
    Voze.TENUIS = new Voze();
    Voze.ASPIRATED = new Voze();
    Voze.EJECTIVE = new Voze();
    Voze._ = Voze.closeEnum();
    return Voze;
}(Enumify));
export { Voze };
/** syllabicity */
var Silabia = /** @class */ (function (_super) {
    __extends(Silabia, _super);
    function Silabia() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Silabia.PRIMARY_STRESSED = new Silabia();
    Silabia.SECONDARY_STRESSED = new Silabia();
    Silabia.UNSTRESSED = new Silabia();
    Silabia.NONSYLLABIC = new Silabia();
    Silabia._ = Silabia.closeEnum();
    return Silabia;
}(Enumify));
export { Silabia };
/** length */
var Longia = /** @class */ (function (_super) {
    __extends(Longia, _super);
    function Longia() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Longia.LONG = new Longia();
    Longia.SHORT = new Longia();
    Longia._ = Longia.closeEnum();
    return Longia;
}(Enumify));
export { Longia };
/** laterality */
var Latia = /** @class */ (function (_super) {
    __extends(Latia, _super);
    function Latia() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Latia.LATERAL = new Latia();
    Latia.MEDIAN = new Latia();
    Latia._ = Latia.closeEnum();
    return Latia;
}(Enumify));
export { Latia };
/** location of secondary articulation or vowel rounding */
var MinorLoke = /** @class */ (function (_super) {
    __extends(MinorLoke, _super);
    function MinorLoke() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MinorLoke.UNROUNDED = new MinorLoke();
    MinorLoke.LABIALIZED = new MinorLoke();
    MinorLoke.PALATALIZED = new MinorLoke();
    MinorLoke.VELARIZED = new MinorLoke();
    MinorLoke.PHARYNGEALIZED = new MinorLoke();
    MinorLoke._ = MinorLoke.closeEnum();
    return MinorLoke;
}(Enumify));
export { MinorLoke };
/** nasality */
var Nosia = /** @class */ (function (_super) {
    __extends(Nosia, _super);
    function Nosia() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Nosia.NASALIZED = new Nosia();
    Nosia.ORAL = new Nosia();
    Nosia._ = Nosia.closeEnum();
    return Nosia;
}(Enumify));
export { Nosia };
/** more complicated segment features that are determined by
 * things like place and manner of articulation */
var Quality = /** @class */ (function (_super) {
    __extends(Quality, _super);
    function Quality() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Quality.LABIAL = new Quality();
    Quality.CORONAL = new Quality();
    Quality.DORSAL = new Quality();
    Quality.GUTTURAL = new Quality();
    Quality.ALVEOLAR = new Quality();
    Quality.NASAL = new Quality();
    Quality.CONTINUANT = new Quality();
    Quality.OCCLUSIVE = new Quality();
    Quality.SONORANT = new Quality();
    Quality.OBSTRUENT = new Quality();
    Quality.VIBRANT = new Quality();
    Quality.HIGH = new Quality();
    Quality.MID = new Quality();
    Quality.LOW = new Quality();
    Quality.RAISED = new Quality();
    Quality.LOWERED = new Quality();
    Quality.TENSE = new Quality();
    Quality.LAX = new Quality();
    Quality.PALATAL = new Quality();
    Quality.VELAR = new Quality();
    Quality.PHARANGEAL = new Quality();
    Quality.SIBILANT = new Quality();
    Quality.RHOTIC = new Quality();
    Quality.LIQUID = new Quality();
    Quality.WIBBLY = new Quality();
    Quality.VOCOID = new Quality();
    Quality.GLIDE = new Quality();
    Quality.VOWEL = new Quality();
    Quality.SORDID = new Quality();
    Quality.STRESSED = new Quality();
    Quality.SYLLABIC = new Quality();
    Quality.SPOKEN = new Quality();
    Quality._ = Quality.closeEnum();
    return Quality;
}(Enumify));
export { Quality };
export var FEATURE_TYPES = [Quality, Loke, Mode, Voze, Silabia, Longia, Latia, Nosia, MinorLoke];
export function parseFeature(s) {
    var e_3, _a, e_4, _b;
    var starred = s.startsWith('!');
    if (starred)
        s = s.slice(1);
    try {
        for (var _c = __values(starred ? FEATURE_TYPES.slice(1) : FEATURE_TYPES), _d = _c.next(); !_d.done; _d = _c.next()) { // or their value is read
            var featureType = _d.value;
            try {
                for (var featureType_1 = (e_4 = void 0, __values(featureType)), featureType_1_1 = featureType_1.next(); !featureType_1_1.done; featureType_1_1 = featureType_1.next()) {
                    var feature = featureType_1_1.value;
                    if ((feature.enumKey + typeof (feature)).startsWith(s)) {
                        return feature;
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (featureType_1_1 && !featureType_1_1.done && (_b = featureType_1.return)) _b.call(featureType_1);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_3) throw e_3.error; }
    }
    throw Error("I can't understand to what feature '".concat(s, "' refers."));
}
/** phonological segment */
var Sound = /** @class */ (function () {
    function Sound(mode, loke, voze, silabia, longia, latia, minorLoke, nosia) {
        this.mode = mode;
        this.loke = loke;
        this.voze = voze;
        this.silabia = silabia;
        this.longia = longia;
        this.latia = latia;
        this.minorLoke = minorLoke;
        this.nosia = nosia;
    }
    /**
     * does this fone have the given feature?
     */
    Sound.prototype.is = function (feature) {
        if (this.loke === null || this.mode === null || this.voze === null)
            throw new Error("we stopped supporting Sounds with null attributes.");
        if (feature instanceof Loke)
            return this.loke === feature;
        else if (feature instanceof Mode)
            return this.mode === feature;
        else if (feature instanceof Voze)
            return this.voze === feature;
        else if (feature instanceof Silabia)
            return this.silabia === feature;
        else if (feature instanceof Longia)
            return this.longia === feature;
        else if (feature instanceof Latia)
            return this.latia === feature;
        else if (feature instanceof MinorLoke)
            return this.minorLoke === feature;
        else if (feature instanceof Nosia)
            return this.nosia === feature;
        else {
            switch (feature) {
                case Quality.LABIAL:
                    return this.loke.foner === Foner.LABIA || this.minorLoke === MinorLoke.LABIALIZED;
                case Quality.CORONAL:
                    return this.loke.foner === Foner.CORONA;
                case Quality.DORSAL:
                    return this.loke.foner === Foner.DORSUM;
                case Quality.GUTTURAL:
                    return this.loke.foner === Foner.PHARYNX || this.minorLoke === MinorLoke.PHARYNGEALIZED;
                case Quality.NASAL:
                    return this.mode === Mode.NASAL || this.nosia === Nosia.NASALIZED;
                case Quality.ALVEOLAR:
                    return this.is(Loke.ALVEOLAR) || (this.is(Loke.DENTAL) && this.mode !== Mode.FRICATE && this.mode !== Mode.AFFRICATE);
                case Quality.CONTINUANT:
                    return this.mode === Mode.FRICATE || this.mode === Mode.TRILL || this.mode.sonority >= Mode.CLOSE.sonority;
                case Quality.OCCLUSIVE:
                    return !this.is(Quality.CONTINUANT);
                case Quality.SONORANT:
                    return this.mode.sonority >= Mode.NASAL.sonority;
                case Quality.OBSTRUENT:
                    return !this.is(Quality.SONORANT);
                case Quality.VIBRANT:
                    return this.mode === Mode.TAP || this.mode === Mode.TRILL;
                case Quality.HIGH:
                    return this.is(Quality.VOCOID) && (this.mode === Mode.CLOSE || this.mode === Mode.NEAR_CLOSE);
                case Quality.MID:
                    return this.is(Quality.VOCOID) && (this.mode === Mode.CLOSE_MID || this.mode === Mode.OPEN_MID);
                case Quality.LOW:
                    return this.is(Quality.VOCOID) && (this.mode === Mode.NEAR_OPEN || this.mode === Mode.OPEN);
                case Quality.TENSE:
                    return this.mode === Mode.CLOSE || this.mode === Mode.CLOSE_MID || this.mode === Mode.OPEN;
                case Quality.LAX:
                    return this.mode === Mode.NEAR_CLOSE || this.mode === Mode.OPEN_MID || this.mode === Mode.NEAR_OPEN;
                case Quality.PALATAL:
                    return !this.is(Quality.LOW) && (this.loke === Loke.PALATAL || this.loke === Loke.POSTALVEOLAR || this.minorLoke === MinorLoke.PALATALIZED);
                case Quality.VELAR:
                    return !this.is(Quality.LOW) && (this.loke === Loke.VELAR || this.minorLoke === MinorLoke.VELARIZED);
                case Quality.PHARANGEAL:
                    return this.loke === Loke.EPIGLOTTAL || this.minorLoke === MinorLoke.PHARYNGEALIZED;
                case Quality.SIBILANT:
                    return (this.mode === Mode.AFFRICATE || this.mode === Mode.FRICATE) &&
                        (this.loke === Loke.ALVEOLAR || this.loke === Loke.POSTALVEOLAR);
                case Quality.LIQUID:
                    return this.voze === Voze.VOICED && ((this.is(Quality.SONORANT) && !this.is(Mode.NASAL) && (this.is(Quality.CORONAL) || this.loke === Loke.UVULAR)) ||
                        (this.mode === Mode.FRICATE && this.loke === Loke.UVULAR));
                case Quality.RHOTIC:
                    return this.is(Quality.LIQUID) && !this.is(Latia.LATERAL);
                case Quality.WIBBLY:
                    return this.is(Quality.LABIAL) && (this.is(Quality.SONORANT) || (this.is(Voze.VOICED) &&
                        this.is(Mode.FRICATE))) && this.is(Silabia.NONSYLLABIC);
                case Quality.VOCOID:
                    return this.mode.sonority >= Mode.CLOSE.sonority && this.latia === Latia.MEDIAN &&
                        this.loke.foner === Foner.DORSUM;
                case Quality.GLIDE:
                    return this.silabia === Silabia.NONSYLLABIC && this.is(Quality.VOCOID);
                case Quality.VOWEL:
                    return this.silabia !== Silabia.NONSYLLABIC && this.is(Quality.VOCOID);
                case Quality.SORDID:
                    return this.voze !== Voze.VOICED && this.voze !== Voze.BREATHY;
                case Quality.STRESSED:
                    return this.silabia === Silabia.PRIMARY_STRESSED || this.silabia === Silabia.SECONDARY_STRESSED;
                case Quality.SYLLABIC:
                    return this.silabia !== Silabia.NONSYLLABIC;
                case Quality.SPOKEN:
                    return true;
                default:
                    throw new Error("can't check for ".concat(feature, "ness"));
            }
        }
    };
    /**
     * return a fone that is identical to this, except that it has the given feature
     */
    Sound.prototype.with = function (feature) {
        if (!this.is(feature))
            return new Klas([feature]).apply(this);
        else
            return this;
    };
    /**
     * losslessly represent this as a string
     */
    Sound.prototype.hash = function () {
        return this.silabia.enumKey.slice(0, 2) +
            this.longia.enumKey.slice(0, 2) +
            this.minorLoke.enumKey.slice(0, 2) +
            this.nosia.enumKey.slice(0, 2) +
            this.latia.enumKey.slice(0, 2) +
            this.voze.enumKey.slice(0, 2) +
            this.loke.enumKey +
            this.mode.enumKey;
    };
    Sound.prototype.toString = function () {
        return this.silabia.enumKey.toLowerCase() + " " +
            this.longia.enumKey.toLowerCase() + " " +
            this.minorLoke.enumKey.toLowerCase() + " " +
            this.nosia.enumKey.toLowerCase() + " " +
            this.latia.enumKey.toLowerCase() + " " +
            this.voze.enumKey.toLowerCase() + " " +
            this.loke.enumKey.toLowerCase() + " " +
            this.mode.enumKey.toLowerCase();
    };
    Sound.prototype.getSonority = function () {
        return this.mode.sonority
            - ((this.latia === Latia.LATERAL) ? 1.5 : 0)
            + ((this.voze === Voze.VOICED) ? 0.75 : 0)
            + (this.is(Quality.VOCOID) ? 1 : 0);
    };
    /** the default phone, to be used for insertion rules */
    Sound.BLANK = new Sound(null, null, Voze.VOICED, Silabia.NONSYLLABIC, Longia.SHORT, Latia.MEDIAN, MinorLoke.UNROUNDED, Nosia.ORAL);
    return Sound;
}());
export { Sound };
/** collection of phonological features */
var Klas = /** @class */ (function () {
    /**
     * assemble a collection of phonological features to describe, qualify, or alter a Sound.
     * @param plus features that the Sound must have, or that will be applied to it.
     * @param minus features that the Sound must not have.
     * @param alpha features that the Sound may or may not have depending on context. this one is specifically used
     *              when applying a Klas to a Sound; if there are any of these alpha features, a reference Sound must
     *              also be passed, and the specified alpha features will be copied from that reference.
     */
    function Klas(plus, minus, alpha) {
        if (minus === void 0) { minus = []; }
        if (alpha === void 0) { alpha = []; }
        this.required = plus;
        this.forbidden = minus;
        this.tracked = alpha;
    }
    /**
     * does sound have all of the properties of this class?
     */
    Klas.prototype.matches = function (sound) {
        var e_5, _a, e_6, _b;
        try {
            for (var _c = __values(this.required), _d = _c.next(); !_d.done; _d = _c.next()) {
                var feature = _d.value;
                if (!sound.is(feature))
                    return false;
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_5) throw e_5.error; }
        }
        try {
            for (var _e = __values(this.forbidden), _f = _e.next(); !_f.done; _f = _e.next()) {
                var feature = _f.value;
                if (sound.is(feature))
                    return false;
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_6) throw e_6.error; }
        }
        return true;
    };
    /**
     * does this Klas have only negative requirements, such that the absense of speech can match?
     */
    Klas.prototype.matchesSilence = function () {
        return this.required.length === 0;
    };
    /**
     * does this Klas have any "tracked" requirements, such that applying it will require a reference sound?
     */
    Klas.prototype.referencesAnything = function () {
        return this.tracked.length > 0;
    };
    /**
     * create a Sound with all of the properties of this, and similar to sound in every other respect.
     * @param sound the foneme that is being made to conform here
     * @param ref if this.ka has stuff in it, draw those features from ref.
     */
    Klas.prototype.apply = function (sound, ref) {
        var e_7, _a, e_8, _b;
        if (sound === void 0) { sound = Sound.BLANK; }
        if (ref === void 0) { ref = null; }
        if (this.forbidden.length > 0)
            throw Error("you can't use -".concat(this.forbidden[0], " in the final state of a process!"));
        if (this.required.length === 0 && this.tracked.length === 0) // if there are no properties, you don't have to do anything
            return sound;
        var mode = sound.mode, loke = sound.loke, voze = sound.voze;
        var silabia = sound.silabia, longia = sound.longia, latia = sound.latia, minorLoke = sound.minorLoke, nosia = sound.nosia;
        try {
            for (var _c = __values(this.required), _d = _c.next(); !_d.done; _d = _c.next()) {
                var feature = _d.value;
                if (feature === Quality.RAISED) { // there are two special PendaniSif that depend on the current quality of the fone
                    if (sound.is(Quality.LOW))
                        feature = Quality.MID;
                    else if (sound.is(Quality.MID))
                        feature = Quality.HIGH;
                    else if (sound.is(Quality.HIGH))
                        feature = Voze.EJECTIVE; // ejective vowels aren't possible; this indicates that it should be diphthongized
                    else
                        throw new Error("can't apply +RAISED to ".concat(sound));
                }
                if (feature === Quality.LOWERED) { // so interpret those first
                    if (sound.is(Quality.HIGH))
                        feature = Quality.MID;
                    else if (sound.is(Quality.VOCOID))
                        feature = Quality.LOW;
                    else
                        throw new Error("can't apply +LOWERED to ".concat(sound));
                }
                if (feature instanceof Mode) // then actually apply the feature
                    mode = feature;
                else if (feature instanceof Loke)
                    loke = feature;
                else if (feature instanceof Voze)
                    voze = feature;
                else if (feature instanceof Silabia)
                    silabia = feature;
                else if (feature instanceof Longia)
                    longia = feature;
                else if (feature instanceof Latia)
                    latia = feature;
                else if (feature instanceof MinorLoke)
                    minorLoke = feature;
                else if (feature instanceof Nosia)
                    nosia = feature;
                else {
                    switch (feature) {
                        case Quality.PALATAL:
                            loke = Loke.PALATAL;
                            break;
                        case Quality.VELAR:
                            loke = Loke.VELAR;
                            break;
                        case Quality.ALVEOLAR:
                            loke = Loke.ALVEOLAR;
                            break;
                        case Quality.NASAL:
                            mode = Mode.NASAL;
                            break;
                        case Quality.HIGH:
                            if (sound.is(Quality.LAX))
                                mode = Mode.NEAR_CLOSE;
                            else
                                mode = Mode.CLOSE;
                            break;
                        case Quality.MID:
                            if (sound.is(Quality.LAX))
                                mode = Mode.OPEN_MID;
                            else
                                mode = Mode.CLOSE_MID;
                            break;
                        case Quality.LOW:
                            if (sound.is(Quality.LAX))
                                mode = Mode.NEAR_OPEN;
                            else
                                mode = Mode.OPEN;
                            break;
                        case Quality.TENSE:
                            if (!sound.is(Quality.VOCOID))
                                throw RangeError("can't tense a nonvocoid");
                            else if (mode === Mode.NEAR_CLOSE)
                                mode = Mode.CLOSE;
                            else if (mode === Mode.OPEN_MID)
                                mode = Mode.CLOSE_MID;
                            else if (mode === Mode.NEAR_OPEN)
                                mode = Mode.OPEN;
                            break;
                        case Quality.LAX:
                            if (!sound.is(Quality.VOCOID))
                                throw RangeError("can't lax a nonvocoid");
                            else if (mode === Mode.CLOSE)
                                mode = Mode.NEAR_CLOSE;
                            else if (mode === Mode.CLOSE_MID)
                                mode = Mode.OPEN_MID;
                            else if (mode === Mode.OPEN)
                                mode = Mode.NEAR_OPEN;
                            break;
                        case Quality.SYLLABIC:
                            if (silabia === Silabia.NONSYLLABIC)
                                silabia = Silabia.UNSTRESSED;
                            break;
                        default:
                            throw Error("I can't use ".concat(feature, " in the final state of a process."));
                    }
                }
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_7) throw e_7.error; }
        }
        if (this.tracked.length > 0 && ref === null)
            throw new Error("this process uses ± symbols but it's not clear what sound it's supposed to use to decide between + and -.");
        try {
            for (var _e = __values(this.tracked), _f = _e.next(); !_f.done; _f = _e.next()) { // match features from ka
                var axis = _f.value;
                if (axis === 'loke')
                    loke = ref.loke;
                else if (axis === 'voze')
                    voze = ref.voze;
                else if (axis === 'minorLoke')
                    minorLoke = ref.minorLoke;
                else if (axis === 'silabia')
                    silabia = ref.silabia;
                else
                    throw Error("I can't understand ".concat(axis));
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_8) throw e_8.error; }
        }
        if (mode === null || loke === null)
            throw new Error("there shouldn't be Sounds with null attributes anymore.");
        if (loke === Loke.UVULAR && mode.sonority >= Mode.CLOSE.sonority) // turn uvular vowels into regular back vowels so I don't have to worry about dorsal nonvowel approximants
            loke = Loke.VELAR;
        if (loke === Loke.CENTRAL && mode.sonority < Mode.CLOSE.sonority) // turn central nonvowels into regular velar vowels
            loke = Loke.VELAR;
        if (mode === Mode.NEAR_CLOSE) // snap close-mid central vowels to front or back depending on rounding
            loke = (minorLoke === MinorLoke.LABIALIZED) ? Loke.VELAR : Loke.PALATAL;
        if (mode.sonority >= Mode.NEAR_OPEN.sonority && minorLoke === MinorLoke.LABIALIZED) // snap rounded low vowel to back
            loke = Loke.VELAR;
        if (mode === Mode.NEAR_OPEN && minorLoke === MinorLoke.LABIALIZED) // snap near-open vowels to the nearest IPA symbol
            mode = Mode.OPEN_MID;
        if (mode === Mode.NEAR_OPEN && loke === Loke.VELAR)
            loke = Loke.CENTRAL;
        if (mode === Mode.STOP || mode === Mode.NASAL)
            latia = Latia.MEDIAN;
        if ((minorLoke === MinorLoke.LABIALIZED && loke.foner === Foner.LABIA) ||
            (minorLoke === MinorLoke.PALATALIZED && (loke === Loke.POSTALVEOLAR || loke === Loke.PALATAL)) ||
            (minorLoke === MinorLoke.VELARIZED && loke === Loke.VELAR) ||
            (minorLoke === MinorLoke.PHARYNGEALIZED && loke.foner === Foner.PHARYNX)) // make sure the secondary articulation does not conflict with the primary articulation
            minorLoke = MinorLoke.UNROUNDED;
        if (nosia === Nosia.NASALIZED && mode === Mode.NASAL) // make sure nasal consonants are not also nasalized
            nosia = Nosia.ORAL;
        if (loke === Loke.POSTALVEOLAR && mode === Mode.STOP) // turn postalveolar stops into affricates before they can be cast to dental
            mode = Mode.AFFRICATE;
        if ([Loke.DENTAL, Loke.ALVEOLAR, Loke.POSTALVEOLAR].includes(loke))
            if (![Mode.FRICATE, Mode.AFFRICATE].includes(mode) || latia === Latia.LATERAL) // simplify alveolar-ish sounds to dental
                loke = Loke.DENTAL;
        if ((minorLoke === MinorLoke.LABIALIZED && loke.foner === Foner.LABIA) ||
            (minorLoke === MinorLoke.PALATALIZED && (loke === Loke.PALATAL || loke === Loke.POSTALVEOLAR)) ||
            (minorLoke === MinorLoke.VELARIZED && loke === Loke.VELAR) ||
            (minorLoke === MinorLoke.PHARYNGEALIZED && loke.foner === Foner.PHARYNX) ||
            (nosia === Nosia.NASALIZED && mode === Mode.NASAL))
            minorLoke = MinorLoke.UNROUNDED;
        if (mode === Mode.CLICK) { // only specific types of click are allowd (this is not realistic, but I'm simplifying the possible click systems because I don't understand clicks)
            if (latia === Latia.LATERAL)
                loke = Loke.PALATAL;
            else if (loke.foner === Foner.DORSUM || loke === Loke.POSTALVEOLAR)
                loke = Loke.PALATAL;
            else if (loke.foner === Foner.LABIA)
                loke = Loke.BILABIAL;
            else if (loke === Loke.POSTALVEOLAR || loke === Loke.RETROFLEX)
                loke = Loke.RETROFLEX;
            else
                loke = Loke.ALVEOLAR;
        }
        if (((mode === Mode.NASAL || nosia === Nosia.NASALIZED) && loke.foner === Foner.PHARYNX) ||
            ((voze === Voze.VOICED || voze === Voze.BREATHY || voze === Voze.EJECTIVE) && loke === Loke.GLOTTAL) ||
            (mode === Mode.TAP && loke.foner !== Foner.CORONA && loke !== Loke.LABIODENTAL) ||
            (mode === Mode.TRILL && loke !== Loke.BILABIAL && loke !== Loke.DENTAL && loke !== Loke.UVULAR) ||
            (latia === Latia.LATERAL && loke.foner !== Foner.CORONA && loke !== Loke.PALATAL && loke !== Loke.VELAR) ||
            (mode.sonority > Mode.CLOSE.sonority && loke.foner !== Foner.DORSUM)) // if this change is impossible for whatever reason
            return sound; // cancel it
        else // otherwise
            return new Sound(mode, loke, voze, silabia, longia, latia, minorLoke, nosia); // bring it all together!
    };
    Klas.prototype.toString = function () {
        return "Klas(+[".concat(this.required.join(", "), "], -[").concat(this.forbidden.join(", "), "])");
    };
    return Klas;
}());
export { Klas };
//# sourceMappingURL=sound.js.map