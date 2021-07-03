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
	static OPEN = new Mode(4.2);
	static NEAR_CLOSE = new Mode(4);
	static NEAR_OPEN = new Mode(4.2);
	static CLOSE_MID = new Mode(4.1);
	static OPEN_MID = new Mode(4.1);
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
	static LABIOCORONAL = new Loke(null);
	static LABIOVELAR = new Loke(null);
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
	static NONSYLLABIC = new Silabia();
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
	static PHARYNGEALIZED = new MinorLoke();
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
	static NASAL = new PendaniSif();
	static CONTINUANT = new PendaniSif();
	static OCCLUSIVE = new PendaniSif();
	static SONORANT = new PendaniSif();
	static OBSTRUENT = new PendaniSif();
	static VIBRANT = new PendaniSif();
	static HIGH = new PendaniSif();
	static MID = new PendaniSif();
	static LOW = new PendaniSif();
	static RAISED = new PendaniSif();
	static LOWERED = new PendaniSif();
	static TENSE = new PendaniSif();
	static LAX = new PendaniSif();
	static PALATAL = new PendaniSif();
	static VELAR = new PendaniSif();
	static PHARANGEAL = new PendaniSif();
	static SIBILANT = new PendaniSif();
	static RHOTIC = new PendaniSif();
	static LIQUID = new PendaniSif();
	static WIBBLY = new PendaniSif();
	static VOCOID = new PendaniSif();
	static GLIDE = new PendaniSif();
	static VOWEL = new PendaniSif();
	static SORDID = new PendaniSif();
	static STRESSED = new PendaniSif();
	static SYLLABIC = new PendaniSif();
	static SPOKEN = new PendaniSif();
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
		Silabia.NONSYLLABIC,
		Longia.SHORT,
		Latia.MEDIAN,
		MinorLoke.UNROUNDED,
		Nosia.ORAL);
	/** the representation of a pause */
	public static PAUSE = new Fon(
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null
	);

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
		if (this.voze === null)
			return false;
		else if (sif instanceof Loke)
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
					return this.loke.foner === Foner.PHARYNX || this.minorLoke === MinorLoke.PHARYNGEALIZED;
				case PendaniSif.NASAL:
					return this.mode === Mode.NASAL || this.nosia === Nosia.NASALIZED;
				case PendaniSif.ALVEOLAR:
					return this.is(Loke.ALVEOLAR) || (this.is(Loke.DENTAL) && this.mode !== Mode.FRICATE && this.mode !== Mode.AFFRICATE);
				case PendaniSif.CONTINUANT:
					return this.mode === Mode.FRICATE || this.mode === Mode.TRILL || this.mode.sonority >= Mode.CLOSE.sonority;
				case PendaniSif.OCCLUSIVE:
					return !this.is(PendaniSif.CONTINUANT);
				case PendaniSif.SONORANT:
					return this.mode.sonority >= Mode.NASAL.sonority;
				case PendaniSif.OBSTRUENT:
					return !this.is(PendaniSif.SONORANT);
				case PendaniSif.VIBRANT:
					return this.mode === Mode.TAP || this.mode === Mode.TRILL;
				case PendaniSif.HIGH:
					return this.is(PendaniSif.VOCOID) && (this.mode === Mode.CLOSE || this.mode === Mode.NEAR_CLOSE);
				case PendaniSif.MID:
					return this.is(PendaniSif.VOCOID) && (this.mode === Mode.CLOSE_MID || this.mode === Mode.OPEN_MID);
				case PendaniSif.LOW:
					return this.is(PendaniSif.VOCOID) && (this.mode === Mode.NEAR_OPEN || this.mode === Mode.OPEN);
				case PendaniSif.TENSE:
					return this.mode === Mode.CLOSE || this.mode === Mode.CLOSE_MID || this.mode === Mode.OPEN;
				case PendaniSif.LAX:
					return this.mode === Mode.NEAR_CLOSE || this.mode === Mode.OPEN_MID || this.mode === Mode.NEAR_OPEN;
				case PendaniSif.PALATAL:
					return !this.is(PendaniSif.LOW) && (this.loke === Loke.PALATAL || this.loke === Loke.POSTALVEOLAR || this.minorLoke === MinorLoke.PALATALIZED);
				case PendaniSif.VELAR:
					return !this.is(PendaniSif.LOW) && (this.loke === Loke.VELAR || this.minorLoke === MinorLoke.VELARIZED);
				case PendaniSif.PHARANGEAL:
					return this.loke === Loke.EPIGLOTTAL || this.minorLoke === MinorLoke.PHARYNGEALIZED;
				case PendaniSif.SIBILANT:
					return (this.mode === Mode.AFFRICATE || this.mode === Mode.FRICATE) &&
						(this.loke === Loke.ALVEOLAR || this.loke === Loke.POSTALVEOLAR);
				case PendaniSif.LIQUID:
					return this.voze === Voze.VOICED && (
						(this.is(PendaniSif.SONORANT) && !this.is(Mode.NASAL) && (this.is(PendaniSif.CORONAL) || this.loke === Loke.UVULAR)) ||
						(this.mode === Mode.FRICATE && this.loke === Loke.UVULAR));
				case PendaniSif.RHOTIC:
					return this.is(PendaniSif.LIQUID) && !this.is(Latia.LATERAL);
				case PendaniSif.WIBBLY:
					return this.is(PendaniSif.LABIAL) && (this.is(PendaniSif.SONORANT) || (this.is(Voze.VOICED) &&
						this.is(Mode.FRICATE))) && this.is(Silabia.NONSYLLABIC);
				case PendaniSif.VOCOID:
					return this.mode.sonority >= Mode.CLOSE.sonority && this.latia === Latia.MEDIAN &&
						this.loke.foner === Foner.DORSUM;
				case PendaniSif.GLIDE:
					return this.silabia === Silabia.NONSYLLABIC && this.is(PendaniSif.VOCOID);
				case PendaniSif.VOWEL:
					return this.silabia !== Silabia.NONSYLLABIC && this.is(PendaniSif.VOCOID);
				case PendaniSif.SORDID:
					return this.voze !== Voze.VOICED && this.voze !== Voze.BREATHY;
				case PendaniSif.STRESSED:
					return this.silabia === Silabia.PRIMARY_STRESSED || this.silabia === Silabia.SECONDARY_STRESSED;
				case PendaniSif.SYLLABIC:
					return this.silabia !== Silabia.NONSYLLABIC;
				case PendaniSif.SPOKEN:
					return true;
				default:
					throw `can't check for ${sif}ness`;
			}
		}
	}

	/**
	 * return a fone that is identical to this, except that it has the given feature
	 * @param sif
	 */
	with(sif: Sif): Fon {
		if (!this.is(sif)) return new Klas([sif]).konformu(this);
		else               return this;
	}

	/**
	 * losslessly represent this as a string
	 */
	hash(): string {
		if (this.mode === null) return '';
		return this.silabia.enumKey.slice(0, 2) +
			this.longia.enumKey.slice(0, 2) +
			this.minorLoke.enumKey.slice(0, 2) +
			this.nosia.enumKey.slice(0, 2) +
			this.latia.enumKey.slice(0, 2) +
			this.voze.enumKey.slice(0, 2) +
			this.loke.enumKey +
			this.mode.enumKey;
	}

	toString(): string {
		if (this.mode === null) return 'pause';
		return this.silabia.enumKey.toLowerCase() + " " +
			this.longia.enumKey.toLowerCase() + " " +
			this.minorLoke.enumKey.toLowerCase() + " " +
			this.nosia.enumKey.toLowerCase() + " " +
			this.latia.enumKey.toLowerCase() + " " +
			this.voze.enumKey.toLowerCase() + " " +
			this.loke.enumKey.toLowerCase() + " " +
			this.mode.enumKey.toLowerCase();
	}

	getSonority() {
		if (this.mode === null)
			return Number.NEGATIVE_INFINITY;
		else
			return this.mode.sonority
				- ((this.latia === Latia.LATERAL) ? 1.5 : 0)
				+ ((this.voze === Voze.VOICED) ? 0.75 : 0)
				+ (this.is(PendaniSif.VOCOID) ? 1 : 0);
	}
}

