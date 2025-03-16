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
import { Dialect, ProtoLang, WordType } from "../language/lect.js";
import { DOM } from "./dom.js";
var NUM_ROWS = 12;
var seed = 0; // TODO the actual version should use the current time.
/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 */
DOM.elm('names-apply').addEventListener('click', function () {
    var e_1, _a;
    console.log("jena nam...");
    var rng = new Random(seed);
    var bax = new ProtoLang(rng);
    for (var i = 0; i < 30; i++)
        bax = new Dialect(bax, rng);
    var type = rng.probability(.5) ? 1 : rng.probability(.33) ? 0 : -1;
    var nameSeed = 0;
    try {
        for (var _b = __values([DOM.elm('name-list-1'), DOM.elm('name-list-2')]), _c = _b.next(); !_c.done; _c = _b.next()) {
            var nameList = _c.value;
            nameList.textContent = '';
            for (var i = 0; i < NUM_ROWS; i++) {
                var givenName = bax.getName("firstname".concat(nameSeed), WordType.OTHER);
                var familyName = bax.getName("lastname".concat(nameSeed), WordType.FAMILY);
                var fullName = void 0;
                if (type === 1)
                    fullName = "".concat(givenName, " ").concat(familyName);
                else if (type === 0)
                    fullName = "".concat(givenName);
                else
                    fullName = "".concat(familyName, " ").concat(givenName);
                var listem = document.createElement('li'); // start by creating the text element
                listem.setAttribute('class', 'list-group-item');
                listem.textContent = fullName;
                nameList.append(listem);
                nameSeed += 1;
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
    seed += 1;
    console.log("fina!");
});
/**
 * Once the page is ready, start the algorithm!
 */
document.addEventListener("DOMContentLoaded", function () {
    console.log("ready!");
    DOM.elm('names-apply').click();
});
//# sourceMappingURL=namegenerator.js.map