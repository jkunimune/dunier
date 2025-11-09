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
import { POPULATION_DENSITY, MEAN_ASSIMILATION_TIME, SLOPE_FACTOR, CONQUEST_RATE, TECH_ADVANCEMENT_RATE, MAX_DYNASTY_LIFETIME, BOAT_CHANCE, BOAT_FACTOR } from "./world.js";
import { Culture } from "./culture.js";
import Queue from "../utilities/external/tinyqueue.js";
import { Dequeue } from "../utilities/dequeue.js";
/**
 * a mutable collection of information defining a political entity
 */
var Civ = /** @class */ (function () {
    /**
     * create a new civilization
     * @param id a nonnegative integer unique to this civ
     * @param world the world in which this civ lives
     * @param location the site of its (hopefully) future capital
     * @param birthYear the exact year in which this Civ is born
     * @param predecessor the country in which this one is founded, if any
     */
    function Civ(id, world, location, birthYear, predecessor) {
        if (predecessor === void 0) { predecessor = null; }
        this.world = world;
        this.id = id;
        this.tileTree = new Map();
        this.sortedTiles = new Queue([], function (a, b) { return b.arableArea - a.arableArea; });
        this.border = new Set();
        this.militarism = this.world.rng.erlang(4, 1); // TODO have naval military might separate from terrestrial
        this.militarismDecayRate = this.militarism / MAX_DYNASTY_LIFETIME;
        this.thalassocratic = this.world.rng.probability(BOAT_CHANCE) && location.coastal;
        this.technology = (predecessor !== null) ? predecessor.technology : 1;
        this.totalArea = 0;
        this.landArea = 0;
        this.arableArea = 0;
        this.peak = { year: birthYear, landArea: 0 };
        // don't set the capital until you're sure we're strong enuff to take it
        this.capital = null;
    }
    /**
     * do the upkeep required for this to officially gain tile and all tiles that were
     * subsidiary to it.
     * @param tile the land being acquired
     * @param from the place from which it was acquired
     * @param year the date on which this happened
     */
    Civ.prototype.conquer = function (tile, from, year) {
        var loser = tile.government;
        // if this is our first tile, establish it as our capital
        if (this.capital === null) {
            this.capital = tile;
            // define a new national identity (offset the seed to increase variability)
            var culture = new Culture(this.capital.culture, this.capital, this.technology, this.world.rng.next() + 1);
            culture.spreadTo(this.capital);
            this.world.addCulture(culture);
            // record this moment in history
            if (loser === null)
                this.history = [
                    { type: "confederation", year: year, participants: [this, this.capital.culture] }
                ];
            else {
                this.history = [
                    { type: "independence", year: year, participants: [this, loser] }
                ];
                loser.history.push({ type: "secession", year: year, participants: [loser, this] });
            }
        }
        // do the recursive stuff
        this._conquer(tile, from, loser, year);
        if (loser !== null)
            loser.lose(tile, year); // do the opposite upkeep for the other gy
        // update peak if relevant
        if (this.getLandArea() >= this.peak.landArea) {
            this.peak = { year: year, landArea: this.getLandArea() };
        }
    };
    /**
     * do all the parts of conquer that happen recursively
     */
    Civ.prototype._conquer = function (tile, from, loser, year) {
        var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
        // update tile.government, this.tileTree, and this.sortedTiles
        tile.government = this;
        this.tileTree.set(tile, { parent: from, children: new Set() }); // add it to this.tileTree
        if (from !== null)
            this.tileTree.get(from).children.add(tile); // add it to from's children
        this.sortedTiles.push(tile);
        // update this.border
        var numForenNeibors = 0;
        try {
            for (var _e = __values(tile.neighbors.keys()), _f = _e.next(); !_f.done; _f = _e.next()) {
                var neibor = _f.value;
                if (this !== neibor.government)
                    numForenNeibors++;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (numForenNeibors > 0)
            this.border.add(tile);
        try {
            for (var _g = __values(tile.neighbors.keys()), _h = _g.next(); !_h.done; _h = _g.next()) {
                var neibor = _h.value;
                if (this.border.has(neibor)) {
                    var numForenNeibors_1 = 0;
                    try {
                        for (var _j = (e_3 = void 0, __values(neibor.neighbors.keys())), _k = _j.next(); !_k.done; _k = _j.next()) {
                            var neiborNeibor = _k.value;
                            if (this !== neiborNeibor.government)
                                numForenNeibors_1++;
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    if (numForenNeibors_1 === 0)
                        this.border.delete(neibor);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
            }
            finally { if (e_2) throw e_2.error; }
        }
        // update this.totalArea
        this.totalArea += tile.getArea();
        if (!tile.isSaltWater())
            this.landArea += tile.getArea();
        this.arableArea += tile.arableArea;
        // if this is the fall of a nation, record it in the annals of history
        if (loser !== null && tile === loser.capital) {
            var lastEvent = this.history[this.history.length - 1]; // figure out how to spin it: coup, civil war, or conquest?
            var finishingAShortCivilWar = lastEvent.type === "independence" && lastEvent.year >= year - 100 && lastEvent.participants[1] === loser && this.capital.culture === tile.culture;
            if (finishingAShortCivilWar) {
                this.history = loser.history.filter(function (_a) {
                    var type = _a.type;
                    return !["conquest", "secession"].includes(type);
                }); // if we just recently came from this country, make their history our own
                if (tile !== this.capital)
                    this.history.push({ type: "civil_war", year: year, participants: [this, loser] });
            }
            else
                this.history.push({ type: "conquest", year: year, participants: [this, loser] });
        }
        if (loser !== null) {
            try {
                for (var _l = __values(loser.tileTree.get(tile).children), _m = _l.next(); !_m.done; _m = _l.next()) {
                    var child = _m.value;
                    if (child.arableArea > 0) // unless you hit uninhabited land
                        this._conquer(child, tile, loser, year);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
        if (tile.arableArea > 0)
            if (tile.culture === null || tile.culture.areSiblings(this.capital.culture)) // perpetuate the ruling culture
                this.capital.culture.spreadTo(tile);
    };
    /**
     * do the upkeep required for this to officially lose tile.
     * @param tile the land being taken
     * @param year the year the land was taken
     */
    Civ.prototype.lose = function (tile, year) {
        if (!this.tileTree.has(tile))
            throw new Error("You tried to make a Civ lose a tile that it does not have.");
        this._lose(tile, year); // remove it and all its children from this.tiles
        while (!this.sortedTiles.empty() && !this.tileTree.has(this.sortedTiles.peek()))
            this.sortedTiles.pop(); // remove them from this.sortedTiles as well if they happen to be on top
        if (this.tileTree.size === 0)
            this.arableArea = 0;
    };
    /**
     * do all the parts of lose that happen recursively
     */
    Civ.prototype._lose = function (tile, year) {
        var e_5, _a, e_6, _b;
        // start by propagating this call to all children
        var _c = this.tileTree.get(tile), parent = _c.parent, children = _c.children;
        try {
            for (var children_1 = __values(children), children_1_1 = children_1.next(); !children_1_1.done; children_1_1 = children_1.next()) {
                var child = children_1_1.value;
                // when we propagate to something that has not yet been claimed, spawn a new civ
                if (child.government === this && child.arableArea > 0) {
                    var civ = this.world.addNewCiv(this, child, year);
                    civ.conquer(child, null, year);
                }
                // otherwise just lose the child tiles
                else
                    this._lose(child, year);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (children_1_1 && !children_1_1.done && (_a = children_1.return)) _a.call(children_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        // update this.tileTree and tile.government
        if (parent !== null)
            this.tileTree.get(parent).children.delete(tile);
        this.tileTree.delete(tile);
        if (this === tile.government)
            tile.government = null;
        // update this.border
        if (this.border.has(tile))
            this.border.delete(tile);
        try {
            for (var _d = __values(tile.neighbors.keys()), _e = _d.next(); !_e.done; _e = _d.next()) {
                var neibor = _e.value;
                if (this === neibor.government && !this.border.has(neibor))
                    this.border.add(neibor);
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
            }
            finally { if (e_6) throw e_6.error; }
        }
        // updated this.totalArea
        this.totalArea -= tile.getArea();
        if (!tile.isSaltWater())
            this.landArea -= tile.getArea();
        this.arableArea -= tile.arableArea;
    };
    /**
     * change with the passing of the centuries
     * @param timeStep the number of years to pass
     */
    Civ.prototype.update = function (timeStep) {
        var e_7, _a;
        try {
            // assimilate cultures
            for (var _b = __values(this.tileTree.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var tile = _c.value;
                if (tile.arableArea > 0) // if anyone lives here
                    if (this.world.rng.probability(timeStep / MEAN_ASSIMILATION_TIME)) // if the province fails its heritage saving throw
                        this.capital.culture.spreadTo(tile);
            } // its culture gets overritten
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_7) throw e_7.error; }
        }
        this.militarism = Math.max(0, this.militarism - this.militarismDecayRate * timeStep);
        var densestPopulation = POPULATION_DENSITY * this.sortedTiles.peek().arableArea;
        this.technology += TECH_ADVANCEMENT_RATE * timeStep * densestPopulation * this.technology;
    };
    /**
     * how many years will it take this Civ to invade this Tile on average?
     * @param start the source of the invaders
     * @param end the place being invaded
     */
    Civ.prototype.estimateInvasionTime = function (start, end) {
        var e_8, _a;
        // first, check if we surround this tile
        var numOwnedNeighbors = 0;
        try {
            for (var _b = __values(end.neighbors.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var neibor = _c.value;
                if (this === neibor.government)
                    numOwnedNeighbors++;
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_8) throw e_8.error; }
        }
        // if we already mostly surround a tile, we should gain it instantly
        if (numOwnedNeighbors > end.neighbors.size / 2)
            return 0;
        // otherwise, calculate how long it will take us to fill it with our armies
        var invadee = end.government;
        var momentum = this.getStrength(end);
        var resistance = (invadee !== null) ? invadee.getStrength(end) : 0;
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
     * get all of the tiles that fall anywhere below this one on the tile tree, including itself.
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
     * how strong the Civ's military is in this terrain
     */
    Civ.prototype.getStrength = function (location) {
        var terrainMultiplier;
        if (this.thalassocratic) {
            if (location.isWater())
                terrainMultiplier = BOAT_FACTOR;
            else if (location.coastal)
                terrainMultiplier = 1;
            else
                terrainMultiplier = 1 / BOAT_FACTOR;
        }
        else
            terrainMultiplier = 1;
        return terrainMultiplier * this.militarism * this.technology;
    };
    /**
     * get the total controlld area, including ocean.
     */
    Civ.prototype.getTotalArea = function () {
        return this.totalArea;
    };
    /**
     * get the total controlld land area, other than ocean.
     */
    Civ.prototype.getLandArea = function () {
        return this.landArea;
    };
    /**
     * list the cultures present in this country, along with the set of tiles occupied by each's share of the
     * population and the tiles occupied by each, starting with the ruling class and then in descending
     * order by pop.
     */
    Civ.prototype.getCultures = function () {
        var e_10, _a, e_11, _b;
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
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_10) throw e_10.error; }
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
                if (population > 0)
                    output.push({
                        culture: culture,
                        populationFraction: population / this.arableArea,
                        inhabitedTiles: tiles
                    });
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (cultureList_1_1 && !cultureList_1_1.done && (_b = cultureList_1.return)) _b.call(cultureList_1);
            }
            finally { if (e_11) throw e_11.error; }
        }
        return output;
    };
    Civ.prototype.getPopulation = function () {
        return Math.round(POPULATION_DENSITY * this.technology * this.arableArea);
    };
    Civ.prototype.getName = function () {
        return this.capital.culture.lect.standardRegister.getToponym(this.capital.index);
    };
    return Civ;
}());
export { Civ };
//# sourceMappingURL=civ.js.map