# Шрифт «Totus Symbols» для приложения — те же знаки, что на сайте (totus_WEB, src/styles/globals.css):
#   ₽ — рисунок сайта под Museo Sans Cyrl (scripts/ruble-glyph.json), 300 / 500 / 700;
#   стрелки ← ↑ → ↓ ↖ ↗ ↘ ↙, дефисы U+2010 / U+2011, ¹ ² ³ — подмножество Golos Text 500 / 700
#   (src/assets/fonts/GolosSymbols-*.woff2, SIL OFL 1.1).
# На сайте шрифт подставляется через unicode-range; в React Native такого нет, поэтому знаки,
# которых нет в Museo и Forum, выделяет AppText / FontText (src/theme/fonts.ts → SYMBOLS_*).
#
# Файлы (как на сайте: ₽ 100–399 → 300, 400–599 → 500, 600+ → 700; Golos 100–599 → 500, 600+ → 700):
#   TotusSymbols-300.ttf = Golos 500 + ₽ 300
#   TotusSymbols-500.ttf = Golos 500 + ₽ 500
#   TotusSymbols-700.ttf = Golos 700 + ₽ 700
# Вертикальные метрики 770 / 226 / 0 — не больше, чем у Museo и Forum: строка со знаком не становится выше.
#
# Запуск: pip install fonttools brotli && python3 scripts/build-symbols-font.py <путь к totus_WEB>
# Пишет assets/fonts, ios/fonts, android/app/src/main/assets/fonts.
import base64, io, json, os, sys
from fontTools.ttLib import TTFont

WEB = sys.argv[1] if len(sys.argv) > 1 else '../totus_WEB'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIRS = ['assets/fonts', 'ios/fonts', 'android/app/src/main/assets/fonts']
BUILD = {'300': ('500', '300'), '500': ('500', '500'), '700': ('700', '700')}
ASC, DESC = 770, 226  # не больше минимума Museo 300–900 (771 / 226) и Forum (856 / 248)

ruble = json.load(open(os.path.join(WEB, 'scripts/ruble-glyph.json')))['weights']

for weight, (golos_w, ruble_w) in BUILD.items():
    f = TTFont(os.path.join(WEB, 'src/assets/fonts/GolosSymbols-%s.woff2' % golos_w))
    f.flavor = None
    for tag in ('GSUB', 'GPOS', 'STAT', 'vhea', 'vmtx'):
        if tag in f:
            del f[tag]

    # ₽: контур сайта вместо знака Golos (на сайте ₽ из Golos не используется)
    r = TTFont(io.BytesIO(base64.b64decode(ruble[ruble_w]['woff'])))
    name = f.getBestCmap()[0x20BD]
    glyph = r['glyf']['ruble']
    f['glyf'][name] = glyph
    glyph.recalcBounds(f['glyf'])
    f['hmtx'][name] = (r['hmtx']['ruble'][0], glyph.xMin)

    family = 'TotusSymbols-%s' % weight
    n = f['name']
    n.names = [x for x in n.names if x.nameID in (0,)]
    for nid, val in {
        1: family, 2: 'Regular', 3: '1.000;TOTUS;%s' % family, 4: family, 5: 'Version 1.000',
        6: family,
        13: 'This Font Software is licensed under the SIL Open Font License, Version 1.1. '
            'Arrows, hyphens and superscripts: Golos Text; ruble sign: Totus Club.',
        14: 'https://openfontlicense.org',
    }.items():
        n.setName(val, nid, 3, 1, 0x409)
        n.setName(val, nid, 1, 0, 0)

    hhea, os2, head = f['hhea'], f['OS/2'], f['head']
    hhea.ascent, hhea.descent, hhea.lineGap = ASC, -DESC, 0
    os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = ASC, -DESC, 0
    os2.usWinAscent, os2.usWinDescent = 951, 249  # как у Museo 500 — только для обрезки
    os2.usWeightClass = 400                       # как у файлов Museo: начертание задаёт файл
    os2.fsSelection = (os2.fsSelection & ~0b1100001) | 0b1000000  # Regular
    head.macStyle = 0

    for d in OUT_DIRS:
        p = os.path.join(ROOT, d, family + '.ttf')
        f.save(p)
    print(family, 'glyphs', len(f.getGlyphOrder()), 'chars', ' '.join('%04X' % c for c in sorted(f.getBestCmap())))
