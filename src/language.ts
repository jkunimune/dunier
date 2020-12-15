// language.ts: just the code relevant to linguistics

import {Random} from "./random.js";
import {loadTSV} from "./utils.js";
import {Enumify} from "./lib/enumify.js";


const DEVIATION_TIME = 2; // TODO: replace this with a number of sound changes


const NUM_CONVENTIONS = 11;
/** transcription systems */
export enum Convention {
	NASOMEDI,
	LATINI,
	ESPANI,
	ENGLI,
	RUSI,
	NIPONI,
	PANDUNI,
	CHANSAGI_0,
	CHANSAGI_1,
	CHANSAGI_2,
	CHANSAGI_3,
}

/** list of active articulators */
enum Foner {
	LABIA,
	CORONA,
	DORSUM,
	PHARYNX,
}

/** form of primary articulation or vowel height */
class Mode extends Enumify { // this should just be an enum, but JavaScript implements them poorly
	static STOP = new Mode(0);
	static AFFRICATE = new Mode(1);
	static FRICATE = new Mode(1);
	static NASAL = new Mode(2);
	static TAP = new Mode(3);
	static TRILL = new Mode(3);
	static CLOSE = new Mode(4);
	static NEAR_CLOSE = new Mode(5);
	static CLOSE_MID = new Mode(6);
	static OPEN_MID = new Mode(7);
	static NEAR_OPEN = new Mode(8);
	static OPEN = new Mode(9);
	static CLICK = new Mode(-1);
	static _ = Mode.closeEnum();

	sonority: number;
	constructor (sonority: number) {
		super();
		this.sonority = sonority;
	}
}

/** location of primary articulation or vowel frontness */
class Loke extends Enumify {
	static BILABIAL = new Loke(Foner.LABIA);
	static LABIODENTAL = new Loke(Foner.LABIA);
	static LINGUOLABIAL = new Loke(Foner.CORONA);
	static DENTAL = new Loke(Foner.CORONA);
	static ALVEOLAR = new Loke(Foner.CORONA);
	static POSTALVEOLAR = new Loke(Foner.CORONA);
	static RETROFLEX = new Loke(Foner.CORONA);
	static PALATAL = new Loke(Foner.DORSUM);
	static CENTRAL = new Loke(Foner.DORSUM);
	static VELAR = new Loke(Foner.DORSUM);
	static UVULAR = new Loke(Foner.DORSUM);
	static EPIGLOTTAL = new Loke(Foner.PHARYNX);
	static GLOTTAL = new Loke(Foner.PHARYNX);
	static _ = Loke.closeEnum();

	foner: number;
	constructor (articulator: number) {
		super();
		this.foner = articulator;
	}
}

/** voicing */
class Voze extends Enumify {
	static VOICED = new Voze();
	static BREATHY = new Voze();
	static TENUIS = new Voze();
	static ASPIRATED = new Voze();
	static EJECTIVE = new Voze();
	static _ = Voze.closeEnum();
}

/** syllabicity */
class Silabia extends Enumify {
	static SYLLABIC = new Silabia();
	static NONSYLLABIC = new Silabia();
	static _ = Silabia.closeEnum();
}

/** laterality */
class Latia extends Enumify {
	static LATERAL = new Latia();
	static MEDIAN = new Latia();
	static _ = Latia.closeEnum();
}

/** location of secondary articulation or vowel rounding */
class MinorLoke extends Enumify {
	static UNROUNDED = new MinorLoke();
	static LABIALIZED = new MinorLoke();
	static PALATALIZED = new MinorLoke();
	static VELARIZED = new MinorLoke();
	static PHARANGEALIZED = new MinorLoke();
	static _ = MinorLoke.closeEnum();
}

