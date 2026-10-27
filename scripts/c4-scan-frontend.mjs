#!/usr/bin/env node
/**
 * Scanner frontend Livora → c4-frontend.json  (read-only, tanpa dependensi, Node 18+)
 *
 * Membaca src/App.tsx (React Router, termasuk <Route> bersarang & <RequireRole>) lalu,
 * untuk tiap halaman, mencari panggilan API (api.get/post/put/patch/delete, fetch) di berkas
 * halaman dan komponen lokal yang ia impor (1 tingkat).
 *
 *   node scripts/c4-scan-frontend.mjs                       # tulis c4-frontend.json
 *   node scripts/c4-scan-frontend.mjs --src=src --out=c4-frontend.json --app=src/App.tsx
 *   node scripts/c4-scan-frontend.mjs --post=https://api.livoralcr.com/api/c4/ingest/frontend --token=$C4_INGEST_TOKEN
 *
 * Hasil diunggah lewat C4 → tab Sinkronisasi → "Unggah hasil scan", atau dikirim dari CI dengan --post.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, relative, resolve, sep } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => { const [k, ...v] = a.slice(2).split("="); return [k, v.join("=") || "true"]; }),
);
const SRC = resolve(args.src ?? "src");
const APP = resolve(args.app ?? join(SRC, "App.tsx"));
const OUT = args.out ?? "c4-frontend.json";
if (!existsSync(APP)) { console.error(`App.tsx tidak ditemukan di ${APP}. Jalankan dari root repo frontend atau pakai --src= / --app=`); process.exit(1); }

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const EXT = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];
const rel = (f) => relative(SRC, f).split(sep).join("/");
const cache = new Map();
const readSrc = (f) => { if (!cache.has(f)) cache.set(f, strip(readFileSync(f, "utf8"))); return cache.get(f); };

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null;
  for (const e of EXT) { const p = normalize(base + e); if (existsSync(p) && /\.(tsx?|jsx?)$/.test(p)) return p; }
  return null;
}

// ── 1) peta komponen → berkas (import biasa & lazy) ──
const app = readSrc(APP);
const comp = new Map();
for (const m of app.matchAll(/(?:const|let)\s+(\w+)\s*=\s*\w*lazy\w*\s*\(\s*\(\)\s*=>\s*import\(\s*["'`]([^"'`]+)["'`]/g)) comp.set(m[1], resolveImport(APP, m[2]));
for (const m of app.matchAll(/import\s+(\w+)\s*(?:,\s*\{[^}]*\})?\s*from\s*["']([^"']+)["']/g)) comp.set(m[1], resolveImport(APP, m[2]));
for (const m of app.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) for (const n of m[1].split(",")) { const name = n.trim().split(/\s+as\s+/).pop(); if (name && !comp.has(name)) comp.set(name, resolveImport(APP, m[2])); }

// ── 2) pohon <Route> bersarang ──
// tokenizer <Route …> yang paham kurung kurawal (element={<X />} mengandung ">")
function* routeTags(src) {
  const re = /<(\/?)Route\b/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1]) { const end = src.indexOf(">", m.index); yield { closing: true }; re.lastIndex = end + 1; continue; }
    let i = re.lastIndex, depth = 0, q = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (q) { if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === "`") q = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    const attrs = src.slice(re.lastIndex, i);
    yield { closing: false, attrs: attrs.replace(/\/\s*$/, ""), self: /\/\s*$/.test(attrs) };
    re.lastIndex = i + 1;
  }
}
const attr = (s, n) => { const m = s.match(new RegExp(`\\b${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*["'\`]([^"'\`]*)["'\`]\\s*\\})`)); return m ? (m[1] ?? m[2] ?? m[3]) : null; };
const stack = [];
const routes = [];
for (const t of routeTags(app)) {
  if (t.closing) { stack.pop(); continue; }
  const attrs = t.attrs;
  const path = attr(attrs, "path");
  const isIndex = /(^|\s)index(\s|$)/.test(attrs);
  const parentPath = [...stack].reverse().find((s) => s.full !== undefined)?.full ?? "";
  const full = path != null ? (path.startsWith("/") ? path : `${parentPath}/${path}`.replace(/\/+/g, "/")) : isIndex ? parentPath || "/" : parentPath;
  const el = attrs.match(/element\s*=\s*\{\s*<(\w+)([\s\S]*)\}\s*$/);
  const elName = el?.[1];
  const ownGuard = elName === "RequireRole" ? `role:${(attrs.match(/roles\s*=\s*\{\s*\[([^\]]*)\]/)?.[1] ?? "").replace(/["'\s]/g, "") || "?"}` : null;
  const parentGuard = [...stack].reverse().find((s) => s.guard)?.guard ?? null;
  const guard = ownGuard ?? parentGuard ?? (full.startsWith("/admin") ? "admin" : "public");
  if (!t.self) stack.push({ full: path != null || isIndex ? full : undefined, guard: ownGuard ?? parentGuard });
  if (elName && (path != null || isIndex) && elName !== "RequireRole" && !/Layout$|Shell$/.test(elName)) routes.push({ route: full || "/", component: elName, guard });
}

// ── 3) panggilan API ──
const API_RE = /\b(?:api|axios|http)\s*\.\s*(get|post|put|patch|delete)\s*(?:<[^>]*>)?\s*\(\s*(["'`])((?:(?!\2)[^\\]|\\.)*)\2/g;
const FETCH_RE = /\bfetch\s*\(\s*(["'`])((?:(?!\1)[^\\]|\\.)*)\1(?:\s*,\s*\{[^}]*?method\s*:\s*["'](\w+)["'])?/g;
const clean = (u) => u.replace(/\$\{[^}]*\}/g, "{param}").replace(/^https?:\/\/[^/]+/, "").replace(/\?.*$/, "").replace(/^\/?api(?=\/)/, "").replace(/\/+$/, "") || "/";

function callsIn(text) {
  const out = [];
  for (const m of text.matchAll(API_RE)) out.push({ method: m[1].toUpperCase(), path: clean(m[3]) });
  for (const m of text.matchAll(FETCH_RE)) if (/^(\/|https?:)/.test(m[2])) out.push({ method: (m[3] ?? "GET").toUpperCase(), path: clean(m[2]) });
  return out;
}

/** Potong isi `export const|function NAME …` sampai export top-level berikutnya. */
function exportSlice(text, name) {
  const re = new RegExp(`(^|\\n)export\\s+(?:default\\s+)?(?:async\\s+)?(?:const|let|function|class)\\s+${name}\\b`);
  const m = re.exec(text);
  if (!m) return "";
  const next = text.slice(m.index + m[0].length).search(/\nexport\s/);
  return next < 0 ? text.slice(m.index) : text.slice(m.index, m.index + m[0].length + next);
}

