/**
 * Android derleme öncesi: bozuk asset önbelleğini temizler (mergeDebugAssets snapshot hataları).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ANDROID = path.join(ROOT, "android");

function rmDirSafe(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("android-clean-build: silindi ->", path.relative(ROOT, dir));
}

const targets = [
  path.join(ANDROID, "app", "build"),
  path.join(ANDROID, "build"),
  path.join(ANDROID, ".gradle", "8.0.2", "fileHashes"),
];

for (const t of targets) rmDirSafe(t);
console.log("android-clean-build: tamam.");