/** nasality */
class Nosia extends Enumify {
	static NASAL = new Nosia();
	static ORAL = new Nosia();
	static _ = Nosia.closeEnum();
}
/** dependent segment features */
class PendaniSif extends Enumify {
	static LABIAL = new PendaniSif();
	static CORONAL = new PendaniSif();
	static DORSAL = new PendaniSif();
	static GUTTURAL = new PendaniSif();
	static CONTINUANT = new PendaniSif();
	static OCCLUSIVE = new PendaniSif();
	static SONORANT = new PendaniSif();
	static OBSTRUENT = new PendaniSif();
	static HIGH = new PendaniSif();
	static MID = new PendaniSif();
	static LOW = new PendaniSif();
	static TENSE = new PendaniSif();
	static LAX = new PendaniSif();
	static NASAL = new PendaniSif();
	static PALATAL = new PendaniSif();
	static VELAR = new PendaniSif();
	static PHARANGEAL = new PendaniSif();
	static SIBILANT = new PendaniSif();
	static RHOTIC = new PendaniSif();
	static LIQUID = new PendaniSif();
	static VOWEL = new PendaniSif();
	// static STRESSED = new Sif();
	static _ = PendaniSif.closeEnum();
}

type Sif = Mode | Loke | Voze | Silabia | Latia | MinorLoke | Nosia | PendaniSif;

/** phonological segment */
class Fon {
	public readonly mode: Mode;
	public readonly loke: Loke;
	public readonly voze: Voze;
	public readonly silabia: Silabia;
	public readonly latia: Latia;
	public readonly minorLoke: MinorLoke;
	public readonly nosia: Nosia;

	constructor(mode: Mode, loke: Loke, voze: Voze = Voze.VOICED, silabia: Silabia = Silabia.NONSYLLABIC,
				latia: Latia = Latia.MEDIAN, minorLoke: MinorLoke = MinorLoke.UNROUNDED, nosia: Nosia = Nosia.ORAL) {
		this.mode = mode;
		this.loke = loke;
		this.voze = voze;
		this.silabia = silabia;
		this.latia = latia;
		this.minorLoke = minorLoke;
		this.nosia = nosia;
	}

	is(sif: Sif): boolean {
		if (sif instanceof Loke)
			return this.loke === sif;
		else if (sif instanceof Mode)
			return this.mode === sif;
		else if (sif instanceof Voze)
			return this.voze === sif;
		else if (sif instanceof Silabia)
			return this.silabia === sif;
		else if (sif instanceof Latia)
			return this.latia === sif;
		else if (sif instanceof MinorLoke)
			return this.minorLoke === sif;
		else if (sif instanceof Nosia)
			return this.nosia === sif;
		else {
			switch (sif) {
				case PendaniSif.LABIAL:
					return this.loke.foner === Foner.LABIA || this.minorLoke === MinorLoke.LABIALIZED;
				case PendaniSif.CORONAL:
					return this.loke.foner === Foner.CORONA;
				case PendaniSif.DORSAL:
					return this.loke.foner === Foner.DORSUM || this.minorLoke === MinorLoke.PALATALIZED || this.minorLoke === MinorLoke.VELARIZED;
				case PendaniSif.GUTTURAL:
					return this.loke.foner === Foner.PHARYNX || this.minorLoke === MinorLoke.PHARANGEALIZED;
				case PendaniSif.CONTINUANT:
					return this.mode === Mode.FRICATE || this.mode.sonority >= Mode.CLOSE.sonority;
				case PendaniSif.OCCLUSIVE:
					return !this.is(PendaniSif.CONTINUANT);
				case PendaniSif.SONORANT:
					return this.mode.sonority >= Mode.NASAL.sonority;
				case PendaniSif.OBSTRUENT:
					return !this.is(PendaniSif.SONORANT);
				case PendaniSif.HIGH:
					return this.mode === Mode.CLOSE || this.mode === Mode.NEAR_CLOSE;
				case PendaniSif.MID:
					return this.mode === Mode.CLOSE_MID || this.mode === Mode.OPEN_MID;
				case PendaniSif.LOW:
					return this.mode === Mode.NEAR_OPEN || this.mode === Mode.OPEN;
				case PendaniSif.TENSE:
					return this.mode === Mode.CLOSE || this.mode === Mode.CLOSE_MID || this.mode === Mode.OPEN;
				case PendaniSif.LAX:
					return this.mode === Mode.NEAR_CLOSE || this.mode === Mode.OPEN_MID || this.mode === Mode.NEAR_OPEN;
				case PendaniSif.NASAL:
					return this.mode === Mode.NASAL || this.nosia === Nosia.NASAL;
				case PendaniSif.PALATAL:
					return this.loke === Loke.PALATAL || this.loke === Loke.POSTALVEOLAR || this.minorLoke === MinorLoke.PALATALIZED;
				case PendaniSif.VELAR:
					return this.loke === Loke.VELAR || this.minorLoke === MinorLoke.VELARIZED;
				case PendaniSif.PHARANGEAL:
					return this.loke === Loke.EPIGLOTTAL || this.minorLoke === MinorLoke.PHARANGEALIZED;
				case PendaniSif.SIBILANT:
					return (this.mode === Mode.AFFRICATE || this.mode === Mode.FRICATE) &&
						(this.loke === Loke.ALVEOLAR || this.loke === Loke.POSTALVEOLAR);
				case PendaniSif.RHOTIC:
					return this.voze === Voze.VOICED && (
						(this.is(PendaniSif.SONORANT) && this.is(PendaniSif.CONTINUANT) && (this.is(PendaniSif.CORONAL) || this.loke === Loke.UVULAR)) ||
						(this.mode === Mode.FRICATE && this.loke === Loke.UVULAR));
				case PendaniSif.LIQUID:
					return this.is(PendaniSif.RHOTIC) ||
						(this.latia === Latia.LATERAL && this.mode === Mode.CLOSE && this.is(PendaniSif.CORONAL));
				case PendaniSif.VOWEL:
					return this.mode.sonority >= Mode.CLOSE.sonority && this.latia === Latia.MEDIAN &&
						this.loke.foner === Foner.DORSUM;
				default:
					throw "nope; not going to happen";
			}
		}
	}

