package com.calismatakip.app;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.webkit.JavascriptInterface;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

/** JS koprusu: window.AndroidLocShare */
public class LocShareBridge {
    private final Activity activity;
    public LocShareBridge(Activity activity) { this.activity = activity; }

    @JavascriptInterface public boolean hasFine() { return LocShareService.hasFine(activity); }

    @JavascriptInterface public boolean hasBackground() {
        if (Build.VERSION.SDK_INT < 29) return hasFine();
        return ContextCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @JavascriptInterface public void requestFine() {
        activity.runOnUiThread(() -> ActivityCompat.requestPermissions(activity,
                new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, 7301));
    }

    /** Android 11+ sistem ayar ekranina yonlendirir ("Her zaman izin ver"). */
    @JavascriptInterface public void requestBackground() {
        if (Build.VERSION.SDK_INT < 29 || hasBackground()) return;
        activity.runOnUiThread(() -> ActivityCompat.requestPermissions(activity,
                new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION}, 7302));
    }

    @JavascriptInterface public void requestNotif() {
        if (Build.VERSION.SDK_INT < 33) return;
        if (ContextCompat.checkSelfPermission(activity, "android.permission.POST_NOTIFICATIONS") == PackageManager.PERMISSION_GRANTED) return;
        activity.runOnUiThread(() -> ActivityCompat.requestPermissions(activity, new String[]{"android.permission.POST_NOTIFICATIONS"}, 7303));
    }

    @JavascriptInterface public void start(String uid, boolean commute, boolean bg, double wLat, double wLng, boolean hasWp, double arriveKm) {
        LocShareService.start(activity, uid, commute, bg, wLat, wLng, hasWp, arriveKm);
    }

    @JavascriptInterface public void stop() { LocShareService.stop(activity); }

    @JavascriptInterface public String status() { return LocShareService.status(activity); }
}
