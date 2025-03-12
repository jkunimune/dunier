"""
This work by Justin Kunimune is marked with CC0 1.0 Universal.
To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
"""
import json
import os
import re

LANGUAGES = ['en', 'es', 'ja', 'pd']
DEFAULT_LANGUAGE = 'pd'


def build_html():
	# load the version number
	with open(f'../../package.json', 'r', encoding='utf8') as package_file:
		package = json.loads(package_file.read())
		version = package["version"]

	# load the base
	with open(f'../../templates/base.html', 'r', encoding='utf8') as base_file:
		base = base_file.read()

	# iterate thru all non-base templates in the folder
	for filename in os.listdir('../../templates/'):
		if filename == "base.html" or not filename.endswith(".html"):
			continue
		filename = filename[:-5]
		print(f"{filename}")

		# load the template and insert it into the base
		with open(f'../../templates/{filename}.html', 'r', encoding='utf8') as page_file:
			template = base.replace('{Content}', page_file.read())

		# iterate thru the languages
		for lang_code in LANGUAGES:
			print(f"  {lang_code}")

			page = template

			page = replace_keys(page, lang_code, filename, version)

			page = resolve_if_statements(page)

			page = resolve_build_commands(page)

			save_page(page, lang_code, filename)

	print("fini!")


def replace_keys(page: str, lang_code: str, filename: str, version: str) -> str:
	# replace the special keys
	page = page.replace(f'{{.name}}', filename)
	page = page.replace(f'{{.version}}', version)

	# replace the basic keys
	with open(f'../../resources/translations/{lang_code}.ts', 'r', encoding='utf8') as lang_file:
		lang = json.loads(lang_file.read()[15:-2])
	for key, value in lang.items():
		page = page.replace(f'{{{key}}}', value)
	remaining_keys = re.search(r'[^$]{([a-z.][a-zA-Z0-9-._]+)}', page)
	if remaining_keys:
		raise KeyError(f"no jana cabe '{remaining_keys.group(1)}'!")

	return page


def resolve_if_statements(page: str) -> str:
	# resolve any if-statements
	for if_statement in reversed(list(re.finditer(fr'{{If ([^ }}]*) ([^ }}]*)}}([^}}]*){{EndIf}}', page))):
		a, b, body = if_statement.groups()
		if a == b:
			page = page[:if_statement.start()] + body + page[if_statement.end():]
		else:
			page = page[:if_statement.start()] + page[if_statement.end():]
	remaining_if_statements = re.search(fr'{{If([^}}]*)', page)
	if remaining_if_statements:
		raise ValueError(f"could not parse the if-statement {remaining_if_statements.group()}")
	return page


def resolve_build_commands(page: str) -> str:
	# resolve any calls to the build command
	for call in reversed(list(re.finditer(fr'{{Build ([^}}]*)}}', page))):
		arguments = {}
		for key_value_pair in call.group(1).split(" "):
			parsing = re.fullmatch(r'([a-z-]+)="([^"]*)"', key_value_pair)
			if parsing is None:
				raise ValueError(f"could not parse the key-value pair string '{key_value_pair}'")
			else:
				key, value = parsing.groups()
				arguments[key] = value

		if arguments["type"] == "spinner":
			content = build_fancy_input_spinner(
				identifier=arguments["id"],
				value=float(arguments["value"]),
				minimum=float(arguments["min"]),
				maximum=float(arguments["max"]),
				step=float(arguments["step"]),
				decimals=int(arguments.get("decimals", "0")),
				suffix=arguments.get("suffix", ""),
			)
		else:
			raise ValueError(f'unrecognized build type: "{arguments["type"]}"')

		page = page[:call.start()] + content + page[call.end():]
	return page


def save_page(page: str, lang_code: str, filename: str):
	# save the result
	os.makedirs(f"../../{lang_code}/", exist_ok=True)
	with open(f'../../{lang_code}/{filename}.html', 'w', encoding='utf8') as page_file:
		page_file.write(page)
	if lang_code == DEFAULT_LANGUAGE:
		with open(f'../../{filename}.html', 'w', encoding='utf8') as page_file:
			page_file.write(page)


def build_fancy_input_spinner(
		identifier: str, value: float,
		minimum: float, maximum: float, step: float,
		decimals=0, prefix="", suffix="") -> str:
	return (
		'<div class="input-group fancy-spinner">\n' +
		'  <div class="input-group-prepend">\n' +
		'    <button style="min-width:2.5rem" class="btn btn-decrement btn-outline-secondary" type="button">\n' +
		'      <strong>&minus;</strong>\n' +
		'    </button>\n' +
		(f'    <span class="input-group-text">{prefix}</span>\n' if prefix else '') +
		'  </div>\n' +
		'  <input type="number" inputmode="decimal" style="text-align:center" class="form-control" ' +
		f'id="{identifier}" value="{value}" data-decimals="{decimals}" min="{minimum}" max="{maximum}" step="{step}"/>\n' +
		'  <div class="input-group-append">' +
		(f'    <span class="input-group-text">{suffix}</span>\n' if suffix else '') +
		'    <button style="min-width:2.5rem" class="btn btn-increment btn-outline-secondary" type="button">\n' +
		'      <strong>&plus;</strong>\n' +
		'    </button>\n' +
		'  </div>\n' +
		'</div>'
	)


if __name__ == "__main__":
	build_html()
