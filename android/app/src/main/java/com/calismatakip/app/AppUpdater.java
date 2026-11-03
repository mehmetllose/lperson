package com.calismatakip.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** GitHub Releases APK guncelleyici: JS tarafi surumu kontrol eder, burasi indirir ve yukleyiciyi acar. */
public final class AppUpdater {
    private final Activity activity;
    private final WebView webView;
    private volatile boolean busy = false;

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
    public void downloadAndInstall(String url) {
        if (busy || url == null || !url.startsWith("https://")) return;
        busy = true;
        toast("Güncelleme indiriliyor...");
        new Thread(() -> {
            File dir = new File(activity.getCacheDir(), "updates");
            dir.mkdirs();
            File apk = new File(dir, "lperson-update.apk");
            try {
                if (apk.exists()) apk.delete();
                String current = url;
                HttpURLConnection conn = null;
                for (int i = 0; i < 6; i++) {
                    conn = (HttpURLConnection) new URL(current).openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setRequestProperty("Accept", "application/octet-stream");
                    conn.setConnectTimeout(20000);
                    conn.setReadTimeout(60000);
                    int code = conn.getResponseCode();
                    if (code >= 300 && code < 400) {
                        current = conn.getHeaderField("Location");
                        conn.disconnect();
                        if (current == null) throw new Exception("redirect");
                        continue;
                    }
                    if (code != 200) throw new Exception("HTTP " + code);
                    break;
                }
                final long total = conn.getContentLengthLong();
                try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(apk)) {
                    byte[] buf = new byte[64 * 1024];
                    long done = 0; int n; int lastPct = -1;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        done += n;
                        if (total > 0) {
                            int pct = (int) (done * 100 / total);
                            if (pct != lastPct && pct % 5 == 0) { lastPct = pct; js("window.onAppUpdateProgress&&window.onAppUpdateProgress(" + pct + ")"); }
                        }
                    }
                }
                conn.disconnect();
                busy = false;
                new Handler(Looper.getMainLooper()).post(() -> install(apk, 0));
            } catch (Exception e) {
                busy = false;
                if (apk.exists()) apk.delete();
                toast("Güncelleme indirilemedi: " + e.getMessage());
                js("window.onAppUpdateProgress&&window.onAppUpdateProgress(-1)");
            }
        }).start();
    }

    private void install(File apk, int waited) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !activity.getPackageManager().canRequestPackageInstalls()) {
            if (waited == 0) {
                toast("Bu uygulamaya 'Bilinmeyen uygulamaları yükle' izni verin, sonra geri dönün.");
                try {
                    activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + activity.getPackageName())));
                } catch (Exception ignored) {}
            }
            if (waited < 180) new Handler(Looper.getMainLooper()).postDelayed(() -> install(apk, waited + 1), 1000);
            else toast("İzin verilmedi; güncellemeyi tekrar deneyin.");
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", apk);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
        } catch (Exception e) {
            toast("Yükleyici açılamadı: " + e.getMessage());
        }
    }

    private void toast(String msg) {
        activity.runOnUiThread(() -> Toast.makeText(activity, msg, Toast.LENGTH_LONG).show());
    }

    private void js(String code) {
        if (webView != null) webView.post(() -> webView.evaluateJavascript(code, null));
    }
}