/** Impor lokal sebuah berkas: untuk modul lib/ hanya blok yang benar-benar diimpor. */
function importsOf(file) {
  const s = readSrc(file);
  const out = [];
  for (const m of s.matchAll(/import\s+(?:type\s+)?(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*["']((?:@\/|\.)[^"']+)["']/g)) {
    const target = resolveImport(file, m[3]);
    if (!target || target === file || /[\\/](ui|types|i18n)[\\/]/.test(target)) continue;
    const names = (m[2] ?? "").split(",").map((n) => n.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]).filter(Boolean);
    if (m[1]) names.push(m[1]);
    out.push({ target, names });
  }
  return out;
}

function callsOfPage(file) {
  const uniq = new Map();
  const visited = new Set();
  const add = (list) => { for (const c of list) uniq.set(`${c.method} ${c.path}`, c); };
  // names=null → seluruh berkas; names=[…] → hanya blok export bernama (modul lib/)
  const visit = (f, names, depth) => {
    const id = `${f}:${names ? names.join(",") : "*"}`;
    if (visited.has(id) || depth > 4) return;
    visited.add(id);
    const text = names ? names.map((n) => exportSlice(readSrc(f), n)).join("\n") : readSrc(f);
    add(callsIn(text));
    for (const imp of importsOf(f).slice(0, 60)) {
      const isLib = /[\\/]lib[\\/]/.test(imp.target);
      if (names) {
        const used = imp.names.filter((n) => new RegExp(`\\b${n}\\b`).test(text));
        if (used.length) visit(imp.target, isLib ? used : null, depth + 1);
      } else {
        visit(imp.target, isLib && imp.names.length ? imp.names : null, depth + 1);
      }
    }
  };
  visit(file, null, 0);
  return [...uniq.values()];
}

const pages = [];
const seen = new Set();
for (const r of routes) {
  if (seen.has(r.route)) continue;
  seen.add(r.route);
  const file = comp.get(r.component);
  pages.push({ route: r.route, name: r.component, file: file ? rel(file) : "", guard: r.guard, api: file ? callsOfPage(file) : [] });
}

const payload = { generated_at: new Date().toISOString(), source: rel(APP), pages };
writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log(`✔ ${pages.length} halaman, ${pages.reduce((n, p) => n + p.api.length, 0)} panggilan API → ${OUT}`);

if (args.post) {
  const token = args.token ?? process.env.C4_INGEST_TOKEN;
  if (!token) { console.error("Butuh --token=... atau env C4_INGEST_TOKEN"); process.exit(1); }
  const res = await fetch(args.post, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "X-C4-Token": token }, body: JSON.stringify(payload) });
  const txt = await res.text();
  console.log(res.ok ? "✔ terkirim ke C4" : `✘ gagal (${res.status})`, txt.slice(0, 300));
  if (!res.ok) process.exit(1);
}
