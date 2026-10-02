import re, sys, shutil

p = "src/App.tsx"
s = open(p, encoding="utf-8").read()
if "lazy(" in s:
    sys.exit("sudah lazy, batal")

pat = re.compile(
    r'^import\s+(\w+)\s+from\s+"([^"]*(?:/pages/admin/|/pages/sales/|/pages/ERD|/pages/Dashboard)[^"]*)";?[ \t]*(?://.*)?\r?$\n?',
    re.M,
)

lazy_lines = []

def grab(m):
    lazy_lines.append(f'const {m.group(1)} = lazy(() => import("{m.group(2)}"));')
    return ""

s = pat.sub(grab, s)
if not lazy_lines:
    sys.exit("tidak ada import yang cocok, batal (file tidak diubah)")
print(f"halaman dijadikan lazy: {len(lazy_lines)}")

assert s.count("<Routes>") == 1 and s.count("</Routes>") == 1, "struktur <Routes> tidak sesuai"
s = s.replace("<Routes>", "<Suspense fallback={null}>\n            <Routes>")
s = s.replace("</Routes>", "</Routes>\n            </Suspense>")

# sisipkan blok lazy setelah import terakhir
last = None
for last in re.finditer(r'^import\b[^;]*;[^\n]*\n', s, re.M):
    pass
assert last, "tidak ada import ditemukan"
s = s[: last.end()] + "\n" + "\n".join(lazy_lines) + "\n" + s[last.end():]

s = 'import { lazy, Suspense } from "react";\n' + s

shutil.copy(p, p + ".pre-lazy")
open(p, "w", encoding="utf-8").write(s)
print("selesai. backup: " + p + ".pre-lazy")