/** collection of phonological features */
class Klas {
	private readonly sa: Sif[]; // qualities this class explicitly has
	readonly na: Sif[]; // qualities this class explicitly does not have
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
	 * @param fon the foneme that is being made to conform here
	 * @param ref if this.ka has stuff in it, draw those features from ref.
	 */
	konformu(fon: Fon = Fon.BLANK, ref: Fon = null): Fon {
		if (this.na.length > 0)
			throw Error(`you can't use minus ${this.na[0]} in the final state of a process!`);
		if (this.sa.length == 0) // if there are no properties, you don't have to do anything
			return fon; // (even if fon is a pause)

		let mode = fon.mode, loke = fon.loke, voze = fon.voze;
		let silabia = fon.silabia, longia = fon.longia, latia = fon.latia, minorLoke = fon.minorLoke, nosia = fon.nosia;
		for (let sif of this.sa) {
			if (sif === PendaniSif.RAISED) { // there are two special PendaniSif that depend on the current quality of the fone
				if (fon.is(PendaniSif.LOW))       sif = PendaniSif.MID;
				else if (fon.is(PendaniSif.MID))  sif = PendaniSif.HIGH;
				else if (fon.is(PendaniSif.HIGH)) sif = Voze.EJECTIVE; // ejective vowels aren't possible; this indicates that it should be diphthongized
				else throw `can't apply +RAISED to ${fon}`;
			}
			if (sif === PendaniSif.LOWERED) { // so interpret those first
				if (fon.is(PendaniSif.HIGH))       sif = PendaniSif.MID;
				else if (fon.is(PendaniSif.VOCOID)) sif = PendaniSif.LOW;
				else throw `can't apply +LOWERED to ${fon}`;
			}

			if (sif instanceof Mode) // then actually apply the feature
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
					case PendaniSif.NASAL:
						mode = Mode.NASAL;
						break;
					case PendaniSif.HIGH:
						if (fon.is(PendaniSif.LAX))
							mode = Mode.NEAR_CLOSE;
						else
							mode = Mode.CLOSE;
						break;
					case PendaniSif.MID:
						if (fon.is(PendaniSif.LAX))
							mode = Mode.OPEN_MID;
						else
							mode = Mode.CLOSE_MID;
						break;
					case PendaniSif.LOW:
						if (fon.is(PendaniSif.LAX))
							mode = Mode.NEAR_OPEN;
						else
							mode = Mode.OPEN;
						break;
					case PendaniSif.TENSE:
						if (!fon.is(PendaniSif.VOCOID))
							throw RangeError("can't tense a nonvocoid");
						else if (mode === Mode.NEAR_CLOSE)
							mode = Mode.CLOSE;
						else if (mode === Mode.OPEN_MID)
							mode = Mode.CLOSE_MID;
						else if (mode === Mode.NEAR_OPEN)
							mode = Mode.OPEN;
						break;
					case PendaniSif.LAX:
						if (!fon.is(PendaniSif.VOCOID))
							throw RangeError("can't lax a nonvocoid");
						else if (mode === Mode.CLOSE)
							mode = Mode.NEAR_CLOSE;
						else if (mode === Mode.CLOSE_MID)
							mode = Mode.OPEN_MID;
						else if (mode === Mode.OPEN)
							mode = Mode.NEAR_OPEN;
						break;
					case PendaniSif.SYLLABIC:
						if (silabia === Silabia.NONSYLLABIC)
							silabia = Silabia.UNSTRESSED;
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
			else if (akse === 'minorLoke')
				minorLoke = ref.minorLoke;
			else
				throw Error(`I can't understand ${akse}`);
		}

		if (mode === null || loke === null)
			throw `You tried to assign properties to silence in your overzealous attempt to mutate all of something into ${this}.`;

		if (loke === Loke.UVULAR && mode.sonority >= Mode.CLOSE.sonority) // turn uvular vowels into regular back vowels so I don't have to worry about dorsal nonvowel approximants
			loke = Loke.VELAR;
		if (loke === Loke.CENTRAL && mode.sonority < Mode.CLOSE.sonority) // turn central nonvowels into regular velar vowels
			loke = Loke.VELAR;

		if (mode === Mode.NEAR_CLOSE) // snap close-mid central vowels to front or back depending on rounding
			loke = (minorLoke === MinorLoke.LABIALIZED) ? Loke.VELAR : Loke.PALATAL;

		if (mode.sonority >= Mode.NEAR_OPEN.sonority && minorLoke === MinorLoke.LABIALIZED) // snap rounded low vowel to back
			loke = Loke.VELAR;
		if (mode === Mode.NEAR_OPEN && minorLoke === MinorLoke.LABIALIZED) // snap near-open vowels to the nearest IPA symbol
			mode = Mode.OPEN_MID;
		if (mode === Mode.NEAR_OPEN && loke === Loke.VELAR)
			loke = Loke.CENTRAL;

		if (mode === Mode.STOP || mode === Mode.NASAL)
			latia = Latia.MEDIAN;

		if ((minorLoke === MinorLoke.LABIALIZED && loke.foner === Foner.LABIA) ||
			(minorLoke === MinorLoke.PALATALIZED && (loke === Loke.POSTALVEOLAR || loke === Loke.PALATAL)) ||
			(minorLoke === MinorLoke.VELARIZED && loke === Loke.VELAR) ||
			(minorLoke === MinorLoke.PHARYNGEALIZED && loke.foner === Foner.PHARYNX)) // make sure the secondary articulation does not conflict with the primary articulation
			minorLoke = MinorLoke.UNROUNDED;
		if (nosia === Nosia.NASALIZED && mode === Mode.NASAL) // make sure nasal consonants are not also nasalized
			nosia = Nosia.ORAL;

		if (loke === Loke.POSTALVEOLAR && mode === Mode.STOP) // turn postalveolar stops into affricates before they can be cast to dental
			mode = Mode.AFFRICATE;
		if ([Loke.DENTAL, Loke.ALVEOLAR, Loke.POSTALVEOLAR].includes(loke))
			if (![Mode.FRICATE, Mode.AFFRICATE].includes(mode) || latia === Latia.LATERAL) // simplify alveolar-ish sounds to dental
				loke = Loke.DENTAL;
		if ((minorLoke === MinorLoke.LABIALIZED && loke.foner === Foner.LABIA) ||
			(minorLoke === MinorLoke.PALATALIZED && (loke === Loke.PALATAL || loke === Loke.POSTALVEOLAR)) ||
			(minorLoke === MinorLoke.VELARIZED && loke === Loke.VELAR) ||
			(minorLoke === MinorLoke.PHARYNGEALIZED && loke.foner === Foner.PHARYNX) ||
			(nosia === Nosia.NASALIZED && mode === Mode.NASAL))
			minorLoke = MinorLoke.UNROUNDED;

		if (mode === Mode.CLICK) { // only specific types of click are allowd (this is not realistic, but I'm simplifying the possible click systems because I don't understand clicks)
			if (latia === Latia.LATERAL)
				loke = Loke.PALATAL;
			else if (loke.foner === Foner.DORSUM || loke === Loke.POSTALVEOLAR)
				loke = Loke.PALATAL;
			else if (loke.foner === Foner.LABIA)
				loke = Loke.BILABIAL;
			else if (loke === Loke.POSTALVEOLAR || loke === Loke.RETROFLEX)
				loke = Loke.RETROFLEX;
			else
				loke = Loke.ALVEOLAR;
		}

		if (((mode === Mode.NASAL || nosia === Nosia.NASALIZED) && loke.foner === Foner.PHARYNX) ||
			((voze === Voze.VOICED || voze === Voze.BREATHY) && loke === Loke.GLOTTAL && mode === Mode.STOP) ||
			(mode === Mode.TAP && loke.foner !== Foner.CORONA && loke !== Loke.LABIODENTAL) ||
			(mode === Mode.TRILL && loke !== Loke.BILABIAL && loke !== Loke.DENTAL && loke !== Loke.UVULAR) ||
			(latia === Latia.LATERAL && loke.foner !== Foner.CORONA && loke.foner !== Foner.DORSUM) ||
			(mode.sonority > Mode.CLOSE.sonority && loke.foner !== Foner.DORSUM)) // if this change is impossible for whatever reason
			return fon; // cancel it
		else // otherwise
			return new Fon(mode, loke, voze, silabia, longia, latia, minorLoke, nosia); // bring it all together!
	}

