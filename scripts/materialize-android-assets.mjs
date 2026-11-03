/**
 * OneDrive "Dosyalar İsteğe Bağlı" dosyalarını yerel diske indirir;
 * Gradle mergeDebugAssets snapshot hatasını azaltır.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS_PUBLIC = path.join(ROOT, "android", "app", "src", "main", "assets", "public");

function materializeFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const buf = fs.readFileSync(filePath);
  fs.writeFileSync(filePath, buf);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (st.isFile() && st.size > 0) materializeFile(p);
  }
}

if (!fs.existsSync(ASSETS_PUBLIC)) {
  console.log("materialize-android-assets: assets/public yok (önce cap sync çalıştırın).");
  process.exit(0);
}

const indexPath = path.join(ASSETS_PUBLIC, "index.html");
materializeFile(indexPath);
walk(ASSETS_PUBLIC);
console.log("materialize-android-assets: dosyalar yerel kopya olarak yazıldı.");
