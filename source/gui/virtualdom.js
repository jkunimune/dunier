/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
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
/**
 * construct a new virtual DOM node
 * @param tag the type of element
 * @param attributes an object containing the attributes, if any
 * @param children any nodes contained within this node
 */
export function h(tag, attributes) {
    if (attributes === void 0) { attributes = null; }
    var children = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        children[_i - 2] = arguments[_i];
    }
    return {
        tag: tag,
        attributes: (attributes !== null) ? attributes : {},
        children: children,
        textContent: "",
    };
}
/**
 * deep copy a VNode
 */
export function cloneNode(node) {
    var e_1, _a;
    var clonedAttributes = {};
    try {
        for (var _b = __values(Object.entries(node.attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), key = _d[0], value = _d[1];
            clonedAttributes[key] = value;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return {
        tag: node.tag,
        attributes: clonedAttributes,
        children: node.children.map(cloneNode),
        textContent: node.textContent
    };
}
/**
 * serialize a node and all its descendants as XML
 */
export function toXML(node) {
    var e_2, _a, e_3, _b;
    var attributes = "";
    try {
        for (var _c = __values(Object.entries(node.attributes)), _d = _c.next(); !_d.done; _d = _c.next()) {
            var _e = __read(_d.value, 2), key = _e[0], value = _e[1];
            attributes += " ".concat(key, "=\"").concat(value, "\"");
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_2) throw e_2.error; }
    }
    var children = "";
    try {
        for (var _f = __values(node.children), _g = _f.next(); !_g.done; _g = _f.next()) {
            var child = _g.value;
            children += toXML(child);
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
        }
        finally { if (e_3) throw e_3.error; }
    }
    return "<".concat(node.tag).concat(attributes, ">").concat(node.textContent).concat(children, "</").concat(node.tag, ">");
}
//# sourceMappingURL=virtualdom.js.map