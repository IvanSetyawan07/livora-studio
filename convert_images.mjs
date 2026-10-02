import sharp from "sharp";
import fs from "fs";
import path from "path";

const ASSETS = "src/assets";
const PHOTO_W = 2560;
const PHOTO_Q = 88;
const ALPHA_W = 2800;
const ALPHA_Q = 90;
const IMG = /\.(png|jpe?g)$/i;
const CODE = /\.(tsx?|jsx?|css)$/i;

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const f = path.join(dir, e.name);
    return e.isDirectory() ? walk(f) : [f];
  });

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sources = walk(ASSETS).filter((f) => IMG.test(f)).sort();

// tentukan nama output, hindari tabrakan di folder yang sama
const used = new Set();
const plan = [];
for (const f of sources) {
  let out = f.replace(IMG, ".webp");
  if (used.has(out.toLowerCase())) {
    const ext = path.extname(f).slice(1).toLowerCase();
    out = f.replace(IMG, `-${ext}.webp`);
    console.log("nama bentrok, diberi akhiran:", f, "->", path.basename(out));
  }
  used.add(out.toLowerCase());
  plan.push({ f, out });
}

// peta nama lama -> nama baru (per nama file)
const rename = new Map();
let before = 0, after = 0;

for (const { f, out } of plan) {
  const meta = await sharp(f).metadata();
  const opts = meta.hasAlpha
    ? { quality: ALPHA_Q, alphaQuality: 100 }
    : { quality: PHOTO_Q };
  await sharp(f)
    .rotate()
    .resize({ width: meta.hasAlpha ? ALPHA_W : PHOTO_W, withoutEnlargement: true })
    .webp(opts)
    .toFile(out);
  const b = fs.statSync(f).size, a = fs.statSync(out).size;
  before += b; after += a;
  rename.set(path.basename(f), path.basename(out));
  console.log(`${path.relative(ASSETS, f)}: ${(b / 1048576).toFixed(1)} MB -> ${(a / 1024).toFixed(0)} KB`);
}
console.log(`\ngambar dikonversi: ${rename.size}`);
console.log(`total: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`);

let changed = 0;
for (const file of walk("src").filter((f) => CODE.test(f))) {
  const orig = fs.readFileSync(file, "utf8");
  let s = orig;
  for (const [oldName, newName] of rename) {
    const re = new RegExp("(?<=[/\"'`(])" + esc(oldName) + "(?=[\"'`?)])", "g");
    s = s.replace(re, newName);
  }
  if (s !== orig) {
    fs.writeFileSync(file, s);
    changed++;
    console.log("diubah:", file);
  }
}
console.log(`file kode yang diubah: ${changed}`);
