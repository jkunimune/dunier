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
var e_1, _a, e_2, _b, e_3, _c;
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import { Random } from "../utilities/random.js";
import { Dialect, WordType, ProtoLang } from "../language/lect.js";
import { Biome, BIOME_NAMES } from "./terrain.js";
import UNPARSED_KULTUR_ASPECTS from "../../resources/culture.js";
var DRIFT_RATE = .05; // fraccion of minor attributes that change each century
var ConditionType;
(function (ConditionType) {
    ConditionType[ConditionType["REQUIREMENT"] = 0] = "REQUIREMENT";
    ConditionType[ConditionType["INCOMPATIBLE"] = 1] = "INCOMPATIBLE";
    ConditionType[ConditionType["TECH_LEVEL"] = 2] = "TECH_LEVEL";
})(ConditionType || (ConditionType = {}));
// do some postprocessing on the array of attributes you loaded
export var KULTUR_ASPECTS = [];
try {
    for (var UNPARSED_KULTUR_ASPECTS_1 = __values(UNPARSED_KULTUR_ASPECTS), UNPARSED_KULTUR_ASPECTS_1_1 = UNPARSED_KULTUR_ASPECTS_1.next(); !UNPARSED_KULTUR_ASPECTS_1_1.done; UNPARSED_KULTUR_ASPECTS_1_1 = UNPARSED_KULTUR_ASPECTS_1.next()) {
        var _d = UNPARSED_KULTUR_ASPECTS_1_1.value, key = _d.key, chance = _d.chance, features = _d.features;
        var aspect = {
            key: key, chance: chance, logaIndex: null, features: [],
        };
        for (var i = 0; i < features.length; i++) {
            var _e = features[i], key_1 = _e.key, newWord = _e.newWord, values = _e.values;
            var feature = {
                key: key_1, possibleValues: [],
            };
            if (newWord) {
                if (aspect.logaIndex !== null)
                    throw new Error("you marked two features as having new words but in the current scheme only one can.");
                aspect.logaIndex = i;
            }
            try {
                for (var values_1 = (e_2 = void 0, __values(values)), values_1_1 = values_1.next(); !values_1_1.done; values_1_1 = values_1.next()) {
                    var _f = values_1_1.value, key_2 = _f.key, klas = _f.klas, conditions = _f.conditions;
                    var possibleValue = {
                        key: key_2, klas: (klas !== "none") ? klas : key_2, conditions: [],
                    };
                    try {
                        for (var conditions_1 = (e_3 = void 0, __values(conditions)), conditions_1_1 = conditions_1.next(); !conditions_1_1.done; conditions_1_1 = conditions_1.next()) {
                            var conditionString = conditions_1_1.value;
                            var condition = // and parse every requirement, checking if it starts with "+", "-", or "tech>"
                             void 0; // and parse every requirement, checking if it starts with "+", "-", or "tech>"
                            if (conditionString.startsWith("+"))
                                condition = { type: ConditionType.REQUIREMENT, value: conditionString.slice(1) };
                            else if (conditionString.startsWith("-"))
                                condition = { type: ConditionType.INCOMPATIBLE, value: conditionString.slice(1) };
                            else if (conditionString.startsWith("tech>"))
                                condition = {
                                    type: ConditionType.TECH_LEVEL,
                                    value: Math.exp((Number.parseFloat(conditionString.slice(5)) + 3000) / 1400)
                                };
                            else
                                throw new Error("can't parse this condition string: '".concat(conditionString, "'."));
                            possibleValue.conditions.push(condition);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (conditions_1_1 && !conditions_1_1.done && (_c = conditions_1.return)) _c.call(conditions_1);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    feature.possibleValues.push(possibleValue);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (values_1_1 && !values_1_1.done && (_b = values_1.return)) _b.call(values_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            aspect.features.push(feature);
        }
        KULTUR_ASPECTS.push(aspect);
    }
}
catch (e_1_1) { e_1 = { error: e_1_1 }; }
finally {
    try {
        if (UNPARSED_KULTUR_ASPECTS_1_1 && !UNPARSED_KULTUR_ASPECTS_1_1.done && (_a = UNPARSED_KULTUR_ASPECTS_1.return)) _a.call(UNPARSED_KULTUR_ASPECTS_1);
    }
    finally { if (e_1) throw e_1.error; }
}
/**
 * a class that contains factoids about a people group.
 */
var Culture = /** @class */ (function () {
    /**
     * base a culture off of some ancestor culture, with some changes
     * @param parent the proto-culture off of which this one is based
     * @param homeland the place that will serve as the new cultural capital
     * @param government the Civ that rules this people
     * @param seed a random number seed
     */
    function Culture(parent, homeland, government, seed) {
        var e_4, _a, e_5, _b, e_6, _c, e_7, _d;
        var rng = new Random(seed);
        this.featureLists = [];
        this.government = government;
        this.homeland = homeland;
        this.klas = new Set();
        // start by assigning the deterministic cultural classes it has from its location
        this.klas.add(BIOME_NAMES[homeland.biome]);
        try {
            for (var _e = __values(this.homeland.neighbors.keys()), _f = _e.next(); !_f.done; _f = _e.next()) {
                var neibor = _f.value;
                if (neibor.biome === Biome.OCEAN)
                    this.klas.add("coastal");
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            }
            finally { if (e_4) throw e_4.error; }
        }
        // TODO: define mountainousness and add class for "mountainous"
        if (homeland.surface.hasDayNightCycle)
            this.klas.add("day_night_cycle");
        if (homeland.surface.hasSeasons(homeland.φ))
            this.klas.add("four_seasons");
        if (homeland === government.capital)
            this.klas.add("nation_state");
        // TODO: have flag for nomadic and sedentary
        if (parent === null) {
            this.lect = new ProtoLang(rng); // create a new language from scratch
            try {
                for (var KULTUR_ASPECTS_1 = __values(KULTUR_ASPECTS), KULTUR_ASPECTS_1_1 = KULTUR_ASPECTS_1.next(); !KULTUR_ASPECTS_1_1.done; KULTUR_ASPECTS_1_1 = KULTUR_ASPECTS_1.next()) { // make up a whole new culture
                    var aspect = KULTUR_ASPECTS_1_1.value;
                    if (rng.probability(aspect.chance)) {
                        var featureList = [];
                        try {
                            for (var _g = (e_6 = void 0, __values(aspect.features)), _h = _g.next(); !_h.done; _h = _g.next()) {
                                var feature = _h.value;
                                var value = rng.choice(this.compatibleOptions(feature.possibleValues));
                                featureList.push(value); // pick all these things freely
                                this.klas.add(value.klas); // be sure to get note their classes to keep everything compatible
                            }
                        }
                        catch (e_6_1) { e_6 = { error: e_6_1 }; }
                        finally {
                            try {
                                if (_h && !_h.done && (_c = _g.return)) _c.call(_g);
                            }
                            finally { if (e_6) throw e_6.error; }
                        }
                        this.featureLists.push(featureList);
                    }
                    else {
                        this.featureLists.push(null); // unless it's not notable, in which case it's all null
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (KULTUR_ASPECTS_1_1 && !KULTUR_ASPECTS_1_1.done && (_b = KULTUR_ASPECTS_1.return)) _b.call(KULTUR_ASPECTS_1);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
        else {
            this.lect = new Dialect(parent.lect, rng);
            for (var i = 0; i < KULTUR_ASPECTS.length; i++) {
                var featureList = void 0;
                if (parent.featureLists[i] === null) {
                    if (rng.probability(DRIFT_RATE * KULTUR_ASPECTS[i].chance)) {
                        featureList = [];
                        try {
                            for (var _j = (e_7 = void 0, __values(KULTUR_ASPECTS[i].features)), _k = _j.next(); !_k.done; _k = _j.next()) {
                                var feature = _k.value;
                                var featureValue = rng.choice(this.compatibleOptions(feature.possibleValues));
                                featureList.push(featureValue); // pick all these things freely
                                this.klas.add(featureValue.klas); // be sure to get note their classes to keep everything compatible
                            }
                        }
                        catch (e_7_1) { e_7 = { error: e_7_1 }; }
                        finally {
                            try {
                                if (_k && !_k.done && (_d = _j.return)) _d.call(_j);
                            }
                            finally { if (e_7) throw e_7.error; }
                        }
                    }
                    else {
                        featureList = null;
                    }
                }
                else {
                    if (rng.probability(DRIFT_RATE * (1 - KULTUR_ASPECTS[i].chance))) {
                        featureList = null;
                    }
                    else {
                        featureList = parent.featureLists[i].slice();
                        for (var j = 0; j < KULTUR_ASPECTS[i].features.length; j++) {
                            if (!this.isCompatible(featureList[j].conditions) || rng.probability(DRIFT_RATE)) { // and occasionally
                                featureList[j] = rng.choice(this.compatibleOptions(KULTUR_ASPECTS[i].features[j].possibleValues)); // make a modificacion
                                this.klas.add(featureList[j].klas);
                            }
                            else {
                                this.klas.add(featureList[j].klas);
                            }
                        }
                    }
                }
                this.featureLists[i] = featureList; // base this off of it
            }
        }
    }
    /**
     * return the list of valid options for this cultural feature
     * @param options the Options from which to choose
     */
    Culture.prototype.compatibleOptions = function (options) {
        var _this = this;
        return options.filter(function (option) { return _this.isCompatible(option.conditions); });
    };
    /**
     * check if this Culture is compatible with this list of stipulations
     */
    Culture.prototype.isCompatible = function (conditions) {
        var e_8, _a;
        try {
            for (var conditions_2 = __values(conditions), conditions_2_1 = conditions_2.next(); !conditions_2_1.done; conditions_2_1 = conditions_2.next()) {
                var condition = conditions_2_1.value;
                switch (condition.type) {
                    case ConditionType.REQUIREMENT:
                        if (!this.klas.has(condition.value))
                            return false;
                        break;
                    case ConditionType.INCOMPATIBLE:
                        if (this.klas.has(condition.value))
                            return false;
                        break;
                    case ConditionType.TECH_LEVEL:
                        if (this.government.technology < condition.value)
                            return false;
                }
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (conditions_2_1 && !conditions_2_1.done && (_a = conditions_2.return)) _a.call(conditions_2);
            }
            finally { if (e_8) throw e_8.error; }
        }
        return true;
    };
    Culture.prototype.getName = function () {
        return this.lect.getName(this.homeland.index.toString(), WordType.PEOPLE);
    };
    return Culture;
}());
export { Culture };
//# sourceMappingURL=culture.js.map