	hash(): string {
		return this.silabia.enumKey.slice(0, 2) +
			this.minorLoke.enumKey.slice(0, 2) +
			this.nosia.enumKey.slice(0, 2) +
			this.voze.enumKey.slice(0, 2) +
			this.latia.enumKey.slice(0, 2) +
			this.loke.enumKey.slice(0, 2) +
			this.mode.enumKey;
	}

	toString(): string {
		return this.silabia.enumKey.toLowerCase() + " " +
			this.minorLoke.enumKey.toLowerCase() + " " +
			this.nosia.enumKey.toLowerCase() + " " +
			this.voze.enumKey.toLowerCase() + " " +
			this.latia.enumKey.toLowerCase() + " " +
			this.loke.enumKey.toLowerCase() + " " +
			this.mode.enumKey.toLowerCase();
	}
}

/** collection of phonological features */
class Klas {
	private readonly sa: Sif[]; // qualities this class explicitly has
	private readonly na: Sif[]; // qualities this class explicitly does not have

	constructor(sa: Sif[], na: Sif[]) {
		this.sa = sa;
		this.na = na;
	}

	/**
	 * does fon have all of the properties of this class?
	 * @param fon
	 */
	macha(fon: Fon): boolean {
		for (const sif of this.sa)
			if (!fon.is(sif))
				return false;
		for (const sif of this.na)
			if (fon.is(sif))
				return false;
		return true;
	}

