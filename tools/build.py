#!/usr/bin/env python3
"""Build index.html from src/. Stdlib only.

Usage:  python tools/build.py
Reads src/index.template.html + src/css/* + src/js/* + src/data/*,
reassembles the single-file index.html at repo root (byte-identical to the
original layout), and bumps BUILD in sw.js so clients fetch the new version.
"""
from pathlib import Path
import datetime
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'


def read(rel: str) -> str:
    return (SRC / rel).read_text(encoding='utf-8')


def main() -> None:
    template = read('index.template.html')

    # app.js carries placeholders for the raw JSON payloads
    app_js = read('js/app.js')
    if '__VDEF_JSON__' not in app_js or '__GD_JSON__' not in app_js or '__RD_JSON__' not in app_js or '__LD_JSON__' not in app_js:
        sys.exit('error: src/js/app.js is missing __VDEF_JSON__ / __GD_JSON__ / __RD_JSON__ / __LD_JSON__ placeholders')
    app_js = app_js.replace('__VDEF_JSON__', read('data/vocab.json'))
    app_js = app_js.replace('__GD_JSON__', read('data/grammar.json'))
    app_js = app_js.replace('__RD_JSON__', read('data/reading.json'))
    app_js = app_js.replace('__LD_JSON__', read('data/listening.json'))
    app_build = datetime.datetime.now().strftime('%Y%m%d%H%M')
    app_js = app_js.replace('__APP_BUILD__', app_build)

    blocks = {
        '<!--BUILD:BLOCK:CSS_MAIN-->': '<style>' + read('css/main.css') + '</style>',
        '<!--BUILD:BLOCK:CSS_THEME-->': '<style>' + read('css/theme.css') + '</style>',
        '<!--BUILD:BLOCK:JS_APP-->': '<script>' + app_js + '</script>',
    }
    out = template
    for marker, content in blocks.items():
        if marker not in out:
            sys.exit(f'error: marker {marker} not found in template')
        out = out.replace(marker, content)

    (ROOT / 'index.html').write_text(out, encoding='utf-8')

    # bump BUILD=YYYYMMDDHHMM in sw.js so the PWA cache refreshes
    sw = ROOT / 'sw.js'
    text = sw.read_text(encoding='utf-8')
    new_build = datetime.datetime.now().strftime('%Y%m%d%H%M')
    text2, n = re.subn(r"BUILD='\d+'", f"BUILD='{new_build}'", text, count=1)
    if n:
        sw.write_text(text2, encoding='utf-8')
        print(f'sw.js BUILD -> {new_build}')
    else:
        print('warning: BUILD pattern not found in sw.js')

    print(f'wrote index.html ({len(out.encode("utf-8"))} bytes)')


if __name__ == '__main__':
    main()
