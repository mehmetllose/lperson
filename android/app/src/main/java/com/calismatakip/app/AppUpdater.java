package com.calismatakip.app;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** APK indirir; PackageInstaller ile kurar, olmazsa FileProvider / tarayici yedegi. */
public final class AppUpdater {
    private final Activity activity;
    private final WebView webView;
    private volatile boolean busy = false;
    private volatile long busySince = 0L;
    private volatile File pendingApk = null;
    private volatile String pendingVer = "";
    private PackageInstaller.SessionCallback installCb;

    public AppUpdater(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    @JavascriptInterface
    public String getVersionName() {
        try {
            PackageInfo pi = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
            return pi.versionName == null ? "" : pi.versionName;
        } catch (Exception e) { return ""; }
    }

    @JavascriptInterface
    public boolean isBusy() { return busy; }

    @JavascriptInterface
    public void openUrl(String url) {
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) return;
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(i);
        } catch (Exception e) {
            toast("Bağlantı açılamadı");
        }
    }

    @JavascriptInterface
    public void downloadAndInstall(String url) {
        downloadAndInstallVersion(url, "");
    }

    @JavascriptInterface
    public void downloadAndInstallVersion(String url, String ver) {
        if (url == null || !url.startsWith("https://")) {
            toast("Geçersiz indirme adresi");
            return;
        }
        if (busy) {
            if (System.currentTimeMillis() - busySince < 90_000L) {
                js("window.onAppUpdateProgress&&window.onAppUpdateProgress(-2)");
                return;
            }
            busy = false;
        }
        busy = true;
        busySince = System.currentTimeMillis();
        pendingApk = null;
        pendingVer = "";
        final String label = ver == null ? "" : ver.trim();
        js("window.onAppUpdateProgress&&window.onAppUpdateProgress(0)");
        new Thread(() -> {
            File dir = updateDir();
            File apk = new File(dir, "lperson-update.apk");
            try {
                if (apk.exists()) //noinspection ResultOfMethodCallIgnored
                    apk.delete();
                downloadToFile(url, apk);
                if (!apk.exists() || apk.length() < 500_000L) throw new Exception("APK eksik veya bozuk");
                try (FileInputStream fin = new FileInputStream(apk)) {
                    byte[] magic = new byte[2];
                    if (fin.read(magic) != 2 || magic[0] != 'P' || magic[1] != 'K') {
                        throw new Exception("APK dosyası değil");
                    }
                }
                PackageInfo neu = activity.getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(), 0);
                if (neu == null || neu.packageName == null) throw new Exception("APK okunamadı");
                if (!activity.getPackageName().equals(neu.packageName)) {
                    throw new Exception("Yanlış paket");
                }
                final File apkFinal = apk;
                final String verFinal = label;
                if (isDowngrade(apkFinal)) {
                    new Handler(Looper.getMainLooper()).post(() -> {
                        try {
                            install(apkFinal, verFinal, 0);
                        } finally {
                            busy = false;
                        }
                    });
                    return;
                }
                // Yükseltme: %100 göster, kısa bekleyip Android kurulum onayını aç.
                pendingApk = apkFinal;
                pendingVer = verFinal;
                busy = false;
                js("window.onAppUpdateProgress&&window.onAppUpdateProgress(100)");
                js("window.onAppUpdateReady&&window.onAppUpdateReady()");
                new Handler(Looper.getMainLooper()).postDelayed(() -> install(apkFinal, verFinal, 0), 650);
            } catch (Exception e) {
                busy = false;
                pendingApk = null;
                pendingVer = "";
                if (apk.exists()) //noinspection ResultOfMethodCallIgnored
                    apk.delete();
                toast("Güncelleme indirilemedi: " + e.getMessage());
                js("window.onAppUpdateProgress&&window.onAppUpdateProgress(-1)");
                js("window.onAppUpdateFailed&&window.onAppUpdateFailed(" + jsonStr(url) + "," + jsonStr(String.valueOf(e.getMessage())) + ")");
            }
        }).start();
    }

    @JavascriptInterface
    public boolean hasPendingInstall() {
        File apk = pendingApk;
        return apk != null && apk.exists() && apk.length() > 500_000L;
    }

    /** Kurulum başarısından sonra bir kez sürüm döner; boşsa güncelleme yok. */
    @JavascriptInterface
    public String consumeUpdateSuccess() {
        try {
            android.content.SharedPreferences p =
                    activity.getSharedPreferences(UpdateInstallReceiver.PREFS, Activity.MODE_PRIVATE);
            String cur = getVersionName();
            String expect = p.getString(UpdateInstallReceiver.KEY_EXPECT_VER, "");
            boolean flagged = p.getBoolean(UpdateInstallReceiver.KEY_JUST_INSTALLED, false);
            String ver = p.getString(UpdateInstallReceiver.KEY_INSTALLED_VER, "");
            // Klasik yükleyici yolu: beklenen sürüm artık yüklüyse başarı say
            if (!flagged && expect != null && !expect.isEmpty() && cur != null && !cur.isEmpty()) {
                String e = expect.replaceFirst("(?i)^v", "");
                String c = cur.replaceFirst("(?i)^v", "");
                if (c.equalsIgnoreCase(e)) {
                    flagged = true;
                    ver = cur;
                }
            }
            if (!flagged) return "";
            p.edit()
                    .remove(UpdateInstallReceiver.KEY_JUST_INSTALLED)
                    .remove(UpdateInstallReceiver.KEY_INSTALLED_VER)
                    .remove(UpdateInstallReceiver.KEY_EXPECT_VER)
                    .apply();
            if (ver == null || ver.isEmpty()) ver = cur;
            return ver == null ? "" : ver;
        } catch (Exception e) {
            return "";
        }
    }

    /** İndirilmiş APK için yükleyiciyi aç (kullanıcı dokunuşuyla). */
    @JavascriptInterface
    public void installPending() {
        final File apk = pendingApk;
        final String ver = pendingVer == null ? "" : pendingVer;
        if (apk == null || !apk.exists() || apk.length() < 500_000L) {
            toast("Önce güncellemeyi indir");
            js("window.onAppUpdateProgress&&window.onAppUpdateProgress(-1)");
            return;
        }
        new Handler(Looper.getMainLooper()).post(() -> install(apk, ver, 0));
    }

    private File updateDir() {
        File ext = activity.getExternalFilesDir("updates");
        if (ext != null) {
            //noinspection ResultOfMethodCallIgnored
            ext.mkdirs();
            return ext;
        }
        File dir = new File(activity.getFilesDir(), "updates");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        return dir;
    }

    private void downloadToFile(String url, File apk) throws Exception {
        String current = url;
        HttpURLConnection conn = null;
        for (int i = 0; i < 10; i++) {
            conn = (HttpURLConnection) new URL(current).openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setRequestProperty("Accept", "*/*");
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 lPerson-Updater");
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(180000);
            int code = conn.getResponseCode();
            if (code >= 300 && code < 400) {
                String next = conn.getHeaderField("Location");
                conn.disconnect();
                if (next == null || next.isEmpty()) throw new Exception("redirect");
                if (next.startsWith("/")) {
                    URL base = new URL(current);
                    next = base.getProtocol() + "://" + base.getHost() + next;
                }
                if (next.startsWith("http://")) next = "https://" + next.substring(7);
                if (!next.startsWith("https://")) throw new Exception("redirect http");
                current = next;
                continue;
            }
            if (code != 200) throw new Exception("HTTP " + code);
            break;
        }
        if (conn == null) throw new Exception("bağlantı yok");
        long total = conn.getContentLengthLong();
        if (total <= 0) {
            try {
                String cl = conn.getHeaderField("Content-Length");
                if (cl != null && !cl.isEmpty()) total = Long.parseLong(cl.trim());
            } catch (Exception ignored) {}
        }
        // Hosting bazen Content-Length vermez; tahmini APK boyutuyla yumuşak yüzde
        final long expected = total > 0 ? total : 32L * 1024 * 1024;
        long done = 0;
        try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(apk)) {
            byte[] buf = new byte[64 * 1024];
            int n; int lastPct = -1;
            while ((n = in.read(buf)) > 0) {
                out.write(buf, 0, n);
                done += n;
                int pct;
                if (total > 0) {
                    pct = (int) Math.min(99, done * 100 / total);
                } else {
                    // Bilinmeyen boyut: MB arttıkça ilerlesin, %95'te dursun (bitince 100 gelir)
                    pct = (int) Math.min(95, done * 95 / expected);
                    if (pct < 1 && done > 0) pct = 1;
                }
                if (pct != lastPct && (pct - lastPct >= 1 || pct >= 99)) {
                    lastPct = pct;
                    js("window.onAppUpdateProgress&&window.onAppUpdateProgress(" + pct + ")");
                }
            }
            out.getFD().sync();
        } finally {
            conn.disconnect();
        }
        if (total > 0 && done + 1024 < total) throw new Exception("İndirme yarım kaldı");
        if (done < 500_000L) throw new Exception("Dosya çok küçük");
    }

    private long versionCodeOf(PackageInfo pi) {
        if (pi == null) return 0;
        if (Build.VERSION.SDK_INT >= 28) return pi.getLongVersionCode();
        return pi.versionCode;
    }

    private boolean isDowngrade(File apk) {
        try {
            PackageManager pm = activity.getPackageManager();
            PackageInfo cur = pm.getPackageInfo(activity.getPackageName(), 0);
            PackageInfo neu = pm.getPackageArchiveInfo(apk.getAbsolutePath(), 0);
            if (neu == null) return false;
            return versionCodeOf(neu) > 0 && versionCodeOf(neu) < versionCodeOf(cur);
        } catch (Exception e) {
            return false;
        }
    }

    private String copyToDownloads(File apk, String displayName) {
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                ContentResolver cr = activity.getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, displayName);
                values.put(MediaStore.Downloads.MIME_TYPE, "application/vnd.android.package-archive");
                values.put(MediaStore.Downloads.IS_PENDING, 1);
                Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) return null;
                try (InputStream in = new FileInputStream(apk); OutputStream out = cr.openOutputStream(uri)) {
                    if (out == null) return null;
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                }
                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                cr.update(uri, values, null, null);
                return displayName;
            }
            File dl = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (dl == null) return null;
            //noinspection ResultOfMethodCallIgnored
            dl.mkdirs();
            File dest = new File(dl, displayName);
            try (InputStream in = new FileInputStream(apk); OutputStream out = new FileOutputStream(dest)) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            return displayName;
        } catch (Exception e) {
            return null;
        }
    }

    private void markExpectUpdate(String ver) {
        try {
            String v = ver != null ? ver.trim() : "";
            if (v.isEmpty()) {
                PackageInfo neu = activity.getPackageManager().getPackageArchiveInfo(
                        pendingApk != null ? pendingApk.getAbsolutePath() : "", 0);
                if (neu != null && neu.versionName != null) v = neu.versionName;
            }
            activity.getSharedPreferences(UpdateInstallReceiver.PREFS, Activity.MODE_PRIVATE)
                    .edit()
                    .putString(UpdateInstallReceiver.KEY_EXPECT_VER, v)
                    .apply();
        } catch (Exception ignored) {}
    }

    private void installWithSession(File apk) throws Exception {
        final PackageInstaller installer = activity.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        if (Build.VERSION.SDK_INT >= 31) {
            try { params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED); } catch (Exception ignored) {}
        }
        final int sessionId = installer.createSession(params);
        if (installCb != null) {
            try { installer.unregisterSessionCallback(installCb); } catch (Exception ignored) {}
            installCb = null;
        }
        final File apkRef = apk;
        installCb = new PackageInstaller.SessionCallback() {
            private boolean installingToasted = false;
            private void markInstalling() {
                if (installingToasted) return;
                installingToasted = true;
                toast("Güncelleniyor…");
                js("window.onAppUpdateInstalling&&window.onAppUpdateInstalling()");
            }
            @Override public void onCreated(int id) {}
            @Override public void onBadgingChanged(int id) {}
            @Override public void onActiveChanged(int id, boolean active) {
                if (id == sessionId && active) markInstalling();
            }
            @Override public void onProgressChanged(int id, float progress) {
                if (id == sessionId && progress > 0f) markInstalling();
            }
            @Override public void onFinished(int id, boolean success) {
                if (id != sessionId) return;
                try { installer.unregisterSessionCallback(this); } catch (Exception ignored) {}
                if (installCb == this) installCb = null;
                if (success) {
                    toast("Güncelleme kuruldu");
                    return;
                }
                // Session bazı cihazlarda onaydan sonra düşer → klasik yükleyici
                new Handler(Looper.getMainLooper()).post(() -> {
                    try {
                        openInstallerFromFile(apkRef);
                        toast("Güncelleniyor…");
                        js("window.onAppUpdateInstalling&&window.onAppUpdateInstalling()");
                    } catch (Exception e) {
                        toast("Güncelleme kurulamadı");
                        js("window.onAppUpdateProgress&&window.onAppUpdateProgress(-1)");
                    }
                });
            }
        };
        installer.registerSessionCallback(installCb, new Handler(Looper.getMainLooper()));
        PackageInstaller.Session session = installer.openSession(sessionId);
        try {
            try (InputStream in = new FileInputStream(apk);
                 OutputStream out = session.openWrite("base.apk", 0, apk.length())) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                session.fsync(out);
            }
            Intent broadcast = new Intent(activity, UpdateInstallReceiver.class);
            broadcast.setAction(UpdateInstallReceiver.ACTION);
            broadcast.setPackage(activity.getPackageName());
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE;
            PendingIntent pi = PendingIntent.getBroadcast(activity, sessionId, broadcast, flags);
            session.commit(pi.getIntentSender());
        } catch (Exception e) {
            try { installer.unregisterSessionCallback(installCb); } catch (Exception ignored) {}
            installCb = null;
            try { session.abandon(); } catch (Exception ignored) {}
            throw e;
        } finally {
            try { session.close(); } catch (Exception ignored) {}
        }
    }

    private void openInstallerFromFile(File apk) throws Exception {
        Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true);
        String[] pkgs = {
                "com.google.android.packageinstaller",
                "com.android.packageinstaller",
                "com.samsung.android.packageinstaller"
        };
        for (String pkg : pkgs) {
            try { activity.grantUriPermission(pkg, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION); }
            catch (Exception ignored) {}
        }
        activity.startActivity(intent);
    }

    private void install(File apk, String ver, int waited) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !activity.getPackageManager().canRequestPackageInstalls()) {
            if (waited == 0) {
                toast("Ayarlardan bu uygulamaya yükleme izni ver, sonra geri dön.");
                try {
                    activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + activity.getPackageName())));
                } catch (Exception ignored) {}
            }
            if (waited < 180) new Handler(Looper.getMainLooper()).postDelayed(() -> install(apk, ver, waited + 1), 1000);
            else {
                toast("İzin verilmedi; güncellemeyi tekrar dene.");
                js("window.onAppUpdateProgress&&window.onAppUpdateProgress(-1)");
            }
            return;
        }

        if (isDowngrade(apk)) {
            String name = (ver != null && !ver.isEmpty()) ? ("lperson-" + ver + ".apk") : "lperson-update.apk";
            String shown = copyToDownloads(apk, name);
            if (shown == null) shown = name;
            js("window.onAppLegacyDowngrade&&window.onAppLegacyDowngrade(" + jsonStr(shown) + ")");
            toast("Eski sürüm: uygulamayı kaldır, İndirilenler → " + shown);
            try {
                activity.startActivity(new Intent(Intent.ACTION_DELETE, Uri.parse("package:" + activity.getPackageName())));
            } catch (Exception e) {
                toast("Kaldırma açılamadı. Ayarlar’dan sil.");
            }
            return;
        }

        markExpectUpdate(ver);
        // Klasik yükleyici: Android kendi «güncelleniyor» ekranını gösterir (daha güvenilir)
        try {
            openInstallerFromFile(apk);
            toast("Güncelleniyor…");
            js("window.onAppUpdateInstalling&&window.onAppUpdateInstalling()");
            return;
        } catch (Exception e1) {
            try {
                installWithSession(apk);
                toast("Yükleme onayı açılıyor…");
            } catch (Exception e2) {
                toast("Yükleyici açılamadı. Tarayıcıdan indir.");
                js("window.onAppUpdateFailed&&window.onAppUpdateFailed(\"\",\"" + "install" + "\")");
                js("window.onAppUpdateProgress&&window.onAppUpdateProgress(-1)");
            }
        }
    }

    private static String jsonStr(String s) {
        if (s == null) return "\"\"";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
    }

    private void toast(String msg) {
        activity.runOnUiThread(() -> Toast.makeText(activity, msg, Toast.LENGTH_LONG).show());
    }

    private void js(String code) {
        if (webView != null) webView.post(() -> webView.evaluateJavascript(code, null));
    }
}
