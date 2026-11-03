package com.calismatakip.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Personel konum paylasimi (Yoldayim + arka plan). On plan servisi; kalici "Konum paylasiliyor" bildirimi
 * ve "Durdur" dugmesi. Konumu Firestore REST ile users/{uid} belgesine yazar (web uygulamasiyla ayni erisim).
 */
public class LocShareService extends Service implements LocationListener {
    static final String PREFS = "lperson_locshare";
    static final String CH = "ct_locshare";
    static final int NOTIF_ID = 4711;
    static final String ACTION_STOP = "com.calismatakip.app.LOCSHARE_STOP";
    private static final String DOC_ROOT = "https://firestore.googleapis.com/v1/projects/lperson/databases/(default)/documents/";

    private LocationManager lm;
    private long lastSent = 0;
    private Location lastLoc = null;
    private int curInterval = 0;

    public static void start(Context ctx, String uid, boolean commute, boolean bg, double wLat, double wLng, boolean hasWp, double arriveKm) {
        Context app = ctx.getApplicationContext();
        if (uid == null || uid.isEmpty() || (!commute && !bg)) { stop(app); return; }
        app.getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putString("uid", uid).putBoolean("commute", commute).putBoolean("bg", bg)
                .putString("wLat", String.valueOf(wLat)).putString("wLng", String.valueOf(wLng))
                .putBoolean("hasWp", hasWp).putString("arriveKm", String.valueOf(arriveKm)).apply();
        Intent i = new Intent(app, LocShareService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) app.startForegroundService(i); else app.startService(i);
        } catch (Exception ignored) {}
    }

    public static void stop(Context ctx) {
        Context app = ctx.getApplicationContext();
        app.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("commute", false).putBoolean("bg", false).apply();
        try { app.stopService(new Intent(app, LocShareService.class)); } catch (Exception ignored) {}
    }

    public static String status(Context ctx) {
        SharedPreferences p = ctx.getApplicationContext().getSharedPreferences(PREFS, MODE_PRIVATE);
        try {
            return new JSONObject().put("commute", p.getBoolean("commute", false)).put("bg", p.getBoolean("bg", false))
                    .put("lastSentAt", p.getString("lastSentAt", "")).put("lastError", p.getString("lastError", "")).toString();
        } catch (Exception e) { return "{}"; }
    }

    static boolean hasFine(Context ctx) {
        return ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private SharedPreferences prefs() { return getSharedPreferences(PREFS, MODE_PRIVATE); }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            final String uid = prefs().getString("uid", "");
            prefs().edit().putBoolean("commute", false).putBoolean("bg", false).apply();
            try { startForeground(NOTIF_ID, buildNotif()); } catch (Exception ignored) {}
            new Thread(() -> {
                try {
                    JSONObject f = new JSONObject();
                    f.put("commuteActive", new JSONObject().put("booleanValue", false));
                    f.put("locBgOn", new JSONObject().put("booleanValue", false));
                    patchUser(uid, f);
                } catch (Exception ignored) {}
            }).start();
            stopForegroundCompat();
            stopSelf();
            return START_NOT_STICKY;
        }
        boolean commute = prefs().getBoolean("commute", false), bg = prefs().getBoolean("bg", false);
        if ((!commute && !bg) || !hasFine(this)) {
            try { startForeground(NOTIF_ID, buildNotif()); } catch (Exception ignored) {}
            stopForegroundCompat();
            stopSelf();
            return START_NOT_STICKY;
        }
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIF_ID, buildNotif(), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            else startForeground(NOTIF_ID, buildNotif());
        } catch (Exception e) {
            prefs().edit().putString("lastError", "startForeground: " + e.getClass().getSimpleName()).apply();
            stopSelf();
            return START_NOT_STICKY;
        }
        requestUpdates(true);
        return START_STICKY;
    }

    private void stopForegroundCompat() {
        try {
            if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE); else stopForeground(true);
        } catch (Exception ignored) {}
    }

    private void requestUpdates(boolean force) {
        boolean commute = prefs().getBoolean("commute", false);
        int interval = commute ? 30000 : 180000;
        if (!force && interval == curInterval) return;
        curInterval = interval;
        if (lm == null) lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) return;
        try { lm.removeUpdates(this); } catch (Exception ignored) {}
        float dist = commute ? 30f : 100f;
        try {
            Location best = null;
            for (String prov : new String[]{LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER}) {
                try {
                    if (!lm.isProviderEnabled(prov)) continue;
                    lm.requestLocationUpdates(prov, interval, dist, this, Looper.getMainLooper());
                    Location l = lm.getLastKnownLocation(prov);
                    if (l != null && (best == null || l.getTime() > best.getTime())) best = l;
                } catch (SecurityException se) {
                    prefs().edit().putString("lastError", "izin yok").apply();
                } catch (Exception ignored) {}
            }
            if (best != null && System.currentTimeMillis() - best.getTime() < 5 * 60 * 1000) onLocationChanged(best);
        } catch (Exception ignored) {}
    }

    @Override
    public void onLocationChanged(Location loc) {
        if (loc == null) return;
        boolean commute = prefs().getBoolean("commute", false), bg = prefs().getBoolean("bg", false);
        if (!commute && !bg) { stopForegroundCompat(); stopSelf(); return; }
        long now = System.currentTimeMillis();
        long minGap = commute ? 20000 : 90000;
        boolean moved = lastLoc == null || lastLoc.distanceTo(loc) > (commute ? 40 : 150);
        if (now - lastSent < minGap && !moved) return;
        if (lastLoc != null && loc.hasAccuracy() && lastLoc.hasAccuracy() && loc.getAccuracy() > 500 && lastLoc.getAccuracy() < loc.getAccuracy() && now - lastSent < 300000) return;
        lastSent = now;
        lastLoc = loc;
        boolean arrived = false;
        if (commute && prefs().getBoolean("hasWp", false)) {
            try {
                double wLat = Double.parseDouble(prefs().getString("wLat", "0")), wLng = Double.parseDouble(prefs().getString("wLng", "0"));
                double arriveKm = Double.parseDouble(prefs().getString("arriveKm", "0.15"));
                float[] res = new float[1];
                Location.distanceBetween(wLat, wLng, loc.getLatitude(), loc.getLongitude(), res);
                arrived = res[0] / 1000.0 <= arriveKm;
            } catch (Exception ignored) {}
        }
        final String uid = prefs().getString("uid", "");
        final double lat = loc.getLatitude(), lng = loc.getLongitude();
        final long acc = loc.hasAccuracy() ? Math.round(loc.getAccuracy()) : 0;
        final boolean arrivedF = arrived;
        new Thread(() -> {
            try {
                String iso = isoNow();
                JSONObject f = new JSONObject();
                f.put("liveLat", new JSONObject().put("doubleValue", lat));
                f.put("liveLng", new JSONObject().put("doubleValue", lng));
                f.put("liveAcc", new JSONObject().put("integerValue", String.valueOf(acc)));
                f.put("liveUpdatedAt", new JSONObject().put("stringValue", iso));
                if (arrivedF) {
                    f.put("commuteActive", new JSONObject().put("booleanValue", false));
                    f.put("commuteArrivedAt", new JSONObject().put("stringValue", iso));
                }
                patchUser(uid, f);
                prefs().edit().putString("lastSentAt", iso).putString("lastError", "").apply();
            } catch (Exception e) {
                prefs().edit().putString("lastError", String.valueOf(e.getMessage())).apply();
            }
        }).start();
        if (arrived) {
            prefs().edit().putBoolean("commute", false).apply();
            if (!bg) { stopForegroundCompat(); stopSelf(); return; }
            updateNotif();
            requestUpdates(false);
        }
    }

    private void updateNotif() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(NOTIF_ID, buildNotif());
        } catch (Exception ignored) {}
    }

    private static String isoNow() {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(new Date());
    }

    /** users/{uid} belgesinde yalnizca verilen alanlari gunceller (updateMask). */
    static void patchUser(String uid, JSONObject fields) throws Exception {
        if (uid == null || uid.isEmpty()) return;
        StringBuilder url = new StringBuilder(DOC_ROOT).append("users/").append(java.net.URLEncoder.encode(uid, "UTF-8"))
                .append("?key=").append(NotifyWatchService.API_KEY);
        java.util.Iterator<String> it = fields.keys();
        while (it.hasNext()) url.append("&updateMask.fieldPaths=").append(it.next());
        HttpURLConnection c = (HttpURLConnection) new URL(url.toString()).openConnection();
        c.setRequestMethod("POST");
        c.setRequestProperty("X-HTTP-Method-Override", "PATCH");
        c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        c.setConnectTimeout(15000);
        c.setReadTimeout(20000);
        c.setDoOutput(true);
        byte[] body = new JSONObject().put("fields", fields).toString().getBytes(StandardCharsets.UTF_8);
        try (OutputStream os = c.getOutputStream()) { os.write(body); }
        int code = c.getResponseCode();
        c.disconnect();
        if (code < 200 || code >= 300) throw new Exception("HTTP " + code);
    }

    private Notification buildNotif() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null && nm.getNotificationChannel(CH) == null) {
            NotificationChannel ch = new NotificationChannel(CH, "Konum payla\u015f\u0131m\u0131", NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        Intent stop = new Intent(this, LocShareService.class).setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(this, 4712, stop, piFlags);
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPi = PendingIntent.getActivity(this, 4713, open, piFlags);
        boolean commute = prefs().getBoolean("commute", false);
        boolean bgOn = prefs().getBoolean("bg", false);
        String text = commute ? "Yolday\u0131m \u00b7 i\u015fyerine var\u0131nca kendili\u011finden durur" : "\u0130\u015fyeri ayar\u0131 \u00b7 konumunuz y\u00f6neticinizle payla\u015f\u0131l\u0131yor";
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CH)
                .setSmallIcon(R.drawable.ic_stat_lperson)
                .setContentTitle("Konum payla\u015f\u0131l\u0131yor")
                .setContentText(text)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(openPi);
        // Arka plan takibi isyeri (lpadmin) ayaridir; Durdur yalnizca Yoldayim modunda.
        if (!bgOn) b.addAction(0, "Durdur", stopPi);
        return b.build();
    }

    @Override
    public void onDestroy() {
        try { if (lm != null) lm.removeUpdates(this); } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
    @Override public void onProviderEnabled(String provider) {}
    @Override public void onProviderDisabled(String provider) {}
    @Override public IBinder onBind(Intent intent) { return null; }
}
