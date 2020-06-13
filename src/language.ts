// language.ts

import {Random} from "./random";


enum Gawia {
	ANY,
	TALI,
	YAGOTALI,
	MEDOTALI,
	MEDOGAWI,
	YAGOGAWI,
	GAWI,
}

enum Predia {
	ANY,
	BADI,
	MEDI,
	PREDI,
}

enum Cirkia {
	ANY,
	CIRKI,
	KAYI,
}

enum Avoze {
	ANY,
	AVOZI,
	KIRIKAVOZE,
	NOLAVOZI,
	NAFASI,
	TUHI,
}

enum Tone {
	ANY,
	TALI,
	MEDI,
	GAWI,
	ZAYO_TALI,
	ZAYO_GAWI,
}

enum Nosia {
	ANY,
	NOSI,
	SAFI,
}

enum Loke {
	ANY,
	DULOLABI,
	LABODANTI,
	DANTI,
	PIZOKULI,
	BADOPIZI,
	BOKOCATI,
	RETROKURBI,
	BOKOKOMALI,
	BOKOPENDI,
	SUPROMUNI,
	GALOMUNI,
}

enum Forme {
	ANY,
	NOSI,
	TINGI,
	FRIKI,
	TINGOFRIKI,
	KARIBI,
	TOCI,
	DALALI,
	KLIKI,
}

enum Latia {
	ANY,
	JUNGI,
	LATI,
}


class Vokale {
	public gawia: Gawia;
	public predia: Predia;
	public cirkia: Cirkia;
	public avoze: Avoze;

	constructor(gawia: Gawia, predia: Predia, cirkia: Cirkia = Cirkia.ANY, avoze: Avoze = Avoze.ANY) {
		this.gawia = gawia;
		this.predia = predia;
		this.cirkia = cirkia;
		this.avoze = avoze;
	}

	hash(): number {
		return (((((this.gawia << 4) | this.predia) << 4) | this.cirkia) << 4) | this.avoze;
	}
}


class Konsone {
	public loke: Loke;
	public forme: Forme;
	public latia: Latia;
	public avoze: Avoze;

	constructor(loke: Loke, forme: Forme, latia: Latia = Latia.ANY, avoze: Avoze = Avoze.ANY) {
		this.loke = loke;
		this.forme = forme;
		this.latia = latia;
		this.avoze = avoze;
	}

	hash(): number {
		return -((((((this.loke << 4) | this.forme) << 4) | this.latia) << 4) | this.avoze);
	}
}


const FROM_IPA: Map<string, Vokale | Konsone> = new Map(); // load the IPA table from static res
const TO_TEXT: Map<number, string[]> = new Map();
let result = null;
const xmlHttp = new XMLHttpRequest();
xmlHttp.open("GET", "./res/alphabet.tsv", false);
xmlHttp.send();
if (xmlHttp.status != 200)
	throw `${xmlHttp.status} error while loading alphabet file: ${xmlHttp.statusText}`;
for (const line of xmlHttp.responseText.split('\n')) {
	const row = line.split('\t');
	const grafeme = row.slice(0, 1);
	let foneme: Vokale | Konsone;
	if (row[1] == 'vokale') {
		const gawia = [Gawia.TALI, Gawia.YAGOTALI, Gawia.MEDOTALI, Gawia.MEDOGAWI, Gawia.YAGOGAWI, Gawia.GAWI][row[2]];
		const predia = [Predia.BADI, Predia.MEDI, Predia.PREDI][row[3]];
		const cirkia = {u:Cirkia.KAYI, r:Cirkia.CIRKI}[row[4]];
		foneme = new Vokale(gawia, predia, cirkia, Avoze.AVOZI);
	}
	else {
		const loke = {bl:Loke.DULOLABI, ld:Loke.LABODANTI, dn:Loke.DANTI, ar:Loke.PIZOKULI,
			pa:Loke.BADOPIZI, rf:Loke.RETROKURBI, hp:Loke.BOKOCATI, vl:Loke.BOKOKOMALI,
			uv:Loke.BOKOPENDI, eg:Loke.SUPROMUNI, gl:Loke.GALOMUNI}[row[2]];
		const forme = {n:Forme.NOSI, p:Forme.TINGI, f:Forme.FRIKI, a:Forme.KARIBI, t:Forme.TOCI, r:Forme.DALALI}[row[3]];
		const latia = {c:Latia.JUNGI, l: Latia.LATI}[row[4]];
		const avoze = {u:Avoze.NOLAVOZI, v:Avoze.AVOZI}[row[5]];
		foneme = new Konsone(loke, forme, latia, avoze);
	}
	FROM_IPA.set(grafeme[0], foneme);
	TO_TEXT.set(foneme.hash(), grafeme);
}


/**
 * get a phoneme array from its IPA representation
 * @param ipa the characters to put in the lookup table
 */
