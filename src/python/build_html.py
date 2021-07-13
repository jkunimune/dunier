import json
import os
import re

LANGUAGES = ['en', 'es', 'jp', 'pd']
DEFAULT_LANGUAGE = 'pd'

for filename in os.listdir('../../res/templates/'):
	print(f"{filename}")
	for lang_code in LANGUAGES:
		print(f"  {lang_code}")
		with open(f'../../res/templates/{filename}', 'r', encoding='utf8') as page_file:
			page = page_file.read()
		with open(f'../../res/tarje/{lang_code}.json', 'r', encoding='utf8') as lang_file:
			lang = json.load(lang_file)
		for key, value in lang.items():
			page = page.replace(f'{{{{{key}}}}}', value)
		remaining_keys = re.search(r'\{\{([a-z-.]+)\}\}', page)
		if remaining_keys:
			raise KeyError(f"no jana cabe {remaining_keys.group(1)}!")
		page = re.sub(r'\{\{.*\}\}', "MISSINGNO", page)
		with open(f'../../bash/{lang_code}/{filename}', 'w', encoding='utf8') as page_file:
			page_file.write(page)
		if lang_code == DEFAULT_LANGUAGE:
			with open(f'../../{filename}', 'w', encoding='utf8') as page_file:
				page_file.write(page)

print("fini!")
