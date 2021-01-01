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
	static PRIMARY_STRESSED = new Silabia();
	static SECONDARY_STRESSED = new Silabia();
	static UNSTRESSED = new Silabia();
	static CONSONANT = new Silabia();
	static _ = Silabia.closeEnum();
}

/** length */
class Longia extends Enumify {
	static LONG = new Longia();
	static SHORT = new Longia();
	static _ = Longia.closeEnum();
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
	static NASALIZED = new Nosia();
	static ORAL = new Nosia();
	static _ = Nosia.closeEnum();
}
/** dependent segment features */
class PendaniSif extends Enumify {
	static LABIAL = new PendaniSif();
	static CORONAL = new PendaniSif();
	static DORSAL = new PendaniSif();
	static GUTTURAL = new PendaniSif();
	static ALVEOLAR = new PendaniSif();
	static CONTINUANT = new PendaniSif();
	static OCCLUSIVE = new PendaniSif();
	static SONORANT = new PendaniSif();
	static OBSTRUENT = new PendaniSif();
	static HIGH = new PendaniSif();
	static MID = new PendaniSif();
	static LOW = new PendaniSif();
	static TENSE = new PendaniSif();
	static LAX = new PendaniSif();
	static PALATAL = new PendaniSif();
	static VELAR = new PendaniSif();
	static PHARANGEAL = new PendaniSif();
	static SIBILANT = new PendaniSif();
	static RHOTIC = new PendaniSif();
	static LIQUID = new PendaniSif();
	static VOWEL = new PendaniSif();
	static STRESSED = new PendaniSif();
	static _ = PendaniSif.closeEnum();
}

type Sif = Mode | Loke | Voze | Silabia | Longia | Latia | MinorLoke | Nosia | PendaniSif;
const SIF_TIPE = [PendaniSif, Loke, Mode, Voze, Silabia, Longia, Latia, Nosia, MinorLoke];

/** phonological segment */
class Fon {
	/** the default phone, to be used for insertion rules */
	public static BLANK = new Fon(
		null,
		null,
		Voze.VOICED,
		Silabia.CONSONANT,
		Longia.SHORT,
		Latia.MEDIAN,
		MinorLoke.UNROUNDED,
		Nosia.ORAL);

	public readonly mode: Mode;
	public readonly loke: Loke;
	public readonly voze: Voze;
	public readonly silabia: Silabia;
	public readonly longia: Longia;
	public readonly latia: Latia;
	public readonly minorLoke: MinorLoke;
	public readonly nosia: Nosia;

	constructor(mode: Mode, loke: Loke, voze: Voze, silabia: Silabia, longia: Longia,
				latia: Latia, minorLoke: MinorLoke, nosia: Nosia) {
		this.mode = mode;
		this.loke = loke;
		this.voze = voze;
		this.silabia = silabia;
		this.longia = longia;
		this.latia = latia;
		this.minorLoke = minorLoke;
		this.nosia = nosia;
	}

	/**
	 * does this fone have the given feature?
	 * @param sif
	 */
	is(sif: Sif): boolean {
		if (sif instanceof Loke)
			return this.loke === sif;
		else if (sif instanceof Mode)
			return this.mode === sif;
		else if (sif instanceof Voze)
			return this.voze === sif;
		else if (sif instanceof Silabia)
			return this.silabia === sif;
		else if (sif instanceof Longia)
			return this.longia === sif;
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
					return this.loke.foner === Foner.DORSUM;
				case PendaniSif.GUTTURAL:
					return this.loke.foner === Foner.PHARYNX || this.minorLoke === MinorLoke.PHARANGEALIZED;
				case PendaniSif.ALVEOLAR:
					return this.is(Loke.ALVEOLAR) || (this.is(Loke.DENTAL) && this.mode !== Mode.FRICATE && this.mode !== Mode.AFFRICATE);
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
				case PendaniSif.STRESSED:
					return this.silabia === Silabia.PRIMARY_STRESSED || this.silabia === Silabia.SECONDARY_STRESSED;
				default:
					throw "nope; not going to happen";
			}
		}
	}

	/**
	 * return a fone that is identical to this, except that it has the given feature
	 * @param sif
	 */
	with(sif: Sif): Fon {
		return new Klas([sif]).konformu(this);
	}

	/**
	 * losslessly represent this as a string
	 */
	hash(): string {
		return this.silabia.enumKey.slice(0, 2) +
			this.longia.enumKey.slice(0, 2) +
			this.minorLoke.enumKey.slice(0, 2) +
			this.nosia.enumKey.slice(0, 2) +
			this.latia.enumKey.slice(0, 2) +
			this.voze.enumKey.slice(0, 2) +
			this.loke.enumKey.slice(0, 2) +
			this.mode.enumKey;
	}

	toString(): string {
		return this.silabia.enumKey.toLowerCase() + " " +
			this.longia.enumKey.toLowerCase() + " " +
			this.minorLoke.enumKey.toLowerCase() + " " +
			this.nosia.enumKey.toLowerCase() + " " +
			this.latia.enumKey.toLowerCase() + " " +
			this.voze.enumKey.toLowerCase() + " " +
			this.loke.enumKey.toLowerCase() + " " +
			this.mode.enumKey.toLowerCase();
	}
}