function ipa(ipa: string): (Vokale | Konsone)[] {
	const output = [];
	for (let i = 0; i < ipa.length; i ++) { // TODO: parse affricates and diacritics
		if (FROM_IPA.has(ipa.charAt(i)))
			output.push(FROM_IPA.get(ipa.charAt(i)));
		else
			throw `could not interpret '${ipa.charAt(i)}' as an IPA symbol`;
	}
	return output;
}

/**
 * does this phoneme ever occur in any actual language?
 * @param foneme
 */
function isPossible(foneme: Konsone): boolean {
	return !(
		(foneme.forme === Forme.NOSI && foneme.loke >= Loke.SUPROMUNI) ||
		(foneme.forme === Forme.KARIBI && foneme.loke === Loke.GALOMUNI) ||
		(foneme.forme === Forme.TOCI && ![Loke.LABODANTI, Loke.PIZOKULI, Loke.RETROKURBI].includes(foneme.loke)) ||
		(foneme.forme === Forme.DALALI && ![Loke.DULOLABI, Loke.PIZOKULI, Loke.BOKOPENDI].includes(foneme.loke)) ||
		(foneme.latia === Latia.LATI) && (foneme.loke <= Loke.LABODANTI || foneme.loke >= Loke.BOKOPENDI) ||
		(foneme.avoze === Avoze.AVOZI) && (foneme.loke === Loke.GALOMUNI));
}

/**
 * does this phoneme fit with the given mold?
 * @param foneme
 * @param mold
 */
function fits(foneme: Vokale | Konsone, mold: Vokale | Konsone): boolean {
	if (foneme instanceof Vokale) {
		if (!(mold instanceof Vokale))
			return false;
		else if (mold.gawia !== Gawia.ANY && mold.gawia !== foneme.gawia)
			return false;
		else if (mold.predia !== Predia.ANY && mold.predia !== foneme.predia)
			return false;
		else if (mold.cirkia !== Cirkia.ANY && mold.cirkia !== foneme.cirkia)
			return false;
		else if (mold.avoze !== Avoze.ANY && mold.avoze !== foneme.avoze)
			return false;
		return true;
	}
	else {
		if (!(mold instanceof Konsone))
			return false;
		else if (mold.loke !== Loke.ANY && mold.loke !== foneme.loke)
			return false;
		else if (mold.forme !== Forme.ANY && mold.forme !== foneme.forme)
			return false;
		else if (mold.latia !== Latia.ANY && mold.latia !== foneme.latia)
			return false;
		else if (mold.avoze !== Avoze.ANY && mold.avoze !== foneme.avoze)
			return false;
		return true;
	}
}

/**
 * return the mold, but with any ANYs replaced by the corresponding property from foneme
 * @param foneme
 * @param mold
 */
function fit(foneme: Vokale | Konsone, mold: Vokale | Konsone): Vokale | Konsone {
	if (foneme instanceof Vokale) {
		if (!(mold instanceof Vokale))
			throw new TypeError("Cannot cast a vowel to a consonant.");
		const gawia = (mold.gawia !== Gawia.ANY) ? mold.gawia : foneme.gawia;
		const predia = (mold.predia !== Predia.ANY) ? mold.predia : foneme.predia;
		const cirkia = (mold.cirkia !== Cirkia.ANY) ? mold.cirkia : foneme.cirkia;
		const avoze = (mold.avoze !== Avoze.ANY) ? mold.avoze : foneme.avoze;
		return new Vokale(gawia, predia, cirkia, avoze);
	}
	else {
		if (!(mold instanceof Konsone))
			throw new TypeError("Cannot cast a consonant to a vowel.");
		const loke = (mold.loke !== Loke.ANY) ? mold.loke : foneme.loke;
		const forme = (mold.forme !== Forme.ANY) ? mold.forme : foneme.forme;
		const latia = (mold.latia !== Latia.ANY) ? mold.latia : foneme.latia;
		const avoze = (mold.avoze !== Avoze.ANY) ? mold.avoze : foneme.avoze;
		const kon = new Konsone(loke, forme, latia, avoze);
		return isPossible(kon) ? kon : foneme;
	}
}


const CHANGE_OPTIONS = [
	{ca: ipa("u"), pa: ipa("y")},
	{ca: ipa("y"), pa: ipa("u")},
	{ca: [new Konsone(Loke.PIZOKULI, 0), new Vokale(0, Predia.PREDI)], pa:[new Konsone(Loke.BOKOCATI, 0), new Vokale(0, Predia.PREDI)]}
]


/**
 * a process by which words change over time
 */
class SoundChange {
	private readonly ca: (Vokale | Konsone)[]; // original value
	private readonly pa: (Vokale | Konsone)[]; // target value
	private chance: number; // number of cases in which it changes once

