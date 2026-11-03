/**
 * OneDrive "isteğe bağlı" / ReparsePoint dosyalarını gerçek dosyaya çevirir.
 * Gradle "Cannot snapshot ... not a regular file" hatasını giderir.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCOPES = [
  path.join(ROOT, "node_modules", "@capacitor"),
  path.join(ROOT, "node_modules", "@capacitor-community"),
  path.join(ROOT, "android", "app", "src"),
  path.join(ROOT, "android", "capacitor-cordova-android-plugins", "src"),
];

function materializeFile(filePath) {
  const buf = fs.readFileSync(filePath);
  fs.writeFileSync(filePath, buf);
}

let count = 0;

/** Gradle snapshot için yalnızca Android asset klasörleri yeterli. */
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    let st;
    try { st = fs.lstatSync(p); } catch { continue; }
    if (st.isDirectory()) {
      walk(p);
      continue;
    }
    if (!st.isFile() || st.isSymbolicLink()) continue;
    const norm = p.replace(/\\/g, "/").toLowerCase();
    const rootNorm = ROOT.replace(/\\/g, "/").toLowerCase();
    if (!norm.startsWith(rootNorm)) continue;
    try {
      materializeFile(p);
      count++;
    } catch (e) {
      console.warn("materialize-node-modules: atlandı", p, e.message);
    }
  }
}

for (const scope of SCOPES) walk(scope);
console.log(`materialize-node-modules: ${count} dosya yerel kopya olarak yazıldı.`);
