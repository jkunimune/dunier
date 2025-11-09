/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
var Selector = /** @class */ (function () {
    function Selector(document) {
        this.document = document;
        this.cash = new Map();
    }
    /**
     * query an element by its ID, with caching
     */
    Selector.prototype.elm = function (id) {
        if (!this.cash.has(id)) {
            var element = this.document.getElementById(id);
            if (element === null)
                throw new Error("there is no such element #".concat(id, " in this document."));
            this.cash.set(id, element);
        }
        return this.cash.get(id);
    };
    /**
     * get the current value of an input element from its ID
     */
    Selector.prototype.val = function (id) {
        var element = this.elm(id);
        if (element.tagName.toLowerCase() === 'input')
            return element.value;
        else if (element.tagName.toLowerCase() === 'select')
            return element.value;
        else if (element.hasAttribute('value'))
            return element.getAttribute('value');
        else
            throw new Error("This element has no value:\n".concat(element));
    };
    Selector.prototype.set = function (id, value) {
        var element = this.elm(id);
        if (element.tagName.toLowerCase() === 'input')
            element.value = value;
        else if (element.tagName.toLowerCase() === 'select')
            element.value = value;
        else if (element.hasAttribute('value'))
            element.setAttribute('value', value);
        else
            throw new Error("This element has no value:\n".concat(element));
    };
    /**
     * see if the checkbox with the given ID is checked or not
     */
    Selector.prototype.checked = function (id) {
        var element = this.elm(id);
        if (element.tagName.toLowerCase() === 'input')
            return element.checked;
        else
            throw new Error("this element has no checked property:\n".concat(element));
    };
    /**
     * applies a function recursively to this element and all elements downstream
     */
    Selector.mapToAllChildren = function (root, func) {
        func(root);
        var children = root.children;
        for (var i = 0; i < children.length; i++)
            this.mapToAllChildren(children[i], func);
    };
    return Selector;
}());
export { Selector };
//# sourceMappingURL=selector.js.map