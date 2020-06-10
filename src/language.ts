// language.ts

import {Random} from "./random";


enum Fonogawia {
    ANY,
    TALI,
    MEDOTALI,
    MEDOGAWI,
    GAWI,
}

enum Fonopredia {
    ANY,
    BADI,
    MEDI,
    PREDI,
}

enum Fonocirkia {
    ANY,
    CIRKI,
    KAYI,
}

enum Fonavoze {
    ANY,
    AVOZI,
    KIRIKAVOZE,
    NOLAVOZI,
    NAFASI,
    TUHI,
}

enum Fonotone {
    ANY,
    TALI,
    MEDI,
    GAWI,
    ZAYO_TALI,
    ZAYO_GAWI,
}

enum Fononosia {
    ANY,
    NOSI,
    SAFI,
}

enum Fonoloke {
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

enum Fonoforme {
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

enum Fonolatia {
    ANY,
    JUNGI,
    LATI,
}


class Vokale {
    public gawia: Fonogawia;
    public predia: Fonopredia;
    public cirkia: Fonocirkia;
    public avoze: Fonavoze;

    constructor(gawia: Fonogawia, predia: Fonopredia, cirkia: Fonocirkia = Fonocirkia.ANY, avoze: Fonavoze = Fonavoze.ANY) {
        this.gawia = gawia;
        this.predia = predia;
        this.cirkia = cirkia;
        this.avoze = avoze;
    }
}


class Konsone {
    public loke: Fonoloke;
    public forme: Fonoforme;
    public latia: Fonolatia;
    public avoze: Fonavoze;

