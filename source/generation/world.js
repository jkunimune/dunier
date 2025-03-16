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
/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import Queue from '../datastructures/queue.js';
import { Civ } from "./civ.js";
export var START_OF_HUMAN_HISTORY = -3200; // [BCE]
export var TIME_STEP = 100; // [year]
export var CIVILIZATION_RATE = 1e-7; // [1/year/km^2] rate at which people coalesce into kingdoms
export var REBELLION_RATE = 2e-7; // [1/year/km^2] rate at which people start revolucions
export var NATIONALISM_FACTOR = 3.0; // [] factor by which oppressed minorities are more likely to rebel
export var CONQUEST_RATE = 1.5e-1; // [km/y] the rate at which denizens conquer
export var TECH_ADVANCEMENT_RATE = 5e-8; // [1/y] the rate at which denizens have good ideas
export var POPULATION_DENSITY = .20; // [1/km^2] density of people that can live in one unit of arable land with entry-level technology
export var TECH_SPREAD_RATE = .01; // [1/year] rate at which ideas spread across borders
export var APOCALYPSE_SURVIVAL_RATE = .80; // [] the fraccion of the populacion a country gets to keep after a cataclysm (not accounting for domino effects)
export var MEAN_EMPIRE_LIFETIME = 1000; // [year] time it takes for an empire's might to decay by 2.7
export var MEAN_ASSIMILATION_TIME = 160; // [year] time it takes to erase a people's language
export var SLOPE_FACTOR = 100; // [] multiplier on vertical distances TODO: use the minimum slope that a military can traverse instead
/**
 * collection of civilizations and languages that goes on a planet
 */
