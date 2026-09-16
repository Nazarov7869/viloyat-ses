"""
Veb-blanka shablonlari ro'yxati (kalit -> nom).

Ro'yxat `tools/blanks/build_blanks.py` tomonidan `blank_templates.json` ga
yoziladi; shablonlarning o'zi frontend/public/blanks/ da turadi.
"""

import json
from functools import lru_cache
from pathlib import Path

GENERIC_KEY = ''
GENERIC_TITLE = "Umumiy (standart) xulosa blankasi"


@lru_cache(maxsize=1)
def blank_templates():
    path = Path(__file__).with_name('blank_templates.json')
    try:
        items = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        items = []
    return [(item['key'], item['title']) for item in items]


def template_choices():
    return [(GENERIC_KEY, GENERIC_TITLE)] + blank_templates()


def is_valid_template(key):
    return key == GENERIC_KEY or any(k == key for k, _ in blank_templates())
