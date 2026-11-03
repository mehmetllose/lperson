package com.calismatakip.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Iterator;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Fatura kapalıyken Cloud Functions çalışmadığı için giriş, çıkış ve talep
 * bildirimlerini telefonun kendisi Firestore'dan okuyup gösterir.
 */
public class NotifyWatchService extends Service {
    public static volatile boolean appInForeground = false;
    private static volatile boolean muteTrayBecauseFcm = false;
    private static final java.util.concurrent.ConcurrentHashMap<String, Long> recentAlerts = new java.util.concurrent.ConcurrentHashMap<>();
    private static final ExecutorService EXEC = Executors.newSingleThreadExecutor();
    private static volatile boolean watching = false;
    private static volatile boolean polling = false;

    private static final String ACTION_STOP = "com.calismatakip.app.NOTIFY_WATCH_STOP";
    private static final String CH_ALERT = "ct_shift";
    private static final String THEME_PREFS = "lperson_ui_theme";
    private static final int ONGOING_ID = 71001;
    private static final int KICK_REQ = 7701;
    private static final long POLL_MS = 8000L;
    static final String API_KEY = "AIzaSyDjWLbIB00JTBjvcq1sZtFVeT7JbsWAF6c";
    private static final String DOC_ROOT =
            "https://firestore.googleapis.com/v1/projects/lperson/databases/(default)/documents/";
    private static final String RUN_QUERY =
            "https://firestore.googleapis.com/v1/projects/lperson/databases/(default)/documents:runQuery?key=" + API_KEY;

    public static void start(Context context) {
        if (context == null) return;
        watching = true;
        Context app = context.getApplicationContext();
        cancelLeftoverOngoing(app);
        cancelAllKicks(app);
        ensureAlertChannel(app);
        scheduleKick(app);
        runPoll(app, null);
    }

    public static void stop(Context context) {
        watching = false;
        if (context == null) return;
        Context app = context.getApplicationContext();
        cancelAllKicks(app);
        cancelLeftoverOngoing(app);
        try { app.stopService(new Intent(app, NotifyWatchService.class)); } catch (Exception ignored) {}
    }

    public static boolean hasSavedSession(Context context) {
        return !readSessionUid(context).isEmpty();
    }