    constructor(loke: Fonoloke, forme: Fonoforme, latia: Fonolatia = Fonolatia.ANY, avoze: Fonavoze = Fonavoze.ANY) {
        this.loke = loke;
        this.forme = forme;
        this.latia = latia;
        this.avoze = avoze;
    }
}


const IPA_TABLE = [
    ['i', new Vokale(Fonogawia.GAWI, Fonopredia.PREDI, Fonocirkia.KAYI, Fonavoze.AVOZI)],
    ['y', new Vokale(Fonogawia.GAWI, Fonopredia.PREDI, Fonocirkia.CIRKI, Fonavoze.AVOZI)],
    ['ɯ', new Vokale(Fonogawia.GAWI, Fonopredia.BADI, Fonocirkia.KAYI, Fonavoze.AVOZI)],
    ['u', new Vokale(Fonogawia.GAWI, Fonopredia.BADI, Fonocirkia.CIRKI, Fonavoze.AVOZI)],
    ['e', new Vokale(Fonogawia.MEDOGAWI, Fonopredia.PREDI, Fonocirkia.KAYI, Fonavoze.AVOZI)],
    ['ø', new Vokale(Fonogawia.MEDOGAWI, Fonopredia.PREDI, Fonocirkia.CIRKI, Fonavoze.AVOZI)],
    ['ɤ', new Vokale(Fonogawia.MEDOGAWI, Fonopredia.BADI, Fonocirkia.KAYI, Fonavoze.AVOZI)],
    ['o', new Vokale(Fonogawia.MEDOGAWI, Fonopredia.BADI, Fonocirkia.CIRKI, Fonavoze.AVOZI)],
    ['a', new Vokale(Fonogawia.TALI, Fonopredia.MEDI, Fonocirkia.KAYI, Fonavoze.AVOZI)],
    ['m', new Konsone(Fonoloke.DULOLABI, Fonoforme.NOSI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ɱ', new Konsone(Fonoloke.LABODANTI, Fonoforme.NOSI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['n', new Konsone(Fonoloke.PIZOKULI, Fonoforme.NOSI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ɳ', new Konsone(Fonoloke.RETROKURBI, Fonoforme.NOSI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ɲ', new Konsone(Fonoloke.BOKOCATI, Fonoforme.NOSI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ŋ', new Konsone(Fonoloke.BOKOKOMALI, Fonoforme.NOSI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ɴ', new Konsone(Fonoloke.BOKOPENDI, Fonoforme.NOSI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['p', new Konsone(Fonoloke.DULOLABI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['b', new Konsone(Fonoloke.DULOLABI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['t', new Konsone(Fonoloke.PIZOKULI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['d', new Konsone(Fonoloke.PIZOKULI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ʈ', new Konsone(Fonoloke.RETROKURBI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ɖ', new Konsone(Fonoloke.RETROKURBI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['c', new Konsone(Fonoloke.BOKOCATI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ɟ', new Konsone(Fonoloke.BOKOCATI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['k', new Konsone(Fonoloke.BOKOKOMALI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ɡ', new Konsone(Fonoloke.BOKOKOMALI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['q', new Konsone(Fonoloke.BOKOPENDI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ɢ', new Konsone(Fonoloke.BOKOPENDI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ʡ', new Konsone(Fonoloke.SUPROMUNI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ʔ', new Konsone(Fonoloke.GALOMUNI, Fonoforme.TINGI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ɸ', new Konsone(Fonoloke.DULOLABI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['β', new Konsone(Fonoloke.DULOLABI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['f', new Konsone(Fonoloke.LABODANTI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['v', new Konsone(Fonoloke.LABODANTI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['θ', new Konsone(Fonoloke.DANTI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ð', new Konsone(Fonoloke.DANTI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['s', new Konsone(Fonoloke.PIZOKULI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['z', new Konsone(Fonoloke.PIZOKULI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ʃ', new Konsone(Fonoloke.BADOPIZI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ʒ', new Konsone(Fonoloke.BADOPIZI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ʂ', new Konsone(Fonoloke.RETROKURBI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ʐ', new Konsone(Fonoloke.RETROKURBI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ç', new Konsone(Fonoloke.BOKOCATI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ʝ', new Konsone(Fonoloke.BOKOCATI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['x', new Konsone(Fonoloke.BOKOKOMALI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ɣ', new Konsone(Fonoloke.BOKOKOMALI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['χ', new Konsone(Fonoloke.BOKOPENDI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ʁ', new Konsone(Fonoloke.BOKOPENDI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ħ', new Konsone(Fonoloke.SUPROMUNI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ʕ', new Konsone(Fonoloke.SUPROMUNI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['h', new Konsone(Fonoloke.GALOMUNI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.NOLAVOZI)],
    ['ɦ', new Konsone(Fonoloke.GALOMUNI, Fonoforme.FRIKI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ʋ', new Konsone(Fonoloke.LABODANTI, Fonoforme.KARIBI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ɹ', new Konsone(Fonoloke.PIZOKULI, Fonoforme.KARIBI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ɻ', new Konsone(Fonoloke.RETROKURBI, Fonoforme.KARIBI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['j', new Konsone(Fonoloke.BOKOCATI, Fonoforme.KARIBI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ɰ', new Konsone(Fonoloke.BOKOKOMALI, Fonoforme.KARIBI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ⱱ', new Konsone(Fonoloke.LABODANTI, Fonoforme.TOCI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ɾ', new Konsone(Fonoloke.PIZOKULI, Fonoforme.TOCI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ɽ', new Konsone(Fonoloke.RETROKURBI, Fonoforme.TOCI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ʙ', new Konsone(Fonoloke.DULOLABI, Fonoforme.DALALI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['r', new Konsone(Fonoloke.PIZOKULI, Fonoforme.DALALI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ʀ', new Konsone(Fonoloke.BOKOPENDI, Fonoforme.DALALI, Fonolatia.JUNGI, Fonavoze.AVOZI)],
    ['ɬ', new Konsone(Fonoloke.PIZOKULI, Fonoforme.FRIKI, Fonolatia.LATI, Fonavoze.NOLAVOZI)],
    ['ɮ', new Konsone(Fonoloke.PIZOKULI, Fonoforme.FRIKI, Fonolatia.LATI, Fonavoze.AVOZI)],
    ['l', new Konsone(Fonoloke.PIZOKULI, Fonoforme.KARIBI, Fonolatia.LATI, Fonavoze.AVOZI)],
    ['ɭ', new Konsone(Fonoloke.RETROKURBI, Fonoforme.KARIBI, Fonolatia.LATI, Fonavoze.AVOZI)],
    ['ʎ', new Konsone(Fonoloke.BOKOCATI, Fonoforme.KARIBI, Fonolatia.LATI, Fonavoze.AVOZI)],
    ['ʟ', new Konsone(Fonoloke.BOKOKOMALI, Fonoforme.KARIBI, Fonolatia.LATI, Fonavoze.AVOZI)],
    ['ɺ', new Konsone(Fonoloke.PIZOKULI, Fonoforme.TOCI, Fonolatia.LATI, Fonavoze.AVOZI)],
]; // TODO move this to a data file and make it a Map


/**
 * get a phoneme array from its IPA representation
 * @param ipa the characters to put in the lookup table
 */
function ipa(ipa: string): (Vokale | Konsone)[] {
    const output = [];
    for (let i = 0; i < ipa.length; i ++) { // TODO: parse affricates and diacritics
        for (const [char, foneme] of IPA_TABLE) {
            if (char === ipa[i]) { // look for a character that matches
                output.push(foneme);
                break;
            }
        }
        if (output.length <= i) // if nothing got added
            throw new Error(`did not recognize ${ipa[i]} as an IPA character`);
    }
    return output;
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
        else if (mold.gawia !== Fonogawia.ANY && mold.gawia !== foneme.gawia)
            return false;
        else if (mold.predia !== Fonopredia.ANY && mold.predia !== foneme.predia)
            return false;
        else if (mold.cirkia !== Fonocirkia.ANY && mold.cirkia !== foneme.cirkia)
            return false;
        else if (mold.avoze !== Fonavoze.ANY && mold.avoze !== foneme.avoze)
            return false;
        return true;
    }
    else {
        if (!(mold instanceof Konsone))
            return false;
        else if (mold.loke !== Fonoloke.ANY && mold.loke !== foneme.loke)
            return false;
        else if (mold.forme !== Fonoforme.ANY && mold.forme !== foneme.forme)
            return false;
        else if (mold.latia !== Fonolatia.ANY && mold.latia !== foneme.latia)
            return false;
        else if (mold.avoze !== Fonavoze.ANY && mold.avoze !== foneme.avoze)
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
        const gawia = (mold.gawia !== Fonogawia.ANY) ? mold.gawia : foneme.gawia;
        const predia = (mold.predia !== Fonopredia.ANY) ? mold.predia : foneme.predia;
        const cirkia = (mold.cirkia !== Fonocirkia.ANY) ? mold.cirkia : foneme.cirkia;
        const avoze = (mold.avoze !== Fonavoze.ANY) ? mold.avoze : foneme.avoze;
        return new Vokale(gawia, predia, cirkia, avoze);
    }
    else {
        if (!(mold instanceof Konsone))
            throw new TypeError("Cannot cast a consonant to a vowel.");
        const loke = (mold.loke !== Fonoloke.ANY) ? mold.loke : foneme.loke;
        const forme = (mold.forme !== Fonoforme.ANY) ? mold.forme : foneme.forme;
        const latia = (mold.latia !== Fonolatia.ANY) ? mold.latia : foneme.latia;
        const avoze = (mold.avoze !== Fonavoze.ANY) ? mold.avoze : foneme.avoze;
        return new Konsone(loke, forme, latia, avoze);
    }
}


const CHANGE_OPTIONS = [
    {ca: ipa("u"), pa: ipa("y")},
    {ca: ipa("y"), pa: ipa("u")},
    {ca: [new Konsone(Fonoloke.PIZOKULI, 0), new Vokale(0, Fonopredia.PREDI)], pa:[new Konsone(Fonoloke.BOKOCATI, 0), new Vokale(0, Fonopredia.PREDI)]}
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
        const nov = [];
        while (nov.length < old.length) {
            const i = nov.length;
            let match = true; // check if the current point in old matches this.ca
            for (let j = 0; j < this.ca.length; j ++) {
                if (i + j >= old.length || !fits(old[i + j], this.ca[j])) { // by comparing each segment individually
                    match = false;
                    break;
                }
            }
            if (match) // if it does,
                for (let j = 0; j < this.ca.length; j ++)
                    nov.push(fit(old[i+j], this.pa[j])); // add this.pa to nov
            else // otherwise
                nov.push(old[i]); // just add the next character of old
        }
        return nov;
    }
}


export interface Language {
    getWord(i: number): (Vokale | Konsone)[]
}

export class ProtoLanguage {
    private static initialPhonemes = ipa("iiuueeooaamnŋpbtdkɡʔfθszʃxʋrjl");
    private readonly leksoliste: (Vokale | Konsone)[][];

    constructor(rng: Random) {
        this.leksoliste = [];
        for (let i = 0; i < 1000; i ++) {
            let lekse = [];
            for (let j = 0; j < 6; j ++)
                lekse.push(rng.choice(ProtoLanguage.initialPhonemes));
            this.leksoliste.push(lekse);
        }
    }

    getWord(i) {
        return this.leksoliste[i];
    }
}

export class DeuteroLanguage {
    private readonly parent: Language;
    private readonly changes: SoundChange[];

    constructor(parent: Language, rng: Random) {
        this.parent = parent;
        this.changes = [];
        for (let i = 0; i < 6; i ++)
            this.changes.push(new SoundChange(rng));
    }

    getWord(i) {
        let lekse = this.parent.getWord(i);
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
    for (const f of lekse) {
        for (const [grafeme, foneme] of IPA_TABLE) {
            if (f === foneme) {
                output += grafeme;
                break;
            }
        }
    }
    return output;
}
