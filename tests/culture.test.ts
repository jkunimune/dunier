/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import UNPARSED_KULTUR_ASPECTS from "../resources/culture.js";
import EN_STRINGS from "../resources/translations/en.js";
import ES_STRINGS from "../resources/translations/es.js";
import JA_STRINGS from "../resources/translations/ja.js";
import TECHNOLOGIES from "../resources/tech_tree.js";
import {format, formatList} from "../source/gui/internationalization.js";


const USER_STRING_SETS = [EN_STRINGS, ES_STRINGS, JA_STRINGS];
describe("culture.json", () => {
	describe("keys are all inatlized", () => {
		for (const aspect of UNPARSED_KULTUR_ASPECTS)
			for (const feature of aspect.features)
				for (const value of feature.values)
					for (const strings of USER_STRING_SETS)
						test(`${aspect.key}.${feature.key}.${value.key} in ${strings[".language"]}`, () => {
							expect(strings.hasOwnProperty(`factbook.${aspect.key}.${feature.key}.${value.key}`)).toBe(true);
						});
	});
	describe("condition classes are all defined", () => {
		const definedClasses = [
			"day_night_cycle", "four_seasons", "nation_state", "free",
			"coastal", "mountainous", "hot", "cold", "humid", "arid", "plains", "barren", "sandy"];
		for (const aspect of UNPARSED_KULTUR_ASPECTS) {
			for (const feature of aspect.features) {
				for (const value of feature.values) {
					const requiredClasses: string[] = [];
					for (const condition of value.conditions)
						if (condition.startsWith("+") || condition.startsWith("-"))
							requiredClasses.push(condition.slice(1));
					test(`${aspect.key}.${feature.key}.${value.key}`, () => {
						expect(definedClasses).toEqual(expect.arrayContaining(requiredClasses));
					});
					definedClasses.push(value.klas);
				}
			}
		}
	});
	test("classes are all used", () => {
		const definedClasses = new Set();
		const usedClasses = new Set();
		for (const aspect of UNPARSED_KULTUR_ASPECTS) {
			for (const feature of aspect.features) {
				for (const value of feature.values) {
					if (value.klas !== "none")
						definedClasses.add(value.klas);
					for (const condition of value.conditions)
						if (condition.startsWith("+") || condition.startsWith("-"))
							usedClasses.add(condition.slice(1));
				}
			}
		}
		expect([...usedClasses]).toEqual(expect.arrayContaining([...definedClasses]));
	});
});

describe("tech_tree.ts", () => {
	for (const technology of TECHNOLOGIES) {
		for (const strings of USER_STRING_SETS)
			test(`${technology.key} is inatlized in ${strings[".language"]}`, () => {
				expect(strings.hasOwnProperty(`factbook.tech.${technology.type}.${technology.key}`)).toBe(true);
			});
	}
});

describe("format", () => {
	describe("string", () => {
		test("grammatical agreement", () => {
			expect(format(
				"a(n) egg y/e a(n) ham y/e hielo. a (e)l(a) mapa pequeñ@. a (e)l(a) fuente pequeñ@. capas larg@s."
			)).toEqual(
				"an egg y a ham e hielo. al mapa pequeño. a la fuente pequeña. capas largas."
			);
		});
	});
	describe("number", () => {
		test("four digits", () => {
			expect(format("{0}", 1234)).toEqual("1234");
		});
		test("six digits", () => {
			expect(format("{0}", 123456)).toEqual("123 500");
		});
		test("five digits", () => {
			expect(format("{0}", 1234567)).toEqual("1 235 000");
		});
	});
	describe("list", () => {
		test("one item", () => {
			expect(formatList(["trustworthy"], "en")).toEqual(
				"trustworthy");
		});
		test("two items", () => {
			expect(formatList(["trustworthy", "loyal"], "en")).toEqual(
				"trustworthy and loyal");
		});
		test("three items", () => {
			expect(formatList(["trustworthy", "loyal", "helpful"], "en")).toEqual(
				"trustworthy, loyal, and helpful");
		});
		test("nested", () => {
			expect(formatList([
				formatList(["yi", "ar", "san"], "en"),
				formatList(["one", "two", "three"], "en"),
				formatList(["ichi", "ni", "san"], "en"),
			], "en")).toEqual(
				"yi, ar, and san; one, two, and three; and ichi, ni, and san");
		});
		test("nested (ja)", () => {
			expect(formatList([
				formatList(["壱", "弐", "参"], "ja"),
				formatList(["one", "two", "three"], "ja"),
				formatList(["1", "2", "3"], "ja"),
			], "ja")).toEqual(
				"壱、弐、参並びにone、two、three並びに1、2、3");
		});
	});
});
