/**
 * MIT License
 *
 * Copyright (c) 2021 Justin Kunimune
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import "../lib/jquery.min.js";
import {Random} from "../util/random.js";
import {DeuteroLang, Language, ProtoLang, WordType} from "../language/language.js";
import {Style, transcribe} from "../language/script.js";
// @ts-ignore
const $ = window.$; // why is this like this? I don't know.


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
	const style = rng.choice([
		Style.CHANSAGI_0, Style.CHANSAGI_1, Style.CHANSAGI_2, Style.CHANSAGI_3
	]);

	for (const [i0, namliste] of [[0, $('#nam-liste-1')], [NUM_ROWS, $('#nam-liste-2')]]) {
		namliste.empty();
		for (let i = 0; i < NUM_ROWS; i++) {
			const jannam = transcribe(bax.getNamloge(i0 + i, WordType.JANNAM), style);
			const familnam = transcribe(bax.getNamloge(i0 + Math.floor(i/3), WordType.FAMILNAM), style);
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
