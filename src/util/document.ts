import {Selector} from "./selector.js";
import {loadJSON} from "./fileio.js";

export const DOM = new Selector(document);
export const USER_STRINGS = loadJSON(`../../res/tarje/${DOM.elm('bash').textContent}.json`);
