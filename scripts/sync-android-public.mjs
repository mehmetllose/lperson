/**
 * Tek kaynak: Desktop projesindeki public/index.html
 *
 * Eski sürüm Cursor aynasını Desktop'ın üzerine yazabiliyordu (boyut farkı
 * yeterli sayılıyordu). Artık yalnızca Desktop → Cursor yedek kopyası yapılır.
 * Geri yükleme için: LPERSON_SYNC_FROM_CURSOR=1 ortam değişkeni gerekir.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANONICAL = path.join(ROOT, "public", "index.html");

const CURSOR_CANDIDATES = [
  process.env.LPERSON_CURSOR_PUBLIC,
  path.join(process.env.USERPROFILE || "", ".cursor", "projects", "c-Users-Mehmet-Desktop-lperson", "public"),
  path.join(process.env.USERPROFILE || "", ".cursor", "projects", "c-Users-Mehmet-cursor-projects-c-Users-Mehmet-Desktop-lperson", "public"),
].filter(Boolean);

function resolveIndexPath(dirOrFile) {
  if (!dirOrFile) return null;
  const p = path.isAbsolute(dirOrFile) && dirOrFile.endsWith(".html")
    ? dirOrFile
    : path.join(dirOrFile, "index.html");
  if (!fs.existsSync(p)) return null;
  const st = fs.statSync(p);
  if (st.size < 500_000 || st.size > 5_000_000) return null;
  const head = fs.readFileSync(p, "utf8").slice(0, 120);
  if (!head.includes("<!DOCTYPE") && !head.includes("<html")) return null;
  return p;
}

function pickCursorIndex() {
  for (const dir of CURSOR_CANDIDATES) {
    const p = resolveIndexPath(dir);
    if (p) return p;
  }
  return null;
}

function copyIfDifferent(src, dst, label) {
  if (!fs.existsSync(src)) {
    console.log(`sync-android-public: kaynak yok (${label}): ${src}`);
    return false;
  }
  const srcStat = fs.statSync(src);
  const dstStat = fs.existsSync(dst) ? fs.statSync(dst) : null;
  const same = dstStat
    && srcStat.size === dstStat.size
    && Math.abs(srcStat.mtimeMs - dstStat.mtimeMs) < 500;
  if (same) return false;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log(`sync-android-public: ${label}`);
  console.log("  ", src);
  console.log("  ->", dst);
  return true;
}

const cursorIndex = pickCursorIndex();
const fromCursor = process.env.LPERSON_SYNC_FROM_CURSOR === "1";

if (!fs.existsSync(CANONICAL)) {
  if (cursorIndex && fromCursor) {
    copyIfDifferent(cursorIndex, CANONICAL, "Cursor → Desktop (LPERSON_SYNC_FROM_CURSOR=1)");
  } else {
    console.log("sync-android-public: public/index.html yok; mevcut dosya korunuyor.");
  }
  process.exit(0);
}

if (fromCursor && cursorIndex) {
  const cStat = fs.statSync(cursorIndex);
  const dStat = fs.statSync(CANONICAL);
  if (cStat.mtimeMs > dStat.mtimeMs + 2000 && cStat.size >= dStat.size) {
    copyIfDifferent(cursorIndex, CANONICAL, "Cursor → Desktop (açıkça istendi, Cursor daha yeni)");
  } else {
    console.log("sync-android-public: LPERSON_SYNC_FROM_CURSOR=1 ama Desktop daha güncel — üzerine yazılmadı.");
  }
} else if (cursorIndex) {
  copyIfDifferent(CANONICAL, cursorIndex, "Desktop → Cursor yedek");
} else {
  console.log("sync-android-public: Cursor aynası bulunamadı; Desktop public/ kullanılacak.");
}

console.log("sync-android-public: kaynak =", CANONICAL);