	constructor(rng: Random) {
		const {ca, pa} = rng.choice(CHANGE_OPTIONS);
		this.ca = ca;
		this.pa = pa;
		this.chance = rng.probability(1/6) ? 0.5 : 1;
	}

	apply(old: (Vokale | Konsone)[]): (Vokale | Konsone)[] {
		const nov: (Vokale | Konsone)[] = [];
		while (nov.length < old.length) {
			const i = nov.length;
			let match = true; // check if the current point in old matches this.ca
			for (let j = 0; j < this.ca.length; j ++) {
				if (i + j >= old.length || !fits(old[i + j], this.ca[j])) { // by comparing each segment individually
					match = false;
					break;
				}
			}
			if (match) { // if it does,
				for (let j = 0; j < this.ca.length; j++)
					nov.push(fit(old[i + j], this.pa[j])); // add this.pa to nov
				if (nov[nov.length - 1] instanceof Konsone && (<Konsone>nov[nov.length - 1]).latia === 0) {
					console.log(old.slice(i, i + this.ca.length));
					console.log(this.pa);
					for (let j = 0; j < this.ca.length; j++)
						console.log(fit(old[i + j], this.pa[j]));
					throw "WHYHYHYYY";
				}
			}
			else // otherwise
				nov.push(old[i]); // just add the next character of old
		}
		return nov;
	}
}


export interface Language {
	getCommonNoun(i: number): (Vokale | Konsone)[]
	getPersonalName(i: number): (Vokale | Konsone)[]
	getCityName(i: number): (Vokale | Konsone)[]
	getCountryName(i: number): (Vokale | Konsone)[]
}

export class ProtoLanguage {
	private static initialVowels = ipa("iueoa");
	private static initialConsonants = ipa("mnpbtdkɡʔfθszʃxʋrjl");
	private readonly putong: (Vokale | Konsone)[][];
	private readonly renonam: (Vokale | Konsone)[][];
	private readonly sitonam: (Vokale | Konsone)[][];
	private readonly dexonam: (Vokale | Konsone)[][];

	constructor(rng: Random) {
		this.putong = [];
		for (let i = 0; i < 100; i ++)
			this.putong.push(this.newWord(Math.floor(1 + 3*i/100), rng));
		this.renonam = [];
		for (let i = 0; i < 100; i ++)
			this.renonam.push(this.newWord(Math.floor(2 + 3*i/100), rng));
		this.sitonam = [];
		for (let i = 0; i < 100; i ++)
			this.sitonam.push(this.newWord(Math.floor(1 + 2*i/100), rng));
		this.dexonam = [];
		for (let i = 0; i < 100; i ++)
			this.dexonam.push(this.newWord(Math.floor(2 + 2*i/100), rng));
		this.putong[0] = ipa("ia");
	}

	getCommonNoun(i) {
		return this.putong[i];
	}

	getPersonalName(i) {
		return this.renonam[i];
	}

	getCityName(i) {
		return this.sitonam[i];
	}

	getCountryName(i) {
		return this.dexonam[i];
	}

	newWord(nSyllables: number, rng: Random): (Vokale | Konsone)[] {
		const lekse = [];
		for (let i = 0; i < nSyllables; i ++) {
			if (rng.probability(2/3))
				lekse.push(rng.choice(ProtoLanguage.initialConsonants));
			lekse.push(rng.choice(ProtoLanguage.initialVowels));
			if (rng.probability(2/3))
				lekse.push(rng.choice(ProtoLanguage.initialConsonants));
		}
		return lekse;
	}
}

export class DeuteroLanguage {
	private readonly parent: Language;
	private readonly changes: SoundChange[];

	constructor(parent: Language, rng: Random) {
		this.parent = parent;
		this.changes = [];
		for (let i = 0; i < 1; i ++)
			this.changes.push(new SoundChange(rng));
	}

	getCommonNoun(i) {
		return this.applyChanges(this.parent.getCommonNoun(i));
	}

	getPersonalName(i) {
		return this.applyChanges(this.parent.getPersonalName(i));
	}

	getCityName(i) {
		return this.applyChanges(this.parent.getCityName(i));
	}

	getCountryName(i) {
		return this.applyChanges(this.parent.getCountryName(i));
	}

	applyChanges(lekse: (Vokale | Konsone)[]): (Vokale | Konsone)[] {
		for (const change of this.changes)
			lekse = change.apply(lekse);
		return lekse;
	}
}


/**
 * convert a phonetic word to a unicode string somehow.
 * @param lekse
 */
export function romanize(lekse: (Vokale | Konsone)[]): string {
	let output = "";
	for (let i = 0; i < lekse.length; i ++) {
		if (TO_TEXT.has(lekse[i].hash()))
			output += TO_TEXT.get(lekse[i].hash())[0];
		else {
			console.log(lekse[i]);
			throw `could not transcribe ${lekse[i]}, ${lekse[i].hash()}`;
		}
	}
	return output;
}
