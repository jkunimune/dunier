// namjener.ts: interface for the name generator

import "./lib/jquery.min.js";
import {Convention, DeuteroLang, Language, ProtoLang, transcribe, WordType} from "./language.js";
import {Random} from "./random.js";
// @ts-ignore
const $ = window.$; // why is this like this? I don't know.
// import "./lib/plotly.js";
// // @ts-ignore
// const Plotly = window.Plotly;


const NUM_ROWS = 12;

let seed = 0; // TODO the actual version should use the current time.

/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 */
$('#nam-apply').on('click', () => { // TODO: back button
	console.log("jena nam...");

	const rng = new Random(seed);
	let bax: Language = new ProtoLang(rng);
	for (let i = 0; i < 30; i ++)
		bax = new DeuteroLang(bax, rng);

	const type = rng.probability(.5) ? 1 : rng.probability(.33) ? 0 : -1;
	const convencion = rng.choice([
		Convention.CHANSAGI_0, Convention.CHANSAGI_1, Convention.CHANSAGI_2, Convention.CHANSAGI_3
	]);

	for (const [i0, namliste] of [[0, $('#nam-liste-1')], [NUM_ROWS, $('#nam-liste-2')]]) {
		namliste.empty();
		for (let i = 0; i < NUM_ROWS; i++) {
			const jannam = transcribe(bax.getNamloge(i0 + i, WordType.JANNAM), convencion);
			const familnam = transcribe(bax.getNamloge(i0 + Math.floor(i/3), WordType.FAMILNAM), convencion);
			let holnam;
			if (type == 1)
				holnam = `${jannam} ${familnam}`;
			else if (type == 0)
				holnam = `${jannam}`;
			else
				holnam = `${familnam} ${jannam}`;
			
			const listem = document.createElement('li'); // start by creating the text element
			listem.setAttribute('class', 'list-group-item');
			listem.textContent = holnam;
			namliste.append(listem);
		}
	}

	seed += 1;

	console.log("fina!");
});


/**
 * Once the page is ready, start the algorithm!
 */
$(document).ready(() => {
	console.log("ready!");
	$('#nam-apply').click();
});
