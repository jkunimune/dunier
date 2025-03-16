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
import { WordType } from "../language/lect.js";
import { POPULATION_DENSITY, MEAN_ASSIMILATION_TIME, SLOPE_FACTOR, CONQUEST_RATE, TECH_ADVANCEMENT_RATE, NATIONALISM_FACTOR, MEAN_EMPIRE_LIFETIME, TIME_STEP } from "./world.js";
import { Culture } from "./culture.js";
import { Biome } from "./terrain.js";
import Queue from "../datastructures/queue.js";
import { Dequeue } from "../datastructures/dequeue.js";
/**
 * a single political entity
 */
var Civ = /** @class */ (function () {
    /**
     * create a new civilization
     * @param capital the home tile, with which this empire starts
     * @param id a nonnegative integer unique to this civ
     * @param world the world in which this civ lives
     * @param rng th random number generator to use to set Civ properties
     * @param technology the starting technological multiplier
     */
    function Civ(capital, id, world, rng, technology) {
        if (technology === void 0) { technology = 1; }
        this.world = world;
        this.id = id;
        this.tileTree = new Map();
        this.sortedTiles = new Queue([], function (a, b) { return b.arableArea - a.arableArea; });
        this.border = new Map();
        this.militarism = rng.erlang(4, 1); // TODO have naval military might separate from terrestrial
        this.technology = technology;
        this.arableArea = 0;
        this.capital = capital;
        if (world.currentRuler(capital) === null) // if this is a wholly new civilization
            capital.culture = new Culture(null, capital, this, rng.next() + 1); // make up a proto-culture (offset the seed to increase variability)
        this.conquer(capital, null);
    }
    /**
     * do the upkeep required for this to officially gain tile and all tiles that were
     * subsidiary to it.
     * @param tile the land being acquired
     * @param from the place from which it was acquired
     */
    Civ.prototype.conquer = function (tile, from) {
        var e_1, _a, e_2, _b;
        var loser = this.world.currentRuler(tile);
        this._conquer(tile, from, loser);
        if (loser !== null)
            loser.lose(tile); // do the opposite upkeep for the other gy
        try {
            for (var _c = __values(this.getAllChildrenOf(tile)), _d = _c.next(); !_d.done; _d = _c.next()) {
                var newLand = _d.value;
                try {
                    for (var _e = (e_2 = void 0, __values(newLand.neighbors.keys())), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var neighbor = _f.value;
                        if (this.border.has(neighbor) && this.border.get(neighbor).has(newLand)) {
                            this.border.get(neighbor).delete(newLand);
                            if (this.border.get(neighbor).size === 0)
                                this.border.delete(neighbor);
                        }
                        else if (!this.tileTree.has(neighbor)) {
                            if (!this.border.has(newLand))
                                this.border.set(newLand, new Set()); // finally, adjust the border map as necessary
                            this.border.get(newLand).add(neighbor);
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    /**
     * do all the parts of conquer that happen recursively
     */
    Civ.prototype._conquer = function (tile, from, loser) {
        var e_3, _a;
        this.world.politicalMap.set(tile, this);
        this.tileTree.set(tile, { parent: from, children: new Set() }); // add it to this.tileTree
        if (from !== null)
            this.tileTree.get(from).children.add(tile); // add it to from's children
        this.sortedTiles.push(tile);
        this.arableArea += tile.arableArea;
        if (loser !== null) {
            try {
                for (var _b = __values(loser.tileTree.get(tile).children), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var child = _c.value;
                    if (child.arableArea > 0)
                        this._conquer(child, tile, loser);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
        else {
            tile.culture = this.capital.culture; // perpetuate the ruling culture
        }
    };
    /**
     * do the upkeep required for this to officially lose tile.
     * @param tile the land being taken
     */
    Civ.prototype.lose = function (tile) {
        var e_4, _a, e_5, _b, e_6, _c;
        if (!this.tileTree.has(tile))
            throw new Error("You tried to make a Civ lose a tile that it does not have.");
        try {
            for (var _d = __values(this.getAllChildrenOf(tile)), _e = _d.next(); !_e.done; _e = _d.next()) { // start by going thru and updating the border map
                var lostLand = _e.value;
                if (this === this.world.politicalMap.get(lostLand)) // and update the global political map
                    this.world.politicalMap.delete(lostLand);
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
            }
            finally { if (e_4) throw e_4.error; }
        }
        try {
            for (var _f = __values(this.getAllChildrenOf(tile)), _g = _f.next(); !_g.done; _g = _f.next()) { // adjust the border map
                var lostLand = _g.value;
                try {
                    for (var _h = (e_6 = void 0, __values(lostLand.neighbors.keys())), _j = _h.next(); !_j.done; _j = _h.next()) {
                        var neighbor = _j.value;
                        if (this === this.world.politicalMap.get(neighbor)) {
                            if (!this.border.has(neighbor))
                                this.border.set(neighbor, new Set());
                            this.border.get(neighbor).add(lostLand);
                        }
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
                this.border.delete(lostLand);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
            }
            finally { if (e_5) throw e_5.error; }
        }
        this._lose(tile); // remove it and all its children from this.tiles
        while (!this.sortedTiles.empty() && !this.tileTree.has(this.sortedTiles.peek()))
            this.sortedTiles.pop(); // remove it from this.sortedTiles as well if it happens to be on top
        if (this.tileTree.size === 0)
            this.arableArea = 0;
    };
    /**
     * do all the parts of lose that happen recursively
     */
    Civ.prototype._lose = function (tile) {
        var e_7, _a;
        var _b = this.tileTree.get(tile), parent = _b.parent, children = _b.children;
        try {
            for (var children_1 = __values(children), children_1_1 = children_1.next(); !children_1_1.done; children_1_1 = children_1.next()) {
                var child = children_1_1.value;
                this._lose(child);
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (children_1_1 && !children_1_1.done && (_a = children_1.return)) _a.call(children_1);
            }
            finally { if (e_7) throw e_7.error; }
        }
        if (parent !== null)
            this.tileTree.get(parent).children.delete(tile);
        this.tileTree.delete(tile);
        this.arableArea -= tile.arableArea;
    };
    /**
     * change with the passing of the centuries
     * @param rng the random number generator to use for the update
     */
    Civ.prototype.update = function (rng) {
        var e_8, _a;
        var newKultur = new Map();
        newKultur.set(this.capital.culture.lect.macrolanguage, new Culture(this.capital.culture, this.capital, this, rng.next())); // start by updating the capital, tying it to the new homeland
        try {
            for (var _b = __values(this.tileTree.keys()), _c = _b.next(); !_c.done; _c = _b.next()) { // update the culture of each tile in the empire in turn
                var tile = _c.value;
                if (rng.probability(TIME_STEP / MEAN_ASSIMILATION_TIME)) { // if the province fails its heritage saving throw
                    tile.culture = this.capital.culture; // its culture gets overritten
                }
                else { // otherwise update it normally
                    if (!newKultur.has(tile.culture.lect.macrolanguage)) // if anyone isn't already in the thing
                        newKultur.set(tile.culture.lect.macrolanguage, new Culture(tile.culture, tile.culture.homeland, this, rng.next() + 1)); // update that culture, treating it as a diaspora
                    tile.culture = newKultur.get(tile.culture.lect.macrolanguage); // then make the assinement
                }
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_8) throw e_8.error; }
        }
        this.militarism *= Math.exp(-TIME_STEP / MEAN_EMPIRE_LIFETIME);
        var densestPopulation = POPULATION_DENSITY * this.sortedTiles.peek().arableArea;
        this.technology += TECH_ADVANCEMENT_RATE * TIME_STEP * densestPopulation * this.technology;
    };
    /**
     * how many years will it take this Civ to invade this Tile on average?
     * @param start the source of the invaders
     * @param end the place being invaded
     */
    Civ.prototype.estimateInvasionTime = function (start, end) {
        var invadee = this.world.currentRuler(end);
        var momentum = this.getStrength(invadee, end);
        var resistance = (invadee !== null) ? invadee.getStrength(invadee, end) : 0;
        var distance = end.getArea() / start.neighbors.get(end).getLength();
        var elevation = start.height - end.height;
        var distanceEff = Math.hypot(distance, SLOPE_FACTOR * elevation) / end.passability;
        if (momentum > resistance) // this randomness ensures Civs can accomplish things over many timesteps
            return distanceEff / CONQUEST_RATE / (momentum - resistance);
        else
            return Infinity;
    };
    /**
     * return true if this Civ no longer exists and needs to be deleted
     */
    Civ.prototype.isDead = function () {
        return this.arableArea === 0;
    };
    /**
     * get all of the tiles that fall anywhere below this one on the tile tree.
     * if this tile falls, all of these children will fall with it.
     */
    Civ.prototype.getAllChildrenOf = function (tile) {
        var _a;
        var tileTree = this.tileTree;
        return _a = {},
            _a[Symbol.iterator] = function () {
                var cue = new Dequeue([tile]);
                return {
                    next: function () {
                        var e_9, _a;
                        if (cue.isEmpty()) {
                            return { done: true, value: null };
                        }
                        else {
                            var next = cue.pop();
                            try {
                                for (var _b = __values(tileTree.get(next).children), _c = _b.next(); !_c.done; _c = _b.next()) {
                                    var child = _c.value;
                                    cue.push(child);
                                }
                            }
                            catch (e_9_1) { e_9 = { error: e_9_1 }; }
                            finally {
                                try {
                                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                                }
                                finally { if (e_9) throw e_9.error; }
                            }
                            return { done: false, value: next };
                        }
                    }
                };
            },
            _a;
    };
    /**
     * how strong the Civ's military is in this particular context
     * @param kontra the opponent
     * @param sa the location
     */
    Civ.prototype.getStrength = function (kontra, sa) {
        var linguisticModifier = 1;
        if (kontra !== null && sa.culture.lect.isIntelligible(this.capital.culture.lect))
            linguisticModifier = NATIONALISM_FACTOR;
        return this.militarism * this.technology * linguisticModifier;
    };
    /**
     * get the total controlld area, including ocean.  careful; this is an O(n) operation.
     */
    Civ.prototype.getTotalArea = function () {
        var e_10, _a;
        var area = 0;
        try {
            for (var _b = __values(this.tileTree.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var tile = _c.value;
                area += tile.getArea();
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_10) throw e_10.error; }
        }
        return area;
    };
    /**
     * get the total controlld land area, other than ocean.  careful; this is an O(n) operation.
     */
    Civ.prototype.getLandArea = function () {
        var e_11, _a;
        var area = 0;
        try {
            for (var _b = __values(this.tileTree.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var tile = _c.value;
                if (tile.biome !== Biome.OCEAN)
                    area += tile.getArea();
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_11) throw e_11.error; }
        }
        return area;
    };
    /**
     * list the cultures present in this country, along with the set of tiles occupied by each's share of the
     * population and the tiles occupied by each, starting with the ruling class and then in descending
     * order by pop.
     */
    Civ.prototype.getCultures = function () {
        var e_12, _a, e_13, _b;
        // count up the population fraccion of each culture
        var cultureMap = new Map();
        try {
            for (var _c = __values(this.tileTree.keys()), _d = _c.next(); !_d.done; _d = _c.next()) {
                var tile = _d.value;
                if (!cultureMap.has(tile.culture))
                    cultureMap.set(tile.culture, { population: 0, tiles: new Set() });
                cultureMap.get(tile.culture).population += tile.arableArea;
                cultureMap.get(tile.culture).tiles.add(tile);
            }
        }
        catch (e_12_1) { e_12 = { error: e_12_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_12) throw e_12.error; }
        }
        // convert to list and sort
        var cultureList = __spreadArray([], __read(cultureMap.keys()), false);
        cultureList.sort(function (a, b) { return cultureMap.get(b).population - cultureMap.get(a).population; });
        // then move the capital culture to the top
        cultureList.splice(cultureList.indexOf(this.capital.culture), 1);
        cultureList.splice(0, 0, this.capital.culture);
        // finally, bild the output object
        var output = [];
        try {
            for (var cultureList_1 = __values(cultureList), cultureList_1_1 = cultureList_1.next(); !cultureList_1_1.done; cultureList_1_1 = cultureList_1.next()) {
                var culture = cultureList_1_1.value;
                var _e = cultureMap.get(culture), population = _e.population, tiles = _e.tiles;
                output.push({
                    culture: culture,
                    populationFraction: population / this.arableArea,
                    inhabitedTiles: tiles
                });
            }
        }
        catch (e_13_1) { e_13 = { error: e_13_1 }; }
        finally {
            try {
                if (cultureList_1_1 && !cultureList_1_1.done && (_b = cultureList_1.return)) _b.call(cultureList_1);
            }
            finally { if (e_13) throw e_13.error; }
        }
        return output;
    };
    Civ.prototype.getPopulation = function () {
        return Math.round(POPULATION_DENSITY * this.technology * this.arableArea);
    };
    Civ.prototype.getName = function () {
        return this.capital.culture.lect.getName(this.capital.index.toString(), WordType.COUNTRY);
    };
    return Civ;
}());
export { Civ };
//# sourceMappingURL=civ.js.map