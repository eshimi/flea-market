# サイトのQRコード（フッター用）を作る。URL を変えたら、この引数で作り直す
# 使い方：python3 tools/qr/make_qr.py https://example.jp/ static/img/qr.svg
import sys
import segno

url, out = sys.argv[1], sys.argv[2]
segno.make(url, error='m').save(out, scale=8, border=2, dark='#292B28', light='#ffffff')
print('wrote', out, 'for', url)