var World = /** @class */ (function () {
    function World(cataclysms, planet) {
        this.cataclysms = cataclysms;
        this.planet = planet;
        this.civs = new Set(); // list of countries in the world
        this.nextID = 0;
        this.politicalMap = new Map();
    }
    /**
     * populate the World with all the civs and stuff.
     * @param year the number of years to simulate
     * @param rng the random number generator to use
     */
    World.prototype.generateHistory = function (year, rng) {
        var e_1, _a;
        for (var t = START_OF_HUMAN_HISTORY; t < year; t += TIME_STEP) {
            try {
                for (var _b = (e_1 = void 0, __values(this.civs)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var civ = _c.value;
                    if (civ.tileTree.size > 0)
                        civ.update(rng);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            this.spawnCivs(rng); // TODO: build cities
            this.spreadCivs(rng);
            this.spreadIdeas();
            if (Math.floor((t + TIME_STEP) * this.cataclysms) > Math.floor((t) * this.cataclysms))
                this.haveCataclysm(rng);
        }
    };
    /**
     * generate a few new civs in uninhabited territory
     * @param rng the random number generator to use
     */
    World.prototype.spawnCivs = function (rng) {
        var e_2, _a;
        try {
            for (var _b = __values(this.planet.tiles), _c = _b.next(); !_c.done; _c = _b.next()) {
                var tile = _c.value;
                var demomultia = POPULATION_DENSITY * tile.arableArea; // TODO: implement nomads, city state leagues, and federal states.
                var ruler = this.currentRuler(tile);
                if (ruler === null) { // if it is uncivilized, the limiting factor is the difficulty of establishing a unified state
                    if (rng.probability(CIVILIZATION_RATE * TIME_STEP * demomultia))
                        this.civs.add(new Civ(tile, this.nextID, this, rng));
                }
                else { // if it is already civilized, the limiting factor is the difficulty of starting a revolution
                    var linguisticModifier = void 0;
                    if (tile.culture.lect.isIntelligible(ruler.capital.culture.lect))
                        linguisticModifier = 1;
                    else
                        linguisticModifier = NATIONALISM_FACTOR;
                    if (rng.probability(REBELLION_RATE * TIME_STEP * demomultia * linguisticModifier)) // use the population without technology correction for balancing
                        this.civs.add(new Civ(tile, this.nextID, this, rng, ruler.technology));
                }
                this.nextID++;
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
    /**
     * expand the territories of expansionist civs
     * @param rng the random number generator to use
     */
    World.prototype.spreadCivs = function (rng) {
        var e_3, _a, e_4, _b, e_5, _c, e_6, _d, e_7, _e, e_8, _f;
        var invasions = new Queue([], function (a, b) { return a.time - b.time; }); // keep track of all current invasions
        try {
            for (var _g = __values(this.civs), _h = _g.next(); !_h.done; _h = _g.next()) {
                var invader = _h.value;
                try {
                    for (var _j = (e_4 = void 0, __values(invader.border.keys())), _k = _j.next(); !_k.done; _k = _j.next()) { // each civ initiates all its invasions
                        var ourTile = _k.value;
                        try {
                            for (var _l = (e_5 = void 0, __values(invader.border.get(ourTile))), _m = _l.next(); !_m.done; _m = _l.next()) {
                                var theirTile = _m.value;
                                var time = rng.exponential(invader.estimateInvasionTime(ourTile, theirTile)); // figure out when they will be done
                                if (time <= TIME_STEP) // if that goal is within reach
                                    invasions.push({ time: time, invader: invader, start: ourTile, end: theirTile }); // start on it
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (_m && !_m.done && (_c = _l.return)) _c.call(_l);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_k && !_k.done && (_b = _j.return)) _b.call(_j);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_h && !_h.done && (_a = _g.return)) _a.call(_g);
            }
            finally { if (e_3) throw e_3.error; }
        }
        while (!invasions.empty()) {
            var _o = invasions.pop(), time = _o.time, invader = _o.invader, start = _o.start, end = _o.end; // as invasions finish
            var invadee = this.currentRuler(end);
            var invaderStrength = invader.getStrength(invadee, end);
            var invadeeStrength = (invadee !== null) ? invadee.getStrength(invadee, end) : 0;
            if (invader.tileTree.has(start) && !invader.tileTree.has(end) &&
                invaderStrength > invadeeStrength) { // check that they're still doable
                invader.conquer(end, start); // update the game state
                try {
                    for (var _p = (e_6 = void 0, __values(invader.getAllChildrenOf(end))), _q = _p.next(); !_q.done; _q = _p.next()) { // and set up new invasions that bild off of it
                        var conquerdLand = _q.value;
                        try {
                            for (var _r = (e_7 = void 0, __values(conquerdLand.neighbors.keys())), _s = _r.next(); !_s.done; _s = _r.next()) {
                                var neighbor = _s.value;
                                if (!invader.tileTree.has(neighbor)) {
                                    time = time + rng.exponential(invader.estimateInvasionTime(conquerdLand, neighbor));
                                    if (time <= TIME_STEP) {
                                        invasions.push({ time: time, invader: invader, start: end, end: neighbor });
                                    }
                                }
                            }
                        }
                        catch (e_7_1) { e_7 = { error: e_7_1 }; }
                        finally {
                            try {
                                if (_s && !_s.done && (_e = _r.return)) _e.call(_r);
                            }
                            finally { if (e_7) throw e_7.error; }
                        }
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_q && !_q.done && (_d = _p.return)) _d.call(_p);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
            }
        }
        try {
            for (var _t = __values(this.civs), _u = _t.next(); !_u.done; _u = _t.next()) {
                var civ = _u.value;
                if (civ.isDead())
                    this.civs.delete(civ);
            } // clear out any Civs that no longer exist
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_u && !_u.done && (_f = _t.return)) _f.call(_t);
            }
            finally { if (e_8) throw e_8.error; }
        }
    };
    /**
     * carry technology across borders. every civ has a chance to gain each technology at least one of their neighors
     * have that they don't
     */
    World.prototype.spreadIdeas = function () {
        var e_9, _a, e_10, _b, e_11, _c, e_12, _d;
        var visibleTechnology = new Map(); // how much advanced technology can they access?
        try {
            for (var _e = __values(this.civs), _f = _e.next(); !_f.done; _f = _e.next()) {
                var civ = _f.value;
                visibleTechnology.set(civ, civ.technology); // well, any technology they _have_, for one
                try {
                    for (var _g = (e_10 = void 0, __values(civ.border.values())), _h = _g.next(); !_h.done; _h = _g.next()) { // check our borders
                        var tiles = _h.value;
                        try {
                            for (var tiles_1 = (e_11 = void 0, __values(tiles)), tiles_1_1 = tiles_1.next(); !tiles_1_1.done; tiles_1_1 = tiles_1.next()) {
                                var tile = tiles_1_1.value;
                                var other = this.currentRuler(tile);
                                if (other !== null && other.technology > visibleTechnology.get(civ)) { // if they have something we don't
                                    visibleTechnology.set(civ, other.technology); // if so, we can access their technology
                                }
                            }
                        }
                        catch (e_11_1) { e_11 = { error: e_11_1 }; }
                        finally {
                            try {
                                if (tiles_1_1 && !tiles_1_1.done && (_c = tiles_1.return)) _c.call(tiles_1);
                            }
                            finally { if (e_11) throw e_11.error; }
                        }
                    }
                }
                catch (e_10_1) { e_10 = { error: e_10_1 }; }
                finally {
                    try {
                        if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                    }
                    finally { if (e_10) throw e_10.error; }
                }
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            }
            finally { if (e_9) throw e_9.error; }
        }
        var spreadFraction = 1 - Math.exp(-TIME_STEP * TECH_SPREAD_RATE);
        try {
            for (var _j = __values(this.civs), _k = _j.next(); !_k.done; _k = _j.next()) {
                var civ = _k.value;
                if (visibleTechnology.get(civ) > civ.technology)
                    civ.technology += (visibleTechnology.get(civ) - civ.technology) * spreadFraction;
            }
        }
        catch (e_12_1) { e_12 = { error: e_12_1 }; }
        finally {
            try {
                if (_k && !_k.done && (_d = _j.return)) _d.call(_j);
            }
            finally { if (e_12) throw e_12.error; }
        }
    };
    /**
     * devastate the entire world. the details of how are fuzzy, but in a nutshell half of all people die (well, more
     * accurately, half of all provinces are depopulated, and half of all technologies are lost.
     */
    World.prototype.haveCataclysm = function (rng) {
        var e_13, _a, e_14, _b, e_15, _c;
        try {
            for (var _d = __values(this.civs), _e = _d.next(); !_e.done; _e = _d.next()) {
                var civ = _e.value;
                try {
                    for (var _f = (e_14 = void 0, __values(__spreadArray([], __read(civ.tileTree.keys()), false))), _g = _f.next(); !_g.done; _g = _f.next()) {
                        var tile = _g.value;
                        if (civ.tileTree.has(tile) && !rng.probability(APOCALYPSE_SURVIVAL_RATE))
                            civ.lose(tile);
                    }
                }
                catch (e_14_1) { e_14 = { error: e_14_1 }; }
                finally {
                    try {
                        if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                    }
                    finally { if (e_14) throw e_14.error; }
                }
                civ.technology *= rng.uniform(1 - (1 - APOCALYPSE_SURVIVAL_RATE) * 2, 1);
            }
        }
        catch (e_13_1) { e_13 = { error: e_13_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_13) throw e_13.error; }
        }
        try {
            for (var _h = __values(this.civs), _j = _h.next(); !_j.done; _j = _h.next()) {
                var civ = _j.value;
                if (civ.isDead())
                    this.civs.delete(civ);
            } // clear out any Civs that no longer exist
        }
        catch (e_15_1) { e_15 = { error: e_15_1 }; }
        finally {
            try {
                if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
            }
            finally { if (e_15) throw e_15.error; }
        }
    };
    /**
     * determine the current Civ of this tile
     */
    World.prototype.currentRuler = function (tile) {
        if (this.politicalMap.has(tile))
            return this.politicalMap.get(tile);
        else
            return null;
    };
    /**
     * get a copied list of the id of every country currently in this world
     * @param sorted if true, return items sorted from largest to smallest
     * @param minSize exclude all countries with fewer than minSize tiles
     */
    World.prototype.getCivs = function (sorted, minSize) {
        var e_16, _a;
        if (sorted === void 0) { sorted = false; }
        if (minSize === void 0) { minSize = 0; }
        var output = [];
        try {
            for (var _b = __values(this.civs), _c = _b.next(); !_c.done; _c = _b.next()) {
                var civ = _c.value;
                output.push(civ);
            }
        }
        catch (e_16_1) { e_16 = { error: e_16_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_16) throw e_16.error; }
        }
        if (sorted)
            output.sort(function (a, b) { return b.getLandArea() - a.getLandArea(); });
        if (minSize > 0)
            output = output.filter(function (c) { return c.tileTree.size >= minSize; });
        return output;
    };
    /**
     * get the Civ from this set that has this ID
     */
    World.prototype.getCiv = function (id) {
        var e_17, _a;
        try {
            for (var _b = __values(this.civs), _c = _b.next(); !_c.done; _c = _b.next()) {
                var civ = _c.value;
                if (civ.id === id)
                    return civ;
            }
        }
        catch (e_17_1) { e_17 = { error: e_17_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_17) throw e_17.error; }
        }
        throw new RangeError("there is no civ with id ".concat(id));
    };
    return World;
}());
export { World };
//# sourceMappingURL=world.js.map