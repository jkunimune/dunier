/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Random} from "../utilities/random.js";
import {Dialect, Lect, MAX_NUM_NAME_PARTS, ProtoLect} from "../generation/language/lect.js";
import {DOM} from "./dom.js";
import {transcribePhrase} from "../generation/language/word.js";


const NUM_ROWS = 12;

let seed = 0; // TODO the actual version should use the current time.

/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 */
DOM.elm('names-apply').addEventListener('click', () => { // TODO: back button
	console.log("jena nam...");

	const rng = new Random(seed);
	let bax: Lect = new ProtoLect(0, rng);
	for (let i = 0; i < 40; i ++)
		bax = new Dialect(bax, 0, rng);

	let nameSeed = 0;
	for (const nameList of [DOM.elm('name-list-1'), DOM.elm('name-list-2')]) {
		nameList.textContent = '';
		for (let i = 0; i < NUM_ROWS; i ++) {
			const seeds = [];
			for (let j = 0; j < MAX_NUM_NAME_PARTS; j ++)
				seeds.push(nameSeed + j);
			const fullName = bax.getFullName(seeds);

			const listem = document.createElement('li'); // start by creating the text element
			listem.setAttribute('class', 'list-group-item');
			listem.textContent = transcribePhrase(fullName);
			nameList.append(listem);

			nameSeed += MAX_NUM_NAME_PARTS;
		}
	}

	seed += 1;

	console.log("fina!");
});


/**
 * Once the page is ready, start the algorithm!
 */
document.addEventListener("DOMContentLoaded", () => {
	console.log("ready!");
	(DOM.elm('names-apply') as HTMLElement).click();
});
