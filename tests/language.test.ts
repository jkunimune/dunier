/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */
import {
	DEFAULT_STRESS,
	Harmony,
	SoundChange, StressPlacement,
	Syllabicization,
	WORD_PROCESS_OPTIONS
} from "../source/language/process.js";
import {ipa, transcribe} from "../source/language/script.js";
import {Klas, Loke, Mode, Nosia, Quality, Silabia, Sound, Voze} from "../source/language/sound.js";
import {Random} from "../source/utilities/random.js";

describe("process", () => {
	describe("SoundChange", () => {
		test("context", () => {
			const change = new SoundChange(
				[new Klas([Quality.OBSTRUENT])],
				[new Klas([Voze.VOICED])],
				[0],
				[new Klas([Quality.VOCOID])],
				[new Klas([Quality.VOCOID])]);
			const word = ipa("tadalatat");
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("tadaladat");
		});
		test("referencing from preceding context", () => {
			const change = new SoundChange(
				[new Klas([Silabia.NONSYLLABIC])],
				[new Klas([], [], ["minorLoke"])],
				[0],
				[new Klas([Quality.VOWEL]), new Klas([Quality.CORONAL])], []);
			const word = ipa("uɫtw");
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("uɫtˠw");
		});
		test("referencing from following context", () => {
			const change = new SoundChange(
				[new Klas([Quality.OBSTRUENT])],
				[new Klas([], [], ["voze"])],
				[0],
				[], [new Klas([Quality.OBSTRUENT]), new Klas([Quality.VOWEL])]);
			const word = ipa("stɡa");
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("sdɡa");
		});
		test("referencing in pattern", () => {
			const change = new SoundChange(
				[new Klas([]), new Klas([])],
				[new Klas([], [], ["loke"]), new Klas([], [], ["loke"])],
				[0, 1],
				[], []);
			const word = ipa("ms");
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("nɸ");
		});
		test("metathesis", () => {
			const change = new SoundChange(
				[new Klas([]), new Klas([])],
				[new Klas([], [], ["loke"]), new Klas([], [], ["loke"])],
				[1, 0],
				[], []);
			const word = ipa("ms");
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("ɸn");
		});
	});
	test("Harmony", () => {
		const change = new Harmony("front", false);
		const word = ipa("uaiauai");
		const result = change.apply(word);
		expect(transcribe([result], "ipa")).toEqual("uaɯauaɯ");
	});
	describe("Syllabicization", () => {
		const word = ipa("jwtjtntwj");
		test("forward bias", () => {
			const change = new Syllabicization(+1, Mode.CLOSE.sonority);
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("jutitəntwi");
		});
		test("backward bias", () => {
			const change = new Syllabicization(0, Mode.CLOSE.sonority);
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("iutitəntui");
		});
		test("backward bias", () => {
			const change = new Syllabicization(-1, Mode.CLOSE.sonority);
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("iwtitəntuj");
		});
	});
	describe("StressPlacement", () => {
		const word = ipa("tatatatantatan");
		test("initial", () => {
			const change = new StressPlacement(
				false, 0, Infinity, "none", false);
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("tátatatantatan");
		});
		test("penultimate", () => {
			const change = new StressPlacement(
				true, 1, Infinity, "none", false);
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("tatatatantátan");
		});
		test("penultimate or last heavy", () => {
			const change = new StressPlacement(
				true, 1, 1, "none", false);
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("tatatatàntatán");
		});
		test("lapse", () => {
			const change = new StressPlacement(
				false, 0, 1, "lapse", false);
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("tátatatàntatàn");
		});
		test("clash", () => {
			const change = new StressPlacement(
				false, 0, 1, "clash", false);
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("tátatàtàntatàn");
		});
		test("lengthening", () => {
			const change = new StressPlacement(
				false, 0, 1, "clash", true);
			const result = change.apply(word);
			expect(transcribe([result], "ipa")).toEqual("táːtatàːtàntatàn");
		});
	});
});

describe("script", () => {
	const words = [ipa("ʃtaʀk"), ipa("ŋwijən"), ipa("jʊŋ")];
	words[0][0] = words[0][0].with(Nosia.NASALIZED).with(Mode.AFFRICATE);
	words[2][0] = words[2][0].with(Nosia.NASALIZED);
	words[2][1] = words[2][1].with(Nosia.NASALIZED);
	test("ipa", () => {
		expect(transcribe(words, "ipa")).toEqual("n͡t͡ʃtaʀk ŋwijən j̃ʊ̃ŋ");
	});
	test("en", () => {
		expect(transcribe(words, "en")).toEqual("Nchtark Ngweun Yung");
	});
	test("ja", () => {
		expect(transcribe(words, "ja")).toEqual("ンチタルク・グイヤン・ユング");
	});
	test("es", () => {
		expect(transcribe(words, "es")).toEqual("Nchtarc Nuiyen Yun");
	});
	test("ru", () => {
		expect(transcribe(words, "ru")).toEqual("Нчтарк-Нгвиян-Юнг");
	});
});