    public static void runPoll(Context context, Runnable after) {
        if (context == null) {
            if (after != null) after.run();
            return;
        }
        final Context app = context.getApplicationContext();
        if (!watching && !hasSavedSession(app)) {
            if (after != null) after.run();
            return;
        }
        watching = true;
        if (polling) {
            scheduleKick(app);
            if (after != null) after.run();
            return;
        }
        polling = true;
        EXEC.execute(() -> {
            PowerManager pm = (PowerManager) app.getSystemService(POWER_SERVICE);
            PowerManager.WakeLock wl = null;
            if (pm != null) {
                try {
                    wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "lperson:notify");
                    wl.setReferenceCounted(false);
                    wl.acquire(18000);
                } catch (Exception ignored) {}
            }
            try {
                poll(app);
            } catch (Exception ignored) {
            } finally {
                if (wl != null && wl.isHeld()) {
                    try { wl.release(); } catch (Exception ignored) {}
                }
                polling = false;
                if (watching && hasSavedSession(app)) scheduleKick(app);
                if (after != null) {
                    try { after.run(); } catch (Exception ignored) {}
                }
            }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        cancelLeftoverOngoing(this);
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            watching = false;
            cancelAllKicks(this);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (hasSavedSession(this)) start(this);
        stopSelf();
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private static void poll(Context ctx) throws Exception {
        String uid = readSessionUid(ctx);
        if (uid.isEmpty()) {
            watching = false;
            cancelAllKicks(ctx);
            return;
        }
        JSONObject me = getFields("users/" + enc(uid)
                + "?mask.fieldPaths=role&mask.fieldPaths=name&mask.fieldPaths=companyId&mask.fieldPaths=terminatedAt&mask.fieldPaths=fcmToken&mask.fieldPaths=recentShiftNotifs");
        if (me == null) return;
        String role = str(me, "role");
        String companyId = str(me, "companyId");
        String myName = str(me, "name");
        muteTrayBecauseFcm = false;
        if (companyId.isEmpty() || (!"patron".equals(role) && !"calisan".equals(role))) return;

        SharedPreferences prefs = ctx.getSharedPreferences("lperson_notify_watch", Context.MODE_PRIVATE);
        boolean primed = prefs.getBoolean("primed", false);
        JSONObject clock = new JSONObject(prefs.getString("clock", "{}"));
        JSONObject req = new JSONObject(prefs.getString("req", "{}"));
        if (!uid.equals(prefs.getString("uid", ""))) {
            primed = false;
            clock = new JSONObject();
            req = new JSONObject();
        }

        String currency = "₺";
        try {
            JSONObject company = getFields("companies/" + enc(companyId) + "?mask.fieldPaths=settings");
            JSONObject settings = mapFields(company == null ? null : company.optJSONObject("settings"));
            String cur = str(settings, "currency");
            if (!cur.isEmpty()) currency = cur;
        } catch (Exception ignored) {}

        if ("patron".equals(role)) pollPatron(ctx, companyId, primed, clock, req);
        else pollWorker(ctx, uid, myName, primed, req, currency);
        pollShiftNotifs(ctx, me, primed);

        prefs.edit().putString("uid", uid).putBoolean("primed", true)
                .putString("clock", clock.toString())
                .putString("req", req.toString())
                .commit();
    }

    private static void pollPatron(Context ctx, String companyId, boolean primed, JSONObject clock, JSONObject req) throws Exception {
        JSONObject company = getFields("companies/" + enc(companyId) + "?mask.fieldPaths=settings");
        JSONObject settings = mapFields(company == null ? null : company.optJSONObject("settings"));
        boolean allowClock = bool(settings, "notifyPatronOnClockIn", true);
        String currency = str(settings, "currency");
        if (currency.isEmpty()) currency = "₺";

        JSONArray users = runQuery(selectQuery("users", "companyId", companyId, 80,
                new String[]{"role", "name", "companyId", "terminatedAt"}));
        JSONObject names = new JSONObject();
        String today = todayKey();
        if (allowClock) {
            for (int i = 0; i < users.length(); i++) {
                JSONObject doc = users.optJSONObject(i);
                if (doc == null) continue;
                JSONObject fields = doc.optJSONObject("fields");
                if (fields == null || !"calisan".equals(str(fields, "role")) || isTerminated(fields)) continue;
                String wid = docId(doc);
                if (wid.isEmpty()) continue;
                String name = str(fields, "name");
                if (name.isEmpty()) name = "Çalışan";
                names.put(wid, name);
                JSONObject rec = getFields("records/" + enc(wid) + "?mask.fieldPaths=data_");
                JSONObject data = mapFields(rec == null ? null : rec.optJSONObject("data_"));
                JSONObject day = mapFields(data.optJSONObject(today));
                int[] st = shiftStats(day);
                String prev = clock.optString(wid, "");
                String now = st[0] + "," + st[1];
                if (primed && !prev.isEmpty()) {
                    String[] p = prev.split(",");
                    int oldS = p.length > 0 ? parseInt(p[0]) : 0;
                    int oldC = p.length > 1 ? parseInt(p[1]) : 0;
                    if (st[0] > oldS) {
                        String tIn = fallback(lastTime(day, false), "?");
                        alert(ctx, "ct-patron-in-" + wid + "-" + today + "-" + tIn,
                                "İşyeri · Giriş", name + " giriş yaptı — " + tIn);
                    }
                    if (st[1] > oldC) {
                        String tOut = fallback(lastTime(day, true), "?");
                        alert(ctx, "ct-patron-out-" + wid + "-" + today + "-" + tOut,
                                "İşyeri · Çıkış", name + " çıkış yaptı — " + tOut);
                    }
                }
                clock.put(wid, now);
            }
        }

        JSONArray reqs = runQuery(selectQuery("requests", "companyId", companyId, 120,
                new String[]{"status", "type", "userId", "amount", "startDate", "endDate", "dateKey",
                        "createdAt", "isHourlyLeave", "startTime", "endTime"}));
        JSONObject seen = new JSONObject();
        for (int i = 0; i < reqs.length(); i++) {
            JSONObject doc = reqs.optJSONObject(i);
            if (doc == null) continue;
            JSONObject f = doc.optJSONObject("fields");
            if (f == null) continue;
            String id = docId(doc);
            String status = str(f, "status");
            if (id.isEmpty()) continue;
            seen.put(id, status);
            String prev = req.has(id) ? req.optString(id, "") : null;
            if (primed && prev == null && "pending".equals(status) && recent(str(f, "createdAt"), 12L * 60L * 60L * 1000L)) {
                String who = names.optString(str(f, "userId"), "");
                if (who.isEmpty()) who = lookupName(str(f, "userId"));
                alert(ctx, "ct-req-" + id, requestTitle(f), requestBody(f, who, currency));
            }
        }
        copyInto(req, seen);
    }

    private static void pollWorker(Context ctx, String uid, String myName, boolean primed, JSONObject req, String currency) throws Exception {
        JSONArray reqs = runQuery(selectQuery("requests", "userId", uid, 80,
                new String[]{"status", "type", "userId", "amount", "startDate", "endDate", "dateKey", "createdAt"}));
        JSONObject seen = new JSONObject();
        String name = myName == null || myName.isEmpty() ? "Personel" : myName;
        for (int i = 0; i < reqs.length(); i++) {
            JSONObject doc = reqs.optJSONObject(i);
            if (doc == null) continue;
            JSONObject f = doc.optJSONObject("fields");
            if (f == null) continue;
            String id = docId(doc);
            String status = str(f, "status");
            if (id.isEmpty()) continue;
            seen.put(id, status);
            String prev = req.has(id) ? req.optString(id, "") : null;
            if (primed && "pending".equals(prev) && ("approved".equals(status) || "rejected".equals(status))) {
                String verdict = "approved".equals(status) ? "onaylandı" : "reddedildi";
                alert(ctx, "ct-myreq-" + id + "-" + ("approved".equals(status) ? "ok" : "no"),
                        workerTitle(f), workerBody(f, name, verdict, currency));
            }
        }
        copyInto(req, seen);
    }

    static boolean recentlyAlerted(String tag) {
        if (tag == null) return false;
        long now = System.currentTimeMillis();
        Long t = recentAlerts.get(tag);
        if (t != null && now - t < 120000L) return true;
        String fam = alertFamily(tag);
        if (!fam.isEmpty() && !fam.equals(tag)) {
            Long f = recentAlerts.get(fam);
            if (f != null && now - f < 45000L) return true;
        }
        return false;
    }

    private static boolean watchHandlesTag(String tag) {
        if (tag == null) return false;
        return tag.startsWith("ct-patron-in-") || tag.startsWith("ct-patron-out-")
                || tag.startsWith("ct-req-") || tag.startsWith("ct-myreq-")
                || tag.startsWith("ct-swap-peer-");
    }

    private static String alertFamily(String tag) {
        if (tag == null || tag.isEmpty()) return "";
        if (tag.startsWith("ct-patron-in-") || tag.startsWith("ct-patron-out-")) {
            java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("^(ct-patron-(?:in|out)-.+-\\d{4}-\\d{2}-\\d{2})").matcher(tag);
            if (m.find()) return m.group(1);
        }
        if (tag.startsWith("ct-req-peerok-")) return "ct-req-peerok-" + tag.substring("ct-req-peerok-".length()).split("-")[0];
        if (tag.startsWith("ct-req-")) return "ct-req-" + tag.substring(7).split("-")[0];
        if (tag.startsWith("ct-myreq-")) return tag.replaceAll("-(ok|no)$", "");
        if (tag.startsWith("ct-swap-peer-")) return "ct-swap-peer-" + tag.substring("ct-swap-peer-".length()).split("-")[0];
        return tag;
    }

    private static int alertColor(Context ctx, String tag) {
        if (tag != null && tag.startsWith("ct-patron-in-")) return 0xFF4ADE80;
        if (tag != null && tag.startsWith("ct-patron-out-")) return 0xFFF87171;
        return themeColor(ctx, "accent", 0xFFF97316);
    }

    static void saveTheme(Context ctx, String bg, String bg2, String text, String accent, boolean light) {
        if (ctx == null) return;
        try {
            ctx.getApplicationContext().getSharedPreferences(THEME_PREFS, Context.MODE_PRIVATE).edit()
                    .putString("bg", bg == null ? "" : bg)
                    .putString("bg2", bg2 == null ? "" : bg2)
                    .putString("text", text == null ? "" : text)
                    .putString("accent", accent == null ? "" : accent)
                    .putBoolean("light", light)
                    .apply();
        } catch (Exception ignored) {}
    }

    private static int themeColor(Context ctx, String key, int fallback) {
        try {
            String raw = ctx.getSharedPreferences(THEME_PREFS, Context.MODE_PRIVATE).getString(key, "");
            if (raw != null && raw.startsWith("#") && (raw.length() == 7 || raw.length() == 9)) {
                return Color.parseColor(raw);
            }
        } catch (Exception ignored) {}
        return fallback;
    }

    private static boolean themeLight(Context ctx) {
        try {
            return ctx.getSharedPreferences(THEME_PREFS, Context.MODE_PRIVATE).getBoolean("light", false);
        } catch (Exception ignored) {
            return false;
        }
    }

    static void notifyFromJs(Context ctx, String title, String body, String tag) {
        alert(ctx, tag, title, body, true, true);
    }

    private static void pollShiftNotifs(Context ctx, JSONObject me, boolean primed) {
        if (me == null) return;
        SharedPreferences prefs = ctx.getSharedPreferences("lperson_notify_watch", Context.MODE_PRIVATE);
        JSONObject seen;
        try { seen = new JSONObject(prefs.getString("shiftSeen", "{}")); } catch (Exception e) { seen = new JSONObject(); }
        JSONObject nowSeen = new JSONObject();
        JSONArray arr = arrayValues(me.optJSONObject("recentShiftNotifs"));
        if (arr == null) return;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject item = mapFields(arr.optJSONObject(i));
            String id = str(item, "id");
            if (id.isEmpty()) continue;
            try { nowSeen.put(id, "1"); } catch (Exception ignored) {}
            if (primed && !seen.has(id)) {
                String title = str(item, "title");
                String body = str(item, "body");
                String tag = str(item, "tag");
                if (tag.isEmpty()) tag = "ct-myshift-" + id;
                if (watchHandlesTag(tag)) continue;
                alert(ctx, tag, title, body, true);
            }
        }
        prefs.edit().putString("shiftSeen", nowSeen.toString()).apply();
    }

    private static void alert(Context ctx, String tag, String title, String body) {
        alert(ctx, tag, title, body, false, false);
    }

    private static void alert(Context ctx, String tag, String title, String body, boolean bypassFcmMute) {
        alert(ctx, tag, title, body, bypassFcmMute, false);
    }

    private static void alert(Context ctx, String tag, String title, String body, boolean bypassFcmMute, boolean fromJs) {
        if (muteTrayBecauseFcm && !bypassFcmMute && !fromJs) return;
        if (appInForeground && !fromJs) return;
        if (title == null) title = "";
        if (body == null) body = "";
        title = title.trim();
        body = body.trim();
        if (title.isEmpty() || body.isEmpty()) return;
        String family = alertFamily(tag);
        if (recentlyAlerted(tag) || recentlyAlerted(family)) return;
        long nowMs = System.currentTimeMillis();
        recentAlerts.put(tag == null ? "" : tag, nowMs);
        if (!family.isEmpty()) recentAlerts.put(family, nowMs);
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, notifId(tag), open, piFlags());
        int accent = alertColor(ctx, tag);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CH_ALERT)
                .setSmallIcon(R.drawable.ic_stat_lperson)
                .setColor(accent)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setOnlyAlertOnce(true)
                .setAutoCancel(true)
                .setContentIntent(pi);
        Notification n = b.build();
        try { nm.notify(notifId(tag), n); } catch (Exception ignored) {}
    }

    private static void cancelLeftoverOngoing(Context ctx) {
        try {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            nm.cancel(ONGOING_ID);
            if (Build.VERSION.SDK_INT >= 26) {
                try { nm.deleteNotificationChannel("ct_watch"); } catch (Exception ignored) {}
                try { nm.deleteNotificationChannel("ct_watch_min"); } catch (Exception ignored) {}
                try { nm.deleteNotificationChannel("ct_watch_gone"); } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}
    }

    private static void ensureAlertChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        try { nm.deleteNotificationChannel("ct_watch"); } catch (Exception ignored) {}
        try { nm.deleteNotificationChannel("ct_watch_min"); } catch (Exception ignored) {}
        NotificationChannel alert = nm.getNotificationChannel(CH_ALERT);
        if (alert != null && alert.getImportance() >= NotificationManager.IMPORTANCE_HIGH) return;
        if (alert != null) nm.deleteNotificationChannel(CH_ALERT);
        NotificationChannel ch = new NotificationChannel(CH_ALERT, "Vardiya ve işyeri", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Giriş, çıkış, avans, izin ve talepler");
        ch.enableVibration(true);
        nm.createNotificationChannel(ch);
    }

    private static void scheduleKick(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        long when = SystemClock.elapsedRealtime() + POLL_MS;
        try {
            am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, when, kickBroadcast(ctx));
        } catch (Exception ignored) {}
    }

    private static void cancelAllKicks(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent svc = new Intent(ctx, NotifyWatchService.class);
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                am.cancel(PendingIntent.getForegroundService(ctx, KICK_REQ, svc, piFlags()));
            }
        } catch (Exception ignored) {}
        try { am.cancel(PendingIntent.getService(ctx, KICK_REQ, svc, piFlags())); } catch (Exception ignored) {}
        try { am.cancel(kickBroadcast(ctx)); } catch (Exception ignored) {}
    }

    private static PendingIntent kickBroadcast(Context ctx) {
        Intent i = new Intent(ctx, NotifyWatchBoot.class);
        i.setAction(NotifyWatchBoot.ACTION_POLL);
        return PendingIntent.getBroadcast(ctx, KICK_REQ, i, piFlags());
    }

    private static int piFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) flags |= PendingIntent.FLAG_IMMUTABLE;
        return flags;
    }

    private static String readSessionUid(Context context) {
        try {
            String raw = context.getSharedPreferences("lperson_widget_session", MODE_PRIVATE).getString("ct_session", "");
            if (raw == null || raw.isEmpty()) return "";
            return new JSONObject(raw).optString("uid", "").trim();
        } catch (Exception e) {
            return "";
        }
    }

    private static JSONObject getFields(String pathAndQuery) throws Exception {
        String join = pathAndQuery.contains("?") ? "&" : "?";
        String body = http("GET", DOC_ROOT + pathAndQuery + join + "key=" + API_KEY, null);
        if (body == null || body.isEmpty() || body.charAt(0) != '{') return null;
        JSONObject doc = new JSONObject(body);
        if (doc.has("error")) return null;
        JSONObject fields = doc.optJSONObject("fields");
        return fields == null ? new JSONObject() : fields;
    }

    private static JSONArray runQuery(JSONObject query) throws Exception {
        String body = http("POST", RUN_QUERY, query.toString());
        JSONArray out = new JSONArray();
        if (body == null || body.isEmpty() || body.charAt(0) != '[') return out;
        JSONArray arr = new JSONArray(body);
        for (int i = 0; i < arr.length(); i++) {
            JSONObject row = arr.optJSONObject(i);
            if (row == null) continue;
            JSONObject doc = row.optJSONObject("document");
            if (doc != null) out.put(doc);
        }
        return out;
    }

    private static JSONObject selectQuery(String collection, String field, String value, int limit, String[] select) throws Exception {
        JSONArray fields = new JSONArray();
        for (String s : select) fields.put(new JSONObject().put("fieldPath", s));
        JSONObject where = new JSONObject()
                .put("fieldFilter", new JSONObject()
                        .put("field", new JSONObject().put("fieldPath", field))
                        .put("op", "EQUAL")
                        .put("value", new JSONObject().put("stringValue", value)));
        JSONObject structured = new JSONObject()
                .put("from", new JSONArray().put(new JSONObject().put("collectionId", collection)))
                .put("where", where)
                .put("limit", limit)
                .put("select", new JSONObject().put("fields", fields));
        return new JSONObject().put("structuredQuery", structured);
    }

    private static String http(String method, String url, String json) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(12000);
        c.setReadTimeout(15000);
        c.setRequestMethod(method);
        if (json != null) {
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            c.getOutputStream().write(bytes);
        }
        int code = c.getResponseCode();
        InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
        if (in == null) return "";
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] tmp = new byte[4096];
        int n;
        while ((n = in.read(tmp)) >= 0) buf.write(tmp, 0, n);
        in.close();
        c.disconnect();
        if (code >= 400) return "";
        return buf.toString("UTF-8");
    }

    private static String lookupName(String uid) {
        if (uid == null || uid.isEmpty()) return "Çalışan";
        try {
            JSONObject f = getFields("users/" + enc(uid) + "?mask.fieldPaths=name");
            String name = str(f, "name");
            return name.isEmpty() ? "Çalışan" : name;
        } catch (Exception e) {
            return "Çalışan";
        }
    }

    private static String requestTitle(JSONObject f) {
        String type = str(f, "type");
        if ("adv".equals(type)) return "Avans Talebi";
        if ("leave".equals(type)) return bool(f, "isHourlyLeave", false) ? "Saatlik İzin Talebi" : "İzin Talebi";
        if ("hour".equals(type)) return "Saat Düzenleme Talebi";
        if ("shift_swap".equals(type)) return "Vardiya Takası";
        return "Yeni Talep";
    }

    private static String requestBody(JSONObject f, String name, String currency) {
        String type = str(f, "type");
        if ("adv".equals(type)) return name + ", " + currency + money(f) + " tutarında avans talebi gönderdi.";
        if ("leave".equals(type) && bool(f, "isHourlyLeave", false)) {
            return name + ", " + fallback(str(f, "startDate"), "—") + " " + str(f, "startTime") + "–" + str(f, "endTime") + " saatlik izin talebi gönderdi.";
        }
        if ("leave".equals(type)) {
            return name + ", " + fallback(str(f, "startDate"), "—") + " → " + fallback(str(f, "endDate"), "—") + " izin talebi gönderdi.";
        }
        if ("hour".equals(type)) return name + ", " + fallback(str(f, "dateKey"), "—") + " günü için saat düzenleme talebi gönderdi.";
        if ("shift_swap".equals(type)) return name + " vardiya takası talebi gönderdi.";
        return name + " yeni bir talep gönderdi.";
    }

    private static String workerTitle(JSONObject f) {
        String type = str(f, "type");
        if ("adv".equals(type)) return "Avans Talebi";
        if ("leave".equals(type)) return "İzin Talebi";
        if ("hour".equals(type)) return "Saat Düzenleme Talebi";
        if ("shift_swap".equals(type)) return "Vardiya Takası";
        return "Talep Sonucu";
    }

    private static String workerBody(JSONObject f, String name, String verdict, String currency) {
        String type = str(f, "type");
        String cur = currency == null || currency.isEmpty() ? "₺" : currency;
        if ("adv".equals(type)) {
            return "Sayın " + name + ", " + cur + money(f) + " tutarındaki avans talebiniz " + verdict + ".";
        }
        if ("leave".equals(type)) return "Sayın " + name + ", izin talebiniz " + verdict + ".";
        if ("hour".equals(type)) return "Sayın " + name + ", " + fallback(str(f, "dateKey"), "—") + " günü için saat düzenleme talebiniz " + verdict + ".";
        return "Sayın " + name + ", talebiniz " + verdict + ".";
    }

    private static int[] shiftStats(JSONObject day) {
        int starts = 0;
        int closed = 0;
        JSONArray values = arrayValues(day.optJSONObject("shifts"));
        if (values != null) {
            for (int i = 0; i < values.length(); i++) {
                JSONObject sf = mapFields(values.optJSONObject(i));
                if (bool(sf, "silent", false)) continue;
                String start = str(sf, "start");
                String end = str(sf, "end");
                if (!start.isEmpty()) starts++;
                if (!start.isEmpty() && !end.isEmpty()) closed++;
            }
        }
        if (starts == 0) {
            String start = str(day, "start");
            String end = str(day, "end");
            if (!start.isEmpty()) starts = 1;
            if (!start.isEmpty() && !end.isEmpty()) closed = 1;
        }
        return new int[]{starts, closed};
    }

    private static String lastTime(JSONObject day, boolean wantEnd) {
        String found = "";
        JSONArray values = arrayValues(day.optJSONObject("shifts"));
        if (values != null) {
            for (int i = 0; i < values.length(); i++) {
                JSONObject sf = mapFields(values.optJSONObject(i));
                if (bool(sf, "silent", false)) continue;
                String start = str(sf, "start");
                String end = str(sf, "end");
                if (wantEnd) {
                    if (!start.isEmpty() && !end.isEmpty()) found = end;
                } else if (!start.isEmpty()) {
                    found = start;
                }
            }
        }
        if (found.isEmpty()) found = str(day, wantEnd ? "end" : "start");
        return found;
    }

    private static JSONArray arrayValues(JSONObject value) {
        if (value == null) return null;
        JSONObject arr = value.optJSONObject("arrayValue");
        if (arr == null) return null;
        return arr.optJSONArray("values");
    }

    private static JSONObject mapFields(JSONObject value) {
        if (value == null) return new JSONObject();
        JSONObject mv = value.optJSONObject("mapValue");
        if (mv == null) return new JSONObject();
        JSONObject f = mv.optJSONObject("fields");
        return f == null ? new JSONObject() : f;
    }

    private static boolean isTerminated(JSONObject fields) {
        JSONObject v = fields == null ? null : fields.optJSONObject("terminatedAt");
        if (v == null || v.has("nullValue")) return false;
        if (v.has("stringValue")) return !v.optString("stringValue", "").isEmpty();
        return v.has("timestampValue") || v.has("integerValue");
    }

    private static String str(JSONObject fields, String key) {
        if (fields == null) return "";
        JSONObject v = fields.optJSONObject(key);
        if (v == null) return "";
        if (v.has("stringValue")) return v.optString("stringValue", "");
        if (v.has("integerValue")) return v.optString("integerValue", "");
        if (v.has("doubleValue")) return v.optString("doubleValue", "");
        return "";
    }

    private static boolean bool(JSONObject fields, String key, boolean def) {
        JSONObject v = fields == null ? null : fields.optJSONObject(key);
        if (v == null || !v.has("booleanValue")) return def;
        return v.optBoolean("booleanValue", def);
    }

    private static String money(JSONObject fields) {
        JSONObject v = fields == null ? null : fields.optJSONObject("amount");
        if (v == null) return "0,00";
        double n = 0;
        if (v.has("doubleValue")) n = v.optDouble("doubleValue", 0);
        else if (v.has("integerValue")) n = v.optDouble("integerValue", 0);
        else if (v.has("stringValue")) {
            try { n = Double.parseDouble(v.optString("stringValue", "0").replace(",", ".")); } catch (Exception ignored) {}
        }
        return String.format(Locale.forLanguageTag("tr-TR"), "%,.2f", n);
    }

    private static boolean recent(String iso, long windowMs) {
        if (iso == null || iso.isEmpty()) return true;
        try {
            String s = iso.endsWith("Z") ? iso.substring(0, iso.length() - 1) : iso;
            int dot = s.indexOf('.');
            if (dot > 0) s = s.substring(0, dot);
            if (s.length() >= 19) s = s.substring(0, 19);
            SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            f.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date d = f.parse(s);
            if (d == null) return true;
            long age = System.currentTimeMillis() - d.getTime();
            return age >= -60000 && age < windowMs;
        } catch (Exception e) {
            return true;
        }
    }

    private static void copyInto(JSONObject target, JSONObject source) {
        Iterator<String> it = target.keys();
        java.util.ArrayList<String> drop = new java.util.ArrayList<>();
        while (it.hasNext()) {
            String k = it.next();
            if (!source.has(k)) drop.add(k);
        }
        for (String k : drop) target.remove(k);
        Iterator<String> keys = source.keys();
        while (keys.hasNext()) {
            String k = keys.next();
            try { target.put(k, source.optString(k, "")); } catch (Exception ignored) {}
        }
    }

    private static String todayKey() {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        f.setTimeZone(TimeZone.getTimeZone("Europe/Istanbul"));
        return f.format(new Date());
    }

    private static String enc(String s) {
        try { return URLEncoder.encode(s, "UTF-8").replace("+", "%20"); } catch (Exception e) { return s; }
    }

    private static String fallback(String s, String fb) {
        return s == null || s.isEmpty() ? fb : s;
    }

    private static int parseInt(String s) {
        try { return Integer.parseInt(s); } catch (Exception e) { return 0; }
    }

    private static String docId(JSONObject doc) {
        String name = doc.optString("name", "");
        int i = name.lastIndexOf('/');
        return i >= 0 ? name.substring(i + 1) : "";
    }

    private static int notifId(String tag) {
        int h = tag == null ? 1 : (tag.hashCode() & 0x7fffffff);
        if (h < 2000) h += 2000;
        if (h == ONGOING_ID) h = 71002;
        return h;
    }
}