	/**
	 * create a Fon with all of the properties of this, and similar to fon in every other respect.
	 * @param fon
	 */
	konformu(fon: Fon): Fon {
		if (this.na.length > 0)
			throw Error("you can't use minuses in the final state of a process!");
		let mode = fon.mode, loke = fon.loke, voze = fon.voze;
		let silabia = fon.silabia, latia = fon.latia, minorLoke = fon.minorLoke, nosia = fon.nosia;
		for (const sif of this.sa) {
			if (sif instanceof Mode)
				mode = sif;
			else if (sif instanceof Loke)
				loke = sif;
			else if (sif instanceof Voze)
				voze = sif;
			else if (sif instanceof Silabia)
				silabia = sif;
			else if (sif instanceof Latia)
				latia = sif;
			else if (sif instanceof MinorLoke)
				minorLoke = sif;
			else if (sif instanceof Nosia)
				nosia = sif;
			else {
				switch (sif) {
					case PendaniSif.PALATAL:
						loke = Loke.PALATAL;
						break;
					case PendaniSif.VELAR:
						loke = Loke.VELAR;
						break;
					case PendaniSif.HIGH:
						if (fon.is(PendaniSif.LAX))
							mode = Mode.NEAR_CLOSE;
						else
							mode = Mode.CLOSE;
						break;
					case PendaniSif.LOW:
						if (fon.is(PendaniSif.LAX))
							mode = Mode.NEAR_OPEN;
						else
							mode = Mode.OPEN;
						break;
					case PendaniSif.TENSE:
						if (!fon.is(PendaniSif.VOWEL))
							throw RangeError("can't tense a nonvocoid");
						else if (mode === Mode.NEAR_CLOSE)
							mode = Mode.CLOSE;
						else if (mode === Mode.OPEN_MID)
							mode = Mode.CLOSE_MID;
						else if (mode === Mode.NEAR_OPEN)
							mode = Mode.OPEN;
						break;
					case PendaniSif.LAX:
						if (!fon.is(PendaniSif.VOWEL))
							throw RangeError("can't lax a nonvocoid");
						else if (mode === Mode.CLOSE)
							mode = Mode.NEAR_CLOSE;
						else if (mode === Mode.CLOSE_MID)
							mode = Mode.OPEN_MID;
						else if (mode === Mode.OPEN)
							mode = Mode.NEAR_OPEN;
						break;
					default:
						throw Error(`I can't use ${sif} in the final state of a process.`);
				}
			}
		}

		if (loke === Loke.UVULAR && mode.sonority >= Mode.CLOSE.sonority) // turn uvular vowels into regular back vowels so I don't have to worry about dorsal nonvowel approximants
			loke = Loke.VELAR;
		if (
				(mode === Mode.NASAL && loke.foner === Foner.PHARYNX) ||
				(voze === Voze.VOICED && loke === Loke.GLOTTAL) ||
				(mode === Mode.TAP && loke.foner !== Foner.CORONA && loke !== Loke.LABIODENTAL) ||
				(mode === Mode.TRILL && loke.foner !== Foner.CORONA && loke !== Loke.BILABIAL && loke !== Loke.UVULAR) ||
				(latia === Latia.LATERAL && loke.foner !== Foner.CORONA && loke.foner !== Foner.DORSUM) ||
				(mode.sonority > Mode.CLOSE.sonority && loke.foner !== Foner.DORSUM)) // if this change is physically impossible for whatever reason
			return fon; // cancel it
		else // otherwise
			return new Fon(mode, loke, voze, silabia, latia, minorLoke, nosia); // bring it all together!
	}
}


/**
 * a process by which words change over time
 */
class FonProces {
	private readonly ca: Klas[]; // original value
	private readonly pa: Klas[]; // target value
	private readonly bada: Klas[];
	private readonly chena: Klas[];

	constructor(ca: Klas[], pa: Klas[], bada: Klas[], chena: Klas[]) {
		if (pa.length !== ca.length)
			throw RangeError(`mismatched initial and final states: ${ca} and ${pa}. insertion and deletion should be indicated with ∅s.`)
		this.ca = ca;
		this.pa = pa;
		this.bada = bada;
		this.chena = chena;
	}

	apply(old: Fon[]): Fon[] {
		const nov: Fon[] = [];
		let i = 0;
		while (i < old.length) {
			if (this.applies(old, i)) { // if it applies here,
				for (let j = 0; j < this.pa.length; j ++)
					nov.push(this.pa[j].konformu(old[i + j])); // add this.pa to nov
				i += this.ca.length;
			}
			else { // if not
				nov.push(old[i]); // just add the next character of old
				i += 1;
			}
		}
		return nov;
	}

	applies(word: Fon[], i: number) {
		if (i < this.bada.length)
			return false;
		else if (word.length - i < this.ca.length + this.chena.length)
			return false;
		for (let j = 0; j < this.bada.length; j ++)
			if (!this.bada[j].macha(word[i + j - this.bada.length]))
				return false;
		for (let j = 0; j < this.ca.length; j ++)
			if (!this.ca[j].macha(word[i + j]))
				return false;
		for (let j = 0; j < this.chena.length; j ++)
			if (!this.chena[j].macha(word[i + j + this.chena.length]))
				return false;
		return true;
	}
}


