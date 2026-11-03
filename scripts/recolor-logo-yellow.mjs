/**
 * Map orange brand pixels in logo assets to eCafe yellow (#ffd400).
 * Gray / black / white pixels stay as they are.
 */
import sharp from "sharp";
import { existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const TR = 255, TG = 212, TB = 0;

function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, v: max };
}

async function recolorFile(path) {
  if (!existsSync(path)) {
    console.warn("skip missing", path);
    return;
  }
  const img = sharp(path);
  const meta = await img.metadata();
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const { h, s, v } = hsv(r, g, b);
    if (s < 0.32 || v < 0.18) continue;
    if (h < 8 || h > 48) continue;
    data[i] = Math.round(TR * v);
    data[i + 1] = Math.round(TG * v);
    data[i + 2] = Math.round(TB * v);
    n++;
  }
  const out = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  const buf = (meta.format || "").toLowerCase() === "webp"
    ? await out.webp({ quality: 92 }).toBuffer()
    : await out.png().toBuffer();
  try {
    writeFileSync(path, buf);
  } catch (e) {
    const alt = path + ".yellow.bin";
    writeFileSync(alt, buf);
    console.warn(`locked, wrote ${alt}: ${e.message}`);
    return;
  }
  console.log(`${n} px  ${path}`);
}

const files = [
  join(root, "public", "favicon.png"),
  join(root, "public", "favicon-32.png"),
  join(root, "public", "apple-touch-icon.png"),
  join(root, "android", "app", "src", "main", "ic_launcher-playstore.png"),
  join(root, "android", "app", "src", "main", "res", "drawable-nodpi", "ic_notif_brand.png"),
  join(root, "android", "app", "src", "main", "res", "drawable-nodpi", "lperson_launcher.png"),
  join(root, "android", "app", "src", "main", "res", "drawable-nodpi", "lperson_splash_icon.png"),
];
const densities = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
const names = ["ic_launcher.webp", "ic_launcher_round.webp", "ic_launcher_foreground.webp"];
for (const d of densities) {
  for (const n of names) {
    files.push(join(root, "android", "app", "src", "main", "res", `mipmap-${d}`, n));
  }
}

for (const f of files) await recolorFile(f);
console.log("logo yellow recolor done");
