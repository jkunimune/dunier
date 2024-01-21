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
import {Enumify} from "../lib/enumify.js";


/** list of active articulators */
export enum Foner {
	LABIA,
	CORONA,
	DORSUM,
	PHARYNX,
}

/** form of primary articulation or vowel height */
export class Mode extends Enumify { // this should just be an enum, but JavaScript implements them poorly
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
export class Loke extends Enumify {
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
export class Voze extends Enumify {
	static VOICED = new Voze();
	static BREATHY = new Voze();
	static TENUIS = new Voze();
	static ASPIRATED = new Voze();
	static EJECTIVE = new Voze();
	static _ = Voze.closeEnum();
}

/** syllabicity */
export class Silabia extends Enumify {
	static PRIMARY_STRESSED = new Silabia();
	static SECONDARY_STRESSED = new Silabia();
	static UNSTRESSED = new Silabia();
	static NONSYLLABIC = new Silabia();
	static _ = Silabia.closeEnum();
}

/** length */
export class Longia extends Enumify {
	static LONG = new Longia();
	static SHORT = new Longia();
	static _ = Longia.closeEnum();
}

/** laterality */
export class Latia extends Enumify {
	static LATERAL = new Latia();
	static MEDIAN = new Latia();
	static _ = Latia.closeEnum();
}

/** location of secondary articulation or vowel rounding */
export class MinorLoke extends Enumify {
	static UNROUNDED = new MinorLoke();
	static LABIALIZED = new MinorLoke();
	static PALATALIZED = new MinorLoke();
	static VELARIZED = new MinorLoke();
	static PHARYNGEALIZED = new MinorLoke();
	static _ = MinorLoke.closeEnum();
}

/** nasality */
export class Nosia extends Enumify {
	static NASALIZED = new Nosia();
	static ORAL = new Nosia();
	static _ = Nosia.closeEnum();
}
/** dependent segment features */
export class PendaniSif extends Enumify {
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

export type Sif = Mode | Loke | Voze | Silabia | Longia | Latia | MinorLoke | Nosia | PendaniSif;
export const SIF_TIPE = [PendaniSif, Loke, Mode, Voze, Silabia, Longia, Latia, Nosia, MinorLoke];

/** phonological segment */
export class Fon {
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
export class Klas {
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
		if (this.sa.length === 0) // if there are no properties, you don't have to do anything
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
			((voze === Voze.VOICED || voze === Voze.BREATHY || voze === Voze.EJECTIVE) && loke === Loke.GLOTTAL) ||
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

