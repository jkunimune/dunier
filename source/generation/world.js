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
import Queue from '../utilities/external/tinyqueue.js';
import { Random } from "../utilities/random.js";
import { Civ } from "./civ.js";
import { factorial } from "../utilities/miscellaneus.js";
/** a debug option to print detailed information about territory changes */
var LOG_LAND_CLAIMS = false;
/** the year at which civilization starts */
export var START_OF_HUMAN_HISTORY = -3200;
/** the smallest time interval to simulate (year) */
export var TIME_STEP = 100; // [year]
/** the rate at which people coalesce into kingdoms (/year/km^2) */
export var CIVILIZATION_RATE = 2e-8;
/** the rate at which people start revolutions (/year/km^2) */
export var REBELLION_RATE = 2e-7;
/** the rate at which people conquer with entry-level technology (km/y) */
export var CONQUEST_RATE = 3e-2;
/** the rate at which a person has good ideas (/y) */
export var TECH_ADVANCEMENT_RATE = 3.2e-8;
/** the density of people that can live in one unit of arable land with entry-level technology (/km^2) */
export var POPULATION_DENSITY = .20;
/** the rate at which ideas diffuse across borders (/y) */
export var TECH_SPREAD_RATE = .02;
/** the fraction of countries that are especially good at sailing */
export var BOAT_CHANCE = 0.1;
/** how much better a sailing-specialist country is at sailing */
export var BOAT_FACTOR = 5;
/** the fraction of the populacion a country gets to keep after a cataclysm (not accounting for domino effects) */
export var APOCALYPSE_SURVIVAL_RATE = .50;
/** the time it takes for an empire's might to decay by 2.7 (y) */
export var MAX_DYNASTY_LIFETIME = 2000;
/** the time it takes to erase a people's language (y) */
export var MEAN_ASSIMILATION_TIME = 160;
/** multiplier on vertical distances */
export var SLOPE_FACTOR = 100; // TODO: express it as the minimum slope that a military can traverse instead
/**
 * a mutable collection of civilizations and cultures that goes on a Surface
 */
