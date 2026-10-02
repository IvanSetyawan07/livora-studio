import sharp from "sharp";
import fs from "fs";
import path from "path";

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const f = path.join(dir, e.name);
    return e.isDirectory() ? walk(f) : [f];
  });

const files = walk("src")
  .filter((f) => /\.(png|jpe?g)$/i.test(f))
  .map((f) => ({ f, size: fs.statSync(f).size }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 10);

for (const { f, size } of files) {
  const m = await sharp(f).metadata();
  console.log(`${f}  ${m.width}x${m.height}  ${(size / 1048576).toFixed(1)} MB  alpha=${m.hasAlpha}`);
}