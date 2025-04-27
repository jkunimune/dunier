/**
 * This work by Justin Kunimune is marked with CC0 1.0 Universal.
 * To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
 */

import UNPARSED_KULTUR_ASPECTS from "../resources/culture.js";
import EN_STRINGS from "../resources/translations/en.js";
import ES_STRINGS from "../resources/translations/es.js";
import JA_STRINGS from "../resources/translations/ja.js";
import PD_STRINGS from "../resources/translations/pd.js";
import TECHNOLOGIES from "../resources/tech_tree.js";


const USER_STRING_SETS = [EN_STRINGS, ES_STRINGS, JA_STRINGS, PD_STRINGS];
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
			"coastal", "mountainous", "hot", "cold", "humid", "dry", "plains", "barren", "sandy"];
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