var World = /** @class */ (function () {
    function World(cataclysms, planet, seed) {
        var e_1, _a;
        this.cataclysms = cataclysms;
        this.planet = planet;
        this.civs = new Set(); // list of countries in the world
        this.cultures = new Set();
        this.rng = new Random(seed);
        this.lastID = 0;
        try {
            // clear these variables, which may be carried over from previous Worlds
            for (var _b = __values(planet.tiles), _c = _b.next(); !_c.done; _c = _b.next()) {
                var tile = _c.value;
                tile.culture = null;
                tile.government = null;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    /**
     * populate the World with all the civs and stuff.
     * @param year the number of years to simulate
     */
    World.prototype.generateHistory = function (year) {
        var e_2, _a, e_3, _b;
        for (var t = START_OF_HUMAN_HISTORY; t < year; t += TIME_STEP) {
            this.spawnCivs(t); // TODO: build cities
            this.spreadCivs(t, t + TIME_STEP);
            this.spreadIdeas();
            if (Math.floor((t + TIME_STEP) * this.cataclysms) > Math.floor((t) * this.cataclysms))
                this.haveCataclysm(t + TIME_STEP);
            try {
                for (var _c = (e_2 = void 0, __values(this.civs)), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var civ = _d.value;
                    if (!civ.isDead())
                        civ.update(TIME_STEP); // handle technological development, militaristic decay, etc.
                    else
                        this.civs.delete(civ); // clear out any Civs that no longer have population
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                for (var _e = (e_3 = void 0, __values(this.cultures)), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var culture = _f.value;
                    if (culture.tiles.size > 0)
                        culture.update(); // handle linguistic development, societal change, etc.
                    else
                        this.cultures.delete(culture); // clear out any Cultures that are extinct
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
    };
    /**
     * generate a few new civs in uninhabited territory
     * @param year the end of the time-step in which these are spawning
     */
    World.prototype.spawnCivs = function (year) {
        var e_4, _a;
        try {
            for (var _b = __values(this.planet.tiles), _c = _b.next(); !_c.done; _c = _b.next()) {
                var tile = _c.value;
                var demomultia = POPULATION_DENSITY * tile.arableArea;
                var ruler = tile.government;
                if (ruler === null) { // if it is uncivilized, the limiting factor is the difficulty of establishing a unified state
                    if (this.rng.probability(CIVILIZATION_RATE * TIME_STEP * demomultia)) {
                        var civ = this.addNewCiv(null, tile, year);
                        civ.conquer(tile, null, year);
                    }
                }
                else { // if it is already civilized, the limiting factor is the difficulty of starting a revolution
                    if (this.rng.probability(REBELLION_RATE * TIME_STEP * demomultia)) { // use the population without technology correction for balancing
                        var civ = this.addNewCiv(ruler, tile, year);
                        if (civ.getStrength(tile) > ruler.getStrength(tile)) // make sure the rebellion is strong enuff to succeed
                            civ.conquer(tile, null, year);
                    }
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
    };
    /**
     * expand the territories of expansionist civs
     * @param start_time the year in which we start this timestep
     * @param stop_time the year in which we freeze the borders
     */
    World.prototype.spreadCivs = function (start_time, stop_time) {
        var e_5, _a, e_6, _b, e_7, _c, e_8, _d, e_9, _e;
        var invasions = new Queue([], function (a, b) { return a.time - b.time; }); // keep track of all current invasions
        try {
            for (var _f = __values(this.civs), _g = _f.next(); !_g.done; _g = _f.next()) {
                var invader = _g.value;
                try {
                    for (var _h = (e_6 = void 0, __values(invader.border.keys())), _j = _h.next(); !_j.done; _j = _h.next()) { // each civ initiates all its invasions
                        var ourTile = _j.value;
                        try {
                            for (var _k = (e_7 = void 0, __values(ourTile.neighbors.keys())), _l = _k.next(); !_l.done; _l = _k.next()) {
                                var theirTile = _l.value;
                                if (invader !== theirTile.government) {
                                    var time = start_time + this.rng.exponential(invader.estimateInvasionTime(ourTile, theirTile)); // figure out when they will be done
                                    if (time <= stop_time) // if that goal is within reach
                                        invasions.push({ time: time, invader: invader, start: ourTile, end: theirTile }); // start on it
                                }
                            }
                        }
                        catch (e_7_1) { e_7 = { error: e_7_1 }; }
                        finally {
                            try {
                                if (_l && !_l.done && (_c = _k.return)) _c.call(_k);
                            }
                            finally { if (e_7) throw e_7.error; }
                        }
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_j && !_j.done && (_b = _h.return)) _b.call(_h);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
            }
            finally { if (e_5) throw e_5.error; }
        }
        while (!invasions.empty()) {
            var _m = invasions.pop(), time = _m.time, invader = _m.invader, start = _m.start, end = _m.end; // as invasions finish
            var invadee = end.government;
            var invaderStrength = invader.getStrength(end);
            var invadeeStrength = (invadee !== null) ? invadee.getStrength(end) : 0;
            if (invader.tileTree.has(start) && !invader.tileTree.has(end) &&
                invaderStrength > invadeeStrength) { // check that they're still doable
                invader.conquer(end, start, time); // update the game state
                try {
                    for (var _o = (e_8 = void 0, __values(invader.getAllChildrenOf(end))), _p = _o.next(); !_p.done; _p = _o.next()) { // and set up new invasions that bild off of it
                        var conquerdLand = _p.value;
                        try {
                            for (var _q = (e_9 = void 0, __values(conquerdLand.neighbors.keys())), _r = _q.next(); !_r.done; _r = _q.next()) {
                                var neighbor = _r.value;
                                if (!invader.tileTree.has(neighbor)) {
                                    var nextTime = time + this.rng.exponential(invader.estimateInvasionTime(conquerdLand, neighbor));
                                    if (nextTime <= stop_time) {
                                        invasions.push({ time: nextTime, invader: invader, start: conquerdLand, end: neighbor });
                                    }
                                }
                            }
                        }
                        catch (e_9_1) { e_9 = { error: e_9_1 }; }
                        finally {
                            try {
                                if (_r && !_r.done && (_e = _q.return)) _e.call(_q);
                            }
                            finally { if (e_9) throw e_9.error; }
                        }
                        if (LOG_LAND_CLAIMS)
                            console.log("".concat(time.toFixed(0), ": ").concat(invader.getName(), " takes tile ").concat(conquerdLand.index, " from ").concat((invadee !== null) ? invadee.getName() : "no one", " via tile ").concat(invader.tileTree.get(conquerdLand).parent.index, "."));
                    }
                }
                catch (e_8_1) { e_8 = { error: e_8_1 }; }
                finally {
                    try {
                        if (_p && !_p.done && (_d = _o.return)) _d.call(_o);
                    }
                    finally { if (e_8) throw e_8.error; }
                }
            }
        }
    };
    /**
     * carry technology across borders. every civ has a chance to gain each technology at least one of their neighors
     * have that they don't
     */
    World.prototype.spreadIdeas = function () {
        var e_10, _a, e_11, _b, e_12, _c;
        // go from smartest countries to dumbest, to ensure we apply the greatest possible final tech level to each Civ
        var queue = new Queue(__spreadArray([], __read(this.civs), false).map(function (civ) { return ({ civ: civ, newTechLevel: civ.technology, sourceTechLevels: [] }); }), // by default, try assigning each Civ its current tech level
        function (a, b) { return b.newTechLevel - a.newTechLevel; });
        var visited = new Set();
        while (!queue.empty()) {
            var _d = queue.pop(), civ = _d.civ, newTechLevel = _d.newTechLevel, sourceTechLevels = _d.sourceTechLevels;
            if (!visited.has(civ)) { // if we haven't already advanced this one
                // apply it
                civ.technology = newTechLevel;
                visited.add(civ);
                var previusTechLevels = sourceTechLevels.concat([civ.technology]);
                // then look to our neibors
                var neibors = new Set();
                try {
                    for (var _e = (e_10 = void 0, __values(civ.border)), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var borderTile = _f.value;
                        try {
                            for (var _g = (e_11 = void 0, __values(borderTile.neighbors.keys())), _h = _g.next(); !_h.done; _h = _g.next()) {
                                var tile = _h.value;
                                if (tile.government !== null && tile.government !== civ)
                                    neibors.add(tile.government);
                            }
                        }
                        catch (e_11_1) { e_11 = { error: e_11_1 }; }
                        finally {
                            try {
                                if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
                            }
                            finally { if (e_11) throw e_11.error; }
                        }
                    }
                }
                catch (e_10_1) { e_10 = { error: e_10_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
                    }
                    finally { if (e_10) throw e_10.error; }
                }
                try {
                    // diffuse our technology to our dumber neibors
                    for (var neibors_1 = (e_12 = void 0, __values(neibors)), neibors_1_1 = neibors_1.next(); !neibors_1_1.done; neibors_1_1 = neibors_1.next()) {
                        var neibor = neibors_1_1.value;
                        if (!visited.has(neibor)) {
                            var neiborsNewTechLevel = neibor.technology +
                                (previusTechLevels[0] - neibor.technology) * (1 - Math.exp(-TIME_STEP * TECH_SPREAD_RATE));
                            for (var i = 1; i < previusTechLevels.length; i++)
                                neiborsNewTechLevel -= Math.pow((-TIME_STEP * TECH_SPREAD_RATE), i) / factorial(i) *
                                    (previusTechLevels[previusTechLevels.length - i] - previusTechLevels[0]); // this summation is the solution to this multivariate diffusion equation
                            queue.push({ civ: neibor, newTechLevel: neiborsNewTechLevel, sourceTechLevels: previusTechLevels });
                            // NOTE: I think it's possible in theory for a civ to surpass its neibor, which makes the math
                            // considerably more complicated, but I assume that's unlikely enuff to happen within a timestep
                            // that it's not a big deal.
                        }
                    }
                }
                catch (e_12_1) { e_12 = { error: e_12_1 }; }
                finally {
                    try {
                        if (neibors_1_1 && !neibors_1_1.done && (_c = neibors_1.return)) _c.call(neibors_1);
                    }
                    finally { if (e_12) throw e_12.error; }
                }
            }
        }
    };
    /**
     * devastate the entire world. the details of how are fuzzy, but in a nutshell half of all people die (well, more
     * accurately, 50% of all provinces are depopulated, and 50% of all technologies are lost.
     */
    World.prototype.haveCataclysm = function (year) {
        var e_13, _a, e_14, _b, e_15, _c;
        try {
            for (var _d = __values(this.planet.tiles), _e = _d.next(); !_e.done; _e = _d.next()) {
                var tile = _e.value;
                if (tile.government !== null && !this.rng.probability(APOCALYPSE_SURVIVAL_RATE)) {
                    if (LOG_LAND_CLAIMS)
                        console.log("".concat(year.toFixed(0), ": ").concat(tile.government.getName(), " loses tile ").concat(tile.index));
                    tile.government.lose(tile, year);
                    tile.culture.recedeFrom(tile);
                }
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
            for (var _f = __values(this.civs), _g = _f.next(); !_g.done; _g = _f.next()) {
                var civ = _g.value;
                civ.technology *= this.rng.uniform(1 - (1 - APOCALYPSE_SURVIVAL_RATE) * 2, 1);
            }
        }
        catch (e_14_1) { e_14 = { error: e_14_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
            }
            finally { if (e_14) throw e_14.error; }
        }
        try {
            for (var _h = __values(this.civs), _j = _h.next(); !_j.done; _j = _h.next()) {
                var civ = _j.value;
                if (civ.isDead())
                    this.civs.delete(civ); // clear out any Civs that no longer exist
                else
                    civ.history.push({ type: "cataclysm", year: year, participants: [civ] }); // mourn the Civs that still do
            }
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
     * get a list of every Lect currently spoken in this world, sorted roughly from most to least important.
     * there may be duplicates.
     */
    World.prototype.getLects = function () {
        var cultures = __spreadArray([], __read(this.cultures), false).sort(function (a, b) {
            // put national languages before minority languages
            if (a.hasNationState() && !b.hasNationState())
                return -1;
            if (b.hasNationState() && !a.hasNationState())
                return 1;
            // put languages with many speakers before languages with few speakers
            else
                return b.getPopulation() - a.getPopulation();
        });
        var lects = cultures.map(function (culture) { return culture.lect.standardRegister; });
        // remove duplicates
        for (var i = 1; i < lects.length; i++)
            for (var j = 0; j < i; j++)
                if (lects[i] === lects[j])
                    lects.splice(i, 1);
        return lects;
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
     * spawn a new civ
     */
    World.prototype.addNewCiv = function (predecessor, location, year) {
        this.lastID++;
        var civ = new Civ(this.lastID, this, location, year, predecessor);
        this.civs.add(civ);
        return civ;
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
    /**
     * add a Culture to the list.  unlike addNewCiv() you have to initialize the Culture yourself.
     * @param culture
     */
    World.prototype.addCulture = function (culture) {
        this.cultures.add(culture);
    };
    return World;
}());
export { World };
//# sourceMappingURL=world.js.map