	toString(): string {
		return `Klas(+[${this.sa}], -[${this.na}])`;
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

	constructor(ca: Klas[], pa: Klas[], idx: number[], bada: Klas[], chena: Klas[]) {
		if (idx.length !== pa.length)
			throw RangeError(`The pa array must be properly indexed: ${ca} > ${pa} / ${bada} _ ${chena}`);
		this.ca = ca;
		this.pa = pa;
		this.idx = idx;
		this.chen = bada;
		this.bade = chena;
	}

	/**
	 * go through the word and apply this sound change.
	 * @param old
	 */
	apply(old: Fon[]): Fon[] {
		const drowWen: Fon[] = []; // build the neWword in reverse
		let i = old.length;
		while (i >= 0) {
			if (this.applies([Fon.PAUSE].concat(old.slice(0, i)), [Fon.PAUSE].concat(drowWen))) { // if it applies here,
				for (let j = this.pa.length - 1; j >= 0; j --) { // fill in the replacement
					if (this.idx[j] < this.ca.length)
						drowWen.push(this.pa[j].konformu(
							old[i + this.idx[j] - this.ca.length], // mapping to the relevant old segments
							this.bade.length > 0 ? old[i] : old[i-1]));
					else
						drowWen.push(this.pa[j].konformu()); // or drawing new segments from thin air
				}
				i -= this.ca.length; // and jump to the next set of consonants
			}
			else { // if not
				i -= 1;
				if (i >= 0) drowWen.push(old[i]); // just add the next character of old
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
		if (this.ca.length === 1 && this.chen.length > 0 && this.bade.length > 0 &&
			(oldWord[oldWord.length-1].longia === Longia.LONG || oldWord[oldWord.length-1].minorLoke == MinorLoke.PHARYNGEALIZED)) // geminates and emphatics are immune to /X_X processes
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
			if (this.affectsConsonants || !old[i].is(Silabia.NONSYLLABIC)) { // but if this segment isn't immune
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
 * a process that places syllables according to the sonority sequencing constraint
 */
class SilaboPoze {
	private readonly bias: number; // amount to prefer earlier or later syllables
	private readonly minSonority: number; // minimum allowable sonority of a nucleus

	/**
	 * set up a new syllable placement system
	 * @param bias a positive number indicates that /iuiu/ is [juju], negative indicates [iwiw],
	 * and zero indicates [iuiu]
	 * @param minSonority the sonority of the most sordid allowable nucleus; if a peak is too sordid,
	 * a schwa will be inserted
	 */
	constructor(bias: number, minSonority: number) {
		this.bias = bias;
		this.minSonority = minSonority;
	}

	apply(old: Fon[]): Fon[] {
		const sonority = [];
		for (const fon of old) // first calculate the sonorities
			sonority.push(fon.getSonority());
		const nov = []; // then copy the old word
		for (let i = 0; i < old.length; i ++) { // and assign syllables accordingly
			const c = sonority[i];
			const l = (i-1 >= 0) ? sonority[i-1] : Number.NEGATIVE_INFINITY;
			const r = (i+1 < old.length) ? sonority[i+1] : Number.NEGATIVE_INFINITY;
			if (c >= l && c >= r && !(this.bias < 0 && c === l && c < r) && !(this.bias > 0 && c < l && c === r)) { // if it is a peak
				if (old[i].getSonority() < this.minSonority) {
					nov.push(new Fon(Mode.OPEN_MID, Loke.CENTRAL, Voze.VOICED, old[i].silabia, Longia.SHORT, Latia.MEDIAN, MinorLoke.UNROUNDED, Nosia.ORAL).with(PendaniSif.SYLLABIC));
					nov.push(old[i].with(Silabia.NONSYLLABIC)); // insert an epenthetic schwa or
				}
				else
					nov.push(old[i].with(PendaniSif.SYLLABIC)); // make it syllabic
			}
			else if (old[i].is(PendaniSif.SPOKEN)) // otherwise if it is a sound
				nov.push(old[i].with(Silabia.NONSYLLABIC)); // make it nonsyllabic
			else
				nov.push(old[i]); // ignore pauses
		}
		return nov;
	}
}


/**
 * a process that places stress according to certain rules
 */
class AcentoPoze {
	private readonly reverse: boolean; // whether the primary stress is on the right
	private readonly headSize: number; // the number of unstressed syllables to put between the word edge and the initial stress
	private readonly attractors: number; // the minimum weight that attracts stress
	private readonly tailMode: string; // ['lapse', 'clash', 'none'] how to handle stress at the tail end when the syllables ar odd
	private readonly lengthen: boolean; // whether to lengthen stressed open syllables

	/**
	 * create a new stress system given some simplified parameters
	 * @param reverse
	 * @param headSize
	 * @param attractors
	 * @param tailMode ['lapse', 'clash', or 'none']
	 * @param lengthen
	 */
	constructor(reverse: boolean, headSize: number, attractors: number, tailMode: string, lengthen: boolean) {
		this.reverse = reverse;
		this.headSize = headSize;
		this.attractors = attractors;
		this.tailMode = tailMode;
		this.lengthen = lengthen
	}

	apply(old: Fon[]): Fon[] {
		let nuclei: {i: number, weight: number}[] = [];
		let numC = 1;
		for (let i = old.length - 1; i >= 0; i --) { // first, tally up the syllables
			if (!old[i].is(PendaniSif.SPOKEN)) { // skip past any pauses
				numC = 1;
			}
			else if (old[i].is(PendaniSif.SYLLABIC)) { // using syllabicity to identify nuclei
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
			if (!stress[i]) {
				nov[nuclei[i].i] = old[nuclei[i].i].with(Silabia.UNSTRESSED); // stressless is stressless
				if (this.lengthen && nuclei[i].weight === 2)
					nov[nuclei[i].i] = nov[nuclei[i].i].with(Longia.SHORT); // shorten unstressed heavy syllables if Ident long is outranked
			}
			else {
				nov[nuclei[i].i] = old[nuclei[i].i].with(
					firstStress ? Silabia.PRIMARY_STRESSED : Silabia.SECONDARY_STRESSED); // the first stress is primary
				firstStress = false;
				if (this.lengthen && nuclei[i].weight === 0)
					nov[nuclei[i].i] = nov[nuclei[i].i].with(Longia.LONG); // lengthen stressed open syllables if Ident long is outranked
			}
		}
		return nov;
	}
}


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
		const silabia = sif[0].includes('s') ? Silabia.UNSTRESSED : Silabia.NONSYLLABIC;
		const latia = sif[0].includes('l') ? Latia.LATERAL : Latia.MEDIAN;
		const aliSif = sif[0].includes('w') ? MinorLoke.LABIALIZED : sif[0].includes('v') ? MinorLoke.VELARIZED : MinorLoke.UNROUNDED;
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

const PROCES_CHUZABLE: {chanse: number, proces: Proces}[] = [];
for (const procesKitabe of loadTSV('proces.txt', /\s+/, /%/)) { // load the phonological processes
	const chanse = Number.parseInt(procesKitabe[0])/1000;
	if (procesKitabe[1] === 'mute') {
		const ca: Klas[] = [], pa: Klas[] = [], bada: Klas[] = [], chena: Klas[] = [];
		let idx: number[] = [];
		let fen = ca;
		let sa: Sif[] = null, na: Sif[] = null, ka: string[] = null;
		for (let sinye of procesKitabe.slice(2)) { // and parse them
			if (sinye === '>') // > transitions from ca to pa
				fen = pa;
			else if (sinye === '_') // _ transitions from badu to chenu
				fen = chena;
			else if (sinye === '#') // indicates a word boundary
				fen.push(new Klas([], [PendaniSif.SPOKEN]));
			else if (sinye === '/') { // / transitions from pa to badu
				if (idx.length < pa.length) { // and assigns indices if they weren't assigned explicitly
					if (ca.length > 1 && ca.length !== pa.length) throw `please specify indices for ${procesKitabe}`;
					idx = [];
					for (let i = idx.length; i < pa.length; i++)
						idx.push(Math.min(i, ca.length - 1));
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
				throw RangeError(`unintelligible symbol near line ${PROCES_CHUZABLE.length}: ${sinye}`);
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
				for (const lengthen of [true, false])
					PROCES_CHUZABLE.push({chanse: chanse/18., proces:
							new AcentoPoze(reverse, headSize, attractors, tailMode, lengthen)});
	}
	else if (procesKitabe[1] === 'silabe') {
		const minSilabia = Number.parseInt(procesKitabe[2]);
		for (let bias = -1; bias <= 1; bias ++)
			PROCES_CHUZABLE.push({chanse: chanse/3, proces:
					new SilaboPoze(bias, minSilabia)});
	}
	else {
		throw `unrecognized process classification: ${procesKitabe[1]}`;
	}
}


/**
 * different types of nym
 */
export enum WordType {
	JANNAM,
	FAMILNAM,
	SITONAM,
	BASHNAM,
	LOKONAM,
	DEMNAM,
}

/**
 * a collection of similar words.
 */
export interface Language {
	/**
	 * get a name from this language. the style of name and valid indices depend on the WordType:
	 * JANNAM - forename, indexed in [0, 50)
	 * FAMILNAM - surname, indexed in [0, 25)
	 * SITONAM - city name, indexed in [0, 25), corresponds to the respective toponym
	 * BASHNAM - glossonym, indexed in [0, 25), corresponds to the respective toponym
	 * LOKONAM - toponym, indexed in [0, 25)
	 * DEMNAM - ethnonym, indexed in [0, 25), corresponds to the respective toponym
	 * @param i the index of the name
	 * @param type the type of name
	 */
	getNamloge(i: number, type: WordType): Fon[]

	/**
	 * get the language that this was n timesteps ago
	 * @param n the number of steps backward, in centuries.
	 */
	getAncestor(n: number): Language

	/**
	 * is this language actually a dialect of lang?
	 * @param lang
	 */
	isIntelligible(lang: Language): boolean
}

export class ProtoLang {
	private static STRESS = new AcentoPoze(true, 1, 1, 'lapse', false);
	private static VOWELS = ipa("aiueoəɛɔyø");
	private static CONSON = ipa("mnptksljwhfbdɡrzŋʃʔxqvɣθʙ");
	private static MEDIAL = ipa("ljwr");
	private static R_INDEX = ProtoLang.CONSON.indexOf(ipa("r")[0]); // note the index of r, because it's phonotactically important

	private static P_ONSET = 0.8;
	private static P_MEDIAL = 0.4;
	private static P_CODA = 0.4;

	private readonly rng: Random; // this language's personal rng generator
	private readonly rightBranching: boolean; // whether it is right-branching
	private readonly diversity: number; // the typical number of lexical suffixes used for one type of word
	private readonly genders: number; // the typical number of gender suffixes used for nouns
	private readonly nConson: number; // the number of consonants in this language
	private readonly nVowel: number; // the number of vowels in this langugage
	private readonly nMedial: number; // the numer of medials in this language
	private readonly complexity: number; // the approximate amount of information in one syllable
	/**
	 * the fundamental roots of this language. they are indexed as follows:
	 * [0, 6) - synonyms of "city"
	 * [6, 12) - synonyms of "land"
	 * [12, 24) - synonyms of "person"
	 * [24, 25) - word for "language"
	 * [25, 150) - generic roots
	 * @param i the index of the word, in [0, 150).
	 */
	private readonly logomul: Fon[][];
	private readonly logofin: Fon[][];

	constructor(rng: Random) {
		this.rng = rng;
		this.rightBranching = rng.probability(0.2);
		this.diversity = Math.floor(rng.exponential(3)); // choose how much lexical suffixing to do
		this.genders = Math.floor(rng.exponential(2)); // choose how much basic suffixing to do
		this.nConson = 7 + rng.binomial(18, .5); // choose how many consonants the protolanguage will have
		this.nVowel = 5 + rng.binomial(5, .1); // choose how many nuclei it will have
		this.nMedial = (this.nConson > ProtoLang.R_INDEX) ? 4 : 0;
		this.complexity = 2*Math.log10(1 + this.nConson)
			+ Math.log10(1 + this.nMedial) + Math.log10(1 + this.nVowel);
		this.logomul = new Array<Fon[]>(150);
		this.logofin = new Array<Fon[]>(this.genders);
		if (rng.probability(.5))
			this.logomul[8] = ipa("ia"); // this is sometimes here
	}

	getLoge(asle: Fon[][], i: number): Fon[] {
		if (i < 0 || i >= asle.length)
			throw RangeError("baka.");
		if (asle[i] === undefined) {
			const nSyl = (asle === this.logofin) ? 1/2 : Math.ceil((i < 25 ? 1.5 : 4)/this.complexity);
			asle[i] = this.newRoot(nSyl, this.rng);
		}
		return asle[i];
	}

	getNamloge(i: number, type: WordType): Fon[] {
		switch (type) {
			case WordType.SITONAM:
				return this.suffix(i, 25, 0, 6, false);
			case WordType.LOKONAM:
				return this.suffix(i, 50, 6, 12, false); // TODO countries can be named after cities
			case WordType.DEMNAM:
				return this.suffix(i, 50, 18, 19, true); // TODO people can be named after countries
			case WordType.BASHNAM:
				return this.suffix(i, 50, 24, 25, true);
			case WordType.FAMILNAM:
				return this.suffix(i, 75, 12, 24, false);
			case WordType.JANNAM:
				return this.suffix(i, 100, 0, 0, false);
		}
	}

	/**
	 * generate a new random word root
	 * @param nSyllables the number of syllables in the word, or less than one to indicate a syllable with fewer letters
	 * @param rng
	 */
	newRoot(nSyllables: number, rng: Random): Fon[] {
		let lekse;
		const reduccion = Math.min(1, nSyllables);
		do {
			lekse = [];
			for (let i = 0; i < nSyllables; i++) {
				if (rng.probability(ProtoLang.P_ONSET * reduccion))
					lekse.push(rng.choice(ProtoLang.CONSON.slice(0, this.nConson)));
				if (this.nMedial > 0 && rng.probability(ProtoLang.P_MEDIAL * reduccion))
					lekse.push(rng.choice(ProtoLang.MEDIAL.slice(0, this.nMedial)));
				if (rng.probability(reduccion))
					lekse.push(rng.choice(ProtoLang.VOWELS.slice(0, this.nVowel)));
				if (rng.probability(ProtoLang.P_CODA * reduccion))
					lekse.push(rng.choice(ProtoLang.CONSON.slice(0, this.nConson)));
			}
		} while (nSyllables >= 1 && lekse.length < 3);
		return lekse;
	}

	/**
	 * create a new word derivative based on roots
	 * @param baseI
	 * @param base0
	 * @param affix0
	 * @param affixN
	 * @param obligatory whether the affix cannot be noting
	 */
	suffix(baseI: number, base0: number, affix0: number, affixN: number, obligatory: boolean) {
		const base = this.getLoge(this.logomul, base0 + baseI); // get the base
		const numAffixen = Math.min(this.diversity, affixN - affix0); // count how many options we have for affixen
		const affixI = baseI%(numAffixen + (obligatory ? 0 : 1)); // pick an affix (if it's nonobligatory, none is also an option)
		const endingI = affixI%this.genders; // pick a word ending (if genders==0, there should be no ending)
		const ending = Number.isNaN(endingI) ? [] : this.getLoge(this.logofin, endingI); // get the word ending
		let loge: Fon[];
		if (affixI === numAffixen)
			loge = base; // choosing an out of bounds affix indicates that we have chosen no affix
		else {
			const affix = this.getLoge(this.logomul, affix0 + affixI); // otherwise get the chosen affix
			if (this.rightBranching)
				loge = affix.concat([Fon.PAUSE]).concat(base); // remember to put a pause between them
			else
				loge = base.concat([Fon.PAUSE]).concat(affix);
		}
		ProtoLang.STRESS.apply(loge.concat(ending));
		return ProtoLang.STRESS.apply(loge.concat(ending));
	}

	getAncestor(n: number): Language {
		return this;
	}

	isIntelligible(lang: Language): boolean {
		return this === lang;
	}
}

export class DeuteroLang {
	private readonly parent: Language;
	private readonly changes: Proces[];

	constructor(parent: Language, rng: Random) {
		this.parent = parent;
		this.changes = [];
		for (const {chanse, proces} of PROCES_CHUZABLE)
			if (rng.probability(chanse))
				this.changes.push(proces);
	}

	getNamloge(i: number, type: WordType) {
		return this.applyChanges(this.parent.getNamloge(i, type));
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

const DIACRITICS: {klas: Klas, baze: Sif[], kode: string}[] = [ // TODO: can I rearrange this to put the macron underneath the acute accent?
	{klas: new Klas([], [PendaniSif.SPOKEN]), baze: [], kode: 'Pau'},
	{klas: new Klas([Longia.LONG, Silabia.NONSYLLABIC]), baze: [Longia.SHORT], kode: 'Gem'},
	{klas: new Klas([Longia.LONG], [Silabia.NONSYLLABIC]), baze: [Longia.SHORT], kode: 'Len'},
	{klas: new Klas([Voze.ASPIRATED]), baze: [Voze.TENUIS], kode: 'Asp'},
	{klas: new Klas([Voze.EJECTIVE]), baze: [Voze.TENUIS], kode: 'Ejt'},
	{klas: new Klas([Loke.LINGUOLABIAL, PendaniSif.LIQUID]), baze: [Loke.DENTAL, Loke.DENTAL], kode: 'LnL'},
	{klas: new Klas([Loke.LINGUOLABIAL]), baze: [Loke.BILABIAL, Loke.DENTAL], kode: 'LnL'},
	{klas: new Klas([Loke.LABIOCORONAL]), baze: [Loke.ALVEOLAR, Loke.BILABIAL], kode: 'Dbl'},
	{klas: new Klas([Loke.LABIOVELAR]), baze: [Loke.VELAR, Loke.BILABIAL], kode: 'Dbl'},
	{klas: new Klas([MinorLoke.PALATALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'Pal'},
	{klas: new Klas([MinorLoke.PHARYNGEALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'Pha'},
	{klas: new Klas([MinorLoke.VELARIZED]), baze: [MinorLoke.UNROUNDED], kode: 'Vel'},
	{klas: new Klas([Silabia.PRIMARY_STRESSED]), baze: [Silabia.UNSTRESSED], kode: 'St1'},
	{klas: new Klas([Silabia.SECONDARY_STRESSED]), baze: [Silabia.UNSTRESSED], kode: 'St2'},
	{klas: new Klas([Nosia.NASALIZED, PendaniSif.VOCOID]), baze: [Nosia.ORAL], kode: 'Nas'},
	{klas: new Klas([Nosia.NASALIZED], [PendaniSif.VOCOID]), baze: [Mode.NASAL, Nosia.ORAL], kode: 'PrN'},
	{klas: new Klas([Voze.BREATHY]), baze: [Voze.VOICED], kode: 'Bre'},
	{klas: new Klas([Voze.TENUIS, PendaniSif.SONORANT]), baze: [Voze.VOICED], kode: 'Dev'},
	{klas: new Klas([PendaniSif.GLIDE]), baze: [Silabia.UNSTRESSED], kode: 'Gli'},
	{klas: new Klas([MinorLoke.LABIALIZED]), baze: [MinorLoke.UNROUNDED], kode: 'Lab'},
	{klas: new Klas([PendaniSif.SYLLABIC], [PendaniSif.VOCOID]), baze: [Silabia.NONSYLLABIC], kode: 'Syl'},
	{klas: new Klas([Mode.AFFRICATE]), baze: [Mode.STOP, Mode.FRICATE], kode: 'Aff'},
	{klas: new Klas([Mode.CLOSE]), baze: [Mode.FRICATE], kode: 'Prx'},
]

/**
 * get an orthographical representation from a phoneme
 * @param fon the sound to look up
 * @param convention the spelling style in which to look this up
 * @param level the number of diacritics we have already checkd (don't check them again)
 */
function lookUp(fon: Fon, convention: Convention = Convention.NASOMEDI, level: number = 0): string {
	if (TO_TEXT.has(fon.hash())) // if it's in the table
		return TO_TEXT.get(fon.hash())[convention]; // just return that

	for (let i = level; i < DIACRITICS.length; i ++) { // if not, look through the diacritics
		const {klas, baze, kode} = DIACRITICS[i];
		if (klas.macha(fon)) { // to see if there's one that will help
			const baziFon = [];
			for (const sif of baze)
				baziFon.push(fon.with(sif)); // if so, simplify the foneme

			const diacritic = TO_DIACRITICS.get(kode)[convention]; // and apply the diacritic
			let graf = diacritic;
			if (diacritic.includes('X') || diacritic.includes('x')) {
				let X = lookUp(baziFon[0], convention, i + 1);
				graf = graf.replace('X', X);
				if (diacritic.includes('x')) {
					let x = X.slice(0, 1);
					if (baziFon[0].mode === Mode.AFFRICATE)
						x = lookUp(baziFon[0].with(Mode.STOP), convention, i + 1).slice(0, 1);
					graf = graf.replace('x', x);
				}
			}
			if (diacritic.includes('Y')) {
				let Y = lookUp(baziFon[1], convention, i + 1);
				graf = graf.replace('Y', Y);
			}
			return graf;
		}
	}

	throw `I don't know how to write ${fon}`;
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
