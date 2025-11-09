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
import { Dialect, ProtoLect } from "./language/lect.js";
import { Biome } from "./terrain.js";
import UNPARSED_KULTUR_ASPECTS from "../../resources/culture.js";
import { POPULATION_DENSITY } from "./world.js";
/** the number of centuries it takes for two cultures to really consider themselves separate */
var IDENTITY_FORMATION_TIME = 2;
/** fraccion of minor attributes that change each century */
var DRIFT_RATE = .05;
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
                        key: key_2, klas: klas, conditions: [],
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
     * @param technology the current technology level to which these people have access
     * @param seed a random number seed
     */
    function Culture(parent, homeland, technology, seed) {
        var e_4, _a, e_5, _b;
        this.parent = parent;
        this.rng = new Random(seed);
        this.featureLists = [];
        this.homeland = homeland;
        if (parent === null) {
            this.lect = new ProtoLect(homeland.index, this.rng); // create a new language from scratch
            var classes = new Set();
            try {
                for (var KULTUR_ASPECTS_1 = __values(KULTUR_ASPECTS), KULTUR_ASPECTS_1_1 = KULTUR_ASPECTS_1.next(); !KULTUR_ASPECTS_1_1.done; KULTUR_ASPECTS_1_1 = KULTUR_ASPECTS_1.next()) { // make up a whole new culture
                    var aspect = KULTUR_ASPECTS_1_1.value;
                    if (this.rng.probability(aspect.chance)) {
                        var featureList = [];
                        try {
                            for (var _c = (e_5 = void 0, __values(aspect.features)), _d = _c.next(); !_d.done; _d = _c.next()) {
                                var feature = _d.value;
                                var value = this.rng.choice(compatibleOptions(classes, feature.possibleValues, technology));
                                featureList.push(value); // pick all these things freely
                                classes.add(value.klas); // be sure to get note their classes to keep everything compatible
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                        this.featureLists.push(featureList);
                    }
                    else {
                        this.featureLists.push(null); // unless it's not notable, in which case it's all null
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (KULTUR_ASPECTS_1_1 && !KULTUR_ASPECTS_1_1.done && (_a = KULTUR_ASPECTS_1.return)) _a.call(KULTUR_ASPECTS_1);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
        else {
            this.lect = parent.lect;
            this.featureLists = parent.featureLists;
        }
        this.tiles = new Set();
    }
    Culture.prototype.update = function () {
        var e_6, _a, e_7, _b;
        // advance the language thru time
        this.lect = new Dialect(this.lect, this.homeland.index, this.rng);
        // calculate the highest tech that's available to the entire culture
        var technology = Infinity;
        try {
            for (var _c = __values(this.tiles), _d = _c.next(); !_d.done; _d = _c.next()) {
                var tile = _d.value;
                if (tile.government.technology < technology)
                    technology = tile.government.technology;
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_6) throw e_6.error; }
        }
        var classes = new Set();
        // start by assigning the deterministic cultural classes it has from its location
        if ([Biome.JUNGLE, Biome.STEAMLAND, Biome.DESERT].includes(this.homeland.biome))
            classes.add("hot");
        if ([Biome.TAIGA, Biome.TUNDRA].includes(this.homeland.biome))
            classes.add("cold");
        if ([Biome.JUNGLE, Biome.STEAMLAND].includes(this.homeland.biome))
            classes.add("humid");
        if ([Biome.DESERT, Biome.TUNDRA].includes(this.homeland.biome))
            classes.add("arid");
        if ([Biome.DESERT, Biome.GRASSLAND].includes(this.homeland.biome))
            classes.add("plains");
        if ([Biome.DESERT, Biome.STEAMLAND].includes(this.homeland.biome))
            classes.add("barren");
        if (this.homeland.biome === Biome.DESERT)
            classes.add("sandy");
        if (this.homeland.coastal)
            classes.add("coastal");
        if (this.homeland.height > 3)
            classes.add("mountainous"); // TODO: someday mountainousness will be independent of altitude
        if (this.homeland.surface.hasDayNightCycle)
            classes.add("day_night_cycle");
        if (this.homeland.surface.hasSeasons(this.homeland.φ))
            classes.add("four_seasons");
        if (this.hasNationState())
            classes.add("nation_state");
        // then go thru and update the individual cultural aspects
        for (var i = 0; i < KULTUR_ASPECTS.length; i++) {
            var newFeatureList = void 0;
            if (this.featureLists[i] === null) {
                // if you're developing a whole new aspect where we used to have none
                if (this.rng.probability(DRIFT_RATE * KULTUR_ASPECTS[i].chance)) {
                    newFeatureList = [];
                    try {
                        for (var _e = (e_7 = void 0, __values(KULTUR_ASPECTS[i].features)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var feature = _f.value;
                            var featureValue = this.rng.choice(compatibleOptions(classes, feature.possibleValues, technology));
                            newFeatureList.push(featureValue); // pick all these things freely
                            classes.add(featureValue.klas); // be sure to get note their classes to keep everything compatible
                        }
                    }
                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                        }
                        finally { if (e_7) throw e_7.error; }
                    }
                }
                else {
                    newFeatureList = null;
                }
            }
            else {
                // if you're losing a cultural aspect
                if (this.rng.probability(DRIFT_RATE * (1 - KULTUR_ASPECTS[i].chance))) {
                    newFeatureList = null;
                }
                // if you're keeping but mutating a cultural aspect
                else {
                    newFeatureList = this.featureLists[i].slice();
                    for (var j = 0; j < KULTUR_ASPECTS[i].features.length; j++) {
                        if (!isCompatible(classes, newFeatureList[j].conditions, technology) || this.rng.probability(DRIFT_RATE)) {
                            newFeatureList[j] = this.rng.choice(compatibleOptions(classes, KULTUR_ASPECTS[i].features[j].possibleValues, technology)); // make a modificacion
                            classes.add(newFeatureList[j].klas);
                        }
                        else {
                            classes.add(newFeatureList[j].klas);
                        }
                    }
                }
            }
            this.featureLists[i] = newFeatureList; // base this off of it
        }
    };
    Culture.prototype.spreadTo = function (tile) {
        if (tile.culture !== null)
            tile.culture.recedeFrom(tile);
        this.tiles.add(tile);
        tile.culture = this;
    };
    Culture.prototype.recedeFrom = function (tile) {
        tile.culture.tiles.delete(tile);
        tile.culture = null;
    };
    Culture.prototype.hasNationState = function () {
        return this.homeland === this.homeland.government.capital;
    };
    Culture.prototype.getPopulation = function () {
        var e_8, _a;
        var totalPopulation = 0;
        try {
            for (var _b = __values(this.tiles), _c = _b.next(); !_c.done; _c = _b.next()) {
                var tile = _c.value;
                totalPopulation += POPULATION_DENSITY * tile.government.technology * tile.arableArea;
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_8) throw e_8.error; }
        }
        return Math.round(totalPopulation);
    };
    /**
     * are these two cultures so recently diverged that they're basically the same?
     */
    Culture.prototype.areSiblings = function (that) {
        return this.getAncestor(IDENTITY_FORMATION_TIME) === that.getAncestor(IDENTITY_FORMATION_TIME);
    };
    /**
     * get the culture that this was n timesteps ago
     */
    Culture.prototype.getAncestor = function (n) {
        if (n <= 0 || this.parent === null)
            return this;
        else
            return this.parent.getAncestor(n - 1);
    };
    ;
    Culture.prototype.getName = function () {
        return this.lect.standardRegister.getEthnonym(this.homeland.index);
    };
    Culture.prototype.getAdjective = function () {
        return this.lect.standardRegister.getTopoAdjective(this.homeland.index);
    };
    return Culture;
}());
export { Culture };
/**
 * return the list of valid options for this cultural feature
 * @param classes the set of classes with which these Options must be compatible
 * @param options the Options from which to choose
 * @param technology the current available technology level
 */
function compatibleOptions(classes, options, technology) {
    return options.filter(function (option) { return isCompatible(classes, option.conditions, technology); });
}
/**
 * check if this Culture is compatible with this list of stipulations
 */
function isCompatible(classes, conditions, technology) {
    var e_9, _a;
    try {
        for (var conditions_2 = __values(conditions), conditions_2_1 = conditions_2.next(); !conditions_2_1.done; conditions_2_1 = conditions_2.next()) {
            var condition = conditions_2_1.value;
            switch (condition.type) {
                case ConditionType.REQUIREMENT:
                    if (!classes.has(condition.value))
                        return false;
                    break;
                case ConditionType.INCOMPATIBLE:
                    if (classes.has(condition.value))
                        return false;
                    break;
                case ConditionType.TECH_LEVEL:
                    if (technology < condition.value)
                        return false;
            }
        }
    }
    catch (e_9_1) { e_9 = { error: e_9_1 }; }
    finally {
        try {
            if (conditions_2_1 && !conditions_2_1.done && (_a = conditions_2.return)) _a.call(conditions_2);
        }
        finally { if (e_9) throw e_9.error; }
    }
    return true;
}
//# sourceMappingURL=culture.js.map