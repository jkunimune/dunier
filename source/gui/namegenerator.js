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
import { Random } from "../utilities/random.js";
import { Dialect, MAX_NUM_NAME_PARTS, ProtoLect } from "../generation/language/lect.js";
import { DOM } from "./dom.js";
var NUM_ROWS = 12;
var seed = new Date().getTime();
DOM.elm('reroll').addEventListener('click', function () {
    seed += 1;
    generateNames();
});
DOM.elm('back').addEventListener('click', function () {
    seed -= 1;
    generateNames();
});
/**
 * generate a list of random names in a random language
 */
function generateNames() {
    var e_1, _a;
    console.log("jena nam (seed = ".concat(seed, ")..."));
    var rng = new Random(seed);
    var bax = new ProtoLect(0, rng);
    for (var i = 0; i < 40; i++)
        bax = new Dialect(bax, 0, rng);
    var nameSeed = 0;
    try {
        for (var _b = __values([DOM.elm('name-list-1'), DOM.elm('name-list-2')]), _c = _b.next(); !_c.done; _c = _b.next()) {
            var nameList = _c.value;
            nameList.textContent = '';
            for (var i = 0; i < NUM_ROWS; i++) {
                var seeds = [];
                for (var j = 0; j < MAX_NUM_NAME_PARTS; j++)
                    seeds.push(nameSeed + j);
                var fullName = bax.getFullName(seeds);
                var listem = document.createElement('li'); // start by creating the text element
                listem.setAttribute('class', 'list-group-item');
                listem.textContent = fullName.toString();
                nameList.append(listem);
                nameSeed += MAX_NUM_NAME_PARTS;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    console.log("fina!");
}
/**
 * Once the page is ready, start the algorithm!
 */
document.addEventListener("DOMContentLoaded", function () {
    console.log("ready!");
    DOM.elm('reroll').click();
});
//# sourceMappingURL=namegenerator.js.map