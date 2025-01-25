/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {Enumify} from "../libraries/enumify.js";


/** list of active articulators */
export enum Foner {
	LABIA,
	CORONA,
	DORSUM,
	PHARYNX,
	MULTIPLE,
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

/** look up the manner of articulation by name */
export function get_mode_from_name(name: string): Mode {
	const normalizedName = name.toUpperCase().replace(" ", "_");
	for (const mode of Mode)
		if (mode.enumKey === normalizedName)
			return mode as Mode;
	throw new Error(`unrecognized manner of articulation: '${name}'`);
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
	static LABIOCORONAL = new Loke(Foner.MULTIPLE);
	static LABIOVELAR = new Loke(Foner.MULTIPLE);
	static _ = Loke.closeEnum();

	foner: number;
	constructor (articulator: number) {
		super();
		this.foner = articulator;
	}
}

/** look up the place of articulation by name */
export function get_loke_from_name(name: string): Loke {
	const normalizedName = name.toUpperCase().replace(" ", "_");
	for (const loke of Loke)
		if (loke.enumKey === normalizedName)
			return loke as Loke;
	throw new Error(`unrecognized place of articulation: '${name}'`);
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
/** more complicated segment features that are determined by
 * things like place and manner of articulation */
export class Quality extends Enumify {
	static LABIAL = new Quality();
	static CORONAL = new Quality();
	static DORSAL = new Quality();
	static GUTTURAL = new Quality();
	static ALVEOLAR = new Quality();
	static NASAL = new Quality();
	static CONTINUANT = new Quality();
	static OCCLUSIVE = new Quality();
	static SONORANT = new Quality();
	static OBSTRUENT = new Quality();
	static VIBRANT = new Quality();
	static HIGH = new Quality();
	static MID = new Quality();
	static LOW = new Quality();
	static RAISED = new Quality();
	static LOWERED = new Quality();
	static TENSE = new Quality();
	static LAX = new Quality();
	static PALATAL = new Quality();
	static VELAR = new Quality();
	static PHARANGEAL = new Quality();
	static SIBILANT = new Quality();
	static RHOTIC = new Quality();
	static LIQUID = new Quality();
	static WIBBLY = new Quality();
	static VOCOID = new Quality();
	static GLIDE = new Quality();
	static VOWEL = new Quality();
	static SORDID = new Quality();
	static STRESSED = new Quality();
	static SYLLABIC = new Quality();
	static SPOKEN = new Quality();
	static _ = Quality.closeEnum();
}

export type Feature = Mode | Loke | Voze | Silabia | Longia | Latia | MinorLoke | Nosia | Quality;
export const FEATURE_TYPES = [Quality, Loke, Mode, Voze, Silabia, Longia, Latia, Nosia, MinorLoke];


export function parseFeature(s: string): Feature {
	const starred = s.startsWith('!');
	if (starred) s = s.slice(1);
	for (const featureType of starred ? FEATURE_TYPES.slice(1) : FEATURE_TYPES) { // or their value is read
		for (const feature of featureType) {
			if ((feature.enumKey + typeof (feature)).startsWith(s)) {
				return feature;
			}
		}
	}
	throw Error(`I can't understand to what feature '${s}' refers.`);
}


/** phonological segment */
export class Sound {
	/** the default phone, to be used for insertion rules */
	public static BLANK = new Sound(
		null,
		null,
		Voze.VOICED,
		Silabia.NONSYLLABIC,
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
	 * @param feature
	 */
	is(feature: Feature): boolean {
		if (this.loke === null || this.mode === null || this.voze === null)
			throw new Error("we stopped supporting Sounds with null attributes.");
		if (feature instanceof Loke)
			return this.loke === feature;
		else if (feature instanceof Mode)
			return this.mode === feature;
		else if (feature instanceof Voze)
			return this.voze === feature;
		else if (feature instanceof Silabia)
			return this.silabia === feature;
		else if (feature instanceof Longia)
			return this.longia === feature;
		else if (feature instanceof Latia)
			return this.latia === feature;
		else if (feature instanceof MinorLoke)
			return this.minorLoke === feature;
		else if (feature instanceof Nosia)
			return this.nosia === feature;
		else {
			switch (feature) {
				case Quality.LABIAL:
					return this.loke.foner === Foner.LABIA || this.minorLoke === MinorLoke.LABIALIZED;
				case Quality.CORONAL:
					return this.loke.foner === Foner.CORONA;
				case Quality.DORSAL:
					return this.loke.foner === Foner.DORSUM;
				case Quality.GUTTURAL:
					return this.loke.foner === Foner.PHARYNX || this.minorLoke === MinorLoke.PHARYNGEALIZED;
				case Quality.NASAL:
					return this.mode === Mode.NASAL || this.nosia === Nosia.NASALIZED;
				case Quality.ALVEOLAR:
					return this.is(Loke.ALVEOLAR) || (this.is(Loke.DENTAL) && this.mode !== Mode.FRICATE && this.mode !== Mode.AFFRICATE);
				case Quality.CONTINUANT:
					return this.mode === Mode.FRICATE || this.mode === Mode.TRILL || this.mode.sonority >= Mode.CLOSE.sonority;
				case Quality.OCCLUSIVE:
					return !this.is(Quality.CONTINUANT);
				case Quality.SONORANT:
					return this.mode.sonority >= Mode.NASAL.sonority;
				case Quality.OBSTRUENT:
					return !this.is(Quality.SONORANT);
				case Quality.VIBRANT:
					return this.mode === Mode.TAP || this.mode === Mode.TRILL;
				case Quality.HIGH:
					return this.is(Quality.VOCOID) && (this.mode === Mode.CLOSE || this.mode === Mode.NEAR_CLOSE);
				case Quality.MID:
					return this.is(Quality.VOCOID) && (this.mode === Mode.CLOSE_MID || this.mode === Mode.OPEN_MID);
				case Quality.LOW:
					return this.is(Quality.VOCOID) && (this.mode === Mode.NEAR_OPEN || this.mode === Mode.OPEN);
				case Quality.TENSE:
					return this.mode === Mode.CLOSE || this.mode === Mode.CLOSE_MID || this.mode === Mode.OPEN;
				case Quality.LAX:
					return this.mode === Mode.NEAR_CLOSE || this.mode === Mode.OPEN_MID || this.mode === Mode.NEAR_OPEN;
				case Quality.PALATAL:
					return !this.is(Quality.LOW) && (this.loke === Loke.PALATAL || this.loke === Loke.POSTALVEOLAR || this.minorLoke === MinorLoke.PALATALIZED);
				case Quality.VELAR:
					return !this.is(Quality.LOW) && (this.loke === Loke.VELAR || this.minorLoke === MinorLoke.VELARIZED);
				case Quality.PHARANGEAL:
					return this.loke === Loke.EPIGLOTTAL || this.minorLoke === MinorLoke.PHARYNGEALIZED;
				case Quality.SIBILANT:
					return (this.mode === Mode.AFFRICATE || this.mode === Mode.FRICATE) &&
						(this.loke === Loke.ALVEOLAR || this.loke === Loke.POSTALVEOLAR);
				case Quality.LIQUID:
					return this.voze === Voze.VOICED && (
						(this.is(Quality.SONORANT) && !this.is(Mode.NASAL) && (this.is(Quality.CORONAL) || this.loke === Loke.UVULAR)) ||
						(this.mode === Mode.FRICATE && this.loke === Loke.UVULAR));
				case Quality.RHOTIC:
					return this.is(Quality.LIQUID) && !this.is(Latia.LATERAL);
				case Quality.WIBBLY:
					return this.is(Quality.LABIAL) && (this.is(Quality.SONORANT) || (this.is(Voze.VOICED) &&
						this.is(Mode.FRICATE))) && this.is(Silabia.NONSYLLABIC);
				case Quality.VOCOID:
					return this.mode.sonority >= Mode.CLOSE.sonority && this.latia === Latia.MEDIAN &&
						this.loke.foner === Foner.DORSUM;
				case Quality.GLIDE:
					return this.silabia === Silabia.NONSYLLABIC && this.is(Quality.VOCOID);
				case Quality.VOWEL:
					return this.silabia !== Silabia.NONSYLLABIC && this.is(Quality.VOCOID);
				case Quality.SORDID:
					return this.voze !== Voze.VOICED && this.voze !== Voze.BREATHY;
				case Quality.STRESSED:
					return this.silabia === Silabia.PRIMARY_STRESSED || this.silabia === Silabia.SECONDARY_STRESSED;
				case Quality.SYLLABIC:
					return this.silabia !== Silabia.NONSYLLABIC;
				case Quality.SPOKEN:
					return true;
				default:
					throw new Error(`can't check for ${feature}ness`);
			}
		}
	}

	/**
	 * return a fone that is identical to this, except that it has the given feature
	 * @param feature
	 */
	with(feature: Feature): Sound {
		if (!this.is(feature))
			return new Klas([feature]).apply(this);
		else
			return this;
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
			this.loke.enumKey +
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

	getSonority() {
		return this.mode.sonority
			- ((this.latia === Latia.LATERAL) ? 1.5 : 0)
			+ ((this.voze === Voze.VOICED) ? 0.75 : 0)
			+ (this.is(Quality.VOCOID) ? 1 : 0);
	}
}

/** collection of phonological features */
export class Klas {
	private readonly required: Feature[]; // qualities this class explicitly has
	private readonly forbidden: Feature[]; // qualities this class explicitly does not have
	private readonly tracked: string[]; // qualities this class might have

	/**
	 * assemble a collection of phonological features to describe, qualify, or alter a Sound.
	 * @param plus features that the Sound must have, or that will be applied to it.
	 * @param minus features that the Sound must not have.
	 * @param alpha features that the Sound may or may not have depending on context. this one is specifically used
	 *              when applying a Klas to a Sound; if there are any of these alpha features, a reference Sound must
	 *              also be passed, and the specified alpha features will be copied from that reference.
	 */
	constructor(plus: Feature[], minus: Feature[] = [], alpha: string[] = []) {
		this.required = plus;
		this.forbidden = minus;
		this.tracked = alpha;
	}

	/**
	 * does sound have all of the properties of this class?
	 * @param sound
	 */
	matches(sound: Sound): boolean {
		for (const feature of this.required)
			if (!sound.is(feature))
				return false;
		for (const feature of this.forbidden)
			if (sound.is(feature))
				return false;
		return true;
	}

	/**
	 * does this Klas have only negative requirements, such that the absense of speech can match?
	 */
	matchesSilence(): boolean {
		return this.required.length === 0;
	}

	/**
	 * does this Klas have any "tracked" requirements, such that applying it will require a reference sound?
	 */
	referencesAnything() {
		return this.tracked.length > 0;
	}

	/**
	 * create a Sound with all of the properties of this, and similar to sound in every other respect.
	 * @param sound the foneme that is being made to conform here
	 * @param ref if this.ka has stuff in it, draw those features from ref.
	 */
	apply(sound: Sound = Sound.BLANK, ref: Sound | null = null): Sound {
		if (this.forbidden.length > 0)
			throw Error(`you can't use -${this.forbidden[0]} in the final state of a process!`);
		if (this.required.length === 0 && this.tracked.length === 0) // if there are no properties, you don't have to do anything
			return sound;

		let mode = sound.mode, loke = sound.loke, voze = sound.voze;
		let silabia = sound.silabia, longia = sound.longia, latia = sound.latia, minorLoke = sound.minorLoke, nosia = sound.nosia;
		for (let feature of this.required) {
			if (feature === Quality.RAISED) { // there are two special PendaniSif that depend on the current quality of the fone
				if (sound.is(Quality.LOW))       feature = Quality.MID;
				else if (sound.is(Quality.MID))  feature = Quality.HIGH;
				else if (sound.is(Quality.HIGH)) feature = Voze.EJECTIVE; // ejective vowels aren't possible; this indicates that it should be diphthongized
				else throw new Error(`can't apply +RAISED to ${sound}`);
			}
			if (feature === Quality.LOWERED) { // so interpret those first
				if (sound.is(Quality.HIGH))       feature = Quality.MID;
				else if (sound.is(Quality.VOCOID)) feature = Quality.LOW;
				else throw new Error(`can't apply +LOWERED to ${sound}`);
			}

			if (feature instanceof Mode) // then actually apply the feature
				mode = feature;
			else if (feature instanceof Loke)
				loke = feature;
			else if (feature instanceof Voze)
				voze = feature;
			else if (feature instanceof Silabia)
				silabia = feature;
			else if (feature instanceof Longia)
				longia = feature;
			else if (feature instanceof Latia)
				latia = feature;
			else if (feature instanceof MinorLoke)
				minorLoke = feature;
			else if (feature instanceof Nosia)
				nosia = feature;
			else {
				switch (feature) {
					case Quality.PALATAL:
						loke = Loke.PALATAL;
						break;
					case Quality.VELAR:
						loke = Loke.VELAR;
						break;
					case Quality.ALVEOLAR:
						loke = Loke.ALVEOLAR;
						break;
					case Quality.NASAL:
						mode = Mode.NASAL;
						break;
					case Quality.HIGH:
						if (sound.is(Quality.LAX))
							mode = Mode.NEAR_CLOSE;
						else
							mode = Mode.CLOSE;
						break;
					case Quality.MID:
						if (sound.is(Quality.LAX))
							mode = Mode.OPEN_MID;
						else
							mode = Mode.CLOSE_MID;
						break;
					case Quality.LOW:
						if (sound.is(Quality.LAX))
							mode = Mode.NEAR_OPEN;
						else
							mode = Mode.OPEN;
						break;
					case Quality.TENSE:
						if (!sound.is(Quality.VOCOID))
							throw RangeError("can't tense a nonvocoid");
						else if (mode === Mode.NEAR_CLOSE)
							mode = Mode.CLOSE;
						else if (mode === Mode.OPEN_MID)
							mode = Mode.CLOSE_MID;
						else if (mode === Mode.NEAR_OPEN)
							mode = Mode.OPEN;
						break;
					case Quality.LAX:
						if (!sound.is(Quality.VOCOID))
							throw RangeError("can't lax a nonvocoid");
						else if (mode === Mode.CLOSE)
							mode = Mode.NEAR_CLOSE;
						else if (mode === Mode.CLOSE_MID)
							mode = Mode.OPEN_MID;
						else if (mode === Mode.OPEN)
							mode = Mode.NEAR_OPEN;
						break;
					case Quality.SYLLABIC:
						if (silabia === Silabia.NONSYLLABIC)
							silabia = Silabia.UNSTRESSED;
						break;
					default:
						throw Error(`I can't use ${feature} in the final state of a process.`);
				}
			}
		}

		if (this.tracked.length > 0 && ref === null)
			throw new Error("this process uses ± symbols but it's not clear what sound it's supposed to use to decide between + and -.");
		for (const axis of this.tracked) { // match features from ka
			if (axis === 'loke')
				loke = ref.loke;
			else if (axis === 'voze')
				voze = ref.voze;
			else if (axis === 'minorLoke')
				minorLoke = ref.minorLoke;
			else if (axis === 'silabia')
				silabia = ref.silabia;
			else
				throw Error(`I can't understand ${axis}`);
		}

		if (mode === null || loke === null)
			throw new Error(`there shouldn't be Sounds with null attributes anymore.`);

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
			return sound; // cancel it
		else // otherwise
			return new Sound(mode, loke, voze, silabia, longia, latia, minorLoke, nosia); // bring it all together!
	}

	toString(): string {
		return `Klas(+[${this.required.join(", ")}], -[${this.forbidden.join(", ")}])`;
	}
}
