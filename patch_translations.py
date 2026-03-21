import re

updates = {
    "en": '"btn_plus10": "+10 SEC"',
    "tr": '"btn_plus10": "+10 SN"',
    "de": '"btn_plus10": "+10 SEK"',
    "ja": '"btn_plus10": "+10 秒"',
    "pt": '"btn_plus10": "+10 SEG"'
}

with open("src/lib/Translations.ts", "r") as f:
    content = f.read()

for lang, new_field in updates.items():
    lang_pattern = re.compile(rf"({lang}:\s*{{)")
    match = lang_pattern.search(content)
    if match:
        content = content.replace(match.group(0), f"{match.group(1)}\n    {new_field},")

with open("src/lib/Translations.ts", "w") as f:
    f.write(content)

