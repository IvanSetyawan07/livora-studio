#!/bin/bash
set -e
cd ~/livora-repo

echo "=== Mencari semua referensi .asset.json ==="
grep -o '"\.\./\.\./assets/[^"]*\.asset\.json"' src/components/livora/ItemIllustration.tsx | tr -d '"' | sort -u > /tmp/asset_json_list.txt

cat /tmp/asset_json_list.txt

echo ""
echo "=== Memproses setiap file asset.json ==="

while IFS= read -r relpath; do
  fullpath="src/components/livora/$relpath"
  fullpath=$(realpath -m "$fullpath")

  if [ ! -f "$fullpath" ]; then
    echo "SKIP (file tidak ditemukan): $fullpath"
    continue
  fi

  urlpath=$(grep -o '"url"[[:space:]]*:[[:space:]]*"[^"]*"' "$fullpath" | sed -E 's/.*"url"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')

  if [ -z "$urlpath" ]; then
    echo "SKIP (url tidak ketemu di JSON): $fullpath"
    continue
  fi

  if [[ "$urlpath" == /* ]]; then
    url="https://fd9eb25d-25c2-4958-a392-093e19fb7149.lovableproject.com${urlpath}"
  else
    url="$urlpath"
  fi

  newimgpath="${fullpath%.asset.json}"

  echo "Downloading: $url"
  echo "  -> $newimgpath"
  curl -sL "$url" -o "$newimgpath"

  filetype=$(file -b --mime-type "$newimgpath")
  echo "  filetype: $filetype"

  if [[ "$filetype" != image/* ]]; then
    echo "  !! WARNING: hasil download BUKAN gambar (mungkin URL sudah mati). File ini akan dihapus."
    rm -f "$newimgpath"
  fi

done < /tmp/asset_json_list.txt

echo ""
echo "=== Selesai download. Sekarang patch ItemIllustration.tsx ==="

cp src/components/livora/ItemIllustration.tsx src/components/livora/ItemIllustration.tsx.bak

python3 << 'PYEOF'
import re

path = "src/components/livora/ItemIllustration.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(
    r'import\s+(\w+)__asset\s+from\s+"([^"]+)\.asset\.json";\s*\nconst\s+\1\s+=\s+\1__asset\.url;'
)

def repl(m):
    varname = m.group(1)
    imgpath = m.group(2)
    return f'import {varname} from "{imgpath}";'

new_content, count = pattern.subn(repl, content)
print(f"Jumlah baris import yang diganti: {count}")

with open(path, "w", encoding="utf-8") as f:
    f.write(new_content)
PYEOF

echo ""
echo "=== Cek sisa referensi .asset.json yang mungkin belum kepatch ==="
grep -n "asset.json" src/components/livora/ItemIllustration.tsx || echo "Tidak ada sisa referensi .asset.json — aman."

echo ""
echo "=== Build ==="
export GOMAXPROCS=1
npm run build

echo ""
echo "=== Copy ke public_html ==="
cp -r dist/* ~/domains/livoralcr.com/public_html/

echo ""
echo "=== SELESAI ==="
