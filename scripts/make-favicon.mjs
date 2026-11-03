/**
 * Build transparent, icon-only favicon (no text, larger mark).
 */
import sharp from "sharp";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const sources = [
  join(
    root,
    "..",
    ".cursor",
    "projects",
    "c-Users-PC-Desktop-yv",
    "assets",
    "c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_ChatGPT_Image_13_May_2026_19_34_50-63fb643a-cac6-4c1d-9a11-ca7fcd9e2ef7.png"
  ),
  join(
    "C:",
    "Users",
    "PC",
    ".cursor",
    "projects",
    "c-Users-PC-Desktop-yv",
    "assets",
    "c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_ChatGPT_Image_13_May_2026_19_34_50-63fb643a-cac6-4c1d-9a11-ca7fcd9e2ef7.png"
  ),
  join(root, "public", "favicon-source.png"),
];

const srcPath = sources.find((p) => existsSync(p));
if (!srcPath) {
  console.error("Source logo not found. Place PNG at public/favicon-source.png");
  process.exit(1);
}

const BLACK_THRESH = 42;

function removeBlackBg(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r <= BLACK_THRESH && g <= BLACK_THRESH && b <= BLACK_THRESH) {
      data[i + 3] = 0;
    }
  }
  return data;
}

function tintOrangeToEcafeYellow(data) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    if (d < 0.08 || max < 0.18) continue;
    let h = 0;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
    const s = d / (1 - Math.abs(2 * ((max + min) / 2) - 1));
    if (s < 0.32 || h < 8 || h > 48) continue;
    data[i] = Math.round(255 * max);
    data[i + 1] = Math.round(212 * max);
    data[i + 2] = 0;
  }
  return data;
}

async function buildIconRegion() {
  const meta = await sharp(srcPath).metadata();
  const w = meta.width;
  const h = meta.height;
  // Logo mark only (exclude "lperson" wordmark at bottom)
  const iconH = Math.round(h * 0.58);

  const { data, info } = await sharp(srcPath)
    .extract({ left: 0, top: 0, width: w, height: iconH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  removeBlackBg(data);
  tintOrangeToEcafeYellow(data);

  const trimmed = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 1 })
    .png()
    .toBuffer();

  return sharp(trimmed);
}

async function writeFavicon(size, outPath, paddingRatio = 0.03) {
  const icon = await buildIconRegion();
  const meta = await icon.metadata();
  const pad = Math.max(1, Math.round(size * paddingRatio));
  const inner = size - pad * 2;

  await icon
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outPath);

  console.log(`Wrote ${outPath} (${size}x${size}) from ${meta.width}x${meta.height} trim`);
}

const publicDir = join(root, "public");
await writeFavicon(32, join(publicDir, "favicon-32.png"));
await writeFavicon(192, join(publicDir, "favicon.png"));
await writeFavicon(192, join(publicDir, "apple-touch-icon.png"));

console.log("Done:", srcPath);
