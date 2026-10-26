# 表示サイズに合わせた小さい画像（srcset 用）を作る。元の画像は変えない。画像を差し替えたら、もう一度実行する。
#   hero*.webp → -800・-1400（スマホ・PC）、kinds/*.webp → -400（カードは約280px）、about.webp → -450
import glob, os
from PIL import Image
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'static', 'img')
import re
VAR = re.compile(r'-(800|1400|400|450)\.webp$')
JOBS = [(f, [800, 1400], 74) for f in sorted(glob.glob(R + '/hero*.webp')) if not VAR.search(f)]
JOBS += [(f, [400], 72) for f in sorted(glob.glob(R + '/kinds/*.webp')) if not VAR.search(f) and not f[:-5].endswith('-t')]
JOBS += [(R + '/about.webp', [450], 72)]
for src, widths, q in JOBS:
    im = Image.open(src).convert('RGB')
    for w in widths:
        if w >= im.width: continue
        out = f'{src[:-5]}-{w}.webp'
        im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(out, quality=q, method=6)
        print(os.path.relpath(out, R), os.path.getsize(out) // 1024, 'KB')