describe("sound", () => {
	describe("STOP", () => {
		test("stop", () => {
			expect(ipa("t")[0].is(Mode.STOP)).toEqual(true);
		});
		test("not a stop", () => {
			expect(ipa("s")[0].is(Mode.STOP)).toEqual(false);
		});
	});
	describe("BILABIAL", () => {
		test("bilabial", () => {
			expect(ipa("ɸ")[0].is(Loke.BILABIAL)).toEqual(true);
		});
		test("not bilabial", () => {
			expect(ipa("f")[0].is(Loke.BILABIAL)).toEqual(false);
		});
	});
	describe("CORONAL", () => {
		test("coronal", () => {
			expect(ipa("t")[0].is(Quality.CORONAL)).toEqual(true);
		});
		test("not coronal", () => {
			expect(ipa("c")[0].is(Quality.CORONAL)).toEqual(false);
		});
	});
	describe("NASAL", () => {
		test("actual nasal", () => {
			expect(ipa("n")[0].is(Quality.NASAL)).toEqual(true);
		});
		test("nasalized", () => {
			expect(ipa("t")[0].with(Nosia.NASALIZED).is(Quality.NASAL)).toEqual(true);
		});
		test("not nasal at all", () => {
			expect(ipa("t")[0].is(Quality.NASAL)).toEqual(false);
		});
	});
	describe("OBSTRUENT", () => {
		test("stop", () => {
			expect(ipa("t")[0].is(Quality.OBSTRUENT)).toEqual(true);
		});
		test("trill", () => {
			expect(ipa("r")[0].is(Quality.OBSTRUENT)).toEqual(false);
		});
		test("glide", () => {
			expect(ipa("j")[0].is(Quality.OBSTRUENT)).toEqual(false);
		});
	});
	describe("SIBILANT", () => {
		test("alveolar", () => {
			expect(ipa("s")[0].is(Quality.SIBILANT)).toEqual(true);
		});
		test("postalveolar", () => {
			expect(ipa("ʃ")[0].is(Quality.SIBILANT)).toEqual(true);
		});
		test("dental", () => {
			expect(ipa("θ")[0].is(Quality.SIBILANT)).toEqual(false);
		});
		test("lateral", () => {
			expect(ipa("ɬ")[0].is(Quality.SIBILANT)).toEqual(false);
		});
		test("stop", () => {
			expect(ipa("t")[0].is(Quality.SIBILANT)).toEqual(false);
		});
	});
	describe("GLIDE", () => {
		test("glide", () => {
			expect(ipa("j")[0].is(Quality.GLIDE)).toEqual(true);
		});
		test("vowel", () => {
			expect(ipa("i")[0].is(Quality.GLIDE)).toEqual(false);
		});
		test("syllabic approximant", () => {
			expect(ipa("ɹ")[0].with(Silabia.UNSTRESSED).is(Quality.GLIDE)).toEqual(false);
		});
	});
});

test("all together", () => {
	const rng = new Random(0);
	const phonemes = ipa("mnŋptkqʔbdɡfsxhzlrjwaiueoæɪʊɛɔyɯə");
	const DEFAULT_SYLLABIFICATION = new Syllabicization(0, -Infinity);
	for (let i = 0; i < 100; i ++) {
		let word: Sound[] = [];
		for (let i = 0; i < 10; i ++)
			word.push(rng.choice(phonemes));
		word = DEFAULT_STRESS.apply(DEFAULT_SYLLABIFICATION.apply(word));
		for (let j = 0; j < 1000; j ++) {
			const proces = rng.choice(WORD_PROCESS_OPTIONS).proces;
			word = proces.apply(word);
			let numPrimaryStresses = 0;
			for (let i = 0; i < word.length; i ++)
				if (word[i].silabia === Silabia.PRIMARY_STRESSED)
					numPrimaryStresses ++;
			if (numPrimaryStresses !== 1) {
				console.log(proces.toString());
				console.log(transcribe([word], "ipa"));
			}
			expect(numPrimaryStresses).toEqual(1);
			expect(() => transcribe([word], "ja")).not.toThrow();
		}
	}
});