/** collection of phonological features */
class Klas {
	private readonly sa: Sif[]; // qualities this class explicitly has
	private readonly na: Sif[]; // qualities this class explicitly does not have
	private readonly ka: string[]; // qualities this class might have

	constructor(sa: Sif[], na: Sif[] = [], ka: string[] = []) {
		this.sa = sa;
		this.na = na;
		this.ka = ka;
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
	 * @param ref if this.ka has stuff in it, draw those features from ref.
	 */
	konformu(fon: Fon = Fon.BLANK, ref: Fon = null): Fon {
		if (this.na.length > 0)
			throw Error("you can't use minuses in the final state of a process!");
		let mode = fon.mode, loke = fon.loke, voze = fon.voze;
		let silabia = fon.silabia, longia = fon.longia, latia = fon.latia, minorLoke = fon.minorLoke, nosia = fon.nosia;
		for (const sif of this.sa) {
			if (sif instanceof Mode)
				mode = sif;
			else if (sif instanceof Loke)
				loke = sif;
			else if (sif instanceof Voze)
				voze = sif;
			else if (sif instanceof Silabia)
				silabia = sif;
			else if (sif instanceof Longia)
				longia = sif;
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
					case PendaniSif.ALVEOLAR:
						loke = Loke.ALVEOLAR;
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

		for (const akse of this.ka) { // match features from ka
			if (akse === 'loke')
				loke = ref.loke;
			else if (akse === 'voze')
				voze = ref.voze;
			else
				throw Error(`I can't understand ${akse}`);
		}

		if (loke === Loke.UVULAR && mode.sonority >= Mode.CLOSE.sonority) // turn uvular vowels into regular back vowels so I don't have to worry about dorsal nonvowel approximants
			loke = Loke.VELAR;
		if (mode.sonority >= Mode.NEAR_OPEN.sonority) // snap open vowels to front or back depending on rounding
			loke = (minorLoke === MinorLoke.LABIALIZED) ? Loke.VELAR : Loke.PALATAL;
		if (loke === Loke.POSTALVEOLAR && mode === Mode.STOP) // turn postalveolar stops into affricates before they can be cast to dental
			mode = Mode.AFFRICATE;
		if ([Loke.DENTAL, Loke.ALVEOLAR, Loke.POSTALVEOLAR].includes(loke))
			if (![Mode.FRICATE, Mode.AFFRICATE].includes(mode) || latia === Latia.LATERAL) // simplify alveolar-ish sounds to dental
				loke = Loke.DENTAL;
		if (
				(mode === Mode.NASAL && loke.foner === Foner.PHARYNX) ||
				(voze === Voze.VOICED && loke === Loke.GLOTTAL) ||
				(mode === Mode.TAP && loke.foner !== Foner.CORONA && loke !== Loke.LABIODENTAL) ||
				(mode === Mode.TRILL && loke.foner !== Foner.CORONA && loke !== Loke.BILABIAL && loke !== Loke.UVULAR) ||
				(latia === Latia.LATERAL && loke.foner !== Foner.CORONA && loke.foner !== Foner.DORSUM) ||
				(mode.sonority > Mode.CLOSE.sonority && loke.foner !== Foner.DORSUM)) // if this change is impossible for whatever reason
			return fon; // cancel it
		else // otherwise
			return new Fon(mode, loke, voze, silabia, longia, latia, minorLoke, nosia); // bring it all together!
	}
}


/**
 * a process by which words change over time
 */
interface Proces {
	apply(old: Fon[]): Fon[];
}

/**
 * a process that causes segments to change according to a rule
 */
class FonMute {
	private readonly ca: Klas[]; // original value
	private readonly pa: Klas[]; // target value
	private readonly idx: number[]; // reference indices for target phones
	private readonly chen: Klas[]; // requisite predecessor
	private readonly bade: Klas[]; // requisite follow-up
	private readonly wordShuri: boolean;
	private readonly wordFini: boolean;

	constructor(ca: Klas[], pa: Klas[], idx: number[], bada: Klas[], chena: Klas[]) {
		if (idx.length !== pa.length)
			throw RangeError("The pa array must be properly indexed.");
		this.ca = ca;
		this.pa = pa;
		this.idx = idx;
		this.wordShuri = (bada[0] === null);
		this.wordFini = (chena[chena.length-1] === null);
		this.chen = (this.wordShuri) ? bada.slice(1) : bada;
		this.bade = (this.wordFini) ? chena.slice(0, chena.length-1) : chena;
	}

	/**
	 * go through the word and apply this sound change.
	 * @param old
	 */
	apply(old: Fon[]): Fon[] {
		const drowWen: Fon[] = []; // build the changed word in reverse
		let i = old.length;
		while (true) {
			if (this.applies(old.slice(0, i), drowWen)) { // if it applies here,
				for (let j = this.pa.length - 1; j >= 0; j --) { // fill in the replacement
					if (this.idx[j] < this.ca.length)
						drowWen.push(this.pa[j].konformu(
							old[i + this.idx[j] - this.ca.length], // mapping to the relevant old segments
							this.bade ? old[i] : null));
					else
						drowWen.push(this.pa[j].konformu()); // or drawing new segments from thin air
				}
				i -= this.ca.length; // and jump to the next set of consonants
			}
			else { // if not
				i -= 1;
				if (i < 0) break;
				drowWen.push(old[i]); // just add the next character of old
			}
		}
		return drowWen.reverse();
	}

	/**
	 * does the segment string at the end of oldWord qualify to be changed?
	 * @param oldWord the unchanged word where we are considering making the change
	 * @param novWord the changed following section of the word, reversed
	 */
	applies(oldWord: Fon[], novWord: Fon[]) {
		if (this.chen.length + this.ca.length > oldWord.length || this.bade.length > novWord.length)
			return false;
		if (this.wordShuri && this.chen.length + this.ca.length < oldWord.length)
			return false;
		if (this.wordFini && this.bade.length < oldWord.length)
			return false;
		for (let j = 0; j < this.chen.length; j ++) // start with the left half of the context
			if (!this.chen[j].macha(oldWord[j - this.ca.length - this.chen.length + oldWord.length])) // check if it matches
				return false;
		for (let j = 0; j < this.ca.length; j ++) // then check the text that will be replaced
			if (!this.ca[j].macha(oldWord[j - this.ca.length + oldWord.length]))
				return false;
		for (let j = 0; j < this.bade.length; j ++) // then check the right half of the context
			if (!this.bade[j].macha(novWord[novWord.length - 1 - j]))
				return false;
		return true;
	}
}

/**
 * a process that causes sounds in the same word to share a feature
 */
class Harmonia {
	private readonly kutube: Sif[];
	private readonly affectsConsonants: boolean;

	constructor(sif: string, affectsConsonants: boolean) {
		this.affectsConsonants = affectsConsonants;
		if (sif === 'front') // then construct the list of "polar" attributes
			this.kutube = [Loke.VELAR, Loke.PALATAL];
		else if (sif === 'hight')
			this.kutube = [PendaniSif.LOW, PendaniSif.HIGH];
		else if (sif === 'round')
			this.kutube = [MinorLoke.UNROUNDED, MinorLoke.LABIALIZED];
		else if (sif === 'tense')
			this.kutube = [PendaniSif.LAX, PendaniSif.TENSE];
		else
			throw `unrecognized harmony type: ${sif}`;
	}

	apply(old: Fon[]): Fon[] {
		const nov: Fon[] = new Array<Fon>(old.length);
		let val: Sif = null;
		for (let i = 0; i < old.length; i ++) { // iterate backwards through the word
			nov[i] = old[i]; // in most cases, we will just make this the same as it was in the old word
			if (this.affectsConsonants || !old[i].is(Silabia.CONSONANT)) { // but if this segment isn't immune
				for (let sif of this.kutube) { // check its polarity
					if (old[i].is(sif)) { // if it's polar,
						if (val !== null) // change this sound to match what came before
							nov[i] = old[i].with(val); // and add it to the new word
						else // or read the property to match if we haven't seen this yet
							val = sif;
						break;
					} // if it's neutral, just ignore it without resetting val or changing anything
				}
			}
		}
		return nov;
	}
}

/**
 * a process that places syllables and stress according to certain rules
 */
class AcentoPoze {
	private readonly reverse: boolean; // whether the primary stress is on the right
	private readonly headSize: number; // the number of unstressed syllables to put between the word edge and the initial stress
	private readonly attractors: number; // the minimum weight that attracts stress
	private readonly tailMode: string; // ['lapse', 'clash', 'none'] how to handle stress at the tail end when the syllables ar odd

	/**
	 * create a new stress system given some simplified parameters
	 * @param reverse
	 * @param headSize
	 * @param attractors
	 * @param tailMode ['lapse', 'clash', or 'none']
	 */
	constructor(reverse: boolean, headSize: number, attractors: number, tailMode: string) {
		this.reverse = reverse;
		this.headSize = headSize;
		this.attractors = attractors;
		this.tailMode = tailMode;
	}

	apply(old: Fon[]): Fon[] {
		let nuclei: {i: number, weight: number}[] = [];
		let numC = 1;
		for (let i = old.length - 1; i >= 0; i --) { // first, tally up the syllables
			if (!old[i].is(Silabia.CONSONANT)) { // using syllabicity to identify nuclei
				if (old[i].is(Longia.LONG))
					nuclei.push({i: i, weight: 2}); // long vowels have weight 2
				else if (numC > 1)
					nuclei.push({i: i, weight: 1}); // codas have weight 1
				else
					nuclei.push({i: i, weight: 0}); // open syllables have weight 0
				numC = 0;
			}
			else {
				numC += (old[i].is(Longia.LONG)) ? 2 : 1; // long consonants count as two segments for this purpose
			}
		}

		if (!this.reverse) // choose the correct orientation
			nuclei = nuclei.reverse();

		const stress: boolean[] = new Array(nuclei.length);
		let lapse = 0;
		for (let i = 0; i < nuclei.length; i ++) {
			if (nuclei[i].weight >= this.attractors) // if this is a stress attractor
				stress[i] = true;
			else if (lapse === i && (i === this.headSize || i === nuclei.length - 1)) // if this is the head
				stress[i] = true;
			else if (lapse === i && i < this.headSize) // keep ordinary stress off the pre-primary region
				stress[i] = false;
			else if (this.tailMode === 'lapse' && (i + 1 >= nuclei.length || nuclei[i + 1].weight >= this.attractors)) // if *Clash or NonFinal is active and there's a stress coming up
				stress[i] = false;
			else if (this.tailMode !== 'none' && lapse >= 1) // otherwise, assign stress to avoid lapses
				stress[i] = true;
			else
				stress[i] = false;

			if (!stress[i]) lapse ++; // count the lapses
			else            lapse = 0;
		}

		const nov: Fon[] = old.slice(); // then edit the word
		let firstStress = true;
		for (let i = 0; i < nuclei.length; i ++) {
			if (!stress[i])
				nov[nuclei[i].i] = old[nuclei[i].i].with(Silabia.UNSTRESSED); // stressless is stressless
			else if (!firstStress)
				nov[nuclei[i].i] = old[nuclei[i].i].with(Silabia.SECONDARY_STRESSED); // all but the first stress is secondary
			else {
				nov[nuclei[i].i] = old[nuclei[i].i].with(Silabia.PRIMARY_STRESSED); // the first stress is primary
				firstStress = false;
			}
		}
		return nov;
	}
}

/**
 * a process that turns some of the shortest words into suffixen and randomly applies them
 */
class BadoFikse {
	// TODO: implement this
}


const DIACRITICS: {klas: Klas, baze: Sif[], kode: string}[] = [
	{klas: new Klas([Longia.LONG, Silabia.CONSONANT]), baze: [Longia.SHORT], kode: 'Gem'},
	{klas: new Klas([Longia.LONG], [Silabia.CONSONANT]), baze: [Longia.SHORT], kode: 'Len'},
	{klas: new Klas([Silabia.PRIMARY_STRESSED]), baze: [Silabia.UNSTRESSED], kode: 'St1'},
	{klas: new Klas([Silabia.SECONDARY_STRESSED]), baze: [Silabia.UNSTRESSED], kode: 'St2'},
	{klas: new Klas([Nosia.NASALIZED]), baze: [Nosia.ORAL], kode: 'Nas'},
	{klas: new Klas([MinorLoke.LABIALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'Lab'},
	{klas: new Klas([MinorLoke.PALATALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'Pal'},
	{klas: new Klas([MinorLoke.VELARIZED]), baze: [MinorLoke.UNROUNDED], kode: 'Vel'},
	{klas: new Klas([MinorLoke.PHARANGEALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'Pha'},
	{klas: new Klas([Mode.AFFRICATE]), baze: [Mode.STOP, Mode.FRICATE], kode: 'Aff'},
]


const FROM_IPA: Map<string, Fon> = new Map(); // load the IPA table from static res
const TO_TEXT: Map<string, string[]> = new Map();
const TO_DIACRITICS: Map<string, string[]> = new Map();
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
	if (sif[2] !== '0') {
		const silabia = sif[0].includes('s') ? Silabia.UNSTRESSED : Silabia.CONSONANT;
		const latia = sif[0].includes('l') ? Latia.LATERAL : Latia.MEDIAN;
		const aliSif = sif[0].includes('w') ? MinorLoke.LABIALIZED : MinorLoke.UNROUNDED;
		const loke = LOKE_KODE.get(sif[1]);
		const {mode, voze} = MODE_KODE.get(sif[2]);
		const foneme = new Fon(mode, loke, voze, silabia, Longia.SHORT, latia, aliSif, Nosia.ORAL);
		FROM_IPA.set(grafeme[0], foneme);
		TO_TEXT.set(foneme.hash(), grafeme);
	}
	else {
		TO_DIACRITICS.set(sif[0], grafeme);
	}
}


/**
 * get a phoneme array from its IPA representation
 * @param ipa the characters to put in the lookup table
 */
function ipa(ipa: string): Fon[] {
	const output: Fon[] = [];
	for (let i = 0; i < ipa.length; i ++) {
		if (FROM_IPA.has(ipa.charAt(i)))
			output.push(FROM_IPA.get(ipa.charAt(i)));
		else
			throw `could not interpret '${ipa.charAt(i)}' as an IPA symbol`;
	}
	return output;
}

/**
 * get an orthographical representation from a phoneme
 * @param fon
 * @param convention
 */
function lookUp(fon: Fon, convention: Convention = Convention.NASOMEDI): string {
	if (TO_TEXT.has(fon.hash())) // if it's in the table
		return TO_TEXT.get(fon.hash())[convention]; // just return that

	for (const {klas, baze, kode} of DIACRITICS) { // if not, look through the diacritics
		if (klas.macha(fon)) { // to see if there's one that will help
			const baziFon = [];
			for (const sif of baze)
				baziFon.push(fon.with(sif));
			return apply_diacritic(TO_DIACRITICS.get(kode)[convention], baziFon, convention);
		}
	}

	console.log(TO_TEXT);
	throw `I don't know how to write ${fon}`;
}

/**
 * get some orthographical representations from some phonemes and apply a diacritic to it
 * @param diacritic the string representing the modified letter, where the base phonemes are replaced with X, Y, etc.,
 * and the first letter of each phoneme is replaced with x, y, etc. the first letter of an affricate will be that of
 * its corresponding stop.
 * @param fon the phonemes to be combined into the diacritic
 * @param convention the convention to use for the lookup
 */
function apply_diacritic(diacritic: string, fon: Fon[], convention: Convention): string {
	const X = lookUp(fon[0], convention); // get the base character
	let x = X.slice(0, 1); // if we need lowercase x, find that
	if (diacritic.includes('x') && diacritic.slice(14) === 'AFFRICATE')
		x = lookUp(fon[0].with(Mode.STOP), convention).slice(0, 1);
	let graf = diacritic.replace('X', X).replace('x', x);
	if (diacritic.includes('Y'))
		graf = graf.replace('Y', lookUp(fon[1], convention));
	if (diacritic.includes('Z'))
		graf = graf.replace('Z', lookUp(fon[2], convention));
	return graf;
}


const PROCES_CHUZABLE: {chanse: number, proces: Proces}[] = [];
const procesTable = loadTSV('proces.txt', /\s+/, /%/); // load the phonological processes
for (const procesKitabe of procesTable) { // go through them
	const chanse = Number.parseInt(procesKitabe[0])/1000;
	if (procesKitabe[1] === 'mute') {
		const ca: Klas[] = [], pa: Klas[] = [], bada: Klas[] = [], chena: Klas[] = [];
		const idx: number[] = [];
		let fen = ca;
		let sa: Sif[] = null, na: Sif[] = null, ka: string[] = null;
		for (let sinye of procesKitabe.slice(2)) { // and parse them
			if (sinye === '>') // > transitions from ca to pa
				fen = pa;
			else if (sinye === '_') // _ transitions from badu to chenu
				fen = chena;
			else if (sinye === '#') // indicates a word boundary
				fen.push(null);
			else if (sinye === '/') { // / transitions from pa to badu
				if (idx.length < pa.length) { // and assigns indices if they weren't assigned explicitly
					if (ca.length !== 0 && ca.length !== pa.length) throw `please specify indices for ${procesKitabe}`;
					for (let i = 0; i < pa.length; i++)
						idx.push(Math.min(i, ca.length));
				}
				fen = bada;
			}
			else if (sinye === '[') { // [ stars a new phone
				sa = [];
				na = [];
				ka = [];
			}
			else if (sinye === ']') { // ] ends the current phone
				fen.push(new Klas(sa, na, ka));
				sa = na = ka = null;
			}
			else if (sinye.length === 2 && sinye[0] === ']') { // ends the current phone and assigns it a specific reference index
				fen.push(new Klas(sa, na, ka));
				idx.push(Number.parseInt(sinye[1]));
				sa = na = ka = null;
			}
			else if (sinye.length >= 4) { // features are incorporated into the current phone
				if (sinye.startsWith('±')) { // either their name goes into ka
					ka.push(sinye.slice(1));
				}
				else {
					const kutube = sinye.startsWith('+') ? sa : na;
					sinye = sinye.slice(1);
					const starred = sinye.startsWith('!');
					if (starred) sinye = sinye.slice(1);
					let val: Sif = null;
					sifSow:
					for (const sifKlas of starred ? SIF_TIPE.slice(1) : SIF_TIPE) { // or their value is read
						for (const sif of sifKlas) {
							if ((sif.enumKey + typeof (sif)).startsWith(sinye)) {
								val = sif;
								break sifSow;
							}
						}
					}
					if (val === null)
						throw RangeError(`unrecognized feature: ${sinye}`);
					kutube.push(val); // and added to sa or na
				}
			}
			else if (FROM_IPA.has(sinye)) { // IPA symbols are read for their specified features
				const fon = FROM_IPA.get(sinye);
				fen.push(new Klas([
					fon.mode, fon.loke, fon.voze, fon.latia, fon.silabia, fon.minorLoke
				]));
				idx.push(ca.length); // they index to len(ca), to indicate they don't need any reference foneme
			}
			else {
				throw RangeError(`unintelligible symbol on line ${PROCES_CHUZABLE.length}: ${sinye}`);
			}
		}
		PROCES_CHUZABLE.push({chanse: chanse, proces:
				new FonMute(ca, pa, idx, bada, chena)});
	}
	else if (procesKitabe[1] === 'harmonia') {
		const sif = procesKitabe[2];
		const affectsConsonants = procesKitabe[3] === 'all';
		PROCES_CHUZABLE.push({chanse: chanse, proces:
				new Harmonia(sif, affectsConsonants)});
	}
	else if (procesKitabe[1] === 'acente') {
		const reverse = procesKitabe[2] === 'right';
		const headSize = Number.parseInt(procesKitabe[3]);
		for (let attractors = 1; attractors <= 3; attractors ++)
			for (const tailMode of ['clash', 'lapse', 'none'])
				PROCES_CHUZABLE.push({chanse: chanse/9., proces:
						new AcentoPoze(reverse, headSize, attractors, tailMode)});
	}
	else {
		throw `unrecognized process classification: ${procesKitabe[1]}`;
	}
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
			if (rng.probability(0.7))
				lekse.push(rng.choice(ProtoLanguage.initialConsonants));
			lekse.push(rng.choice(ProtoLanguage.initialVowels));
			if (rng.probability(0.5))
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
	private readonly changes: Proces[];

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
	for (let i = 0; i < lekse.length; i ++)
		asli += lookUp(lekse[i], convention);

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