const FROM_IPA: Map<string, Fon> = new Map(); // load the IPA table from static res
const TO_TEXT: Map<string, string[]> = new Map();
const LOKE_KODE = new Map([
	['bl', Loke.BILABIAL],
	['ld', Loke.LABIODENTAL],
	['d', Loke.DENTAL],
	['ar', Loke.ALVEOLAR],
	['pa', Loke.POSTALVEOLAR],
	['rf', Loke.RETROFLEX],
	['c',  Loke.PALATAL],
	['m',  Loke.CENTRAL],
	['v',  Loke.VELAR],
	['uv', Loke.UVULAR],
	['eg', Loke.EPIGLOTTAL],
	['gl', Loke.GLOTTAL],
])
const MODE_KODE = new Map([
	['n', {mode: Mode.NASAL, voze: Voze.VOICED}],
	['p', {mode: Mode.STOP, voze: Voze.TENUIS}],
	['b', {mode: Mode.STOP, voze: Voze.VOICED}],
	['pf', {mode: Mode.AFFRICATE, voze: Voze.TENUIS}],
	['bv', {mode: Mode.AFFRICATE, voze: Voze.VOICED}],
	['f', {mode: Mode.FRICATE, voze: Voze.TENUIS}],
	['v', {mode: Mode.FRICATE, voze: Voze.VOICED}],
	['t', {mode: Mode.TAP, voze: Voze.VOICED}],
	['r', {mode: Mode.TRILL, voze: Voze.VOICED}],
	['a', {mode: Mode.CLOSE, voze: Voze.VOICED}],
	['1', {mode: Mode.NEAR_CLOSE, voze: Voze.VOICED}],
	['2', {mode: Mode.CLOSE_MID, voze: Voze.VOICED}],
	['3', {mode: Mode.OPEN_MID, voze: Voze.VOICED}],
	['4', {mode: Mode.NEAR_OPEN, voze: Voze.VOICED}],
	['5', {mode: Mode.OPEN, voze: Voze.VOICED}],
	['k!', {mode: Mode.CLICK, voze: Voze.TENUIS}],
	['g!', {mode: Mode.CLICK, voze: Voze.VOICED}],
]);
const harfiaTable = loadTSV('alphabet.tsv');
for (const row of harfiaTable) {
	const grafeme = row.slice(0, NUM_CONVENTIONS);
	const sif = row.slice(NUM_CONVENTIONS);
	const loke = LOKE_KODE.get(sif[0]);
	const {mode, voze} = MODE_KODE.get(sif[1]);
	const silabia = sif[2].includes('s') ? Silabia.SYLLABIC : Silabia.NONSYLLABIC;
	const latia = sif[2].includes('l') ? Latia.LATERAL: Latia.MEDIAN;
	const aliSif = sif[2].includes('w') ? MinorLoke.LABIALIZED : MinorLoke.UNROUNDED;
	const foneme = new Fon(mode, loke, voze, silabia, latia, aliSif);
	FROM_IPA.set(grafeme[0], foneme);
	TO_TEXT.set(foneme.hash(), grafeme);
}


/**
 * get a phoneme array from its IPA representation
 * @param ipa the characters to put in the lookup table
 */
function ipa(ipa: string): Fon[] {
	const output = [];
	for (let i = 0; i < ipa.length; i ++) { // TODO: parse affricates and diacritics
		if (FROM_IPA.has(ipa.charAt(i)))
			output.push(FROM_IPA.get(ipa.charAt(i)));
		else
			throw `could not interpret '${ipa.charAt(i)}' as an IPA symbol`;
	}
	return output;
}


