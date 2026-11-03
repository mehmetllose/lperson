import { copyFileSync, mkdirSync, existsSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const destDir = join(root, "APK");
const dest = join(destDir, "app-debug.apk");

if (!existsSync(src)) {
  console.error("copy-debug-apk: kaynak yok:", src);
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
const n = statSync(dest).size;
console.log("copy-debug-apk:", dest, "(" + n + " bayt)");
