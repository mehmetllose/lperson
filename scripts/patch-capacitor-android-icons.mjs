/**
 * @capacitor/android bazı kurulumlarda bozuk adaptive-icon XML (yorum + <?xml sırası)
 * veya eksik @mipmap referansları içeriyor; bu script kütüphanedeki ikon kaynaklarını düzeltir.
 * postinstall ile çalışır — npm install sonrası tekrar uygulanır.
 */
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const res = join(root, "node_modules", "@capacitor", "android", "capacitor", "src", "main", "res");
const drawable = join(res, "drawable");
const mipmap = join(res, "mipmap-anydpi-v26");

if (!existsSync(join(root, "node_modules", "@capacitor", "android"))) {
  console.log("patch-capacitor-android-icons: @capacitor/android yok, atlanıyor.");
  process.exit(0);
}

mkdirSync(drawable, { recursive: true });
mkdirSync(mipmap, { recursive: true });

const bg = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#3F51B5"
        android:pathData="M0,0h108v108h-108z" />
</vector>
`;

const fg = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M54,34c-11,0 -20,9 -20,20 0,8 5,15 12,18v8h16v-8c7,-3 12,-10 12,-18 0,-11 -9,-20 -20,-20z" />
</vector>
`;

const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/capacitor_ic_launcher_background" />
    <foreground android:drawable="@drawable/capacitor_ic_launcher_foreground" />
</adaptive-icon>
`;

writeFileSync(join(drawable, "capacitor_ic_launcher_background.xml"), bg, "utf8");
writeFileSync(join(drawable, "capacitor_ic_launcher_foreground.xml"), fg, "utf8");
writeFileSync(join(mipmap, "ic_launcher.xml"), adaptive, "utf8");
writeFileSync(join(mipmap, "ic_launcher_round.xml"), adaptive, "utf8");

console.log("patch-capacitor-android-icons: Capacitor launcher XML düzeltildi.");