const PROCES_CHUZABLE: {chanse: number, proces: FonProces}[] = [];
const procesTable = loadTSV('proces.txt', ' '); // load the phonological processes
for (const proces of procesTable) { // go through them
	const chanse = Number.parseInt(proces[0])/1000;
	const ca: Klas[] = [], pa: Klas[] = [], bada: Klas[] = [], chena: Klas[] = [];
	let fen = ca;
	let sa: Sif[] = null, na: Sif[] = null;
	for (let sinye of proces.slice(1)) { // and parse them
		if (sinye === '>')
			fen = pa;
		else if (sinye === '/')
			fen = bada;
		else if (sinye === '_')
			fen = chena;
		else if (sinye === '[') {
			sa = [];
			na = [];
		}
		else if (sinye === ']') {
			fen.push(new Klas(sa, na));
			sa = null;
			na = null;
		}
		else if (sinye.length >= 4) {
			const kutube = (sinye.startsWith('+') ? sa : na)
			sinye = sinye.slice(1);
			let val: Sif = null;
			sifSow:
			for (const sifKlas of [PendaniSif, Loke, Mode, Voze, Silabia, Latia, Nosia, MinorLoke]) {
				for (const sif of sifKlas) {
					if (sif.enumKey.startsWith(sinye)) {
						val = sif;
						break sifSow;
					}
				}
			}
			if (val === null)
				throw RangeError(`unrecognized feature: ${sinye}`);
			else
				kutube.push(val);
		}
		else {
			throw RangeError(`unintelligible symbol: ${sinye}`);
		}
	}
	PROCES_CHUZABLE.push({chanse: chanse, proces: new FonProces(ca, pa, bada, chena)});
}


export interface Language {
	getCommonNoun(i: number): Fon[]
	getPersonalName(i: number): Fon[]
	getCityName(i: number): Fon[]
	getCountryName(i: number): Fon[]
	getAncestor(n: number): Language
	isIntelligible(lang: Language): boolean
}

export class ProtoLanguage {
	private static initialVowels = ipa("iueoa");
	private static initialConsonants = ipa("mnpbtdkɡʔfθszʃxwrjl");
	private readonly putong: Fon[][];
	private readonly renonam: Fon[][];
	private readonly sitonam: Fon[][];
	private readonly dexonam: Fon[][];

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

	getCommonNoun(i: number): Fon[] {
		return this.putong[i];
	}

	getPersonalName(i: number): Fon[] {
		return this.renonam[i];
	}

	getCityName(i: number): Fon[] {
		return this.sitonam[i];
	}

	getCountryName(i: number): Fon[] {
		return this.dexonam[i];
	}

	newWord(nSyllables: number, rng: Random): Fon[] {
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

	getAncestor(n: number): Language {
		return this;
	}

	isIntelligible(lang: Language): boolean {
		return this === lang;
	}
}

export class DeuteroLanguage {
	private readonly parent: Language;
	private readonly changes: FonProces[];

	constructor(parent: Language, rng: Random) {
		this.parent = parent;
		this.changes = [];
		for (const {chanse, proces} of PROCES_CHUZABLE)
			if (rng.probability(chanse))
				this.changes.push(proces);
	}

	getCommonNoun(i: number): Fon[] {
		return this.applyChanges(this.parent.getCommonNoun(i));
	}

	getPersonalName(i: number): Fon[] {
		return this.applyChanges(this.parent.getPersonalName(i));
	}

	getCityName(i: number): Fon[] {
		return this.applyChanges(this.parent.getCityName(i));
	}

	getCountryName(i: number): Fon[] {
		return this.applyChanges(this.parent.getCountryName(i));
	}

	applyChanges(lekse: Fon[]): Fon[] {
		for (const change of this.changes)
			lekse = change.apply(lekse);
		return lekse;
	}

	getAncestor(n: number): Language {
		if (n <= 0)
			return this;
		else
			return this.parent.getAncestor(n - 1);
	}

	isIntelligible(lang: Language): boolean {
		return this.getAncestor(DEVIATION_TIME) === lang.getAncestor(DEVIATION_TIME);
	}
}


const ENGLI_VISE = loadTSV('kanune-engli.tsv')

/**
 * convert a phonetic word to a unicode string somehow.
 * @param lekse
 * @param convention
 */
export function transcribe(lekse: Fon[], convention: Convention = Convention.NASOMEDI): string {
	let asli = "";
	for (let i = 0; i < lekse.length; i ++) {
		let fonHash = lekse[i].hash();
		if (!TO_TEXT.has(fonHash) && fonHash.slice(10, 12) === 'PO') // spell postalveolar sounds as alveolar
			fonHash = fonHash.slice(0, 10) + 'AL' + fonHash.slice(12);
		if (!TO_TEXT.has(fonHash))
			throw `could not transcribe ${lekse[i]}, ${fonHash}`;
		else
			asli += TO_TEXT.get(fonHash)[convention];
	}

	if (convention === Convention.ENGLI) {
		let muti = "#"+asli+"#";
		for (let i = 1; i <= muti.length; i ++) { // go through the string
			for (const vise of ENGLI_VISE) {
				for (let j = 1; j < vise.length; j ++) { // and look through the replacements in ENGLI_VISE
					if (i-vise[j].length >= 0 && muti.substring(i-vise[j].length, i) === vise[j])
						muti = muti.substring(0, i-vise[j].length) + vise[0] + muti.substring(i);
				}
			}
		}
		asli = muti.substring(1, muti.length-1);

		if (asli[asli.length-1] === 'ɦ' && '*-aeiouyw'.includes(asli[asli.length-2]))
			asli = asli.substring(0, asli.length-1) + "gh";
		else if ('bcdfgjklmnpqrstvz'.includes(asli[asli.length-1]) && asli[asli.length-2] === '-')
			asli += 'ia';

		muti = "";
		for (let i = 0; i < asli.length; i ++) {
			if (asli[i] === "c" &&
				((i+1 < asli.length && 'eiy#'.includes(asli[i+1]))))
				muti += "k";
			else if (i+1 < asli.length && asli[i] === "j" && 'eiy'.includes(asli[i+1])) {
				let harfe = "g";
				for (let j = i+1; j < asli.length; j ++) {
					if (!'aeiouy'.includes(asli[j])) {
						harfe = "j";
						break;
					}
				}
				muti += harfe;
			}
			else if (asli[i] === "ɦ" &&
				((i+1 < asli.length && !'aeiouyw'.includes(asli[i+1])) || (i-1 >= 0 && !'*-aeiouyw'.includes(asli[i-1]))))
				muti += "";
			else if (asli[i] === "y") {
				if (i+1 === asli.length || (i+1 < asli.length && asli[i+1] === "i") || (i-1 >= 0 && asli[i-1] === "i"))
					muti += "y";
				else if ((i+1 < asli.length && !'aeiou'.includes(asli[i+1])) || (i-1 >= 0 && !'aeiou'.includes(asli[i-1])))
					muti += "i";
				else
					muti += "y";
			}
			else if (i+1 < asli.length && asli[i] === "w" && !"aeiouy".includes(asli[i+1]))
				muti += "u";
			else if (asli[i] === '-') {
				if ((i+1 < asli.length && asli[i+1] === 'ɦ') ||
					(i+2 < asli.length && !'aeiouy'.includes(asli[i+1]) && !'aeiouy'.includes(asli[i+2])) ||
					(i+2 === asli.length && !'aeiouy'.includes(asli[i+1])))
					muti += (asli[i-1] === 'a') ? 'i' : (asli[i-1] === 'o') ? 'a' : (asli[i-1] === 'i') ? '' : 'e';
			}
			else if (asli[i] === '*') {
				// if (i+2 < asli.length && !'aeiouy'.includes(asli[i+1]) && 'aeiouy'.includes(asli[i+2]))
				// 	muti += (asli[i+1] === 'k') ? 'c' : (asli[i+1] === 'j') ? '' : (asli[i+1] === 'h') ? '' : asli[i+1];
				// else if (i+1 < asli.length && asli[i] === 'i' && 'aeiouy'.includes(asli[i+1]))
				// 	muti = muti.substring(0, muti.length-1) + 'e';
				muti += "";
			}
			else
				muti += asli[i];
		}
		asli = muti;

		for (const [ca, pa] of [[/cw/g, "qu"], [/[ck]s/g, "x"], [/yy/g, "y"], [/ww/g, "w"], [/sh[ck]/g, "sc"], [/ɦw/g, "wh"], [/ɦ/g, "h"]])
			asli = asli.replace(ca, <string> pa);
	}

	if (convention !== Convention.NASOMEDI) {
		let muti = "";
		for (let i = 0; i < asli.length; i ++) {
			if (i === 0 || asli[i-1] === ' ')
				muti += asli[i].toUpperCase();
			else
				muti += asli[i];
		}
		asli = muti;
	}

	return asli;
}
